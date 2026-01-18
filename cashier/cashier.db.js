// cashier/cashier.db.js
// Локальная БД кассы (IndexedDB)
// Автономно. Без интернета.

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

      if (!db.objectStoreNames.contains("sales")) {
        const store = db.createObjectStore("sales", { keyPath: "id" });
        store.createIndex("by_show", "show_id");
      }

      if (!db.objectStoreNames.contains("taken")) {
        const store = db.createObjectStore("taken", {
          keyPath: "key" // show|seat
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
   CORE
========================= */
function makeSaleId() {
  const d = new Date();
  const p = n => String(n).padStart(2, "0");
  return (
    "CASH-" +
    d.getFullYear() +
    p(d.getMonth() + 1) +
    p(d.getDate()) +
    "-" +
    p(d.getHours()) +
    p(d.getMinutes()) +
    p(d.getSeconds()) +
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
   PUBLIC API (КАССА)
========================= */

// ✅ ЭТО ОЖИДАЕТ hall.html
export async function saveSale({ show_id, seat_label, price }) {
  const db = await openCashierDB();

  const sale = {
    id: makeSaleId(),
    show_id,
    seat_label,
    price,
    sold_at: new Date().toISOString()
  };

  await txPut(db, "sales", sale);
  await txPut(db, "taken", {
    key: `${show_id}|${seat_label}`,
    show_id,
    seat_label
  });

  return sale;
}

// ✅ ЭТО ОЖИДАЕТ hall.html
export async function getSoldSeats(show_id) {
  const db = await openCashierDB();
  const rows = await txIndexGetAll(db, "taken", "by_show", show_id);
  return rows.map(r => r.seat_label);
}
