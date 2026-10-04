import React, { useState, useRef } from 'react';
import { Contact, ImportSummary } from '../types/contact';
import {
  X,
  Download,
  Upload,
  FileSpreadsheet,
  FileCode,
  FileText,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  Database,
} from 'lucide-react';
import { exportContactsToCsv, generateSampleCsv, parseCsv, guessColumnMapping } from '../services/csv';
import { exportContactsToVCard, parseVCard } from '../services/vcard';
import { findDuplicates, mergeContactFields } from '../services/duplicate';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: Contact[];
  filteredContacts: Contact[];
  onImportCompleted: (importedContacts: Contact[], summary: ImportSummary) => void;
  onRestoreBackup: (contacts: Contact[]) => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  contacts,
  filteredContacts,
  onImportCompleted,
  onRestoreBackup,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'backup'>('export');
  const [exportScope, setExportScope] = useState<'all' | 'filtered'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const vcfFileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const jsonRestoreInputRef = useRef<HTMLInputElement>(null);

  // Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<'csv' | 'vcf' | 'json' | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, number>>({});
  const [duplicatePolicy, setDuplicatePolicy] = useState<'skip' | 'merge' | 'create'>('merge');
  const [parsedContactsToImport, setParsedContactsToImport] = useState<Partial<Contact>[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [pendingRestoreData, setPendingRestoreData] = useState<Contact[] | null>(null);

  if (!isOpen) return null;

  const currentExportList = exportScope === 'filtered' ? filteredContacts : contacts;

  // --- EXPORT HANDLERS ---
  const handleExportCsv = () => {
    const csvData = exportContactsToCsv(currentExportList);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contacts_${exportScope === 'filtered' ? 'filtres_' : ''}${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportVCard = () => {
    const vcardData = exportContactsToVCard(currentExportList);
    const blob = new Blob([vcardData], { type: 'text/vcard;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contacts_${exportScope === 'filtered' ? 'filtres_' : ''}${new Date().toISOString().slice(0, 10)}.vcf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    const backupData = {
      version: 1,
      appName: 'ContactFlow',
      exportedAt: new Date().toISOString(),
      contactsCount: contacts.length,
      contacts,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contactflow_sauvegarde_complete_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadSampleCsv = () => {
    const sample = generateSampleCsv();
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'exemple_import_contacts.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- IMPORT HANDLERS ---
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setImportSummary(null);
    const name = file.name.toLowerCase();

    if (name.endsWith('.csv') || name.endsWith('.txt')) {
      setImportType('csv');
      const text = await file.text();
      const { headers, rows } = parseCsv(text);
      setCsvHeaders(headers);
      setCsvRows(rows);
      const guessed = guessColumnMapping(headers);
      setColumnMapping(guessed);
    } else if (name.endsWith('.vcf')) {
      setImportType('vcf');
      const text = await file.text();
      const parsed = parseVCard(text);
      setParsedContactsToImport(parsed);
    } else if (name.endsWith('.json')) {
      setImportType('json');
      const text = await file.text();
      try {
        const json = JSON.parse(text);
        const contactList = Array.isArray(json) ? json : json.contacts || [];
        setParsedContactsToImport(contactList);
      } catch {
        alert('Fichier JSON invalide.');
      }
    }
  };

  // Execute CSV mapping into partial contacts
  const buildContactsFromCsv = (): Partial<Contact>[] => {
    return csvRows.map((row) => {
      const getVal = (field: string) => {
        const idx = columnMapping[field];
        return idx !== undefined && row[idx] !== undefined ? row[idx].trim() : '';
      };

      const firstName = getVal('firstName');
      const lastName = getVal('lastName');
      const company = getVal('company');
      const jobTitle = getVal('jobTitle');
      const phone1 = getVal('phone1');
      const phone2 = getVal('phone2');
      const email1 = getVal('email1');
      const email2 = getVal('email2');
      const street = getVal('street');
      const postalCode = getVal('postalCode');
      const city = getVal('city');
      const country = getVal('country');
      const website = getVal('website');
      const categoriesRaw = getVal('categories');
      const notes = getVal('notes');

      const phones = [];
      if (phone1) phones.push({ id: `p-${Date.now()}-1`, label: 'Mobile', number: phone1 });
      if (phone2) phones.push({ id: `p-${Date.now()}-2`, label: 'Travail', number: phone2 });

      const emails = [];
      if (email1) emails.push({ id: `e-${Date.now()}-1`, label: 'Personnel', email: email1 });
      if (email2) emails.push({ id: `e-${Date.now()}-2`, label: 'Travail', email: email2 });

      const categories = categoriesRaw
        ? categoriesRaw.split(/[;,]/).map((s) => s.trim()).filter(Boolean)
        : [];

      const isCompanyType = company && !firstName && !lastName;

      return {
        type: isCompanyType ? 'company' : 'person',
        firstName,
        lastName,
        company,
        jobTitle,
        phones,
        emails,
        address: { street, postalCode, city, country },
        website,
        categories,
        notes,
        isFavorite: false,
      };
    });
  };

  const handleExecuteImport = async () => {
    setIsProcessing(true);

    const candidates = importType === 'csv' ? buildContactsFromCsv() : parsedContactsToImport;

    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errorMessages: string[] = [];

    const finalContactsToSave: Contact[] = [];
    const workingList = [...contacts];

    for (let i = 0; i < candidates.length; i++) {
      const item = candidates[i];
      if (!item.firstName && !item.lastName && !item.company) {
        errorCount++;
        errorMessages.push(`Ligne ${i + 1} : aucun nom, prénom ou raison sociale.`);
        continue;
      }

      // Check duplicates
      const dups = findDuplicates(item, workingList);

      if (dups.length > 0) {
        if (duplicatePolicy === 'skip') {
          skippedCount++;
          continue;
        } else if (duplicatePolicy === 'merge') {
          const targetExisting = dups[0].existingContact;
          const merged = mergeContactFields(targetExisting, item);
          const idx = workingList.findIndex((c) => c.id === targetExisting.id);
          if (idx >= 0) {
            workingList[idx] = merged;
          }
          finalContactsToSave.push(merged);
          updatedCount++;
          continue;
        }
      }

      // New contact
      const newContact: Contact = {
        id: `c-imp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: item.type || (item.company && !item.firstName ? 'company' : 'person'),
        firstName: item.firstName || '',
        lastName: item.lastName || '',
        company: item.company || '',
        jobTitle: item.jobTitle || '',
        phones: item.phones || [],
        emails: item.emails || [],
        address: item.address || { street: '', postalCode: '', city: '', country: '' },
        website: item.website || '',
        categories: item.categories || [],
        notes: item.notes || '',
        avatar: item.avatar || '',
        isFavorite: !!item.isFavorite,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      workingList.push(newContact);
      finalContactsToSave.push(newContact);
      addedCount++;
    }

    const summary: ImportSummary = {
      total: candidates.length,
      imported: addedCount,
      updated: updatedCount,
      skipped: skippedCount,
      errors: errorCount,
      errorMessages,
    };

    setImportSummary(summary);
    setIsProcessing(false);
    onImportCompleted(finalContactsToSave, summary);
  };

  // --- RESTORE JSON BACKUP ---
  const handleRestoreJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const list: Contact[] = Array.isArray(json) ? json : json.contacts || [];

      if (!Array.isArray(list) || list.length === 0) {
        alert('Le fichier ne contient aucun contact valide.');
        return;
      }

      setPendingRestoreData(list);
      setShowRestoreConfirm(true);
    } catch {
      alert('Erreur lors de la lecture du fichier de sauvegarde JSON.');
    }
  };

  const confirmRestore = () => {
    if (pendingRestoreData) {
      onRestoreBackup(pendingRestoreData);
      setShowRestoreConfirm(false);
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs"
    >
      <div className="w-full max-w-3xl max-h-[92dvh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white">
              <Database className="w-4 h-4" />
            </div>
            <h3 id="import-modal-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Sauvegardes, Import & Export
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 px-4 pt-2">
          <button
            onClick={() => setActiveTab('export')}
            className={`min-h-[40px] px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'export'
                ? 'border-sky-600 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Exporter
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`min-h-[40px] px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'import'
                ? 'border-sky-600 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Importer des contacts
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`min-h-[40px] px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'backup'
                ? 'border-sky-600 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Sauvegarde & Restauration
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: EXPORT */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              {/* Scope selector */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                  Périmètre de l'export
                </span>
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                    <input
                      type="radio"
                      name="exportScope"
                      checked={exportScope === 'all'}
                      onChange={() => setExportScope('all')}
                      className="text-sky-600 focus:ring-sky-500"
                    />
                    <span>Tous les contacts ({contacts.length})</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                    <input
                      type="radio"
                      name="exportScope"
                      checked={exportScope === 'filtered'}
                      onChange={() => setExportScope('filtered')}
                      className="text-sky-600 focus:ring-sky-500"
                    />
                    <span>Contacts actuellement filtrés ({filteredContacts.length})</span>
                  </label>
                </div>
              </div>

              {/* Formats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* CSV */}
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Tableur Excel / CSV (UTF-8 avec BOM)
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Compatible Excel, LibreOffice et Google Sheets. Protégé contre l'injection de formules et respecte les zéros et préfixes téléphoniques.
                    </p>
                  </div>
                  <button
                    onClick={handleExportCsv}
                    className="min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    Télécharger CSV ({currentExportList.length} contacts)
                  </button>
                </div>

                {/* vCard */}
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Format vCard standard (.vcf 3.0)
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Idéal pour transférer vos contacts vers l'application Contacts d'Apple (iPhone/iPad/Mac), Google Contacts ou Outlook.
                    </p>
                  </div>
                  <button
                    onClick={handleExportVCard}
                    className="min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl bg-sky-600 hover:bg-sky-700 text-white transition shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    Télécharger vCard ({currentExportList.length} contacts)
                  </button>
                </div>
              </div>

              {/* Sample CSV Download Helper */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                    Besoin d'un modèle d'import ?
                  </span>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Téléchargez un fichier CSV d'exemple avec les colonnes recommandées et des accents français.
                  </p>
                </div>
                <button
                  onClick={handleDownloadSampleCsv}
                  className="min-h-[40px] px-3.5 flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition font-medium whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  Télécharger le fichier modèle
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: IMPORT */}
          {activeTab === 'import' && (
            <div className="space-y-6">
              {!importFile ? (
                /* Mode Selection & Dropzone */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Mode 1: vCard .vcf */}
                    <div className="p-5 rounded-2xl border-2 border-sky-500/40 dark:border-sky-500/30 bg-sky-50/50 dark:bg-sky-950/20 hover:border-sky-500 dark:hover:border-sky-400 transition flex flex-col justify-between gap-3.5">
                      <div className="space-y-2">
                        <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
                          <FileText className="w-5 h-5" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          Mode vCard (.vcf)
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300">
                            Recommandé
                          </span>
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          Format universel idéal pour importer vos contacts depuis un <strong>iPhone</strong>, <strong>Android</strong>, <strong>Google Contacts</strong> ou <strong>Outlook</strong>. Restitue fidèlement les photos, emails, adresses et multiples téléphones.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => vcfFileInputRef.current?.click()}
                        className="min-h-[44px] flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-sky-600 hover:bg-sky-700 text-white transition shadow-xs active:scale-95"
                      >
                        <Upload className="w-4 h-4" />
                        Sélectionner un fichier .vcf
                      </button>
                    </div>

                    {/* Mode 2: CSV Spreadsheet */}
                    <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col justify-between gap-3.5">
                      <div className="space-y-2">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                          <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          Mode Tableur (.csv)
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          Importez un export CSV depuis Excel, LibreOffice ou Google Sheets. Détection automatique des en-têtes et correspondance flexible des colonnes.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => csvFileInputRef.current?.click()}
                        className="min-h-[44px] flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition"
                      >
                        <Upload className="w-4 h-4" />
                        Sélectionner un fichier .csv
                      </button>
                    </div>
                  </div>

                  {/* General Drag & Drop zone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-5 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-sky-500 dark:hover:border-sky-500 rounded-2xl bg-slate-50 dark:bg-slate-900/40 text-center cursor-pointer transition flex items-center justify-center gap-3 text-xs text-slate-500 dark:text-slate-400"
                  >
                    <Upload className="w-4 h-4 text-sky-500" />
                    <span>Ou glissez-déposez n'importe quel fichier <strong>.vcf, .csv ou .json</strong> ici</span>
                  </div>

                  {/* Hidden inputs */}
                  <input
                    ref={vcfFileInputRef}
                    type="file"
                    accept=".vcf,text/vcard"
                    onChange={handleFileSelected}
                    className="hidden"
                  />
                  <input
                    ref={csvFileInputRef}
                    type="file"
                    accept=".csv,.txt,text/csv"
                    onChange={handleFileSelected}
                    className="hidden"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".vcf,.csv,.txt,.json,text/vcard,text/csv"
                    onChange={handleFileSelected}
                    className="hidden"
                  />
                </div>
              ) : importSummary ? (
                /* Import Summary Result */
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Bilan de l'importation
                      </h4>
                      <p className="text-xs text-slate-500">
                        {importFile.name} traité avec succès
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <div className="text-xl font-bold font-mono text-emerald-600">
                        {importSummary.imported}
                      </div>
                      <div className="text-[11px] text-slate-500">Ajoutés</div>
                    </div>
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <div className="text-xl font-bold font-mono text-sky-600">
                        {importSummary.updated}
                      </div>
                      <div className="text-[11px] text-slate-500">Mis à jour</div>
                    </div>
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <div className="text-xl font-bold font-mono text-amber-600">
                        {importSummary.skipped}
                      </div>
                      <div className="text-[11px] text-slate-500">Ignorés / doublons</div>
                    </div>
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <div className="text-xl font-bold font-mono text-rose-600">
                        {importSummary.errors}
                      </div>
                      <div className="text-[11px] text-slate-500">Lignes invalides</div>
                    </div>
                  </div>

                  {importSummary.errorMessages.length > 0 && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs space-y-1">
                      <span className="font-semibold block">Détails des avertissements :</span>
                      {importSummary.errorMessages.slice(0, 5).map((m, i) => (
                        <div key={i}>{m}</div>
                      ))}
                      {importSummary.errorMessages.length > 5 && (
                        <div>... et {importSummary.errorMessages.length - 5} autres erreurs.</div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => {
                        setImportFile(null);
                        setImportSummary(null);
                      }}
                      className="px-4 py-2 text-xs font-semibold rounded-xl bg-sky-600 text-white hover:bg-sky-700"
                    >
                      Importer un autre fichier
                    </button>
                  </div>
                </div>
              ) : (
                /* Mapping & Preview Stage */
                <div className="space-y-5">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
                    <div>
                      Fichier sélectionné : <strong>{importFile.name}</strong> (
                      {importType === 'csv'
                        ? `${csvRows.length} lignes détectées`
                        : `${parsedContactsToImport.length} fiches détectées`}
                      )
                    </div>
                    <button
                      onClick={() => {
                        setImportFile(null);
                        setCsvHeaders([]);
                        setCsvRows([]);
                      }}
                      className="text-rose-500 hover:underline font-medium min-h-[44px] flex items-center"
                    >
                      Changer
                    </button>
                  </div>

                  {/* CSV Column Mapping Step */}
                  {importType === 'csv' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Correspondance des colonnes
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Vérifiez les associations automatiques
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {[
                          { key: 'firstName', label: 'Prénom' },
                          { key: 'lastName', label: 'Nom' },
                          { key: 'company', label: 'Société / Entreprise' },
                          { key: 'jobTitle', label: 'Fonction / Titre' },
                          { key: 'phone1', label: 'Téléphone principal' },
                          { key: 'phone2', label: 'Téléphone 2' },
                          { key: 'email1', label: 'E-mail principal' },
                          { key: 'email2', label: 'E-mail 2' },
                          { key: 'street', label: 'Rue / Adresse' },
                          { key: 'postalCode', label: 'Code postal' },
                          { key: 'city', label: 'Ville' },
                          { key: 'country', label: 'Pays' },
                          { key: 'website', label: 'Site Web' },
                          { key: 'categories', label: 'Catégories / Étiquettes' },
                          { key: 'notes', label: 'Notes' },
                        ].map((field) => (
                          <div
                            key={field.key}
                            className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800"
                          >
                            <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                              {field.label}
                            </span>
                            <select
                              value={
                                columnMapping[field.key] !== undefined
                                  ? columnMapping[field.key]
                                  : ''
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                setColumnMapping((prev) => ({
                                  ...prev,
                                  [field.key]: val === '' ? undefined! : Number(val),
                                }));
                              }}
                              className="w-36 text-xs p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                            >
                              <option value="">-- Ignorer --</option>
                              {csvHeaders.map((h, i) => (
                                <option key={i} value={i}>
                                  {h}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>

                      {/* Preview Table of first 3 rows */}
                      {csvRows.length > 0 && (
                        <div className="space-y-1.5 pt-2">
                          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                            Aperçu des premières lignes
                          </span>
                          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 text-[11px]">
                            <table className="w-full divide-y divide-slate-200 dark:divide-slate-800">
                              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                <tr>
                                  <th className="p-2 text-left">#</th>
                                  <th className="p-2 text-left">Prénom</th>
                                  <th className="p-2 text-left">Nom</th>
                                  <th className="p-2 text-left">Société</th>
                                  <th className="p-2 text-left">Téléphone</th>
                                  <th className="p-2 text-left">Email</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                                {csvRows.slice(0, 3).map((row, i) => (
                                  <tr key={i}>
                                    <td className="p-2 text-slate-400 font-mono">{i + 1}</td>
                                    <td className="p-2">
                                      {columnMapping.firstName !== undefined ? row[columnMapping.firstName] || '-' : '-'}
                                    </td>
                                    <td className="p-2">
                                      {columnMapping.lastName !== undefined ? row[columnMapping.lastName] || '-' : '-'}
                                    </td>
                                    <td className="p-2">
                                      {columnMapping.company !== undefined ? row[columnMapping.company] || '-' : '-'}
                                    </td>
                                    <td className="p-2 font-mono">
                                      {columnMapping.phone1 !== undefined ? row[columnMapping.phone1] || '-' : '-'}
                                    </td>
                                    <td className="p-2">
                                      {columnMapping.email1 !== undefined ? row[columnMapping.email1] || '-' : '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* vCard Preview Step */}
                  {importType === 'vcf' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Contacts reconnus dans le fichier vCard (.vcf)
                        </span>
                        <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                          {parsedContactsToImport.length} fiche(s) analysée(s)
                        </span>
                      </div>

                      <div className="max-h-64 overflow-y-auto space-y-2 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
                        {parsedContactsToImport.map((c, idx) => {
                          const name =
                            `${c.firstName || ''} ${c.lastName || ''}`.trim() ||
                            c.company ||
                            'Sans nom';
                          return (
                            <div
                              key={idx}
                              className="p-3 flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {c.avatar ? (
                                  <img
                                    src={c.avatar}
                                    alt=""
                                    className="w-9 h-9 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                                  />
                                ) : (
                                  <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-xs shrink-0">
                                    {name.substring(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                                    {name}
                                  </div>
                                  <div className="text-[11px] text-slate-500 truncate">
                                    {c.company ||
                                      (c.phones && c.phones[0]?.number) ||
                                      (c.emails && c.emails[0]?.email) ||
                                      'Aucune coordonnée'}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 text-[10px]">
                                {c.phones && c.phones.length > 0 && (
                                  <span className="px-2 py-0.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-mono">
                                    {c.phones.length} tél.
                                  </span>
                                )}
                                {c.emails && c.emails.length > 0 && (
                                  <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                    {c.emails.length} email
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Duplicate Handling Policy */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                      Gestion des doublons détectés
                    </span>
                    <div className="space-y-1.5 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer min-h-[36px]">
                        <input
                          type="radio"
                          name="dupPolicy"
                          checked={duplicatePolicy === 'merge'}
                          onChange={() => setDuplicatePolicy('merge')}
                          className="text-sky-600 focus:ring-sky-500"
                        />
                        <span>
                          <strong>Mettre à jour & fusionner</strong> (complète les champs manquants sans écraser les données existantes)
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer min-h-[36px]">
                        <input
                          type="radio"
                          name="dupPolicy"
                          checked={duplicatePolicy === 'skip'}
                          onChange={() => setDuplicatePolicy('skip')}
                          className="text-sky-600 focus:ring-sky-500"
                        />
                        <span>
                          <strong>Ignorer les doublons</strong> (conserve uniquement les fiches actuelles)
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer min-h-[36px]">
                        <input
                          type="radio"
                          name="dupPolicy"
                          checked={duplicatePolicy === 'create'}
                          onChange={() => setDuplicatePolicy('create')}
                          className="text-sky-600 focus:ring-sky-500"
                        />
                        <span>
                          <strong>Créer quand même</strong> (ajoute en créant une nouvelle fiche distincte)
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Submit import button */}
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={handleExecuteImport}
                      disabled={isProcessing}
                      className="min-h-[44px] px-6 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white transition shadow-xs flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      <span>
                        {isProcessing
                          ? 'Traitement en cours...'
                          : importType === 'vcf'
                            ? `Importer ces ${parsedContactsToImport.length} contacts vCard`
                            : 'Lancer l’importation'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BACKUP & RESTORE */}
          {activeTab === 'backup' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/40 text-xs text-sky-900 dark:text-sky-300 leading-relaxed">
                <strong>Sauvegarde intégrale autonome :</strong> Crée une archive JSON contenant l'ensemble de vos contacts, catégories, photos, dates et notes. Vous pouvez la conserver sur une clé USB ou l'envoyer par e-mail pour la restaurer sur n'importe quel autre appareil.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Download JSON Backup */}
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      <FileCode className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Créer une sauvegarde complète (.json)
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Génère un fichier JSON comprenant la totalité de vos {contacts.length} contacts avec toutes leurs métadonnées.
                    </p>
                  </div>
                  <button
                    onClick={handleExportJson}
                    className="min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    Télécharger la sauvegarde ({contacts.length})
                  </button>
                </div>

                {/* Restore JSON Backup */}
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <Upload className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Restaurer une sauvegarde
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Restaure vos contacts à partir d'un fichier JSON préalablement exporté. Une confirmation vous sera demandée avant le remplacement.
                    </p>
                  </div>
                  <input
                    ref={jsonRestoreInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleRestoreJsonFile}
                    className="hidden"
                  />
                  <button
                    onClick={() => jsonRestoreInputRef.current?.click()}
                    className="min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition shadow-xs"
                  >
                    <Upload className="w-4 h-4" />
                    Sélectionner un fichier JSON
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation prompt before full replace restore */}
      {showRestoreConfirm && pendingRestoreData && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
        >
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Remplacer les contacts actuels ?
              </h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Cette restauration va charger <strong>{pendingRestoreData.length} contacts</strong> et remplacer vos données existantes ({contacts.length} contacts). Voulez-vous continuer ?
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowRestoreConfirm(false);
                  setPendingRestoreData(null);
                }}
                className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmRestore}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
              >
                Confirmer et Restaurer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
