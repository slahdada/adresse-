import { Contact, DuplicateMatch } from '../types/contact';

// Normalize string for accent-insensitive and case-insensitive comparison
export function normalizeText(text: string | undefined | null): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

// Normalize phone: preserve leading + and digits only
export function normalizePhone(phone: string | undefined | null): string {
  if (!phone) return '';
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith('+');
  const digitsOnly = trimmed.replace(/\D/g, '');
  return hasPlus ? `+${digitsOnly}` : digitsOnly;
}

// Normalize email: trim and lowercase
export function normalizeEmail(email: string | undefined | null): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

/**
 * Searches an existing list of contacts for potential duplicate matches
 */
export function findDuplicates(
  target: Partial<Contact>,
  existingContacts: Contact[],
  ignoreId?: string
): DuplicateMatch[] {
  const matches: DuplicateMatch[] = [];

  const targetFirst = normalizeText(target.firstName);
  const targetLast = normalizeText(target.lastName);
  const targetCompany = normalizeText(target.company);

  const targetPhones = (target.phones || [])
    .map((p) => normalizePhone(p.number))
    .filter((n) => n.length >= 6);

  const targetEmails = (target.emails || [])
    .map((e) => normalizeEmail(e.email))
    .filter((e) => e.length > 3);

  for (const contact of existingContacts) {
    if (ignoreId && contact.id === ignoreId) continue;

    const reasons: string[] = [];

    // 1. Phone number match
    const contactPhones = (contact.phones || [])
      .map((p) => normalizePhone(p.number))
      .filter((n) => n.length >= 6);

    const commonPhone = targetPhones.find((tp) =>
      contactPhones.some((cp) => cp === tp || (tp.length >= 9 && cp.endsWith(tp.slice(-9))))
    );
    if (commonPhone) {
      reasons.push(`Même numéro de téléphone (${commonPhone})`);
    }

    // 2. Email address match
    const contactEmails = (contact.emails || [])
      .map((e) => normalizeEmail(e.email))
      .filter((e) => e.length > 3);

    const commonEmail = targetEmails.find((te) => contactEmails.includes(te));
    if (commonEmail) {
      reasons.push(`Même adresse e-mail (${commonEmail})`);
    }

    // 3. Name match
    const contactFirst = normalizeText(contact.firstName);
    const contactLast = normalizeText(contact.lastName);
    const contactCompany = normalizeText(contact.company);

    if (target.type === 'company' || contact.type === 'company') {
      if (targetCompany && contactCompany && targetCompany === contactCompany) {
        reasons.push(`Même raison sociale (${contact.company})`);
      }
    } else {
      if (
        targetLast &&
        contactLast &&
        targetLast === contactLast &&
        targetFirst &&
        contactFirst &&
        targetFirst === contactFirst
      ) {
        reasons.push(`Nom et prénom identiques (${contact.firstName} ${contact.lastName})`);
      }
    }

    if (reasons.length > 0) {
      matches.push({
        existingContact: contact,
        reasons,
      });
    }
  }

  return matches;
}

/**
 * Merges missing non-empty fields from incoming contact into existing contact
 * without destructively overwriting existing information.
 */
export function mergeContactFields(existing: Contact, incoming: Partial<Contact>): Contact {
  const merged: Contact = { ...existing };

  if (!merged.firstName && incoming.firstName) merged.firstName = incoming.firstName;
  if (!merged.lastName && incoming.lastName) merged.lastName = incoming.lastName;
  if (!merged.company && incoming.company) merged.company = incoming.company;
  if (!merged.jobTitle && incoming.jobTitle) merged.jobTitle = incoming.jobTitle;
  if (!merged.website && incoming.website) merged.website = incoming.website;
  if (!merged.avatar && incoming.avatar) merged.avatar = incoming.avatar;

  // Merge addresses
  merged.address = {
    street: existing.address.street || incoming.address?.street || '',
    postalCode: existing.address.postalCode || incoming.address?.postalCode || '',
    city: existing.address.city || incoming.address?.city || '',
    country: existing.address.country || incoming.address?.country || '',
  };

  // Merge phones without duplicates
  const existingNumbers = new Set(existing.phones.map((p) => normalizePhone(p.number)));
  const newPhones = [...existing.phones];
  (incoming.phones || []).forEach((p) => {
    const norm = normalizePhone(p.number);
    if (norm && !existingNumbers.has(norm)) {
      newPhones.push({
        id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        label: p.label || 'Autre',
        number: p.number,
      });
      existingNumbers.add(norm);
    }
  });
  merged.phones = newPhones;

  // Merge emails without duplicates
  const existingEmails = new Set(existing.emails.map((e) => normalizeEmail(e.email)));
  const newEmails = [...existing.emails];
  (incoming.emails || []).forEach((e) => {
    const norm = normalizeEmail(e.email);
    if (norm && !existingEmails.has(norm)) {
      newEmails.push({
        id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        label: e.label || 'Autre',
        email: e.email,
      });
      existingEmails.add(norm);
    }
  });
  merged.emails = newEmails;

  // Merge categories
  const categoriesSet = new Set([...existing.categories, ...(incoming.categories || [])]);
  merged.categories = Array.from(categoriesSet);

  // Append notes if incoming has extra notes
  if (incoming.notes && incoming.notes.trim()) {
    if (!existing.notes) {
      merged.notes = incoming.notes;
    } else if (!existing.notes.includes(incoming.notes.trim())) {
      merged.notes = `${existing.notes}\n\n[Mise à jour import] ${incoming.notes}`;
    }
  }

  // Merge voice notes without duplicate audio/ids
  const existingAudio = new Set((existing.voiceNotes || []).map((vn) => vn.audioBase64 || vn.id));
  const newVoiceNotes = [...(existing.voiceNotes || [])];
  (incoming.voiceNotes || []).forEach((vn) => {
    const key = vn.audioBase64 || vn.id;
    if (key && !existingAudio.has(key)) {
      newVoiceNotes.push(vn);
      existingAudio.add(key);
    }
  });
  merged.voiceNotes = newVoiceNotes;

  merged.updatedAt = new Date().toISOString();
  return merged;
}

