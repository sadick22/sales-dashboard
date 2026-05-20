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
const QUARTER = getCurrentQuarter();
const THURSDAYS = getCustomThursdays(); // May 7 through Jun 25, 2026
const THURSDAY_LABELS = THURSDAYS.map(formatThursday);
const NUM_WEEKS = THURSDAYS.length;
const QUARTER_MONTHS = [4, 5]; // May and June (0-indexed) since we start from May
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ─── DEFAULT DATA ──────────────────────────────────────────────────
const makeEmptyWeeks = () => new Array(NUM_WEEKS).fill(0);
const makeEmptySales = () => THURSDAYS.map(() => ({ prev: 0, current: 0, total: 0 }));

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

// Get monthly breakdown by month index (3=Apr, 4=May, 5=Jun)
const getMonthBreakdown = (agent, field) => {
  const result = {};
  QUARTER_MONTHS.forEach(m => result[m] = 0);
  THURSDAYS.forEach((t, i) => {
    const m = getMonthFromThursday(t);
    if (field === "leads") result[m] = (result[m]||0) + ((agent.weeklyLeads || [])[i] || 0);
    else if (field === "collections") result[m] = (result[m]||0) + ((agent.weeklyCollections || [])[i] || 0);
    else if (field === "sales") result[m] = (result[m]||0) + (((agent.weeklySales || [])[i] || {}).total || 0);
  });
  return result;
};

// Auto-calculate company pipeline from agent data (includes April backfill)
const Q2_ALL_MONTHS = [3, 4, 5]; // April, May, June (0-indexed) — full Q2
const calcPipeline = (agents, aprilBackfill = {}) => {
  const labels = {};
  Q2_ALL_MONTHS.forEach(m => labels[m] = MONTH_NAMES[m].toLowerCase());
  const result = {};
  Q2_ALL_MONTHS.forEach(m => {
    let leads = 0, sales = 0, collections = 0;
    if (m === 3) {
      // April: use backfill data
      agents.forEach(a => {
        const bf = aprilBackfill[a.id] || {};
        leads += bf.leads || 0;
        sales += bf.sales || 0;
        collections += bf.collections || 0;
      });
    } else {
      // May/June: use weekly data
      agents.forEach(a => {
        leads += getMonthBreakdown(a, "leads")[m] || 0;
        sales += getMonthBreakdown(a, "sales")[m] || 0;
        collections += getMonthBreakdown(a, "collections")[m] || 0;
      });
    }
    const ratio = sales > 0 ? Math.round((collections / sales) * 100) : 0;
    result[labels[m]] = { leads, sales, collections, ratio };
  });
  return result;
};

// Get Q2 total collection for an agent (April backfill + May/June weekly)
const getAgentQ2Collection = (agent, aprilBackfill = {}) => {
  const weeklyTotal = getMonthlyCollection(agent); // May + June weekly
  const aprilCol = (aprilBackfill[agent.id] || {}).collections || 0;
  return weeklyTotal + aprilCol;
};

// Get total Q2 collection across all agents
const getTotalQ2Collection = (agents, aprilBackfill = {}) => {
  return agents.reduce((s, a) => s + getAgentQ2Collection(a, aprilBackfill), 0);
};

// Get total April backfill collections
const getTotalAprilCollections = (agents, aprilBackfill = {}) => {
  return agents.reduce((s, a) => s + ((aprilBackfill[a.id] || {}).collections || 0), 0);
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

// ─── AGENT BAR ─────────────────────────────────────────────────────
function AgentBar({ agent, idx }) {
  const c = tri(idx);
  const col = getMonthlyCollection(agent);
  const p = pct(col, agent.target);
  const exceeded = col > agent.target;
  const diff = agent.target - col;
  const shimmerStyle = exceeded ? { animation: 'goldShimmer 3s ease-in-out infinite', borderLeft: `3px solid ${C.gold}` } : {};
  return (
    <div style={{ ...ST.row(exceeded ? C.gold : c), ...shimmerStyle }}>
      {agent.image ? <img src={agent.image} alt={agent.name} style={ST.avImg} /> : <div style={ST.av(c)}>{initials(agent.name)}</div>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: "#f1f5f9" }}>
            {agent.name} {exceeded && <span style={{ animation: 'starPulse 2s ease-in-out infinite', display: 'inline-block', fontSize: 12 }}>⭐</span>}
          </span>
          <span style={{ fontWeight: 700, fontSize: 14, color: exceeded ? C.gold : c }}>{fmt(col)} QAR</span>
        </div>
        <div style={ST.barBg}><div style={ST.barFill(p, exceeded ? C.gold : c)} /></div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11, color: C.textDim }}>
          <span style={{ color: "#94a3b8" }}>Target: {fmt(agent.target)} QAR</span>
          {exceeded ? (
            <span style={{ color: C.success, fontWeight: 600 }}>🎯 +{fmt(Math.abs(diff))} QAR exceeded</span>
          ) : col === agent.target ? (
            <span style={{ color: C.success, fontWeight: 600 }}>✓ Target reached!</span>
          ) : (
            <span style={{ color: C.warning }}>{fmt(Math.abs(diff))} QAR remaining</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── TV SLIDES ─────────────────────────────────────────────────────
function TVAll({ agents }) {
  const sorted = [...agents].sort((a, b) => getMonthlyCollection(b) - getMonthlyCollection(a));
  return (<div style={{ width: "100%", maxWidth: 1600 }}><h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 20, textAlign: "center", color: C.accent }}>📊 Monthly Agent Collections — Target: QAR 40,000</h2><div style={ST.grid(2)}>{sorted.map((a, i) => <AgentBar key={a.id} agent={a} idx={i} />)}</div></div>);
}

