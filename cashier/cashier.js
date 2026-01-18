// cashier.js
// Кассовый вход в спектакль + инициализация локальной кассы (IndexedDB)
// Интернет НЕ требуется

import { openDB } from "./db/db.js";
import { ensureShow } from "./db/shows.js";

(async () => {
  const sel = document.getElementById("show");
  const btn = document.getElementById("open-hall");
  const hint = document.getElementById("hint");

  function labelOf(item) {
    const when = [item.date, item.time].filter(Boolean).join(" ");
    return `${item.title || item.id} • ${when}`.trim();
  }

  let items = [];

  // 1. Загружаем афишу (локальный JSON — как и было)
  try {
    const res = await fetch("../data/afisha.json", { cache: "no-store" });
    items = res.ok ? await res.json() : [];
  } catch (e) {
    console.error(e);
    items = [];
  }

  if (!Array.isArray(items) || !items.length) {
    hint.textContent = "Немає сеансів у data/afisha.json";
    return;
  }

  // 2. Инициализируем локальную БД кассы
  try {
    await openDB();
  } catch (e) {
    console.error("DB init error", e);
    hint.textContent = "Помилка ініціалізації каси";
    return;
  }

  // 3. Заполняем селект + сохраняем спектакли в IndexedDB
  for (const it of items) {
    const opt = document.createElement("option");
    opt.value = it.id;
    opt.textContent = labelOf(it);
    sel.appendChild(opt);

    // ВАЖНО:
    // сохраняем спектакль локально,
    // чтобы касса могла работать БЕЗ ИНТЕРНЕТА
    try {
      await ensureShow({
        id: it.id,
        title: it.title || it.id,
        date: it.date || null,
        time: it.time || null,
        hall: it.hall || null,
        raw: it,
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      // не критично — спектакль мог быть уже сохранён
      console.warn("show exists:", it.id);
    }
  }

  // 4. Переход в зал — КЛЮЧЕВО: роль кассира
  btn.addEventListener("click", () => {
    const id = sel.value;
    if (!id) {
      alert("Оберіть сеанс.");
      return;
    }

    // та же схема зала, но кассовый режим
    window.location.href =
      `../spectacles/hall.html?show=${encodeURIComponent(id)}&role=cashier`;
  });
})();
