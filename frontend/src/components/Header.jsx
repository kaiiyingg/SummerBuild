import { useState, useRef, useEffect } from "react";
import { FaBell, FaTimes } from "react-icons/fa";
import PillyLogoSmall from "./PillyLogoSmall";
import { BasicToast } from "./ui/Toast";
import "./Header.css";

const NOTIFS = [
  { id: 1, color: "#EF4444", text: "Patient P002: Drug interaction question",   time: "5 min ago"  },
  { id: 2, color: "#F59E0B", text: "Low stock: Metformin 500mg — 8 units left", time: "20 min ago" },
  { id: 3, color: "#3B82F6", text: "Patient P007 placed on hold",               time: "1 hr ago"   },
];

const BADGE_COUNT = 3;

export default function Header() {
  const [notifOpen,    setNotifOpen]    = useState(false);
  const [showUrgency,  setShowUrgency]  = useState(true);
  const urgencyTimerRef = useRef(null);

  function handleUrgencyClose() {
    setShowUrgency(false);
    urgencyTimerRef.current = setTimeout(() => setShowUrgency(true), 10 * 60 * 1000);
  }

  useEffect(() => () => clearTimeout(urgencyTimerRef.current), []);

  return (
    <>
      <header className="app-header">
        <div className="ah-left">
          <PillyLogoSmall />
          <span className="ah-wordmark">Pilly</span>
        </div>

        <div className="ah-right">
          <button
            type="button"
            className={`ah-bell${BADGE_COUNT > 0 ? " has-badge" : ""}`}
            onClick={() => setNotifOpen(true)}
            aria-label={`Notifications, ${BADGE_COUNT} unread`}
          >
            <FaBell />
            {BADGE_COUNT > 0 && (
              <span className="ah-badge">{BADGE_COUNT}</span>
            )}
          </button>
        </div>
      </header>

      {/* Notification overlay */}
      <div
        className={`ah-overlay${notifOpen ? " open" : ""}`}
        onClick={() => setNotifOpen(false)}
        aria-hidden="true"
      />

      {/* Notification drawer */}
      <aside
        className={`ah-drawer${notifOpen ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
        aria-hidden={!notifOpen}
      >
        <div className="ah-drawer-head">
          <h2>Notifications</h2>
          <button
            type="button"
            className="ah-drawer-close"
            onClick={() => setNotifOpen(false)}
            aria-label="Close notifications"
          >
            <FaTimes />
          </button>
        </div>
        <ul className="ah-notif-list">
          {NOTIFS.map((n) => (
            <li key={n.id} className="ah-notif" style={{ borderLeftColor: n.color }}>
              <span className="ah-notif-text">{n.text}</span>
              <span className="ah-notif-time">{n.time}</span>
            </li>
          ))}
        </ul>
      </aside>

      {/* Urgency legend reminder — appears on load, then every 10 min */}
      <BasicToast
        message="A · High Priority: Immediate attention  |  B · Medium Priority: Within 30 min  |  C · Routine: Standard processing"
        type="info"
        duration={8000}
        isVisible={showUrgency}
        onClose={handleUrgencyClose}
      />
    </>
  );
}
