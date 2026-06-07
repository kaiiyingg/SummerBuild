import { useState, useRef, useEffect } from "react";
import { Clock, Users, Lock, AlertTriangle, X, Calendar, Bell, ChevronLeft, ChevronRight, Check, RefreshCw, MapPin, User, Hash } from "lucide-react";

const C = {
  teal:        "#45C5BC",
  tealDark:    "#38B2A9",
  tealLight:   "#E8FAFA",
  bg:          "#F8FAFC",
  muted:       "#F1F5F9",
  textPrimary: "#1E293B",
  textSecond:  "#64748B",
  textDisabled:"#94A3B8",
  border:      "#E2E8F0",
  amber:       "#F59E0B",
  amberLight:  "#FFFBEB",
  amberText:   "#92400E",
  green:       "#10B981",
  red:         "#EF4444",
};

type QueueStatus   = "waiting" | "almost" | "now" | "done";

// ── Header status badge (white pill on teal/green header) ──
function HeaderBadge({ status }: { status: QueueStatus }) {
  const base: React.CSSProperties = {
    fontSize: "11px", fontWeight: 700, letterSpacing: "0.6px", textTransform: "uppercase",
    padding: "3px 12px", borderRadius: "999px", fontFamily: "'Open Sans', sans-serif",
    background: "rgba(255,255,255,0.25)", color: "white", border: "1px solid rgba(255,255,255,0.4)",
  };
  if (status === "waiting")  return <span style={base}>Waiting</span>;
  if (status === "almost")   return <span className="animate-pulse" style={{ ...base, background: C.amber, border: "none" }}>Almost Your Turn</span>;
  if (status === "done")     return <span style={{ ...base, background: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.5)" }}>Completed</span>;
  return <span style={{ ...base, background: C.green, border: "none" }}>Now Serving</span>;
}

function QueueStrip({ myNumber, servingNumber }: { myNumber: number; servingNumber: number }) {
  const start = Math.max(1, servingNumber - 2);
  const end   = myNumber + 3;
  const range: number[] = [];
  for (let i = start; i <= end; i++) range.push(i);

  return (
    <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
      {range.map((n) => {
        const isPast    = n < servingNumber;
        const isServing = n === servingNumber;
        const isAhead   = n > servingNumber && n < myNumber;
        const isMe      = n === myNumber;

        let circleBg: string, circleText: string, circleBorder: string | undefined, topLabel: string | null = null;

        if (isPast) {
          circleBg   = "#EEF2F7"; circleText = "#A8B5C3";
        } else if (isServing) {
          circleBg = "#10B981"; circleText = "white"; topLabel = "NOW";
        } else if (isAhead) {
          circleBg = "#F1F5F9"; circleText = "#64748B"; circleBorder = "1px solid #CBD5E1";
        } else if (isMe) {
          circleBg = "#3B82F6"; circleText = "white"; topLabel = "YOU";
        } else {
          circleBg = "#F8FAFC"; circleText = "#C4CFD9"; circleBorder = "1px solid #E2E8F0";
        }

        return (
          <div key={n} className="shrink-0 flex flex-col items-center" style={{ gap: "4px" }}>
            <span style={{
              fontFamily: "'Open Sans', sans-serif", fontSize: "10px", fontWeight: 800,
              color: isServing ? "#10B981" : isMe ? "#3B82F6" : "transparent",
              letterSpacing: "0.5px", height: "14px",
            }}>
              {topLabel ?? "·"}
            </span>
            <div className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: circleBg, border: circleBorder }}>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontWeight: 700, color: circleText }}>
                {n}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}


// ── Calendar / Reschedule sheet ──
const TIME_SLOTS = [
  { time: "9:00 AM",  available: true  }, { time: "9:30 AM",  available: false },
  { time: "10:00 AM", available: true  }, { time: "10:30 AM", available: true  },
  { time: "11:00 AM", available: false }, { time: "11:30 AM", available: true  },
  { time: "2:00 PM",  available: true  }, { time: "2:30 PM",  available: true  },
  { time: "3:00 PM",  available: false }, { time: "3:30 PM",  available: true  },
  { time: "4:00 PM",  available: true  }, { time: "4:30 PM",  available: false },
];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function RescheduleSheet({ onClose }: { onClose: () => void }) {
  const today = new Date(2026, 5, 5);
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayNum    = today.getDate();
  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();
  const isPast  = (d: number) => isCurrentMonth && d < todayNum;
  const isToday = (d: number) => isCurrentMonth && d === todayNum;

  const prevMonth = () => { viewMonth === 0 ? (setViewMonth(11), setViewYear(y=>y-1)) : setViewMonth(m=>m-1); setSelectedDate(null); setSelectedSlot(null); };
  const nextMonth = () => { viewMonth === 11 ? (setViewMonth(0), setViewYear(y=>y+1)) : setViewMonth(m=>m+1); setSelectedDate(null); setSelectedSlot(null); };

  const calCells: (number|null)[] = [...Array(firstDay).fill(null), ...Array.from({length:daysInMonth},(_,i)=>i+1)];
  while (calCells.length % 7 !== 0) calCells.push(null);

  if (confirmed && selectedDate && selectedSlot) return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(15,23,42,0.45)" }} onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-t-3xl p-8 pb-10 flex flex-col items-center text-center" style={{ boxShadow: "0 -8px 40px rgba(0,0,0,0.12)" }} onClick={e=>e.stopPropagation()}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5" style={{ background: "#ECFDF5" }}>
          <Check size={32} color="#10B981" />
        </div>
        <h2 style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"22px", fontWeight:700, color:C.textPrimary, marginBottom:"8px" }}>Collection Rescheduled</h2>
        <p style={{ fontFamily:"'Open Sans',sans-serif", fontSize:"16px", color:C.textSecond, marginBottom:"6px" }}>{MONTHS[viewMonth]} {selectedDate}, {viewYear}</p>
        <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"20px", fontWeight:700, color:C.teal, marginBottom:"24px" }}>{selectedSlot}</p>
        <p style={{ fontFamily:"'Open Sans',sans-serif", fontSize:"15px", color:C.textSecond, marginBottom:"28px" }}>You'll receive a reminder 30 minutes before your slot. Please proceed to Level 1, Pharmacy A.</p>
        <button onClick={onClose} className="w-full py-3.5 rounded-xl text-white" style={{ background:C.teal, fontFamily:"'DM Sans',sans-serif", fontSize:"16px", fontWeight:700 }}>Done</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(15,23,42,0.45)" }} onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-t-3xl pb-8 overflow-y-auto" style={{ maxHeight:"92svh", boxShadow:"0 -8px 40px rgba(0,0,0,0.12)" }} onClick={e=>e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full" style={{ background:C.border }} /></div>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom:`1px solid ${C.border}` }}>
          <div>
            <h2 style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"20px", fontWeight:700, color:C.textPrimary }}>Reschedule Collection</h2>
            <p style={{ fontFamily:"'Open Sans',sans-serif", fontSize:"14px", color:C.textSecond, marginTop:"2px" }}>Medication Collection · Level 1, Pharmacy A</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full" style={{ background:C.muted }}><X size={18} color={C.textSecond} /></button>
        </div>
        <div className="px-6 pt-5 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} className="p-2 rounded-xl" style={{ background:C.muted }}><ChevronLeft size={18} color={C.textPrimary} /></button>
              <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"17px", fontWeight:700, color:C.textPrimary }}>{MONTHS[viewMonth]} {viewYear}</span>
              <button onClick={nextMonth} className="p-2 rounded-xl" style={{ background:C.muted }}><ChevronRight size={18} color={C.textPrimary} /></button>
            </div>
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map(d=><div key={d} className="text-center" style={{ fontFamily:"'Open Sans',sans-serif", fontSize:"12px", fontWeight:700, color:C.textDisabled, paddingBottom:"8px" }}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-y-1">
              {calCells.map((d,i)=>{
                if(!d) return <div key={i}/>;
                const past=isPast(d), todayDay=isToday(d), selected=selectedDate===d;
                return (
                  <button key={i} disabled={past} onClick={()=>{setSelectedDate(d);setSelectedSlot(null);}}
                    className="flex items-center justify-center mx-auto transition-colors"
                    style={{ width:"38px", height:"38px", borderRadius:"50%", background:selected?C.teal:todayDay?C.tealLight:"transparent", border:todayDay&&!selected?`2px solid ${C.teal}`:"none", cursor:past?"not-allowed":"pointer" }}>
                    <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"15px", fontWeight:selected||todayDay?700:400, color:selected?"white":past?C.textDisabled:C.textPrimary }}>{d}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {selectedDate && (
            <div>
              <p style={{ fontFamily:"'Open Sans',sans-serif", fontSize:"13px", fontWeight:700, color:C.textDisabled, letterSpacing:"0.8px", textTransform:"uppercase", marginBottom:"12px" }}>Available Slots — {MONTHS[viewMonth]} {selectedDate}</p>
              <div className="grid grid-cols-3 gap-2">
                {TIME_SLOTS.map(slot=>{
                  const sel=selectedSlot===slot.time;
                  return (
                    <button key={slot.time} disabled={!slot.available} onClick={()=>setSelectedSlot(slot.time)}
                      className="py-3 rounded-xl text-center transition-colors"
                      style={{ background:sel?C.teal:slot.available?C.muted:"#F1F5F9", border:sel?"none":slot.available?`1px solid ${C.border}`:"none", cursor:slot.available?"pointer":"not-allowed" }}>
                      <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"14px", fontWeight:600, color:sel?"white":slot.available?C.textPrimary:C.textDisabled, textDecoration:!slot.available?"line-through":"none" }}>{slot.time}</span>
                      {!slot.available && <p style={{ fontFamily:"'Open Sans',sans-serif", fontSize:"11px", color:C.textDisabled, marginTop:"2px" }}>Full</p>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {selectedDate && selectedSlot && (
            <div className="rounded-xl p-4" style={{ background:C.tealLight, border:`1px solid ${C.teal}30` }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background:C.teal }}><Calendar size={18} color="white"/></div>
                <div>
                  <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"16px", fontWeight:700, color:C.textPrimary }}>{MONTHS[viewMonth]} {selectedDate}, {viewYear}</p>
                  <p style={{ fontFamily:"'Open Sans',sans-serif", fontSize:"15px", color:C.textSecond }}>{selectedSlot}</p>
                </div>
              </div>
            </div>
          )}
          <button onClick={()=>{if(selectedDate&&selectedSlot)setConfirmed(true);}}
            className="w-full py-3.5 rounded-xl text-white hover:opacity-90 transition-opacity"
            style={{ background:selectedDate&&selectedSlot?C.teal:C.border, fontFamily:"'DM Sans',sans-serif", fontSize:"16px", fontWeight:700, cursor:selectedDate&&selectedSlot?"pointer":"not-allowed" }}>
            Confirm Reschedule
          </button>
        </div>
      </div>
    </div>
  );
}


function ReRegisterSheet({ onClose }: { onClose: () => void }) {
  const [confirmed, setConfirmed] = useState(false);
  const [newQueue]  = useState("B052");
  const reasons     = ["Follow-up visit", "New consultation", "Collect medication", "Other"];
  const [reason, setReason] = useState("Follow-up visit");

  if (confirmed) return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(15,23,42,0.45)" }} onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-t-3xl p-8 pb-10 flex flex-col items-center text-center"
        style={{ boxShadow: "0 -8px 40px rgba(0,0,0,0.12)" }} onClick={(e) => e.stopPropagation()}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: C.tealLight }}>
          <Check size={30} color={C.teal} strokeWidth={2.5} />
        </div>
        <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "14px", color: C.textSecond, marginBottom: "4px" }}>Your new queue number</p>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "56px", fontWeight: 800, color: C.tealDark, lineHeight: 1, marginBottom: "8px" }}>
          {newQueue}
        </div>
        <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "15px", color: C.textSecond, marginBottom: "6px" }}>
          Please proceed to <strong style={{ color: C.textPrimary }}>Level 1, Pharmacy A</strong>
        </p>
        <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "14px", color: C.textDisabled, marginBottom: "28px" }}>
          You will be notified when your number is called.
        </p>
        <button onClick={onClose} className="w-full py-3.5 rounded-xl text-white"
          style={{ background: C.teal, fontFamily: "'DM Sans', sans-serif", fontSize: "16px", fontWeight: 700 }}>
          Done
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(15,23,42,0.45)" }} onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-t-3xl pb-8 overflow-y-auto"
        style={{ maxHeight: "90svh", boxShadow: "0 -8px 40px rgba(0,0,0,0.12)" }} onClick={(e) => e.stopPropagation()}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: C.border }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
          <div>
            <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "20px", fontWeight: 700, color: C.textPrimary }}>Re-register</h2>
            <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "14px", color: C.textSecond, marginTop: "2px" }}>Get a new queue number</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full" style={{ background: C.muted }}>
            <X size={18} color={C.textSecond} />
          </button>
        </div>

        <div className="px-6 pt-5 space-y-5">

          {/* Missed queue notice */}
          <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: C.amberLight, border: `1px solid ${C.amber}40` }}>
            <AlertTriangle size={17} color={C.amber} className="shrink-0 mt-0.5" />
            <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "14px", color: C.amberText, lineHeight: "1.5" }}>
              Your previous queue number <strong>B047</strong> has expired. A new number will be issued at the next available slot.
            </p>
          </div>

          {/* Patient info (read-only) */}
          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
            <div className="px-4 py-2" style={{ background: C.muted, borderBottom: `1px solid ${C.border}` }}>
              <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "12px", fontWeight: 700, color: C.textDisabled, letterSpacing: "0.8px", textTransform: "uppercase" }}>
                Patient Details
              </p>
            </div>
            {[
              { icon: <User size={15} color={C.textSecond} />,    label: "Name",   value: "Mdm. Tan Mei Ling" },
              { icon: <Hash size={15} color={C.textSecond} />,    label: "NRIC",   value: "SXXXXXX1A" },
              { icon: <MapPin size={15} color={C.textSecond} />,  label: "Counter",value: "Level 1, Pharmacy A" },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: `1px solid ${C.border}` }}>
                {row.icon}
                <span style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "14px", color: C.textSecond, width: "60px" }}>{row.label}</span>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 600, color: C.textPrimary }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Reason for visit */}
          <div>
            <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "13px", fontWeight: 700, color: C.textDisabled, letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "10px" }}>
              Reason for Visit
            </p>
            <div className="grid grid-cols-2 gap-2">
              {reasons.map((r) => {
                const active = reason === r;
                return (
                  <button key={r} onClick={() => setReason(r)}
                    className="py-3 px-4 rounded-xl text-left transition-colors"
                    style={{
                      background: active ? C.tealLight : "white",
                      border: `1.5px solid ${active ? C.teal : C.border}`,
                    }}>
                    <span style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "14px", fontWeight: active ? 600 : 400, color: active ? C.teal : C.textPrimary }}>
                      {r}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Confirm */}
          <button onClick={() => setConfirmed(true)}
            className="w-full py-3.5 rounded-xl text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            style={{ background: C.teal, fontFamily: "'DM Sans', sans-serif", fontSize: "16px", fontWeight: 700 }}>
            <RefreshCw size={18} color="white" />
            Get New Queue Number
          </button>

        </div>
      </div>
    </div>
  );
}

