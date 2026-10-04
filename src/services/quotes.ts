import { QuoteItem, QuoteStatus } from '../types/quote';

const QUOTES_STORAGE_KEY = 'contactflow_quotes_v1';
const DB_NAME = 'ContactFlowDB';
const DB_VERSION = 2; // Incremented to add 'quotes' store seamlessly
const STORE_NAME = 'quotes';

class QuotesDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;
  public isUsingFallback: boolean = false;

  private async openDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    if (typeof window === 'undefined' || !window.indexedDB) {
      this.isUsingFallback = true;
      throw new Error('IndexedDB non supporté');
    }

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        // Ensure contacts store exists
        if (!db.objectStoreNames.contains('contacts')) {
          const store = db.createObjectStore('contacts', { keyPath: 'id' });
          store.createIndex('lastName', 'lastName', { unique: false });
          store.createIndex('firstName', 'firstName', { unique: false });
          store.createIndex('company', 'company', { unique: false });
          store.createIndex('isFavorite', 'isFavorite', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
        // Create quotes store
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const quoteStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          quoteStore.createIndex('contactId', 'contactId', { unique: false });
          quoteStore.createIndex('status', 'status', { unique: false });
          quoteStore.createIndex('sentAt', 'sentAt', { unique: false });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        this.isUsingFallback = true;
        reject(request.error || new Error('Erreur IndexedDB devis'));
      };
    });

    return this.dbPromise;
  }

  private getFromLocalStorage(): QuoteItem[] {
    try {
      const raw = localStorage.getItem(QUOTES_STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as QuoteItem[];
    } catch {
      return [];
    }
  }

  private saveToLocalStorage(quotes: QuoteItem[]): void {
    try {
      localStorage.setItem(QUOTES_STORAGE_KEY, JSON.stringify(quotes));
    } catch {
      // If local storage is full (due to large attachments), trim attached file data in fallback
      const lightweight = quotes.map((q) => {
        if (q.fileData && q.fileData.length > 50000) {
          const { fileData, ...rest } = q;
          return { ...rest, fileData: '' };
        }
        return q;
      });
      try {
        localStorage.setItem(QUOTES_STORAGE_KEY, JSON.stringify(lightweight));
      } catch {
        // Fallback error ignored
      }
    }
  }

  public async getQuotesForContact(contactId: string): Promise<QuoteItem[]> {
    try {
      const db = await this.openDB();
      return new Promise<QuoteItem[]>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('contactId');
        const request = index.getAll(contactId);

        request.onsuccess = () => {
          const list = (request.result as QuoteItem[]) || [];
          // Sort newest first
          list.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
          resolve(list);
        };

        request.onerror = () => {
          reject(request.error || new Error('Erreur lecture devis'));
        };
      });
    } catch {
      this.isUsingFallback = true;
      const list = this.getFromLocalStorage().filter((q) => q.contactId === contactId);
      list.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
      return list;
    }
  }

  public async getAllQuotes(): Promise<QuoteItem[]> {
    try {
      const db = await this.openDB();
      return new Promise<QuoteItem[]>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          const list = (request.result as QuoteItem[]) || [];
          list.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
          resolve(list);
        };

        request.onerror = () => reject(request.error || new Error('Erreur lecture tous devis'));
      });
    } catch {
      this.isUsingFallback = true;
      const list = this.getFromLocalStorage();
      list.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
      return list;
    }
  }

  public async saveQuote(quote: QuoteItem): Promise<QuoteItem> {
    const itemToSave: QuoteItem = {
      ...quote,
      id: quote.id || `quote-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sentAt: quote.sentAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const db = await this.openDB();
      return new Promise<QuoteItem>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(itemToSave);

        request.onsuccess = () => {
          this.syncBackupToLocalStorage(itemToSave);
          resolve(itemToSave);
        };

        request.onerror = () => reject(request.error || new Error('Erreur sauvegarde devis'));
      });
    } catch {
      this.isUsingFallback = true;
      this.syncBackupToLocalStorage(itemToSave);
      return itemToSave;
    }
  }

  public async updateQuoteStatus(quoteId: string, status: QuoteStatus): Promise<QuoteItem | null> {
    try {
      const db = await this.openDB();
      return new Promise<QuoteItem | null>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const getReq = store.get(quoteId);

        getReq.onsuccess = () => {
          const existing = getReq.result as QuoteItem | undefined;
          if (!existing) {
            resolve(null);
            return;
          }
          const updated: QuoteItem = {
            ...existing,
            status,
            updatedAt: new Date().toISOString(),
          };
          const putReq = store.put(updated);
          putReq.onsuccess = () => {
            this.syncBackupToLocalStorage(updated);
            resolve(updated);
          };
          putReq.onerror = () => reject(putReq.error);
        };
        getReq.onerror = () => reject(getReq.error);
      });
    } catch {
      const list = this.getFromLocalStorage();
      const idx = list.findIndex((q) => q.id === quoteId);
      if (idx >= 0) {
        list[idx] = { ...list[idx], status, updatedAt: new Date().toISOString() };
        this.saveToLocalStorage(list);
        return list[idx];
      }
      return null;
    }
  }

  public async deleteQuote(quoteId: string): Promise<boolean> {
    try {
      const db = await this.openDB();
      return new Promise<boolean>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(quoteId);

        request.onsuccess = () => {
          const list = this.getFromLocalStorage().filter((q) => q.id !== quoteId);
          this.saveToLocalStorage(list);
          resolve(true);
        };
        request.onerror = () => reject(request.error);
      });
    } catch {
      const list = this.getFromLocalStorage().filter((q) => q.id !== quoteId);
      this.saveToLocalStorage(list);
      return true;
    }
  }

  private syncBackupToLocalStorage(updated: QuoteItem) {
    try {
      const list = this.getFromLocalStorage();
      const idx = list.findIndex((q) => q.id === updated.id);
      if (idx >= 0) {
        list[idx] = updated;
      } else {
        list.unshift(updated);
      }
      this.saveToLocalStorage(list);
    } catch {
      // Ignored
    }
  }
}

export const quotesDb = new QuotesDatabase();

/**
 * Generates an RFC-compliant mailto URI with prefilled recipient, subject and body text.
 */
export function generateMailtoLink(quote: QuoteItem): string {
  const subjectEncoded = encodeURIComponent(quote.subject);
  let bodyContent = quote.message;

  if (quote.amount) {
    bodyContent += `\n\nMontant estimé : ${formatCurrency(quote.amount)}`;
  }

  if (quote.fileName) {
    bodyContent += `\n\n[Pièce jointe : ${quote.fileName}]`;
  }

  const bodyEncoded = encodeURIComponent(bodyContent);
  return `mailto:${encodeURIComponent(quote.recipientEmail)}?subject=${subjectEncoded}&body=${bodyEncoded}`;
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 Ko';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function formatCurrency(amount?: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

export function formatDateFrench(isoString: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return isoString;
  }
}

export function getQuoteStatusInfo(status: QuoteStatus): {
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
} {
  switch (status) {
    case 'sent':
      return {
        label: 'Envoyé',
        bgClass: 'bg-sky-50 dark:bg-sky-950/50',
        textClass: 'text-sky-700 dark:text-sky-300',
        borderClass: 'border-sky-200 dark:border-sky-800',
      };
    case 'received':
      return {
        label: 'Reçu',
        bgClass: 'bg-emerald-50 dark:bg-emerald-950/50',
        textClass: 'text-emerald-700 dark:text-emerald-300',
        borderClass: 'border-emerald-200 dark:border-emerald-800',
      };
    case 'pending':
      return {
        label: 'En attente',
        bgClass: 'bg-amber-50 dark:bg-amber-950/50',
        textClass: 'text-amber-700 dark:text-amber-300',
        borderClass: 'border-amber-200 dark:border-amber-800',
      };
    default:
      return {
        label: 'Inconnu',
        bgClass: 'bg-slate-100 dark:bg-slate-800',
        textClass: 'text-slate-700 dark:text-slate-300',
        borderClass: 'border-slate-200 dark:border-slate-700',
      };
  }
}
