import { Contact } from '../types/contact';

const DB_NAME = 'ContactFlowDB';
const DB_VERSION = 1;
const STORE_NAME = 'contacts';
const LOCAL_STORAGE_FALLBACK_KEY = 'contactflow_contacts_v1';

// Demonstration contacts IDs to purge permanently
export const DEMO_CONTACT_IDS = ['c-001', 'c-002', 'c-003', 'c-004', 'c-005'];

// Empty default contacts (no fake or demo contacts)
export const INITIAL_SAMPLE_CONTACTS: Contact[] = [];

class ContactDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;
  public isUsingFallback: boolean = false;

  private async openDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    if (typeof window === 'undefined' || !window.indexedDB) {
      this.isUsingFallback = true;
      throw new Error('IndexedDB non supporté par ce navigateur');
    }

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('lastName', 'lastName', { unique: false });
          store.createIndex('firstName', 'firstName', { unique: false });
          store.createIndex('company', 'company', { unique: false });
          store.createIndex('isFavorite', 'isFavorite', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        this.isUsingFallback = true;
        reject(request.error || new Error('Erreur d’ouverture IndexedDB'));
      };
    });

    return this.dbPromise;
  }

  // Fallback to localStorage if IndexedDB fails or is unavailable
  private getFromLocalStorage(): Contact[] {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_FALLBACK_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as Contact[];
    } catch (e) {
      console.error('Erreur lecture localStorage:', e);
      return [];
    }
  }

  private saveToLocalStorage(contacts: Contact[]): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_FALLBACK_KEY, JSON.stringify(contacts));
    } catch (e) {
      console.error('Erreur écriture localStorage:', e);
      throw new Error('Espace de stockage local saturé ou indisponible');
    }
  }

  public async getAll(): Promise<Contact[]> {
    try {
      const db = await this.openDB();
      return new Promise<Contact[]>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          let list = (request.result as Contact[]) || [];

          // Permanently purge any demonstration contacts if present
          if (list.some((c) => DEMO_CONTACT_IDS.includes(c.id))) {
            try {
              const deleteTx = db.transaction([STORE_NAME], 'readwrite');
              const deleteStore = deleteTx.objectStore(STORE_NAME);
              DEMO_CONTACT_IDS.forEach((id) => deleteStore.delete(id));
              list = list.filter((c) => !DEMO_CONTACT_IDS.includes(c.id));
              this.saveToLocalStorage(list);
            } catch {
              // Ignore background deletion error
            }
          }

          localStorage.setItem('contactflow_seeded', 'true');
          localStorage.setItem('contactflow_demo_purged', 'true');
          resolve(list);
        };

        request.onerror = () => {
          reject(request.error || new Error('Erreur de lecture des contacts'));
        };
      });
    } catch {
      this.isUsingFallback = true;
      let list = this.getFromLocalStorage();
      list = list.filter((c) => !DEMO_CONTACT_IDS.includes(c.id));
      this.saveToLocalStorage(list);
      localStorage.setItem('contactflow_seeded', 'true');
      localStorage.setItem('contactflow_demo_purged', 'true');
      return list;
    }
  }

  public async getById(id: string): Promise<Contact | null> {
    try {
      const db = await this.openDB();
      return new Promise<Contact | null>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => {
          resolve((request.result as Contact) || null);
        };

        request.onerror = () => {
          reject(request.error || new Error('Contact introuvable'));
        };
      });
    } catch {
      this.isUsingFallback = true;
      const list = this.getFromLocalStorage();
      return list.find((c) => c.id === id) || null;
    }
  }

  public async save(contact: Contact): Promise<Contact> {
    const updatedContact: Contact = {
      ...contact,
      updatedAt: new Date().toISOString(),
      createdAt: contact.createdAt || new Date().toISOString(),
    };

    try {
      const db = await this.openDB();
      return new Promise<Contact>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(updatedContact);

        request.onsuccess = () => {
          // Keep localStorage in sync as backup
          this.syncBackupToLocalStorage(updatedContact);
          resolve(updatedContact);
        };

        request.onerror = () => {
          reject(request.error || new Error('Échec de l’enregistrement du contact'));
        };
      });
    } catch (e) {
      this.isUsingFallback = true;
      const list = this.getFromLocalStorage();
      const index = list.findIndex((c) => c.id === updatedContact.id);
      if (index >= 0) {
        list[index] = updatedContact;
      } else {
        list.push(updatedContact);
      }
      this.saveToLocalStorage(list);
      return updatedContact;
    }
  }

  public async delete(id: string): Promise<boolean> {
    try {
      const db = await this.openDB();
      return new Promise<boolean>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => {
          const list = this.getFromLocalStorage().filter((c) => c.id !== id);
          this.saveToLocalStorage(list);
          resolve(true);
        };

        request.onerror = () => {
          reject(request.error || new Error('Échec de la suppression du contact'));
        };
      });
    } catch {
      this.isUsingFallback = true;
      const list = this.getFromLocalStorage().filter((c) => c.id !== id);
      this.saveToLocalStorage(list);
      return true;
    }
  }

  public async bulkSave(contacts: Contact[]): Promise<number> {
    try {
      const db = await this.openDB();
      return new Promise<number>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        let count = 0;
        contacts.forEach((c) => {
          store.put(c);
          count++;
        });

        transaction.oncomplete = () => {
          resolve(count);
        };

        transaction.onerror = () => {
          reject(transaction.error || new Error('Échec de l’enregistrement groupé'));
        };
      });
    } catch {
      this.isUsingFallback = true;
      const current = this.getFromLocalStorage();
      const map = new Map<string, Contact>();
      current.forEach((c) => map.set(c.id, c));
      contacts.forEach((c) => map.set(c.id, c));
      const merged = Array.from(map.values());
      this.saveToLocalStorage(merged);
      return contacts.length;
    }
  }

  public async clearAll(): Promise<boolean> {
    try {
      const db = await this.openDB();
      return new Promise<boolean>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => {
          this.saveToLocalStorage([]);
          resolve(true);
        };

        request.onerror = () => {
          reject(request.error || new Error('Échec de la réinitialisation'));
        };
      });
    } catch {
      this.saveToLocalStorage([]);
      return true;
    }
  }

  private syncBackupToLocalStorage(updatedContact: Contact) {
    try {
      const list = this.getFromLocalStorage();
      const idx = list.findIndex((c) => c.id === updatedContact.id);
      if (idx >= 0) {
        list[idx] = updatedContact;
      } else {
        list.push(updatedContact);
      }
      localStorage.setItem(LOCAL_STORAGE_FALLBACK_KEY, JSON.stringify(list));
    } catch {
      // Ignored non-critical backup sync
    }
  }
}

export const db = new ContactDatabase();
