// cashier.db.js
// Локальная БД кассы (IndexedDB)
// Автономно. Без интернета. Без Supabase.

const DB_NAME = "theatre_cashier_db";
const DB_VERSION = 1;

let dbPromise = null;

/* =========================
   INIT
========================= */
export function openCashierDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;

      // ---- спектакли ----
      if (!db.objectStoreNames.contains("shows")) {
        const store = db.createObjectStore("shows", { keyPath: "id" });
        store.createIndex("by_date", "date");
      }

      // ---- продажи ----
      if (!db.objectStoreNames.contains("sales")) {
        const store = db.createObjectStore("sales", { keyPath: "id" });
        store.createIndex("by_show", "show_id");
        store.createIndex("by_seat", "seat_label");
        store.createIndex("by_time", "sold_at");
      }

      // ---- занятые места (кеш) ----
      if (!db.objectStoreNames.contains("taken")) {
        const store = db.createObjectStore("taken", {
          keyPath: "key" // show_id|seat_label
        });
        store.createIndex("by_show", "show_id");
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  return dbPromise;
}

/* =========================
   SHOWS
========================= */
export async function saveShow(show) {
  const db = await openCashierDB();
  return txPut(db, "shows", {
    ...show,
    updated_at: new Date().toISOString(),
  });
}

export async function getShows() {
  const db = await openCashierDB();
  return txGetAll(db, "shows");
}

export async function getShow(id) {
  const db = await openCashierDB();
  return txGet(db, "shows", id);
}

/* =========================
   SALES
========================= */
export async function createSale({
  show_id,
  seat_label,
  price,
  cashier = "cashier",
}) {
  const db = await openCashierDB();

  const sale = {
    id: makeSaleId(),
    show_id,
    seat_label,
    price,
    cashier,
    sold_at: new Date().toISOString(),
    status: "sold",
  };

  await txPut(db, "sales", sale);

  // помечаем место занятым
  await txPut(db, "taken", {
    key: `${show_id}|${seat_label}`,
    show_id,
    seat_label,
    sold_at: sale.sold_at,
  });

  return sale;
}

export async function getSalesByShow(show_id) {
  const db = await openCashierDB();
  return txIndexGetAll(db, "sales", "by_show", show_id);
}

/* =========================
   TAKEN SEATS
========================= */
export async function isSeatTaken(show_id, seat_label) {
  const db = await openCashierDB();
  const key = `${show_id}|${seat_label}`;
  const res = await txGet(db, "taken", key);
  return !!res;
}

export async function getTakenSeats(show_id) {
  const db = await openCashierDB();
  const rows = await txIndexGetAll(db, "taken", "by_show", show_id);
  return rows.map(r => r.seat_label);
}

/* =========================
   HELPERS
========================= */
function makeSaleId() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return (
    "CASH-" +
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    "-" +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds()) +
    "-" +
    Math.floor(Math.random() * 1000)
  );
}

function txPut(db, store, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve(value);
    tx.onerror = () => reject(tx.error);
  });
}

function txGet(db, store, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

function txGetAll(db, store) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function txIndexGetAll(db, store, index, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const idx = tx.objectStore(store).index(index);
    const req = idx.getAll(value);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}
/* =========================
   COMPATIBILITY API
   для hall.html
========================= */

/**
 * Совместимость с hall.html
 * Возвращает массив seat_label, проданных кассой
 */
export async function getSoldSeats(show_id) {
  return getTakenSeats(show_id);
}
