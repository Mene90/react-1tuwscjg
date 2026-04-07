import React, { useState, useEffect, useCallback, useMemo, createContext, useContext, useRef } from "react";
import * as XLSX from "xlsx";

// ─────────────────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://wfecmedeqgnupvjixkad.supabase.co";
const SUPABASE_KEY = "sb_publishable_pLRwZPPJVbQzAXllZcPszw_x1CblPEM";
// ─────────────────────────────────────────────────────────────────────────────

const MONTHS = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const MONTHS_SHORT = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];
const TODAY = new Date().toISOString().split("T")[0];
const CUR_MONTH = MONTHS[new Date().getMonth()];
const CUR_YEAR = new Date().getFullYear();
const fmtN = (n, d=2) => Number(n||0).toLocaleString("it-IT", { minimumFractionDigits:d, maximumFractionDigits:d });

// Multi-currency support
const CURRENCIES = ["EUR","CHF","USD","GBP"];
const CURRENCY_SYMBOLS = { EUR:"€", CHF:"CHF", USD:"$", GBP:"£" };
const DEFAULT_RATES = { EUR:1, CHF:1.06, USD:0.92, GBP:1.17 }; // base EUR

// ─── ALL AVAILABLE DASHBOARD WIDGETS ─────────────────────────────────────────
const ALL_WIDGETS = [
  { id:"balance",        label:"💰 Saldo Netto",              desc:"Saldo netto del mese in EUR" },
  { id:"accounts",       label:"🏦 Conti",                    desc:"Carte con saldo per ogni conto" },
  { id:"quickadd",       label:"⚡ Inserimento Rapido",        desc:"Aggiungi spese velocemente" },
  { id:"transfer_calc",  label:"📊 Calcolatore Trasferimento", desc:"Quanto trasferire il 24 del mese" },
  { id:"donut",          label:"🥧 Torta Categorie",           desc:"Distribuzione spese per categoria" },
  { id:"budget_bars",    label:"📏 Budget vs Speso",           desc:"Avanzamento budget per categoria" },
  { id:"trend",          label:"📈 Trend 6 Mesi",              desc:"Andamento spese negli ultimi mesi" },
  { id:"recent",         label:"🕐 Ultimi Movimenti",          desc:"Lista degli ultimi 5 movimenti" },
  { id:"savings_summary",label:"🎯 Risparmi",                  desc:"Riepilogo obiettivi di risparmio" },
  { id:"ch_it",          label:"🌍 CH vs IT",                  desc:"Confronto spese per paese" },
  { id:"mini_trend",     label:"📉 Mini Trend Inline",         desc:"Area chart entrate/uscite settimana/mese/anno" },
  { id:"forecast_widget",label:"🔮 Forecast Mensile",          desc:"Proiezione entrate/uscite fisse prossimi mesi" },
];
const DEFAULT_WIDGETS = ["balance","accounts","quickadd","donut","budget_bars","trend","recent"];

// ─── REPORT BUILDER CONFIG ────────────────────────────────────────────────────
const REPORT_CHART_TYPES = [
  {id:"bar",    label:"Bar",    icon:"📊"},
  {id:"line",   label:"Line",   icon:"📈"},
  {id:"donut",  label:"Donut",  icon:"🥧"},
  {id:"area",   label:"Area",   icon:"🌊"},
  {id:"table",  label:"Tabella",icon:"📋"},
];
const REPORT_METRICS = [
  {id:"expenses_by_cat",  label:"Spese per Categoria"},
  {id:"income_by_acc",    label:"Entrate per Conto"},
  {id:"expenses_by_acc",  label:"Uscite per Conto"},
  {id:"net_by_month",     label:"Saldo Netto per Mese"},
  {id:"expenses_trend",   label:"Trend Spese"},
  {id:"income_trend",     label:"Trend Entrate"},
  {id:"savings_progress", label:"Progressi Risparmio"},
  {id:"budget_vs_actual", label:"Budget vs Effettivo"},
  {id:"fixed_vs_variable",label:"Fisso vs Variabile"},
];
const REPORT_PERIODS = [
  {id:"this_month", label:"Questo mese"},
  {id:"last_3",     label:"Ultimi 3 mesi"},
  {id:"last_6",     label:"Ultimi 6 mesi"},
  {id:"last_12",    label:"Ultimi 12 mesi"},
  {id:"this_year",  label:"Anno in corso"},
  {id:"custom",     label:"Personalizzato"},
];

// ─── SUPABASE ─────────────────────────────────────────────────────────────────
const sb = {
  auth: {
    signUp: (email,pw,name) => fetch(`${SUPABASE_URL}/auth/v1/signup`,{method:"POST",headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},body:JSON.stringify({email,password:pw,data:{full_name:name}})}).then(r=>r.json()),
    signIn: (email,pw) => fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`,{method:"POST",headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},body:JSON.stringify({email,password:pw})}).then(r=>r.json()),
    signOut: (token) => fetch(`${SUPABASE_URL}/auth/v1/logout`,{method:"POST",headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${token}`}}),
    getUser: (token) => fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${token}`}}).then(r=>r.json()),
    refresh: (rt) => fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,{method:"POST",headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},body:JSON.stringify({refresh_token:rt})}).then(r=>r.json()),
  },
  db: (token) => (table) => ({
    get: (filter="") => fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${token}`}}).then(r=>r.json()),
    post: (data) => fetch(`${SUPABASE_URL}/rest/v1/${table}`,{method:"POST",headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${token}`,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify(data)}).then(r=>r.json()),
    patch: (data,filter) => fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`,{method:"PATCH",headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${token}`,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify(data)}),
    del: (filter) => fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`,{method:"DELETE",headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${token}`}}),
    upsert: (data) => fetch(`${SUPABASE_URL}/rest/v1/${table}`,{method:"POST",headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${token}`,"Content-Type":"application/json",Prefer:"return=minimal,resolution=merge-duplicates"},body:JSON.stringify(data)}),
  }),
};

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const T = {
  // Brand
  primary:   "#5b57ff",
  primaryDk: "#4340d4",
  primaryLt: "#ededff",
  // Semantic
  success:   "#22c55e",
  danger:    "#ef4444",
  warning:   "#f59e0b",
  info:      "#06b6d4",
  // Neutrals
  gray50:    "#f9fafb",
  gray100:   "#f3f4f6",
  gray200:   "#e5e7eb",
  gray300:   "#d1d5db",
  gray400:   "#9ca3af",
  gray500:   "#6b7280",
  gray700:   "#374151",
  gray900:   "#111827",
  // Surfaces
  bg:        "#f4f5f9",
  surface:   "#ffffff",
  sidebar:   "#0f1117",
  sidebarActive: "#1c1f2e",
};

const AuthCtx = createContext(null);
const useAuth = () => useContext(AuthCtx);

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  @keyframes spin    { to { transform:rotate(360deg) } }
  @keyframes fadeUp  { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:none } }
  @keyframes slideIn { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:none } }
  @keyframes shimmer { from { background-position:-400px 0 } to { background-position:400px 0 } }
  @keyframes pulse   { 0%,100% { opacity:1 } 50% { opacity:.5 } }
  * { box-sizing:border-box; margin:0; padding:0 }
  html,body,#root { height:100% }
  body { font-family:'Inter',system-ui,-apple-system,sans-serif; background:${T.bg}; color:${T.gray900}; -webkit-font-smoothing:antialiased }
  input,select,textarea,button { font-family:inherit }
  input:focus, select:focus, textarea:focus {
    outline:none;
    border-color:${T.primary} !important;
    box-shadow:0 0 0 3px ${T.primary}22;
  }
  button { cursor:pointer }
  button:active { transform:scale(.97) }
  ::-webkit-scrollbar { width:5px; height:5px }
  ::-webkit-scrollbar-thumb { background:${T.gray200}; border-radius:10px }
  ::-webkit-scrollbar-track { background:transparent }
  .widget { animation:fadeUp .2s ease both }
  .skeleton {
    background: linear-gradient(90deg,${T.gray100} 25%,${T.gray200} 50%,${T.gray100} 75%);
    background-size:800px 100%;
    animation:shimmer 1.4s infinite linear;
    border-radius:8px;
  }
  a { color:${T.primary}; text-decoration:none }
  ::selection { background:${T.primary}33 }
`;


// ─── EMOJI PICKER DATA ────────────────────────────────────────────────────────
const EMOJI_GROUPS = {
  "💰 Finance":  ["💰","💵","💶","💷","💴","💳","🏦","📈","📉","💹","🪙","💸","🤑","🏧"],
  "🏠 Casa":     ["🏠","🏡","🏢","🏗","🛋","🪟","🚪","🛏","🛁","🪴","💡","🔌","🔧","🪣"],
  "🚗 Trasporti":["🚗","🚕","🚙","🏎","🚓","🚑","✈️","🚂","🚢","🛵","🚲","⛽","🅿️","🗺"],
  "🍕 Cibo":     ["🍕","🍔","🍟","🍣","🍜","🍝","🥗","🥩","🍱","☕","🍷","🍺","🛒","🥦"],
  "🏥 Salute":   ["🏥","💊","💉","🩺","🦷","👓","🏃","🧘","⚽","🎾","🏊","🚴","🧬","🩻"],
  "🎓 Istruzione":["🎓","📚","✏️","📖","🖊","🎒","🏫","🔬","🧮","💻","📐","📏","🗒","🎨"],
  "🎮 Svago":    ["🎮","🎬","🎵","🎭","🎪","🎯","🎲","🎻","🎸","📺","📱","🎧","🎠","🎡"],
  "👨‍👩‍👧 Famiglia": ["👨‍👩‍👧","👶","🧒","👦","👧","🐕","🐈","🎁","🎂","💝","🧸","🛺","🪀","🪆"],
  "⚡ Altro":    ["⚡","🔔","📌","📍","🔑","🗝","🧲","🔒","⚙️","🛠","📦","🗑","🔄","✅"],
};

const COLOR_PALETTE = [
  "#ef4444","#f97316","#f59e0b","#eab308","#84cc16","#22c55e","#10b981","#14b8a6",
  "#06b6d4","#3b82f6","#6366f1","#8b5cf6","#a855f7","#ec4899","#f43f5e","#64748b",
  "#1a1a2e","#0f172a","#7c3aed","#059669","#d97706","#dc2626","#2563eb","#9ca3af",
];

// ─── EMOJI PICKER COMPONENT ───────────────────────────────────────────────────
const EmojiPicker = React.memo(({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState(Object.keys(EMOJI_GROUPS)[0]);
  return (
    <div style={{ position:"relative" }}>
      <div style={{ display:"flex", gap:10, alignItems:"center" }}>
        <button type="button" onClick={() => setOpen(o => !o)}
          style={{ width:52, height:52, fontSize:26, borderRadius:12, border:"1.5px solid #eee", background:"#f8f9fc", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
          {value || "📦"}
        </button>
        <div style={{ fontSize:12, color:"#999" }}>Clicca per cambiare emoji</div>
      </div>
      {open && (
        <div style={{ position:"absolute", top:60, left:0, zIndex:500, background:"#fff", borderRadius:16, boxShadow:"0 8px 40px #0002", border:"1px solid #eee", width:320, padding:16 }} onClick={e => e.stopPropagation()}>
          {/* Group tabs - scrollable */}
          <div style={{ display:"flex", gap:4, overflowX:"auto", marginBottom:12, paddingBottom:4 }}>
            {Object.keys(EMOJI_GROUPS).map(g => (
              <button key={g} onClick={() => setGroup(g)}
                style={{ whiteSpace:"nowrap", padding:"4px 10px", borderRadius:8, border:"none", background: group===g ? "#6366f1" : "#f5f5f5", color: group===g ? "#fff" : "#666", fontSize:11, cursor:"pointer", fontWeight: group===g ? 700 : 400 }}>
                {g.split(" ")[0]}
              </button>
            ))}
          </div>
          {/* Emoji grid */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4 }}>
            {EMOJI_GROUPS[group].map(e => (
              <button key={e} onClick={() => { onChange(e); setOpen(false); }}
                style={{ fontSize:22, padding:"6px 0", border:"none", background: value===e ? "#6366f111" : "transparent", borderRadius:8, cursor:"pointer", border: value===e ? "1.5px solid #6366f1" : "1.5px solid transparent" }}>
                {e}
              </button>
            ))}
          </div>
          <button onClick={() => setOpen(false)} style={{ marginTop:10, width:"100%", padding:"8px 0", background:"#f5f5f5", border:"none", borderRadius:8, fontSize:12, color:"#999", cursor:"pointer" }}>Chiudi</button>
        </div>
      )}
    </div>
  );
});

// ─── COLOR PALETTE PICKER ─────────────────────────────────────────────────────
const ColorPicker = React.memo(({ value, onChange }) => (
  <div>
    <div style={{ display:"grid", gridTemplateColumns:"repeat(8,1fr)", gap:6, marginBottom:8 }}>
      {COLOR_PALETTE.map(c => (
        <button key={c} onClick={() => onChange(c)} type="button"
          style={{ width:"100%", aspectRatio:"1", borderRadius:8, background:c, border: value===c ? "3px solid #1a1a2e" : "2px solid transparent", cursor:"pointer", boxShadow: value===c ? "0 0 0 2px #fff, 0 0 0 4px "+c : "none", transition:"all .15s" }}/>
      ))}
    </div>
    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
      <div style={{ width:32, height:32, borderRadius:8, background:value||"#6366f1", border:"1px solid #eee" }}/>
      <span style={{ fontSize:12, color:"#999" }}>{value||"#6366f1"}</span>
    </div>
  </div>
));

// ─── UI PRIMITIVES ────────────────────────────────────────────────────────────
const Toast = ({msg,ok}) => (
  <div style={{
    position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",
    background:ok?T.gray900:T.danger,
    borderRadius:12,padding:"12px 20px",fontSize:13,color:"#fff",zIndex:9999,
    animation:"fadeUp .2s ease",whiteSpace:"nowrap",
    boxShadow:"0 8px 32px #00000033",
    display:"flex",alignItems:"center",gap:8,
    backdropFilter:"blur(8px)",
  }}>
    <span>{ok?"✓":"⚠"}</span>{msg}
  </div>
);

const Modal = ({title,onClose,children,wide,noPad}) => (
  <div style={{position:"fixed",inset:0,background:"#00000055",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:1000,padding:"0 0 0 0",backdropFilter:"blur(2px)"}} onClick={onClose}>
    <div style={{
      background:T.surface,borderRadius:"24px 24px 0 0",
      padding:noPad?0:28,width:"100%",maxWidth:wide?720:500,
      maxHeight:"94vh",overflowY:"auto",
      boxShadow:"0 -4px 60px #0002",animation:"slideIn .22s ease",
    }} onClick={e=>e.stopPropagation()}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:noPad?0:22,padding:noPad?"20px 20px 0":0}}>
        <div style={{fontSize:16,fontWeight:700,color:T.gray900}}>{title}</div>
        <button onClick={onClose} style={{background:T.gray100,border:"none",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:14,color:T.gray500,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

const Card = ({children,style={},onClick,className=""}) => (
  <div className={className} onClick={onClick} style={{
    background:T.surface,borderRadius:16,padding:20,
    boxShadow:"0 1px 4px #0000000a, 0 4px 16px #0000000a",
    border:`1px solid ${T.gray100}`,
    cursor:onClick?"pointer":"default",
    transition:"box-shadow .15s, transform .15s",
    ...style
  }}>{children}</div>
);

const Field = ({label,hint,error,children}) => (
  <div style={{marginBottom:16}}>
    {label&&<div style={{fontSize:11,fontWeight:600,color:T.gray500,letterSpacing:"0.06em",marginBottom:6,textTransform:"uppercase"}}>{label}</div>}
    {children}
    {hint&&!error&&<div style={{fontSize:11,color:T.gray400,marginTop:4}}>{hint}</div>}
    {error&&<div style={{fontSize:11,color:T.danger,marginTop:4}}>⚠ {error}</div>}
  </div>
);

const Inp = React.memo(({value,onChange,type="text",placeholder,style={},autoFocus}) => (
  <input autoFocus={autoFocus} type={type} value={value??""} onChange={onChange} placeholder={placeholder}
    style={{width:"100%",border:`1.5px solid ${T.gray200}`,borderRadius:10,padding:"10px 14px",fontSize:14,color:T.gray900,background:"#fff",transition:"border-color .15s",...style}}/>
));

const Sel = React.memo(({value,onChange,children,style={}}) => (
  <select value={value??""} onChange={onChange}
    style={{width:"100%",border:`1.5px solid ${T.gray200}`,borderRadius:10,padding:"10px 36px 10px 14px",fontSize:14,background:"#fff",color:T.gray900,appearance:"none",
    backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239ca3af' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")",
    backgroundRepeat:"no-repeat",backgroundPosition:"right 12px center",transition:"border-color .15s",...style}}>
    {children}
  </select>
));

const Btn = ({onClick,label,color,outline,disabled,small,full=true,icon}) => {
  const bg = color||T.primary;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width:full?"100%":"auto",
      padding:small?"9px 16px":"12px 20px",
      background:disabled?T.gray100:outline?"transparent":`linear-gradient(135deg,${bg},${bg}dd)`,
      border:outline?`1.5px solid ${disabled?T.gray200:bg}`:"none",
      borderRadius:11,
      color:disabled?T.gray400:outline?bg:"#fff",
      fontWeight:600,fontSize:small?13:14,
      cursor:disabled?"not-allowed":"pointer",
      boxShadow:(!outline&&!disabled)?`0 2px 12px ${bg}44`:"none",
      display:"flex",alignItems:"center",justifyContent:"center",gap:6,
      transition:"all .15s",
    }}>
      {icon&&<span style={{fontSize:15}}>{icon}</span>}{label}
    </button>
  );
};

const TabSwitch = ({tabs,value,onChange}) => (
  <div style={{display:"flex",background:T.gray100,borderRadius:10,padding:3,marginBottom:16}}>
    {tabs.map(([v,l])=>(
      <button key={v} onClick={()=>onChange(v)} style={{
        flex:1,padding:"8px 0",border:"none",borderRadius:8,
        background:value===v?T.surface:"transparent",
        color:value===v?T.gray900:T.gray400,
        fontWeight:value===v?600:400,fontSize:13,cursor:"pointer",
        boxShadow:value===v?"0 1px 4px #0000000f":"none",transition:"all .15s"
      }}>{l}</button>
    ))}
  </div>
);

const Badge = ({label,color=T.primary}) => (
  <span style={{display:"inline-block",padding:"2px 8px",borderRadius:20,background:color+"18",color,fontSize:11,fontWeight:600}}>{label}</span>
);

// ─── SKELETON LOADER ──────────────────────────────────────────────────────────
const Skeleton = ({w="100%",h=16,r=8,style={}}) => (
  <div className="skeleton" style={{width:w,height:h,borderRadius:r,...style}}/>
);

const SkeletonCard = () => (
  <Card style={{display:"flex",flexDirection:"column",gap:12}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <Skeleton w={120} h={14}/>
      <Skeleton w={60} h={20} r={20}/>
    </div>
    <Skeleton w="100%" h={36} r={10}/>
    <Skeleton w="70%" h={12}/>
  </Card>
);

const SkeletonDashboard = () => (
  <div style={{display:"flex",flexDirection:"column",gap:16}}>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
      <SkeletonCard/><SkeletonCard/>
    </div>
    <Card style={{height:160,display:"flex",flexDirection:"column",gap:12}}>
      <Skeleton w={140} h={14}/><Skeleton w="100%" h={100} r={10}/>
    </Card>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
      <SkeletonCard/><SkeletonCard/><SkeletonCard/>
    </div>
  </div>
);

// ─── EMPTY STATES ─────────────────────────────────────────────────────────────
const EmptyState = ({icon,title,desc,action,actionLabel}) => (
  <div style={{textAlign:"center",padding:"48px 24px",display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
    <div style={{width:64,height:64,borderRadius:20,background:T.primaryLt,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,marginBottom:4}}>{icon}</div>
    <div style={{fontSize:15,fontWeight:700,color:T.gray900}}>{title}</div>
    <div style={{fontSize:13,color:T.gray400,maxWidth:260,lineHeight:1.6}}>{desc}</div>
    {action&&<button onClick={action} style={{marginTop:8,padding:"10px 20px",background:`linear-gradient(135deg,${T.primary},${T.primaryDk})`,border:"none",borderRadius:10,color:"#fff",fontWeight:600,fontSize:13,cursor:"pointer",boxShadow:`0 2px 12px ${T.primary}44`}}>{actionLabel}</button>}
  </div>
);

// ─── ONBOARDING WIZARD ────────────────────────────────────────────────────────
const OnboardingWizard = ({ user, token, onComplete }) => {
  const t = sb.db(token);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [acc, setAcc] = useState({ name:"Conto Principale", currency:"EUR", icon:"🏦", color:T.primary });
  const [acc2, setAcc2] = useState({ name:"", currency:"CHF", icon:"🇨🇭", color:"#10b981", enabled:false });
  const [cats] = useState([
    {name:"Casa",icon:"🏠",color:"#f59e0b"},
    {name:"Trasporti",icon:"🚗",color:"#3b82f6"},
    {name:"Cibo & Spesa",icon:"🛒",color:"#10b981"},
    {name:"Salute",icon:"🏥",color:"#ef4444"},
    {name:"Svago",icon:"🎮",color:"#8b5cf6"},
    {name:"Abbonamenti",icon:"📱",color:"#06b6d4"},
    {name:"Istruzione",icon:"🎓",color:"#f97316"},
    {name:"Famiglia",icon:"👨‍👩‍👧",color:"#ec4899"},
  ]);

  const finish = async () => {
    setSaving(true);
    try {
      // Create primary account
      await t("accounts").post({user_id:user.id,name:acc.name,currency:acc.currency,color:acc.color,icon:acc.icon,balance_initial:0});
      // Create second account if enabled
      if(acc2.enabled && acc2.name) {
        await t("accounts").post({user_id:user.id,name:acc2.name,currency:acc2.currency,color:acc2.color,icon:acc2.icon,balance_initial:0});
      }
      // Create default categories
      for(const cat of cats) {
        await t("categories").post({user_id:user.id,...cat,budget:0});
      }
      // Mark onboarded
      await t("user_preferences").upsert({user_id:user.id,dashboard_widgets:DEFAULT_WIDGETS,saved_reports:[],onboarded:true});
      onComplete();
    } catch(e) { console.error(e); }
    setSaving(false);
  };

  const steps = [
    {
      title:"Benvenuto in Fina 👋",
      desc:"Configuriamo il tuo spazio in 2 minuti. Iniziamo con i tuoi conti.",
      content:(
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div style={{background:T.gray50,borderRadius:14,padding:18}}>
            <div style={{fontSize:13,fontWeight:600,color:T.gray700,marginBottom:14}}>Conto principale</div>
            <Field label="NOME"><Inp value={acc.name} onChange={e=>setAcc(a=>({...a,name:e.target.value}))} placeholder="Es. Conto UBS, Conto Corrente..."/></Field>
            <Field label="VALUTA">
              <div style={{display:"flex",gap:8}}>
                {[["EUR","€ Euro"],["CHF","CHF Franco"],["USD","$ Dollaro"],["GBP","£ Sterlina"]].map(([v,l])=>(
                  <button key={v} onClick={()=>setAcc(a=>({...a,currency:v}))} style={{flex:1,padding:"9px 0",border:`1.5px solid ${acc.currency===v?T.primary:T.gray200}`,borderRadius:10,background:acc.currency===v?T.primaryLt:"#fff",color:acc.currency===v?T.primary:T.gray500,fontWeight:600,fontSize:12,cursor:"pointer"}}>{l}</button>
                ))}
              </div>
            </Field>
          </div>
          <div style={{background:T.gray50,borderRadius:14,padding:18}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:acc2.enabled?14:0}}>
              <div style={{fontSize:13,fontWeight:600,color:T.gray700}}>Secondo conto (opzionale)</div>
              <button onClick={()=>setAcc2(a=>({...a,enabled:!a.enabled}))} style={{padding:"5px 12px",borderRadius:8,border:`1.5px solid ${acc2.enabled?T.primary:T.gray200}`,background:acc2.enabled?T.primaryLt:"#fff",color:acc2.enabled?T.primary:T.gray500,fontSize:12,fontWeight:600}}>
                {acc2.enabled?"✓ Attivo":"+ Aggiungi"}
              </button>
            </div>
            {acc2.enabled&&(
              <div style={{marginTop:14}}>
                <Field label="NOME"><Inp value={acc2.name} onChange={e=>setAcc2(a=>({...a,name:e.target.value}))} placeholder="Es. Conto Svizzera..."/></Field>
                <Field label="VALUTA">
                  <div style={{display:"flex",gap:8}}>
                    {[["CHF","CHF"],["EUR","EUR"],["USD","USD"],["GBP","GBP"]].map(([v,l])=>(
                      <button key={v} onClick={()=>setAcc2(a=>({...a,currency:v}))} style={{flex:1,padding:"9px 0",border:`1.5px solid ${acc2.currency===v?T.primary:T.gray200}`,borderRadius:10,background:acc2.currency===v?T.primaryLt:"#fff",color:acc2.currency===v?T.primary:T.gray500,fontWeight:600,fontSize:12,cursor:"pointer"}}>{l}</button>
                    ))}
                  </div>
                </Field>
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      title:"Categorie di spesa 🏷️",
      desc:"Abbiamo preselezionato le categorie più comuni. Potrai personalizzarle in seguito.",
      content:(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {cats.map(cat=>(
              <div key={cat.name} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:cat.color+"10",borderRadius:12,border:`1px solid ${cat.color}22`}}>
                <div style={{width:32,height:32,borderRadius:10,background:cat.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{cat.icon}</div>
                <span style={{fontSize:13,fontWeight:500,color:T.gray700}}>{cat.name}</span>
              </div>
            ))}
          </div>
          <div style={{background:T.primaryLt,borderRadius:12,padding:"12px 16px",marginTop:16,fontSize:12,color:T.primary}}>
            ℹ️ Verranno create 8 categorie di default. Puoi aggiungerne altre o modificarle da Impostazioni.
          </div>
        </div>
      ),
    },
  ];

  const current = steps[step];

  return (
    <div style={{minHeight:"100vh",background:`linear-gradient(135deg,#0f1117 0%,#1c1f2e 60%,#16213e 100%)`,display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'Inter',system-ui,sans-serif"}}>
      <style>{CSS}</style>
      <div style={{width:"100%",maxWidth:520}}>
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:12,marginBottom:8}}>
            <div style={{width:40,height:40,borderRadius:12,background:`linear-gradient(135deg,${T.primary},${T.primaryDk})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>💼</div>
            <div style={{fontSize:22,fontWeight:800,color:"#fff",letterSpacing:-0.5}}>Fina</div>
          </div>
          <div style={{fontSize:12,color:"#ffffff44"}}>Il tuo budget familiare in un unico posto</div>
        </div>

        {/* Progress */}
        <div style={{display:"flex",gap:6,marginBottom:24}}>
          {steps.map((_,i)=>(
            <div key={i} style={{flex:1,height:3,borderRadius:3,background:i<=step?T.primary:"#ffffff22",transition:"background .3s"}}/>
          ))}
        </div>

        {/* Card */}
        <div style={{background:T.surface,borderRadius:24,padding:28,boxShadow:"0 20px 80px #00000044"}}>
          <div style={{fontSize:20,fontWeight:800,color:T.gray900,marginBottom:6}}>{current.title}</div>
          <div style={{fontSize:13,color:T.gray400,marginBottom:24,lineHeight:1.6}}>{current.desc}</div>
          {current.content}
          <div style={{display:"flex",gap:10,marginTop:24}}>
            {step>0&&<Btn onClick={()=>setStep(s=>s-1)} label="← Indietro" outline full={false} style={{flex:1}}/>}
            {step<steps.length-1
              ? <Btn onClick={()=>setStep(s=>s+1)} label="Avanti →" color={T.primary} style={{flex:1}}/>
              : <Btn onClick={finish} disabled={saving} label={saving?"Configurazione...":"🚀 Inizia ora"} color={T.primary}/>
            }
          </div>
        </div>
        <div style={{textAlign:"center",marginTop:16,fontSize:11,color:"#ffffff22"}}>I tuoi dati sono protetti e isolati. Powered by Supabase.</div>
      </div>
    </div>
  );
};


// ─── CHARTS ──────────────────────────────────────────────────────────────────
const DonutChart = ({data,size=180,centerLabel,centerValue}) => {
  const total=data.reduce((s,d)=>s+Math.abs(d.value),0);
  if(!total) return <div style={{width:size,height:size,borderRadius:"50%",background:T.gray100,display:"flex",alignItems:"center",justifyContent:"center",color:T.gray300,fontSize:12}}>Nessun dato</div>;
  let cum=0; const r=size/2-10,cx=size/2,cy=size/2;
  const slices=data.map(d=>{const pct=Math.abs(d.value)/total,s=cum*2*Math.PI-Math.PI/2;cum+=pct;const e=cum*2*Math.PI-Math.PI/2;return{...d,path:`M ${cx} ${cy} L ${cx+r*Math.cos(s)} ${cy+r*Math.sin(s)} A ${r} ${r} 0 ${pct>.5?1:0} 1 ${cx+r*Math.cos(e)} ${cy+r*Math.sin(e)} Z`};});
  return (<svg width={size} height={size}>{slices.map((s,i)=><path key={i} d={s.path} fill={s.color} stroke="#fff" strokeWidth={2.5}/>)}<circle cx={cx} cy={cy} r={r*.58} fill="#fff"/>{centerLabel&&<text x={cx} y={cy-8} textAnchor="middle" fontSize={10} fill={T.gray400}>{centerLabel}</text>}{centerValue&&<text x={cx} y={cy+10} textAnchor="middle" fontSize={14} fontWeight={700} fill={T.gray900}>{centerValue}</text>}</svg>);
};

const BarChart = ({data,color}) => {
  const c=color||T.primary;
  const max=Math.max(...data.map(d=>Math.abs(d.value)),1);
  return (<div style={{display:"flex",alignItems:"flex-end",gap:4,height:80}}>{data.map((d,i)=>(<div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}><div style={{width:"100%",background:c+"12",borderRadius:"4px 4px 0 0",height:64,display:"flex",alignItems:"flex-end"}}><div style={{width:"100%",height:`${(Math.abs(d.value)/max)*100}%`,background:`linear-gradient(180deg,${c},${c}88)`,borderRadius:"4px 4px 0 0",transition:"height .5s ease"}}/></div><div style={{fontSize:9,color:T.gray300,whiteSpace:"nowrap"}}>{d.label}</div></div>))}</div>);
};

// ─── MODAL FORMS (own local state = no focus loss) ────────────────────────────
const TxModal = React.memo(({init,accounts,categories,accMap,onSave,onClose,isQuick}) => {
  const [f,setF]=useState(()=>init||{date:TODAY,type:"expense",account_id:accounts[0]?.id||""});
  const [err,setErr]=useState("");
  const set=(k)=>(e)=>setF(p=>({...p,[k]:e.target?.value??e}));
  const catForQuick=isQuick&&categories.find(c=>c.id===f.category_id);
  const validate=()=>{
    if(!f.account_id){setErr("Seleziona un conto");return false;}
    if(!f.name){setErr("Inserisci un nome");return false;}
    if(!f.amount||parseFloat(f.amount)===0){setErr("Inserisci un importo valido");return false;}
    if(!f.date){setErr("Inserisci una data");return false;}
    if(!f.category_id){setErr("Seleziona una categoria (obbligatoria)");return false;}
    return true;
  };
  return (
    <Modal title={init?.id?"Modifica Movimento":isQuick?`${catForQuick?.icon||""} ${catForQuick?.name||"Spesa Rapida"}`:"Nuovo Movimento"} onClose={onClose}>
      <Field label="TIPO"><div style={{display:"flex",gap:6}}>{[["expense","↓ Spesa","#ef4444"],["income","↑ Entrata","#10b981"],["saving","★ Risparmio","#6366f1"]].map(([v,l,c])=>(<button key={v} onClick={()=>setF(p=>({...p,type:v}))} style={{flex:1,padding:"9px 0",border:`1.5px solid ${(f.type||"expense")===v?c:"#eee"}`,borderRadius:10,background:(f.type||"expense")===v?c+"11":"#fff",color:(f.type||"expense")===v?c:"#bbb",fontWeight:700,fontSize:11,cursor:"pointer"}}>{l}</button>))}</div></Field>
      <Field label="CONTO"><Sel value={f.account_id||""} onChange={set("account_id")}><option value="">Seleziona conto</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.icon} {a.name} ({a.currency})</option>)}</Sel></Field>
      <Field label="NOME"><Inp value={f.name||""} onChange={set("name")} placeholder="Es. Dentista..."/></Field>
      <Field label={`IMPORTO (${accMap[f.account_id]?.currency||"€"})`}><Inp type="number" value={f.amount??""} onChange={set("amount")} placeholder="0.00"/></Field>
      <Field label="DATA"><Inp type="date" value={f.date||TODAY} onChange={set("date")}/></Field>
      <Field label="CATEGORIA *"><Sel value={f.category_id||""} onChange={e=>{set("category_id")(e);setErr("");}}>
        <option value="">— Seleziona categoria (obbligatoria) —</option>
        {categories.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
      </Sel></Field>
      <Field label="NOTE"><Inp value={f.note||""} onChange={set("note")} placeholder="Opzionale..."/></Field>
      {err&&<div style={{background:"#fff0f0",border:"1px solid #fecaca",borderRadius:10,padding:"8px 14px",fontSize:12,color:"#ef4444",marginBottom:12}}>⚠️ {err}</div>}
      <Btn onClick={()=>{if(validate())onSave(f);}} label={init?.id?"Salva modifiche":"Aggiungi movimento"}/>
    </Modal>
  );
});

const FixedModal = React.memo(({init,accounts,categories,accMap,onSave,onClose}) => {
  const [f,setF]=useState(()=>init||{date:TODAY,type:"expense",account_id:accounts[0]?.id||"",recurring_day:25});
  const [err,setErr]=useState("");
  const set=(k)=>(e)=>setF(p=>({...p,[k]:e.target?.value??e}));
  const selAcc=accMap[f.account_id];
  const validate=()=>{
    if(!f.account_id){setErr("Seleziona un conto");return false;}
    if(!f.name){setErr("Inserisci un nome");return false;}
    if(!f.amount||parseFloat(f.amount)===0){setErr("Inserisci un importo");return false;}
    if(!f.date){setErr("Inserisci una data");return false;}
    return true;
  };
  return (
    <Modal title={init?.id?"Modifica Voce Fissa":"Nuova Voce Fissa"} onClose={onClose}>
      <div style={{background:"#f0f0ff",borderRadius:12,padding:"10px 14px",marginBottom:16,fontSize:12,color:"#6366f1"}}>📌 Si ripete automaticamente ogni mese</div>
      <Field label="TIPO"><div style={{display:"flex",gap:6}}>{[["expense","↓ Uscita","#ef4444"],["income","↑ Entrata","#10b981"]].map(([v,l,c])=>(<button key={v} onClick={()=>setF(p=>({...p,type:v}))} style={{flex:1,padding:"9px 0",border:`1.5px solid ${(f.type||"expense")===v?c:"#eee"}`,borderRadius:10,background:(f.type||"expense")===v?c+"11":"#fff",color:(f.type||"expense")===v?c:"#bbb",fontWeight:700,fontSize:12,cursor:"pointer"}}>{l}</button>))}</div></Field>
      <Field label="CONTO">
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {accounts.map(a=>(
            <button key={a.id} onClick={()=>setF(p=>({...p,account_id:a.id}))} type="button"
              style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",border:`2px solid ${f.account_id===a.id?a.color:"#eee"}`,borderRadius:12,background:f.account_id===a.id?a.color+"11":"#fff",cursor:"pointer",textAlign:"left"}}>
              <div style={{width:36,height:36,borderRadius:10,background:`linear-gradient(135deg,${a.color},${a.color}88)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:"#fff",flexShrink:0}}>{a.icon}</div>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:f.account_id===a.id?a.color:"#1a1a2e"}}>{a.name}</div>
                <div style={{fontSize:11,color:"#999"}}>{a.currency}</div>
              </div>
              {f.account_id===a.id&&<div style={{marginLeft:"auto",color:a.color,fontSize:18}}>✓</div>}
            </button>
          ))}
        </div>
      </Field>
      <Field label="NOME"><Inp value={f.name||""} onChange={set("name")} placeholder="Es. Netflix, Stipendio..."/></Field>
      <Field label={`IMPORTO (${selAcc?.currency||"€"})`}><Inp type="number" value={f.amount??""} onChange={set("amount")} placeholder="0.00"/></Field>
      <Field label="DATA PRIMA OCCORRENZA"><Inp type="date" value={f.date||TODAY} onChange={set("date")}/></Field>
      <Field label="GIORNO DEL MESE IN CUI SI RIPETE">
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <Inp type="number" value={f.recurring_day??25} onChange={e=>setF(p=>({...p,recurring_day:Math.min(28,Math.max(1,parseInt(e.target.value)||1))}))} style={{maxWidth:100}}/>
          <span style={{fontSize:12,color:"#999"}}>di ogni mese (1–28)</span>
        </div>
      </Field>
      <Field label="CATEGORIA"><Sel value={f.category_id||""} onChange={set("category_id")}><option value="">Nessuna categoria</option>{categories.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</Sel></Field>
      <Field label="NOTE"><Inp value={f.note||""} onChange={set("note")} placeholder="Opzionale..."/></Field>
      {err&&<div style={{background:"#fff0f0",border:"1px solid #fecaca",borderRadius:10,padding:"8px 14px",fontSize:12,color:"#ef4444",marginBottom:12}}>⚠️ {err}</div>}
      <Btn onClick={()=>{if(validate())onSave(f);}} label={init?.id?"Salva modifiche":"Aggiungi voce fissa"}/>
    </Modal>
  );
});

