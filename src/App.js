import React, { useState, useEffect, useCallback, useMemo, createContext, useContext, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://wfecmedeqgnupvjixkad.supabase.co";   // <-- sostituisci
const SUPABASE_KEY = "sb_publishable_pLRwZPPJVbQzAXllZcPszw_x1CblPEM";               // <-- sostituisci
// ─────────────────────────────────────────────────────────────────────────────

const MONTHS = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const MONTHS_SHORT = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];
const TODAY = new Date().toISOString().split("T")[0];
const CUR_MONTH = MONTHS[new Date().getMonth()];
const CUR_YEAR = new Date().getFullYear();
const fmtN = (n, d=2) => Number(n||0).toLocaleString("it-IT", { minimumFractionDigits:d, maximumFractionDigits:d });

// ─── SUPABASE ─────────────────────────────────────────────────────────────────
const sb = {
  auth: {
    signUp: (email, pw, name) => fetch(`${SUPABASE_URL}/auth/v1/signup`, { method:"POST", headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"}, body:JSON.stringify({email,password:pw,data:{full_name:name}}) }).then(r=>r.json()),
    signIn: (email, pw) => fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method:"POST", headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"}, body:JSON.stringify({email,password:pw}) }).then(r=>r.json()),
    signOut: (token) => fetch(`${SUPABASE_URL}/auth/v1/logout`, { method:"POST", headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${token}`} }),
    getUser: (token) => fetch(`${SUPABASE_URL}/auth/v1/user`, { headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${token}`} }).then(r=>r.json()),
    refresh: (rt) => fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, { method:"POST", headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"}, body:JSON.stringify({refresh_token:rt}) }).then(r=>r.json()),
  },
  db: (token) => (table) => ({
    get: (filter="") => fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, { headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${token}`} }).then(r=>r.json()),
    post: (data) => fetch(`${SUPABASE_URL}/rest/v1/${table}`, { method:"POST", headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${token}`,"Content-Type":"application/json",Prefer:"return=representation"}, body:JSON.stringify(data) }).then(r=>r.json()),
    patch: (data, filter) => fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, { method:"PATCH", headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${token}`,"Content-Type":"application/json",Prefer:"return=minimal"}, body:JSON.stringify(data) }),
    del: (filter) => fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, { method:"DELETE", headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${token}`} }),
    rpc: (fn, body) => fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, { method:"POST", headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${token}`,"Content-Type":"application/json"}, body:JSON.stringify(body) }).then(r=>r.json()),
  }),
};

// ─── AUTH CONTEXT ─────────────────────────────────────────────────────────────
const AuthCtx = createContext(null);
const useAuth = () => useContext(AuthCtx);

// ─── GLOBAL CSS ───────────────────────────────────────────────────────────────
const CSS = `
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
  @keyframes slideIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
  *{box-sizing:border-box}
  input,select,textarea{font-family:inherit}
  input:focus,select:focus,textarea:focus{outline:none;border-color:#6366f1!important;box-shadow:0 0 0 3px #6366f122}
  button{font-family:inherit}
  button:active{transform:scale(.97)}
  ::-webkit-scrollbar{width:4px;height:4px}
  ::-webkit-scrollbar-thumb{background:#ddd;border-radius:4px}
  .card{animation:fadeUp .2s ease both}
`;

// ─── UI PRIMITIVES ────────────────────────────────────────────────────────────
const Toast = ({ msg, ok }) => (
  <div style={{ position:"fixed", top:20, left:"50%", transform:"translateX(-50%)", background:ok?"#1a1a2e":"#ef4444", borderRadius:10, padding:"10px 22px", fontSize:13, color:"#fff", zIndex:9999, animation:"fadeUp .2s ease", whiteSpace:"nowrap", boxShadow:"0 4px 20px #0004" }}>{msg}</div>
);

const Modal = ({ title, onClose, children }) => (
  <div style={{ position:"fixed", inset:0, background:"#00000066", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:1000, padding:16 }} onClick={onClose}>
    <div style={{ background:"#fff", borderRadius:24, padding:28, width:"100%", maxWidth:480, maxHeight:"92vh", overflowY:"auto", boxShadow:"0 -4px 40px #0003", animation:"slideIn .25s ease" }} onClick={e=>e.stopPropagation()}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:22 }}>
        <div style={{ fontSize:16, fontWeight:800, color:"#1a1a2e" }}>{title}</div>
        <button onClick={onClose} style={{ background:"#f5f5f5", border:"none", borderRadius:8, width:32, height:32, cursor:"pointer", fontSize:16, color:"#999" }}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

const Field = ({ label, hint, children }) => (
  <div style={{ marginBottom:16 }}>
    <div style={{ fontSize:11, fontWeight:700, color:"#bbb", letterSpacing:1.2, marginBottom:7 }}>{label}</div>
    {children}
    {hint && <div style={{ fontSize:11, color:"#bbb", marginTop:4 }}>{hint}</div>}
  </div>
);

// ── Stable input components (no re-mount = no focus loss) ─────────────────────
const Inp = React.memo(({ value, onChange, type="text", placeholder, style={} }) => (
  <input type={type} value={value??""} onChange={onChange} placeholder={placeholder}
    style={{ width:"100%", border:"1.5px solid #eee", borderRadius:10, padding:"11px 14px", fontSize:14, color:"#1a1a2e", ...style }}/>
));

const Sel = React.memo(({ value, onChange, children }) => (
  <select value={value??""} onChange={onChange}
    style={{ width:"100%", border:"1.5px solid #eee", borderRadius:10, padding:"11px 36px 11px 14px", fontSize:14, background:"#fff", color:"#1a1a2e", cursor:"pointer", appearance:"none", backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23999' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat:"no-repeat", backgroundPosition:"right 14px center" }}>
    {children}
  </select>
));

const Btn = ({ onClick, label, color="#6366f1", outline, disabled, small }) => (
  <button onClick={onClick} disabled={disabled}
    style={{ width:"100%", padding:small?"10px 0":"13px 0", background:disabled?"#f0f0f0":outline?"transparent":`linear-gradient(135deg,${color},${color}cc)`, border:outline?`1.5px solid ${color}`:"none", borderRadius:12, color:disabled?"#bbb":outline?color:"#fff", fontWeight:700, fontSize:small?13:14, cursor:disabled?"not-allowed":"pointer", boxShadow:(!outline&&!disabled)?`0 4px 20px ${color}33`:"none", transition:"all .2s" }}>{label}</button>
);

const TabSwitch = ({ tabs, value, onChange }) => (
  <div style={{ display:"flex", background:"#f5f5f5", borderRadius:12, padding:3, marginBottom:16 }}>
    {tabs.map(([v,l]) => (
      <button key={v} onClick={() => onChange(v)} style={{ flex:1, padding:"9px 0", border:"none", borderRadius:9, background:value===v?"#fff":"transparent", color:value===v?"#1a1a2e":"#bbb", fontWeight:value===v?700:400, fontSize:13, cursor:"pointer", boxShadow:value===v?"0 1px 6px #0001":"none", transition:"all .2s" }}>{l}</button>
    ))}
  </div>
);

// ─── CHARTS ──────────────────────────────────────────────────────────────────
const DonutChart = ({ data, size=180, centerLabel, centerValue }) => {
  const total = data.reduce((s,d)=>s+Math.abs(d.value),0);
  if(!total) return <div style={{ width:size, height:size, borderRadius:"50%", background:"#f5f5f5", display:"flex", alignItems:"center", justifyContent:"center", color:"#ccc", fontSize:12 }}>Nessun dato</div>;
  let cum=0; const r=size/2-10, cx=size/2, cy=size/2;
  const slices=data.map(d=>{ const pct=Math.abs(d.value)/total, s=cum*2*Math.PI-Math.PI/2; cum+=pct; const e=cum*2*Math.PI-Math.PI/2; return {...d, path:`M ${cx} ${cy} L ${cx+r*Math.cos(s)} ${cy+r*Math.sin(s)} A ${r} ${r} 0 ${pct>.5?1:0} 1 ${cx+r*Math.cos(e)} ${cy+r*Math.sin(e)} Z`}; });
  return (
    <svg width={size} height={size}>
      {slices.map((s,i) => <path key={i} d={s.path} fill={s.color} stroke="#fff" strokeWidth={2}/>)}
      <circle cx={cx} cy={cy} r={r*.58} fill="#fff"/>
      {centerLabel && <text x={cx} y={cy-8} textAnchor="middle" fontSize={10} fill="#999">{centerLabel}</text>}
      {centerValue && <text x={cx} y={cy+10} textAnchor="middle" fontSize={13} fontWeight={700} fill="#1a1a2e">{centerValue}</text>}
    </svg>
  );
};

const BarChart = ({ data, color="#6366f1" }) => {
  const max = Math.max(...data.map(d=>Math.abs(d.value)),1);
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:5, height:80 }}>
      {data.map((d,i) => (
        <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
          <div style={{ width:"100%", background:`${color}18`, borderRadius:"4px 4px 0 0", height:64, display:"flex", alignItems:"flex-end" }}>
            <div style={{ width:"100%", height:`${(Math.abs(d.value)/max)*100}%`, background:`linear-gradient(180deg,${color},${color}88)`, borderRadius:"4px 4px 0 0", transition:"height .5s ease" }}/>
          </div>
          <div style={{ fontSize:9, color:"#bbb", whiteSpace:"nowrap" }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
};

// ─── MODAL COMPONENTS (own local state = no focus loss) ───────────────────────

// Transaction Modal
const TxModal = React.memo(({ init, accounts, categories, accMap, onSave, onClose, isQuick }) => {
  const [f, setF] = useState(() => init || { date:TODAY, type:"expense", account_id:accounts[0]?.id||"" });
  const set = (k) => (e) => setF(p => ({...p, [k]: e.target?.value ?? e}));
  const setV = (k, v) => setF(p => ({...p, [k]: v}));
  const catForQuick = isQuick && categories.find(c => c.id===f.category_id);
  return (
    <Modal title={init?.id ? "Modifica Movimento" : isQuick ? `${catForQuick?.icon||""} ${catForQuick?.name||"Spesa Rapida"}` : "Nuovo Movimento"} onClose={onClose}>
      <Field label="TIPO">
        <div style={{ display:"flex", gap:6 }}>
          {[["expense","↓ Spesa","#ef4444"],["income","↑ Entrata","#10b981"],["saving","★ Risparmio","#6366f1"]].map(([v,l,c]) => (
            <button key={v} onClick={() => setV("type",v)} style={{ flex:1, padding:"9px 0", border:`1.5px solid ${(f.type||"expense")===v?c:"#eee"}`, borderRadius:10, background:(f.type||"expense")===v?c+"11":"#fff", color:(f.type||"expense")===v?c:"#bbb", fontWeight:700, fontSize:11, cursor:"pointer" }}>{l}</button>
          ))}
        </div>
      </Field>
      <Field label="CONTO">
        <Sel value={f.account_id||""} onChange={set("account_id")}>
          <option value="">Seleziona conto</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name} ({a.currency})</option>)}
        </Sel>
      </Field>
      <Field label="NOME"><Inp value={f.name||""} onChange={set("name")} placeholder="Es. Dentista, Stipendio..."/></Field>
      <Field label={`IMPORTO (${accMap[f.account_id]?.currency||"€"})`}><Inp type="number" value={f.amount??""} onChange={set("amount")} placeholder="0.00"/></Field>
      <Field label="DATA"><Inp type="date" value={f.date||TODAY} onChange={set("date")}/></Field>
      <Field label="CATEGORIA">
        <Sel value={f.category_id||""} onChange={set("category_id")}>
          <option value="">Nessuna categoria</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </Sel>
      </Field>
      <Field label="NOTE"><Inp value={f.note||""} onChange={set("note")} placeholder="Opzionale..."/></Field>
      <Btn onClick={() => onSave(f)} label={init?.id ? "Salva modifiche" : "Aggiungi movimento"}/>
    </Modal>
  );
});

// Fixed Modal
const FixedModal = React.memo(({ init, accounts, categories, accMap, onSave, onClose }) => {
  const [f, setF] = useState(() => init || { date:TODAY, type:"expense", account_id:accounts[0]?.id||"", recurring_day:25 });
  const set = (k) => (e) => setF(p => ({...p, [k]: e.target?.value ?? e}));
  const setV = (k, v) => setF(p => ({...p, [k]: v}));
  return (
    <Modal title={init?.id ? "Modifica Voce Fissa" : "Nuova Voce Fissa"} onClose={onClose}>
      <div style={{ background:"#f0f0ff", borderRadius:12, padding:"10px 14px", marginBottom:16, fontSize:12, color:"#6366f1" }}>📌 Si ripete automaticamente ogni mese</div>
      <Field label="TIPO">
        <div style={{ display:"flex", gap:6 }}>
          {[["expense","↓ Uscita","#ef4444"],["income","↑ Entrata","#10b981"]].map(([v,l,c]) => (
            <button key={v} onClick={() => setV("type",v)} style={{ flex:1, padding:"9px 0", border:`1.5px solid ${(f.type||"expense")===v?c:"#eee"}`, borderRadius:10, background:(f.type||"expense")===v?c+"11":"#fff", color:(f.type||"expense")===v?c:"#bbb", fontWeight:700, fontSize:12, cursor:"pointer" }}>{l}</button>
          ))}
        </div>
      </Field>
      <Field label="CONTO">
        <Sel value={f.account_id||""} onChange={set("account_id")}>
          <option value="">Seleziona conto</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name} ({a.currency})</option>)}
        </Sel>
      </Field>
      <Field label="NOME"><Inp value={f.name||""} onChange={set("name")} placeholder="Es. Netflix, Stipendio..."/></Field>
      <Field label={`IMPORTO (${accMap[f.account_id]?.currency||"€"})`}><Inp type="number" value={f.amount??""} onChange={set("amount")} placeholder="0.00"/></Field>
      <Field label="DATA PRIMA OCCORRENZA"><Inp type="date" value={f.date||TODAY} onChange={set("date")}/></Field>
      <Field label="GIORNO DEL MESE IN CUI SI RIPETE">
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <Inp type="number" value={f.recurring_day??25} onChange={e => setF(p=>({...p,recurring_day:Math.min(28,Math.max(1,parseInt(e.target.value)||1))}))} style={{ maxWidth:100 }}/>
          <span style={{ fontSize:12, color:"#999" }}>di ogni mese (1–28)</span>
        </div>
      </Field>
      <Field label="CATEGORIA">
        <Sel value={f.category_id||""} onChange={set("category_id")}>
          <option value="">Nessuna categoria</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </Sel>
      </Field>
      <Field label="NOTE"><Inp value={f.note||""} onChange={set("note")} placeholder="Opzionale..."/></Field>
      <Btn onClick={() => onSave(f)} label={init?.id ? "Salva modifiche" : "Aggiungi voce fissa"}/>
    </Modal>
  );
});

// Transfer Modal
const TransferModal = React.memo(({ init, accounts, accMap, exchangeRate, onSave, onClose }) => {
  const [f, setF] = useState(() => init || { date:TODAY, from_account_id:accounts[0]?.id||"", to_account_id:accounts[1]?.id||"", rate:exchangeRate });
  const set = (k) => (e) => setF(p => ({...p, [k]: e.target?.value ?? e}));
  const fromAcc = accMap[f.from_account_id], toAcc = accMap[f.to_account_id];
  const isCrossRate = fromAcc && toAcc && fromAcc.currency !== toAcc.currency;
  return (
    <Modal title="Trasferimento tra Conti" onClose={onClose}>
      <div style={{ background:"#f0fff4", borderRadius:12, padding:"10px 14px", marginBottom:16, fontSize:12, color:"#10b981" }}>🔄 Tasso di cambio applicato automaticamente</div>
      <Field label="DA CONTO">
        <Sel value={f.from_account_id||""} onChange={set("from_account_id")}>
          <option value="">Seleziona</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name} ({a.currency})</option>)}
        </Sel>
      </Field>
      <Field label="A CONTO">
        <Sel value={f.to_account_id||""} onChange={set("to_account_id")}>
          <option value="">Seleziona</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name} ({a.currency})</option>)}
        </Sel>
      </Field>
      <Field label={`IMPORTO (${fromAcc?.currency||""})`}><Inp type="number" value={f.amount_from??""} onChange={set("amount_from")} placeholder="0.00"/></Field>
      {isCrossRate && (
        <Field label="TASSO DI CAMBIO">
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <Inp type="number" value={f.rate??exchangeRate} onChange={set("rate")} style={{ flex:1 }}/>
            <span style={{ fontSize:12, color:"#999", whiteSpace:"nowrap" }}>= {toAcc?.currency} {fmtN((parseFloat(f.amount_from)||0)*(parseFloat(f.rate||exchangeRate)))}</span>
          </div>
        </Field>
      )}
      <Field label="DATA"><Inp type="date" value={f.date||TODAY} onChange={set("date")}/></Field>
      <Field label="NOTE"><Inp value={f.note||""} onChange={set("note")} placeholder="Es. Trasferimento mensile..."/></Field>
      <Btn onClick={() => onSave(f)} label="Registra Trasferimento" color="#10b981"/>
    </Modal>
  );
});

// Account Modal
const AccountModal = React.memo(({ init, onSave, onClose }) => {
  const [f, setF] = useState(() => init || { currency:"EUR", color:"#6366f1", icon:"🏦", balance_initial:0 });
  const set = (k) => (e) => setF(p => ({...p, [k]: e.target?.value ?? e}));
  return (
    <Modal title={init?.id ? "Modifica Conto" : "Nuovo Conto"} onClose={onClose}>
      <Field label="NOME"><Inp value={f.name||""} onChange={set("name")} placeholder="Es. Conto UBS..."/></Field>
      <Field label="VALUTA">
        <div style={{ display:"flex", gap:8 }}>
          {[["CHF","🇨🇭 Franco CHF"],["EUR","🇮🇹 Euro €"]].map(([v,l]) => (
            <button key={v} onClick={() => setF(p=>({...p,currency:v}))} style={{ flex:1, padding:"10px 0", border:`1.5px solid ${f.currency===v?"#6366f1":"#eee"}`, borderRadius:10, background:f.currency===v?"#6366f111":"#fff", color:f.currency===v?"#6366f1":"#bbb", fontWeight:700, fontSize:12, cursor:"pointer" }}>{l}</button>
          ))}
        </div>
      </Field>
      <Field label="ICONA"><Inp value={f.icon||""} onChange={set("icon")} placeholder="🏦"/></Field>
      <Field label="COLORE">
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <input type="color" value={f.color||"#6366f1"} onChange={set("color")} style={{ width:44, height:44, border:"1.5px solid #eee", borderRadius:10, padding:2, cursor:"pointer" }}/>
          <span style={{ fontSize:13, color:"#999" }}>Colore del conto</span>
        </div>
      </Field>
      <Field label="SALDO INIZIALE" hint="Puoi correggere il saldo in qualsiasi momento"><Inp type="number" value={f.balance_initial??""} onChange={set("balance_initial")} placeholder="0.00"/></Field>
      <Btn onClick={() => onSave(f)} label={init?.id ? "Salva modifiche" : "Crea conto"}/>
    </Modal>
  );
});

// Category Modal
const CatModal = React.memo(({ init, onSave, onClose }) => {
  const [f, setF] = useState(() => init || { color:"#6366f1", icon:"📦", budget:0 });
  const set = (k) => (e) => setF(p => ({...p, [k]: e.target?.value ?? e}));
  return (
    <Modal title={init?.id ? "Modifica Categoria" : "Nuova Categoria"} onClose={onClose}>
      <Field label="NOME"><Inp value={f.name||""} onChange={set("name")} placeholder="Es. Spesa, Svago..."/></Field>
      <Field label="ICONA"><Inp value={f.icon||""} onChange={set("icon")} placeholder="📦"/></Field>
      <Field label="COLORE">
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <input type="color" value={f.color||"#6366f1"} onChange={set("color")} style={{ width:44, height:44, border:"1.5px solid #eee", borderRadius:10, padding:2, cursor:"pointer" }}/>
        </div>
      </Field>
      <Field label="BUDGET MENSILE" hint="0 = nessun limite"><Inp type="number" value={f.budget??""} onChange={set("budget")} placeholder="0"/></Field>
      <Btn onClick={() => onSave(f)} label={init?.id ? "Salva" : "Crea categoria"}/>
    </Modal>
  );
});

// Savings Goal Modal
const SavingsModal = React.memo(({ init, accounts, onSave, onClose }) => {
  const [f, setF] = useState(() => init || { color:"#10b981", icon:"🎯", currency:"EUR" });
  const set = (k) => (e) => setF(p => ({...p, [k]: e.target?.value ?? e}));
  return (
    <Modal title={init?.id ? "Modifica Obiettivo" : "Nuovo Obiettivo"} onClose={onClose}>
      <Field label="NOME"><Inp value={f.name||""} onChange={set("name")} placeholder="Es. Vacanza, Macchina..."/></Field>
      <Field label="ICONA"><Inp value={f.icon||""} onChange={set("icon")} placeholder="🎯"/></Field>
      <Field label="COLORE">
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <input type="color" value={f.color||"#10b981"} onChange={set("color")} style={{ width:44, height:44, border:"1.5px solid #eee", borderRadius:10, padding:2, cursor:"pointer" }}/>
        </div>
      </Field>
      <Field label="VALUTA">
        <div style={{ display:"flex", gap:8 }}>
          {[["EUR","€ Euro"],["CHF","CHF Franco"]].map(([v,l]) => (
            <button key={v} onClick={() => setF(p=>({...p,currency:v}))} style={{ flex:1, padding:"9px 0", border:`1.5px solid ${(f.currency||"EUR")===v?"#10b981":"#eee"}`, borderRadius:10, background:(f.currency||"EUR")===v?"#10b98111":"#fff", color:(f.currency||"EUR")===v?"#10b981":"#bbb", fontWeight:700, fontSize:12, cursor:"pointer" }}>{l}</button>
          ))}
        </div>
      </Field>
      <Field label="OBIETTIVO"><Inp type="number" value={f.target_amount??""} onChange={set("target_amount")} placeholder="0.00"/></Field>
      <Field label="RAGGIUNTO FINORA"><Inp type="number" value={f.current_amount??""} onChange={set("current_amount")} placeholder="0.00"/></Field>
      <Field label="CONTO">
        <Sel value={f.account_id||""} onChange={set("account_id")}>
          <option value="">Nessun conto</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
        </Sel>
      </Field>
      <Field label="SCADENZA (opzionale)"><Inp type="date" value={f.deadline||""} onChange={set("deadline")}/></Field>
      <Btn onClick={() => onSave(f)} label={init?.id ? "Salva modifiche" : "Crea obiettivo"} color="#10b981"/>
    </Modal>
  );
});

// Adjust Account Modal
const AdjustModal = React.memo(({ accounts, accountBalance, onSave, onClose }) => {
  const [accId, setAccId] = useState(accounts[0]?.id||"");
  const [newBal, setNewBal] = useState("");
  const currentBal = accountBalance(accId);
  return (
    <Modal title="⚖️ Aggiusta Saldo Conto" onClose={onClose}>
      <div style={{ background:"#fef3c7", borderRadius:12, padding:"10px 14px", marginBottom:16, fontSize:12, color:"#92400e" }}>Modifica il saldo iniziale per correggere discrepanze.</div>
      <Field label="CONTO">
        <Sel value={accId} onChange={e => { setAccId(e.target.value); setNewBal(""); }}>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name} ({a.currency})</option>)}
        </Sel>
      </Field>
      <Field label="Saldo attuale calcolato">
        <div style={{ fontSize:20, fontWeight:800, color:"#6366f1", padding:"6px 0" }}>{accounts.find(a=>a.id===accId)?.currency} {fmtN(currentBal)}</div>
      </Field>
      <Field label="Nuovo saldo reale" hint="Inserisci il saldo effettivo del conto bancario">
        <Inp type="number" value={newBal} onChange={e=>setNewBal(e.target.value)} placeholder={fmtN(currentBal)}/>
      </Field>
      <Btn onClick={() => onSave(accId, parseFloat(newBal))} label="Aggiusta Saldo" color="#f59e0b"/>
    </Modal>
  );
});

// Share Modal
const ShareModal = React.memo(({ token, userId, onClose, onToast }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [shared, setShared] = useState([]);

  useEffect(() => {
    sb.db(token)("household_members").get("select=*,profiles!member_id(email,full_name)&order=created_at").then(r => {
      if (Array.isArray(r)) setShared(r);
    });
  }, []);

  const invite = async () => {
    if (!email) return;
    setLoading(true);
    try {
      // Find user by email via profiles
      const found = await sb.db(token)("profiles").get(`email=eq.${encodeURIComponent(email)}&select=id`);
      if (!Array.isArray(found) || found.length === 0) { onToast("Utente non trovato. Deve prima registrarsi.", false); setLoading(false); return; }
      const memberId = found[0].id;
      if (memberId === userId) { onToast("Non puoi condividere con te stesso", false); setLoading(false); return; }
      await sb.db(token)("household_members").post({ owner_id:userId, member_id:memberId });
      onToast("Condivisione attivata ✓");
      const updated = await sb.db(token)("household_members").get("select=*,profiles!member_id(email,full_name)&order=created_at");
      if (Array.isArray(updated)) setShared(updated);
      setEmail("");
    } catch { onToast("Errore durante la condivisione", false); }
    setLoading(false);
  };

  const remove = async (id) => {
    await sb.db(token)("household_members").del(`id=eq.${id}`);
    setShared(s => s.filter(m => m.id !== id));
    onToast("Condivisione rimossa ✓");
  };

  return (
    <Modal title="👨‍👩‍👧 Condividi con Famiglia" onClose={onClose}>
      <div style={{ background:"#f0f0ff", borderRadius:12, padding:"10px 14px", marginBottom:16, fontSize:12, color:"#6366f1" }}>
        Gli utenti invitati potranno vedere e modificare tutti i tuoi dati.
      </div>
      <Field label="EMAIL UTENTE DA INVITARE">
        <div style={{ display:"flex", gap:8 }}>
          <Inp value={email} onChange={e=>setEmail(e.target.value)} placeholder="moglie@email.com" style={{ flex:1 }}/>
          <button onClick={invite} disabled={loading||!email} style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)", border:"none", borderRadius:10, padding:"0 16px", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", whiteSpace:"nowrap" }}>
            {loading?"...":"Invita"}
          </button>
        </div>
      </Field>
      {shared.length > 0 && (
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:"#bbb", letterSpacing:1, marginBottom:10 }}>ACCESSO CONDIVISO CON</div>
          {shared.map(m => (
            <div key={m.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", background:"#f8f9fc", borderRadius:12, marginBottom:8 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:"#1a1a2e" }}>{m.profiles?.full_name||"—"}</div>
                <div style={{ fontSize:11, color:"#bbb" }}>{m.profiles?.email}</div>
              </div>
              <button onClick={() => remove(m.id)} style={{ background:"#fff0f0", border:"none", borderRadius:8, padding:"6px 12px", color:"#ef4444", fontSize:12, cursor:"pointer", fontWeight:600 }}>Rimuovi</button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
});

// ─── AUTH SCREEN ──────────────────────────────────────────────────────────────
const AuthScreen = ({ onAuth }) => {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  const handle = async () => {
    if (!email || !password) { setError("Inserisci email e password"); return; }
    if (mode==="register" && !fullName) { setError("Inserisci il tuo nome"); return; }
    setLoading(true); setError("");
    try {
      const data = mode==="login" ? await sb.auth.signIn(email, password) : await sb.auth.signUp(email, password, fullName);
      if (data.error) throw new Error(data.error_description||data.msg||"Errore di autenticazione");
      if (!data.access_token) throw new Error("Credenziali non valide");
      localStorage.setItem("sb_session", JSON.stringify({ access_token:data.access_token, refresh_token:data.refresh_token, user:data.user }));
      onAuth({ token:data.access_token, refresh_token:data.refresh_token, user:data.user });
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)", display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ width:"100%", maxWidth:400 }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ fontSize:52, marginBottom:12 }}>💼</div>
          <div style={{ fontSize:26, fontWeight:900, color:"#fff", letterSpacing:-0.5 }}>Finanza Familiare</div>
          <div style={{ fontSize:13, color:"#ffffff55", marginTop:4 }}>Gestisci il tuo budget in CHF e €</div>
        </div>
        <div style={{ background:"#fff", borderRadius:24, padding:32, boxShadow:"0 20px 60px #00000055" }}>
          <TabSwitch tabs={[["login","Accedi"],["register","Registrati"]]} value={mode} onChange={v=>{setMode(v);setError("");}}/>
          {mode==="register" && <Field label="NOME COMPLETO"><Inp value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Mario Rossi" onKeyDown={e=>e.key==="Enter"&&handle()}/></Field>}
          <Field label="EMAIL"><Inp type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="mario@email.com"/></Field>
          <Field label="PASSWORD">
            <div style={{ position:"relative" }}>
              <Inp type={showPwd?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" style={{ paddingRight:44 }}/>
              <button onClick={()=>setShowPwd(!showPwd)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:16, color:"#bbb" }}>{showPwd?"🙈":"👁"}</button>
            </div>
          </Field>
          {error && <div style={{ background:"#fff0f0", border:"1px solid #fecaca", borderRadius:10, padding:"10px 14px", fontSize:13, color:"#ef4444", marginBottom:16 }}>⚠️ {error}</div>}
          <Btn onClick={handle} disabled={loading} label={loading?"Caricamento...":mode==="login"?"Accedi →":"Crea account →"}/>
          {mode==="login" && <div style={{ textAlign:"center", marginTop:14, fontSize:12, color:"#bbb" }}>Non hai un account? <button onClick={()=>{setMode("register");setError("");}} style={{ background:"none", border:"none", color:"#6366f1", fontWeight:700, cursor:"pointer", fontSize:12 }}>Registrati</button></div>}
        </div>
        <div style={{ textAlign:"center", marginTop:16, fontSize:11, color:"#ffffff33" }}>Dati protetti con Supabase Auth</div>
      </div>
    </div>
  );
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
const BudgetApp = () => {
  const { token, user, signOut } = useAuth();
  const t = useCallback(sb.db(token), [token]);

  const [page, setPage] = useState("dashboard");
  const [data, setData] = useState({ accounts:[], categories:[], transactions:[], transfers:[], savings:[] });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null); // { type, init }
  const [filterMonth, setFilterMonth] = useState(CUR_MONTH);
  const [filterYear, setFilterYear] = useState(CUR_YEAR);
  const [filterAccount, setFilterAccount] = useState("all");
  const [fixedTab, setFixedTab] = useState("expense");
  const [exchangeRate, setExchangeRate] = useState(1.06);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [quickDate, setQuickDate] = useState(TODAY);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", h); return () => window.removeEventListener("resize", h);
  }, []);

  const showToast = useCallback((msg, ok=true) => { setToast({msg,ok}); setTimeout(()=>setToast(null),2500); }, []);
  const openModal = useCallback((type, init=null) => setModal({type,init}), []);
  const closeModal = useCallback(() => setModal(null), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [acc,cat,tx,tr,sg] = await Promise.all([
        t("accounts").get("order=created_at"),
        t("categories").get("order=name"),
        t("transactions").get("order=date.desc"),
        t("transfers").get("order=date.desc"),
        t("savings_goals").get("order=created_at"),
      ]);
      setData({ accounts:Array.isArray(acc)?acc:[], categories:Array.isArray(cat)?cat:[], transactions:Array.isArray(tx)?tx:[], transfers:Array.isArray(tr)?tr:[], savings:Array.isArray(sg)?sg:[] });
      try { const fx=await fetch("https://api.frankfurter.app/latest?from=CHF&to=EUR"); const fxd=await fx.json(); if(fxd?.rates?.EUR) setExchangeRate(fxd.rates.EUR); } catch {}
    } catch { showToast("Errore connessione",false); }
    setLoading(false);
  }, [t, showToast]);

  useEffect(()=>{ load(); },[load]);

  const { accounts, categories, transactions, transfers, savings } = data;
  const catMap = useMemo(()=>{ const m={}; categories.forEach(c=>m[c.id]=c); return m; },[categories]);
  const accMap = useMemo(()=>{ const m={}; accounts.forEach(a=>m[a.id]=a); return m; },[accounts]);
  const monthIdx = MONTHS.indexOf(filterMonth);

  const fixedTx    = useMemo(()=>transactions.filter(t=>t.is_fixed),[transactions]);
  const variableTx = useMemo(()=>transactions.filter(t=>!t.is_fixed),[transactions]);

  const fixedAsMonthly = useMemo(()=>fixedTx.map(tx=>({...tx,
    date:`${filterYear}-${String(monthIdx+1).padStart(2,"0")}-${String(tx.recurring_day||25).padStart(2,"0")}`,
    _injected:true,
  })),[fixedTx,monthIdx,filterYear]);

  const filteredVar = useMemo(()=>variableTx.filter(tx=>{
    const d=new Date(tx.date);
    if(MONTHS[d.getMonth()]!==filterMonth||d.getFullYear()!==filterYear) return false;
    if(filterAccount!=="all"&&tx.account_id!==filterAccount) return false;
    return true;
  }),[variableTx,filterMonth,filterYear,filterAccount]);

  const filteredAll = useMemo(()=>{
    let all=[...filteredVar,...fixedAsMonthly];
    if(filterAccount!=="all") all=all.filter(tx=>tx.account_id===filterAccount);
    return all.sort((a,b)=>new Date(b.date)-new Date(a.date));
  },[filteredVar,fixedAsMonthly,filterAccount]);

  const filteredTransfers = useMemo(()=>transfers.filter(tx=>{
    const d=new Date(tx.date); return MONTHS[d.getMonth()]===filterMonth&&d.getFullYear()===filterYear;
  }),[transfers,filterMonth,filterYear]);

  const expenses   = filteredAll.filter(tx=>tx.type==="expense");
  const incomesTx  = filteredAll.filter(tx=>tx.type==="income");
  const savingsTx  = filteredAll.filter(tx=>tx.type==="saving");

  const toEUR = useCallback((amount,accId)=>{ const a=accMap[accId]; return a?.currency==="CHF"?amount*exchangeRate:amount; },[accMap,exchangeRate]);
  const totalExpEUR  = expenses.reduce((s,tx)=>s+toEUR(Number(tx.amount),tx.account_id),0);
  const totalIncEUR  = incomesTx.reduce((s,tx)=>s+toEUR(Number(tx.amount),tx.account_id),0);
  const totalSavEUR  = savingsTx.reduce((s,tx)=>s+toEUR(Number(tx.amount),tx.account_id),0);
  const balanceEUR   = totalIncEUR - totalExpEUR - totalSavEUR;

  const accountBalance = useCallback((accId)=>{
    const inc  = filteredAll.filter(tx=>tx.account_id===accId&&tx.type==="income").reduce((s,tx)=>s+Number(tx.amount),0);
    const exp  = filteredAll.filter(tx=>tx.account_id===accId&&tx.type==="expense").reduce((s,tx)=>s+Number(tx.amount),0);
    const sav  = filteredAll.filter(tx=>tx.account_id===accId&&tx.type==="saving").reduce((s,tx)=>s+Number(tx.amount),0);
    const trIn = filteredTransfers.filter(tx=>tx.to_account_id===accId).reduce((s,tx)=>s+Number(tx.amount_to),0);
    const trOut= filteredTransfers.filter(tx=>tx.from_account_id===accId).reduce((s,tx)=>s+Number(tx.amount_from),0);
    return Number(accMap[accId]?.balance_initial||0)+inc-exp-sav+trIn-trOut;
  },[filteredAll,filteredTransfers,accMap]);

  const catBreakdown = useMemo(()=>{
    const map={}; expenses.forEach(tx=>{const cid=tx.category_id||"none";if(!map[cid])map[cid]=0;map[cid]+=Number(tx.amount);});
    return Object.entries(map).map(([cid,val])=>({cid,val,cat:catMap[cid]||{name:"Altro",color:"#9ca3af",icon:"📦"}})).sort((a,b)=>b.val-a.val);
  },[expenses,catMap]);

  const topCats = useMemo(()=>{
    const freq={}; variableTx.filter(tx=>tx.type==="expense").forEach(tx=>{ if(tx.category_id) freq[tx.category_id]=(freq[tx.category_id]||0)+1; });
    return Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([id])=>catMap[id]).filter(Boolean);
  },[variableTx,catMap]);

  const trend = useMemo(()=>{
    const idx=MONTHS.indexOf(filterMonth);
    return Array.from({length:6},(_,i)=>{
      const mi=(idx-5+i+12)%12,m=MONTHS[mi],yr=mi>idx?filterYear-1:filterYear;
      const val=variableTx.filter(tx=>{const d=new Date(tx.date);return MONTHS[d.getMonth()]===m&&d.getFullYear()===yr&&tx.type==="expense";}).reduce((s,tx)=>s+Number(tx.amount),0)+fixedTx.filter(tx=>tx.type==="expense").reduce((s,tx)=>s+Number(tx.amount),0);
      return {label:MONTHS_SHORT[mi],value:val};
    });
  },[variableTx,fixedTx,filterMonth,filterYear]);

  const calcTransfer = useMemo(()=>{
    const chAcc=accounts.find(a=>a.currency==="CHF"), itAcc=accounts.find(a=>a.currency==="EUR");
    if(!chAcc||!itAcc) return null;
    const chFixedExp=fixedTx.filter(tx=>tx.account_id===chAcc.id&&tx.type==="expense").reduce((s,tx)=>s+Number(tx.amount),0);
    const chFixedInc=fixedTx.filter(tx=>tx.account_id===chAcc.id&&tx.type==="income").reduce((s,tx)=>s+Number(tx.amount),0);
    const itFixedExp=fixedTx.filter(tx=>tx.account_id===itAcc.id&&tx.type==="expense").reduce((s,tx)=>s+Number(tx.amount),0);
    const itFixedInc=fixedTx.filter(tx=>tx.account_id===itAcc.id&&tx.type==="income").reduce((s,tx)=>s+Number(tx.amount),0);
    const itDeficit=itFixedExp-itFixedInc;
    return {chAcc,itAcc,chFixedExp,chFixedInc,chNet:chFixedInc-chFixedExp,itFixedExp,itFixedInc,itNet:itFixedInc-itFixedExp,itDeficit,transferCHF:itDeficit>0?itDeficit/exchangeRate:0};
  },[accounts,fixedTx,exchangeRate]);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const saveTx = useCallback(async (f) => {
    if(!f.name||!f.amount||!f.date||!f.account_id){showToast("Compila tutti i campi",false);return;}
    const body={user_id:user.id,name:f.name,amount:parseFloat(f.amount),type:f.type||"expense",category_id:f.category_id||null,account_id:f.account_id,date:f.date,note:f.note||"",is_fixed:false,recurring_day:null};
    if(f.id) await t("transactions").patch(body,`id=eq.${f.id}`); else await t("transactions").post(body);
    showToast(f.id?"Aggiornato ✓":"Aggiunto ✓"); closeModal(); load();
  },[t,user,showToast,closeModal,load]);

  const saveFixed = useCallback(async (f) => {
    if(!f.name||!f.amount||!f.account_id||!f.date){showToast("Compila tutti i campi",false);return;}
    const body={user_id:user.id,name:f.name,amount:parseFloat(f.amount),type:f.type||"expense",category_id:f.category_id||null,account_id:f.account_id,date:f.date,note:f.note||"",is_fixed:true,recurring_day:parseInt(f.recurring_day)||25};
    if(f.id) await t("transactions").patch(body,`id=eq.${f.id}`); else await t("transactions").post(body);
    showToast(f.id?"Aggiornato ✓":"Aggiunto ✓"); closeModal(); load();
  },[t,user,showToast,closeModal,load]);

  const saveTransfer = useCallback(async (f) => {
    if(!f.from_account_id||!f.to_account_id||!f.amount_from||!f.date){showToast("Compila tutti i campi",false);return;}
    const rate=parseFloat(f.rate||exchangeRate);
    const fa=accMap[f.from_account_id],ta=accMap[f.to_account_id];
    let amtTo;
    if(fa?.currency===ta?.currency) amtTo=parseFloat(f.amount_from);
    else if(fa?.currency==="CHF") amtTo=parseFloat(f.amount_from)*rate;
    else amtTo=parseFloat(f.amount_from)/rate;
    await t("transfers").post({user_id:user.id,from_account_id:f.from_account_id,to_account_id:f.to_account_id,amount_from:parseFloat(f.amount_from),amount_to:amtTo,rate,date:f.date,note:f.note||""});
    showToast("Trasferimento registrato ✓"); closeModal(); load();
  },[t,user,accMap,exchangeRate,showToast,closeModal,load]);

  const saveAccount = useCallback(async (f) => {
    if(!f.name||!f.currency){showToast("Compila tutti i campi",false);return;}
    const body={user_id:user.id,name:f.name,currency:f.currency,color:f.color||"#6366f1",icon:f.icon||"🏦",balance_initial:parseFloat(f.balance_initial||0)};
    if(f.id) await t("accounts").patch(body,`id=eq.${f.id}`); else await t("accounts").post(body);
    showToast("Conto salvato ✓"); closeModal(); load();
  },[t,user,showToast,closeModal,load]);

  const saveCat = useCallback(async (f) => {
    if(!f.name){showToast("Inserisci un nome",false);return;}
    const body={user_id:user.id,name:f.name,icon:f.icon||"📦",color:f.color||"#6366f1",budget:parseFloat(f.budget||0)};
    if(f.id) await t("categories").patch(body,`id=eq.${f.id}`); else await t("categories").post(body);
    showToast("Categoria salvata ✓"); closeModal(); load();
  },[t,user,showToast,closeModal,load]);

  const saveSavings = useCallback(async (f) => {
    if(!f.name) return;
    const body={user_id:user.id,name:f.name,icon:f.icon||"🎯",color:f.color||"#10b981",target_amount:parseFloat(f.target_amount||0),current_amount:parseFloat(f.current_amount||0),currency:f.currency||"EUR",account_id:f.account_id||null,deadline:f.deadline||null};
    if(f.id) await t("savings_goals").patch(body,`id=eq.${f.id}`); else await t("savings_goals").post(body);
    showToast("Salvato ✓"); closeModal(); load();
  },[t,user,showToast,closeModal,load]);

  const adjustAccount = useCallback(async (accId, newBalance) => {
    if(isNaN(newBalance)){showToast("Importo non valido",false);return;}
    await t("accounts").patch({balance_initial:newBalance},`id=eq.${accId}`);
    showToast("Saldo aggiustato ✓"); closeModal(); load();
  },[t,showToast,closeModal,load]);

  const del = useCallback(async (table, id) => {
    await t(table).del(`id=eq.${id}`); showToast("Eliminato ✓"); load();
  },[t,showToast,load]);

  const exportCSV = () => {
    const rows=[["Data","Nome","Tipo","Fisso","Categoria","Conto","Importo","Valuta","Note"]];
    filteredAll.forEach(tx=>{const acc=accMap[tx.account_id];rows.push([tx.date,tx.name,tx.type,tx.is_fixed?"Sì":"No",catMap[tx.category_id]?.name||"",acc?.name||"",tx.amount,acc?.currency||"",tx.note||""]);});
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([rows.map(r=>r.join(";")).join("\n")],{type:"text/csv"}));a.download=`finanza_${filterMonth}_${filterYear}.csv`;a.click();showToast("Export completato ✓");
  };

  if(loading) return <div style={{ minHeight:"100vh", background:"#f8f9fc", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12, fontFamily:"'Segoe UI',system-ui,sans-serif" }}><div style={{ width:40, height:40, border:"3px solid #eee", borderTop:"3px solid #6366f1", borderRadius:"50%", animation:"spin 1s linear infinite" }}/><style>{CSS}</style></div>;

  const selStyle={border:"1.5px solid #eee",borderRadius:8,padding:"6px 26px 6px 10px",fontSize:12,color:"#1a1a2e",background:"#fff",cursor:"pointer",appearance:"none",backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%23999' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")",backgroundRepeat:"no-repeat",backgroundPosition:"right 8px center"};
  const navItems=[{id:"dashboard",icon:"⊞",label:"Home"},{id:"transactions",icon:"↕",label:"Movimenti"},{id:"fixed",icon:"📌",label:"Fisso"},{id:"reports",icon:"◑",label:"Report"},{id:"savings",icon:"🎯",label:"Risparmi"},{id:"settings",icon:"⚙",label:"Impost."}];

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#f8f9fc", fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <style>{CSS}</style>
      {toast && <Toast {...toast}/>}

      {/* Desktop sidebar */}
      {!isMobile && (
        <div style={{ width:220, background:"#fff", borderRight:"1px solid #f0f0f0", position:"fixed", top:0, bottom:0, left:0, zIndex:100, display:"flex", flexDirection:"column", boxShadow:"2px 0 12px #0001" }}>
          <div style={{ padding:"24px 20px 16px" }}>
            <div style={{ fontSize:16, fontWeight:900, color:"#1a1a2e" }}>💼 Finanza</div>
            <div style={{ fontSize:11, color:"#bbb", marginTop:2 }}>{user?.email}</div>
          </div>
          <div style={{ flex:1, padding:"8px 12px", overflowY:"auto" }}>
            {navItems.map(n => (
              <button key={n.id} onClick={()=>setPage(n.id)} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 12px", marginBottom:4, background:page===n.id?"#f0f0ff":"transparent", border:"none", borderRadius:10, color:page===n.id?"#6366f1":"#666", fontWeight:page===n.id?700:400, fontSize:14, cursor:"pointer", textAlign:"left" }}>
                <span style={{ fontSize:18 }}>{n.icon}</span>{n.label}
              </button>
            ))}
          </div>
          <div style={{ padding:"16px 20px", borderTop:"1px solid #f0f0f0" }}>
            <div style={{ fontSize:12, color:"#999", marginBottom:8 }}>1 CHF = {fmtN(exchangeRate,4)} €</div>
            <button onClick={() => openModal("share")} style={{ width:"100%", padding:"8px 0", background:"#f0f0ff", border:"none", borderRadius:10, color:"#6366f1", fontSize:12, cursor:"pointer", fontWeight:600, marginBottom:6 }}>👨‍👩‍👧 Condividi</button>
            <button onClick={signOut} style={{ width:"100%", padding:"8px 0", background:"#f5f5f5", border:"none", borderRadius:10, color:"#999", fontSize:12, cursor:"pointer", fontWeight:600 }}>Esci →</button>
          </div>
        </div>
      )}

      {/* Main */}
      <div style={{ flex:1, marginLeft:isMobile?0:220, paddingBottom:isMobile?90:0 }}>
        {/* Topbar */}
        <div style={{ background:"#fff", borderBottom:"1px solid #f0f0f0", padding:isMobile?"14px 16px":"14px 28px", position:"sticky", top:0, zIndex:99, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontSize:isMobile?16:15, fontWeight:800, color:"#1a1a2e" }}>
            {isMobile ? `${navItems.find(n=>n.id===page)?.icon} ${navItems.find(n=>n.id===page)?.label}` : `${navItems.find(n=>n.id===page)?.label} · ${filterMonth} ${filterYear}`}
          </div>
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            <select value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} style={selStyle}>{MONTHS.map(m=><option key={m}>{m}</option>)}</select>
            <select value={filterYear} onChange={e=>setFilterYear(Number(e.target.value))} style={selStyle}>{[CUR_YEAR-1,CUR_YEAR,CUR_YEAR+1].map(y=><option key={y}>{y}</option>)}</select>
          </div>
        </div>

        <div style={{ padding:isMobile?"16px":"24px 28px", maxWidth:900, margin:"0 auto" }}>

          {/* ── DASHBOARD ── */}
          {page==="dashboard" && (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              {/* Account cards */}
              <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":`repeat(${Math.max(accounts.length,1)},1fr)`, gap:12 }}>
                {accounts.map(acc => (
                  <div key={acc.id} style={{ background:`linear-gradient(135deg,${acc.color},${acc.color}88)`, borderRadius:18, padding:"18px 20px", color:"#fff", position:"relative", overflow:"hidden", boxShadow:`0 4px 20px ${acc.color}44` }}>
                    <div style={{ position:"absolute", top:-15, right:-15, width:70, height:70, background:"#ffffff12", borderRadius:"50%" }}/>
                    <div style={{ fontSize:22, marginBottom:6 }}>{acc.icon}</div>
                    <div style={{ fontSize:11, color:"#ffffff99", marginBottom:3 }}>{acc.name}</div>
                    <div style={{ fontSize:22, fontWeight:900 }}>{acc.currency} {fmtN(accountBalance(acc.id))}</div>
                  </div>
                ))}
                {accounts.length === 0 && <div style={{ background:"#f5f5f5", borderRadius:18, padding:"18px 20px", color:"#bbb", fontSize:13, textAlign:"center", cursor:"pointer" }} onClick={() => openModal("account")}>+ Aggiungi conto</div>}
              </div>

              {/* Balance */}
              <div style={{ background:"linear-gradient(135deg,#1a1a2e,#16213e)", borderRadius:20, padding:"20px 22px", color:"#fff", position:"relative", overflow:"hidden" }}>
                <div style={{ position:"absolute", top:-20, right:-20, width:100, height:100, background:"#ffffff06", borderRadius:"50%" }}/>
                <div style={{ fontSize:11, color:"#ffffff55", letterSpacing:1.5, marginBottom:6 }}>SALDO NETTO {filterMonth.toUpperCase()}</div>
                <div style={{ fontSize:32, fontWeight:900, letterSpacing:-1, color:balanceEUR>=0?"#34d399":"#f87171" }}>{balanceEUR>=0?"+":""}{fmtN(balanceEUR)} €</div>
                <div style={{ display:"flex", gap:20, marginTop:10 }}>
                  {[{l:"Entrate",v:totalIncEUR,c:"#34d399"},{l:"Uscite",v:totalExpEUR,c:"#f87171"},{l:"Risparmi",v:totalSavEUR,c:"#818cf8"}].map(k=>(
                    <div key={k.l}><div style={{ fontSize:10, color:"#ffffff44" }}>{k.l}</div><div style={{ fontSize:13, fontWeight:700, color:k.c }}>€ {fmtN(k.v)}</div></div>
                  ))}
                </div>
              </div>

              {/* Quick add */}
              <div style={{ background:"#fff", borderRadius:18, padding:18, boxShadow:"0 2px 12px #0001" }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e", marginBottom:12 }}>⚡ Inserimento Rapido</div>
                <Inp type="date" value={quickDate} onChange={e=>setQuickDate(e.target.value)} style={{ marginBottom:12 }}/>
                <div style={{ fontSize:11, color:"#bbb", marginBottom:8 }}>TOP CATEGORIE</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {(topCats.length>0?topCats:categories.slice(0,5)).map(cat=>(
                    <button key={cat.id} onClick={()=>openModal("quicktx",{type:"expense",date:quickDate,category_id:cat.id,account_id:accounts.find(a=>a.currency==="EUR")?.id||accounts[0]?.id})}
                      style={{ background:cat.color+"18", border:`1.5px solid ${cat.color}44`, borderRadius:10, padding:"8px 12px", fontSize:12, color:cat.color, fontWeight:600, cursor:"pointer" }}>
                      {cat.icon} {cat.name}
                    </button>
                  ))}
                  <button onClick={()=>openModal("tx",{date:quickDate,type:"expense",account_id:accounts[0]?.id})}
                    style={{ background:"#f5f5f5", border:"1.5px solid #eee", borderRadius:10, padding:"8px 12px", fontSize:12, color:"#999", fontWeight:600, cursor:"pointer" }}>+ Altro</button>
                </div>
              </div>

              {/* Transfer calculator */}
              {calcTransfer && (
                <div style={{ background:"#fff", borderRadius:18, padding:18, boxShadow:"0 2px 12px #0001" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e" }}>📊 Calcolatore Trasferimento</div>
                    <button onClick={()=>openModal("calcDetail")} style={{ fontSize:12, color:"#6366f1", background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>Dettagli →</button>
                  </div>
                  {calcTransfer.itDeficit>0?(
                    <div style={{ background:"#fef3c7", borderRadius:12, padding:"12px 16px", marginBottom:12 }}>
                      <div style={{ fontSize:12, color:"#92400e", marginBottom:4 }}>💸 Trasferisci da {calcTransfer.chAcc.name} a {calcTransfer.itAcc.name}:</div>
                      <div style={{ fontSize:22, fontWeight:900, color:"#d97706" }}>CHF {fmtN(calcTransfer.transferCHF)}</div>
                      <div style={{ fontSize:12, color:"#92400e", marginTop:2 }}>= € {fmtN(calcTransfer.itDeficit)} al tasso {fmtN(exchangeRate,4)}</div>
                    </div>
                  ):(
                    <div style={{ background:"#d1fae5", borderRadius:12, padding:"12px 16px", marginBottom:12 }}>
                      <div style={{ fontSize:12, color:"#065f46" }}>✅ Nessun trasferimento necessario questo mese.</div>
                      <div style={{ fontSize:18, fontWeight:700, color:"#059669", marginTop:4 }}>€ {fmtN(-calcTransfer.itDeficit)} surplus IT</div>
                    </div>
                  )}
                  {calcTransfer.itDeficit>0&&<Btn onClick={()=>openModal("transfer",{from_account_id:calcTransfer.chAcc.id,to_account_id:calcTransfer.itAcc.id,amount_from:calcTransfer.transferCHF.toFixed(2),date:TODAY,rate:exchangeRate})} label="🔄 Registra Trasferimento" color="#10b981" small/>}
                </div>
              )}

              {/* Donut */}
              {catBreakdown.length>0&&(
                <div style={{ background:"#fff", borderRadius:20, padding:20, boxShadow:"0 2px 12px #0001" }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e", marginBottom:16 }}>Spese per Categoria</div>
                  <div style={{ display:"flex", alignItems:"center", gap:20, flexWrap:"wrap" }}>
                    <DonutChart data={catBreakdown.map(c=>({value:c.val,color:c.cat.color}))} size={150} centerLabel="Uscite" centerValue={fmtN(expenses.reduce((s,tx)=>s+Number(tx.amount),0))}/>
                    <div style={{ flex:1, minWidth:130 }}>
                      {catBreakdown.slice(0,6).map(c=>(
                        <div key={c.cid} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:7 }}><div style={{ width:9, height:9, borderRadius:3, background:c.cat.color }}/><span style={{ fontSize:12, color:"#666" }}>{c.cat.icon} {c.cat.name}</span></div>
                          <span style={{ fontSize:12, fontWeight:700 }}>{fmtN(c.val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Budget bars */}
              {catBreakdown.filter(c=>c.cat.budget>0).length>0&&(
                <div style={{ background:"#fff", borderRadius:20, padding:20, boxShadow:"0 2px 12px #0001" }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e", marginBottom:14 }}>Budget vs Speso</div>
                  {catBreakdown.filter(c=>c.cat.budget>0).map(c=>{ const pct=Math.min(100,(c.val/c.cat.budget)*100),over=pct>=100; return (
                    <div key={c.cid} style={{ marginBottom:12 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}><span style={{ fontSize:12, color:"#666" }}>{c.cat.icon} {c.cat.name}</span><span style={{ fontSize:12, fontWeight:700, color:over?"#ef4444":"#1a1a2e" }}>{fmtN(c.val)} / {fmtN(c.cat.budget)}{over?" ⚠️":""}</span></div>
                      <div style={{ background:"#f5f5f5", borderRadius:6, height:7, overflow:"hidden" }}><div style={{ width:`${pct}%`, height:"100%", background:over?"#ef4444":c.cat.color, borderRadius:6 }}/></div>
                    </div>
                  ); })}
                </div>
              )}

              {/* Trend */}
              <div style={{ background:"#fff", borderRadius:20, padding:20, boxShadow:"0 2px 12px #0001" }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e", marginBottom:14 }}>Trend Ultimi 6 Mesi</div>
                <BarChart data={trend} color="#6366f1"/>
              </div>

              {/* Recent */}
              <div style={{ background:"#fff", borderRadius:20, padding:20, boxShadow:"0 2px 12px #0001" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e" }}>Ultimi Movimenti</div>
                  <button onClick={()=>setPage("transactions")} style={{ fontSize:12, color:"#6366f1", background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>Vedi tutti →</button>
                </div>
                {filteredAll.slice(0,5).map(tx=>{ const cat=catMap[tx.category_id],acc=accMap[tx.account_id]; return (
                  <div key={tx.id+(tx._injected?"_f":"")} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10, padding:"10px", background:"#f8f9fc", borderRadius:12 }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:cat?.color+"22"||"#f5f5f5", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>{cat?.icon||"📦"}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:"#1a1a2e" }}>{tx.name}{tx.is_fixed&&<span style={{ fontSize:10, color:"#6366f1", background:"#6366f111", borderRadius:4, padding:"2px 5px", marginLeft:6 }}>📌</span>}</div>
                      <div style={{ fontSize:11, color:"#bbb" }}>{tx.date} · {acc?.name}</div>
                    </div>
                    <div style={{ fontSize:14, fontWeight:800, color:tx.type==="income"?"#10b981":tx.type==="saving"?"#6366f1":"#ef4444" }}>{tx.type==="income"?"+":"-"}{acc?.currency} {fmtN(Math.abs(Number(tx.amount)))}</div>
                  </div>
                ); })}
                {filteredAll.length===0&&<div style={{ textAlign:"center", color:"#ccc", padding:"20px 0", fontSize:13 }}>Nessun movimento per {filterMonth}</div>}
              </div>
            </div>
          )}

          {/* ── TRANSACTIONS ── */}
          {page==="transactions" && (
            <div>
              <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
                <select value={filterAccount} onChange={e=>setFilterAccount(e.target.value)} style={{...selStyle,padding:"8px 26px 8px 10px"}}>
                  <option value="all">Tutti i conti</option>
                  {accounts.map(a=><option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
                </select>
                <button onClick={()=>openModal("transfer")} style={{ background:"#f5f5f5", border:"none", borderRadius:8, padding:"8px 12px", fontSize:12, cursor:"pointer", color:"#666" }}>🔄 Trasferisci</button>
                <button onClick={exportCSV} style={{ background:"#f5f5f5", border:"none", borderRadius:8, padding:"8px 12px", fontSize:12, cursor:"pointer", color:"#666" }}>⬇ CSV</button>
                <button onClick={()=>openModal("tx",{date:TODAY,type:"expense",account_id:accounts[0]?.id})} style={{ marginLeft:"auto", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", border:"none", borderRadius:10, padding:"8px 16px", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>+ Movimento</button>
              </div>
              {/* Summary */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:16 }}>
                {[{l:"Entrate",v:incomesTx.reduce((s,tx)=>s+Number(tx.amount),0),c:"#10b981"},{l:"Uscite",v:expenses.reduce((s,tx)=>s+Number(tx.amount),0),c:"#ef4444"},{l:"Saldo",v:incomesTx.reduce((s,tx)=>s+Number(tx.amount),0)-expenses.reduce((s,tx)=>s+Number(tx.amount),0),c:"#6366f1"}].map(k=>(
                  <div key={k.l} style={{ background:"#fff", borderRadius:14, padding:12, boxShadow:"0 2px 8px #0001", textAlign:"center" }}><div style={{ fontSize:11, color:"#bbb", marginBottom:3 }}>{k.l}</div><div style={{ fontSize:16, fontWeight:800, color:k.c }}>{fmtN(k.v)}</div></div>
                ))}
              </div>
              {filteredTransfers.length>0&&(
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:"#bbb", letterSpacing:1, marginBottom:8 }}>TRASFERIMENTI</div>
                  {filteredTransfers.map(tr=>(
                    <div key={tr.id} style={{ background:"#fff", borderRadius:14, padding:"12px 16px", display:"flex", alignItems:"center", gap:10, marginBottom:6, boxShadow:"0 1px 6px #0001" }}>
                      <div style={{ fontSize:20 }}>🔄</div>
                      <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:600 }}>{accMap[tr.from_account_id]?.name} → {accMap[tr.to_account_id]?.name}</div><div style={{ fontSize:11, color:"#bbb" }}>{tr.date}{tr.note&&` · ${tr.note}`}</div></div>
                      <div style={{ textAlign:"right" }}><div style={{ fontSize:13, fontWeight:700 }}>{accMap[tr.from_account_id]?.currency} {fmtN(tr.amount_from)}</div><div style={{ fontSize:11, color:"#bbb" }}>→ {accMap[tr.to_account_id]?.currency} {fmtN(tr.amount_to)}</div></div>
                      <button onClick={()=>del("transfers",tr.id)} style={{ background:"#fff0f0", border:"none", borderRadius:6, width:28, height:28, cursor:"pointer", fontSize:13 }}>🗑</button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ fontSize:11, fontWeight:700, color:"#bbb", letterSpacing:1, marginBottom:8 }}>MOVIMENTI · {filteredVar.length} voci</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {filteredVar.length===0&&<div style={{ textAlign:"center", color:"#ccc", padding:"50px 0", fontSize:13 }}>Nessun movimento per {filterMonth}</div>}
                {filteredVar.map(tx=>{ const cat=catMap[tx.category_id],acc=accMap[tx.account_id]; return (
                  <div key={tx.id} style={{ background:"#fff", borderRadius:14, padding:"13px 16px", display:"flex", alignItems:"center", gap:12, boxShadow:"0 2px 8px #0001" }}>
                    <div style={{ width:40, height:40, borderRadius:12, background:cat?.color+"22"||"#f5f5f5", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{cat?.icon||"📦"}</div>
                    <div style={{ flex:1, minWidth:0 }}><div style={{ fontSize:14, fontWeight:600, color:"#1a1a2e" }}>{tx.name}</div><div style={{ fontSize:11, color:"#bbb" }}>{tx.date} · {cat?.name||"—"} · {acc?.name}</div>{tx.note&&<div style={{ fontSize:11, color:"#bbb" }}>{tx.note}</div>}</div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      <div style={{ fontSize:15, fontWeight:800, color:tx.type==="income"?"#10b981":tx.type==="saving"?"#6366f1":"#ef4444" }}>{tx.type==="income"?"+":"-"}{acc?.currency} {fmtN(Math.abs(Number(tx.amount)))}</div>
                      <div style={{ display:"flex", gap:4, marginTop:5, justifyContent:"flex-end" }}>
                        <button onClick={()=>openModal("tx",{...tx})} style={{ background:"#f5f5f5", border:"none", borderRadius:6, width:26, height:26, cursor:"pointer", fontSize:12 }}>✏️</button>
                        <button onClick={()=>openModal("tx",{...tx,id:undefined,date:TODAY})} style={{ background:"#f0f0ff", border:"none", borderRadius:6, width:26, height:26, cursor:"pointer", fontSize:12 }} title="Copia">📋</button>
                        <button onClick={()=>del("transactions",tx.id)} style={{ background:"#fff0f0", border:"none", borderRadius:6, width:26, height:26, cursor:"pointer", fontSize:12 }}>🗑</button>
                      </div>
                    </div>
                  </div>
                ); })}
              </div>
            </div>
          )}

          {/* ── FIXED ── */}
          {page==="fixed" && (
            <div>
              <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:12, marginBottom:16 }}>
                {accounts.map(acc=>{ const exp=fixedTx.filter(tx=>tx.account_id===acc.id&&tx.type==="expense").reduce((s,tx)=>s+Number(tx.amount),0),inc=fixedTx.filter(tx=>tx.account_id===acc.id&&tx.type==="income").reduce((s,tx)=>s+Number(tx.amount),0); return (
                  <div key={acc.id} style={{ background:`linear-gradient(135deg,${acc.color},${acc.color}88)`, borderRadius:16, padding:"16px 18px", color:"#fff" }}>
                    <div style={{ fontSize:13, fontWeight:700, marginBottom:8 }}>{acc.icon} {acc.name}</div>
                    <div style={{ display:"flex", justifyContent:"space-between" }}>
                      <div><div style={{ fontSize:10, color:"#ffffff66" }}>Entrate fisse</div><div style={{ fontSize:16, fontWeight:800, color:"#34d399" }}>+{acc.currency} {fmtN(inc)}</div></div>
                      <div><div style={{ fontSize:10, color:"#ffffff66" }}>Uscite fisse</div><div style={{ fontSize:16, fontWeight:800, color:"#f87171" }}>-{acc.currency} {fmtN(exp)}</div></div>
                    </div>
                  </div>
                ); })}
              </div>
              <TabSwitch tabs={[["expense","↓ Uscite Fisse"],["income","↑ Entrate Fisse"]]} value={fixedTab} onChange={setFixedTab}/>
              <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:14 }}>
                <button onClick={()=>openModal("fixed",{type:fixedTab,account_id:accounts[0]?.id,recurring_day:25,date:TODAY})} style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)", border:"none", borderRadius:10, padding:"10px 16px", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>+ {fixedTab==="income"?"Entrata":"Uscita"} Fissa</button>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {fixedTx.filter(tx=>tx.type===fixedTab).map(tx=>{ const cat=catMap[tx.category_id],acc=accMap[tx.account_id]; return (
                  <div key={tx.id} style={{ background:"#fff", borderRadius:14, padding:"13px 16px", display:"flex", alignItems:"center", gap:12, boxShadow:"0 2px 8px #0001" }}>
                    <div style={{ width:40, height:40, borderRadius:12, background:cat?.color+"22"||"#f0f0ff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{cat?.icon||"📌"}</div>
                    <div style={{ flex:1 }}><div style={{ fontSize:14, fontWeight:600 }}>{tx.name}</div><div style={{ fontSize:11, color:"#bbb" }}>Giorno <strong style={{ color:"#6366f1" }}>{tx.recurring_day||25}</strong> · {acc?.name}{cat&&` · ${cat.icon} ${cat.name}`}</div></div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      <div style={{ fontSize:15, fontWeight:800, color:tx.type==="income"?"#10b981":"#ef4444" }}>{tx.type==="income"?"+":"-"}{acc?.currency} {fmtN(Math.abs(Number(tx.amount)))}</div>
                      <div style={{ display:"flex", gap:4, marginTop:5, justifyContent:"flex-end" }}>
                        <button onClick={()=>openModal("fixed",{...tx})} style={{ background:"#f5f5f5", border:"none", borderRadius:6, width:26, height:26, cursor:"pointer", fontSize:12 }}>✏️</button>
                        <button onClick={()=>del("transactions",tx.id)} style={{ background:"#fff0f0", border:"none", borderRadius:6, width:26, height:26, cursor:"pointer", fontSize:12 }}>🗑</button>
                      </div>
                    </div>
                  </div>
                ); })}
                {fixedTx.filter(tx=>tx.type===fixedTab).length===0&&<div style={{ textAlign:"center", color:"#ccc", padding:"40px 0", fontSize:13 }}>Nessuna {fixedTab==="income"?"entrata":"uscita"} fissa</div>}
              </div>
            </div>
          )}

          {/* ── REPORTS ── */}
          {page==="reports" && (() => {
            const [rPeriod, setRPeriod] = useState("month");
            const [dFrom, setDFrom] = useState(`${CUR_YEAR}-01-01`);
            const [dTo, setDTo] = useState(TODAY);
            const pTx = useMemo(()=>{
              if(rPeriod==="month") return filteredAll;
              return [...variableTx,...fixedAsMonthly].filter(tx=>{ const d=tx.date; if(rPeriod==="year") return d.startsWith(String(filterYear)); if(rPeriod==="custom") return d>=dFrom&&d<=dTo; return true; });
            },[rPeriod,dFrom,dTo]);
            const pExp=pTx.filter(tx=>tx.type==="expense"),pInc=pTx.filter(tx=>tx.type==="income"),pSav=pTx.filter(tx=>tx.type==="saving");
            const totE=pExp.reduce((s,tx)=>s+Number(tx.amount),0),totI=pInc.reduce((s,tx)=>s+Number(tx.amount),0),totS=pSav.reduce((s,tx)=>s+Number(tx.amount),0);
            const pCats=useMemo(()=>{ const m={}; pExp.forEach(tx=>{const c=tx.category_id||"none";if(!m[c])m[c]=0;m[c]+=Number(tx.amount);}); return Object.entries(m).map(([cid,val])=>({cid,val,cat:catMap[cid]||{name:"Altro",color:"#9ca3af",icon:"📦"}})).sort((a,b)=>b.val-a.val); },[pExp]);
            return (
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <div style={{ background:"#fff", borderRadius:16, padding:18, boxShadow:"0 2px 12px #0001" }}>
                  <div style={{ fontSize:13, fontWeight:700, marginBottom:14 }}>Periodo di analisi</div>
                  <TabSwitch tabs={[["month","Mese"],["year","Anno"],["custom","Personalizzato"]]} value={rPeriod} onChange={setRPeriod}/>
                  {rPeriod==="custom"&&<div style={{ display:"flex", gap:10 }}><Field label="DA"><Inp type="date" value={dFrom} onChange={e=>setDFrom(e.target.value)}/></Field><Field label="A"><Inp type="date" value={dTo} onChange={e=>setDTo(e.target.value)}/></Field></div>}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                  {[{l:"Entrate",v:totI,c:"#10b981"},{l:"Uscite",v:totE,c:"#ef4444"},{l:"Saldo",v:totI-totE-totS,c:totI-totE-totS>=0?"#6366f1":"#ef4444"}].map(k=>(
                    <div key={k.l} style={{ background:"#fff", borderRadius:14, padding:12, boxShadow:"0 2px 8px #0001", textAlign:"center" }}><div style={{ fontSize:11, color:"#bbb", marginBottom:3 }}>{k.l}</div><div style={{ fontSize:16, fontWeight:800, color:k.c }}>{fmtN(k.v)}</div></div>
                  ))}
                </div>
                {pCats.length>0&&<div style={{ background:"#fff", borderRadius:20, padding:20, boxShadow:"0 2px 12px #0001" }}>
                  <div style={{ fontSize:13, fontWeight:700, marginBottom:16 }}>Distribuzione Spese</div>
                  <div style={{ display:"flex", justifyContent:"center", marginBottom:20 }}><DonutChart data={pCats.map(c=>({value:c.val,color:c.cat.color}))} size={200} centerLabel="Totale" centerValue={fmtN(totE)}/></div>
                  {pCats.map(c=>(
                    <div key={c.cid} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid #f5f5f5" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}><div style={{ width:12, height:12, borderRadius:4, background:c.cat.color }}/><span style={{ fontSize:13, color:"#666" }}>{c.cat.icon} {c.cat.name}</span></div>
                      <div><span style={{ fontSize:13, fontWeight:700 }}>{fmtN(c.val)}</span><span style={{ fontSize:11, color:"#bbb", marginLeft:6 }}>({totE>0?((c.val/totE)*100).toFixed(0):0}%)</span></div>
                    </div>
                  ))}
                </div>}
                {accounts.map(acc=>{ const inc=pInc.filter(tx=>tx.account_id===acc.id).reduce((s,tx)=>s+Number(tx.amount),0),exp=pExp.filter(tx=>tx.account_id===acc.id).reduce((s,tx)=>s+Number(tx.amount),0),sav=pSav.filter(tx=>tx.account_id===acc.id).reduce((s,tx)=>s+Number(tx.amount),0); return (
                  <div key={acc.id} style={{ background:"#fff", borderRadius:18, padding:18, boxShadow:"0 2px 12px #0001", borderLeft:`4px solid ${acc.color}` }}>
                    <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>{acc.icon} {acc.name} ({acc.currency})</div>
                    {[{l:"Entrate",v:inc,c:"#10b981"},{l:"Uscite",v:exp,c:"#ef4444"},{l:"Risparmi",v:sav,c:"#6366f1"},{l:"Saldo",v:inc-exp-sav,c:inc-exp-sav>=0?"#10b981":"#ef4444"}].map(r=>(
                      <div key={r.l} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid #f5f5f5" }}><span style={{ fontSize:13, color:"#666" }}>{r.l}</span><span style={{ fontSize:14, fontWeight:800, color:r.c }}>{r.v>=0?"+":""}{acc.currency} {fmtN(r.v)}</span></div>
                    ))}
                  </div>
                ); })}
                <div style={{ background:"#fff", borderRadius:20, padding:20, boxShadow:"0 2px 12px #0001" }}>
                  <div style={{ fontSize:13, fontWeight:700, marginBottom:14 }}>Trend Ultimi 6 Mesi</div>
                  <BarChart data={trend} color="#6366f1"/>
                </div>
                <div style={{ display:"flex", justifyContent:"flex-end" }}><button onClick={exportCSV} style={{ background:"#1a1a2e", border:"none", borderRadius:10, padding:"10px 18px", color:"#fff", fontSize:13, cursor:"pointer", fontWeight:600 }}>⬇ Export CSV</button></div>
              </div>
            );
          })()}

          {/* ── SAVINGS ── */}
          {page==="savings" && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div style={{ display:"flex", justifyContent:"flex-end", gap:8 }}>
                <button onClick={()=>openModal("tx",{type:"saving",date:TODAY,account_id:accounts[0]?.id})} style={{ background:"#f5f5f5", border:"none", borderRadius:10, padding:"10px 14px", fontSize:13, cursor:"pointer", color:"#666", fontWeight:600 }}>+ Movimento Risparmio</button>
                <button onClick={()=>openModal("savings")} style={{ background:"linear-gradient(135deg,#10b981,#059669)", border:"none", borderRadius:10, padding:"10px 14px", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>+ Nuovo Obiettivo</button>
              </div>
              {savings.map(g=>{ const pct=g.target_amount>0?Math.min(100,(g.current_amount/g.target_amount)*100):0; return (
                <div key={g.id} style={{ background:"#fff", borderRadius:18, padding:20, boxShadow:"0 2px 12px #0001" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ width:46, height:46, borderRadius:14, background:g.color+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>{g.icon}</div>
                      <div><div style={{ fontSize:15, fontWeight:700 }}>{g.name}</div><div style={{ fontSize:11, color:"#bbb" }}>{g.currency} · {g.deadline?`Entro ${g.deadline}`:"Nessuna scadenza"}</div></div>
                    </div>
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={()=>openModal("savings",{...g})} style={{ background:"#f5f5f5", border:"none", borderRadius:8, width:32, height:32, cursor:"pointer", fontSize:14 }}>✏️</button>
                      <button onClick={()=>del("savings_goals",g.id)} style={{ background:"#fff0f0", border:"none", borderRadius:8, width:32, height:32, cursor:"pointer", fontSize:14 }}>🗑</button>
                    </div>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}><span style={{ fontSize:13, color:"#666" }}>Raggiunto</span><span style={{ fontSize:14, fontWeight:800, color:g.color }}>{g.currency} {fmtN(g.current_amount)} / {fmtN(g.target_amount)}</span></div>
                  <div style={{ background:"#f5f5f5", borderRadius:8, height:12, overflow:"hidden" }}><div style={{ width:`${pct}%`, height:"100%", background:`linear-gradient(90deg,${g.color},${g.color}99)`, borderRadius:8 }}/></div>
                  <div style={{ fontSize:12, color:"#bbb", marginTop:6 }}>{fmtN(pct,0)}% · Mancano {g.currency} {fmtN(Math.max(0,g.target_amount-g.current_amount))}</div>
                </div>
              ); })}
              {savings.length===0&&<div style={{ textAlign:"center", color:"#ccc", padding:"60px 0", fontSize:13 }}>Nessun obiettivo di risparmio</div>}
            </div>
          )}

          {/* ── SETTINGS ── */}
          {page==="settings" && (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              {/* Profile */}
              <div style={{ background:"#fff", borderRadius:18, padding:18, boxShadow:"0 2px 12px #0001" }}>
                <div style={{ fontSize:13, fontWeight:700, marginBottom:14 }}>👤 Profilo</div>
                <div style={{ fontSize:13, color:"#666" }}>Email: <strong>{user?.email}</strong></div>
                <div style={{ display:"flex", gap:8, marginTop:14 }}>
                  <div style={{ flex:1 }}><Btn onClick={()=>openModal("share")} label="👨‍👩‍👧 Condividi con Famiglia" outline color="#6366f1" small/></div>
                  <div style={{ flex:1 }}><Btn onClick={signOut} label="Esci" outline color="#ef4444" small/></div>
                </div>
              </div>
              {/* Accounts */}
              <div style={{ background:"#fff", borderRadius:18, padding:18, boxShadow:"0 2px 12px #0001" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                  <div style={{ fontSize:13, fontWeight:700 }}>🏦 Conti</div>
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={()=>openModal("adjustAccount")} style={{ background:"#f0f0ff", border:"none", borderRadius:8, padding:"6px 10px", color:"#6366f1", fontSize:12, cursor:"pointer", fontWeight:600 }}>⚖️ Aggiusta</button>
                    <button onClick={()=>openModal("account")} style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)", border:"none", borderRadius:8, padding:"6px 12px", color:"#fff", fontSize:12, cursor:"pointer", fontWeight:700 }}>+ Conto</button>
                  </div>
                </div>
                {accounts.map(acc=>(
                  <div key={acc.id} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10, padding:"12px 14px", background:"#f8f9fc", borderRadius:12 }}>
                    <div style={{ width:40, height:40, borderRadius:12, background:acc.color+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{acc.icon}</div>
                    <div style={{ flex:1 }}><div style={{ fontSize:14, fontWeight:600 }}>{acc.name}</div><div style={{ fontSize:11, color:"#bbb" }}>{acc.currency} · Saldo: {acc.currency} {fmtN(accountBalance(acc.id))}</div></div>
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={()=>openModal("account",{...acc})} style={{ background:"#f5f5f5", border:"none", borderRadius:6, width:30, height:30, cursor:"pointer", fontSize:14 }}>✏️</button>
                      <button onClick={()=>del("accounts",acc.id)} style={{ background:"#fff0f0", border:"none", borderRadius:6, width:30, height:30, cursor:"pointer", fontSize:14 }}>🗑</button>
                    </div>
                  </div>
                ))}
              </div>
              {/* Categories */}
              <div style={{ background:"#fff", borderRadius:18, padding:18, boxShadow:"0 2px 12px #0001" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                  <div style={{ fontSize:13, fontWeight:700 }}>🏷️ Categorie</div>
                  <button onClick={()=>openModal("cat")} style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)", border:"none", borderRadius:8, padding:"6px 12px", color:"#fff", fontSize:12, cursor:"pointer", fontWeight:700 }}>+ Categoria</button>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:8 }}>
                  {categories.map(cat=>{ const spent=expenses.filter(tx=>tx.category_id===cat.id).reduce((s,tx)=>s+Number(tx.amount),0); return (
                    <div key={cat.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background:"#f8f9fc", borderRadius:12 }}>
                      <div style={{ width:34, height:34, borderRadius:10, background:cat.color+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>{cat.icon}</div>
                      <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:600 }}>{cat.name}</div><div style={{ fontSize:10, color:"#bbb" }}>Budget: {cat.budget>0?`${fmtN(cat.budget)} €`:"—"} · Speso: {fmtN(spent)}</div></div>
                      <div style={{ display:"flex", gap:4 }}>
                        <button onClick={()=>openModal("cat",{...cat})} style={{ background:"#fff", border:"none", borderRadius:5, width:26, height:26, cursor:"pointer", fontSize:12 }}>✏️</button>
                        <button onClick={()=>del("categories",cat.id)} style={{ background:"#fff0f0", border:"none", borderRadius:5, width:26, height:26, cursor:"pointer", fontSize:12 }}>🗑</button>
                      </div>
                    </div>
                  ); })}
                </div>
              </div>
              {/* Exchange rate */}
              <div style={{ background:"#fff", borderRadius:18, padding:18, boxShadow:"0 2px 12px #0001" }}>
                <div style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>💱 Tasso di Cambio</div>
                <div style={{ fontSize:12, color:"#bbb", marginBottom:10 }}>Live da frankfurter.app · Puoi sovrascriverlo.</div>
                <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                  <Inp type="number" value={exchangeRate} onChange={e=>setExchangeRate(parseFloat(e.target.value))} style={{ flex:1 }}/>
                  <span style={{ fontSize:13, color:"#999", whiteSpace:"nowrap" }}>CHF → EUR</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile bottom nav */}
      {isMobile && (
        <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"#fff", borderTop:"1px solid #f0f0f0", display:"flex", zIndex:200, boxShadow:"0 -4px 20px #0001" }}>
          {navItems.map(n=>(
            <button key={n.id} onClick={()=>setPage(n.id)} style={{ flex:1, padding:"10px 0 8px", background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
              <div style={{ fontSize:18, opacity:page===n.id?1:0.3 }}>{n.icon}</div>
              <div style={{ fontSize:8, fontWeight:page===n.id?700:400, color:page===n.id?"#6366f1":"#bbb" }}>{n.label.toUpperCase()}</div>
              {page===n.id&&<div style={{ width:4, height:4, borderRadius:"50%", background:"#6366f1" }}/>}
            </button>
          ))}
        </div>
      )}

      {/* FAB */}
      {isMobile && page!=="settings" && (
        <button onClick={()=>openModal("tx",{date:TODAY,type:"expense",account_id:accounts[0]?.id})} style={{ position:"fixed", bottom:76, right:20, width:52, height:52, borderRadius:"50%", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", border:"none", color:"#fff", fontSize:24, cursor:"pointer", boxShadow:"0 4px 20px #6366f166", zIndex:150, display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
      )}

      {/* ── MODALS ── */}
      {modal?.type==="tx"       && <TxModal       init={modal.init} accounts={accounts} categories={categories} accMap={accMap} onSave={saveTx}       onClose={closeModal}/>}
      {modal?.type==="quicktx"  && <TxModal       init={modal.init} accounts={accounts} categories={categories} accMap={accMap} onSave={saveTx}       onClose={closeModal} isQuick/>}
      {modal?.type==="fixed"    && <FixedModal    init={modal.init} accounts={accounts} categories={categories} accMap={accMap} onSave={saveFixed}    onClose={closeModal}/>}
      {modal?.type==="transfer" && <TransferModal init={modal.init} accounts={accounts} accMap={accMap} exchangeRate={exchangeRate} onSave={saveTransfer} onClose={closeModal}/>}
      {modal?.type==="account"  && <AccountModal  init={modal.init} onSave={saveAccount} onClose={closeModal}/>}
      {modal?.type==="cat"      && <CatModal      init={modal.init} onSave={saveCat}     onClose={closeModal}/>}
      {modal?.type==="savings"  && <SavingsModal  init={modal.init} accounts={accounts}  onSave={saveSavings}  onClose={closeModal}/>}
      {modal?.type==="adjustAccount" && <AdjustModal accounts={accounts} accountBalance={accountBalance} onSave={adjustAccount} onClose={closeModal}/>}
      {modal?.type==="share"    && <ShareModal token={token} userId={user?.id} onClose={closeModal} onToast={showToast}/>}

      {/* Calc detail */}
      {modal?.type==="calcDetail" && calcTransfer && (
        <Modal title="📊 Calcolatore Trasferimento" onClose={closeModal}>
          <div style={{ fontSize:12, color:"#999", marginBottom:16 }}>Basato sulle spese fisse pianificate.</div>
          {[{title:`${calcTransfer.chAcc.icon} ${calcTransfer.chAcc.name}`,rows:[{l:"Entrate fisse",v:calcTransfer.chFixedInc,c:"#10b981"},{l:"Uscite fisse",v:calcTransfer.chFixedExp,c:"#ef4444"},{l:"Netto",v:calcTransfer.chNet,c:calcTransfer.chNet>=0?"#10b981":"#ef4444"}]},{title:`${calcTransfer.itAcc.icon} ${calcTransfer.itAcc.name}`,rows:[{l:"Entrate fisse",v:calcTransfer.itFixedInc,c:"#10b981"},{l:"Uscite fisse",v:calcTransfer.itFixedExp,c:"#ef4444"},{l:"Netto",v:calcTransfer.itNet,c:calcTransfer.itNet>=0?"#10b981":"#ef4444"}]}].map(sec=>(
            <div key={sec.title} style={{ background:"#f8f9fc", borderRadius:14, padding:16, marginBottom:12 }}>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>{sec.title}</div>
              {sec.rows.map(r=>(
                <div key={r.l} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #eee" }}><span style={{ fontSize:12, color:"#666" }}>{r.l}</span><span style={{ fontSize:13, fontWeight:700, color:r.c }}>{r.v>=0?"+":""}{fmtN(r.v)}</span></div>
              ))}
            </div>
          ))}
          <div style={{ background:calcTransfer.itDeficit>0?"#fef3c7":"#d1fae5", borderRadius:14, padding:16, marginBottom:16 }}>
            {calcTransfer.itDeficit>0?<><div style={{ fontSize:12, color:"#92400e", marginBottom:6 }}>💸 Trasferimento necessario:</div><div style={{ fontSize:22, fontWeight:900, color:"#d97706" }}>CHF {fmtN(calcTransfer.transferCHF)}</div><div style={{ fontSize:12, color:"#92400e", marginTop:4 }}>= € {fmtN(calcTransfer.itDeficit)} al tasso {fmtN(exchangeRate,4)}</div></>:<div style={{ fontSize:13, color:"#065f46" }}>✅ Nessun trasferimento necessario</div>}
          </div>
          {calcTransfer.itDeficit>0&&<Btn onClick={()=>{closeModal();setTimeout(()=>openModal("transfer",{from_account_id:calcTransfer.chAcc.id,to_account_id:calcTransfer.itAcc.id,amount_from:calcTransfer.transferCHF.toFixed(2),date:TODAY,rate:exchangeRate}),100);}} label="🔄 Vai al Trasferimento" color="#10b981"/>}
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
      try {
        const saved=localStorage.getItem("sb_session");
        if(!saved){setChecking(false);return;}
        const s=JSON.parse(saved);
        const user=await sb.auth.getUser(s.access_token);
        if(user?.id){setSession({...s,user});}
        else if(s.refresh_token){
          const r=await sb.auth.refresh(s.refresh_token);
          if(r?.access_token){const ns={access_token:r.access_token,refresh_token:r.refresh_token,user:r.user};localStorage.setItem("sb_session",JSON.stringify(ns));setSession(ns);}
          else localStorage.removeItem("sb_session");
        } else localStorage.removeItem("sb_session");
      } catch { localStorage.removeItem("sb_session"); }
      setChecking(false);
    })();
  },[]);

  const signOut = useCallback(async()=>{
    if(session?.access_token) await sb.auth.signOut(session.access_token);
    localStorage.removeItem("sb_session"); setSession(null);
  },[session]);

  if(!configured) return (
    <div style={{ minHeight:"100vh", background:"#f8f9fc", display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ maxWidth:380, textAlign:"center" }}>
        <div style={{ fontSize:48, marginBottom:16 }}>⚙️</div>
        <div style={{ fontSize:18, fontWeight:800, color:"#1a1a2e", marginBottom:12 }}>Credenziali mancanti</div>
        <div style={{ background:"#fff", borderRadius:16, padding:20, fontSize:13, color:"#666", lineHeight:1.7, boxShadow:"0 2px 12px #0001" }}>
          Sostituisci <code style={{ color:"#6366f1" }}>SUPABASE_URL</code> e <code style={{ color:"#6366f1" }}>SUPABASE_KEY</code> in cima al file con i valori da <strong>Supabase → Project Settings → API</strong>.
        </div>
      </div>
    </div>
  );

  if(checking) return <div style={{ minHeight:"100vh", background:"#f8f9fc", display:"flex", alignItems:"center", justifyContent:"center" }}><div style={{ width:40, height:40, border:"3px solid #eee", borderTop:"3px solid #6366f1", borderRadius:"50%", animation:"spin 1s linear infinite" }}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;

  return (
    <AuthCtx.Provider value={{ token:session?.access_token, user:session?.user, signOut }}>
      <style>{CSS}</style>
      {session ? <BudgetApp/> : <AuthScreen onAuth={setSession}/>}
    </AuthCtx.Provider>
  );
}