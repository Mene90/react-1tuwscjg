import React, { useState, useEffect, useCallback, useMemo } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// 👇 INSERISCI QUI LE TUE CREDENZIALI SUPABASE (una volta sola)
const SUPABASE_URL = "https://wfecmedeqgnupvjixkad.supabase.co";   // <-- sostituisci
const SUPABASE_KEY = "sb_publishable_pLRwZPPJVbQzAXllZcPszw_x1CblPEM";               // <-- sostituisci
// ─────────────────────────────────────────────────────────────────────────────

const MONTHS = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno",
  "Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const MONTHS_SHORT = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];
const TODAY = new Date().toISOString().split("T")[0];
const CUR_MONTH = MONTHS[new Date().getMonth()];
const CUR_YEAR = new Date().getFullYear();

const fmtN = (n, dec=2) => Number(n||0).toLocaleString("it-IT", { minimumFractionDigits:dec, maximumFractionDigits:dec });
const cur = (acc) => acc?.currency === "CHF" ? "CHF" : "€";

function api(path, opts={}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey:SUPABASE_KEY, Authorization:`Bearer ${SUPABASE_KEY}`, "Content-Type":"application/json", Prefer:opts.prefer||"" },
    ...opts,
  });
}

// ─── NOT CONFIGURED ───────────────────────────────────────────────────────────
function NotConfigured() {
  return (
    <div style={{ minHeight:"100vh", background:"#f8f9fc", display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ maxWidth:380, textAlign:"center" }}>
        <div style={{ fontSize:48, marginBottom:16 }}>⚙️</div>
        <div style={{ fontSize:20, fontWeight:800, color:"#1a1a2e", marginBottom:12 }}>Credenziali mancanti</div>
        <div style={{ fontSize:14, color:"#999", lineHeight:1.7, background:"#fff", borderRadius:16, padding:20, boxShadow:"0 2px 12px #0001" }}>
          Apri <strong style={{ color:"#6366f1" }}>App.jsx</strong> e sostituisci le prime due costanti con i tuoi valori da <strong>Supabase → Project Settings → API</strong>
        </div>
      </div>
    </div>
  );
}

// ─── UI PRIMITIVES ────────────────────────────────────────────────────────────
function Toast({ msg, ok }) {
  return <div style={{ position:"fixed", top:20, left:"50%", transform:"translateX(-50%)", background:ok?"#1a1a2e":"#ef4444", borderRadius:10, padding:"10px 22px", fontSize:13, color:"#fff", zIndex:3000, animation:"fadeUp .2s ease", whiteSpace:"nowrap", boxShadow:"0 4px 20px #0003" }}>{msg}</div>;
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"#00000066", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:1000, padding:16 }} onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:24, padding:28, width:"100%", maxWidth:480, maxHeight:"92vh", overflowY:"auto", boxShadow:"0 -4px 40px #0002" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:22 }}>
          <div style={{ fontSize:16, fontWeight:800, color:"#1a1a2e" }}>{title}</div>
          <button onClick={onClose} style={{ background:"#f5f5f5", border:"none", borderRadius:8, width:32, height:32, cursor:"pointer", fontSize:16, color:"#999" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:11, fontWeight:700, color:"#bbb", letterSpacing:1.2, marginBottom:7 }}>{label}</div>
      {children}
    </div>
  );
}

function Inp({ value, onChange, type="text", placeholder, style={} }) {
  return <input type={type} value={value??""} onChange={onChange} placeholder={placeholder}
    style={{ width:"100%", border:"1.5px solid #eee", borderRadius:10, padding:"11px 14px", fontSize:14, boxSizing:"border-box", outline:"none", color:"#1a1a2e", fontFamily:"inherit", ...style }}/>;
}

