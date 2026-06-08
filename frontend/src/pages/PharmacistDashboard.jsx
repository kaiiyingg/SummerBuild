import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaChevronRight } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import "./PharmacistDashboard.css";

function useCountUp(target, duration = 700) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    const start = performance.now();
    let raf;
    function tick(now) {
      const t = Math.min((now - start) / duration, 1);
      setCount(Math.round(t * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return count;
}

function StatCard({ cfg, count, isActive, onClick }) {
  const display = useCountUp(count);
  return (
    <button
      type="button"
      className={`pd-stat-card${isActive ? " active" : ""}`}
      style={{ "--stat-accent": cfg.accent }}
      onClick={onClick}
      aria-pressed={isActive}
      aria-label={`${cfg.label}: ${count}`}
    >
      <span className="ps-num">{display}</span>
      <span className="ps-label">{cfg.label}</span>
    </button>
  );
}

/* ── Static data ── */
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
  pending:   { label: "Pending Packing", bg: "#FFFBEB", color: "#92400E", border: "#FDE68A" },
  on_hold:   { label: "On Hold",         bg: "#FEF2F2", color: "#991B1B", border: "#FECACA" },
  ready:     { label: "Ready",           bg: "#F0FDF4", color: "#166534", border: "#BBF7D0" },
  collected: { label: "Collected",       bg: "#F9FAFB", color: "#6B7280", border: "#E5E7EB" },
};

const URGENCY_COLOR = { A: "#DC2626", B: "#D97706", C: "#2563EB" };
const URGENCY_BG = {
  A: "radial-gradient(circle at 35% 35%, #F87171, #DC2626)",
  B: "radial-gradient(circle at 35% 35%, #FBBF24, #D97706)",
  C: "radial-gradient(circle at 35% 35%, #60A5FA, #2563EB)",
};

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

const URGENCY_RANK = { A: 0, B: 1, C: 2 };

function getDisplayName(email) {
  if (!email) return "";
  return email;
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
  if (waitMin < 20) return { pct: 25,  color: "#22C55E" };
  if (waitMin < 40) return { pct: 50,  color: "#F59E0B" };
  if (waitMin < 60) return { pct: 75,  color: "#F97316" };
  return               { pct: 100, color: "#EF4444" };
}

/* Sidebar stat cards */
const STAT_CONFIG = {
  pending: { label: "Pending Packing", accent: "#D97706", tab: "pending" },
  on_hold: { label: "On Hold",         accent: "#DC2626", tab: "on_hold" },
  ready:   { label: "Ready",           accent: "#16A34A", tab: "ready"   },
};

/* Urgency legend */
const URGENCY_LEGEND = [
  { level: "A", color: "#DC2626", label: "High Priority",   desc: "Immediate attention required" },
  { level: "B", color: "#D97706", label: "Medium Priority", desc: "Attend within 30 minutes" },
  { level: "C", color: "#2563EB", label: "Routine",         desc: "Standard processing time" },
];


export default function PharmacistDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");
  const [sort,      setSort]      = useState("urgency_ac");

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
      <div className="pd-layout">

        {/* ── Left sidebar ── */}
        <aside className="pd-sidebar" aria-label="Queue overview">

          {/* Greeting */}
          <div className="pd-greeting-block">
            <h1 className="pd-greeting">
              {getGreeting()}{displayName ? "," : ""}<br />
              {displayName || "Pharmacist"}
            </h1>
            <p className="pd-date">{getFormattedDate()}</p>
          </div>

          {/* Queue status counts */}
          <p className="pd-sidebar-label">Queue Status</p>
          <div className="pd-stat-cards">
            {Object.entries(STAT_CONFIG).map(([key, cfg]) => (
              <StatCard
                key={key}
                cfg={cfg}
                count={statusCounts[key]}
                isActive={activeTab === cfg.tab}
                onClick={() => setActiveTab(activeTab === cfg.tab ? "all" : cfg.tab)}
              />
            ))}
          </div>


        </aside>

        {/* ── Right: queue list ── */}
        <main className="pd-main">

          {/* Filter + sort */}
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

          {/* Patient list */}
          <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + sort}
            className="pd-list"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            {visiblePatients.length === 0 ? (
              <div className="pd-empty">
                <svg
                  className="pd-empty-pill"
                  viewBox="0 0 80 40"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <rect x="0" y="0" width="80" height="40" rx="20" fill="#E2E8F0"/>
                  <rect x="0" y="0" width="40" height="40" rx="20" fill="#2DD4C8" opacity="0.4"/>
                  <line x1="40" y1="3" x2="40" y2="37" stroke="#fff" strokeWidth="2.5"/>
                </svg>
                <p className="pd-empty-title">All clear here!</p>
                <p className="pd-empty-sub">No patients in this category right now</p>
              </div>
            ) : (
              visiblePatients.map((p, i) => {
                const st   = STATUS[p.status];
                const prog = p.status === "pending" ? getProgressInfo(p.waitMin) : null;

                return (
                  <button
                    key={p.id}
                    type="button"
                    className="pd-card"
                    style={{ "--delay": `${i * 55}ms` }}
                    onClick={() => navigate(`/pharmacist/pack/${p.id}`)}
                    aria-label={`${p.name}, urgency ${p.urgency}, ${st.label}`}
                  >
                    <span
                      className={`pd-urgency pd-urgency-${p.urgency}`}
                      style={{ background: URGENCY_BG[p.urgency] }}
                      aria-hidden="true"
                    >
                      {p.urgency}
                    </span>

                    <div className="pd-info">
                      <div className="pd-name-row">
                        <span className="pd-name">{p.name}</span>
                        <span className="pd-pid">{p.id}</span>
                      </div>
                      <div className="pd-meds">{p.meds} medication{p.meds !== 1 ? "s" : ""}</div>
                      {prog && (
                        <div className="pd-progress-wrap">
                          <div className="pd-progress-bar">
                            <motion.div
                              className="pd-progress-fill"
                              style={{ background: prog.color }}
                              initial={{ width: 0 }}
                              animate={{ width: `${prog.pct}%` }}
                              transition={{ duration: 0.7, ease: "easeOut", delay: i * 0.05 }}
                            />
                          </div>
                          <span className="pd-progress-label">Waiting {p.waitMin} min</span>
                        </div>
                      )}
                    </div>

                    <div className="pd-right">
                      <span
                        className="pd-status"
                        style={{ background: st.bg, color: st.color, borderColor: st.border }}
                      >
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
          </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
