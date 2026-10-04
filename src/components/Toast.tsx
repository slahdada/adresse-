import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, Undo2, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
  duration?: number;
  onUndo?: () => void;
}

interface ToastProps {
  toast: ToastMessage | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  const [countdown, setCountdown] = useState<number>(8);

  useEffect(() => {
    if (!toast) return;

    if (toast.onUndo) {
      setCountdown(8);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            onClose();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    } else {
      const timer = setTimeout(() => {
        onClose();
      }, toast.duration || 4000);
      return () => clearTimeout(timer);
    }
  }, [toast, onClose]);

  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
    info: <Info className="w-5 h-5 text-sky-500 shrink-0" />,
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 md:bottom-5 right-5 z-50 max-w-sm w-[calc(100vw-2.5rem)] rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-4 flex items-start gap-3 transition-all animate-in fade-in slide-in-from-bottom-3"
    >
      {icons[toast.type]}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
          {toast.title}
        </h4>
        {toast.description && (
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 break-words">
            {toast.description}
          </p>
        )}

        {toast.onUndo && (
          <div className="mt-2.5 flex items-center gap-2">
            <button
              onClick={() => {
                toast.onUndo?.();
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-700 text-white transition-colors"
            >
              <Undo2 className="w-3.5 h-3.5" />
              Annuler ({countdown}s)
            </button>
          </div>
        )}
      </div>

      <button
        onClick={onClose}
        aria-label="Fermer la notification"
        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 -mr-1"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
