import React from 'react';
import { Contact } from '../types/contact';
import { Star, Users, Tag, HardDrive, Wifi, WifiOff, FileUp, Sparkles } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface SidebarProps {
  contacts: Contact[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  onOpenImportExport: () => void;
  onOpenCompatibility: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  contacts,
  selectedCategory,
  onSelectCategory,
  onOpenImportExport,
  onOpenCompatibility,
}) => {
  const isOnline = useOnlineStatus();

  // Dynamic category counts
  const totalCount = contacts.length;
  const favoritesCount = contacts.filter((c) => c.isFavorite).length;

  const categoryMap = new Map<string, number>();
  contacts.forEach((c) => {
    c.categories.forEach((cat) => {
      const clean = cat.trim();
      if (clean) {
        categoryMap.set(clean, (categoryMap.get(clean) || 0) + 1);
      }
    });
  });

  const categories = Array.from(categoryMap.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <aside className="w-64 shrink-0 flex flex-col justify-between p-4 bg-slate-50/70 dark:bg-slate-900/40 border-r border-slate-200 dark:border-slate-800/80 h-full overflow-y-auto">
      <div className="space-y-6">
        {/* Main Filters */}
        <div className="space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3">
            Navigation
          </span>
          <button
            onClick={() => onSelectCategory('all')}
            className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl transition-colors ${
              selectedCategory === 'all'
                ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4 text-sky-500" />
              <span>Tous les contacts</span>
            </div>
            <span className="text-[11px] font-mono tabular-nums text-slate-400 dark:text-slate-500">
              {totalCount}
            </span>
          </button>

          <button
            onClick={() => onSelectCategory('favorites')}
            className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl transition-colors ${
              selectedCategory === 'favorites'
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500/30" />
              <span>Favoris</span>
            </div>
            <span className="text-[11px] font-mono tabular-nums text-slate-400 dark:text-slate-500">
              {favoritesCount}
            </span>
          </button>
        </div>

        {/* Categories Section */}
        {categories.length > 0 && (
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3">
              Catégories & Groupes
            </span>
            <div className="space-y-0.5 max-h-56 overflow-y-auto pr-1">
              {categories.map(([cat, count]) => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => onSelectCategory(cat)}
                    className={`w-full min-h-[40px] flex items-center justify-between px-3 py-1.5 text-xs font-medium rounded-xl transition-colors ${
                      isActive
                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate pr-2">
                      <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{cat}</span>
                    </div>
                    <span className="text-[11px] font-mono tabular-nums text-slate-400 dark:text-slate-500 shrink-0">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Tools */}
        <div className="space-y-1 pt-2 border-t border-slate-200/80 dark:border-slate-800">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3">
            Outils & Données
          </span>
          <button
            onClick={onOpenImportExport}
            className="w-full min-h-[40px] flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition"
          >
            <FileUp className="w-4 h-4 text-emerald-500" />
            <span>Sauvegarder / Restaurer</span>
          </button>

          <button
            onClick={onOpenCompatibility}
            className="w-full min-h-[40px] flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition"
          >
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span>Matrice de Compatibilité</span>
          </button>
        </div>
      </div>

      {/* Local Storage & Connectivity Notice */}
      <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 text-[11px] space-y-3">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            {isOnline ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-amber-500" />
            )}
            <span>{isOnline ? 'En ligne' : 'Mode hors-ligne'}</span>
          </div>
          <div className="flex items-center gap-1">
            <HardDrive className="w-3.5 h-3.5 text-sky-500" />
            <span>IndexedDB</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
          <p className="font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
            Stockage local sur cet appareil
          </p>
          Les contacts sont enregistrés dans ce navigateur. Ils ne sont pas automatiquement synchronisés avec vos autres appareils. Exportez régulièrement une sauvegarde.
        </div>
      </div>
    </aside>
  );
};