function TVAgent({ agent, idx, company, aprilBackfill = {} }) {
  const c = tri(idx);
  const col = getMonthlyCollection(agent);
  const leads = getMonthlyLeads(agent);
  const sales = getMonthlySales(agent);
  const p = pct(col, agent.target);
  const exceeded = col > agent.target;
  const diff = agent.target - col;
  const ringColor = exceeded ? C.gold : c;
  const qTarget = agent.target * 3;
  const mb = getMonthBreakdown(agent, "collections");
  const aprilCol = (aprilBackfill[agent.id] || {}).collections || 0;
  const qDone = aprilCol + QUARTER_MONTHS.reduce((s, m) => s + (mb[m]||0), 0);
  const qPct = pct(qDone, qTarget);
  const qExceeded = qDone > qTarget;
  const aprilLeads = (aprilBackfill[agent.id] || {}).leads || 0;
  const aprilSales = (aprilBackfill[agent.id] || {}).sales || 0;
  const totalLeads = leads + aprilLeads;
  const totalSales = sales + aprilSales;
  const totalCollections = col + aprilCol;
  const ratio = totalSales > 0 ? Math.round((totalCollections / totalSales) * 100) : 0;
  const monthData = [
    { name: "Apr", collection: aprilCol },
    ...QUARTER_MONTHS.map(m => ({ name: MONTH_NAMES[m], collection: mb[m]||0 }))
  ];
  const weekData = (agent.weeklyCollections||[]).map((v, i) => ({ name: THURSDAY_LABELS[i], value: v }));

  return (
    <div style={{ width: "100%", maxWidth: 1400, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        {agent.image ? <img src={agent.image} alt={agent.name} style={{ width: 110, height: 110, borderRadius: "50%", border: `4px solid ${exceeded ? C.gold : c}`, objectFit: "cover", ...(exceeded ? { animation: 'goldShimmer 3s ease-in-out infinite' } : {}) }} /> : <div style={{ ...ST.av(c), width: 110, height: 110, fontSize: 36, ...(exceeded ? { animation: 'goldShimmer 3s ease-in-out infinite', background: `linear-gradient(135deg, ${C.gold}, ${C.gold}88)` } : {}) }}>{initials(agent.name)}</div>}
        <h2 style={{ fontSize: 32, fontWeight: 800, margin: 0, color: "#f1f5f9" }}>
          {agent.name} {exceeded && <span style={{ animation: 'starPulse 2s ease-in-out infinite', display: 'inline-block' }}>⭐</span>}
        </h2>
        <Ring percent={Math.min(p, 100)} size={150} stroke={12} color={ringColor} />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 13, color: C.textDim }}>Monthly Collection</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: exceeded ? C.gold : c }}>{fmt(col)} QAR</div>
          {exceeded ? (
            <div style={{ fontSize: 13, marginTop: 2 }}>
              <span style={{ color: C.success, fontWeight: 600 }}>🎯 +{fmt(Math.abs(diff))} QAR exceeded target!</span>
            </div>
          ) : col === agent.target ? (
            <div style={{ fontSize: 13, color: C.success, fontWeight: 600, marginTop: 2 }}>✓ Target reached!</div>
          ) : (
            <div style={{ fontSize: 13, color: C.warning, marginTop: 2 }}>{fmt(Math.abs(diff))} QAR remaining</div>
          )}
        </div>
        <div style={{ background: C.cardAlt, borderRadius: 12, padding: 14, width: "100%", maxWidth: 300, textAlign: "center", border: `1px solid ${qExceeded ? C.gold : C.border}`, ...(qExceeded ? { animation: 'goldShimmer 3s ease-in-out infinite' } : {}) }}>
          <div style={{ fontSize: 11, color: C.textDim, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>Q{QUARTER} Quarterly Target</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>{fmt(qTarget)} QAR</div>
          <div style={{ ...ST.barBg, margin: "8px 0" }}><div style={ST.barFill(Math.min(qPct, 100), qExceeded ? C.gold : c)} /></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
            <span style={{ color: C.textDim }}>Done: <span style={{ color: qExceeded ? C.gold : c, fontWeight: 600 }}>{fmt(qDone)}</span></span>
            <span style={{ color: qPct >= 100 ? C.gold : qPct >= 50 ? C.success : C.warning, fontWeight: 700 }}>{qPct}%</span>
          </div>
        </div>
        <div style={{ background: C.cardAlt, borderRadius: 12, padding: 14, width: "100%", maxWidth: 300, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, color: C.textDim, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8, textAlign: "center" }}>Q2 Lead Performance</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, textAlign: "center" }}>
            <div><div style={{ fontSize: 18, fontWeight: 800, color: C.accent }}>{totalLeads}</div><div style={{ fontSize: 10, color: C.textDim }}>Leads</div></div>
            <div><div style={{ fontSize: 18, fontWeight: 800, color: C.success }}>{totalSales}</div><div style={{ fontSize: 10, color: C.textDim }}>Sales</div></div>
            <div><div style={{ fontSize: 18, fontWeight: 800, color: ratio >= 50 ? C.success : C.warning }}>{ratio}%</div><div style={{ fontSize: 10, color: C.textDim }}>Conversion Rate</div></div>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20, justifyContent: "center" }}>
        <div style={ST.card}><div style={ST.title}>Q2 Monthly Collection</div>
          <ResponsiveContainer width="100%" height={200}><BarChart data={monthData}><CartesianGrid strokeDasharray="3 3" stroke={C.border} /><XAxis dataKey="name" stroke={C.textDim} fontSize={12} /><YAxis stroke={C.textDim} fontSize={12} /><Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }} /><Bar dataKey="collection" fill={c} radius={[6,6,0,0]} /></BarChart></ResponsiveContainer>
        </div>
        <div style={ST.card}><div style={ST.title}>Weekly Collections</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={weekData}><defs><linearGradient id={`g${idx}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={c} stopOpacity={0.3} /><stop offset="95%" stopColor={c} stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke={C.border} /><XAxis dataKey="name" stroke={C.textDim} fontSize={10} /><YAxis stroke={C.textDim} fontSize={10} /><Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }} /><Area type="monotone" dataKey="value" stroke={c} fill={`url(#g${idx})`} strokeWidth={2} /></AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function TVCompany({ company, agents, aprilBackfill = {} }) {
  const total = getTotalQ2Collection(agents, aprilBackfill);
  const pipeline = calcPipeline(agents, aprilBackfill);
  const q2Pct = pct(total, company.q2Target);
  const pipeData = Q2_ALL_MONTHS.map(m => ({ name: MONTH_NAMES[m], ...(pipeline[MONTH_NAMES[m].toLowerCase()] || { leads: 0, sales: 0, ratio: 0 }) }));
  const qData = [{ name: "Q1", target: company.q1Target, done: company.q1Done }, { name: "Q2", target: company.q2Target, done: total }, { name: "Q3", target: company.q3Target, done: company.q3Done }, { name: "Q4", target: company.q4Target, done: company.q4Done }];
  return (
    <div style={{ width: "100%", maxWidth: 1600 }}>
      <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 24, textAlign: "center", color: C.accent }}>🏢 Company Performance Overview</h2>
      <div style={{ ...ST.grid(4), marginBottom: 24 }}>
        <SCard title="Q1 Result" value={`${fmt(company.q1Done)} QAR`} sub={`Target: ${fmt(company.q1Target)}`} icon="📅" color={C.purple} />
        <SCard title="Q2 Target" value={`${fmt(company.q2Target)} QAR`} sub={`Done: ${fmt(total)} QAR`} icon="📅" color={C.accent} />
        <SCard title="Q2 Progress" value={`${q2Pct}%`} icon="⚡" color={q2Pct >= 50 ? C.success : C.warning} />
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

function TVWeekly({ agents }) {
  const sorted = [...agents].sort((a, b) => getMonthlyCollection(b) - getMonthlyCollection(a));
  return (
    <div style={{ width: "100%", maxWidth: 1600, overflow: "auto" }}>
      <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 20, textAlign: "center", color: C.accent }}>📅 Weekly Collections Breakdown</h2>
      <table style={ST.table}>
        <thead><tr><th style={ST.th}>Agent</th>{THURSDAY_LABELS.map(w => <th key={w} style={{ ...ST.th, textAlign: "right" }}>{w}</th>)}<th style={{ ...ST.th, textAlign: "right" }}>Total</th></tr></thead>
        <tbody>{sorted.map((a, i) => {
          const total = getMonthlyCollection(a); const c = tri(i);
          return (<tr key={a.id}><td style={{ ...ST.td, borderRadius: "8px 0 0 8px", fontWeight: 600, color: "#f1f5f9" }}><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: c, marginRight: 8 }} />{a.name}</td>
            {(a.weeklyCollections||[]).map((v, j) => <td key={j} style={{ ...ST.td, textAlign: "right" }}>{v > 0 ? fmt(v) : <span style={{ color: C.textDim }}>—</span>}</td>)}
            <td style={{ ...ST.td, borderRadius: "0 8px 8px 0", textAlign: "right", fontWeight: 700, color: c }}>{fmt(total)}</td></tr>);
        })}</tbody>
      </table>
    </div>
  );
}

