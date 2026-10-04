import React, { useState, useMemo } from 'react';
import { Contact } from '../types/contact';
import {
  findDuplicateGroups,
  DuplicateGroup,
  mergeMultipleContacts,
} from '../services/duplicate';
import {
  X,
  Users,
  Copy,
  Trash2,
  GitMerge,
  Phone,
  Mail,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Info,
  Calendar,
} from 'lucide-react';

interface DuplicateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: Contact[];
  onMergeGroup: (group: DuplicateGroup, primaryContactId: string) => Promise<void>;
  onDeleteDuplicate: (contactId: string) => Promise<void>;
  onMergeAll: () => Promise<void>;
}

export const DuplicateManagerModal: React.FC<DuplicateManagerModalProps> = ({
  isOpen,
  onClose,
  contacts,
  onMergeGroup,
  onDeleteDuplicate,
  onMergeAll,
}) => {
  const [selectedPrimaries, setSelectedPrimaries] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Compute duplicate clusters in real-time from the current contact list
  const duplicateGroups = useMemo(() => {
    return findDuplicateGroups(contacts);
  }, [contacts]);

  if (!isOpen) return null;

  const handleMergeSingleGroup = async (group: DuplicateGroup) => {
    setIsProcessing(true);
    try {
      const primaryId = selectedPrimaries[group.id] || group.contacts[0].id;
      await onMergeGroup(group, primaryId);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMergeAllGroups = async () => {
    setIsProcessing(true);
    try {
      await onMergeAll();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    setIsProcessing(true);
    try {
      await onDeleteDuplicate(contactId);
      setConfirmDeleteId(null);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="duplicate-manager-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
    >
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-white dark:bg-slate-900 sticky top-0 z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Copy className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 id="duplicate-manager-title" className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                Gestion des doublons & Nettoyage
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {duplicateGroups.length === 0
                  ? 'Aucun doublon trouvé'
                  : `${duplicateGroups.length} groupe(s) de doublons identifiés`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {duplicateGroups.length > 1 && (
              <button
                type="button"
                onClick={handleMergeAllGroups}
                disabled={isProcessing}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-xs disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Tout fusionner</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Fermer la gestion des doublons"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {duplicateGroups.length === 0 ? (
            /* Clean state */
            <div className="py-12 px-4 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                Carnet d'adresses propre !
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
                Aucun contact en double n'a été détecté. Tous vos contacts possèdent des numéros de téléphone et des noms uniques.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 min-h-[40px] px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                Fermer
              </button>
            </div>
          ) : (
            /* Duplicate Groups List */
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div className="leading-relaxed">
                  <p className="font-semibold">
                    {duplicateGroups.length} groupe(s) identifié(s) avec des numéros de téléphone ou des noms identiques.
                  </p>
                  <p className="mt-0.5 text-amber-700 dark:text-amber-400/90">
                    Utilisez <strong>« Fusionner »</strong> pour combiner les e-mails, téléphones et notes sans perte sous une seule fiche propre, ou <strong>« Supprimer le doublon »</strong> pour retirer immédiatement une entrée redondante.
                  </p>
                </div>
              </div>

              {duplicateGroups.map((group, groupIdx) => {
                const currentPrimaryId = selectedPrimaries[group.id] || group.contacts[0].id;

                return (
                  <div
                    key={group.id || groupIdx}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 overflow-hidden shadow-xs"
                  >
                    {/* Group Header */}
                    <div className="p-3.5 sm:p-4 bg-white dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                          {group.criterion === 'phone' ? (
                            <Phone className="w-3.5 h-3.5" />
                          ) : (
                            <Users className="w-3.5 h-3.5" />
                          )}
                          <span>{group.label}</span>
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          ({group.contacts.length} fiches trouvées)
                        </span>
                      </div>

                      {/* Primary Group Action: Merge */}
                      <button
                        type="button"
                        onClick={() => handleMergeSingleGroup(group)}
                        disabled={isProcessing}
                        className="min-h-[38px] px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-2xs disabled:opacity-50 self-end sm:self-auto"
                      >
                        <GitMerge className="w-4 h-4" />
                        <span>Fusionner ce groupe</span>
                      </button>
                    </div>

                    {/* Duplicate Contacts in Group */}
                    <div className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {group.contacts.map((c) => {
                        const isPrimary = c.id === currentPrimaryId;
                        const isDeletingThis = confirmDeleteId === c.id;
                        const name = c.type === 'company'
                          ? c.company || 'Entreprise sans nom'
                          : `${c.firstName} ${c.lastName}`.trim() || 'Sans nom';

                        return (
                          <div
                            key={c.id}
                            className={`p-3.5 rounded-xl border transition flex flex-col justify-between ${
                              isPrimary
                                ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-800 shadow-2xs'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            <div className="space-y-2">
                              {/* Selection Indicator & Badge */}
                              <div className="flex items-center justify-between gap-2">
                                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
                                  <input
                                    type="radio"
                                    name={`primary-${group.id}`}
                                    checked={isPrimary}
                                    onChange={() =>
                                      setSelectedPrimaries((prev) => ({
                                        ...prev,
                                        [group.id]: c.id,
                                      }))
                                    }
                                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                                  />
                                  <span>{isPrimary ? 'Fiche principale à conserver' : 'Fiche doublon'}</span>
                                </label>

                                {isPrimary && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                                    Référence
                                  </span>
                                )}
                              </div>

                              {/* Contact Identity */}
                              <div className="pt-1">
                                <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                                  {name}
                                </h5>
                                {(c.company || c.jobTitle) && (
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5">
                                    <Building2 className="w-3 h-3 shrink-0" />
                                    <span>
                                      {[c.jobTitle, c.company].filter(Boolean).join(' • ')}
                                    </span>
                                  </p>
                                )}
                              </div>

                              {/* Details: Phones & Emails */}
                              <div className="space-y-1 pt-1 text-[11px] text-slate-600 dark:text-slate-400">
                                {c.phones.map((p, idx) => (
                                  <div key={idx} className="flex items-center gap-1.5 truncate">
                                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span className="font-mono text-slate-800 dark:text-slate-200">
                                      {p.number}
                                    </span>
                                    <span className="text-[10px] text-slate-400">({p.label})</span>
                                  </div>
                                ))}

                                {c.emails.map((e, idx) => (
                                  <div key={idx} className="flex items-center gap-1.5 truncate">
                                    <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span className="truncate">{e.email}</span>
                                  </div>
                                ))}

                                {c.notes && (
                                  <p className="text-[11px] text-slate-500 italic line-clamp-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                                    "{c.notes}"
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Card Footer: Delete Action */}
                            <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>{new Date(c.createdAt).toLocaleDateString('fr-FR')}</span>
                              </span>

                              {isDeletingThis ? (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-2 py-1 text-[11px] rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                                  >
                                    Annuler
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteContact(c.id)}
                                    disabled={isProcessing}
                                    className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-2xs"
                                  >
                                    Confirmer
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(c.id)}
                                  disabled={isProcessing}
                                  className="min-h-[30px] px-2.5 text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition flex items-center gap-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Supprimer le doublon</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            La fusion rassemble les numéros, e-mails et notes dans la base de données.
          </span>

          <div className="flex items-center gap-2">
            {duplicateGroups.length > 1 && (
              <button
                type="button"
                onClick={handleMergeAllGroups}
                disabled={isProcessing}
                className="sm:hidden min-h-[38px] px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Tout fusionner</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="min-h-[38px] px-4 font-semibold text-xs rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
