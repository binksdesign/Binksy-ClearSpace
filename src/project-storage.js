// Persistance locale Binksy ClearSpace : localStorage, avec repli IndexedDB
// quand le quota est dépassé. Clés dédiées au produit (indépendantes de LogoKit),
// avec migration unique depuis l'ancien stockage pour ne rien perdre.
const KEY = "binksy-clearspace-v1";
const DB_NAME = "binksy-clearspace";
const STORE = "snapshots";
const FLAG = "binksy-clearspace-migrated";
const LEGACY_KEY = "binksy-logo-system";
const LEGACY_DB = "binksy-project-media";
const LEGACY_STORE = "snapshots";

const read = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
};

function openDb(name, store) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbGet(name, store, key) {
  return openDb(name, store).then((db) =>
    new Promise((resolve, reject) => {
      const r = db.transaction(store).objectStore(store).get(key);
      r.onsuccess = () => resolve(r.result ?? null);
      r.onerror = () => reject(r.error);
      setTimeout(() => db.close(), 0);
    }),
  );
}

function idbPut(name, store, key, value) {
  return openDb(name, store).then((db) =>
    new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).put(value, key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
      setTimeout(() => db.close(), 0);
    }),
  );
}

const isFallbackNotice = (v) => v && v.storage === "indexeddb";

export async function readProject() {
  const local = read(KEY);
  if (isFallbackNotice(local))
    return idbGet(DB_NAME, STORE, "project").catch(() => null);
  if (local) return local;
  // Aucune donnée ClearSpace : tenter le repli IndexedDB d'une session passée.
  return idbGet(DB_NAME, STORE, "project").catch(() => null);
}

export function isMigrated() {
  try {
    return localStorage.getItem(FLAG) === "done";
  } catch {
    return false;
  }
}

export function markMigrated() {
  try {
    localStorage.setItem(FLAG, "done");
  } catch {}
}

// Anciens projets LogoKit (tableau) — pour migration unique.
export async function readLegacyProjects() {
  if (isMigrated()) return null;
  const local = read(LEGACY_KEY);
  if (isFallbackNotice(local) || localStorage.getItem("binksy-projects-indexeddb") === "active")
    return idbGet(LEGACY_DB, LEGACY_STORE, "projects").catch(() => local);
  return Array.isArray(local) ? local : null;
}

let pending = Promise.resolve();
export function storeProject(p) {
  const snapshot = structuredClone(p);
  const job = pending
    .catch(() => {})
    .then(async () => {
      try {
        localStorage.setItem(KEY, JSON.stringify(snapshot));
        return;
      } catch (error) {
        if (error.name !== "QuotaExceededError") throw error;
      }
      await idbPut(DB_NAME, STORE, "project", snapshot);
      // Remplace l'instantané local par un marqueur : ne jamais dépasser le quota.
      localStorage.setItem(KEY, JSON.stringify({ storage: "indexeddb" }));
    });
  pending = job;
  return job;
}
