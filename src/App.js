import React from 'react';
import { useState, useEffect, useCallback } from 'react';

const MONTHS = [
  'Gennaio',
  'Febbraio',
  'Marzo',
  'Aprile',
  'Maggio',
  'Giugno',
  'Luglio',
  'Agosto',
  'Settembre',
  'Ottobre',
  'Novembre',
  'Dicembre',
];
const MONTHS_SHORT = [
  'Gen',
  'Feb',
  'Mar',
  'Apr',
  'Mag',
  'Giu',
  'Lug',
  'Ago',
  'Set',
  'Ott',
  'Nov',
  'Dic',
];
const COUNTRIES = ['CH', 'IT'];

const fmt = (n) =>
  Number(n).toLocaleString('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// ─── SETUP SCREEN ──────────────────────────────────────────────────────────────
function SetupScreen({ onSave }) {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#080812',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: "'Courier New', monospace",
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#0f0f23',
          border: '1px solid #2a2a5a',
          borderRadius: 20,
          padding: 32,
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 4 }}>⚙️</div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 900,
            color: '#a78bfa',
            marginBottom: 4,
          }}
        >
          Setup Supabase
        </div>
        <div
          style={{
            fontSize: 12,
            color: '#555',
            marginBottom: 28,
            lineHeight: 1.7,
          }}
        >
          1. Vai su <span style={{ color: '#60a5fa' }}>supabase.com</span> →
          crea progetto
          <br />
          2. Esegui lo SQL nel{' '}
          <strong style={{ color: '#f59e0b' }}>SQL Editor</strong>
          <br />
          3. Project Settings → API → incolla i valori qui sotto
        </div>

        <label
          style={{
            fontSize: 11,
            color: '#666',
            display: 'block',
            marginBottom: 6,
          }}
        >
          PROJECT URL
        </label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://xxxx.supabase.co"
          style={{
            width: '100%',
            background: '#0a0a1a',
            border: '1px solid #2a2a5a',
            borderRadius: 8,
            padding: '10px 12px',
            color: '#e0e0ff',
            fontFamily: "'Courier New', monospace",
            fontSize: 12,
            marginBottom: 14,
            boxSizing: 'border-box',
          }}
        />
        <label
          style={{
            fontSize: 11,
            color: '#666',
            display: 'block',
            marginBottom: 6,
          }}
        >
          ANON KEY
        </label>
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="eyJhbGciOi..."
          style={{
            width: '100%',
            background: '#0a0a1a',
            border: '1px solid #2a2a5a',
            borderRadius: 8,
            padding: '10px 12px',
            color: '#e0e0ff',
            fontFamily: "'Courier New', monospace",
            fontSize: 12,
            marginBottom: 24,
            boxSizing: 'border-box',
          }}
        />
        <button
          onClick={() => url && key && onSave(url.trim(), key.trim())}
          style={{
            width: '100%',
            padding: '12px 0',
            background:
              url && key
                ? 'linear-gradient(135deg, #4f46e5, #7c3aed)'
                : '#1a1a3a',
            border: 'none',
            borderRadius: 10,
            color: url && key ? '#fff' : '#444',
            fontWeight: 800,
            fontSize: 14,
            cursor: url && key ? 'pointer' : 'default',
            fontFamily: "'Courier New', monospace",
          }}
        >
          CONNETTI →
        </button>
      </div>
    </div>
  );
}

// ─── MODAL ─────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000000cc',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#0f0f23',
          border: '1px solid #2a2a5a',
          borderRadius: 20,
          padding: 24,
          width: '100%',
          maxWidth: 440,
          fontFamily: "'Courier New', monospace",
          maxHeight: '85vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: '#a78bfa' }}>
            {title}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#555',
              fontSize: 20,
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        style={{
          fontSize: 11,
          color: '#666',
          display: 'block',
          marginBottom: 6,
          letterSpacing: 1,
        }}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          width: '100%',
          background: '#0a0a1a',
          border: '1px solid #2a2a5a',
          borderRadius: 8,
          padding: '10px 12px',
          color: '#e0e0ff',
          fontFamily: "'Courier New', monospace",
          fontSize: 13,
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