const TransferModal = React.memo(({init,accounts,accMap,exchangeRate,onSave,onClose}) => {
  const [f,setF]=useState(()=>init||{date:TODAY,from_account_id:accounts[0]?.id||"",to_account_id:accounts[1]?.id||"",rate:exchangeRate});
  const set=(k)=>(e)=>setF(p=>({...p,[k]:e.target?.value??e}));
  const fromAcc=accMap[f.from_account_id],toAcc=accMap[f.to_account_id];
  const isCross=fromAcc&&toAcc&&fromAcc.currency!==toAcc.currency;
  return (
    <Modal title="Trasferimento tra Conti" onClose={onClose}>
      <div style={{background:"#f0fff4",borderRadius:12,padding:"10px 14px",marginBottom:16,fontSize:12,color:"#10b981"}}>🔄 Tasso di cambio applicato automaticamente</div>
      <Field label="DA CONTO"><Sel value={f.from_account_id||""} onChange={set("from_account_id")}><option value="">Seleziona</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.icon} {a.name} ({a.currency})</option>)}</Sel></Field>
      <Field label="A CONTO"><Sel value={f.to_account_id||""} onChange={set("to_account_id")}><option value="">Seleziona</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.icon} {a.name} ({a.currency})</option>)}</Sel></Field>
      <Field label={`IMPORTO (${fromAcc?.currency||""})`}><Inp type="number" value={f.amount_from??""} onChange={set("amount_from")} placeholder="0.00"/></Field>
      {isCross&&<Field label="TASSO DI CAMBIO"><div style={{display:"flex",alignItems:"center",gap:10}}><Inp type="number" value={f.rate??exchangeRate} onChange={set("rate")} style={{flex:1}}/><span style={{fontSize:12,color:"#999",whiteSpace:"nowrap"}}>= {toAcc?.currency} {fmtN((parseFloat(f.amount_from)||0)*(parseFloat(f.rate||exchangeRate)))}</span></div></Field>}
      <Field label="DATA"><Inp type="date" value={f.date||TODAY} onChange={set("date")}/></Field>
      <Field label="NOTE"><Inp value={f.note||""} onChange={set("note")} placeholder="Es. Trasferimento mensile..."/></Field>
      <Btn onClick={()=>onSave(f)} label="Registra Trasferimento" color="#10b981"/>
    </Modal>
  );
});

const AccountModal = React.memo(({init,onSave,onClose}) => {
  const [f,setF]=useState(()=>init||{currency:"EUR",color:"#6366f1",icon:"🏦",balance_initial:0});
  const set=(k)=>(e)=>setF(p=>({...p,[k]:e.target?.value??e}));
  return (
    <Modal title={init?.id?"Modifica Conto":"Nuovo Conto"} onClose={onClose}>
      <Field label="NOME"><Inp value={f.name||""} onChange={set("name")} placeholder="Es. Conto UBS..."/></Field>
      <Field label="VALUTA"><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{[["EUR","🇪🇺 Euro"],["CHF","🇨🇭 Franco"],["USD","🇺🇸 Dollaro"],["GBP","🇬🇧 Sterlina"]].map(([v,l])=>(<button key={v} onClick={()=>setF(p=>({...p,currency:v}))} style={{padding:"9px 12px",border:`1.5px solid ${f.currency===v?"#6366f1":"#eee"}`,borderRadius:10,background:f.currency===v?"#6366f111":"#fff",color:f.currency===v?"#6366f1":"#bbb",fontWeight:f.currency===v?700:400,fontSize:12,cursor:"pointer"}}>{l}</button>))}</div></Field>
      <Field label="ICONA"><EmojiPicker value={f.icon||"🏦"} onChange={v=>setF(p=>({...p,icon:v}))}/></Field>
      <Field label="COLORE"><ColorPicker value={f.color||"#6366f1"} onChange={v=>setF(p=>({...p,color:v}))}/></Field>
      <Field label="SALDO INIZIALE"><Inp type="number" value={f.balance_initial??""} onChange={set("balance_initial")} placeholder="0.00"/></Field>
      <Btn onClick={()=>onSave(f)} label={init?.id?"Salva modifiche":"Crea conto"}/>
    </Modal>
  );
});

const CatModal = React.memo(({init,onSave,onClose}) => {
  const [f,setF]=useState(()=>init||{color:"#6366f1",icon:"📦",budget:0});
  const set=(k)=>(e)=>setF(p=>({...p,[k]:e.target?.value??e}));
  return (
    <Modal title={init?.id?"Modifica Categoria":"Nuova Categoria"} onClose={onClose}>
      <Field label="NOME"><Inp value={f.name||""} onChange={set("name")} placeholder="Es. Spesa, Svago..."/></Field>
      <Field label="ICONA"><EmojiPicker value={f.icon||"📦"} onChange={v=>setF(p=>({...p,icon:v}))}/></Field>
      <Field label="COLORE"><ColorPicker value={f.color||"#6366f1"} onChange={v=>setF(p=>({...p,color:v}))}/></Field>
      <Field label="BUDGET MENSILE" hint="0 = nessun limite"><Inp type="number" value={f.budget??""} onChange={set("budget")} placeholder="0"/></Field>
      <Btn onClick={()=>onSave(f)} label={init?.id?"Salva":"Crea categoria"}/>
    </Modal>
  );
});

const SavingsModal = React.memo(({init,accounts,onSave,onClose}) => {
  const [f,setF]=useState(()=>init||{color:"#10b981",icon:"🎯",currency:"EUR"});
  const set=(k)=>(e)=>setF(p=>({...p,[k]:e.target?.value??e}));
  return (
    <Modal title={init?.id?"Modifica Obiettivo":"Nuovo Obiettivo"} onClose={onClose}>
      <Field label="NOME"><Inp value={f.name||""} onChange={set("name")} placeholder="Es. Vacanza..."/></Field>
      <Field label="ICONA"><EmojiPicker value={f.icon||"🎯"} onChange={v=>setF(p=>({...p,icon:v}))}/></Field>
      <Field label="COLORE"><ColorPicker value={f.color||"#10b981"} onChange={v=>setF(p=>({...p,color:v}))}/></Field>
      <Field label="VALUTA"><div style={{display:"flex",gap:8}}>{[["EUR","€ Euro"],["CHF","CHF Franco"]].map(([v,l])=>(<button key={v} onClick={()=>setF(p=>({...p,currency:v}))} style={{flex:1,padding:"9px 0",border:`1.5px solid ${(f.currency||"EUR")===v?"#10b981":"#eee"}`,borderRadius:10,background:(f.currency||"EUR")===v?"#10b98111":"#fff",color:(f.currency||"EUR")===v?"#10b981":"#bbb",fontWeight:700,fontSize:12,cursor:"pointer"}}>{l}</button>))}</div></Field>
      <Field label="OBIETTIVO"><Inp type="number" value={f.target_amount??""} onChange={set("target_amount")} placeholder="0.00"/></Field>
      <Field label="RAGGIUNTO FINORA"><Inp type="number" value={f.current_amount??""} onChange={set("current_amount")} placeholder="0.00"/></Field>
      <Field label="CONTO"><Sel value={f.account_id||""} onChange={set("account_id")}><option value="">Nessun conto</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}</Sel></Field>
      <Field label="SCADENZA (opzionale)"><Inp type="date" value={f.deadline||""} onChange={set("deadline")}/></Field>
      <Btn onClick={()=>onSave(f)} label={init?.id?"Salva modifiche":"Crea obiettivo"} color="#10b981"/>
    </Modal>
  );
});

const AdjustModal = React.memo(({accounts,accountBalance,onSave,onClose}) => {
  const [accId,setAccId]=useState(accounts[0]?.id||"");
  const [newBal,setNewBal]=useState("");
  return (
    <Modal title="⚖️ Aggiusta Saldo Conto" onClose={onClose}>
      <div style={{background:"#fef3c7",borderRadius:12,padding:"10px 14px",marginBottom:16,fontSize:12,color:"#92400e"}}>Modifica il saldo iniziale per correggere discrepanze.</div>
      <Field label="CONTO"><Sel value={accId} onChange={e=>{setAccId(e.target.value);setNewBal("");}}>{accounts.map(a=><option key={a.id} value={a.id}>{a.icon} {a.name} ({a.currency})</option>)}</Sel></Field>
      <Field label="Saldo attuale calcolato"><div style={{fontSize:20,fontWeight:800,color:"#6366f1",padding:"6px 0"}}>{accounts.find(a=>a.id===accId)?.currency} {fmtN(accountBalance(accId))}</div></Field>
      <Field label="Nuovo saldo reale" hint="Inserisci il saldo effettivo del conto bancario"><Inp type="number" value={newBal} onChange={e=>setNewBal(e.target.value)} placeholder={fmtN(accountBalance(accId))}/></Field>
      <Btn onClick={()=>onSave(accId,parseFloat(newBal))} label="Aggiusta Saldo" color="#f59e0b"/>
    </Modal>
  );
});

// ─── DASHBOARD CUSTOMIZER ─────────────────────────────────────────────────────
const DashboardCustomizer = React.memo(({activeWidgets,onSave,onClose}) => {
  const [widgets,setWidgets]=useState([...activeWidgets]);
  const toggle=(id)=>setWidgets(w=>w.includes(id)?w.filter(x=>x!==id):[...w,id]);
  const moveUp=(idx)=>{ if(idx===0) return; const w=[...widgets]; [w[idx-1],w[idx]]=[w[idx],w[idx-1]]; setWidgets(w); };
  const moveDown=(idx)=>{ if(idx===widgets.length-1) return; const w=[...widgets]; [w[idx],w[idx+1]]=[w[idx+1],w[idx]]; setWidgets(w); };
  return (
    <Modal title="✨ Personalizza Dashboard" onClose={onClose} wide>
      <div style={{fontSize:12,color:"#999",marginBottom:18}}>Attiva, disattiva e riordina i widget della tua dashboard.</div>
      {/* Active widgets in order */}
      <div style={{fontSize:11,fontWeight:700,color:"#bbb",letterSpacing:1,marginBottom:10}}>WIDGET ATTIVI (trascina per riordinare)</div>
      <div style={{marginBottom:20}}>
        {widgets.map((id,idx)=>{
          const w=ALL_WIDGETS.find(x=>x.id===id); if(!w) return null;
          return (
            <div key={id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"#f0f0ff",borderRadius:12,marginBottom:6,border:"1.5px solid #6366f122"}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:"#1a1a2e"}}>{w.label}</div>
                <div style={{fontSize:11,color:"#bbb"}}>{w.desc}</div>
              </div>
              <div style={{display:"flex",gap:4}}>
                <button onClick={()=>moveUp(idx)} disabled={idx===0} style={{background:"#fff",border:"1px solid #eee",borderRadius:6,width:28,height:28,cursor:"pointer",color:"#999",fontSize:14,opacity:idx===0?0.3:1}}>↑</button>
                <button onClick={()=>moveDown(idx)} disabled={idx===widgets.length-1} style={{background:"#fff",border:"1px solid #eee",borderRadius:6,width:28,height:28,cursor:"pointer",color:"#999",fontSize:14,opacity:idx===widgets.length-1?0.3:1}}>↓</button>
                <button onClick={()=>toggle(id)} style={{background:"#fff0f0",border:"none",borderRadius:6,width:28,height:28,cursor:"pointer",color:"#ef4444",fontSize:14}}>✕</button>
              </div>
            </div>
          );
        })}
      </div>
      {/* Inactive widgets */}
      <div style={{fontSize:11,fontWeight:700,color:"#bbb",letterSpacing:1,marginBottom:10}}>WIDGET DISATTIVATI</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:20}}>
        {ALL_WIDGETS.filter(w=>!widgets.includes(w.id)).map(w=>(
          <div key={w.id} style={{padding:"10px 14px",background:"#f8f9fc",borderRadius:12,border:"1.5px solid #eee",cursor:"pointer"}} onClick={()=>toggle(w.id)}>
            <div style={{fontSize:13,fontWeight:600,color:"#999"}}>{w.label}</div>
            <div style={{fontSize:11,color:"#bbb",marginTop:2}}>{w.desc}</div>
            <div style={{fontSize:11,color:"#6366f1",marginTop:4,fontWeight:600}}>+ Aggiungi</div>
          </div>
        ))}
        {ALL_WIDGETS.filter(w=>!widgets.includes(w.id)).length===0&&<div style={{fontSize:13,color:"#bbb",padding:"8px 0"}}>Tutti i widget sono attivi</div>}
      </div>
      <div style={{display:"flex",gap:10}}>
        <div style={{flex:1}}><Btn onClick={()=>setWidgets(DEFAULT_WIDGETS)} label="Ripristina default" outline color="#999" small/></div>
        <div style={{flex:1}}><Btn onClick={()=>onSave(widgets)} label="Salva Dashboard ✓" small/></div>
      </div>
    </Modal>
  );
});

