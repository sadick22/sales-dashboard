import React, { useState, useEffect, useRef, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from "recharts";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, doc, setDoc, onSnapshot } from "firebase/firestore";

// ─── FIREBASE ──────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCYlKUGPncBMxs6ga2wVa9pxj_dFS5vyXs",
  authDomain: "sales-dashboard-f3e57.firebaseapp.com",
  projectId: "sales-dashboard-f3e57",
  storageBucket: "sales-dashboard-f3e57.firebasestorage.app",
  messagingSenderId: "208227630609",
  appId: "1:208227630609:web:77877cddc3b4a1c400bbb0"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ─── THURSDAY DATE GENERATION ──────────────────────────────────────
function getQuarterThursdays(year, quarter) {
  const startMonth = (quarter - 1) * 3;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 3, 0);
  const thursdays = [];
  const d = new Date(start);
  while (d.getDay() !== 4) d.setDate(d.getDate() + 1);
  while (d <= end) {
    thursdays.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return thursdays;
}

// Custom start date: May 7, 2026 through end of Q2 (June 25)
function getCustomThursdays() {
  const startDate = new Date(2026, 4, 7); // May 7, 2026 (month is 0-indexed)
  const endDate = new Date(2026, 5, 30); // End of June 2026
  const thursdays = [];
  const d = new Date(startDate);
  // Ensure we start on a Thursday
  while (d.getDay() !== 4) d.setDate(d.getDate() + 1);
  while (d <= endDate) {
    thursdays.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return thursdays;
}

function formatThursday(d) {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function formatThursdayFull(d) {
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

function getCurrentQuarter() {
  const now = new Date();
  return Math.floor(now.getMonth() / 3) + 1;
}

function getCurrentWeekIndex(thursdays) {
  const now = new Date();
  now.setHours(0,0,0,0);
  for (let i = thursdays.length - 1; i >= 0; i--) {
    if (now >= thursdays[i]) return i;
  }
  return 0;
}

function getMonthFromThursday(d) {
  return d.getMonth();
}

// Get which week number within a month this Thursday is (1-based)
function getWeekOfMonth(thursday, allThursdays) {
  const m = thursday.getMonth();
  let count = 0;
  for (const t of allThursdays) {
    if (t.getMonth() === m) {
      count++;
      if (t.getTime() === thursday.getTime()) return count;
    }
  }
  return 1;
}

// Get the previous Thursday's label for the "Previous" column header
function getPrevWeekLabel(wi, thursdays) {
  if (wi <= 0) return "Opening";
  return `W/E ${formatThursday(thursdays[wi - 1])}`;
}

// Get the week sales label like "Week 1 Sales", "Week 2 Sales" etc.
function getWeekSalesLabel(wi, thursdays) {
  const t = thursdays[wi];
  const weekNum = getWeekOfMonth(t, thursdays);
  return `Week ${weekNum} Sales`;
}

const YEAR = new Date().getFullYear();
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function getCurrentQuarterNum() {
  return Math.floor(new Date().getMonth() / 3) + 1;
}

// Get months for any quarter (0-indexed)
function getQuarterMonths(q) {
  const start = (q - 1) * 3;
  return [start, start + 1, start + 2];
}

// Get Thursdays for any quarter
function getQThursdays(year, q) {
  const startMonth = (q - 1) * 3;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 3, 0);
  const thursdays = [];
  const d = new Date(start);
  while (d.getDay() !== 4) d.setDate(d.getDate() + 1);
  while (d <= end) {
    thursdays.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return thursdays;
}

// Legacy constants for backward compat with stored data (May 7 - Jun 25 custom range)
const LEGACY_THURSDAYS = getCustomThursdays();
const LEGACY_LABELS = LEGACY_THURSDAYS.map(formatThursday);
const LEGACY_NUM_WEEKS = LEGACY_THURSDAYS.length;
const QUARTER_MONTHS = [4, 5]; // Legacy: May and June only

// Dynamic helpers
const makeEmptyWeeksForQ = (q) => new Array(getQThursdays(YEAR, q).length).fill(0);
const makeEmptySalesForQ = (q) => getQThursdays(YEAR, q).map(() => ({ prev: 0, current: 0, total: 0 }));

// ─── DEFAULT DATA ──────────────────────────────────────────────────
const makeEmptyWeeks = () => new Array(LEGACY_NUM_WEEKS).fill(0);
const makeEmptySales = () => LEGACY_THURSDAYS.map(() => ({ prev: 0, current: 0, total: 0 }));

const DEFAULT_AGENTS = [
  { id: "a1", name: "Seyf", image: "", target: 40000 },
  { id: "a2", name: "Devon", image: "", target: 40000 },
  { id: "a3", name: "Farrukh", image: "", target: 40000 },
  { id: "a4", name: "Anand", image: "", target: 40000 },
  { id: "a5", name: "Ahmed", image: "", target: 40000 },
  { id: "a6", name: "Khaled", image: "", target: 40000 },
  { id: "a7", name: "Akram", image: "", target: 40000 },
  { id: "a8", name: "Sophia", image: "", target: 40000 },
  { id: "a9", name: "Leo", image: "", target: 40000 },
  { id: "a10", name: "Abdullah", image: "", target: 40000 },
  { id: "a11", name: "Firoz", image: "", target: 40000 },
  { id: "a12", name: "Gerrit", image: "", target: 40000 },
].map(a => ({
  ...a,
  hideFromTV: false,
  weeklyLeads: makeEmptyWeeks(),
  weeklyCollections: makeEmptyWeeks(),
  weeklySales: makeEmptySales(),
}));

const DEFAULT_COMPANY = {
  q1Target: 1175000, q1Done: 463443,
  q2Target: 1175000,
  q3Target: 1175000, q3Done: 0,
  q4Target: 1175000, q4Done: 0,
};

// ─── COMPUTED HELPERS ──────────────────────────────────────────────
const sumArr = (arr) => (arr || []).reduce((s, v) => s + (typeof v === "number" ? v : 0), 0);
const getMonthlyCollection = (agent) => sumArr(agent.weeklyCollections);
const getMonthlyLeads = (agent) => sumArr(agent.weeklyLeads);
const getMonthlySales = (agent) => (agent.weeklySales || []).reduce((s, w) => s + (w.total || 0), 0);

// Get monthly breakdown by month index — uses LEGACY thursdays for stored data
const getMonthBreakdown = (agent, field) => {
  const result = {};
  QUARTER_MONTHS.forEach(m => result[m] = 0);
  LEGACY_THURSDAYS.forEach((t, i) => {
    const m = getMonthFromThursday(t);
    if (field === "leads") result[m] = (result[m]||0) + ((agent.weeklyLeads || [])[i] || 0);
    else if (field === "collections") result[m] = (result[m]||0) + ((agent.weeklyCollections || [])[i] || 0);
    else if (field === "sales") result[m] = (result[m]||0) + (((agent.weeklySales || [])[i] || {}).total || 0);
  });
  return result;
};

// Pipeline for any quarter — Q2 uses backfill + weekly, others use monthly data when available
const calcPipeline = (agents, q, aprilBackfill = {}, quarterMonthlyData = {}, quarterWeekly = {}) => {
  const qMonths = getQuarterMonths(q);
  const result = {};
  qMonths.forEach(m => {
    let leads = 0, sales = 0, collections = 0;
    agents.forEach(a => {
      const md = getAgentMonthData(a, m, aprilBackfill, quarterMonthlyData, quarterWeekly);
      leads += md.leads;
      sales += md.sales;
      collections += md.collections;
    });
    const ratio = sales > 0 ? Math.round((collections / sales) * 100) : 0;
    result[MONTH_NAMES[m].toLowerCase()] = { leads, sales, collections, ratio };
  });
  return result;
};

// Get total collection for selected quarter
const getQuarterTotal = (agents, q, aprilBackfill = {}, monthlyData = {}, quarterWeekly = {}) => {
  const qMonths = getQuarterMonths(q);
  let total = 0;
  agents.forEach(a => {
    qMonths.forEach(m => {
      const md = getAgentMonthData(a, m, aprilBackfill, monthlyData, quarterWeekly);
      total += md.collections;
    });
  });
  return total;
};

// Get quarter target from company data
const getQuarterTarget = (company, q) => {
  return company[`q${q}Target`] || 0;
};

// Get quarter done from company data (for completed quarters)
const getQuarterDone = (company, q) => {
  return company[`q${q}Done`] || 0;
};

// ─── MONTH-SPECIFIC HELPERS ────────────────────────────────────────
// Get agent's data for a specific month from weekly arrays + monthly overrides + april backfill
const getAgentMonthData = (agent, monthIdx, aprilBackfill = {}, monthlyData = {}, quarterWeekly = {}) => {
  // Check monthly overrides first
  const mKey = `m${monthIdx}`;
  const override = monthlyData[mKey] && monthlyData[mKey][agent.id];
  if (override) return { collections: override.collections || 0, sales: override.sales || 0, leads: override.leads || 0, source: "monthly" };

  // April uses backfill
  if (monthIdx === 3) {
    const bf = aprilBackfill[agent.id] || {};
    return { collections: bf.collections || 0, sales: bf.sales || 0, leads: bf.leads || 0, source: "backfill" };
  }

  // May/June (Q2): derive from legacy weekly data on agents
  if (monthIdx === 4 || monthIdx === 5) {
    let collections = 0, sales = 0, leads = 0;
    LEGACY_THURSDAYS.forEach((t, i) => {
      if (t.getMonth() === monthIdx) {
        collections += (agent.weeklyCollections || [])[i] || 0;
        sales += ((agent.weeklySales || [])[i] || {}).total || 0;
        leads += (agent.weeklyLeads || [])[i] || 0;
      }
    });
    return { collections, sales, leads, source: "weekly" };
  }

  // Other quarters: derive from quarterWeekly data
  const q = Math.floor(monthIdx / 3) + 1;
  const qKey = `q${q}`;
  const qData = quarterWeekly[qKey] && quarterWeekly[qKey][agent.id];
  if (!qData) return { collections: 0, sales: 0, leads: 0, source: "none" };

  const qThursdays = getQThursdays(YEAR, q);
  let collections = 0, sales = 0, leads = 0;
  qThursdays.forEach((t, i) => {
    if (t.getMonth() === monthIdx) {
      collections += (qData.collections || [])[i] || 0;
      sales += ((qData.sales || [])[i] || {}).total || 0;
      leads += (qData.leads || [])[i] || 0;
    }
  });
  return { collections, sales, leads, source: "weekly" };
};

// Get Thursdays within a specific month (supports Q2 legacy + other quarters)
const getMonthThursdays = (monthIdx, q) => {
  const isQ2 = q === 2 || q === undefined;
  const thursdays = isQ2 ? LEGACY_THURSDAYS : getQThursdays(YEAR, q || Math.floor(monthIdx / 3) + 1);
  const indices = [];
  const labels = [];
  thursdays.forEach((t, i) => {
    if (t.getMonth() === monthIdx) {
      indices.push(i);
      labels.push(formatThursday(t));
    }
  });
  return { indices, labels, thursdays };
};

// ─── COLORS & UTILS ────────────────────────────────────────────────
const C = {
  bg: "#0a0e17", card: "#111827", cardAlt: "#1a2235",
  accent: "#00d4ff", success: "#10b981", warning: "#f59e0b", danger: "#ef4444",
  text: "#e2e8f0", textDim: "#64748b", border: "#1e293b",
  gold: "#fbbf24", purple: "#a78bfa", pink: "#f472b6",
};
const TRIO = ["#00d4ff", "#a78bfa", "#10b981"];
const tri = (i) => TRIO[i % 3];
const fmt = (n) => new Intl.NumberFormat("en-QA").format(n);
const pct = (d, t) => t > 0 ? Math.round((d / t) * 100) : 0;
const initials = (n) => n.split(" ").map(x => x[0]).join("").toUpperCase();
const trend = (cur, prev) => {
  if (cur > prev) return { icon: "▲", color: C.success, label: "increase" };
  if (cur < prev) return { icon: "▼", color: C.danger, label: "decrease" };
  return { icon: "●", color: C.textDim, label: "no change" };
};

// ─── STYLES ────────────────────────────────────────────────────────
// Inject keyframe animation for gold shimmer
if (typeof document !== 'undefined' && !document.getElementById('sd-animations')) {
  const styleEl = document.createElement('style');
  styleEl.id = 'sd-animations';
  styleEl.textContent = `
    @keyframes goldShimmer {
      0% { box-shadow: 0 0 4px rgba(251,191,36,0.2); }
      50% { box-shadow: 0 0 12px rgba(251,191,36,0.4), 0 0 24px rgba(251,191,36,0.1); }
      100% { box-shadow: 0 0 4px rgba(251,191,36,0.2); }
    }
    @keyframes starPulse {
      0% { transform: scale(1); opacity: 0.8; }
      50% { transform: scale(1.2); opacity: 1; }
      100% { transform: scale(1); opacity: 0.8; }
    }
  `;
  document.head.appendChild(styleEl);
}

const ST = {
  app: { minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "Arial, Helvetica, sans-serif" },
  nav: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 100 },
  navBtn: (a) => ({ padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: a ? C.accent : "rgba(255,255,255,0.06)", color: a ? "#000" : C.text, fontFamily: "Arial" }),
  page: { padding: "20px 24px", maxWidth: 1920, margin: "0 auto" },
  grid: (c) => ({ display: "grid", gridTemplateColumns: `repeat(${c}, 1fr)`, gap: 16 }),
  card: { background: C.card, borderRadius: 12, padding: 20, border: `1px solid ${C.border}`, position: "relative", overflow: "hidden" },
  glow: { position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${C.accent}, transparent)` },
  title: { fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.5px", color: C.textDim, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 },
  big: { fontSize: 32, fontWeight: 800, letterSpacing: "-1px" },
  badge: (c) => ({ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${c}18`, color: c }),
  barBg: { height: 8, borderRadius: 99, background: "#334155", overflow: "hidden" },
  barFill: (p, c) => ({ height: "100%", borderRadius: 99, width: `${Math.min(p, 100)}%`, background: c, transition: "width 1s ease", boxShadow: `0 0 12px ${c}40` }),
  row: (c) => ({ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.02)", marginBottom: 6, borderLeft: `3px solid ${c}` }),
  av: (c) => ({ width: 40, height: 40, borderRadius: "50%", background: `linear-gradient(135deg, ${c}, ${c}88)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: "#fff", flexShrink: 0 }),
  avImg: { width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 },
  table: { width: "100%", borderCollapse: "separate", borderSpacing: "0 4px" },
  th: { padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", color: C.textDim },
  td: { padding: "12px 14px", fontSize: 14, background: "rgba(255,255,255,0.02)", fontWeight: 500, color: C.text },
  input: { width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.cardAlt, color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "Arial" },
  inputSm: { width: "100%", padding: "8px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.cardAlt, color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "Arial" },
  inputDisabled: { width: "100%", padding: "8px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.accent, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "Arial", fontWeight: 700 },
  btn: (c = C.accent) => ({ padding: "10px 20px", borderRadius: 8, border: "none", background: c, color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "Arial" }),
  btnO: { padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.text, fontSize: 13, cursor: "pointer" },
  sel: { padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.cardAlt, color: C.text, fontSize: 14, outline: "none", fontFamily: "Arial" },
  modal: { position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" },
  mc: { background: C.card, borderRadius: 16, padding: 28, border: `1px solid ${C.border}`, width: "90%", maxWidth: 600, maxHeight: "85vh", overflowY: "auto" },
  mcWide: { background: C.card, borderRadius: 16, padding: 28, border: `1px solid ${C.border}`, width: "95%", maxWidth: 1100, maxHeight: "90vh", overflowY: "auto" },
};

// ─── SUMMARY CARD ──────────────────────────────────────────────────
function SCard({ title, value, sub, icon, color = C.accent }) {
  return (<div style={ST.card}><div style={ST.glow} /><div style={ST.title}>{icon && <span style={{ fontSize: 16 }}>{icon}</span>}{title}</div><div style={{ ...ST.big, color }}>{value}</div>{sub && <div style={{ marginTop: 6, fontSize: 13, color: C.textDim }}>{sub}</div>}</div>);
}

// ─── PROGRESS RING ─────────────────────────────────────────────────
function Ring({ percent, size = 120, stroke = 10, color = C.accent }) {
  const r = (size - stroke) / 2, circ = 2 * Math.PI * r, off = circ - (Math.min(percent, 100) / 100) * circ;
  return (<svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} /><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round" style={{ transition: "stroke-dashoffset 1.5s ease" }} /><text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central" fill={C.text} fontSize={size*0.22} fontWeight="800" style={{ transform: "rotate(90deg)", transformOrigin: "center" }}>{percent}%</text></svg>);
}

// ─── AGENT CARD (Redesigned — Collections & Sales equal) ───────────
function AgentCard({ agent, idx, aprilBackfill = {}, selectedMonth, monthlyData = {} }) {
  const c = tri(idx);
  // Use month-specific data if available (passed as _month* props), otherwise derive
  const md = agent._monthCol !== undefined
    ? { collections: agent._monthCol, sales: agent._monthSales, leads: agent._monthLeads }
    : getAgentMonthData(agent, selectedMonth || new Date().getMonth(), aprilBackfill, monthlyData);
  const col = md.collections;
  const sales = md.sales;
  const leads = md.leads;
  const p = pct(col, agent.target);
  const exceeded = col > agent.target;
  const diff = agent.target - col;
  const shimmerStyle = exceeded ? { animation: 'goldShimmer 3s ease-in-out infinite', border: `1px solid ${C.gold}40` } : {};
  return (
    <div style={{ background: C.card, borderRadius: 12, padding: 14, border: `1px solid ${C.border}`, ...shimmerStyle }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        {agent.image ? <img src={agent.image} alt={agent.name} style={ST.avImg} /> : <div style={ST.av(c)}>{initials(agent.name)}</div>}
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: "#f1f5f9" }}>
            {agent.name} {exceeded && <span style={{ animation: 'starPulse 2s ease-in-out infinite', display: 'inline-block', fontSize: 12 }}>⭐</span>}
          </span>
          <div style={{ fontSize: 11, color: C.textDim }}>Target: {fmt(agent.target)} QAR</div>
        </div>
        <div style={{ ...ST.badge(p >= 100 ? C.success : p >= 50 ? C.accent : C.warning) }}>{p}%</div>
      </div>
      {/* Two big metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
        <div style={{ background: C.cardAlt, borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: C.textDim, marginBottom: 2 }}>💰 Collections</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: exceeded ? C.gold : c }}>{fmt(col)}</div>
          <div style={{ fontSize: 9, color: C.textDim }}>QAR</div>
        </div>
        <div style={{ background: C.cardAlt, borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: C.textDim, marginBottom: 2 }}>📈 Sales</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.success }}>{fmt(sales)}</div>
          <div style={{ fontSize: 9, color: C.textDim }}>count</div>
        </div>
      </div>
      {/* Progress bar */}
      <div style={ST.barBg}><div style={ST.barFill(p, exceeded ? C.gold : c)} /></div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: C.textDim }}>
        <span>Leads: {leads}</span>
        {exceeded ? (
          <span style={{ color: C.success, fontWeight: 600 }}>🎯 +{fmt(Math.abs(diff))} exceeded</span>
        ) : col === agent.target ? (
          <span style={{ color: C.success, fontWeight: 600 }}>✓ Target reached!</span>
        ) : (
          <span style={{ color: C.warning }}>{fmt(Math.abs(diff))} remaining</span>
        )}
      </div>
    </div>
  );
}

// ─── TV SLIDES ─────────────────────────────────────────────────────
function TVAll({ agents, tvDisplayMonth, aprilBackfill = {}, monthlyData = {}, quarterWeekly = {} }) {
  const displayMonth = tvDisplayMonth !== undefined ? tvDisplayMonth : new Date().getMonth();
  const withMonthData = agents.map(a => {
    const md = getAgentMonthData(a, displayMonth, aprilBackfill, monthlyData, quarterWeekly);
    return { ...a, _monthCol: md.collections, _monthSales: md.sales, _monthLeads: md.leads };
  });
  const sorted = [...withMonthData].sort((a, b) => b._monthCol - a._monthCol);
  return (<div style={{ width: "100%", maxWidth: 1600 }}><h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 20, textAlign: "center", color: C.accent }}>📊 Agent Performance — {MONTH_NAMES[displayMonth]} {YEAR}</h2><div style={ST.grid(3)}>{sorted.map((a, i) => <AgentCard key={a.id} agent={a} idx={i} aprilBackfill={aprilBackfill} selectedMonth={displayMonth} monthlyData={monthlyData} />)}</div></div>);
}

function TVAgent({ agent, idx, company, aprilBackfill = {}, monthlyData = {}, tvDisplayMonth, quarterWeekly = {} }) {
  const c = tri(idx);
  const displayMonth = tvDisplayMonth !== undefined ? tvDisplayMonth : new Date().getMonth();
  // Get the SELECTED MONTH's data for big display
  const md = getAgentMonthData(agent, displayMonth, aprilBackfill, monthlyData, quarterWeekly);
  const col = md.collections;
  const sales = md.sales;
  const leads = md.leads;
  const p = pct(col, agent.target);
  const exceeded = col > agent.target;
  const diff = agent.target - col;
  const ringColor = exceeded ? C.gold : c;
  const currentQ = Math.floor(displayMonth / 3) + 1;
  const currentQMonths = getQuarterMonths(currentQ);
  const qTarget = agent.target * 3;
  // Build quarterly breakdown dynamically for the correct quarter
  const qBreakdown = currentQMonths.map(m => {
    const mData = getAgentMonthData(agent, m, aprilBackfill, monthlyData, quarterWeekly);
    return { month: MONTH_NAMES[m], col: mData.collections, sales: mData.sales, leads: mData.leads };
  });
  const totalCollections = qBreakdown.reduce((s, r) => s + r.col, 0);
  const totalSales = qBreakdown.reduce((s, r) => s + r.sales, 0);
  const totalLeads = qBreakdown.reduce((s, r) => s + r.leads, 0);
  const qDone = totalCollections;
  const qPct = pct(qDone, qTarget);
  const qExceeded = qDone > qTarget;
  // Monthly sales data for bar chart — show current quarter's months
  const monthSalesData = qBreakdown.map(r => ({ name: r.month, value: r.sales }));
  // Weekly sales data for line chart — use the correct quarter's thursdays
  const qThursdays = currentQ === 2 ? LEGACY_THURSDAYS : getQThursdays(YEAR, currentQ);
  const qThursdayLabels = qThursdays.map(formatThursday);
  const qKey = `q${currentQ}`;
  const agentQData = currentQ !== 2 ? (quarterWeekly[qKey] && quarterWeekly[qKey][agent.id]) : null;
  const weekSalesData = qThursdays.map((t, i) => {
    const val = currentQ === 2 ? (((agent.weeklySales||[])[i]||{}).total||0) : (((agentQData?.sales||[])[i]||{}).total||0);
    return { name: qThursdayLabels[i], value: val };
  });

  return (
    <div style={{ width: "100%", maxWidth: 1400, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
        {agent.image ? <img src={agent.image} alt={agent.name} style={{ width: 150, height: 150, borderRadius: "50%", border: `4px solid ${exceeded ? C.gold : c}`, objectFit: "cover", boxShadow: exceeded ? `0 0 24px ${C.gold}40` : "none", ...(exceeded ? { animation: 'goldShimmer 3s ease-in-out infinite' } : {}) }} /> : <div style={{ ...ST.av(c), width: 150, height: 150, fontSize: 44, border: `4px solid ${c}`, boxShadow: exceeded ? `0 0 24px ${C.gold}40` : "none", ...(exceeded ? { animation: 'goldShimmer 3s ease-in-out infinite', background: `linear-gradient(135deg, ${C.gold}, ${C.gold}88)`, borderColor: C.gold } : {}) }}>{initials(agent.name)}</div>}
        <h2 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: "#f1f5f9" }}>
          {agent.name} {exceeded && <span style={{ animation: 'starPulse 2s ease-in-out infinite', display: 'inline-block' }}>⭐</span>}
        </h2>
        {/* Two big metrics side by side — showing selected month */}
        <div style={{ fontSize: 11, color: C.accent, fontWeight: 600, textAlign: "center" }}>{MONTH_NAMES[displayMonth]} {YEAR}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, width: "100%", maxWidth: 320 }}>
          <div style={{ background: C.cardAlt, borderRadius: 10, padding: 12, textAlign: "center", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>{MONTH_NAMES[displayMonth]} Collections</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: exceeded ? C.gold : c }}>{fmt(col)}</div>
            <div style={{ fontSize: 10, color: C.textDim }}>QAR</div>
          </div>
          <div style={{ background: C.cardAlt, borderRadius: 10, padding: 12, textAlign: "center", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>{MONTH_NAMES[displayMonth]} Sales</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.success }}>{fmt(sales)}</div>
            <div style={{ fontSize: 10, color: C.textDim }}>count</div>
          </div>
        </div>
        {/* Target progress */}
        <div style={{ background: C.cardAlt, borderRadius: 10, padding: 12, width: "100%", maxWidth: 320, border: `1px solid ${exceeded ? C.gold + "40" : C.border}` }}>
          <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4, textAlign: "center" }}>Monthly target progress</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: exceeded ? C.gold : c }}>{fmt(col)} QAR</span>
            <span style={{ fontSize: 12, color: p >= 100 ? C.gold : p >= 50 ? C.success : C.warning, fontWeight: 700 }}>{p}%</span>
          </div>
          <div style={ST.barBg}><div style={ST.barFill(Math.min(p, 100), exceeded ? C.gold : c)} /></div>
          {exceeded ? <div style={{ fontSize: 10, color: C.success, fontWeight: 600, marginTop: 4, textAlign: "center" }}>🎯 +{fmt(Math.abs(diff))} QAR exceeded!</div>
            : <div style={{ fontSize: 10, color: C.warning, marginTop: 4, textAlign: "center" }}>{fmt(Math.abs(diff))} QAR remaining</div>}
        </div>
        {/* Quarterly breakdown table */}
        <div style={{ background: C.cardAlt, borderRadius: 10, padding: 12, width: "100%", maxWidth: 320, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8, textAlign: "center" }}>Q{currentQ} quarterly breakdown</div>
          <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={{ textAlign: "left", padding: "3px 0", color: C.textDim, fontWeight: 600 }}></th>
              <th style={{ textAlign: "right", padding: "3px 4px", color: C.gold, fontWeight: 600, fontSize: 10 }}>Coll</th>
              <th style={{ textAlign: "right", padding: "3px 4px", color: C.success, fontWeight: 600, fontSize: 10 }}>Sales</th>
              <th style={{ textAlign: "right", padding: "3px 4px", color: C.purple, fontWeight: 600, fontSize: 10 }}>Leads</th>
            </tr></thead>
            <tbody>
              {qBreakdown.map(r => (
                <tr key={r.month} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ padding: "4px 0", color: "#94a3b8", fontWeight: 600 }}>{r.month}</td>
                  <td style={{ textAlign: "right", padding: "4px 4px", color: C.text }}>{r.col > 0 ? fmt(r.col) : "—"}</td>
                  <td style={{ textAlign: "right", padding: "4px 4px", color: C.text }}>{r.sales > 0 ? fmt(r.sales) : "—"}</td>
                  <td style={{ textAlign: "right", padding: "4px 4px", color: C.text }}>{r.leads > 0 ? fmt(r.leads) : "—"}</td>
                </tr>
              ))}
              <tr style={{ borderTop: `1px solid ${C.accent}40` }}>
                <td style={{ padding: "4px 0", color: C.accent, fontWeight: 700 }}>Total</td>
                <td style={{ textAlign: "right", padding: "4px 4px", color: C.accent, fontWeight: 700 }}>{fmt(totalCollections)}</td>
                <td style={{ textAlign: "right", padding: "4px 4px", color: C.accent, fontWeight: 700 }}>{fmt(totalSales)}</td>
                <td style={{ textAlign: "right", padding: "4px 4px", color: C.accent, fontWeight: 700 }}>{fmt(totalLeads)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20, justifyContent: "center" }}>
        <div style={ST.card}><div style={{ ...ST.title, color: C.success }}>Q{currentQ} monthly sales</div>
          <ResponsiveContainer width="100%" height={180}><BarChart data={monthSalesData}><CartesianGrid strokeDasharray="3 3" stroke={C.border} /><XAxis dataKey="name" stroke={C.textDim} fontSize={12} /><YAxis stroke={C.textDim} fontSize={12} /><Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }} /><Bar dataKey="value" fill={C.success} name="Sales" radius={[6,6,0,0]} /></BarChart></ResponsiveContainer>
        </div>
        <div style={ST.card}><div style={{ ...ST.title, color: C.success }}>Weekly sales</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={weekSalesData}><defs><linearGradient id={`gs${idx}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.success} stopOpacity={0.3} /><stop offset="95%" stopColor={C.success} stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke={C.border} /><XAxis dataKey="name" stroke={C.textDim} fontSize={10} /><YAxis stroke={C.textDim} fontSize={10} /><Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }} /><Area type="monotone" dataKey="value" stroke={C.success} fill={`url(#gs${idx})`} strokeWidth={2} name="Sales" /></AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function TVCompany({ company, agents, aprilBackfill = {}, selectedQ = 2, monthlyData = {}, quarterWeekly = {} }) {
  const total = getQuarterTotal(agents, selectedQ, aprilBackfill, monthlyData, quarterWeekly);
  const pipeline = calcPipeline(agents, selectedQ, aprilBackfill, monthlyData, quarterWeekly);
  const qTarget = getQuarterTarget(company, selectedQ);
  const qPctVal = pct(total, qTarget);
  const qMonths = getQuarterMonths(selectedQ);
  const pipeData = qMonths.map(m => ({ name: MONTH_NAMES[m], ...(pipeline[MONTH_NAMES[m].toLowerCase()] || { leads: 0, sales: 0, ratio: 0 }) }));
  const qData = [1,2,3,4].map(q => ({ name: `Q${q}`, target: getQuarterTarget(company, q), done: q === 2 ? total : getQuarterDone(company, q) }));
  return (
    <div style={{ width: "100%", maxWidth: 1600 }}>
      <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 24, textAlign: "center", color: C.accent }}>🏢 Company Performance Overview</h2>
      <div style={{ ...ST.grid(4), marginBottom: 24 }}>
        <SCard title="Q1 Result" value={`${fmt(company.q1Done)} QAR`} sub={`Target: ${fmt(company.q1Target)}`} icon="📅" color={C.purple} />
        <SCard title="Q2 Target" value={`${fmt(company.q2Target)} QAR`} sub={`Done: ${fmt(total)} QAR`} icon="📅" color={C.accent} />
        <SCard title={`Q${selectedQ} Progress`} value={`${qPctVal}%`} icon="⚡" color={qPctVal >= 50 ? C.success : C.warning} />
        <SCard title="Team Collection" value={`${fmt(total)} QAR`} sub={`${agents.filter(a => getMonthlyCollection(a) > 0).length} of ${agents.length} active`} icon="👥" color={C.gold} />
      </div>
      <div style={ST.grid(2)}>
        <div style={ST.card}><div style={ST.title}>Quarterly Breakdown</div>
          <ResponsiveContainer width="100%" height={250}><BarChart data={qData}><CartesianGrid strokeDasharray="3 3" stroke={C.border} /><XAxis dataKey="name" stroke={C.textDim} fontSize={12} /><YAxis stroke={C.textDim} fontSize={11} tickFormatter={v => `${(v/1000).toFixed(0)}k`} /><Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }} formatter={v => fmt(v)} /><Legend /><Bar dataKey="target" fill="#334155" name="Target" radius={[4,4,0,0]} /><Bar dataKey="done" fill={C.accent} name="Collected" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer>
        </div>
        <div style={ST.card}><div style={ST.title}>Lead Pipeline (Auto-calculated)</div>
          <ResponsiveContainer width="100%" height={250}><BarChart data={pipeData}><CartesianGrid strokeDasharray="3 3" stroke={C.border} /><XAxis dataKey="name" stroke={C.textDim} fontSize={12} /><YAxis stroke={C.textDim} fontSize={11} /><Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }} /><Legend /><Bar dataKey="leads" fill={C.accent} name="Leads" radius={[4,4,0,0]} /><Bar dataKey="sales" fill={C.success} name="Sales" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer>
          <div style={{ display: "flex", justifyContent: "center", gap: 32, marginTop: 12 }}>{pipeData.map(d => (<div key={d.name} style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: C.textDim }}>{d.name} Conversion Rate</div><div style={{ fontSize: 20, fontWeight: 800, color: d.ratio >= 50 ? C.success : C.warning }}>{d.ratio}%</div></div>))}</div>
        </div>
      </div>
    </div>
  );
}

