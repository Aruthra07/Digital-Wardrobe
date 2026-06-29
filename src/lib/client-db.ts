// Client-side IndexedDB Database Manager for Closet Canvas

const DB_NAME = 'ClosetCanvasDB';
const DB_VERSION = 1;

export interface ClientCloth {
  id: string;
  name: string;
  image: string; // Base64 transparent PNG
  category: 'Top' | 'Bottom' | 'OnePiece' | 'Accessory';
  subCategory: string;
  color: string;
  brand: string;
  occasion: string;
  season: string;
  notes: string;
  favorite: boolean;
  dateAdded: string;
  lastWorn: string | null;
  wearCount: number;
  length: 'Short' | 'Medium' | 'Long';
  layerPriority: number;
}

export interface CanvasItem {
  id: string; // unique instance ID for the item on canvas
  clothId: string;
  x: number;
  y: number;
  scale: number;
  rotate: number;
  zIndex: number;
}

export interface ClientOutfit {
  id: string;
  outfitName: string;
  collection: 'College Fits' | 'Casual Fits' | 'Hostel Fits' | 'Festive Fits' | 'Favorites';
  items: CanvasItem[];
  dateCreated: string;
  lastWorn: string | null;
  wearCount: number;
}

export interface ClientCalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  outfitId: string;
  notes: string;
}

export interface ClientTrip {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  outfitIds: string[];
  packedItemIds: string[];
}

// Initialize Database
export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is only available in the browser.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      
      // Create Stores
      if (!db.objectStoreNames.contains('clothes')) {
        db.createObjectStore('clothes', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('outfits')) {
        db.createObjectStore('outfits', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('calendar')) {
        db.createObjectStore('calendar', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('trips')) {
        db.createObjectStore('trips', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Generic database helper functions
async function getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<{ store: IDBObjectStore, transaction: IDBTransaction }> {
  const db = await initDB();
  const transaction = db.transaction(storeName, mode);
  const store = transaction.objectStore(storeName);
  return { store, transaction };
}

// --- Clothes Store ---
export async function getClothes(): Promise<ClientCloth[]> {
  try {
    const { store } = await getStore('clothes');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('Failed to get clothes from IndexedDB:', e);
    return [];
  }
}

export async function saveCloth(cloth: ClientCloth): Promise<ClientCloth> {
  const { store } = await getStore('clothes', 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.put(cloth);
    request.onsuccess = () => resolve(cloth);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteCloth(id: string): Promise<string> {
  const { store } = await getStore('clothes', 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
}

// --- Outfits Store ---
export async function getOutfits(): Promise<ClientOutfit[]> {
  try {
    const { store } = await getStore('outfits');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('Failed to get outfits from IndexedDB:', e);
    return [];
  }
}

export async function saveOutfit(outfit: ClientOutfit): Promise<ClientOutfit> {
  const { store } = await getStore('outfits', 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.put(outfit);
    request.onsuccess = () => resolve(outfit);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteOutfit(id: string): Promise<string> {
  const { store } = await getStore('outfits', 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
}

// --- Calendar Store ---
export async function getCalendarEvents(): Promise<ClientCalendarEvent[]> {
  try {
    const { store } = await getStore('calendar');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('Failed to get calendar events from IndexedDB:', e);
    return [];
  }
}

export async function saveCalendarEvent(event: ClientCalendarEvent): Promise<ClientCalendarEvent> {
  const { store } = await getStore('calendar', 'readwrite');
  
  // Get outfit and update its wear count and last worn date
  try {
    const outfits = await getOutfits();
    const outfit = outfits.find(o => o.id === event.outfitId);
    if (outfit) {
      const updatedOutfit: ClientOutfit = {
        ...outfit,
        lastWorn: event.date,
        wearCount: (outfit.wearCount || 0) + 1
      };
      await saveOutfit(updatedOutfit);

      // Also update individual clothes in that outfit
      const clothes = await getClothes();
      for (const item of outfit.items) {
        const cloth = clothes.find(c => c.id === item.clothId);
        if (cloth) {
          const updatedCloth: ClientCloth = {
            ...cloth,
            lastWorn: event.date,
            wearCount: (cloth.wearCount || 0) + 1
          };
          await saveCloth(updatedCloth);
        }
      }
    }
  } catch (err) {
    console.error('Error updating wear counts during calendar pin:', err);
  }

  return new Promise((resolve, reject) => {
    const request = store.put(event);
    request.onsuccess = () => resolve(event);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteCalendarEvent(id: string): Promise<string> {
  const { store } = await getStore('calendar', 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
}

// --- Trips Store ---
export async function getTrips(): Promise<ClientTrip[]> {
  try {
    const { store } = await getStore('trips');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('Failed to get trips from IndexedDB:', e);
    return [];
  }
}

export async function saveTrip(trip: ClientTrip): Promise<ClientTrip> {
  const { store } = await getStore('trips', 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.put(trip);
    request.onsuccess = () => resolve(trip);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteTrip(id: string): Promise<string> {
  const { store } = await getStore('trips', 'readwrite');
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
}
