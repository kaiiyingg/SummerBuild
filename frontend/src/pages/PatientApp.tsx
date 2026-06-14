import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Users, Pill, ScanLine, AlarmClock, User, ChevronDown, Check, Globe, MessageCircle } from "lucide-react";
import "./PatientApp.css";
import PillyLogoSmall from "../components/PillyLogoSmall";
import { HomeScreen } from "../components/patient/HomeScreen";
import { MedicationsScreen } from "../components/patient/MedicationsScreen";
import { ScanScreen } from "../components/patient/ScanScreen";
import { RemindersScreen } from "../components/patient/RemindersScreen";
import { AskPillyScreen } from "../components/patient/AskPillyScreen";
import { ProfileScreen } from "../components/patient/ProfileScreen";
import { useTranslation } from "../context/LanguageContext";
import {
  clearLanguageOnboarding,
  logout,
  shouldShowLanguageOnboarding,
} from "../services/authService";
import {
  fetchCurrentPatientDetails,
  fetchNotifications,
  getCurrentPatientId,
  markNotificationsRead,
  subscribeToPatientChanges,
  subscribeToNotifications,
} from "../services/pharmacyData";
import { BasicToast } from "../components/ui/Toast";

// ── palette ────────────────────────────────────────────────────
const C = {
  teal:        "#45C5BC",
  tealDark:    "#38B2A9",
  tealLight:   "#F0FDFA",
  bg:          "#F8FAFC",
  card:        "#FFFFFF",
  textPrimary: "#1E293B",
  textSecond:  "#64748B",
  textDisabled:"#94A3B8",
  border:      "#E2E8F0",
  red:         "#EF4444",
  redLight:    "#FEF2F2",
  amber:       "#F59E0B",
  amberLight:  "#FFFBEB",
  amberText:   "#92400E",
  green:       "#10B981",
  greenLight:  "#ECFDF5",
};

type Tab = "home" | "medications" | "scan" | "reminders" | "askpilly" | "profile";

const LANG_SHORT: Record<string, string> = { en: 'EN', zh: '中文', ms: 'BM', ta: 'தமிழ்' };

const TAB_DEFS: { id: Tab; key: string; icon: React.ReactNode }[] = [
  { id: "home",        key: "nav.queue",       icon: <Users size={26} /> },
  { id: "medications", key: "nav.medications",  icon: <Pill size={26} /> },
  { id: "scan",        key: "nav.scan",         icon: <ScanLine size={26} /> },
  { id: "reminders",   key: "nav.reminders",    icon: <AlarmClock size={26} /> },
  { id: "profile",     key: "nav.profile",      icon: <User size={26} /> },
];

type NotificationItem = {
  id: number | string;
  dot: string;
  title: string;
  subtitle: string;
  time: string;
  read: boolean;
};