function TVWeekly({ agents, tvDisplayMonth, aprilBackfill = {}, monthlyData = {}, quarterWeekly = {} }) {
  const displayMonth = tvDisplayMonth !== undefined ? tvDisplayMonth : new Date().getMonth();
  const q = Math.floor(displayMonth / 3) + 1;
  const monthTh = getMonthThursdays(displayMonth, q);
  const isMonthlyOnly = monthTh.indices.length === 0;
  const withMonthData = agents.map(a => {
    const md = getAgentMonthData(a, displayMonth, aprilBackfill, monthlyData, quarterWeekly);
    return { ...a, _monthCol: md.collections, _monthSales: md.sales };
  });
  const sorted = [...withMonthData].sort((a, b) => b._monthCol - a._monthCol);

  if (isMonthlyOnly) {
    // Show monthly totals table instead of weekly
    return (
      <div style={{ width: "100%", maxWidth: 1600, overflow: "auto" }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 20, textAlign: "center", color: C.accent }}>📅 {MONTH_NAMES[displayMonth]} {YEAR} — Monthly Totals</h2>
        <table style={ST.table}>
          <thead><tr><th style={ST.th}>Agent</th><th style={{ ...ST.th, textAlign: "right" }}>Collections</th><th style={{ ...ST.th, textAlign: "right" }}>Sales</th></tr></thead>
          <tbody>{sorted.map((a, i) => {
            const c = tri(i);
            return (<tr key={a.id}><td style={{ ...ST.td, borderRadius: "8px 0 0 8px", fontWeight: 600, color: "#f1f5f9" }}><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: c, marginRight: 8 }} />{a.name}</td>
              <td style={{ ...ST.td, textAlign: "right", fontWeight: 700, color: C.gold }}>{a._monthCol > 0 ? fmt(a._monthCol) : <span style={{ color: C.textDim }}>—</span>}</td>
              <td style={{ ...ST.td, borderRadius: "0 8px 8px 0", textAlign: "right", fontWeight: 700, color: C.success }}>{a._monthSales > 0 ? fmt(a._monthSales) : <span style={{ color: C.textDim }}>—</span>}</td></tr>);
          })}</tbody>
        </table>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", maxWidth: 1600, overflow: "auto" }}>
      <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 20, textAlign: "center", color: C.accent }}>📅 {MONTH_NAMES[displayMonth]} Weekly Collections</h2>
      <table style={ST.table}>
        <thead><tr><th style={ST.th}>Agent</th>{monthTh.labels.map(w => <th key={w} style={{ ...ST.th, textAlign: "right" }}>{w}</th>)}<th style={{ ...ST.th, textAlign: "right" }}>Total</th></tr></thead>
        <tbody>{sorted.map((a, i) => {
          let total = 0; const c = tri(i);
          const isQ2 = q === 2;
          const qKey = `q${q}`;
          const qData = !isQ2 ? (quarterWeekly[qKey] && quarterWeekly[qKey][a.id]) : null;
          return (<tr key={a.id}><td style={{ ...ST.td, borderRadius: "8px 0 0 8px", fontWeight: 600, color: "#f1f5f9" }}><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: c, marginRight: 8 }} />{a.name}</td>
            {monthTh.indices.map(j => { const v = isQ2 ? ((a.weeklyCollections||[])[j]||0) : ((qData?.collections||[])[j]||0); total += v; return <td key={j} style={{ ...ST.td, textAlign: "right" }}>{v > 0 ? fmt(v) : <span style={{ color: C.textDim }}>—</span>}</td>; })}
            <td style={{ ...ST.td, borderRadius: "0 8px 8px 0", textAlign: "right", fontWeight: 700, color: c }}>{fmt(total)}</td></tr>);
        })}</tbody>
      </table>
    </div>
  );
}

