import React from 'react';
import { Contact, DuplicateMatch } from '../types/contact';
import { AlertTriangle, UserCheck, PlusCircle, X } from 'lucide-react';

interface DuplicateResolutionModalProps {
  isOpen: boolean;
  duplicateMatch: DuplicateMatch | null;
  incomingContact: Partial<Contact>;
  onForceCreate: () => void;
  onMerge: () => void;
  onCancel: () => void;
}

export const DuplicateResolutionModal: React.FC<DuplicateResolutionModalProps> = ({
  isOpen,
  duplicateMatch,
  incomingContact,
  onForceCreate,
  onMerge,
  onCancel,
}) => {
  if (!isOpen || !duplicateMatch) return null;

  const existing = duplicateMatch.existingContact;
  const existingName =
    existing.type === 'company'
      ? existing.company
      : `${existing.firstName} ${existing.lastName}`.trim() || existing.company;

  const incomingName =
    incomingContact.type === 'company'
      ? incomingContact.company
      : `${incomingContact.firstName || ''} ${incomingContact.lastName || ''}`.trim() || incomingContact.company;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="duplicate-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs"
    >
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700/60 rounded-2xl shadow-2xl p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 id="duplicate-modal-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Doublon potentiel détecté
            </h3>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Un contact présentant des informations similaires existe déjà dans votre carnet d'adresses.
            </p>
          </div>
          <button
            onClick={onCancel}
            aria-label="Fermer"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Reasons list */}
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl text-xs text-amber-900 dark:text-amber-300">
          <span className="font-semibold block mb-1">Motif(s) de correspondance :</span>
          <ul className="list-disc list-inside space-y-0.5">
            {duplicateMatch.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>

        {/* Side-by-side comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
            <span className="font-semibold text-slate-500 uppercase tracking-wider block mb-1 text-[10px]">
              Fiche existante
            </span>
            <div className="font-medium text-slate-900 dark:text-slate-100 text-sm">{existingName}</div>
            {existing.company && existing.type !== 'company' && (
              <div className="text-slate-600 dark:text-slate-400">{existing.company}</div>
            )}
            <div className="mt-2 space-y-1 text-slate-600 dark:text-slate-400">
              {existing.phones[0] && <div>Tél : {existing.phones[0].number}</div>}
              {existing.emails[0] && <div>Email : {existing.emails[0].email}</div>}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/50">
            <span className="font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider block mb-1 text-[10px]">
              Nouvelle fiche saisie
            </span>
            <div className="font-medium text-slate-900 dark:text-slate-100 text-sm">{incomingName}</div>
            {incomingContact.company && incomingContact.type !== 'company' && (
              <div className="text-slate-600 dark:text-slate-400">{incomingContact.company}</div>
            )}
            <div className="mt-2 space-y-1 text-slate-600 dark:text-slate-400">
              {incomingContact.phones?.[0] && <div>Tél : {incomingContact.phones[0].number}</div>}
              {incomingContact.emails?.[0] && <div>Email : {incomingContact.emails[0].email}</div>}
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 italic">
          Choisissez l'action à mener sans risque de perte involontaire d'informations :
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onForceCreate}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Créer un nouveau contact distinct
          </button>
          <button
            type="button"
            onClick={onMerge}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-sky-600 hover:bg-sky-700 text-white transition shadow-xs"
          >
            <UserCheck className="w-3.5 h-3.5" />
            Mettre à jour la fiche existante
          </button>
        </div>
      </div>
    </div>
  );
};
