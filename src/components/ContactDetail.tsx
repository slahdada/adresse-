import React, { useState, useEffect, useCallback } from 'react';
import { Contact } from '../types/contact';
import { QuoteItem } from '../types/quote';
import {
  Phone,
  Mail,
  MapPin,
  Globe,
  Star,
  Edit3,
  Trash2,
  Share2,
  FileDown,
  Copy,
  Check,
  ArrowLeft,
  Building2,
  Calendar,
  ExternalLink,
  Send,
  FileText,
  Plus,
} from 'lucide-react';
import { contactToVCard } from '../services/vcard';
import { getWhatsAppUrl } from '../services/phone';
import { quotesDb, formatCurrency, formatDateFrench, getQuoteStatusInfo } from '../services/quotes';
import { SendQuoteModal } from './SendQuoteModal';
import { QuoteListModal } from './QuoteListModal';

// Official WhatsApp Vector Icon
const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.16 12.04 20.16C10.56 20.16 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67ZM8.95 7.15C8.77 7.15 8.47 7.22 8.23 7.48C7.99 7.74 7.32 8.36 7.32 9.64C7.32 10.92 8.25 12.15 8.38 12.33C8.51 12.51 10.2 15.12 12.79 16.23C13.41 16.5 13.88 16.65 14.26 16.77C14.88 16.97 15.44 16.94 15.89 16.88C16.39 16.8 17.43 16.25 17.65 15.63C17.87 15.01 17.87 14.48 17.8 14.37C17.74 14.26 17.56 14.19 17.29 14.06C17.02 13.93 15.7 13.28 15.45 13.19C15.21 13.1 15.03 13.06 14.85 13.32C14.67 13.58 14.16 14.19 14 14.37C13.85 14.55 13.69 14.58 13.43 14.45C13.16 14.31 12.3 14.03 11.28 13.12C10.49 12.41 9.95 11.53 9.8 11.27C9.65 11 9.78 10.87 9.92 10.73C10.04 10.61 10.19 10.41 10.32 10.25C10.46 10.1 10.5 9.99 10.59 9.81C10.68 9.63 10.63 9.47 10.57 9.35C10.5 9.22 9.98 7.95 9.77 7.42C9.55 6.91 9.34 6.98 9.18 6.97L8.95 7.15Z" />
  </svg>
);

interface ContactDetailProps {
  contact: Contact;
  onBack?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onShowClipboardFallback: (text: string, title?: string) => void;
}

