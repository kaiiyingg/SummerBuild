import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FaChevronRight } from "react-icons/fa";
import "./PharmacistDashboard.css";

/* ── Dummy data ── */
const PATIENTS = [
  { id: "P001", name: "Tan Wei Ming",  urgency: "A", meds: 4, status: "pending",   waitMin: 8,  time: "8 min ago"  },
  { id: "P002", name: "Siti Rahmah",   urgency: "B", meds: 2, status: "on_hold",   waitMin: 15, time: "15 min ago" },
  { id: "P003", name: "David Lim",     urgency: "A", meds: 6, status: "ready",     waitMin: 22, time: "22 min ago" },
  { id: "P004", name: "Priya Nair",    urgency: "C", meds: 1, status: "pending",   waitMin: 31, time: "31 min ago" },
  { id: "P005", name: "Mohammad Faiz", urgency: "B", meds: 3, status: "collected", waitMin: 45, time: "45 min ago" },
  { id: "P006", name: "Chen Li Hua",   urgency: "A", meds: 5, status: "pending",   waitMin: 52, time: "52 min ago" },
  { id: "P007", name: "Kavitha Raj",   urgency: "C", meds: 2, status: "on_hold",   waitMin: 68, time: "1 hr ago"   },
  { id: "P008", name: "James Tan",     urgency: "B", meds: 3, status: "ready",     waitMin: 90, time: "1.5 hr ago" },
];

const STATUS = {
  pending:   { label: "Pending Packing", bg: "#FEF3C7", color: "#92400E" },
  on_hold:   { label: "On Hold",         bg: "#FEE2E2", color: "#991B1B" },
  ready:     { label: "Ready",           bg: "#DCFCE7", color: "#166534" },
  collected: { label: "Collected",       bg: "#F3F4F6", color: "#6B7280" },
};

const URGENCY_COLOR = { A: "#EF4444", B: "#F59E0B", C: "#3B82F6" };
const URGENCY_RANK  = { A: 0, B: 1, C: 2 };

const TABS = [
  { key: "all",     label: "All" },
  { key: "pending", label: "Pending Packing" },
  { key: "on_hold", label: "On Hold" },
  { key: "ready",   label: "Ready for Collection" },
];

const SORTS = [
  { key: "urgency_ac", label: "Urgency (A→C)" },
  { key: "urgency_ca", label: "Urgency (C→A)" },
  { key: "newest",     label: "Newest First" },
  { key: "oldest",     label: "Oldest First" },
];

/* Return the email exactly as entered (or the local part before @).
   Never substitutes a generic fallback — if no email is stored the
   greeting just omits the name entirely. */
function getDisplayName(email) {
  if (!email) return "";
  return email; // show the full email the user logged in with
}

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return "Good morning";
  if (h >= 12 && h < 18) return "Good afternoon";
  return "Good evening";
}

