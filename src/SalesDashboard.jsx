import React, { useState, useEffect, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from "recharts";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";

// ─── FIREBASE CONFIG ───────────────────────────────────────────────
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

// ─── DEFAULT DATA ──────────────────────────────────────────────────
const DEFAULT_AGENTS = [
  { id: "a1", name: "Seyf", image: "", target: 40000, apr: 38533, may: 22827, jun: 0, aprLeads: 0, mayLeads: 0, junLeads: 0, aprSales: 0, maySales: 0, junSales: 0, weekly: [4000, 11284, 9266, 13983, 0, 0, 0, 0] },
  { id: "a2", name: "Devon", image: "", target: 40000, apr: 28822, may: 17283, jun: 0, aprLeads: 0, mayLeads: 0, junLeads: 0, aprSales: 0, maySales: 0, junSales: 0, weekly: [0, 8412, 0, 3875, 16535, 0, 0, 0] },
  { id: "a3", name: "Farrukh", image: "", target: 40000, apr: 73036, may: 17052, jun: 0, aprLeads: 0, mayLeads: 0, junLeads: 0, aprSales: 0, maySales: 0, junSales: 0, weekly: [0, 7188, 0, 31820, 34028, 0, 0, 0] },
  { id: "a4", name: "Anand", image: "", target: 40000, apr: 24630, may: 9580, jun: 0, aprLeads: 0, mayLeads: 0, junLeads: 0, aprSales: 0, maySales: 0, junSales: 0, weekly: [0, 0, 16091, 3939, 4600, 0, 0, 0] },
  { id: "a5", name: "Ahmed", image: "", target: 40000, apr: 14750, may: 9200, jun: 0, aprLeads: 0, mayLeads: 0, junLeads: 0, aprSales: 0, maySales: 0, junSales: 0, weekly: [0, 0, 3250, 0, 11500, 0, 0, 0] },
  { id: "a6", name: "Khaled", image: "", target: 40000, apr: 41398, may: 8750, jun: 0, aprLeads: 0, mayLeads: 0, junLeads: 0, aprSales: 0, maySales: 0, junSales: 0, weekly: [0, 0, 24188, 2917, 14293, 0, 0, 0] },
  { id: "a7", name: "Akram", image: "", target: 40000, apr: 2375, may: 5400, jun: 0, aprLeads: 0, mayLeads: 0, junLeads: 0, aprSales: 0, maySales: 0, junSales: 0, weekly: [0, 0, 0, 0, 2375, 0, 0, 0] },
  { id: "a8", name: "Sophia", image: "", target: 40000, apr: 32628, may: 3000, jun: 0, aprLeads: 0, mayLeads: 0, junLeads: 0, aprSales: 0, maySales: 0, junSales: 0, weekly: [6126, 5905, 10500, 7872, 2225, 0, 0, 0] },
  { id: "a9", name: "Leo", image: "", target: 40000, apr: 43837, may: 2000, jun: 0, aprLeads: 0, mayLeads: 0, junLeads: 0, aprSales: 0, maySales: 0, junSales: 0, weekly: [2000, 10167, 12434, 11275, 7961, 0, 0, 0] },
  { id: "a10", name: "Abdullah", image: "", target: 40000, apr: 12000, may: 0, jun: 0, aprLeads: 0, mayLeads: 0, junLeads: 0, aprSales: 0, maySales: 0, junSales: 0, weekly: [0, 6500, 5500, 0, 0, 0, 0, 0] },
  { id: "a11", name: "Firoz", image: "", target: 40000, apr: 32816, may: 0, jun: 0, aprLeads: 0, mayLeads: 0, junLeads: 0, aprSales: 0, maySales: 0, junSales: 0, weekly: [0, 0, 27370, 5446, 0, 0, 0, 0] },
  { id: "a12", name: "Gerrit", image: "", target: 40000, apr: 0, may: 0, jun: 0, aprLeads: 0, mayLeads: 0, junLeads: 0, aprSales: 0, maySales: 0, junSales: 0, weekly: [0, 0, 0, 0, 0, 0, 0, 0] },
];

const DEFAULT_COMPANY = {
  q1Target: 1175000, q1Done: 463443,
  q2Target: 1175000,
  q3Target: 1175000, q3Done: 0,
  q4Target: 1175000, q4Done: 0,
};

const DEFAULT_PIPELINE = {
  apr: { leads: 1316, sales: 77, ratio: 6 },
  may: { leads: 802, sales: 22, ratio: 3 },
  jun: { leads: 0, sales: 0, ratio: 0 },
};

const WEEK_LABELS = ["5 Apr", "12 Apr", "19 Apr", "26 Apr", "3 May", "10 May", "17 May", "24 May"];

const COLORS = {
  bg: "#0a0e17", card: "#111827", cardAlt: "#1a2235",
  accent: "#00d4ff", success: "#10b981", warning: "#f59e0b", danger: "#ef4444",
  text: "#e2e8f0", textDim: "#64748b", border: "#1e293b",
  gold: "#fbbf24", purple: "#a78bfa", pink: "#f472b6",
};

// 3 cycling colors: cyan, purple, green
const TRIO = ["#00d4ff", "#a78bfa", "#10b981"];
const triColor = (i) => TRIO[i % 3];

const fmt = (n) => new Intl.NumberFormat("en-QA").format(n);
const pct = (done, target) => target > 0 ? Math.round((done / target) * 100) : 0;
const getInitials = (name) => name.split(" ").map((n) => n[0]).join("").toUpperCase();
const getTrend = (current, previous) => {
  if (current > previous) return { icon: "▲", color: COLORS.success, label: "increase" };
  if (current < previous) return { icon: "▼", color: COLORS.danger, label: "decrease" };
  return { icon: "●", color: COLORS.textDim, label: "no change" };
};
// Auto-calc monthly collection from weekly
const calcMonthly = (weekly) => (weekly || []).reduce((s, v) => s + v, 0);

// ─── STYLES ────────────────────────────────────────────────────────
const S = {
  app: { minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "Arial, Helvetica, sans-serif", overflow: "hidden" },
  nav: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)", borderBottom: `1px solid ${COLORS.border}`, position: "sticky", top: 0, zIndex: 100 },
  navBtns: { display: "flex", gap: 8 },
  navBtn: (active) => ({ padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: active ? COLORS.accent : "rgba(255,255,255,0.06)", color: active ? "#000" : COLORS.text }),
  page: { padding: "20px 24px", maxWidth: 1920, margin: "0 auto" },
  grid: (c) => ({ display: "grid", gridTemplateColumns: `repeat(${c}, 1fr)`, gap: 16 }),
  card: { background: COLORS.card, borderRadius: 12, padding: 20, border: `1px solid ${COLORS.border}`, position: "relative", overflow: "hidden" },
  glow: { position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${COLORS.accent}, transparent)` },
  title: { fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.5px", color: COLORS.textDim, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 },
  big: { fontSize: 32, fontWeight: 800, letterSpacing: "-1px" },
  badge: (c) => ({ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${c}18`, color: c }),
  barBg: { height: 8, borderRadius: 99, background: "#334155", overflow: "hidden" },
  barFill: (p, c) => ({ height: "100%", borderRadius: 99, width: `${Math.min(p, 100)}%`, background: c, transition: "width 1s ease", boxShadow: `0 0 12px ${c}40` }),
  row: (c) => ({ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.02)", marginBottom: 6, borderLeft: `3px solid ${c}` }),
  avatar: (c) => ({ width: 40, height: 40, borderRadius: "50%", background: `linear-gradient(135deg, ${c}, ${c}88)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: "#fff", flexShrink: 0 }),
  avatarImg: { width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 },
  table: { width: "100%", borderCollapse: "separate", borderSpacing: "0 4px" },
  th: { padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", color: COLORS.textDim },
  td: { padding: "12px 14px", fontSize: 14, background: "rgba(255,255,255,0.02)", fontWeight: 500, color: COLORS.text },
  input: { width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: COLORS.cardAlt, color: COLORS.text, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "Arial, Helvetica, sans-serif" },
  btn: (c = COLORS.accent) => ({ padding: "10px 20px", borderRadius: 8, border: "none", background: c, color: c === COLORS.accent || c === COLORS.success || c === COLORS.purple ? "#fff" : "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "Arial, Helvetica, sans-serif" }),
  btnO: { padding: "8px 16px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.text, fontSize: 13, cursor: "pointer" },
  sel: { padding: "10px 14px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: COLORS.cardAlt, color: COLORS.text, fontSize: 14, outline: "none", fontFamily: "Arial, Helvetica, sans-serif" },
  modal: { position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" },
  mc: { background: COLORS.card, borderRadius: 16, padding: 28, border: `1px solid ${COLORS.border}`, width: "90%", maxWidth: 560, maxHeight: "85vh", overflowY: "auto" },
  tvOv: { position: "fixed", inset: 0, zIndex: 9999, background: COLORS.bg, display: "flex", flexDirection: "column" },
  tvH: { padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)", borderBottom: `2px solid ${COLORS.accent}30` },
  tvC: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 32, overflow: "hidden" },
  tvP: { position: "absolute", bottom: 0, left: 0, height: 4, background: `linear-gradient(90deg, ${COLORS.accent}, #6366f1)`, transition: "width 0.1s linear" },
};

// ─── SUMMARY CARD ──────────────────────────────────────────────────
function SCard({ title, value, sub, icon, color = COLORS.accent }) {
  return (
    <div style={S.card}>
      <div style={S.glow} />
      <div style={S.title}>{icon && <span style={{ fontSize: 16 }}>{icon}</span>}{title}</div>
      <div style={{ ...S.big, color }}>{value}</div>
      {sub && <div style={{ marginTop: 6, fontSize: 13, color: COLORS.textDim }}>{sub}</div>}
    </div>
  );
}

// ─── PROGRESS RING ─────────────────────────────────────────────────
function Ring({ percent, size = 120, stroke = 10, color = COLORS.accent }) {
  const r = (size - stroke) / 2, circ = 2 * Math.PI * r;
  const off = circ - (Math.min(percent, 100) / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round" style={{ transition: "stroke-dashoffset 1.5s ease" }} />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central" fill={COLORS.text} fontSize={size*0.22} fontWeight="800" style={{ transform: "rotate(90deg)", transformOrigin: "center" }}>{percent}%</text>
    </svg>
  );
}

// ─── AGENT BAR ─────────────────────────────────────────────────────
function AgentBar({ agent, idx }) {
  const c = triColor(idx);
  const collection = calcMonthly(agent.weekly);
  const p = pct(collection, agent.target);
  const trend = getTrend(collection, agent.apr);
  return (
    <div style={S.row(c)}>
      {agent.image ? <img src={agent.image} alt={agent.name} style={S.avatarImg} /> : <div style={S.avatar(c)}>{getInitials(agent.name)}</div>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: "#f1f5f9" }}>{agent.name}</span>
          <span style={{ fontWeight: 700, fontSize: 14, color: c }}>{fmt(collection)} QAR</span>
        </div>
        <div style={S.barBg}><div style={S.barFill(p, c)} /></div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11, color: COLORS.textDim }}>
          <span style={{ color: "#94a3b8" }}>Target: {fmt(agent.target)} QAR</span>
          <span style={{ color: collection >= agent.target ? COLORS.success : COLORS.danger }}>Diff: {fmt(agent.target - collection)} QAR</span>
          <span style={S.badge(trend.color)}>{trend.icon} vs prev</span>
        </div>
      </div>
    </div>
  );
}

