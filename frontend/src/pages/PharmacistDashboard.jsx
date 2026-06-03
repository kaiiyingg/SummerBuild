import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell, FaChevronRight, FaTimes } from "react-icons/fa";
import "./PharmacistDashboard.css";

/* ---------- Dummy data ---------- */
const PATIENTS = [
  { id: "P001", name: "Tan Wei Ming", urgency: "A", meds: 4, status: "pending", time: "8 min ago" },
  { id: "P002", name: "Siti Rahmah", urgency: "B", meds: 2, status: "on_hold", time: "15 min ago" },
  { id: "P003", name: "David Lim", urgency: "A", meds: 6, status: "ready", time: "22 min ago" },
  { id: "P004", name: "Priya Nair", urgency: "C", meds: 1, status: "pending", time: "31 min ago" },
  { id: "P005", name: "Mohammad Faiz", urgency: "B", meds: 3, status: "collected", time: "45 min ago" },
  { id: "P006", name: "Chen Li Hua", urgency: "A", meds: 5, status: "pending", time: "52 min ago" },
  { id: "P007", name: "Kavitha Raj", urgency: "C", meds: 2, status: "on_hold", time: "1 hr ago" },
  { id: "P008", name: "James Tan", urgency: "B", meds: 3, status: "ready", time: "1.5 hr ago" },
];

/* Status pill styling + labels */
const STATUS = {
  pending: { label: "Pending Packing", bg: "#FEF3C7", color: "#92400E" },
  on_hold: { label: "On Hold", bg: "#FEE2E2", color: "#991B1B" },
  ready: { label: "Ready", bg: "#DCFCE7", color: "#166534" },
  collected: { label: "Collected", bg: "#F3F4F6", color: "#6B7280" },
};

/* Urgency badge colours (A = most urgent) */
const URGENCY_COLOR = { A: "#EF4444", B: "#F59E0B", C: "#3B82F6" };
const URGENCY_RANK = { A: 0, B: 1, C: 2 };

const TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending Packing" },
  { key: "on_hold", label: "On Hold" },
  { key: "ready", label: "Ready for Collection" },
];

const SORTS = [
  { key: "urgency_ac", label: "Urgency (A→C)" },
  { key: "urgency_ca", label: "Urgency (C→A)" },
  { key: "newest", label: "Newest First" },
  { key: "oldest", label: "Oldest First" },
];

const NOTIFS = [
  { id: 1, icon: "🔴", color: "#EF4444", text: "Patient P002 query: Drug interaction question", time: "5 min ago" },
  { id: 2, icon: "🟡", color: "#F59E0B", text: "Low stock alert: Metformin 500mg — 8 units left", time: "20 min ago" },
  { id: 3, icon: "🔵", color: "#3B82F6", text: "Patient P007 placed on hold — awaiting stock", time: "1 hr ago" },
];

/* "8 min ago" -> 8, "1.5 hr ago" -> 90 */
function ageMinutes(time) {
  const n = parseFloat(time);
  return time.includes("hr") ? n * 60 : n;
}