export const ContactDetail: React.FC<ContactDetailProps> = ({
  contact,
  onBack,
  onEdit,
  onDelete,
  onToggleFavorite,
  onShowClipboardFallback,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Quotes Modal and List state
  const [isSendQuoteOpen, setIsSendQuoteOpen] = useState(false);
  const [isQuoteListOpen, setIsQuoteListOpen] = useState(false);
  const [quoteCount, setQuoteCount] = useState<number>(0);
  const [recentQuotes, setRecentQuotes] = useState<QuoteItem[]>([]);

  const loadQuotes = useCallback(async () => {
    try {
      const list = await quotesDb.getQuotesForContact(contact.id);
      setQuoteCount(list.length);
      setRecentQuotes(list.slice(0, 3));
    } catch {
      // Ignored
    }
  }, [contact.id]);

  useEffect(() => {
    loadQuotes();
  }, [loadQuotes]);

  const isCompany = contact.type === 'company';
  const displayName = isCompany
    ? contact.company || 'Entreprise sans nom'
    : `${contact.firstName} ${contact.lastName}`.trim() || contact.company || 'Sans nom';

  // Format dates in French
  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(d);
    } catch {
      return isoString;
    }
  };

  const copyToClipboard = async (text: string, key: string, label: string) => {
    if (!text) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch {
      onShowClipboardFallback(text, `Copier ${label}`);
    }
  };

  const fullAddress = [
    contact.address.street,
    contact.address.postalCode,
    contact.address.city,
    contact.address.country,
  ]
    .filter(Boolean)
    .join(', ');

  const handleShare = async () => {
    const summaryText = `${displayName}\n${contact.phones.map((p) => `${p.label}: ${p.number}`).join('\n')}\n${contact.emails.map((e) => `${e.label}: ${e.email}`).join('\n')}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: displayName,
          text: summaryText,
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      copyToClipboard(summaryText, 'full_share', 'la fiche de contact');
    }
  };

  const handleDownloadVCard = () => {
    const vcardContent = contactToVCard(contact);
    const blob = new Blob([vcardContent], { type: 'text/vcard;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${displayName.replace(/\s+/g, '_')}.vcf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 overflow-y-auto">
      {/* Top action bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              aria-label="Retour à la liste des contacts"
              className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Fiche Contact
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Favorite toggle */}
          <button
            onClick={onToggleFavorite}
            aria-label={contact.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <Star
              className={`w-5 h-5 ${
                contact.isFavorite ? 'fill-amber-400 text-amber-400' : ''
              }`}
            />
          </button>

          {/* Edit button */}
          <button
            onClick={onEdit}
            aria-label="Modifier le contact"
            className="min-h-[44px] px-3 py-2 flex items-center gap-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition"
          >
            <Edit3 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>Modifier</span>
          </button>

          {/* Delete button */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            aria-label="Supprimer le contact"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-6 max-w-3xl space-y-6">
        {/* Contact Header Block */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          {contact.avatar ? (
            <img
              src={contact.avatar}
              alt={displayName}
              referrerPolicy="no-referrer"
              className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-200 dark:border-slate-700 shadow-md"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center text-white text-2xl font-bold shadow-md">
              {displayName.substring(0, 2).toUpperCase()}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white break-words">
                {displayName}
              </h2>
            </div>

            {contact.jobTitle && (
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-0.5">
                {contact.jobTitle}
              </p>
            )}

            {contact.company && !isCompany && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                <Building2 className="w-3.5 h-3.5" />
                <span>{contact.company}</span>
              </div>
            )}

            {/* Clean Unboxed Categories (Anti-AI Slop zero-pill standard) */}
            {contact.categories.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-2">
                {contact.categories.map((cat, idx) => (
                  <React.Fragment key={cat}>
                    <span>{cat}</span>
                    {idx < contact.categories.length - 1 && <span aria-hidden="true">·</span>}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick External Actions Grid (Call, WhatsApp, Email, Devis, vCard, Share) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {contact.phones[0] && (
            <a
              href={`tel:${contact.phones[0].number}`}
              className="min-h-[44px] flex items-center justify-center gap-2 p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-medium text-xs hover:bg-sky-100 dark:hover:bg-sky-900/60 transition"
            >
              <Phone className="w-4 h-4" />
              <span>Appeler</span>
            </a>
          )}

          {contact.phones[0] && (
            <a
              href={getWhatsAppUrl(contact.phones[0].number)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Appeler ou discuter sur WhatsApp"
              className="min-h-[44px] flex items-center justify-center gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 font-medium text-xs hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition"
            >
              <WhatsAppIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>WhatsApp</span>
            </a>
          )}

          {/* Send Quote by Email button */}
          <button
            type="button"
            onClick={() => setIsSendQuoteOpen(true)}
            aria-label="Envoyer un devis par e-mail"
            className="min-h-[44px] flex items-center justify-center gap-2 p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 font-semibold text-xs hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition shadow-2xs"
          >
            <Send className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Envoyer Devis par Mail</span>
          </button>

          {/* Access Quotes History button */}
          <button
            type="button"
            onClick={() => setIsQuoteListOpen(true)}
            aria-label="Accéder aux devis de ce contact"
            className="min-h-[44px] flex items-center justify-center gap-2 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>Accéder aux Devis</span>
            {quoteCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-200 dark:bg-sky-800 text-sky-900 dark:text-sky-100 font-mono">
                {quoteCount}
              </span>
            )}
          </button>

          {contact.emails[0] && (
            <a
              href={`mailto:${contact.emails[0].email}`}
              className="min-h-[44px] flex items-center justify-center gap-2 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              <Mail className="w-4 h-4" />
              <span>E-mail</span>
            </a>
          )}

          <button
            onClick={handleDownloadVCard}
            className="min-h-[44px] flex items-center justify-center gap-2 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            <FileDown className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Fiche vCard</span>
          </button>

          <button
            onClick={handleShare}
            className="min-h-[44px] flex items-center justify-center gap-2 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            <Share2 className="w-4 h-4 text-indigo-500" />
            <span>Partager</span>
          </button>
        </div>

        {/* Detailed Sections */}
        <div className="space-y-6">
          {/* Phone numbers */}
          {contact.phones.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Numéros de Téléphone
              </span>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80 rounded-2xl bg-slate-50 dark:bg-slate-800/40 p-1 border border-slate-200/80 dark:border-slate-800">
                {contact.phones.map((phone, idx) => (
                  <div
                    key={phone.id || idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-2"
                  >
                    <div>
                      <span className="text-[11px] text-slate-400 block">{phone.label}</span>
                      <a
                        href={`tel:${phone.number}`}
                        className="text-sm font-semibold text-slate-900 dark:text-slate-100 hover:text-sky-600 dark:hover:text-sky-400 font-mono tracking-wide"
                      >
                        {phone.number}
                      </a>
                    </div>
                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      {/* Call or Chat on WhatsApp */}
                      <a
                        href={getWhatsAppUrl(phone.number)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Appeler ou envoyer un message à ${phone.number} sur WhatsApp`}
                        title="Appeler ou discuter sur WhatsApp"
                        className="min-h-[40px] px-2.5 py-1.5 inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/70 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-xs font-semibold transition"
                      >
                        <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>WhatsApp</span>
                      </a>

                      {/* Direct Regular Call Button */}
                      <a
                        href={`tel:${phone.number}`}
                        aria-label={`Appeler ${phone.number}`}
                        title="Appel téléphonique standard"
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition"
                      >
                        <Phone className="w-4 h-4" />
                      </a>

                      {/* Copy to Clipboard */}
                      <button
                        onClick={() => copyToClipboard(phone.number, `p-${idx}`, 'le numéro')}
                        aria-label="Copier le numéro"
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                      >
                        {copiedKey === `p-${idx}` ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Email addresses */}
          {contact.emails.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Adresses E-mail
              </span>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80 rounded-2xl bg-slate-50 dark:bg-slate-800/40 p-1 border border-slate-200/80 dark:border-slate-800">
                {contact.emails.map((email, idx) => (
                  <div
                    key={email.id || idx}
                    className="flex items-center justify-between p-3"
                  >
                    <div className="min-w-0 pr-2">
                      <span className="text-[11px] text-slate-400 block">{email.label}</span>
                      <a
                        href={`mailto:${email.email}`}
                        className="text-sm font-medium text-slate-900 dark:text-slate-100 hover:text-sky-600 dark:hover:text-sky-400 break-all"
                      >
                        {email.email}
                      </a>
                    </div>
                    <button
                      onClick={() => copyToClipboard(email.email, `e-${idx}`, 'l’adresse email')}
                      aria-label="Copier l’adresse email"
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition shrink-0"
                    >
                      {copiedKey === `e-${idx}` ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Physical Address */}
          {fullAddress && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Adresse Postale
              </span>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5 text-sm text-slate-900 dark:text-slate-100">
                  {contact.address.street && <p>{contact.address.street}</p>}
                  <p>
                    {contact.address.postalCode && <span>{contact.address.postalCode} </span>}
                    {contact.address.city && <span>{contact.address.city}</span>}
                  </p>
                  {contact.address.country && (
                    <p className="text-slate-500 dark:text-slate-400 text-xs">
                      {contact.address.country}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(fullAddress, 'addr', 'l’adresse')}
                    className="min-h-[40px] px-3 flex items-center gap-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    {copiedKey === 'addr' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copier</span>
                  </button>

                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      fullAddress
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[40px] px-3 flex items-center gap-1.5 text-xs font-semibold rounded-xl bg-sky-600 hover:bg-sky-700 text-white transition shadow-xs"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Ouvrir la carte</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Website */}
          {contact.website && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Site Web
              </span>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <a
                  href={contact.website.startsWith('http') ? contact.website : `https://${contact.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-sky-600 dark:text-sky-400 hover:underline break-all"
                >
                  <Globe className="w-4 h-4 shrink-0" />
                  <span>{contact.website}</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70" />
                </a>
              </div>
            </div>
          )}

          {/* Notes */}
          {contact.notes && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Notes
              </span>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {contact.notes}
              </div>
            </div>
          )}

          {/* Devis & Propositions Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Devis & Facturation ({quoteCount})
              </span>
              <div className="flex items-center gap-2">
                {quoteCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsQuoteListOpen(true)}
                    className="text-xs text-sky-600 dark:text-sky-400 font-semibold hover:underline"
                  >
                    Voir l'historique ({quoteCount})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsSendQuoteOpen(true)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nouveau devis</span>
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/40 p-3.5 border border-slate-200/80 dark:border-slate-800">
              {recentQuotes.length === 0 ? (
                <div className="py-2 px-1 text-center text-xs text-slate-500 dark:text-slate-400 flex flex-col items-center gap-2">
                  <p>Aucun devis envoyé ou associé pour le moment.</p>
                  <button
                    type="button"
                    onClick={() => setIsSendQuoteOpen(true)}
                    className="min-h-[36px] px-3.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition flex items-center gap-1.5 shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Créer et envoyer un devis</span>
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-200/70 dark:divide-slate-800 space-y-2">
                  {recentQuotes.map((q) => {
                    const statusInfo = getQuoteStatusInfo(q.status);
                    return (
                      <div
                        key={q.id}
                        className="pt-2 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {q.subject}
                            </span>
                            {q.amount !== undefined && (
                              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                {formatCurrency(q.amount)}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                            {formatDateFrench(q.sentAt)} • {q.recipientEmail}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${statusInfo.bgClass} ${statusInfo.textClass} ${statusInfo.borderClass}`}
                          >
                            {statusInfo.label}
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsQuoteListOpen(true)}
                            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                          >
                            Consulter →
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Timestamps */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Créé le {formatDate(contact.createdAt)}</span>
            </div>
            <span aria-hidden="true">·</span>
            <div>Modifié le {formatDate(contact.updatedAt)}</div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Supprimer ce contact ?
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Êtes-vous sûr de vouloir supprimer définitivement la fiche de{' '}
              <strong>{displayName}</strong> ? Vous pourrez toutefois annuler cette action pendant quelques secondes via la notification.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onDelete();
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition shadow-xs"
              >
                Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Quote Modal */}
      <SendQuoteModal
        isOpen={isSendQuoteOpen}
        onClose={() => setIsSendQuoteOpen(false)}
        contact={contact}
        onQuoteSent={() => {
          loadQuotes();
        }}
      />

      {/* Quotes History Modal */}
      <QuoteListModal
        isOpen={isQuoteListOpen}
        onClose={() => setIsQuoteListOpen(false)}
        contact={contact}
        onOpenSendModal={() => {
          setIsQuoteListOpen(false);
          setIsSendQuoteOpen(true);
        }}
      />
    </div>
  );
};