// ─── TV: ALL AGENTS ────────────────────────────────────────────────
function TVAll({ agents }) {
  const sorted = [...agents].sort((a, b) => calcMonthly(b.weekly) - calcMonthly(a.weekly));
  return (
    <div style={{ width: "100%", maxWidth: 1600 }}>
      <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 20, textAlign: "center", color: COLORS.accent }}>📊 Monthly Agent Collections — Target: QAR 40,000</h2>
      <div style={S.grid(2)}>{sorted.map((a, i) => <AgentBar key={a.id} agent={a} idx={i} />)}</div>
    </div>
  );
}

// ─── TV: INDIVIDUAL AGENT ──────────────────────────────────────────
function TVAgent({ agent, idx, company }) {
  const c = triColor(idx);
  const collection = calcMonthly(agent.weekly);
  const p = pct(collection, agent.target);
  const trend = getTrend(collection, agent.apr);
  const qTarget = agent.target * 3;
  const qDone = agent.apr + collection + agent.jun;
  const qPct = pct(qDone, qTarget);
  const agentLeads = (agent.aprLeads||0) + (agent.mayLeads||0) + (agent.junLeads||0);
  const agentSales = (agent.aprSales||0) + (agent.maySales||0) + (agent.junSales||0);
  const agentRatio = agentLeads > 0 ? Math.round((agentSales / agentLeads) * 100) : 0;
  const monthData = [{ name: "Apr", collection: agent.apr }, { name: "May", collection }, { name: "Jun", collection: agent.jun }];
  const weekData = (agent.weekly||[]).map((v, i) => ({ name: WEEK_LABELS[i]||`W${i+1}`, value: v }));

  return (
    <div style={{ width: "100%", maxWidth: 1400, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        {agent.image ? <img src={agent.image} alt={agent.name} style={{ width: 110, height: 110, borderRadius: "50%", border: `4px solid ${c}`, objectFit: "cover" }} />
          : <div style={{ ...S.avatar(c), width: 110, height: 110, fontSize: 36 }}>{getInitials(agent.name)}</div>}
        <h2 style={{ fontSize: 32, fontWeight: 800, margin: 0, color: "#f1f5f9" }}>{agent.name}</h2>
        <Ring percent={p} size={150} stroke={12} color={c} />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 13, color: COLORS.textDim }}>Monthly Collection</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: c }}>{fmt(collection)} QAR</div>
          <div style={{ fontSize: 13, color: COLORS.textDim, marginTop: 2 }}>Diff: <span style={{ color: COLORS.danger, fontWeight: 600 }}>{fmt(agent.target - collection)} QAR</span></div>
        </div>
        {/* Quarterly */}
        <div style={{ background: COLORS.cardAlt, borderRadius: 12, padding: 14, width: "100%", maxWidth: 300, textAlign: "center", border: `1px solid ${COLORS.border}` }}>
          <div style={{ fontSize: 11, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>Q2 Quarterly Target</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.text }}>{fmt(qTarget)} QAR</div>
          <div style={{ ...S.barBg, margin: "8px 0" }}><div style={S.barFill(qPct, c)} /></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
            <span style={{ color: COLORS.textDim }}>Done: <span style={{ color: c, fontWeight: 600 }}>{fmt(qDone)}</span></span>
            <span style={{ color: qPct >= 50 ? COLORS.success : COLORS.warning, fontWeight: 700 }}>{qPct}%</span>
          </div>
        </div>
        {/* Agent Leads */}
        <div style={{ background: COLORS.cardAlt, borderRadius: 12, padding: 14, width: "100%", maxWidth: 300, border: `1px solid ${COLORS.border}` }}>
          <div style={{ fontSize: 11, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8, textAlign: "center" }}>Lead Performance (Q2)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, textAlign: "center" }}>
            <div><div style={{ fontSize: 18, fontWeight: 800, color: COLORS.accent }}>{agentLeads}</div><div style={{ fontSize: 10, color: COLORS.textDim }}>Leads</div></div>
            <div><div style={{ fontSize: 18, fontWeight: 800, color: COLORS.success }}>{agentSales}</div><div style={{ fontSize: 10, color: COLORS.textDim }}>Sales</div></div>
            <div><div style={{ fontSize: 18, fontWeight: 800, color: agentRatio >= 5 ? COLORS.success : COLORS.warning }}>{agentRatio}%</div><div style={{ fontSize: 10, color: COLORS.textDim }}>Close Rate</div></div>
          </div>
        </div>
        <span style={{ ...S.badge(trend.color), fontSize: 13, padding: "6px 16px" }}>{trend.icon} {trend.label} vs previous month</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20, justifyContent: "center" }}>
        <div style={S.card}>
          <div style={S.title}>Last 3 Months Collection</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthData}><CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} /><XAxis dataKey="name" stroke={COLORS.textDim} fontSize={12} /><YAxis stroke={COLORS.textDim} fontSize={12} /><Tooltip contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text }} /><Bar dataKey="collection" fill={c} radius={[6,6,0,0]} /></BarChart>
          </ResponsiveContainer>
        </div>
        <div style={S.card}>
          <div style={S.title}>Weekly Collections</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={weekData}>
              <defs><linearGradient id={`g${idx}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={c} stopOpacity={0.3} /><stop offset="95%" stopColor={c} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} /><XAxis dataKey="name" stroke={COLORS.textDim} fontSize={10} /><YAxis stroke={COLORS.textDim} fontSize={10} /><Tooltip contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text }} /><Area type="monotone" dataKey="value" stroke={c} fill={`url(#g${idx})`} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {/* Agent Leads by Month */}
        <div style={S.card}>
          <div style={S.title}>Lead Performance by Month</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[{ m: "Apr", l: agent.aprLeads||0, s: agent.aprSales||0 }, { m: "May", l: agent.mayLeads||0, s: agent.maySales||0 }, { m: "Jun", l: agent.junLeads||0, s: agent.junSales||0 }].map(d => (
              <div key={d.m} style={{ background: COLORS.cardAlt, borderRadius: 8, padding: 12, textAlign: "center" }}>
                <div style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 4 }}>{d.m}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.accent }}>{d.l} <span style={{ fontSize: 10, color: COLORS.textDim }}>leads</span></div>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.success }}>{d.s} <span style={{ fontSize: 10, color: COLORS.textDim }}>sales</span></div>
                <div style={{ fontSize: 11, color: d.l > 0 && (d.s/d.l*100) >= 5 ? COLORS.success : COLORS.warning, fontWeight: 600, marginTop: 2 }}>{d.l > 0 ? Math.round(d.s/d.l*100) : 0}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TV: COMPANY PERFORMANCE ───────────────────────────────────────
