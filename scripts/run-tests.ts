/**
 * Automated test suite for ContactFlow
 * Can be run via: npm test
 */
import { sanitizeCsvField, exportContactsToCsv, parseCsv, generateSampleCsv } from '../src/services/csv';
import { contactToVCard, parseVCard, exportContactsToVCard } from '../src/services/vcard';
import { findDuplicates, normalizeText, normalizePhone, normalizeEmail, mergeContactFields } from '../src/services/duplicate';
import { getWhatsAppUrl, getTelUrl, getSmsUrl } from '../src/services/phone';
import { Contact } from '../src/types/contact';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
  }
}

console.log('\n======================================================');
console.log('  CONTACTFLOW — BANC DE TESTS AUTOMATISÉS');
console.log('======================================================\n');

// 1. Unicode & Accent preservation
console.log('Suite 1: Normalisation & Encodage Unicode');
const accentText = 'Éléonore-Céline D’Hauterive & Garçon';
const norm = normalizeText(accentText);
assert(norm.includes('eleonore-celine'), 'Suppression diacritique NFD pour recherche', `Obtenu: ${norm}`);
assert(norm.includes('garcon'), 'Conversion cédille en c standard pour recherche', `Obtenu: ${norm}`);

// 2. International Phone Preservation
console.log('\nSuite 2: Numéros de Téléphone Internationaux');
const phone1 = '+33 6 12 34 56 78';
const phone2 = '06 12 34 56 78';
const norm1 = normalizePhone(phone1);
const norm2 = normalizePhone(phone2);
assert(norm1 === '+33612345678', 'Conservation indicatif international (+)', `Obtenu: ${norm1}`);
assert(norm2 === '0612345678', 'Conservation du zéro initial', `Obtenu: ${norm2}`);
assert(typeof norm1 === 'string' && typeof norm2 === 'string', 'Téléphone non converti en entier', `Type: ${typeof norm1}`);

// 3. CSV Injection Protection & RFC 4180
console.log('\nSuite 3: Sécurité CSV & Neutralisation Formules Excel');
const formula1 = '=SUM(A1:A10)';
const formula2 = '+cmd|"/C calc"!A0';
const formula3 = '@SUM(1,2)';
const formula4 = '-2+3';

const isSanitizedFormula = (val: string, prefix: string) => {
  return val.startsWith(`'${prefix}`) || val.startsWith(`"\'${prefix}`);
};

assert(isSanitizedFormula(sanitizeCsvField(formula1), '='), 'Neutralisation formule débutant par =');
assert(isSanitizedFormula(sanitizeCsvField(formula2), '+'), 'Neutralisation formule débutant par +');
assert(isSanitizedFormula(sanitizeCsvField(formula3), '@'), 'Neutralisation formule débutant par @');
assert(isSanitizedFormula(sanitizeCsvField(formula4), '-'), 'Neutralisation formule débutant par -');

const multilineText = 'Ligne 1\nLigne 2 "avec guillemets"';
const sanitizedMulti = sanitizeCsvField(multilineText);
assert(sanitizedMulti.startsWith('"') && sanitizedMulti.endsWith('"'), 'Échappement guillemets et retours à la ligne RFC 4180');
assert(sanitizedMulti.includes('""avec guillemets""'), 'Doublage des guillemets internes');

// 4. CSV Full Export & Delimiter Detection
console.log('\nSuite 4: Export CSV & Encodage UTF-8 BOM');
const sampleCsv = generateSampleCsv();
assert(sampleCsv.startsWith('\uFEFF'), 'Présence du BOM UTF-8 (\\uFEFF) pour compatibilité Excel');
const parsedCsv = parseCsv(sampleCsv);
assert(parsedCsv.headers.length >= 10, 'Détection automatique des en-têtes CSV', `Colonnes: ${parsedCsv.headers.length}`);
assert(parsedCsv.rows.length >= 2, 'Extraction correcte des lignes de données', `Lignes: ${parsedCsv.rows.length}`);

