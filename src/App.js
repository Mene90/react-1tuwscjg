import React, { useState, useEffect, useCallback, useMemo, createContext, useContext } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// 👇 INSERISCI QUI LE TUE CREDENZIALI SUPABASE
const SUPABASE_URL = "https://wfecmedeqgnupvjixkad.supabase.co";
const SUPABASE_KEY = "sb_publishable_pLRwZPPJVbQzAXllZcPszw_x1CblPEM";
// ─────────────────────────────────────────────────────────────────────────────

// ─── SUPABASE CLIENT ─────────────────────────────────────────────────────────
const sb = {
  // AUTH
  auth: {
    signUp: (email, password, fullName) =>
      fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, data: { full_name: fullName } }),
      }).then(r => r.json()),

    signIn: (email, password) =>
      fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      }).then(r => r.json()),

    signOut: (token) =>
      fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
      }),

    getUser: (token) =>
      fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
      }).then(r => r.json()),

    refreshToken: (refreshToken) =>
      fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      }).then(r => r.json()),
  },

  // DB
  from: (table, token) => ({
    select: (query = "*") =>
      fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${query}`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      }).then(r => r.json()),

    selectFilter: (query = "*", filter = "") =>
      fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${query}&${filter}`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
      }).then(r => r.json()),

    insert: (data) =>
      fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify(data),
      }).then(r => r.json()),

    update: (data, filter) =>
      fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
        method: "PATCH",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify(data),
      }),

    delete: (filter) =>
      fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
        method: "DELETE",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
      }),
  }),
};

// ─── AUTH CONTEXT ─────────────────────────────────────────────────────────────
const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const MONTHS = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const MONTHS_SHORT = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];
const TODAY = new Date().toISOString().split("T")[0];
const CUR_MONTH = MONTHS[new Date().getMonth()];
const CUR_YEAR = new Date().getFullYear();
const fmtN = (n, d=2) => Number(n||0).toLocaleString("it-IT", { minimumFractionDigits:d, maximumFractionDigits:d });

// ─── UI PRIMITIVES ────────────────────────────────────────────────────────────
function Toast({ msg, ok }) {
  return (
    <div style={{ position:"fixed", top:20, left:"50%", transform:"translateX(-50%)", background:ok?"#1a1a2e":"#ef4444", borderRadius:10, padding:"10px 22px", fontSize:13, color:"#fff", zIndex:3000, animation:"fadeUp .2s ease", whiteSpace:"nowrap", boxShadow:"0 4px 20px #0003" }}>
      {msg}
    </div>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"#00000066", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:1000, padding:16 }} onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:24, padding:28, width:"100%", maxWidth: wide ? 600 : 480, maxHeight:"92vh", overflowY:"auto", boxShadow:"0 -4px 40px #0002" }} onClick={e => e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:22 }}>
          <div style={{ fontSize:16, fontWeight:800, color:"#1a1a2e" }}>{title}</div>
          <button onClick={onClose} style={{ background:"#f5f5f5", border:"none", borderRadius:8, width:32, height:32, cursor:"pointer", fontSize:16, color:"#999" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:11, fontWeight:700, color:"#bbb", letterSpacing:1.2, marginBottom:7 }}>{label}</div>
      {children}
      {hint && <div style={{ fontSize:11, color:"#bbb", marginTop:4 }}>{hint}</div>}
    </div>
  );
}

function Inp({ value, onChange, type="text", placeholder, style={}, onKeyDown }) {
  return (
    <input type={type} value={value??""} onChange={onChange} placeholder={placeholder} onKeyDown={onKeyDown}
      style={{ width:"100%", border:"1.5px solid #eee", borderRadius:10, padding:"11px 14px", fontSize:14, boxSizing:"border-box", outline:"none", color:"#1a1a2e", fontFamily:"inherit", ...style }}/>
  );
}

function Sel({ value, onChange, children }) {
  return (
    <select value={value??""} onChange={onChange}
      style={{ width:"100%", border:"1.5px solid #eee", borderRadius:10, padding:"11px 36px 11px 14px", fontSize:14, background:"#fff", color:"#1a1a2e", cursor:"pointer", fontFamily:"inherit", boxSizing:"border-box", appearance:"none", backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23999' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat:"no-repeat", backgroundPosition:"right 14px center" }}>
      {children}
    </select>
  );
}

function Btn({ onClick, label, color="#6366f1", outline, disabled, small }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ width:"100%", padding: small ? "10px 0" : "13px 0",
        background: disabled ? "#f0f0f0" : outline ? "transparent" : `linear-gradient(135deg,${color},${color}cc)`,
        border: outline ? `1.5px solid ${color}` : "none",
        borderRadius:12, color: disabled ? "#bbb" : outline ? color : "#fff",
        fontWeight:700, fontSize: small ? 13 : 14, cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: (!outline && !disabled) ? `0 4px 20px ${color}33` : "none",
        fontFamily:"inherit", transition:"all .2s",
      }}>{label}</button>
  );
}

function TabSwitch({ tabs, value, onChange }) {
  return (
    <div style={{ display:"flex", background:"#f5f5f5", borderRadius:12, padding:3, marginBottom:16 }}>
      {tabs.map(([v,l]) => (
        <button key={v} onClick={() => onChange(v)} style={{ flex:1, padding:"9px 0", border:"none", borderRadius:9, background: value===v ? "#fff" : "transparent", color: value===v ? "#1a1a2e" : "#bbb", fontWeight: value===v ? 700 : 400, fontSize:13, cursor:"pointer", fontFamily:"inherit", boxShadow: value===v ? "0 1px 6px #0001" : "none", transition:"all .2s" }}>{l}</button>
      ))}
    </div>
  );
}

// ─── DONUT CHART ─────────────────────────────────────────────────────────────
function DonutChart({ data, size=180, centerLabel, centerValue }) {
  const total = data.reduce((s,d) => s + Math.abs(d.value), 0);
  if (!total) return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:"#f5f5f5", display:"flex", alignItems:"center", justifyContent:"center", color:"#ccc", fontSize:12 }}>Nessun dato</div>
  );
  let cum = 0;
  const r = size/2 - 10, cx = size/2, cy = size/2;
  const slices = data.map(d => {
    const pct = Math.abs(d.value)/total, s = cum*2*Math.PI - Math.PI/2;
    cum += pct;
    const e = cum*2*Math.PI - Math.PI/2;
    return { ...d, path:`M ${cx} ${cy} L ${cx+r*Math.cos(s)} ${cy+r*Math.sin(s)} A ${r} ${r} 0 ${pct>.5?1:0} 1 ${cx+r*Math.cos(e)} ${cy+r*Math.sin(e)} Z` };
  });
  return (
    <svg width={size} height={size}>
      {slices.map((s,i) => <path key={i} d={s.path} fill={s.color} stroke="#fff" strokeWidth={2}/>)}
      <circle cx={cx} cy={cy} r={r*.58} fill="#fff"/>
      {centerLabel && <text x={cx} y={cy-8} textAnchor="middle" fontSize={10} fill="#999">{centerLabel}</text>}
      {centerValue && <text x={cx} y={cy+10} textAnchor="middle" fontSize={13} fontWeight={700} fill="#1a1a2e">{centerValue}</text>}
    </svg>
  );
}

function BarChart({ data, color="#6366f1" }) {
  const max = Math.max(...data.map(d => Math.abs(d.value)), 1);
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
}

