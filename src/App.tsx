import React, { useState, useEffect, useCallback } from 'react';
import { Contact, SortField, DuplicateMatch, ImportSummary } from './types/contact';
import { db } from './services/db';
import { Navbar, ActiveTab } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ContactList } from './components/ContactList';
import { ContactDetail } from './components/ContactDetail';
import { ContactFormModal } from './components/ContactFormModal';
import { ImportExportModal } from './components/ImportExportModal';
import { CompatibilityMatrixModal } from './components/CompatibilityMatrixModal';
import { DuplicateResolutionModal } from './components/DuplicateResolutionModal';
import { ClipboardFallbackModal } from './components/ClipboardFallbackModal';
import { Toast, ToastMessage } from './components/Toast';
import { EmailAccessModal } from './components/EmailAccessModal';
import { useFirebaseAuth } from './hooks/useFirebaseAuth';
import { syncContactsToCloud, fetchContactsFromCloud, deleteContactFromCloud } from './services/firebase';
import { findDuplicates, mergeContactFields } from './services/duplicate';
import { BookUser, Plus, HardDrive, Wifi, WifiOff, X } from 'lucide-react';
import { useOnlineStatus } from './hooks/useOnlineStatus';

export default function App() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [isTabletSidebarOpen, setIsTabletSidebarOpen] = useState(false);

  // Search & Filters (Preserved when navigating between views)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortField>('nameAsc');

  // Active top navigation tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('contacts');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formInitialContact, setFormInitialContact] = useState<Contact | null>(null);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [isCompatibilityOpen, setIsCompatibilityOpen] = useState(false);
  const [isEmailAccessOpen, setIsEmailAccessOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Firebase Authentication
  const { user, loginWithGoogle, loginWithEmail, logout } = useFirebaseAuth();

  // Duplicate resolution
  const [duplicateModal, setDuplicateModal] = useState<{
    isOpen: boolean;
    incoming: Contact | null;
    match: DuplicateMatch | null;
  }>({ isOpen: false, incoming: null, match: null });

  // Clipboard fallback modal
  const [clipboardFallback, setClipboardFallback] = useState<{
    isOpen: boolean;
    text: string;
    title: string;
  }>({ isOpen: false, text: '', title: '' });

  // Toast & Undo
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [lastDeletedContact, setLastDeletedContact] = useState<Contact | null>(null);

  const isOnline = useOnlineStatus();

  // Load contacts from DB
  const loadContacts = useCallback(async () => {
    try {
      setIsLoading(true);
      const list = await db.getAll();
      setContacts(list);

      // Auto-select first contact on wide screens if none selected
      if (list.length > 0 && !selectedContactId && window.innerWidth >= 768) {
        setSelectedContactId(list[0].id);
      } else if (list.length === 0) {
        setSelectedContactId(null);
      }
    } catch (err: any) {
      setToast({
        id: `err-${Date.now()}`,
        type: 'error',
        title: 'Erreur de chargement',
        description: err.message || 'Impossible d’accéder au stockage local.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedContactId]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  // Cloud Synchronization with Firestore
  const handleSyncContacts = useCallback(async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      // 1. Fetch remote contacts from Firestore
      const remote = await fetchContactsFromCloud(user.uid);
      const local = await db.getAll();

      // 2. Merge local and remote
      const map = new Map<string, Contact>();
      local.forEach((c) => map.set(c.id, c));
      remote.forEach((c) => {
        if (!map.has(c.id) || new Date(c.updatedAt) > new Date(map.get(c.id)!.updatedAt)) {
          map.set(c.id, c);
        }
      });

      const mergedList = Array.from(map.values());
      await db.bulkSave(mergedList);
      await syncContactsToCloud(user.uid, mergedList);
      setContacts(mergedList);

      setToast({
        id: `sync-${Date.now()}`,
        type: 'success',
        title: 'Synchronisation Cloud Réussie',
        description: `${mergedList.length} contact(s) synchronisés avec votre compte e-mail (${user.email}).`,
      });
    } catch (err: any) {
      console.error('Erreur synchronisation Firestore:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [user]);

  // Trigger sync on user login
  useEffect(() => {
    if (user) {
      handleSyncContacts();
    }
  }, [user, handleSyncContacts]);

  // Selected contact object
  const selectedContact = contacts.find((c) => c.id === selectedContactId) || null;

  // Save Contact (Create or Edit) with Duplicate Prevention
  const handleSaveContact = async (contactPayload: Contact, forceDuplicate = false) => {
    try {
      // Check for duplicates if creating or if name/phone/email changed
      if (!forceDuplicate) {
        const dups = findDuplicates(contactPayload, contacts, formInitialContact ? contactPayload.id : undefined);
        if (dups.length > 0) {
          setDuplicateModal({
            isOpen: true,
            incoming: contactPayload,
            match: dups[0],
          });
          return;
        }
      }

      const saved = await db.save(contactPayload);

      // Asynchronously sync to cloud if logged in
      if (user) {
        syncContactsToCloud(user.uid, [saved]).catch(console.error);
      }

      setContacts((prev) => {
        const idx = prev.findIndex((c) => c.id === saved.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = saved;
          return updated;
        }
        return [saved, ...prev];
      });

      setSelectedContactId(saved.id);
      setIsFormOpen(false);
      setFormInitialContact(null);
      setDuplicateModal({ isOpen: false, incoming: null, match: null });

      setToast({
        id: `save-${Date.now()}`,
        type: 'success',
        title: formInitialContact ? 'Fiche contact mise à jour' : 'Nouveau contact créé',
        description: `${saved.firstName || saved.company || saved.lastName} est enregistré avec succès.`,
      });
    } catch (e: any) {
      setToast({
        id: `err-${Date.now()}`,
        type: 'error',
        title: 'Erreur d’enregistrement',
        description: e.message || 'Échec de l’écriture dans le stockage.',
      });
    }
  };

  // Duplicate Resolution Handlers
  const handleForceCreateDuplicate = () => {
    if (duplicateModal.incoming) {
      handleSaveContact(duplicateModal.incoming, true);
    }
  };

  const handleMergeDuplicate = async () => {
    if (duplicateModal.incoming && duplicateModal.match) {
      const existing = duplicateModal.match.existingContact;
      const merged = mergeContactFields(existing, duplicateModal.incoming);
      await handleSaveContact(merged, true);
    }
  };

  // Delete Contact with Undo Toast
  const handleDeleteContact = async (contact: Contact) => {
    try {
      await db.delete(contact.id);
      if (user) {
        deleteContactFromCloud(user.uid, contact.id).catch(console.error);
      }
      setLastDeletedContact(contact);

      const remaining = contacts.filter((c) => c.id !== contact.id);
      setContacts(remaining);

      // Select next contact if on wide screen
      if (remaining.length > 0 && window.innerWidth >= 768) {
        setSelectedContactId(remaining[0].id);
      } else {
        setSelectedContactId(null);
      }

      const contactName = contact.type === 'company'
        ? contact.company
        : `${contact.firstName} ${contact.lastName}`.trim() || 'Le contact';

      setToast({
        id: `del-${Date.now()}`,
        type: 'info',
        title: 'Contact supprimé',
        description: `${contactName} a été retiré de votre carnet d'adresses.`,
        duration: 8000,
        onUndo: () => handleUndoDelete(contact),
      });
    } catch (e: any) {
      setToast({
        id: `err-${Date.now()}`,
        type: 'error',
        title: 'Erreur de suppression',
        description: e.message,
      });
    }
  };

  // Undo delete
  const handleUndoDelete = async (restoredContact: Contact) => {
    try {
      await db.save(restoredContact);
      setContacts((prev) => [restoredContact, ...prev]);
      setSelectedContactId(restoredContact.id);
      setLastDeletedContact(null);

      setToast({
        id: `undo-${Date.now()}`,
        type: 'success',
        title: 'Suppression annulée',
        description: `${restoredContact.firstName || restoredContact.company} a été restauré.`,
      });
    } catch (e: any) {
      console.error('Erreur annulation suppression:', e);
    }
  };

  // Toggle favorite
  const handleToggleFavorite = async (contactId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact) return;

    const updated: Contact = {
      ...contact,
      isFavorite: !contact.isFavorite,
      updatedAt: new Date().toISOString(),
    };

    try {
      await db.save(updated);
      setContacts((prev) => prev.map((c) => (c.id === contactId ? updated : c)));
    } catch (err: any) {
      console.error('Erreur favori:', err);
    }
  };

  // Bulk import completed
  const handleImportCompleted = async (importedList: Contact[], summary: ImportSummary) => {
    await db.bulkSave(importedList);
    await loadContacts();

    setToast({
      id: `imp-${Date.now()}`,
      type: 'success',
      title: 'Importation terminée',
      description: `${summary.imported} contact(s) ajouté(s), ${summary.updated} mis à jour, ${summary.skipped} ignoré(s).`,
      duration: 6000,
    });
  };

  // Full restore from JSON backup
  const handleRestoreBackup = async (restoredList: Contact[]) => {
    await db.clearAll();
    await db.bulkSave(restoredList);
    await loadContacts();

    setToast({
      id: `rest-${Date.now()}`,
      type: 'success',
      title: 'Restauration terminée',
      description: `${restoredList.length} contact(s) ont été restaurés avec succès.`,
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-100/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      {/* Top Bar (adhering to 3-zone contract) */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'import-export') setIsImportExportOpen(true);
          if (tab === 'compatibility') setIsCompatibilityOpen(true);
        }}
        onNewContact={() => {
          setFormInitialContact(null);
          setIsFormOpen(true);
        }}
        totalContacts={contacts.length}
        onToggleTabletCategories={() => setIsTabletSidebarOpen((prev) => !prev)}
        onOpenEmailAccess={() => setIsEmailAccessOpen(true)}
        currentUser={user}
      />

      {/* Tablet & Mobile Slide-over Drawer for Categories & Filters */}
      {isTabletSidebarOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Catégories et filtres"
          className="fixed inset-0 z-50 lg:hidden flex bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsTabletSidebarOpen(false)}
        >
          <div
            className="w-72 max-w-[85vw] h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="font-semibold text-sm text-slate-900 dark:text-white">
                Catégories & Groupes
              </span>
              <button
                onClick={() => setIsTabletSidebarOpen(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                aria-label="Fermer le panneau des catégories"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <Sidebar
                contacts={contacts}
                selectedCategory={selectedCategory}
                onSelectCategory={(cat) => {
                  setSelectedCategory(cat);
                  setIsTabletSidebarOpen(false);
                }}
                onOpenImportExport={() => {
                  setIsTabletSidebarOpen(false);
                  setIsImportExportOpen(true);
                }}
                onOpenCompatibility={() => {
                  setIsTabletSidebarOpen(false);
                  setIsCompatibilityOpen(true);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Responsive Layout */}
      <main className="flex-1 flex overflow-hidden pb-18 md:pb-0">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center p-8 text-slate-400">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium">Chargement du carnet d'adresses...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Left Sidebar (>= 1024px) */}
            <div className="hidden lg:block shrink-0 h-full">
              <Sidebar
                contacts={contacts}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                onOpenImportExport={() => setIsImportExportOpen(true)}
                onOpenCompatibility={() => setIsCompatibilityOpen(true)}
              />
            </div>

            {/* Contacts Column (Width adapts responsively) */}
            <div
              className={`h-full flex flex-col transition-all duration-200 ${
                // Mobile: hide list if contact is selected
                selectedContact
                  ? 'hidden md:flex md:w-80 lg:w-96 border-r border-slate-200 dark:border-slate-800'
                  : 'flex-1 md:w-80 lg:w-96 md:flex-initial border-r border-slate-200 dark:border-slate-800'
              }`}
            >
              <ContactList
                contacts={contacts}
                selectedContactId={selectedContactId}
                onSelectContact={(contact) => setSelectedContactId(contact.id)}
                onToggleFavorite={handleToggleFavorite}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                sortBy={sortBy}
                setSortBy={setSortBy}
                onNewContact={() => {
                  setFormInitialContact(null);
                  setIsFormOpen(true);
                }}
              />
            </div>

            {/* Contact Detail Panel (Right Column on Tablet/Desktop, Full on Mobile) */}
            <div
              className={`h-full flex-1 overflow-hidden transition-all duration-200 ${
                // Mobile: hide detail if no contact selected
                !selectedContact ? 'hidden md:flex' : 'flex'
              }`}
            >
              {selectedContact ? (
                <div className="w-full h-full">
                  <ContactDetail
                    contact={selectedContact}
                    onBack={() => setSelectedContactId(null)}
                    onEdit={() => {
                      setFormInitialContact(selectedContact);
                      setIsFormOpen(true);
                    }}
                    onDelete={() => handleDeleteContact(selectedContact)}
                    onToggleFavorite={() => handleToggleFavorite(selectedContact.id)}
                    onShowClipboardFallback={(text, title) =>
                      setClipboardFallback({ isOpen: true, text, title: title || 'Copie manuelle' })
                    }
                  />
                </div>
              ) : (
                /* Empty state when no contact is selected on wide screens */
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 bg-white/50 dark:bg-slate-900/50">
                  <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-400 mb-4 shadow-xs">
                    <BookUser className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                    Sélectionnez un contact
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                    Choisissez une fiche dans la liste de gauche pour consulter ses numéros, adresses, e-mails et actions rapides.
                  </p>
                  <button
                    onClick={() => {
                      setFormInitialContact(null);
                      setIsFormOpen(true);
                    }}
                    className="mt-5 inline-flex items-center gap-2 min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl bg-sky-600 hover:bg-sky-700 text-white transition shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Créer un contact</span>
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* MODALS */}

      {/* Contact Form Modal */}
      <ContactFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setFormInitialContact(null);
        }}
        onSave={handleSaveContact}
        initialContact={formInitialContact}
        existingContacts={contacts}
        onDuplicateDetected={(incoming, match) =>
          setDuplicateModal({ isOpen: true, incoming: incoming as Contact, match })
        }
      />

      {/* Import & Export Modal */}
      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => {
          setIsImportExportOpen(false);
          setActiveTab('contacts');
        }}
        contacts={contacts}
        filteredContacts={contacts}
        onImportCompleted={handleImportCompleted}
        onRestoreBackup={handleRestoreBackup}
      />

      {/* Compatibility Matrix & In-app Tests Modal */}
      <CompatibilityMatrixModal
        isOpen={isCompatibilityOpen}
        onClose={() => {
          setIsCompatibilityOpen(false);
          setActiveTab('contacts');
        }}
      />

      {/* Duplicate Resolution Modal */}
      <DuplicateResolutionModal
        isOpen={duplicateModal.isOpen}
        duplicateMatch={duplicateModal.match}
        incomingContact={duplicateModal.incoming || {}}
        onForceCreate={handleForceCreateDuplicate}
        onMerge={handleMergeDuplicate}
        onCancel={() => setDuplicateModal({ isOpen: false, incoming: null, match: null })}
      />

      {/* Manual Clipboard Fallback Modal */}
      <ClipboardFallbackModal
        isOpen={clipboardFallback.isOpen}
        onClose={() => setClipboardFallback({ isOpen: false, text: '', title: '' })}
        textToCopy={clipboardFallback.text}
        title={clipboardFallback.title}
      />

      {/* Email Access & Cloud Sync Modal */}
      <EmailAccessModal
        isOpen={isEmailAccessOpen}
        onClose={() => setIsEmailAccessOpen(false)}
        user={user}
        onLoginGoogle={loginWithGoogle}
        onLoginEmail={loginWithEmail}
        onLogout={logout}
        onSyncContacts={handleSyncContacts}
        isSyncing={isSyncing}
        totalContacts={contacts.length}
      />

      {/* Toast Notification with Undo */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
