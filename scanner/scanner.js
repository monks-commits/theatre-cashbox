import { db } from "../cashier/cashier.db.js";

const input = document.getElementById("code");
const box   = document.getElementById("result");

function show(text, cls){
  box.textContent = text;
  box.className = "result " + cls;
  box.style.display = "block";
}

async function checkTicket(code){
  if (!code) return;

  const ticket = await db.getTicketById(code);

  if (!ticket){
    show("❌ Квиток не знайдено", "bad");
    return;
  }

  if (ticket.used_at){
    show("⛔ ВЖЕ ВИКОРИСТАНО", "bad");
    return;
  }

  await db.markTicketUsed(code);

  show("✅ ПРОПУСТИТИ", "ok");
}

input.addEventListener("keydown", async (e)=>{
  if (e.key !== "Enter") return;

  const code = input.value.trim();
  input.value = "";

  await checkTicket(code);

  setTimeout(()=>{
    box.style.display = "none";
  }, 2500);
});
