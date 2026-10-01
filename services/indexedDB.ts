import { User, Class, Student, Journal, AttendanceRecord, SystemSettings } from '../types';

const DB_NAME = 'NeoJurnalDB';
const DB_VERSION = 2; // Incremented version for new store
const STORES = ['users', 'classes', 'students', 'journals', 'attendance', 'settings', 'mutation_queue'];

// Open Database Connection
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      STORES.forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          // mutation_queue uses autoIncrement key
          if (storeName === 'mutation_queue') {
             db.createObjectStore(storeName, { autoIncrement: true });
          } else {
             db.createObjectStore(storeName, { keyPath: 'id' });
          }
        }
      });
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

// Generic Get All
export const getAllFromStore = async <T>(storeName: string): Promise<T[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
};

// Save single item
export const saveItemToStore = async (storeName: string, item: any) => {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        store.put(item);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

// Delete single item
export const deleteItemFromStore = async (storeName: string, id: string) => {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        store.delete(id);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

// Generic Bulk Put (Clear and Add) - Simplest strategy for state sync
export const saveToStore = async (storeName: string, items: any[] | any) => {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

    // If it's array, we iterate.
    if (Array.isArray(items)) {
        const clearReq = store.clear();
        clearReq.onsuccess = () => {
            items.forEach(item => {
                store.put(item);
            });
        };
    } else {
        // Single item (like settings wrapped with ID)
        store.put(items);
    }

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

// Queue helper: Get all queue items with their keys
export const getQueueItems = async () => {
    const db = await openDB();
    return new Promise<{key: any, val: any}[]>((resolve, reject) => {
        const transaction = db.transaction('mutation_queue', 'readonly');
        const store = transaction.objectStore('mutation_queue');
        const request = store.openCursor();
        const results: {key: any, val: any}[] = [];

        request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor) {
                results.push({ key: cursor.key, val: cursor.value });
                cursor.continue();
            } else {
                resolve(results);
            }
        };
        request.onerror = () => reject(request.error);
    });
};

// Queue helper: Delete item by key
export const deleteQueueItem = async (key: any) => {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction('mutation_queue', 'readwrite');
        const store = transaction.objectStore('mutation_queue');
        store.delete(key);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

// Specific helper to check if DB is seeded
export const isDBSeeded = async (): Promise<boolean> => {
    const users = await getAllFromStore('users');
    return users.length > 0;
};
