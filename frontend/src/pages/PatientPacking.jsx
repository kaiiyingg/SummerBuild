import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import PillyLogo from "../components/PillyLogo";
import ReminderComposerSheet from "../components/reminders/ReminderComposerSheet";
import {
  addPatientReminders,
  addHoldReason,
  fetchPatientDetails,
  fetchPatientReminders,
  setMedicationVerified,
  setPatientStatus,
  subscribeToPatientChanges,
  subscribeToReminderChanges,
} from "../services/pharmacyData";
import "./PatientPacking.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

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
  if (!nric) return "Not provided";
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
  const location = useLocation();
  const initialPatient = location.state?.patient ?? null;

  const [patient, setPatient] = useState(initialPatient);
  const [loadingPatient, setLoadingPatient] = useState(!initialPatient);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [selectedMed, setSelectedMed] = useState(null);
  const [holdOpen, setHoldOpen] = useState(false);
  const [holdReason, setHoldReason] = useState("");
  const [additionalWaitMin, setAdditionalWaitMin] = useState("");
  const [incompleteOpen, setIncompleteOpen] = useState(false);
  const [reminders, setReminders] = useState([]);
  const [loadingReminders, setLoadingReminders] = useState(true);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderSaving, setReminderSaving] = useState(false);
  const [reminderError, setReminderError] = useState("");

  const [verifying, setVerifying] = useState(false);
  const [scanPhase, setScanPhase] = useState("identity");
  const [identityImage, setIdentityImage] = useState(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState("");
  const [verificationResult, setVerificationResult] = useState(null);
  const [verificationError, setVerificationError] = useState("");

  const [cumulativeQuantity, setCumulativeQuantity] = useState(0);
  const [pendingScanQuantity, setPendingScanQuantity] = useState(0);
  const [stripMultiplier, setStripMultiplier] = useState("");

  const [manualReason, setManualReason] = useState("");

  const cameraVideoRef = useRef(null);

  const [verifiedMeds, setVerifiedMeds] = useState(() => {
    const saved = localStorage.getItem(`verified-meds-${patientId}`);

    if (saved) {
      return JSON.parse(saved);
    }
    return {};
  });

  useEffect(() => {
    let isActive = true;

    const syncPatient = async () => {
      if (!patient) {
        setLoadingPatient(true);
      }
      const nextPatient = await fetchPatientDetails(patientId);

      if (!isActive) return;

      setPatient(nextPatient);
      setVerifiedMeds((current) => {
        const next = { ...current };
        nextPatient?.medications?.forEach((med) => {
          if (med.verified) {
            next[med.id] = true;
          }
        });
        return next;
      });
      setLoadingPatient(false);
    };

    void syncPatient();
    const unsubscribe = subscribeToPatientChanges(() => {
      void syncPatient();
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [patientId]);

  useEffect(() => {
    const loadReminders = async () => {
      if (!patientId) {
        setReminders([]);
        setLoadingReminders(false);
        return;
      }

      setLoadingReminders(true);
      const nextReminders = await fetchPatientReminders(patientId);
      setReminders(nextReminders);
      setLoadingReminders(false);
    };

    loadReminders();
    return subscribeToReminderChanges(loadReminders);
  }, [patientId]);

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

  const closeCamera = () => {
    cameraStream?.getTracks().forEach((track) => track.stop());
    setCameraStream(null);
    setCameraError("");
  };

  const openCamera = async () => {
    setCameraError("");
    setVerificationError("");
    setVerificationResult(null);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera access is not available in this browser.");
      }

      cameraStream?.getTracks().forEach((track) => track.stop());

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 },
        },
        audio: false,
        });

      setCameraStream(stream);
    } catch (error) {
      setCameraError(
        error instanceof Error
          ? error.message
          : "Unable to open the camera. Please allow camera access and try again."
      );
    }
  };

  const resetScanner = () => {
  closeCamera();
  setScannerOpen(false);
  setSelectedMed(null);
  setScanPhase("identity");
  setIdentityImage(null);
  setVerificationResult(null);
  setVerificationError("");
  setVerifying(false);
  setManualReason("");
};

  const openScanner = async (med) => {
  setSelectedMed(med);
  setScanPhase("identity");
  setIdentityImage(null);
  setVerificationResult(null);
  setVerificationError("");
  setCameraError("");
  setScannerOpen(true);
  setCumulativeQuantity(0);
  setPendingScanQuantity(0);
  setManualReason("");

  setTimeout(() => {
    openCamera();
  }, 100);
};

  const completeManualVerification = async () => {
  if (!manualReason) {
    setVerificationError("Please select a manual verification reason first.");
    return;
  }

  await confirmMedicationVerification();
};

  const openReminderModal = () => {
    const allMedicationsVerified =
      patient?.medications?.length > 0 &&
      patient.medications.every((med) => verifiedMeds[med.id] || med.verified);

    if (!allMedicationsVerified) return;
    setReminderError("");
    setReminderOpen(true);
  };

  const closeReminderModal = () => {
    if (reminderSaving) return;
    setReminderOpen(false);
    setReminderError("");
  };

  const submitPatientReminder = async ({ name, times }) => {
    if (!patient?.id) return;

    setReminderSaving(true);
    setReminderError("");

    try {
      await addPatientReminders({
        patientId: patient.id,
        reminders: (times ?? []).map((time) => ({ name, time })),
        createdByName:
          localStorage.getItem("pilly-user-name") ||
          localStorage.getItem("pilly-user-email") ||
          "Pharmacist",
        createdByRole: "pharmacist",
        createdByUserId: localStorage.getItem("pilly-user-id"),
      });

      const nextReminders = await fetchPatientReminders(patient.id);
      setReminders(nextReminders);
      setReminderOpen(false);
    } catch (error) {
      setReminderError(
        error instanceof Error
          ? error.message
          : "Unable to send the reminder right now."
      );
    } finally {
      setReminderSaving(false);
    }
  };

  const confirmMedicationVerification = async () => {
    if (!selectedMed || !patient) return;

    const updatedVerifiedMeds = {
      ...verifiedMeds,
      [selectedMed.id]: true,
    };

    setVerifiedMeds(updatedVerifiedMeds);
    await setMedicationVerified(patient.id, selectedMed.id, true);

    const allVerified = patient.medications.every(
      (med) => updatedVerifiedMeds[med.id]
    );

    if (allVerified) {
      await setPatientStatus(patient.id, "ready");
    }

    resetScanner();
    const nextPatient = await fetchPatientDetails(patient.id);
    setPatient(nextPatient);
    setCumulativeQuantity(0);
    setPendingScanQuantity(0);
  };

  const analyzeMedicationIdentity = async (identityFile) => {
  if (!identityFile || !selectedMed) return;

  setVerifying(true);
  setVerificationError("");
  setVerificationResult(null);

  const formData = new FormData();
  formData.append("image", identityFile);
  formData.append("expected_medication", selectedMed.name);

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/verify-medication-identity`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      throw new Error(
        errorData.detail ||
          `Identity verification failed with status ${response.status}`
      );
    }

    const data = await response.json();

    if (data.medication_match) {
      setIdentityImage(identityFile);

      // Stay in identity phase until user clicks Continue
      setVerificationResult({
        image_type: "packaged",
        medication_match: true,
        quantity_match: false,
        detected_medication: data.detected_medication || "",
        detected_strength: data.detected_strength || "",
        detected_quantity: null,
        quantity_confidence: 0,
        identity_evidence: data.identity_evidence || "",
        quantity_evidence: "",
        notes:
          data.notes ||
          "Medication identity verified. Click Continue to Quantity Scan.",
      });

      setVerificationError("");
    } else {
      setVerificationResult({
        image_type: "unclear",
        medication_match: false,
        quantity_match: false,
        detected_medication: data.detected_medication || "",
        detected_strength: data.detected_strength || "",
        detected_quantity: null,
        quantity_confidence: 0,
        identity_evidence: data.identity_evidence || "",
        quantity_evidence: "",
        notes:
          data.notes ||
          "Medication label does not match the expected medication. Please rescan the correct label.",
      });
    }
  } catch (error) {
    setVerificationError(
      error instanceof Error
        ? error.message
        : "Unable to verify medication identity right now."
    );
  } finally {
    setVerifying(false);
  }
};

  const analyzeMedicationImage = async (identityFile, quantityFile) => {
  if (!identityFile || !quantityFile || !selectedMed) return;

  setVerifying(true);
  setVerificationError("");
  setVerificationResult(null);

  const formData = new FormData();
  formData.append("identity_image", identityFile);
  formData.append("image", quantityFile);
  formData.append("expected_medication", selectedMed.name);
  formData.append("expected_quantity", String(selectedMed.quantity));

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/verify-medication-image`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `Verification failed with status ${response.status}`
      );
    }

    const data = await response.json();

    const detectedQuantity = Number(data.detected_quantity || 0);
    const expectedQuantity = Number(selectedMed.quantity);
    const nextTotal = cumulativeQuantity + detectedQuantity;

    setPendingScanQuantity(detectedQuantity);

    setVerificationResult({
      ...data,
      quantity_match: nextTotal === expectedQuantity,
    });

    if (nextTotal === expectedQuantity) {
      await confirmMedicationVerification();
    }
  } catch (error) {
    setVerificationError(
      error instanceof Error
        ? error.message
        : "Unable to verify medication quantity right now."
    );
  } finally {
    setVerifying(false);
  }
};

  const clearCumulativeScan = () => {
  setPendingScanQuantity(0);
  setVerificationResult(null);
  setVerificationError("");
};

  const applyStripMultiplier = async () => {
  if (!selectedMed || !verificationResult || pendingScanQuantity <= 0) return;

  const strips = Number(stripMultiplier);

  if (!Number.isFinite(strips) || strips <= 0) return;

  const expectedQuantity = Number(selectedMed.quantity);
  const addedQuantity = pendingScanQuantity * strips;
  const nextTotal = cumulativeQuantity + addedQuantity;

  setCumulativeQuantity(nextTotal);
  setPendingScanQuantity(0);
  setStripMultiplier("");
  setVerificationResult(null);

  if (nextTotal === expectedQuantity) {
    await confirmMedicationVerification();
  }
};

  const continueQuantityScan = async () => {
  if (!selectedMed || !patient || !verificationResult) return;

  const expectedQuantity = Number(selectedMed.quantity);
  const nextTotal = cumulativeQuantity + pendingScanQuantity;

  setCumulativeQuantity(nextTotal);
  setPendingScanQuantity(0);
  setVerificationResult(null);

  if (nextTotal === expectedQuantity) {
    await confirmMedicationVerification();
  }
};
  const captureAndAnalyze = () => {
  const video = cameraVideoRef.current;

  if (!video) {
    setCameraError("Camera is not ready yet. Please try again.");
    return;
  }

  console.log(
  "Capture Resolution:",
  video.videoWidth,
  "x",
  video.videoHeight
);

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const context = canvas.getContext("2d");

  if (!context) {
    setCameraError("Unable to capture camera image.");
    return;
  }

  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  canvas.toBlob(
    (blob) => {
      if (!blob) {
        setCameraError("Unable to capture a camera image. Please try again.");
        return;
      }

      const file = new File(
        [blob],
        scanPhase === "identity" ? "identity-image.jpg" : "quantity-image.jpg",
        { type: "image/jpeg" }
      );

      if (scanPhase === "identity") {
        analyzeMedicationIdentity(file);
        return;
      }

      analyzeMedicationImage(identityImage, file);
    },
    "image/jpeg",
    0.98
  );
};

  if (loadingPatient) {
    return (
      <div className="pack-page">
        <div className="pack-card">
          <h1>Loading patient...</h1>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="pack-page">
        <div className="pack-card">
          <h1>Patient not found</h1>
        </div>
      </div>
    );
  }

  const expectedQuantity = Number(selectedMed?.quantity || 0);
  const currentDisplayedTotal = cumulativeQuantity + pendingScanQuantity;
  const remainingQuantity = Math.max(expectedQuantity - currentDisplayedTotal, 0);
  const hasStartedVerification = patient.medications.some(
    (med) => verifiedMeds[med.id] || med.verified
  );
  const allMedicationsVerified =
    patient.medications.length > 0 &&
    patient.medications.every((med) => verifiedMeds[med.id] || med.verified);

  return (
    <div className="pack-page">
      <main className="pack-content">
        <h1 className="pack-page-title">Medication Packing</h1>

        <section className="pack-patient-card">
          <div>
            <p className="pack-label">Patient Details</p>
            <h2>{patient.name}</h2>
            <p>
              {patient.queueNo ?? patient.id} · NRIC: {maskNric(patient.nric)}
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
                      <span className="completed-text">Completed</span>
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
                if (!hasStartedVerification || allMedicationsVerified) {
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

        <section className="pack-reminder-card">
          <div className="pack-section-head">
            <div>
              <p className="pack-label">Patient Reminders</p>
              <h2>
                {allMedicationsVerified
                  ? `${reminders.length} scheduled reminder${reminders.length === 1 ? "" : "s"}`
                  : "Unlock after medication verification"}
              </h2>
            </div>

            <button
              className="pack-ai-row-btn"
              onClick={openReminderModal}
              disabled={!allMedicationsVerified}
            >
              Add Reminder
            </button>
          </div>

          {!allMedicationsVerified ? (
            <p className="pack-empty-state">
              Finish scanning and verifying every medication before setting reminders
              for this patient.
            </p>
          ) : loadingReminders ? (
            <p className="pack-empty-state">Loading reminders...</p>
          ) : reminders.length === 0 ? (
            <p className="pack-empty-state">
              No reminders sent yet. Add the first reminder for this patient.
            </p>
          ) : (
            <div className="pack-reminder-list">
              {reminders.map((reminder) => (
                <div key={reminder.id} className="pack-reminder-item">
                  <div>
                    <p className="pack-reminder-name">{reminder.name}</p>
                    <p className="pack-reminder-meta">{reminder.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {reminderOpen && (
        <ReminderComposerSheet
          patientName={patient.name}
          medications={patient.medications}
          onClose={closeReminderModal}
          onSubmit={submitPatientReminder}
          submitLabel="Send Reminder to Patient"
          submitting={reminderSaving}
          errorMessage={reminderError}
        />
      )}

      {scannerOpen && (
        <div className="scanner-modal-overlay" onClick={resetScanner}>
          <div className="scanner-modal" onClick={(e) => e.stopPropagation()}>
            <button className="scanner-close" onClick={resetScanner}>
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
                <strong>{patient.queueNo ?? patient.id}</strong>
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
            {scanPhase === "identity"
                ? "Phase 1: Show the medication label clearly to verify the medication name."
                : "Phase 2: Show the packed medication quantity clearly to verify the count."}
            </p>

            <section className="camera-panel" aria-label="Live medication scanner">
              <div className="camera-panel-head">
                <div>
                  <span className="scanner-label">Live Camera</span>
                  <strong>Medication and Quantity Verification</strong>
                </div>

                <button type="button" onClick={closeCamera}>
                  Close Camera
                </button>
              </div>

              {cameraError ? (
                <div className="verification-error" role="alert">
                  {cameraError}
                </div>
              ) : cameraStream ? (
                <>
                  <video
                    ref={cameraVideoRef}
                    className="camera-video"
                    autoPlay
                    playsInline
                    muted
                  />

                  {scanPhase === "quantity" && verificationResult?.medication_match ? (
                    <div className="quantity-action-row camera-quantity-actions">
                      <button
                        type="button"
                        className="scanner-confirm scanner-secondary"
                        onClick={clearCumulativeScan}
                        disabled={verifying}
                      >
                        Clear & Rescan Quantity
                      </button>

                      <button
                        type="button"
                        className="scanner-confirm pharmacist-confirm"
                        onClick={continueQuantityScan}
                        disabled={verifying || pendingScanQuantity <= 0}
                      >
                        Continue Quantity Scan
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="scanner-confirm camera-capture-btn"
                      onClick={captureAndAnalyze}
                      disabled={verifying}
                    >
                      {verifying
                        ? "Analyzing..."
                        : scanPhase === "identity"
                        ? "Scan Medication Label"
                        : cumulativeQuantity > 0
                        ? "Scan Next Batch"
                        : "Scan Quantity"}
                    </button>
                  )}
                </>
              ) : (
                <div className="scanner-preview">
                  <span>Starting camera...</span>
                </div>
              )}
            </section>

            {verificationError && (
              <div className="verification-error" role="alert">
                {verificationError}
              </div>
            )}

            {verificationResult && (
              <section
                className="verification-result"
                aria-label="AI verification result"
              >
                <div className="verification-result-head">
                  <div>
                    <span className="scanner-label">Powered by Reka AI</span>
                    <strong>{formatImageType(verificationResult.image_type)}</strong>
                  </div>

                  <span
                    className={
                      verificationResult.medication_match &&
                      verificationResult.quantity_match
                        ? "verification-status match"
                        : "verification-status review"
                    }
                  >
                    {verificationResult.medication_match &&
                    verificationResult.quantity_match
                      ? "Match"
                      : "Needs review"}
                  </span>
                </div>

                {scanPhase === "identity" ? (
                    <div className="verification-single-column">
                        <div>
                        <span className="scanner-label">Medication Identity Check</span>

                        {verificationResult.medication_match ? (
                            <div className="verification-pass">
                            <span className="verification-icon">✓</span>
                            <strong>Medication Verified</strong>
                            </div>
                        ) : (
                            <div className="verification-fail">
                            <span className="verification-icon-fail">✕</span>
                            <strong>Not Verified</strong>
                            </div>
                        )}
                        </div>

                        <div>
                        <span className="scanner-label">Detected Medication</span>
                        <strong>{verificationResult.detected_medication || "Not detected"}</strong>
                        </div>

                        <div>
                        <span className="scanner-label">Strength</span>
                        <strong>{verificationResult.detected_strength || "Not visible"}</strong>
                        </div>
                    </div>
                    ) : (
                    <div className="verification-grid">
                        <div>
                        <span className="scanner-label">Medication Identity Check</span>

                        {verificationResult.medication_match ? (
                            <div className="verification-pass">
                            <span className="verification-icon">✓</span>
                            <strong>Medication Verified</strong>
                            </div>
                        ) : (
                            <div className="verification-fail">
                            <span className="verification-icon-fail">✕</span>
                            <strong>Not Verified</strong>
                            </div>
                        )}
                        </div>

                        <div>
                        <span className="scanner-label">Quantity Verification</span>

                        {verificationResult.quantity_match ? (
                            <div className="verification-pass">
                            <span className="verification-icon">✓</span>
                            <strong>Quantity Matches</strong>
                            </div>
                        ) : (
                            <div className="verification-fail">
                            <span className="verification-icon-fail">✕</span>
                            <strong>Mismatch / Unclear</strong>
                            </div>
                        )}
                        </div>

                        <div>
                        <span className="scanner-label">Detected Medication</span>
                        <strong>{verificationResult.detected_medication || "Not detected"}</strong>
                        </div>

                        <div>
                          <span className="scanner-label">Detected Quantity Per Strip</span>
                          <strong>{verificationResult.detected_quantity ?? "Unclear"}</strong>

                          {scanPhase === "quantity" && (
                            <>
                              <div className="quantity-progress-mini">
                                Total: {currentDisplayedTotal} / {expectedQuantity}
                                <br />
                                Remaining: {remainingQuantity}
                              </div>

                              {pendingScanQuantity > 0 && (
                                <div className="strip-multiplier-box">
                                  <label>
                                    Number of identical strips
                                    <input
                                      type="number"
                                      min="1"
                                      value={stripMultiplier}
                                      onChange={(e) => setStripMultiplier(e.target.value)}
                                      placeholder="e.g. 8"
                                    />
                                  </label>

                                  <button
                                    type="button"
                                    onClick={applyStripMultiplier}
                                    disabled={!stripMultiplier}
                                  >
                                    Apply Strip Count
                                  </button>

                                  {stripMultiplier && (
                                    <p>
                                      {pendingScanQuantity} × {stripMultiplier} ={" "}
                                      {pendingScanQuantity * Number(stripMultiplier || 0)}
                                    </p>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        <div>
                        <span className="scanner-label">Strength</span>
                        <strong>{verificationResult.detected_strength || "Not visible"}</strong>
                        </div>

                        <div>
                        <span className="scanner-label">Count Confidence</span>
                        <strong>
                            {Math.round((verificationResult.quantity_confidence ?? 0) * 100)}%
                        </strong>
                        </div>
                    </div>
                    )}

                {(verificationResult.identity_evidence ||
                  verificationResult.quantity_evidence) && (
                  <div className="verification-evidence">
                    {verificationResult.identity_evidence && (
                      <p>
                        <span>Identity evidence:</span>{" "}
                        {verificationResult.identity_evidence}
                      </p>
                    )}

                    {verificationResult.quantity_evidence && (
                      <p>
                        <span>Quantity evidence:</span>{" "}
                        {verificationResult.quantity_evidence}
                      </p>
                    )}
                  </div>
                )}

                {verificationResult.notes && (
                  <p className="verification-notes">
                    {verificationResult.notes}
                  </p>
                )}

                {scanPhase === "identity" &&
                verificationResult.medication_match ? (
                <button
                    className="scanner-confirm pharmacist-confirm"
                    onClick={() => {
                    setVerificationResult(null);
                    setScanPhase("quantity");
                    }}
                >
                    Continue to Quantity Scan
                </button>
                ) : scanPhase === "quantity" && verificationResult.medication_match ? null : (
                  <button
                    className="scanner-confirm"
                    onClick={() => setVerificationResult(null)}
                    disabled={verifying}
                  >
                    Rescan
                  </button>
                )}
              </section>
            )}

            <label className="manual-select-label">
              Unable to perform AI verification?
              <select
                className="manual-select"
                value={manualReason}
                onChange={(e) => setManualReason(e.target.value)}
              >
                <option value="">Select an action</option>
                <option value="manual_label">Label cannot be read</option>
                <option value="manual_mismatch">Medication mismatch detected</option>
                <option value="manual_quantity">Quantity discrepancy found</option>
                <option value="manual_ai_failed">AI verification unavailable</option>
              </select>
            </label>

            {manualReason && (
              <button
                type="button"
                className="scanner-confirm pharmacist-confirm"
                onClick={completeManualVerification}
              >
                Manual Verification Completed
              </button>
            )}
          </div>
        </div>
      )}

      {holdOpen && (
        <div
          className="scanner-modal-overlay"
          onClick={() => setHoldOpen(false)}
        >
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

            <div className="hold-wait-field">
              <label htmlFor="additional-wait">
                Additional Waiting Time
              </label>

              <div className="hold-wait-input-wrap">
                <input
                  id="additional-wait"
                  type="number"
                  min="0"
                  placeholder="20"
                  value={additionalWaitMin}
                  onChange={(e) => setAdditionalWaitMin(e.target.value)}
                />
                <span>min</span>
              </div>
            </div>

            <button
              className="hold-submit"
              onClick={async () => {
                const waitMinutes = Number(additionalWaitMin || 20);
                await addHoldReason(patient.id, holdReason, waitMinutes);
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

      {verifying && <VerifyingOverlay />}
    </div>
  );
}

export default PatientPacking;