// ─── EXCEL IMPORT/EXPORT ──────────────────────────────────────────────────────
const ImportModal = React.memo(({accounts,categories,userId,token,onClose,onSuccess}) => {
  const [file,setFile]=useState(null);
  const [preview,setPreview]=useState(null);
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState(null);
  const fileRef=useRef();
  const t=sb.db(token);

  const downloadTemplate=()=>{
    const wb=XLSX.utils.book_new();

    // Sheet 1: Movimenti variabili
    const txData=[
      ["data","nome","tipo","conto","categoria","importo","note"],
      ["2026-01-15","Spesa al supermercato","expense","Conto Italia","Casa",45.50,"Esselunga"],
      ["2026-01-20","Cena fuori","expense","Conto Italia","Svago",80,"Ristorante"],
      ["2026-01-24","Stipendio","income","Conto Svizzera","",8990,"Stipendio mensile"],
    ];
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(txData),"Movimenti");

    // Sheet 2: Spese fisse
    const fixedData=[
      ["nome","tipo","conto","categoria","importo","giorno_mese","note"],
      ["Netflix","expense","Conto Italia","Abbonamenti",18.99,25,""],
      ["Affitto","expense","Conto Svizzera","Casa",1632,25,""],
    ];
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(fixedData),"Fisso");

    // Sheet 3: Info conti e categorie
    const infoData=[
      ["CONTI DISPONIBILI","","","CATEGORIE DISPONIBILI",""],
      ["Nome","Valuta","","Nome","Budget"],
      ...accounts.map(a=>[a.name,a.currency,"","",""]),
      ...categories.slice(0,accounts.length).map((c,i)=>i===0?[accounts[0]?.name,accounts[0]?.currency,"",c.name,c.budget]:[""," ","",c.name,c.budget]),
    ];
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(infoData),"Info");

    XLSX.writeFile(wb,"template_budget.xlsx");
  };

  const parseFile=(file)=>{
    const reader=new FileReader();
    reader.onload=(e)=>{
      try {
        const wb=XLSX.read(e.target.result,{type:"binary"});
        const accNameMap={};
        accounts.forEach(a=>accNameMap[a.name.toLowerCase()]=a.id);
        const catNameMap={};
        categories.forEach(c=>catNameMap[c.name.toLowerCase()]=c.id);

        const parseSheet=(sheetName,isFixed)=>{
          const sheet=wb.Sheets[sheetName];
          if(!sheet) return [];
          const rows=XLSX.utils.sheet_to_json(sheet,{header:1});
          if(rows.length<2) return [];
          return rows.slice(1).filter(r=>r[0]&&r[1]).map(r=>({
            date: isFixed ? (r[5]?`${CUR_YEAR}-${String(new Date().getMonth()+1).padStart(2,"0")}-${String(parseInt(r[5])||25).padStart(2,"0")}`:TODAY) : String(r[0]),
            name: String(r[isFixed?0:1]||""),
            type: String(r[isFixed?1:2]||"expense").toLowerCase(),
            account_id: accNameMap[String(r[isFixed?2:3]||"").toLowerCase()]||accounts[0]?.id,
            category_id: catNameMap[String(r[isFixed?3:4]||"").toLowerCase()]||null,
            amount: parseFloat(r[isFixed?4:5])||0,
            note: String(r[isFixed?6:6]||""),
            is_fixed: isFixed,
            recurring_day: isFixed?parseInt(r[5])||25:null,
            user_id: userId,
          })).filter(tx=>tx.amount>0&&tx.name);
        };

        const txRows=parseSheet("Movimenti",false);
        const fixedRows=parseSheet("Fisso",true);
        setPreview({txRows,fixedRows});
      } catch(err) { alert("Errore nel leggere il file: "+err.message); }
    };
    reader.readAsBinaryString(file);
  };

  const handleFile=(e)=>{ const f=e.target.files[0]; if(f){setFile(f);parseFile(f);} };

  const importData=async()=>{
    if(!preview) return;
    setLoading(true);
    let ok=0,err=0;
    const all=[...preview.txRows,...preview.fixedRows];
    for(const tx of all){
      try { await t("transactions").post(tx); ok++; } catch { err++; }
    }
    setResult({ok,err});
    setLoading(false);
    if(ok>0) onSuccess();
  };

  return (
    <Modal title="📥 Import / Export Excel" onClose={onClose} wide>
      {/* Download template */}
      <div style={{background:"#f0fff4",borderRadius:14,padding:16,marginBottom:20}}>
        <div style={{fontSize:13,fontWeight:700,color:"#1a1a2e",marginBottom:6}}>📄 Scarica Template Excel</div>
        <div style={{fontSize:12,color:"#666",marginBottom:12}}>Il template contiene 3 fogli: <strong>Movimenti</strong> (variabili), <strong>Fisso</strong> (ricorrenti), <strong>Info</strong> (conti e categorie disponibili).</div>
        <Btn onClick={downloadTemplate} label="⬇ Scarica template_budget.xlsx" color="#10b981" small/>
      </div>

      {/* Upload */}
      <div style={{background:"#f8f9fc",borderRadius:14,padding:16,marginBottom:20}}>
        <div style={{fontSize:13,fontWeight:700,color:"#1a1a2e",marginBottom:6}}>📤 Carica Excel Compilato</div>
        <div style={{fontSize:12,color:"#666",marginBottom:12}}>Compila il template e caricalo qui. Verranno importati solo i movimenti validi.</div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} style={{display:"none"}}/>
        <button onClick={()=>fileRef.current?.click()} style={{width:"100%",padding:"12px 0",border:"2px dashed #ddd",borderRadius:12,background:"#fff",cursor:"pointer",fontSize:13,color:"#666",fontWeight:600}}>
          {file?`✓ ${file.name}`:"Clicca per selezionare file .xlsx"}
        </button>
      </div>

      {/* Preview */}
      {preview&&!result&&(
        <div style={{marginBottom:20}}>
          <div style={{fontSize:13,fontWeight:700,color:"#1a1a2e",marginBottom:12}}>📋 Anteprima importazione</div>
          {[{label:"Movimenti variabili",rows:preview.txRows,color:"#6366f1"},{label:"Voci fisse",rows:preview.fixedRows,color:"#10b981"}].map(s=>(
            <div key={s.label} style={{marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:600,color:s.color,marginBottom:6}}>{s.label} · {s.rows.length} righe trovate</div>
              {s.rows.slice(0,3).map((r,i)=>(
                <div key={i} style={{fontSize:12,color:"#666",padding:"6px 10px",background:"#fff",borderRadius:8,marginBottom:4,border:"1px solid #f0f0f0"}}>
                  {r.date} · <strong>{r.name}</strong> · {r.type} · {fmtN(r.amount)} {accounts.find(a=>a.id===r.account_id)?.currency}
                </div>
              ))}
              {s.rows.length>3&&<div style={{fontSize:11,color:"#bbb",marginLeft:10}}>...e altri {s.rows.length-3}</div>}
            </div>
          ))}
          <Btn onClick={importData} disabled={loading} label={loading?"Importazione in corso...":"✓ Importa tutto"} color="#6366f1"/>
        </div>
      )}

      {/* Result */}
      {result&&(
        <div style={{background:result.err===0?"#d1fae5":"#fef3c7",borderRadius:14,padding:16,textAlign:"center"}}>
          <div style={{fontSize:18,fontWeight:900,color:result.err===0?"#059669":"#d97706",marginBottom:8}}>
            {result.err===0?"✅ Import completato!":"⚠️ Import completato con errori"}
          </div>
          <div style={{fontSize:13,color:"#666"}}>{result.ok} movimenti importati · {result.err} errori</div>
          <div style={{marginTop:14}}><Btn onClick={onClose} label="Chiudi" small/></div>
        </div>
      )}
    </Modal>
  );
});

// ─── SHARE MODAL ──────────────────────────────────────────────────────────────
const ShareModal = React.memo(({token,userId,onClose,onToast}) => {
  const [email,setEmail]=useState("");
  const [loading,setLoading]=useState(false);
  const [shared,setShared]=useState([]);
  const t=sb.db(token);
  useEffect(()=>{ t("household_members").get("select=*,profiles!member_id(email,full_name)&order=created_at").then(r=>{if(Array.isArray(r))setShared(r);}); },[]);
  const invite=async()=>{
    if(!email) return; setLoading(true);
    try {
      const found=await t("profiles").get(`email=eq.${encodeURIComponent(email)}&select=id`);
      if(!Array.isArray(found)||found.length===0){onToast("Utente non trovato. Deve prima registrarsi.",false);setLoading(false);return;}
      const mid=found[0].id;
      if(mid===userId){onToast("Non puoi condividere con te stesso",false);setLoading(false);return;}
      await t("household_members").post({owner_id:userId,member_id:mid});
      onToast("Condivisione attivata ✓");
      const updated=await t("household_members").get("select=*,profiles!member_id(email,full_name)&order=created_at");
      if(Array.isArray(updated))setShared(updated);
      setEmail("");
    } catch{onToast("Errore durante la condivisione",false);}
    setLoading(false);
  };
  const remove=async(id)=>{ await t("household_members").del(`id=eq.${id}`); setShared(s=>s.filter(m=>m.id!==id)); onToast("Condivisione rimossa ✓"); };
  return (
    <Modal title="👨‍👩‍👧 Condividi con Famiglia" onClose={onClose}>
      <div style={{background:"#f0f0ff",borderRadius:12,padding:"10px 14px",marginBottom:16,fontSize:12,color:"#6366f1"}}>Gli utenti invitati vedranno e potranno modificare tutti i tuoi dati.</div>
      <Field label="EMAIL UTENTE DA INVITARE">
        <div style={{display:"flex",gap:8}}>
          <Inp value={email} onChange={e=>setEmail(e.target.value)} placeholder="moglie@email.com" style={{flex:1}}/>
          <button onClick={invite} disabled={loading||!email} style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:10,padding:"0 16px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",whiteSpace:"nowrap"}}>{loading?"...":"Invita"}</button>
        </div>
      </Field>
      {shared.length>0&&<div>
        <div style={{fontSize:11,fontWeight:700,color:"#bbb",letterSpacing:1,marginBottom:10}}>ACCESSO CONDIVISO CON</div>
        {shared.map(m=>(<div key={m.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",background:"#f8f9fc",borderRadius:12,marginBottom:8}}>
          <div><div style={{fontSize:13,fontWeight:600}}>{m.profiles?.full_name||"—"}</div><div style={{fontSize:11,color:"#bbb"}}>{m.profiles?.email}</div></div>
          <button onClick={()=>remove(m.id)} style={{background:"#fff0f0",border:"none",borderRadius:8,padding:"6px 12px",color:"#ef4444",fontSize:12,cursor:"pointer",fontWeight:600}}>Rimuovi</button>
        </div>))}
      </div>}
    </Modal>
  );
});

// ─── GROUP B: BUDGET SUGGEST MODAL ───────────────────────────────────────────
const BudgetSuggestModal = React.memo(({ categories, transactions, onSave, onClose }) => {
  const [months, setMonths] = useState(3);
  const suggestions = useMemo(() => {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    const relevant = transactions.filter(tx => tx.type==="expense" && !tx.is_fixed && tx.date >= cutoffStr);
    return categories.map(cat => {
      const total = relevant.filter(tx => tx.category_id===cat.id).reduce((s,tx)=>s+Number(tx.amount),0);
      const suggested = Math.ceil((total / months) * 1.1); // +10% buffer
      return { ...cat, suggested, current: cat.budget };
    }).filter(c => c.suggested > 0).sort((a,b) => b.suggested - a.suggested);
  }, [categories, transactions, months]);

  return (
    <Modal title="💡 Budget Suggerito dallo Storico" onClose={onClose} wide>
      <div style={{fontSize:12,color:"#999",marginBottom:16}}>Analisi basata sulle spese variabili degli ultimi mesi. Include un margine del 10%.</div>
      <div style={{display:"flex",gap:8,marginBottom:20}}>
        {[3,6,12].map(m=>(
          <button key={m} onClick={()=>setMonths(m)} style={{flex:1,padding:"9px 0",border:`1.5px solid ${months===m?"#6366f1":"#eee"}`,borderRadius:10,background:months===m?"#6366f111":"#fff",color:months===m?"#6366f1":"#666",fontWeight:months===m?700:400,fontSize:13,cursor:"pointer"}}>
            {m} mesi
          </button>
        ))}
      </div>
      {suggestions.length===0 && <div style={{textAlign:"center",color:"#ccc",padding:"30px 0",fontSize:13}}>Nessuna spesa storica trovata</div>}
      {suggestions.map(cat => (
        <div key={cat.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"#f8f9fc",borderRadius:12,marginBottom:8}}>
          <div style={{width:38,height:38,borderRadius:10,background:cat.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{cat.icon}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:600,color:"#1a1a2e"}}>{cat.name}</div>
            <div style={{fontSize:11,color:"#bbb"}}>
              Attuale: <strong style={{color:"#666"}}>{cat.current>0?`€ ${fmtN(cat.current)}`:"Non impostato"}</strong>
              {" → "}Suggerito: <strong style={{color:"#6366f1"}}>€ {fmtN(cat.suggested)}</strong>
            </div>
          </div>
          <button onClick={()=>onSave(cat.id, cat.suggested)}
            style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:8,padding:"7px 14px",color:"#fff",fontSize:12,cursor:"pointer",fontWeight:700,whiteSpace:"nowrap"}}>
            {cat.current===cat.suggested?"✓ Applicato":"Applica"}
          </button>
        </div>
      ))}
      <div style={{marginTop:16}}>
        <Btn onClick={()=>{ suggestions.forEach(c=>onSave(c.id,c.suggested)); }} label="Applica tutti i suggerimenti ✓"/>
      </div>
    </Modal>
  );
});