// ─── TV PODIUM (Top 3 Leaderboard) ─────────────────────────────────
function TVPodium({ agents }) {
  const sorted = [...agents].sort((a, b) => getMonthlyCollection(b) - getMonthlyCollection(a));
  const top3 = sorted.slice(0, 3);
  const podiumOrder = top3.length === 3 ? [top3[1], top3[0], top3[2]] : top3; // Silver, Gold, Bronze for visual layout
  const medals = { 0: { emoji: "🥈", label: "2nd Place", color: "#94a3b8", height: 140 }, 1: { emoji: "🥇", label: "1st Place", color: C.gold, height: 180 }, 2: { emoji: "🥉", label: "3rd Place", color: "#cd7f32", height: 110 } };
  const podiumColors = top3.length === 3 ? [medals[0], medals[1], medals[2]] : top3.map((_, i) => medals[i]);

  return (
    <div style={{ width: "100%", maxWidth: 1200, textAlign: "center" }}>
      <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8, color: C.gold }}>🏆 Top Performers</h2>
      <p style={{ fontSize: 14, color: C.textDim, marginBottom: 40 }}>Monthly Collection Leaderboard</p>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 24 }}>
        {podiumOrder.map((agent, vi) => {
          const pc = podiumColors[vi];
          const col = getMonthlyCollection(agent);
          const p = pct(col, agent.target);
          const isFirst = vi === 1;
          return (
            <div key={agent.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: isFirst ? 280 : 220 }}>
              {/* Agent info */}
              <div style={{ fontSize: isFirst ? 48 : 36, marginBottom: 8, filter: isFirst ? "drop-shadow(0 0 12px rgba(251,191,36,0.5))" : "none" }}>{pc.emoji}</div>
              <div style={{ position: "relative", marginBottom: 12 }}>
                {agent.image ? (
                  <img src={agent.image} alt={agent.name} style={{ width: isFirst ? 100 : 76, height: isFirst ? 100 : 76, borderRadius: "50%", border: `4px solid ${pc.color}`, objectFit: "cover", boxShadow: isFirst ? `0 0 24px ${pc.color}60` : "none" }} />
                ) : (
                  <div style={{ ...ST.av(pc.color), width: isFirst ? 100 : 76, height: isFirst ? 100 : 76, fontSize: isFirst ? 32 : 24, border: `4px solid ${pc.color}`, boxShadow: isFirst ? `0 0 24px ${pc.color}60` : "none" }}>{initials(agent.name)}</div>
                )}
              </div>
              <div style={{ fontSize: isFirst ? 22 : 17, fontWeight: 800, color: "#f1f5f9", marginBottom: 4 }}>{agent.name}</div>
              <div style={{ fontSize: isFirst ? 24 : 18, fontWeight: 800, color: pc.color, marginBottom: 4 }}>{fmt(col)} QAR</div>
              <div style={{ fontSize: 12, color: C.textDim, marginBottom: 12 }}>{p}% of target</div>
              {/* Podium block */}
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
      {/* Honorable mentions: 4th and 5th */}
      {sorted.length > 3 && (
        <div style={{ marginTop: 32, display: "flex", justifyContent: "center", gap: 32 }}>
          {sorted.slice(3, 5).map((a, i) => {
            const col = getMonthlyCollection(a);
            if (col <= 0) return null;
            return (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: C.textDim }}>{i + 4}.</span>
                {a.image ? <img src={a.image} alt={a.name} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} /> : <div style={{ ...ST.av(tri(i)), width: 36, height: 36, fontSize: 13 }}>{initials(a.name)}</div>}
                <span style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{a.name}</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: C.accent }}>{fmt(col)} QAR</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── TV MODE ───────────────────────────────────────────────────────
function TVMode({ agents, company, logo, onClose, aprilBackfill = {} }) {
  const tvAgents = agents.filter(a => !a.hideFromTV);
  const sorted = [...tvAgents].sort((a, b) => getMonthlyCollection(b) - getMonthlyCollection(a));
  const slides = [
    { comp: <TVCompany company={company} agents={tvAgents} aprilBackfill={aprilBackfill} />, dur: 20000 },
    { comp: <TVAll agents={tvAgents} />, dur: 15000 },
    { comp: <TVWeekly agents={tvAgents} />, dur: 15000 },
    ...sorted.filter(a => getMonthlyCollection(a) > 0).map((a, i) => ({ comp: <TVAgent agent={a} idx={i} company={company} aprilBackfill={aprilBackfill} />, dur: 10000 })),
    { comp: <TVPodium agents={tvAgents} />, dur: 15000 },
  ];
  const [cur, setCur] = useState(0);
  const [prog, setProg] = useState(0);
  const tRef = useRef(null), pRef = useRef(null);
  useEffect(() => {
    const dur = slides[cur]?.dur || 10000; const start = Date.now();
    pRef.current = setInterval(() => setProg((Date.now()-start)/dur*100), 50);
    tRef.current = setTimeout(() => { setCur(p => (p+1)%slides.length); setProg(0); }, dur);
    return () => { clearTimeout(tRef.current); clearInterval(pRef.current); };
  }, [cur, slides.length]);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: C.bg, display: "flex", flexDirection: "column" }}>
      <div style={ST.nav}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {logo ? <img src={logo} alt="Logo" style={{ height: 36, objectFit: "contain" }} /> : <div style={{ width: 36, height: 36, borderRadius: 8, background: `linear-gradient(135deg, ${C.accent}, #6366f1)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "#fff" }}>S</div>}
          <span style={{ fontSize: 20, fontWeight: 700, background: `linear-gradient(135deg, ${C.accent}, #a78bfa)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Sales Dashboard</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 13, color: C.textDim }}>Slide {cur+1}/{slides.length}</span>
          <span style={{ fontSize: 14, color: C.accent }}>{new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
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
function WeeklyLeadsModal({ agents, onSave, onClose }) {
  const [data, setData] = useState(agents.map(a => ({ id: a.id, name: a.name, weeklyLeads: [...(a.weeklyLeads || makeEmptyWeeks())] })));
  const [wi, setWi] = useState(getCurrentWeekIndex(THURSDAYS));
  const totalLeads = data.reduce((s, d) => s + (d.weeklyLeads[wi] || 0), 0);
  return (
    <div style={ST.modal} onClick={onClose}><div style={ST.mc} onClick={e => e.stopPropagation()}>
      <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700, color: C.text }}>📋 Update Weekly Leads</h3>
      <p style={{ fontSize: 12, color: C.textDim, margin: "0 0 16px" }}>For Fadwa & Lucy (Property Administrators)</p>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, color: C.textDim, marginBottom: 6, display: "block" }}>Week Ending (Thursday)</label>
        <select style={ST.sel} value={wi} onChange={e => setWi(Number(e.target.value))}>
          {THURSDAYS.map((t, i) => <option key={i} value={i}>Week ending {formatThursdayFull(t)}</option>)}
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
        <button style={ST.btn()} onClick={() => onSave(data)}>Save</button>
      </div>
    </div></div>
  );
}

// ─── MODAL: WEEKLY COLLECTION & SALES ──────────────────────────────
function WeeklyCollSalesModal({ agents, onSave, onClose }) {
  const [data, setData] = useState(agents.map(a => ({
    id: a.id, name: a.name,
    weeklyCollections: [...(a.weeklyCollections || makeEmptyWeeks())],
    weeklySales: (a.weeklySales || makeEmptySales()).map(s => ({ ...s })),
  })));
  const [wi, setWi] = useState(getCurrentWeekIndex(THURSDAYS));

  // Previous = last week's Current entry (auto-filled, read-only)
  const getAutoPrev = (agentData, weekIdx) => {
    if (weekIdx <= 0) return 0;
    return agentData.weeklySales[weekIdx - 1]?.current || 0;
  };

  // Get monthly collection total for an agent (sum of all weeks in the same month as selected week)
  const getMonthlyTotal = (agentData) => {
    const selectedMonth = THURSDAYS[wi].getMonth();
    let total = 0;
    THURSDAYS.forEach((t, i) => {
      if (t.getMonth() === selectedMonth) {
        total += agentData.weeklyCollections[i] || 0;
      }
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
        const total = current - prevVal;
        return { prev: prevVal, current, total: Math.max(total, 0) };
      });
      return { ...d, weeklySales: sales };
    }));
  };

  const handleSave = () => {
    const fixed = data.map(d => {
      const sales = d.weeklySales.map((s, j) => {
        const prevVal = j > 0 ? (d.weeklySales[j - 1]?.current || 0) : 0;
        const total = (s.current || 0) - prevVal;
        return { prev: prevVal, current: s.current || 0, total: Math.max(total, 0) };
      });
      return { ...d, weeklySales: sales };
    });
    onSave(fixed);
  };

  const totalCol = data.reduce((s, d) => s + (d.weeklyCollections[wi] || 0), 0);
  const totalSales = data.reduce((s, d) => {
    const prevVal = getAutoPrev(d, wi);
    const current = d.weeklySales[wi]?.current || 0;
    return s + Math.max(current - prevVal, 0);
  }, 0);

  // Dynamic column headers
  const prevHeader = getPrevWeekLabel(wi, THURSDAYS);
  const weekSalesHeader = getWeekSalesLabel(wi, THURSDAYS);
  const selectedMonthName = MONTH_NAMES[THURSDAYS[wi].getMonth()];

  return (
    <div style={ST.modal} onClick={onClose}><div style={ST.mcWide} onClick={e => e.stopPropagation()}>
      <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700, color: C.text }}>💰 Update Weekly Collection & Sales</h3>
      <p style={{ fontSize: 12, color: C.textDim, margin: "0 0 16px" }}>For Finance Department &nbsp;|&nbsp; Week ending: <span style={{ color: C.accent, fontWeight: 600 }}>{formatThursdayFull(THURSDAYS[wi])}</span></p>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, color: C.textDim, marginBottom: 6, display: "block" }}>Week Ending (Thursday)</label>
        <select style={ST.sel} value={wi} onChange={e => setWi(Number(e.target.value))}>
          {THURSDAYS.map((t, i) => <option key={i} value={i}>Week ending {formatThursdayFull(t)}</option>)}
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
function PipelineViewModal({ agents, aprilBackfill = {}, onClose }) {
  const pipeline = calcPipeline(agents, aprilBackfill);
  const months = Q2_ALL_MONTHS.map(m => ({ key: MONTH_NAMES[m].toLowerCase(), label: `${MONTH_NAMES[m]} ${YEAR}` }));
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
  const logoRef = useRef(null);

  useEffect(() => { const u = onAuthStateChanged(auth, u => { setLoggedIn(!!u); setAuthLoading(false); }); return () => u(); }, []);
  useEffect(() => { const p = new URLSearchParams(window.location.search); if (p.get("tv") === "true") setTvMode(true); }, []);

  // FIX: Only start Firestore listeners AFTER user is logged in
  // This prevents "Missing or insufficient permissions" errors
  useEffect(() => {
    if (!loggedIn) return;

    let initialLoadDone = false;

    const unsubs = [
      onSnapshot(doc(db, "dashboard", "agents"), async (snap) => {
        if (snap.exists()) {
          const list = snap.data().list.map(a => ({
            ...a,
            hideFromTV: a.hideFromTV || false,
            weeklyLeads: a.weeklyLeads || makeEmptyWeeks(),
            weeklyCollections: a.weeklyCollections || makeEmptyWeeks(),
            weeklySales: a.weeklySales || makeEmptySales(),
          }));
          setAgents(list);
        } else if (!initialLoadDone) {
          // First time: no data in Firestore, save defaults
          try { await setDoc(doc(db, "dashboard", "agents"), { list: DEFAULT_AGENTS }); } catch(e) { console.error("Init agents:", e); }
        }
        if (!initialLoadDone) { initialLoadDone = true; setDataLoaded(true); }
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
    ];
    return () => unsubs.forEach(u => u());
  }, [loggedIn]);

  // Save with error handling
  const saveAgents = async (a) => {
    setAgents(a);
    setSaving(true);
    try {
      await setDoc(doc(db, "dashboard", "agents"), { list: a });
      console.log("Agents saved successfully");
    } catch(e) {
      console.error("Save agents error:", e);
      alert("Failed to save. Please check your connection and try again.");
    }
    setSaving(false);
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

  const handleWeeklyLeadsSave = (data) => {
    const n = agents.map(a => { const d = data.find(x => x.id === a.id); return d ? { ...a, weeklyLeads: d.weeklyLeads } : a; });
    saveAgents(n); setModal(null);
  };

  const handleCollSalesSave = (data) => {
    const n = agents.map(a => { const d = data.find(x => x.id === a.id); return d ? { ...a, weeklyCollections: d.weeklyCollections, weeklySales: d.weeklySales } : a; });
    saveAgents(n); setModal(null);
  };

  const handleAgentSave = (form) => {
    let n;
    if (form.id) { n = agents.map(a => a.id === form.id ? { ...a, name: form.name, image: form.image, target: form.target, hideFromTV: form.hideFromTV || false } : a); }
    else { n = [...agents, { ...form, id: `a${Date.now()}`, target: form.target||40000, hideFromTV: form.hideFromTV || false, weeklyLeads: makeEmptyWeeks(), weeklyCollections: makeEmptyWeeks(), weeklySales: makeEmptySales() }]; }
    saveAgents(n); setModal(null);
  };

  const handleDeleteAgent = (id) => { if (window.confirm("Remove this agent?")) saveAgents(agents.filter(a => a.id !== id)); };

  // FIX: Show loading only while checking auth status
  if (authLoading) return (<div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ textAlign: "center" }}><div style={{ width: 60, height: 60, borderRadius: 14, background: `linear-gradient(135deg, ${C.accent}, #6366f1)`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 24, color: "#fff", marginBottom: 16 }}>S</div><div style={{ color: C.textDim, fontSize: 14 }}>Loading...</div></div></div>);

  // FIX: Show login BEFORE trying to load Firestore data
  if (!loggedIn && !tvMode) return <Login onLogin={() => setLoggedIn(true)} />;

  // FIX: Show loading while Firestore data is being fetched (after login)
  if (!dataLoaded) return (<div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ textAlign: "center" }}><div style={{ width: 60, height: 60, borderRadius: 14, background: `linear-gradient(135deg, ${C.accent}, #6366f1)`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 24, color: "#fff", marginBottom: 16 }}>S</div><div style={{ color: C.textDim, fontSize: 14 }}>Loading dashboard data...</div></div></div>);

  const totalCol = getTotalQ2Collection(agents, aprilBackfill);
  const q2Pct = pct(totalCol, company.q2Target);
  const pipeline = calcPipeline(agents, aprilBackfill);
  const sorted = [...agents].sort((a, b) => getMonthlyCollection(b) - getMonthlyCollection(a));
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  if (tvMode) return <TVMode agents={agents} company={company} logo={logo} onClose={() => setTvMode(false)} aprilBackfill={aprilBackfill} />;

  const Dash = () => {
    // This Week calculations
    const currentWi = getCurrentWeekIndex(THURSDAYS);
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

    return (
    <div style={ST.page}>
      <div style={{ fontSize: 13, color: C.textDim, marginBottom: 12 }}>📅 Today: <span style={{ color: C.accent, fontWeight: 600 }}>{dateStr}</span> &nbsp;|&nbsp; Q{QUARTER} {YEAR} &nbsp;|&nbsp; {NUM_WEEKS} weeks in quarter</div>

      {/* This Week Summary */}
      <div style={{ ...ST.card, marginBottom: 20, background: `linear-gradient(135deg, ${C.card} 0%, #1a1a3e 100%)`, border: `1px solid ${C.accent}30` }}>
        <div style={ST.glow} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={ST.title}>⚡ This Week — W/E {formatThursday(THURSDAYS[currentWi])}</div>
          {prevWi !== null && <div style={{ fontSize: 11, color: C.textDim }}>vs previous week (W/E {formatThursday(THURSDAYS[prevWi])})</div>}
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

      <div style={{ ...ST.grid(4), marginBottom: 20 }}>
        <SCard title="Q1 Result" value={fmt(company.q1Done)} sub={`Target: ${fmt(company.q1Target)} (${pct(company.q1Done, company.q1Target)}%)`} icon="📅" color={C.purple} />
        <SCard title="Q2 Target" value={fmt(company.q2Target)} sub="QAR" icon="📅" color={C.accent} />
        <SCard title="Q2 Collection" value={fmt(totalCol)} sub={`${q2Pct}% of target`} icon="💰" color={C.gold} />
        <SCard title="Agents" value={agents.length} sub={`${agents.filter(a => getMonthlyCollection(a) > 0).length} active`} icon="👥" color={C.pink} />
      </div>
      <div style={{ ...ST.grid(2), marginBottom: 20 }}>
        <div style={ST.card}>
          <div style={{ ...ST.title, justifyContent: "space-between" }}><span>🏆 Agent Monthly Collections</span><span style={{ fontSize: 11, color: C.textDim }}>Target: QAR 40,000</span></div>
          <div style={{ maxHeight: 520, overflowY: "auto" }}>{sorted.map((a, i) => <AgentBar key={a.id} agent={a} idx={i} />)}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={ST.card}><div style={ST.title}>📊 Quarterly Performance</div>
            <ResponsiveContainer width="100%" height={220}><BarChart data={[{ name: "Q1", target: company.q1Target, done: company.q1Done }, { name: "Q2", target: company.q2Target, done: totalCol }, { name: "Q3", target: company.q3Target, done: company.q3Done }, { name: "Q4", target: company.q4Target, done: company.q4Done }]}><CartesianGrid strokeDasharray="3 3" stroke={C.border} /><XAxis dataKey="name" stroke={C.textDim} fontSize={12} /><YAxis stroke={C.textDim} fontSize={11} tickFormatter={v => `${(v/1000).toFixed(0)}k`} /><Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }} formatter={v => `${fmt(v)} QAR`} /><Legend /><Bar dataKey="target" fill="#334155" name="Target" radius={[4,4,0,0]} /><Bar dataKey="done" fill={C.accent} name="Collected" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer>
          </div>
          <div style={ST.card}>
            <div style={ST.title}>🔄 Lead Pipeline (Auto-calculated)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {Q2_ALL_MONTHS.map(m => { const key = MONTH_NAMES[m].toLowerCase(); const d = pipeline[key] || { leads: 0, sales: 0, ratio: 0 }; return (
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
      <div style={ST.card}>
        <div style={ST.title}>📅 Weekly Agent Collections (Week ending Thursdays)</div>
        <div style={{ overflowX: "auto" }}>
          <table style={ST.table}>
            <thead><tr><th style={ST.th}>Agent</th>{THURSDAY_LABELS.map(w => <th key={w} style={{ ...ST.th, textAlign: "right" }}>{w}</th>)}<th style={{ ...ST.th, textAlign: "right" }}>Total</th></tr></thead>
            <tbody>{sorted.map((a, i) => {
              const total = getMonthlyCollection(a); const c = tri(i);
              return (<tr key={a.id}><td style={{ ...ST.td, borderRadius: "8px 0 0 8px", fontWeight: 600, color: "#f1f5f9" }}><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: c, marginRight: 8 }} />{a.name}</td>
                {(a.weeklyCollections||[]).map((v, j) => <td key={j} style={{ ...ST.td, textAlign: "right" }}>{v > 0 ? fmt(v) : <span style={{ color: C.textDim }}>—</span>}</td>)}
                <td style={{ ...ST.td, borderRadius: "0 8px 8px 0", textAlign: "right", fontWeight: 700, color: c }}>{fmt(total)}</td></tr>);
            })}</tbody>
          </table>
        </div>
      </div>
    </div>
    );
  };

  const Settings = () => (
    <div style={ST.page}>
      {saving && <div style={{ position: "fixed", top: 60, right: 24, padding: "8px 16px", borderRadius: 8, background: C.accent, color: "#000", fontWeight: 600, fontSize: 13, zIndex: 150 }}>💾 Saving to cloud...</div>}
      <div style={{ ...ST.grid(2), marginBottom: 20 }}>
        <div style={ST.card}>
          <div style={{ ...ST.title, justifyContent: "space-between" }}><span>👥 Agent Management</span><button style={ST.btn()} onClick={() => setModal({ type: "agent" })}>+ Add Agent</button></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{agents.map((a, i) => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8, background: C.cardAlt }}>
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
          <button style={ST.navBtn(page === "settings")} onClick={() => setPage("settings")}>⚙️ Settings</button>
          <button style={{ ...ST.navBtn(false), background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff" }} onClick={() => setTvMode(true)}>📺 TV Mode</button>
          <button style={{ ...ST.navBtn(false), color: C.danger }} onClick={async () => { await signOut(auth); }}>🚪 Logout</button>
        </div>
      </nav>
      {page === "dashboard" ? <Dash /> : <Settings />}
      {modal?.type === "leads" && <WeeklyLeadsModal agents={agents} onSave={handleWeeklyLeadsSave} onClose={() => setModal(null)} />}
      {modal?.type === "collsales" && <WeeklyCollSalesModal agents={agents} onSave={handleCollSalesSave} onClose={() => setModal(null)} />}
      {modal?.type === "pipeline" && <PipelineViewModal agents={agents} aprilBackfill={aprilBackfill} onClose={() => setModal(null)} />}
      {modal?.type === "aprilBackfill" && <AprilBackfillModal agents={agents} aprilBackfill={aprilBackfill} onSave={(data) => { saveAprilBackfill(data); setModal(null); }} onClose={() => setModal(null)} />}
      {modal?.type === "agent" && <AgentModal agent={modal.agent} onSave={handleAgentSave} onClose={() => setModal(null)} />}
    </div>
  );
}
