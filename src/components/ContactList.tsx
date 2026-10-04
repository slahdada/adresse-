import React, { useMemo, useState } from 'react';
import { Contact, SortField } from '../types/contact';
import { ContactCard } from './ContactCard';
import {
  Search,
  X,
  ArrowUpDown,
  FilterX,
  Users,
  Star,
  BarChart3,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { normalizeText } from '../services/duplicate';

interface ContactListProps {
  contacts: Contact[];
  selectedContactId: string | null;
  onSelectContact: (contact: Contact) => void;
  onToggleFavorite: (contactId: string, e: React.MouseEvent) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  sortBy: SortField;
  setSortBy: (sort: SortField) => void;
  onNewContact: () => void;
}

export const ContactList: React.FC<ContactListProps> = ({
  contacts,
  selectedContactId,
  onSelectContact,
  onToggleFavorite,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  sortBy,
  setSortBy,
  onNewContact,
}) => {
  const [isDashboardExpanded, setIsDashboardExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return false;
  });

  const totalContactsCount = contacts.length;
  const favoritesCount = useMemo(
    () => contacts.filter((c) => c.isFavorite).length,
    [contacts]
  );

  // Filter and sort contacts
  const filteredAndSortedContacts = useMemo(() => {
    let result = [...contacts];

    // 1. Category Filter
    if (selectedCategory === 'favorites') {
      result = result.filter((c) => c.isFavorite);
    } else if (selectedCategory !== 'all') {
      result = result.filter((c) => c.categories.includes(selectedCategory));
    }

    // 2. Search Query (Case & accent insensitive across name, company, phone, email, notes)
    if (searchQuery.trim()) {
      const q = normalizeText(searchQuery);
      result = result.filter((c) => {
        const first = normalizeText(c.firstName);
        const last = normalizeText(c.lastName);
        const comp = normalizeText(c.company);
        const job = normalizeText(c.jobTitle);
        const notes = normalizeText(c.notes);
        const phones = c.phones.map((p) => p.number.replace(/\s+/g, '')).join(' ');
        const emails = c.emails.map((e) => e.email.toLowerCase()).join(' ');

        return (
          first.includes(q) ||
          last.includes(q) ||
          `${first} ${last}`.includes(q) ||
          `${last} ${first}`.includes(q) ||
          comp.includes(q) ||
          job.includes(q) ||
          notes.includes(q) ||
          phones.includes(q.replace(/\s+/g, '')) ||
          emails.includes(q)
        );
      });
    }

    // 3. Sorting
    result.sort((a, b) => {
      if (sortBy === 'nameAsc' || sortBy === 'nameDesc') {
        const nameA = (a.type === 'company' ? a.company : `${a.lastName} ${a.firstName}`).trim().toLowerCase();
        const nameB = (b.type === 'company' ? b.company : `${b.lastName} ${b.firstName}`).trim().toLowerCase();
        const cmp = nameA.localeCompare(nameB, 'fr', { sensitivity: 'base' });
        return sortBy === 'nameAsc' ? cmp : -cmp;
      }
      if (sortBy === 'firstNameAsc') {
        const nameA = (a.type === 'company' ? a.company : `${a.firstName} ${a.lastName}`).trim().toLowerCase();
        const nameB = (b.type === 'company' ? b.company : `${b.firstName} ${b.lastName}`).trim().toLowerCase();
        return nameA.localeCompare(nameB, 'fr', { sensitivity: 'base' });
      }
      if (sortBy === 'updatedDesc') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      if (sortBy === 'updatedAsc') {
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
      if (sortBy === 'createdDesc') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return 0;
    });

    return result;
  }, [contacts, searchQuery, selectedCategory, sortBy]);

  // Group contacts by initial letter if sorted by name
  const groupedContacts = useMemo(() => {
    if (sortBy !== 'nameAsc' && sortBy !== 'firstNameAsc') {
      return null;
    }

    const groups: { letter: string; list: Contact[] }[] = [];
    filteredAndSortedContacts.forEach((contact) => {
      let char = '#';
      const name =
        sortBy === 'nameAsc'
          ? (contact.lastName || contact.company || contact.firstName || '').trim()
          : (contact.firstName || contact.lastName || contact.company || '').trim();

      if (name.length > 0) {
        const firstChar = name[0].toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (/[A-Z]/.test(firstChar)) {
          char = firstChar;
        }
      }

      let currentGroup = groups.find((g) => g.letter === char);
      if (!currentGroup) {
        currentGroup = { letter: char, list: [] };
        groups.push(currentGroup);
      }
      currentGroup.list.push(contact);
    });

    return groups;
  }, [filteredAndSortedContacts, sortBy]);

  const hasActiveFilters = searchQuery.trim() !== '' || selectedCategory !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50">
      {/* Header controls: Search & Sort */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md space-y-3 shrink-0">
        {/* Search input with >= 44px hitbox */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom, téléphone, e-mail..."
            aria-label="Rechercher un contact"
            className="w-full min-h-[44px] pl-10 pr-10 py-2 text-sm rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              aria-label="Effacer la recherche"
              className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Counter & Sorting row */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium">
            <span className="font-semibold text-slate-900 dark:text-slate-200 font-mono tabular-nums">
              {filteredAndSortedContacts.length}
            </span>{' '}
            {filteredAndSortedContacts.length <= 1 ? 'contact trouvé' : 'contacts trouvés'}{' '}
            {contacts.length !== filteredAndSortedContacts.length && (
              <span className="text-slate-400">
                (sur <span className="font-mono tabular-nums">{contacts.length}</span>)
              </span>
            )}
          </span>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortField)}
              aria-label="Trier les contacts"
              className="bg-transparent text-xs font-medium text-slate-700 dark:text-slate-300 py-1 pl-1 pr-6 border-none focus:ring-2 focus:ring-sky-500 rounded-lg cursor-pointer"
            >
              <option value="nameAsc" className="dark:bg-slate-900">Nom (A → Z)</option>
              <option value="nameDesc" className="dark:bg-slate-900">Nom (Z → A)</option>
              <option value="firstNameAsc" className="dark:bg-slate-900">Prénom (A → Z)</option>
              <option value="updatedDesc" className="dark:bg-slate-900">Récemment modifiés</option>
              <option value="updatedAsc" className="dark:bg-slate-900">Plus anciens modifiés</option>
              <option value="createdDesc" className="dark:bg-slate-900">Date de création</option>
            </select>
          </div>
        </div>

        {/* --- TABLEAU DE BORD RAPIDE (QUICK DASHBOARD) --- */}
        <section
          aria-label="Tableau de bord rapide des contacts"
          className="pt-1 border-t border-slate-100 dark:border-slate-800/80"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <BarChart3 className="w-3.5 h-3.5 text-sky-500" />
              <span>Tableau de bord rapide</span>
            </div>
            <button
              type="button"
              onClick={() => setIsDashboardExpanded((prev) => !prev)}
              aria-expanded={isDashboardExpanded}
              aria-label={isDashboardExpanded ? 'Réduire le tableau de bord' : 'Agrandir le tableau de bord'}
              className="text-[11px] font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 p-1 -mr-1 rounded-md"
            >
              <span>{isDashboardExpanded ? 'Masquer' : 'Afficher'}</span>
              {isDashboardExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {!isDashboardExpanded && (
            <div className="flex items-center gap-2 pb-1 text-xs">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                  selectedCategory === 'all'
                    ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-300 dark:border-sky-800'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Users className="w-3 h-3 text-sky-500" />
                <span>{totalContactsCount} contacts</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCategory('favorites')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                  selectedCategory === 'favorites'
                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Star className="w-3 h-3 text-amber-500 fill-amber-500/30" />
                <span>{favoritesCount} favoris</span>
              </button>
            </div>
          )}

          {isDashboardExpanded && (
            <div className="space-y-2.5 animate-in fade-in duration-150">
              {/* Top Metrics Cards Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Total Contacts Metric Card */}
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between min-h-[48px] ${
                    selectedCategory === 'all'
                      ? 'bg-sky-50/90 dark:bg-sky-950/40 border-sky-400 dark:border-sky-600 shadow-2xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                        Total
                      </div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">
                        Contacts
                      </div>
                    </div>
                  </div>
                  <span className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                    {totalContactsCount}
                  </span>
                </button>

                {/* Favorites Metric Card */}
                <button
                  type="button"
                  onClick={() => setSelectedCategory('favorites')}
                  className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between min-h-[48px] ${
                    selectedCategory === 'favorites'
                      ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600 shadow-2xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Star className="w-3.5 h-3.5 fill-amber-500/30" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                        Favoris
                      </div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">
                        Prioritaires
                      </div>
                    </div>
                  </div>
                  <span className="text-base font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
                    {favoritesCount}
                  </span>
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Contact Cards List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredAndSortedContacts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500 dark:text-slate-400 space-y-3 my-auto">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">
                Aucun contact ne correspond à votre recherche
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                {hasActiveFilters
                  ? 'Essayez de modifier votre mot-clé de recherche ou de réinitialiser vos filtres.'
                  : 'Votre carnet d’adresses est actuellement vide.'}
              </p>
            </div>
            {hasActiveFilters ? (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition"
              >
                <FilterX className="w-3.5 h-3.5" />
                Réinitialiser les filtres
              </button>
            ) : (
              <button
                onClick={onNewContact}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-sky-600 text-white hover:bg-sky-700 transition"
              >
                Créer un premier contact
              </button>
            )}
          </div>
        ) : groupedContacts ? (
          /* Alphabetical Grouping */
          groupedContacts.map((group) => (
            <div key={group.letter} className="space-y-1.5 pt-2 first:pt-0">
              <div className="sticky top-0 z-10 px-2 py-0.5 text-xs font-bold text-sky-600 dark:text-sky-400 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-xs">
                {group.letter}
              </div>
              {group.list.map((contact) => (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  isSelected={contact.id === selectedContactId}
                  onSelect={() => onSelectContact(contact)}
                  onToggleFavorite={(e) => onToggleFavorite(contact.id, e)}
                />
              ))}
            </div>
          ))
        ) : (
          /* Flat list for chronological sorts */
          filteredAndSortedContacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              isSelected={contact.id === selectedContactId}
              onSelect={() => onSelectContact(contact)}
              onToggleFavorite={(e) => onToggleFavorite(contact.id, e)}
            />
          ))
        )}
      </div>
    </div>
  );
};