function formatTimeAgo(createdAt: string) {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const diffMins = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

function notificationDot(type: string) {
  if (type === "medication_on_hold") return C.red;
  if (type === "medication_ready") return C.green;
  return "#3B82F6";
}

// ── sub-components ─────────────────────────────────────────────

function PillyMark({ size = 40 }: { size?: number }) {
  const dotSize    = size * 0.18;
  const dotColor   = "#45C5BC";
  const orbitX     = size * 0.46;
  const orbitY     = size * 0.32;

  return (
    <div style={{ position: "relative", width: size, height: size, display: "inline-flex", flexShrink: 0 }}>
      <style>{`
        @keyframes pilly-cw {
          from { transform: rotate(0deg)   translateX(${orbitX}px) translateY(${-orbitY}px); }
          to   { transform: rotate(360deg) translateX(${orbitX}px) translateY(${-orbitY}px); }
        }
        @keyframes pilly-ccw {
          from { transform: rotate(180deg)   translateX(${orbitX}px) translateY(${-orbitY}px); }
          to   { transform: rotate(-180deg)  translateX(${orbitX}px) translateY(${-orbitY}px); }
        }
      `}</style>

      {/* Capsule SVG — diagonal, two-tone */}
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" style={{ position: "absolute", top: 0, left: 0 }}>
        <defs>
          <linearGradient id="pill-half" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="50%" stopColor="#45C5BC" />
            <stop offset="50%" stopColor="#C8F4F1" />
          </linearGradient>
          <clipPath id="pill-clip">
            <rect x="6" y="15" width="28" height="10" rx="5" transform="rotate(-40 20 20)" />
          </clipPath>
        </defs>
        {/* Capsule body */}
        <rect x="6" y="15" width="28" height="10" rx="5"
          fill="url(#pill-half)"
          transform="rotate(-40 20 20)"
        />
        {/* Dividing line */}
        <line x1="20" y1="11" x2="20" y2="29"
          stroke="white" strokeWidth="1.2" opacity="0.6"
          clipPath="url(#pill-clip)"
          transform="rotate(-40 20 20)"
        />
      </svg>

      {/* Orbiting dots */}
      <div style={{ position: "absolute", top: "50%", left: "50%", width: 0, height: 0 }}>
        <div style={{
          position: "absolute",
          width: dotSize, height: dotSize,
          marginLeft: -dotSize / 2, marginTop: -dotSize / 2,
          borderRadius: "50%", background: dotColor,
          boxShadow: `0 0 ${size * 0.18}px ${dotColor}`,
          animation: "pilly-cw 3s linear infinite",
        }} />
        <div style={{
          position: "absolute",
          width: dotSize, height: dotSize,
          marginLeft: -dotSize / 2, marginTop: -dotSize / 2,
          borderRadius: "50%", background: dotColor,
          boxShadow: `0 0 ${size * 0.18}px ${dotColor}`,
          animation: "pilly-ccw 3s linear infinite",
        }} />
      </div>
    </div>
  );
}

function PillLogo({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 shrink-0"
      aria-label="Go to Queue"
    >
      <PillyLogoSmall />
      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "20px", fontWeight: 700, color: C.textPrimary }}>
        Pilly
      </span>
    </button>
  );
}

function LanguageDropdown({ onClose }: { onClose: () => void }) {
  const { language, setLanguage, LANGUAGES } = useTranslation();
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="absolute right-0 top-full mt-2 z-50 bg-white rounded-2xl overflow-hidden"
        style={{ minWidth: "190px", boxShadow: "0 4px 24px rgba(0,0,0,0.10)", border: `1px solid ${C.border}` }}
      >
        {LANGUAGES.map((opt) => {
          const active = language === opt.code;
          return (
            <button
              key={opt.code}
              onClick={() => { setLanguage(opt.code); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-3 transition-colors"
              style={{ background: active ? C.tealLight : "white" }}
              onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = C.bg; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = active ? C.tealLight : "white"; }}
            >
              <span style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "14px", color: C.textPrimary, flex: 1, textAlign: "left" }}>
                {opt.nativeLabel}
              </span>
              {active && <Check size={14} color={C.teal} />}
            </button>
          );
        })}
      </div>
    </>
  );
}

