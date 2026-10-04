import { Contact } from '../types/contact';

/**
 * Serializes a Contact to vCard 3.0 format.
 */
export function contactToVCard(c: Contact): string {
  const lines: string[] = ['BEGIN:VCARD', 'VERSION:3.0'];

  const displayName =
    c.type === 'company'
      ? c.company || 'Société sans nom'
      : `${c.firstName} ${c.lastName}`.trim() || c.company || 'Sans nom';

  lines.push(`FN;CHARSET=UTF-8:${displayName}`);
  lines.push(`N;CHARSET=UTF-8:${c.lastName || ''};${c.firstName || ''};;;`);

  if (c.company) {
    lines.push(`ORG;CHARSET=UTF-8:${c.company}`);
  }

  if (c.jobTitle) {
    lines.push(`TITLE;CHARSET=UTF-8:${c.jobTitle}`);
  }

  c.phones.forEach((p) => {
    let type = 'VOICE';
    const norm = p.label.toLowerCase();
    if (norm.includes('cell') || norm.includes('mob')) type = 'CELL,VOICE';
    else if (norm.includes('trav') || norm.includes('work') || norm.includes('bur')) type = 'WORK,VOICE';
    else if (norm.includes('dom') || norm.includes('home')) type = 'HOME,VOICE';
    lines.push(`TEL;TYPE=${type}:${p.number}`);
  });

  c.emails.forEach((e) => {
    let type = 'INTERNET';
    const norm = e.label.toLowerCase();
    if (norm.includes('trav') || norm.includes('work')) type = 'WORK,INTERNET';
    else if (norm.includes('pers') || norm.includes('home')) type = 'HOME,INTERNET';
    lines.push(`EMAIL;TYPE=${type}:${e.email}`);
  });

  const { street, city, postalCode, country } = c.address;
  if (street || city || postalCode || country) {
    // Format: PO Box; Extended Addr; Street; Locality; Region; Postal Code; Country
    lines.push(`ADR;TYPE=HOME;CHARSET=UTF-8:;;${street || ''};${city || ''};;${postalCode || ''};${country || ''}`);
  }

  if (c.website) {
    lines.push(`URL:${c.website}`);
  }

  if (c.categories && c.categories.length > 0) {
    lines.push(`CATEGORIES:${c.categories.join(',')}`);
  }

  if (c.notes) {
    // Escape newlines in notes
    const escapedNotes = c.notes.replace(/\r\n|\r|\n/g, '\\n');
    lines.push(`NOTE;CHARSET=UTF-8:${escapedNotes}`);
  }

  lines.push('END:VCARD');
  return lines.join('\r\n');
}

/**
 * Serializes multiple contacts into a single .vcf collection
 */
export function exportContactsToVCard(contacts: Contact[]): string {
  return contacts.map(contactToVCard).join('\r\n\r\n');
}

/**
 * Parses raw vCard string into Contact objects.
 */
export function parseVCard(vcardText: string): Partial<Contact>[] {
  const contacts: Partial<Contact>[] = [];
  const cards = vcardText.split(/BEGIN:VCARD/i).filter((s) => s.trim().length > 0);

  for (const card of cards) {
    const lines = card.split(/\r\n|\n|\r/);
    const parsed: Partial<Contact> = {
      type: 'person',
      firstName: '',
      lastName: '',
      company: '',
      jobTitle: '',
      phones: [],
      emails: [],
      address: { street: '', city: '', postalCode: '', country: '' },
      website: '',
      categories: [],
      notes: '',
      isFavorite: false,
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('VERSION:') || line.startsWith('END:VCARD')) continue;

      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;

      const rawKey = line.substring(0, colonIdx);
      const val = line.substring(colonIdx + 1).trim();
      const keyUpper = rawKey.toUpperCase();

      if (keyUpper.startsWith('N;') || keyUpper === 'N') {
        const parts = val.split(';');
        parsed.lastName = parts[0] || '';
        parsed.firstName = parts[1] || '';
      } else if (keyUpper.startsWith('FN;') || keyUpper === 'FN') {
        if (!parsed.firstName && !parsed.lastName) {
          const names = val.split(' ');
          parsed.firstName = names[0] || '';
          parsed.lastName = names.slice(1).join(' ') || '';
        }
      } else if (keyUpper.startsWith('ORG;') || keyUpper === 'ORG') {
        parsed.company = val.split(';')[0] || '';
      } else if (keyUpper.startsWith('TITLE;') || keyUpper === 'TITLE') {
        parsed.jobTitle = val;
      } else if (keyUpper.startsWith('TEL')) {
        let label = 'Mobile';
        if (keyUpper.includes('WORK')) label = 'Travail';
        else if (keyUpper.includes('HOME')) label = 'Domicile';
        parsed.phones?.push({
          id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          label,
          number: val,
        });
      } else if (keyUpper.startsWith('EMAIL')) {
        let label = 'Personnel';
        if (keyUpper.includes('WORK')) label = 'Travail';
        parsed.emails?.push({
          id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          label,
          email: val,
        });
      } else if (keyUpper.startsWith('ADR')) {
        const adrParts = val.split(';');
        parsed.address = {
          street: adrParts[2] || '',
          city: adrParts[3] || '',
          postalCode: adrParts[5] || '',
          country: adrParts[6] || '',
        };
      } else if (keyUpper.startsWith('URL')) {
        parsed.website = val;
      } else if (keyUpper.startsWith('CATEGORIES')) {
        parsed.categories = val.split(',').map((s) => s.trim()).filter(Boolean);
      } else if (keyUpper.startsWith('NOTE')) {
        parsed.notes = val.replace(/\\n/g, '\n');
      }
    }

    if (parsed.company && !parsed.firstName && !parsed.lastName) {
      parsed.type = 'company';
    }

    // Only add if at least firstName, lastName, or company exists
    if (parsed.firstName || parsed.lastName || parsed.company) {
      contacts.push(parsed);
    }
  }

  return contacts;
}
