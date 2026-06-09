import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PATIENT_DETAILS } from "../data/patientData";
import "./PatientPacking.css";

/* Pilly-logo loading overlay shown during AI verification */
function VerifyingOverlay() {
  return (
    <div className="verifying-overlay" role="status" aria-label="Verifying medication">
      <div className="verifying-card">
        <div className="verifying-logo-wrap">
          <div className="verifying-ring-outer" aria-hidden="true" />
          <div className="verifying-ring" aria-hidden="true" />
          <div className="verifying-logo-inner" aria-hidden="true">
            <PillyLogo size={88} showName={false} />
          </div>
        </div>
        <p className="verifying-text">
          Verifying<span className="verifying-dots" aria-hidden="true" />
        </p>
      </div>
    </div>
  );
}

function maskNric(nric) {
  return `${nric[0]}****${nric.slice(-4)}`;
}

function formatImageType(type) {
  if (type === "packaged") return "Packaged medication";
  if (type === "loose") return "Loose pills";
  return "Unclear image";
}

function PatientPacking() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [scannerOpen,   setScannerOpen]   = useState(false);
  const [selectedMed,   setSelectedMed]   = useState(null);
  const [holdOpen,      setHoldOpen]      = useState(false);
  const [holdReason,    setHoldReason]    = useState("");
  const [incompleteOpen,setIncompleteOpen]= useState(false);
  const [verifying,     setVerifying]     = useState(false);
  const [verifiedMeds, setVerifiedMeds] = useState(() => {
    const saved = localStorage.getItem(`verified-meds-${patientId}`);

    if (saved) {
        return JSON.parse(saved);
    }

    const patient = PATIENT_DETAILS.find((p) => p.id === patientId);

    if (patient?.status === "Collected") {
        return patient.medications.reduce((acc, med) => {
        acc[med.id] = true;
        return acc;
        }, {});
    }

    return {};
    });

  const patient = PATIENT_DETAILS.find((p) => p.id === patientId);
  const identityPreviewUrl = useMemo(
    () => (identityImage ? URL.createObjectURL(identityImage) : ""),
    [identityImage]
  );
  const quantityPreviewUrl = useMemo(
    () => (quantityImage ? URL.createObjectURL(quantityImage) : ""),
    [quantityImage]
  );

  useEffect(() => {
    return () => {
      if (identityPreviewUrl) {
        URL.revokeObjectURL(identityPreviewUrl);
      }
    };
  }, [identityPreviewUrl]);

  useEffect(() => {
    return () => {
      if (quantityPreviewUrl) {
        URL.revokeObjectURL(quantityPreviewUrl);
      }
    };
  }, [quantityPreviewUrl]);

  useEffect(() => {
    if (cameraVideoRef.current && cameraStream) {
      cameraVideoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach((track) => track.stop());
    };
  }, [cameraStream]);

  const resetScanner = () => {
    closeCamera();
    setScannerOpen(false);
    setIdentityImage(null);
    setQuantityImage(null);
    setVerificationResult(null);
    setVerificationError("");
    setVerifying(false);
  };

  const openScanner = (med) => {
    setSelectedMed(med);
    setIdentityImage(null);
    setQuantityImage(null);
    setVerificationResult(null);
    setVerificationError("");
    setScannerOpen(true);
  };

  const closeCamera = () => {
    cameraStream?.getTracks().forEach((track) => track.stop());
    setCameraStream(null);
    setCameraTarget(null);
    setCameraError("");
  };

  const openCamera = async (target) => {
    setCameraError("");
    setVerificationResult(null);
    setVerificationError("");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera access is not available in this browser.");
      }

      cameraStream?.getTracks().forEach((track) => track.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      setCameraTarget(target);
      setCameraStream(stream);
    } catch (error) {
      setCameraError(
        error instanceof Error
          ? error.message
          : "Unable to open the camera. Please allow camera access and try again."
      );
    }
  };

  const captureCameraImage = () => {
    const video = cameraVideoRef.current;
    if (!video || !cameraTarget) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) {
        setCameraError("Unable to capture a camera image. Please try again.");
        return;
      }

      const filename =
        cameraTarget === "identity"
          ? "identity-camera-capture.jpg"
          : "quantity-camera-capture.jpg";
      const file = new File([blob], filename, { type: "image/jpeg" });

      if (cameraTarget === "identity") {
        setIdentityImage(file);
      } else {
        setQuantityImage(file);
      }

      setVerificationResult(null);
      setVerificationError("");
      closeCamera();
    }, "image/jpeg", 0.92);
  };

  const handleImageChange = (event, setter) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setter(file);
    setVerificationResult(null);
    setVerificationError("");
  };

  const useIdentityImageForQuantity = () => {
    if (!identityImage) return;
    setQuantityImage(identityImage);
    setVerificationResult(null);
    setVerificationError("");
  };

  const analyzeMedicationImage = async () => {
    if (!quantityImage || !selectedMed) return;

    setVerifying(true);
    setVerificationError("");
    setVerificationResult(null);

    const formData = new FormData();
    formData.append("image", quantityImage);
    if (identityImage) {
      formData.append("identity_image", identityImage);
    }
    formData.append("expected_medication", selectedMed.name);
    formData.append("expected_quantity", String(selectedMed.quantity));

    try {
      const response = await fetch(`${API_BASE_URL}/api/verify-medication-image`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let detail = "";
        try {
          const errorData = await response.json();
          detail = errorData.detail || "";
        } catch {
          // Fall back to the status message below.
        }
        throw new Error(detail || `Verification failed with status ${response.status}`);
      }

      const data = await response.json();
      setVerificationResult(data);
    } catch (error) {
      setVerificationError(
        error instanceof Error
          ? error.message
          : "Unable to verify this medication image right now."
      );
    } finally {
      setVerifying(false);
    }
  };

  const confirmMedicationVerification = () => {
    if (!selectedMed || !patient) return;

    const updatedVerifiedMeds = {
      ...verifiedMeds,
      [selectedMed.id]: true,
    };

    setVerifiedMeds(updatedVerifiedMeds);
    localStorage.setItem(
      `verified-meds-${patient.id}`,
      JSON.stringify(updatedVerifiedMeds)
    );

    const allVerified = patient.medications.every(
      (med) => updatedVerifiedMeds[med.id]
    );

    if (allVerified) {
      localStorage.setItem(`patient-status-${patient.id}`, "ready");
    }

    resetScanner();
  };

  if (!patient) {
    return (
      <div className="pack-page">
        <div className="pack-card">
          <h1>Patient not found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="pack-page">
      <main className="pack-content">
        <h1 className="pack-page-title">Medication Packing</h1>
        <section className="pack-patient-card">
          <div>
            <p className="pack-label">Patient Details</p>
            <h2>{patient.name}</h2>
            <p>
              {patient.id} · NRIC: {maskNric(patient.nric)}
            </p>
          </div>

          <span className={`pack-urgency urgency-${patient.urgency}`}>
            {patient.urgency}
          </span>
        </section>

        <section className="pack-med-card">
          <div className="pack-section-head">
            <div>
              <p className="pack-label">Packing List</p>
              <h2>{patient.medications.length} medications</h2>
            </div>

          </div>

          <table className="pack-table">
            <thead>
                <tr>
                <th>No.</th>
                <th>Medication Name</th>
                <th>Quantity to Pack</th>
                <th>Verification</th>
                <th>Verified</th>
                </tr>
            </thead>

            <tbody>
                {patient.medications.map((med, index) => (
                <tr key={med.id}>
                    <td>{index + 1}</td>
                    <td>{med.name}</td>
                    <td>{med.quantity}</td>
                    <td>
                    {verifiedMeds[med.id] ? (
                        <span className="completed-text">
                        Completed
                        </span>
                    ) : (
                        <button
                        className="pack-ai-row-btn"
                        onClick={() => openScanner(med)}
                        >
                        Verify
                        </button>
                    )}
                    </td>

                    <td>
                    <span
                        className={
                        verifiedMeds[med.id]
                            ? "verified-circle"
                            : "unverified-circle"
                        }
                    >
                        {verifiedMeds[med.id] ? "✓" : ""}
                    </span>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>

            <div className="pack-actions">
                <button
                    className="put-hold-btn"
                    onClick={() => setHoldOpen(true)}
                >
                    Put On Hold
                </button>

                <button
                    className="return-dashboard-btn"
                    onClick={() => {
                    const allVerified = patient.medications.every(
                        (med) => verifiedMeds[med.id]
                    );

                    if (allVerified) {
                        navigate("/pharmacist/dashboard");
                    } else {
                        setIncompleteOpen(true);
                    }
                    }}
                >
                    Return to Dashboard
                </button>
            </div>
        </section>
      </main>

      {scannerOpen && (
        <div
          className="scanner-modal-overlay"
          onClick={resetScanner}
        >
          <div className="scanner-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="scanner-close"
              onClick={resetScanner}
            >
              ×
            </button>

            <h2>Medication Verification</h2>

                <div className="scanner-details">
                <div>
                    <span className="scanner-label">Patient</span>
                    <strong>{patient.name}</strong>
                </div>

                <div>
                    <span className="scanner-label">Queue Number</span>
                    <strong>{patient.queueNo}</strong>
                </div>

                <div>
                    <span className="scanner-label">Medication</span>
                    <strong>{selectedMed?.name}</strong>
                </div>

                <div>
                    <span className="scanner-label">Expected Quantity</span>
                    <strong>{selectedMed?.quantity}</strong>
                </div>
                </div>

                <p className="scanner-instruction">
                Verify medication label and count quantity.
                </p>

                <div className="verification-capture-grid">
                <section className="verification-capture-card">
                    <div>
                    <span className="scanner-label">Pill Label</span>
                    </div>
                    <div className={`scanner-preview compact ${identityPreviewUrl ? "has-image" : ""}`}>
                    {identityPreviewUrl ? (
                        <img src={identityPreviewUrl} alt="Medication identity evidence preview" />
                    ) : (
                        <span>Label Photo</span>
                    )}
                    </div>
                    <div className="scanner-upload-actions">
                    <button
                        type="button"
                        className="scanner-upload-btn"
                        onClick={() => openCamera("identity")}
                    >
                        Camera
                    </button>
                    <label className="scanner-upload-btn secondary">
                        Upload
                        <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => handleImageChange(event, setIdentityImage)}
                        />
                    </label>
                    </div>
                </section>

                <section className="verification-capture-card">
                    <div>
                    <span className="scanner-label">Quantity Count</span>
                    </div>
                    <div className={`scanner-preview compact ${quantityPreviewUrl ? "has-image" : ""}`}>
                    {quantityPreviewUrl ? (
                        <img src={quantityPreviewUrl} alt="Medication quantity preview" />
                    ) : (
                        <span>Quantity Photo</span>
                    )}
                    </div>
                    <div className="scanner-upload-actions">
                    <button
                        type="button"
                        className="scanner-upload-btn"
                        onClick={() => openCamera("quantity")}
                    >
                        Camera
                    </button>
                    <label className="scanner-upload-btn secondary">
                        Upload
                        <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => handleImageChange(event, setQuantityImage)}
                        />
                    </label>
                    </div>
                    <button
                    type="button"
                    className="use-same-photo-btn"
                    disabled={!identityImage}
                    onClick={useIdentityImageForQuantity}
                    >
                    Reuse photo
                    </button>
                </section>
                </div>

                {(cameraStream || cameraError) && (
                <section className="camera-panel" aria-label="Camera capture">
                    <div className="camera-panel-head">
                    <div>
                        <span className="scanner-label">Live Camera</span>
                        <strong>
                        {cameraTarget === "identity" ? "Pill Label" : "Quantity Count"}
                        </strong>
                    </div>
                    <button type="button" onClick={closeCamera}>
                        Close
                    </button>
                    </div>

                    {cameraError ? (
                    <div className="verification-error" role="alert">
                        {cameraError}
                    </div>
                    ) : (
                    <>
                        <video
                        ref={cameraVideoRef}
                        className="camera-video"
                        autoPlay
                        playsInline
                        muted
                        />
                        <button
                        type="button"
                        className="scanner-confirm camera-capture-btn"
                        onClick={captureCameraImage}
                        >
                        Capture Photo
                        </button>
                    </>
                    )}
                </section>
                )}

                {verificationError && (
                <div className="verification-error" role="alert">
                    {verificationError}
                </div>
                )}

                {verificationResult && (
                <section className="verification-result" aria-label="AI verification result">
                    <div className="verification-result-head">
                    <div>
                        <span className="scanner-label">Reka AI Result</span>
                        <strong>{formatImageType(verificationResult.image_type)}</strong>
                    </div>
                      <span
                        className={
                        verificationResult.medication_match && verificationResult.quantity_match
                            ? "verification-status match"
                            : "verification-status review"
                        }
                    >
                        {verificationResult.medication_match && verificationResult.quantity_match
                        ? "Match"
                        : "Needs review"}
                    </span>
                    </div>

                    <div className="verification-grid">
                    <div>
                        <span className="scanner-label">Identity Check</span>
                        <strong>
                        {verificationResult.medication_match ? "Verified" : "Not verified"}
                        </strong>
                    </div>
                    <div>
                        <span className="scanner-label">Quantity Check</span>
                        <strong>
                        {verificationResult.quantity_match ? "Matches" : "Mismatch / unclear"}
                        </strong>
                    </div>
                    <div>
                        <span className="scanner-label">Detected Medication</span>
                        <strong>{verificationResult.detected_medication || "Not detected"}</strong>
                    </div>
                    <div>
                        <span className="scanner-label">Strength</span>
                        <strong>{verificationResult.detected_strength || "Not visible"}</strong>
                    </div>
                    <div>
                        <span className="scanner-label">Detected Quantity</span>
                        <strong>{verificationResult.detected_quantity ?? "Unclear"}</strong>
                    </div>
                    <div>
                        <span className="scanner-label">Count Confidence</span>
                        <strong>{Math.round((verificationResult.quantity_confidence ?? 0) * 100)}%</strong>
                    </div>
                    </div>

                    {(verificationResult.identity_evidence || verificationResult.quantity_evidence) && (
                    <div className="verification-evidence">
                        {verificationResult.identity_evidence && (
                        <p>
                            <span>Identity evidence:</span> {verificationResult.identity_evidence}
                        </p>
                        )}
                        {verificationResult.quantity_evidence && (
                        <p>
                            <span>Quantity evidence:</span> {verificationResult.quantity_evidence}
                        </p>
                        )}
                    </div>
                    )}

                    {verificationResult.notes && (
                    <p className="verification-notes">{verificationResult.notes}</p>
                    )}
                </section>
                )}

                <button
                  className="scanner-confirm"
                  disabled={verifying || !quantityImage}
                  onClick={analyzeMedicationImage}
                >
                  {verifying ? "Analyzing Image..." : "Analyze with Reka AI"}
                </button>

                {verificationResult && (
                <button
                    className="scanner-confirm pharmacist-confirm"
                    disabled={
                    !verificationResult.medication_match ||
                    !verificationResult.quantity_match
                    }
                    onClick={confirmMedicationVerification}
                >
                    Confirm Verification
                </button>
                )}

                <label className="manual-select-label">
                Unable to perform AI verification?
                <select className="manual-select">
                    <option value="">Select an action</option>
                    <option value="manual_label">
                    Label cannot be read
                    </option>
                    <option value="manual_mismatch">
                    Medication mismatch detected
                    </option>
                    <option value="manual_quantity">
                    Quantity discrepancy found
                    </option>
                </select>
                </label>

                <button
                  className="scanner-confirm"
                  disabled={verifying}
                  onClick={() => {
                    setScannerOpen(false);
                    setVerifying(true);

                    setTimeout(() => {
                      const updatedVerifiedMeds = {
                        ...verifiedMeds,
                        [selectedMed.id]: true,
                      };
                      setVerifiedMeds(updatedVerifiedMeds);
                      localStorage.setItem(
                        `verified-meds-${patient.id}`,
                        JSON.stringify(updatedVerifiedMeds)
                      );
                      const allVerified = patient.medications.every(
                        (med) => updatedVerifiedMeds[med.id]
                      );
                      if (allVerified) {
                        localStorage.setItem(`patient-status-${patient.id}`, "ready");
                      }
                      setVerifying(false);
                    }, 1800);
                  }}
                >
                  Verify Medication
                </button>
          </div>
        </div>
      )}

      {holdOpen && (
        <div className="scanner-modal-overlay" onClick={() => setHoldOpen(false)}>
            <div className="hold-modal" onClick={(e) => e.stopPropagation()}>
            <button
                className="scanner-close"
                onClick={() => setHoldOpen(false)}
            >
                ×
            </button>

            <h2>Put Patient On Hold</h2>

            <p className="hold-desc">
                Please enter the reason for putting <b>{patient.name}</b> on hold.
            </p>

            <textarea
                className="hold-textarea"
                value={holdReason}
                onChange={(e) => setHoldReason(e.target.value)}
                placeholder="Example: Medication out of stock, unclear prescription, quantity mismatch..."
            />

            <button
                className="hold-submit"
                onClick={() => {
                localStorage.setItem(`patient-status-${patient.id}`, "on_hold");
                localStorage.setItem(`hold-reason-${patient.id}`, holdReason);
                navigate("/pharmacist/dashboard");
                }}
            >
                Submit
            </button>
            </div>
        </div>
        )}

        {incompleteOpen && (
        <div
            className="scanner-modal-overlay"
            onClick={() => setIncompleteOpen(false)}
        >
            <div className="incomplete-modal" onClick={(e) => e.stopPropagation()}>
            <button
                className="scanner-close"
                onClick={() => setIncompleteOpen(false)}
            >
                ×
            </button>

            <h2>Verification Incomplete</h2>

            <p>
                Some medications have not been verified yet. Please complete all
                medication verification before returning to the dashboard.
            </p>

            <button
                className="incomplete-confirm"
                onClick={() => setIncompleteOpen(false)}
            >
                Okay
            </button>
            </div>
        </div>
        )}
    </div>
  );
}

export default PatientPacking;