function TVCompany({ company, agents, pipeline }) {
  const total = agents.reduce((s, a) => s + calcMonthly(a.weekly), 0);
  const q2Pct = pct(total, company.q2Target);
  const q1Pct = pct(company.q1Done, company.q1Target);
  const pipeData = [
    { name: "Apr", leads: pipeline.apr.leads, sales: pipeline.apr.sales, ratio: pipeline.apr.ratio },
    { name: "May", leads: pipeline.may.leads, sales: pipeline.may.sales, ratio: pipeline.may.ratio },
    { name: "Jun", leads: pipeline.jun.leads, sales: pipeline.jun.sales, ratio: pipeline.jun.ratio },
  ];
  const qData = [
    { name: "Q1", target: company.q1Target, done: company.q1Done },
    { name: "Q2", target: company.q2Target, done: total },
    { name: "Q3", target: company.q3Target, done: company.q3Done },
    { name: "Q4", target: company.q4Target, done: company.q4Done },
  ];
  return (
    <div style={{ width: "100%", maxWidth: 1600 }}>
      <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 24, textAlign: "center", color: COLORS.accent }}>🏢 Company Performance Overview</h2>
      <div style={{ ...S.grid(4), marginBottom: 24 }}>
        <SCard title="Q1 Result" value={`${fmt(company.q1Done)} QAR`} sub={`Target: ${fmt(company.q1Target)} (${q1Pct}%)`} icon="📅" color={COLORS.purple} />
        <SCard title="Q2 Target" value={`${fmt(company.q2Target)} QAR`} sub={`Done: ${fmt(total)} QAR`} icon="📅" color={COLORS.accent} />
        <SCard title="Q2 Progress" value={`${q2Pct}%`} icon="⚡" color={q2Pct >= 50 ? COLORS.success : COLORS.warning} />
        <SCard title="Team Collection" value={`${fmt(total)} QAR`} sub={`${agents.filter(a => calcMonthly(a.weekly) > 0).length} of ${agents.length} active`} icon="👥" color={COLORS.gold} />
      </div>
      <div style={S.grid(2)}>
        <div style={S.card}>
          <div style={S.title}>Quarterly Breakdown</div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={qData}><CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} /><XAxis dataKey="name" stroke={COLORS.textDim} fontSize={12} /><YAxis stroke={COLORS.textDim} fontSize={11} tickFormatter={v => `${(v/1000).toFixed(0)}k`} /><Tooltip contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text }} formatter={v => fmt(v)} /><Legend /><Bar dataKey="target" fill="#334155" name="Target" radius={[4,4,0,0]} /><Bar dataKey="done" fill={COLORS.accent} name="Collected" radius={[4,4,0,0]} /></BarChart>
          </ResponsiveContainer>
        </div>
        <div style={S.card}>
          <div style={S.title}>Lead Pipeline (Last 3 Months)</div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={pipeData}><CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} /><XAxis dataKey="name" stroke={COLORS.textDim} fontSize={12} /><YAxis stroke={COLORS.textDim} fontSize={11} /><Tooltip contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text }} /><Legend /><Bar dataKey="leads" fill={COLORS.accent} name="Leads" radius={[4,4,0,0]} /><Bar dataKey="sales" fill={COLORS.success} name="Sales" radius={[4,4,0,0]} /></BarChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", justifyContent: "center", gap: 32, marginTop: 12 }}>
            {pipeData.map(d => (<div key={d.name} style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: COLORS.textDim }}>{d.name} Closing Rate</div><div style={{ fontSize: 20, fontWeight: 800, color: d.ratio >= 5 ? COLORS.success : COLORS.warning }}>{d.ratio}%</div></div>))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TV: WEEKLY TABLE ──────────────────────────────────────────────
