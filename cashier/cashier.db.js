const DB="cashier_db",V=1;
let db;

function open(){
  if(db) return Promise.resolve(db);
  return new Promise(res=>{
    const r=indexedDB.open(DB,V);
    r.onupgradeneeded=e=>{
      const d=e.target.result;
      d.createObjectStore("sales",{keyPath:"id"});
      d.createObjectStore("taken",{keyPath:"key"});
    };
    r.onsuccess=()=>res(db=r.result);
  });
}

export async function createSale({show_id,seat_label,price}){
  const d=await open();
  const tx=d.transaction(["sales","taken"],"readwrite");
  tx.objectStore("sales").put({
    id:Date.now()+"-"+Math.random(),
    show_id,seat_label,price,sold_at:new Date().toISOString()
  });
  tx.objectStore("taken").put({
    key:`${show_id}|${seat_label}`,
    show_id,seat_label
  });
  return tx.complete;
}

export async function getTakenSeats(show_id){
  const d=await open();
  return new Promise(res=>{
    const r=d.transaction("taken").objectStore("taken").getAll();
    r.onsuccess=()=>res(
      r.result.filter(x=>x.show_id===show_id).map(x=>x.seat_label)
    );
  });
}