export interface DuplicateGroup {
  id: string;
  criterion: 'phone' | 'name' | 'both';
  label: string;
  matchedValue: string;
  contactIds: string[];
  contacts: Contact[];
}

/**
 * Scans all contacts and identifies duplicate clusters based on:
 * 1. Exactly identical phone number
 * 2. Exactly identical name (or company name)
 */
export function findDuplicateGroups(contacts: Contact[]): DuplicateGroup[] {
  const phoneToContacts = new Map<string, { display: string; contacts: Contact[] }>();
  const nameToContacts = new Map<string, { display: string; contacts: Contact[] }>();

  for (const c of contacts) {
    // 1. Phone numbers
    for (const p of c.phones) {
      const normPhone = normalizePhone(p.number);
      if (normPhone.length >= 6) {
        if (!phoneToContacts.has(normPhone)) {
          phoneToContacts.set(normPhone, { display: p.number, contacts: [] });
        }
        const entry = phoneToContacts.get(normPhone)!;
        if (!entry.contacts.some((existing) => existing.id === c.id)) {
          entry.contacts.push(c);
        }
      }
    }

    // 2. Names (individual or company)
    const normName =
      c.type === 'company'
        ? normalizeText(c.company)
        : `${normalizeText(c.firstName)} ${normalizeText(c.lastName)}`.trim();

    if (normName.length > 0) {
      if (!nameToContacts.has(normName)) {
        const display = c.type === 'company' ? c.company : `${c.firstName} ${c.lastName}`.trim();
        nameToContacts.set(normName, { display: display || 'Sans nom', contacts: [] });
      }
      const entry = nameToContacts.get(normName)!;
      if (!entry.contacts.some((existing) => existing.id === c.id)) {
        entry.contacts.push(c);
      }
    }
  }

  const groups: DuplicateGroup[] = [];

  // Group by identical phone
  for (const [normPhone, { display, contacts: groupContacts }] of phoneToContacts.entries()) {
    if (groupContacts.length >= 2) {
      groups.push({
        id: `dup-phone-${normPhone}`,
        criterion: 'phone',
        label: `Même numéro de téléphone : ${display}`,
        matchedValue: display,
        contactIds: groupContacts.map((c) => c.id),
        contacts: groupContacts,
      });
    }
  }

  // Group by identical name
  for (const [normName, { display, contacts: groupContacts }] of nameToContacts.entries()) {
    if (groupContacts.length >= 2) {
      const pairKey = groupContacts.map((c) => c.id).sort().join('::');
      const existingGroup = groups.find((g) => g.contactIds.slice().sort().join('::') === pairKey);
      if (existingGroup) {
        existingGroup.criterion = 'both';
        existingGroup.label = `Même numéro (${existingGroup.matchedValue}) et même nom (${display})`;
      } else {
        groups.push({
          id: `dup-name-${normName.replace(/[^a-zA-Z0-9]/g, '_')}`,
          criterion: 'name',
          label: `Même nom : ${display}`,
          matchedValue: display,
          contactIds: groupContacts.map((c) => c.id),
          contacts: groupContacts,
        });
      }
    }
  }

  return groups;
}

/**
 * Combines multiple contacts into a single clean contact record
 * and returns the merged contact plus the list of IDs that can be removed.
 */
export function mergeMultipleContacts(
  contacts: Contact[],
  primaryId?: string
): { merged: Contact; removedIds: string[] } {
  if (contacts.length === 0) {
    throw new Error('Aucun contact à fusionner');
  }

  const primary = contacts.find((c) => c.id === primaryId) || contacts[0];
  const others = contacts.filter((c) => c.id !== primary.id);

  let mergedResult: Contact = { ...primary };
  for (const other of others) {
    mergedResult = mergeContactFields(mergedResult, other);
  }

  return {
    merged: mergedResult,
    removedIds: others.map((o) => o.id),
  };
}