// 5. vCard 3.0 Serialization & Parser
console.log('\nSuite 5: Standard vCard 3.0 & Aller-Retour');
const testContact: Contact = {
  id: 'vc-test-1',
  type: 'person',
  firstName: 'Éléonore',
  lastName: 'de Saint-Germain',
  company: 'Atelier Céramique',
  jobTitle: 'Directrice',
  phones: [{ id: 'p1', label: 'Mobile', number: '+33 6 45 78 92 10' }],
  emails: [{ id: 'e1', label: 'Travail', email: 'e.stgermain@atelier.fr' }],
  address: { street: '14, rue des Francs-Bourgeois', postalCode: '75004', city: 'Paris', country: 'France' },
  website: 'https://atelier.fr',
  categories: ['VIP', 'Travail'],
  notes: 'Partenaire clé',
  isFavorite: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const vcardString = contactToVCard(testContact);
assert(vcardString.includes('BEGIN:VCARD'), 'Présence de la balise BEGIN:VCARD');
assert(vcardString.includes('VERSION:3.0'), 'Spécification de la version 3.0');
assert(vcardString.includes('FN;CHARSET=UTF-8:Éléonore de Saint-Germain'), 'Nom complet en UTF-8');
assert(vcardString.includes('TEL;TYPE=CELL,VOICE:+33 6 45 78 92 10'), 'Numéro de mobile sérialisé');

const parsedVCards = parseVCard(vcardString);
assert(parsedVCards.length === 1, 'vCard analysée avec succès');
assert(parsedVCards[0].lastName === 'de Saint-Germain', 'Nom de famille restitué fidèlement');
assert(parsedVCards[0].firstName === 'Éléonore', 'Prénom accentué restitué fidèlement');

// 6. Duplicate Detection
console.log('\nSuite 6: Détection Intelligente des Doublons');
const existingList: Contact[] = [testContact];

// Same email match
const dupByEmail = findDuplicates({ emails: [{ id: '1', label: 'Autre', email: 'e.stgermain@atelier.fr' }] }, existingList);
assert(dupByEmail.length === 1, 'Détection de doublon par adresse e-mail');

// Same phone match
const dupByPhone = findDuplicates({ phones: [{ id: '1', label: 'Autre', number: '06 45 78 92 10' }] }, existingList);
assert(dupByPhone.length === 1, 'Détection de doublon par numéro de téléphone');

// Same name match
const dupByName = findDuplicates({ firstName: 'eleonore', lastName: 'de saint-germain' }, existingList);
assert(dupByName.length === 1, 'Détection de doublon par nom et prénom (insensible accents)');

// Distinct contact (no duplicate)
const nonDup = findDuplicates({ firstName: 'Arthur', lastName: 'Rimbaud', phones: [{ id: '1', label: 'Mobile', number: '06 00 00 00 00' }] }, existingList);
assert(nonDup.length === 0, 'Non-détection sur un contact distinct');

// 7. Non-Destructive Merging
console.log('\nSuite 7: Fusion Non-Destructive des Données');
const contactWithEmptyWebsite: Contact = {
  ...testContact,
  website: '',
};
const incomingPartial: Partial<Contact> = {
  website: 'https://nouveau-site.fr',
  phones: [{ id: 'p2', label: 'Fixe', number: '+33 1 42 68 55 00' }],
  categories: ['Nouveau Groupe'],
};
const merged = mergeContactFields(contactWithEmptyWebsite, incomingPartial);
assert(merged.firstName === contactWithEmptyWebsite.firstName, 'Préservation du prénom existant');
assert(merged.phones.length === 2, 'Ajout du second numéro de téléphone sans écraser le premier');
assert(merged.website === 'https://nouveau-site.fr', 'Mise à jour du site Web précédemment vide');
assert(merged.categories.includes('VIP') && merged.categories.includes('Nouveau Groupe'), 'Union des catégories sans perte');

// 8. WhatsApp Integration & Universal Link Generator
console.log('\nSuite 8: Liens Universels WhatsApp & Téléphonie');
const wa1 = getWhatsAppUrl('+33 6 45 78 92 10');
assert(wa1 === 'https://wa.me/33645789210', 'Formatage correct WhatsApp pour indicatif +33', `Obtenu: ${wa1}`);

const wa2 = getWhatsAppUrl('06 12 34 56 78');
assert(wa2 === 'https://wa.me/33612345678', 'Conversion automatique du mobile national 06 vers indicatif international 33', `Obtenu: ${wa2}`);

const wa3 = getWhatsAppUrl('+1 (555) 234-5678');
assert(wa3 === 'https://wa.me/15552345678', 'Nettoyage des parenthèses et tirets pour WhatsApp international', `Obtenu: ${wa3}`);

const telUrl = getTelUrl('+33 6 45 78 92 10');
assert(telUrl === 'tel:+33645789210', 'Formatage du lien tel: standard');

console.log('\n------------------------------------------------------');
console.log(`Résultats : ${passedTests}/${totalTests} tests réussis (${failedTests} échec(s)).`);
console.log('------------------------------------------------------\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('Tous les tests unitaires et d\'intégrité sont passés avec succès !\n');
}