// ─── SLIDE DEFINITIONS ─────────────────────────────────────────────
const DEFAULT_SLIDE_DEFS = [
  { id: "company", name: "Company overview", icon: "🏢", type: "fixed", defaultDur: 20000 },
  { id: "allAgents", name: "All agents", icon: "👥", type: "fixed", defaultDur: 15000 },
  { id: "weekly", name: "Weekly breakdown", icon: "📅", type: "fixed", defaultDur: 15000 },
  // Agent slides are dynamically inserted here with type: "agent"
  { id: "podium", name: "Top performers", icon: "🏆", type: "fixed", defaultDur: 15000 },
];

function buildSlideList(agents, company, aprilBackfill, tvSettings, selectedQ = 2, monthlyData = {}, quarterWeekly = {}) {
  const tvAgents = agents.filter(a => !a.hideFromTV);
  const allAgents = agents; // All agents for company totals (hidden agents still contribute)
  const tvMonth = tvSettings?.tvMonth !== undefined ? tvSettings.tvMonth : new Date().getMonth();
  // Previous month for Agent of the Month
  const prevMonth = tvMonth > 0 ? tvMonth - 1 : 11;
  // Sort and filter by selected month's data — pass quarterWeekly!
  const agentsWithMonthData = tvAgents.map(a => {
    const md = getAgentMonthData(a, tvMonth, aprilBackfill, monthlyData, quarterWeekly);
    return { ...a, _tvMonthCol: md.collections, _tvMonthSales: md.sales, _tvMonthLeads: md.leads };
  });
  // All agents for company (including hidden)
  const allAgentsWithMonth = allAgents.map(a => {
    const md = getAgentMonthData(a, tvMonth, aprilBackfill, monthlyData, quarterWeekly);
    return { ...a, _tvMonthCol: md.collections, _tvMonthSales: md.sales, _tvMonthLeads: md.leads };
  });
  const sorted = [...agentsWithMonthData].sort((a, b) => b._tvMonthSales - a._tvMonthSales);
  // OR logic: show if ANY metric > 0
  const activeAgents = sorted.filter(a => a._tvMonthCol > 0 || a._tvMonthSales > 0 || a._tvMonthLeads > 0);

  const allSlides = [
    { id: "company", name: "Company overview", icon: "🏢", type: "fixed", defaultDur: 20000, comp: <TVCompany company={company} agents={allAgents} aprilBackfill={aprilBackfill} selectedQ={tvSettings?.tvQuarter || selectedQ} monthlyData={monthlyData} quarterWeekly={quarterWeekly} /> },
    { id: "liveRankings", name: "Live rankings", icon: "📊", type: "fixed", defaultDur: 18000, comp: <TVLiveRankings agents={tvAgents} tvDisplayMonth={tvMonth} aprilBackfill={aprilBackfill} monthlyData={monthlyData} quarterWeekly={quarterWeekly} /> },
    { id: "allAgents", name: "All agents", icon: "👥", type: "fixed", defaultDur: 15000, comp: <TVAll agents={tvAgents} tvDisplayMonth={tvMonth} aprilBackfill={aprilBackfill} monthlyData={monthlyData} quarterWeekly={quarterWeekly} /> },
    { id: "weekly", name: "Weekly breakdown", icon: "📅", type: "fixed", defaultDur: 15000, comp: <TVWeekly agents={tvAgents} tvDisplayMonth={tvMonth} aprilBackfill={aprilBackfill} monthlyData={monthlyData} quarterWeekly={quarterWeekly} /> },
    ...activeAgents.map((a, i) => ({ id: `agent_${a.id}`, name: a.name, icon: "", image: a.image, type: "agent", defaultDur: 10000, comp: <TVAgent agent={a} idx={i} company={company} aprilBackfill={aprilBackfill} monthlyData={monthlyData} tvDisplayMonth={tvMonth} quarterWeekly={quarterWeekly} /> })),
    { id: "podium", name: "Top performers", icon: "🏆", type: "fixed", defaultDur: 15000, comp: <TVPodium agents={tvAgents} tvDisplayMonth={tvMonth} aprilBackfill={aprilBackfill} monthlyData={monthlyData} quarterWeekly={quarterWeekly} /> },
    { id: "agentOfMonth", name: "Agent of the month", icon: "👑", type: "fixed", defaultDur: 20000, comp: <TVAgentOfMonth agents={tvAgents} tvDisplayMonth={prevMonth} aprilBackfill={aprilBackfill} monthlyData={monthlyData} quarterWeekly={quarterWeekly} /> },
  ];

  if (!tvSettings || !tvSettings.slides) return allSlides.map(s => ({ ...s, visible: true, dur: s.defaultDur }));

  // Apply saved settings (order, visibility, duration)
  const savedSlides = tvSettings.slides;
  const result = [];
  const usedIds = new Set();

  // First: add slides in saved order
  savedSlides.forEach(saved => {
    const match = allSlides.find(s => s.id === saved.id);
    if (match) {
      result.push({ ...match, visible: saved.visible !== false, dur: saved.dur || match.defaultDur });
      usedIds.add(saved.id);
    }
  });

  // Then: add any new slides not in saved settings (e.g. new agents)
  allSlides.forEach(s => {
    if (!usedIds.has(s.id)) {
      result.push({ ...s, visible: true, dur: s.defaultDur });
    }
  });

  return result;
}

// ─── TV LIVE RANKINGS (All agents with movement arrows) ────────────
function TVLiveRankings({ agents, tvDisplayMonth, aprilBackfill = {}, monthlyData = {}, quarterWeekly = {} }) {
  const displayMonth = tvDisplayMonth !== undefined ? tvDisplayMonth : new Date().getMonth();
  const withData = agents.map(a => {
    const md = getAgentMonthData(a, displayMonth, aprilBackfill, monthlyData, quarterWeekly);
    const prevMonth = displayMonth > 0 ? displayMonth - 1 : 11;
    const prevMd = getAgentMonthData(a, prevMonth, aprilBackfill, monthlyData, quarterWeekly);
    return { ...a, sales: md.sales, col: md.collections, leads: md.leads, prevSales: prevMd.sales };
  });
  const sorted = [...withData].sort((a, b) => b.sales - a.sales);
  const prevSorted = [...withData].sort((a, b) => b.prevSales - a.prevSales);
  const prevRankMap = {};
  prevSorted.forEach((a, i) => { prevRankMap[a.id] = i + 1; });

  return (
    <div style={{ width: "100%", maxWidth: 1400, textAlign: "center" }}>
      <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6, color: C.accent }}>📊 Live Rankings — {MONTH_NAMES[displayMonth]} {YEAR}</h2>
      <p style={{ fontSize: 13, color: C.textDim, marginBottom: 24 }}>Ranked by sales · Updated in real-time</p>
      {(() => {
        const half = Math.ceil(sorted.length / 2);
        const leftCol = sorted.slice(0, half);
        const rightCol = sorted.slice(half);
        const renderRow = (a, rank) => {
          const prevRank = prevRankMap[a.id] || rank;
          const moved = prevRank - rank;
          const moveColor = moved > 0 ? C.success : moved < 0 ? C.danger : C.textDim;
          const moveIcon = moved > 0 ? "▲" : moved < 0 ? "▼" : "●";
          const moveText = moved > 0 ? `+${moved}` : moved < 0 ? `${moved}` : "—";
          const isTop3 = rank <= 3;
          const borderColor = rank === 1 ? C.gold : rank === 2 ? "#94a3b8" : rank === 3 ? "#cd7f32" : C.border;
          return (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: isTop3 ? `${borderColor}12` : "rgba(255,255,255,0.02)", borderLeft: `3px solid ${borderColor}`, marginBottom: 6 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: isTop3 ? `${borderColor}30` : C.cardAlt, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, color: isTop3 ? borderColor : C.textDim, flexShrink: 0 }}>{rank}</div>
              <div style={{ width: 32, textAlign: "center", flexShrink: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: moveColor }}>{moveIcon}</div>
                <div style={{ fontSize: 9, color: moveColor }}>{moveText}</div>
              </div>
              {a.image ? <img src={a.image} alt={a.name} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} /> : <div style={{ ...ST.av(tri(rank-1)), width: 36, height: 36, fontSize: 13, flexShrink: 0 }}>{initials(a.name)}</div>}
              <span style={{ flex: 1, fontWeight: 600, fontSize: 14, color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.success }}>{fmt(a.sales)}</div>
                <div style={{ fontSize: 9, color: C.textDim }}>sales</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0, width: 80 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.gold }}>{fmt(a.col)}</div>
                <div style={{ fontSize: 9, color: C.textDim }}>QAR</div>
              </div>
            </div>
          );
        };
        return (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, textAlign: "left" }}>
            <div>{leftCol.map((a, i) => renderRow(a, i + 1))}</div>
            <div>{rightCol.map((a, i) => renderRow(a, half + i + 1))}</div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── TV PODIUM (Top 3 Leaderboard) ─────────────────────────────────
function TVPodium({ agents, tvDisplayMonth, aprilBackfill = {}, monthlyData = {}, quarterWeekly = {} }) {
  const displayMonth = tvDisplayMonth !== undefined ? tvDisplayMonth : new Date().getMonth();
  const withMonthData = agents.map(a => {
    const md = getAgentMonthData(a, displayMonth, aprilBackfill, monthlyData, quarterWeekly);
    return { ...a, _mSales: md.sales, _mCol: md.collections };
  });
  const sorted = [...withMonthData].sort((a, b) => b._mSales - a._mSales);
  const top3 = sorted.slice(0, 3);
  const podiumOrder = top3.length === 3 ? [top3[1], top3[0], top3[2]] : top3;
  const medals = { 0: { emoji: "🥈", label: "2nd Place", color: "#94a3b8", height: 140 }, 1: { emoji: "🥇", label: "1st Place", color: C.gold, height: 180 }, 2: { emoji: "🥉", label: "3rd Place", color: "#cd7f32", height: 110 } };
  const podiumColors = top3.length === 3 ? [medals[0], medals[1], medals[2]] : top3.map((_, i) => medals[i]);

  return (
    <div style={{ width: "100%", maxWidth: 1200, textAlign: "center" }}>
      <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8, color: C.gold }}>🏆 Top Performers — {MONTH_NAMES[displayMonth]}</h2>
      <p style={{ fontSize: 14, color: C.textDim, marginBottom: 40 }}>Sales Leaderboard</p>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 24 }}>
        {podiumOrder.map((agent, vi) => {
          const pc = podiumColors[vi];
          const salesCount = agent._mSales;
          const col = agent._mCol;
          const isFirst = vi === 1;
          return (
            <div key={agent.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: isFirst ? 280 : 220 }}>
              <div style={{ fontSize: isFirst ? 48 : 36, marginBottom: 8, filter: isFirst ? "drop-shadow(0 0 12px rgba(251,191,36,0.5))" : "none" }}>{pc.emoji}</div>
              <div style={{ position: "relative", marginBottom: 12 }}>
                {agent.image ? (
                  <img src={agent.image} alt={agent.name} style={{ width: isFirst ? 100 : 76, height: isFirst ? 100 : 76, borderRadius: "50%", border: `4px solid ${pc.color}`, objectFit: "cover", boxShadow: isFirst ? `0 0 24px ${pc.color}60` : "none" }} />
                ) : (
                  <div style={{ ...ST.av(pc.color), width: isFirst ? 100 : 76, height: isFirst ? 100 : 76, fontSize: isFirst ? 32 : 24, border: `4px solid ${pc.color}`, boxShadow: isFirst ? `0 0 24px ${pc.color}60` : "none" }}>{initials(agent.name)}</div>
                )}
              </div>
              <div style={{ fontSize: isFirst ? 22 : 17, fontWeight: 800, color: "#f1f5f9", marginBottom: 4 }}>{agent.name}</div>
              <div style={{ fontSize: isFirst ? 24 : 18, fontWeight: 800, color: C.success, marginBottom: 2 }}>{fmt(salesCount)} sales</div>
              <div style={{ fontSize: 12, color: C.textDim, marginBottom: 12 }}>{fmt(col)} QAR collected</div>
              <div style={{
                width: "100%", height: pc.height, borderRadius: "12px 12px 0 0",
                background: `linear-gradient(180deg, ${pc.color}30 0%, ${pc.color}10 100%)`,
                border: `2px solid ${pc.color}40`, borderBottom: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: isFirst ? 64 : 48, fontWeight: 900, color: `${pc.color}25`,
              }}>
                {vi === 1 ? "1" : vi === 0 ? "2" : "3"}
              </div>
            </div>
          );
        })}
      </div>
      {sorted.length > 3 && (
        <div style={{ marginTop: 32, display: "flex", justifyContent: "center", gap: 32 }}>
          {sorted.slice(3, 5).map((a, i) => {
            const salesCount = a._mSales;
            if (salesCount <= 0) return null;
            return (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: C.textDim }}>{i + 4}.</span>
                {a.image ? <img src={a.image} alt={a.name} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} /> : <div style={{ ...ST.av(tri(i)), width: 36, height: 36, fontSize: 13 }}>{initials(a.name)}</div>}
                <span style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{a.name}</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: C.success }}>{fmt(salesCount)} sales</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── TV AGENT OF THE MONTH ─────────────────────────────────────────
function TVAgentOfMonth({ agents, tvDisplayMonth, aprilBackfill = {}, monthlyData = {}, quarterWeekly = {} }) {
  const displayMonth = tvDisplayMonth !== undefined ? tvDisplayMonth : new Date().getMonth();
  const withMonthData = agents.map(a => {
    const md = getAgentMonthData(a, displayMonth, aprilBackfill, monthlyData, quarterWeekly);
    return { ...a, _mSales: md.sales, _mCol: md.collections, _mLeads: md.leads };
  });
  const sorted = [...withMonthData].sort((a, b) => b._mSales - a._mSales);
  const winner = sorted[0];
  if (!winner || winner._mSales <= 0) return null;
  const targetPct = pct(winner._mCol, winner.target);
  const confettiColors = [C.gold, C.success, C.accent, C.purple, C.pink, C.danger, "#f59e0b", "#6366f1"];

  // Inject celebration animations
  const animId = "aotm-anims";
  useEffect(() => {
    if (typeof document !== "undefined" && !document.getElementById(animId)) {
      const s = document.createElement("style");
      s.id = animId;
      s.textContent = `
        @keyframes aotmConfetti { 0%{transform:translateY(-20px) rotate(0deg);opacity:1} 100%{transform:translateY(110vh) rotate(720deg);opacity:0.3} }
        @keyframes aotmBalloon { 0%{transform:translateY(110vh) rotate(-5deg);opacity:0} 10%{opacity:1} 100%{transform:translateY(-40px) rotate(5deg);opacity:0.6} }
        @keyframes aotmCrown { 0%{transform:scale(1)} 50%{transform:scale(1.15)} 100%{transform:scale(1)} }
        @keyframes aotmShimmer { 0%{opacity:0.4} 50%{opacity:1} 100%{opacity:0.4} }
        @keyframes aotmSlideUp { 0%{transform:translateY(30px);opacity:0} 100%{transform:translateY(0);opacity:1} }
      `;
      document.head.appendChild(s);
    }
  }, []);

  // Generate confetti elements
  const confetti = useMemo(() => Array.from({ length: 60 }, (_, i) => {
    const size = 4 + Math.random() * 8;
    const isCircle = Math.random() > 0.5;
    return { left: `${Math.random() * 100}%`, size, isCircle, color: confettiColors[i % confettiColors.length], delay: Math.random() * 4, dur: 2.5 + Math.random() * 3 };
  }), []);

  const balloons = useMemo(() => Array.from({ length: 8 }, (_, i) => {
    const emojis = ["🎈", "🎉", "🎊"];
    return { left: `${5 + Math.random() * 90}%`, emoji: emojis[i % 3], size: 28 + Math.random() * 20, delay: Math.random() * 6, dur: 6 + Math.random() * 5 };
  }), []);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
      {/* Confetti */}
      {confetti.map((c, i) => (
        <div key={`c${i}`} style={{ position: "absolute", left: c.left, top: -20, width: c.size, height: c.isCircle ? c.size : c.size * 2.5, background: c.color, borderRadius: c.isCircle ? "50%" : 2, animation: `aotmConfetti ${c.dur}s linear ${c.delay}s infinite`, opacity: 0.8, pointerEvents: "none", zIndex: 1 }} />
      ))}
      {/* Balloons */}
      {balloons.map((b, i) => (
        <div key={`b${i}`} style={{ position: "absolute", left: b.left, bottom: -40, fontSize: b.size, animation: `aotmBalloon ${b.dur}s ease-out ${b.delay}s infinite`, opacity: 0, pointerEvents: "none", zIndex: 1 }}>{b.emoji}</div>
      ))}
      {/* Main content */}
      <div style={{ textAlign: "center", zIndex: 10, padding: "40px 20px" }}>
        <div style={{ fontSize: 40, marginBottom: 8, animation: "aotmCrown 2s ease-in-out infinite", filter: "drop-shadow(0 0 12px rgba(251,191,36,0.5))" }}>👑</div>
        <div style={{ fontSize: 14, letterSpacing: 6, textTransform: "uppercase", color: C.gold, marginBottom: 24, animation: "aotmShimmer 2s ease-in-out infinite" }}>Agent of the month</div>

        {winner.image ? (
          <img src={winner.image} alt={winner.name} style={{ width: 160, height: 160, borderRadius: "50%", border: `5px solid ${C.gold}`, objectFit: "cover", boxShadow: `0 0 40px ${C.gold}35, 0 0 80px ${C.gold}15`, marginBottom: 20, animation: "aotmSlideUp 0.8s ease-out" }} />
        ) : (
          <div style={{ width: 160, height: 160, borderRadius: "50%", background: `linear-gradient(135deg, ${C.gold}, #f59e0b)`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 48, color: "#fff", border: `5px solid ${C.gold}`, boxShadow: `0 0 40px ${C.gold}35, 0 0 80px ${C.gold}15`, marginBottom: 20, animation: "aotmSlideUp 0.8s ease-out" }}>{initials(winner.name)}</div>
        )}

        <h2 style={{ fontSize: 36, fontWeight: 800, margin: "0 0 4px", color: "#f1f5f9", animation: "aotmSlideUp 0.8s ease-out 0.1s both" }}>{winner.name}</h2>
        <div style={{ fontSize: 14, color: C.success, marginBottom: 28, animation: "aotmSlideUp 0.8s ease-out 0.2s both" }}>{MONTH_NAMES[displayMonth]} {YEAR}</div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, animation: "aotmSlideUp 0.8s ease-out 0.3s both" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ background: C.cardAlt, borderRadius: 12, padding: "16px 32px", border: `1px solid ${C.gold}40`, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: C.textDim, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>Total sales</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: C.success }}>{fmt(winner._mSales)}</div>
              <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>count</div>
            </div>
            <div style={{ background: C.cardAlt, borderRadius: 12, padding: "16px 32px", border: `1px solid ${C.gold}40`, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: C.textDim, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>Collections</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: C.gold }}>{fmt(winner._mCol)}</div>
              <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>QAR</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 28, background: C.cardAlt, borderRadius: 12, padding: "16px 36px", border: `1px solid ${C.border}` }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: C.purple }}>{winner._mLeads}</div>
              <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>Leads</div>
            </div>
            <div style={{ width: 1, background: C.border }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: C.accent }}>{targetPct}%</div>
              <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>Target achieved</div>
            </div>
            <div style={{ width: 1, background: C.border }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: C.pink }}>MVP</div>
              <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>Recognition</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TV MODE ───────────────────────────────────────────────────────