function getFormattedDate() {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function getProgressInfo(waitMin) {
  if (waitMin < 20) return { pct: 25,  color: "#F59E0B" };
  if (waitMin < 40) return { pct: 50,  color: "#F59E0B" };
  if (waitMin < 60) return { pct: 75,  color: "#F59E0B" };
  return               { pct: 100, color: "#EF4444" };
}


export default function PharmacistDashboard() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("all");
  const [sort,      setSort]      = useState("urgency_ac");

  /* Merge any localStorage status overrides from the packing flow */
  const livePatients = PATIENTS.map((p) => ({
    ...p,
    status: localStorage.getItem(`patient-status-${p.id}`) ?? p.status,
  }));

  const statusCounts = livePatients.reduce(
    (acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc; },
    { pending: 0, on_hold: 0, ready: 0, collected: 0 }
  );

  const visiblePatients = useMemo(() => {
    const base = PATIENTS.map((p) => ({
      ...p,
      status: localStorage.getItem(`patient-status-${p.id}`) ?? p.status,
    }));
    const filtered = activeTab === "all" ? base : base.filter((p) => p.status === activeTab);
    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "urgency_ac": return URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency];
        case "urgency_ca": return URGENCY_RANK[b.urgency] - URGENCY_RANK[a.urgency];
        case "newest":     return a.waitMin - b.waitMin;
        case "oldest":     return b.waitMin - a.waitMin;
        default:           return 0;
      }
    });
  }, [activeTab, sort]);

  const displayName = getDisplayName(localStorage.getItem("pilly-user-email"));

  return (
    <div className="pharm-dash">

      {/* ── Hero greeting ── */}
      <section className="pd-hero">
        <h1 className="pd-greeting">
          {getGreeting()}{displayName ? `, ${displayName}` : ""}
        </h1>
        <p className="pd-date">{getFormattedDate()}</p>
      </section>

      {/* ── Compact stats strip (sticky below header) ── */}
      <div className="pd-stats" aria-label="Status summary">
        <div className="pd-stats-inner">
          <div className="pd-stat-item">
            <span className="ps-num">{statusCounts.pending}</span>
            <span className="ps-label">PENDING PACKING</span>
          </div>
          <div className="pd-stat-sep" aria-hidden="true" />
          <div className="pd-stat-item">
            <span className="ps-num">{statusCounts.on_hold}</span>
            <span className="ps-label">ON HOLD</span>
          </div>
          <div className="pd-stat-sep" aria-hidden="true" />
          <div className="pd-stat-item">
            <span className="ps-num">{statusCounts.ready}</span>
            <span className="ps-label">READY FOR COLLECTION</span>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <main className="pd-content">

        {/* Filter + sort row */}
        <div className="pd-controls">
          <div className="pd-tabs" role="tablist" aria-label="Filter by status">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={activeTab === t.key}
                className={`pd-tab${activeTab === t.key ? " active" : ""}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <label className="pd-sort">
            <span>Sort by:</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </label>
        </div>

        {/* Patient card list */}
        <div className="pd-list">
          {visiblePatients.length === 0 ? (
            <div className="pd-empty">
              <svg
                className="pd-empty-pill"
                viewBox="0 0 80 40"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <rect x="0" y="0" width="80" height="40" rx="20" fill="#E2E8F0"/>
                <rect x="0" y="0" width="40" height="40" rx="20" fill="#40E0D0"/>
                <line x1="40" y1="3" x2="40" y2="37" stroke="#fff" strokeWidth="2.5"/>
              </svg>
              <p className="pd-empty-title">All clear here!</p>
              <p className="pd-empty-sub">No patients in this category right now</p>
            </div>
          ) : (
            visiblePatients.map((p, i) => {
              const st = STATUS[p.status];
              const stripeColor = URGENCY_COLOR[p.urgency];
              const prog = p.status === "pending" ? getProgressInfo(p.waitMin) : null;

              return (
                <button
                  key={p.id}
                  type="button"
                  className="pd-card"
                  style={{ "--stripe": stripeColor, "--delay": `${i * 60}ms` }}
                  onClick={() => { console.log(p.id); navigate(`/pharmacist/pack/${p.id}`); }}
                  aria-label={`${p.name}, urgency ${p.urgency}, ${st.label}`}
                >
                  <span className="pd-stripe" aria-hidden="true" />

                  <span className="pd-urgency" style={{ background: stripeColor }} aria-hidden="true">
                    {p.urgency}
                  </span>

                  <div className="pd-info">
                    <div className="pd-name-row">
                      <span className="pd-name">{p.name}</span>
                      <span className="pd-pid">{p.id}</span>
                    </div>
                    <div className="pd-meds">x{p.meds} meds</div>
                    {prog && (
                      <div className="pd-progress-wrap">
                        <div className="pd-progress-bar">
                          <div
                            className="pd-progress-fill"
                            style={{ width: `${prog.pct}%`, background: prog.color }}
                          />
                        </div>
                        <span className="pd-progress-label">Waiting {p.waitMin} min</span>
                      </div>
                    )}
                  </div>

                  <div className="pd-right">
                    <span className="pd-status" style={{ background: st.bg, color: st.color }}>
                      {st.label}
                    </span>
                    <span className="pd-time">{p.time}</span>
                  </div>

                  <span className="pd-chevron" aria-hidden="true">
                    <FaChevronRight />
                  </span>
                </button>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
