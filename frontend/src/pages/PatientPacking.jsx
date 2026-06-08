import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaRobot } from "react-icons/fa";
import { PATIENT_DETAILS } from "../data/patientData";
import PillyLogo from "../components/PillyLogo";
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
                        onClick={() => {
                            setSelectedMed(med);
                            setScannerOpen(true);
                        }}
                        >
                        <FaRobot />
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
          onClick={() => setScannerOpen(false)}
        >
          <div className="scanner-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="scanner-close"
              onClick={() => setScannerOpen(false)}
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
                    <span className="scanner-label">Patient ID</span>
                    <strong>{patient.id}</strong>
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

                <div className="scanner-preview">
                Camera Preview
                </div>

                <p className="scanner-instruction">
                Scan the medication packaging for AI verification.
                </p>

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
      {/* ── Pilly logo verifying overlay ── */}
      {verifying && <VerifyingOverlay />}
    </div>
  );
}

export default PatientPacking;