import React, { useState, useEffect, useRef } from 'react';
import { Contact } from '../types/contact';
import { QuoteItem, QuoteStatus } from '../types/quote';
import { quotesDb, generateMailtoLink, formatFileSize } from '../services/quotes';
import {
  X,
  Send,
  Paperclip,
  FileText,
  FileCheck,
  AlertCircle,
  Clock,
  Trash2,
  Mail,
  Euro,
} from 'lucide-react';

interface SendQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: Contact;
  onQuoteSent: (newQuote: QuoteItem, wasEmailOpened: boolean) => void;
}

export const SendQuoteModal: React.FC<SendQuoteModalProps> = ({
  isOpen,
  onClose,
  contact,
  onQuoteSent,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const contactName =
    contact.type === 'company'
      ? contact.company || 'Société'
      : `${contact.firstName} ${contact.lastName}`.trim() || contact.company || 'Contact';

  // Form State
  const [recipientEmail, setRecipientEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    type: string;
    size: number;
    data: string; // Base64 Data URL
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize or reset form when modal opens or contact changes
  useEffect(() => {
    if (isOpen) {
      // Pick first email from contact or empty
      const primaryEmail = contact.emails[0]?.email || '';
      setRecipientEmail(primaryEmail);

      const defaultSubject = `Devis - ${contact.company || contactName}`;
      setSubject(defaultSubject);

      const politeGreeting = contact.firstName
        ? `Bonjour ${contact.firstName},`
        : contact.company
          ? `Bonjour à l'équipe ${contact.company},`
          : 'Bonjour,';

      const defaultBody = `${politeGreeting}\n\nVeuillez trouver ci-joint notre proposition de devis détaillée.\nRestant à votre entière disposition pour tout renseignement complémentaire ou ajustement.\n\nBien cordialement,`;
      setMessage(defaultBody);

      setAmount('');
      setAttachedFile(null);
      setErrorMessage(null);
      setIsSubmitting(false);
    }
  }, [isOpen, contact, contactName]);

  // Handle file selection (PDF or image)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/');

    if (!isPdf && !isImage) {
      setErrorMessage('Le fichier de devis doit être un document PDF ou une image (JPG, PNG).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage('La taille du fichier ne doit pas dépasser 15 Mo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachedFile({
        name: file.name,
        type: file.type || (isPdf ? 'application/pdf' : 'image/jpeg'),
        size: file.size,
        data: reader.result as string,
      });
      setErrorMessage(null);
    };
    reader.onerror = () => {
      setErrorMessage('Impossible de lire le fichier sélectionné.');
    };
    reader.readAsDataURL(file);
  };

  const removeAttachedFile = () => {
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (targetStatus: QuoteStatus = 'sent') => {
    const cleanEmail = recipientEmail.trim();
    if (!cleanEmail) {
      setErrorMessage('Veuillez renseigner une adresse e-mail destinataire valide.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMessage('Le format de l’adresse e-mail est invalide.');
      return;
    }

    const cleanSubject = subject.trim();
    if (!cleanSubject) {
      setErrorMessage('Veuillez indiquer un objet pour le devis.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const parsedAmount = amount ? parseFloat(amount.replace(',', '.')) : undefined;

    const newQuote: QuoteItem = {
      id: `quote-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      contactId: contact.id,
      recipientEmail: cleanEmail,
      recipientName: contactName,
      subject: cleanSubject,
      message: message.trim(),
      amount: !isNaN(parsedAmount as number) ? parsedAmount : undefined,
      fileName: attachedFile?.name,
      fileData: attachedFile?.data,
      fileType: attachedFile?.type,
      fileSize: attachedFile?.size,
      status: targetStatus,
      sentAt: new Date().toISOString(),
    };

    try {
      await quotesDb.saveQuote(newQuote);

      if (targetStatus === 'sent') {
        // Generate RFC mailto link and launch default mail client
        const mailtoUri = generateMailtoLink(newQuote);
        window.location.href = mailtoUri;
      }

      onQuoteSent(newQuote, targetStatus === 'sent');
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erreur lors de l’enregistrement du devis.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="send-quote-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
    >
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 id="send-quote-title" className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Envoyer un Devis par E-mail
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[240px] sm:max-w-xs">
                Destinataire : <strong className="font-semibold text-slate-700 dark:text-slate-300">{contactName}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Fermer la fenêtre d'envoi de devis"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {errorMessage && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center gap-2.5 text-xs text-rose-700 dark:text-rose-300"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Recipient Email Address */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
              Adresse e-mail destinataire *
            </label>
            <div className="relative">
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="contact@exemple.fr"
                required
                className="w-full min-h-[44px] px-3.5 py-2 pl-9 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            {/* Quick Email Selector if contact has multiple emails */}
            {contact.emails.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[11px] text-slate-400">Choisir :</span>
                {contact.emails.map((e, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRecipientEmail(e.email)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-medium transition ${
                      recipientEmail === e.email
                        ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {e.email} ({e.label})
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Subject & Optional Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                Objet du Devis *
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="ex. Devis Réfection Façade - Réf DEV-2026-04"
                required
                className="w-full min-h-[44px] px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                Montant (€)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="ex. 1 500"
                  className="w-full min-h-[44px] px-3.5 py-2 pl-8 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
                <Euro className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Message / Cover text */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
              Texte d'accompagnement
            </label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Rédigez ici votre message personnalisé d'accompagnement..."
              className="w-full p-3 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden resize-none"
            />
          </div>

          {/* Attachment Picker (PDF or Image) */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
              Fichier du Devis (PDF ou Image)
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              className="hidden"
              id="quote-file-input"
            />

            {!attachedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-xl bg-slate-50 dark:bg-slate-900/40 text-center cursor-pointer transition flex items-center justify-center gap-3 text-xs text-slate-600 dark:text-slate-400"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Paperclip className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                    Sélectionner un fichier de devis
                  </span>{' '}
                  <span>(PDF, PNG, JPG jusqu'à 15 Mo)</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    {attachedFile.type === 'application/pdf' ? (
                      <FileText className="w-4 h-4" />
                    ) : (
                      <FileCheck className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {attachedFile.name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {formatFileSize(attachedFile.size)} • {attachedFile.type}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeAttachedFile}
                  title="Supprimer la pièce jointe"
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-[44px] px-4 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Annuler
          </button>

          <button
            type="button"
            onClick={() => handleSubmit('pending')}
            disabled={isSubmitting}
            className="w-full sm:w-auto min-h-[44px] px-4 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-xl border border-amber-300 dark:border-amber-700/80 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition"
          >
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Enregistrer en attente</span>
          </button>

          <button
            type="button"
            onClick={() => handleSubmit('sent')}
            disabled={isSubmitting}
            className="w-full sm:w-auto min-h-[44px] px-5 flex items-center justify-center gap-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white transition shadow-xs active:scale-95"
          >
            <Send className="w-4 h-4" />
            <span>Envoyer le Devis par Mail</span>
          </button>
        </div>
      </div>
    </div>
  );
};