export function HomeScreen({ onTabChange }: { onTabChange: (tab: string) => void }) {
  const [showMissedQueue,  setShowMissedQueue]  = useState(true);
  const [showReRegister,   setShowReRegister]   = useState(false);
  const [notifyToggle,     setNotifyToggle]     = useState(true);
  const [showReschedule,   setShowReschedule]   = useState(false);

  const now = new Date();
  const updatedTime = now.toLocaleTimeString("en-SG", { hour: "numeric", minute: "2-digit", hour12: true });

  const regQueue = {
    number: 47, label: "B047", serving: "B041", servingNum: 41,
    waitTime: "12–15 min", ahead: 6,
    status: "waiting" as QueueStatus, counter: "Level 1, Pharmacy A", date: "Tuesday, 3 June 2026",
    completedAt: "9:15 AM",
  };
  const colQueue = {
    number: 24, label: "A024", serving: "A018", servingNum: 18,
    waitTime: "8–12 min", ahead: 4, status: "almost" as QueueStatus, isActive: true,
    delayed: { med: "Atorvastatin 20mg", reason: "Out of stock — restocking in progress", eta: "~20 min" },
  };

  const InfoChip = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
    <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: C.bg, border: `1px solid ${C.border}` }}>
      {icon}
      <span style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "15px", color: C.textPrimary }}>{text}</span>
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-4 overflow-y-auto h-full max-w-4xl mx-auto w-full">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <h1 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "18px", fontWeight: 800, color: C.textPrimary, letterSpacing: "0.5px", textTransform: "uppercase" }}>
          Live Queue Status
        </h1>
        <span style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "13px", color: C.textSecond }}>
          Updated {updatedTime}
        </span>
      </div>

      {/* Missed queue alert */}
      {showMissedQueue && (
        <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: C.amberLight, border: `1px solid ${C.amber}` }}>
          <Clock size={19} color={C.amber} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "15px", color: C.amberText }}>
              You missed your queue number. Please re-register at Counter 3.
            </p>
            <button onClick={() => setShowReRegister(true)} style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "15px", color: C.tealDark, fontWeight: 600, marginTop: "4px" }}>Re-register →</button>
          </div>
          <button onClick={() => setShowMissedQueue(false)} className="shrink-0 p-1"><X size={16} color={C.textDisabled} /></button>
        </div>
      )}

      {/* ── Queue 1: Registration ── */}
      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        {/* Header bar — green when done, teal gradient otherwise */}
        <div className="flex items-center justify-between px-5 py-3"
          style={{ background: regQueue.status === "done"
            ? C.green
            : `linear-gradient(90deg, ${C.teal} 0%, ${C.tealDark} 100%)` }}>
          <span style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "13px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "white" }}>
            Registration Queue
          </span>
          <HeaderBadge status={regQueue.status} />
        </div>

        {/* White body */}
        <div className="p-5 bg-white">
          {regQueue.status === "done" ? (
            /* ── Completed state ── */
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: C.greenLight }}>
                <Check size={24} color={C.green} strokeWidth={2.5} />
              </div>
              <div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "18px", fontWeight: 700, color: C.textPrimary }}>
                  Queue {regQueue.label}
                </p>
                <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "14px", color: C.textSecond, marginTop: "2px" }}>
                  Completed at {regQueue.completedAt}
                </p>
              </div>
            </div>
          ) : (
            /* ── Active / waiting state ── */
            <>
              <div className="flex items-end gap-4 mb-3">
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "64px", fontWeight: 700, lineHeight: 1, color: C.tealDark }}>{regQueue.label}</div>
                <p className="pb-2" style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "17px", color: C.textSecond }}>
                  Now calling: <strong style={{ color: C.textPrimary }}>{regQueue.serving}</strong>
                </p>
              </div>
              <div className="mb-4">
                <QueueStrip myNumber={regQueue.number} servingNumber={regQueue.servingNum} />
              </div>

              <div className="flex gap-2 flex-wrap mb-4">
                <InfoChip icon={<Clock size={15} color={C.textSecond} />} text={`Est. wait: ${regQueue.waitTime}`} />
                <InfoChip icon={<Users size={15} color={C.textSecond} />} text={`${regQueue.ahead} people ahead`} />
              </div>

              <div className="flex items-center justify-between pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
                <div>
                  <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "15px", color: C.textPrimary, marginBottom: "2px" }}>{regQueue.counter}</p>
                  <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "15px", color: C.textSecond }}>{regQueue.date}</p>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <button onClick={() => setNotifyToggle(!notifyToggle)}
                    className="relative w-12 h-6 rounded-full transition-colors"
                    style={{ background: notifyToggle ? C.teal : C.border }}
                    aria-label="Toggle notifications">
                    <span className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                      style={{ left: notifyToggle ? "calc(100% - 20px)" : "4px" }} />
                  </button>
                  <span style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "11px", color: C.textSecond }}>
                    <Bell size={10} style={{ display: "inline", marginRight: "3px" }} />Notify me
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Queue 2: Medication Collection ── */}
      {colQueue.isActive ? (
        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          {/* Teal header bar */}
          <div className="flex items-center justify-between px-5 py-3" style={{ background: `linear-gradient(90deg, ${C.teal} 0%, ${C.tealDark} 100%)` }}>
            <span style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "13px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "white" }}>
              Medication Collection
            </span>
            <HeaderBadge status={colQueue.status} />
          </div>

          {/* White body */}
          <div className="p-5 bg-white">
            <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "11px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: C.textDisabled, marginBottom: "4px" }}>
              Queue Number
            </p>
            <div className="flex items-end gap-4 mb-3">
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "64px", fontWeight: 700, lineHeight: 1, color: C.tealDark }}>{colQueue.label}</div>
              <p className="pb-2" style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "17px", color: C.textSecond }}>
                Now calling: <strong style={{ color: C.textPrimary }}>{colQueue.serving}</strong>
              </p>
            </div>

            <div className="mb-4">
              <QueueStrip myNumber={colQueue.number} servingNumber={colQueue.servingNum} />
            </div>

            <div className="flex gap-2 flex-wrap mb-4">
              <InfoChip icon={<Clock size={15} color={C.textSecond} />} text={`Est. wait: ${colQueue.waitTime}`} />
              <InfoChip icon={<Users size={15} color={C.textSecond} />} text={`${colQueue.ahead} people ahead`} />
            </div>

            {colQueue.delayed && (
              <div className="rounded-xl p-4 mb-4" style={{ background: C.amberLight, border: `1px solid ${C.amber}` }}>
                <div className="flex items-start gap-2">
                  <AlertTriangle size={17} color={C.amber} className="mt-0.5 shrink-0" />
                  <div>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 700, color: C.amberText }}>{colQueue.delayed.med} is delayed</p>
                    <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "14px", color: C.amberText, marginTop: "3px" }}>Reason: {colQueue.delayed.reason}</p>
                    <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "14px", color: C.amberText, marginTop: "2px" }}>Estimated ready in: <strong>{colQueue.delayed.eta}</strong></p>
                  </div>
                </div>
              </div>
            )}

            <button onClick={() => setShowReschedule(true)} className="w-full py-3 rounded-xl hover:opacity-80 transition-opacity"
              style={{ background: "white", border: `1.5px solid ${C.teal}`, color: C.teal, fontFamily: "'DM Sans', sans-serif", fontSize: "16px", fontWeight: 600, height: "52px" }}>
              <span className="flex items-center justify-center gap-2"><Calendar size={17} />Reschedule Collection</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl p-10 bg-white flex flex-col items-center justify-center" style={{ border: `1px solid ${C.border}` }}>
          <Lock size={30} color={C.textDisabled} className="mb-3" />
          <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "16px", color: C.textDisabled, textAlign: "center" }}>
            Queue 2 available after registration is complete
          </p>
        </div>
      )}

      {showReschedule   && <RescheduleSheet   onClose={() => setShowReschedule(false)} />}
      {showReRegister   && <ReRegisterSheet   onClose={() => { setShowReRegister(false); setShowMissedQueue(false); }} />}
    </div>
  );
}