function TVMode({ agents, company, logo, onClose, aprilBackfill = {}, tvSettings = null, selectedQ = 2, monthlyData = {}, quarterWeekly = {} }) {
  const tvMonth = tvSettings?.tvMonth !== undefined ? tvSettings.tvMonth : new Date().getMonth();
  const isPreview = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tv") === "preview";
  const allSlides = buildSlideList(agents, company, aprilBackfill, tvSettings, selectedQ, monthlyData, quarterWeekly);
  const visibleSlides = allSlides.filter(s => s.visible);
  const slides = visibleSlides.map(s => ({ comp: s.comp, dur: s.dur }));
  const [cur, setCur] = useState(0);
  const [prog, setProg] = useState(0);
  const [paused, setPaused] = useState(false);
  const tRef = useRef(null), pRef = useRef(null);

  // Auto-refresh production TV every 4 hours to keep session alive
  useEffect(() => {
    if (!isPreview) {
      const refreshTimer = setInterval(() => { window.location.reload(); }, 4 * 60 * 60 * 1000);
      return () => clearInterval(refreshTimer);
    }
  }, [isPreview]);

  useEffect(() => {
    if (paused || slides.length === 0) return;
    const dur = slides[cur]?.dur || 10000; const start = Date.now();
    pRef.current = setInterval(() => setProg((Date.now()-start)/dur*100), 50);
    tRef.current = setTimeout(() => { setCur(p => (p+1)%slides.length); setProg(0); }, dur);
    return () => { clearTimeout(tRef.current); clearInterval(pRef.current); };
  }, [cur, slides.length, paused]);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: C.bg, display: "flex", flexDirection: "column" }}>
      {/* Preview mode banner */}
      {isPreview && <div style={{ background: `linear-gradient(90deg, ${C.warning}, #f59e0b)`, padding: "4px 0", textAlign: "center", fontSize: 12, fontWeight: 700, color: "#000" }}>⚠️ PREVIEW MODE — This is not the live TV display</div>}
      <div style={ST.nav}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {logo ? <img src={logo} alt="Logo" style={{ height: 36, objectFit: "contain" }} /> : <div style={{ width: 36, height: 36, borderRadius: 8, background: `linear-gradient(135deg, ${C.accent}, #6366f1)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "#fff" }}>S</div>}
          <span style={{ fontSize: 20, fontWeight: 700, background: `linear-gradient(135deg, ${C.accent}, #a78bfa)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Sales Dashboard</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 13, color: C.textDim }}>Slide {cur+1}/{slides.length}</span>
          <span style={{ fontSize: 13, color: C.success, fontWeight: 600 }}>📅 {MONTH_NAMES[tvMonth]} {YEAR}</span>
          <span style={{ fontSize: 14, color: C.accent }}>{new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
          {/* Preview controls */}
          {isPreview && (
            <>
              <button onClick={() => { setCur(p => (p - 1 + slides.length) % slides.length); setProg(0); }} style={{ ...ST.btnO, padding: "4px 10px", fontSize: 12 }}>⏮</button>
              <button onClick={() => setPaused(!paused)} style={{ ...ST.btnO, padding: "4px 10px", fontSize: 12 }}>{paused ? "▶️" : "⏸"}</button>
              <button onClick={() => { setCur(p => (p + 1) % slides.length); setProg(0); }} style={{ ...ST.btnO, padding: "4px 10px", fontSize: 12 }}>⏭</button>
            </>
          )}
          <button onClick={onClose} style={{ ...ST.btn(C.danger), padding: "6px 14px" }}>✕ Exit TV</button>
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 32, overflow: "hidden" }}>{slides[cur]?.comp}</div>
      <div style={{ position: "absolute", bottom: 0, left: 0, height: 4, background: `linear-gradient(90deg, ${C.accent}, #6366f1)`, transition: "width 0.1s linear", width: `${prog}%` }} />
    </div>
  );
}

// ─── LOGIN ─────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [user, setUser] = useState(""); const [pass, setPass] = useState(""); const [err, setErr] = useState(""); const [loading, setLoading] = useState(false);
  const submit = async () => {
    if (!user || !pass) { setErr("Enter username and password"); return; }
    setLoading(true); setErr("");
    try { const email = user.includes("@") ? user : `${user}@dashboard.local`; await signInWithEmailAndPassword(auth, email, pass); onLogin(); }
    catch (e) { setErr(e.code === "auth/too-many-requests" ? "Too many attempts. Try later." : "Invalid username or password"); }
    setLoading(false);
  };
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 400, padding: 40, background: C.card, borderRadius: 16, border: `1px solid ${C.border}` }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}><div style={{ width: 60, height: 60, borderRadius: 14, background: `linear-gradient(135deg, ${C.accent}, #6366f1)`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 24, color: "#fff", marginBottom: 16 }}>S</div><h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: "0 0 4px" }}>Sales Dashboard</h1><p style={{ fontSize: 14, color: C.textDim, margin: 0 }}>Sign in to access</p></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div><label style={{ fontSize: 12, color: C.textDim, marginBottom: 6, display: "block" }}>Username</label><input type="text" style={ST.input} value={user} onChange={e => setUser(e.target.value)} placeholder="Enter username" /></div>
          <div><label style={{ fontSize: 12, color: C.textDim, marginBottom: 6, display: "block" }}>Password</label><input type="password" style={ST.input} value={pass} onChange={e => setPass(e.target.value)} placeholder="Enter password" onKeyDown={e => e.key === "Enter" && submit()} /></div>
          {err && <div style={{ padding: "8px 12px", borderRadius: 8, background: `${C.danger}18`, color: C.danger, fontSize: 13 }}>{err}</div>}
          <button style={{ ...ST.btn(), width: "100%", textAlign: "center", padding: "12px 20px", fontSize: 15, opacity: loading ? 0.6 : 1 }} onClick={submit} disabled={loading}>{loading ? "Signing in..." : "Sign In"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL: WEEKLY LEADS ───────────────────────────────────────────
function WeeklyLeadsModal({ agents, selectedQ, quarterWeekly, onSave, onClose }) {
  const isLegacyQ2 = selectedQ === 2;
  const thursdays = isLegacyQ2 ? LEGACY_THURSDAYS : getQThursdays(YEAR, selectedQ);
  const numWeeks = thursdays.length;
  const qKey = `q${selectedQ}`;

  const [data, setData] = useState(agents.map(a => {
    if (isLegacyQ2) {
      return { id: a.id, name: a.name, weeklyLeads: [...(a.weeklyLeads || makeEmptyWeeks())] };
    }
    const qData = quarterWeekly[qKey] && quarterWeekly[qKey][a.id];
    return { id: a.id, name: a.name, weeklyLeads: [...((qData && qData.leads) || new Array(numWeeks).fill(0))] };
  }));
  const [wi, setWi] = useState(getCurrentWeekIndex(thursdays));
  const totalLeads = data.reduce((s, d) => s + (d.weeklyLeads[wi] || 0), 0);
  return (
    <div style={ST.modal} onClick={onClose}><div style={ST.mc} onClick={e => e.stopPropagation()}>
      <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700, color: C.text }}>📋 Update Weekly Leads</h3>
      <p style={{ fontSize: 12, color: C.textDim, margin: "0 0 16px" }}>For Fadwa & Lucy (Property Administrators) &nbsp;|&nbsp; <span style={{ color: C.accent }}>Q{selectedQ}</span></p>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, color: C.textDim, marginBottom: 6, display: "block" }}>Week Ending (Thursday)</label>
        <select style={ST.sel} value={wi} onChange={e => setWi(Number(e.target.value))}>
          {thursdays.map((t, i) => <option key={i} value={i}>Week ending {formatThursdayFull(t)}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {data.map(d => (
          <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 100, fontWeight: 600, fontSize: 13, color: C.text }}>{d.name}</span>
            <input type="number" style={ST.input} value={d.weeklyLeads[wi] || ""} placeholder="0"
              onChange={e => setData(prev => prev.map(x => x.id === d.id ? { ...x, weeklyLeads: x.weeklyLeads.map((v, j) => j === wi ? (Number(e.target.value) || 0) : v) } : x))} />
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, padding: "12px 16px", background: C.cardAlt, borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>Total Leads This Week</span>
        <span style={{ fontWeight: 800, fontSize: 20, color: C.accent }}>{fmt(totalLeads)}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
        <button style={ST.btnO} onClick={onClose}>Cancel</button>
        <button style={ST.btn()} onClick={() => onSave(data, selectedQ)}>Save</button>
      </div>
    </div></div>
  );
}

// ─── MODAL: WEEKLY COLLECTION & SALES ──────────────────────────────
function WeeklyCollSalesModal({ agents, selectedQ, quarterWeekly, onSave, onClose }) {
  const isLegacyQ2 = selectedQ === 2;
  const thursdays = isLegacyQ2 ? LEGACY_THURSDAYS : getQThursdays(YEAR, selectedQ);
  const numWeeks = thursdays.length;
  const qKey = `q${selectedQ}`;

  const [data, setData] = useState(agents.map(a => {
    if (isLegacyQ2) {
      return { id: a.id, name: a.name, weeklyCollections: [...(a.weeklyCollections || makeEmptyWeeks())], weeklySales: (a.weeklySales || makeEmptySales()).map(s => ({ ...s })) };
    }
    const qData = quarterWeekly[qKey] && quarterWeekly[qKey][a.id];
    return {
      id: a.id, name: a.name,
      weeklyCollections: [...((qData && qData.collections) || new Array(numWeeks).fill(0))],
      weeklySales: ((qData && qData.sales) || new Array(numWeeks).fill(null)).map(s => s ? { ...s } : { prev: 0, current: 0, total: 0 }),
    };
  }));
  const [wi, setWi] = useState(getCurrentWeekIndex(thursdays));

  const getAutoPrev = (agentData, weekIdx) => {
    if (weekIdx <= 0) return 0;
    return agentData.weeklySales[weekIdx - 1]?.current || 0;
  };

  const getMonthlyTotal = (agentData) => {
    const selectedMonth = thursdays[wi].getMonth();
    let total = 0;
    thursdays.forEach((t, i) => {
      if (t.getMonth() === selectedMonth) total += agentData.weeklyCollections[i] || 0;
    });
    return total;
  };

  const handleSalesCurrentChange = (id, val) => {
    setData(prev => prev.map(d => {
      if (d.id !== id) return d;
      const sales = d.weeklySales.map((s, j) => {
        if (j !== wi) return s;
        const current = Number(val) || 0;
        const prevVal = getAutoPrev(d, wi);
        return { prev: prevVal, current, total: Math.max(current - prevVal, 0) };
      });
      return { ...d, weeklySales: sales };
    }));
  };

  const handleSave = () => {
    const fixed = data.map(d => {
      const sales = d.weeklySales.map((s, j) => {
        const prevVal = j > 0 ? (d.weeklySales[j - 1]?.current || 0) : 0;
        return { prev: prevVal, current: s.current || 0, total: Math.max((s.current || 0) - prevVal, 0) };
      });
      return { ...d, weeklySales: sales };
    });
    onSave(fixed, selectedQ);
  };

  const totalCol = data.reduce((s, d) => s + (d.weeklyCollections[wi] || 0), 0);
  const totalSales = data.reduce((s, d) => {
    const prevVal = getAutoPrev(d, wi);
    const current = d.weeklySales[wi]?.current || 0;
    return s + Math.max(current - prevVal, 0);
  }, 0);

  const prevHeader = wi > 0 ? `W/E ${formatThursday(thursdays[wi - 1])}` : "Opening";
  const weekNum = getWeekOfMonth(thursdays[wi], thursdays);
  const weekSalesHeader = `Week ${weekNum} Sales`;
  const selectedMonthName = MONTH_NAMES[thursdays[wi].getMonth()];

  return (
    <div style={ST.modal} onClick={onClose}><div style={ST.mcWide} onClick={e => e.stopPropagation()}>
      <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700, color: C.text }}>💰 Update Weekly Collection & Sales</h3>
      <p style={{ fontSize: 12, color: C.textDim, margin: "0 0 16px" }}>For Finance Department &nbsp;|&nbsp; <span style={{ color: C.accent }}>Q{selectedQ}</span> &nbsp;|&nbsp; Week ending: <span style={{ color: C.accent, fontWeight: 600 }}>{formatThursdayFull(thursdays[wi])}</span></p>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, color: C.textDim, marginBottom: 6, display: "block" }}>Week Ending (Thursday)</label>
        <select style={ST.sel} value={wi} onChange={e => setWi(Number(e.target.value))}>
          {thursdays.map((t, i) => <option key={i} value={i}>Week ending {formatThursdayFull(t)}</option>)}
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* LEFT: Collections */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.accent, marginBottom: 12, textTransform: "uppercase", letterSpacing: "1px" }}>📦 Collections</div>
          <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 1fr", gap: 4, marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: C.textDim, fontWeight: 600 }}>Agent</div>
            <div style={{ fontSize: 10, color: C.textDim, fontWeight: 600, textAlign: "center" }}>This Week</div>
            <div style={{ fontSize: 10, color: C.textDim, fontWeight: 600, textAlign: "center" }}>{selectedMonthName} Total</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {data.map(d => (
              <div key={d.id} style={{ display: "grid", gridTemplateColumns: "90px 1fr 1fr", gap: 4, alignItems: "center" }}>
                <span style={{ fontWeight: 600, fontSize: 12, color: C.text, flexShrink: 0 }}>{d.name}</span>
                <input type="number" style={ST.inputSm} value={d.weeklyCollections[wi] || ""} placeholder="0"
                  onChange={e => setData(prev => prev.map(x => x.id === d.id ? { ...x, weeklyCollections: x.weeklyCollections.map((v, j) => j === wi ? (Number(e.target.value) || 0) : v) } : x))} />
                <input type="text" style={ST.inputDisabled} value={fmt(getMonthlyTotal(d))} readOnly />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, padding: "10px 14px", background: C.cardAlt, borderRadius: 8, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: C.text }}>Total This Week</span>
            <span style={{ fontWeight: 800, fontSize: 16, color: C.accent }}>{fmt(totalCol)} QAR</span>
          </div>
        </div>

        {/* RIGHT: Sales */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.success, marginBottom: 12, textTransform: "uppercase", letterSpacing: "1px" }}>📈 Sales</div>
          <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 1fr 1fr", gap: 4, marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: C.textDim, fontWeight: 600 }}>Agent</div>
            <div style={{ fontSize: 10, color: C.accent, fontWeight: 600, textAlign: "center" }}>{prevHeader}</div>
            <div style={{ fontSize: 10, color: C.textDim, fontWeight: 600, textAlign: "center" }}>Current Sales</div>
            <div style={{ fontSize: 10, color: C.success, fontWeight: 600, textAlign: "center" }}>{weekSalesHeader}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {data.map(d => {
              const autoPrev = getAutoPrev(d, wi);
              const currentVal = d.weeklySales[wi]?.current || 0;
              const totalVal = Math.max(currentVal - autoPrev, 0);
              return (
                <div key={d.id} style={{ display: "grid", gridTemplateColumns: "90px 1fr 1fr 1fr", gap: 4, alignItems: "center" }}>
                  <span style={{ fontWeight: 600, fontSize: 12, color: C.text }}>{d.name}</span>
                  <input type="text" style={ST.inputDisabled} value={fmt(autoPrev)} readOnly title={`Auto-filled from ${prevHeader}`} />
                  <input type="number" style={ST.inputSm} value={currentVal || ""} placeholder="0" onChange={e => handleSalesCurrentChange(d.id, e.target.value)} />
                  <input type="text" style={ST.inputDisabled} value={fmt(totalVal)} readOnly />
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 12, padding: "10px 14px", background: C.cardAlt, borderRadius: 8, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{weekSalesHeader} Total</span>
            <span style={{ fontWeight: 800, fontSize: 16, color: C.success }}>{fmt(totalSales)} QAR</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
        <button style={ST.btnO} onClick={onClose}>Cancel</button>
        <button style={ST.btn()} onClick={handleSave}>Save</button>
      </div>
    </div></div>
  );
}

// ─── MODAL: PIPELINE (read-only, auto-calculated) ──────────────────
function PipelineViewModal({ agents, aprilBackfill = {}, selectedQ = 2, onClose }) {
  const pipeline = calcPipeline(agents, selectedQ, aprilBackfill);
  const qMonths = getQuarterMonths(selectedQ);
  const months = qMonths.map(m => ({ key: MONTH_NAMES[m].toLowerCase(), label: `${MONTH_NAMES[m]} ${YEAR}` }));
  return (
    <div style={ST.modal} onClick={onClose}><div style={ST.mc} onClick={e => e.stopPropagation()}>
      <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700, color: C.text }}>📊 Company Lead Pipeline</h3>
      <p style={{ fontSize: 12, color: C.textDim, margin: "0 0 20px" }}>Auto-calculated from weekly agent leads and sales data.</p>
      {months.map(m => (
        <div key={m.key} style={{ marginBottom: 16, padding: 16, background: C.cardAlt, borderRadius: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.accent, marginBottom: 10 }}>{m.label}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, textAlign: "center" }}>
            <div><div style={{ fontSize: 24, fontWeight: 800, color: C.accent }}>{fmt(pipeline[m.key].leads)}</div><div style={{ fontSize: 11, color: C.textDim }}>Total Leads</div></div>
            <div><div style={{ fontSize: 24, fontWeight: 800, color: C.success }}>{fmt(pipeline[m.key].sales)}</div><div style={{ fontSize: 11, color: C.textDim }}>Total Sales</div></div>
            <div><div style={{ fontSize: 24, fontWeight: 800, color: pipeline[m.key].ratio >= 50 ? C.success : C.warning }}>{pipeline[m.key].ratio}%</div><div style={{ fontSize: 11, color: C.textDim }}>Sales Conversion Rate</div></div>
          </div>
        </div>
      ))}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}><button style={ST.btn()} onClick={onClose}>Close</button></div>
    </div></div>
  );
}