function TVWeekly({ agents }) {
  const sorted = [...agents].sort((a, b) => calcMonthly(b.weekly) - calcMonthly(a.weekly));
  return (
    <div style={{ width: "100%", maxWidth: 1600, overflow: "auto" }}>
      <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 20, textAlign: "center", color: COLORS.accent }}>📅 Weekly Collections Breakdown</h2>
      <table style={S.table}>
        <thead><tr><th style={S.th}>Agent</th>{WEEK_LABELS.map(w => <th key={w} style={{ ...S.th, textAlign: "right" }}>{w}</th>)}<th style={{ ...S.th, textAlign: "right" }}>Total</th></tr></thead>
        <tbody>
          {sorted.map((a, i) => {
            const total = calcMonthly(a.weekly);
            const c = triColor(i);
            return (
              <tr key={a.id}>
                <td style={{ ...S.td, borderRadius: "8px 0 0 8px", fontWeight: 600, color: "#f1f5f9" }}><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: c, marginRight: 8 }} />{a.name}</td>
                {(a.weekly||[]).map((v, j) => {
                  const prev = j > 0 ? a.weekly[j-1] : 0;
                  const t = v > 0 ? getTrend(v, prev) : null;
                  return <td key={j} style={{ ...S.td, textAlign: "right" }}>{v > 0 ? <span>{fmt(v)} {t && <span style={{ color: t.color, fontSize: 10, marginLeft: 4 }}>{t.icon}</span>}</span> : <span style={{ color: COLORS.textDim }}>—</span>}</td>;
                })}
                <td style={{ ...S.td, borderRadius: "0 8px 8px 0", textAlign: "right", fontWeight: 700, color: c }}>{fmt(total)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── TV MODE ───────────────────────────────────────────────────────
function TVMode({ agents, company, pipeline, logo, onClose }) {
  const sorted = [...agents].sort((a, b) => calcMonthly(b.weekly) - calcMonthly(a.weekly));
  const slides = [
    { comp: <TVCompany company={company} agents={agents} pipeline={pipeline} />, dur: 15000 },
    { comp: <TVAll agents={agents} />, dur: 15000 },
    { comp: <TVWeekly agents={agents} />, dur: 15000 },
    ...sorted.filter(a => calcMonthly(a.weekly) > 0).map((a, i) => ({ comp: <TVAgent agent={a} idx={i} company={company} />, dur: 5000 })),
  ];
  const [cur, setCur] = useState(0);
  const [prog, setProg] = useState(0);
  const tRef = useRef(null), pRef = useRef(null);

  useEffect(() => {
    const dur = slides[cur]?.dur || 10000;
    const start = Date.now();
    pRef.current = setInterval(() => setProg((Date.now()-start)/dur*100), 50);
    tRef.current = setTimeout(() => { setCur(p => (p+1)%slides.length); setProg(0); }, dur);
    return () => { clearTimeout(tRef.current); clearInterval(pRef.current); };
  }, [cur, slides.length]);

  return (
    <div style={S.tvOv}>
      <div style={S.tvH}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {logo ? <img src={logo} alt="Logo" style={{ height: 36, objectFit: "contain" }} /> : <div style={{ width: 36, height: 36, borderRadius: 8, background: `linear-gradient(135deg, ${COLORS.accent}, #6366f1)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "#fff" }}>S</div>}
          <span style={{ fontSize: 20, fontWeight: 700, background: `linear-gradient(135deg, ${COLORS.accent}, #a78bfa)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Sales Dashboard</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 13, color: COLORS.textDim }}>Slide {cur+1} of {slides.length}</span>
          <span style={{ fontSize: 16, color: COLORS.accent }}>{new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
          <button onClick={onClose} style={{ ...S.btn(COLORS.danger), padding: "6px 14px" }}>✕ Exit TV</button>
        </div>
      </div>
      <div style={S.tvC}>{slides[cur]?.comp}</div>
      <div style={{ ...S.tvP, width: `${prog}%` }} />
    </div>
  );
}

// ─── LOGIN ─────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!user || !pass) { setErr("Please enter both username and password"); return; }
    setLoading(true); setErr("");
    try {
      const email = user.includes("@") ? user : `${user}@dashboard.local`;
      await signInWithEmailAndPassword(auth, email, pass);
      onLogin();
    } catch (e) {
      if (e.code === "auth/invalid-credential" || e.code === "auth/user-not-found" || e.code === "auth/wrong-password") setErr("Invalid username or password");
      else if (e.code === "auth/too-many-requests") setErr("Too many attempts. Try again later.");
      else setErr("Login failed. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 400, padding: 40, background: COLORS.card, borderRadius: 16, border: `1px solid ${COLORS.border}` }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 60, height: 60, borderRadius: 14, background: `linear-gradient(135deg, ${COLORS.accent}, #6366f1)`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 24, color: "#fff", marginBottom: 16 }}>S</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: COLORS.text, margin: "0 0 4px" }}>Sales Dashboard</h1>
          <p style={{ fontSize: 14, color: COLORS.textDim, margin: 0 }}>Sign in to access the dashboard</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div><label style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 6, display: "block" }}>Username</label><input type="text" style={S.input} value={user} onChange={e => setUser(e.target.value)} placeholder="Enter username" /></div>
          <div><label style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 6, display: "block" }}>Password</label><input type="password" style={S.input} value={pass} onChange={e => setPass(e.target.value)} placeholder="Enter password" onKeyDown={e => e.key === "Enter" && submit()} /></div>
          {err && <div style={{ padding: "8px 12px", borderRadius: 8, background: `${COLORS.danger}18`, color: COLORS.danger, fontSize: 13 }}>{err}</div>}
          <button style={{ ...S.btn(), width: "100%", textAlign: "center", padding: "12px 20px", fontSize: 15, opacity: loading ? 0.6 : 1 }} onClick={submit} disabled={loading}>{loading ? "Signing in..." : "Sign In"}</button>
        </div>
        <p style={{ fontSize: 11, color: COLORS.textDim, textAlign: "center", marginTop: 20 }}>Contact your administrator for access credentials</p>
      </div>
    </div>
  );
}

// ─── MODALS ────────────────────────────────────────────────────────
function WeeklyModal({ agents, onSave, onClose }) {
  const [data, setData] = useState(agents.map(a => ({ id: a.id, name: a.name, weekly: [...(a.weekly||[])] })));
  const [wi, setWi] = useState(0);
  return (
    <div style={S.modal} onClick={onClose}><div style={S.mc} onClick={e => e.stopPropagation()}>
      <h3 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700, color: COLORS.text }}>Update Weekly Collections</h3>
      <div style={{ marginBottom: 16 }}><label style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 6, display: "block" }}>Select Week</label>
        <select style={S.sel} value={wi} onChange={e => setWi(Number(e.target.value))}>{WEEK_LABELS.map((l,i) => <option key={i} value={i}>Week ending {l}</option>)}</select>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {data.map(d => (<div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12 }}><span style={{ width: 90, fontWeight: 600, fontSize: 14, color: COLORS.text }}>{d.name}</span><input type="number" style={S.input} value={d.weekly[wi]||0} onChange={e => setData(prev => prev.map(x => x.id === d.id ? { ...x, weekly: x.weekly.map((v,j) => j === wi ? (Number(e.target.value)||0) : v) } : x))} /></div>))}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}><button style={S.btnO} onClick={onClose}>Cancel</button><button style={S.btn()} onClick={() => onSave(data)}>Save</button></div>
    </div></div>
  );
}

