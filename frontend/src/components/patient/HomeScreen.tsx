import { useState, useRef, useEffect } from "react";
import { Clock, Users, Lock, AlertTriangle, X, Calendar, Bell, ChevronLeft, ChevronRight, Check, RefreshCw, MapPin, User, Hash } from "lucide-react";
import { useTranslation } from "../../context/LanguageContext";
import {
  createNotification,
  fetchCurrentPatientDetails,
  fetchNotifications,
  fetchLatestHoldReason,
  getCurrentPatientId,
  subscribeToPatientChanges,
} from "../../services/pharmacyData";

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
  greenLight:  "#ECFDF5",
  red:         "#EF4444",
};

type QueueStatus   = "waiting" | "almost" | "now" | "done";

function shouldShowHeaderBadge(status: QueueStatus) {
  return status === "now" || status === "done";
}

function maskNric(nric: string | null | undefined) {
  if (!nric) return "Not provided";
  return `${nric[0]}****${nric.slice(-4)}`;
}

// ── Header status badge (white pill on teal/green header) ──
function HeaderBadge({ status }: { status: QueueStatus }) {
  const { t } = useTranslation();
  const base: React.CSSProperties = {
    fontSize: "11px", fontWeight: 700, letterSpacing: "0.6px", textTransform: "uppercase",
    padding: "3px 12px", borderRadius: "999px", fontFamily: "'Open Sans', sans-serif",
    background: "rgba(255,255,255,0.25)", color: "white", border: "1px solid rgba(255,255,255,0.4)",
  };
  if (status === "waiting")  return <span style={base}>{t('queue.statusWaiting')}</span>;
  if (status === "almost")   return <span className="animate-pulse" style={{ ...base, background: C.amber, border: "none" }}>{t('queue.statusAlmost')}</span>;
  if (status === "done")     return <span style={{ ...base, background: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.5)" }}>{t('queue.statusCompleted')}</span>;
  return <span style={{ ...base, background: C.green, border: "none" }}>{t('queue.statusNow')}</span>;
}

const RING_R    = 20;
const RING_CIRC = 2 * Math.PI * RING_R; // ≈ 125.66

function QueueStrip({ myNumber, servingNumber, secPerTurn = 120 }: {
  myNumber: number;
  servingNumber: number;
  secPerTurn?: number;
}) {
  const { t } = useTranslation();
  const start = Math.max(1, servingNumber - 2);
  const end   = myNumber + 3;
  const range: number[] = [];
  for (let i = start; i <= end; i++) range.push(i);

  return (
    <>
      <style>{`
        @keyframes qs-ring-fill {
          0%   { stroke-dashoffset: ${RING_CIRC.toFixed(2)}; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes qs-now-blink {
          0%, 100% { opacity: 1;   }
          50%      { opacity: 0.4; }
        }
      `}</style>

      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {range.map((n) => {
          const isPast    = n < servingNumber;
          const isServing = n === servingNumber;
          const isAhead   = n > servingNumber && n < myNumber;
          const isMe      = n === myNumber;

          let circleBg: string, circleText: string, circleBorder: string | undefined, topLabel: string | null = null;

          if (isPast) {
            circleBg = "#EEF2F7"; circleText = "#A8B5C3";
          } else if (isServing) {
            circleBg = "#10B981"; circleText = "white"; topLabel = t('common.now');
          } else if (isAhead) {
            circleBg = "#F1F5F9"; circleText = "#64748B"; circleBorder = "1px solid #CBD5E1";
          } else if (isMe) {
            circleBg = "#3B82F6"; circleText = "white"; topLabel = t('queue.you');
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

              {/* Circle wrapper — relative so SVG ring can overlay */}
              <div style={{ position: "relative", width: 40, height: 40 }}>

                {/* Base filled circle */}
                <div
                  style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: circleBg, border: circleBorder,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    animation: isServing ? "qs-now-blink 1s ease-in-out infinite" : undefined,
                  }}
                >
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontWeight: 700, color: circleText }}>
                    {n}
                  </span>
                </div>

                {/* Progress ring overlay for NOW — fills clockwise from top over secPerTurn */}
                {isServing && (
                  <svg
                    width={48} height={48}
                    viewBox="0 0 44 44"
                    style={{ position: "absolute", top: -4, left: -4, transform: "rotate(-90deg)", pointerEvents: "none" }}
                  >
                    {/* Faint track */}
                    <circle cx={22} cy={22} r={RING_R}
                      fill="none"
                      stroke="rgba(255,255,255,0.25)"
                      strokeWidth={3}
                    />
                    {/* Animated fill */}
                    <circle cx={22} cy={22} r={RING_R}
                      fill="none"
                      stroke="rgba(255,255,255,0.85)"
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeDasharray={RING_CIRC}
                      strokeDashoffset={RING_CIRC}
                      style={{ animation: `qs-ring-fill ${secPerTurn}s linear infinite` }}
                    />
                  </svg>
                )}

              </div>
            </div>
          );
        })}
      </div>
    </>
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
const MONTH_ABBREVIATIONS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

