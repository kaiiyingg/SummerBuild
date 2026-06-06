import { useState } from "react";
import { FaBell, FaTimes } from "react-icons/fa";
import PillyLogoSmall from "./PillyLogoSmall";
import "./Header.css";

const NOTIFS = [
  { id: 1, color: "#EF4444", text: "Patient P002: Drug interaction question",   time: "5 min ago"  },
  { id: 2, color: "#F59E0B", text: "Low stock: Metformin 500mg — 8 units left", time: "20 min ago" },
  { id: 3, color: "#3B82F6", text: "Patient P007 placed on hold",               time: "1 hr ago"   },
];

const BADGE_COUNT = 3;

export default function Header() {
  const [lang,      setLang]      = useState("EN");
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <>
      <header className="app-header">
        <div className="ah-left">
          <PillyLogoSmall />
          <span className="ah-wordmark">Pilly</span>
        </div>

        <div className="ah-right">
          <div className="ah-lang" role="group" aria-label="Language">
            <button
              type="button"
              className={lang === "EN" ? "active" : ""}
              aria-pressed={lang === "EN"}
              onClick={() => setLang("EN")}
            >EN</button>
            <span className="ah-sep" aria-hidden="true">|</span>
            <button
              type="button"
              className={lang === "中文" ? "active" : ""}
              aria-pressed={lang === "中文"}
              onClick={() => setLang("中文")}
            >中文</button>
          </div>

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
    </>
  );
}