function AgentLeadsModal({ agents, onSave, onClose }) {
  const [data, setData] = useState(agents.map(a => ({ id: a.id, name: a.name, aprLeads: a.aprLeads||0, mayLeads: a.mayLeads||0, junLeads: a.junLeads||0, aprSales: a.aprSales||0, maySales: a.maySales||0, junSales: a.junSales||0 })));
  const months = ["apr", "may", "jun"];
  const labels = { apr: "April", may: "May", jun: "June" };
  const [month, setMonth] = useState("may");
  return (
    <div style={S.modal} onClick={onClose}><div style={{ ...S.mc, maxWidth: 620 }} onClick={e => e.stopPropagation()}>
      <h3 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700, color: COLORS.text }}>Update Agent Leads & Sales</h3>
      <div style={{ marginBottom: 16 }}><label style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 6, display: "block" }}>Select Month</label>
        <select style={S.sel} value={month} onChange={e => setMonth(e.target.value)}>{months.map(m => <option key={m} value={m}>{labels[m]}</option>)}</select>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: COLORS.textDim, fontWeight: 600, paddingLeft: 4 }}>Agent</div>
        <div style={{ fontSize: 12, color: COLORS.textDim, fontWeight: 600 }}>Leads</div>
        <div style={{ fontSize: 12, color: COLORS.textDim, fontWeight: 600 }}>Sales</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {data.map(d => (
          <div key={d.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, alignItems: "center" }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: COLORS.text }}>{d.name}</span>
            <input type="number" style={S.input} value={d[`${month}Leads`]} onChange={e => setData(prev => prev.map(x => x.id === d.id ? { ...x, [`${month}Leads`]: Number(e.target.value)||0 } : x))} />
            <input type="number" style={S.input} value={d[`${month}Sales`]} onChange={e => setData(prev => prev.map(x => x.id === d.id ? { ...x, [`${month}Sales`]: Number(e.target.value)||0 } : x))} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}><button style={S.btnO} onClick={onClose}>Cancel</button><button style={S.btn()} onClick={() => onSave(data)}>Save</button></div>
    </div></div>
  );
}