// ─── MODAL: MONTHLY INPUT ──────────────────────────────────────────
function MonthlyInputModal({ agents, monthIdx, monthlyData, aprilBackfill, quarterWeekly = {}, onSave, onClose }) {
  const [activeMonth, setActiveMonth] = useState(monthIdx);
  const monthName = MONTH_NAMES[activeMonth];
  const activeQ = Math.floor(activeMonth / 3) + 1;
  const allQuarterMonths = getQuarterMonths(activeQ);

  const [data, setData] = useState(() => {
    const d = {};
    agents.forEach(a => {
      const existing = getAgentMonthData(a, activeMonth, aprilBackfill, monthlyData, quarterWeekly);
      d[a.id] = { collections: existing.collections, sales: existing.sales, leads: existing.leads };
    });
    return d;
  });

  // Reload data when month changes
  const switchMonth = (m) => {
    setActiveMonth(m);
    const d = {};
    agents.forEach(a => {
      const existing = getAgentMonthData(a, m, aprilBackfill, monthlyData, quarterWeekly);
      d[a.id] = { collections: existing.collections, sales: existing.sales, leads: existing.leads };
    });
    setData(d);
  };

  const updateField = (id, field, val) => {
    setData(prev => ({ ...prev, [id]: { ...prev[id], [field]: Number(val) || 0 } }));
  };

  const totalCol = Object.values(data).reduce((s, d) => s + (d.collections || 0), 0);
  const totalSales = Object.values(data).reduce((s, d) => s + (d.sales || 0), 0);
  const totalLeads = Object.values(data).reduce((s, d) => s + (d.leads || 0), 0);

  const handleSave = () => {
    const mKey = `m${activeMonth}`;
    const updated = { ...monthlyData, [mKey]: data };
    onSave(updated);
  };

  return (
    <div style={ST.modal} onClick={onClose}><div style={ST.mcWide} onClick={e => e.stopPropagation()}>
      <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700, color: C.text }}>📅 {monthName} {YEAR} — Monthly Data Entry</h3>
      <p style={{ fontSize: 12, color: C.textDim, margin: "0 0 4px" }}>Enter each agent's {monthName} totals for collections, sales, and leads.</p>
      <p style={{ fontSize: 11, color: C.warning, margin: "0 0 16px" }}>⚠️ Monthly entry overrides weekly data for this month. Use weekly input if you prefer week-by-week tracking.</p>

      {/* Month selector inside modal */}
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
        <label style={{ fontSize: 12, color: C.textDim, fontWeight: 600 }}>Select month:</label>
        <div style={{ display: "flex", gap: 2, background: C.bg, borderRadius: 8, padding: 2, border: `1px solid ${C.border}` }}>
          {allQuarterMonths.map(m => (
            <button key={m} onClick={() => switchMonth(m)} style={{
              padding: "6px 16px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "Arial",
              background: activeMonth === m ? C.success : "transparent",
              color: activeMonth === m ? "#000" : C.textDim,
            }}>{MONTH_NAMES[m]}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr 1fr", gap: 6, marginBottom: 8 }}>
        <div style={{ fontSize: 10, color: C.textDim, fontWeight: 600 }}>Agent</div>
        <div style={{ fontSize: 10, color: C.gold, fontWeight: 600, textAlign: "center" }}>Collections (QAR)</div>
        <div style={{ fontSize: 10, color: C.success, fontWeight: 600, textAlign: "center" }}>Sales (Count)</div>
        <div style={{ fontSize: 10, color: C.purple, fontWeight: 600, textAlign: "center" }}>Leads (Count)</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: "50vh", overflowY: "auto" }}>
        {agents.map(a => (
          <div key={a.id} style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr 1fr", gap: 6, alignItems: "center" }}>
            <span style={{ fontWeight: 600, fontSize: 12, color: C.text }}>{a.name}</span>
            <input type="number" style={ST.inputSm} value={data[a.id]?.collections || ""} placeholder="0"
              onChange={e => updateField(a.id, "collections", e.target.value)} />
            <input type="number" style={ST.inputSm} value={data[a.id]?.sales || ""} placeholder="0"
              onChange={e => updateField(a.id, "sales", e.target.value)} />
            <input type="number" style={ST.inputSm} value={data[a.id]?.leads || ""} placeholder="0"
              onChange={e => updateField(a.id, "leads", e.target.value)} />
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, padding: "14px 16px", background: C.cardAlt, borderRadius: 10, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        <div><div style={{ fontSize: 18, fontWeight: 800, color: C.gold }}>{fmt(totalCol)}</div><div style={{ fontSize: 10, color: C.textDim }}>Total Collections</div></div>
        <div><div style={{ fontSize: 18, fontWeight: 800, color: C.success }}>{totalSales}</div><div style={{ fontSize: 10, color: C.textDim }}>Total Sales</div></div>
        <div><div style={{ fontSize: 18, fontWeight: 800, color: C.purple }}>{totalLeads}</div><div style={{ fontSize: 10, color: C.textDim }}>Total Leads</div></div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
        <button style={ST.btnO} onClick={onClose}>Cancel</button>
        <button style={ST.btn()} onClick={handleSave}>Save</button>
      </div>
    </div></div>
  );
}

// ─── MODAL: AGENT ──────────────────────────────────────────────────

// ─── MODAL: APRIL BACKFILL ────────────────────────────────────────
function AprilBackfillModal({ agents, aprilBackfill, onSave, onClose }) {
  const [data, setData] = useState(() => {
    const d = {};
    agents.forEach(a => {
      d[a.id] = {
        collections: (aprilBackfill[a.id] || {}).collections || 0,
        sales: (aprilBackfill[a.id] || {}).sales || 0,
        leads: (aprilBackfill[a.id] || {}).leads || 0,
      };
    });
    return d;
  });
  const [showRatio, setShowRatio] = useState(false);

  const updateField = (id, field, val) => {
    setData(prev => ({ ...prev, [id]: { ...prev[id], [field]: Number(val) || 0 } }));
  };

  const totalCol = Object.values(data).reduce((s, d) => s + (d.collections || 0), 0);
  const totalLeads = Object.values(data).reduce((s, d) => s + (d.leads || 0), 0);
  const totalSales = Object.values(data).reduce((s, d) => s + (d.sales || 0), 0);
  const conversionPct = totalSales > 0 ? Math.round((totalCol / totalSales) * 100) : 0;

  // Format ratio as simplified X : Y
  const formatRatio = (col, sales) => {
    if (sales === 0) return "0 : 0";
    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
    const g = gcd(Math.round(col), Math.round(sales));
    if (g === 0) return `${Math.round(col)} : ${Math.round(sales)}`;
    const rc = Math.round(col / g);
    const rs = Math.round(sales / g);
    // If numbers are still large, simplify to per-1 basis
    if (rc > 1000 || rs > 1000) {
      const perSale = totalSales > 0 ? Math.round(totalCol / totalSales) : 0;
      return `${fmt(perSale)} : 1`;
    }
    return `${fmt(rc)} : ${fmt(rs)}`;
  };

  return (
    <div style={ST.modal} onClick={onClose}><div style={ST.mcWide} onClick={e => e.stopPropagation()}>
      <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700, color: C.text }}>📅 April 2026 Backfill Data</h3>
      <p style={{ fontSize: 12, color: C.textDim, margin: "0 0 4px" }}>Enter each agent's April totals. This data feeds into Q2 quarterly totals and pipeline.</p>
      <p style={{ fontSize: 11, color: C.warning, margin: "0 0 16px" }}>⚠️ April data does NOT affect monthly agent target progress bars (those only track May/June weekly data).</p>

      <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr 1fr", gap: 6, marginBottom: 8 }}>
        <div style={{ fontSize: 10, color: C.textDim, fontWeight: 600 }}>Agent</div>
        <div style={{ fontSize: 10, color: C.accent, fontWeight: 600, textAlign: "center" }}>Collections (QAR)</div>
        <div style={{ fontSize: 10, color: C.success, fontWeight: 600, textAlign: "center" }}>Sales (Count)</div>
        <div style={{ fontSize: 10, color: C.purple, fontWeight: 600, textAlign: "center" }}>Leads (Count)</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: "50vh", overflowY: "auto" }}>
        {agents.map(a => (
          <div key={a.id} style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr 1fr", gap: 6, alignItems: "center" }}>
            <span style={{ fontWeight: 600, fontSize: 12, color: C.text }}>{a.name}</span>
            <input type="number" style={ST.inputSm} value={data[a.id]?.collections || ""} placeholder="0"
              onChange={e => updateField(a.id, "collections", e.target.value)} />
            <input type="number" style={ST.inputSm} value={data[a.id]?.sales || ""} placeholder="0"
              onChange={e => updateField(a.id, "sales", e.target.value)} />
            <input type="number" style={ST.inputSm} value={data[a.id]?.leads || ""} placeholder="0"
              onChange={e => updateField(a.id, "leads", e.target.value)} />
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, padding: "14px 16px", background: C.cardAlt, borderRadius: 10, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
        <div><div style={{ fontSize: 18, fontWeight: 800, color: C.accent }}>{fmt(totalCol)}</div><div style={{ fontSize: 10, color: C.textDim }}>Total Collections</div></div>
        <div><div style={{ fontSize: 18, fontWeight: 800, color: C.success }}>{totalSales}</div><div style={{ fontSize: 10, color: C.textDim }}>Total Sales</div></div>
        <div><div style={{ fontSize: 18, fontWeight: 800, color: C.purple }}>{totalLeads}</div><div style={{ fontSize: 10, color: C.textDim }}>Total Leads</div></div>
        <div
          onClick={() => setShowRatio(!showRatio)}
          style={{ cursor: "pointer", borderRadius: 8, padding: "4px 0", background: showRatio ? "rgba(255,255,255,0.04)" : "transparent", transition: "background 0.2s" }}
        >
          {showRatio ? (
            <><div style={{ fontSize: 16, fontWeight: 800, color: C.gold }}>{formatRatio(totalCol, totalSales)}</div><div style={{ fontSize: 10, color: C.textDim }}>Collection : Sales <span style={{ color: C.accent, fontSize: 9 }}>▸ tap for %</span></div></>
          ) : (
            <><div style={{ fontSize: 18, fontWeight: 800, color: conversionPct >= 50 ? C.success : C.warning }}>{conversionPct}%</div><div style={{ fontSize: 10, color: C.textDim }}>Sales Conversion Rate <span style={{ color: C.accent, fontSize: 9 }}>▸ tap for ratio</span></div></>
          )}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
        <button style={ST.btnO} onClick={onClose}>Cancel</button>
        <button style={ST.btn()} onClick={() => onSave(data)}>Save</button>
      </div>
    </div></div>
  );
}

function AgentModal({ agent, onSave, onClose }) {
  const [form, setForm] = useState(agent ? { ...agent } : { name: "", image: "", target: 40000, hideFromTV: false });
  const [preview, setPreview] = useState(agent?.image || "");
  const [uploading, setUploading] = useState(false);
  const fRef = useRef(null);
  const handleImg = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setUploading(true);
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (ev) => {
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = 150;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        // Crop to square from center
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        const compressed = canvas.toDataURL("image/jpeg", 0.7);
        setForm(prev => ({ ...prev, image: compressed }));
        setPreview(compressed);
        setUploading(false);
      };
      img.onerror = () => { alert("Could not read image."); setUploading(false); };
      img.src = ev.target.result;
    };
    reader.onerror = () => { alert("Could not read file."); setUploading(false); };
    reader.readAsDataURL(f);
  };
  return (
    <div style={ST.modal} onClick={onClose}><div style={ST.mc} onClick={e => e.stopPropagation()}>
      <h3 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700, color: C.text }}>{agent ? "Edit Agent" : "Add Agent"}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div><label style={{ fontSize: 12, color: C.textDim, marginBottom: 6, display: "block" }}>Name</label><input style={ST.input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Agent name" /></div>
        <div>
          <label style={{ fontSize: 12, color: C.textDim, marginBottom: 6, display: "block" }}>Profile Photo</label>
          {preview ? <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}><img src={preview} alt="" style={{ width: 60, height: 60, borderRadius: "50%", objectFit: "cover", border: `2px solid ${C.accent}` }} /><button style={{ ...ST.btn(C.danger), padding: "6px 14px", fontSize: 12 }} onClick={() => { setForm({ ...form, image: "" }); setPreview(""); }}>Remove</button></div> : <div style={{ width: 60, height: 60, borderRadius: "50%", background: C.cardAlt, border: `2px dashed ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: C.textDim, marginBottom: 8 }}>👤</div>}
          <input ref={fRef} type="file" accept="image/*" onChange={handleImg} style={{ display: "none" }} />
          <button style={{ ...ST.btn(C.purple), width: "100%", textAlign: "center", opacity: uploading ? 0.6 : 1 }} onClick={() => fRef.current?.click()} disabled={uploading}>{uploading ? "⏳ Compressing..." : `📷 ${preview ? "Change Photo" : "Upload Photo"}`}</button>
        </div>
        <div><label style={{ fontSize: 12, color: C.textDim, marginBottom: 6, display: "block" }}>Monthly Target (QAR)</label><input type="number" style={ST.input} value={form.target} onChange={e => setForm({ ...form, target: Number(e.target.value)||40000 })} /></div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: 10, background: C.cardAlt, border: `1px solid ${form.hideFromTV ? C.warning : C.border}` }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>📺 Hide from TV Mode</div>
            <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>Agent data stays on dashboard but won't appear on TV slides</div>
          </div>
          <div
            onClick={() => setForm({ ...form, hideFromTV: !form.hideFromTV })}
            style={{ width: 44, height: 24, borderRadius: 12, background: form.hideFromTV ? C.warning : "#334155", cursor: "pointer", position: "relative", transition: "background 0.2s ease", flexShrink: 0 }}
          >
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: form.hideFromTV ? 23 : 3, transition: "left 0.2s ease", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
          </div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}><button style={ST.btnO} onClick={onClose}>Cancel</button><button style={ST.btn()} onClick={() => onSave(form)}>Save</button></div>
    </div></div>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────
export default function SalesDashboard() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [page, setPage] = useState("dashboard");
  const [agents, setAgents] = useState(DEFAULT_AGENTS);
  const [company, setCompany] = useState(DEFAULT_COMPANY);
  const [logo, setLogo] = useState("");
  const [tvMode, setTvMode] = useState(false);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [aprilBackfill, setAprilBackfill] = useState({});
  const [tvSettings, setTvSettings] = useState(null);
  const [previewSlide, setPreviewSlide] = useState(null);
  const [selectedQ, setSelectedQ] = useState(getCurrentQuarterNum());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-indexed current month
  const [tableView, setTableView] = useState("collections");
  const [monthlyData, setMonthlyData] = useState({});
  const [tvDisplayQ, setTvDisplayQ] = useState(2);
  const [tvDisplayMonth, setTvDisplayMonth] = useState(5);
  const [dragAgent, setDragAgent] = useState(null);
  const [quarterWeekly, setQuarterWeekly] = useState({});
  const [agentImages, setAgentImages] = useState({});
  const logoRef = useRef(null);

  useEffect(() => { const u = onAuthStateChanged(auth, u => { setLoggedIn(!!u); setAuthLoading(false); }); return () => u(); }, []);
  useEffect(() => { const p = new URLSearchParams(window.location.search); if (p.get("tv") === "true" || p.get("tv") === "preview") setTvMode(true); }, []);

  // FIX: Only start Firestore listeners AFTER user is logged in
  // This prevents "Missing or insufficient permissions" errors
  useEffect(() => {
    if (!loggedIn) return;

    let initialLoadDone = false;

    const unsubs = [
      onSnapshot(doc(db, "dashboard", "agents"), async (snap) => {
        if (snap.exists()) {
          const raw = snap.data().list;
          // Check if any agents have images stored inline (old format) — migrate them
          const imagesToMigrate = {};
          let needsMigration = false;
          const list = raw.map(a => {
            if (a.image && a.image.length > 100) {
              // This is a Base64 image — needs migration
              imagesToMigrate[a.id] = a.image;
              needsMigration = true;
            }
            return {
              ...a,
              image: "", // Always clear image from agent data — images live in agentImages doc
              hideFromTV: a.hideFromTV || false,
              weeklyLeads: a.weeklyLeads || makeEmptyWeeks(),
              weeklyCollections: a.weeklyCollections || makeEmptyWeeks(),
              weeklySales: a.weeklySales || makeEmptySales(),
            };
          });
          setAgents(list);
          // Migrate images if found
          if (needsMigration) {
            try {
              // Save images to separate document
              const existingImages = (await import("firebase/firestore")).getDoc ? agentImages : {};
              const mergedImages = { ...existingImages, ...imagesToMigrate };
              await setDoc(doc(db, "dashboard", "agentImages"), mergedImages);
              // Save agents WITHOUT images to keep document small
              await setDoc(doc(db, "dashboard", "agents"), { list: list });
              console.log("Migrated", Object.keys(imagesToMigrate).length, "agent images to separate storage");
            } catch(e) { console.error("Image migration error:", e); }
          }
        } else if (!initialLoadDone) {
          try { await setDoc(doc(db, "dashboard", "agents"), { list: DEFAULT_AGENTS }); } catch(e) { console.error("Init agents:", e); }
        }
        if (!initialLoadDone) { initialLoadDone = true; setDataLoaded(true); }
      }),
      onSnapshot(doc(db, "dashboard", "agentImages"), (snap) => {
        if (snap.exists()) setAgentImages(snap.data());
      }),
      onSnapshot(doc(db, "dashboard", "company"), async (snap) => {
        if (snap.exists()) {
          setCompany(snap.data());
        } else {
          try { await setDoc(doc(db, "dashboard", "company"), DEFAULT_COMPANY); } catch(e) { console.error("Init company:", e); }
        }
      }),
      onSnapshot(doc(db, "dashboard", "logo"), (snap) => {
        if (snap.exists()) setLogo(snap.data().url || "");
      }),
      onSnapshot(doc(db, "dashboard", "aprilBackfill"), (snap) => {
        if (snap.exists()) setAprilBackfill(snap.data());
      }),
      onSnapshot(doc(db, "dashboard", "tvSettings"), (snap) => {
        if (snap.exists()) setTvSettings(snap.data());
      }),
      onSnapshot(doc(db, "dashboard", "monthlyData"), (snap) => {
        if (snap.exists()) setMonthlyData(snap.data());
      }),
      onSnapshot(doc(db, "dashboard", "quarterWeekly"), (snap) => {
        if (snap.exists()) setQuarterWeekly(snap.data());
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, [loggedIn]);

  // Save with error handling
  const saveAgents = async (a) => {
    setAgents(a);
    setSaving(true);
    try {
      // Strip images from agent data to keep document small (images stored separately)
      const stripped = a.map(agent => ({ ...agent, image: "" }));
      await setDoc(doc(db, "dashboard", "agents"), { list: stripped });
      console.log("Agents saved successfully");
    } catch(e) {
      console.error("Save agents error:", e);
      alert("⚠️ CRITICAL: Failed to save agent data!\n\nError: " + e.message + "\n\nPlease screenshot this and contact Sadiq immediately.");
    }
    setSaving(false);
  };

  const saveAgentImage = async (agentId, imageData) => {
    try {
      const updated = { ...agentImages, [agentId]: imageData };
      await setDoc(doc(db, "dashboard", "agentImages"), updated);
      setAgentImages(updated);
      console.log("Agent image saved separately for:", agentId);
    } catch(e) {
      console.error("Save agent image error:", e);
      alert("Failed to save agent image. The image may be too large.");
    }
  };

  const removeAgentImage = async (agentId) => {
    const updated = { ...agentImages };
    delete updated[agentId];
    try {
      await setDoc(doc(db, "dashboard", "agentImages"), updated);
      setAgentImages(updated);
    } catch(e) { console.error("Remove image error:", e); }
  };
  const saveCompany = async (c) => {
    setCompany(c);
    try { await setDoc(doc(db, "dashboard", "company"), c); } catch(e) { console.error("Save company error:", e); alert("Failed to save company data."); }
  };
  const saveLogo = async (u) => {
    setLogo(u);
    setSaving(true);
    try { await setDoc(doc(db, "dashboard", "logo"), { url: u }); console.log("Logo saved"); } catch(e) { console.error("Save logo error:", e); alert("Failed to save logo. Image may be too large."); }
    setSaving(false);
  };

  const saveAprilBackfill = async (data) => {
    setAprilBackfill(data);
    setSaving(true);
    try { await setDoc(doc(db, "dashboard", "aprilBackfill"), data); console.log("April backfill saved"); } catch(e) { console.error("Save april backfill error:", e); alert("Failed to save April data."); }
    setSaving(false);
  };

  const saveTvSettings = async (data) => {
    setTvSettings(data);
    setSaving(true);
    try { await setDoc(doc(db, "dashboard", "tvSettings"), data); console.log("TV settings saved"); } catch(e) { console.error("Save TV settings error:", e); alert("Failed to save TV settings."); }
    setSaving(false);
  };

  const saveMonthlyData = async (data) => {
    setMonthlyData(data);
    setSaving(true);
    try { await setDoc(doc(db, "dashboard", "monthlyData"), data); console.log("Monthly data saved"); } catch(e) { console.error("Save monthly data error:", e); alert("Failed to save monthly data."); }
    setSaving(false);
  };

  const saveQuarterWeekly = async (data) => {
    setQuarterWeekly(data);
    setSaving(true);
    try { await setDoc(doc(db, "dashboard", "quarterWeekly"), data); console.log("Quarter weekly saved"); } catch(e) { console.error("Save quarter weekly error:", e); alert("Failed to save weekly data."); }
    setSaving(false);
  };

  const handleLogoUpload = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (ev) => {
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxW = 300, maxH = 100;
        let w = img.width, h = img.height;
        if (w > maxW) { h = h * (maxW / w); w = maxW; }
        if (h > maxH) { w = w * (maxH / h); h = maxH; }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL("image/png", 0.8);
        saveLogo(compressed);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(f);
  };

  const handleWeeklyLeadsSave = (data, q) => {
    if (q === 2) {
      const n = agents.map(a => { const d = data.find(x => x.id === a.id); return d ? { ...a, weeklyLeads: d.weeklyLeads } : a; });
      saveAgents(n);
    } else {
      const qKey = `q${q}`;
      const updated = { ...quarterWeekly };
      if (!updated[qKey]) updated[qKey] = {};
      data.forEach(d => {
        if (!updated[qKey][d.id]) updated[qKey][d.id] = {};
        updated[qKey][d.id].leads = d.weeklyLeads;
      });
      saveQuarterWeekly(updated);
    }
    setModal(null);
  };

  const handleCollSalesSave = (data, q) => {
    if (q === 2) {
      const n = agents.map(a => { const d = data.find(x => x.id === a.id); return d ? { ...a, weeklyCollections: d.weeklyCollections, weeklySales: d.weeklySales } : a; });
      saveAgents(n);
    } else {
      const qKey = `q${q}`;
      const updated = { ...quarterWeekly };
      if (!updated[qKey]) updated[qKey] = {};
      data.forEach(d => {
        if (!updated[qKey][d.id]) updated[qKey][d.id] = {};
        updated[qKey][d.id].collections = d.weeklyCollections;
        updated[qKey][d.id].sales = d.weeklySales;
      });
      saveQuarterWeekly(updated);
    }
    setModal(null);
  };

  const handleAgentSave = (form) => {
    let n;
    const imageData = form.image || "";
    if (form.id) {
      n = agents.map(a => a.id === form.id ? { ...a, name: form.name, image: "", target: form.target, hideFromTV: form.hideFromTV || false } : a);
      // Save image separately if provided
      if (imageData) saveAgentImage(form.id, imageData);
      else if (agentImages[form.id] && !imageData) removeAgentImage(form.id);
    } else {
      const newId = `a${Date.now()}`;
      n = [...agents, { ...form, id: newId, image: "", target: form.target||40000, hideFromTV: form.hideFromTV || false, weeklyLeads: makeEmptyWeeks(), weeklyCollections: makeEmptyWeeks(), weeklySales: makeEmptySales() }];
      if (imageData) saveAgentImage(newId, imageData);
    }
    saveAgents(n); setModal(null);
  };

  const handleDeleteAgent = (id) => {
    if (window.confirm("Remove this agent?")) {
      saveAgents(agents.filter(a => a.id !== id));
      removeAgentImage(id);
    }
  };

  // Merge agent images from separate storage into agent objects for rendering
  const agentsWithImages = useMemo(() => agents.map(a => ({
    ...a,
    image: agentImages[a.id] || a.image || "",
  })), [agents, agentImages]);

  // FIX: Show loading only while checking auth status
  if (authLoading) return (<div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ textAlign: "center" }}><div style={{ width: 60, height: 60, borderRadius: 14, background: `linear-gradient(135deg, ${C.accent}, #6366f1)`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 24, color: "#fff", marginBottom: 16 }}>S</div><div style={{ color: C.textDim, fontSize: 14 }}>Loading...</div></div></div>);

  // FIX: Show login BEFORE trying to load Firestore data
  if (!loggedIn && !tvMode) return <Login onLogin={() => setLoggedIn(true)} />;

  // FIX: Show loading while Firestore data is being fetched (after login)
  if (!dataLoaded) return (<div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ textAlign: "center" }}><div style={{ width: 60, height: 60, borderRadius: 14, background: `linear-gradient(135deg, ${C.accent}, #6366f1)`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 24, color: "#fff", marginBottom: 16 }}>S</div><div style={{ color: C.textDim, fontSize: 14 }}>Loading dashboard data...</div></div></div>);

  const qTarget = getQuarterTarget(company, selectedQ);
  const totalCol = getQuarterTotal(agentsWithImages, selectedQ, aprilBackfill, monthlyData, quarterWeekly);
  const qPct = pct(totalCol, qTarget);
  const pipeline = calcPipeline(agentsWithImages, selectedQ, aprilBackfill, monthlyData, quarterWeekly);
  const qMonths = getQuarterMonths(selectedQ);
  const qThursdays = selectedQ === 2 ? LEGACY_THURSDAYS : getQThursdays(YEAR, selectedQ);
  const qThursdayLabels = qThursdays.map(formatThursday);
  const sorted = [...agentsWithImages].sort((a, b) => getMonthlyCollection(b) - getMonthlyCollection(a));
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  if (tvMode) return <TVMode agents={agentsWithImages} company={company} logo={logo} onClose={() => setTvMode(false)} aprilBackfill={aprilBackfill} tvSettings={tvSettings} selectedQ={selectedQ} monthlyData={monthlyData} quarterWeekly={quarterWeekly} />;

  // ─── TV EDITS PAGE ────────────────────────────────────────────────
  const TVEdits = () => {
    const allSlides = buildSlideList(agentsWithImages, company, aprilBackfill, tvSettings, selectedQ, monthlyData, quarterWeekly);
    const [localSlides, setLocalSlides] = useState(allSlides);
    const [dragIdx, setDragIdx] = useState(null);
    const [editTimer, setEditTimer] = useState(null);

    // Sync when allSlides change (new agents, etc.) but preserve local order/settings
    useEffect(() => {
      if (tvSettings && tvSettings.slides) {
        setLocalSlides(buildSlideList(agentsWithImages, company, aprilBackfill, tvSettings, selectedQ, monthlyData, quarterWeekly));
      } else {
        setLocalSlides(allSlides);
      }
    }, [agentsWithImages.length, agentImages]);

    const saveSlides = (slides) => {
      setLocalSlides(slides);
      const toSave = slides.map(s => ({ id: s.id, visible: s.visible, dur: s.dur }));
      saveTvSettings({ slides: toSave });
    };

    const toggleVisible = (idx) => {
      const n = [...localSlides];
      n[idx] = { ...n[idx], visible: !n[idx].visible };
      saveSlides(n);
    };

    const updateDuration = (idx, ms) => {
      const n = [...localSlides];
      n[idx] = { ...n[idx], dur: ms };
      saveSlides(n);
    };

    const moveSlide = (from, to) => {
      if (to < 0 || to >= localSlides.length) return;
      const n = [...localSlides];
      const [item] = n.splice(from, 1);
      n.splice(to, 0, item);
      saveSlides(n);
    };

    const resetDefaults = () => {
      if (!window.confirm("Reset all TV slide settings to default order and timers?")) return;
      saveTvSettings({});
      setLocalSlides(buildSlideList(agentsWithImages, company, aprilBackfill, null, selectedQ, monthlyData, quarterWeekly));
    };

    const handleDragStart = (idx) => setDragIdx(idx);
    const handleDragOver = (e, idx) => { e.preventDefault(); };
    const handleDrop = (e, idx) => {
      e.preventDefault();
      if (dragIdx !== null && dragIdx !== idx) moveSlide(dragIdx, idx);
      setDragIdx(null);
    };

    const visibleCount = localSlides.filter(s => s.visible).length;
    let visibleNum = 0;

    return (
      <div style={ST.page}>
        {saving && <div style={{ position: "fixed", top: 60, right: 24, padding: "8px 16px", borderRadius: 8, background: C.accent, color: "#000", fontWeight: 600, fontSize: 13, zIndex: 150 }}>💾 Saving to cloud...</div>}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>📺 TV Slide Manager</div>
            <div style={{ fontSize: 12, color: C.textDim, marginTop: 4 }}>Drag to reorder, toggle visibility, adjust timers, preview slides &nbsp;·&nbsp; {visibleCount} of {localSlides.length} slides active</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={ST.btnO} onClick={resetDefaults}>🔄 Reset to default</button>
            <button style={ST.btn()} onClick={() => setTvMode(true)}>▶️ Launch TV</button>
          </div>
        </div>

        {/* TV Display Month Selector */}
        <div style={{ ...ST.card, marginBottom: 16, padding: 14, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, border: `1px solid ${C.accent}30` }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>📅 TV Display Period</div>
            <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>Choose which month's data to show on TV slides</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ display: "flex", gap: 2, background: C.bg, borderRadius: 8, padding: 2, border: `1px solid ${C.border}` }}>
              {[1, 2, 3, 4].map(q => (
                <button key={q} onClick={() => {
                  const newMonth = getQuarterMonths(q)[0];
                  saveTvSettings({ ...(tvSettings || {}), slides: (tvSettings || {}).slides, tvQuarter: q, tvMonth: newMonth });
                }} style={{
                  padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "Arial",
                  background: (tvSettings?.tvQuarter || selectedQ) === q ? C.accent : "transparent",
                  color: (tvSettings?.tvQuarter || selectedQ) === q ? "#000" : C.textDim,
                }}>Q{q}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 2, background: C.bg, borderRadius: 8, padding: 2, border: `1px solid ${C.border}` }}>
              {getQuarterMonths(tvSettings?.tvQuarter || selectedQ).map(m => (
                <button key={m} onClick={() => {
                  saveTvSettings({ ...(tvSettings || {}), slides: (tvSettings || {}).slides, tvQuarter: tvSettings?.tvQuarter || selectedQ, tvMonth: m });
                }} style={{
                  padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "Arial",
                  background: (tvSettings?.tvMonth ?? selectedMonth) === m ? C.success : "transparent",
                  color: (tvSettings?.tvMonth ?? selectedMonth) === m ? "#000" : C.textDim,
                }}>{MONTH_NAMES[m]}</button>
              ))}
            </div>
            <div style={{ fontSize: 12, color: C.success, fontWeight: 600 }}>
              Showing: {MONTH_NAMES[tvSettings?.tvMonth ?? selectedMonth]} {YEAR}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
          {localSlides.map((slide, idx) => {
            if (slide.visible) visibleNum++;
            const isHidden = !slide.visible;
            const durSec = Math.round(slide.dur / 1000);
            return (
              <div
                key={slide.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => handleDrop(e, idx)}
                style={{
                  background: C.card, borderRadius: 12, overflow: "hidden",
                  border: `1px solid ${dragIdx === idx ? C.accent : isHidden ? C.border : C.border}`,
                  opacity: isHidden ? 0.45 : 1, transition: "opacity 0.2s, border-color 0.2s",
                  cursor: "grab",
                }}
              >
                {/* Slide preview area */}
                <div style={{ height: 90, background: C.cardAlt, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", borderBottom: `1px solid ${C.border}` }}>
                  {slide.image ? (
                    <img src={slide.image} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", opacity: 0.7 }} />
                  ) : (
                    <span style={{ fontSize: 28, opacity: 0.3 }}>{slide.icon || "👤"}</span>
                  )}
                  {/* Position badge */}
                  <div style={{ position: "absolute", top: 6, left: 8, padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: isHidden ? `${C.textDim}30` : `${C.accent}25`, color: isHidden ? C.textDim : C.accent }}>
                    {isHidden ? "—" : visibleNum}
                  </div>
                  {/* Preview eye */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setPreviewSlide(slide); }}
                    style={{ position: "absolute", top: 6, right: 8, background: "none", border: "none", cursor: "pointer", padding: "2px 4px", fontSize: 16, color: isHidden ? C.textDim : C.text, opacity: 0.7 }}
                    title="Preview this slide"
                  >
                    {isHidden ? "👁️‍🗨️" : "👁️"}
                  </button>
                </div>

                {/* Slide info */}
                <div style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: 14, color: C.textDim, cursor: "grab" }}>⠿</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: isHidden ? C.textDim : C.text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {slide.name} {isHidden && <span style={{ fontSize: 10, color: C.warning, marginLeft: 4 }}>hidden</span>}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    {/* Timer */}
                    {editTimer === idx ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 12, color: C.textDim }}>⏱</span>
                        <input
                          type="number" min="5" max="120" value={durSec}
                          style={{ ...ST.inputSm, width: 50, padding: "4px 6px", fontSize: 12 }}
                          onChange={e => {
                            const v = Math.max(5, Math.min(120, Number(e.target.value) || 10));
                            const n = [...localSlides]; n[idx] = { ...n[idx], dur: v * 1000 }; setLocalSlides(n);
                          }}
                          onBlur={() => { saveSlides(localSlides); setEditTimer(null); }}
                          onKeyDown={e => { if (e.key === "Enter") { saveSlides(localSlides); setEditTimer(null); } }}
                          autoFocus
                        />
                        <span style={{ fontSize: 11, color: C.textDim }}>sec</span>
                      </div>
                    ) : (
                      <div onClick={() => setEditTimer(idx)} style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", padding: "2px 0" }} title="Click to edit duration">
                        <span style={{ fontSize: 12, color: C.textDim }}>⏱</span>
                        <span style={{ fontSize: 12, color: C.textDim }}>{durSec}s</span>
                      </div>
                    )}
                    {/* Visibility toggle */}
                    <div
                      onClick={() => toggleVisible(idx)}
                      style={{ width: 38, height: 20, borderRadius: 10, background: slide.visible ? C.accent : "#334155", cursor: "pointer", position: "relative", transition: "background 0.2s ease", flexShrink: 0 }}
                    >
                      <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: slide.visible ? 20 : 2, transition: "left 0.2s ease", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
                    </div>
                  </div>

                  {/* Move arrows */}
                  <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 8, borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
                    <button
                      style={{ ...ST.btnO, padding: "2px 10px", fontSize: 11, opacity: idx === 0 ? 0.3 : 1 }}
                      onClick={() => moveSlide(idx, idx - 1)}
                      disabled={idx === 0}
                    >◀ Move up</button>
                    <button
                      style={{ ...ST.btnO, padding: "2px 10px", fontSize: 11, opacity: idx === localSlides.length - 1 ? 0.3 : 1 }}
                      onClick={() => moveSlide(idx, idx + 1)}
                      disabled={idx === localSlides.length - 1}
                    >Move down ▶</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* TV Operator Links */}
        <div style={{ marginTop: 20, padding: "14px 18px", background: C.card, borderRadius: 10, border: `1px solid ${C.accent}30` }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 2 }}>📺 Production TV Link</div>
                <div style={{ fontSize: 11, color: C.textDim }}>Send to the administrator — auto-cycles, auto-updates, no controls</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1, maxWidth: 500 }}>
                <input type="text" readOnly value={`${window.location.origin}${window.location.pathname}?tv=true`} style={{ ...ST.input, fontSize: 12, flex: 1 }} onClick={e => e.target.select()} />
                <button style={{ ...ST.btn(), padding: "10px 14px", whiteSpace: "nowrap" }} onClick={() => { navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?tv=true`); alert("Production link copied!"); }}>📋 Copy</button>
              </div>
            </div>
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.warning, marginBottom: 2 }}>👁️ Preview Link</div>
                <div style={{ fontSize: 11, color: C.textDim }}>For your eyes only — has pause, skip, and "PREVIEW MODE" banner</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1, maxWidth: 500 }}>
                <input type="text" readOnly value={`${window.location.origin}${window.location.pathname}?tv=preview`} style={{ ...ST.input, fontSize: 12, flex: 1 }} onClick={e => e.target.select()} />
                <button style={{ ...ST.btn(C.warning), padding: "10px 14px", whiteSpace: "nowrap" }} onClick={() => { navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?tv=preview`); alert("Preview link copied!"); }}>📋 Copy</button>
              </div>
            </div>
          </div>
        </div>

        {/* Info bar */}
        <div style={{ marginTop: 20, padding: "14px 18px", background: C.cardAlt, borderRadius: 10, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 16 }}>ℹ️</span>
          <div style={{ fontSize: 12, color: C.textDim }}>
            <span style={{ marginRight: 16 }}>👁️ Preview opens full-screen view</span>
            <span style={{ marginRight: 16 }}>⠿ Drag or use arrows to reorder</span>
            <span style={{ marginRight: 16 }}>⏱ Click timer to edit duration (5–120 sec)</span>
            <span>Toggle turns slides on/off · All changes save to the cloud</span>
          </div>
        </div>
      </div>
    );
  };

  const Dash = () => {
    // This Week calculations (only for Q2 since that's where weekly data lives)
    const currentWi = getCurrentWeekIndex(LEGACY_THURSDAYS);
    const prevWi = currentWi > 0 ? currentWi - 1 : null;
    const thisWeekCol = agents.reduce((s, a) => s + ((a.weeklyCollections || [])[currentWi] || 0), 0);
    const prevWeekCol = prevWi !== null ? agents.reduce((s, a) => s + ((a.weeklyCollections || [])[prevWi] || 0), 0) : 0;
    const thisWeekLeads = agents.reduce((s, a) => s + ((a.weeklyLeads || [])[currentWi] || 0), 0);
    const prevWeekLeads = prevWi !== null ? agents.reduce((s, a) => s + ((a.weeklyLeads || [])[prevWi] || 0), 0) : 0;
    const thisWeekSales = agents.reduce((s, a) => s + (((a.weeklySales || [])[currentWi] || {}).total || 0), 0);
    const prevWeekSales = prevWi !== null ? agents.reduce((s, a) => s + (((a.weeklySales || [])[prevWi] || {}).total || 0), 0) : 0;
    const colTrend = trend(thisWeekCol, prevWeekCol);
    const colChange = prevWeekCol > 0 ? Math.round(((thisWeekCol - prevWeekCol) / prevWeekCol) * 100) : (thisWeekCol > 0 ? 100 : 0);
    const leadsTrend = trend(thisWeekLeads, prevWeekLeads);
    const salesTrend = trend(thisWeekSales, prevWeekSales);

    const isQ2 = selectedQ === 2;
    const hasWeeklyData = isQ2;
    const currentMonth = new Date().getMonth();
    const isCurrentMonth = selectedMonth === currentMonth;

    // Get month-specific data for each agent
    const agentMonthData = agentsWithImages.map(a => {
      const md = getAgentMonthData(a, selectedMonth, aprilBackfill, monthlyData, quarterWeekly);
      return { ...a, monthCol: md.collections, monthSales: md.sales, monthLeads: md.leads, monthSource: md.source };
    });
    const sortedByMonth = [...agentMonthData].sort((a, b) => b.monthCol - a.monthCol);

    // Month Thursdays for weekly table
    const monthThursdays = getMonthThursdays(selectedMonth, selectedQ);
    const hasMonthWeekly = monthThursdays.indices.length > 0 && (isQ2 ? selectedMonth !== 3 : true);

    return (
    <div style={ST.page}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontSize: 13, color: C.textDim }}>📅 Today: <span style={{ color: C.accent, fontWeight: 600 }}>{dateStr}</span> &nbsp;|&nbsp; Q{selectedQ} {YEAR}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Month Selector */}
          <div style={{ display: "flex", gap: 2, background: C.cardAlt, borderRadius: 8, padding: 2, border: `1px solid ${C.border}` }}>
            {qMonths.map(m => (
              <button key={m} onClick={() => setSelectedMonth(m)} style={{
                padding: "5px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "Arial",
                background: selectedMonth === m ? C.success : "transparent",
                color: selectedMonth === m ? "#000" : C.textDim,
                transition: "all 0.2s ease",
              }}>{MONTH_NAMES[m]}</button>
            ))}
          </div>
          {/* Quarter Selector */}
          <div style={{ display: "flex", gap: 2, background: C.cardAlt, borderRadius: 8, padding: 2, border: `1px solid ${C.border}` }}>
            {[1, 2, 3, 4].map(q => (
              <button key={q} onClick={() => { setSelectedQ(q); setSelectedMonth(getQuarterMonths(q)[0]); }} style={{
                padding: "5px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "Arial",
                background: selectedQ === q ? C.accent : "transparent",
                color: selectedQ === q ? "#000" : C.textDim,
                transition: "all 0.2s ease",
              }}>Q{q}</button>
            ))}
          </div>
        </div>
      </div>

      {/* This Week Summary — only show for current month with weekly data */}
      {isQ2 && isCurrentMonth && hasMonthWeekly && (
      <div style={{ ...ST.card, marginBottom: 20, background: `linear-gradient(135deg, ${C.card} 0%, #1a1a3e 100%)`, border: `1px solid ${C.accent}30` }}>
        <div style={ST.glow} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={ST.title}>⚡ This Week — W/E {formatThursday(LEGACY_THURSDAYS[currentWi])}</div>
          {prevWi !== null && <div style={{ fontSize: 11, color: C.textDim }}>vs previous week (W/E {formatThursday(LEGACY_THURSDAYS[prevWi])})</div>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: `${C.gold}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>💰</div>
            <div>
              <div style={{ fontSize: 11, color: C.textDim, marginBottom: 2 }}>Collections</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.gold }}>{fmt(thisWeekCol)} <span style={{ fontSize: 12, fontWeight: 400 }}>QAR</span></div>
              {prevWi !== null && <div style={{ fontSize: 11, color: colTrend.color, fontWeight: 600 }}>{colTrend.icon} {colChange > 0 ? "+" : ""}{colChange}% vs last week</div>}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: `${C.purple}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>📋</div>
            <div>
              <div style={{ fontSize: 11, color: C.textDim, marginBottom: 2 }}>Leads</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.purple }}>{thisWeekLeads}</div>
              {prevWi !== null && <div style={{ fontSize: 11, color: leadsTrend.color, fontWeight: 600 }}>{leadsTrend.icon} {prevWeekLeads > 0 ? `${Math.round(((thisWeekLeads - prevWeekLeads) / prevWeekLeads) * 100)}%` : (thisWeekLeads > 0 ? "+100%" : "—")} vs last week</div>}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: `${C.success}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>📈</div>
            <div>
              <div style={{ fontSize: 11, color: C.textDim, marginBottom: 2 }}>Sales</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.success }}>{thisWeekSales}</div>
              {prevWi !== null && <div style={{ fontSize: 11, color: salesTrend.color, fontWeight: 600 }}>{salesTrend.icon} {prevWeekSales > 0 ? `${Math.round(((thisWeekSales - prevWeekSales) / prevWeekSales) * 100)}%` : (thisWeekSales > 0 ? "+100%" : "—")} vs last week</div>}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Not Q2 notice */}
      {!isQ2 && (
        <div style={{ ...ST.card, marginBottom: 20, textAlign: "center", padding: 30, border: `1px solid ${C.warning}30` }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.warning, marginBottom: 8 }}>📊 Q{selectedQ} — {MONTH_NAMES[qMonths[0]]} to {MONTH_NAMES[qMonths[2]]} {YEAR}</div>
          <div style={{ fontSize: 13, color: C.textDim }}>Data entry for Q{selectedQ} will be available in the next update. Currently showing quarterly targets only.</div>
        </div>
      )}

      {/* Month indicator */}
      {isQ2 && (
        <div style={{ marginBottom: 16, padding: "10px 16px", borderRadius: 10, background: `${C.success}10`, border: `1px solid ${C.success}30`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.success }}>📅 {MONTH_NAMES[selectedMonth]} {YEAR} {selectedMonth === 3 ? "(Monthly data)" : "(Weekly data)"}</div>
          <div style={{ fontSize: 12, color: C.textDim }}>
            {(() => { const total = sortedByMonth.reduce((s, a) => s + a.monthCol, 0); const totalS = sortedByMonth.reduce((s, a) => s + a.monthSales, 0); return `${fmt(total)} QAR collected · ${fmt(totalS)} sales`; })()}
          </div>
        </div>
      )}

      <div style={{ ...ST.grid(4), marginBottom: 20 }}>
        <SCard title={`Q${selectedQ} Target`} value={fmt(qTarget)} sub="QAR" icon="📅" color={C.accent} />
        <SCard title={`Q${selectedQ} Collection`} value={fmt(totalCol)} sub={`${qPct}% of target`} icon="💰" color={C.gold} />
        <SCard title={`${MONTH_NAMES[selectedMonth]} Collection`} value={fmt(sortedByMonth.reduce((s, a) => s + a.monthCol, 0))} sub={`${MONTH_NAMES[selectedMonth]} total`} icon="📊" color={C.success} />
        <SCard title={`${MONTH_NAMES[selectedMonth]} Sales`} value={fmt(sortedByMonth.reduce((s, a) => s + a.monthSales, 0))} sub="count" icon="📈" color={C.pink} />
      </div>
      <div style={{ ...ST.grid(2), marginBottom: 20 }}>
        <div style={ST.card}>
          <div style={{ ...ST.title, justifyContent: "space-between" }}><span>🏆 Agent Performance — {MONTH_NAMES[selectedMonth]}</span><span style={{ fontSize: 11, color: C.textDim }}>Target: QAR 40,000/month</span></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, maxHeight: 600, overflowY: "auto" }}>{sortedByMonth.map((a, i) => <AgentCard key={a.id} agent={{ ...a, _monthCol: a.monthCol, _monthSales: a.monthSales, _monthLeads: a.monthLeads }} idx={i} aprilBackfill={aprilBackfill} selectedMonth={selectedMonth} monthlyData={monthlyData} />)}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={ST.card}><div style={ST.title}>📊 Quarterly Performance</div>
            <ResponsiveContainer width="100%" height={220}><BarChart data={[1,2,3,4].map(q => ({ name: `Q${q}`, target: getQuarterTarget(company, q), done: q === 2 ? totalCol : getQuarterDone(company, q) }))}><CartesianGrid strokeDasharray="3 3" stroke={C.border} /><XAxis dataKey="name" stroke={C.textDim} fontSize={12} /><YAxis stroke={C.textDim} fontSize={11} tickFormatter={v => `${(v/1000).toFixed(0)}k`} /><Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }} formatter={v => `${fmt(v)} QAR`} /><Legend /><Bar dataKey="target" fill="#334155" name="Target" radius={[4,4,0,0]} /><Bar dataKey="done" fill={C.accent} name="Collected" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer>
          </div>
          <div style={ST.card}>
            <div style={ST.title}>🔄 Q{selectedQ} Pipeline ({MONTH_NAMES[qMonths[0]]}–{MONTH_NAMES[qMonths[2]]})</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {qMonths.map(m => { const key = MONTH_NAMES[m].toLowerCase(); const d = pipeline[key] || { leads: 0, sales: 0, ratio: 0 }; return (
                <div key={m} style={{ background: C.cardAlt, borderRadius: 10, padding: 14, textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: C.textDim, marginBottom: 6 }}>{MONTH_NAMES[m]}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: C.accent }}>{fmt(d.leads)}</div><div style={{ fontSize: 11, color: C.textDim }}>leads</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: C.success, marginTop: 4 }}>{d.sales}</div><div style={{ fontSize: 11, color: C.textDim }}>sales</div>
                  <div style={{ marginTop: 6, ...ST.badge(d.ratio >= 50 ? C.success : C.warning) }}>{d.ratio}% conversion</div>
                </div>
              ); })}
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Table — filtered by selected month */}
      {hasMonthWeekly && (
      <div style={ST.card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={ST.title}>📅 {MONTH_NAMES[selectedMonth]} Weekly {tableView === "collections" ? "Collections" : "Sales"}</div>
          <div style={{ display: "flex", gap: 4, background: C.cardAlt, borderRadius: 8, padding: 2, border: `1px solid ${C.border}` }}>
            <button onClick={() => setTableView("collections")} style={{
              padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "Arial",
              background: tableView === "collections" ? C.accent : "transparent",
              color: tableView === "collections" ? "#000" : C.textDim,
            }}>💰 Collections</button>
            <button onClick={() => setTableView("sales")} style={{
              padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "Arial",
              background: tableView === "sales" ? C.success : "transparent",
              color: tableView === "sales" ? "#000" : C.textDim,
            }}>📈 Sales</button>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={ST.table}>
            <thead><tr><th style={ST.th}>Agent</th>{monthThursdays.labels.map(w => <th key={w} style={{ ...ST.th, textAlign: "right" }}>{w}</th>)}<th style={{ ...ST.th, textAlign: "right" }}>{MONTH_NAMES[selectedMonth]} Total</th></tr></thead>
            <tbody>{sortedByMonth.map((a, i) => {
              const c = tri(i);
              const qKey = `q${selectedQ}`;
              const qData = !isQ2 ? (quarterWeekly[qKey] && quarterWeekly[qKey][a.id]) : null;
              let monthTotal = 0;
              return (<tr key={a.id}><td style={{ ...ST.td, borderRadius: "8px 0 0 8px", fontWeight: 600, color: "#f1f5f9" }}><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: c, marginRight: 8 }} />{a.name}</td>
                {monthThursdays.indices.map(j => {
                  let v;
                  if (isQ2) {
                    v = tableView === "collections" ? ((a.weeklyCollections||[])[j]||0) : (((a.weeklySales||[])[j]||{}).total||0);
                  } else {
                    v = tableView === "collections" ? ((qData?.collections||[])[j]||0) : (((qData?.sales||[])[j]||{}).total||0);
                  }
                  monthTotal += v;
                  return <td key={j} style={{ ...ST.td, textAlign: "right" }}>{v > 0 ? fmt(v) : <span style={{ color: C.textDim }}>—</span>}</td>;
                })}
                <td style={{ ...ST.td, borderRadius: "0 8px 8px 0", textAlign: "right", fontWeight: 700, color: c }}>{fmt(monthTotal)}</td></tr>);
            })}</tbody>
          </table>
        </div>
      </div>
      )}

      {/* Quarterly Summary Table */}
      {isQ2 && (
      <div style={{ ...ST.card, marginTop: 16 }}>
        <div style={ST.title}>📊 Q2 Quarterly Summary (Apr–Jun)</div>
        <div style={{ overflowX: "auto" }}>
          <table style={ST.table}>
            <thead>
              <tr>
                <th style={ST.th}>Agent</th>
                <th style={{ ...ST.th, textAlign: "right", color: C.gold }}>Apr Coll</th>
                <th style={{ ...ST.th, textAlign: "right", color: C.success }}>Apr Sales</th>
                <th style={{ ...ST.th, textAlign: "right", color: C.gold }}>May Coll</th>
                <th style={{ ...ST.th, textAlign: "right", color: C.success }}>May Sales</th>
                <th style={{ ...ST.th, textAlign: "right", color: C.gold }}>Jun Coll</th>
                <th style={{ ...ST.th, textAlign: "right", color: C.success }}>Jun Sales</th>
                <th style={{ ...ST.th, textAlign: "right", color: C.accent }}>Q2 Coll</th>
                <th style={{ ...ST.th, textAlign: "right", color: C.accent }}>Q2 Sales</th>
              </tr>
            </thead>
            <tbody>{sorted.map((a, i) => {
              const mbC = getMonthBreakdown(a, "collections");
              const mbS = getMonthBreakdown(a, "sales");
              const aprilBf = aprilBackfill[a.id] || {};
              const aprC = aprilBf.collections || 0;
              const aprS = aprilBf.sales || 0;
              const mayC = mbC[4] || 0;
              const mayS = mbS[4] || 0;
              const junC = mbC[5] || 0;
              const junS = mbS[5] || 0;
              const totC = aprC + mayC + junC;
              const totS = aprS + mayS + junS;
              return (<tr key={a.id}>
                <td style={{ ...ST.td, borderRadius: "8px 0 0 8px", fontWeight: 600, color: "#f1f5f9" }}>{a.name}</td>
                <td style={{ ...ST.td, textAlign: "right" }}>{aprC > 0 ? fmt(aprC) : <span style={{ color: C.textDim }}>—</span>}</td>
                <td style={{ ...ST.td, textAlign: "right" }}>{aprS > 0 ? fmt(aprS) : <span style={{ color: C.textDim }}>—</span>}</td>
                <td style={{ ...ST.td, textAlign: "right" }}>{mayC > 0 ? fmt(mayC) : <span style={{ color: C.textDim }}>—</span>}</td>
                <td style={{ ...ST.td, textAlign: "right" }}>{mayS > 0 ? fmt(mayS) : <span style={{ color: C.textDim }}>—</span>}</td>
                <td style={{ ...ST.td, textAlign: "right" }}>{junC > 0 ? fmt(junC) : <span style={{ color: C.textDim }}>—</span>}</td>
                <td style={{ ...ST.td, textAlign: "right" }}>{junS > 0 ? fmt(junS) : <span style={{ color: C.textDim }}>—</span>}</td>
                <td style={{ ...ST.td, textAlign: "right", fontWeight: 700, color: C.accent }}>{fmt(totC)}</td>
                <td style={{ ...ST.td, borderRadius: "0 8px 8px 0", textAlign: "right", fontWeight: 700, color: C.accent }}>{fmt(totS)}</td>
              </tr>);
            })}</tbody>
          </table>
        </div>
      </div>
      )}
    </div>
    );
  };

  const Settings = () => (
    <div style={ST.page}>
      {saving && <div style={{ position: "fixed", top: 60, right: 24, padding: "8px 16px", borderRadius: 8, background: C.accent, color: "#000", fontWeight: 600, fontSize: 13, zIndex: 150 }}>💾 Saving to cloud...</div>}
      <div style={{ ...ST.grid(2), marginBottom: 20 }}>
        <div style={ST.card}>
          <div style={{ ...ST.title, justifyContent: "space-between" }}><span>👥 Agent Management</span><div style={{ display: "flex", gap: 8 }}><span style={{ fontSize: 11, color: C.textDim, alignSelf: "center" }}>↕ Drag or use arrows to reorder</span><button style={ST.btn()} onClick={() => setModal({ type: "agent" })}>+ Add Agent</button></div></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{agentsWithImages.map((a, i) => (
            <div key={a.id} draggable
              onDragStart={() => setDragAgent(i)}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); if (dragAgent !== null && dragAgent !== i) { const n = [...agents]; const [item] = n.splice(dragAgent, 1); n.splice(i, 0, item); saveAgents(n); } setDragAgent(null); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, background: C.cardAlt, cursor: "grab", border: `1px solid ${dragAgent === i ? C.accent : "transparent"}` }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <button style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 12, color: i === 0 ? C.border : C.textDim, lineHeight: 1 }} onClick={() => { if (i > 0) { const n = [...agents]; [n[i-1], n[i]] = [n[i], n[i-1]]; saveAgents(n); } }} disabled={i === 0}>▲</button>
                <button style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 12, color: i === agents.length-1 ? C.border : C.textDim, lineHeight: 1 }} onClick={() => { if (i < agents.length-1) { const n = [...agents]; [n[i], n[i+1]] = [n[i+1], n[i]]; saveAgents(n); } }} disabled={i === agents.length-1}>▼</button>
              </div>
              <span style={{ fontSize: 11, color: C.textDim, width: 18, textAlign: "center", flexShrink: 0 }}>{i+1}</span>
              {a.image ? <img src={a.image} alt={a.name} style={ST.avImg} /> : <div style={ST.av(tri(i))}>{initials(a.name)}</div>}
              <span style={{ flex: 1, fontWeight: 600, color: C.text }}>{a.name} {a.hideFromTV && <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: `${C.warning}20`, color: C.warning, fontWeight: 600, marginLeft: 4 }}>Hidden from TV</span>}</span>
              <span style={{ fontSize: 13, color: C.textDim }}>{fmt(a.target)} QAR</span>
              <button style={{ ...ST.btnO, padding: "4px 12px" }} onClick={() => setModal({ type: "agent", agent: a })}>Edit</button>
              <button style={{ ...ST.btn(C.danger), padding: "4px 12px" }} onClick={() => handleDeleteAgent(a.id)}>✕</button>
            </div>
          ))}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={ST.card}>
            <div style={ST.title}>🖼️ Company Logo</div>
            {logo && <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}><img src={logo} alt="Logo" style={{ height: 50, objectFit: "contain", background: C.cardAlt, borderRadius: 8, padding: 8 }} /><button style={{ ...ST.btn(C.danger), padding: "6px 14px", fontSize: 12 }} onClick={() => saveLogo("")}>Remove</button></div>}
            <input ref={logoRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: "none" }} />
            <button style={{ ...ST.btn(C.purple), width: "100%", textAlign: "center" }} onClick={() => logoRef.current?.click()}>📷 {logo ? "Change Logo" : "Upload Logo"}</button>
          </div>
          <div style={ST.card}>
            <div style={ST.title}>📝 Data Input</div>
            <p style={{ fontSize: 13, color: C.textDim, margin: "0 0 16px" }}>Update weekly data for leads, collections, and sales.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button style={{ ...ST.btn(C.accent), width: "100%", textAlign: "center" }} onClick={() => setModal({ type: "leads" })}>📋 Weekly Update Leads (Fadwa & Lucy)</button>
              <button style={{ ...ST.btn(C.purple), width: "100%", textAlign: "center" }} onClick={() => setModal({ type: "collsales" })}>💰 Weekly Update Collection & Sales (Finance)</button>
              <button style={{ ...ST.btn(C.gold), width: "100%", textAlign: "center" }} onClick={() => setModal({ type: "monthlyInput" })}>📅 Monthly Data Entry</button>
              <button style={{ ...ST.btn(C.warning), width: "100%", textAlign: "center" }} onClick={() => setModal({ type: "aprilBackfill" })}>📅 April Backfill Data</button>
              <button style={{ ...ST.btn(C.success), width: "100%", textAlign: "center" }} onClick={() => setModal({ type: "pipeline" })}>📊 View Company Lead Pipeline</button>
            </div>
          </div>
          <div style={ST.card}>
            <div style={ST.title}>🏢 Quarterly Targets</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {["q1Target", "q2Target", "q3Target", "q4Target", "q1Done", "q3Done", "q4Done"].map(k => (
                <div key={k}><label style={{ fontSize: 11, color: C.textDim, marginBottom: 4, display: "block" }}>{k.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase())}</label>
                  <input type="number" style={ST.input} value={company[k]} onChange={e => saveCompany({ ...company, [k]: Number(e.target.value)||0 })} /></div>
              ))}
            </div>
          </div>
          <div style={ST.card}>
            <div style={ST.title}>📺 TV Display</div>
            <button style={{ ...ST.btn(), width: "100%", fontSize: 16, padding: "14px 20px", marginBottom: 12 }} onClick={() => setTvMode(true)}>🖥️ Launch TV Mode</button>
            <div style={{ background: C.cardAlt, borderRadius: 8, padding: 14, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 12, color: C.textDim, marginBottom: 6 }}>📎 TV operator link:</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="text" readOnly value={`${window.location.origin}${window.location.pathname}?tv=true`} style={{ ...ST.input, fontSize: 12, flex: 1 }} onClick={e => e.target.select()} />
                <button style={{ ...ST.btn(), padding: "10px 14px", whiteSpace: "nowrap" }} onClick={() => { navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?tv=true`); alert("Copied!"); }}>📋</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={ST.app}>
      <nav style={ST.nav}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {logo ? <img src={logo} alt="Logo" style={{ height: 32, objectFit: "contain" }} /> : <div style={{ width: 36, height: 36, borderRadius: 8, background: `linear-gradient(135deg, ${C.accent}, #6366f1)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "#fff" }}>S</div>}
          <span style={{ fontSize: 20, fontWeight: 700, background: `linear-gradient(135deg, ${C.accent}, #a78bfa)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Sales Dashboard</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={ST.navBtn(page === "dashboard")} onClick={() => setPage("dashboard")}>📊 Dashboard</button>
          <button style={ST.navBtn(page === "tvEdits")} onClick={() => setPage("tvEdits")}>📺 TV Edits</button>
          <button style={ST.navBtn(page === "settings")} onClick={() => setPage("settings")}>⚙️ Settings</button>
          <button style={{ ...ST.navBtn(false), background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff" }} onClick={() => setTvMode(true)}>▶️ TV Mode</button>
          <button style={{ ...ST.navBtn(false), color: C.danger }} onClick={async () => { await signOut(auth); }}>🚪 Logout</button>
        </div>
      </nav>
      {page === "dashboard" ? <Dash /> : page === "tvEdits" ? <TVEdits /> : <Settings />}
      {modal?.type === "leads" && <WeeklyLeadsModal agents={agentsWithImages} selectedQ={selectedQ} quarterWeekly={quarterWeekly} onSave={handleWeeklyLeadsSave} onClose={() => setModal(null)} />}
      {modal?.type === "collsales" && <WeeklyCollSalesModal agents={agentsWithImages} selectedQ={selectedQ} quarterWeekly={quarterWeekly} onSave={handleCollSalesSave} onClose={() => setModal(null)} />}
      {modal?.type === "pipeline" && <PipelineViewModal agents={agentsWithImages} aprilBackfill={aprilBackfill} selectedQ={selectedQ} onClose={() => setModal(null)} />}
      {modal?.type === "aprilBackfill" && <AprilBackfillModal agents={agentsWithImages} aprilBackfill={aprilBackfill} onSave={(data) => { saveAprilBackfill(data); setModal(null); }} onClose={() => setModal(null)} />}
      {modal?.type === "monthlyInput" && <MonthlyInputModal agents={agentsWithImages} monthIdx={selectedMonth} monthlyData={monthlyData} aprilBackfill={aprilBackfill} quarterWeekly={quarterWeekly} onSave={(data) => { saveMonthlyData(data); setModal(null); }} onClose={() => setModal(null)} />}
      {modal?.type === "agent" && <AgentModal agent={modal.agent} onSave={handleAgentSave} onClose={() => setModal(null)} />}
      {/* Preview single slide */}
      {previewSlide && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: C.bg, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 16 }}>{previewSlide.icon || "👤"}</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Preview: {previewSlide.name}</span>
              <span style={{ fontSize: 12, color: C.textDim }}>⏱ {Math.round(previewSlide.dur / 1000)}s</span>
            </div>
            <button style={{ ...ST.btn(C.danger), padding: "6px 14px" }} onClick={() => setPreviewSlide(null)}>✕ Close Preview</button>
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 32, overflow: "hidden" }}>
            {previewSlide.comp}
          </div>
        </div>
      )}
    </div>
  );
}
