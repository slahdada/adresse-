import React, { useState } from 'react';
import { Plus, Download, Moon, Sun, BookUser, HelpCircle, Database, Tag, Mail, User as UserIcon } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useTheme } from '../hooks/useTheme';
import { User } from 'firebase/auth';

export type ActiveTab = 'contacts' | 'import-export' | 'compatibility';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onNewContact: () => void;
  totalContacts: number;
  onToggleTabletCategories?: () => void;
  onOpenEmailAccess?: () => void;
  currentUser?: User | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onNewContact,
  onToggleTabletCategories,
  onOpenEmailAccess,
  currentUser,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const { theme, toggleTheme } = useTheme();
  const [showIOSModal, setShowIOSModal] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          
          {/* Zone 1: Single text wordmark */}
          <button
            onClick={() => setActiveTab('contacts')}
            className="flex items-center gap-2.5 text-left focus-visible:ring-2 focus-visible:ring-sky-500 rounded-lg p-1 -ml-1"
          >
            <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white shadow-xs">
              <BookUser className="w-4 h-4" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              ContactFlow
            </span>
          </button>

          {/* Zone 2: Navigation Links */}
          <nav aria-label="Navigation principale" className="hidden md:flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('contacts')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                activeTab === 'contacts'
                  ? 'bg-slate-100 dark:bg-slate-800 text-sky-600 dark:text-sky-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <BookUser className="w-4 h-4" />
              Contacts
            </button>
            <button
              onClick={() => setActiveTab('import-export')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                activeTab === 'import-export'
                  ? 'bg-slate-100 dark:bg-slate-800 text-sky-600 dark:text-sky-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Database className="w-4 h-4" />
              Import & Export
            </button>
            <button
              onClick={() => setActiveTab('compatibility')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                activeTab === 'compatibility'
                  ? 'bg-slate-100 dark:bg-slate-800 text-sky-600 dark:text-sky-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              Compatibilité & Tests
            </button>
          </nav>

          {/* Zone 3: Actions (Install, Theme toggle, New Contact) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Tablet Mode: Quick Categories Drawer Trigger (768px to 1023px) */}
            {onToggleTabletCategories && (
              <button
                onClick={onToggleTabletCategories}
                aria-label="Ouvrir les catégories et filtres"
                className="hidden md:inline-flex lg:hidden items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition"
              >
                <Tag className="w-3.5 h-3.5 text-sky-500" />
                <span>Catégories</span>
              </button>
            )}

            {/* Email Access / Account Button */}
            {onOpenEmailAccess && (
              <button
                onClick={onOpenEmailAccess}
                aria-label={currentUser ? `Compte connecté: ${currentUser.email}` : "Accès par e-mail et synchronisation"}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition ${
                  currentUser
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80'
                    : 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/80 hover:bg-sky-100 dark:hover:bg-sky-900/60'
                }`}
              >
                {currentUser ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                    <span className="max-w-[110px] sm:max-w-[140px] truncate">{currentUser.email}</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                    <span>Accès par E-mail</span>
                  </>
                )}
              </button>
            )}

            {/* Install PWA Button (Android / Chromium) */}
            {isInstallable && !isInstalled && (
              <button
                onClick={install}
                aria-label="Installer l'application sur cet appareil"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                Installer l'application
              </button>
            )}

            {/* Install PWA Guide (iOS Safari) */}
            {isIOS && !isInstalled && (
              <button
                onClick={() => setShowIOSModal(true)}
                aria-label="Comment installer sur iPhone ou iPad"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <Download className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                Installer sur iOS
              </button>
            )}

            {/* Dark/Light mode toggle */}
            <button
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Primary Action: New Contact (hidden on small mobile since it's prominent in the bottom bar) */}
            <button
              onClick={onNewContact}
              className="hidden sm:inline-flex items-center gap-1.5 min-h-[44px] px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-sky-600 hover:bg-sky-700 text-white transition shadow-sm active:scale-95"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">Nouveau contact</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile & PWA Bottom Tab Bar (Navigation en bas) */}
      <nav
        aria-label="Barre de navigation mobile"
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-4 pt-1.5 pb-safe shadow-lg"
      >
        <div className="flex items-center justify-around max-w-md mx-auto">
          {/* Contacts Tab */}
          <button
            onClick={() => setActiveTab('contacts')}
            className={`min-h-[48px] min-w-[56px] flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
              activeTab === 'contacts'
                ? 'text-sky-600 dark:text-sky-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <div className={`p-1 rounded-lg ${activeTab === 'contacts' ? 'bg-sky-50 dark:bg-sky-950/60' : ''}`}>
              <BookUser className="w-5 h-5" />
            </div>
            <span>Contacts</span>
          </button>

          {/* Quick Create Contact (center action in thumb zone) */}
          <button
            onClick={onNewContact}
            aria-label="Créer un nouveau contact"
            className="min-h-[48px] flex flex-col items-center justify-center -mt-4 group focus-visible:outline-hidden"
          >
            <div className="w-12 h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-md shadow-sky-600/30 group-active:scale-95 transition">
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
              Nouveau
            </span>
          </button>

          {/* Import / Export Tab */}
          <button
            onClick={() => setActiveTab('import-export')}
            className={`min-h-[48px] min-w-[56px] flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
              activeTab === 'import-export'
                ? 'text-sky-600 dark:text-sky-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <div className={`p-1 rounded-lg ${activeTab === 'import-export' ? 'bg-sky-50 dark:bg-sky-950/60' : ''}`}>
              <Database className="w-5 h-5" />
            </div>
            <span>Sauvegardes</span>
          </button>

          {/* Aide & Tests Tab */}
          <button
            onClick={() => setActiveTab('compatibility')}
            className={`min-h-[48px] min-w-[56px] flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
              activeTab === 'compatibility'
                ? 'text-sky-600 dark:text-sky-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <div className={`p-1 rounded-lg ${activeTab === 'compatibility' ? 'bg-sky-50 dark:bg-sky-950/60' : ''}`}>
              <HelpCircle className="w-5 h-5" />
            </div>
            <span>Aide & Tests</span>
          </button>
        </div>
      </nav>

      {/* iOS Installation Modal Instructions */}
      {showIOSModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Installer ContactFlow sur iPhone ou iPad
            </h3>
            <div className="mt-3 text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <p>
                1. Dans la barre d'outils Safari, touchez le bouton <strong>Partager</strong> (icône carré avec flèche montante).
              </p>
              <p>
                2. Faites défiler vers le bas puis touchez <strong>Sur l'écran d'accueil</strong>.
              </p>
              <p>
                3. Touchez <strong>Ajouter</strong> en haut à droite.
              </p>
              <p className="text-slate-500 dark:text-slate-400 pt-1">
                L'application sera accessible immédiatement comme une application native sans barre de navigation.
              </p>
            </div>
            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full min-h-[44px] rounded-xl bg-slate-100 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 transition"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  );
};
