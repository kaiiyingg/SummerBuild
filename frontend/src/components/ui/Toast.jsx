import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Info, X, XCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const toastIcons = {
  success: <CheckCircle className="h-5 w-5 text-emerald-500" />,
  error:   <XCircle     className="h-5 w-5 text-red-500"     />,
  warning: <AlertCircle className="h-5 w-5 text-amber-500"   />,
  info:    <Info        className="h-5 w-5 text-blue-500"    />,
};

const toastClasses = {
  success: "border-emerald-100 bg-emerald-50",
  error:   "border-red-100 bg-red-50",
  warning: "border-amber-100 bg-amber-50",
  info:    "border-blue-100 bg-blue-50",
};

export function BasicToast({
  message,
  type = "info",
  duration = 3000,
  onClose,
  isVisible = true,
  className = "",
}) {
  const [visible, setVisible] = useState(isVisible);

  useEffect(() => { setVisible(isVisible); }, [isVisible]);

  useEffect(() => {
    if (visible && duration > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onClose]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className={`fixed bottom-4 right-4 z-50 flex w-80 items-center gap-3 rounded-lg border p-4 shadow-lg ${toastClasses[type]} ${className}`}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.15 } }}
          transition={{ type: "spring", bounce: 0.25 }}
        >
          <div className="flex-shrink-0">{toastIcons[type]}</div>
          <p className="flex-1 text-sm">{message}</p>
          <button
            onClick={() => { setVisible(false); onClose?.(); }}
            className="flex-shrink-0 rounded-full p-1 transition-colors hover:bg-black/5"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
