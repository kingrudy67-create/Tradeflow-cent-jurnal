/* TradeFlow Cent Journal - no external runtime dependencies */
(() => {
  "use strict";
  const $ = s => document.querySelector(s);
  const DB_KEY = "tradeflow_cent_users_v1";
  const SESSION_KEY = "tradeflow_cent_session";
  const fmt = (n, d=2) => Number(n||0).toLocaleString("id-ID",{minimumFractionDigits:d,maximumFractionDigits:d});
  const id = () => crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+Math.random().toString(36).slice(2);
  let users = readUsers(), active = null, authMode = "login", editingTrade = null, editingNote = null;
  const blankData = () => ({profile:{name:"Trader",photo:""},settings:{capital:10000,rate:16000},trades:[],notes:[]});
  function readUsers(){try{return JSON.parse(localStorage.getItem(DB_KEY)||"{}")}catch{return {}}}
  function saveUsers(){localStorage.setItem(DB_KEY,JSON.stringify(users))}
  function data(){return active ? users[active].data : blankData()}
  function saveData(){if(active){users[active].data=data();saveUsers();}}
  function safe(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  async function hashPassword(password,salt){
    const bytes = new TextEncoder().encode(salt+":"+password);
    const digest = await crypto.subtle.digest("SHA-256",bytes);
    return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,"0")).join("");
  }
  function showAuth(){ $("#authView").classList.remove("hidden"); $("#appView").classList.add("hidden"); }
  function showApp(){ $("#authView").classList.add("hidden"); $("#appView").classList.remove("hidden"); renderAll(); }
  $("#authToggle").addEventListener("click",()=>{
    authMode=authMode==="login"?"register":"login";
    $("#authSubmit").textContent=authMode==="login"?"Login":"Buat akun";
    $("#authToggle").textContent=authMode==="login"?"Buat akun":"Kembali ke login";
    $("#authHint").textContent=authMode==="login"?"Sudah punya akun?":"Sudah terdaftar?";
    $("#authPass").value="";$("#authError").textContent="";
  });
  $("#authForm").addEventListener("submit",async e=>{
    e.preventDefault(); const username=$("#authUser").value.trim().toLowerCase(), pass=$("#authPass").value;
    if(!/^[a-z0-9_.-]{3,24}$/.test(username)){return authError("Username: 3–24 karakter, gunakan huruf, angka, titik, _ atau -.");}
    if(pass.length<6)return authError("Password minimal 6 karakter.");
    if(!crypto.subtle)return authError("Browser tidak mendukung Web Crypto. Buka melalui HTTPS atau localhost.");
    if(authMode==="register"){
      if(users[username])return authError("Username sudah digunakan.");
      const salt=id(), hash=await hashPassword(pass,salt);
      users[username]={salt,hash,data:blankData()};saveUsers();
    }else{
      const u=users[username];if(!u)return authError("Akun tidak ditemukan.");
      if(await hashPassword(pass,u.salt)!==u.hash)return authError("Username atau password salah.");
    }
    active=username;sessionStorage.setItem(SESSION_KEY,username);$("#authPass").value="";showApp();
  });
  function authError(t){$("#authError").textContent=t}
  $("#logoutBtn").addEventListener("click",()=>{active=null;sessionStorage.removeItem(SESSION_KEY);showAuth()});
  const session=sessionStorage.getItem(SESSION_KEY);
  if(session&&users[session]){active=session;showApp()}else showAuth();

  function totals(){
    const d=data(), trades=[...d.trades].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
    const pnl=trades.reduce((s,t)=>s+Number(t.pnl||0),0), cap=Number(d.settings.capital)||0, equity=cap+pnl;
    const wins=trades.filter(t=>t.pnl>0),losses=trades.filter(t=>t.pnl<0),be=trades.filter(t=>t.pnl===0);
    const days={};trades.forEach(t=>days[t.date]=(days[t.date]||0)+Number(t.pnl));
    return {trades,pnl,cap,equity,roi:cap?pnl/cap*100:0,wins,losses,be,winRate:trades.length?wins.length/trades.length*100:0,days};
  }
  const usd=usc=>usc/100, idr=usc=>usd(usc)*(Number(data().settings.rate)||0);
  function triple(usc){return `${fmt(usc,2)} USC · $${fmt(usd(usc),2)} · Rp${fmt(idr(usc),0)}`}
  function pnlClass(n){return n>0?"positive":n<0?"negative":""}
  function renderAll(){if(!active)return;renderHeader();renderHome();renderTrades();renderAnalytics();renderNotes();}
  function renderHeader(){const p=data().profile;$("#displayName").textContent=p.name||active;$("#avatar").src=p.photo||"data:image/svg+xml,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="100%" height="100%" fill="#263b54"/><circle cx="40" cy="30" r="15" fill="#9bb2ca"/><path d="M12 78c2-22 54-22 56 0" fill="#9bb2ca"/></svg>');}
  function renderHome(){
    const t=totals();$("#equityUSC").textContent=fmt(t.equity)+" USC";$("#equityUSD").textContent="$"+fmt(usd(t.equity));$("#equityIDR").textContent="Rp"+fmt(idr(t.equity),0);
    $("#roiBadge").textContent="ROI "+fmt(t.roi)+"%";$("#roiBadge").className="badge"+(t.roi<0?" loss":"");
    $("#capitalHome").textContent=fmt(t.cap)+" USC";$("#capitalSub").textContent="$"+fmt(usd(t.cap))+" · Rp"+fmt(idr(t.cap),0);
    $("#pnlHome").textContent=(t.pnl>0?"+":"")+fmt(t.pnl)+" USC";$("#pnlHome").className="value "+pnlClass(t.pnl);$("#pnlSub").textContent="$"+fmt(usd(t.pnl))+" · Rp"+fmt(idr(t.pnl),0);
    $("#positionsHome").textContent=t.trades.length;$("#winHome").textContent=fmt(t.winRate)+"%";
    const recent=[...t.trades].reverse().slice(0,4);$("#recentList").innerHTML=recent.length?recent.map(tradeRow).join(""):'<div class="empty">Belum ada posisi. Tambahkan transaksi pertama dari menu Journal.</div>';
  }
  function tradeRow(t,actions=true){return `<div class="list-item"><div class="row"><div><b>${safe(t.instrument)}</b> <span class="pill">${safe(t.type)}</span><div class="tiny muted">${safe(t.date)} · ${safe(t.time)} · ${safe(t.lot)} lot</div></div><div style="text-align:right"><b class="${pnlClass(t.pnl)}">${t.pnl>0?"+":""}${fmt(t.pnl)} USC</b>${actions?`<div class="actions" style="justify-content:flex-end;margin-top:6px"><button class="btn small" data-edit-trade="${t.id}">Edit</button><button class="btn small danger" data-delete-trade="${t.id}">Hapus</button></div>`:""}</div></div>${t.note?`<div class="tiny muted" style="margin-top:5px">${safe(t.note)}</div>`:""}</div>`}
  function renderTrades(){
    const q=$("#searchTrade").value.toLowerCase(),inst=$("#filterInstrument").value,date=$("#filterDate").value;
    const list=[...data().trades].sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time)).filter(t=>(!inst||t.instrument===inst)&&(!date||t.date===date)&&(!q||(t.instrument+" "+t.note+" "+t.type).toLowerCase().includes(q)));
    $("#tradeList").innerHTML=list.length?list.map(t=>tradeRow(t)).join(""):'<div class="empty">Tidak ada transaksi yang cocok dengan filter.</div>';
  }
  ["searchTrade","filterInstrument","filterDate"].forEach(s=>$("#"+s).addEventListener("input",renderTrades));
  function renderAnalytics(){
    const t=totals(),avg=a=>a.length?a.reduce((s,x)=>s+x.pnl,0)/a.length:0;
    $("#avgWin").textContent=fmt(avg(t.wins))+" USC";$("#avgLoss").textContent=fmt(avg(t.losses))+" USC";
    $("#profitDays").textContent=Object.values(t.days).filter(v=>v>0).length;$("#lossDays").textContent=Object.values(t.days).filter(v=>v<0).length;
    drawEquity(t);drawDonut(t);
  }
  function drawEquity(t){
    const points=[t.cap];let running=t.cap;t.trades.forEach(x=>{running+=Number(x.pnl);points.push(running)});
    const w=640,h=190,pad=22,min=Math.min(...points,0),max=Math.max(...points,1),range=max-min||1;
    const coords=points.map((v,i)=>[pad+i*(w-2*pad)/Math.max(points.length-1,1),h-pad-(v-min)/range*(h-2*pad)]);
    const path=coords.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ");
    const grid=[0,1,2,3].map(i=>{let y=pad+i*(h-2*pad)/3;return `<line x1="${pad}" y1="${y}" x2="${w-pad}" y2="${y}" stroke="#26364e" stroke-dasharray="4 5"/>`}).join("");
    $("#equityChart").innerHTML=`<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Kurva equity"><defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#54dfad" stop-opacity=".25"/><stop offset="1" stop-color="#54dfad" stop-opacity="0"/></linearGradient></defs>${grid}<path d="${path} L ${coords.at(-1)[0]} ${h-pad} L ${coords[0][0]} ${h-pad} Z" fill="url(#area)"/><path d="${path}" fill="none" stroke="#54dfad" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${coords.length<18?coords.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="#54dfad"/>`).join(""):""}</svg><div class="row tiny muted"><span>Awal: ${fmt(t.cap)} USC</span><span>Sekarang: ${fmt(t.equity)} USC</span></div>`;
  }
  function drawDonut(t){
    const total=t.wins.length+t.losses.length+t.be.length||1,win=t.wins.length/total,loss=t.losses.length/total,be=t.be.length/total;
    const r=58,c=2*Math.PI*r,a=win*c,b=loss*c;
    $("#winLossChart").innerHTML=`<div class="row" style="justify-content:center;gap:25px"><svg width="150" height="150" viewBox="0 0 150 150" role="img" aria-label="Diagram win loss"><circle cx="75" cy="75" r="${r}" fill="none" stroke="#53647b" stroke-width="19"/><circle cx="75" cy="75" r="${r}" fill="none" stroke="#54dfad" stroke-width="19" stroke-dasharray="${a} ${c-a}" transform="rotate(-90 75 75)"/><circle cx="75" cy="75" r="${r}" fill="none" stroke="#ff7c83" stroke-width="19" stroke-dasharray="${b} ${c-b}" stroke-dashoffset="${-a}" transform="rotate(-90 75 75)"/><text x="75" y="71" fill="#e8eef7" text-anchor="middle" font-size="19" font-weight="800">${fmt(t.winRate,1)}%</text><text x="75" y="89" fill="#91a0b7" text-anchor="middle" font-size="10">WIN RATE</text></svg><div class="tiny muted"><div><b class="positive">${t.wins.length}</b> Win</div><div><b class="negative">${t.losses.length}</b> Loss</div><div><b>${t.be.length}</b> Breakeven</div></div></div>`;
  }
  function renderNotes(){
    const notes=[...data().notes].sort((a,b)=>b.created.localeCompare(a.created));
    $("#notesList").innerHTML=notes.length?notes.map(n=>`<div class="list-item"><div class="row"><div><b>${safe(n.title)}</b><div class="tiny muted">${safe(n.date)} · ${safe(n.category)}</div></div><div class="actions"><button class="btn small" data-edit-note="${n.id}">Edit</button><button class="btn small danger" data-delete-note="${n.id}">Hapus</button></div></div><p class="tiny" style="white-space:pre-wrap">${safe(n.body)}</p></div>`).join(""):'<div class="empty">Belum ada catatan evaluasi.</div>';
  }
  function navigate(page){document.querySelectorAll("[id^=page-]").forEach(x=>x.classList.add("hidden"));$("#page-"+page).classList.remove("hidden");document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.page===page));if(page==="analytics")renderAnalytics();}
  document.querySelectorAll(".nav").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.page)));
  document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.go)));

  function openModal(title,body){
    $("#modalRoot").innerHTML=`<div class="overlay" id="overlay"><section class="drawer"><div class="drawer-head"><h2 style="margin:0">${title}</h2><button class="icon-btn" id="closeModal" aria-label="Tutup">×</button></div>${body}</section></div>`;
    $("#closeModal").onclick=closeModal;$("#overlay").addEventListener("click",e=>{if(e.target.id==="overlay")closeModal()});
  }
  function closeModal(){$("#modalRoot").innerHTML=""}
  $("#addTradeBtn").onclick=()=>tradeModal();
  function tradeModal(trade=null){
    editingTrade=trade?.id||null;const today=new Date().toISOString().slice(0,10);
    openModal(trade?"Edit posisi":"Tambah posisi",`<form id="tradeForm"><div class="form-grid">
      <div class="field"><label>TANGGAL</label><input name="date" type="date" value="${safe(trade?.date||today)}" required></div>
      <div class="field"><label>WAKTU</label><input name="time" type="time" value="${safe(trade?.time||new Date().toTimeString().slice(0,5))}" required></div>
      <div class="field"><label>INSTRUMEN</label><select name="instrument">${["Forex","XAUUSD","Oil","Indices","Crypto"].map(x=>`<option ${trade?.instrument===x?"selected":""}>${x}</option>`).join("")}</select></div>
      <div class="field"><label>TYPE</label><select name="type"><option ${trade?.type==="BUY"?"selected":""}>BUY</option><option ${trade?.type==="SELL"?"selected":""}>SELL</option></select></div>
      <div class="field"><label>LOT</label><input name="lot" type="number" min="0" step="0.001" value="${safe(trade?.lot??"0.01")}" required></div>
      <div class="field"><label>PROFIT / LOSS (USC)</label><input name="pnl" type="number" step="0.01" value="${safe(trade?.pnl??"0")}" required></div>
      <div class="field full"><label>CATATAN</label><textarea name="note" placeholder="Alasan entry, kondisi market, hasil evaluasi...">${safe(trade?.note||"")}</textarea></div>
      </div><p class="tiny muted">Nilai P/L diisi dalam USC. Nilai USD dan IDR dihitung otomatis berdasarkan kurs yang tersimpan.</p><button class="btn primary" style="width:100%" type="submit">Simpan posisi</button></form>`);
    $("#tradeForm").onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),item={id:editingTrade||id(),date:f.get("date"),time:f.get("time"),instrument:f.get("instrument"),type:f.get("type"),lot:Number(f.get("lot")),pnl:Number(f.get("pnl")),note:f.get("note").trim()};if(!Number.isFinite(item.pnl)||!Number.isFinite(item.lot)||item.lot<0)return;const arr=data().trades,idx=arr.findIndex(x=>x.id===item.id);if(idx>=0)arr[idx]=item;else arr.push(item);saveData();closeModal();renderAll();};
  }
  $("#tradeList").addEventListener("click",e=>{
    const edit=e.target.closest("[data-edit-trade]"),del=e.target.closest("[data-delete-trade]");
    if(edit){const t=data().trades.find(x=>x.id===edit.dataset.editTrade);if(t)tradeModal(t)}
    if(del&&confirm("Hapus posisi ini?")){data().trades=data().trades.filter(x=>x.id!==del.dataset.deleteTrade);saveData();renderAll()}
  });
  $("#recentList").addEventListener("click",e=>{const b=e.target.closest("[data-edit-trade]");if(b){const t=data().trades.find(x=>x.id===b.dataset.editTrade);if(t)tradeModal(t)}});
  $("#addNoteBtn").onclick=()=>noteModal();
  function noteModal(note=null){
    editingNote=note?.id||null;openModal(note?"Edit catatan":"Catatan evaluasi",`<form id="noteForm"><div class="field"><label>JUDUL</label><input name="title" required maxlength="80" value="${safe(note?.title||"")}"></div><div class="form-grid"><div class="field full"><label>KATEGORI</label><select name="category">${["Psikologi","Evaluasi strategi","Kesalahan trading","Rencana perbaikan","Catatan harian"].map(x=>`<option ${note?.category===x?"selected":""}>${x}</option>`).join("")}</select></div></div><div class="field"><label>ISI CATATAN</label><textarea name="body" required>${safe(note?.body||"")}</textarea></div><button class="btn primary" style="width:100%">Simpan catatan</button></form>`);
    $("#noteForm").onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),item={id:editingNote||id(),title:f.get("title").trim(),category:f.get("category"),body:f.get("body").trim(),date:note?.date||new Date().toISOString().slice(0,10),created:note?.created||new Date().toISOString()};const a=data().notes,idx=a.findIndex(x=>x.id===item.id);if(idx>=0)a[idx]=item;else a.push(item);saveData();closeModal();renderNotes()};
  }
  $("#notesList").addEventListener("click",e=>{const edit=e.target.closest("[data-edit-note]"),del=e.target.closest("[data-delete-note]");if(edit){const n=data().notes.find(x=>x.id===edit.dataset.editNote);if(n)noteModal(n)}if(del&&confirm("Hapus catatan ini?")){data().notes=data().notes.filter(x=>x.id!==del.dataset.deleteNote);saveData();renderNotes()}});
  $("#settingsBtn").onclick=()=>{
    const d=data(),p=d.profile,s=d.settings;
    openModal("Pengaturan",`<form id="settingsForm"><div class="field"><label>NAMA PROFIL</label><input name="name" maxlength="40" value="${safe(p.name)}"></div><div class="field"><label>FOTO PROFIL (PILIH FILE)</label><input name="photo" type="file" accept="image/*"><span class="tiny muted">Foto disimpan di perangkat; gunakan gambar kecil agar penyimpanan tidak cepat penuh.</span></div><div class="field"><label>MODAL AWAL (USC)</label><input name="capital" type="number" step="0.01" min="0" value="${s.capital}"></div><div class="field"><label>KURS USD / IDR</label><input name="rate" type="number" step="1" min="1" value="${s.rate}"></div><button class="btn primary" style="width:100%">Simpan pengaturan</button></form><hr style="border-color:var(--line);margin:18px 0"><button class="btn" id="exportAll" style="width:100%;margin-bottom:8px">Ekspor backup JSON</button><button class="btn danger" id="clearAccount" style="width:100%">Hapus seluruh data akun</button><p class="tiny muted">Penghapusan tidak dapat dibatalkan. Ekspor backup sebelum menghapus.</p>`);
    $("#settingsForm").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);p.name=f.get("name").trim()||active;s.capital=Math.max(0,Number(f.get("capital"))||0);s.rate=Math.max(1,Number(f.get("rate"))||16000);const file=f.get("photo");if(file&&file.size){if(file.size>1200000){alert("Ukuran foto maksimal 1,2 MB.");return}p.photo=await resizeImage(file)}saveData();closeModal();renderAll()};
    $("#exportAll").onclick=()=>download("tradeflow-backup-"+active+".json",JSON.stringify({username:active,data:d},null,2),"application/json");
    $("#clearAccount").onclick=()=>{if(confirm("Hapus semua transaksi, catatan, dan pengaturan akun ini? Akun login tetap ada.")){users[active].data=blankData();saveUsers();closeModal();renderAll()}};
  };
  function resizeImage(file){return new Promise(resolve=>{const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const c=document.createElement("canvas"),scale=Math.min(1,320/Math.max(im.width,im.height));c.width=im.width*scale;c.height=im.height*scale;c.getContext("2d").drawImage(im,0,0,c.width,c.height);resolve(c.toDataURL("image/jpeg",.72))};im.src=r.result};r.readAsDataURL(file)})}
  function download(name,content,type){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  $("#exportBtn").onclick=()=>{
    const header=["Tanggal","Waktu","Instrumen","Type","Lot","PnL USC","PnL USD","PnL IDR","ROI %","Catatan"];
    const rows=[...data().trades].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).map(t=>[t.date,t.time,t.instrument,t.type,t.lot,t.pnl,usd(t.pnl),idr(t.pnl),data().settings.capital?t.pnl/data().settings.capital*100:0,t.note]);
    const csv=[header,...rows].map(row=>row.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");
    download("tradeflow-journal-"+active+".csv","\ufeff"+csv,"text/csv;charset=utf-8");
  };
  if("serviceWorker" in navigator && location.protocol!=="file:"){window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(console.error))}
})();