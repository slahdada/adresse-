import { Contact } from '../types/contact';

/**
 * Decodes Quoted-Printable encoded strings with full UTF-8 support
 * Handles RFC 2045 encoding (e.g. =C3=A9 -> é)
 */
function decodeQuotedPrintableUtf8(str: string): string {
  // Strip soft line breaks
  const cleaned = str.replace(/=[\r\n]+/g, '');
  try {
    const bytes: number[] = [];
    for (let i = 0; i < cleaned.length; i++) {
      if (
        cleaned[i] === '=' &&
        i + 2 < cleaned.length &&
        /[0-9A-Fa-f]{2}/.test(cleaned.substring(i + 1, i + 3))
      ) {
        bytes.push(parseInt(cleaned.substring(i + 1, i + 3), 16));
        i += 2;
      } else {
        bytes.push(cleaned.charCodeAt(i));
      }
    }
    return new TextDecoder('utf-8').decode(new Uint8Array(bytes));
  } catch {
    return str;
  }
}

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
    const escapedNotes = c.notes.replace(/\r\n|\r|\n/g, '\\n');
    lines.push(`NOTE;CHARSET=UTF-8:${escapedNotes}`);
  }

  if (c.avatar && c.avatar.startsWith('data:image/')) {
    const commaIdx = c.avatar.indexOf(',');
    if (commaIdx !== -1) {
      const base64Data = c.avatar.substring(commaIdx + 1);
      lines.push(`PHOTO;ENCODING=b;TYPE=JPEG:${base64Data}`);
    }
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
 * Supports RFC 2426 (3.0), RFC 6350 (4.0), line unfolding, Quoted-Printable, and photos.
 */
export function parseVCard(vcardText: string): Partial<Contact>[] {
  const contacts: Partial<Contact>[] = [];

  // Step 1: Unfold lines (RFC line folding: newline followed by a space or tab)
  const unfoldedText = vcardText
    .replace(/\r\n[ \t]/g, '')
    .replace(/\n[ \t]/g, '')
    .replace(/\r[ \t]/g, '');

  const cards = unfoldedText.split(/BEGIN:VCARD/i).filter((s) => s.trim().length > 0);

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
      avatar: '',
      isFavorite: false,
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('VERSION:') || line.startsWith('END:VCARD')) continue;

      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;

      const rawKey = line.substring(0, colonIdx);
      let val = line.substring(colonIdx + 1).trim();
      const keyUpper = rawKey.toUpperCase();

      // Check if Quoted-Printable encoded (header or detected byte sequence)
      if (
        keyUpper.includes('ENCODING=QUOTED-PRINTABLE') ||
        keyUpper.includes('QUOTED-PRINTABLE') ||
        /=([0-9A-Fa-f]{2})/.test(val)
      ) {
        val = decodeQuotedPrintableUtf8(val);
      }

      if (keyUpper.startsWith('N;') || keyUpper === 'N') {
        const parts = val.split(';');
        parsed.lastName = parts[0]?.trim() || '';
        parsed.firstName = parts[1]?.trim() || '';
      } else if (keyUpper.startsWith('FN;') || keyUpper === 'FN') {
        if (!parsed.firstName && !parsed.lastName) {
          const names = val.split(' ');
          parsed.firstName = names[0]?.trim() || '';
          parsed.lastName = names.slice(1).join(' ')?.trim() || '';
        }
      } else if (keyUpper.startsWith('ORG;') || keyUpper === 'ORG') {
        parsed.company = val.split(';')[0]?.trim() || '';
      } else if (keyUpper.startsWith('TITLE;') || keyUpper === 'TITLE') {
        parsed.jobTitle = val.trim();
      } else if (keyUpper.startsWith('TEL')) {
        let label = 'Mobile';
        if (keyUpper.includes('WORK') || keyUpper.includes('BUR')) label = 'Travail';
        else if (keyUpper.includes('HOME') || keyUpper.includes('DOM')) label = 'Domicile';

        // Clean out possible tel: URI prefix from vCard 4.0
        let cleanNumber = val.trim();
        if (cleanNumber.toLowerCase().startsWith('tel:')) {
          cleanNumber = cleanNumber.substring(4);
        }

        if (cleanNumber) {
          parsed.phones?.push({
            id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            label,
            number: cleanNumber,
          });
        }
      } else if (keyUpper.startsWith('EMAIL')) {
        let label = 'Personnel';
        if (keyUpper.includes('WORK') || keyUpper.includes('BUR')) label = 'Travail';
        else if (keyUpper.includes('HOME') || keyUpper.includes('DOM')) label = 'Domicile';

        let cleanEmail = val.trim();
        if (cleanEmail.toLowerCase().startsWith('mailto:')) {
          cleanEmail = cleanEmail.substring(7);
        }

        if (cleanEmail) {
          parsed.emails?.push({
            id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            label,
            email: cleanEmail,
          });
        }
      } else if (keyUpper.startsWith('ADR')) {
        const adrParts = val.split(';');
        parsed.address = {
          street: adrParts[2]?.trim() || '',
          city: adrParts[3]?.trim() || '',
          postalCode: adrParts[5]?.trim() || '',
          country: adrParts[6]?.trim() || '',
        };
      } else if (keyUpper.startsWith('URL')) {
        parsed.website = val.trim();
      } else if (keyUpper.startsWith('CATEGORIES')) {
        parsed.categories = val
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      } else if (keyUpper.startsWith('NOTE')) {
        parsed.notes = val.replace(/\\n/g, '\n');
      } else if (keyUpper.startsWith('PHOTO')) {
        if (val.startsWith('data:image/')) {
          parsed.avatar = val;
        } else if (val.length > 20) {
          // Base64 encoded image string
          const cleanB64 = val.replace(/\s+/g, '');
          parsed.avatar = `data:image/jpeg;base64,${cleanB64}`;
        }
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