function PharmacistDashboard() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("all");
  const [sort, setSort] = useState("urgency_ac");
  const [lang, setLang] = useState("EN");
  const [notifOpen, setNotifOpen] = useState(false);

  const badgeCount = 3;

  const visiblePatients = useMemo(() => {
    const filtered =
      activeTab === "all"
        ? PATIENTS
        : PATIENTS.filter((p) => p.status === activeTab);

    const sorted = [...filtered];
    switch (sort) {
      case "urgency_ac":
        sorted.sort((a, b) => URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency]);
        break;
      case "urgency_ca":
        sorted.sort((a, b) => URGENCY_RANK[b.urgency] - URGENCY_RANK[a.urgency]);
        break;
      case "newest":
        sorted.sort((a, b) => ageMinutes(a.time) - ageMinutes(b.time));
        break;
      case "oldest":
        sorted.sort((a, b) => ageMinutes(b.time) - ageMinutes(a.time));
        break;
      default:
        break;
    }
    return sorted;
  }, [activeTab, sort]);

  const openPatient = (id) => {
    console.log("Open packing for patient:", id);
    navigate(`/pharmacist/pack/${id}`);
  };

  return (
    <div className="pharm-dash">
      {/* ---------------- Navbar ---------------- */}
      <header className="pd-navbar">
        <span className="pd-logo">Pilly</span>
        <h1 className="pd-title">Dashboard</h1>

        <div className="pd-nav-right">
          <div className="pd-lang" role="group" aria-label="Language">
            <button
              type="button"
              className={lang === "EN" ? "active" : ""}
              aria-pressed={lang === "EN"}
              onClick={() => setLang("EN")}
            >
              EN
            </button>
            <span className="sep" aria-hidden="true">
              |
            </span>
            <button
              type="button"
              className={lang === "中文" ? "active" : ""}
              aria-pressed={lang === "中文"}
              onClick={() => setLang("中文")}
            >
              中文
            </button>
          </div>

          <button
            type="button"
            className={`pd-bell ${badgeCount > 0 ? "has-badge" : ""}`}
            onClick={() => setNotifOpen(true)}
            aria-label={`Notifications (${badgeCount} unread)`}
          >
            <FaBell />
            {badgeCount > 0 && <span className="pd-badge">{badgeCount}</span>}
          </button>
        </div>
      </header>

      {/* ---------------- Quick stats ---------------- */}
      <div className="pd-stats">
        <span className="pd-chip">
          <span className="dot" style={{ background: "#F59E0B" }} />
          <b>12</b>&nbsp;Pending Packing
        </span>
        <span className="pd-chip">
          <span className="dot" style={{ background: "#EF4444" }} />
          <b>3</b>&nbsp;On Hold
        </span>
        <span className="pd-chip">
          <span className="dot" style={{ background: "#22C55E" }} />
          <b>5</b>&nbsp;Ready for Collection
        </span>
      </div>

      {/* ---------------- Content ---------------- */}
      <main className="pd-content">
        {/* Filter + sort */}
        <div className="pd-controls">
          <div className="pd-tabs" role="tablist" aria-label="Filter patients">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={activeTab === t.key}
                className={`pd-tab ${activeTab === t.key ? "active" : ""}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <label className="pd-sort">
            Sort by:
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Patient cards */}
        <div className="pd-list">
          {visiblePatients.map((p) => {
            const status = STATUS[p.status];
            return (
              <button
                key={p.id}
                type="button"
                className="pd-card"
                onClick={() => openPatient(p.id)}
                aria-label={`${p.name}, urgency ${p.urgency}, ${status.label}`}
              >
                <span
                  className="pd-urgency"
                  style={{ background: URGENCY_COLOR[p.urgency] }}
                  aria-hidden="true"
                >
                  {p.urgency}
                </span>

                <div className="pd-info">
                  <div className="pd-name-row">
                    <span className="pd-name">{p.name}</span>
                    <span className="pd-pid">{p.id}</span>
                  </div>
                  <div className="pd-meds">💊 {p.meds} medications</div>
                  <div className="pd-time">{p.time}</div>
                </div>

                <div className="pd-right">
                  <span
                    className="pd-status"
                    style={{ background: status.bg, color: status.color }}
                  >
                    {status.label}
                  </span>
                  <span className="pd-chevron" aria-hidden="true">
                    <FaChevronRight />
                  </span>
                </div>
              </button>
            );
          })}

          {visiblePatients.length === 0 && (
            <p className="pd-empty">No patients in this category.</p>
          )}
        </div>
      </main>

      {/* ---------------- Notification drawer ---------------- */}
      <div
        className={`pd-overlay ${notifOpen ? "open" : ""}`}
        onClick={() => setNotifOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`pd-drawer ${notifOpen ? "open" : ""}`}
        role="dialog"
        aria-label="Notifications"
        aria-hidden={!notifOpen}
      >
        <div className="pd-drawer-head">
          <h2>Notifications</h2>
          <button
            type="button"
            className="pd-drawer-close"
            onClick={() => setNotifOpen(false)}
            aria-label="Close notifications"
          >
            <FaTimes />
          </button>
        </div>

        <ul className="pd-notif-list">
          {NOTIFS.map((n) => (
            <li
              key={n.id}
              className="pd-notif"
              style={{ borderLeftColor: n.color }}
            >
              <span className="icon" aria-hidden="true">
                {n.icon}
              </span>
              <span className="body">
                {n.text}
                <span className="when">{n.time}</span>
              </span>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

export default PharmacistDashboard;
