import { useState, useRef, useEffect } from "react";
import { FaBell, FaTimes } from "react-icons/fa";
import PillyLogoSmall from "./PillyLogoSmall";
import { BasicToast } from "./ui/Toast";
import {
  fetchNotifications,
  markNotificationsRead,
  subscribeToNotifications,
} from "../services/pharmacyData";
import "./Header.css";

function getNotificationColor(type) {
  if (type === "collection_rescheduled") return "#F59E0B";
  return "#3B82F6";
}

function formatTimeAgo(createdAt) {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const diffMins = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

export default function Header() {
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showUrgency, setShowUrgency] = useState(true);
  const urgencyTimerRef = useRef(null);
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  async function loadNotifications() {
    const rows = await fetchNotifications({ recipientRole: "pharmacist" });
    setNotifications(rows.filter((notification) => notification.type === "collection_rescheduled"));
  }

  function handleUrgencyClose() {
    setShowUrgency(false);
    urgencyTimerRef.current = setTimeout(() => setShowUrgency(true), 10 * 60 * 1000);
  }

  async function openNotifications() {
    setNotifOpen(true);
    const unreadIds = notifications
      .filter((notification) => !notification.read)
      .map((notification) => notification.id);

    if (unreadIds.length) {
      await markNotificationsRead(unreadIds);
      await loadNotifications();
    }
  }

  useEffect(() => {
    void loadNotifications();
    return subscribeToNotifications(() => {
      void loadNotifications();
    });
  }, []);

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
            className={`ah-bell${unreadCount > 0 ? " has-badge" : ""}`}
            onClick={openNotifications}
            aria-label={`Notifications, ${unreadCount} unread`}
          >
            <FaBell />
            {unreadCount > 0 && (
              <span className="ah-badge">{unreadCount}</span>
            )}
          </button>
        </div>
      </header>

      <div
        className={`ah-overlay${notifOpen ? " open" : ""}`}
        onClick={() => setNotifOpen(false)}
        aria-hidden="true"
      />

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
          {notifications.length === 0 ? (
            <li className="ah-notif" style={{ borderLeftColor: "#CBD5E1" }}>
              <span className="ah-notif-text">No new notifications</span>
            </li>
          ) : (
            notifications.map((notification) => (
              <li
                key={notification.id}
                className="ah-notif"
                style={{ borderLeftColor: getNotificationColor(notification.type) }}
              >
                <span className="ah-notif-text">{notification.title}</span>
                <span className="ah-notif-time">{notification.body}</span>
                <span className="ah-notif-time">{formatTimeAgo(notification.createdAt)}</span>
              </li>
            ))
          )}
        </ul>
      </aside>

      <BasicToast
        message="A - High Priority: Immediate attention  |  B - Medium Priority: Within 30 min  |  C - Routine: Standard processing"
        type="info"
        duration={8000}
        isVisible={showUrgency}
        onClose={handleUrgencyClose}
      />
    </>
  );
}