// ─── GROUP B: ADVANCED TRANSFER CALCULATOR ───────────────────────────────────
const AdvancedTransferCalcModal = React.memo(({ accounts, fixedTx, accMap, rates, onTransfer, onClose }) => {
  const [days, setDays] = useState(30);
  const [selAccounts, setSelAccounts] = useState(accounts.map(a=>a.id));

  const toEUR = useCallback((amount, currency) => {
    const r = rates[currency]||1;
    return amount / r;
  }, [rates]);

  const fromEUR = useCallback((amount, currency) => {
    const r = rates[currency]||1;
    return amount * r;
  }, [rates]);

  const analysis = useMemo(() => {
    const today = new Date();
    const end = new Date(today); end.setDate(end.getDate() + days);
    return selAccounts.map(accId => {
      const acc = accMap[accId];
      if(!acc) return null;
      // Fixed expenses/income due in range
      const dueExpenses = fixedTx.filter(tx => {
        if(tx.account_id!==accId||tx.type!=="expense") return false;
        const day = tx.recurring_day||25;
        // Check if this day falls in the next `days` days
        const thisMonth = new Date(today.getFullYear(), today.getMonth(), day);
        const nextMonth = new Date(today.getFullYear(), today.getMonth()+1, day);
        return (thisMonth >= today && thisMonth <= end) || (nextMonth >= today && nextMonth <= end);
      }).reduce((s,tx)=>s+Number(tx.amount),0);
      const dueIncome = fixedTx.filter(tx => {
        if(tx.account_id!==accId||tx.type!=="income") return false;
        const day = tx.recurring_day||25;
        const thisMonth = new Date(today.getFullYear(), today.getMonth(), day);
        const nextMonth = new Date(today.getFullYear(), today.getMonth()+1, day);
        return (thisMonth >= today && thisMonth <= end) || (nextMonth >= today && nextMonth <= end);
      }).reduce((s,tx)=>s+Number(tx.amount),0);
      const netNeeded = dueExpenses - dueIncome;
      return { acc, dueExpenses, dueIncome, netNeeded, covered: netNeeded <= 0 };
    }).filter(Boolean);
  }, [selAccounts, fixedTx, accMap, days]);

  // Find transfers needed: accounts in deficit need to receive from surplus accounts
  const transferPlan = useMemo(() => {
    const deficits = analysis.filter(a=>!a.covered).map(a=>({...a, needed:a.netNeeded}));
    const surpluses = analysis.filter(a=>a.covered).map(a=>({...a, available:-a.netNeeded}));
    const plan = [];
    deficits.forEach(def => {
      let remaining = def.needed;
      surpluses.forEach(sur => {
        if(remaining<=0||sur.available<=0) return;
        const amount = Math.min(remaining, sur.available);
        const fromCur = sur.acc.currency, toCur = def.acc.currency;
        const amountInFromCur = fromEUR(toEUR(amount, toCur), fromCur);
        plan.push({ from:sur.acc, to:def.acc, amount:amountInFromCur, amountTo:amount });
        remaining -= amount;
        sur.available -= amount;
      });
    });
    return plan;
  }, [analysis, toEUR, fromEUR]);

  const toggleAccount = (id) => setSelAccounts(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);

  return (
    <Modal title="📊 Calcolatore Trasferimenti Avanzato" onClose={onClose} wide>
      <div style={{fontSize:12,color:"#999",marginBottom:16}}>Analizza i flussi previsti e suggerisce i trasferimenti necessari per coprire tutte le spese pianificate.</div>

      {/* Range */}
      <Field label="ORIZZONTE TEMPORALE">
        <div style={{display:"flex",gap:8,marginBottom:4}}>
          {[7,14,30,60,90].map(d=>(
            <button key={d} onClick={()=>setDays(d)} style={{flex:1,padding:"8px 0",border:`1.5px solid ${days===d?"#6366f1":"#eee"}`,borderRadius:10,background:days===d?"#6366f111":"#fff",color:days===d?"#6366f1":"#666",fontWeight:days===d?700:400,fontSize:12,cursor:"pointer"}}>{d}gg</button>
          ))}
        </div>
      </Field>

      {/* Account selector */}
      <Field label="CONTI DA ANALIZZARE">
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {accounts.map(a=>(
            <button key={a.id} onClick={()=>toggleAccount(a.id)}
              style={{padding:"8px 14px",borderRadius:20,border:`1.5px solid ${selAccounts.includes(a.id)?a.color:"#eee"}`,background:selAccounts.includes(a.id)?a.color+"11":"#fff",color:selAccounts.includes(a.id)?a.color:"#666",fontSize:12,cursor:"pointer",fontWeight:selAccounts.includes(a.id)?700:400}}>
              {a.icon} {a.name}
            </button>
          ))}
        </div>
      </Field>

      {/* Analysis per account */}
      <div style={{marginBottom:16}}>
        <div style={{fontSize:11,fontWeight:700,color:"#bbb",letterSpacing:1,marginBottom:10}}>SITUAZIONE PER CONTO</div>
        {analysis.map(a=>(
          <div key={a.acc.id} style={{padding:"12px 16px",borderRadius:14,background:a.covered?"#d1fae5":"#fff0f0",border:`1px solid ${a.covered?"#10b98133":"#fecaca"}`,marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <div style={{fontSize:13,fontWeight:700}}>{a.acc.icon} {a.acc.name}</div>
              <div style={{fontSize:12,fontWeight:700,color:a.covered?"#10b981":"#ef4444"}}>{a.covered?"✅ Coperto":"⚠️ Deficit"}</div>
            </div>
            <div style={{display:"flex",gap:16,fontSize:12,color:"#666"}}>
              <span>↑ Entrate: <strong>{a.acc.currency} {fmtN(a.dueIncome)}</strong></span>
              <span>↓ Uscite: <strong>{a.acc.currency} {fmtN(a.dueExpenses)}</strong></span>
              <span style={{color:a.covered?"#10b981":"#ef4444"}}>
                {a.covered?"Surplus":"Deficit"}: <strong>{a.acc.currency} {fmtN(Math.abs(a.netNeeded))}</strong>
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Transfer plan */}
      {transferPlan.length>0 ? (
        <div>
          <div style={{fontSize:11,fontWeight:700,color:"#bbb",letterSpacing:1,marginBottom:10}}>TRASFERIMENTI SUGGERITI</div>
          {transferPlan.map((p,i)=>(
            <div key={i} style={{padding:"12px 16px",borderRadius:14,background:"#fef3c7",border:"1px solid #fde68a",marginBottom:8,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:"#1a1a2e"}}>{p.from.icon} {p.from.name} → {p.to.icon} {p.to.name}</div>
                <div style={{fontSize:12,color:"#92400e",marginTop:2}}>
                  {p.from.currency} {fmtN(p.amount)} = {p.to.currency} {fmtN(p.amountTo)}
                </div>
              </div>
              <button onClick={()=>onTransfer({from_account_id:p.from.id,to_account_id:p.to.id,amount_from:p.amount.toFixed(2),date:TODAY})}
                style={{background:"linear-gradient(135deg,#10b981,#059669)",border:"none",borderRadius:10,padding:"8px 14px",color:"#fff",fontSize:12,cursor:"pointer",fontWeight:700,whiteSpace:"nowrap"}}>
                Registra 🔄
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{background:"#d1fae5",borderRadius:14,padding:"14px 16px",textAlign:"center"}}>
          <div style={{fontSize:14,fontWeight:700,color:"#059669"}}>✅ Tutti i conti selezionati sono coperti</div>
          <div style={{fontSize:12,color:"#065f46",marginTop:4}}>Nessun trasferimento necessario per i prossimi {days} giorni</div>
        </div>
      )}
    </Modal>
  );
});

// ─── GROUP B: BULK EDIT FIXED ─────────────────────────────────────────────────
const BulkEditFixedModal = React.memo(({ fixedTx, accounts, categories, accMap, catMap, onSave, onClose }) => {
  const [rows, setRows] = useState(() => fixedTx.map(tx=>({...tx,_edited:false})));
  const [saving, setSaving] = useState(false);

  const update = (id, field, val) => setRows(r=>r.map(tx=>tx.id===id?{...tx,[field]:val,_edited:true}:tx));

  const handleSave = async () => {
    setSaving(true);
    const edited = rows.filter(r=>r._edited);
    await Promise.all(edited.map(tx=>onSave(tx)));
    setSaving(false);
    onClose();
  };

  const cellStyle = {border:"1px solid #eee",padding:"6px 8px",fontSize:12,background:"#fff",borderRadius:6,color:"#1a1a2e"};

  return (
    <Modal title="📋 Modifica Massiva Spese Fisse" onClose={onClose} wide>
      <div style={{fontSize:12,color:"#999",marginBottom:14}}>Modifica importo, categoria e giorno di tutte le voci fisse in un'unica vista.</div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead>
            <tr style={{background:"#f8f9fc"}}>
              {["Nome","Importo","Tipo","Conto","Categoria","Giorno"].map(h=>(
                <th key={h} style={{padding:"8px 10px",textAlign:"left",fontSize:11,fontWeight:700,color:"#999",letterSpacing:0.8,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(tx=>(
              <tr key={tx.id} style={{borderBottom:"1px solid #f5f5f5",background:tx._edited?"#fefce8":"#fff"}}>
                <td style={{padding:"6px 8px"}}><input value={tx.name||""} onChange={e=>update(tx.id,"name",e.target.value)} style={{...cellStyle,width:120}}/></td>
                <td style={{padding:"6px 8px"}}><input type="number" value={tx.amount||""} onChange={e=>update(tx.id,"amount",e.target.value)} style={{...cellStyle,width:80}}/></td>
                <td style={{padding:"6px 8px"}}>
                  <select value={tx.type||"expense"} onChange={e=>update(tx.id,"type",e.target.value)} style={{...cellStyle,width:90}}>
                    <option value="expense">↓ Uscita</option>
                    <option value="income">↑ Entrata</option>
                  </select>
                </td>
                <td style={{padding:"6px 8px"}}>
                  <select value={tx.account_id||""} onChange={e=>update(tx.id,"account_id",e.target.value)} style={{...cellStyle,width:120}}>
                    {accounts.map(a=><option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
                  </select>
                </td>
                <td style={{padding:"6px 8px"}}>
                  <select value={tx.category_id||""} onChange={e=>update(tx.id,"category_id",e.target.value)} style={{...cellStyle,width:120}}>
                    <option value="">—</option>
                    {categories.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                </td>
                <td style={{padding:"6px 8px"}}><input type="number" min={1} max={28} value={tx.recurring_day||25} onChange={e=>update(tx.id,"recurring_day",parseInt(e.target.value))} style={{...cellStyle,width:60}}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{marginTop:16,display:"flex",gap:10}}>
        <div style={{flex:1}}><Btn onClick={onClose} label="Annulla" outline color="#999" small/></div>
        <div style={{flex:2}}><Btn onClick={handleSave} disabled={saving||!rows.some(r=>r._edited)} label={saving?"Salvataggio...":"Salva modifiche ✓"} small/></div>
      </div>
    </Modal>
  );
});

// ─── GROUP B: SAVINGS TRANSFER MODAL ─────────────────────────────────────────
const SavingsTransferModal = React.memo(({ goal, accounts, accMap, onSave, onClose }) => {
  const [dir, setDir] = useState("to"); // "to" = deposito, "from" = prelievo
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(TODAY);
  const [note, setNote] = useState("");

  const handle = () => {
    if(!amount||parseFloat(amount)<=0) return;
    onSave({ goal, dir, amount:parseFloat(amount), date, note });
  };

  const remaining = (goal.target_amount||0)-(goal.current_amount||0);

  return (
    <Modal title={`${goal.icon} ${goal.name}`} onClose={onClose}>
      {/* Progress */}
      <div style={{background:"#f8f9fc",borderRadius:14,padding:16,marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <span style={{fontSize:13,color:"#666"}}>Raggiunto</span>
          <span style={{fontSize:14,fontWeight:800,color:goal.color}}>{goal.currency} {fmtN(goal.current_amount)} / {fmtN(goal.target_amount)}</span>
        </div>
        <div style={{background:"#eee",borderRadius:8,height:10,overflow:"hidden"}}>
          <div style={{width:`${Math.min(100,(goal.current_amount/Math.max(goal.target_amount,1))*100)}%`,height:"100%",background:`linear-gradient(90deg,${goal.color},${goal.color}99)`,borderRadius:8}}/>
        </div>
        <div style={{fontSize:11,color:"#bbb",marginTop:6}}>Mancano {goal.currency} {fmtN(Math.max(0,remaining))}</div>
      </div>

      <Field label="OPERAZIONE">
        <div style={{display:"flex",gap:8}}>
          {[["to","💰 Deposita","#10b981"],["from","↩️ Preleva","#f59e0b"]].map(([v,l,c])=>(
            <button key={v} onClick={()=>setDir(v)} style={{flex:1,padding:"10px 0",border:`1.5px solid ${dir===v?c:"#eee"}`,borderRadius:12,background:dir===v?c+"11":"#fff",color:dir===v?c:"#bbb",fontWeight:700,fontSize:13,cursor:"pointer"}}>{l}</button>
          ))}
        </div>
      </Field>
      <Field label={`IMPORTO (${goal.currency})`}><Inp type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00"/></Field>
      <Field label="DATA"><Inp type="date" value={date} onChange={e=>setDate(e.target.value)}/></Field>
      <Field label="NOTE"><Inp value={note} onChange={e=>setNote(e.target.value)} placeholder="Opzionale..."/></Field>
      <Btn onClick={handle} label={dir==="to"?"Deposita sul risparmio ✓":"Preleva dal risparmio ✓"} color={dir==="to"?"#10b981":"#f59e0b"}/>
    </Modal>
  );
});

// ─── GROUP C: AREA CHART ─────────────────────────────────────────────────────
const AreaChart = ({ data, color="#6366f1", color2="#10b981", showBoth=false, height=80 }) => {
  if (!data.length) return null;
  const maxVal = Math.max(...data.map(d => Math.max(d.value||0, d.value2||0)), 1);
  const w = 300, h = height;
  const pts = (arr, key) => arr.map((d,i) => [i/(arr.length-1||1)*w, h-(Math.max(0,d[key]||0)/maxVal)*(h-4)]);
  const toPath = pts => pts.map((p,i) => `${i===0?"M":"L"}${p[0]},${p[1]}`).join(" ");
  const toArea = pts => `${toPath(pts)} L${pts[pts.length-1][0]},${h} L0,${h} Z`;
  const pts1 = pts(data, "value");
  const pts2 = showBoth ? pts(data, "value2") : [];
  return (
    <div style={{overflowX:"auto"}}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{width:"100%",height}} preserveAspectRatio="none">
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
            <stop offset="100%" stopColor={color} stopOpacity="0.02"/>
          </linearGradient>
          {showBoth&&<linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color2} stopOpacity="0.3"/>
            <stop offset="100%" stopColor={color2} stopOpacity="0.02"/>
          </linearGradient>}
        </defs>
        <path d={toArea(pts1)} fill="url(#g1)"/>
        <path d={toPath(pts1)} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        {showBoth&&<><path d={toArea(pts2)} fill="url(#g2)"/><path d={toPath(pts2)} fill="none" stroke={color2} strokeWidth="2" strokeLinecap="round"/></>}
        {pts1.map((p,i)=><circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill={color}/>)}
      </svg>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
        {data.map((d,i)=>(i===0||i===data.length-1||data.length<=8)&&<span key={i} style={{fontSize:9,color:"#bbb"}}>{d.label}</span>).filter(Boolean)}
      </div>
    </div>
  );
};

// ─── GROUP C: INLINE MINI TREND (widget) ─────────────────────────────────────
const MiniTrendWidget = ({ transactions, filterMonth, filterYear, isMobile }) => {
  const [period, setPeriod] = useState("month");
  const data = useMemo(() => {
    const today = new Date(`${filterYear}-${String(MONTHS.indexOf(filterMonth)+1).padStart(2,"0")}-01`);
    if (period === "week") {
      return Array.from({length:7},(_,i)=>{
        const d = new Date(); d.setDate(d.getDate()-6+i);
        const ds = d.toISOString().split("T")[0];
        const exp = transactions.filter(tx=>tx.date===ds&&tx.type==="expense"&&!tx.is_fixed).reduce((s,tx)=>s+Number(tx.amount),0);
        const inc = transactions.filter(tx=>tx.date===ds&&tx.type==="income"&&!tx.is_fixed).reduce((s,tx)=>s+Number(tx.amount),0);
        return {label:["Dom","Lun","Mar","Mer","Gio","Ven","Sab"][d.getDay()],value:exp,value2:inc};
      });
    }
    if (period === "month") {
      const days = new Date(filterYear,MONTHS.indexOf(filterMonth)+1,0).getDate();
      return Array.from({length:days},(_,i)=>{
        const ds = `${filterYear}-${String(MONTHS.indexOf(filterMonth)+1).padStart(2,"0")}-${String(i+1).padStart(2,"0")}`;
        const exp = transactions.filter(tx=>tx.date===ds&&tx.type==="expense"&&!tx.is_fixed).reduce((s,tx)=>s+Number(tx.amount),0);
        const inc = transactions.filter(tx=>tx.date===ds&&tx.type==="income"&&!tx.is_fixed).reduce((s,tx)=>s+Number(tx.amount),0);
        return {label:i+1===1||i+1===15||i+1===days?String(i+1):"",value:exp,value2:inc};
      });
    }
    // year
    return MONTHS_SHORT.map((label,i)=>{
      const m = MONTHS[i];
      const exp = transactions.filter(tx=>{const d=new Date(tx.date);return MONTHS[d.getMonth()]===m&&d.getFullYear()===filterYear&&tx.type==="expense"&&!tx.is_fixed;}).reduce((s,tx)=>s+Number(tx.amount),0);
      const inc = transactions.filter(tx=>{const d=new Date(tx.date);return MONTHS[d.getMonth()]===m&&d.getFullYear()===filterYear&&tx.type==="income"&&!tx.is_fixed;}).reduce((s,tx)=>s+Number(tx.amount),0);
      return {label,value:exp,value2:inc};
    });
  },[transactions,period,filterMonth,filterYear]);

  const totExp = data.reduce((s,d)=>s+d.value,0);
  const totInc = data.reduce((s,d)=>s+(d.value2||0),0);

  return (
    <div style={{background:"#fff",borderRadius:18,padding:18,boxShadow:"0 2px 12px #0001"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:700,color:"#1a1a2e"}}>📉 Andamento Movimenti</div>
        <div style={{display:"flex",gap:4}}>
          {[["week","7G"],["month","Mese"],["year","Anno"]].map(([v,l])=>(
            <button key={v} onClick={()=>setPeriod(v)} style={{padding:"4px 10px",borderRadius:8,border:`1px solid ${period===v?"#6366f1":"#eee"}`,background:period===v?"#6366f111":"#fff",color:period===v?"#6366f1":"#999",fontSize:11,cursor:"pointer",fontWeight:period===v?700:400}}>{l}</button>
          ))}
        </div>
      </div>
      <div style={{display:"flex",gap:16,marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:10,height:10,borderRadius:3,background:"#ef4444"}}/><span style={{fontSize:11,color:"#666"}}>Uscite <strong style={{color:"#ef4444"}}>{fmtN(totExp)}</strong></span></div>
        <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:10,height:10,borderRadius:3,background:"#10b981"}}/><span style={{fontSize:11,color:"#666"}}>Entrate <strong style={{color:"#10b981"}}>{fmtN(totInc)}</strong></span></div>
      </div>
      <AreaChart data={data} color="#ef4444" color2="#10b981" showBoth={true} height={isMobile?60:80}/>
    </div>
  );
};

// ─── GROUP C: FORECAST PAGE ───────────────────────────────────────────────────
const ForecastPage = ({ fixedTx, accounts, categories, variableTx, accMap, catMap, token, user, filterYear, isMobile, showToast }) => {
  const t = useMemo(()=>sb.db(token),[token]);
  const [horizon, setHorizon] = useState(6);
  const [view, setView] = useState("aggregate"); // "aggregate" | account id
  const [confirmations, setConfirmations] = useState({});
  const [loading, setLoading] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(()=>{
    t("fixed_confirmations").get(`user_id=eq.${user?.id}&order=year,month`).then(r=>{
      if(!Array.isArray(r)) return;
      const map = {};
      r.forEach(c=>{ map[`${c.transaction_id}_${c.month}_${c.year}`]=c; });
      setConfirmations(map);
    });
  },[t,user]);

  const getKey = (txId, month, year) => `${txId}_${month}_${year}`;
  const isConfirmed = (txId, month, year) => !!confirmations[getKey(txId,month,year)]?.confirmed;

  // Build month range: last 3 actual months + next `horizon` months
  const monthRange = useMemo(()=>{
    const today = new Date();
    const result = [];
    for(let i=-3; i<horizon; i++){
      const d = new Date(today.getFullYear(), today.getMonth()+i, 1);
      result.push({
        month: MONTHS[d.getMonth()],
        monthShort: MONTHS_SHORT[d.getMonth()],
        year: d.getFullYear(),
        isFuture: i >= 0,
        isToday: i === 0,
      });
    }
    return result;
  },[horizon]);

  // For a given account (or all), compute income/expense/net per month
  const computeSeries = useCallback((accId)=>{
    return monthRange.map(({month,year,isFuture})=>{
      const txFilter = accId==="all" ? fixedTx : fixedTx.filter(tx=>tx.account_id===accId);
      const income = txFilter.filter(tx=>tx.type==="income").reduce((s,tx)=>{
        const conf = confirmations[getKey(tx.id,month,year)];
        return s+(conf?.confirmed ? Number(conf.actual_amount??tx.amount) : Number(tx.amount));
      },0);
      const expense = txFilter.filter(tx=>tx.type==="expense").reduce((s,tx)=>{
        const conf = confirmations[getKey(tx.id,month,year)];
        return s+(conf?.confirmed ? Number(conf.actual_amount??tx.amount) : Number(tx.amount));
      },0);
      // Add variable (historical only)
      const varTx = accId==="all" ? variableTx : variableTx.filter(tx=>tx.account_id===accId);
      const varInc = isFuture ? 0 : varTx.filter(tx=>{const d=new Date(tx.date);return MONTHS[d.getMonth()]===month&&d.getFullYear()===year&&tx.type==="income";}).reduce((s,tx)=>s+Number(tx.amount),0);
      const varExp = isFuture ? 0 : varTx.filter(tx=>{const d=new Date(tx.date);return MONTHS[d.getMonth()]===month&&d.getFullYear()===year&&tx.type==="expense";}).reduce((s,tx)=>s+Number(tx.amount),0);
      return {
        label: MONTHS_SHORT[MONTHS.indexOf(month)],
        month, year, isFuture,
        income: income+varInc,
        expense: expense+varExp,
        net: (income+varInc)-(expense+varExp),
      };
    });
  },[monthRange, fixedTx, variableTx, confirmations]);

  const activeSeries = useMemo(()=>computeSeries(view),[computeSeries,view]);

  // SVG multi-line chart with zero-line, gradient fill, dotted forecast area
  const MultiLineChart = ({ series, height=220 }) => {
    if(!series.length) return null;
    const W=600, H=height, PAD={t:20,r:20,b:36,l:56};
    const chartW=W-PAD.l-PAD.r, chartH=H-PAD.t-PAD.b;
    const allVals=[...series.map(d=>d.income),...series.map(d=>d.expense),...series.map(d=>d.net),0];
    const maxV=Math.max(...allVals)*1.1||1;
    const minV=Math.min(...allVals,0)*1.1||0;
    const rangeV=maxV-minV||1;
    const xOf=i=>(i/(series.length-1||1))*chartW;
    const yOf=v=>chartH-(((v-minV)/rangeV)*chartH);
    const linePath=(key)=>series.map((d,i)=>`${i===0?"M":"L"}${xOf(i)},${yOf(d[key])}`).join(" ");
    const areaPath=(key,base=0)=>`${series.map((d,i)=>`${i===0?"M":"L"}${xOf(i)},${yOf(d[key])}`).join(" ")} L${xOf(series.length-1)},${yOf(base)} L${xOf(0)},${yOf(base)} Z`;
    const zeroY=yOf(0);
    // Find split index (past → future)
    const splitIdx=series.findIndex(d=>d.isFuture);

    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height}} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="fc_inc" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="#10b981" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="fc_exp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.15"/>
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="fc_net_pos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25"/>
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0"/>
          </linearGradient>
          <clipPath id="past_clip">
            <rect x="0" y="0" width={splitIdx>=0?xOf(splitIdx):chartW} height={chartH}/>
          </clipPath>
          <clipPath id="future_clip">
            <rect x={splitIdx>=0?xOf(splitIdx):chartW} y="0" width={chartW} height={chartH}/>
          </clipPath>
        </defs>

        <g transform={`translate(${PAD.l},${PAD.t})`}>
          {/* Grid lines */}
          {[0,0.25,0.5,0.75,1].map(f=>{
            const y=f*chartH;
            const val=maxV-(f*rangeV);
            return <g key={f}>
              <line x1={0} y1={y} x2={chartW} y2={y} stroke="#f0f0f0" strokeWidth={1}/>
              <text x={-6} y={y+4} textAnchor="end" fontSize={9} fill="#bbb">{fmtN(val,0)}</text>
            </g>;
          })}

          {/* Zero line */}
          {minV<0&&<line x1={0} y1={zeroY} x2={chartW} y2={zeroY} stroke="#ddd" strokeWidth={1} strokeDasharray="4,2"/>}

          {/* Future shading */}
          {splitIdx>=0&&<rect x={xOf(splitIdx)} y={0} width={chartW-xOf(splitIdx)} height={chartH} fill="#f8f9ff" opacity={0.7}/>}

          {/* Area fills */}
          <path d={areaPath("income")} fill="url(#fc_inc)" opacity={0.8}/>
          <path d={areaPath("expense")} fill="url(#fc_exp)" opacity={0.8}/>

          {/* Lines - solid for past, dashed for future */}
          {["income","expense","net"].map((key,ki)=>{
            const colors=["#10b981","#ef4444","#6366f1"];
            const c=colors[ki];
            return <g key={key}>
              {/* Past solid */}
              <path d={linePath(key)} fill="none" stroke={c} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" clipPath="url(#past_clip)"/>
              {/* Future dashed */}
              <path d={linePath(key)} fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6,4" clipPath="url(#future_clip)" opacity={0.7}/>
            </g>;
          })}

          {/* Data points */}
          {series.map((d,i)=>{
            const netColor=d.net>=0?"#6366f1":"#ef4444";
            return <g key={i}>
              <circle cx={xOf(i)} cy={yOf(d.income)} r={3} fill="#10b981" stroke="#fff" strokeWidth={1.5}/>
              <circle cx={xOf(i)} cy={yOf(d.expense)} r={3} fill="#ef4444" stroke="#fff" strokeWidth={1.5}/>
              <circle cx={xOf(i)} cy={yOf(d.net)} r={d.isFuture?5:4} fill={netColor} stroke="#fff" strokeWidth={2}/>
            </g>;
          })}

          {/* X axis labels */}
          {series.map((d,i)=>(
            <text key={i} x={xOf(i)} y={chartH+20} textAnchor="middle" fontSize={9} fill={d.isFuture?"#6366f1":"#bbb"} fontWeight={d.isToday?700:400}>
              {d.monthShort}{d.year!==new Date().getFullYear()?`'${String(d.year).slice(2)}`:""}
            </text>
          ))}

          {/* "Forecast →" label */}
          {splitIdx>=0&&<text x={xOf(splitIdx)+4} y={-6} fontSize={9} fill="#6366f1" fontWeight={700}>Forecast →</text>}
          {splitIdx>0&&<text x={xOf(splitIdx)-4} y={-6} fontSize={9} fill="#bbb" textAnchor="end">← Storico</text>}

          {/* Vertical split line */}
          {splitIdx>=0&&<line x1={xOf(splitIdx)} y1={-10} x2={xOf(splitIdx)} y2={chartH} stroke="#6366f1" strokeWidth={1} strokeDasharray="4,3" opacity={0.5}/>}
        </g>
      </svg>
    );
  };

  const confirmFixed = async (tx, month, year) => {
    const key = getKey(tx.id, month, year);
    const existing = confirmations[key];
    const payload = { user_id:user.id, transaction_id:tx.id, month, year, confirmed:true,
      actual_amount: existing?.actual_amount ?? Number(tx.amount),
      confirmed_at: new Date().toISOString() };
    setLoading(true);
    if(existing?.id){
      await t("fixed_confirmations").patch(payload,`id=eq.${existing.id}`);
      setConfirmations(c=>({...c,[key]:{...existing,...payload}}));
    } else {
      const res = await t("fixed_confirmations").post(payload);
      const newC = Array.isArray(res)?res[0]:res;
      if(newC?.id) setConfirmations(c=>({...c,[key]:newC}));
    }
    setLoading(false); showToast("Confermato ✓");
  };

  const updateActual = async (tx, month, year, val) => {
    const key = getKey(tx.id,month,year);
    const existing = confirmations[key];
    if(!existing?.id) return;
    await t("fixed_confirmations").patch({actual_amount:parseFloat(val)},`id=eq.${existing.id}`);
    setConfirmations(c=>({...c,[key]:{...existing,actual_amount:parseFloat(val)}}));
  };

  // KPI cards
  const kpis = useMemo(()=>{
    const future = activeSeries.filter(d=>d.isFuture);
    const past   = activeSeries.filter(d=>!d.isFuture);
    return {
      avgFutureNet: future.length ? future.reduce((s,d)=>s+d.net,0)/future.length : 0,
      totalFutureExp: future.reduce((s,d)=>s+d.expense,0),
      totalFutureInc: future.reduce((s,d)=>s+d.income,0),
      avgPastNet: past.length ? past.reduce((s,d)=>s+d.net,0)/past.length : 0,
    };
  },[activeSeries]);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>

      {/* Header + controls */}
      <div style={{background:"linear-gradient(135deg,#1a1a2e,#16213e)",borderRadius:20,padding:"20px 22px",color:"#fff"}}>
        <div style={{fontSize:15,fontWeight:900,marginBottom:4}}>🔮 Forecast Finanziario</div>
        <div style={{fontSize:12,color:"#ffffff55",marginBottom:16}}>Linee continue = storico · linee tratteggiate = previsione basata sulle voci fisse</div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <div style={{display:"flex",gap:4}}>
            {[3,6,12].map(h=>(
              <button key={h} onClick={()=>setHorizon(h)} style={{padding:"6px 14px",borderRadius:8,border:`1px solid ${horizon===h?"#a78bfa":"#ffffff22"}`,background:horizon===h?"#6366f144":"transparent",color:horizon===h?"#a78bfa":"#ffffff66",fontSize:12,cursor:"pointer",fontWeight:horizon===h?700:400}}>
                +{h} mesi
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* View selector (aggregate + per account) */}
      <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:2}}>
        <button onClick={()=>setView("all")} style={{padding:"8px 16px",borderRadius:20,border:`1.5px solid ${view==="all"?"#6366f1":"#eee"}`,background:view==="all"?"#6366f111":"#fff",color:view==="all"?"#6366f1":"#666",fontWeight:view==="all"?700:400,fontSize:12,cursor:"pointer",whiteSpace:"nowrap"}}>
          🌐 Aggregato
        </button>
        {accounts.map(acc=>(
          <button key={acc.id} onClick={()=>setView(acc.id)} style={{padding:"8px 14px",borderRadius:20,border:`1.5px solid ${view===acc.id?acc.color:"#eee"}`,background:view===acc.id?acc.color+"11":"#fff",color:view===acc.id?acc.color:"#666",fontWeight:view===acc.id?700:400,fontSize:12,cursor:"pointer",whiteSpace:"nowrap"}}>
            {acc.icon} {acc.name}
          </button>
        ))}
      </div>

      {/* Main chart */}
      <div style={{background:"#fff",borderRadius:20,padding:isMobile?"14px":"20px",boxShadow:"0 2px 16px #0001"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
          <div style={{fontSize:14,fontWeight:700,color:"#1a1a2e"}}>
            {view==="all"?"Tutti i Conti":accounts.find(a=>a.id===view)?.name||""}
          </div>
          {/* Legend */}
          <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
            {[["#10b981","Entrate"],["#ef4444","Uscite"],["#6366f1","Netto"]].map(([c,l])=>(
              <div key={l} style={{display:"flex",alignItems:"center",gap:5}}>
                <svg width={24} height={10}><line x1={0} y1={5} x2={10} y2={5} stroke={c} strokeWidth={2}/><line x1={14} y1={5} x2={24} y2={5} stroke={c} strokeWidth={2} strokeDasharray="3,2" opacity={0.7}/></svg>
                <span style={{fontSize:11,color:"#666"}}>{l}</span>
              </div>
            ))}
          </div>
        </div>
        <MultiLineChart series={activeSeries} height={isMobile?180:240}/>
      </div>

      {/* KPI strip */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10}}>
        {[
          {l:"Entrate previste",v:kpis.totalFutureInc,c:"#10b981",icon:"↑"},
          {l:"Uscite previste",v:kpis.totalFutureExp,c:"#ef4444",icon:"↓"},
          {l:"Netto medio/mese (forecast)",v:kpis.avgFutureNet,c:kpis.avgFutureNet>=0?"#6366f1":"#ef4444",icon:"≈"},
          {l:"Netto medio/mese (storico)",v:kpis.avgPastNet,c:kpis.avgPastNet>=0?"#10b981":"#ef4444",icon:"📊"},
        ].map(k=>(
          <div key={k.l} style={{background:"#fff",borderRadius:14,padding:14,boxShadow:"0 2px 8px #0001"}}>
            <div style={{fontSize:10,color:"#bbb",marginBottom:4}}>{k.l}</div>
            <div style={{fontSize:18,fontWeight:900,color:k.c}}>{k.icon} {fmtN(Math.abs(k.v))}</div>
          </div>
        ))}
      </div>

      {/* Per-account mini charts (only in aggregate view) */}
      {view==="all"&&accounts.length>1&&(
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
          {accounts.map(acc=>{
            const s=computeSeries(acc.id);
            const futureNet=s.filter(d=>d.isFuture).reduce((sum,d)=>sum+d.net,0);
            return (
              <div key={acc.id} style={{background:"#fff",borderRadius:16,padding:16,boxShadow:"0 2px 8px #0001",borderLeft:`4px solid ${acc.color}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#1a1a2e"}}>{acc.icon} {acc.name}</div>
                  <div style={{fontSize:13,fontWeight:800,color:futureNet>=0?"#10b981":"#ef4444"}}>{futureNet>=0?"+":""}{fmtN(futureNet)}</div>
                </div>
                <AreaChart data={s.map(d=>({label:d.label,value:d.expense,value2:d.income}))} color="#ef4444" color2="#10b981" showBoth height={70}/>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:8,fontSize:10,color:"#bbb"}}>
                  <span>↑ {fmtN(s.filter(d=>d.isFuture).reduce((s,d)=>s+d.income,0))}</span>
                  <span>↓ {fmtN(s.filter(d=>d.isFuture).reduce((s,d)=>s+d.expense,0))}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation detail (collapsible) */}
      <div style={{background:"#fff",borderRadius:18,boxShadow:"0 2px 12px #0001",overflow:"hidden"}}>
        <button onClick={()=>setShowDetail(s=>!s)}
          style={{width:"100%",padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"none",border:"none",cursor:"pointer"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#1a1a2e"}}>📋 Conferma Voci Mensili</div>
          <div style={{fontSize:12,color:"#6366f1",fontWeight:600}}>{showDetail?"▲ Chiudi":"▼ Espandi"}</div>
        </button>
        {showDetail&&(
          <div style={{borderTop:"1px solid #f5f5f5"}}>
            {monthRange.map(({month,year,isFuture})=>{
              const relevantTx = view==="all" ? fixedTx : fixedTx.filter(tx=>tx.account_id===view);
              if(!relevantTx.length) return null;
              const confirmed = relevantTx.filter(tx=>isConfirmed(tx.id,month,year)).length;
              return (
                <div key={`${month}${year}`} style={{borderBottom:"1px solid #f9f9f9"}}>
                  <div style={{padding:"10px 18px",background:isFuture?"#f8f9ff":"#fafafa",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:12,fontWeight:700,color:isFuture?"#6366f1":"#1a1a2e"}}>{isFuture?"🔮":""} {month} {year}</span>
                    <span style={{fontSize:11,color:"#bbb"}}>{confirmed}/{relevantTx.length} confermati</span>
                  </div>
                  {relevantTx.map(tx=>{
                    const key=getKey(tx.id,month,year);
                    const conf=confirmations[key];
                    const confirmed=conf?.confirmed;
                    const cat=catMap[tx.category_id];
                    const acc=accMap[tx.account_id];
                    return (
                      <div key={tx.id} style={{padding:"9px 18px",display:"flex",alignItems:"center",gap:10,borderTop:"1px solid #f5f5f5"}}>
                        <div style={{width:28,height:28,borderRadius:8,background:cat?.color+"22"||"#f5f5f5",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>{cat?.icon||"📌"}</div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:12,fontWeight:600,color:confirmed?"#1a1a2e":"#aaa"}}>{tx.name}</div>
                          <div style={{fontSize:10,color:"#ccc"}}>{acc?.icon} {acc?.name} · gg {tx.recurring_day||25}</div>
                        </div>
                        {confirmed ? (
                          <input type="number" defaultValue={conf.actual_amount??tx.amount}
                            onBlur={e=>updateActual(tx,month,year,e.target.value)}
                            style={{width:72,border:"1.5px solid #10b98133",borderRadius:8,padding:"3px 7px",fontSize:12,fontWeight:700,textAlign:"right",color:"#10b981"}}/>
                        ) : (
                          <span style={{fontSize:12,color:"#bbb",textDecoration:"line-through"}}>{acc?.currency} {fmtN(tx.amount)}</span>
                        )}
                        <button onClick={()=>confirmFixed(tx,month,year)} disabled={loading}
                          style={{padding:"5px 10px",borderRadius:8,border:`1px solid ${confirmed?"#10b98133":"#6366f133"}`,background:confirmed?"#f0fff4":"#f0f0ff",color:confirmed?"#10b981":"#6366f1",fontSize:11,cursor:"pointer",fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}>
                          {confirmed?"✓":"Conferma"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── PREVIEW PANEL (used in ReportBuilder) ───────────────────────────────────
const PreviewPanel = ({ report, computeReportData, renderChart }) => {
  const data = computeReportData(report);
  return (
    <div style={{background:"#f8f9fc",borderRadius:14,padding:16,marginBottom:16}}>
      <div style={{fontSize:11,fontWeight:700,color:"#bbb",letterSpacing:1,marginBottom:10}}>ANTEPRIMA</div>
      {renderChart(report, data)}
    </div>
  );
};

// ─── GROUP C: REPORT BUILDER ──────────────────────────────────────────────────
const ReportBuilder = ({ transactions, accounts, categories, catMap, accMap, token, user, showToast, isMobile }) => {
  const t = useMemo(()=>sb.db(token),[token]);
  const [savedReports, setSavedReports] = useState([]);
  const [building, setBuilding] = useState(null);
  const [editMode, setEditMode] = useState(false);

  useEffect(()=>{
    t("user_preferences").get(`user_id=eq.${user?.id}`).then(r=>{
      if(Array.isArray(r)&&r[0]?.saved_reports) setSavedReports(r[0].saved_reports);
    });
  },[t,user]);

  const saveReport = async (report) => {
    const updated = editMode
      ? savedReports.map(r=>r.id===report.id?report:r)
      : [...savedReports,{...report,id:Date.now().toString()}];
    setSavedReports(updated);
    await t("user_preferences").upsert({user_id:user.id,saved_reports:updated});
    showToast("Report salvato ✓");
    setBuilding(null); setEditMode(false);
  };

  const deleteReport = async (id) => {
    const updated = savedReports.filter(r=>r.id!==id);
    setSavedReports(updated);
    await t("user_preferences").upsert({user_id:user.id,saved_reports:updated});
    showToast("Report eliminato ✓");
  };

  const computeReportData = (report) => {
    const today = new Date();
    let fromDate, toDate = today.toISOString().split("T")[0];
    switch(report.period){
      case "this_month": fromDate=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-01`; break;
      case "last_3": { const d=new Date(today); d.setMonth(d.getMonth()-3); fromDate=d.toISOString().split("T")[0]; } break;
      case "last_6": { const d=new Date(today); d.setMonth(d.getMonth()-6); fromDate=d.toISOString().split("T")[0]; } break;
      case "last_12": { const d=new Date(today); d.setFullYear(d.getFullYear()-1); fromDate=d.toISOString().split("T")[0]; } break;
      case "this_year": fromDate=`${today.getFullYear()}-01-01`; break;
      case "custom": fromDate=report.fromDate||`${today.getFullYear()}-01-01`; toDate=report.toDate||toDate; break;
      default: fromDate=`${today.getFullYear()}-01-01`;
    }
    const tx = transactions.filter(t=>t.date>=fromDate&&t.date<=toDate);

    switch(report.metric){
      case "expenses_by_cat": {
        const m={}; tx.filter(t=>t.type==="expense").forEach(t=>{const c=t.category_id||"none";if(!m[c])m[c]=0;m[c]+=Number(t.amount);});
        return Object.entries(m).map(([cid,val])=>({label:(catMap[cid]?.icon||"")+" "+(catMap[cid]?.name||"Altro"),value:val,color:catMap[cid]?.color||"#9ca3af"})).sort((a,b)=>b.value-a.value);
      }
      case "income_by_acc": {
        const m={}; tx.filter(t=>t.type==="income").forEach(t=>{const a=t.account_id||"none";if(!m[a])m[a]=0;m[a]+=Number(t.amount);});
        return Object.entries(m).map(([aid,val])=>({label:(accMap[aid]?.icon||"")+" "+(accMap[aid]?.name||"—"),value:val,color:accMap[aid]?.color||"#6366f1"}));
      }
      case "expenses_by_acc": {
        const m={}; tx.filter(t=>t.type==="expense").forEach(t=>{const a=t.account_id||"none";if(!m[a])m[a]=0;m[a]+=Number(t.amount);});
        return Object.entries(m).map(([aid,val])=>({label:(accMap[aid]?.icon||"")+" "+(accMap[aid]?.name||"—"),value:val,color:accMap[aid]?.color||"#ef4444"}));
      }
      case "net_by_month": {
        return MONTHS_SHORT.map((label,i)=>{
          const m=MONTHS[i];
          const yr=today.getFullYear();
          const inc=tx.filter(t=>{const d=new Date(t.date);return MONTHS[d.getMonth()]===m&&d.getFullYear()===yr&&t.type==="income";}).reduce((s,t)=>s+Number(t.amount),0);
          const exp=tx.filter(t=>{const d=new Date(t.date);return MONTHS[d.getMonth()]===m&&d.getFullYear()===yr&&t.type==="expense";}).reduce((s,t)=>s+Number(t.amount),0);
          return {label,value:inc-exp,color:(inc-exp)>=0?"#10b981":"#ef4444"};
        });
      }
      case "expenses_trend": {
        return MONTHS_SHORT.map((label,i)=>{
          const m=MONTHS[i]; const yr=today.getFullYear();
          const val=tx.filter(t=>{const d=new Date(t.date);return MONTHS[d.getMonth()]===m&&d.getFullYear()===yr&&t.type==="expense";}).reduce((s,t)=>s+Number(t.amount),0);
          return {label,value:val,color:"#ef4444"};
        });
      }
      case "income_trend": {
        return MONTHS_SHORT.map((label,i)=>{
          const m=MONTHS[i]; const yr=today.getFullYear();
          const val=tx.filter(t=>{const d=new Date(t.date);return MONTHS[d.getMonth()]===m&&d.getFullYear()===yr&&t.type==="income";}).reduce((s,t)=>s+Number(t.amount),0);
          return {label,value:val,color:"#10b981"};
        });
      }
      case "budget_vs_actual": {
        return categories.filter(c=>c.budget>0).map(c=>{
          const spent=tx.filter(t=>t.type==="expense"&&t.category_id===c.id).reduce((s,t)=>s+Number(t.amount),0);
          return {label:c.icon+" "+c.name,value:spent,value2:c.budget,color:spent>c.budget?"#ef4444":c.color};
        });
      }
      case "fixed_vs_variable": {
        const fixed=tx.filter(t=>t.is_fixed&&t.type==="expense").reduce((s,t)=>s+Number(t.amount),0);
        const variable=tx.filter(t=>!t.is_fixed&&t.type==="expense").reduce((s,t)=>s+Number(t.amount),0);
        return [{label:"Fisso 📌",value:fixed,color:"#6366f1"},{label:"Variabile 📊",value:variable,color:"#f59e0b"}];
      }
      default: return [];
    }
  };

  const renderChart = (report, data) => {
    if(!data.length) return <div style={{textAlign:"center",color:"#ccc",padding:"30px 0",fontSize:13}}>Nessun dato per questo periodo</div>;
    const total = data.reduce((s,d)=>s+Math.abs(d.value),0);
    switch(report.chartType){
      case "bar": return <BarChart data={data.map(d=>({...d,label:d.label.slice(0,8)}))} color={data[0]?.color||"#6366f1"}/>;
      case "line": case "area": return <AreaChart data={data} color={data[0]?.color||"#6366f1"} height={100}/>;
      case "donut": return (
        <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
          <DonutChart data={data.map(d=>({value:d.value,color:d.color}))} size={140} centerLabel="Totale" centerValue={fmtN(total)}/>
          <div style={{flex:1}}>
            {data.slice(0,6).map((d,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:8,height:8,borderRadius:3,background:d.color}}/><span style={{fontSize:11,color:"#666"}}>{d.label}</span></div>
                <span style={{fontSize:11,fontWeight:700}}>{fmtN(d.value)} ({total>0?((d.value/total)*100).toFixed(0):0}%)</span>
              </div>
            ))}
          </div>
        </div>
      );
      case "table": return (
        <table style={{width:"100%",fontSize:12,borderCollapse:"collapse"}}>
          <thead><tr style={{background:"#f8f9fc"}}><th style={{padding:"6px 10px",textAlign:"left",fontWeight:700,color:"#999"}}>Voce</th><th style={{padding:"6px 10px",textAlign:"right",fontWeight:700,color:"#999"}}>Importo</th><th style={{padding:"6px 10px",textAlign:"right",fontWeight:700,color:"#999"}}>%</th></tr></thead>
          <tbody>{data.map((d,i)=><tr key={i} style={{borderBottom:"1px solid #f5f5f5"}}><td style={{padding:"6px 10px",color:"#666"}}>{d.label}</td><td style={{padding:"6px 10px",textAlign:"right",fontWeight:700}}>{fmtN(d.value)}</td><td style={{padding:"6px 10px",textAlign:"right",color:"#bbb"}}>{total>0?((d.value/total)*100).toFixed(1):0}%</td></tr>)}</tbody>
        </table>
      );
      default: return null;
    }
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:15,fontWeight:800,color:"#1a1a2e"}}>📊 Report Builder</div>
          <div style={{fontSize:12,color:"#bbb"}}>Crea e salva i tuoi report personalizzati</div>
        </div>
        <button onClick={()=>{setBuilding({chartType:"bar",metric:"expenses_by_cat",period:"this_month",title:"Nuovo Report"});setEditMode(false);}}
          style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:12,padding:"10px 18px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>
          + Nuovo Report
        </button>
      </div>

      {/* Builder panel */}
      {building&&(
        <div style={{background:"#fff",borderRadius:20,padding:24,boxShadow:"0 4px 24px #0002",border:"2px solid #6366f133"}}>
          <div style={{fontSize:14,fontWeight:700,color:"#1a1a2e",marginBottom:18}}>{editMode?"✏️ Modifica Report":"🔨 Nuovo Report"}</div>

          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:16,marginBottom:16}}>
            <Field label="TITOLO">
              <Inp value={building.title||""} onChange={e=>setBuilding(b=>({...b,title:e.target.value}))} placeholder="Es. Spese mensili per categoria"/>
            </Field>
            <Field label="PERIODO">
              <Sel value={building.period||"this_month"} onChange={e=>setBuilding(b=>({...b,period:e.target.value}))}>
                {REPORT_PERIODS.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}
              </Sel>
            </Field>
          </div>

          {building.period==="custom"&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
              <Field label="DA"><Inp type="date" value={building.fromDate||""} onChange={e=>setBuilding(b=>({...b,fromDate:e.target.value}))}/></Field>
              <Field label="A"><Inp type="date" value={building.toDate||""} onChange={e=>setBuilding(b=>({...b,toDate:e.target.value}))}/></Field>
            </div>
          )}

          <Field label="METRICA">
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:6}}>
              {REPORT_METRICS.map(m=>(
                <button key={m.id} onClick={()=>setBuilding(b=>({...b,metric:m.id}))}
                  style={{padding:"8px 12px",border:`1.5px solid ${building.metric===m.id?"#6366f1":"#eee"}`,borderRadius:10,background:building.metric===m.id?"#6366f111":"#fff",color:building.metric===m.id?"#6366f1":"#666",fontSize:12,cursor:"pointer",textAlign:"left",fontWeight:building.metric===m.id?700:400}}>
                  {m.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="TIPO GRAFICO">
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {REPORT_CHART_TYPES.map(ct=>(
                <button key={ct.id} onClick={()=>setBuilding(b=>({...b,chartType:ct.id}))}
                  style={{padding:"8px 14px",border:`1.5px solid ${building.chartType===ct.id?"#6366f1":"#eee"}`,borderRadius:10,background:building.chartType===ct.id?"#6366f111":"#fff",color:building.chartType===ct.id?"#6366f1":"#666",fontSize:13,cursor:"pointer",fontWeight:building.chartType===ct.id?700:400}}>
                  {ct.icon} {ct.label}
                </button>
              ))}
            </div>
          </Field>

          {/* Live preview */}
          {building.metric&&building.chartType&&(
            <PreviewPanel report={building} computeReportData={computeReportData} renderChart={renderChart}/>
          )}

          <div style={{display:"flex",gap:10}}>
            <div style={{flex:1}}><Btn onClick={()=>{setBuilding(null);setEditMode(false);}} label="Annulla" outline color="#999" small/></div>
            <div style={{flex:2}}><Btn onClick={()=>saveReport(building)} label="💾 Salva Report" small/></div>
          </div>
        </div>
      )}

      {/* Saved reports */}
      {savedReports.length===0&&!building&&(
        <div style={{textAlign:"center",color:"#ccc",padding:"60px 0",fontSize:13}}>
          <div style={{fontSize:32,marginBottom:12}}>📊</div>
          Nessun report salvato. Crea il tuo primo report!
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14}}>
        {savedReports.map(report=>{
          const data = computeReportData(report);
          return (
            <div key={report.id} style={{background:"#fff",borderRadius:18,padding:20,boxShadow:"0 2px 12px #0001"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:"#1a1a2e"}}>{report.title}</div>
                  <div style={{fontSize:11,color:"#bbb",marginTop:2}}>
                    {REPORT_METRICS.find(m=>m.id===report.metric)?.label} · {REPORT_PERIODS.find(p=>p.id===report.period)?.label}
                  </div>
                </div>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>{setBuilding({...report});setEditMode(true);}} style={{background:"#f5f5f5",border:"none",borderRadius:8,width:30,height:30,cursor:"pointer",fontSize:14}}>✏️</button>
                  <button onClick={()=>deleteReport(report.id)} style={{background:"#fff0f0",border:"none",borderRadius:8,width:30,height:30,cursor:"pointer",fontSize:14}}>🗑</button>
                </div>
              </div>
              {renderChart(report,data)}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── AUTH SCREEN ──────────────────────────────────────────────────────────────
const AuthScreen = ({onAuth}) => {
  const [mode,setMode]=useState("login");
  const [email,setEmail]=useState("");
  const [pw,setPw]=useState("");
  const [name,setName]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [showPw,setShowPw]=useState(false);

  const handle=async()=>{
    if(!email||!pw){setError("Inserisci email e password");return;}
    if(mode==="register"&&!name){setError("Inserisci il tuo nome");return;}
    setLoading(true);setError("");
    try {
      const data=mode==="login"?await sb.auth.signIn(email,pw):await sb.auth.signUp(email,pw,name);
      if(data.error) throw new Error(data.error_description||data.msg||"Credenziali non valide");
      if(!data.access_token) throw new Error("Credenziali non valide");
      localStorage.setItem("sb_session",JSON.stringify({access_token:data.access_token,refresh_token:data.refresh_token,user:data.user}));
      onAuth({token:data.access_token,refresh_token:data.refresh_token,user:data.user});
    } catch(e){setError(e.message);}
    setLoading(false);
  };

  return (
    <div style={{minHeight:"100vh",background:`linear-gradient(135deg,#0f1117 0%,#1c1f2e 60%,#16213e 100%)`,display:"flex",fontFamily:"'Inter',system-ui,sans-serif"}}>
      <style>{CSS}</style>
      {/* Left panel — branding */}
      <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",padding:"60px 64px",display:"none"}}>
      </div>
      {/* Right panel — form */}
      <div style={{width:"100%",maxWidth:460,margin:"auto",padding:24}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:10,marginBottom:12}}>
            <div style={{width:42,height:42,borderRadius:14,background:`linear-gradient(135deg,${T.primary},${T.primaryDk})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,boxShadow:`0 4px 20px ${T.primary}55`}}>💼</div>
            <div style={{fontSize:24,fontWeight:800,color:"#fff",letterSpacing:-0.5}}>Fina</div>
          </div>
          <div style={{fontSize:13,color:"#ffffff44"}}>Gestione finanziaria familiare multidevice</div>
        </div>

        <div style={{background:T.surface,borderRadius:24,padding:32,boxShadow:"0 24px 80px #00000055"}}>
          <TabSwitch tabs={[["login","Accedi"],["register","Registrati"]]} value={mode} onChange={v=>{setMode(v);setError("");}}/>

          {mode==="register"&&(
            <Field label="NOME COMPLETO">
              <Inp value={name} onChange={e=>setName(e.target.value)} placeholder="Mario Rossi" autoFocus/>
            </Field>
          )}
          <Field label="EMAIL">
            <Inp type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="mario@esempio.com"/>
          </Field>
          <Field label="PASSWORD">
            <div style={{position:"relative"}}>
              <Inp type={showPw?"text":"password"} value={pw} onChange={e=>setPw(e.target.value)} placeholder="Minimo 8 caratteri" style={{paddingRight:44}}/>
              <button onClick={()=>setShowPw(!showPw)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:16,color:T.gray400}}>{showPw?"🙈":"👁"}</button>
            </div>
          </Field>

          {error&&(
            <div style={{background:"#fff0f0",border:`1px solid ${T.danger}33`,borderRadius:10,padding:"10px 14px",fontSize:13,color:T.danger,marginBottom:16,display:"flex",alignItems:"center",gap:8}}>
              <span>⚠️</span>{error}
            </div>
          )}

          <Btn onClick={handle} disabled={loading} label={loading?"Caricamento...":mode==="login"?"Accedi →":"Crea account →"} color={T.primary}/>

          {mode==="login"&&(
            <div style={{textAlign:"center",marginTop:16,fontSize:13,color:T.gray400}}>
              Nessun account?{" "}
              <button onClick={()=>{setMode("register");setError("");}} style={{background:"none",border:"none",color:T.primary,fontWeight:600,cursor:"pointer",fontSize:13}}>
                Registrati gratis
              </button>
            </div>
          )}
        </div>
        <div style={{textAlign:"center",marginTop:20,fontSize:11,color:"#ffffff22"}}>
          Dati protetti · Isolamento per utente · Powered by Supabase
        </div>
      </div>
    </div>
  );
};

// ─── REPORTS PAGE COMPONENT ───────────────────────────────────────────────────
const ReportsPage = ({ filteredAll, variableTx, fixedAsMonthly, filterYear, accounts, catMap, accMap, trend, exportCSV, openModal }) => {
  const [rPeriod, setRPeriod] = useState("month");
  const [dFrom, setDFrom] = useState(`${CUR_YEAR}-01-01`);
  const [dTo, setDTo] = useState(TODAY);

  const pTx = useMemo(() => {
    if (rPeriod === "month") return filteredAll;
    return [...variableTx, ...fixedAsMonthly].filter(tx => {
      const d = tx.date;
      if (rPeriod === "year") return d.startsWith(String(filterYear));
      if (rPeriod === "custom") return d >= dFrom && d <= dTo;
      return true;
    });
  }, [rPeriod, dFrom, dTo, filteredAll, variableTx, fixedAsMonthly, filterYear]);

  const pExp = pTx.filter(tx => tx.type === "expense");
  const pInc = pTx.filter(tx => tx.type === "income");
  const pSav = pTx.filter(tx => tx.type === "saving");
  const totE = pExp.reduce((s, tx) => s + Number(tx.amount), 0);
  const totI = pInc.reduce((s, tx) => s + Number(tx.amount), 0);
  const totS = pSav.reduce((s, tx) => s + Number(tx.amount), 0);

  const pCats = useMemo(() => {
    const m = {};
    pExp.forEach(tx => { const c = tx.category_id || "none"; if (!m[c]) m[c] = 0; m[c] += Number(tx.amount); });
    return Object.entries(m).map(([cid, val]) => ({ cid, val, cat: catMap[cid] || { name:"Altro", color:"#9ca3af", icon:"📦" } })).sort((a, b) => b.val - a.val);
  }, [pExp, catMap]);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {/* Period selector */}
      <div style={{ background:"#fff", borderRadius:16, padding:18, boxShadow:"0 2px 12px #0001" }}>
        <div style={{ fontSize:13, fontWeight:700, marginBottom:14 }}>Periodo di analisi</div>
        <TabSwitch tabs={[["month","Mese"],["year","Anno"],["custom","Personalizzato"]]} value={rPeriod} onChange={setRPeriod}/>
        {rPeriod === "custom" && (
          <div style={{ display:"flex", gap:10 }}>
            <Field label="DA"><Inp type="date" value={dFrom} onChange={e => setDFrom(e.target.value)}/></Field>
            <Field label="A"><Inp type="date" value={dTo} onChange={e => setDTo(e.target.value)}/></Field>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
        {[{l:"Entrate",v:totI,c:"#10b981"},{l:"Uscite",v:totE,c:"#ef4444"},{l:"Saldo",v:totI-totE-totS,c:totI-totE-totS>=0?"#6366f1":"#ef4444"}].map(k=>(
          <div key={k.l} style={{ background:"#fff", borderRadius:14, padding:12, boxShadow:"0 2px 8px #0001", textAlign:"center" }}>
            <div style={{ fontSize:11, color:"#bbb", marginBottom:3 }}>{k.l}</div>
            <div style={{ fontSize:16, fontWeight:800, color:k.c }}>{fmtN(k.v)}</div>
          </div>
        ))}
      </div>

      {/* Donut */}
      {pCats.length > 0 && (
        <div style={{ background:"#fff", borderRadius:20, padding:20, boxShadow:"0 2px 12px #0001" }}>
          <div style={{ fontSize:13, fontWeight:700, marginBottom:16 }}>Distribuzione Spese</div>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:20 }}>
            <DonutChart data={pCats.map(c=>({value:c.val,color:c.cat.color}))} size={200} centerLabel="Totale" centerValue={fmtN(totE)}/>
          </div>
          {pCats.map(c=>(
            <div key={c.cid} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid #f5f5f5" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:12, height:12, borderRadius:4, background:c.cat.color }}/>
                <span style={{ fontSize:13, color:"#666" }}>{c.cat.icon} {c.cat.name}</span>
              </div>
              <div>
                <span style={{ fontSize:13, fontWeight:700 }}>{fmtN(c.val)}</span>
                <span style={{ fontSize:11, color:"#bbb", marginLeft:6 }}>({totE>0?((c.val/totE)*100).toFixed(0):0}%)</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Per account */}
      {accounts.map(acc => {
        const inc = pInc.filter(tx=>tx.account_id===acc.id).reduce((s,tx)=>s+Number(tx.amount),0);
        const exp = pExp.filter(tx=>tx.account_id===acc.id).reduce((s,tx)=>s+Number(tx.amount),0);
        const sav = pSav.filter(tx=>tx.account_id===acc.id).reduce((s,tx)=>s+Number(tx.amount),0);
        return (
          <div key={acc.id} style={{ background:"#fff", borderRadius:18, padding:18, boxShadow:"0 2px 12px #0001", borderLeft:`4px solid ${acc.color}` }}>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>{acc.icon} {acc.name} ({acc.currency})</div>
            {[{l:"Entrate",v:inc,c:"#10b981"},{l:"Uscite",v:exp,c:"#ef4444"},{l:"Risparmi",v:sav,c:"#6366f1"},{l:"Saldo",v:inc-exp-sav,c:inc-exp-sav>=0?"#10b981":"#ef4444"}].map(r=>(
              <div key={r.l} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid #f5f5f5" }}>
                <span style={{ fontSize:13, color:"#666" }}>{r.l}</span>
                <span style={{ fontSize:14, fontWeight:800, color:r.c }}>{r.v>=0?"+":""}{acc.currency} {fmtN(r.v)}</span>
              </div>
            ))}
          </div>
        );
      })}

      {/* Trend */}
      <div style={{ background:"#fff", borderRadius:20, padding:20, boxShadow:"0 2px 12px #0001" }}>
        <div style={{ fontSize:13, fontWeight:700, marginBottom:14 }}>Trend Ultimi 6 Mesi</div>
        <BarChart data={trend} color="#6366f1"/>
      </div>

      {/* Actions */}
      <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
        <button onClick={exportCSV} style={{ background:"#1a1a2e", border:"none", borderRadius:10, padding:"10px 18px", color:"#fff", fontSize:13, cursor:"pointer", fontWeight:600 }}>⬇ Export CSV</button>
        <button onClick={()=>openModal("import")} style={{ background:"#10b981", border:"none", borderRadius:10, padding:"10px 18px", color:"#fff", fontSize:13, cursor:"pointer", fontWeight:600 }}>📥 Import Excel</button>
      </div>
    </div>
  );
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
const BudgetApp = () => {
  const {token,user,signOut}=useAuth();
  const t=useCallback(sb.db(token),[token]);

  const [page,setPage]=useState("dashboard");
  const [data,setData]=useState({accounts:[],categories:[],transactions:[],transfers:[],savings:[],confirmations:[]});
  const [loading,setLoading]=useState(true);
  const [toast,setToast]=useState(null);
  const [modal,setModal]=useState(null);
  const [filterMonth,setFilterMonth]=useState(CUR_MONTH);
  const [filterYear,setFilterYear]=useState(CUR_YEAR);
  const [filterAccount,setFilterAccount]=useState("all");
  const [filterCat,setFilterCat]=useState("all");
  const [filterType,setFilterType]=useState("all");
  const [filterAmtMin,setFilterAmtMin]=useState("");
  const [filterAmtMax,setFilterAmtMax]=useState("");
  const [filterDateFrom,setFilterDateFrom]=useState("");
  const [filterDateTo,setFilterDateTo]=useState("");
  const [sortField,setSortField]=useState("date");
  const [sortDir,setSortDir]=useState("desc");
  const [showFilters,setShowFilters]=useState(false);
  const [fixedTab,setFixedTab]=useState("expense");
  const [rates,setRates]=useState(DEFAULT_RATES);
  const [isMobile,setIsMobile]=useState(window.innerWidth<768);
  const [quickDate,setQuickDate]=useState(TODAY);
  const [quickAmt,setQuickAmt]=useState("");
  const [quickCat,setQuickCat]=useState("");
  const [dashWidgets,setDashWidgets]=useState(DEFAULT_WIDGETS);

  useEffect(()=>{ const h=()=>setIsMobile(window.innerWidth<768); window.addEventListener("resize",h); return()=>window.removeEventListener("resize",h); },[]);

  const showToast=useCallback((msg,ok=true)=>{ setToast({msg,ok}); setTimeout(()=>setToast(null),2500); },[]);
  const openModal=useCallback((type,init=null)=>setModal({type,init}),[]);
  const closeModal=useCallback(()=>setModal(null),[]);

  const load=useCallback(async()=>{
    setLoading(true);
    try {
      const [acc,cat,tx,tr,sg,prefs,confs]=await Promise.all([
        t("accounts").get("order=created_at"),
        t("categories").get("order=name"),
        t("transactions").get("order=date.desc"),
        t("transfers").get("order=date.desc"),
        t("savings_goals").get("order=created_at"),
        t("user_preferences").get(`user_id=eq.${user?.id}`),
        t("fixed_confirmations").get(`user_id=eq.${user?.id}&order=created_at.desc`),
      ]);
      setData({accounts:Array.isArray(acc)?acc:[],categories:Array.isArray(cat)?cat:[],transactions:Array.isArray(tx)?tx:[],transfers:Array.isArray(tr)?tr:[],savings:Array.isArray(sg)?sg:[],confirmations:Array.isArray(confs)?confs:[]});
      if(Array.isArray(prefs)&&prefs.length>0&&prefs[0].dashboard_widgets){
        setDashWidgets(prefs[0].dashboard_widgets);
      }
      try{
        const fx=await fetch("https://api.frankfurter.app/latest?from=EUR&to=CHF,USD,GBP");
        const fxd=await fx.json();
        if(fxd?.rates) setRates({EUR:1,CHF:1/(fxd.rates.CHF||0.94),USD:1/(fxd.rates.USD||1.09),GBP:1/(fxd.rates.GBP||0.86)});
      }catch{}
    } catch{showToast("Errore connessione",false);}
    setLoading(false);
  },[t,user,showToast]);

  useEffect(()=>{load();},[load]);

  const saveWidgets=useCallback(async(widgets)=>{
    setDashWidgets(widgets);
    // get current prefs first to preserve saved_reports
    const prefs=await t("user_preferences").get(`user_id=eq.${user?.id}`);
    const existing=Array.isArray(prefs)&&prefs[0];
    await t("user_preferences").upsert({
      user_id:user?.id,
      dashboard_widgets:widgets,
      saved_reports:existing?.saved_reports||[],
    });
    showToast("Dashboard salvata ✓");
    closeModal();
  },[t,user,showToast,closeModal]);

  const {accounts,categories,transactions,transfers,savings,confirmations}=data;
  const catMap=useMemo(()=>{const m={};categories.forEach(c=>m[c.id]=c);return m;},[categories]);
  const accMap=useMemo(()=>{const m={};accounts.forEach(a=>m[a.id]=a);return m;},[accounts]);
  const monthIdx=MONTHS.indexOf(filterMonth);

  const fixedTx=useMemo(()=>transactions.filter(tx=>tx.is_fixed),[transactions]);
  const variableTx=useMemo(()=>transactions.filter(tx=>!tx.is_fixed),[transactions]);
  const fixedAsMonthly=useMemo(()=>fixedTx.map(tx=>({...tx,date:`${filterYear}-${String(monthIdx+1).padStart(2,"0")}-${String(tx.recurring_day||25).padStart(2,"0")}`,_injected:true})),[fixedTx,monthIdx,filterYear]);
  const filteredVar=useMemo(()=>{
    let txs=variableTx.filter(tx=>{
      const d=new Date(tx.date);
      if(MONTHS[d.getMonth()]!==filterMonth||d.getFullYear()!==filterYear) return false;
      if(filterAccount!=="all"&&tx.account_id!==filterAccount) return false;
      if(filterCat!=="all"&&tx.category_id!==filterCat) return false;
      if(filterType!=="all"&&tx.type!==filterType) return false;
      if(filterAmtMin&&Number(tx.amount)<parseFloat(filterAmtMin)) return false;
      if(filterAmtMax&&Number(tx.amount)>parseFloat(filterAmtMax)) return false;
      if(filterDateFrom&&tx.date<filterDateFrom) return false;
      if(filterDateTo&&tx.date>filterDateTo) return false;
      return true;
    });
    txs.sort((a,b)=>{
      let va=a[sortField],vb=b[sortField];
      if(sortField==="amount"){va=Number(va);vb=Number(vb);}
      if(va<vb) return sortDir==="asc"?-1:1;
      if(va>vb) return sortDir==="asc"?1:-1;
      return 0;
    });
    return txs;
  },[variableTx,filterMonth,filterYear,filterAccount,filterCat,filterType,filterAmtMin,filterAmtMax,filterDateFrom,filterDateTo,sortField,sortDir]);
  const filteredAll=useMemo(()=>{let all=[...filteredVar,...fixedAsMonthly];if(filterAccount!=="all")all=all.filter(tx=>tx.account_id===filterAccount);return all.sort((a,b)=>new Date(b.date)-new Date(a.date));},[filteredVar,fixedAsMonthly,filterAccount]);
  const filteredTransfers=useMemo(()=>transfers.filter(tx=>{const d=new Date(tx.date);return MONTHS[d.getMonth()]===filterMonth&&d.getFullYear()===filterYear;}),[transfers,filterMonth,filterYear]);

  const expenses=filteredAll.filter(tx=>tx.type==="expense");
  const incomesTx=filteredAll.filter(tx=>tx.type==="income");
  const savingsTx=filteredAll.filter(tx=>tx.type==="saving");

  const toEUR=useCallback((amount,accId)=>{
    const a=accMap[accId];
    if(!a) return amount;
    const r=rates[a.currency]||1;
    return amount/r; // convert to EUR
  },[accMap,rates]);

  const exchangeRate = rates.CHF||1.06; // keep for legacy calcs
  const totalExpEUR=expenses.reduce((s,tx)=>s+toEUR(Number(tx.amount),tx.account_id),0);
  const totalIncEUR=incomesTx.reduce((s,tx)=>s+toEUR(Number(tx.amount),tx.account_id),0);
  const totalSavEUR=savingsTx.reduce((s,tx)=>s+toEUR(Number(tx.amount),tx.account_id),0);
  const balanceEUR=totalIncEUR-totalExpEUR-totalSavEUR;

  const accountBalance=useCallback((accId)=>{
    const inc=filteredAll.filter(tx=>tx.account_id===accId&&tx.type==="income").reduce((s,tx)=>s+Number(tx.amount),0);
    const exp=filteredAll.filter(tx=>tx.account_id===accId&&tx.type==="expense").reduce((s,tx)=>s+Number(tx.amount),0);
    const sav=filteredAll.filter(tx=>tx.account_id===accId&&tx.type==="saving").reduce((s,tx)=>s+Number(tx.amount),0);
    const trIn=filteredTransfers.filter(tx=>tx.to_account_id===accId).reduce((s,tx)=>s+Number(tx.amount_to),0);
    const trOut=filteredTransfers.filter(tx=>tx.from_account_id===accId).reduce((s,tx)=>s+Number(tx.amount_from),0);
    return Number(accMap[accId]?.balance_initial||0)+inc-exp-sav+trIn-trOut;
  },[filteredAll,filteredTransfers,accMap]);

  const catBreakdown=useMemo(()=>{const map={};expenses.forEach(tx=>{const cid=tx.category_id||"none";if(!map[cid])map[cid]=0;map[cid]+=Number(tx.amount);});return Object.entries(map).map(([cid,val])=>({cid,val,cat:catMap[cid]||{name:"Altro",color:"#9ca3af",icon:"📦"}})).sort((a,b)=>b.val-a.val);},[expenses,catMap]);
  const topCats=useMemo(()=>{const freq={};variableTx.filter(tx=>tx.type==="expense").forEach(tx=>{if(tx.category_id)freq[tx.category_id]=(freq[tx.category_id]||0)+1;});return Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([id])=>catMap[id]).filter(Boolean);},[variableTx,catMap]);
  const trend=useMemo(()=>{const idx=MONTHS.indexOf(filterMonth);return Array.from({length:6},(_,i)=>{const mi=(idx-5+i+12)%12,m=MONTHS[mi],yr=mi>idx?filterYear-1:filterYear;const val=variableTx.filter(tx=>{const d=new Date(tx.date);return MONTHS[d.getMonth()]===m&&d.getFullYear()===yr&&tx.type==="expense";}).reduce((s,tx)=>s+Number(tx.amount),0)+fixedTx.filter(tx=>tx.type==="expense").reduce((s,tx)=>s+Number(tx.amount),0);return{label:MONTHS_SHORT[mi],value:val};});},[variableTx,fixedTx,filterMonth,filterYear]);
  const calcTransfer=useMemo(()=>{const chAcc=accounts.find(a=>a.currency==="CHF"),itAcc=accounts.find(a=>a.currency==="EUR");if(!chAcc||!itAcc)return null;const chFixedExp=fixedTx.filter(tx=>tx.account_id===chAcc.id&&tx.type==="expense").reduce((s,tx)=>s+Number(tx.amount),0);const chFixedInc=fixedTx.filter(tx=>tx.account_id===chAcc.id&&tx.type==="income").reduce((s,tx)=>s+Number(tx.amount),0);const itFixedExp=fixedTx.filter(tx=>tx.account_id===itAcc.id&&tx.type==="expense").reduce((s,tx)=>s+Number(tx.amount),0);const itFixedInc=fixedTx.filter(tx=>tx.account_id===itAcc.id&&tx.type==="income").reduce((s,tx)=>s+Number(tx.amount),0);const itDeficit=itFixedExp-itFixedInc;return{chAcc,itAcc,chFixedExp,chFixedInc,chNet:chFixedInc-chFixedExp,itFixedExp,itFixedInc,itNet:itFixedInc-itFixedExp,itDeficit,transferCHF:itDeficit>0?itDeficit/exchangeRate:0};},[accounts,fixedTx,exchangeRate]);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const saveTx=useCallback(async(f)=>{
    if(!f.name||!f.amount||!f.date||!f.account_id||!f.category_id){showToast("Compila tutti i campi obbligatori",false);return;}
    const body={user_id:user.id,name:f.name,amount:parseFloat(f.amount),type:f.type||"expense",category_id:f.category_id||null,account_id:f.account_id,date:f.date,note:f.note||"",is_fixed:false,recurring_day:null};
    // Optimistic update
    if(f.id){
      setData(d=>({...d,transactions:d.transactions.map(tx=>tx.id===f.id?{...tx,...body,id:f.id}:tx)}));
      await t("transactions").patch(body,`id=eq.${f.id}`);
    } else {
      const res=await t("transactions").post(body);
      const newTx=Array.isArray(res)?res[0]:res;
      if(newTx?.id) setData(d=>({...d,transactions:[newTx,...d.transactions]}));
    }
    showToast(f.id?"Aggiornato ✓":"Aggiunto ✓");closeModal();
  },[t,user,showToast,closeModal]);

  const saveFixed=useCallback(async(f)=>{
    if(!f.name||!f.amount||!f.account_id||!f.date){showToast("Compila tutti i campi obbligatori",false);return;}
    const body={user_id:user.id,name:f.name,amount:parseFloat(f.amount),type:f.type||"expense",category_id:f.category_id||null,account_id:f.account_id,date:f.date,note:f.note||"",is_fixed:true,recurring_day:parseInt(f.recurring_day)||25};
    if(f.id){
      setData(d=>({...d,transactions:d.transactions.map(tx=>tx.id===f.id?{...tx,...body,id:f.id}:tx)}));
      await t("transactions").patch(body,`id=eq.${f.id}`);
    } else {
      const res=await t("transactions").post(body);
      const newTx=Array.isArray(res)?res[0]:res;
      if(newTx?.id) setData(d=>({...d,transactions:[newTx,...d.transactions]}));
    }
    showToast(f.id?"Aggiornato ✓":"Aggiunto ✓");closeModal();
  },[t,user,showToast,closeModal]);

  const saveTransfer=useCallback(async(f)=>{
    if(!f.from_account_id||!f.to_account_id||!f.amount_from||!f.date){showToast("Compila tutti i campi",false);return;}
    const rate=parseFloat(f.rate||exchangeRate);const fa=accMap[f.from_account_id],ta=accMap[f.to_account_id];
    let amtTo;if(fa?.currency===ta?.currency)amtTo=parseFloat(f.amount_from);else if(fa?.currency==="CHF")amtTo=parseFloat(f.amount_from)*rate;else amtTo=parseFloat(f.amount_from)/rate;
    const body={user_id:user.id,from_account_id:f.from_account_id,to_account_id:f.to_account_id,amount_from:parseFloat(f.amount_from),amount_to:amtTo,rate,date:f.date,note:f.note||""};
    const res=await t("transfers").post(body);
    const newTr=Array.isArray(res)?res[0]:res;
    if(newTr?.id) setData(d=>({...d,transfers:[newTr,...d.transfers]}));
    showToast("Trasferimento registrato ✓");closeModal();
  },[t,user,accMap,exchangeRate,showToast,closeModal]);

  const saveAccount=useCallback(async(f)=>{
    if(!f.name||!f.currency){showToast("Compila tutti i campi",false);return;}
    const body={user_id:user.id,name:f.name,currency:f.currency,color:f.color||"#6366f1",icon:f.icon||"🏦",balance_initial:parseFloat(f.balance_initial||0)};
    if(f.id){
      setData(d=>({...d,accounts:d.accounts.map(a=>a.id===f.id?{...a,...body,id:f.id}:a)}));
      await t("accounts").patch(body,`id=eq.${f.id}`);
    } else {
      const res=await t("accounts").post(body);
      const newA=Array.isArray(res)?res[0]:res;
      if(newA?.id) setData(d=>({...d,accounts:[...d.accounts,newA]}));
    }
    showToast("Conto salvato ✓");closeModal();
  },[t,user,showToast,closeModal]);

  const saveCat=useCallback(async(f)=>{
    if(!f.name){showToast("Inserisci un nome",false);return;}
    const body={user_id:user.id,name:f.name,icon:f.icon||"📦",color:f.color||"#6366f1",budget:parseFloat(f.budget||0)};
    if(f.id){
      setData(d=>({...d,categories:d.categories.map(c=>c.id===f.id?{...c,...body,id:f.id}:c)}));
      await t("categories").patch(body,`id=eq.${f.id}`);
    } else {
      const res=await t("categories").post(body);
      const newC=Array.isArray(res)?res[0]:res;
      if(newC?.id) setData(d=>({...d,categories:[...d.categories,newC].sort((a,b)=>a.name.localeCompare(b.name))}));
    }
    showToast("Categoria salvata ✓");closeModal();
  },[t,user,showToast,closeModal]);

  const saveSavings=useCallback(async(f)=>{
    if(!f.name)return;
    const body={user_id:user.id,name:f.name,icon:f.icon||"🎯",color:f.color||"#10b981",target_amount:parseFloat(f.target_amount||0),current_amount:parseFloat(f.current_amount||0),currency:f.currency||"EUR",account_id:f.account_id||null,deadline:f.deadline||null};
    if(f.id){
      setData(d=>({...d,savings:d.savings.map(s=>s.id===f.id?{...s,...body,id:f.id}:s)}));
      await t("savings_goals").patch(body,`id=eq.${f.id}`);
    } else {
      const res=await t("savings_goals").post(body);
      const newS=Array.isArray(res)?res[0]:res;
      if(newS?.id) setData(d=>({...d,savings:[...d.savings,newS]}));
    }
    showToast("Salvato ✓");closeModal();
  },[t,user,showToast,closeModal]);

  const saveBulkFixed=useCallback(async(tx)=>{
    const body={name:tx.name,amount:parseFloat(tx.amount),type:tx.type||"expense",category_id:tx.category_id||null,account_id:tx.account_id,recurring_day:parseInt(tx.recurring_day)||25,note:tx.note||""};
    setData(d=>({...d,transactions:d.transactions.map(x=>x.id===tx.id?{...x,...body}:x)}));
    await t("transactions").patch(body,`id=eq.${tx.id}`);
  },[t]);

  const saveSavingsTransfer=useCallback(async({goal,dir,amount,date,note})=>{
    const newAmount=dir==="to"?Number(goal.current_amount)+amount:Math.max(0,Number(goal.current_amount)-amount);
    setData(d=>({...d,savings:d.savings.map(s=>s.id===goal.id?{...s,current_amount:newAmount}:s)}));
    await t("savings_goals").patch({current_amount:newAmount},`id=eq.${goal.id}`);
    if(goal.account_id){
      const txBody={user_id:user.id,name:`${dir==="to"?"Deposito":"Prelievo"} risparmio: ${goal.name}`,amount,type:dir==="to"?"saving":"income",category_id:null,account_id:goal.account_id,date,note:note||"",is_fixed:false,recurring_day:null};
      const res=await t("transactions").post(txBody);
      const newTx=Array.isArray(res)?res[0]:res;
      if(newTx?.id) setData(d=>({...d,transactions:[newTx,...d.transactions]}));
    }
    showToast(dir==="to"?"Depositato ✓":"Prelevato ✓");closeModal();
  },[t,user,showToast,closeModal]);

  const adjustAccount=useCallback(async(accId,newBalance)=>{
    if(isNaN(newBalance)){showToast("Importo non valido",false);return;}
    await t("accounts").patch({balance_initial:newBalance},`id=eq.${accId}`);
    showToast("Saldo aggiustato ✓");closeModal();load();
  },[t,showToast,closeModal,load]);

  const del=useCallback(async(table,id)=>{
    // Optimistic removal
    setData(d=>{
      const key={transactions:"transactions",transfers:"transfers",accounts:"accounts",categories:"categories",savings_goals:"savings"}[table]||table;
      return {...d,[key]:(d[key]||[]).filter(x=>x.id!==id)};
    });
    await t(table).del(`id=eq.${id}`);
    showToast("Eliminato ✓");
  },[t,showToast]);

  const deleteUser=useCallback(async()=>{
    if(!window.confirm("Sei sicuro? Tutti i tuoi dati verranno eliminati definitivamente. Questa azione è irreversibile.")) return;
    const uid=user.id;
    // Delete all user data
    await Promise.all([
      t("transactions").del(`user_id=eq.${uid}`),
      t("transfers").del(`user_id=eq.${uid}`),
      t("accounts").del(`user_id=eq.${uid}`),
      t("categories").del(`user_id=eq.${uid}`),
      t("savings_goals").del(`user_id=eq.${uid}`),
      t("user_preferences").del(`user_id=eq.${uid}`),
      t("household_members").del(`owner_id=eq.${uid}`),
    ]);
    // Delete auth user via Supabase admin endpoint (requires service role) - fallback: just sign out
    showToast("Dati eliminati. Disconnessione in corso...");
    setTimeout(()=>signOut(),1500);
  },[t,user,showToast,signOut]);

  const exportCSV=()=>{const rows=[["Data","Nome","Tipo","Fisso","Categoria","Conto","Importo","Valuta","Note"]];filteredAll.forEach(tx=>{const acc=accMap[tx.account_id];rows.push([tx.date,tx.name,tx.type,tx.is_fixed?"Sì":"No",catMap[tx.category_id]?.name||"",acc?.name||"",tx.amount,acc?.currency||"",tx.note||""]);});const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([rows.map(r=>r.join(";")).join("\n")],{type:"text/csv"}));a.download=`fina_${filterMonth}_${filterYear}.csv`;a.click();showToast("Export completato ✓");};

  // ── Check if onboarding needed ───────────────────────────────────────────
  const needsOnboarding = !loading && accounts.length === 0;

  if(loading) return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:20,fontFamily:"'Inter',system-ui,sans-serif"}}>
      <style>{CSS}</style>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
        <div style={{width:36,height:36,borderRadius:12,background:`linear-gradient(135deg,${T.primary},${T.primaryDk})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>💼</div>
        <div style={{fontSize:20,fontWeight:800,color:T.gray900}}>Fina</div>
      </div>
      <div style={{width:44,height:44,border:`3px solid ${T.gray100}`,borderTop:`3px solid ${T.primary}`,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
      <div style={{fontSize:13,color:T.gray400}}>Caricamento in corso...</div>
    </div>
  );

  if(needsOnboarding) return (
    <OnboardingWizard user={user} token={token} onComplete={()=>load()}/>
  );

  const selStyle={border:`1.5px solid ${T.gray200}`,borderRadius:8,padding:"6px 26px 6px 10px",fontSize:12,color:T.gray700,background:T.surface,cursor:"pointer",appearance:"none",backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%239ca3af' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")",backgroundRepeat:"no-repeat",backgroundPosition:"right 8px center"};

  const navItems=[
    {id:"dashboard",    icon:"⊞", label:"Home"},
    {id:"transactions", icon:"↕", label:"Movimenti"},
    {id:"fixed",        icon:"📌",label:"Fisso"},
    {id:"forecast",     icon:"🔮",label:"Forecast"},
    {id:"reports",      icon:"◑", label:"Report"},
    {id:"reportbuilder",icon:"🔨",label:"Builder"},
    {id:"savings",      icon:"🎯",label:"Risparmi"},
    {id:"settings",     icon:"⚙", label:"Impostazioni"},
  ];

  // ── DASHBOARD WIDGETS ─────────────────────────────────────────────────────
  const renderWidget=(id)=>{
    switch(id){
      case "balance": return (
        <div key="balance" className="widget" style={{background:"linear-gradient(135deg,#1a1a2e,#16213e)",borderRadius:20,padding:"20px 22px",color:"#fff",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:-20,right:-20,width:100,height:100,background:"#ffffff06",borderRadius:"50%"}}/>
          <div style={{fontSize:11,color:"#ffffff55",letterSpacing:1.5,marginBottom:6}}>SALDO NETTO {filterMonth.toUpperCase()}</div>
          <div style={{fontSize:32,fontWeight:900,letterSpacing:-1,color:balanceEUR>=0?"#34d399":"#f87171"}}>{balanceEUR>=0?"+":""}{fmtN(balanceEUR)} €</div>
          <div style={{display:"flex",gap:20,marginTop:10}}>{[{l:"Entrate",v:totalIncEUR,c:"#34d399"},{l:"Uscite",v:totalExpEUR,c:"#f87171"},{l:"Risparmi",v:totalSavEUR,c:"#818cf8"}].map(k=>(<div key={k.l}><div style={{fontSize:10,color:"#ffffff44"}}>{k.l}</div><div style={{fontSize:13,fontWeight:700,color:k.c}}>€ {fmtN(k.v)}</div></div>))}</div>
        </div>
      );
      case "accounts": return (
        <div key="accounts" className="widget">
          {/* Account filter pills */}
          <div style={{display:"flex",gap:8,marginBottom:12,overflowX:"auto",paddingBottom:2}}>
            <button onClick={()=>setFilterAccount("all")} style={{padding:"6px 14px",borderRadius:20,border:`1.5px solid ${filterAccount==="all"?"#6366f1":"#eee"}`,background:filterAccount==="all"?"#6366f111":"#fff",color:filterAccount==="all"?"#6366f1":"#666",fontWeight:filterAccount==="all"?700:400,fontSize:12,cursor:"pointer",whiteSpace:"nowrap"}}>Tutti</button>
            {accounts.map(acc=>(
              <button key={acc.id} onClick={()=>setFilterAccount(acc.id)} style={{padding:"6px 14px",borderRadius:20,border:`1.5px solid ${filterAccount===acc.id?acc.color:"#eee"}`,background:filterAccount===acc.id?acc.color+"11":"#fff",color:filterAccount===acc.id?acc.color:"#666",fontWeight:filterAccount===acc.id?700:400,fontSize:12,cursor:"pointer",whiteSpace:"nowrap"}}>
                {acc.icon} {acc.name}
              </button>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":`repeat(${Math.max(accounts.length,1)},1fr)`,gap:12}}>
            {accounts.map(acc=>(<div key={acc.id} onClick={()=>setFilterAccount(acc.id)} style={{background:`linear-gradient(135deg,${acc.color},${acc.color}88)`,borderRadius:18,padding:"18px 20px",color:"#fff",position:"relative",overflow:"hidden",boxShadow:`0 4px 20px ${acc.color}44`,cursor:"pointer",opacity:filterAccount!=="all"&&filterAccount!==acc.id?0.5:1,transition:"opacity .2s"}}><div style={{position:"absolute",top:-15,right:-15,width:70,height:70,background:"#ffffff12",borderRadius:"50%"}}/><div style={{fontSize:22,marginBottom:6}}>{acc.icon}</div><div style={{fontSize:11,color:"#ffffff99",marginBottom:3}}>{acc.name}</div><div style={{fontSize:22,fontWeight:900}}>{acc.currency} {fmtN(accountBalance(acc.id))}</div></div>))}
          </div>
        </div>
      );
      case "quickadd": return (
        <div key="quickadd" className="widget" style={{background:"#fff",borderRadius:18,padding:18,boxShadow:"0 2px 12px #0001"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#1a1a2e",marginBottom:12}}>⚡ Inserimento Rapido</div>
          <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
            <Inp type="date" value={quickDate} onChange={e=>setQuickDate(e.target.value)} style={{flex:1,minWidth:120,fontSize:13}}/>
            <Inp type="number" value={quickAmt} onChange={e=>setQuickAmt(e.target.value)} placeholder="Importo" style={{flex:1,minWidth:90,fontSize:13}}/>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
            {(topCats.length>0?topCats:categories.slice(0,5)).map(cat=>(
              <button key={cat.id} onClick={()=>setQuickCat(quickCat===cat.id?"":cat.id)}
                style={{background:quickCat===cat.id?cat.color:cat.color+"18",border:`1.5px solid ${quickCat===cat.id?cat.color:cat.color+"44"}`,borderRadius:10,padding:"7px 12px",fontSize:12,color:quickCat===cat.id?"#fff":cat.color,fontWeight:600,cursor:"pointer"}}>
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={async()=>{
              if(!quickAmt||!quickCat){showToast("Inserisci importo e seleziona categoria",false);return;}
              const acc=accounts.find(a=>a.currency==="EUR")||accounts[0];
              const body={user_id:user?.id,name:catMap[quickCat]?.name||"Spesa rapida",amount:parseFloat(quickAmt),type:"expense",category_id:quickCat,account_id:acc?.id,date:quickDate,note:"",is_fixed:false,recurring_day:null};
              const res=await t("transactions").post(body);
              const newTx=Array.isArray(res)?res[0]:res;
              if(newTx?.id){setData(d=>({...d,transactions:[newTx,...d.transactions]}));setQuickAmt("");setQuickCat("");showToast("Aggiunto ✓");}
            }} style={{flex:2,padding:"10px 0",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:10,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>
              + Aggiungi
            </button>
            <button onClick={()=>openModal("tx",{date:quickDate,type:"expense",account_id:accounts.find(a=>a.currency==="EUR")?.id||accounts[0]?.id})}
              style={{flex:1,padding:"10px 0",background:"#f5f5f5",border:"none",borderRadius:10,fontSize:12,color:"#666",cursor:"pointer",fontWeight:600}}>
              + Dettagli
            </button>
          </div>
        </div>
      );
      case "transfer_calc": return calcTransfer?(
        <div key="transfer_calc" className="widget" style={{background:"#fff",borderRadius:18,padding:18,boxShadow:"0 2px 12px #0001"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontSize:13,fontWeight:700,color:"#1a1a2e"}}>📊 Calcolatore Trasferimento</div>
            <button onClick={()=>openModal("calcDetail")} style={{fontSize:12,color:"#6366f1",background:"none",border:"none",cursor:"pointer",fontWeight:600}}>Dettagli →</button>
          </div>
          {calcTransfer.itDeficit>0?(
            <div style={{background:"#fef3c7",borderRadius:12,padding:"12px 16px",marginBottom:12}}>
              <div style={{fontSize:12,color:"#92400e",marginBottom:4}}>💸 Trasferisci il giorno 24:</div>
              <div style={{fontSize:22,fontWeight:900,color:"#d97706"}}>CHF {fmtN(calcTransfer.transferCHF)}</div>
              <div style={{fontSize:12,color:"#92400e",marginTop:2}}>= € {fmtN(calcTransfer.itDeficit)}</div>
            </div>
          ):(
            <div style={{background:"#d1fae5",borderRadius:12,padding:"12px 16px",marginBottom:12}}>
              <div style={{fontSize:12,color:"#065f46"}}>✅ Nessun trasferimento necessario</div>
              <div style={{fontSize:18,fontWeight:700,color:"#059669",marginTop:4}}>€ {fmtN(-calcTransfer.itDeficit)} surplus IT</div>
            </div>
          )}
          {calcTransfer.itDeficit>0&&<Btn onClick={()=>openModal("transfer",{from_account_id:calcTransfer.chAcc.id,to_account_id:calcTransfer.itAcc.id,amount_from:calcTransfer.transferCHF.toFixed(2),date:TODAY,rate:exchangeRate})} label="🔄 Registra Trasferimento" color="#10b981" small/>}
        </div>
      ):null;
      case "donut": return catBreakdown.length>0?(
        <div key="donut" className="widget" style={{background:"#fff",borderRadius:20,padding:20,boxShadow:"0 2px 12px #0001"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#1a1a2e",marginBottom:16}}>Spese per Categoria</div>
          <div style={{display:"flex",alignItems:"center",gap:20,flexWrap:"wrap"}}>
            <DonutChart data={catBreakdown.map(c=>({value:c.val,color:c.cat.color}))} size={150} centerLabel="Uscite" centerValue={fmtN(expenses.reduce((s,tx)=>s+Number(tx.amount),0))}/>
            <div style={{flex:1,minWidth:130}}>{catBreakdown.slice(0,6).map(c=>(<div key={c.cid} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div style={{display:"flex",alignItems:"center",gap:7}}><div style={{width:9,height:9,borderRadius:3,background:c.cat.color}}/><span style={{fontSize:12,color:"#666"}}>{c.cat.icon} {c.cat.name}</span></div><span style={{fontSize:12,fontWeight:700}}>{fmtN(c.val)}</span></div>))}</div>
          </div>
        </div>
      ):null;
      case "budget_bars": return catBreakdown.filter(c=>c.cat.budget>0).length>0?(
        <div key="budget_bars" className="widget" style={{background:"#fff",borderRadius:20,padding:20,boxShadow:"0 2px 12px #0001"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#1a1a2e",marginBottom:14}}>Budget vs Speso</div>
          {catBreakdown.filter(c=>c.cat.budget>0).map(c=>{const pct=Math.min(100,(c.val/c.cat.budget)*100),over=pct>=100;return(<div key={c.cid} style={{marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,color:"#666"}}>{c.cat.icon} {c.cat.name}</span><span style={{fontSize:12,fontWeight:700,color:over?"#ef4444":"#1a1a2e"}}>{fmtN(c.val)} / {fmtN(c.cat.budget)}{over?" ⚠️":""}</span></div><div style={{background:"#f5f5f5",borderRadius:6,height:7,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:over?"#ef4444":c.cat.color,borderRadius:6}}/></div></div>);})}
        </div>
      ):null;
      case "trend": return (
        <div key="trend" className="widget" style={{background:"#fff",borderRadius:20,padding:20,boxShadow:"0 2px 12px #0001"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#1a1a2e",marginBottom:14}}>Trend Ultimi 6 Mesi</div>
          <BarChart data={trend} color="#6366f1"/>
        </div>
      );
      case "recent": return (
        <div key="recent" className="widget" style={{background:"#fff",borderRadius:20,padding:20,boxShadow:"0 2px 12px #0001"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:700,color:"#1a1a2e"}}>Ultimi Movimenti</div>
            <button onClick={()=>setPage("transactions")} style={{fontSize:12,color:"#6366f1",background:"none",border:"none",cursor:"pointer",fontWeight:600}}>Vedi tutti →</button>
          </div>
          {filteredAll.slice(0,5).map(tx=>{const cat=catMap[tx.category_id],acc=accMap[tx.account_id];return(<div key={tx.id+(tx._injected?"_f":"")} style={{display:"flex",alignItems:"center",gap:12,marginBottom:10,padding:"10px",background:"#f8f9fc",borderRadius:12}}><div style={{width:36,height:36,borderRadius:10,background:cat?.color+"22"||"#f5f5f5",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{cat?.icon||"📦"}</div><div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:"#1a1a2e"}}>{tx.name}{tx.is_fixed&&<span style={{fontSize:10,color:"#6366f1",background:"#6366f111",borderRadius:4,padding:"2px 5px",marginLeft:6}}>📌</span>}</div><div style={{fontSize:11,color:"#bbb"}}>{tx.date} · {acc?.name}</div></div><div style={{fontSize:14,fontWeight:800,color:tx.type==="income"?"#10b981":tx.type==="saving"?"#6366f1":"#ef4444"}}>{tx.type==="income"?"+":"-"}{acc?.currency} {fmtN(Math.abs(Number(tx.amount)))}</div></div>);})}
          {filteredAll.length===0&&<div style={{textAlign:"center",color:"#ccc",padding:"20px 0",fontSize:13}}>Nessun movimento per {filterMonth}</div>}
        </div>
      );
      case "savings_summary": return savings.length>0?(
        <div key="savings_summary" className="widget" style={{background:"#fff",borderRadius:18,padding:18,boxShadow:"0 2px 12px #0001"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:700,color:"#1a1a2e"}}>🎯 Obiettivi di Risparmio</div>
            <button onClick={()=>setPage("savings")} style={{fontSize:12,color:"#6366f1",background:"none",border:"none",cursor:"pointer",fontWeight:600}}>Vedi tutti →</button>
          </div>
          {savings.slice(0,3).map(g=>{const pct=g.target_amount>0?Math.min(100,(g.current_amount/g.target_amount)*100):0;return(<div key={g.id} style={{marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:13,fontWeight:600}}>{g.icon} {g.name}</span><span style={{fontSize:12,fontWeight:700,color:g.color}}>{g.currency} {fmtN(g.current_amount)} / {fmtN(g.target_amount)}</span></div><div style={{background:"#f5f5f5",borderRadius:6,height:8,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:`linear-gradient(90deg,${g.color},${g.color}99)`,borderRadius:6}}/></div></div>);})}
        </div>
      ):null;
      case "ch_it": return (
        <div key="ch_it" className="widget" style={{background:"#fff",borderRadius:18,padding:18,boxShadow:"0 2px 12px #0001"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#1a1a2e",marginBottom:14}}>🌍 CH vs IT</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {accounts.map(acc=>{const exp=expenses.filter(tx=>tx.account_id===acc.id).reduce((s,tx)=>s+Number(tx.amount),0),inc=incomesTx.filter(tx=>tx.account_id===acc.id).reduce((s,tx)=>s+Number(tx.amount),0);return(<div key={acc.id} style={{background:"#f8f9fc",borderRadius:12,padding:"12px 14px"}}><div style={{fontSize:12,color:"#666",marginBottom:6,fontWeight:600}}>{acc.icon} {acc.name}</div><div style={{fontSize:11,color:"#10b981"}}>↑ {acc.currency} {fmtN(inc)}</div><div style={{fontSize:11,color:"#ef4444"}}>↓ {acc.currency} {fmtN(exp)}</div><div style={{fontSize:13,fontWeight:800,color:inc-exp>=0?"#10b981":"#ef4444",marginTop:4}}>{inc-exp>=0?"+":""}{acc.currency} {fmtN(inc-exp)}</div></div>);})}
          </div>
        </div>
      );
      case "mini_trend": return (
        <MiniTrendWidget key="mini_trend" transactions={transactions} filterMonth={filterMonth} filterYear={filterYear} isMobile={isMobile}/>
      );
      case "forecast_widget": return (
        <div key="forecast_widget" className="widget" style={{background:"#fff",borderRadius:18,padding:18,boxShadow:"0 2px 12px #0001"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:700,color:"#1a1a2e"}}>🔮 Forecast Prossimi 3 Mesi</div>
            <button onClick={()=>setPage("forecast")} style={{fontSize:12,color:"#6366f1",background:"none",border:"none",cursor:"pointer",fontWeight:600}}>Dettagli →</button>
          </div>
          {Array.from({length:3},(_,i)=>{
            const d=new Date(); d.setMonth(d.getMonth()+i);
            const month=MONTHS[d.getMonth()],year=d.getFullYear();
            const inc=fixedTx.filter(tx=>tx.type==="income").reduce((s,tx)=>s+Number(tx.amount),0);
            const exp=fixedTx.filter(tx=>tx.type==="expense").reduce((s,tx)=>s+Number(tx.amount),0);
            const net=inc-exp;
            const confirmedCount=confirmations.filter(c=>c.month===month&&c.year===year&&c.confirmed).length;
            return (
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #f5f5f5"}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:"#1a1a2e"}}>{month} {year}</div>
                  <div style={{fontSize:11,color:"#bbb"}}>{confirmedCount}/{fixedTx.length} confermate</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:14,fontWeight:800,color:net>=0?"#10b981":"#ef4444"}}>{net>=0?"+":""}{fmtN(net)}</div>
                  <div style={{fontSize:10,color:"#bbb"}}>{net>=0?"surplus":"deficit"} previsto</div>
                </div>
              </div>
            );
          })}
        </div>
      );
      default: return null;
    }
  };

  return (
    <div style={{display:"flex",minHeight:"100vh",background:T.bg,fontFamily:"'Inter',system-ui,sans-serif"}}>
      <style>{CSS}</style>
      {toast&&<Toast {...toast}/>}

      {/* ── DESKTOP SIDEBAR ── */}
      {!isMobile&&(
        <div style={{width:240,background:T.sidebar,position:"fixed",top:0,bottom:0,left:0,zIndex:100,display:"flex",flexDirection:"column",boxShadow:"4px 0 24px #00000022"}}>
          {/* Logo */}
          <div style={{padding:"22px 20px 18px",borderBottom:"1px solid #ffffff0a"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:34,height:34,borderRadius:10,background:`linear-gradient(135deg,${T.primary},${T.primaryDk})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,boxShadow:`0 2px 12px ${T.primary}55`}}>💼</div>
              <div>
                <div style={{fontSize:16,fontWeight:800,color:"#fff",letterSpacing:-0.3}}>Fina</div>
                <div style={{fontSize:10,color:"#ffffff33",marginTop:-1}}>Budget Manager</div>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{flex:1,padding:"12px 10px",overflowY:"auto"}}>
            {navItems.map(n=>{
              const active=page===n.id;
              return (
                <button key={n.id} onClick={()=>setPage(n.id)} style={{
                  width:"100%",display:"flex",alignItems:"center",gap:10,
                  padding:"9px 12px",marginBottom:2,
                  background:active?T.sidebarActive:"transparent",
                  border:`1px solid ${active?"#ffffff12":"transparent"}`,
                  borderRadius:10,
                  color:active?"#fff":"#ffffff55",
                  fontWeight:active?600:400,fontSize:13,
                  cursor:"pointer",textAlign:"left",
                  transition:"all .15s",
                }}>
                  <span style={{fontSize:16,opacity:active?1:0.6}}>{n.icon}</span>
                  {n.label}
                  {active&&<div style={{marginLeft:"auto",width:5,height:5,borderRadius:"50%",background:T.primary}}/>}
                </button>
              );
            })}
          </nav>

          {/* Bottom */}
          <div style={{padding:"12px 10px",borderTop:"1px solid #ffffff0a"}}>
            <div style={{padding:"10px 12px",marginBottom:8,background:"#ffffff08",borderRadius:10}}>
              <div style={{fontSize:11,color:"#ffffff44",marginBottom:2}}>Tassi live</div>
              <div style={{fontSize:11,color:"#ffffff88"}}>
                CHF {fmtN(1/rates.CHF,4)} € · $ {fmtN(1/rates.USD,4)} €
              </div>
            </div>
            <button onClick={()=>openModal("share")} style={{width:"100%",padding:"8px 12px",background:"#ffffff08",border:"none",borderRadius:10,color:"#ffffff66",fontSize:12,cursor:"pointer",fontWeight:500,textAlign:"left",marginBottom:4}}>
              👨‍👩‍👧 Condividi accesso
            </button>
            <button onClick={()=>openModal("import")} style={{width:"100%",padding:"8px 12px",background:"#ffffff08",border:"none",borderRadius:10,color:"#ffffff66",fontSize:12,cursor:"pointer",fontWeight:500,textAlign:"left",marginBottom:4}}>
              📥 Import / Export
            </button>
            <button onClick={signOut} style={{width:"100%",padding:"8px 12px",background:"transparent",border:"none",borderRadius:10,color:"#ffffff33",fontSize:12,cursor:"pointer",fontWeight:400,textAlign:"left"}}>
              ↩ Esci
            </button>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <div style={{flex:1,marginLeft:isMobile?0:240,paddingBottom:isMobile?80:0,minHeight:"100vh"}}>

        {/* Topbar */}
        <div style={{
          background:T.surface,borderBottom:`1px solid ${T.gray100}`,
          padding:isMobile?"12px 16px":"14px 28px",
          position:"sticky",top:0,zIndex:99,
          display:"flex",alignItems:"center",justifyContent:"space-between",
          boxShadow:"0 1px 0 #0000000a",
        }}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {isMobile&&(
              <div style={{fontSize:18}}>{navItems.find(n=>n.id===page)?.icon}</div>
            )}
            <div>
              <div style={{fontSize:15,fontWeight:700,color:T.gray900}}>
                {navItems.find(n=>n.id===page)?.label}
              </div>
              {!isMobile&&<div style={{fontSize:11,color:T.gray400,marginTop:1}}>{filterMonth} {filterYear}</div>}
            </div>
          </div>

          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {page==="dashboard"&&(
              <button onClick={()=>openModal("customizeDash")} style={{padding:"6px 12px",background:T.primaryLt,border:"none",borderRadius:8,color:T.primary,fontSize:12,cursor:"pointer",fontWeight:600}}>
                ✨ Personalizza
              </button>
            )}
            <select value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} style={selStyle}>
              {MONTHS.map(m=><option key={m}>{m}</option>)}
            </select>
            <select value={filterYear} onChange={e=>setFilterYear(Number(e.target.value))} style={selStyle}>
              {[CUR_YEAR-1,CUR_YEAR,CUR_YEAR+1].map(y=><option key={y}>{y}</option>)}
            </select>
            {!isMobile&&(
              <div style={{width:32,height:32,borderRadius:10,background:`linear-gradient(135deg,${T.primary},${T.primaryDk})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}} onClick={()=>setPage("settings")}>
                {(user?.email||"?")[0].toUpperCase()}
              </div>
            )}
          </div>
        </div>

        <div style={{padding:isMobile?"16px":"24px 28px",maxWidth:900,margin:"0 auto"}}>

          {/* ── DASHBOARD (widget system) ── */}
          {page==="dashboard"&&(
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              {dashWidgets.map(id=>renderWidget(id)).filter(Boolean)}
            </div>
          )}

          {/* ── TRANSACTIONS ── */}
          {page==="transactions"&&(
            <div>
              {/* Account filter pills - always visible */}
              <div style={{display:"flex",gap:8,marginBottom:14,overflowX:"auto",paddingBottom:4}}>
                <button onClick={()=>setFilterAccount("all")} style={{padding:"8px 16px",borderRadius:20,border:`1.5px solid ${filterAccount==="all"?"#6366f1":"#eee"}`,background:filterAccount==="all"?"#6366f111":"#fff",color:filterAccount==="all"?"#6366f1":"#666",fontWeight:filterAccount==="all"?700:400,fontSize:12,cursor:"pointer",whiteSpace:"nowrap"}}>Tutti</button>
                {accounts.map(acc=>(
                  <button key={acc.id} onClick={()=>setFilterAccount(acc.id)} style={{padding:"8px 14px",borderRadius:20,border:`1.5px solid ${filterAccount===acc.id?acc.color:"#eee"}`,background:filterAccount===acc.id?acc.color+"11":"#fff",color:filterAccount===acc.id?acc.color:"#666",fontWeight:filterAccount===acc.id?700:400,fontSize:12,cursor:"pointer",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:5}}>
                    {acc.icon} {acc.name}
                  </button>
                ))}
                <button onClick={()=>setShowFilters(s=>!s)} style={{padding:"8px 10px",borderRadius:8,border:`1.5px solid ${showFilters?"#6366f1":"#eee"}`,background:showFilters?"#6366f111":"#f5f5f5",color:showFilters?"#6366f1":"#666",fontSize:12,cursor:"pointer",whiteSpace:"nowrap"}}>⚙ Filtri</button>
                <button onClick={()=>openModal("transfer")} style={{marginLeft:"auto",background:"#f5f5f5",border:"none",borderRadius:8,padding:"8px 12px",fontSize:12,cursor:"pointer",color:"#666",whiteSpace:"nowrap"}}>🔄 Trasferisci</button>
                <button onClick={exportCSV} style={{background:"#f5f5f5",border:"none",borderRadius:8,padding:"8px 12px",fontSize:12,cursor:"pointer",color:"#666"}}>⬇ CSV</button>
                <button onClick={()=>openModal("import")} style={{background:"#f0fff4",border:"none",borderRadius:8,padding:"8px 12px",fontSize:12,cursor:"pointer",color:"#10b981",fontWeight:600,whiteSpace:"nowrap"}}>📥 Import</button>
                <button onClick={()=>openModal("tx",{date:TODAY,type:"expense",account_id:filterAccount!=="all"?filterAccount:accounts[0]?.id})} style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:10,padding:"8px 16px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",whiteSpace:"nowrap"}}>+ Movimento</button>
              </div>
              {/* Advanced filters panel */}
              {showFilters&&(
                <div style={{background:"#f8f9fc",borderRadius:14,padding:16,marginBottom:14,display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)",gap:10}}>
                  <div>
                    <div style={{fontSize:10,fontWeight:700,color:"#bbb",letterSpacing:1,marginBottom:5}}>TIPO</div>
                    <select value={filterType} onChange={e=>setFilterType(e.target.value)} style={{width:"100%",border:"1.5px solid #eee",borderRadius:8,padding:"8px 10px",fontSize:12,background:"#fff"}}>
                      <option value="all">Tutti</option><option value="expense">↓ Spese</option><option value="income">↑ Entrate</option><option value="saving">★ Risparmi</option>
                    </select>
                  </div>
                  <div>
                    <div style={{fontSize:10,fontWeight:700,color:"#bbb",letterSpacing:1,marginBottom:5}}>CATEGORIA</div>
                    <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{width:"100%",border:"1.5px solid #eee",borderRadius:8,padding:"8px 10px",fontSize:12,background:"#fff"}}>
                      <option value="all">Tutte</option>{categories.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{fontSize:10,fontWeight:700,color:"#bbb",letterSpacing:1,marginBottom:5}}>ORDINA PER</div>
                    <div style={{display:"flex",gap:4}}>
                      <select value={sortField} onChange={e=>setSortField(e.target.value)} style={{flex:1,border:"1.5px solid #eee",borderRadius:8,padding:"8px 8px",fontSize:12,background:"#fff"}}>
                        <option value="date">Data</option><option value="amount">Importo</option><option value="name">Nome</option>
                      </select>
                      <button onClick={()=>setSortDir(d=>d==="asc"?"desc":"asc")} style={{padding:"8px 10px",border:"1.5px solid #eee",borderRadius:8,background:"#fff",cursor:"pointer",fontSize:13,color:"#666"}}>
                        {sortDir==="asc"?"↑":"↓"}
                      </button>
                    </div>
                  </div>
                  <div>
                    <div style={{fontSize:10,fontWeight:700,color:"#bbb",letterSpacing:1,marginBottom:5}}>IMPORTO MIN</div>
                    <input type="number" value={filterAmtMin} onChange={e=>setFilterAmtMin(e.target.value)} placeholder="0" style={{width:"100%",border:"1.5px solid #eee",borderRadius:8,padding:"8px 10px",fontSize:12}}/>
                  </div>
                  <div>
                    <div style={{fontSize:10,fontWeight:700,color:"#bbb",letterSpacing:1,marginBottom:5}}>IMPORTO MAX</div>
                    <input type="number" value={filterAmtMax} onChange={e=>setFilterAmtMax(e.target.value)} placeholder="∞" style={{width:"100%",border:"1.5px solid #eee",borderRadius:8,padding:"8px 10px",fontSize:12}}/>
                  </div>
                  <div style={{display:"flex",alignItems:"flex-end"}}>
                    <button onClick={()=>{setFilterType("all");setFilterCat("all");setFilterAmtMin("");setFilterAmtMax("");setFilterDateFrom("");setFilterDateTo("");setSortField("date");setSortDir("desc");}} style={{width:"100%",padding:"8px 0",background:"#fff",border:"1.5px solid #eee",borderRadius:8,fontSize:12,color:"#999",cursor:"pointer"}}>↺ Reset filtri</button>
                  </div>
                </div>
              )}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
                {[{l:"Entrate",v:incomesTx.reduce((s,tx)=>s+Number(tx.amount),0),c:"#10b981"},{l:"Uscite",v:expenses.reduce((s,tx)=>s+Number(tx.amount),0),c:"#ef4444"},{l:"Saldo",v:incomesTx.reduce((s,tx)=>s+Number(tx.amount),0)-expenses.reduce((s,tx)=>s+Number(tx.amount),0),c:"#6366f1"}].map(k=>(<div key={k.l} style={{background:"#fff",borderRadius:14,padding:12,boxShadow:"0 2px 8px #0001",textAlign:"center"}}><div style={{fontSize:11,color:"#bbb",marginBottom:3}}>{k.l}</div><div style={{fontSize:16,fontWeight:800,color:k.c}}>{fmtN(k.v)}</div></div>))}
              </div>
              {filteredTransfers.length>0&&<div style={{marginBottom:14}}><div style={{fontSize:11,fontWeight:700,color:"#bbb",letterSpacing:1,marginBottom:8}}>TRASFERIMENTI</div>{filteredTransfers.map(tr=>(<div key={tr.id} style={{background:"#fff",borderRadius:14,padding:"12px 16px",display:"flex",alignItems:"center",gap:10,marginBottom:6,boxShadow:"0 1px 6px #0001"}}><div style={{fontSize:20}}>🔄</div><div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{accMap[tr.from_account_id]?.name} → {accMap[tr.to_account_id]?.name}</div><div style={{fontSize:11,color:"#bbb"}}>{tr.date}{tr.note&&` · ${tr.note}`}</div></div><div style={{textAlign:"right"}}><div style={{fontSize:13,fontWeight:700}}>{accMap[tr.from_account_id]?.currency} {fmtN(tr.amount_from)}</div><div style={{fontSize:11,color:"#bbb"}}>→ {accMap[tr.to_account_id]?.currency} {fmtN(tr.amount_to)}</div></div><button onClick={()=>del("transfers",tr.id)} style={{background:"#fff0f0",border:"none",borderRadius:6,width:28,height:28,cursor:"pointer",fontSize:13}}>🗑</button></div>))}</div>}
              <div style={{fontSize:11,fontWeight:700,color:"#bbb",letterSpacing:1,marginBottom:8}}>MOVIMENTI · {filteredVar.length} voci</div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {filteredVar.length===0&&<div style={{textAlign:"center",color:"#ccc",padding:"50px 0",fontSize:13}}>Nessun movimento per {filterMonth}</div>}
                {filteredVar.map(tx=>{const cat=catMap[tx.category_id],acc=accMap[tx.account_id];return(
                  <div key={tx.id} style={{background:"#fff",borderRadius:14,padding:"13px 16px",display:"flex",alignItems:"center",gap:12,boxShadow:"0 2px 8px #0001"}}>
                    <div style={{width:40,height:40,borderRadius:12,background:cat?.color+"22"||"#f5f5f5",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{cat?.icon||"📦"}</div>
                    <div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:600,color:"#1a1a2e"}}>{tx.name}</div><div style={{fontSize:11,color:"#bbb"}}>{tx.date} · {cat?.name||"—"} · {acc?.name}</div>{tx.note&&<div style={{fontSize:11,color:"#bbb"}}>{tx.note}</div>}</div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:15,fontWeight:800,color:tx.type==="income"?"#10b981":tx.type==="saving"?"#6366f1":"#ef4444"}}>{tx.type==="income"?"+":"-"}{acc?.currency} {fmtN(Math.abs(Number(tx.amount)))}</div>
                      <div style={{display:"flex",gap:4,marginTop:5,justifyContent:"flex-end"}}>
                        <button onClick={()=>openModal("tx",{...tx})} style={{background:"#f5f5f5",border:"none",borderRadius:6,width:26,height:26,cursor:"pointer",fontSize:12}}>✏️</button>
                        <button onClick={()=>openModal("tx",{...tx,id:undefined,date:TODAY})} style={{background:"#f0f0ff",border:"none",borderRadius:6,width:26,height:26,cursor:"pointer",fontSize:12}} title="Copia">📋</button>
                        <button onClick={()=>del("transactions",tx.id)} style={{background:"#fff0f0",border:"none",borderRadius:6,width:26,height:26,cursor:"pointer",fontSize:12}}>🗑</button>
                      </div>
                    </div>
                  </div>
                );})}
              </div>
            </div>
          )}

          {/* ── FIXED ── */}
          {page==="fixed"&&(
            <div>
              {/* Account filter pills - always visible */}
              <div style={{display:"flex",gap:8,marginBottom:16,overflowX:"auto",paddingBottom:4}}>
                <button onClick={()=>setFilterAccount("all")} style={{padding:"8px 16px",borderRadius:20,border:`1.5px solid ${filterAccount==="all"?"#6366f1":"#eee"}`,background:filterAccount==="all"?"#6366f111":"#fff",color:filterAccount==="all"?"#6366f1":"#666",fontWeight:filterAccount==="all"?700:400,fontSize:12,cursor:"pointer",whiteSpace:"nowrap"}}>Tutti i conti</button>
                {accounts.map(acc=>(
                  <button key={acc.id} onClick={()=>setFilterAccount(acc.id)} style={{padding:"8px 16px",borderRadius:20,border:`1.5px solid ${filterAccount===acc.id?acc.color:"#eee"}`,background:filterAccount===acc.id?acc.color+"11":"#fff",color:filterAccount===acc.id?acc.color:"#666",fontWeight:filterAccount===acc.id?700:400,fontSize:12,cursor:"pointer",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:6}}>
                    {acc.icon} {acc.name}
                  </button>
                ))}
              </div>

              {/* Account summary cards */}
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12,marginBottom:16}}>
                {accounts.filter(acc=>filterAccount==="all"||acc.id===filterAccount).map(acc=>{const exp=fixedTx.filter(tx=>tx.account_id===acc.id&&tx.type==="expense").reduce((s,tx)=>s+Number(tx.amount),0),inc=fixedTx.filter(tx=>tx.account_id===acc.id&&tx.type==="income").reduce((s,tx)=>s+Number(tx.amount),0);return(<div key={acc.id} style={{background:`linear-gradient(135deg,${acc.color},${acc.color}88)`,borderRadius:16,padding:"16px 18px",color:"#fff"}}><div style={{fontSize:13,fontWeight:700,marginBottom:8}}>{acc.icon} {acc.name}</div><div style={{display:"flex",justifyContent:"space-between"}}><div><div style={{fontSize:10,color:"#ffffff66"}}>Entrate fisse</div><div style={{fontSize:16,fontWeight:800,color:"#34d399"}}>+{acc.currency} {fmtN(inc)}</div></div><div><div style={{fontSize:10,color:"#ffffff66"}}>Uscite fisse</div><div style={{fontSize:16,fontWeight:800,color:"#f87171"}}>-{acc.currency} {fmtN(exp)}</div></div></div></div>);})}
              </div>
              <TabSwitch tabs={[["expense","↓ Uscite Fisse"],["income","↑ Entrate Fisse"]]} value={fixedTab} onChange={setFixedTab}/>
              <div style={{display:"flex",justifyContent:"flex-end",marginBottom:14,gap:8}}>
                <button onClick={()=>openModal("bulkFixed")} style={{background:"#f0f0ff",border:"none",borderRadius:10,padding:"10px 14px",color:"#6366f1",fontWeight:600,fontSize:12,cursor:"pointer"}}>📋 Modifica Massiva</button>
                <button onClick={()=>openModal("advancedCalc")} style={{background:"#f0fff4",border:"none",borderRadius:10,padding:"10px 14px",color:"#10b981",fontWeight:600,fontSize:12,cursor:"pointer"}}>📊 Calc. Trasferimenti</button>
                <button onClick={()=>openModal("fixed",{type:fixedTab,account_id:filterAccount!=="all"?filterAccount:accounts[0]?.id,recurring_day:25,date:TODAY})} style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:10,padding:"10px 16px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>+ {fixedTab==="income"?"Entrata":"Uscita"} Fissa</button>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {fixedTx.filter(tx=>tx.type===fixedTab&&(filterAccount==="all"||tx.account_id===filterAccount)).map(tx=>{const cat=catMap[tx.category_id],acc=accMap[tx.account_id];return(
                  <div key={tx.id} style={{background:"#fff",borderRadius:14,padding:"13px 16px",display:"flex",alignItems:"center",gap:12,boxShadow:"0 2px 8px #0001",borderLeft:`4px solid ${acc?.color||"#eee"}`}}>
                    <div style={{width:40,height:40,borderRadius:12,background:cat?.color+"22"||"#f0f0ff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{cat?.icon||"📌"}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:14,fontWeight:600}}>{tx.name}</div>
                      <div style={{fontSize:11,color:"#bbb"}}>
                        Giorno <strong style={{color:"#6366f1"}}>{tx.recurring_day||25}</strong>
                        <span style={{marginLeft:6,padding:"1px 6px",borderRadius:10,background:acc?.color+"22",color:acc?.color,fontSize:10,fontWeight:700}}>{acc?.icon} {acc?.name}</span>
                        {cat&&<span style={{marginLeft:4,color:"#bbb"}}> · {cat.icon} {cat.name}</span>}
                      </div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:15,fontWeight:800,color:tx.type==="income"?"#10b981":"#ef4444"}}>{tx.type==="income"?"+":"-"}{acc?.currency} {fmtN(Math.abs(Number(tx.amount)))}</div>
                      <div style={{display:"flex",gap:4,marginTop:5,justifyContent:"flex-end"}}>
                        <button onClick={()=>openModal("fixed",{...tx})} style={{background:"#f5f5f5",border:"none",borderRadius:6,width:26,height:26,cursor:"pointer",fontSize:12}}>✏️</button>
                        <button onClick={()=>del("transactions",tx.id)} style={{background:"#fff0f0",border:"none",borderRadius:6,width:26,height:26,cursor:"pointer",fontSize:12}}>🗑</button>
                      </div>
                    </div>
                  </div>
                );})}
                {fixedTx.filter(tx=>tx.type===fixedTab&&(filterAccount==="all"||tx.account_id===filterAccount)).length===0&&<div style={{textAlign:"center",color:"#ccc",padding:"40px 0",fontSize:13}}>Nessuna {fixedTab==="income"?"entrata":"uscita"} fissa</div>}
              </div>
            </div>
          )}

          {/* ── REPORTS ── */}
          {page==="reports"&&(
            <ReportsPage
              filteredAll={filteredAll}
              variableTx={variableTx}
              fixedAsMonthly={fixedAsMonthly}
              filterYear={filterYear}
              accounts={accounts}
              catMap={catMap}
              accMap={accMap}
              trend={trend}
              exportCSV={exportCSV}
              openModal={openModal}
            />
          )}

          {/* ── FORECAST ── */}
          {page==="forecast"&&(
            <ForecastPage
              fixedTx={fixedTx}
              variableTx={variableTx}
              accounts={accounts}
              categories={categories}
              accMap={accMap}
              catMap={catMap}
              token={token}
              user={user}
              filterYear={filterYear}
              isMobile={isMobile}
              showToast={showToast}
            />
          )}

          {/* ── REPORT BUILDER ── */}
          {page==="reportbuilder"&&(
            <ReportBuilder
              transactions={transactions}
              accounts={accounts}
              categories={categories}
              catMap={catMap}
              accMap={accMap}
              token={token}
              user={user}
              showToast={showToast}
              isMobile={isMobile}
            />
          )}

          {/* ── SAVINGS ── */}
          {page==="savings"&&(
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
                <button onClick={()=>openModal("tx",{type:"saving",date:TODAY,account_id:accounts[0]?.id})} style={{background:"#f5f5f5",border:"none",borderRadius:10,padding:"10px 14px",fontSize:13,cursor:"pointer",color:"#666",fontWeight:600}}>+ Movimento Risparmio</button>
                <button onClick={()=>openModal("savings")} style={{background:"linear-gradient(135deg,#10b981,#059669)",border:"none",borderRadius:10,padding:"10px 14px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>+ Nuovo Obiettivo</button>
              </div>
              {savings.map(g=>{const pct=g.target_amount>0?Math.min(100,(g.current_amount/g.target_amount)*100):0;return(
                <div key={g.id} style={{background:"#fff",borderRadius:18,padding:20,boxShadow:"0 2px 12px #0001"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <div style={{width:46,height:46,borderRadius:14,background:g.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{g.icon}</div>
                      <div>
                        <div style={{fontSize:15,fontWeight:700}}>{g.name}</div>
                        <div style={{fontSize:11,color:"#bbb"}}>{g.currency} · {g.deadline?`Entro ${g.deadline}`:"Nessuna scadenza"}</div>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>openModal("savingsTransfer",g)} style={{background:"#f0fff4",border:"none",borderRadius:8,padding:"7px 12px",color:"#10b981",fontSize:12,cursor:"pointer",fontWeight:700}}>💰 Deposita</button>
                      <button onClick={()=>openModal("savings",{...g})} style={{background:"#f5f5f5",border:"none",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:14}}>✏️</button>
                      <button onClick={()=>del("savings_goals",g.id)} style={{background:"#fff0f0",border:"none",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:14}}>🗑</button>
                    </div>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                    <span style={{fontSize:13,color:"#666"}}>Raggiunto</span>
                    <span style={{fontSize:14,fontWeight:800,color:g.color}}>{g.currency} {fmtN(g.current_amount)} / {fmtN(g.target_amount)}</span>
                  </div>
                  <div style={{background:"#f5f5f5",borderRadius:8,height:12,overflow:"hidden"}}>
                    <div style={{width:`${pct}%`,height:"100%",background:`linear-gradient(90deg,${g.color},${g.color}99)`,borderRadius:8}}/>
                  </div>
                  <div style={{fontSize:12,color:"#bbb",marginTop:6}}>{fmtN(pct,0)}% · Mancano {g.currency} {fmtN(Math.max(0,g.target_amount-g.current_amount))}</div>
                </div>
              );})}
              {savings.length===0&&<div style={{textAlign:"center",color:"#ccc",padding:"60px 0",fontSize:13}}>Nessun obiettivo di risparmio</div>}
            </div>
          )}

          {/* ── SETTINGS ── */}
          {page==="settings"&&(
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div style={{background:"#fff",borderRadius:18,padding:18,boxShadow:"0 2px 12px #0001"}}>
                <div style={{fontSize:13,fontWeight:700,marginBottom:14}}>👤 Profilo</div>
                <div style={{fontSize:13,color:"#666"}}>Email: <strong>{user?.email}</strong></div>
                <div style={{display:"flex",gap:8,marginTop:14,flexWrap:"wrap"}}>
                  <div style={{flex:1,minWidth:120}}><Btn onClick={()=>openModal("share")} label="👨‍👩‍👧 Condividi" outline color="#6366f1" small/></div>
                  <div style={{flex:1,minWidth:120}}><Btn onClick={()=>openModal("import")} label="📥 Import Excel" outline color="#10b981" small/></div>
                  <div style={{flex:1,minWidth:120}}><Btn onClick={signOut} label="Esci" outline color="#ef4444" small/></div>
                </div>
                <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid #f5f5f5"}}>
                  <div style={{fontSize:12,color:"#bbb",marginBottom:8}}>Zona pericolosa</div>
                  <button onClick={deleteUser} style={{width:"100%",padding:"10px 0",background:"#fff0f0",border:"1.5px solid #fecaca",borderRadius:10,color:"#ef4444",fontSize:13,fontWeight:700,cursor:"pointer"}}>
                    🗑 Elimina account e tutti i dati
                  </button>
                </div>
              </div>
              <div style={{background:"#fff",borderRadius:18,padding:18,boxShadow:"0 2px 12px #0001"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <div style={{fontSize:13,fontWeight:700}}>🏦 Conti</div>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>openModal("adjustAccount")} style={{background:"#f0f0ff",border:"none",borderRadius:8,padding:"6px 10px",color:"#6366f1",fontSize:12,cursor:"pointer",fontWeight:600}}>⚖️ Aggiusta</button>
                    <button onClick={()=>openModal("account")} style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:8,padding:"6px 12px",color:"#fff",fontSize:12,cursor:"pointer",fontWeight:700}}>+ Conto</button>
                  </div>
                </div>
                {accounts.map(acc=>(<div key={acc.id} style={{display:"flex",alignItems:"center",gap:12,marginBottom:10,padding:"12px 14px",background:"#f8f9fc",borderRadius:12}}><div style={{width:40,height:40,borderRadius:12,background:acc.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{acc.icon}</div><div style={{flex:1}}><div style={{fontSize:14,fontWeight:600}}>{acc.name}</div><div style={{fontSize:11,color:"#bbb"}}>{acc.currency} · Saldo: {acc.currency} {fmtN(accountBalance(acc.id))}</div></div><div style={{display:"flex",gap:6}}><button onClick={()=>openModal("account",{...acc})} style={{background:"#f5f5f5",border:"none",borderRadius:6,width:30,height:30,cursor:"pointer",fontSize:14}}>✏️</button><button onClick={()=>del("accounts",acc.id)} style={{background:"#fff0f0",border:"none",borderRadius:6,width:30,height:30,cursor:"pointer",fontSize:14}}>🗑</button></div></div>))}
              </div>
              <div style={{background:"#fff",borderRadius:18,padding:18,boxShadow:"0 2px 12px #0001"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <div style={{fontSize:13,fontWeight:700}}>🏷️ Categorie</div>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>openModal("budgetSuggest")} style={{background:"#f0fff4",border:"none",borderRadius:8,padding:"6px 10px",color:"#10b981",fontSize:12,cursor:"pointer",fontWeight:600}}>💡 Suggerisci Budget</button>
                    <button onClick={()=>openModal("cat")} style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",borderRadius:8,padding:"6px 12px",color:"#fff",fontSize:12,cursor:"pointer",fontWeight:700}}>+ Categoria</button>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:8}}>
                  {categories.map(cat=>{const spent=expenses.filter(tx=>tx.category_id===cat.id).reduce((s,tx)=>s+Number(tx.amount),0);return(<div key={cat.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"#f8f9fc",borderRadius:12}}><div style={{width:34,height:34,borderRadius:10,background:cat.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{cat.icon}</div><div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{cat.name}</div><div style={{fontSize:10,color:"#bbb"}}>Budget: {cat.budget>0?`${fmtN(cat.budget)} €`:"—"} · Speso: {fmtN(spent)}</div></div><div style={{display:"flex",gap:4}}><button onClick={()=>openModal("cat",{...cat})} style={{background:"#fff",border:"none",borderRadius:5,width:26,height:26,cursor:"pointer",fontSize:12}}>✏️</button><button onClick={()=>del("categories",cat.id)} style={{background:"#fff0f0",border:"none",borderRadius:5,width:26,height:26,cursor:"pointer",fontSize:12}}>🗑</button></div></div>);})}
                </div>
              </div>
              <div style={{background:"#fff",borderRadius:18,padding:18,boxShadow:"0 2px 12px #0001"}}>
                <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>💱 Tassi di Cambio Live</div>
                <div style={{fontSize:12,color:"#bbb",marginBottom:14}}>Aggiornati automaticamente da frankfurter.app · Base EUR</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  {[["CHF","🇨🇭"],["USD","🇺🇸"],["GBP","🇬🇧"]].map(([cur,flag])=>(
                    <div key={cur} style={{background:"#f8f9fc",borderRadius:12,padding:"12px 14px"}}>
                      <div style={{fontSize:11,color:"#bbb",marginBottom:4}}>{flag} {cur} → EUR</div>
                      <div style={{fontSize:16,fontWeight:800,color:"#1a1a2e"}}>1 {cur} = {fmtN(1/rates[cur],4)} €</div>
                    </div>
                  ))}
                  <div style={{background:"#f0f0ff",borderRadius:12,padding:"12px 14px"}}>
                    <div style={{fontSize:11,color:"#6366f1",marginBottom:4}}>🔄 Ultimo aggiornamento</div>
                    <div style={{fontSize:12,fontWeight:600,color:"#6366f1"}}>{new Date().toLocaleDateString("it-IT")}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── MOBILE BOTTOM NAV (5 items max) ── */}
      {isMobile&&(
        <div style={{
          position:"fixed",bottom:0,left:0,right:0,
          background:T.sidebar,
          borderTop:`1px solid #ffffff0a`,
          display:"flex",zIndex:200,
          paddingBottom:"env(safe-area-inset-bottom,0px)",
          boxShadow:"0 -4px 24px #00000033",
        }}>
          {[navItems[0],navItems[1],navItems[2],navItems[6],navItems[7]].map(n=>{
            const active=page===n.id;
            return (
              <button key={n.id} onClick={()=>setPage(n.id)} style={{
                flex:1,padding:"11px 0 9px",background:"none",border:"none",
                cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,
              }}>
                <div style={{fontSize:19,opacity:active?1:0.35}}>{n.icon}</div>
                <div style={{fontSize:9,fontWeight:active?700:400,color:active?"#fff":"#ffffff33",letterSpacing:"0.03em"}}>
                  {n.label.split(" ")[0].toUpperCase()}
                </div>
                {active&&<div style={{position:"absolute",top:0,width:20,height:2,borderRadius:2,background:T.primary,marginTop:0}}/>}
              </button>
            );
          })}
        </div>
      )}

      {/* ── FAB ── */}
      {isMobile&&page!=="settings"&&(
        <button onClick={()=>openModal("tx",{date:TODAY,type:"expense",account_id:accounts[0]?.id})}
          style={{
            position:"fixed",bottom:72,right:20,
            width:54,height:54,borderRadius:"50%",
            background:`linear-gradient(135deg,${T.primary},${T.primaryDk})`,
            border:"none",color:"#fff",fontSize:26,cursor:"pointer",
            boxShadow:`0 4px 20px ${T.primary}66`,zIndex:150,
            display:"flex",alignItems:"center",justifyContent:"center",
          }}>+</button>
      )}

      {/* ── MODALS ── */}
      {modal?.type==="tx"             && <TxModal init={modal.init} accounts={accounts} categories={categories} accMap={accMap} onSave={saveTx} onClose={closeModal}/>}
      {modal?.type==="quicktx"        && <TxModal init={modal.init} accounts={accounts} categories={categories} accMap={accMap} onSave={saveTx} onClose={closeModal} isQuick/>}
      {modal?.type==="fixed"          && <FixedModal init={modal.init} accounts={accounts} categories={categories} accMap={accMap} onSave={saveFixed} onClose={closeModal}/>}
      {modal?.type==="transfer"       && <TransferModal init={modal.init} accounts={accounts} accMap={accMap} exchangeRate={exchangeRate} onSave={saveTransfer} onClose={closeModal}/>}
      {modal?.type==="account"        && <AccountModal init={modal.init} onSave={saveAccount} onClose={closeModal}/>}
      {modal?.type==="cat"            && <CatModal init={modal.init} onSave={saveCat} onClose={closeModal}/>}
      {modal?.type==="savings"        && <SavingsModal init={modal.init} accounts={accounts} onSave={saveSavings} onClose={closeModal}/>}
      {modal?.type==="adjustAccount"  && <AdjustModal accounts={accounts} accountBalance={accountBalance} onSave={adjustAccount} onClose={closeModal}/>}
      {modal?.type==="share"          && <ShareModal token={token} userId={user?.id} onClose={closeModal} onToast={showToast}/>}
      {modal?.type==="customizeDash"  && <DashboardCustomizer activeWidgets={dashWidgets} onSave={saveWidgets} onClose={closeModal}/>}
      {modal?.type==="import"         && <ImportModal accounts={accounts} categories={categories} userId={user?.id} token={token} onClose={closeModal} onSuccess={()=>{closeModal();load();showToast("Dati importati ✓");}}/>}
      {/* Group B modals */}
      {modal?.type==="budgetSuggest"  && <BudgetSuggestModal categories={categories} transactions={transactions} onSave={async(catId,budget)=>{await t("categories").patch({budget},`id=eq.${catId}`);setData(d=>({...d,categories:d.categories.map(c=>c.id===catId?{...c,budget}:c)}));showToast("Budget aggiornato ✓");}} onClose={closeModal}/>}
      {modal?.type==="advancedCalc"   && <AdvancedTransferCalcModal accounts={accounts} fixedTx={fixedTx} accMap={accMap} rates={rates} onTransfer={(f)=>{closeModal();setTimeout(()=>openModal("transfer",f),100);}} onClose={closeModal}/>}
      {modal?.type==="bulkFixed"      && <BulkEditFixedModal fixedTx={fixedTx} accounts={accounts} categories={categories} accMap={accMap} catMap={catMap} onSave={saveBulkFixed} onClose={()=>{closeModal();load();showToast("Modifiche salvate ✓");}}/>}
      {modal?.type==="savingsTransfer"&& <SavingsTransferModal goal={modal.init} accounts={accounts} accMap={accMap} onSave={saveSavingsTransfer} onClose={closeModal}/>}

      {/* Calc detail */}
      {modal?.type==="calcDetail"&&calcTransfer&&(
        <Modal title="📊 Calcolatore Trasferimento" onClose={closeModal}>
          <div style={{fontSize:12,color:"#999",marginBottom:16}}>Basato sulle voci fisse pianificate.</div>
          {[{title:`${calcTransfer.chAcc.icon} ${calcTransfer.chAcc.name}`,rows:[{l:"Entrate fisse",v:calcTransfer.chFixedInc,c:"#10b981"},{l:"Uscite fisse",v:calcTransfer.chFixedExp,c:"#ef4444"},{l:"Netto",v:calcTransfer.chNet,c:calcTransfer.chNet>=0?"#10b981":"#ef4444"}]},{title:`${calcTransfer.itAcc.icon} ${calcTransfer.itAcc.name}`,rows:[{l:"Entrate fisse",v:calcTransfer.itFixedInc,c:"#10b981"},{l:"Uscite fisse",v:calcTransfer.itFixedExp,c:"#ef4444"},{l:"Netto",v:calcTransfer.itNet,c:calcTransfer.itNet>=0?"#10b981":"#ef4444"}]}].map(sec=>(<div key={sec.title} style={{background:"#f8f9fc",borderRadius:14,padding:16,marginBottom:12}}><div style={{fontSize:13,fontWeight:700,marginBottom:10}}>{sec.title}</div>{sec.rows.map(r=>(<div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #eee"}}><span style={{fontSize:12,color:"#666"}}>{r.l}</span><span style={{fontSize:13,fontWeight:700,color:r.c}}>{r.v>=0?"+":""}{fmtN(r.v)}</span></div>))}</div>))}
          <div style={{background:calcTransfer.itDeficit>0?"#fef3c7":"#d1fae5",borderRadius:14,padding:16,marginBottom:16}}>
            {calcTransfer.itDeficit>0?<><div style={{fontSize:12,color:"#92400e",marginBottom:6}}>💸 Trasferimento necessario:</div><div style={{fontSize:22,fontWeight:900,color:"#d97706"}}>CHF {fmtN(calcTransfer.transferCHF)}</div><div style={{fontSize:12,color:"#92400e",marginTop:4}}>= € {fmtN(calcTransfer.itDeficit)} al tasso {fmtN(exchangeRate,4)}</div></>:<div style={{fontSize:13,color:"#065f46"}}>✅ Nessun trasferimento necessario</div>}
          </div>
          <div style={{display:"flex",gap:10}}>
            {calcTransfer.itDeficit>0&&<Btn onClick={()=>{closeModal();setTimeout(()=>openModal("transfer",{from_account_id:calcTransfer.chAcc.id,to_account_id:calcTransfer.itAcc.id,amount_from:calcTransfer.transferCHF.toFixed(2),date:TODAY,rate:exchangeRate}),100);}} label="🔄 Registra Trasferimento" color="#10b981"/>}
            <Btn onClick={()=>{closeModal();setTimeout(()=>openModal("advancedCalc"),100);}} label="📊 Calcolatore Avanzato" outline color="#6366f1"/>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const configured = SUPABASE_URL !== "https://xxxx.supabase.co";
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(()=>{
    if(!configured){setChecking(false);return;}
    (async()=>{
      try{
        const saved=localStorage.getItem("sb_session");
        if(!saved){setChecking(false);return;}
        const s=JSON.parse(saved);
        const u=await sb.auth.getUser(s.access_token);
        if(u?.id){ setSession({...s,user:u}); }
        else if(s.refresh_token){
          const r=await sb.auth.refresh(s.refresh_token);
          if(r?.access_token){
            const ns={access_token:r.access_token,refresh_token:r.refresh_token,user:r.user};
            localStorage.setItem("sb_session",JSON.stringify(ns));
            setSession(ns);
          } else localStorage.removeItem("sb_session");
        } else localStorage.removeItem("sb_session");
      } catch { localStorage.removeItem("sb_session"); }
      setChecking(false);
    })();
  },[]);

  const signOut=useCallback(async()=>{
    if(session?.access_token) await sb.auth.signOut(session.access_token);
    localStorage.removeItem("sb_session");
    setSession(null);
  },[session]);

  if(!configured) return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'Inter',system-ui,sans-serif"}}>
      <style>{CSS}</style>
      <Card style={{maxWidth:400,textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:16}}>⚙️</div>
        <div style={{fontSize:18,fontWeight:700,color:T.gray900,marginBottom:8}}>Credenziali non configurate</div>
        <div style={{fontSize:13,color:T.gray500,lineHeight:1.7}}>
          Sostituisci <code style={{background:T.primaryLt,color:T.primary,padding:"2px 6px",borderRadius:4}}>SUPABASE_URL</code> e{" "}
          <code style={{background:T.primaryLt,color:T.primary,padding:"2px 6px",borderRadius:4}}>SUPABASE_KEY</code>{" "}
          in cima al file con i valori da <strong>Supabase → Project Settings → API</strong>.
        </div>
      </Card>
    </div>
  );

  if(checking) return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',system-ui,sans-serif"}}>
      <style>{CSS}</style>
      <div style={{textAlign:"center"}}>
        <div style={{width:44,height:44,border:`3px solid ${T.gray100}`,borderTop:`3px solid ${T.primary}`,borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 12px"}}/>
        <div style={{fontSize:13,color:T.gray400}}>Caricamento…</div>
      </div>
    </div>
  );

  return (
    <AuthCtx.Provider value={{token:session?.access_token,user:session?.user,signOut}}>
      <style>{CSS}</style>
      {session ? <BudgetApp/> : <AuthScreen onAuth={setSession}/>}
    </AuthCtx.Provider>
  );
}