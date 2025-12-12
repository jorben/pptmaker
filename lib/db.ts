import { Presentation, PresentationConfig } from "./types";

const DB_NAME = "ppt-maker-db";
const DB_VERSION = 1;
const STORE_NAME = "presentations";

export interface HistoryRecord {
  id: string;
  timestamp: number;
  presentation: Presentation;
  config: PresentationConfig;
  thumbnail?: string; // First slide image
}

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("IndexedDB error:", event);
      reject("Error opening database");
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
};

export const savePresentationToHistory = async (
  presentation: Presentation,
  config: PresentationConfig,
  existingId?: string
): Promise<string> => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const recordId = existingId || crypto.randomUUID();
    const record: HistoryRecord = {
      id: recordId,
      timestamp: Date.now(),
      presentation,
      config,
      thumbnail: presentation.slides[0]?.imageUrl,
    };

    return new Promise((resolve, reject) => {
      const request = existingId ? store.put(record) : store.add(record);
      request.onsuccess = () => resolve(recordId);
      request.onerror = () => reject("Error saving presentation");
    });
  } catch (error) {
    console.error("Error saving to history:", error);
    throw error;
  }
};

export const updatePresentationInHistory = async (
  id: string,
  presentation: Presentation,
  config: PresentationConfig
): Promise<void> => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const record: HistoryRecord = {
      id,
      timestamp: Date.now(),
      presentation,
      config,
      thumbnail: presentation.slides[0]?.imageUrl,
    };

    return new Promise((resolve, reject) => {
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject("Error updating presentation");
    });
  } catch (error) {
    console.error("Error updating history:", error);
    throw error;
  }
};

export const getHistory = async (): Promise<HistoryRecord[]> => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result as HistoryRecord[];
        // Sort by timestamp desc
        results.sort((a, b) => b.timestamp - a.timestamp);
        resolve(results);
      };
      request.onerror = () => reject("Error fetching history");
    });
  } catch (error) {
    console.error("Error getting history:", error);
    throw error;
  }
};

export const deleteHistoryRecord = async (id: string): Promise<void> => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject("Error deleting record");
    });
  } catch (error) {
    console.error("Error deleting history record:", error);
    throw error;
  }
};
