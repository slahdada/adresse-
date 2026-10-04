/**
 * Types and interfaces for the Multi-Device Address Book (Carnet d'Adresses)
 */

export type ContactType = 'person' | 'company';

export interface PhoneEntry {
  id: string;
  label: 'Mobile' | 'Domicile' | 'Travail' | 'Autre' | string;
  number: string;
}

export interface EmailEntry {
  id: string;
  label: 'Personnel' | 'Travail' | 'Autre' | string;
  email: string;
}

export interface AddressInfo {
  street: string;
  postalCode: string;
  city: string;
  country: string;
}

export interface VoiceNote {
  id: string;
  title: string;
  audioBase64: string; // Data URL: "data:audio/...;base64,..."
  durationSeconds: number;
  createdAt: string; // ISO string
  mimeType: string;
  fileSize?: number;
}

export interface Contact {
  id: string;
  type: ContactType;
  firstName: string;
  lastName: string;
  company: string;
  jobTitle: string;
  phones: PhoneEntry[];
  emails: EmailEntry[];
  address: AddressInfo;
  website: string;
  categories: string[];
  notes: string;
  avatar?: string; // Data URL or empty
  isFavorite: boolean;
  voiceNotes?: VoiceNote[];
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export type SortField = 'nameAsc' | 'nameDesc' | 'firstNameAsc' | 'updatedDesc' | 'updatedAsc' | 'createdDesc';

export interface FilterOptions {
  searchQuery: string;
  category: string; // 'all' | 'favorites' | specific category
  sortBy: SortField;
}

export interface DuplicateMatch {
  existingContact: Contact;
  reasons: string[]; // e.g. "Même numéro de téléphone", "Même adresse e-mail", "Nom identique"
}

export interface ImportPreviewRow {
  index: number;
  raw: Record<string, string>;
  parsedContact: Partial<Contact>;
  isValid: boolean;
  validationError?: string;
  duplicateMatch?: DuplicateMatch;
}

export interface ImportSummary {
  total: number;
  imported: number;
  updated: number;
  skipped: number;
  errors: number;
  errorMessages: string[];
}