function Sel({ value, onChange, children, style={} }) {
  return <select value={value??""} onChange={onChange}
    style={{ width:"100%", border:"1.5px solid #eee", borderRadius:10, padding:"11px 36px 11px 14px", fontSize:14, background:"#fff", color:"#1a1a2e", cursor:"pointer", fontFamily:"inherit", boxSizing:"border-box", appearance:"none", backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23999' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat:"no-repeat", backgroundPosition:"right 14px center", ...style }}>{children}</select>;
}

function PrimaryBtn({ onClick, label, color="#6366f1", small }) {
  return <button onClick={onClick} style={{ width:"100%", padding:small?"10px 0":"13px 0", background:`linear-gradient(135deg,${color},${color}cc)`, border:"none", borderRadius:12, color:"#fff", fontWeight:700, fontSize:small?13:14, cursor:"pointer", boxShadow:`0 4px 20px ${color}33`, fontFamily:"inherit" }}>{label}</button>;
}

function TabSwitch({ tabs, value, onChange }) {
  return (
    <div style={{ display:"flex", background:"#f5f5f5", borderRadius:12, padding:3, marginBottom:16 }}>
      {tabs.map(([v,l])=>(
        <button key={v} onClick={()=>onChange(v)} style={{ flex:1, padding:"9px 0", border:"none", borderRadius:9, background:value===v?"#fff":"transparent", color:value===v?"#1a1a2e":"#bbb", fontWeight:value===v?700:400, fontSize:13, cursor:"pointer", fontFamily:"inherit", boxShadow:value===v?"0 1px 6px #0001":"none", transition:"all .2s" }}>{l}</button>
      ))}
    </div>
  );
}

// ─── CHARTS ──────────────────────────────────────────────────────────────────
function DonutChart({ data, size=180, centerLabel, centerValue }) {
  const total = data.reduce((s,d)=>s+Math.abs(d.value),0);
  if(!total) return <div style={{ width:size, height:size, borderRadius:"50%", background:"#f5f5f5", display:"flex", alignItems:"center", justifyContent:"center", color:"#ccc", fontSize:12 }}>Nessun dato</div>;
  let cum=0; const r=size/2-8, cx=size/2, cy=size/2;
  const slices=data.map(d=>{ const pct=Math.abs(d.value)/total, s=cum*2*Math.PI-Math.PI/2; cum+=pct; const e=cum*2*Math.PI-Math.PI/2; return { ...d, path:`M ${cx} ${cy} L ${cx+r*Math.cos(s)} ${cy+r*Math.sin(s)} A ${r} ${r} 0 ${pct>.5?1:0} 1 ${cx+r*Math.cos(e)} ${cy+r*Math.sin(e)} Z` }; });
  return (
    <svg width={size} height={size}>
      {slices.map((s,i)=><path key={i} d={s.path} fill={s.color} stroke="#fff" strokeWidth={2}/>)}
      <circle cx={cx} cy={cy} r={r*.58} fill="#fff"/>
      {centerLabel&&<text x={cx} y={cy-8} textAnchor="middle" fontSize={10} fill="#999">{centerLabel}</text>}
      {centerValue&&<text x={cx} y={cy+10} textAnchor="middle" fontSize={13} fontWeight={700} fill="#1a1a2e">{centerValue}</text>}
    </svg>
  );
}

function BarChart({ data, color="#6366f1", height=80 }) {
  const max=Math.max(...data.map(d=>Math.abs(d.value)),1);
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:5, height }}>
      {data.map((d,i)=>(
        <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
          <div style={{ width:"100%", background:`${color}18`, borderRadius:"4px 4px 0 0", height:height-16, display:"flex", alignItems:"flex-end" }}>
            <div style={{ width:"100%", height:`${(Math.abs(d.value)/max)*100}%`, background:`linear-gradient(180deg,${color},${color}88)`, borderRadius:"4px 4px 0 0", transition:"height .5s ease" }}/>
          </div>
          <div style={{ fontSize:9, color:"#bbb", whiteSpace:"nowrap" }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── ACCOUNT CARD ─────────────────────────────────────────────────────────────
function AccountCard({ acc, balance, onClick }) {
  return (
    <div onClick={onClick} style={{ background:`linear-gradient(135deg,${acc.color},${acc.color}99)`, borderRadius:18, padding:"20px 22px", color:"#fff", cursor:"pointer", position:"relative", overflow:"hidden", boxShadow:`0 4px 20px ${acc.color}44` }}>
      <div style={{ position:"absolute", top:-15, right:-15, width:80, height:80, background:"#ffffff12", borderRadius:"50%" }}/>
      <div style={{ position:"absolute", bottom:-20, right:20, width:50, height:50, background:"#ffffff08", borderRadius:"50%" }}/>
      <div style={{ fontSize:24, marginBottom:8 }}>{acc.icon}</div>
      <div style={{ fontSize:12, color:"#ffffff99", marginBottom:4 }}>{acc.name}</div>
      <div style={{ fontSize:26, fontWeight:900, letterSpacing:-0.5 }}>{acc.currency} {fmtN(balance)}</div>
      <div style={{ fontSize:11, color:"#ffffff66", marginTop:4 }}>Saldo del mese</div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const configured = SUPABASE_URL !== "https://xxxx.supabase.co" && SUPABASE_KEY !== "eyJhbGciOi...";
  if(!configured) return <NotConfigured/>;

  const [page, setPage] = useState("dashboard");
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({});
  const [filterMonth, setFilterMonth] = useState(CUR_MONTH);
  const [filterYear, setFilterYear] = useState(CUR_YEAR);
  const [filterAccount, setFilterAccount] = useState("all");
  const [fixedTab, setFixedTab] = useState("CH");
  const [quickDate, setQuickDate] = useState(TODAY);
  const [exchangeRate, setExchangeRate] = useState(1.06); // CHF→EUR default

  const showToast = (msg,ok=true) => { setToast({msg,ok}); setTimeout(()=>setToast(null),2500); };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [acc, tx, tr, cat] = await Promise.all([
        api("accounts?order=created_at").then(r=>r.json()),
        api("transactions?order=date.desc").then(r=>r.json()),
        api("transfers?order=date.desc").then(r=>r.json()),
        api("categories?order=name").then(r=>r.json()),
      ]);
      setAccounts(Array.isArray(acc)?acc:[]);
      setTransactions(Array.isArray(tx)?tx:[]);
      setTransfers(Array.isArray(tr)?tr:[]);
      setCategories(Array.isArray(cat)?cat:[]);
      // Fetch live exchange rate
      try {
        const fx = await fetch("https://api.frankfurter.app/latest?from=CHF&to=EUR");
        const fxd = await fx.json();
        if(fxd?.rates?.EUR) setExchangeRate(fxd.rates.EUR);
      } catch {}
    } catch { showToast("Errore connessione",false); }
    setLoading(false);
  }, []);

  useEffect(()=>{ loadAll(); },[loadAll]);

  const catMap = useMemo(()=>{ const m={}; categories.forEach(c=>{ m[c.id]=c; }); return m; },[categories]);
  const accMap = useMemo(()=>{ const m={}; accounts.forEach(a=>{ m[a.id]=a; }); return m; },[accounts]);

  const monthIdx = MONTHS.indexOf(filterMonth);

  // ── Fixed injected for current month ──────────────────────────────────────
  const fixedTx = useMemo(()=>transactions.filter(t=>t.is_fixed),[transactions]);
  const variableTx = useMemo(()=>transactions.filter(t=>!t.is_fixed),[transactions]);

  const fixedAsMonthly = useMemo(()=>
    fixedTx.map(t=>({ ...t,
      date:`${filterYear}-${String(monthIdx+1).padStart(2,"0")}-${String(t.recurring_day||25).padStart(2,"0")}`,
      _injected:true,
    })),[fixedTx, monthIdx, filterYear]);

  // ── Filtered variable tx for selected month ────────────────────────────────
  const filteredVar = useMemo(()=>
    variableTx.filter(t=>{
      const d=new Date(t.date);
      if(MONTHS[d.getMonth()]!==filterMonth||d.getFullYear()!==filterYear) return false;
      if(filterAccount!=="all"&&t.account_id!==filterAccount) return false;
      return true;
    }),[variableTx, filterMonth, filterYear, filterAccount]);

  const filteredAll = useMemo(()=>{
    let all=[...filteredVar,...fixedAsMonthly];
    if(filterAccount!=="all") all=all.filter(t=>t.account_id===filterAccount);
    return all.sort((a,b)=>new Date(b.date)-new Date(a.date));
  },[filteredVar, fixedAsMonthly, filterAccount]);

  const filteredTransfers = useMemo(()=>
    transfers.filter(t=>{ const d=new Date(t.date); return MONTHS[d.getMonth()]===filterMonth&&d.getFullYear()===filterYear; })
  ,[transfers, filterMonth, filterYear]);

  // ── Per-account balances ───────────────────────────────────────────────────
  const accountBalance = useCallback((accId) => {
    const acc = accMap[accId];
    if(!acc) return 0;
    const txIncome = filteredAll.filter(t=>t.account_id===accId&&t.type==="income").reduce((s,t)=>s+Number(t.amount),0);
    const txExpense = filteredAll.filter(t=>t.account_id===accId&&t.type==="expense").reduce((s,t)=>s+Number(t.amount),0);
    const txSaving = filteredAll.filter(t=>t.account_id===accId&&t.type==="saving").reduce((s,t)=>s+Number(t.amount),0);
    const trIn = filteredTransfers.filter(t=>t.to_account_id===accId).reduce((s,t)=>s+Number(t.amount_to),0);
    const trOut = filteredTransfers.filter(t=>t.from_account_id===accId).reduce((s,t)=>s+Number(t.amount_from),0);
    return Number(acc.balance_initial) + txIncome - txExpense - txSaving + trIn - trOut;
  },[filteredAll, filteredTransfers, accMap]);

  // ── Global totals ──────────────────────────────────────────────────────────
  const totalIncomeEUR = filteredAll.filter(t=>t.type==="income").reduce((s,t)=>{
    const a=accMap[t.account_id]; return s + (a?.currency==="CHF"?Number(t.amount)*exchangeRate:Number(t.amount));
  },0);
  const totalExpenseEUR = filteredAll.filter(t=>t.type==="expense").reduce((s,t)=>{
    const a=accMap[t.account_id]; return s + (a?.currency==="CHF"?Number(t.amount)*exchangeRate:Number(t.amount));
  },0);
  const totalSavingEUR = filteredAll.filter(t=>t.type==="saving").reduce((s,t)=>{
    const a=accMap[t.account_id]; return s + (a?.currency==="CHF"?Number(t.amount)*exchangeRate:Number(t.amount));
  },0);
  const balanceEUR = totalIncomeEUR - totalExpenseEUR - totalSavingEUR;

  // ── Category breakdown ─────────────────────────────────────────────────────
  const expenses = filteredAll.filter(t=>t.type==="expense");
  const catBreakdown = useMemo(()=>{
    const map={};
    expenses.forEach(t=>{ const cid=t.category_id||"none"; if(!map[cid]) map[cid]=0; map[cid]+=Number(t.amount); });
    return Object.entries(map).map(([cid,val])=>({ cid, val, cat:catMap[cid]||{name:"Altro",color:"#9ca3af",icon:"📦"} })).sort((a,b)=>b.val-a.val);
  },[expenses, catMap]);

  // ── Trend ──────────────────────────────────────────────────────────────────
  const trend = useMemo(()=>{
    const idx=MONTHS.indexOf(filterMonth);
    return Array.from({length:6},(_,i)=>{
      const mi=(idx-5+i+12)%12, m=MONTHS[mi], yr=mi>idx?filterYear-1:filterYear;
      const val=variableTx.filter(t=>{ const d=new Date(t.date); return MONTHS[d.getMonth()]===m&&d.getFullYear()===yr&&t.type==="expense"; }).reduce((s,t)=>s+Number(t.amount),0)
        + fixedTx.reduce((s,t)=>s+Number(t.amount),0);
      return { label:MONTHS_SHORT[mi], value:val };
    });
  },[variableTx, fixedTx, filterMonth, filterYear]);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const saveTx = async () => {
    if(!form.name||!form.amount||!form.date||!form.account_id) return;
    const body=JSON.stringify({ name:form.name, amount:parseFloat(form.amount), type:form.type||"expense", category_id:form.category_id||null, account_id:form.account_id, country:accMap[form.account_id]?.currency==="CHF"?"CH":"IT", date:form.date, note:form.note||"", is_fixed:false, recurring_day:null });
    if(editItem) await api(`transactions?id=eq.${editItem.id}`,{method:"PATCH",body,prefer:"return=minimal"});
    else await api("transactions",{method:"POST",body,prefer:"return=minimal"});
    showToast(editItem?"Aggiornato ✓":"Aggiunto ✓"); setModal(null); setEditItem(null); setForm({}); loadAll();
  };

  const saveFixed = async () => {
    if(!form.name||!form.amount||!form.account_id) return;
    const day=parseInt(form.recurring_day)||25;
    const body=JSON.stringify({ name:form.name, amount:parseFloat(form.amount), type:"expense", category_id:form.category_id||null, account_id:form.account_id, country:accMap[form.account_id]?.currency==="CHF"?"CH":"IT", date:`${CUR_YEAR}-${String(monthIdx+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`, note:form.note||"", is_fixed:true, recurring_day:day });
    if(editItem) await api(`transactions?id=eq.${editItem.id}`,{method:"PATCH",body,prefer:"return=minimal"});
    else await api("transactions",{method:"POST",body,prefer:"return=minimal"});
    showToast(editItem?"Aggiornato ✓":"Aggiunto ✓"); setModal(null); setEditItem(null); setForm({}); loadAll();
  };

  const saveTransfer = async () => {
    if(!form.from_account_id||!form.to_account_id||!form.amount_from||!form.date) return;
    const rate = parseFloat(form.rate||exchangeRate);
    const fromAcc = accMap[form.from_account_id];
    const toAcc = accMap[form.to_account_id];
    let amountTo;
    if(fromAcc?.currency===toAcc?.currency) amountTo=parseFloat(form.amount_from);
    else if(fromAcc?.currency==="CHF") amountTo=parseFloat(form.amount_from)*rate;
    else amountTo=parseFloat(form.amount_from)/rate;
    const body=JSON.stringify({ from_account_id:form.from_account_id, to_account_id:form.to_account_id, amount_from:parseFloat(form.amount_from), amount_to:amountTo, rate, date:form.date, note:form.note||"" });
    await api("transfers",{method:"POST",body,prefer:"return=minimal"});
    showToast("Trasferimento registrato ✓"); setModal(null); setForm({}); loadAll();
  };

  const saveAccount = async () => {
    if(!form.name||!form.currency) return;
    const body=JSON.stringify({ name:form.name, currency:form.currency, color:form.color||"#6366f1", icon:form.icon||"🏦", balance_initial:parseFloat(form.balance_initial||0) });
    if(editItem) await api(`accounts?id=eq.${editItem.id}`,{method:"PATCH",body,prefer:"return=minimal"});
    else await api("accounts",{method:"POST",body,prefer:"return=minimal"});
    showToast("Conto salvato ✓"); setModal(null); setEditItem(null); setForm({}); loadAll();
  };

  const saveCat = async () => {
    if(!form.name) return;
    const body=JSON.stringify({ name:form.name, icon:form.icon||"📦", color:form.color||"#6366f1", budget:parseFloat(form.budget||0), country:form.country||"BOTH" });
    if(editItem) await api(`categories?id=eq.${editItem.id}`,{method:"PATCH",body,prefer:"return=minimal"});
    else await api("categories",{method:"POST",body,prefer:"return=minimal"});
    showToast("Categoria salvata ✓"); setModal(null); setEditItem(null); setForm({}); loadAll();
  };

  const deleteTx = async (id) => { await api(`transactions?id=eq.${id}`,{method:"DELETE"}); showToast("Eliminato ✓"); loadAll(); };
  const deleteTransfer = async (id) => { await api(`transfers?id=eq.${id}`,{method:"DELETE"}); showToast("Eliminato ✓"); loadAll(); };
  const deleteAccount = async (id) => { await api(`accounts?id=eq.${id}`,{method:"DELETE"}); showToast("Eliminato ✓"); loadAll(); };
  const deleteCat = async (id) => { await api(`categories?id=eq.${id}`,{method:"DELETE"}); showToast("Eliminato ✓"); loadAll(); };

  const exportCSV = () => {
    const rows=[["Data","Nome","Tipo","Fisso","Categoria","Conto","Importo","Valuta","Note"]];
    filteredAll.forEach(t=>{ const acc=accMap[t.account_id]; rows.push([t.date,t.name,t.type,t.is_fixed?"Sì":"No",catMap[t.category_id]?.name||"",acc?.name||"",t.amount,acc?.currency||"",t.note||""]); });
    filteredTransfers.forEach(t=>{ rows.push([t.date,"Trasferimento","transfer","No","",`${accMap[t.from_account_id]?.name}→${accMap[t.to_account_id]?.name}`,t.amount_from,accMap[t.from_account_id]?.currency||"",t.note||""]); });
    const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([rows.map(r=>r.join(";")).join("\n")],{type:"text/csv"}));
    a.download=`finanza_${filterMonth}_${filterYear}.csv`; a.click(); showToast("Export completato ✓");
  };

  if(loading) return (
    <div style={{ minHeight:"100vh", background:"#f8f9fc", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12, fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ width:40, height:40, border:"3px solid #eee", borderTop:"3px solid #6366f1", borderRadius:"50%", animation:"spin 1s linear infinite" }}/>
      <div style={{ color:"#bbb", fontSize:13 }}>Caricamento...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const navItems=[{id:"dashboard",icon:"⊞",label:"Home"},{id:"transactions",icon:"↕",label:"Movimenti"},{id:"fixed",icon:"📌",label:"Fisso"},{id:"reports",icon:"◑",label:"Report"},{id:"settings",icon:"⚙",label:"Impost."}];
  const selStyle={ border:"1.5px solid #eee", borderRadius:8, padding:"6px 26px 6px 10px", fontSize:12, color:"#1a1a2e", background:"#fff", cursor:"pointer", appearance:"none", backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%23999' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat:"no-repeat", backgroundPosition:"right 8px center" };

  return (
    <div style={{ minHeight:"100vh", background:"#f8f9fc", fontFamily:"'Segoe UI',system-ui,sans-serif", paddingBottom:90 }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        .card{animation:fadeUp .25s ease both}
        input:focus,select:focus{outline:none;border-color:#6366f1!important;box-shadow:0 0 0 3px #6366f122}
        button:active{transform:scale(.97)}
        ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:#ddd;border-radius:4px}
      `}</style>

      {toast&&<Toast {...toast}/>}

      {/* Top bar */}
      <div style={{ background:"#fff", borderBottom:"1px solid #f0f0f0", padding:"14px 18px", position:"sticky", top:0, zIndex:100, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontSize:17, fontWeight:800, color:"#1a1a2e" }}>💼 Finanza</div>
          <div style={{ fontSize:11, color:"#bbb" }}>{filterMonth} {filterYear} · 1 CHF = {fmtN(exchangeRate,4)} €</div>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          <select value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} style={selStyle}>
            {MONTHS.map(m=><option key={m}>{m}</option>)}
          </select>
          <select value={filterYear} onChange={e=>setFilterYear(Number(e.target.value))} style={selStyle}>
            {[CUR_YEAR-1,CUR_YEAR,CUR_YEAR+1].map(y=><option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div style={{ padding:"16px", maxWidth:640, margin:"0 auto" }}>

        {/* ── DASHBOARD ─────────────────────────────────────────────────── */}
        {page==="dashboard"&&(
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

            {/* Account cards */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {accounts.map(acc=>(
                <AccountCard key={acc.id} acc={acc} balance={accountBalance(acc.id)}/>
              ))}
            </div>

            {/* Global balance EUR */}
            <div className="card" style={{ background:"linear-gradient(135deg,#1a1a2e,#16213e)", borderRadius:20, padding:"20px 22px", color:"#fff", position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:-20, right:-20, width:100, height:100, background:"#ffffff06", borderRadius:"50%" }}/>
              <div style={{ fontSize:11, color:"#ffffff66", letterSpacing:1.5, marginBottom:6 }}>SALDO NETTO {filterMonth.toUpperCase()} (in €)</div>
              <div style={{ fontSize:34, fontWeight:900, letterSpacing:-1 }}>{balanceEUR>=0?"+":""}{fmtN(balanceEUR)} €</div>
              <div style={{ display:"flex", gap:16, marginTop:12 }}>
                {[{l:"Entrate",v:totalIncomeEUR,c:"#34d399"},{l:"Uscite",v:totalExpenseEUR,c:"#f87171"},{l:"Risparmi",v:totalSavingEUR,c:"#818cf8"}].map(k=>(
                  <div key={k.l}>
                    <div style={{ fontSize:10, color:"#ffffff55" }}>{k.l}</div>
                    <div style={{ fontSize:14, fontWeight:700, color:k.c }}>{fmtN(k.v)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick add daily expense */}
            <div className="card" style={{ background:"#fff", borderRadius:18, padding:18, boxShadow:"0 2px 12px #0001" }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e", marginBottom:14 }}>⚡ Inserimento Rapido</div>
              <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                <Inp type="date" value={quickDate} onChange={e=>setQuickDate(e.target.value)} style={{ flex:1 }}/>
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {categories.slice(0,6).map(cat=>(
                  <button key={cat.id} onClick={()=>{ setForm({ type:"expense", date:quickDate, category_id:cat.id, account_id:accounts.find(a=>a.currency==="EUR")?.id||accounts[0]?.id }); setModal("quick"); }}
                    style={{ background:cat.color+"18", border:`1.5px solid ${cat.color}44`, borderRadius:10, padding:"8px 12px", fontSize:12, color:cat.color, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
                    {cat.icon} {cat.name}
                  </button>
                ))}
                <button onClick={()=>{ setForm({type:"expense",date:quickDate,account_id:accounts[0]?.id}); setModal("tx"); }}
                  style={{ background:"#f5f5f5", border:"1.5px solid #eee", borderRadius:10, padding:"8px 12px", fontSize:12, color:"#999", fontWeight:600, cursor:"pointer" }}>
                  + Altro
                </button>
              </div>
            </div>

            {/* Transfers */}
            {filteredTransfers.length>0&&(
              <div className="card" style={{ background:"#fff", borderRadius:18, padding:18, boxShadow:"0 2px 12px #0001" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e" }}>🔄 Trasferimenti</div>
                  <button onClick={()=>{ setForm({date:TODAY,from_account_id:accounts[0]?.id,to_account_id:accounts[1]?.id,rate:exchangeRate}); setModal("transfer"); }}
                    style={{ fontSize:12, color:"#6366f1", background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>+ Nuovo</button>
                </div>
                {filteredTransfers.map(t=>(
                  <div key={t.id} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                    <div style={{ fontSize:20 }}>🔄</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:"#1a1a2e" }}>
                        {accMap[t.from_account_id]?.name} → {accMap[t.to_account_id]?.name}
                      </div>
                      <div style={{ fontSize:11, color:"#bbb" }}>{t.date} · tasso {fmtN(t.rate,4)}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e" }}>{accMap[t.from_account_id]?.currency} {fmtN(t.amount_from)}</div>
                      <div style={{ fontSize:11, color:"#bbb" }}>→ {accMap[t.to_account_id]?.currency} {fmtN(t.amount_to)}</div>
                    </div>
                    <button onClick={()=>deleteTransfer(t.id)} style={{ background:"#fff0f0", border:"none", borderRadius:6, width:28, height:28, cursor:"pointer", fontSize:13, flexShrink:0 }}>🗑</button>
                  </div>
                ))}
              </div>
            )}

            {/* Category donut */}
            {catBreakdown.length>0&&(
              <div className="card" style={{ background:"#fff", borderRadius:20, padding:20, boxShadow:"0 2px 12px #0001" }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e", marginBottom:16 }}>Spese per Categoria</div>
                <div style={{ display:"flex", alignItems:"center", gap:20, flexWrap:"wrap" }}>
                  <DonutChart data={catBreakdown.map(c=>({value:c.val,color:c.cat.color}))} size={150} centerLabel="Uscite" centerValue={`${fmtN(expenses.reduce((s,t)=>s+Number(t.amount),0))}`}/>
                  <div style={{ flex:1, minWidth:130 }}>
                    {catBreakdown.slice(0,7).map(c=>(
                      <div key={c.cid} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                          <div style={{ width:9, height:9, borderRadius:3, background:c.cat.color, flexShrink:0 }}/>
                          <span style={{ fontSize:12, color:"#666" }}>{c.cat.icon} {c.cat.name}</span>
                        </div>
                        <span style={{ fontSize:12, fontWeight:700, color:"#1a1a2e" }}>{fmtN(c.val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Budget vs speso */}
            {catBreakdown.filter(c=>c.cat.budget>0).length>0&&(
              <div className="card" style={{ background:"#fff", borderRadius:20, padding:20, boxShadow:"0 2px 12px #0001" }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e", marginBottom:16 }}>Budget vs Speso</div>
                {catBreakdown.filter(c=>c.cat.budget>0).map(c=>{ const pct=Math.min(100,(c.val/c.cat.budget)*100),over=pct>=100; return (
                  <div key={c.cid} style={{ marginBottom:13 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                      <span style={{ fontSize:12, color:"#666" }}>{c.cat.icon} {c.cat.name}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:over?"#ef4444":"#1a1a2e" }}>{fmtN(c.val)} / {fmtN(c.cat.budget)}{over?" ⚠️":""}</span>
                    </div>
                    <div style={{ background:"#f5f5f5", borderRadius:6, height:7, overflow:"hidden" }}>
                      <div style={{ width:`${pct}%`, height:"100%", background:over?"#ef4444":c.cat.color, borderRadius:6, transition:"width .4s ease" }}/>
                    </div>
                  </div>
                ); })}
              </div>
            )}

            {/* Trend */}
            <div className="card" style={{ background:"#fff", borderRadius:20, padding:20, boxShadow:"0 2px 12px #0001" }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e", marginBottom:16 }}>Trend Ultimi 6 Mesi</div>
              <BarChart data={trend} color="#6366f1"/>
            </div>

            {/* Recent */}
            <div className="card" style={{ background:"#fff", borderRadius:20, padding:20, boxShadow:"0 2px 12px #0001" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e" }}>Ultimi Movimenti</div>
                <button onClick={()=>setPage("transactions")} style={{ fontSize:12, color:"#6366f1", background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>Vedi tutti →</button>
              </div>
              {filteredAll.slice(0,5).map(t=>{
                const cat=catMap[t.category_id]; const acc=accMap[t.account_id];
                return (
                  <div key={t.id+(t._injected?"_f":"")} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:11 }}>
                    <div style={{ width:38, height:38, borderRadius:12, background:cat?.color+"22"||"#f5f5f5", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{cat?.icon||"📦"}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:"#1a1a2e" }}>{t.name}{t.is_fixed&&<span style={{ fontSize:10, color:"#6366f1", background:"#6366f111", borderRadius:4, padding:"2px 5px", marginLeft:6 }}>📌</span>}</div>
                      <div style={{ fontSize:11, color:"#bbb" }}>{t.date} · {acc?.name||""}</div>
                    </div>
                    <div style={{ fontSize:14, fontWeight:800, color:t.type==="income"?"#10b981":t.type==="saving"?"#6366f1":"#1a1a2e" }}>
                      {t.type==="income"?"+":"-"}{acc?.currency||""} {fmtN(Math.abs(Number(t.amount)))}
                    </div>
                  </div>
                );
              })}
              {filteredAll.length===0&&<div style={{ textAlign:"center", color:"#ccc", padding:"20px 0", fontSize:13 }}>Nessun movimento per {filterMonth}</div>}
            </div>
          </div>
        )}

        {/* ── TRANSACTIONS ──────────────────────────────────────────────── */}
        {page==="transactions"&&(
          <div>
            <div style={{ display:"flex", gap:8, marginBottom:14, overflowX:"auto", paddingBottom:4 }}>
              <select value={filterAccount} onChange={e=>setFilterAccount(e.target.value)} style={{ ...selStyle, padding:"8px 26px 8px 10px" }}>
                <option value="all">Tutti i conti</option>
                {accounts.map(a=><option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
              </select>
              <button onClick={()=>{ setForm({date:TODAY,from_account_id:accounts[0]?.id,to_account_id:accounts[1]?.id,rate:exchangeRate}); setModal("transfer"); }}
                style={{ background:"#f5f5f5", border:"none", borderRadius:8, padding:"8px 12px", fontSize:12, cursor:"pointer", whiteSpace:"nowrap", color:"#666" }}>🔄 Trasferisci</button>
              <button onClick={exportCSV} style={{ background:"#f5f5f5", border:"none", borderRadius:8, padding:"8px 12px", fontSize:12, cursor:"pointer", whiteSpace:"nowrap", color:"#666" }}>⬇ CSV</button>
            </div>

            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div style={{ fontSize:13, color:"#999" }}>{filteredVar.length} movimenti</div>
              <button onClick={()=>{ setForm({date:TODAY,type:"expense",account_id:accounts[0]?.id}); setEditItem(null); setModal("tx"); }}
                style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)", border:"none", borderRadius:12, padding:"10px 18px", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", boxShadow:"0 4px 16px #6366f144" }}>+ Movimento</button>
            </div>

            {/* Transfers for month */}
            {filteredTransfers.length>0&&(
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#bbb", letterSpacing:1, marginBottom:8 }}>TRASFERIMENTI</div>
                {filteredTransfers.map(t=>(
                  <div key={t.id} className="card" style={{ background:"#fff", borderRadius:14, padding:"12px 16px", display:"flex", alignItems:"center", gap:10, marginBottom:6, boxShadow:"0 2px 6px #0001" }}>
                    <div style={{ fontSize:20 }}>🔄</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:"#1a1a2e" }}>{accMap[t.from_account_id]?.name} → {accMap[t.to_account_id]?.name}</div>
                      <div style={{ fontSize:11, color:"#bbb" }}>{t.date}{t.note&&` · ${t.note}`}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:13, fontWeight:700 }}>{accMap[t.from_account_id]?.currency} {fmtN(t.amount_from)}</div>
                      <div style={{ fontSize:11, color:"#bbb" }}>→ {accMap[t.to_account_id]?.currency} {fmtN(t.amount_to)}</div>
                    </div>
                    <button onClick={()=>deleteTransfer(t.id)} style={{ background:"#fff0f0", border:"none", borderRadius:6, width:28, height:28, cursor:"pointer", fontSize:13 }}>🗑</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ fontSize:11, fontWeight:700, color:"#bbb", letterSpacing:1, marginBottom:8 }}>MOVIMENTI VARIABILI</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {filteredVar.length===0&&<div style={{ textAlign:"center", color:"#ccc", padding:"50px 0", fontSize:13 }}>Nessun movimento per {filterMonth}</div>}
              {filteredVar.map(t=>{ const cat=catMap[t.category_id]; const acc=accMap[t.account_id]; return (
                <div key={t.id} className="card" style={{ background:"#fff", borderRadius:16, padding:"14px 16px", display:"flex", alignItems:"center", gap:12, boxShadow:"0 2px 8px #0001" }}>
                  <div style={{ width:42, height:42, borderRadius:13, background:cat?.color+"22"||"#f5f5f5", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{cat?.icon||"📦"}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:600, color:"#1a1a2e" }}>{t.name}</div>
                    <div style={{ fontSize:11, color:"#bbb" }}>{t.date} · {cat?.name||"Altro"} · {acc?.name||""}</div>
                    {t.note&&<div style={{ fontSize:11, color:"#bbb" }}>{t.note}</div>}
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <div style={{ fontSize:15, fontWeight:800, color:t.type==="income"?"#10b981":t.type==="saving"?"#6366f1":"#1a1a2e" }}>
                      {t.type==="income"?"+":"-"}{acc?.currency||""} {fmtN(Math.abs(Number(t.amount)))}
                    </div>
                    <div style={{ display:"flex", gap:6, marginTop:6, justifyContent:"flex-end" }}>
                      <button onClick={()=>{ setForm({...t}); setEditItem(t); setModal("tx"); }} style={{ background:"#f5f5f5", border:"none", borderRadius:6, width:28, height:28, cursor:"pointer", fontSize:13 }}>✏️</button>
                      <button onClick={()=>deleteTx(t.id)} style={{ background:"#fff0f0", border:"none", borderRadius:6, width:28, height:28, cursor:"pointer", fontSize:13 }}>🗑</button>
                    </div>
                  </div>
                </div>
              ); })}
            </div>
          </div>
        )}

        {/* ── FIXED ─────────────────────────────────────────────────────── */}
        {page==="fixed"&&(
          <div>
            <div className="card" style={{ background:"linear-gradient(135deg,#1a1a2e,#16213e)", borderRadius:20, padding:"20px 22px", color:"#fff", marginBottom:16 }}>
              <div style={{ fontSize:11, color:"#ffffff66", letterSpacing:1.5, marginBottom:10 }}>SPESE FISSE TOTALI / MESE</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                {accounts.map(acc=>{ const tot=fixedTx.filter(t=>t.account_id===acc.id).reduce((s,t)=>s+Number(t.amount),0); return (
                  <div key={acc.id}><div style={{ fontSize:11, color:"#ffffff55" }}>{acc.icon} {acc.name}</div><div style={{ fontSize:22, fontWeight:900, color:acc.color }}>{acc.currency} {fmtN(tot)}</div></div>
                ); })}
              </div>
            </div>

            <TabSwitch tabs={accounts.map(a=>[a.id,`${a.icon} ${a.name}`])} value={fixedTab} onChange={setFixedTab}/>

            {accounts.filter(a=>a.id===fixedTab).map(acc=>{ const accFixed=fixedTx.filter(t=>t.account_id===acc.id); const tot=accFixed.reduce((s,t)=>s+Number(t.amount),0); return (
              <div key={acc.id}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                  <div><div style={{ fontSize:12, color:"#999" }}>{accFixed.length} voci ricorrenti</div><div style={{ fontSize:17, fontWeight:800, color:acc.color }}>{acc.currency} {fmtN(tot)}</div></div>
                  <button onClick={()=>{ setForm({account_id:acc.id,recurring_day:25,type:"expense"}); setEditItem(null); setModal("fixed"); }}
                    style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)", border:"none", borderRadius:12, padding:"10px 16px", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", boxShadow:"0 4px 16px #6366f144" }}>+ Aggiungi</button>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {accFixed.map(t=>{ const cat=catMap[t.category_id]; return (
                    <div key={t.id} className="card" style={{ background:"#fff", borderRadius:16, padding:"14px 16px", display:"flex", alignItems:"center", gap:12, boxShadow:"0 2px 8px #0001" }}>
                      <div style={{ width:42, height:42, borderRadius:13, background:cat?.color+"22"||"#f0f0ff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{cat?.icon||"📌"}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:600, color:"#1a1a2e" }}>{t.name}</div>
                        <div style={{ fontSize:11, color:"#bbb" }}>Giorno <strong style={{ color:"#6366f1" }}>{t.recurring_day||25}</strong> di ogni mese{cat&&<span> · {cat.icon} {cat.name}</span>}</div>
                      </div>
                      <div style={{ textAlign:"right", flexShrink:0 }}>
                        <div style={{ fontSize:15, fontWeight:800, color:"#1a1a2e" }}>{acc.currency} {fmtN(t.amount)}</div>
                        <div style={{ display:"flex", gap:6, marginTop:6, justifyContent:"flex-end" }}>
                          <button onClick={()=>{ setForm({...t}); setEditItem(t); setModal("fixed"); }} style={{ background:"#f5f5f5", border:"none", borderRadius:6, width:28, height:28, cursor:"pointer", fontSize:13 }}>✏️</button>
                          <button onClick={()=>deleteTx(t.id)} style={{ background:"#fff0f0", border:"none", borderRadius:6, width:28, height:28, cursor:"pointer", fontSize:13 }}>🗑</button>
                        </div>
                      </div>
                    </div>
                  ); })}
                  {accFixed.length===0&&<div style={{ textAlign:"center", color:"#ccc", padding:"40px 0", fontSize:13 }}>Nessuna spesa fissa</div>}
                </div>
              </div>
            ); })}
          </div>
        )}

        {/* ── REPORTS ───────────────────────────────────────────────────── */}
        {page==="reports"&&(
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ display:"flex", justifyContent:"flex-end" }}>
              <button onClick={exportCSV} style={{ background:"#1a1a2e", border:"none", borderRadius:10, padding:"10px 16px", color:"#fff", fontSize:12, cursor:"pointer", fontWeight:600 }}>⬇ Export CSV</button>
            </div>

            {/* Per-account summary */}
            {accounts.map(acc=>{ const inc=filteredAll.filter(t=>t.account_id===acc.id&&t.type==="income").reduce((s,t)=>s+Number(t.amount),0); const exp=filteredAll.filter(t=>t.account_id===acc.id&&t.type==="expense").reduce((s,t)=>s+Number(t.amount),0); const sav=filteredAll.filter(t=>t.account_id===acc.id&&t.type==="saving").reduce((s,t)=>s+Number(t.amount),0); const bal=inc-exp-sav; return (
              <div key={acc.id} className="card" style={{ background:"#fff", borderRadius:18, padding:20, boxShadow:"0 2px 12px #0001", borderLeft:`4px solid ${acc.color}` }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e", marginBottom:14 }}>{acc.icon} {acc.name} ({acc.currency})</div>
                {[{l:"Entrate",v:inc,c:"#10b981"},{l:"Spese Fisse",v:fixedTx.filter(t=>t.account_id===acc.id).reduce((s,t)=>s+Number(t.amount),0),c:"#6366f1"},{l:"Spese Variabili",v:filteredVar.filter(t=>t.account_id===acc.id&&t.type==="expense").reduce((s,t)=>s+Number(t.amount),0),c:"#f59e0b"},{l:"Risparmi",v:sav,c:"#8b5cf6"},{l:"Saldo Netto",v:bal,c:bal>=0?"#10b981":"#ef4444"}].map(r=>(
                  <div key={r.l} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:"1px solid #f5f5f5" }}>
                    <span style={{ fontSize:13, color:"#666" }}>{r.l}</span>
                    <span style={{ fontSize:14, fontWeight:800, color:r.c }}>{r.v>=0?"+":""}{acc.currency} {fmtN(r.v)}</span>
                  </div>
                ))}
              </div>
            ); })}

            {/* Conversione */}
            <div className="card" style={{ background:"#fff", borderRadius:18, padding:20, boxShadow:"0 2px 12px #0001" }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e", marginBottom:14 }}>🔄 Tasso di Cambio Live</div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:13, color:"#666" }}>1 CHF =</span>
                <span style={{ fontSize:18, fontWeight:800, color:"#6366f1" }}>{fmtN(exchangeRate,4)} €</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8 }}>
                <span style={{ fontSize:13, color:"#666" }}>Totale CHF in €</span>
                <span style={{ fontSize:14, fontWeight:700, color:"#1a1a2e" }}>
                  {fmtN(filteredAll.filter(t=>accMap[t.account_id]?.currency==="CHF"&&t.type==="expense").reduce((s,t)=>s+Number(t.amount),0)*exchangeRate)} €
                </span>
              </div>
            </div>

            {/* Distribuzione */}
            <div className="card" style={{ background:"#fff", borderRadius:20, padding:20, boxShadow:"0 2px 12px #0001" }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e", marginBottom:16 }}>Distribuzione Spese</div>
              <div style={{ display:"flex", justifyContent:"center", marginBottom:20 }}>
                <DonutChart data={catBreakdown.map(c=>({value:c.val,color:c.cat.color}))} size={200} centerLabel="Totale" centerValue={fmtN(expenses.reduce((s,t)=>s+Number(t.amount),0))}/>
              </div>
              {catBreakdown.map(c=>(
                <div key={c.cid} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}><div style={{ width:12, height:12, borderRadius:4, background:c.cat.color }}/><span style={{ fontSize:13, color:"#666" }}>{c.cat.icon} {c.cat.name}</span></div>
                  <div><span style={{ fontSize:13, fontWeight:700 }}>{fmtN(c.val)}</span><span style={{ fontSize:11, color:"#bbb", marginLeft:6 }}>({expenses.reduce((s,t)=>s+Number(t.amount),0)>0?((c.val/expenses.reduce((s,t)=>s+Number(t.amount),0))*100).toFixed(0):0}%)</span></div>
                </div>
              ))}
            </div>

            {/* Trend */}
            <div className="card" style={{ background:"#fff", borderRadius:20, padding:20, boxShadow:"0 2px 12px #0001" }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e", marginBottom:16 }}>Trend Ultimi 6 Mesi</div>
              <BarChart data={trend} color="#6366f1"/>
              <div style={{ marginTop:16 }}>
                {trend.map(d=>(<div key={d.label} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #f5f5f5" }}><span style={{ fontSize:12, color:"#999" }}>{d.label}</span><span style={{ fontSize:12, fontWeight:700 }}>{fmtN(d.value)}</span></div>))}
              </div>
            </div>

            {/* Budget */}
            <div className="card" style={{ background:"#fff", borderRadius:20, padding:20, boxShadow:"0 2px 12px #0001" }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e", marginBottom:16 }}>Budget vs Speso</div>
              {categories.filter(c=>c.budget>0).map(cat=>{ const spent=expenses.filter(t=>t.category_id===cat.id).reduce((s,t)=>s+Number(t.amount),0),pct=Math.min(100,(spent/cat.budget)*100),over=spent>cat.budget; return (
                <div key={cat.id} style={{ marginBottom:16 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}><span style={{ fontSize:13, fontWeight:600 }}>{cat.icon} {cat.name}</span><span style={{ fontSize:12, fontWeight:700, color:over?"#ef4444":"#666" }}>{fmtN(spent)} / {fmtN(cat.budget)} €{over?" ⚠️":""}</span></div>
                  <div style={{ background:"#f5f5f5", borderRadius:8, height:10, overflow:"hidden" }}><div style={{ width:`${pct}%`, height:"100%", background:over?"#ef4444":cat.color, borderRadius:8 }}/></div>
                  <div style={{ fontSize:11, color:"#bbb", marginTop:4 }}>Rimasto: {fmtN(Math.max(0,cat.budget-spent))} €</div>
                </div>
              ); })}
            </div>
          </div>
        )}

        {/* ── SETTINGS ──────────────────────────────────────────────────── */}
        {page==="settings"&&(
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

            {/* Conti */}
            <div className="card" style={{ background:"#fff", borderRadius:18, padding:18, boxShadow:"0 2px 12px #0001" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e" }}>🏦 Conti</div>
                <button onClick={()=>{ setForm({currency:"EUR",color:"#6366f1",icon:"🏦"}); setEditItem(null); setModal("account"); }}
                  style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)", border:"none", borderRadius:10, padding:"8px 14px", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer" }}>+ Conto</button>
              </div>
              {accounts.map(acc=>(
                <div key={acc.id} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10, padding:"12px 14px", background:"#f8f9fc", borderRadius:12 }}>
                  <div style={{ width:40, height:40, borderRadius:12, background:acc.color+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{acc.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:600, color:"#1a1a2e" }}>{acc.name}</div>
                    <div style={{ fontSize:11, color:"#bbb" }}>{acc.currency} · Saldo iniziale: {fmtN(acc.balance_initial)}</div>
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={()=>{ setForm({...acc}); setEditItem(acc); setModal("account"); }} style={{ background:"#fff", border:"none", borderRadius:6, width:30, height:30, cursor:"pointer", fontSize:14 }}>✏️</button>
                    <button onClick={()=>deleteAccount(acc.id)} style={{ background:"#fff0f0", border:"none", borderRadius:6, width:30, height:30, cursor:"pointer", fontSize:14 }}>🗑</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Categorie */}
            <div className="card" style={{ background:"#fff", borderRadius:18, padding:18, boxShadow:"0 2px 12px #0001" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e" }}>🏷️ Categorie</div>
                <button onClick={()=>{ setForm({color:"#6366f1",icon:"📦",country:"BOTH"}); setEditItem(null); setModal("cat"); }}
                  style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)", border:"none", borderRadius:10, padding:"8px 14px", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer" }}>+ Categoria</button>
              </div>
              {categories.map(cat=>{ const spent=expenses.filter(t=>t.category_id===cat.id).reduce((s,t)=>s+Number(t.amount),0); return (
                <div key={cat.id} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8, padding:"10px 14px", background:"#f8f9fc", borderRadius:12 }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:cat.color+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{cat.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:"#1a1a2e" }}>{cat.name}</div>
                    <div style={{ fontSize:11, color:"#bbb" }}>Budget: {cat.budget>0?`${fmtN(cat.budget)} €`:"—"} · Speso: {fmtN(spent)}</div>
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={()=>{ setForm({...cat}); setEditItem(cat); setModal("cat"); }} style={{ background:"#fff", border:"none", borderRadius:6, width:28, height:28, cursor:"pointer", fontSize:13 }}>✏️</button>
                    <button onClick={()=>deleteCat(cat.id)} style={{ background:"#fff0f0", border:"none", borderRadius:6, width:28, height:28, cursor:"pointer", fontSize:13 }}>🗑</button>
                  </div>
                </div>
              ); })}
            </div>

            {/* Tasso cambio manuale */}
            <div className="card" style={{ background:"#fff", borderRadius:18, padding:18, boxShadow:"0 2px 12px #0001" }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e", marginBottom:14 }}>💱 Tasso di Cambio</div>
              <div style={{ fontSize:12, color:"#999", marginBottom:10 }}>Recuperato automaticamente. Puoi sovrascriverlo manualmente.</div>
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                <Inp type="number" value={exchangeRate} onChange={e=>setExchangeRate(parseFloat(e.target.value))} style={{ flex:1 }}/>
                <span style={{ fontSize:13, color:"#999", whiteSpace:"nowrap" }}>CHF → EUR</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"#fff", borderTop:"1px solid #f0f0f0", display:"flex", zIndex:200, boxShadow:"0 -4px 20px #0001" }}>
        {navItems.map(n=>(
          <button key={n.id} onClick={()=>setPage(n.id)} style={{ flex:1, padding:"10px 0 8px", background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
            <div style={{ fontSize:18, opacity:page===n.id?1:0.3 }}>{n.icon}</div>
            <div style={{ fontSize:9, fontWeight:page===n.id?700:400, color:page===n.id?"#6366f1":"#bbb" }}>{n.label.toUpperCase()}</div>
            {page===n.id&&<div style={{ width:4, height:4, borderRadius:"50%", background:"#6366f1" }}/>}
          </button>
        ))}
      </div>

      {/* FAB */}
      {page!=="transactions"&&page!=="fixed"&&page!=="settings"&&(
        <button onClick={()=>{ setForm({date:TODAY,type:"expense",account_id:accounts[0]?.id}); setEditItem(null); setModal("tx"); }}
          style={{ position:"fixed", bottom:76, right:20, width:52, height:52, borderRadius:"50%", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", border:"none", color:"#fff", fontSize:24, cursor:"pointer", boxShadow:"0 4px 20px #6366f166", zIndex:150, display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
      )}

      {/* MODAL: Transaction */}
      {modal==="tx"&&(
        <Modal title={editItem?"Modifica Movimento":"Nuovo Movimento"} onClose={()=>{ setModal(null); setEditItem(null); setForm({}); }}>
          <Field label="TIPO">
            <div style={{ display:"flex", gap:6 }}>
              {[["expense","↓ Spesa","#ef4444"],["income","↑ Entrata","#10b981"],["saving","★ Risparmio","#6366f1"]].map(([v,l,c])=>(
                <button key={v} onClick={()=>setForm({...form,type:v})} style={{ flex:1, padding:"9px 0", border:`1.5px solid ${form.type===v?c:"#eee"}`, borderRadius:10, background:form.type===v?c+"11":"#fff", color:form.type===v?c:"#bbb", fontWeight:700, fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>{l}</button>
              ))}
            </div>
          </Field>
          <Field label="CONTO">
            <Sel value={form.account_id||""} onChange={e=>setForm({...form,account_id:e.target.value})}>
              <option value="">Seleziona conto</option>
              {accounts.map(a=><option key={a.id} value={a.id}>{a.icon} {a.name} ({a.currency})</option>)}
            </Sel>
          </Field>
          <Field label="NOME"><Inp value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Es. Dentista..."/></Field>
          <Field label={`IMPORTO (${accMap[form.account_id]?.currency||"€"})`}><Inp type="number" value={form.amount??""} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="0.00"/></Field>
          <Field label="DATA"><Inp type="date" value={form.date||TODAY} onChange={e=>setForm({...form,date:e.target.value})}/></Field>
          <Field label="CATEGORIA">
            <Sel value={form.category_id||""} onChange={e=>setForm({...form,category_id:e.target.value})}>
              <option value="">Nessuna categoria</option>
              {categories.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </Sel>
          </Field>
          <Field label="NOTE"><Inp value={form.note||""} onChange={e=>setForm({...form,note:e.target.value})} placeholder="Opzionale..."/></Field>
          <PrimaryBtn onClick={saveTx} label={editItem?"Salva modifiche":"Aggiungi movimento"}/>
        </Modal>
      )}

      {/* MODAL: Quick add */}
      {modal==="quick"&&(
        <Modal title={`${catMap[form.category_id]?.icon||""} ${catMap[form.category_id]?.name||"Spesa Rapida"}`} onClose={()=>{ setModal(null); setForm({}); }}>
          <div style={{ background:"#f8f9fc", borderRadius:12, padding:"10px 14px", marginBottom:16, fontSize:12, color:"#666" }}>
            📅 {form.date}
          </div>
          <Field label="CONTO">
            <Sel value={form.account_id||""} onChange={e=>setForm({...form,account_id:e.target.value})}>
              {accounts.map(a=><option key={a.id} value={a.id}>{a.icon} {a.name} ({a.currency})</option>)}
            </Sel>
          </Field>
          <Field label="DESCRIZIONE"><Inp value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Es. Esselunga, Cena, ..."/></Field>
          <Field label={`IMPORTO (${accMap[form.account_id]?.currency||"€"})`}><Inp type="number" value={form.amount??""} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="0.00"/></Field>
          <Field label="NOTE"><Inp value={form.note||""} onChange={e=>setForm({...form,note:e.target.value})} placeholder="Opzionale..."/></Field>
          <PrimaryBtn onClick={saveTx} label="Aggiungi ✓"/>
        </Modal>
      )}

      {/* MODAL: Fixed */}
      {modal==="fixed"&&(
        <Modal title={editItem?"Modifica Spesa Fissa":"Nuova Spesa Fissa"} onClose={()=>{ setModal(null); setEditItem(null); setForm({}); }}>
          <div style={{ background:"#f0f0ff", borderRadius:12, padding:"10px 14px", marginBottom:16, fontSize:12, color:"#6366f1" }}>📌 Si ripete automaticamente ogni mese</div>
          <Field label="CONTO">
            <Sel value={form.account_id||""} onChange={e=>setForm({...form,account_id:e.target.value})}>
              <option value="">Seleziona conto</option>
              {accounts.map(a=><option key={a.id} value={a.id}>{a.icon} {a.name} ({a.currency})</option>)}
            </Sel>
          </Field>
          <Field label="NOME"><Inp value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Es. Netflix, Affitto..."/></Field>
          <Field label={`IMPORTO (${accMap[form.account_id]?.currency||"€"})`}><Inp type="number" value={form.amount??""} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="0.00"/></Field>
          <Field label="GIORNO DEL MESE">
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <Inp type="number" value={form.recurring_day??25} onChange={e=>setForm({...form,recurring_day:Math.min(28,Math.max(1,parseInt(e.target.value)||1))})} style={{ maxWidth:100 }}/>
              <span style={{ fontSize:12, color:"#999" }}>di ogni mese (1–28)</span>
            </div>
          </Field>
          <Field label="CATEGORIA">
            <Sel value={form.category_id||""} onChange={e=>setForm({...form,category_id:e.target.value})}>
              <option value="">Nessuna categoria</option>
              {categories.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </Sel>
          </Field>
          <Field label="NOTE"><Inp value={form.note||""} onChange={e=>setForm({...form,note:e.target.value})} placeholder="Opzionale..."/></Field>
          <PrimaryBtn onClick={saveFixed} label={editItem?"Salva modifiche":"Aggiungi spesa fissa"}/>
        </Modal>
      )}

      {/* MODAL: Transfer */}
      {modal==="transfer"&&(
        <Modal title="Trasferimento tra Conti" onClose={()=>{ setModal(null); setForm({}); }}>
          <div style={{ background:"#f0fff4", borderRadius:12, padding:"10px 14px", marginBottom:16, fontSize:12, color:"#10b981" }}>🔄 Il tasso di cambio viene applicato automaticamente</div>
          <Field label="DA CONTO">
            <Sel value={form.from_account_id||""} onChange={e=>setForm({...form,from_account_id:e.target.value})}>
              <option value="">Seleziona</option>
              {accounts.map(a=><option key={a.id} value={a.id}>{a.icon} {a.name} ({a.currency})</option>)}
            </Sel>
          </Field>
          <Field label="A CONTO">
            <Sel value={form.to_account_id||""} onChange={e=>setForm({...form,to_account_id:e.target.value})}>
              <option value="">Seleziona</option>
              {accounts.map(a=><option key={a.id} value={a.id}>{a.icon} {a.name} ({a.currency})</option>)}
            </Sel>
          </Field>
          <Field label={`IMPORTO (${accMap[form.from_account_id]?.currency||""})`}><Inp type="number" value={form.amount_from??""} onChange={e=>setForm({...form,amount_from:e.target.value})} placeholder="0.00"/></Field>
          {form.from_account_id&&form.to_account_id&&accMap[form.from_account_id]?.currency!==accMap[form.to_account_id]?.currency&&(
            <Field label="TASSO DI CAMBIO">
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <Inp type="number" value={form.rate??exchangeRate} onChange={e=>setForm({...form,rate:e.target.value})} style={{ flex:1 }}/>
                <span style={{ fontSize:12, color:"#999", whiteSpace:"nowrap" }}>
                  = {accMap[form.to_account_id]?.currency} {fmtN((parseFloat(form.amount_from)||0)*(parseFloat(form.rate||exchangeRate)))}
                </span>
              </div>
            </Field>
          )}
          <Field label="DATA"><Inp type="date" value={form.date||TODAY} onChange={e=>setForm({...form,date:e.target.value})}/></Field>
          <Field label="NOTE"><Inp value={form.note||""} onChange={e=>setForm({...form,note:e.target.value})} placeholder="Es. Invio mensile a moglie..."/></Field>
          <PrimaryBtn onClick={saveTransfer} label="Registra Trasferimento" color="#10b981"/>
        </Modal>
      )}

      {/* MODAL: Account */}
      {modal==="account"&&(
        <Modal title={editItem?"Modifica Conto":"Nuovo Conto"} onClose={()=>{ setModal(null); setEditItem(null); setForm({}); }}>
          <Field label="NOME CONTO"><Inp value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Es. Conto UBS, Conto Fineco..."/></Field>
          <Field label="VALUTA">
            <div style={{ display:"flex", gap:8 }}>
              {[["CHF","🇨🇭 Franco Svizzero"],["EUR","🇮🇹 Euro"]].map(([v,l])=>(
                <button key={v} onClick={()=>setForm({...form,currency:v})} style={{ flex:1, padding:"10px 0", border:`1.5px solid ${form.currency===v?"#6366f1":"#eee"}`, borderRadius:10, background:form.currency===v?"#6366f111":"#fff", color:form.currency===v?"#6366f1":"#bbb", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>{l}</button>
              ))}
            </div>
          </Field>
          <Field label="ICONA (emoji)"><Inp value={form.icon||""} onChange={e=>setForm({...form,icon:e.target.value})} placeholder="🏦"/></Field>
          <Field label="COLORE">
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <input type="color" value={form.color||"#6366f1"} onChange={e=>setForm({...form,color:e.target.value})} style={{ width:44, height:44, border:"1.5px solid #eee", borderRadius:10, padding:2, cursor:"pointer" }}/>
              <span style={{ fontSize:13, color:"#999" }}>Colore del conto</span>
            </div>
          </Field>
          <Field label="SALDO INIZIALE"><Inp type="number" value={form.balance_initial??""} onChange={e=>setForm({...form,balance_initial:e.target.value})} placeholder="0.00"/></Field>
          <PrimaryBtn onClick={saveAccount} label={editItem?"Salva modifiche":"Crea conto"}/>
        </Modal>
      )}

      {/* MODAL: Category */}
      {modal==="cat"&&(
        <Modal title={editItem?"Modifica Categoria":"Nuova Categoria"} onClose={()=>{ setModal(null); setEditItem(null); setForm({}); }}>
          <Field label="NOME"><Inp value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Es. Spesa, Svago..."/></Field>
          <Field label="ICONA (emoji)"><Inp value={form.icon||""} onChange={e=>setForm({...form,icon:e.target.value})} placeholder="📦"/></Field>
          <Field label="COLORE">
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <input type="color" value={form.color||"#6366f1"} onChange={e=>setForm({...form,color:e.target.value})} style={{ width:44, height:44, border:"1.5px solid #eee", borderRadius:10, padding:2, cursor:"pointer" }}/>
            </div>
          </Field>
          <Field label="BUDGET MENSILE €"><Inp type="number" value={form.budget??""} onChange={e=>setForm({...form,budget:e.target.value})} placeholder="0 = nessun limite"/></Field>
          <PrimaryBtn onClick={saveCat} label={editItem?"Salva":"Crea categoria"}/>
        </Modal>
      )}
    </div>
  );
}