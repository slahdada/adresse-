import React, { useState, useEffect } from 'react';
import { Contact } from '../types/contact';
import { QuoteItem, QuoteStatus } from '../types/quote';
import {
  quotesDb,
  formatCurrency,
  formatDateFrench,
  formatFileSize,
  getQuoteStatusInfo,
  generateMailtoLink,
} from '../services/quotes';
import {
  X,
  FileText,
  Mail,
  Plus,
  Trash2,
  Download,
  ExternalLink,
  Clock,
  CheckCircle2,
  Send,
  Eye,
  FileCheck,
} from 'lucide-react';

interface QuoteListModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: Contact;
  onOpenSendModal: () => void;
}

export const QuoteListModal: React.FC<QuoteListModalProps> = ({
  isOpen,
  onClose,
  contact,
  onOpenSendModal,
}) => {
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'all'>('all');
  const [selectedPreviewQuote, setSelectedPreviewQuote] = useState<QuoteItem | null>(null);

  const contactName =
    contact.type === 'company'
      ? contact.company || 'Société'
      : `${contact.firstName} ${contact.lastName}`.trim() || contact.company || 'Contact';

  const loadQuotes = async () => {
    setIsLoading(true);
    try {
      const list = await quotesDb.getQuotesForContact(contact.id);
      setQuotes(list);
    } catch (err) {
      console.error('Erreur chargement devis:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadQuotes();
      setSelectedPreviewQuote(null);
    }
  }, [isOpen, contact.id]);

  const handleStatusChange = async (quoteId: string, nextStatus: QuoteStatus) => {
    try {
      await quotesDb.updateQuoteStatus(quoteId, nextStatus);
      setQuotes((prev) =>
        prev.map((q) => (q.id === quoteId ? { ...q, status: nextStatus, updatedAt: new Date().toISOString() } : q))
      );
    } catch (err) {
      console.error('Erreur mise à jour statut devis:', err);
    }
  };

  const handleDelete = async (quoteId: string) => {
    if (!window.confirm('Voulez-vous vraiment supprimer ce devis de l’historique ?')) return;
    try {
      await quotesDb.deleteQuote(quoteId);
      setQuotes((prev) => prev.filter((q) => q.id !== quoteId));
      if (selectedPreviewQuote?.id === quoteId) setSelectedPreviewQuote(null);
    } catch (err) {
      console.error('Erreur suppression devis:', err);
    }
  };

  const handleDownloadAttachment = (quote: QuoteItem) => {
    if (!quote.fileData) return;
    const a = document.createElement('a');
    a.href = quote.fileData;
    a.download = quote.fileName || `devis_${quote.id}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleResendMail = (quote: QuoteItem) => {
    const link = generateMailtoLink(quote);
    window.location.href = link;
  };

  if (!isOpen) return null;

  const filteredQuotes =
    statusFilter === 'all' ? quotes : quotes.filter((q) => q.status === statusFilter);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quotes-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
    >
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 id="quotes-modal-title" className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Devis & Propositions</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300">
                  {quotes.length}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Historique des devis pour <strong>{contactName}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSendModal();
              }}
              className="min-h-[40px] px-3 flex items-center gap-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-xs active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nouveau Devis</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Fermer l'historique des devis"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-4 sm:px-5 py-2.5 bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 text-xs overflow-x-auto">
          <span className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold mr-1">
            Statut :
          </span>
          {(
            [
              { id: 'all', label: 'Tous' },
              { id: 'sent', label: 'Envoyés' },
              { id: 'received', label: 'Reçus' },
              { id: 'pending', label: 'En attente' },
            ] as const
          ).map((tab) => {
            const count =
              tab.id === 'all'
                ? quotes.length
                : quotes.filter((q) => q.status === tab.id).length;
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`min-h-[34px] px-3 py-1 rounded-xl text-xs font-medium transition flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 font-mono">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Quotes List Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {isLoading ? (
            <div className="p-8 flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs">Chargement des devis...</p>
            </div>
          ) : filteredQuotes.length === 0 ? (
            <div className="p-8 sm:p-12 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {statusFilter === 'all'
                    ? 'Aucun devis enregistré pour ce contact'
                    : `Aucun devis avec le statut "${statusFilter}"`}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Envoyez un devis avec une pièce jointe PDF ou image pour l'archiver automatiquement dans cette fiche.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSendModal();
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-xs active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Créer et envoyer un premier devis</span>
              </button>
            </div>
          ) : (
            filteredQuotes.map((quote) => {
              const statusInfo = getQuoteStatusInfo(quote.status);

              return (
                <div
                  key={quote.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition shadow-xs space-y-3"
                >
                  {/* Top Bar: Subject, Amount & Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {quote.subject}
                        </h4>
                        {quote.amount !== undefined && (
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                            {formatCurrency(quote.amount)}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Envoyé à <strong>{quote.recipientEmail}</strong> le{' '}
                        {formatDateFrench(quote.sentAt)}
                      </p>
                    </div>

                    {/* Interactive Status Selector */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="relative group">
                        <select
                          value={quote.status}
                          onChange={(e) => handleStatusChange(quote.id, e.target.value as QuoteStatus)}
                          aria-label="Modifier le statut du devis"
                          className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl border appearance-none pr-7 cursor-pointer transition ${statusInfo.bgClass} ${statusInfo.textClass} ${statusInfo.borderClass}`}
                        >
                          <option value="sent">Envoyé</option>
                          <option value="received">Reçu</option>
                          <option value="pending">En attente</option>
                        </select>
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-xs opacity-60">
                          ▾
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDelete(quote.id)}
                        title="Supprimer ce devis"
                        aria-label="Supprimer ce devis"
                        className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Message Snippet */}
                  {quote.message && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                      {quote.message}
                    </div>
                  )}

                  {/* Attachment & Action Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60 text-xs">
                    {quote.fileName ? (
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                          {quote.fileType === 'application/pdf' ? (
                            <FileText className="w-3.5 h-3.5" />
                          ) : (
                            <FileCheck className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[200px] sm:max-w-xs">
                          {quote.fileName}
                        </span>
                        {quote.fileSize && (
                          <span className="text-[11px] text-slate-400">
                            ({formatFileSize(quote.fileSize)})
                          </span>
                        )}
                        {quote.fileData && (
                          <button
                            type="button"
                            onClick={() => handleDownloadAttachment(quote)}
                            className="min-h-[32px] px-2 text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                          >
                            <Download className="w-3 h-3" />
                            <span>Télécharger</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400">Aucune pièce jointe</span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleResendMail(quote)}
                      className="self-end sm:self-auto min-h-[32px] px-3 flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition font-medium"
                    >
                      <Send className="w-3 h-3 text-indigo-500" />
                      <span>Renvoyer l'e-mail</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex items-center justify-between text-xs text-slate-500">
          <span>
            {quotes.length} devis archivé(s) pour ce contact
          </span>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-4 font-semibold rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
