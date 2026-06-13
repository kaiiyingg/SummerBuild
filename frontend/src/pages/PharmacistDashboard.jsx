import { useEffect, useState, useMemo} from "react";
import { useNavigate } from "react-router-dom";
import { FaChevronRight } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { fetchPatients, subscribeToPatientChanges } from "../services/pharmacyData";
import "./PharmacistDashboard.css";

function useCountUp(target) {
  return target;
}

function StatCard({ cfg, count, isActive, onClick }) {
  const display = useCountUp(count);

  return (
    <button
      type="button"
      className={`pd-stat-card ${isActive ? "active" : ""}`}
      style={{ "--stat-accent": cfg.accent }}
      onClick={onClick}
    >
      <span className="ps-label">{cfg.label}</span>
      <span className="ps-num">{display}</span>
    </button>
  );
}

const STATUS = {
  pending: { label: "Pending Packing", bg: "#FFFBEB", color: "#92400E", border: "#FDE68A" },
  on_hold: { label: "On Hold", bg: "#FEF2F2", color: "#991B1B", border: "#FECACA" },
  ready: { label: "Ready", bg: "#F0FDF4", color: "#166534", border: "#BBF7D0" },
  collected: { label: "Collected", bg: "#F9FAFB", color: "#6B7280", border: "#E5E7EB" },
};

const URGENCY_BG = {
  A: "radial-gradient(circle at 35% 35%, #F87171, #EF4444)",
  B: "radial-gradient(circle at 35% 35%, #FBBF24, #F59E0B)",
  C: "radial-gradient(circle at 35% 35%, #60A5FA, #3B82F6)",
};

const TABS = [
  { key: "all", label: "All Workload" },
  { key: "pending", label: "Pending Packing" },
  { key: "on_hold", label: "On Hold" },
  { key: "ready", label: "Ready" },
  { key: "collected", label: "Collected" },
];

const SORTS = [
  { key: "urgency_ac", label: "Urgency (A→C)" },
  { key: "urgency_ca", label: "Urgency (C→A)" },
  { key: "newest", label: "Newest First" },
  { key: "oldest", label: "Oldest First" },
];

const URGENCY_RANK = { A: 0, B: 1, C: 2 };

const STAT_CONFIG = {
  pending: { label: "Pending Packing", accent: "#F59E0B", tab: "pending" },
  on_hold: { label: "On Hold", accent: "#EF4444", tab: "on_hold" },
  ready: { label: "Ready", accent: "#22C55E", tab: "ready" },
  collected: { label: "Collected", accent: "#94A3B8", tab: "collected" },
};

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 18) return "Good afternoon";
  return "Good evening";
}

function getFormattedDate() {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function PharmacistDashboard() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("all");
  const [sort, setSort] = useState("urgency_ac");

  const [searchQuery, setSearchQuery] = useState("");
  const [livePatients, setLivePatients] = useState([]);

  useEffect(() => {
    let isActive = true;

    const syncPatients = async () => {
      const nextPatients = await fetchPatients();
      if (isActive) {
        setLivePatients(nextPatients);
      }
    };

    void syncPatients();
    const unsubscribe = subscribeToPatientChanges(() => {
      void syncPatients();
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  const statusCounts = livePatients.reduce(
    (acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    },
    { pending: 0, on_hold: 0, ready: 0, collected: 0 }
  );

  const visiblePatients = useMemo(() => {
    const filteredByTab =
      activeTab === "all"
        ? livePatients
        : livePatients.filter((p) => p.status === activeTab);

    const filtered = filteredByTab.filter((p) =>
      p.queueNo.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "urgency_ac":
          return URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency];
        case "urgency_ca":
          return URGENCY_RANK[b.urgency] - URGENCY_RANK[a.urgency];
        case "newest":
          return a.waitMin - b.waitMin;
        case "oldest":
          return b.waitMin - a.waitMin;
        default:
          return 0;
      }
    });
  }, [activeTab, sort, livePatients, searchQuery]);

  const resetDemoData = () => {
    Object.keys(localStorage).forEach((key) => {
      if (
        key.startsWith("patient-status-") ||
        key.startsWith("verified-meds-") ||
        key.startsWith("hold-reason-")
      ) {
        localStorage.removeItem(key);
      }
    });

    window.location.reload();
  };

  const displayName =
    localStorage.getItem("pilly-user-name") ||
    localStorage.getItem("pilly-user-email") ||
    "Pharmacist";

  return (
    <div className="pharm-dash">

      <div className="pd-layout">
        <aside className="pd-sidebar">
          <section className="pd-session">
            <p className="pd-sidebar-label">Session</p>
            <h1>
              {getGreeting()},<br />
              {displayName}
            </h1>
            <p>{getFormattedDate()}</p>
          </section>

          <section>
            <p className="pd-sidebar-label">Queue Status</p>

            <div className="pd-stat-cards">
              {Object.entries(STAT_CONFIG).map(([key, cfg]) => (
                <StatCard
                  key={key}
                  cfg={cfg}
                  count={statusCounts[key]}
                  isActive={activeTab === cfg.tab}
                  onClick={() =>
                    setActiveTab(activeTab === cfg.tab ? "all" : cfg.tab)
                  }
                />
              ))}
            </div>
          </section>

          <button
            type="button"
            className="reset-demo-btn"
            onClick={resetDemoData}
          >
            Reset Demo Data
          </button>
        </aside>

        <main className="pd-main">
          <div className="pd-controls">
            <div className="pd-tabs" role="tablist">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={`pd-tab ${activeTab === tab.key ? "active" : ""}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="pd-control-right">
              <label className="pd-search">
                <span>Search:</span>
                <input
                  type="text"
                  placeholder="Queue no."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </label>

              <label className="pd-sort">
                <span>Sort:</span>
                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                  {SORTS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          
          <div className="pd-table-header">
            <span>QUEUE</span>
            <span>NO.</span>
            <span>PATIENT DETAIL</span>
            <span>ITEMS</span>
            <span>STATUS</span>
            <span>ELAPSED</span>
            <span></span>
          </div>

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
                  <p className="pd-empty-title">All clear here!</p>
                  <p className="pd-empty-sub">
                    No patients in this category right now.
                  </p>
                </div>
              ) : (
                visiblePatients.map((p) => {
                  const status = STATUS[p.status];

                  return (
                    <button
                      key={p.id}
                      type="button"
                      className="pd-card"
                      onClick={() => navigate(`/pharmacist/pack/${p.id}`)}
                    >
                      <div className="pd-type-cell">
                        <span
                          className={`pd-urgency pd-urgency-${p.urgency}`}
                          style={{ background: URGENCY_BG[p.urgency] }}
                        >
                          {p.urgency}
                        </span>
                      </div>

                      <div className="pd-queue-cell">
                        {p.queueNo.slice(1)}
                      </div>

                      <div className="pd-patient-cell">
                        <span className="pd-name">{p.name}</span>
                      </div>

                      <div className="pd-items-cell">
                        {p.meds} med{p.meds !== 1 ? "s" : ""}
                      </div>

                      <div className="pd-status-cell">
                        <span
                          className="pd-status"
                          style={{
                            background: status.bg,
                            color: status.color,
                            borderColor: status.border,
                          }}
                        >
                          {status.label}
                        </span>
                      </div>

                      <div className="pd-elapsed-cell">{p.time}</div>

                      <div className="pd-chevron-cell">
                        <FaChevronRight />
                      </div>
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
