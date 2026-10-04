import { Contact } from '../types/contact';

/**
 * Sanitizes a value against CSV formula injection (CSV Injection / Formula Injection).
 * If a value starts with =, +, -, @, tab, or carriage return, prepend a single quote.
 */
export function sanitizeCsvField(value: string | undefined | null): string {
  if (value === undefined || value === null) return '';
  let str = String(value);

  // Strip formula trigger characters if placed at the start
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // RFC 4180 escaping: if quotes, commas, or newlines present, wrap in quotes and double quotes
  if (/[",\n\r;]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Generates an RFC 4180 compliant CSV string from contacts with UTF-8 BOM.
 */
export function exportContactsToCsv(contacts: Contact[]): string {
  const headers = [
    'Type',
    'Prénom',
    'Nom',
    'Société',
    'Fonction',
    'Téléphone Principal',
    'Libellé Téléphone 1',
    'Téléphone Secondaire',
    'Libellé Téléphone 2',
    'E-mail Principal',
    'Libellé E-mail 1',
    'E-mail Secondaire',
    'Libellé E-mail 2',
    'Adresse Rue',
    'Code Postal',
    'Ville',
    'Pays',
    'Site Web',
    'Catégories',
    'Notes',
    'Favori',
    'Date Création',
    'Dernière Modification',
  ];

  const rows = contacts.map((c) => {
    const p1 = c.phones[0] || { number: '', label: '' };
    const p2 = c.phones[1] || { number: '', label: '' };
    const e1 = c.emails[0] || { email: '', label: '' };
    const e2 = c.emails[1] || { email: '', label: '' };

    return [
      c.type === 'company' ? 'Société' : 'Personne',
      c.firstName,
      c.lastName,
      c.company,
      c.jobTitle,
      p1.number,
      p1.label,
      p2.number,
      p2.label,
      e1.email,
      e1.label,
      e2.email,
      e2.label,
      c.address.street,
      c.address.postalCode,
      c.address.city,
      c.address.country,
      c.website,
      c.categories.join('; '),
      c.notes,
      c.isFavorite ? 'Oui' : 'Non',
      c.createdAt,
      c.updatedAt,
    ].map(sanitizeCsvField).join(';'); // Semicolon is standard for European French Excel compatibility
  });

  // Prefix with UTF-8 BOM (\uFEFF) for immediate French accents recognition in Microsoft Excel
  return '\uFEFF' + [headers.map(sanitizeCsvField).join(';'), ...rows].join('\r\n');
}

/**
 * Generates a clean French sample CSV with multiple examples for import testing.
 */
export function generateSampleCsv(): string {
  const sampleContacts: Contact[] = [
    {
      id: 'sample-1',
      type: 'person',
      firstName: 'Camille',
      lastName: 'Laurent',
      company: 'Studio Graphique Lumière',
      jobTitle: 'Directrice Artistique',
      phones: [
        { id: '1', label: 'Mobile', number: '+33 6 98 76 54 32' },
        { id: '2', label: 'Travail', number: '+33 1 40 50 60 70' },
      ],
      emails: [
        { id: '1', label: 'Travail', email: 'camille@studiolumiere.fr' },
      ],
      address: {
        street: '15, boulevard Saint-Germain',
        postalCode: '75005',
        city: 'Paris',
        country: 'France',
      },
      website: 'https://studiolumiere.fr',
      categories: ['Design', 'Partenaire'],
      notes: 'Contact rencontré au salon du livre et du graphisme.',
      isFavorite: true,
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-01T10:00:00.000Z',
    },
    {
      id: 'sample-2',
      type: 'company',
      firstName: '',
      lastName: '',
      company: 'Boulangerie Artisanale du Moulin',
      jobTitle: '',
      phones: [
        { id: '1', label: 'Travail', number: '02 40 12 34 56' },
      ],
      emails: [
        { id: '1', label: 'Travail', email: 'contact@boulangerie-moulin.fr' },
      ],
      address: {
        street: '3, place Graslin',
        postalCode: '44000',
        city: 'Nantes',
        country: 'France',
      },
      website: '',
      categories: ['Commerce', 'Alimentation'],
      notes: 'Commandes de traiteur pour réceptions.',
      isFavorite: false,
      createdAt: '2026-03-02T11:00:00.000Z',
      updatedAt: '2026-03-02T11:00:00.000Z',
    },
  ];

  return exportContactsToCsv(sampleContacts);
}

/**
 * Robust RFC 4180 CSV parser supporting semicolons, commas, tabs, multiline cells, and UTF-8 BOM.
 */
export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  // Strip BOM if present
  let cleanText = text.replace(/^\uFEFF/, '');

  // Detect delimiter based on first line
  const firstLine = cleanText.split(/\r\n|\n|\r/)[0] || '';
  const semiCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  let delimiter = ';';
  if (commaCount > semiCount && commaCount > tabCount) delimiter = ',';
  if (tabCount > semiCount && tabCount > commaCount) delimiter = '\t';

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < cleanText.length) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i += 2;
          continue;
        } else {
          // Closing quote
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === delimiter) {
        currentRow.push(currentField.trim());
        currentField = '';
        i++;
        continue;
      } else if (char === '\r') {
        if (nextChar === '\n') i++; // Skip \r\n
        currentRow.push(currentField.trim());
        if (currentRow.some((f) => f.length > 0)) rows.push(currentRow);
        currentRow = [];
        currentField = '';
        i++;
        continue;
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        if (currentRow.some((f) => f.length > 0)) rows.push(currentRow);
        currentRow = [];
        currentField = '';
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  // Push last field & row if pending
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) rows.push(currentRow);
  }

  if (rows.length === 0) {
    return { headers: [], rows: [] };
  }

  const rawHeaders = rows[0];
  const dataRows = rows.slice(1);

  return { headers: rawHeaders, rows: dataRows };
}

