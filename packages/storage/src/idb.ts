const DB_NAME = "cet6-prep-studio";
const DB_VERSION = 1;

const storeDefinitions = [
  { name: "settings", keyPath: "id" },
  { name: "progress", keyPath: "itemId" },
  { name: "wrongItems", keyPath: "id" },
  { name: "tasks", keyPath: "id" },
  { name: "mediaAssets", keyPath: "id" },
  { name: "mediaBindings", keyPath: "id" }
] as const;

export type StoreName = (typeof storeDefinitions)[number]["name"];

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of storeDefinitions) {
        if (!db.objectStoreNames.contains(store.name)) {
          db.createObjectStore(store.name, { keyPath: store.keyPath });
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function withStore<T>(storeName: StoreName, mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        const request = run(store);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        transaction.oncomplete = () => db.close();
        transaction.onerror = () => reject(transaction.error);
      })
  );
}

export function getAll<T>(storeName: StoreName) {
  return withStore<T[]>(storeName, "readonly", (store) => store.getAll());
}

export function getOne<T>(storeName: StoreName, id: IDBValidKey) {
  return withStore<T | undefined>(storeName, "readonly", (store) => store.get(id));
}

export function putOne<T>(storeName: StoreName, value: T) {
  return withStore<IDBValidKey>(storeName, "readwrite", (store) => store.put(value));
}

export function deleteOne(storeName: StoreName, id: IDBValidKey) {
  return withStore<undefined>(storeName, "readwrite", (store) => store.delete(id));
}