function SaveBtn({ onClick, label = 'SALVA', color = '#4f46e5' }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        padding: '12px 0',
        background: `linear-gradient(135deg, ${color}, ${color}bb)`,
        border: 'none',
        borderRadius: 10,
        color: color === '#f59e0b' ? '#000' : '#fff',
        fontWeight: 800,
        fontSize: 14,
        cursor: 'pointer',
        fontFamily: "'Courier New', monospace",
      }}
    >
      {label}
    </button>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────────
function BudgetApp({ supaUrl, supaKey }) {
  const currentMonth = MONTHS[new Date().getMonth()];
  const [tab, setTab] = useState('overview');
  const [activeMonth, setActiveMonth] = useState(currentMonth);
  const [planned, setPlanned] = useState([]);
  const [variables, setVariables] = useState([]);
  const [configs, setConfigs] = useState({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({});

  const api = useCallback(
    (path, opts = {}) =>
      fetch(`${supaUrl}/rest/v1/${path}`, {
        headers: {
          apikey: supaKey,
          Authorization: `Bearer ${supaKey}`,
          'Content-Type': 'application/json',
          Prefer: opts.prefer || '',
        },
        ...opts,
      }),
    [supaUrl, supaKey]
  );

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [p, v, c] = await Promise.all([
        api('planned_items?order=country,name').then((r) => r.json()),
        api('variable_items?order=month,name').then((r) => r.json()),
        api('monthly_config?order=month').then((r) => r.json()),
      ]);
      setPlanned(Array.isArray(p) ? p : []);
      setVariables(Array.isArray(v) ? v : []);
      const cfgMap = {};
      if (Array.isArray(c))
        c.forEach((row) => {
          cfgMap[row.month] = row;
        });
      setConfigs(cfgMap);
    } catch {
      showToast('Errore connessione Supabase', false);
    }
    setLoading(false);
  }, [api]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Computed ─────────────────────────────────────────────────────────────────
  const plannedCH = planned.filter((i) => i.country === 'CH');
  const plannedIT = planned.filter((i) => i.country === 'IT');
  const totalCH = plannedCH.reduce((s, i) => s + Number(i.amount), 0);
  const totalIT = plannedIT.reduce((s, i) => s + Number(i.amount), 0);
  const totalPlanned = totalCH + totalIT;

  const monthVars = variables.filter((i) => i.month === activeMonth);
  const totalVar = monthVars.reduce((s, i) => s + Number(i.amount), 0);

  const cfg = configs[activeMonth] || {};
  const incomeCH = Number(cfg.income_ch || 0);
  const incomeIT = Number(cfg.income_it || 0);
  const savings = Number(cfg.savings || 0);
  const fixedInv = Number(cfg.fixed_inv || 0);
  const savingsVar = Number(cfg.savings_var || 0);

  const totalITExp = totalIT + totalVar;
  const toSend = incomeIT - totalITExp;
  const cash = incomeCH - totalCH + toSend - savings - fixedInv - savingsVar;

  // ── CRUD ─────────────────────────────────────────────────────────────────────
  const savePlanned = async () => {
    if (!form.name || form.amount === undefined || form.amount === '') return;
    const body = JSON.stringify({
      name: form.name,
      amount: parseFloat(form.amount),
      country: form.country || 'IT',
    });
    if (editItem) {
      await api(`planned_items?id=eq.${editItem.id}`, {
        method: 'PATCH',
        body,
        prefer: 'return=minimal',
      });
    } else {
      await api('planned_items', {
        method: 'POST',
        body,
        prefer: 'return=minimal',
      });
    }
    showToast(editItem ? 'Aggiornato ✓' : 'Aggiunto ✓');
    setModal(null);
    setEditItem(null);
    setForm({});
    loadAll();
  };

  const deletePlanned = async (id) => {
    await api(`planned_items?id=eq.${id}`, { method: 'DELETE' });
    showToast('Eliminato ✓');
    loadAll();
  };

  const saveVar = async () => {
    if (!form.name || form.amount === undefined || form.amount === '') return;
    const body = JSON.stringify({
      name: form.name,
      amount: parseFloat(form.amount),
      month: form.month || activeMonth,
    });
    if (editItem) {
      await api(`variable_items?id=eq.${editItem.id}`, {
        method: 'PATCH',
        body,
        prefer: 'return=minimal',
      });
    } else {
      await api('variable_items', {
        method: 'POST',
        body,
        prefer: 'return=minimal',
      });
    }
    showToast(editItem ? 'Aggiornato ✓' : 'Aggiunto ✓');
    setModal(null);
    setEditItem(null);
    setForm({});
    loadAll();
  };

  const deleteVar = async (id) => {
    await api(`variable_items?id=eq.${id}`, { method: 'DELETE' });
    showToast('Eliminato ✓');
    loadAll();
  };

  const saveConfig = async () => {
    const body = JSON.stringify({
      income_ch: parseFloat(form.income_ch || 0),
      income_it: parseFloat(form.income_it || 0),
      savings: parseFloat(form.savings || 0),
      fixed_inv: parseFloat(form.fixed_inv || 0),
      savings_var: parseFloat(form.savings_var || 0),
    });
    await api(`monthly_config?month=eq.${activeMonth}`, {
      method: 'PATCH',
      body,
      prefer: 'return=minimal',
    });
    showToast('Salvato ✓');
    setModal(null);
    setForm({});
    loadAll();
  };

  // ─── RENDER ────────────────────────────────────────────────────────────────
  if (loading)
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#080812',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Courier New', monospace",
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div
          style={{
            fontSize: 32,
            color: '#4f46e5',
            animation: 'spin 1s linear infinite',
          }}
        >
          ⟳
        </div>
        <div style={{ fontSize: 13, color: '#555' }}>
          Connessione al database...
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );

  const activeIdx = MONTHS.indexOf(activeMonth);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#080812',
        color: '#e0e0ff',
        fontFamily: "'Courier New', monospace",
        paddingBottom: 80,
      }}
    >
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:none } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .card { animation: fadeUp 0.25s ease both; }
        input:focus { outline: none; border-color: #4f46e5 !important; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: #2a2a5a; border-radius: 4px; }
      `}</style>

      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            background: toast.ok ? '#1a3a2a' : '#3a1a1a',
            border: `1px solid ${toast.ok ? '#34d39955' : '#f8717155'}`,
            borderRadius: 10,
            padding: '10px 20px',
            fontSize: 13,
            color: toast.ok ? '#34d399' : '#f87171',
            zIndex: 2000,
            animation: 'fadeUp 0.2s ease',
            whiteSpace: 'nowrap',
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Sticky header */}
      <div
        style={{
          background: 'linear-gradient(180deg, #0f0f23 0%, #080812 100%)',
          borderBottom: '1px solid #1a1a3a',
          padding: '18px 16px 0',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#a78bfa' }}>
              BUDGET CTRL
            </div>
            <div style={{ fontSize: 10, color: '#444', letterSpacing: 2 }}>
              CH + IT · {new Date().getFullYear()}
            </div>
          </div>
          <button
            onClick={() => {
              setForm({ ...cfg });
              setModal('config');
            }}
            style={{
              background: '#1a1a3a',
              border: '1px solid #2a2a5a',
              borderRadius: 8,
              padding: '8px 14px',
              color: '#888',
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: "'Courier New', monospace",
            }}
          >
            ⚙ {MONTHS_SHORT[activeIdx]}
          </button>
        </div>

        {/* Scrollable month row */}
        <div style={{ overflowX: 'auto', paddingBottom: 10 }}>
          <div style={{ display: 'flex', gap: 6, width: 'max-content' }}>
            {MONTHS.map((m, i) => (
              <button
                key={m}
                onClick={() => setActiveMonth(m)}
                style={{
                  padding: '8px 12px',
                  whiteSpace: 'nowrap',
                  background:
                    m === activeMonth
                      ? 'linear-gradient(135deg,#4f46e5,#7c3aed)'
                      : '#12122a',
                  border: m === activeMonth ? 'none' : '1px solid #2a2a4a',
                  borderRadius: 8,
                  color: m === activeMonth ? '#fff' : '#555',
                  fontWeight: m === activeMonth ? 700 : 400,
                  fontSize: 12,
                  cursor: 'pointer',
                  fontFamily: "'Courier New', monospace",
                  boxShadow: m === activeMonth ? '0 0 14px #4f46e544' : 'none',
                }}
              >
                {MONTHS_SHORT[i]}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #1a1a3a' }}>
          {[
            ['overview', 'Overview'],
            ['variabili', 'Variabili'],
            ['fisse', 'Fisse'],
          ].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              style={{
                flex: 1,
                padding: '10px 0',
                background: 'none',
                border: 'none',
                borderBottom:
                  k === tab ? '2px solid #a78bfa' : '2px solid transparent',
                color: k === tab ? '#a78bfa' : '#444',
                fontWeight: k === tab ? 700 : 400,
                fontSize: 12,
                cursor: 'pointer',
                fontFamily: "'Courier New', monospace",
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '18px 16px', maxWidth: 600, margin: '0 auto' }}>
        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
              }}
            >
              {[
                {
                  label: 'Income CH',
                  val: incomeCH,
                  cur: 'CHF',
                  color: '#34d399',
                  flag: '🇨🇭',
                },
                {
                  label: 'Income IT',
                  val: incomeIT,
                  cur: '€',
                  color: '#60a5fa',
                  flag: '🇮🇹',
                },
              ].map((k) => (
                <div
                  key={k.label}
                  className="card"
                  style={{
                    background: '#0f0f23',
                    border: `1px solid ${k.color}33`,
                    borderRadius: 14,
                    padding: '16px 14px',
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: '#555',
                      letterSpacing: 1.2,
                      marginBottom: 6,
                    }}
                  >
                    {k.flag} {k.label}
                  </div>
                  <div
                    style={{ fontSize: 19, fontWeight: 900, color: k.color }}
                  >
                    {k.cur} {fmt(k.val)}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
              }}
            >
              {[
                {
                  label: 'Spese Fisse',
                  val: totalPlanned,
                  color: '#f472b6',
                  icon: '📌',
                },
                {
                  label: 'Spese Variabili',
                  val: totalVar,
                  color: '#f59e0b',
                  icon: '📊',
                },
              ].map((k) => (
                <div
                  key={k.label}
                  className="card"
                  style={{
                    background: '#0f0f23',
                    border: `1px solid ${k.color}33`,
                    borderRadius: 14,
                    padding: '16px 14px',
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: '#555',
                      letterSpacing: 1.2,
                      marginBottom: 6,
                    }}
                  >
                    {k.icon} {k.label}
                  </div>
                  <div
                    style={{ fontSize: 19, fontWeight: 900, color: k.color }}
                  >
                    € {fmt(k.val)}
                  </div>
                </div>
              ))}
            </div>

            <div
              className="card"
              style={{
                background: '#0f0f23',
                border: '1px solid #2a2a5a',
                borderRadius: 16,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '12px 18px',
                  background: '#12122a',
                  fontSize: 11,
                  color: '#555',
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                }}
              >
                Riepilogo {activeMonth}
              </div>
              {[
                {
                  l: 'Spese IT (fisse + variabili)',
                  v: totalITExp,
                  c: '#f87171',
                  cur: '€',
                },
                { l: 'Spese CH (fisse)', v: totalCH, c: '#fb923c', cur: 'CHF' },
                {
                  l: 'Differenza IT (to send)',
                  v: toSend,
                  c: toSend >= 0 ? '#34d399' : '#f87171',
                  cur: '€',
                },
                {
                  l: 'Savings totali',
                  v: savings + fixedInv + savingsVar,
                  c: '#60a5fa',
                  cur: 'CHF',
                },
              ].map((r, i) => (
                <div
                  key={i}
                  style={{
                    padding: '12px 18px',
                    borderTop: '1px solid #1a1a3a',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: 12, color: '#666' }}>{r.l}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: r.c }}>
                    {r.cur} {fmt(r.v)}
                  </span>
                </div>
              ))}
              <div
                style={{
                  padding: '16px 18px',
                  borderTop: '2px solid #2a2a5a',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: cash >= 0 ? '#0a1f0a' : '#1f0a0a',
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 700, color: '#ccc' }}>
                  💵 CASH FINALE
                </span>
                <span
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    color: cash >= 0 ? '#34d399' : '#f87171',
                  }}
                >
                  CHF {fmt(cash)}
                </span>
              </div>
            </div>

            {/* Annual bar chart */}
            <div
              className="card"
              style={{
                background: '#0f0f23',
                border: '1px solid #2a2a5a',
                borderRadius: 16,
                padding: '16px 18px',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: '#555',
                  letterSpacing: 1.5,
                  marginBottom: 14,
                }}
              >
                VARIABILI — ANNO COMPLETO
              </div>
              {MONTHS.map((m, i) => {
                const tot = variables
                  .filter((v) => v.month === m)
                  .reduce((s, v) => s + Number(v.amount), 0);
                const maxTot = Math.max(
                  ...MONTHS.map((mx) =>
                    variables
                      .filter((v) => v.month === mx)
                      .reduce((s, v) => s + Number(v.amount), 0)
                  ),
                  1
                );
                const pct = Math.max(0, (tot / maxTot) * 100);
                return (
                  <div key={m} style={{ marginBottom: 8 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          color: m === activeMonth ? '#a78bfa' : '#444',
                          fontWeight: m === activeMonth ? 700 : 400,
                        }}
                      >
                        {MONTHS_SHORT[i]}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: tot > 0 ? '#f59e0b' : '#2a2a4a',
                        }}
                      >
                        {tot > 0 ? `€ ${fmt(tot)}` : '—'}
                      </span>
                    </div>
                    <div
                      style={{
                        background: '#1a1a3a',
                        borderRadius: 4,
                        height: 5,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background:
                            m === activeMonth
                              ? 'linear-gradient(90deg,#4f46e5,#a78bfa)'
                              : '#2a2a5a',
                          borderRadius: 4,
                          transition: 'width 0.5s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VARIABILI */}
        {tab === 'variabili' && (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: '#555' }}>{activeMonth}</div>
                <div
                  style={{ fontSize: 22, fontWeight: 900, color: '#f59e0b' }}
                >
                  € {fmt(totalVar)}
                </div>
              </div>
              <button
                onClick={() => {
                  setForm({ month: activeMonth });
                  setEditItem(null);
                  setModal('add-var');
                }}
                style={{
                  background: 'linear-gradient(135deg,#f59e0b,#d97706)',
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 16px',
                  color: '#000',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer',
                  fontFamily: "'Courier New', monospace",
                }}
              >
                + Aggiungi
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {monthVars.length === 0 && (
                <div
                  style={{
                    textAlign: 'center',
                    color: '#333',
                    padding: '50px 0',
                    fontSize: 13,
                  }}
                >
                  Nessuna spesa per {activeMonth}
                </div>
              )}
              {monthVars.map((item) => (
                <div
                  key={item.id}
                  className="card"
                  style={{
                    background: '#0f0f23',
                    border: `1px solid ${
                      Number(item.amount) < 0 ? '#34d39933' : '#2a2a4a'
                    }`,
                    borderRadius: 12,
                    padding: '14px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{ fontSize: 13, color: '#ccc', marginBottom: 4 }}
                    >
                      {item.name}
                    </div>
                    <div
                      style={{
                        height: 3,
                        width: '55%',
                        background: '#1a1a3a',
                        borderRadius: 2,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(
                            100,
                            (Math.abs(Number(item.amount)) / 600) * 100
                          )}%`,
                          height: '100%',
                          background:
                            Number(item.amount) < 0 ? '#34d399' : '#f59e0b',
                        }}
                      />
                    </div>
                  </div>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: Number(item.amount) < 0 ? '#34d399' : '#f59e0b',
                      }}
                    >
                      {Number(item.amount) < 0 ? '+' : ''}€{' '}
                      {fmt(Math.abs(Number(item.amount)))}
                    </div>
                    <button
                      onClick={() => {
                        setForm({
                          name: item.name,
                          amount: item.amount,
                          month: item.month,
                        });
                        setEditItem(item);
                        setModal('add-var');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#444',
                        cursor: 'pointer',
                        fontSize: 15,
                        padding: 4,
                      }}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => deleteVar(item.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#444',
                        cursor: 'pointer',
                        fontSize: 15,
                        padding: 4,
                      }}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FISSE */}
        {tab === 'fisse' && (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginBottom: 14,
              }}
            >
              <button
                onClick={() => {
                  setForm({ country: 'IT' });
                  setEditItem(null);
                  setModal('add-planned');
                }}
                style={{
                  background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 16px',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer',
                  fontFamily: "'Courier New', monospace",
                }}
              >
                + Aggiungi
              </button>
            </div>

            {[
              {
                label: '🇨🇭 SVIZZERA',
                country: 'CH',
                items: plannedCH,
                total: totalCH,
                color: '#34d399',
                cur: 'CHF',
              },
              {
                label: '🇮🇹 ITALIA',
                country: 'IT',
                items: plannedIT,
                total: totalIT,
                color: '#60a5fa',
                cur: '€',
              },
            ].map(({ label, items, total, color, cur, country }) => (
              <div
                key={country}
                className="card"
                style={{
                  background: '#0f0f23',
                  border: `1px solid ${color}33`,
                  borderRadius: 16,
                  overflow: 'hidden',
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    padding: '14px 18px',
                    background: `${color}11`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color }}>
                    {label}
                  </span>
                  <span style={{ fontSize: 18, fontWeight: 900, color }}>
                    {cur} {fmt(total)}
                  </span>
                </div>
                {items.length === 0 && (
                  <div
                    style={{
                      padding: '20px 18px',
                      color: '#333',
                      fontSize: 12,
                    }}
                  >
                    Nessuna voce
                  </div>
                )}
                {items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: '12px 18px',
                      borderTop: '1px solid #1a1a3a',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: 13, color: '#888' }}>
                      {item.name}
                    </span>
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                    >
                      <span
                        style={{ fontSize: 14, color: '#ddd', fontWeight: 600 }}
                      >
                        {fmt(Number(item.amount))}
                      </span>
                      <button
                        onClick={() => {
                          setForm({
                            name: item.name,
                            amount: item.amount,
                            country: item.country,
                          });
                          setEditItem(item);
                          setModal('add-planned');
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#444',
                          cursor: 'pointer',
                          fontSize: 14,
                          padding: 2,
                        }}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deletePlanned(item.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#444',
                          cursor: 'pointer',
                          fontSize: 14,
                          padding: 2,
                        }}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODALS */}
      {modal === 'add-planned' && (
        <Modal
          title={editItem ? 'Modifica Spesa Fissa' : 'Nuova Spesa Fissa'}
          onClose={() => {
            setModal(null);
            setEditItem(null);
            setForm({});
          }}
        >
          <InputField
            label="NOME"
            value={form.name || ''}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Es. Netflix"
          />
          <InputField
            label="IMPORTO"
            type="number"
            value={form.amount ?? ''}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="0.00"
          />
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                fontSize: 11,
                color: '#666',
                display: 'block',
                marginBottom: 8,
              }}
            >
              PAESE
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {COUNTRIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setForm({ ...form, country: c })}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    background:
                      form.country === c
                        ? c === 'CH'
                          ? '#1a3a2a'
                          : '#1a2a3a'
                        : '#0a0a1a',
                    border: `1px solid ${
                      form.country === c
                        ? c === 'CH'
                          ? '#34d399'
                          : '#60a5fa'
                        : '#2a2a5a'
                    }`,
                    borderRadius: 8,
                    color:
                      form.country === c
                        ? c === 'CH'
                          ? '#34d399'
                          : '#60a5fa'
                        : '#444',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: "'Courier New', monospace",
                  }}
                >
                  {c === 'CH' ? '🇨🇭 CH' : '🇮🇹 IT'}
                </button>
              ))}
            </div>
          </div>
          <SaveBtn onClick={savePlanned} />
        </Modal>
      )}

      {modal === 'add-var' && (
        <Modal
          title={editItem ? 'Modifica Spesa' : 'Nuova Spesa Variabile'}
          onClose={() => {
            setModal(null);
            setEditItem(null);
            setForm({});
          }}
        >
          <InputField
            label="NOME"
            value={form.name || ''}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Es. Dentista"
          />
          <InputField
            label="IMPORTO € (negativo = rimborso/entrata)"
            type="number"
            value={form.amount ?? ''}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="0.00"
          />
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                fontSize: 11,
                color: '#666',
                display: 'block',
                marginBottom: 8,
              }}
            >
              MESE
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {MONTHS.map((m, i) => (
                <button
                  key={m}
                  onClick={() => setForm({ ...form, month: m })}
                  style={{
                    padding: '7px 10px',
                    background: form.month === m ? '#1e1e4a' : '#0a0a1a',
                    border: `1px solid ${
                      form.month === m ? '#4f46e5' : '#2a2a5a'
                    }`,
                    borderRadius: 7,
                    color: form.month === m ? '#a78bfa' : '#444',
                    fontWeight: form.month === m ? 700 : 400,
                    cursor: 'pointer',
                    fontFamily: "'Courier New', monospace",
                    fontSize: 11,
                  }}
                >
                  {MONTHS_SHORT[i]}
                </button>
              ))}
            </div>
          </div>
          <SaveBtn onClick={saveVar} color="#f59e0b" />
        </Modal>
      )}

      {modal === 'config' && (
        <Modal
          title={`Configura ${activeMonth}`}
          onClose={() => {
            setModal(null);
            setForm({});
          }}
        >
          <InputField
            label="INCOME CH (CHF)"
            type="number"
            value={form.income_ch ?? cfg.income_ch ?? ''}
            onChange={(e) => setForm({ ...form, income_ch: e.target.value })}
            placeholder="8990"
          />
          <InputField
            label="INCOME IT (€)"
            type="number"
            value={form.income_it ?? cfg.income_it ?? ''}
            onChange={(e) => setForm({ ...form, income_it: e.target.value })}
            placeholder="900"
          />
          <InputField
            label="SAVINGS"
            type="number"
            value={form.savings ?? cfg.savings ?? ''}
            onChange={(e) => setForm({ ...form, savings: e.target.value })}
            placeholder="0"
          />
          <InputField
            label="FIXED INVESTMENT"
            type="number"
            value={form.fixed_inv ?? cfg.fixed_inv ?? ''}
            onChange={(e) => setForm({ ...form, fixed_inv: e.target.value })}
            placeholder="0"
          />
          <InputField
            label="SAVINGS VARIABILE"
            type="number"
            value={form.savings_var ?? cfg.savings_var ?? ''}
            onChange={(e) => setForm({ ...form, savings_var: e.target.value })}
            placeholder="0"
          />
          <SaveBtn onClick={saveConfig} />
        </Modal>
      )}
    </div>
  );
}

// ─── ROOT ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [creds, setCreds] = useState(() => {
    try {
      const saved = localStorage.getItem('sb_budget_creds');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleSave = (url, key) => {
    const c = { url, key };
    localStorage.setItem('sb_budget_creds', JSON.stringify(c));
    setCreds(c);
  };

  if (!creds) return <SetupScreen onSave={handleSave} />;
  return <BudgetApp supaUrl={creds.url} supaKey={creds.key} />;
}
