import json
import os
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from pywebpush import WebPushException, webpush


router = APIRouter()


class PushSendRequest(BaseModel):
    patient_id: str = Field(..., min_length=1)
    title: str = "Pilly update"
    body: str = "Your pharmacy has an update. Tap to view details."
    url: str = "/patient"
    type: str = "pharmacy_update"


def _get_required_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise HTTPException(status_code=503, detail=f"Missing {name} on backend.")
    return value


def _fetch_patient_subscriptions(patient_id: str) -> list[dict]:
    supabase_url = _get_required_env("SUPABASE_URL").rstrip("/")
    service_role_key = _get_required_env("SUPABASE_SERVICE_ROLE_KEY")
    query = urlencode({"patient_id": f"eq.{patient_id}", "select": "endpoint,p256dh,auth"})
    request = Request(
        f"{supabase_url}/rest/v1/push_subscriptions?{query}",
        headers={
            "apikey": service_role_key,
            "Authorization": f"Bearer {service_role_key}",
            "Accept": "application/json",
        },
    )

    try:
        with urlopen(request, timeout=10) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Unable to load push subscriptions.") from exc


def _delete_subscription(endpoint: str) -> None:
    try:
        supabase_url = _get_required_env("SUPABASE_URL").rstrip("/")
        service_role_key = _get_required_env("SUPABASE_SERVICE_ROLE_KEY")
        query = urlencode({"endpoint": f"eq.{endpoint}"})
        request = Request(
            f"{supabase_url}/rest/v1/push_subscriptions?{query}",
            method="DELETE",
            headers={
                "apikey": service_role_key,
                "Authorization": f"Bearer {service_role_key}",
            },
        )
        urlopen(request, timeout=10).read()
    except Exception:
        pass


@router.get("/push/vapid-public-key")
def get_vapid_public_key():
    return {"publicKey": _get_required_env("VAPID_PUBLIC_KEY")}


@router.post("/push/send")
def send_push_notification(payload: PushSendRequest):
    vapid_private_key = _get_required_env("VAPID_PRIVATE_KEY")
    vapid_subject = os.getenv("VAPID_SUBJECT", "mailto:admin@example.com")
    subscriptions = _fetch_patient_subscriptions(payload.patient_id)

    if not subscriptions:
        return {"sent": 0, "failed": 0}

    message = json.dumps(
        {
            "title": payload.title,
            "body": payload.body,
            "url": payload.url,
            "type": payload.type,
        }
    )

    sent = 0
    failed = 0

    for subscription in subscriptions:
        try:
            webpush(
                subscription_info={
                    "endpoint": subscription["endpoint"],
                    "keys": {
                        "p256dh": subscription["p256dh"],
                        "auth": subscription["auth"],
                    },
                },
                data=message,
                vapid_private_key=vapid_private_key,
                vapid_claims={"sub": vapid_subject},
            )
            sent += 1
        except WebPushException as exc:
            failed += 1
            if exc.response is not None and exc.response.status_code in {404, 410}:
                _delete_subscription(subscription["endpoint"])
        except Exception:
            failed += 1

    return {"sent": sent, "failed": failed}
