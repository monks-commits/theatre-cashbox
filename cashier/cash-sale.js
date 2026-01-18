// cashier/cash-sale.js
// Связка: выбранные места → IndexedDB → печать кассового билета

import {
  openCashierDB,
  createSale,
  getShow
} from "./cashier.db.js";

const PRINT_KEY = "CASH_PRINT_PAYLOAD";

function humanSeat(seat_label){
  // A0-M6 / P12-M4 → человекочитаемо
  const m = seat_label.match(/^([PAB])(\d+)-M(\d+)$/i);
  if (!m) return seat_label;
  const [_, z, r, s] = m;
  if (z === "P") return `Ряд ${r}, місце ${s} (Партер)`;
  if (z === "A") return r === "0" ? `Ложа А, місце ${s}` : `Ряд ${r}, місце ${s} (Амфітеатр)`;
  if (z === "B") return r === "0" ? `Ложа Б, місце ${s}` : `Ряд ${r}, місце ${s} (Балкон)`;
  return seat_label;
}

export async function cashSellAndPrint({
  show_id,
  showTitle,
  showDate,
  seats,        // array of seat_label
  prices        // map seat_label -> price
}) {
  await openCashierDB();

  for (const seat_label of seats){
    const price = prices.get(seat_label) || 0;

    // 1) создаём локальную продажу
    const sale = await createSale({
      show_id,
      seat_label,
      price
    });

    // 2) готовим данные для печати
    const payload = {
      theatre: "Театр ім. Т. Г. Шевченка",
      tagline: "Каса",
      showTitle: showTitle || show_id,
      showDate: showDate || "",
      seat: humanSeat(seat_label),
      price: `${price} грн`,
      ticketNo: sale.id,
      soldAt: sale.sold_at
    };

    sessionStorage.setItem(PRINT_KEY, JSON.stringify(payload));

    // 3) печать
    window.open(
      "../cashier/print-ticket.html",
      "_blank",
      "width=380,height=600"
    );
  }
}