// ─── LOGIN / REGISTER SCREEN ──────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login"); // login | register
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  const handle = async () => {
    if (!email || !password) { setError("Inserisci email e password"); return; }
    if (mode === "register" && !fullName) { setError("Inserisci il tuo nome"); return; }
    setLoading(true); setError("");
    try {
      let data;
      if (mode === "login") {
        data = await sb.auth.signIn(email, password);
        if (data.error) throw new Error(data.error_description || data.error);
      } else {
        data = await sb.auth.signUp(email, password, fullName);
        if (data.error) throw new Error(data.error_description || data.error);
      }
      if (data.access_token) {
        localStorage.setItem("sb_session", JSON.stringify({ access_token: data.access_token, refresh_token: data.refresh_token, user: data.user }));
        onAuth({ token: data.access_token, refresh_token: data.refresh_token, user: data.user });
      } else {
        throw new Error("Credenziali non valide");
      }
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)", display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ width:"100%", maxWidth:400 }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ fontSize:52, marginBottom:12 }}>💼</div>
          <div style={{ fontSize:26, fontWeight:900, color:"#fff", letterSpacing:-0.5 }}>Finanza Familiare</div>
          <div style={{ fontSize:13, color:"#ffffff55", marginTop:4 }}>Gestisci le tue spese in CHF e €</div>
        </div>

        {/* Card */}
        <div style={{ background:"#fff", borderRadius:24, padding:32, boxShadow:"0 20px 60px #00000055" }}>
          {/* Mode switch */}
          <TabSwitch
            tabs={[["login","Accedi"],["register","Registrati"]]}
            value={mode}
            onChange={v => { setMode(v); setError(""); }}
          />

          {mode === "register" && (
            <Field label="NOME COMPLETO">
              <Inp value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Mario Rossi" onKeyDown={e => e.key==="Enter" && handle()}/>
            </Field>
          )}

          <Field label="EMAIL">
            <Inp type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="mario@email.com" onKeyDown={e => e.key==="Enter" && handle()}/>
          </Field>

          <Field label="PASSWORD">
            <div style={{ position:"relative" }}>
              <Inp type={showPwd?"text":"password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key==="Enter" && handle()} style={{ paddingRight:44 }}/>
              <button onClick={() => setShowPwd(!showPwd)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:16, color:"#bbb" }}>
                {showPwd ? "🙈" : "👁"}
              </button>
            </div>
          </Field>

          {error && (
            <div style={{ background:"#fff0f0", border:"1px solid #fecaca", borderRadius:10, padding:"10px 14px", fontSize:13, color:"#ef4444", marginBottom:16 }}>
              ⚠️ {error}
            </div>
          )}

          <Btn onClick={handle} disabled={loading} label={loading ? "Caricamento..." : mode==="login" ? "Accedi →" : "Crea account →"}/>

          {mode === "login" && (
            <div style={{ textAlign:"center", marginTop:16, fontSize:12, color:"#bbb" }}>
              Non hai un account?{" "}
              <button onClick={() => { setMode("register"); setError(""); }} style={{ background:"none", border:"none", color:"#6366f1", fontWeight:700, cursor:"pointer", fontSize:12 }}>
                Registrati
              </button>
            </div>
          )}
        </div>

        <div style={{ textAlign:"center", marginTop:20, fontSize:11, color:"#ffffff33" }}>
          Dati protetti con Supabase Auth · Accesso sicuro
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
function BudgetApp() {
  const { token, user, signOut } = useAuth();

  const [page, setPage] = useState("dashboard");
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({});
  const [filterMonth, setFilterMonth] = useState(CUR_MONTH);
  const [filterYear, setFilterYear] = useState(CUR_YEAR);
  const [filterAccount, setFilterAccount] = useState("all");
  const [fixedTab, setFixedTab] = useState("income");
  const [exchangeRate, setExchangeRate] = useState(1.06);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const showToast = (msg, ok=true) => { setToast({msg,ok}); setTimeout(() => setToast(null), 2500); };

  const db = useCallback((table) => sb.from(table, token), [token]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [acc, cat, tx, tr, sg] = await Promise.all([
        db("accounts").selectFilter("*", "order=created_at"),
        db("categories").selectFilter("*", "order=name"),
        db("transactions").selectFilter("*", "order=date.desc"),
        db("transfers").selectFilter("*", "order=date.desc"),
        db("savings_goals").selectFilter("*", "order=created_at"),
      ]);
      setAccounts(Array.isArray(acc) ? acc : []);
      setCategories(Array.isArray(cat) ? cat : []);
      setTransactions(Array.isArray(tx) ? tx : []);
      setTransfers(Array.isArray(tr) ? tr : []);
      setSavingsGoals(Array.isArray(sg) ? sg : []);
      try {
        const fx = await fetch("https://api.frankfurter.app/latest?from=CHF&to=EUR");
        const fxd = await fx.json();
        if (fxd?.rates?.EUR) setExchangeRate(fxd.rates.EUR);
      } catch {}
    } catch { showToast("Errore connessione", false); }
    setLoading(false);
  }, [db]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const catMap = useMemo(() => { const m={}; categories.forEach(c => m[c.id]=c); return m; }, [categories]);
  const accMap = useMemo(() => { const m={}; accounts.forEach(a => m[a.id]=a); return m; }, [accounts]);
  const monthIdx = MONTHS.indexOf(filterMonth);

  // ── Fixed / Variable split ────────────────────────────────────────────────
  const fixedTx = useMemo(() => transactions.filter(t => t.is_fixed), [transactions]);
  const variableTx = useMemo(() => transactions.filter(t => !t.is_fixed), [transactions]);

  const fixedAsMonthly = useMemo(() =>
    fixedTx.map(t => ({
      ...t,
      date: `${filterYear}-${String(monthIdx+1).padStart(2,"0")}-${String(t.recurring_day||25).padStart(2,"0")}`,
      _injected: true,
    })), [fixedTx, monthIdx, filterYear]);

  const filteredVar = useMemo(() =>
    variableTx.filter(t => {
      const d = new Date(t.date);
      if (MONTHS[d.getMonth()] !== filterMonth || d.getFullYear() !== filterYear) return false;
      if (filterAccount !== "all" && t.account_id !== filterAccount) return false;
      return true;
    }), [variableTx, filterMonth, filterYear, filterAccount]);

  const filteredAll = useMemo(() => {
    let all = [...filteredVar, ...fixedAsMonthly];
    if (filterAccount !== "all") all = all.filter(t => t.account_id === filterAccount);
    return all.sort((a,b) => new Date(b.date) - new Date(a.date));
  }, [filteredVar, fixedAsMonthly, filterAccount]);

  const filteredTransfers = useMemo(() =>
    transfers.filter(t => { const d=new Date(t.date); return MONTHS[d.getMonth()]===filterMonth && d.getFullYear()===filterYear; }),
    [transfers, filterMonth, filterYear]);

  // ── Totals ────────────────────────────────────────────────────────────────
  const expenses = filteredAll.filter(t => t.type==="expense");
  const incomes  = filteredAll.filter(t => t.type==="income");
  const savingsTx = filteredAll.filter(t => t.type==="saving");

  const toEUR = useCallback((amount, accId) => {
    const acc = accMap[accId];
    return acc?.currency === "CHF" ? amount * exchangeRate : amount;
  }, [accMap, exchangeRate]);

  const totalIncomeEUR  = incomes.reduce((s,t)  => s + toEUR(Number(t.amount), t.account_id), 0);
  const totalExpenseEUR = expenses.reduce((s,t) => s + toEUR(Number(t.amount), t.account_id), 0);
  const totalSavingEUR  = savingsTx.reduce((s,t) => s + toEUR(Number(t.amount), t.account_id), 0);
  const balanceEUR = totalIncomeEUR - totalExpenseEUR - totalSavingEUR;

  // ── Account balance for month ─────────────────────────────────────────────
  const accountBalance = useCallback((accId) => {
    const inc  = filteredAll.filter(t => t.account_id===accId && t.type==="income").reduce((s,t) => s+Number(t.amount), 0);
    const exp  = filteredAll.filter(t => t.account_id===accId && t.type==="expense").reduce((s,t) => s+Number(t.amount), 0);
    const sav  = filteredAll.filter(t => t.account_id===accId && t.type==="saving").reduce((s,t) => s+Number(t.amount), 0);
    const trIn  = filteredTransfers.filter(t => t.to_account_id===accId).reduce((s,t) => s+Number(t.amount_to), 0);
    const trOut = filteredTransfers.filter(t => t.from_account_id===accId).reduce((s,t) => s+Number(t.amount_from), 0);
    return Number(accMap[accId]?.balance_initial||0) + inc - exp - sav + trIn - trOut;
  }, [filteredAll, filteredTransfers, accMap]);

  // ── Transfer calculator ───────────────────────────────────────────────────
  const calcTransfer = useMemo(() => {
    const chAcc = accounts.find(a => a.currency==="CHF");
    const itAcc = accounts.find(a => a.currency==="EUR");
    if (!chAcc || !itAcc) return null;

    const chFixed = fixedTx.filter(t => t.account_id===chAcc.id && t.type==="expense").reduce((s,t) => s+Number(t.amount), 0);
    const chIncome = fixedTx.filter(t => t.account_id===chAcc.id && t.type==="income").reduce((s,t) => s+Number(t.amount), 0);
    const itFixed = fixedTx.filter(t => t.account_id===itAcc.id && t.type==="expense").reduce((s,t) => s+Number(t.amount), 0);
    const itIncome = fixedTx.filter(t => t.account_id===itAcc.id && t.type==="income").reduce((s,t) => s+Number(t.amount), 0);

    const chNet = chIncome - chFixed; // surplus/deficit CH after fixed
    const itNet = itIncome - itFixed; // surplus/deficit IT after fixed

    // How much needs to go from CH to IT (or vice versa) to cover IT deficit
    const itDeficit = -itNet; // positive = IT needs money
    const transferCHF = itDeficit > 0 ? itDeficit / exchangeRate : 0;
    const transferEUR = itDeficit;

    return { chAcc, itAcc, chFixed, chIncome, chNet, itFixed, itIncome, itNet, itDeficit, transferCHF, transferEUR };
  }, [accounts, fixedTx, exchangeRate]);

  // ── Top categories by frequency ───────────────────────────────────────────
  const topCategories = useMemo(() => {
    const freq = {};
    variableTx.filter(t => t.type==="expense").forEach(t => {
      if (t.category_id) freq[t.category_id] = (freq[t.category_id]||0) + 1;
    });
    return Object.entries(freq).sort((a,b) => b[1]-a[1]).slice(0,5).map(([id]) => catMap[id]).filter(Boolean);
  }, [variableTx, catMap]);

  // ── Category breakdown ────────────────────────────────────────────────────
  const catBreakdown = useMemo(() => {
    const map = {};
    expenses.forEach(t => { const cid=t.category_id||"none"; if(!map[cid]) map[cid]=0; map[cid]+=Number(t.amount); });
    return Object.entries(map).map(([cid,val]) => ({ cid, val, cat: catMap[cid]||{name:"Altro",color:"#9ca3af",icon:"📦"} })).sort((a,b) => b.val-a.val);
  }, [expenses, catMap]);

  // ── Trend ─────────────────────────────────────────────────────────────────
  const trend = useMemo(() => {
    const idx = MONTHS.indexOf(filterMonth);
    return Array.from({length:6}, (_,i) => {
      const mi=(idx-5+i+12)%12, m=MONTHS[mi], yr=mi>idx?filterYear-1:filterYear;
      const val = variableTx.filter(t => { const d=new Date(t.date); return MONTHS[d.getMonth()]===m && d.getFullYear()===yr && t.type==="expense"; }).reduce((s,t) => s+Number(t.amount), 0)
        + fixedTx.filter(t => t.type==="expense").reduce((s,t) => s+Number(t.amount), 0);
      return { label: MONTHS_SHORT[mi], value: val };
    });
  }, [variableTx, fixedTx, filterMonth, filterYear]);

  // ── CRUD helpers ──────────────────────────────────────────────────────────
  const saveTx = async () => {
    if (!form.name || !form.amount || !form.date || !form.account_id) { showToast("Compila tutti i campi", false); return; }
    const uid = user?.id;
    const body = { user_id:uid, name:form.name, amount:parseFloat(form.amount), type:form.type||"expense", category_id:form.category_id||null, account_id:form.account_id, date:form.date, note:form.note||"", is_fixed:false, recurring_day:null };
    if (editItem) await db("transactions").update(body, `id=eq.${editItem.id}`);
    else await db("transactions").insert(body);
    showToast(editItem ? "Aggiornato ✓" : "Aggiunto ✓");
    setModal(null); setEditItem(null); setForm({}); loadAll();
  };

  const saveFixed = async () => {
    if (!form.name || !form.amount || !form.account_id || !form.date) { showToast("Compila tutti i campi", false); return; }
    const uid = user?.id;
    const body = { user_id:uid, name:form.name, amount:parseFloat(form.amount), type:form.type||"expense", category_id:form.category_id||null, account_id:form.account_id, date:form.date, note:form.note||"", is_fixed:true, recurring_day:parseInt(form.recurring_day)||25 };
    if (editItem) await db("transactions").update(body, `id=eq.${editItem.id}`);
    else await db("transactions").insert(body);
    showToast(editItem ? "Aggiornato ✓" : "Aggiunto ✓");
    setModal(null); setEditItem(null); setForm({}); loadAll();
  };

  const saveTransfer = async () => {
    if (!form.from_account_id || !form.to_account_id || !form.amount_from || !form.date) { showToast("Compila tutti i campi", false); return; }
    const rate = parseFloat(form.rate || exchangeRate);
    const fromAcc = accMap[form.from_account_id], toAcc = accMap[form.to_account_id];
    let amountTo;
    if (fromAcc?.currency === toAcc?.currency) amountTo = parseFloat(form.amount_from);
    else if (fromAcc?.currency === "CHF") amountTo = parseFloat(form.amount_from) * rate;
    else amountTo = parseFloat(form.amount_from) / rate;
    const body = { user_id:user?.id, from_account_id:form.from_account_id, to_account_id:form.to_account_id, amount_from:parseFloat(form.amount_from), amount_to:amountTo, rate, date:form.date, note:form.note||"" };
    await db("transfers").insert(body);
    showToast("Trasferimento registrato ✓"); setModal(null); setForm({}); loadAll();
  };

  const saveAccount = async () => {
    if (!form.name || !form.currency) { showToast("Compila tutti i campi", false); return; }
    const body = { user_id:user?.id, name:form.name, currency:form.currency, color:form.color||"#6366f1", icon:form.icon||"🏦", balance_initial:parseFloat(form.balance_initial||0) };
    if (editItem) await db("accounts").update(body, `id=eq.${editItem.id}`);
    else await db("accounts").insert(body);
    showToast("Conto salvato ✓"); setModal(null); setEditItem(null); setForm({}); loadAll();
  };

  const saveCat = async () => {
    if (!form.name) { showToast("Inserisci un nome", false); return; }
    const body = { user_id:user?.id, name:form.name, icon:form.icon||"📦", color:form.color||"#6366f1", budget:parseFloat(form.budget||0) };
    if (editItem) await db("categories").update(body, `id=eq.${editItem.id}`);
    else await db("categories").insert(body);
    showToast("Categoria salvata ✓"); setModal(null); setEditItem(null); setForm({}); loadAll();
  };

  const saveSavingsGoal = async () => {
    if (!form.name) return;
    const body = { user_id:user?.id, name:form.name, icon:form.icon||"🎯", color:form.color||"#10b981", target_amount:parseFloat(form.target_amount||0), current_amount:parseFloat(form.current_amount||0), currency:form.currency||"EUR", account_id:form.account_id||null, deadline:form.deadline||null };
    if (editItem) await db("savings_goals").update(body, `id=eq.${editItem.id}`);
    else await db("savings_goals").insert(body);
    showToast("Salvato ✓"); setModal(null); setEditItem(null); setForm({}); loadAll();
  };

  const adjustAccount = async () => {
    if (!form.account_id || form.adjustment === undefined) return;
    const acc = accMap[form.account_id];
    const newBalance = parseFloat(form.new_balance);
    await db("accounts").update({ balance_initial: newBalance }, `id=eq.${form.account_id}`);
    showToast("Saldo aggiustato ✓"); setModal(null); setForm({}); loadAll();
  };

  const deleteTx = async (id) => { await db("transactions").delete(`id=eq.${id}`); showToast("Eliminato ✓"); loadAll(); };
  const deleteTransfer = async (id) => { await db("transfers").delete(`id=eq.${id}`); showToast("Eliminato ✓"); loadAll(); };
  const deleteAccount = async (id) => { await db("accounts").delete(`id=eq.${id}`); showToast("Eliminato ✓"); loadAll(); };
  const deleteCat = async (id) => { await db("categories").delete(`id=eq.${id}`); showToast("Eliminato ✓"); loadAll(); };
  const deleteSavingsGoal = async (id) => { await db("savings_goals").delete(`id=eq.${id}`); showToast("Eliminato ✓"); loadAll(); };

  const copyTransaction = (t) => {
    setForm({ ...t, id:undefined, date:TODAY, _copy:true });
    setEditItem(null);
    setModal(t.is_fixed ? "fixed" : "tx");
  };

  const exportCSV = () => {
    const rows = [["Data","Nome","Tipo","Fisso","Categoria","Conto","Importo","Valuta","Note"]];
    filteredAll.forEach(t => { const acc=accMap[t.account_id]; rows.push([t.date, t.name, t.type, t.is_fixed?"Sì":"No", catMap[t.category_id]?.name||"", acc?.name||"", t.amount, acc?.currency||"", t.note||""]); });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows.map(r => r.join(";")).join("\n")], {type:"text/csv"}));
    a.download = `finanza_${filterMonth}_${filterYear}.csv`; a.click();
    showToast("Export completato ✓");
  };

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#f8f9fc", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12, fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ width:40, height:40, border:"3px solid #eee", borderTop:"3px solid #6366f1", borderRadius:"50%", animation:"spin 1s linear infinite" }}/>
      <div style={{ color:"#bbb", fontSize:13 }}>Caricamento...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const navItems = [
    {id:"dashboard", icon:"⊞", label:"Home"},
    {id:"transactions", icon:"↕", label:"Movimenti"},
    {id:"fixed", icon:"📌", label:"Fisso"},
    {id:"reports", icon:"◑", label:"Report"},
    {id:"savings", icon:"🎯", label:"Risparmi"},
    {id:"settings", icon:"⚙", label:"Impost."},
  ];

  const selStyle = { border:"1.5px solid #eee", borderRadius:8, padding:"6px 26px 6px 10px", fontSize:12, color:"#1a1a2e", background:"#fff", cursor:"pointer", appearance:"none", backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%23999' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat:"no-repeat", backgroundPosition:"right 8px center" };

  // ── Layout wrapper ─────────────────────────────────────────────────────────
  const Layout = ({ children }) => (
    <div style={{ display:"flex", minHeight:"100vh", background:"#f8f9fc", fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      {/* Desktop sidebar */}
      {!isMobile && (
        <div style={{ width:220, background:"#fff", borderRight:"1px solid #f0f0f0", display:"flex", flexDirection:"column", position:"fixed", top:0, bottom:0, left:0, zIndex:100, boxShadow:"2px 0 12px #0001" }}>
          <div style={{ padding:"24px 20px 16px" }}>
            <div style={{ fontSize:16, fontWeight:900, color:"#1a1a2e" }}>💼 Finanza</div>
            <div style={{ fontSize:11, color:"#bbb", marginTop:2 }}>{user?.email}</div>
          </div>
          <div style={{ flex:1, padding:"8px 12px", overflowY:"auto" }}>
            {navItems.map(n => (
              <button key={n.id} onClick={() => setPage(n.id)} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 12px", marginBottom:4, background: page===n.id ? "#f0f0ff" : "transparent", border:"none", borderRadius:10, color: page===n.id ? "#6366f1" : "#666", fontWeight: page===n.id ? 700 : 400, fontSize:14, cursor:"pointer", fontFamily:"inherit", textAlign:"left" }}>
                <span style={{ fontSize:18 }}>{n.icon}</span> {n.label}
              </button>
            ))}
          </div>
          <div style={{ padding:"16px 20px", borderTop:"1px solid #f0f0f0" }}>
            <div style={{ fontSize:12, color:"#999", marginBottom:6 }}>1 CHF = {fmtN(exchangeRate,4)} €</div>
            <button onClick={signOut} style={{ width:"100%", padding:"9px 0", background:"#f5f5f5", border:"none", borderRadius:10, color:"#999", fontSize:12, cursor:"pointer", fontWeight:600 }}>Esci →</button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div style={{ flex:1, marginLeft: isMobile ? 0 : 220, paddingBottom: isMobile ? 90 : 0 }}>
        {/* Top bar */}
        <div style={{ background:"#fff", borderBottom:"1px solid #f0f0f0", padding: isMobile ? "14px 16px" : "14px 28px", position:"sticky", top:0, zIndex:99, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            {isMobile && <div style={{ fontSize:16, fontWeight:800, color:"#1a1a2e" }}>💼 {navItems.find(n=>n.id===page)?.label}</div>}
            {!isMobile && <div style={{ fontSize:15, fontWeight:700, color:"#1a1a2e" }}>{navItems.find(n=>n.id===page)?.label} <span style={{ color:"#bbb", fontWeight:400 }}>· {filterMonth} {filterYear}</span></div>}
          </div>
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={selStyle}>
              {MONTHS.map(m => <option key={m}>{m}</option>)}
            </select>
            <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))} style={selStyle}>
              {[CUR_YEAR-1,CUR_YEAR,CUR_YEAR+1].map(y => <option key={y}>{y}</option>)}
            </select>
            {!isMobile && <button onClick={signOut} style={{ background:"#f5f5f5", border:"none", borderRadius:8, padding:"6px 12px", fontSize:12, cursor:"pointer", color:"#999" }}>Esci</button>}
          </div>
        </div>

        {/* Page content */}
        <div style={{ padding: isMobile ? "16px" : "24px 28px", maxWidth:900, margin:"0 auto" }}>
          {children}
        </div>
      </div>

      {/* Mobile bottom nav */}
      {isMobile && (
        <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"#fff", borderTop:"1px solid #f0f0f0", display:"flex", zIndex:200, boxShadow:"0 -4px 20px #0001" }}>
          {navItems.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)} style={{ flex:1, padding:"10px 0 8px", background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
              <div style={{ fontSize:18, opacity: page===n.id ? 1 : 0.3 }}>{n.icon}</div>
              <div style={{ fontSize:8, fontWeight: page===n.id ? 700 : 400, color: page===n.id ? "#6366f1" : "#bbb" }}>{n.label.toUpperCase()}</div>
              {page===n.id && <div style={{ width:4, height:4, borderRadius:"50%", background:"#6366f1" }}/>}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // ── DASHBOARD ─────────────────────────────────────────────────────────────
  const DashboardPage = () => (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {/* Account cards */}
      <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr 1fr" : `repeat(${accounts.length}, 1fr)`, gap:12 }}>
        {accounts.map(acc => {
          const bal = accountBalance(acc.id);
          return (
            <div key={acc.id} style={{ background:`linear-gradient(135deg,${acc.color},${acc.color}99)`, borderRadius:18, padding:"18px 20px", color:"#fff", position:"relative", overflow:"hidden", boxShadow:`0 4px 20px ${acc.color}44` }}>
              <div style={{ position:"absolute", top:-15, right:-15, width:70, height:70, background:"#ffffff12", borderRadius:"50%" }}/>
              <div style={{ fontSize:22, marginBottom:6 }}>{acc.icon}</div>
              <div style={{ fontSize:11, color:"#ffffff99", marginBottom:3 }}>{acc.name}</div>
              <div style={{ fontSize:22, fontWeight:900 }}>{acc.currency} {fmtN(bal)}</div>
            </div>
          );
        })}
      </div>

      {/* Global balance */}
      <div style={{ background:"linear-gradient(135deg,#1a1a2e,#16213e)", borderRadius:20, padding:"20px 22px", color:"#fff", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-20, right:-20, width:100, height:100, background:"#ffffff06", borderRadius:"50%" }}/>
        <div style={{ fontSize:11, color:"#ffffff55", letterSpacing:1.5, marginBottom:8 }}>SALDO NETTO {filterMonth.toUpperCase()} (EUR)</div>
        <div style={{ fontSize:32, fontWeight:900, letterSpacing:-1, color: balanceEUR>=0 ? "#34d399" : "#f87171" }}>{balanceEUR>=0?"+":""}{fmtN(balanceEUR)} €</div>
        <div style={{ display:"flex", gap:20, marginTop:12 }}>
          {[{l:"Entrate",v:totalIncomeEUR,c:"#34d399"},{l:"Uscite",v:totalExpenseEUR,c:"#f87171"},{l:"Risparmi",v:totalSavingEUR,c:"#818cf8"}].map(k => (
            <div key={k.l}><div style={{ fontSize:10, color:"#ffffff44" }}>{k.l}</div><div style={{ fontSize:14, fontWeight:700, color:k.c }}>€ {fmtN(k.v)}</div></div>
          ))}
        </div>
      </div>

      {/* Quick add */}
      <div style={{ background:"#fff", borderRadius:18, padding:18, boxShadow:"0 2px 12px #0001" }}>
        <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e", marginBottom:12 }}>⚡ Inserimento Rapido</div>
        <div style={{ display:"flex", gap:8, marginBottom:12 }}>
          <Inp type="date" value={form._quickDate||TODAY} onChange={e => setForm({...form, _quickDate:e.target.value})} style={{ flex:1 }}/>
        </div>
        <div style={{ fontSize:11, color:"#bbb", marginBottom:8 }}>TOP CATEGORIE</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
          {(topCategories.length > 0 ? topCategories : categories.slice(0,5)).map(cat => (
            <button key={cat.id} onClick={() => { setForm({ type:"expense", date:form._quickDate||TODAY, category_id:cat.id, account_id:accounts.find(a=>a.currency==="EUR")?.id||accounts[0]?.id }); setModal("quicktx"); }}
              style={{ background:cat.color+"18", border:`1.5px solid ${cat.color}44`, borderRadius:10, padding:"8px 12px", fontSize:12, color:cat.color, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
              {cat.icon} {cat.name}
            </button>
          ))}
          <button onClick={() => { setForm({type:"expense",date:form._quickDate||TODAY,account_id:accounts[0]?.id}); setModal("tx"); }}
            style={{ background:"#f5f5f5", border:"1.5px solid #eee", borderRadius:10, padding:"8px 12px", fontSize:12, color:"#999", fontWeight:600, cursor:"pointer" }}>+ Altro</button>
        </div>
      </div>

      {/* Transfer calculator */}
      {calcTransfer && (
        <div style={{ background:"#fff", borderRadius:18, padding:18, boxShadow:"0 2px 12px #0001" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e" }}>📊 Calcolatore Trasferimento (giorno 24)</div>
            <button onClick={() => setModal("calcTransfer")} style={{ fontSize:12, color:"#6366f1", background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>Dettagli →</button>
          </div>
          {calcTransfer.itDeficit > 0 ? (
            <div style={{ background:"#fef3c7", borderRadius:12, padding:"12px 16px" }}>
              <div style={{ fontSize:12, color:"#92400e", marginBottom:4 }}>💸 Devi trasferire da {calcTransfer.chAcc.name} a {calcTransfer.itAcc.name}:</div>
              <div style={{ fontSize:22, fontWeight:900, color:"#d97706" }}>CHF {fmtN(calcTransfer.transferCHF)}</div>
              <div style={{ fontSize:12, color:"#92400e", marginTop:2 }}>= € {fmtN(calcTransfer.itDeficit)} al tasso {fmtN(exchangeRate,4)}</div>
            </div>
          ) : (
            <div style={{ background:"#d1fae5", borderRadius:12, padding:"12px 16px" }}>
              <div style={{ fontSize:12, color:"#065f46" }}>✅ Il conto IT è in surplus questo mese. Nessun trasferimento necessario.</div>
              <div style={{ fontSize:18, fontWeight:700, color:"#059669", marginTop:4 }}>€ {fmtN(-calcTransfer.itDeficit)} surplus</div>
            </div>
          )}
          <button onClick={() => { setForm({ from_account_id:calcTransfer.chAcc.id, to_account_id:calcTransfer.itAcc.id, amount_from:fmtN(calcTransfer.transferCHF,2).replace(",","."), date:TODAY, rate:exchangeRate }); setModal("transfer"); }}
            style={{ width:"100%", marginTop:12, background:"linear-gradient(135deg,#10b981,#059669)", border:"none", borderRadius:10, padding:"10px 0", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>
            🔄 Registra Trasferimento
          </button>
        </div>
      )}

      {/* Category donut */}
      {catBreakdown.length > 0 && (
        <div style={{ background:"#fff", borderRadius:20, padding:20, boxShadow:"0 2px 12px #0001" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e", marginBottom:16 }}>Spese per Categoria</div>
          <div style={{ display:"flex", alignItems:"center", gap:20, flexWrap:"wrap" }}>
            <DonutChart data={catBreakdown.map(c => ({value:c.val,color:c.cat.color}))} size={150} centerLabel="Uscite" centerValue={fmtN(expenses.reduce((s,t)=>s+Number(t.amount),0))}/>
            <div style={{ flex:1, minWidth:130 }}>
              {catBreakdown.slice(0,6).map(c => (
                <div key={c.cid} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                    <div style={{ width:9, height:9, borderRadius:3, background:c.cat.color }}/>
                    <span style={{ fontSize:12, color:"#666" }}>{c.cat.icon} {c.cat.name}</span>
                  </div>
                  <span style={{ fontSize:12, fontWeight:700 }}>{fmtN(c.val)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Budget bars */}
      {catBreakdown.filter(c=>c.cat.budget>0).length > 0 && (
        <div style={{ background:"#fff", borderRadius:20, padding:20, boxShadow:"0 2px 12px #0001" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e", marginBottom:16 }}>Budget vs Speso</div>
          {catBreakdown.filter(c=>c.cat.budget>0).map(c => { const pct=Math.min(100,(c.val/c.cat.budget)*100), over=pct>=100; return (
            <div key={c.cid} style={{ marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ fontSize:12, color:"#666" }}>{c.cat.icon} {c.cat.name}</span>
                <span style={{ fontSize:12, fontWeight:700, color:over?"#ef4444":"#1a1a2e" }}>{fmtN(c.val)} / {fmtN(c.cat.budget)}{over?" ⚠️":""}</span>
              </div>
              <div style={{ background:"#f5f5f5", borderRadius:6, height:7, overflow:"hidden" }}>
                <div style={{ width:`${pct}%`, height:"100%", background:over?"#ef4444":c.cat.color, borderRadius:6 }}/>
              </div>
            </div>
          ); })}
        </div>
      )}

      {/* Trend */}
      <div style={{ background:"#fff", borderRadius:20, padding:20, boxShadow:"0 2px 12px #0001" }}>
        <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e", marginBottom:16 }}>Trend Ultimi 6 Mesi</div>
        <BarChart data={trend} color="#6366f1"/>
      </div>

      {/* Recent */}
      <div style={{ background:"#fff", borderRadius:20, padding:20, boxShadow:"0 2px 12px #0001" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e" }}>Ultimi Movimenti</div>
          <button onClick={() => setPage("transactions")} style={{ fontSize:12, color:"#6366f1", background:"none", border:"none", cursor:"pointer", fontWeight:600 }}>Vedi tutti →</button>
        </div>
        {filteredAll.slice(0,5).map(t => { const cat=catMap[t.category_id], acc=accMap[t.account_id]; return (
          <div key={t.id+(t._injected?"_f":"")} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10, padding:"10px", background:"#f8f9fc", borderRadius:12 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:cat?.color+"22"||"#f5f5f5", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>{cat?.icon||"📦"}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:600, color:"#1a1a2e" }}>{t.name}{t.is_fixed&&<span style={{ fontSize:10, color:"#6366f1", background:"#6366f111", borderRadius:4, padding:"2px 5px", marginLeft:6 }}>📌</span>}</div>
              <div style={{ fontSize:11, color:"#bbb" }}>{t.date} · {acc?.name}</div>
            </div>
            <div style={{ fontSize:14, fontWeight:800, color:t.type==="income"?"#10b981":t.type==="saving"?"#6366f1":"#ef4444" }}>
              {t.type==="income"?"+":"-"}{acc?.currency} {fmtN(Math.abs(Number(t.amount)))}
            </div>
          </div>
        ); })}
        {filteredAll.length===0 && <div style={{ textAlign:"center", color:"#ccc", padding:"20px 0", fontSize:13 }}>Nessun movimento per {filterMonth}</div>}
      </div>
    </div>
  );

  // ── TRANSACTIONS ──────────────────────────────────────────────────────────
  const TransactionsPage = () => (
    <div>
      <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
        <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)} style={{...selStyle, padding:"8px 26px 8px 10px"}}>
          <option value="all">Tutti i conti</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
        </select>
        <button onClick={() => { setForm({date:TODAY,from_account_id:accounts[0]?.id,to_account_id:accounts[1]?.id,rate:exchangeRate}); setModal("transfer"); }}
          style={{ background:"#f5f5f5", border:"none", borderRadius:8, padding:"8px 12px", fontSize:12, cursor:"pointer", color:"#666" }}>🔄 Trasferisci</button>
        <button onClick={exportCSV} style={{ background:"#f5f5f5", border:"none", borderRadius:8, padding:"8px 12px", fontSize:12, cursor:"pointer", color:"#666" }}>⬇ CSV</button>
        <button onClick={() => { setForm({date:TODAY,type:"expense",account_id:accounts[0]?.id}); setEditItem(null); setModal("tx"); }}
          style={{ marginLeft:"auto", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", border:"none", borderRadius:10, padding:"8px 16px", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>+ Movimento</button>
      </div>

      {/* Summary row */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:16 }}>
        {[{l:"Entrate",v:incomes.reduce((s,t)=>s+Number(t.amount),0),c:"#10b981",cur:""},{l:"Uscite",v:expenses.reduce((s,t)=>s+Number(t.amount),0),c:"#ef4444",cur:""},{l:"Saldo",v:incomes.reduce((s,t)=>s+Number(t.amount),0)-expenses.reduce((s,t)=>s+Number(t.amount),0),c:"#6366f1",cur:""}].map(k => (
          <div key={k.l} style={{ background:"#fff", borderRadius:14, padding:"12px", boxShadow:"0 2px 8px #0001", textAlign:"center" }}>
            <div style={{ fontSize:11, color:"#bbb", marginBottom:3 }}>{k.l}</div>
            <div style={{ fontSize:16, fontWeight:800, color:k.c }}>{fmtN(k.v)}</div>
          </div>
        ))}
      </div>

      {/* Transfers */}
      {filteredTransfers.length > 0 && (
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#bbb", letterSpacing:1, marginBottom:8 }}>TRASFERIMENTI</div>
          {filteredTransfers.map(t => (
            <div key={t.id} style={{ background:"#fff", borderRadius:14, padding:"12px 16px", display:"flex", alignItems:"center", gap:10, marginBottom:6, boxShadow:"0 1px 6px #0001" }}>
              <div style={{ fontSize:20 }}>🔄</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600 }}>{accMap[t.from_account_id]?.name} → {accMap[t.to_account_id]?.name}</div>
                <div style={{ fontSize:11, color:"#bbb" }}>{t.date} · tasso {fmtN(t.rate,4)}{t.note&&` · ${t.note}`}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:13, fontWeight:700 }}>{accMap[t.from_account_id]?.currency} {fmtN(t.amount_from)}</div>
                <div style={{ fontSize:11, color:"#bbb" }}>→ {accMap[t.to_account_id]?.currency} {fmtN(t.amount_to)}</div>
              </div>
              <button onClick={() => deleteTransfer(t.id)} style={{ background:"#fff0f0", border:"none", borderRadius:6, width:28, height:28, cursor:"pointer", fontSize:13 }}>🗑</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize:11, fontWeight:700, color:"#bbb", letterSpacing:1, marginBottom:8 }}>MOVIMENTI · {filteredVar.length} voci</div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {filteredVar.length===0 && <div style={{ textAlign:"center", color:"#ccc", padding:"50px 0", fontSize:13 }}>Nessun movimento per {filterMonth}</div>}
        {filteredVar.map(t => { const cat=catMap[t.category_id], acc=accMap[t.account_id]; return (
          <div key={t.id} style={{ background:"#fff", borderRadius:14, padding:"13px 16px", display:"flex", alignItems:"center", gap:12, boxShadow:"0 2px 8px #0001" }}>
            <div style={{ width:40, height:40, borderRadius:12, background:cat?.color+"22"||"#f5f5f5", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{cat?.icon||"📦"}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14, fontWeight:600, color:"#1a1a2e" }}>{t.name}</div>
              <div style={{ fontSize:11, color:"#bbb" }}>{t.date} · {cat?.name||"—"} · {acc?.name}</div>
              {t.note && <div style={{ fontSize:11, color:"#bbb" }}>{t.note}</div>}
            </div>
            <div style={{ textAlign:"right", flexShrink:0 }}>
              <div style={{ fontSize:15, fontWeight:800, color:t.type==="income"?"#10b981":t.type==="saving"?"#6366f1":"#ef4444" }}>
                {t.type==="income"?"+":"-"}{acc?.currency} {fmtN(Math.abs(Number(t.amount)))}
              </div>
              <div style={{ display:"flex", gap:4, marginTop:5, justifyContent:"flex-end" }}>
                <button onClick={() => copyTransaction(t)} style={{ background:"#f0f0ff", border:"none", borderRadius:6, width:26, height:26, cursor:"pointer", fontSize:12 }} title="Copia">📋</button>
                <button onClick={() => { setForm({...t}); setEditItem(t); setModal("tx"); }} style={{ background:"#f5f5f5", border:"none", borderRadius:6, width:26, height:26, cursor:"pointer", fontSize:12 }}>✏️</button>
                <button onClick={() => deleteTx(t.id)} style={{ background:"#fff0f0", border:"none", borderRadius:6, width:26, height:26, cursor:"pointer", fontSize:12 }}>🗑</button>
              </div>
            </div>
          </div>
        ); })}
      </div>
    </div>
  );

  // ── FIXED ─────────────────────────────────────────────────────────────────
  const FixedPage = () => {
    const fixedIncome = fixedTx.filter(t => t.type==="income");
    const fixedExpense = fixedTx.filter(t => t.type==="expense");
    return (
      <div>
        <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr":"1fr 1fr", gap:12, marginBottom:16 }}>
          {accounts.map(acc => { const exp=fixedTx.filter(t=>t.account_id===acc.id&&t.type==="expense").reduce((s,t)=>s+Number(t.amount),0), inc=fixedTx.filter(t=>t.account_id===acc.id&&t.type==="income").reduce((s,t)=>s+Number(t.amount),0); return (
            <div key={acc.id} style={{ background:`linear-gradient(135deg,${acc.color},${acc.color}99)`, borderRadius:16, padding:"16px 18px", color:"#fff" }}>
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
          <button onClick={() => { setForm({type:fixedTab, account_id:accounts[0]?.id, recurring_day:25, date:TODAY}); setEditItem(null); setModal("fixed"); }}
            style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)", border:"none", borderRadius:10, padding:"10px 16px", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>
            + {fixedTab==="income"?"Entrata":"Uscita"} Fissa
          </button>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {(fixedTab==="income" ? fixedIncome : fixedExpense).map(t => { const cat=catMap[t.category_id], acc=accMap[t.account_id]; return (
            <div key={t.id} style={{ background:"#fff", borderRadius:14, padding:"13px 16px", display:"flex", alignItems:"center", gap:12, boxShadow:"0 2px 8px #0001" }}>
              <div style={{ width:40, height:40, borderRadius:12, background:cat?.color+"22"||"#f0f0ff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{cat?.icon||"📌"}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:600, color:"#1a1a2e" }}>{t.name}</div>
                <div style={{ fontSize:11, color:"#bbb" }}>
                  Giorno <strong style={{ color:"#6366f1" }}>{t.recurring_day||25}</strong> · {acc?.name}{cat&&` · ${cat.icon} ${cat.name}`}
                </div>
                <div style={{ fontSize:11, color:"#bbb" }}>Data: {t.date}</div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontSize:15, fontWeight:800, color:t.type==="income"?"#10b981":"#ef4444" }}>
                  {t.type==="income"?"+":"-"}{acc?.currency} {fmtN(Math.abs(Number(t.amount)))}
                </div>
                <div style={{ display:"flex", gap:4, marginTop:5, justifyContent:"flex-end" }}>
                  <button onClick={() => { setForm({...t}); setEditItem(t); setModal("fixed"); }} style={{ background:"#f5f5f5", border:"none", borderRadius:6, width:26, height:26, cursor:"pointer", fontSize:12 }}>✏️</button>
                  <button onClick={() => deleteTx(t.id)} style={{ background:"#fff0f0", border:"none", borderRadius:6, width:26, height:26, cursor:"pointer", fontSize:12 }}>🗑</button>
                </div>
              </div>
            </div>
          ); })}
          {(fixedTab==="income" ? fixedIncome : fixedExpense).length===0 && (
            <div style={{ textAlign:"center", color:"#ccc", padding:"40px 0", fontSize:13 }}>
              Nessuna {fixedTab==="income"?"entrata":"uscita"} fissa
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── REPORTS ───────────────────────────────────────────────────────────────
  const ReportsPage = () => {
    const [reportPeriod, setReportPeriod] = useState("month");
    const [dateFrom, setDateFrom] = useState(`${CUR_YEAR}-01-01`);
    const [dateTo, setDateTo] = useState(TODAY);

    const periodTx = useMemo(() => {
      if (reportPeriod === "month") return filteredAll;
      return [...variableTx, ...fixedAsMonthly].filter(t => {
        const d = t.date;
        if (reportPeriod === "year") return d.startsWith(String(filterYear));
        if (reportPeriod === "custom") return d >= dateFrom && d <= dateTo;
        return true;
      });
    }, [reportPeriod, dateFrom, dateTo]);

    const pExpenses = periodTx.filter(t => t.type==="expense");
    const pIncome   = periodTx.filter(t => t.type==="income");
    const pSavings  = periodTx.filter(t => t.type==="saving");
    const totExp = pExpenses.reduce((s,t) => s+Number(t.amount), 0);
    const totInc = pIncome.reduce((s,t) => s+Number(t.amount), 0);
    const totSav = pSavings.reduce((s,t) => s+Number(t.amount), 0);

    const pCatBreakdown = useMemo(() => {
      const map = {};
      pExpenses.forEach(t => { const cid=t.category_id||"none"; if(!map[cid]) map[cid]=0; map[cid]+=Number(t.amount); });
      return Object.entries(map).map(([cid,val]) => ({ cid, val, cat:catMap[cid]||{name:"Altro",color:"#9ca3af",icon:"📦"} })).sort((a,b) => b.val-a.val);
    }, [pExpenses]);

    return (
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        {/* Period selector */}
        <div style={{ background:"#fff", borderRadius:16, padding:18, boxShadow:"0 2px 12px #0001" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e", marginBottom:14 }}>Periodo di analisi</div>
          <TabSwitch tabs={[["month","Mese"],["year","Anno"],["custom","Personalizzato"]]} value={reportPeriod} onChange={setReportPeriod}/>
          {reportPeriod==="custom" && (
            <div style={{ display:"flex", gap:10 }}>
              <div style={{ flex:1 }}><Field label="DA"><Inp type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/></Field></div>
              <div style={{ flex:1 }}><Field label="A"><Inp type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}/></Field></div>
            </div>
          )}
        </div>

        {/* KPI */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
          {[{l:"Entrate",v:totInc,c:"#10b981"},{l:"Uscite",v:totExp,c:"#ef4444"},{l:"Saldo",v:totInc-totExp-totSav,c:totInc-totExp-totSav>=0?"#6366f1":"#ef4444"}].map(k => (
            <div key={k.l} style={{ background:"#fff", borderRadius:14, padding:"14px 12px", boxShadow:"0 2px 8px #0001", textAlign:"center" }}>
              <div style={{ fontSize:11, color:"#bbb", marginBottom:4 }}>{k.l}</div>
              <div style={{ fontSize:18, fontWeight:800, color:k.c }}>{fmtN(k.v)}</div>
            </div>
          ))}
        </div>

        {/* Donut */}
        {pCatBreakdown.length > 0 && (
          <div style={{ background:"#fff", borderRadius:20, padding:20, boxShadow:"0 2px 12px #0001" }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e", marginBottom:16 }}>Distribuzione Spese</div>
            <div style={{ display:"flex", justifyContent:"center", marginBottom:20 }}>
              <DonutChart data={pCatBreakdown.map(c=>({value:c.val,color:c.cat.color}))} size={200} centerLabel="Totale" centerValue={fmtN(totExp)}/>
            </div>
            {pCatBreakdown.map(c => (
              <div key={c.cid} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, padding:"8px 0", borderBottom:"1px solid #f5f5f5" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:12, height:12, borderRadius:4, background:c.cat.color }}/>
                  <span style={{ fontSize:13, color:"#666" }}>{c.cat.icon} {c.cat.name}</span>
                </div>
                <div>
                  <span style={{ fontSize:13, fontWeight:700 }}>{fmtN(c.val)}</span>
                  <span style={{ fontSize:11, color:"#bbb", marginLeft:6 }}>({totExp>0?((c.val/totExp)*100).toFixed(0):0}%)</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Budget vs speso */}
        <div style={{ background:"#fff", borderRadius:20, padding:20, boxShadow:"0 2px 12px #0001" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e", marginBottom:16 }}>Budget vs Speso</div>
          {categories.filter(c=>c.budget>0).map(cat => {
            const spent = pExpenses.filter(t=>t.category_id===cat.id).reduce((s,t)=>s+Number(t.amount),0);
            const pct=Math.min(100,(spent/cat.budget)*100), over=spent>cat.budget;
            return (
              <div key={cat.id} style={{ marginBottom:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                  <span style={{ fontSize:13, fontWeight:600 }}>{cat.icon} {cat.name}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:over?"#ef4444":"#666" }}>{fmtN(spent)} / {fmtN(cat.budget)}{over?" ⚠️":""}</span>
                </div>
                <div style={{ background:"#f5f5f5", borderRadius:8, height:10, overflow:"hidden" }}>
                  <div style={{ width:`${pct}%`, height:"100%", background:over?"#ef4444":cat.color, borderRadius:8 }}/>
                </div>
                <div style={{ fontSize:11, color:"#bbb", marginTop:3 }}>Rimasto: {fmtN(Math.max(0,cat.budget-spent))} €</div>
              </div>
            );
          })}
        </div>

        {/* Per account */}
        {accounts.map(acc => {
          const inc=pIncome.filter(t=>t.account_id===acc.id).reduce((s,t)=>s+Number(t.amount),0);
          const exp=pExpenses.filter(t=>t.account_id===acc.id).reduce((s,t)=>s+Number(t.amount),0);
          const sav=pSavings.filter(t=>t.account_id===acc.id).reduce((s,t)=>s+Number(t.amount),0);
          return (
            <div key={acc.id} style={{ background:"#fff", borderRadius:18, padding:18, boxShadow:"0 2px 12px #0001", borderLeft:`4px solid ${acc.color}` }}>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>{acc.icon} {acc.name} ({acc.currency})</div>
              {[{l:"Entrate",v:inc,c:"#10b981"},{l:"Uscite",v:exp,c:"#ef4444"},{l:"Risparmi",v:sav,c:"#6366f1"},{l:"Saldo",v:inc-exp-sav,c:inc-exp-sav>=0?"#10b981":"#ef4444"}].map(r => (
                <div key={r.l} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid #f5f5f5" }}>
                  <span style={{ fontSize:13, color:"#666" }}>{r.l}</span>
                  <span style={{ fontSize:14, fontWeight:800, color:r.c }}>{r.v>=0?"+":""}{acc.currency} {fmtN(r.v)}</span>
                </div>
              ))}
            </div>
          );
        })}

        {/* Trend bar */}
        <div style={{ background:"#fff", borderRadius:20, padding:20, boxShadow:"0 2px 12px #0001" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e", marginBottom:16 }}>Trend Ultimi 6 Mesi</div>
          <BarChart data={trend} color="#6366f1"/>
        </div>

        <div style={{ display:"flex", justifyContent:"flex-end" }}>
          <button onClick={exportCSV} style={{ background:"#1a1a2e", border:"none", borderRadius:10, padding:"10px 18px", color:"#fff", fontSize:13, cursor:"pointer", fontWeight:600 }}>⬇ Export CSV</button>
        </div>
      </div>
    );
  };

  // ── SAVINGS ───────────────────────────────────────────────────────────────
  const SavingsPage = () => (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"flex", justifyContent:"flex-end", gap:8 }}>
        <button onClick={() => { setForm({type:"saving",date:TODAY,account_id:accounts[0]?.id}); setModal("tx"); }}
          style={{ background:"#f5f5f5", border:"none", borderRadius:10, padding:"10px 14px", fontSize:13, cursor:"pointer", color:"#666", fontWeight:600 }}>+ Movimento Risparmio</button>
        <button onClick={() => { setForm({currency:"EUR",color:"#10b981",icon:"🎯"}); setEditItem(null); setModal("savingsGoal"); }}
          style={{ background:"linear-gradient(135deg,#10b981,#059669)", border:"none", borderRadius:10, padding:"10px 14px", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>+ Nuovo Obiettivo</button>
      </div>

      {savingsGoals.map(g => {
        const pct = g.target_amount > 0 ? Math.min(100,(g.current_amount/g.target_amount)*100) : 0;
        return (
          <div key={g.id} style={{ background:"#fff", borderRadius:18, padding:20, boxShadow:"0 2px 12px #0001" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:46, height:46, borderRadius:14, background:g.color+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>{g.icon}</div>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color:"#1a1a2e" }}>{g.name}</div>
                  <div style={{ fontSize:11, color:"#bbb" }}>{g.currency} · {g.deadline ? `Entro ${g.deadline}` : "Nessuna scadenza"}</div>
                </div>
              </div>
              <div style={{ display:"flex", gap:6 }}>
                <button onClick={() => { setForm({...g}); setEditItem(g); setModal("savingsGoal"); }} style={{ background:"#f5f5f5", border:"none", borderRadius:8, width:32, height:32, cursor:"pointer", fontSize:14 }}>✏️</button>
                <button onClick={() => deleteSavingsGoal(g.id)} style={{ background:"#fff0f0", border:"none", borderRadius:8, width:32, height:32, cursor:"pointer", fontSize:14 }}>🗑</button>
              </div>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
              <span style={{ fontSize:13, color:"#666" }}>Raggiunto</span>
              <span style={{ fontSize:14, fontWeight:800, color:g.color }}>{g.currency} {fmtN(g.current_amount)} / {fmtN(g.target_amount)}</span>
            </div>
            <div style={{ background:"#f5f5f5", borderRadius:8, height:12, overflow:"hidden" }}>
              <div style={{ width:`${pct}%`, height:"100%", background:`linear-gradient(90deg,${g.color},${g.color}99)`, borderRadius:8, transition:"width .5s ease" }}/>
            </div>
            <div style={{ fontSize:12, color:"#bbb", marginTop:6 }}>{fmtN(pct,0)}% · Mancano {g.currency} {fmtN(Math.max(0,g.target_amount-g.current_amount))}</div>
          </div>
        );
      })}
      {savingsGoals.length===0 && <div style={{ textAlign:"center", color:"#ccc", padding:"60px 0", fontSize:13 }}>Nessun obiettivo di risparmio</div>}
    </div>
  );

  // ── SETTINGS ──────────────────────────────────────────────────────────────
  const SettingsPage = () => (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {/* Profile */}
      <div style={{ background:"#fff", borderRadius:18, padding:18, boxShadow:"0 2px 12px #0001" }}>
        <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e", marginBottom:14 }}>👤 Profilo</div>
        <div style={{ fontSize:13, color:"#666" }}>Email: <strong>{user?.email}</strong></div>
        <div style={{ fontSize:13, color:"#666", marginTop:6 }}>ID: {user?.id?.slice(0,8)}...</div>
        <div style={{ marginTop:14 }}>
          <Btn onClick={signOut} label="Esci dall'account" outline color="#ef4444" small/>
        </div>
      </div>

      {/* Accounts */}
      <div style={{ background:"#fff", borderRadius:18, padding:18, boxShadow:"0 2px 12px #0001" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e" }}>🏦 Conti</div>
          <button onClick={() => { setForm({currency:"EUR",color:"#6366f1",icon:"🏦"}); setEditItem(null); setModal("account"); }}
            style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)", border:"none", borderRadius:10, padding:"8px 14px", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer" }}>+ Conto</button>
        </div>
        {accounts.map(acc => (
          <div key={acc.id} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10, padding:"12px 14px", background:"#f8f9fc", borderRadius:12 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:acc.color+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{acc.icon}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:600 }}>{acc.name}</div>
              <div style={{ fontSize:11, color:"#bbb" }}>{acc.currency} · Saldo iniziale: {fmtN(acc.balance_initial)}</div>
            </div>
            <div style={{ display:"flex", gap:6 }}>
              <button onClick={() => { setForm({account_id:acc.id, new_balance:accountBalance(acc.id)}); setModal("adjustAccount"); }}
                title="Aggiusta saldo" style={{ background:"#f0f0ff", border:"none", borderRadius:6, width:30, height:30, cursor:"pointer", fontSize:14 }}>⚖️</button>
              <button onClick={() => { setForm({...acc}); setEditItem(acc); setModal("account"); }} style={{ background:"#f5f5f5", border:"none", borderRadius:6, width:30, height:30, cursor:"pointer", fontSize:14 }}>✏️</button>
              <button onClick={() => deleteAccount(acc.id)} style={{ background:"#fff0f0", border:"none", borderRadius:6, width:30, height:30, cursor:"pointer", fontSize:14 }}>🗑</button>
            </div>
          </div>
        ))}
      </div>

      {/* Categories */}
      <div style={{ background:"#fff", borderRadius:18, padding:18, boxShadow:"0 2px 12px #0001" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e" }}>🏷️ Categorie</div>
          <button onClick={() => { setForm({color:"#6366f1",icon:"📦"}); setEditItem(null); setModal("cat"); }}
            style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)", border:"none", borderRadius:10, padding:"8px 14px", color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer" }}>+ Categoria</button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr":"1fr 1fr", gap:8 }}>
          {categories.map(cat => (
            <div key={cat.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background:"#f8f9fc", borderRadius:12 }}>
              <div style={{ width:34, height:34, borderRadius:10, background:cat.color+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>{cat.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600 }}>{cat.name}</div>
                <div style={{ fontSize:10, color:"#bbb" }}>Budget: {cat.budget>0?`${fmtN(cat.budget)} €`:"—"}</div>
              </div>
              <div style={{ display:"flex", gap:4 }}>
                <button onClick={() => { setForm({...cat}); setEditItem(cat); setModal("cat"); }} style={{ background:"#fff", border:"none", borderRadius:5, width:26, height:26, cursor:"pointer", fontSize:12 }}>✏️</button>
                <button onClick={() => deleteCat(cat.id)} style={{ background:"#fff0f0", border:"none", borderRadius:5, width:26, height:26, cursor:"pointer", fontSize:12 }}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Exchange rate */}
      <div style={{ background:"#fff", borderRadius:18, padding:18, boxShadow:"0 2px 12px #0001" }}>
        <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e", marginBottom:12 }}>💱 Tasso di Cambio</div>
        <div style={{ fontSize:12, color:"#bbb", marginBottom:10 }}>Recuperato automaticamente da frankfurter.app. Puoi sovrascriverlo.</div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <Inp type="number" value={exchangeRate} onChange={e => setExchangeRate(parseFloat(e.target.value))} style={{ flex:1 }}/>
          <span style={{ fontSize:13, color:"#999", whiteSpace:"nowrap" }}>CHF → EUR</span>
        </div>
      </div>
    </div>
  );

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <Layout>
      {toast && <Toast {...toast}/>}
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        input:focus,select:focus{outline:none;border-color:#6366f1!important;box-shadow:0 0 0 3px #6366f122}
        button:active{transform:scale(.97)}
        ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:#ddd;border-radius:4px}
      `}</style>

      {page==="dashboard"    && <DashboardPage/>}
      {page==="transactions" && <TransactionsPage/>}
      {page==="fixed"        && <FixedPage/>}
      {page==="reports"      && <ReportsPage/>}
      {page==="savings"      && <SavingsPage/>}
      {page==="settings"     && <SettingsPage/>}

      {/* FAB */}
      {isMobile && page!=="settings" && (
        <button onClick={() => { setForm({date:TODAY,type:"expense",account_id:accounts[0]?.id}); setEditItem(null); setModal("tx"); }}
          style={{ position:"fixed", bottom:76, right:20, width:52, height:52, borderRadius:"50%", background:"linear-gradient(135deg,#6366f1,#8b5cf6)", border:"none", color:"#fff", fontSize:24, cursor:"pointer", boxShadow:"0 4px 20px #6366f166", zIndex:150, display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
      )}

      {/* ── MODALS ── */}

      {/* Transaction */}
      {(modal==="tx"||modal==="quicktx") && (
        <Modal title={editItem ? "Modifica Movimento" : modal==="quicktx" ? `${catMap[form.category_id]?.icon||""} ${catMap[form.category_id]?.name||"Spesa Rapida"}` : "Nuovo Movimento"} onClose={() => { setModal(null); setEditItem(null); setForm({}); }}>
          <Field label="TIPO">
            <div style={{ display:"flex", gap:6 }}>
              {[["expense","↓ Spesa","#ef4444"],["income","↑ Entrata","#10b981"],["saving","★ Risparmio","#6366f1"]].map(([v,l,c]) => (
                <button key={v} onClick={() => setForm({...form,type:v})} style={{ flex:1, padding:"9px 0", border:`1.5px solid ${(form.type||"expense")===v?c:"#eee"}`, borderRadius:10, background:(form.type||"expense")===v?c+"11":"#fff", color:(form.type||"expense")===v?c:"#bbb", fontWeight:700, fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>{l}</button>
              ))}
            </div>
          </Field>
          <Field label="CONTO">
            <Sel value={form.account_id||""} onChange={e => setForm({...form,account_id:e.target.value})}>
              <option value="">Seleziona conto</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name} ({a.currency})</option>)}
            </Sel>
          </Field>
          <Field label="NOME"><Inp value={form.name||""} onChange={e => setForm({...form,name:e.target.value})} placeholder="Es. Dentista, Stipendio..."/></Field>
          <Field label={`IMPORTO (${accMap[form.account_id]?.currency||"€"})`}><Inp type="number" value={form.amount??""} onChange={e => setForm({...form,amount:e.target.value})} placeholder="0.00"/></Field>
          <Field label="DATA"><Inp type="date" value={form.date||TODAY} onChange={e => setForm({...form,date:e.target.value})}/></Field>
          <Field label="CATEGORIA">
            <Sel value={form.category_id||""} onChange={e => setForm({...form,category_id:e.target.value})}>
              <option value="">Nessuna categoria</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </Sel>
          </Field>
          <Field label="NOTE"><Inp value={form.note||""} onChange={e => setForm({...form,note:e.target.value})} placeholder="Opzionale..."/></Field>
          <Btn onClick={saveTx} label={editItem ? "Salva modifiche" : "Aggiungi movimento"}/>
        </Modal>
      )}

      {/* Fixed */}
      {modal==="fixed" && (
        <Modal title={editItem ? "Modifica Voce Fissa" : "Nuova Voce Fissa"} onClose={() => { setModal(null); setEditItem(null); setForm({}); }}>
          <div style={{ background:"#f0f0ff", borderRadius:12, padding:"10px 14px", marginBottom:16, fontSize:12, color:"#6366f1" }}>📌 Si ripete automaticamente ogni mese</div>
          <Field label="TIPO">
            <div style={{ display:"flex", gap:6 }}>
              {[["expense","↓ Uscita","#ef4444"],["income","↑ Entrata","#10b981"]].map(([v,l,c]) => (
                <button key={v} onClick={() => setForm({...form,type:v})} style={{ flex:1, padding:"9px 0", border:`1.5px solid ${(form.type||"expense")===v?c:"#eee"}`, borderRadius:10, background:(form.type||"expense")===v?c+"11":"#fff", color:(form.type||"expense")===v?c:"#bbb", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>{l}</button>
              ))}
            </div>
          </Field>
          <Field label="CONTO">
            <Sel value={form.account_id||""} onChange={e => setForm({...form,account_id:e.target.value})}>
              <option value="">Seleziona conto</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name} ({a.currency})</option>)}
            </Sel>
          </Field>
          <Field label="NOME"><Inp value={form.name||""} onChange={e => setForm({...form,name:e.target.value})} placeholder="Es. Netflix, Stipendio..."/></Field>
          <Field label={`IMPORTO (${accMap[form.account_id]?.currency||"€"})`}><Inp type="number" value={form.amount??""} onChange={e => setForm({...form,amount:e.target.value})} placeholder="0.00"/></Field>
          <Field label="DATA (prima occorrenza)"><Inp type="date" value={form.date||TODAY} onChange={e => setForm({...form,date:e.target.value})}/></Field>
          <Field label="GIORNO DEL MESE IN CUI SI RIPETE">
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <Inp type="number" value={form.recurring_day??25} onChange={e => setForm({...form,recurring_day:Math.min(28,Math.max(1,parseInt(e.target.value)||1))})} style={{ maxWidth:100 }}/>
              <span style={{ fontSize:12, color:"#999" }}>di ogni mese (1–28)</span>
            </div>
          </Field>
          <Field label="CATEGORIA">
            <Sel value={form.category_id||""} onChange={e => setForm({...form,category_id:e.target.value})}>
              <option value="">Nessuna categoria</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </Sel>
          </Field>
          <Field label="NOTE"><Inp value={form.note||""} onChange={e => setForm({...form,note:e.target.value})} placeholder="Opzionale..."/></Field>
          <Btn onClick={saveFixed} label={editItem ? "Salva modifiche" : "Aggiungi voce fissa"}/>
        </Modal>
      )}

      {/* Transfer */}
      {modal==="transfer" && (
        <Modal title="Trasferimento tra Conti" onClose={() => { setModal(null); setForm({}); }}>
          <div style={{ background:"#f0fff4", borderRadius:12, padding:"10px 14px", marginBottom:16, fontSize:12, color:"#10b981" }}>🔄 Il tasso di cambio viene applicato automaticamente</div>
          <Field label="DA CONTO">
            <Sel value={form.from_account_id||""} onChange={e => setForm({...form,from_account_id:e.target.value})}>
              <option value="">Seleziona</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name} ({a.currency})</option>)}
            </Sel>
          </Field>
          <Field label="A CONTO">
            <Sel value={form.to_account_id||""} onChange={e => setForm({...form,to_account_id:e.target.value})}>
              <option value="">Seleziona</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name} ({a.currency})</option>)}
            </Sel>
          </Field>
          <Field label={`IMPORTO (${accMap[form.from_account_id]?.currency||""})`}><Inp type="number" value={form.amount_from??""} onChange={e => setForm({...form,amount_from:e.target.value})} placeholder="0.00"/></Field>
          {form.from_account_id && form.to_account_id && accMap[form.from_account_id]?.currency !== accMap[form.to_account_id]?.currency && (
            <Field label="TASSO DI CAMBIO">
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <Inp type="number" value={form.rate??exchangeRate} onChange={e => setForm({...form,rate:e.target.value})} style={{ flex:1 }}/>
                <span style={{ fontSize:12, color:"#999", whiteSpace:"nowrap" }}>
                  = {accMap[form.to_account_id]?.currency} {fmtN((parseFloat(form.amount_from)||0)*(parseFloat(form.rate||exchangeRate)))}
                </span>
              </div>
            </Field>
          )}
          <Field label="DATA"><Inp type="date" value={form.date||TODAY} onChange={e => setForm({...form,date:e.target.value})}/></Field>
          <Field label="NOTE"><Inp value={form.note||""} onChange={e => setForm({...form,note:e.target.value})} placeholder="Es. Trasferimento mensile..."/></Field>
          <Btn onClick={saveTransfer} label="Registra Trasferimento" color="#10b981"/>
        </Modal>
      )}

      {/* Transfer calculator detail */}
      {modal==="calcTransfer" && calcTransfer && (
        <Modal title="📊 Calcolatore Trasferimento" onClose={() => setModal(null)}>
          <div style={{ fontSize:12, color:"#999", marginBottom:16 }}>Basato sulle spese fisse pianificate. Aggiornato al {TODAY}.</div>
          {[
            {title:`${calcTransfer.chAcc.icon} ${calcTransfer.chAcc.name} (CHF)`, rows:[{l:"Entrate fisse",v:calcTransfer.chIncome,c:"#10b981"},{l:"Uscite fisse",v:calcTransfer.chFixed,c:"#ef4444"},{l:"Surplus/Deficit",v:calcTransfer.chNet,c:calcTransfer.chNet>=0?"#10b981":"#ef4444"}]},
            {title:`${calcTransfer.itAcc.icon} ${calcTransfer.itAcc.name} (EUR)`, rows:[{l:"Entrate fisse",v:calcTransfer.itIncome,c:"#10b981"},{l:"Uscite fisse",v:calcTransfer.itFixed,c:"#ef4444"},{l:"Surplus/Deficit",v:calcTransfer.itNet,c:calcTransfer.itNet>=0?"#10b981":"#ef4444"}]},
          ].map(sec => (
            <div key={sec.title} style={{ background:"#f8f9fc", borderRadius:14, padding:16, marginBottom:12 }}>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>{sec.title}</div>
              {sec.rows.map(r => (
                <div key={r.l} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #eee" }}>
                  <span style={{ fontSize:12, color:"#666" }}>{r.l}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:r.c }}>{r.v>=0?"+":""}{fmtN(r.v)}</span>
                </div>
              ))}
            </div>
          ))}
          <div style={{ background: calcTransfer.itDeficit>0?"#fef3c7":"#d1fae5", borderRadius:14, padding:16, marginBottom:16 }}>
            <div style={{ fontSize:12, color:"#666", marginBottom:6 }}>
              {calcTransfer.itDeficit>0 ? "💸 Trasferimento necessario dal conto CH:" : "✅ Nessun trasferimento necessario"}
            </div>
            {calcTransfer.itDeficit>0 && <>
              <div style={{ fontSize:22, fontWeight:900, color:"#d97706" }}>CHF {fmtN(calcTransfer.transferCHF)}</div>
              <div style={{ fontSize:12, color:"#92400e", marginTop:4 }}>= € {fmtN(calcTransfer.itDeficit)} al tasso {fmtN(exchangeRate,4)}</div>
            </>}
          </div>
          <Btn onClick={() => { setModal("transfer"); setForm({ from_account_id:calcTransfer.chAcc.id, to_account_id:calcTransfer.itAcc.id, amount_from:calcTransfer.transferCHF.toFixed(2), date:TODAY, rate:exchangeRate }); }} label="🔄 Vai al Trasferimento" color="#10b981"/>
        </Modal>
      )}

      {/* Adjust account */}
      {modal==="adjustAccount" && (
        <Modal title="⚖️ Aggiusta Saldo Conto" onClose={() => { setModal(null); setForm({}); }}>
          <div style={{ background:"#fef3c7", borderRadius:12, padding:"10px 14px", marginBottom:16, fontSize:12, color:"#92400e" }}>
            Questo modifica il saldo iniziale del conto per correggere eventuali discrepanze.
          </div>
          <Field label="CONTO">
            <Sel value={form.account_id||""} onChange={e => setForm({...form, account_id:e.target.value, new_balance:accountBalance(e.target.value)})}>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name} ({a.currency})</option>)}
            </Sel>
          </Field>
          <Field label="Saldo attuale calcolato">
            <div style={{ fontSize:18, fontWeight:800, color:"#6366f1", padding:"8px 0" }}>{accMap[form.account_id]?.currency} {fmtN(accountBalance(form.account_id))}</div>
          </Field>
          <Field label="Nuovo saldo reale" hint="Inserisci il saldo reale del tuo conto bancario">
            <Inp type="number" value={form.new_balance??""} onChange={e => setForm({...form,new_balance:e.target.value})} placeholder="0.00"/>
          </Field>
          <Btn onClick={adjustAccount} label="Aggiusta Saldo" color="#f59e0b"/>
        </Modal>
      )}

      {/* Account */}
      {modal==="account" && (
        <Modal title={editItem ? "Modifica Conto" : "Nuovo Conto"} onClose={() => { setModal(null); setEditItem(null); setForm({}); }}>
          <Field label="NOME CONTO"><Inp value={form.name||""} onChange={e => setForm({...form,name:e.target.value})} placeholder="Es. Conto UBS, Conto Fineco..."/></Field>
          <Field label="VALUTA">
            <div style={{ display:"flex", gap:8 }}>
              {[["CHF","🇨🇭 Franco CHF"],["EUR","🇮🇹 Euro €"]].map(([v,l]) => (
                <button key={v} onClick={() => setForm({...form,currency:v})} style={{ flex:1, padding:"10px 0", border:`1.5px solid ${form.currency===v?"#6366f1":"#eee"}`, borderRadius:10, background:form.currency===v?"#6366f111":"#fff", color:form.currency===v?"#6366f1":"#bbb", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>{l}</button>
              ))}
            </div>
          </Field>
          <Field label="ICONA"><Inp value={form.icon||""} onChange={e => setForm({...form,icon:e.target.value})} placeholder="🏦"/></Field>
          <Field label="COLORE">
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <input type="color" value={form.color||"#6366f1"} onChange={e => setForm({...form,color:e.target.value})} style={{ width:44, height:44, border:"1.5px solid #eee", borderRadius:10, padding:2, cursor:"pointer" }}/>
              <span style={{ fontSize:13, color:"#999" }}>Colore del conto</span>
            </div>
          </Field>
          <Field label="SALDO INIZIALE" hint="Lascia 0 se parti da zero"><Inp type="number" value={form.balance_initial??""} onChange={e => setForm({...form,balance_initial:e.target.value})} placeholder="0.00"/></Field>
          <Btn onClick={saveAccount} label={editItem ? "Salva modifiche" : "Crea conto"}/>
        </Modal>
      )}

      {/* Category */}
      {modal==="cat" && (
        <Modal title={editItem ? "Modifica Categoria" : "Nuova Categoria"} onClose={() => { setModal(null); setEditItem(null); setForm({}); }}>
          <Field label="NOME"><Inp value={form.name||""} onChange={e => setForm({...form,name:e.target.value})} placeholder="Es. Spesa, Svago..."/></Field>
          <Field label="ICONA (emoji)"><Inp value={form.icon||""} onChange={e => setForm({...form,icon:e.target.value})} placeholder="📦"/></Field>
          <Field label="COLORE">
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <input type="color" value={form.color||"#6366f1"} onChange={e => setForm({...form,color:e.target.value})} style={{ width:44, height:44, border:"1.5px solid #eee", borderRadius:10, padding:2, cursor:"pointer" }}/>
            </div>
          </Field>
          <Field label="BUDGET MENSILE €" hint="0 = nessun limite"><Inp type="number" value={form.budget??""} onChange={e => setForm({...form,budget:e.target.value})} placeholder="0"/></Field>
          <Btn onClick={saveCat} label={editItem ? "Salva" : "Crea categoria"}/>
        </Modal>
      )}

      {/* Savings Goal */}
      {modal==="savingsGoal" && (
        <Modal title={editItem ? "Modifica Obiettivo" : "Nuovo Obiettivo di Risparmio"} onClose={() => { setModal(null); setEditItem(null); setForm({}); }}>
          <Field label="NOME"><Inp value={form.name||""} onChange={e => setForm({...form,name:e.target.value})} placeholder="Es. Vacanza, Macchina..."/></Field>
          <Field label="ICONA"><Inp value={form.icon||""} onChange={e => setForm({...form,icon:e.target.value})} placeholder="🎯"/></Field>
          <Field label="COLORE">
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <input type="color" value={form.color||"#10b981"} onChange={e => setForm({...form,color:e.target.value})} style={{ width:44, height:44, border:"1.5px solid #eee", borderRadius:10, padding:2, cursor:"pointer" }}/>
            </div>
          </Field>
          <Field label="VALUTA">
            <div style={{ display:"flex", gap:8 }}>
              {[["EUR","€ Euro"],["CHF","CHF Franco"]].map(([v,l]) => (
                <button key={v} onClick={() => setForm({...form,currency:v})} style={{ flex:1, padding:"9px 0", border:`1.5px solid ${(form.currency||"EUR")===v?"#10b981":"#eee"}`, borderRadius:10, background:(form.currency||"EUR")===v?"#10b98111":"#fff", color:(form.currency||"EUR")===v?"#10b981":"#bbb", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>{l}</button>
              ))}
            </div>
          </Field>
          <Field label="IMPORTO OBIETTIVO"><Inp type="number" value={form.target_amount??""} onChange={e => setForm({...form,target_amount:e.target.value})} placeholder="0.00"/></Field>
          <Field label="IMPORTO ATTUALE"><Inp type="number" value={form.current_amount??""} onChange={e => setForm({...form,current_amount:e.target.value})} placeholder="0.00"/></Field>
          <Field label="CONTO COLLEGATO">
            <Sel value={form.account_id||""} onChange={e => setForm({...form,account_id:e.target.value})}>
              <option value="">Nessun conto</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
            </Sel>
          </Field>
          <Field label="SCADENZA (opzionale)"><Inp type="date" value={form.deadline||""} onChange={e => setForm({...form,deadline:e.target.value})}/></Field>
          <Btn onClick={saveSavingsGoal} label={editItem ? "Salva modifiche" : "Crea obiettivo"} color="#10b981"/>
        </Modal>
      )}
    </Layout>
  );
}

// ─── AUTH PROVIDER ────────────────────────────────────────────────────────────
export default function App() {
  const configured = SUPABASE_URL !== "https://xxxx.supabase.co";
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const saved = localStorage.getItem("sb_session");
        if (!saved) { setChecking(false); return; }
        const s = JSON.parse(saved);
        // Verify token still valid
        const user = await sb.auth.getUser(s.access_token);
        if (user?.id) {
          setSession({ ...s, user });
        } else if (s.refresh_token) {
          // Try refresh
          const refreshed = await sb.auth.refreshToken(s.refresh_token);
          if (refreshed?.access_token) {
            const newSession = { access_token: refreshed.access_token, refresh_token: refreshed.refresh_token, user: refreshed.user };
            localStorage.setItem("sb_session", JSON.stringify(newSession));
            setSession(newSession);
          } else {
            localStorage.removeItem("sb_session");
          }
        } else {
          localStorage.removeItem("sb_session");
        }
      } catch { localStorage.removeItem("sb_session"); }
      setChecking(false);
    };
    if (configured) check();
    else setChecking(false);
  }, []);

  const signOut = useCallback(async () => {
    if (session?.access_token) await sb.auth.signOut(session.access_token);
    localStorage.removeItem("sb_session");
    setSession(null);
  }, [session]);

  if (!configured) return (
    <div style={{ minHeight:"100vh", background:"#f8f9fc", display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ maxWidth:380, textAlign:"center" }}>
        <div style={{ fontSize:48, marginBottom:16 }}>⚙️</div>
        <div style={{ fontSize:18, fontWeight:800, color:"#1a1a2e", marginBottom:12 }}>Credenziali mancanti</div>
        <div style={{ background:"#fff", borderRadius:16, padding:20, fontSize:13, color:"#666", lineHeight:1.7, boxShadow:"0 2px 12px #0001" }}>
          Apri <strong style={{ color:"#6366f1" }}>App.jsx</strong> e sostituisci <code>SUPABASE_URL</code> e <code>SUPABASE_KEY</code> con i valori dal tuo progetto Supabase.
        </div>
      </div>
    </div>
  );

  if (checking) return (
    <div style={{ minHeight:"100vh", background:"#f8f9fc", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12, fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ width:40, height:40, border:"3px solid #eee", borderTop:"3px solid #6366f1", borderRadius:"50%", animation:"spin 1s linear infinite" }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <AuthContext.Provider value={{ token: session?.access_token, user: session?.user, signOut }}>
      {session ? <BudgetApp/> : <AuthScreen onAuth={setSession}/>}
    </AuthContext.Provider>
  );
}