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
const fmtN = (n) => Number(n).toLocaleString("it-IT", { minimumFractionDigits:2, maximumFractionDigits:2 });

// ─── SUPABASE API ────────────────────────────────────────────────────────────
function api(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: opts.prefer || "",
    }, ...opts,
  });
}

// ─── NOT CONFIGURED SCREEN ────────────────────────────────────────────────────
function NotConfigured() {
  return (
    <div style={{ minHeight:"100vh", background:"#f8f9fc", display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ maxWidth:380, textAlign:"center" }}>
        <div style={{ fontSize:48, marginBottom:16 }}>⚙️</div>
        <div style={{ fontSize:20, fontWeight:800, color:"#1a1a2e", marginBottom:12 }}>Credenziali mancanti</div>
        <div style={{ fontSize:14, color:"#999", lineHeight:1.7, background:"#fff", borderRadius:16, padding:20, boxShadow:"0 2px 12px #0001" }}>
          Apri <strong style={{ color:"#6366f1" }}>App.jsx</strong> in StackBlitz e sostituisci
          le prime due costanti con i tuoi valori da<br/>
          <strong>Supabase → Project Settings → API</strong>
          <div style={{ marginTop:14, background:"#f5f5f5", borderRadius:10, padding:"12px 14px", textAlign:"left", fontSize:12, fontFamily:"monospace", color:"#444" }}>
            const SUPABASE_URL = "https://xxxx.supabase.co";<br/>
            const SUPABASE_KEY = "eyJhbGciOi...";
          </div>
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

function Sel({ value, onChange, children }) {
  return <select value={value??""} onChange={onChange} style={{ width:"100%", border:"1.5px solid #eee", borderRadius:10, padding:"11px 36px 11px 14px", fontSize:14, background:"#fff", color:"#1a1a2e", cursor:"pointer", fontFamily:"inherit", boxSizing:"border-box", appearance:"none", backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23999' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat:"no-repeat", backgroundPosition:"right 14px center" }}>{children}</select>;
}

function PrimaryBtn({ onClick, label, color="#6366f1" }) {
  return <button onClick={onClick} style={{ width:"100%", padding:"13px 0", background:`linear-gradient(135deg,${color},${color}cc)`, border:"none", borderRadius:12, color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer", boxShadow:`0 4px 20px ${color}44`, fontFamily:"inherit" }}>{label}</button>;
}

function TypeToggle({ value, onChange }) {
  return (
    <div style={{ display:"flex", gap:6 }}>
      {[["expense","↓ Spesa","#ef4444"],["income","↑ Entrata","#10b981"],["saving","★ Risparmio","#6366f1"]].map(([v,l,c])=>(
        <button key={v} onClick={()=>onChange(v)} style={{ flex:1, padding:"9px 0", border:`1.5px solid ${value===v?c:"#eee"}`, borderRadius:10, background:value===v?c+"11":"#fff", color:value===v?c:"#bbb", fontWeight:700, fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>{l}</button>
      ))}
    </div>
  );
}

function CountryToggle({ value, onChange }) {
  return (
    <div style={{ display:"flex", gap:8 }}>
      {[["CH","🇨🇭 Svizzera"],["IT","🇮🇹 Italia"]].map(([v,l])=>(
        <button key={v} onClick={()=>onChange(v)} style={{ flex:1, padding:"10px 0", border:`1.5px solid ${value===v?"#6366f1":"#eee"}`, borderRadius:10, background:value===v?"#6366f111":"#fff", color:value===v?"#6366f1":"#bbb", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>{l}</button>
      ))}
    </div>
  );
}

// ─── CHARTS ──────────────────────────────────────────────────────────────────
function DonutChart({ data, size=180 }) {
  const total = data.reduce((s,d)=>s+d.value,0);
  if(!total) return <div style={{ width:size, height:size, borderRadius:"50%", background:"#f5f5f5", display:"flex", alignItems:"center", justifyContent:"center", color:"#ccc", fontSize:12 }}>Nessun dato</div>;
  let cum=0; const r=size/2-10, cx=size/2, cy=size/2;
  const slices=data.map(d=>{ const pct=d.value/total, s=cum*2*Math.PI-Math.PI/2; cum+=pct; const e=cum*2*Math.PI-Math.PI/2; return { ...d, path:`M ${cx} ${cy} L ${cx+r*Math.cos(s)} ${cy+r*Math.sin(s)} A ${r} ${r} 0 ${pct>.5?1:0} 1 ${cx+r*Math.cos(e)} ${cy+r*Math.sin(e)} Z` }; });
  return (
    <svg width={size} height={size}>
      {slices.map((s,i)=><path key={i} d={s.path} fill={s.color} stroke="#fff" strokeWidth={2}/>)}
      <circle cx={cx} cy={cy} r={r*.55} fill="#fff"/>
      <text x={cx} y={cy-6} textAnchor="middle" fontSize={11} fill="#999">Totale</text>
      <text x={cx} y={cy+12} textAnchor="middle" fontSize={13} fontWeight={700} fill="#1a1a2e">{fmtN(total)}</text>
    </svg>
  );
}

function BarChart({ data, color="#6366f1" }) {
  const max=Math.max(...data.map(d=>d.value),1);
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:80 }}>
      {data.map((d,i)=>(
        <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
          <div style={{ width:"100%", background:`${color}22`, borderRadius:6, height:64, display:"flex", alignItems:"flex-end" }}>
            <div style={{ width:"100%", height:`${(d.value/max)*100}%`, background:`linear-gradient(180deg,${color},${color}99)`, borderRadius:6, transition:"height .4s ease" }}/>
          </div>
          <div style={{ fontSize:9, color:"#bbb" }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── TRANSACTION CARD ────────────────────────────────────────────────────────
function TxCard({ t, catMap, onEdit, onDelete }) {
  const cat = catMap[t.category_id];
  return (
    <div className="card" style={{ background:"#fff", borderRadius:16, padding:"14px 16px", display:"flex", alignItems:"center", gap:12, boxShadow:"0 2px 8px #0001" }}>
      <div style={{ width:42, height:42, borderRadius:13, background:cat?.color+"22"||"#f5f5f5", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{cat?.icon||"📦"}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:14, fontWeight:600, color:"#1a1a2e" }}>
          {t.name}
          {t.is_fixed&&<span style={{ fontSize:10, color:"#6366f1", background:"#6366f111", borderRadius:4, padding:"2px 5px", marginLeft:6 }}>📌</span>}
        </div>
        <div style={{ fontSize:11, color:"#bbb" }}>{t.date} · {cat?.name||"Altro"} · {t.country}</div>
        {t.note&&<div style={{ fontSize:11, color:"#bbb", marginTop:2 }}>{t.note}</div>}
      </div>
      <div style={{ textAlign:"right", flexShrink:0 }}>
        <div style={{ fontSize:15, fontWeight:800, color:t.type==="income"?"#10b981":t.type==="saving"?"#6366f1":"#1a1a2e" }}>
          {t.type==="income"?"+":"-"}{fmtN(Math.abs(Number(t.amount)))}
        </div>
        <div style={{ display:"flex", gap:6, marginTop:6, justifyContent:"flex-end" }}>
          <button onClick={()=>onEdit(t)} style={{ background:"#f5f5f5", border:"none", borderRadius:6, width:28, height:28, cursor:"pointer", fontSize:13 }}>✏️</button>
          <button onClick={()=>onDelete(t.id)} style={{ background:"#fff0f0", border:"none", borderRadius:6, width:28, height:28, cursor:"pointer", fontSize:13 }}>🗑</button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const configured = SUPABASE_URL !== "https://xxxx.supabase.co" && SUPABASE_KEY !== "eyJhbGciOi...";
  if (!configured) return <NotConfigured />;

  const [page, setPage] = useState("dashboard");
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({});
  const [filterMonth, setFilterMonth] = useState(CUR_MONTH);
  const [filterYear, setFilterYear] = useState(CUR_YEAR);
  const [filterCat, setFilterCat] = useState("all");
  const [filterCountry, setFilterCountry] = useState("all");
  const [fixedTab, setFixedTab] = useState("CH");

  const showToast = (msg, ok=true) => { setToast({msg,ok}); setTimeout(()=>setToast(null),2500); };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [t, c] = await Promise.all([
        api("transactions?order=date.desc").then(r=>r.json()),
        api("categories?order=name").then(r=>r.json()),
      ]);
      setTransactions(Array.isArray(t)?t:[]);
      setCategories(Array.isArray(c)?c:[]);
    } catch { showToast("Errore connessione",false); }
    setLoading(false);
  }, []);

  useEffect(()=>{ loadAll(); },[loadAll]);

  const catMap = useMemo(()=>{ const m={}; categories.forEach(c=>{ m[c.id]=c; }); return m; }, [categories]);

  // ── Split fixed vs variable ───────────────────────────────────────────────
  const fixedTx = useMemo(()=>transactions.filter(t=>t.is_fixed), [transactions]);
  const variableTx = useMemo(()=>transactions.filter(t=>!t.is_fixed), [transactions]);
  const monthIdx = MONTHS.indexOf(filterMonth);

  const fixedAsMonthly = useMemo(()=>
    fixedTx.map(t=>({ ...t,
      date:`${filterYear}-${String(monthIdx+1).padStart(2,"0")}-${String(t.recurring_day||25).padStart(2,"0")}`,
      _injected:true,
    })), [fixedTx, filterMonth, filterYear, monthIdx]);

  const filteredVar = useMemo(()=>
    variableTx.filter(t=>{
      const d=new Date(t.date);
      if(MONTHS[d.getMonth()]!==filterMonth||d.getFullYear()!==filterYear) return false;
      if(filterCat!=="all"&&t.category_id!==filterCat) return false;
      if(filterCountry!=="all"&&t.country!==filterCountry) return false;
      return true;
    }), [variableTx, filterMonth, filterYear, filterCat, filterCountry]);

  const filteredAll = useMemo(()=>{
    let all=[...filteredVar,...fixedAsMonthly];
    if(filterCountry!=="all") all=all.filter(t=>t.country===filterCountry);
    return all.sort((a,b)=>new Date(b.date)-new Date(a.date));
  }, [filteredVar, fixedAsMonthly, filterCountry]);

  const expenses = filteredAll.filter(t=>t.type==="expense");
  const incomes  = filteredAll.filter(t=>t.type==="income");
  const savings  = filteredAll.filter(t=>t.type==="saving");
  const totalExpenses = expenses.reduce((s,t)=>s+Number(t.amount),0);
  const totalIncome   = incomes.reduce((s,t)=>s+Number(t.amount),0);
  const totalSavings  = savings.reduce((s,t)=>s+Number(t.amount),0);
  const balance = totalIncome - totalExpenses - totalSavings;

  const fixedCH = fixedTx.filter(t=>t.country==="CH");
  const fixedIT = fixedTx.filter(t=>t.country==="IT");
  const totalFixedCH = fixedCH.reduce((s,t)=>s+Number(t.amount),0);
  const totalFixedIT = fixedIT.reduce((s,t)=>s+Number(t.amount),0);

  const catBreakdown = useMemo(()=>{
    const map={};
    expenses.forEach(t=>{ const cid=t.category_id||"none"; if(!map[cid]) map[cid]=0; map[cid]+=Number(t.amount); });
    return Object.entries(map).map(([cid,val])=>({ cid, val, cat:catMap[cid]||{name:"Altro",color:"#9ca3af",icon:"📦"} })).sort((a,b)=>b.val-a.val);
  }, [expenses, catMap]);

  const trend = useMemo(()=>{
    const idx=MONTHS.indexOf(filterMonth);
    return Array.from({length:6},(_,i)=>{
      const mi=(idx-5+i+12)%12, m=MONTHS[mi], yr=mi>idx?filterYear-1:filterYear;
      const varVal=variableTx.filter(t=>{ const d=new Date(t.date); return MONTHS[d.getMonth()]===m&&d.getFullYear()===yr&&t.type==="expense"; }).reduce((s,t)=>s+Number(t.amount),0);
      const fixVal=fixedTx.reduce((s,t)=>s+Number(t.amount),0);
      return { label:MONTHS_SHORT[mi], value:varVal+fixVal };
    });
  }, [variableTx, fixedTx, filterMonth, filterYear]);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const saveTransaction = async () => {
    if(!form.name||!form.amount||!form.date) return;
    const body=JSON.stringify({ name:form.name, amount:parseFloat(form.amount), type:form.type||"expense", category_id:form.category_id||null, country:form.country||"IT", date:form.date, note:form.note||"", is_fixed:false, recurring_day:null });
    if(editItem) await api(`transactions?id=eq.${editItem.id}`,{method:"PATCH",body,prefer:"return=minimal"});
    else await api("transactions",{method:"POST",body,prefer:"return=minimal"});
    showToast(editItem?"Aggiornato ✓":"Aggiunto ✓");
    setModal(null); setEditItem(null); setForm({}); loadAll();
  };

  const saveFixed = async () => {
    if(!form.name||!form.amount) return;
    const day=parseInt(form.recurring_day)||25;
    const body=JSON.stringify({ name:form.name, amount:parseFloat(form.amount), type:"expense", category_id:form.category_id||null, country:form.country||"IT", date:`${CUR_YEAR}-${String(monthIdx+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`, note:form.note||"", is_fixed:true, recurring_day:day });
    if(editItem) await api(`transactions?id=eq.${editItem.id}`,{method:"PATCH",body,prefer:"return=minimal"});
    else await api("transactions",{method:"POST",body,prefer:"return=minimal"});
    showToast(editItem?"Aggiornato ✓":"Aggiunto ✓");
    setModal(null); setEditItem(null); setForm({}); loadAll();
  };

  const deleteTx = async (id) => { await api(`transactions?id=eq.${id}`,{method:"DELETE"}); showToast("Eliminato ✓"); loadAll(); };
  const saveCat = async () => {
    if(!form.name) return;
    const body=JSON.stringify({ name:form.name, icon:form.icon||"📦", color:form.color||"#6366f1", budget:parseFloat(form.budget||0), country:form.country||"BOTH" });
    if(editItem) await api(`categories?id=eq.${editItem.id}`,{method:"PATCH",body,prefer:"return=minimal"});
    else await api("categories",{method:"POST",body,prefer:"return=minimal"});
    showToast("Categoria salvata ✓"); setModal(null); setEditItem(null); setForm({}); loadAll();
  };
  const deleteCat = async (id) => { await api(`categories?id=eq.${id}`,{method:"DELETE"}); showToast("Eliminata ✓"); loadAll(); };

  const exportCSV = () => {
    const rows=[["Data","Nome","Tipo","Fisso","Categoria","Paese","Importo","Note"]];
    filteredAll.forEach(t=>rows.push([t.date,t.name,t.type,t.is_fixed?"Sì":"No",catMap[t.category_id]?.name||"",t.country,t.amount,t.note||""]));
    const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([rows.map(r=>r.join(";")).join("\n")],{type:"text/csv"}));
    a.download=`budget_${filterMonth}_${filterYear}.csv`; a.click(); showToast("Export completato ✓");
  };

  const openEditTx = (t) => { setForm({...t}); setEditItem(t); setModal("tx"); };
  const openEditFixed = (t) => { setForm({...t}); setEditItem(t); setModal("fixed"); };
  const openEditCat = (c) => { setForm({...c}); setEditItem(c); setModal("cat"); };

  if(loading) return (
    <div style={{ minHeight:"100vh", background:"#f8f9fc", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12, fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ width:40, height:40, border:"3px solid #eee", borderTop:"3px solid #6366f1", borderRadius:"50%", animation:"spin 1s linear infinite" }}/>
      <div style={{ color:"#bbb", fontSize:13 }}>Caricamento...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const navItems=[{id:"dashboard",icon:"⊞",label:"Dashboard"},{id:"transactions",icon:"↕",label:"Movimenti"},{id:"fixed",icon:"📌",label:"Fisso"},{id:"reports",icon:"◑",label:"Report"},{id:"categories",icon:"⊛",label:"Categorie"}];
  const topSelectStyle={ border:"1.5px solid #eee", borderRadius:8, padding:"6px 26px 6px 10px", fontSize:12, color:"#1a1a2e", background:"#fff", cursor:"pointer", appearance:"none", backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%23999' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat:"no-repeat", backgroundPosition:"right 8px center" };

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
          <div style={{ fontSize:11, color:"#bbb" }}>{filterMonth} {filterYear}</div>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          <select value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} style={topSelectStyle}>
            {MONTHS.map(m=><option key={m}>{m}</option>)}
          </select>
          <select value={filterYear} onChange={e=>setFilterYear(Number(e.target.value))} style={topSelectStyle}>
            {[CUR_YEAR-1,CUR_YEAR,CUR_YEAR+1].map(y=><option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div style={{ padding:"16px", maxWidth:640, margin:"0 auto" }}>

        {/* ── DASHBOARD ─────────────────────────────────────────────────── */}
        {page==="dashboard"&&(
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div className="card" style={{ background:"linear-gradient(135deg,#1a1a2e,#2d2d5e)", borderRadius:20, padding:"24px 22px", color:"#fff", position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:-20, right:-20, width:100, height:100, background:"#ffffff08", borderRadius:"50%" }}/>
              <div style={{ fontSize:11, color:"#ffffff88", letterSpacing:1.5, marginBottom:8 }}>SALDO NETTO {filterMonth.toUpperCase()}</div>
              <div style={{ fontSize:36, fontWeight:900, letterSpacing:-1 }}>{balance>=0?"+":""}{fmtN(balance)} €</div>
              <div style={{ fontSize:12, color:"#ffffff55", marginTop:4 }}>Entrate – Uscite totali – Risparmi</div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
              {[{l:"Entrate",v:totalIncome,c:"#10b981",icon:"↑"},{l:"Uscite Tot.",v:totalExpenses,c:"#ef4444",icon:"↓"},{l:"Risparmi",v:totalSavings,c:"#6366f1",icon:"★"}].map(k=>(
                <div key={k.l} className="card" style={{ background:"#fff", borderRadius:16, padding:"14px 12px", boxShadow:"0 2px 12px #0001" }}>
                  <div style={{ fontSize:18, marginBottom:6 }}>{k.icon}</div>
                  <div style={{ fontSize:10, color:"#bbb", marginBottom:3 }}>{k.l}</div>
                  <div style={{ fontSize:15, fontWeight:800, color:k.c }}>{fmtN(k.v)}</div>
                </div>
              ))}
            </div>

            <div className="card" style={{ background:"#fff", borderRadius:18, padding:18, boxShadow:"0 2px 12px #0001" }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e", marginBottom:14 }}>📌 Spese Fisse del Mese</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {[{l:"🇨🇭 Svizzera",v:totalFixedCH,c:"#10b981",n:fixedCH.length},{l:"🇮🇹 Italia",v:totalFixedIT,c:"#3b82f6",n:fixedIT.length}].map(k=>(
                  <div key={k.l} style={{ background:"#f8f9fc", borderRadius:12, padding:"12px 14px" }}>
                    <div style={{ fontSize:12, color:"#999", marginBottom:4 }}>{k.l}</div>
                    <div style={{ fontSize:17, fontWeight:800, color:k.c }}>{fmtN(k.v)}</div>
                    <div style={{ fontSize:11, color:"#bbb", marginTop:2 }}>{k.n} voci</div>
                  </div>
                ))}
              </div>
              <button onClick={()=>setPage("fixed")} style={{ width:"100%", marginTop:12, background:"none", border:"1.5px solid #eee", borderRadius:10, padding:"9px 0", fontSize:12, color:"#6366f1", fontWeight:600, cursor:"pointer" }}>Gestisci spese fisse →</button>
            </div>

            {catBreakdown.length>0&&(
              <div className="card" style={{ background:"#fff", borderRadius:20, padding:20, boxShadow:"0 2px 12px #0001" }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e", marginBottom:16 }}>Spese per Categoria</div>
                <div style={{ display:"flex", alignItems:"center", gap:20, flexWrap:"wrap" }}>
                  <DonutChart data={catBreakdown.map(c=>({value:c.val,color:c.cat.color,label:c.cat.name}))} size={150}/>
                  <div style={{ flex:1, minWidth:130 }}>
                    {catBreakdown.slice(0,6).map(c=>(
                      <div key={c.cid} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:9 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <div style={{ width:10, height:10, borderRadius:3, background:c.cat.color }}/>
                          <span style={{ fontSize:12, color:"#666" }}>{c.cat.icon} {c.cat.name}</span>
                        </div>
                        <span style={{ fontSize:12, fontWeight:700, color:"#1a1a2e" }}>{fmtN(c.val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {catBreakdown.filter(c=>c.cat.budget>0).length>0&&(
              <div className="card" style={{ background:"#fff", borderRadius:20, padding:20, boxShadow:"0 2px 12px #0001" }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e", marginBottom:16 }}>Budget vs Speso</div>
                {catBreakdown.filter(c=>c.cat.budget>0).map(c=>{ const pct=Math.min(100,(c.val/c.cat.budget)*100),over=pct>=100; return (
                  <div key={c.cid} style={{ marginBottom:14 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                      <span style={{ fontSize:12, color:"#666" }}>{c.cat.icon} {c.cat.name}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:over?"#ef4444":"#1a1a2e" }}>{fmtN(c.val)} / {fmtN(c.cat.budget)}{over?" ⚠️":""}</span>
                    </div>
                    <div style={{ background:"#f5f5f5", borderRadius:6, height:8, overflow:"hidden" }}>
                      <div style={{ width:`${pct}%`, height:"100%", background:over?"#ef4444":c.cat.color, borderRadius:6, transition:"width .4s ease" }}/>
                    </div>
                  </div>
                ); })}
              </div>
            )}

            <div className="card" style={{ background:"#fff", borderRadius:20, padding:20, boxShadow:"0 2px 12px #0001" }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e", marginBottom:16 }}>Trend Ultimi 6 Mesi</div>
              <BarChart data={trend} color="#6366f1"/>
            </div>

            <div className="card" style={{ background:"#fff", borderRadius:20, padding:20, boxShadow:"0 2px 12px #0001" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e" }}>Ultimi Movimenti</div>
                <button onClick={()=>setPage("transactions")} style={{ fontSize:12, color:"#6366f1", background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>Vedi tutti →</button>
              </div>
              {filteredAll.slice(0,5).map(t=>(
                <div key={t.id+(t._injected?"_f":"")} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                  <div style={{ width:38, height:38, borderRadius:12, background:catMap[t.category_id]?.color+"22"||"#f5f5f5", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{catMap[t.category_id]?.icon||"📦"}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:"#1a1a2e" }}>{t.name}{t.is_fixed&&<span style={{ fontSize:10, color:"#6366f1", background:"#6366f111", borderRadius:4, padding:"2px 5px", marginLeft:6 }}>📌</span>}</div>
                    <div style={{ fontSize:11, color:"#bbb" }}>{t.date} · {catMap[t.category_id]?.name||"Altro"} · {t.country}</div>
                  </div>
                  <div style={{ fontSize:14, fontWeight:800, color:t.type==="income"?"#10b981":t.type==="saving"?"#6366f1":"#1a1a2e" }}>{t.type==="income"?"+":"-"}{fmtN(Math.abs(Number(t.amount)))}</div>
                </div>
              ))}
              {filteredAll.length===0&&<div style={{ textAlign:"center", color:"#ccc", padding:"20px 0", fontSize:13 }}>Nessun movimento per {filterMonth}</div>}
            </div>
          </div>
        )}

        {/* ── TRANSACTIONS ──────────────────────────────────────────────── */}
        {page==="transactions"&&(
          <div>
            <div style={{ display:"flex", gap:8, marginBottom:14, overflowX:"auto", paddingBottom:4 }}>
              <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{ ...topSelectStyle, padding:"8px 26px 8px 10px" }}>
                <option value="all">Tutte le cat.</option>
                {categories.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
              <select value={filterCountry} onChange={e=>setFilterCountry(e.target.value)} style={{ ...topSelectStyle, padding:"8px 26px 8px 10px" }}>
                <option value="all">CH + IT</option><option value="CH">🇨🇭 CH</option><option value="IT">🇮🇹 IT</option>
              </select>
              <button onClick={exportCSV} style={{ background:"#f5f5f5", border:"none", borderRadius:8, padding:"8px 12px", fontSize:12, cursor:"pointer", whiteSpace:"nowrap", color:"#666" }}>⬇ CSV</button>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div style={{ fontSize:13, color:"#999" }}>{filteredVar.length} movimenti variabili</div>
              <button onClick={()=>{ setForm({date:TODAY,type:"expense",country:"IT"}); setEditItem(null); setModal("tx"); }} style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)", border:"none", borderRadius:12, padding:"10px 18px", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", boxShadow:"0 4px 16px #6366f144" }}>+ Movimento</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {filteredVar.length===0&&<div style={{ textAlign:"center", color:"#ccc", padding:"60px 0", fontSize:13 }}>Nessun movimento per {filterMonth}</div>}
              {filteredVar.map(t=><TxCard key={t.id} t={t} catMap={catMap} onEdit={openEditTx} onDelete={deleteTx}/>)}
            </div>
          </div>
        )}

        {/* ── FIXED ─────────────────────────────────────────────────────── */}
        {page==="fixed"&&(
          <div>
            <div className="card" style={{ background:"linear-gradient(135deg,#1a1a2e,#2d2d5e)", borderRadius:20, padding:"20px 22px", color:"#fff", marginBottom:16 }}>
              <div style={{ fontSize:11, color:"#ffffff88", letterSpacing:1.5, marginBottom:10 }}>SPESE FISSE MENSILI TOTALI</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div><div style={{ fontSize:11, color:"#ffffff66" }}>🇨🇭 Svizzera</div><div style={{ fontSize:22, fontWeight:900, color:"#34d399" }}>CHF {fmtN(totalFixedCH)}</div></div>
                <div><div style={{ fontSize:11, color:"#ffffff66" }}>🇮🇹 Italia</div><div style={{ fontSize:22, fontWeight:900, color:"#60a5fa" }}>€ {fmtN(totalFixedIT)}</div></div>
              </div>
            </div>

            <div style={{ display:"flex", background:"#fff", borderRadius:14, padding:4, marginBottom:16, boxShadow:"0 2px 8px #0001" }}>
              {[["CH","🇨🇭 Spese Fisse CH"],["IT","🇮🇹 Spese Fisse IT"]].map(([v,l])=>(
                <button key={v} onClick={()=>setFixedTab(v)} style={{ flex:1, padding:"10px 0", border:"none", borderRadius:10, background:fixedTab===v?"linear-gradient(135deg,#6366f1,#8b5cf6)":"transparent", color:fixedTab===v?"#fff":"#bbb", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit", transition:"all .2s" }}>{l}</button>
              ))}
            </div>

            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div>
                <div style={{ fontSize:12, color:"#999" }}>{(fixedTab==="CH"?fixedCH:fixedIT).length} voci ricorrenti</div>
                <div style={{ fontSize:17, fontWeight:800, color:fixedTab==="CH"?"#10b981":"#3b82f6" }}>{fixedTab==="CH"?`CHF ${fmtN(totalFixedCH)}`:`€ ${fmtN(totalFixedIT)}`}</div>
              </div>
              <button onClick={()=>{ setForm({country:fixedTab,recurring_day:25,type:"expense"}); setEditItem(null); setModal("fixed"); }} style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)", border:"none", borderRadius:12, padding:"10px 16px", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", boxShadow:"0 4px 16px #6366f144" }}>+ Aggiungi</button>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {(fixedTab==="CH"?fixedCH:fixedIT).map(t=>{
                const cat=catMap[t.category_id];
                return (
                  <div key={t.id} className="card" style={{ background:"#fff", borderRadius:16, padding:"14px 16px", display:"flex", alignItems:"center", gap:12, boxShadow:"0 2px 8px #0001" }}>
                    <div style={{ width:42, height:42, borderRadius:13, background:cat?.color+"22"||"#f0f0ff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{cat?.icon||"📌"}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:600, color:"#1a1a2e" }}>{t.name}</div>
                      <div style={{ fontSize:11, color:"#bbb" }}>Giorno <strong style={{ color:"#6366f1" }}>{t.recurring_day||25}</strong> di ogni mese{cat&&<span> · {cat.icon} {cat.name}</span>}</div>
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      <div style={{ fontSize:15, fontWeight:800, color:"#1a1a2e" }}>{fmtN(t.amount)}</div>
                      <div style={{ display:"flex", gap:6, marginTop:6, justifyContent:"flex-end" }}>
                        <button onClick={()=>openEditFixed(t)} style={{ background:"#f5f5f5", border:"none", borderRadius:6, width:28, height:28, cursor:"pointer", fontSize:13 }}>✏️</button>
                        <button onClick={()=>deleteTx(t.id)} style={{ background:"#fff0f0", border:"none", borderRadius:6, width:28, height:28, cursor:"pointer", fontSize:13 }}>🗑</button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {(fixedTab==="CH"?fixedCH:fixedIT).length===0&&<div style={{ textAlign:"center", color:"#ccc", padding:"50px 0", fontSize:13 }}>Nessuna spesa fissa {fixedTab}</div>}
            </div>
          </div>
        )}

        {/* ── REPORTS ───────────────────────────────────────────────────── */}
        {page==="reports"&&(
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ display:"flex", justifyContent:"flex-end" }}>
              <button onClick={exportCSV} style={{ background:"#1a1a2e", border:"none", borderRadius:10, padding:"10px 16px", color:"#fff", fontSize:12, cursor:"pointer", fontWeight:600 }}>⬇ Export CSV</button>
            </div>
            <div className="card" style={{ background:"#fff", borderRadius:20, padding:20, boxShadow:"0 2px 12px #0001" }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e", marginBottom:16 }}>Riepilogo {filterMonth} {filterYear}</div>
              {[{l:"Entrate",v:totalIncome,c:"#10b981"},{l:"Spese Fisse",v:fixedAsMonthly.reduce((s,t)=>s+Number(t.amount),0),c:"#6366f1"},{l:"Spese Variabili",v:filteredVar.filter(t=>t.type==="expense").reduce((s,t)=>s+Number(t.amount),0),c:"#f59e0b"},{l:"Totale Uscite",v:totalExpenses,c:"#ef4444"},{l:"Risparmi",v:totalSavings,c:"#8b5cf6"},{l:"Saldo Netto",v:balance,c:balance>=0?"#10b981":"#ef4444"}].map(r=>(
                <div key={r.l} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid #f5f5f5" }}>
                  <span style={{ fontSize:13, color:"#666" }}>{r.l}</span>
                  <span style={{ fontSize:14, fontWeight:800, color:r.c }}>{r.v>=0?"+":""}{fmtN(r.v)} €</span>
                </div>
              ))}
            </div>
            <div className="card" style={{ background:"#fff", borderRadius:20, padding:20, boxShadow:"0 2px 12px #0001" }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e", marginBottom:16 }}>Distribuzione Spese</div>
              <div style={{ display:"flex", justifyContent:"center", marginBottom:20 }}><DonutChart data={catBreakdown.map(c=>({value:c.val,color:c.cat.color,label:c.cat.name}))} size={200}/></div>
              {catBreakdown.map(c=>(
                <div key={c.cid} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}><div style={{ width:12, height:12, borderRadius:4, background:c.cat.color }}/><span style={{ fontSize:13, color:"#666" }}>{c.cat.icon} {c.cat.name}</span></div>
                  <div><span style={{ fontSize:13, fontWeight:700, color:"#1a1a2e" }}>{fmtN(c.val)} €</span><span style={{ fontSize:11, color:"#bbb", marginLeft:6 }}>({totalExpenses>0?((c.val/totalExpenses)*100).toFixed(0):0}%)</span></div>
                </div>
              ))}
            </div>
            <div className="card" style={{ background:"#fff", borderRadius:20, padding:20, boxShadow:"0 2px 12px #0001" }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e", marginBottom:16 }}>Trend Ultimi 6 Mesi</div>
              <BarChart data={trend} color="#6366f1"/>
            </div>
            <div className="card" style={{ background:"#fff", borderRadius:20, padding:20, boxShadow:"0 2px 12px #0001" }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e", marginBottom:16 }}>Budget vs Speso</div>
              {categories.filter(c=>c.budget>0).map(cat=>{ const spent=expenses.filter(t=>t.category_id===cat.id).reduce((s,t)=>s+Number(t.amount),0),pct=Math.min(100,(spent/cat.budget)*100),over=spent>cat.budget; return (
                <div key={cat.id} style={{ marginBottom:16 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}><span style={{ fontSize:13, fontWeight:600, color:"#1a1a2e" }}>{cat.icon} {cat.name}</span><span style={{ fontSize:12, fontWeight:700, color:over?"#ef4444":"#666" }}>{fmtN(spent)} / {fmtN(cat.budget)} €{over?" ⚠️":""}</span></div>
                  <div style={{ background:"#f5f5f5", borderRadius:8, height:10, overflow:"hidden" }}><div style={{ width:`${pct}%`, height:"100%", background:over?"#ef4444":cat.color, borderRadius:8 }}/></div>
                </div>
              ); })}
            </div>
            <div className="card" style={{ background:"#fff", borderRadius:20, padding:20, boxShadow:"0 2px 12px #0001" }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e", marginBottom:16 }}>🇨🇭 CH vs 🇮🇹 IT</div>
              {["CH","IT"].map(country=>{
                const exp=filteredAll.filter(t=>t.country===country&&t.type==="expense").reduce((s,t)=>s+Number(t.amount),0);
                const inc=filteredAll.filter(t=>t.country===country&&t.type==="income").reduce((s,t)=>s+Number(t.amount),0);
                const sav=filteredAll.filter(t=>t.country===country&&t.type==="saving").reduce((s,t)=>s+Number(t.amount),0);
                return (
                  <div key={country} style={{ background:"#f8f9fc", borderRadius:14, padding:16, marginBottom:10 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e", marginBottom:10 }}>{country==="CH"?"🇨🇭 Svizzera":"🇮🇹 Italia"}</div>
                    {[["Entrate",inc,"#10b981"],["Uscite",exp,"#ef4444"],["Risparmi",sav,"#6366f1"]].map(([l,v,c])=>(
                      <div key={l} style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}><span style={{ fontSize:12, color:"#999" }}>{l}</span><span style={{ fontSize:13, fontWeight:700, color:c }}>{fmtN(v)}</span></div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── CATEGORIES ────────────────────────────────────────────────── */}
        {page==="categories"&&(
          <div>
            <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:14 }}>
              <button onClick={()=>{ setForm({color:"#6366f1",icon:"📦",country:"BOTH"}); setEditItem(null); setModal("cat"); }} style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)", border:"none", borderRadius:12, padding:"10px 18px", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", boxShadow:"0 4px 16px #6366f144" }}>+ Categoria</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {categories.map(cat=>{ const spent=expenses.filter(t=>t.category_id===cat.id).reduce((s,t)=>s+Number(t.amount),0); return (
                <div key={cat.id} className="card" style={{ background:"#fff", borderRadius:16, padding:"16px 18px", display:"flex", alignItems:"center", gap:14, boxShadow:"0 2px 8px #0001" }}>
                  <div style={{ width:46, height:46, borderRadius:14, background:cat.color+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{cat.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:"#1a1a2e" }}>{cat.name}</div>
                    <div style={{ fontSize:11, color:"#bbb", marginTop:2 }}>Budget: {cat.budget>0?`${fmtN(cat.budget)} €`:"Non impostato"} · {cat.country}</div>
                    {cat.budget>0&&<div style={{ marginTop:6 }}><div style={{ background:"#f5f5f5", borderRadius:4, height:4, overflow:"hidden" }}><div style={{ width:`${Math.min(100,(spent/cat.budget)*100)}%`, height:"100%", background:cat.color, borderRadius:4 }}/></div><div style={{ fontSize:10, color:"#bbb", marginTop:3 }}>{fmtN(spent)} / {fmtN(cat.budget)} spesi</div></div>}
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={()=>openEditCat(cat)} style={{ background:"#f5f5f5", border:"none", borderRadius:8, width:32, height:32, cursor:"pointer", fontSize:14 }}>✏️</button>
                    <button onClick={()=>deleteCat(cat.id)} style={{ background:"#fff0f0", border:"none", borderRadius:8, width:32, height:32, cursor:"pointer", fontSize:14 }}>🗑</button>
                  </div>
                </div>
              ); })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"#fff", borderTop:"1px solid #f0f0f0", display:"flex", zIndex:200, boxShadow:"0 -4px 20px #0001" }}>
        {navItems.map(n=>(
          <button key={n.id} onClick={()=>setPage(n.id)} style={{ flex:1, padding:"10px 0 8px", background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
            <div style={{ fontSize:18, opacity:page===n.id?1:0.35 }}>{n.icon}</div>
            <div style={{ fontSize:9, fontWeight:page===n.id?700:400, color:page===n.id?"#6366f1":"#bbb" }}>{n.label.toUpperCase()}</div>
            {page===n.id&&<div style={{ width:4, height:4, borderRadius:"50%", background:"#6366f1" }}/>}
          </button>
        ))}
      </div>

      {/* FAB */}
      {page!=="transactions"&&page!=="fixed"&&(
        <button onClick={()=>{ setForm({date:TODAY,type:"expense",country:"IT"}); setEditItem(null); setModal("tx"); }} style={{ position:"fixed", bottom:76, right:20, width:52, height:52, borderRadius:"50%", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", border:"none", color:"#fff", fontSize:24, cursor:"pointer", boxShadow:"0 4px 20px #6366f166", zIndex:150, display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
      )}

      {/* MODAL: Variable Transaction */}
      {modal==="tx"&&(
        <Modal title={editItem?"Modifica Movimento":"Nuovo Movimento"} onClose={()=>{ setModal(null); setEditItem(null); setForm({}); }}>
          <Field label="TIPO"><TypeToggle value={form.type||"expense"} onChange={v=>setForm({...form,type:v})}/></Field>
          <Field label="NOME"><Inp value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Es. Dentista..."/></Field>
          <Field label="IMPORTO €"><Inp type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="0.00"/></Field>
          <Field label="DATA"><Inp type="date" value={form.date||TODAY} onChange={e=>setForm({...form,date:e.target.value})}/></Field>
          <Field label="CATEGORIA">
            <Sel value={form.category_id||""} onChange={e=>setForm({...form,category_id:e.target.value})}>
              <option value="">Nessuna categoria</option>
              {categories.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </Sel>
          </Field>
          <Field label="PAESE"><CountryToggle value={form.country||"IT"} onChange={v=>setForm({...form,country:v})}/></Field>
          <Field label="NOTE"><Inp value={form.note||""} onChange={e=>setForm({...form,note:e.target.value})} placeholder="Opzionale..."/></Field>
          <PrimaryBtn onClick={saveTransaction} label={editItem?"Salva modifiche":"Aggiungi movimento"}/>
        </Modal>
      )}

      {/* MODAL: Fixed Expense */}
      {modal==="fixed"&&(
        <Modal title={editItem?"Modifica Spesa Fissa":"Nuova Spesa Fissa"} onClose={()=>{ setModal(null); setEditItem(null); setForm({}); }}>
          <div style={{ background:"#f0f0ff", borderRadius:12, padding:"10px 14px", marginBottom:18, fontSize:12, color:"#6366f1" }}>📌 Si ripete automaticamente ogni mese</div>
          <Field label="NOME"><Inp value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Es. Netflix, Affitto..."/></Field>
          <Field label="IMPORTO"><Inp type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="0.00"/></Field>
          <Field label="GIORNO DEL MESE IN CUI SI RIPETE">
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <Inp type="number" value={form.recurring_day??25} onChange={e=>setForm({...form,recurring_day:Math.min(28,Math.max(1,parseInt(e.target.value)||1))})} placeholder="25" style={{ maxWidth:100 }}/>
              <span style={{ fontSize:12, color:"#999" }}>di ogni mese (1–28)</span>
            </div>
          </Field>
          <Field label="CATEGORIA">
            <Sel value={form.category_id||""} onChange={e=>setForm({...form,category_id:e.target.value})}>
              <option value="">Nessuna categoria</option>
              {categories.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </Sel>
          </Field>
          <Field label="PAESE"><CountryToggle value={form.country||"IT"} onChange={v=>setForm({...form,country:v})}/></Field>
          <Field label="NOTE"><Inp value={form.note||""} onChange={e=>setForm({...form,note:e.target.value})} placeholder="Opzionale..."/></Field>
          <PrimaryBtn onClick={saveFixed} label={editItem?"Salva modifiche":"Aggiungi spesa fissa"}/>
        </Modal>
      )}

      {/* MODAL: Category */}
      {modal==="cat"&&(
        <Modal title={editItem?"Modifica Categoria":"Nuova Categoria"} onClose={()=>{ setModal(null); setEditItem(null); setForm({}); }}>
          <Field label="NOME"><Inp value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Es. Casa, Salute..."/></Field>
          <Field label="ICONA (emoji)"><Inp value={form.icon||""} onChange={e=>setForm({...form,icon:e.target.value})} placeholder="📦"/></Field>
          <Field label="COLORE">
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <input type="color" value={form.color||"#6366f1"} onChange={e=>setForm({...form,color:e.target.value})} style={{ width:44, height:44, border:"1.5px solid #eee", borderRadius:10, padding:2, cursor:"pointer" }}/>
              <span style={{ fontSize:13, color:"#999" }}>Scegli colore</span>
            </div>
          </Field>
          <Field label="BUDGET MENSILE €"><Inp type="number" value={form.budget} onChange={e=>setForm({...form,budget:e.target.value})} placeholder="0 = nessun limite"/></Field>
          <Field label="PAESE">
            <div style={{ display:"flex", gap:6 }}>
              {[["BOTH","CH + IT"],["CH","🇨🇭 CH"],["IT","🇮🇹 IT"]].map(([v,l])=>(
                <button key={v} onClick={()=>setForm({...form,country:v})} style={{ flex:1, padding:"9px 0", border:`1.5px solid ${form.country===v?"#6366f1":"#eee"}`, borderRadius:10, background:form.country===v?"#6366f111":"#fff", color:form.country===v?"#6366f1":"#bbb", fontWeight:700, fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>{l}</button>
              ))}
            </div>
          </Field>
          <PrimaryBtn onClick={saveCat} label={editItem?"Salva":"Crea categoria"}/>
        </Modal>
      )}
    </div>
  );
}