function compactTimeLabel(time: string) {
  return time.replace(/\s+/g, "").toUpperCase();
}

function formatCollectionSlot(year: number, month: number, date: number, time: string) {
  return `${String(date).padStart(2, "0")}-${MONTH_ABBREVIATIONS[month]}-${year} ${compactTimeLabel(time)}`;
}

function getCollectionSlotKey(patient?: any) {
  return `pilly-collection-slot-${patient?.id ?? getCurrentPatientId() ?? "current"}`;
}

function formatSystemCollectionSlot(date = new Date()) {
  const time = date.toLocaleTimeString("en-SG", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return formatCollectionSlot(date.getFullYear(), date.getMonth(), date.getDate(), time);
}

async function getCurrentCollectionSlot(patient?: any) {
  if (patient?.collectionSlot) return patient.collectionSlot;
  if (patient?.collection_slot) return patient.collection_slot;

  const date = patient?.collectionDate ?? patient?.collection_date;
  const time = patient?.collectionTime ?? patient?.collection_time;
  if (date && time) return `${date} ${compactTimeLabel(String(time))}`;

  const slotKey = getCollectionSlotKey(patient);
  const storedSlot = localStorage.getItem(slotKey);
  if (storedSlot) return storedSlot;

  const patientId = patient?.id ?? getCurrentPatientId();
  if (patientId) {
    try {
      const latestReschedule = (await fetchNotifications({ recipientRole: "pharmacist" }))
        .find((notification: any) =>
          notification.type === "collection_rescheduled" &&
          notification.patientId === patientId &&
          notification.metadata?.toSlot
        );

      if (latestReschedule?.metadata?.toSlot) {
        localStorage.setItem(slotKey, latestReschedule.metadata.toSlot);
        return latestReschedule.metadata.toSlot;
      }
    } catch (error) {
      console.warn("Unable to load previous collection slot:", error);
    }
  }

  return formatSystemCollectionSlot();
}

function RescheduleSheet({ onClose, patient }: { onClose: () => void; patient?: any }) {
  const { t } = useTranslation();
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
        <h2 style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"22px", fontWeight:700, color:C.textPrimary, marginBottom:"8px" }}>{t('queue.collectionRescheduled')}</h2>
        <p style={{ fontFamily:"'Open Sans',sans-serif", fontSize:"16px", color:C.textSecond, marginBottom:"6px" }}>{MONTHS[viewMonth]} {selectedDate}, {viewYear}</p>
        <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"20px", fontWeight:700, color:C.teal, marginBottom:"24px" }}>{selectedSlot}</p>
        <button onClick={onClose} className="w-full py-3.5 rounded-xl text-white" style={{ background:C.teal, fontFamily:"'DM Sans',sans-serif", fontSize:"16px", fontWeight:700 }}>{t('common.done')}</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(15,23,42,0.45)" }} onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-t-3xl pb-8 overflow-y-auto" style={{ maxHeight:"92svh", boxShadow:"0 -8px 40px rgba(0,0,0,0.12)" }} onClick={e=>e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full" style={{ background:C.border }} /></div>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom:`1px solid ${C.border}` }}>
          <div>
            <h2 style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"20px", fontWeight:700, color:C.textPrimary }}>{t('queue.rescheduleCollection')}</h2>
            <p style={{ fontFamily:"'Open Sans',sans-serif", fontSize:"14px", color:C.textSecond, marginTop:"2px" }}>{t('queue.collectionLocation')}</p>
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
              <p style={{ fontFamily:"'Open Sans',sans-serif", fontSize:"13px", fontWeight:700, color:C.textDisabled, letterSpacing:"0.8px", textTransform:"uppercase", marginBottom:"12px" }}>{t('queue.availableSlots')} — {MONTHS[viewMonth]} {selectedDate}</p>
              <div className="grid grid-cols-3 gap-2">
                {TIME_SLOTS.map(slot=>{
                  const sel=selectedSlot===slot.time;
                  return (
                    <button key={slot.time} disabled={!slot.available} onClick={()=>setSelectedSlot(slot.time)}
                      className="py-3 rounded-xl text-center transition-colors"
                      style={{ background:sel?C.teal:slot.available?C.muted:"#F1F5F9", border:sel?"none":slot.available?`1px solid ${C.border}`:"none", cursor:slot.available?"pointer":"not-allowed" }}>
                      <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"14px", fontWeight:600, color:sel?"white":slot.available?C.textPrimary:C.textDisabled, textDecoration:!slot.available?"line-through":"none" }}>{slot.time}</span>
                      {!slot.available && <p style={{ fontFamily:"'Open Sans',sans-serif", fontSize:"11px", color:C.textDisabled, marginTop:"2px" }}>{t('queue.full')}</p>}
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
          <button onClick={async () => {
              if (!selectedDate || !selectedSlot || submitting) return;
              setSubmitting(true);
              const dateLabel = `${MONTHS[viewMonth]} ${selectedDate}, ${viewYear}`;
              const fromSlot = await getCurrentCollectionSlot(patient);
              const toSlot = formatCollectionSlot(viewYear, viewMonth, selectedDate, selectedSlot);
              try {
                await createNotification({
                  recipientRole: "pharmacist",
                  patientId: patient?.id ?? getCurrentPatientId(),
                  type: "collection_rescheduled",
                  title: `${patient?.name || "Patient"} rescheduled collection`,
                  body: `From ${fromSlot} to ${toSlot}`,
                  metadata: {
                    patientName: patient?.name ?? null,
                    queueNo: patient?.queueNo ?? null,
                    fromSlot,
                    toSlot,
                    newDate: dateLabel,
                    newSlot: selectedSlot,
                  },
                });
                localStorage.setItem(getCollectionSlotKey(patient), toSlot);
              } catch (notificationError) {
                console.warn("Unable to notify pharmacist:", notificationError);
              } finally {
                setSubmitting(false);
                setConfirmed(true);
              }
            }}
            className="w-full py-3.5 rounded-xl text-white hover:opacity-90 transition-opacity"
            style={{ background:selectedDate&&selectedSlot&&!submitting?C.teal:C.border, fontFamily:"'DM Sans',sans-serif", fontSize:"16px", fontWeight:700, cursor:selectedDate&&selectedSlot&&!submitting?"pointer":"not-allowed" }}>
            {t('queue.confirmReschedule')}
          </button>
        </div>
      </div>
    </div>
  );
}