/**
 * Standard French and English header synonym detection
 */
export function guessColumnMapping(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};

  const synonyms: Record<string, string[]> = {
    firstName: ['prenom', 'prénom', 'first name', 'firstname', 'given name'],
    lastName: ['nom', 'nom de famille', 'last name', 'lastname', 'surname', 'family name'],
    company: ['societe', 'société', 'entreprise', 'company', 'organization', 'organisation', 'raison sociale'],
    jobTitle: ['fonction', 'poste', 'titre', 'job', 'job title', 'role', 'profession'],
    phone1: ['telephone', 'téléphone', 'tel', 'phone', 'mobile', 'portable', 'téléphone principal'],
    phone2: ['telephone secondaire', 'téléphone 2', 'phone 2', 'fixe', 'domicile', 'bureau'],
    email1: ['email', 'e-mail', 'courriel', 'mail', 'e-mail principal'],
    email2: ['email 2', 'e-mail secondaire', 'courriel 2', 'mail 2'],
    street: ['rue', 'adresse', 'adresse rue', 'street', 'address'],
    postalCode: ['code postal', 'cp', 'postal code', 'zip', 'zipcode'],
    city: ['ville', 'city', 'commune'],
    country: ['pays', 'country'],
    website: ['site web', 'site', 'website', 'url'],
    categories: ['categories', 'catégories', 'categorie', 'catégorie', 'tags', 'etiquettes', 'étiquettes'],
    notes: ['notes', 'note', 'remarques', 'commentaires', 'comments'],
    type: ['type', 'type de contact'],
  };

  headers.forEach((h, index) => {
    const norm = h.toLowerCase().trim().replace(/['"_\-]/g, ' ');
    for (const [key, synList] of Object.entries(synonyms)) {
      if (mapping[key] === undefined && synList.some((s) => norm === s || norm.includes(s))) {
        mapping[key] = index;
        break;
      }
    }
  });

  return mapping;
}