function AgentModal({ agent, onSave, onClose }) {
  const [form, setForm] = useState(agent || { name: "", image: "", target: 40000 });
  const [preview, setPreview] = useState(agent?.image || "");
  const fRef = useRef(null);
  const handleImg = (e) => { const f = e.target.files[0]; if (f) { const r = new FileReader(); r.onloadend = () => { setForm({ ...form, image: r.result }); setPreview(r.result); }; r.readAsDataURL(f); } };
  return (
    <div style={S.modal} onClick={onClose}><div style={S.mc} onClick={e => e.stopPropagation()}>
      <h3 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700, color: COLORS.text }}>{agent ? "Edit Agent" : "Add Agent"}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div><label style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 6, display: "block" }}>Name</label><input style={S.input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Agent name" /></div>
        <div>
          <label style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 6, display: "block" }}>Profile Photo</label>
          {preview ? <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}><img src={preview} alt="" style={{ width: 60, height: 60, borderRadius: "50%", objectFit: "cover", border: `2px solid ${COLORS.accent}` }} /><button style={{ ...S.btn(COLORS.danger), padding: "6px 14px", fontSize: 12 }} onClick={() => { setForm({ ...form, image: "" }); setPreview(""); }}>Remove</button></div>
            : <div style={{ width: 60, height: 60, borderRadius: "50%", background: COLORS.cardAlt, border: `2px dashed ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: COLORS.textDim, marginBottom: 8 }}>👤</div>}
          <input ref={fRef} type="file" accept="image/*" onChange={handleImg} style={{ display: "none" }} />
          <button style={{ ...S.btn(COLORS.purple), width: "100%", textAlign: "center" }} onClick={() => fRef.current?.click()}>📷 {preview ? "Change Photo" : "Upload Photo"}</button>
        </div>
        <div><label style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 6, display: "block" }}>Monthly Target (QAR)</label><input type="number" style={S.input} value={form.target} onChange={e => setForm({ ...form, target: Number(e.target.value)||40000 })} /></div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}><button style={S.btnO} onClick={onClose}>Cancel</button><button style={S.btn()} onClick={() => onSave(form)}>Save</button></div>
    </div></div>
  );
}

function PipelineModal({ pipeline, onSave, onClose }) {
  const [data, setData] = useState({ ...pipeline });
  const months = ["apr", "may", "jun"];
  const labels = { apr: "April 2026", may: "May 2026", jun: "June 2026" };
  return (
    <div style={S.modal} onClick={onClose}><div style={S.mc} onClick={e => e.stopPropagation()}>
      <h3 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700, color: COLORS.text }}>Update Lead Pipeline</h3>
      {months.map(m => (
        <div key={m} style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, color: COLORS.accent }}>{labels[m]}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div><label style={{ fontSize: 11, color: COLORS.textDim }}>Leads</label><input type="number" style={S.input} value={data[m].leads} onChange={e => { const l = Number(e.target.value)||0; const s = data[m].sales; setData({ ...data, [m]: { leads: l, sales: s, ratio: l > 0 ? Math.round(s/l*100) : 0 } }); }} /></div>
            <div><label style={{ fontSize: 11, color: COLORS.textDim }}>Sales</label><input type="number" style={S.input} value={data[m].sales} onChange={e => { const s = Number(e.target.value)||0; const l = data[m].leads; setData({ ...data, [m]: { leads: l, sales: s, ratio: l > 0 ? Math.round(s/l*100) : 0 } }); }} /></div>
            <div><label style={{ fontSize: 11, color: COLORS.textDim }}>Rate</label><input type="text" style={{ ...S.input, background: COLORS.bg }} value={`${data[m].ratio}%`} disabled /></div>
          </div>
        </div>
      ))}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}><button style={S.btnO} onClick={onClose}>Cancel</button><button style={S.btn()} onClick={() => onSave(data)}>Save</button></div>
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
  const [pipeline, setPipeline] = useState(DEFAULT_PIPELINE);
  const [logo, setLogo] = useState("");
  const [tvMode, setTvMode] = useState(false);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const logoRef = useRef(null);

  // Firebase auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => { setLoggedIn(!!u); setAuthLoading(false); });
    return () => unsub();
  }, []);

  // Auto TV mode
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("tv") === "true") setTvMode(true);
  }, []);

  // Load data from Firestore on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const agentsDoc = await getDoc(doc(db, "dashboard", "agents"));
        if (agentsDoc.exists()) setAgents(agentsDoc.data().list);
        const companyDoc = await getDoc(doc(db, "dashboard", "company"));
        if (companyDoc.exists()) setCompany(companyDoc.data());
        const pipelineDoc = await getDoc(doc(db, "dashboard", "pipeline"));
        if (pipelineDoc.exists()) setPipeline(pipelineDoc.data());
        const logoDoc = await getDoc(doc(db, "dashboard", "logo"));
        if (logoDoc.exists()) setLogo(logoDoc.data().url || "");
      } catch (e) { console.error("Load error:", e); }
    };
    loadData();
  }, []);

  // Real-time listener for live updates across devices
  useEffect(() => {
    const unsubs = [
      onSnapshot(doc(db, "dashboard", "agents"), snap => { if (snap.exists()) setAgents(snap.data().list); }),
      onSnapshot(doc(db, "dashboard", "company"), snap => { if (snap.exists()) setCompany(snap.data()); }),
      onSnapshot(doc(db, "dashboard", "pipeline"), snap => { if (snap.exists()) setPipeline(snap.data()); }),
      onSnapshot(doc(db, "dashboard", "logo"), snap => { if (snap.exists()) setLogo(snap.data().url || ""); }),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  // Save helpers
  const saveAgents = async (newAgents) => {
    setAgents(newAgents);
    setSaving(true);
    try { await setDoc(doc(db, "dashboard", "agents"), { list: newAgents }); } catch (e) { console.error("Save agents error:", e); }
    setSaving(false);
  };
  const saveCompany = async (newCompany) => {
    setCompany(newCompany);
    try { await setDoc(doc(db, "dashboard", "company"), newCompany); } catch (e) { console.error("Save company error:", e); }
  };
  const savePipeline = async (newPipeline) => {
    setPipeline(newPipeline);
    try { await setDoc(doc(db, "dashboard", "pipeline"), newPipeline); } catch (e) { console.error("Save pipeline error:", e); }
  };
  const saveLogo = async (url) => {
    setLogo(url);
    try { await setDoc(doc(db, "dashboard", "logo"), { url }); } catch (e) { console.error("Save logo error:", e); }
  };

  const handleLogoUpload = (e) => {
    const f = e.target.files[0];
    if (f) { const r = new FileReader(); r.onloadend = () => saveLogo(r.result); r.readAsDataURL(f); }
  };

  const handleWeeklySave = (data) => {
    const newAgents = agents.map(a => { const d = data.find(x => x.id === a.id); return d ? { ...a, weekly: d.weekly } : a; });
    saveAgents(newAgents);
    setModal(null);
  };

  const handleLeadsSave = (data) => {
    const newAgents = agents.map(a => { const d = data.find(x => x.id === a.id); return d ? { ...a, aprLeads: d.aprLeads, mayLeads: d.mayLeads, junLeads: d.junLeads, aprSales: d.aprSales, maySales: d.maySales, junSales: d.junSales } : a; });
    saveAgents(newAgents);
    setModal(null);
  };

  const handleAgentSave = (form) => {
    let newAgents;
    if (form.id) {
      newAgents = agents.map(a => a.id === form.id ? { ...a, ...form } : a);
    } else {
      newAgents = [...agents, { ...form, id: `a${Date.now()}`, target: form.target||40000, apr: 0, may: 0, jun: 0, aprLeads: 0, mayLeads: 0, junLeads: 0, aprSales: 0, maySales: 0, junSales: 0, weekly: [0,0,0,0,0,0,0,0] }];
    }
    saveAgents(newAgents);
    setModal(null);
  };

  const handleDeleteAgent = (id) => {
    if (window.confirm("Remove this agent?")) saveAgents(agents.filter(a => a.id !== id));
  };

  // Auth screens
  if (authLoading) return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 60, height: 60, borderRadius: 14, background: `linear-gradient(135deg, ${COLORS.accent}, #6366f1)`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 24, color: "#fff", marginBottom: 16 }}>S</div>
        <div style={{ color: COLORS.textDim, fontSize: 14 }}>Loading...</div>
      </div>
    </div>
  );
  if (!loggedIn && !tvMode) return <Login onLogin={() => setLoggedIn(true)} />;

  const totalCollection = agents.reduce((s, a) => s + calcMonthly(a.weekly), 0);
  const q2Pct = pct(totalCollection, company.q2Target);
  const q1Pct = pct(company.q1Done, company.q1Target);
  const sorted = [...agents].sort((a, b) => calcMonthly(b.weekly) - calcMonthly(a.weekly));

  if (tvMode) return <TVMode agents={agents} company={company} pipeline={pipeline} logo={logo} onClose={() => setTvMode(false)} />;

  // ─── DASHBOARD PAGE ────────────────────────────────────────────
  const Dashboard = () => (
    <div style={S.page}>
      <div style={{ ...S.grid(4), marginBottom: 20 }}>
        <SCard title="Q1 Result" value={fmt(company.q1Done)} sub={`Target: ${fmt(company.q1Target)} QAR (${q1Pct}%)`} icon="📅" color={COLORS.purple} />
        <SCard title="Q2 Target" value={fmt(company.q2Target)} sub="QAR" icon="📅" color={COLORS.accent} />
        <SCard title="Q2 Collection" value={fmt(totalCollection)} sub={`${q2Pct}% of target`} icon="💰" color={COLORS.gold} />
        <SCard title="Agents" value={agents.length} sub={`${agents.filter(a => calcMonthly(a.weekly) > 0).length} active`} icon="👥" color={COLORS.pink} />
      </div>
      <div style={{ ...S.grid(2), marginBottom: 20 }}>
        <div style={S.card}>
          <div style={{ ...S.title, justifyContent: "space-between" }}><span>🏆 Agent Monthly Collections</span><span style={{ fontSize: 11, color: COLORS.textDim }}>Target: QAR 40,000</span></div>
          <div style={{ maxHeight: 520, overflowY: "auto" }}>{sorted.map((a, i) => <AgentBar key={a.id} agent={a} idx={i} />)}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={S.card}>
            <div style={S.title}>📊 Quarterly Performance</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={[{ name: "Q1", target: company.q1Target, done: company.q1Done }, { name: "Q2", target: company.q2Target, done: totalCollection }, { name: "Q3", target: company.q3Target, done: company.q3Done }, { name: "Q4", target: company.q4Target, done: company.q4Done }]}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} /><XAxis dataKey="name" stroke={COLORS.textDim} fontSize={12} /><YAxis stroke={COLORS.textDim} fontSize={11} tickFormatter={v => `${(v/1000).toFixed(0)}k`} /><Tooltip contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text }} formatter={v => `${fmt(v)} QAR`} /><Legend /><Bar dataKey="target" fill="#334155" name="Target" radius={[4,4,0,0]} /><Bar dataKey="done" fill={COLORS.accent} name="Collected" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={S.card}>
            <div style={S.title}>🔄 Lead Pipeline (Last 3 Months)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {[{ label: "April", ...pipeline.apr }, { label: "May", ...pipeline.may }, { label: "June", ...pipeline.jun }].map(d => (
                <div key={d.label} style={{ background: COLORS.cardAlt, borderRadius: 10, padding: 14, textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 6 }}>{d.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.accent }}>{fmt(d.leads)}</div><div style={{ fontSize: 11, color: COLORS.textDim }}>leads</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.success, marginTop: 4 }}>{d.sales}</div><div style={{ fontSize: 11, color: COLORS.textDim }}>sales</div>
                  <div style={{ marginTop: 6, ...S.badge(d.ratio >= 5 ? COLORS.success : COLORS.warning) }}>{d.ratio}% close rate</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div style={S.card}>
        <div style={S.title}>📅 Weekly Agent Collections</div>
        <div style={{ overflowX: "auto" }}>
          <table style={S.table}>
            <thead><tr><th style={S.th}>Agent</th>{WEEK_LABELS.map(w => <th key={w} style={{ ...S.th, textAlign: "right" }}>{w}</th>)}<th style={{ ...S.th, textAlign: "right" }}>Total</th></tr></thead>
            <tbody>
              {sorted.map((a, i) => {
                const total = calcMonthly(a.weekly); const c = triColor(i);
                return (<tr key={a.id}><td style={{ ...S.td, borderRadius: "8px 0 0 8px", fontWeight: 600, color: "#f1f5f9" }}><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: c, marginRight: 8 }} />{a.name}</td>
                  {(a.weekly||[]).map((v, j) => <td key={j} style={{ ...S.td, textAlign: "right" }}>{v > 0 ? fmt(v) : <span style={{ color: COLORS.textDim }}>—</span>}</td>)}
                  <td style={{ ...S.td, borderRadius: "0 8px 8px 0", textAlign: "right", fontWeight: 700, color: c }}>{fmt(total)}</td></tr>);
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ─── SETTINGS PAGE ─────────────────────────────────────────────
  const Settings = () => (
    <div style={S.page}>
      {saving && <div style={{ position: "fixed", top: 60, right: 24, padding: "8px 16px", borderRadius: 8, background: COLORS.accent, color: "#000", fontWeight: 600, fontSize: 13, zIndex: 150 }}>💾 Saving...</div>}
      <div style={{ ...S.grid(2), marginBottom: 20 }}>
        <div style={S.card}>
          <div style={{ ...S.title, justifyContent: "space-between" }}><span>👥 Agent Management</span><button style={S.btn()} onClick={() => setModal({ type: "agent" })}>+ Add Agent</button></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {agents.map((a, i) => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8, background: COLORS.cardAlt }}>
                {a.image ? <img src={a.image} alt={a.name} style={S.avatarImg} /> : <div style={S.avatar(triColor(i))}>{getInitials(a.name)}</div>}
                <span style={{ flex: 1, fontWeight: 600, color: COLORS.text }}>{a.name}</span>
                <span style={{ fontSize: 13, color: COLORS.textDim }}>{fmt(a.target)} QAR</span>
                <button style={{ ...S.btnO, padding: "4px 12px" }} onClick={() => setModal({ type: "agent", agent: a })}>Edit</button>
                <button style={{ ...S.btn(COLORS.danger), padding: "4px 12px" }} onClick={() => handleDeleteAgent(a.id)}>✕</button>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={S.card}>
            <div style={S.title}>🖼️ Company Logo</div>
            <p style={{ fontSize: 13, color: COLORS.textDim, margin: "0 0 12px" }}>Upload your logo. It appears in the navbar and TV mode.</p>
            {logo && <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}><img src={logo} alt="Logo" style={{ height: 50, objectFit: "contain", background: COLORS.cardAlt, borderRadius: 8, padding: 8 }} /><button style={{ ...S.btn(COLORS.danger), padding: "6px 14px", fontSize: 12 }} onClick={() => saveLogo("")}>Remove</button></div>}
            <input ref={logoRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: "none" }} />
            <button style={{ ...S.btn(COLORS.purple), width: "100%", textAlign: "center" }} onClick={() => logoRef.current?.click()}>📷 {logo ? "Change Logo" : "Upload Logo"}</button>
          </div>
          <div style={S.card}>
            <div style={S.title}>📝 Data Input</div>
            <p style={{ fontSize: 13, color: COLORS.textDim, margin: "0 0 16px" }}>Update agent collections, leads, and company data.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button style={{ ...S.btn(COLORS.accent), width: "100%", textAlign: "center" }} onClick={() => setModal({ type: "weekly" })}>Update Weekly Collections</button>
              <button style={{ ...S.btn(COLORS.purple), width: "100%", textAlign: "center" }} onClick={() => setModal({ type: "leads" })}>Update Agent Leads & Sales</button>
              <button style={{ ...S.btn(COLORS.success), width: "100%", textAlign: "center" }} onClick={() => setModal({ type: "pipeline" })}>Update Company Lead Pipeline</button>
            </div>
          </div>
          <div style={S.card}>
            <div style={S.title}>🏢 Quarterly Targets</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {["q1Target", "q2Target", "q3Target", "q4Target", "q1Done", "q3Done", "q4Done"].map(k => (
                <div key={k}><label style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 4, display: "block" }}>{k.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase())}</label>
                  <input type="number" style={S.input} value={company[k]} onChange={e => saveCompany({ ...company, [k]: Number(e.target.value)||0 })} /></div>
              ))}
            </div>
          </div>
          <div style={S.card}>
            <div style={S.title}>📺 TV Display</div>
            <p style={{ fontSize: 13, color: COLORS.textDim, margin: "0 0 12px" }}>Launch the auto-rotating TV display.</p>
            <button style={{ ...S.btn(), width: "100%", fontSize: 16, padding: "14px 20px", marginBottom: 12 }} onClick={() => setTvMode(true)}>🖥️ Launch TV Mode</button>
            <div style={{ background: COLORS.cardAlt, borderRadius: 8, padding: 14, border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 6 }}>📎 Share this link with the TV operator:</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="text" readOnly value={`${window.location.origin}${window.location.pathname}?tv=true`} style={{ ...S.input, fontSize: 12, flex: 1 }} onClick={e => e.target.select()} />
                <button style={{ ...S.btn(), padding: "10px 14px", whiteSpace: "nowrap" }} onClick={() => { navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?tv=true`); alert("TV link copied!"); }}>📋 Copy</button>
              </div>
              <p style={{ fontSize: 11, color: COLORS.textDim, margin: "8px 0 0" }}>Opens directly into TV slideshow mode.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={S.app}>
      <nav style={S.nav}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {logo ? <img src={logo} alt="Logo" style={{ height: 32, objectFit: "contain" }} /> : <div style={{ width: 36, height: 36, borderRadius: 8, background: `linear-gradient(135deg, ${COLORS.accent}, #6366f1)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "#fff" }}>S</div>}
          <span style={{ fontSize: 20, fontWeight: 700, background: `linear-gradient(135deg, ${COLORS.accent}, #a78bfa)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Sales Dashboard</span>
        </div>
        <div style={S.navBtns}>
          <button style={S.navBtn(page === "dashboard")} onClick={() => setPage("dashboard")}>📊 Dashboard</button>
          <button style={S.navBtn(page === "settings")} onClick={() => setPage("settings")}>⚙️ Settings</button>
          <button style={{ ...S.navBtn(false), background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff" }} onClick={() => setTvMode(true)}>📺 TV Mode</button>
          <button style={{ ...S.navBtn(false), color: COLORS.danger }} onClick={async () => { await signOut(auth); setLoggedIn(false); }}>🚪 Logout</button>
        </div>
      </nav>
      {page === "dashboard" ? <Dashboard /> : <Settings />}
      {modal?.type === "weekly" && <WeeklyModal agents={agents} onSave={handleWeeklySave} onClose={() => setModal(null)} />}
      {modal?.type === "leads" && <AgentLeadsModal agents={agents} onSave={handleLeadsSave} onClose={() => setModal(null)} />}
      {modal?.type === "agent" && <AgentModal agent={modal.agent} onSave={handleAgentSave} onClose={() => setModal(null)} />}
      {modal?.type === "pipeline" && <PipelineModal pipeline={pipeline} onSave={d => { savePipeline(d); setModal(null); }} onClose={() => setModal(null)} />}
    </div>
  );
}