function NotificationDropdown({ notifications, onClose, onMarkAllRead, onMarkRead }: {
  notifications: NotificationItem[];
  onClose: () => void;
  onMarkAllRead: () => void;
  onMarkRead: (id: string | number) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="absolute right-0 top-full mt-2 z-50 bg-white rounded-2xl overflow-hidden"
        style={{
          width: "min(360px, calc(100vw - 16px))",
          maxHeight: "min(70vh, 500px)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
          border: `1px solid ${C.border}`,
        }}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "16px", fontWeight: 700, color: C.textPrimary }}>{t('notifications.title')}</span>
          <button onClick={onMarkAllRead} style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "13px", color: C.teal }}>{t('notifications.markAllRead')}</button>
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: "calc(min(70vh, 500px) - 52px)" }}>
          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-center" style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "14px", color: C.textSecond }}>
              {t("notifications.noNotifications")}
            </div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  if (!n.read) onMarkRead(n.id);
                }}
                className="flex w-full items-start gap-3 px-4 py-3 text-left"
                style={{
                  background: n.read ? "white" : "#F8FAFC",
                  borderLeft: n.read ? `3px solid transparent` : `3px solid ${n.dot}`,
                  borderBottom: `1px solid ${C.border}`,
                  cursor: n.read ? "default" : "pointer",
                }}
              >
                <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: n.dot }} />
                <div className="flex-1 min-w-0">
                  <p
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: C.textPrimary,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {n.title}
                  </p>
                  <p
                    style={{
                      fontFamily: "'Open Sans', sans-serif",
                      fontSize: "13px",
                      color: C.textSecond,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {n.subtitle}
                  </p>
                </div>
                <span
                  style={{
                    fontFamily: "'Open Sans', sans-serif",
                    fontSize: "12px",
                    color: C.textDisabled,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {n.time}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}

function LogoutModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: "rgba(15,23,42,0.45)" }}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm" style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.12)" }}>
        <h2 className="mb-2" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "20px", fontWeight: 700, color: C.textPrimary }}>
          {t('profile.logoutConfirm')}
        </h2>
        <p className="mb-6" style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "15px", color: C.textSecond }}>
          {t('profile.logoutDesc')}
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl hover:opacity-80 transition-opacity"
            style={{ border: `1.5px solid ${C.border}`, color: C.textPrimary, fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 600 }}>
            {t('common.cancel')}
          </button>
          <button onClick={onConfirm} className="flex-1 py-3 rounded-xl text-white hover:opacity-80 transition-opacity"
            style={{ background: C.teal, fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 600 }}>
            {t('profile.logout')}
          </button>
        </div>
      </div>
    </div>
  );
}

function LanguagePreferenceModal({ onContinue }: { onContinue: () => void }) {
  const { language, setLanguage, LANGUAGES, t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: "rgba(15,23,42,0.45)" }}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md" style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.12)" }}>
        <h2 className="mb-2" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "22px", fontWeight: 700, color: C.textPrimary }}>
          {t('profile.chooseLanguage')}
        </h2>
        <p className="mb-4" style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "15px", color: C.textSecond }}>
          {t('profile.languageHint')}
        </p>

        <div className="grid gap-2 mb-5">
          {LANGUAGES.map((opt) => {
            const active = language === opt.code;
            return (
              <button
                key={opt.code}
                type="button"
                onClick={() => setLanguage(opt.code)}
                className="w-full rounded-xl px-4 py-3 text-left transition-colors"
                style={{
                  border: `1.5px solid ${active ? C.teal : C.border}`,
                  background: active ? C.tealLight : "white",
                }}
              >
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "16px", fontWeight: 700, color: C.textPrimary }}>
                  {opt.nativeLabel}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onContinue}
          className="w-full py-3 rounded-xl text-white hover:opacity-80 transition-opacity"
          style={{ background: C.teal, fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 700 }}
        >
          {t('common.continue')}
        </button>
      </div>
    </div>
  );
}

// ── Draggable floating chat bubble ──
function FloatingChatBubble({ onOpen }: { onOpen: () => void }) {
  const [pos, setPos]   = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const dragging = useRef(false);
  const hasMoved = useRef(false);
  const offset   = useRef({ x: 0, y: 0 });

  const BUBBLE_SIZE = 68;

  const clamp = (x: number, y: number) => ({
    x: Math.min(Math.max(x, 0), window.innerWidth  - BUBBLE_SIZE),
    y: Math.min(Math.max(y, 0), window.innerHeight - BUBBLE_SIZE),
  });

  useEffect(() => {
    setPos(clamp(window.innerWidth - 80, window.innerHeight - 180));
    setReady(true);
  }, []);

  useEffect(() => {
    const onResize = () => setPos((p) => clamp(p.x, p.y));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      hasMoved.current = true;
      setPos(clamp(e.clientX - offset.current.x, e.clientY - offset.current.y));
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!dragging.current) return;
      hasMoved.current = true;
      const t = e.touches[0];
      setPos(clamp(t.clientX - offset.current.x, t.clientY - offset.current.y));
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onUp);
    };
  }, []);

  const startDrag = (clientX: number, clientY: number) => {
    dragging.current = true;
    hasMoved.current = false;
    offset.current   = { x: clientX - pos.x, y: clientY - pos.y };
  };

  const handleClick = () => { if (!hasMoved.current) onOpen(); };

  if (!ready) return null;

  return (
    <div
      style={{ position: "fixed", left: pos.x, top: pos.y, zIndex: 200, userSelect: "none", touchAction: "none" }}
      onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
      onTouchStart={(e) => { const t = e.touches[0]; startDrag(t.clientX, t.clientY); }}
      onClick={handleClick}
    >
      <div style={{
        width: BUBBLE_SIZE, height: BUBBLE_SIZE, borderRadius: "50%", background: C.teal, cursor: "grab",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 4px 16px rgba(69,197,188,0.45)",
      }}>
        <MessageCircle size={30} color="white" />
      </div>
    </div>
  );
}

