import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaSearch, FaFilter, FaFileExport, FaArrowUp, FaArrowDown, FaCheck } from "react-icons/fa";
import { FiUsers, FiPackage, FiClock, FiCheckCircle } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import "./PharmacistDashboard.css";

const PATIENTS = [
  { id: "P001", queueNo: "A127", name: "Tan Wei Ming", urgency: "A", meds: 4, status: "pending",   waitMin: 8,  time: "8 min ago"  },
  { id: "P002", queueNo: "B291", name: "Siti Rahmah",  urgency: "B", meds: 2, status: "on_hold",   waitMin: 15, time: "15 min ago" },
  { id: "P003", queueNo: "A342", name: "David Lim",    urgency: "A", meds: 6, status: "ready",     waitMin: 22, time: "22 min ago" },
  { id: "P004", queueNo: "C103", name: "Priya Nair",   urgency: "C", meds: 1, status: "pending",   waitMin: 31, time: "31 min ago" },
  { id: "P005", queueNo: "B667", name: "Mohammad Faiz",urgency: "B", meds: 3, status: "collected", waitMin: 45, time: "45 min ago" },
  { id: "P006", queueNo: "A518", name: "Chen Li Hua",  urgency: "A", meds: 5, status: "pending",   waitMin: 52, time: "52 min ago" },
  { id: "P007", queueNo: "C745", name: "Kavitha Raj",  urgency: "C", meds: 2, status: "on_hold",   waitMin: 68, time: "1 hr ago"   },
  { id: "P008", queueNo: "B184", name: "James Tan",    urgency: "B", meds: 3, status: "ready",     waitMin: 90, time: "1.5 hr ago" },
];

const STATUS_META = {
  pending:   { label: "Pending",   bg: "#FFFBEB", color: "#92400E", border: "#FDE68A" },
  on_hold:   { label: "On Hold",   bg: "#FEF2F2", color: "#991B1B", border: "#FECACA" },
  ready:     { label: "Ready",     bg: "#F0FDF4", color: "#166534", border: "#BBF7D0" },
  collected: { label: "Collected", bg: "#F9FAFB", color: "#6B7280", border: "#E5E7EB" },
};

const URGENCY_META = {
  A: { label: "High",   bg: "#FEF2F2", color: "#DC2626", border: "#FECACA" },
  B: { label: "Medium", bg: "#FFFBEB", color: "#D97706", border: "#FDE68A" },
  C: { label: "Low",    bg: "#EFF6FF", color: "#2563EB", border: "#BFDBFE" },
};

const TABS = [
  { key: "all",       label: "All" },
  { key: "pending",   label: "Pending" },
  { key: "on_hold",   label: "On Hold" },
  { key: "ready",     label: "Ready" },
  { key: "collected", label: "Collected" },
];

const URGENCY_RANK = { A: 0, B: 1, C: 2 };

const COLUMNS = [
  { key: "queueNo",  label: "Queue No." },
  { key: "name",     label: "Patient"   },
  { key: "urgency",  label: "Priority"  },
  { key: "meds",     label: "Items",    center: true },
  { key: "status",   label: "Status"    },
  { key: "waitMin",  label: "Wait Time" },
];

const SORT_OPTIONS = [
  { value: "urgency|asc",  label: "Priority (High → Low)" },
  { value: "urgency|desc", label: "Priority (Low → High)" },
  { value: "waitMin|asc",  label: "Newest First"          },
  { value: "waitMin|desc", label: "Oldest First"          },
  { value: "name|asc",     label: "Name (A → Z)"          },
  { value: "name|desc",    label: "Name (Z → A)"          },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 18) return "Good afternoon";
  return "Good evening";
}

function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <span className="pd-sort-neutral">↕</span>;
  return <span className="pd-sort-active">{sortDir === "asc" ? "↑" : "↓"}</span>;
}

// good = whether this change is positive for the pharmacy (drives colour, not direction)
function TrendBadge({ value, up, good }) {
  return (
    <span className={`pd-trend-badge ${good ? "good" : "bad"}`}>
      {up ? <FaArrowUp size={9} /> : <FaArrowDown size={9} />}
      {value}%
    </span>
  );
}

// Yesterday's comparison values — used to compute meaningful percentages
const PREV = { patients: 7, medsToPack: 8, avgWait: 45, ready: 1 };
function pct(now, prev) {
  return Math.abs(((now - prev) / prev) * 100).toFixed(1);
}

