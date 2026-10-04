import React from 'react';
import { Contact } from '../types/contact';
import { Star, Building2, User } from 'lucide-react';

interface ContactCardProps {
  contact: Contact;
  isSelected: boolean;
  onSelect: () => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
}

// Generate consistent background color based on name string
function getAvatarGradient(name: string): string {
  const gradients = [
    'from-sky-500 to-blue-600',
    'from-indigo-500 to-purple-600',
    'from-emerald-500 to-teal-600',
    'from-rose-500 to-pink-600',
    'from-amber-500 to-orange-600',
    'from-cyan-500 to-sky-600',
  ];
  let sum = 0;
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i);
  }
  return gradients[sum % gradients.length];
}

export const ContactCard: React.FC<ContactCardProps> = ({
  contact,
  isSelected,
  onSelect,
  onToggleFavorite,
}) => {
  const isCompany = contact.type === 'company';
  const displayName = isCompany
    ? contact.company || 'Entreprise sans nom'
    : `${contact.firstName} ${contact.lastName}`.trim() || contact.company || 'Sans nom';

  // Compute 2-letter initials
  let initials = '??';
  if (isCompany && contact.company) {
    initials = contact.company.substring(0, 2).toUpperCase();
  } else if (contact.firstName || contact.lastName) {
    const f = contact.firstName ? contact.firstName[0].toUpperCase() : '';
    const l = contact.lastName ? contact.lastName[0].toUpperCase() : '';
    initials = `${f}${l}` || f || l || '??';
  }

  const primaryPhone = contact.phones[0]?.number;
  const primaryEmail = contact.emails[0]?.email;
  const subtitle = isCompany
    ? contact.jobTitle || primaryPhone || primaryEmail
    : contact.company || contact.jobTitle || primaryPhone || primaryEmail;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`group relative flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition-all border outline-hidden ${
        isSelected
          ? 'bg-sky-50/80 dark:bg-sky-950/40 border-sky-400 dark:border-sky-600 shadow-xs'
          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 pr-2">
        {/* Avatar or Initials */}
        <div className="relative shrink-0">
          {contact.avatar ? (
            <img
              src={contact.avatar}
              alt={displayName}
              referrerPolicy="no-referrer"
              className="w-11 h-11 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
            />
          ) : (
            <div
              className={`w-11 h-11 rounded-xl bg-gradient-to-br ${getAvatarGradient(
                displayName
              )} flex items-center justify-center text-white font-semibold text-sm shadow-xs`}
            >
              {initials}
            </div>
          )}
          {isCompany && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center text-[9px] ring-2 ring-white dark:ring-slate-900">
              <Building2 className="w-2.5 h-2.5" />
            </div>
          )}
        </div>

        {/* Text details */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
              {displayName}
            </h4>
          </div>

          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {subtitle}
            </p>
          )}

          {/* Unboxed Metadata (Zero-Pill Discipline) */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
            {contact.categories[0] && <span>{contact.categories[0]}</span>}
            {contact.categories[0] && contact.address.city && <span aria-hidden="true">·</span>}
            {contact.address.city && <span>{contact.address.city}</span>}
          </div>
        </div>
      </div>

      {/* Favorite button with >= 44x44px hitbox */}
      <button
        type="button"
        onClick={onToggleFavorite}
        aria-label={contact.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-300 dark:text-slate-600 hover:text-amber-500 dark:hover:text-amber-400 focus-visible:ring-2 focus-visible:ring-sky-500 transition shrink-0"
      >
        <Star
          className={`w-4 h-4 transition-transform ${
            contact.isFavorite
              ? 'fill-amber-400 text-amber-400 scale-110'
              : 'group-hover:text-slate-400'
          }`}
        />
      </button>
    </div>
  );
};