function ReRegisterSheet({
  onClose,
  patient,
  onRegistered,
}: {
  onClose: () => void;
  patient?: any;
  onRegistered: (queueNo: string) => void;
}) {
  const { t } = useTranslation();
  const [confirmed, setConfirmed] = useState(false);
  const [newQueue]  = useState("B052");
  const reasonForVisit = patient?.reasonForVisit ?? patient?.reason_for_visit ?? t('queue.reasonFollowUp');
  const displayName =
    patient?.name ?? localStorage.getItem("pilly-user-name") ?? "Patient";
  const nricLabel = maskNric(patient?.nric);

  if (confirmed) return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(15,23,42,0.45)" }} onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-t-3xl p-8 pb-10 flex flex-col items-center text-center"
        style={{ boxShadow: "0 -8px 40px rgba(0,0,0,0.12)" }} onClick={(e) => e.stopPropagation()}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: C.tealLight }}>
          <Check size={30} color={C.teal} strokeWidth={2.5} />
        </div>
        <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "18px", color: C.textSecond, marginBottom: "8px", fontWeight: 600 }}>{t('queue.newQueueNumber')}</p>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "72px", fontWeight: 800, color: C.tealDark, lineHeight: 1, letterSpacing: "1.5px", marginBottom: "28px" }}>
          {newQueue}
        </div>
        <button onClick={onClose} className="w-full py-3.5 rounded-xl text-white"
          style={{ background: C.teal, fontFamily: "'DM Sans', sans-serif", fontSize: "16px", fontWeight: 700 }}>
          {t('common.done')}
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(15,23,42,0.45)" }} onClick={onClose}>
      <div className="w-full max-w-xl bg-white rounded-t-3xl overflow-hidden flex flex-col"
        style={{ maxHeight: "90svh", boxShadow: "0 -8px 40px rgba(0,0,0,0.12)" }} onClick={(e) => e.stopPropagation()}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: C.border }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5" style={{ borderBottom: `1px solid ${C.border}` }}>
          <div>
            <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "26px", fontWeight: 800, color: C.textPrimary, lineHeight: 1.2 }}>{t('queue.reRegister')}</h2>
            <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "18px", color: C.textSecond, marginTop: "4px", lineHeight: 1.4 }}>{t('queue.getNewQueueNumber')}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full" style={{ background: C.muted }}>
            <X size={22} color={C.textSecond} />
          </button>
        </div>

        <div className="px-5 sm:px-7 pt-5 sm:pt-6 space-y-4 sm:space-y-6 overflow-y-auto">

          {/* Missed queue notice */}
          <div className="flex items-start gap-4 p-5 rounded-2xl" style={{ background: C.amberLight, border: `1.5px solid ${C.amber}55` }}>
            <AlertTriangle size={24} color={C.amber} className="shrink-0 mt-0.5" />
            <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "18px", color: C.amberText, lineHeight: "1.65", fontWeight: 600 }}>
              {t('queue.previousQueueNumber')} <strong>B047</strong> {t('queue.queueExpiredNotice')}
            </p>
          </div>

          {/* Patient info (read-only) */}
          <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
            <div className="px-5 py-3" style={{ background: C.muted, borderBottom: `1px solid ${C.border}` }}>
              <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "13px", fontWeight: 700, color: C.textDisabled, letterSpacing: "0.8px", textTransform: "uppercase" }}>
                {t('queue.patientDetails')}
              </p>
            </div>
            {[
              { icon: <User size={15} color={C.textSecond} />,    label: t('profile.name'),   value: displayName },
              { icon: <Hash size={15} color={C.textSecond} />,    label: t('queue.nric'),     value: nricLabel },
              { icon: <MapPin size={15} color={C.textSecond} />,  label: t('queue.counter'),  value: "Level 1, Pharmacy A" },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
                {row.icon}
                <span style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "15px", color: C.textSecond, width: "75px" }}>{row.label}</span>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "18px", fontWeight: 600, color: C.textPrimary }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Reason for visit */}
          <div>
            <div className="px-5 py-4 rounded-2xl" style={{ background: C.muted, border: `1px solid ${C.border}` }}>
              <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "18px", color: C.textPrimary, lineHeight: 1.6 }}>
                <strong>{t('queue.reasonForVisit')}:</strong> {reasonForVisit}
              </p>
            </div>
          </div>

        </div>

        {/* Confirm */}
        <div className="shrink-0 px-5 sm:px-7 py-4 bg-white" style={{ borderTop: `1px solid ${C.border}` }}>
          <button onClick={() => {
            onRegistered(newQueue);
            setConfirmed(true);
          }}
            className="w-full py-3.5 sm:py-4 rounded-2xl text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            style={{ background: C.teal, fontFamily: "'DM Sans', sans-serif", fontSize: "18px", fontWeight: 700 }}>
            <RefreshCw size={20} color="white" />
            {t('queue.getNewQueueNumber')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function HomeScreen({ onTabChange }: { onTabChange: (tab: string) => void }) {
  const { t } = useTranslation();
  const [patient, setPatient] = useState<any>(null);
  const [patientLoaded, setPatientLoaded] = useState(false);
  const [showMissedQueue,  setShowMissedQueue]  = useState(true);
  const [showReRegister,   setShowReRegister]   = useState(false);
  const [notifyToggle,     setNotifyToggle]     = useState(true);
  const [showReschedule,   setShowReschedule]   = useState(false);
  const [registrationQueueNo, setRegistrationQueueNo] = useState("B047");
  const [registrationCompletedAt, setRegistrationCompletedAt] = useState<string | null>(null);
  const [latestHoldReason, setLatestHoldReason] = useState("");
  const [latestAdditionalWaitMin, setLatestAdditionalWaitMin] = useState(20);

  const now = new Date();
  const updatedTime = now.toLocaleTimeString("en-SG", { hour: "numeric", minute: "2-digit", hour12: true });

  useEffect(() => {
    const loadPatient = async () => {
      setPatient(await fetchCurrentPatientDetails());
      setPatientLoaded(true);
    };

    loadPatient();
    return subscribeToPatientChanges(loadPatient);
  }, []);

  useEffect(() => {
    const loadHoldReason = async () => {
      const patientId = patient?.id ?? getCurrentPatientId();
      if (!patientId) {
        setLatestHoldReason("");
        return;
      }

      const latestHold = await fetchLatestHoldReason(patientId);

      setLatestHoldReason(latestHold?.reason ?? "");
      setLatestAdditionalWaitMin(latestHold?.additionalWaitMin ?? 20);
    };

    void loadHoldReason();
  }, [patient?.id, patient?.status]);

  const registrationQueueDigits = Number.parseInt(registrationQueueNo.replace(/\D/g, ""), 10) || 47;
  const registrationServingNum = Math.max(1, registrationQueueDigits - 6);
  const regQueue = {
    number: registrationQueueDigits,
    label: registrationQueueNo,
    serving: `${registrationQueueNo[0] ?? "B"}${String(registrationServingNum).padStart(3, "0")}`,
    servingNum: registrationServingNum,
    waitTime: "12 to 15 min", ahead: 6,
    status: (registrationCompletedAt ? "done" : "waiting") as QueueStatus,
    counter: "Level 1, Pharmacy A",
    date: "Tuesday, 3 June 2026",
    completedAt: registrationCompletedAt,
  };
  const pendingMedication = patient?.medications?.find((med: any) => !med.verified);
  const displayName =
    patient?.name ?? localStorage.getItem("pilly-user-name") ?? "Patient";
  const queueNumber = patientLoaded && patient?.queueNo && patient.queueNo !== "-"
    ? String(patient.queueNo)
    : "";
  const queueDigits = Number.parseInt(queueNumber.replace(/\D/g, ""), 10) || 0;
  const servingNum = Math.max(1, queueDigits - 6);
  const normalizedRegistrationQueue = registrationQueueNo.trim().toUpperCase();
  const normalizedCollectionQueue = queueNumber.trim().toUpperCase();
  const hasCollectionQueue = Boolean(
    registrationCompletedAt &&
      normalizedCollectionQueue &&
      queueDigits &&
      normalizedCollectionQueue !== normalizedRegistrationQueue,
  );
  const allMedicationReady = patient?.medications?.length
    ? patient.medications.every((med: any) => med.verified)
    : false;
  const delayedInfo =
    pendingMedication && patient?.status !== "ready"
      ? {
          med: pendingMedication.name,
          reason: latestHoldReason || t('queue.delayedReasonDefault'),
          eta: `${latestAdditionalWaitMin} min`,
        }
      : null;
  const colQueue = {
    number: queueDigits,
    label: queueNumber,
    serving: `${queueNumber[0] ?? ""}${String(servingNum).padStart(3, "0")}`,
    servingNum,
    waitTime: patient?.status === "ready" ? "Ready now" : "8-12 min",
    ahead: Math.max(0, queueDigits - servingNum),
    status: (patient?.status === "ready" || allMedicationReady ? "now" : "almost") as QueueStatus,
    isActive: hasCollectionQueue,
    delayed: delayedInfo,
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
      <div className="space-y-1">
        <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "15px", color: C.textSecond, fontWeight: 600 }}>
          Hello, {displayName}
        </p>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "22px", fontWeight: 800, color: C.textPrimary, letterSpacing: "0.4px" }}>
            {t('home.yourQueueStatus')}
          </h1>
          <span style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "16px", color: C.textSecond }}>
            {t('queue.updatedAt')} {updatedTime}
          </span>
        </div>
      </div>

      {/* Missed queue alert */}
      {showMissedQueue && (
        <div className="rounded-xl p-4" style={{ background: "#FEF2F2", border: `2px solid ${C.red}` }}>
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "#FEE2E2" }}>
              <AlertTriangle size={20} color={C.red} className="shrink-0" />
            </div>
            <div className="flex-1">
              <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "17px", fontWeight: 700, color: "#991B1B", lineHeight: "1.5" }}>
                {t('queue.missedQueueAlert')}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowReRegister(true)}
            className="mt-4 w-full rounded-xl py-3.5 text-white hover:opacity-90 transition-opacity"
            style={{
              background: C.teal,
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "18px",
              fontWeight: 700,
            }}
          >
            {t('queue.reRegister')}
          </button>
        </div>
      )}

      {/* ── Queue 1: Registration ── */}
      <div
        className="rounded-2xl overflow-hidden transition-all"
        style={{
          border: `1px solid ${C.border}`,
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          cursor: regQueue.status === "done" ? "default" : "pointer",
        }}
        onClick={() => {
          if (regQueue.status === "done") return;
          setRegistrationCompletedAt(
            new Date().toLocaleTimeString("en-SG", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            }),
          );
        }}
      >
        {/* Header bar — green when done, teal gradient otherwise */}
        <div
          className={`flex items-center justify-between px-5 ${regQueue.status === "done" ? "py-2" : "py-3"}`}
          style={{ background: regQueue.status === "done"
            ? C.green
            : `linear-gradient(90deg, ${C.teal} 0%, ${C.tealDark} 100%)` }}
        >
          <span style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "13px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "white" }}>
            {t('queue.registrationQueue')}
          </span>
          {shouldShowHeaderBadge(regQueue.status) && <HeaderBadge status={regQueue.status} />}
        </div>

        {/* White body */}
        <div className={`bg-white ${regQueue.status === "done" ? "p-3" : "p-5"}`}>
          {regQueue.status === "done" ? (
            /* ── Completed state ── */
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: C.greenLight }}>
                <Check size={24} color={C.green} strokeWidth={2.5} />
              </div>
              <div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "17px", fontWeight: 700, color: C.textPrimary }}>
                  {t('queue.registrationQueue')} {t('queue.statusCompleted')}
                </p>
                <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "14px", color: C.textSecond, marginTop: "2px" }}>
                  {t('queue.queueLabelPrefix')} {regQueue.label} • {t('queue.completedAt')} {regQueue.completedAt}
                </p>
              </div>
            </div>
          ) : (
            /* ── Active / waiting state ── */
            <>
              <div className="flex items-end gap-4 mb-3">
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "64px", fontWeight: 700, lineHeight: 1, color: C.tealDark }}>{regQueue.label}</div>
                <p className="pb-2" style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "17px", color: C.textSecond }}>
                  {t('queue.nowCalling')}: <strong style={{ color: C.textPrimary }}>{regQueue.serving}</strong>
                </p>
              </div>
              <div className="mb-4">
                <QueueStrip myNumber={regQueue.number} servingNumber={regQueue.servingNum} secPerTurn={135} />
              </div>

              <div className="flex gap-2 flex-wrap mb-4">
                <InfoChip icon={<Clock size={15} color={C.textSecond} />} text={`${t('queue.estimatedWait')}: ${regQueue.waitTime}`} />
                <InfoChip icon={<Users size={15} color={C.textSecond} />} text={`${regQueue.ahead} ${t('queue.peopleAhead')}`} />
              </div>

              <div className="flex items-center justify-between pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
                <div>
                  <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "17px", color: C.textPrimary, marginBottom: "4px" }}>{regQueue.counter}</p>
                  <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "16px", color: C.textSecond }}>{regQueue.date}</p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <button onClick={() => setNotifyToggle(!notifyToggle)}
                    className="relative h-10 w-20 rounded-full transition-colors"
                    style={{ background: notifyToggle ? C.teal : C.border }}
                    aria-label="Toggle notifications">
                    <span className="absolute top-1 h-8 w-8 rounded-full bg-white transition-all"
                      style={{ left: notifyToggle ? "calc(100% - 36px)" : "4px" }} />
                  </button>
                  <span style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "17px", color: C.textSecond, fontWeight: 600 }}>
                    <Bell size={16} style={{ display: "inline", marginRight: "6px" }} />{t('queue.notifyMe')}
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
              {t('queue.collectionQueue')}
            </span>
            {shouldShowHeaderBadge(colQueue.status) && <HeaderBadge status={colQueue.status} />}
          </div>

          {/* White body */}
          <div className="p-5 bg-white">
            <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "13px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: C.textDisabled, marginBottom: "4px" }}>
              {t('queue.queueNumber')}
            </p>
            <div className="flex items-end gap-4 mb-3">
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "64px", fontWeight: 700, lineHeight: 1, color: C.tealDark }}>{colQueue.label}</div>
              <p className="pb-2" style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "17px", color: C.textSecond }}>
                {t('queue.nowCalling')}: <strong style={{ color: C.textPrimary }}>{colQueue.serving}</strong>
              </p>
            </div>

            <div className="mb-4">
              <QueueStrip myNumber={colQueue.number} servingNumber={colQueue.servingNum} secPerTurn={150} />
            </div>

            <div className="flex gap-2 flex-wrap mb-4">
              <InfoChip icon={<Clock size={15} color={C.textSecond} />} text={`${t('queue.estimatedWait')}: ${colQueue.waitTime}`} />
              <InfoChip icon={<Users size={15} color={C.textSecond} />} text={`${colQueue.ahead} ${t('queue.peopleAhead')}`} />
            </div>

            {colQueue.delayed && (
              <div className="rounded-xl p-4 mb-4" style={{ background: C.amberLight, border: `1px solid ${C.amber}` }}>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <AlertTriangle size={20} color={C.amber} className="mt-1 shrink-0" />
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "20px", fontWeight: 800, color: C.amberText, lineHeight: 1.25 }}>
                      {colQueue.delayed.med} {t('queue.isDelayed')}
                    </p>
                  </div>
                  <div className="shrink-0 rounded-lg px-3 py-2" style={{ background: "white", border: `1px solid ${C.amber}` }}>
                    <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "11px", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", color: C.amberText }}>
                      {t('queue.delayedEta')}
                    </p>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "18px", fontWeight: 800, color: C.amberText }}>
                      {colQueue.delayed.eta}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg px-3 py-3" style={{ background: "white", border: `1px solid ${C.amber}` }}>
                  <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "11px", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", color: C.amberText }}>
                    {t('queue.delayedReason')}
                  </p>
                  <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "16px", color: C.amberText, marginTop: "4px", lineHeight: 1.45 }}>
                    {colQueue.delayed.reason}
                  </p>
                </div>
              </div>
            )}

            <button onClick={() => setShowReschedule(true)} className="w-full py-3 rounded-xl hover:opacity-80 transition-opacity"
              style={{ background: "white", border: `1.5px solid ${C.teal}`, color: C.teal, fontFamily: "'DM Sans', sans-serif", fontSize: "16px", fontWeight: 600, height: "52px" }}>
              <span className="flex items-center justify-center gap-2"><Calendar size={17} />{t('queue.reschedule')}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl p-10 bg-white flex flex-col items-center justify-center" style={{ border: `1px solid ${C.border}` }}>
          <Lock size={30} color={C.textDisabled} className="mb-3" />
          <p style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "16px", color: C.textDisabled, textAlign: "center" }}>
            {t('queue.queueTwoLocked')}
          </p>
        </div>
      )}

      {showReschedule   && <RescheduleSheet   patient={patient} onClose={() => setShowReschedule(false)} />}
      {showReRegister   && (
        <ReRegisterSheet
          patient={patient}
          onRegistered={setRegistrationQueueNo}
          onClose={() => { setShowReRegister(false); setShowMissedQueue(false); }}
        />
      )}
    </div>
  );
}