export default function PharmacistDashboard() {
  const navigate = useNavigate();
  const [activeTab,     setActiveTab]     = useState("all");
  const [searchQuery,   setSearchQuery]   = useState("");
  const [sortKey,       setSortKey]       = useState("urgency|asc");
  const [sortCol,       setSortCol]       = useState("urgency");
  const [sortDir,       setSortDir]       = useState("asc");
  const [selected,      setSelected]      = useState(new Set());
  const [filterOpen,    setFilterOpen]    = useState(false);
  const [urgencyFilter, setUrgencyFilter] = useState(new Set(["A", "B", "C"]));
  const filterRef = useRef(null);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    function onClickOutside(e) {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleSortDropdown = (value) => {
    setSortKey(value);
    const [col, dir] = value.split("|");
    setSortCol(col);
    setSortDir(dir);
  };

  const toggleUrgencyFilter = (key) => {
    setUrgencyFilter(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      // keep at least one selected
      if (next.size === 0) return prev;
      return next;
    });
  };

  const clearFilters = () => setUrgencyFilter(new Set(["A", "B", "C"]));

  const livePatients = useMemo(() =>
    PATIENTS.map(p => ({
      ...p,
      status: localStorage.getItem(`patient-status-${p.id}`) ?? p.status,
    })),
  []);

  const statusCounts = livePatients.reduce(
    (acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc; },
    { pending: 0, on_hold: 0, ready: 0, collected: 0 }
  );

  const medsToPack = livePatients.filter(p => p.status === "pending").reduce((s, p) => s + p.meds, 0);
  const avgWait    = Math.round(livePatients.reduce((s, p) => s + p.waitMin, 0) / livePatients.length);

  // Compared to PREV (yesterday's session)
  const topStats = [
    {
      label: "Total Patients",  value: livePatients.length, unit: "",
      Icon: FiUsers,  accent: "#3B82F6",
      trend: pct(livePatients.length, PREV.patients),
      trendUp: livePatients.length >= PREV.patients,
      trendGood: true,   // more patients is a positive sign
    },
    {
      label: "Meds to Pack",    value: medsToPack,          unit: " items",
      Icon: FiPackage, accent: "#F59E0B",
      trend: pct(medsToPack, PREV.medsToPack),
      trendUp: medsToPack >= PREV.medsToPack,
      trendGood: medsToPack <= PREV.medsToPack,   // fewer meds to pack = less backlog = good
    },
    {
      label: "Avg Wait Time",   value: avgWait,             unit: " min",
      Icon: FiClock,   accent: "#8B5CF6",
      trend: pct(avgWait, PREV.avgWait),
      trendUp: avgWait >= PREV.avgWait,
      trendGood: avgWait <= PREV.avgWait,          // shorter wait = good
    },
    {
      label: "Ready for Collection", value: statusCounts.ready, unit: "",
      Icon: FiCheckCircle, accent: "#22C55E",
      trend: pct(statusCounts.ready, PREV.ready),
      trendUp: statusCounts.ready >= PREV.ready,
      trendGood: statusCounts.ready >= PREV.ready, // more ready = good
    },
  ];

  const visiblePatients = useMemo(() => {
    const byTab    = activeTab === "all" ? livePatients : livePatients.filter(p => p.status === activeTab);
    const byUrgency = byTab.filter(p => urgencyFilter.has(p.urgency));
    const bySearch = byUrgency.filter(p =>
      p.queueNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return [...bySearch].sort((a, b) => {
      let cmp = 0;
      if      (sortCol === "urgency") cmp = URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency];
      else if (sortCol === "meds")    cmp = a.meds    - b.meds;
      else if (sortCol === "waitMin") cmp = a.waitMin - b.waitMin;
      else if (sortCol === "name")    cmp = a.name.localeCompare(b.name);
      else if (sortCol === "queueNo") cmp = a.queueNo.localeCompare(b.queueNo);
      else if (sortCol === "status")  cmp = a.status.localeCompare(b.status);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [activeTab, livePatients, searchQuery, sortCol, sortDir, urgencyFilter]);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const toggleSelect = (id, e) => {
    e.stopPropagation();
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const toggleAll = () =>
    setSelected(s => s.size === visiblePatients.length ? new Set() : new Set(visiblePatients.map(p => p.id)));

  const handleExport = () => {
    const headers = ["Queue No.", "Patient", "Priority", "Items", "Status", "Wait Time"];
    const rows = visiblePatients.map(p => [
      p.queueNo,
      `"${p.name}"`,
      URGENCY_META[p.urgency].label,
      `${p.meds} med${p.meds !== 1 ? "s" : ""}`,
      STATUS_META[p.status].label,
      p.time,
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href     = url;
    link.download = `patients_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const resetDemoData = () => {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith("patient-status-") || key.startsWith("verified-meds-") || key.startsWith("hold-reason-"))
        localStorage.removeItem(key);
    });
    window.location.reload();
  };

  const displayName   = localStorage.getItem("pilly-user-email") || "Pharmacist";
  const allChecked    = selected.size === visiblePatients.length && visiblePatients.length > 0;
  const filtersActive = urgencyFilter.size < 3;

  return (
    <div className="pharm-dash">
      <div className="pd-page">

        {/* ── Page header ──────────────────────────────────── */}
        <div className="pd-page-header">
          <div>
            <h1 className="pd-title">Dashboard</h1>
            <p className="pd-subtitle">{getGreeting()}, {displayName}</p>
          </div>
          <button className="pd-reset-btn" onClick={resetDemoData}>Reset Demo</button>
        </div>

        {/* ── Top stat cards ───────────────────────────────── */}
        <div className="pd-top-stats">
          {topStats.map(s => (
            <div className="pd-top-card" key={s.label}>
              <div className="pd-top-card-body">
                <div className="pd-top-card-text">
                  <span className="pd-top-card-label">{s.label}</span>
                  <span className="pd-top-card-value">{s.value.toLocaleString()}{s.unit}</span>
                </div>
                <div className="pd-top-card-icon" style={{ background: s.accent + "1a", color: s.accent }}>
                  <s.Icon size={22} />
                </div>
              </div>
              <TrendBadge value={s.trend} up={s.trendUp} good={s.trendGood} />
            </div>
          ))}
        </div>

        {/* ── Table section ────────────────────────────────── */}
        <div className="pd-table-section">

          {/* Tabs */}
          <div className="pd-toolbar-top">
            <div className="pd-tabs" role="tablist">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  className={`pd-tab ${activeTab === tab.key ? "active" : ""}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                  <span className="pd-tab-count">
                    {tab.key === "all" ? livePatients.length : statusCounts[tab.key] ?? 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Search + controls */}
          <div className="pd-toolbar-bottom">
            <div className="pd-search-box">
              <FaSearch className="pd-search-icon" />
              <input
                type="text"
                placeholder="Search queue no. or patient name"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="pd-toolbar-actions">
              <label className="pd-sort-label">
                Sort:
                <select
                  value={sortKey}
                  onChange={e => handleSortDropdown(e.target.value)}
                  className="pd-sort-select"
                >
                  {SORT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>

              {/* Filters */}
              <div className="pd-filter-wrap" ref={filterRef}>
                <button
                  className={`pd-action-btn ${filtersActive ? "active" : ""}`}
                  onClick={() => setFilterOpen(o => !o)}
                >
                  <FaFilter size={11} />
                  Filters
                  {filtersActive && <span className="pd-filter-dot" />}
                </button>

                {filterOpen && (
                  <div className="pd-filter-dropdown">
                    <div className="pd-filter-header">
                      <span>Filter by Priority</span>
                      {filtersActive && (
                        <button className="pd-filter-clear" onClick={clearFilters}>Clear</button>
                      )}
                    </div>
                    {Object.entries(URGENCY_META).map(([key, meta]) => (
                      <label key={key} className="pd-filter-option">
                        <span
                          className={`pd-filter-checkbox ${urgencyFilter.has(key) ? "checked" : ""}`}
                          onClick={() => toggleUrgencyFilter(key)}
                        >
                          {urgencyFilter.has(key) && <FaCheck size={9} />}
                        </span>
                        <span className="pd-pill" style={{ background: meta.bg, color: meta.color, borderColor: meta.border }}>
                          {meta.label}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Export */}
              <button className="pd-action-btn" onClick={handleExport}>
                <FaFileExport size={11} />
                Export
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="pd-table-wrap">
            <table className="pd-table">
              <thead>
                <tr>
                  <th className="pd-th-chk">
                    <input type="checkbox" checked={allChecked} onChange={toggleAll} />
                  </th>
                  {COLUMNS.map(col => (
                    <th key={col.key} className={`pd-th${col.center ? " pd-th-center" : ""}`} onClick={() => handleSort(col.key)}>
                      {col.label}
                      <SortIcon col={col.key} sortCol={sortCol} sortDir={sortDir} />
                    </th>
                  ))}
                  <th className="pd-th pd-th-action"></th>
                </tr>
              </thead>

              <AnimatePresence mode="wait">
                <motion.tbody
                  key={activeTab + sortCol + sortDir + searchQuery + [...urgencyFilter].join()}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.14 }}
                >
                  {visiblePatients.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="pd-empty-row">
                        No patients match the current filters.
                      </td>
                    </tr>
                  ) : (
                    visiblePatients.map(p => {
                      const sm  = STATUS_META[p.status];
                      const urg = URGENCY_META[p.urgency];
                      return (
                        <tr
                          key={p.id}
                          className={`pd-row${selected.has(p.id) ? " selected" : ""}`}
                          onClick={() => navigate(`/pharmacist/pack/${p.id}`)}
                        >
                          <td className="pd-td pd-td-chk" onClick={e => toggleSelect(p.id, e)}>
                            <input type="checkbox" checked={selected.has(p.id)} onChange={() => {}} />
                          </td>
                          <td className="pd-td pd-td-queue">{p.queueNo}</td>
                          <td className="pd-td pd-td-name">{p.name}</td>
                          <td className="pd-td">
                            <span className="pd-pill" style={{ background: urg.bg, color: urg.color, borderColor: urg.border }}>
                              {urg.label}
                            </span>
                          </td>
                          <td className="pd-td pd-td-center">{p.meds} med{p.meds !== 1 ? "s" : ""}</td>
                          <td className="pd-td">
                            <span className="pd-pill" style={{ background: sm.bg, color: sm.color, borderColor: sm.border }}>
                              {sm.label}
                            </span>
                          </td>
                          <td className="pd-td pd-td-muted">{p.time}</td>
                          <td className="pd-td pd-td-dots">···</td>
                        </tr>
                      );
                    })
                  )}
                </motion.tbody>
              </AnimatePresence>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