// ── main ───────────────────────────────────────────────────────

export default function App() {
  const navigate = useNavigate();
  const { language, t } = useTranslation();
  const [activeTab,          setActiveTab]          = useState<Tab>("home");
  const [showNotifications,  setShowNotifications]  = useState(false);
  const [showLangDropdown,   setShowLangDropdown]   = useState(false);
  const [showLogoutModal,    setShowLogoutModal]    = useState(false);
  const [showLanguageModal,  setShowLanguageModal]  = useState(false);
  const [notifications,      setNotifications]      = useState<NotificationItem[]>([]);
  const [delayedToastMsg,    setDelayedToastMsg]    = useState<string | null>(null);
  const [patientName,        setPatientName]        = useState(
    localStorage.getItem("pilly-user-name") || "Patient"
  );

  const unreadCount  = notifications.filter((n) => !n.read).length;
  const currentShort = LANG_SHORT[language] ?? 'EN';
  const loadNotifications = async () => {
    const patientId = getCurrentPatientId();
    if (!patientId) {
      setNotifications([]);
      return;
    }

    const rows = await fetchNotifications({ recipientRole: "patient", patientId });
    setNotifications(rows.filter((row: any) => row.type === "medication_on_hold").map((row: any) => ({
      id: row.id,
      dot: notificationDot(row.type),
      title: row.title,
      subtitle: row.body,
      time: formatTimeAgo(row.createdAt),
      read: row.read,
    })));
  };
  const markAllRead  = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    await markNotificationsRead(unreadIds);
    await loadNotifications();
  };
  const markOneRead = async (id: string | number) => {
    await markNotificationsRead([id]);
    await loadNotifications();
  };
  const handleLogout = async () => {
    await logout();
    setShowLogoutModal(false);
    navigate("/");
  };

  useEffect(() => {
    const loadPatientName = async () => {
      const patient = await fetchCurrentPatientDetails();
      setPatientName(
        patient?.name || localStorage.getItem("pilly-user-name") || "Patient"
      );
    };

    loadPatientName();
    return subscribeToPatientChanges(loadPatientName);
  }, []);

  useEffect(() => {
    void loadNotifications();
    return subscribeToNotifications(() => {
      void loadNotifications();
    });
  }, []);

  useEffect(() => {
    const email = localStorage.getItem("pilly-user-email");
    if (!email) return;
    if (shouldShowLanguageOnboarding(email)) {
      setShowLanguageModal(true);
    }
  }, []);

  const renderScreen = () => {
    switch (activeTab) {
      case "home":        return <HomeScreen onTabChange={(t) => setActiveTab(t as Tab)} />;
      case "medications": return (
        <MedicationsScreen
          onTabChange={(t) => setActiveTab(t as Tab)}
        />
      );
      case "scan":        return <ScanScreen />;
      case "reminders":   return <RemindersScreen />;
      case "askpilly":    return <AskPillyScreen />;
      case "profile":     return <ProfileScreen />;
    }
  };

  return (
    <div className="w-full flex flex-col" style={{ height: "100svh", background: C.bg }}>
      <style>{`
        @keyframes bell-ring {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(12deg); }
          40% { transform: rotate(-10deg); }
          60% { transform: rotate(8deg); }
          80% { transform: rotate(-6deg); }
        }
        @keyframes bell-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(69, 197, 188, 0.35); }
          50% { box-shadow: 0 0 0 8px rgba(69, 197, 188, 0.12); }
        }
        .bell-alert-active {
          animation: bell-glow 1.3s ease-in-out infinite;
        }
        .bell-alert-active svg {
          transform-origin: top center;
          animation: bell-ring 0.9s ease-in-out infinite;
        }
      `}</style>

      {/* Header */}
      <header className="shrink-0 bg-white" style={{ minHeight: "74px", borderBottom: `1px solid ${C.border}` }}>
        <div className="flex items-center justify-between h-full px-4 md:px-8 max-w-screen-xl mx-auto">

          <PillLogo onClick={() => setActiveTab("home")} />

          <div className="hidden sm:flex flex-col items-center">
            <span style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "14px", color: C.textSecond }}>{t('auth.welcomeBack')},</span>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "17px", fontWeight: 600, color: C.textPrimary }}>{patientName}</span>
          </div>

          <div className="flex items-center gap-1">

            {/* Language */}
            <div className="relative">
              <button
                onClick={() => { setShowLangDropdown(!showLangDropdown); setShowNotifications(false); }}
                className="flex min-h-[46px] items-center gap-2 rounded-xl px-3.5 py-2 transition-colors hover:bg-[#F1F5F9]"
                aria-label="Change language"
              >
                <Globe size={19} color={C.textSecond} />
                <span style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "15px", fontWeight: 700, color: C.textPrimary }}>
                  {currentShort}
                </span>
                <ChevronDown size={15} color={C.textSecond} />
              </button>
              {showLangDropdown && (
                <LanguageDropdown onClose={() => setShowLangDropdown(false)} />
              )}
            </div>

            {/* Bell */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications((prev) => !prev);
                  setShowLangDropdown(false);
                }}
                className={`relative flex h-[46px] w-[46px] items-center justify-center rounded-xl transition-colors hover:bg-[#F1F5F9] ${unreadCount > 0 ? "bell-alert-active" : ""}`}
                aria-label="Notifications"
              >
                <Bell size={23} color={C.textSecond} />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-white"
                    style={{ background: C.red, fontSize: "11px", fontWeight: 700 }}>
                    {unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <NotificationDropdown
                  notifications={notifications}
                  onClose={() => setShowNotifications(false)}
                  onMarkAllRead={markAllRead}
                  onMarkRead={markOneRead}
                />
              )}
            </div>

            {/* Logout */}
            <button
              onClick={() => setShowLogoutModal(true)}
              className="flex min-h-[46px] items-center justify-center rounded-xl px-4 py-2 transition-colors hover:bg-[#F1F5F9]"
              aria-label={t("profile.logout")}
            >
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 700, color: C.textPrimary }}>
                {t("profile.logout")}
              </span>
            </button>

          </div>
        </div>
      </header>

      {/* Screen */}
      <main className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        {renderScreen()}
      </main>

      {/* Bottom nav */}
      <nav className="shrink-0 bg-white" style={{ minHeight: "84px", borderTop: `1px solid ${C.border}` }}>
        <div className="flex items-center h-full max-w-screen-xl mx-auto px-2 md:px-8">
          {TAB_DEFS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex h-full flex-col items-center justify-center gap-1 transition-colors py-1"
                style={{ color: active ? C.teal : C.textSecond }}
              >
                {tab.icon}
                <span style={{ fontFamily: "'Open Sans', sans-serif", fontSize: "13px", fontWeight: 600 }}>
                  {t(tab.key)}
                </span>
                {active && <div className="h-2 w-2 rounded-full" style={{ background: C.teal }} />}
              </button>
            );
          })}
        </div>
      </nav>

      {showLogoutModal && <LogoutModal onConfirm={handleLogout} onCancel={() => setShowLogoutModal(false)} />}
      {showLanguageModal && (
        <LanguagePreferenceModal
          onContinue={() => {
            const email = localStorage.getItem("pilly-user-email");
            if (email) clearLanguageOnboarding(email);
            setShowLanguageModal(false);
          }}
        />
      )}
      {activeTab !== "askpilly" && <FloatingChatBubble onOpen={() => setActiveTab("askpilly")} />}
      {delayedToastMsg && (
        <BasicToast
          message={delayedToastMsg}
          type="warning"
          duration={3800}
          isVisible={Boolean(delayedToastMsg)}
          onClose={() => setDelayedToastMsg(null)}
        />
      )}
    </div>
  );
}
