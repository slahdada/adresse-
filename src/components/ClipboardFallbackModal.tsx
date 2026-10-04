import React, { useRef, useEffect } from 'react';
import { Copy, Check, X } from 'lucide-react';

interface ClipboardFallbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  textToCopy: string;
  title?: string;
}

export const ClipboardFallbackModal: React.FC<ClipboardFallbackModalProps> = ({
  isOpen,
  onClose,
  textToCopy,
  title = 'Copie manuelle des informations',
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectAndCopy = () => {
    if (textareaRef.current) {
      textareaRef.current.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback for user to press Ctrl+C / Cmd+C
      }
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="clipboard-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5 flex flex-col gap-4 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between">
          <h3 id="clipboard-modal-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </h3>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400">
          L'accès direct au presse-papiers est restreint par votre navigateur. Vous pouvez sélectionner et copier le texte ci-dessous (Ctrl+C ou appui long) :
        </p>

        <textarea
          ref={textareaRef}
          readOnly
          value={textToCopy}
          rows={5}
          className="w-full p-3 font-mono text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-hidden resize-none"
        />

        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Fermer
          </button>
          <button
            type="button"
            onClick={handleSelectAndCopy}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-sky-600 hover:bg-sky-700 text-white transition shadow-xs"
          >
            {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copié !' : 'Tout sélectionner & copier'}
          </button>
        </div>
      </div>
    </div>
  );
};
