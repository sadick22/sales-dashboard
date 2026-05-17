import React, { useState, useEffect, useCallback, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell, AreaChart, Area } from "recharts";

// ─── DEFAULT DATA ──────────────────────────────────────────────────
const DEFAULT_AGENTS = [
  { id: 1, name: "Seyf", image: "", collection: 22827, target: 40000, apr: 38533, may: 22827, jun: 0, aprSales: 54910, maySales: 0, junSales: 0, weekly: [4000, 11284, 9266, 13983, 0, 0, 0, 0] },
  { id: 2, name: "Devon", image: "", collection: 17283, target: 40000, apr: 28822, may: 17283, jun: 0, aprSales: 43465, maySales: 13923, junSales: 0, weekly: [0, 8412, 0, 3875, 16535, 0, 0, 0] },
  { id: 3, name: "Farrukh", image: "", collection: 17052, target: 40000, apr: 73036, may: 17052, jun: 0, aprSales: 97283, maySales: 30727, junSales: 0, weekly: [0, 7188, 0, 31820, 34028, 0, 0, 0] },
  { id: 4, name: "Anand", image: "", collection: 9580, target: 40000, apr: 24630, may: 9580, jun: 0, aprSales: 49508, maySales: 3726, junSales: 0, weekly: [0, 0, 16091, 3939, 4600, 0, 0, 0] },
  { id: 5, name: "Ahmed", image: "", collection: 9200, target: 40000, apr: 14750, may: 9200, jun: 0, aprSales: 0, maySales: 5500, junSales: 0, weekly: [0, 0, 3250, 0, 11500, 0, 0, 0] },
  { id: 6, name: "Khaled", image: "", collection: 8750, target: 40000, apr: 41398, may: 8750, jun: 0, aprSales: 30661, maySales: 4120, junSales: 0, weekly: [0, 0, 24188, 2917, 14293, 0, 0, 0] },
  { id: 7, name: "Akram", image: "", collection: 5400, target: 40000, apr: 2375, may: 5400, jun: 0, aprSales: 4125, maySales: 8100, junSales: 0, weekly: [0, 0, 0, 0, 2375, 0, 0, 0] },
  { id: 8, name: "Sophia", image: "", collection: 3000, target: 40000, apr: 32628, may: 3000, jun: 0, aprSales: 22111, maySales: 25103, junSales: 0, weekly: [6126, 5905, 10500, 7872, 2225, 0, 0, 0] },
  { id: 9, name: "Leo", image: "", collection: 2000, target: 40000, apr: 43837, may: 2000, jun: 0, aprSales: 54193, maySales: 0, junSales: 0, weekly: [2000, 10167, 12434, 11275, 7961, 0, 0, 0] },
  { id: 10, name: "Abdullah", image: "", collection: 0, target: 40000, apr: 12000, may: 0, jun: 0, aprSales: 20750, maySales: 7150, junSales: 0, weekly: [0, 6500, 5500, 0, 0, 0, 0, 0] },
  { id: 11, name: "Firoz", image: "", collection: 0, target: 40000, apr: 32816, may: 0, jun: 0, aprSales: 27422, maySales: 3250, junSales: 0, weekly: [0, 0, 27370, 5446, 0, 0, 0, 0] },
  { id: 12, name: "Gerrit", image: "", collection: 0, target: 40000, apr: 0, may: 0, jun: 0, aprSales: 0, maySales: 0, junSales: 0, weekly: [0, 0, 0, 0, 0, 0, 0, 0] },
];

const DEFAULT_COMPANY = {
  q1Target: 1175000, q1Done: 463443,
  q2Target: 1175000, q2Done: 463443,
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
  bg: "#0a0e17",
  card: "#111827",
  cardAlt: "#1a2235",
  accent: "#00d4ff",
  accentGlow: "rgba(0,212,255,0.15)",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  text: "#e2e8f0",
  textDim: "#64748b",
  border: "#1e293b",
  gold: "#fbbf24",
  purple: "#a78bfa",
  pink: "#f472b6",
  orange: "#fb923c",
  chartBlue: "#38bdf8",
  chartGreen: "#34d399",
};

// Simplified to 2 main colors: cyan for progress, dark grey for remaining
const BAR_CYAN = "#00d4ff";
const BAR_GREY = "#334155";

// ─── UTILITY FUNCTIONS ─────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("en-QA").format(n);
const pct = (done, target) => target > 0 ? Math.round((done / target) * 100) : 0;
const getInitials = (name) => name.split(" ").map((n) => n[0]).join("").toUpperCase();
const getTrend = (current, previous) => {
  if (current > previous) return { icon: "▲", color: COLORS.success, label: "increase" };
  if (current < previous) return { icon: "▼", color: COLORS.danger, label: "decrease" };
  return { icon: "●", color: COLORS.textDim, label: "no change" };
};

// ─── STYLES ────────────────────────────────────────────────────────
const styles = {
  app: { minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif", overflow: "hidden" },
  nav: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)", borderBottom: `1px solid ${COLORS.border}`, position: "sticky", top: 0, zIndex: 100 },
  navCenter: { position: "absolute", left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center" },
  navBtns: { display: "flex", gap: 8 },
  navBtn: (active) => ({ padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all 0.2s", background: active ? COLORS.accent : "rgba(255,255,255,0.06)", color: active ? "#000" : COLORS.text }),
  page: { padding: "20px 24px", maxWidth: 1920, margin: "0 auto" },
  grid: (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16 }),
  card: { background: COLORS.card, borderRadius: 12, padding: 20, border: `1px solid ${COLORS.border}`, position: "relative", overflow: "hidden" },
  cardGlow: { position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${COLORS.accent}, transparent)` },
  cardTitle: { fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.5px", color: COLORS.textDim, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 },
  bigNum: { fontSize: 32, fontWeight: 800, letterSpacing: "-1px" },
  badge: (color) => ({ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${color}18`, color }),
  progressBarBg: { height: 8, borderRadius: 99, background: BAR_GREY, overflow: "hidden", position: "relative" },
  progressBarFill: (pctVal) => ({ height: "100%", borderRadius: 99, width: `${Math.min(pctVal, 100)}%`, background: BAR_CYAN, transition: "width 1s ease", boxShadow: `0 0 12px ${BAR_CYAN}40` }),
  agentRow: { display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.02)", marginBottom: 6, transition: "all 0.2s", borderLeft: `3px solid ${BAR_CYAN}` },
  avatar: { width: 40, height: 40, borderRadius: "50%", background: `linear-gradient(135deg, ${BAR_CYAN}, ${BAR_CYAN}88)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: "#fff", flexShrink: 0 },
  avatarImg: { width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 },
  table: { width: "100%", borderCollapse: "separate", borderSpacing: "0 4px" },
  th: { padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", color: COLORS.textDim },
  td: { padding: "12px 14px", fontSize: 14, background: "rgba(255,255,255,0.02)", fontWeight: 500, color: COLORS.text },
  tdFirst: { borderRadius: "8px 0 0 8px" },
  tdLast: { borderRadius: "0 8px 8px 0" },
  tvOverlay: { position: "fixed", inset: 0, zIndex: 9999, background: COLORS.bg, display: "flex", flexDirection: "column" },
  tvHeader: { padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)", borderBottom: `2px solid ${COLORS.accent}30`, position: "relative" },
  tvContent: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 32, overflow: "hidden" },
  tvProgress: { position: "absolute", bottom: 0, left: 0, height: 4, background: `linear-gradient(90deg, ${COLORS.accent}, #6366f1)`, transition: "width 0.1s linear" },
  input: { width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: COLORS.cardAlt, color: COLORS.text, fontSize: 14, outline: "none", boxSizing: "border-box" },
  btn: (color = COLORS.accent) => ({ padding: "10px 20px", borderRadius: 8, border: "none", background: color, color: color === COLORS.accent ? "#000" : "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", transition: "all 0.2s" }),
  btnOutline: { padding: "8px 16px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.text, fontSize: 13, cursor: "pointer" },
  select: { padding: "10px 14px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: COLORS.cardAlt, color: COLORS.text, fontSize: 14, outline: "none" },
  modal: { position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" },
  modalContent: { background: COLORS.card, borderRadius: 16, padding: 28, border: `1px solid ${COLORS.border}`, width: "90%", maxWidth: 520, maxHeight: "80vh", overflowY: "auto" },
};

// ─── LOGIN SCREEN ──────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    // Simple auth check — replace with Firebase later
    setTimeout(() => {
      if (email && password.length >= 4) {
        onLogin({ email });
      } else {
        setError("Invalid email or password (min 4 characters)");
      }
      setLoading(false);
    }, 800);
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
          <div>
            <label style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 6, display: "block" }}>Email</label>
            <input type="email" style={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@company.com" />
          </div>
          <div>
            <label style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 6, display: "block" }}>Password</label>
            <input type="password" style={styles.input} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" onKeyDown={(e) => e.key === "Enter" && handleSubmit(e)} />
          </div>
          {error && <div style={{ padding: "8px 12px", borderRadius: 8, background: `${COLORS.danger}18`, color: COLORS.danger, fontSize: 13 }}>{error}</div>}
          <button style={{ ...styles.btn(), width: "100%", textAlign: "center", padding: "12px 20px", fontSize: 15, opacity: loading ? 0.6 : 1 }} onClick={handleSubmit} disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </div>
        <p style={{ fontSize: 11, color: COLORS.textDim, textAlign: "center", marginTop: 20 }}>Contact your administrator for access credentials</p>
      </div>
    </div>
  );
}

// ─── SUMMARY CARD COMPONENT ────────────────────────────────────────
function SummaryCard({ title, value, subtitle, icon, color = COLORS.accent, trend }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardGlow} />
      <div style={{ ...styles.cardTitle }}>{icon && <span style={{ fontSize: 16 }}>{icon}</span>}{title}</div>
      <div style={{ ...styles.bigNum, color }}>{value}</div>
      {subtitle && <div style={{ marginTop: 6, fontSize: 13, color: COLORS.textDim }}>{subtitle}</div>}
      {trend && <div style={{ marginTop: 8 }}><span style={styles.badge(trend.color)}>{trend.icon} {trend.label}</span></div>}
    </div>
  );
}

// ─── PROGRESS RING COMPONENT ──────────────────────────────────────
function ProgressRing({ percent, size = 120, stroke = 10, color = COLORS.accent }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const off = circ - (Math.min(percent, 100) / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round" style={{ transition: "stroke-dashoffset 1.5s ease" }} />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" fill={COLORS.text} fontSize={size * 0.22} fontWeight="800" style={{ transform: "rotate(90deg)", transformOrigin: "center" }}>{percent}%</text>
    </svg>
  );
}

// ─── AGENT TARGET BAR (unified cyan/grey) ──────────────────────────
function AgentTargetBar({ agent, showDetails = true }) {
  const p = pct(agent.collection, agent.target);
  const trend = getTrend(agent.may || agent.collection, agent.apr);
  return (
    <div style={styles.agentRow}>
      {agent.image ? (
        <img src={agent.image} alt={agent.name} style={styles.avatarImg} />
      ) : (
        <div style={styles.avatar}>{getInitials(agent.name)}</div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: "#f1f5f9" }}>{agent.name}</span>
          <span style={{ fontWeight: 700, fontSize: 14, color: BAR_CYAN }}>{fmt(agent.collection)} QAR</span>
        </div>
        <div style={styles.progressBarBg}>
          <div style={styles.progressBarFill(p)} />
        </div>
        {showDetails && (
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11, color: COLORS.textDim }}>
            <span style={{ color: "#94a3b8" }}>Target: {fmt(agent.target)} QAR</span>
            <span style={{ color: agent.collection >= agent.target ? COLORS.success : COLORS.danger }}>
              Diff: {fmt(agent.target - agent.collection)} QAR
            </span>
            <span style={styles.badge(trend.color)}>{trend.icon} vs prev</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TV SLIDE: ALL AGENTS OVERVIEW ─────────────────────────────────
function TVAllAgents({ agents }) {
  const sorted = [...agents].sort((a, b) => b.collection - a.collection);
  return (
    <div style={{ width: "100%", maxWidth: 1600 }}>
      <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 20, textAlign: "center", color: COLORS.accent }}>
        📊 Monthly Agent Collections — Target: QAR 40,000
      </h2>
      <div style={styles.grid(2)}>
        {sorted.map((a) => <AgentTargetBar key={a.id} agent={a} />)}
      </div>
    </div>
  );
}

// ─── TV SLIDE: INDIVIDUAL AGENT (with quarterly target) ────────────
function TVAgentDetail({ agent, company }) {
  const p = pct(agent.collection, agent.target);
  const trend3 = getTrend(agent.may || agent.collection, agent.apr);
  const qTarget = company.q2Target / 12 * 3; // agent quarterly = 3 months * monthly target
  const agentQTarget = agent.target * 3; // 40000 * 3 = 120,000
  const agentQDone = agent.apr + (agent.may || agent.collection) + agent.jun;
  const agentQPct = pct(agentQDone, agentQTarget);
  const monthlyData = [
    { name: "Apr", collection: agent.apr },
    { name: "May", collection: agent.may || agent.collection },
    { name: "Jun", collection: agent.jun },
  ];
  const weeklyData = (agent.weekly || []).map((v, i) => ({ name: WEEK_LABELS[i] || `W${i + 1}`, value: v }));

  return (
    <div style={{ width: "100%", maxWidth: 1400, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
      {/* Left: Agent Info */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
        {agent.image ? (
          <img src={agent.image} alt={agent.name} style={{ width: 120, height: 120, borderRadius: "50%", border: `4px solid ${BAR_CYAN}`, objectFit: "cover" }} />
        ) : (
          <div style={{ ...styles.avatar, width: 120, height: 120, fontSize: 40 }}>{getInitials(agent.name)}</div>
        )}
        <h2 style={{ fontSize: 36, fontWeight: 800, margin: 0, color: "#f1f5f9" }}>{agent.name}</h2>
        <ProgressRing percent={p} size={160} stroke={14} color={BAR_CYAN} />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 13, color: COLORS.textDim }}>Monthly Collection</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: BAR_CYAN }}>{fmt(agent.collection)} QAR</div>
          <div style={{ fontSize: 13, color: COLORS.textDim, marginTop: 4 }}>Target Difference: <span style={{ color: COLORS.danger, fontWeight: 600 }}>{fmt(agent.target - agent.collection)} QAR</span></div>
        </div>
        {/* Quarterly Target Info */}
        <div style={{ background: COLORS.cardAlt, borderRadius: 12, padding: 16, width: "100%", maxWidth: 320, textAlign: "center", border: `1px solid ${COLORS.border}` }}>
          <div style={{ fontSize: 11, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>Q2 Quarterly Target</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.text }}>{fmt(agentQTarget)} QAR</div>
          <div style={{ ...styles.progressBarBg, margin: "10px 0" }}>
            <div style={styles.progressBarFill(agentQPct)} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
            <span style={{ color: COLORS.textDim }}>Collected: <span style={{ color: BAR_CYAN, fontWeight: 600 }}>{fmt(agentQDone)}</span></span>
            <span style={{ color: agentQPct >= 50 ? COLORS.success : COLORS.warning, fontWeight: 700 }}>{agentQPct}%</span>
          </div>
        </div>
        <span style={{ ...styles.badge(trend3.color), fontSize: 13, padding: "6px 16px" }}>{trend3.icon} {trend3.label} vs previous month</span>
      </div>
      {/* Right: Charts */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24, justifyContent: "center" }}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Last 3 Months Collection</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
              <XAxis dataKey="name" stroke={COLORS.textDim} fontSize={12} />
              <YAxis stroke={COLORS.textDim} fontSize={12} />
              <Tooltip contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text }} />
              <Bar dataKey="collection" fill={BAR_CYAN} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Weekly Collections</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={weeklyData}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={BAR_CYAN} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={BAR_CYAN} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
              <XAxis dataKey="name" stroke={COLORS.textDim} fontSize={10} />
              <YAxis stroke={COLORS.textDim} fontSize={10} />
              <Tooltip contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text }} />
              <Area type="monotone" dataKey="value" stroke={BAR_CYAN} fill="url(#areaGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── TV SLIDE: COMPANY PERFORMANCE (quarterly only) ─────────────────
function TVCompanyPerf({ company, agents, pipeline }) {
  const totalCollection = agents.reduce((s, a) => s + a.collection, 0);
  const q2Pct = pct(totalCollection, company.q2Target);
  const q1Pct = pct(company.q1Done, company.q1Target);
  const pipeData = [
    { name: "Apr", leads: pipeline.apr.leads, sales: pipeline.apr.sales, ratio: pipeline.apr.ratio },
    { name: "May", leads: pipeline.may.leads, sales: pipeline.may.sales, ratio: pipeline.may.ratio },
    { name: "Jun", leads: pipeline.jun.leads, sales: pipeline.jun.sales, ratio: pipeline.jun.ratio },
  ];
  const quarterData = [
    { name: "Q1", target: company.q1Target, done: company.q1Done },
    { name: "Q2", target: company.q2Target, done: totalCollection },
    { name: "Q3", target: company.q3Target, done: company.q3Done },
    { name: "Q4", target: company.q4Target, done: company.q4Done },
  ];

  return (
    <div style={{ width: "100%", maxWidth: 1600 }}>
      <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 24, textAlign: "center", color: COLORS.accent }}>🏢 Company Performance Overview</h2>
      <div style={{ ...styles.grid(4), marginBottom: 24 }}>
        <SummaryCard title="Q1 Target" value={`${fmt(company.q1Target)} QAR`} subtitle={`Done: ${fmt(company.q1Done)} QAR (${q1Pct}%)`} icon="📅" color={COLORS.purple} />
        <SummaryCard title="Q2 Target" value={`${fmt(company.q2Target)} QAR`} subtitle={`Done: ${fmt(totalCollection)} QAR`} icon="📅" color={COLORS.accent} />
        <SummaryCard title="Q2 Progress" value={`${q2Pct}%`} icon="⚡" color={q2Pct >= 50 ? COLORS.success : COLORS.warning} />
        <SummaryCard title="Team Collection" value={`${fmt(totalCollection)} QAR`} subtitle={`${agents.filter(a => a.collection > 0).length} of ${agents.length} agents active`} icon="👥" color={COLORS.gold} />
      </div>
      <div style={styles.grid(2)}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Quarterly Breakdown</div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={quarterData}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
              <XAxis dataKey="name" stroke={COLORS.textDim} fontSize={12} />
              <YAxis stroke={COLORS.textDim} fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text }} formatter={(v) => fmt(v)} />
              <Legend />
              <Bar dataKey="target" fill={BAR_GREY} name="Target" radius={[4, 4, 0, 0]} />
              <Bar dataKey="done" fill={BAR_CYAN} name="Collected" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={styles.card}>
          <div style={styles.cardTitle}>Lead Pipeline (Last 3 Months)</div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={pipeData}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
              <XAxis dataKey="name" stroke={COLORS.textDim} fontSize={12} />
              <YAxis stroke={COLORS.textDim} fontSize={11} />
              <Tooltip contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text }} />
              <Legend />
              <Bar dataKey="leads" fill={BAR_CYAN} name="Leads" radius={[4, 4, 0, 0]} />
              <Bar dataKey="sales" fill={COLORS.success} name="Sales" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", justifyContent: "center", gap: 32, marginTop: 12 }}>
            {pipeData.map((d) => (
              <div key={d.name} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, color: COLORS.textDim }}>{d.name} Closing Rate</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: d.ratio >= 5 ? COLORS.success : COLORS.warning }}>{d.ratio}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TV SLIDE: WEEKLY COLLECTIONS TABLE ────────────────────────────
function TVWeeklyCollections({ agents }) {
  const sorted = [...agents].sort((a, b) => {
    const aTotal = (a.weekly || []).reduce((s, v) => s + v, 0);
    const bTotal = (b.weekly || []).reduce((s, v) => s + v, 0);
    return bTotal - aTotal;
  });
  return (
    <div style={{ width: "100%", maxWidth: 1600, overflow: "auto" }}>
      <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 20, textAlign: "center", color: COLORS.accent }}>📅 Weekly Collections Breakdown</h2>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Agent</th>
            {WEEK_LABELS.map((w) => <th key={w} style={{ ...styles.th, textAlign: "right" }}>{w}</th>)}
            <th style={{ ...styles.th, textAlign: "right" }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((a) => {
            const total = (a.weekly || []).reduce((s, v) => s + v, 0);
            return (
              <tr key={a.id}>
                <td style={{ ...styles.td, ...styles.tdFirst, fontWeight: 600, color: "#f1f5f9" }}>
                  <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: BAR_CYAN, marginRight: 8 }} />
                  {a.name}
                </td>
                {(a.weekly || []).map((v, j) => {
                  const prev = j > 0 ? a.weekly[j - 1] : 0;
                  const t = v > 0 ? getTrend(v, prev) : null;
                  return (
                    <td key={j} style={{ ...styles.td, textAlign: "right", color: COLORS.text, ...(j === 7 ? styles.tdLast : {}) }}>
                      {v > 0 ? (
                        <span>{fmt(v)} {t && <span style={{ color: t.color, fontSize: 10, marginLeft: 4 }}>{t.icon}</span>}</span>
                      ) : (
                        <span style={{ color: COLORS.textDim }}>—</span>
                      )}
                    </td>
                  );
                })}
                <td style={{ ...styles.td, ...styles.tdLast, textAlign: "right", fontWeight: 700, color: BAR_CYAN }}>{fmt(total)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── TV MODE CONTROLLER ───────────────────────────────────────────
function TVMode({ agents, company, pipeline, logo, onClose }) {
  const slides = [
    { component: <TVCompanyPerf company={company} agents={agents} pipeline={pipeline} />, duration: 15000 },
    { component: <TVAllAgents agents={agents} />, duration: 15000 },
    { component: <TVWeeklyCollections agents={agents} />, duration: 15000 },
    ...agents.filter((a) => a.collection > 0).sort((a, b) => b.collection - a.collection).map((a) => ({
      component: <TVAgentDetail agent={a} company={company} />,
      duration: 5000,
    })),
  ];
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);
  const progressRef = useRef(null);

  useEffect(() => {
    const dur = slides[current]?.duration || 10000;
    const startTime = Date.now();
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setProgress((elapsed / dur) * 100);
    }, 50);
    timerRef.current = setTimeout(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
      setProgress(0);
    }, dur);
    return () => { clearTimeout(timerRef.current); clearInterval(progressRef.current); };
  }, [current, slides.length]);

  return (
    <div style={styles.tvOverlay}>
      <div style={styles.tvHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {logo ? <img src={logo} alt="Logo" style={{ height: 36, objectFit: "contain" }} /> : <div style={{ width: 36, height: 36, borderRadius: 8, background: `linear-gradient(135deg, ${COLORS.accent}, #6366f1)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "#fff" }}>S</div>}
          <span style={{ fontSize: 20, fontWeight: 700, background: `linear-gradient(135deg, ${COLORS.accent}, #a78bfa)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Sales Dashboard</span>
        </div>
        {/* Center logo */}
        {logo && (
          <div style={styles.navCenter}>
            <img src={logo} alt="Company Logo" style={{ height: 40, objectFit: "contain" }} />
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 13, color: COLORS.textDim }}>Slide {current + 1} of {slides.length}</span>
          <span style={{ fontSize: 16, color: COLORS.accent }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </span>
          <button onClick={onClose} style={{ ...styles.btn(COLORS.danger), padding: "6px 14px" }}>✕ Exit TV</button>
        </div>
      </div>
      <div style={styles.tvContent}>
        {slides[current]?.component}
      </div>
      <div style={{ ...styles.tvProgress, width: `${progress}%` }} />
    </div>
  );
}

// ─── ADMIN: DATA INPUT FORM ────────────────────────────────────────
function DataInputModal({ agents, onSave, onClose, type }) {
  const [data, setData] = useState(() => {
    if (type === "monthly") return agents.map((a) => ({ id: a.id, name: a.name, collection: a.collection }));
    if (type === "weekly") return agents.map((a) => ({ id: a.id, name: a.name, weekly: [...(a.weekly || [])] }));
    return [];
  });
  const [weekIndex, setWeekIndex] = useState(0);

  const handleMonthlyChange = (id, val) => {
    setData((prev) => prev.map((d) => d.id === id ? { ...d, collection: Number(val) || 0 } : d));
  };
  const handleWeeklyChange = (id, val) => {
    setData((prev) => prev.map((d) => {
      if (d.id !== id) return d;
      const w = [...d.weekly];
      w[weekIndex] = Number(val) || 0;
      return { ...d, weekly: w };
    }));
  };

  return (
    <div style={styles.modal} onClick={onClose}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700, color: COLORS.text }}>
          {type === "monthly" ? "Update Monthly Collections" : "Update Weekly Collections"}
        </h3>
        {type === "weekly" && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 6, display: "block" }}>Select Week</label>
            <select style={styles.select} value={weekIndex} onChange={(e) => setWeekIndex(Number(e.target.value))}>
              {WEEK_LABELS.map((l, i) => <option key={i} value={i}>Week ending {l}</option>)}
            </select>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {data.map((d) => (
            <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 90, fontWeight: 600, fontSize: 14, color: COLORS.text }}>{d.name}</span>
              <input
                type="number"
                style={styles.input}
                value={type === "monthly" ? d.collection : (d.weekly[weekIndex] || 0)}
                onChange={(e) => type === "monthly" ? handleMonthlyChange(d.id, e.target.value) : handleWeeklyChange(d.id, e.target.value)}
                placeholder="Amount (QAR)"
              />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <button style={styles.btnOutline} onClick={onClose}>Cancel</button>
          <button style={styles.btn()} onClick={() => onSave(data, type)}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}

// ─── AGENT MANAGEMENT MODAL ────────────────────────────────────────
function AgentModal({ agent, onSave, onClose }) {
  const [form, setForm] = useState(agent || { name: "", image: "", target: 40000 });
  const [preview, setPreview] = useState(agent?.image || "");
  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm({ ...form, image: reader.result });
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setForm({ ...form, image: "" });
    setPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div style={styles.modal} onClick={onClose}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700, color: COLORS.text }}>{agent ? "Edit Agent" : "Add Agent"}</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 6, display: "block" }}>Name</label>
            <input style={styles.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Agent name" />
          </div>
          <div>
            <label style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 6, display: "block" }}>Profile Photo</label>
            {preview ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <img src={preview} alt="Preview" style={{ width: 60, height: 60, borderRadius: "50%", objectFit: "cover", border: `2px solid ${COLORS.accent}` }} />
                <button style={{ ...styles.btn(COLORS.danger), padding: "6px 14px", fontSize: 12 }} onClick={handleRemoveImage}>Remove</button>
              </div>
            ) : (
              <div style={{ width: 60, height: 60, borderRadius: "50%", background: COLORS.cardAlt, border: `2px dashed ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: COLORS.textDim, marginBottom: 8 }}>👤</div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
            <button style={{ ...styles.btn(COLORS.purple), width: "100%", textAlign: "center" }} onClick={() => fileInputRef.current?.click()}>
              📷 {preview ? "Change Photo" : "Upload Photo"}
            </button>
          </div>
          <div>
            <label style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 6, display: "block" }}>Monthly Target (QAR)</label>
            <input type="number" style={styles.input} value={form.target} onChange={(e) => setForm({ ...form, target: Number(e.target.value) || 40000 })} />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <button style={styles.btnOutline} onClick={onClose}>Cancel</button>
          <button style={styles.btn()} onClick={() => onSave(form)}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ─── PIPELINE MODAL ────────────────────────────────────────────────
function PipelineModal({ pipeline, onSave, onClose }) {
  const [data, setData] = useState({ ...pipeline });
  const months = ["apr", "may", "jun"];
  const labels = { apr: "April 2026", may: "May 2026", jun: "June 2026" };
  return (
    <div style={styles.modal} onClick={onClose}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700, color: COLORS.text }}>Update Lead Pipeline</h3>
        {months.map((m) => (
          <div key={m} style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, color: COLORS.accent }}>{labels[m]}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: COLORS.textDim }}>Leads</label>
                <input type="number" style={styles.input} value={data[m].leads} onChange={(e) => {
                  const leads = Number(e.target.value) || 0;
                  const sales = data[m].sales;
                  setData({ ...data, [m]: { leads, sales, ratio: leads > 0 ? Math.round((sales / leads) * 100) : 0 } });
                }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: COLORS.textDim }}>Sales</label>
                <input type="number" style={styles.input} value={data[m].sales} onChange={(e) => {
                  const sales = Number(e.target.value) || 0;
                  const leads = data[m].leads;
                  setData({ ...data, [m]: { leads, sales, ratio: leads > 0 ? Math.round((sales / leads) * 100) : 0 } });
                }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: COLORS.textDim }}>Closing Rate</label>
                <input type="text" style={{ ...styles.input, background: COLORS.bg }} value={`${data[m].ratio}%`} disabled />
              </div>
            </div>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button style={styles.btnOutline} onClick={onClose}>Cancel</button>
          <button style={styles.btn()} onClick={() => onSave(data)}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────
export default function SalesDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    try { return !!localStorage.getItem("sd_user"); } catch { return false; }
  });
  const [page, setPage] = useState("dashboard");
  const [agents, setAgents] = useState(() => {
    try { const s = localStorage.getItem("sd_agents"); return s ? JSON.parse(s) : DEFAULT_AGENTS; } catch { return DEFAULT_AGENTS; }
  });
  const [company, setCompany] = useState(() => {
    try { const s = localStorage.getItem("sd_company"); return s ? JSON.parse(s) : DEFAULT_COMPANY; } catch { return DEFAULT_COMPANY; }
  });
  const [pipeline, setPipeline] = useState(() => {
    try { const s = localStorage.getItem("sd_pipeline"); return s ? JSON.parse(s) : DEFAULT_PIPELINE; } catch { return DEFAULT_PIPELINE; }
  });
  const [logo, setLogo] = useState(() => {
    try { return localStorage.getItem("sd_logo") || ""; } catch { return ""; }
  });
  const [tvMode, setTvMode] = useState(false);
  const [modal, setModal] = useState(null);

  // Auto-launch TV mode if ?tv=true in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tv") === "true") {
      setTvMode(true);
    }
  }, []);

  // Persist
  useEffect(() => { localStorage.setItem("sd_agents", JSON.stringify(agents)); }, [agents]);
  useEffect(() => { localStorage.setItem("sd_company", JSON.stringify(company)); }, [company]);
  useEffect(() => { localStorage.setItem("sd_pipeline", JSON.stringify(pipeline)); }, [pipeline]);
  useEffect(() => { localStorage.setItem("sd_logo", logo); }, [logo]);

  const handleLogin = (user) => {
    localStorage.setItem("sd_user", JSON.stringify(user));
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("sd_user");
    setIsLoggedIn(false);
  };

  // Logo upload handler
  const logoInputRef = useRef(null);
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLogo(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleDataSave = (data, type) => {
    if (type === "monthly") {
      setAgents((prev) => prev.map((a) => { const d = data.find((x) => x.id === a.id); return d ? { ...a, collection: d.collection } : a; }));
    }
    if (type === "weekly") {
      setAgents((prev) => prev.map((a) => { const d = data.find((x) => x.id === a.id); return d ? { ...a, weekly: d.weekly } : a; }));
    }
    setModal(null);
  };

  const handleAgentSave = (form) => {
    if (form.id) {
      setAgents((prev) => prev.map((a) => a.id === form.id ? { ...a, ...form } : a));
    } else {
      setAgents((prev) => [...prev, { ...form, id: Date.now(), collection: 0, target: form.target || 40000, apr: 0, may: 0, jun: 0, aprSales: 0, maySales: 0, junSales: 0, weekly: [0, 0, 0, 0, 0, 0, 0, 0] }]);
    }
    setModal(null);
  };

  const handleDeleteAgent = (id) => {
    if (window.confirm("Are you sure you want to remove this agent?")) {
      setAgents((prev) => prev.filter((a) => a.id !== id));
    }
  };

  // Show login if not authenticated (skip for TV mode via URL)
  if (!isLoggedIn && !tvMode) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // Computed values
  const totalCollection = agents.reduce((s, a) => s + a.collection, 0);
  const q2Pct = pct(totalCollection, company.q2Target);
  const q1Pct = pct(company.q1Done, company.q1Target);
  const sorted = [...agents].sort((a, b) => b.collection - a.collection);

  if (tvMode) {
    return <TVMode agents={agents} company={company} pipeline={pipeline} logo={logo} onClose={() => setTvMode(false)} />;
  }

  // ─── DASHBOARD PAGE ──────────────────────────────────────────────
  const DashboardPage = () => (
    <div style={styles.page}>
      <div style={{ ...styles.grid(4), marginBottom: 20 }}>
        <SummaryCard title="Q1 Result" value={`${fmt(company.q1Done)}`} subtitle={`Target: ${fmt(company.q1Target)} QAR (${q1Pct}%)`} icon="📅" color={COLORS.purple} />
        <SummaryCard title="Q2 Target" value={`${fmt(company.q2Target)}`} subtitle="QAR" icon="📅" color={COLORS.accent} />
        <SummaryCard title="Q2 Collection" value={`${fmt(totalCollection)}`} subtitle={`${q2Pct}% of target`} icon="💰" color={COLORS.gold} />
        <SummaryCard title="Agents" value={agents.length} subtitle={`${agents.filter((a) => a.collection > 0).length} active`} icon="👥" color={COLORS.pink} />
      </div>
      <div style={{ ...styles.grid(2), marginBottom: 20 }}>
        <div style={styles.card}>
          <div style={{ ...styles.cardTitle, justifyContent: "space-between" }}>
            <span>🏆 Agent Monthly Collections</span>
            <span style={{ fontSize: 11, color: COLORS.textDim }}>Target: QAR 40,000</span>
          </div>
          <div style={{ maxHeight: 520, overflowY: "auto" }}>
            {sorted.map((a) => <AgentTargetBar key={a.id} agent={a} />)}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={styles.card}>
            <div style={styles.cardTitle}>📊 Quarterly Performance</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={[
                { name: "Q1", target: company.q1Target, done: company.q1Done },
                { name: "Q2", target: company.q2Target, done: totalCollection },
                { name: "Q3", target: company.q3Target, done: company.q3Done },
                { name: "Q4", target: company.q4Target, done: company.q4Done },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                <XAxis dataKey="name" stroke={COLORS.textDim} fontSize={12} />
                <YAxis stroke={COLORS.textDim} fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text }} formatter={(v) => `${fmt(v)} QAR`} />
                <Legend />
                <Bar dataKey="target" fill={BAR_GREY} name="Target" radius={[4, 4, 0, 0]} />
                <Bar dataKey="done" fill={BAR_CYAN} name="Collected" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={styles.card}>
            <div style={styles.cardTitle}>🔄 Lead Pipeline (Last 3 Months)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
              {[
                { label: "April", ...pipeline.apr },
                { label: "May", ...pipeline.may },
                { label: "June", ...pipeline.jun },
              ].map((d) => (
                <div key={d.label} style={{ background: COLORS.cardAlt, borderRadius: 10, padding: 14, textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 6 }}>{d.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: BAR_CYAN }}>{fmt(d.leads)}</div>
                  <div style={{ fontSize: 11, color: COLORS.textDim }}>leads</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.success, marginTop: 4 }}>{d.sales}</div>
                  <div style={{ fontSize: 11, color: COLORS.textDim }}>sales</div>
                  <div style={{ marginTop: 6, ...styles.badge(d.ratio >= 5 ? COLORS.success : COLORS.warning) }}>{d.ratio}% close rate</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div style={styles.card}>
        <div style={styles.cardTitle}>📅 Weekly Agent Collections</div>
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Agent</th>
                {WEEK_LABELS.map((w) => <th key={w} style={{ ...styles.th, textAlign: "right" }}>{w}</th>)}
                <th style={{ ...styles.th, textAlign: "right" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((a) => {
                const total = (a.weekly || []).reduce((s, v) => s + v, 0);
                return (
                  <tr key={a.id}>
                    <td style={{ ...styles.td, ...styles.tdFirst, fontWeight: 600, color: "#f1f5f9" }}>
                      <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: BAR_CYAN, marginRight: 8 }} />
                      {a.name}
                    </td>
                    {(a.weekly || []).map((v, j) => (
                      <td key={j} style={{ ...styles.td, textAlign: "right", color: COLORS.text }}>
                        {v > 0 ? fmt(v) : <span style={{ color: COLORS.textDim }}>—</span>}
                      </td>
                    ))}
                    <td style={{ ...styles.td, ...styles.tdLast, textAlign: "right", fontWeight: 700, color: BAR_CYAN }}>{fmt(total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ─── SETTINGS PAGE ───────────────────────────────────────────────
  const SettingsPage = () => (
    <div style={styles.page}>
      <div style={{ ...styles.grid(2), marginBottom: 20 }}>
        <div style={styles.card}>
          <div style={{ ...styles.cardTitle, justifyContent: "space-between" }}>
            <span>👥 Agent Management</span>
            <button style={styles.btn()} onClick={() => setModal({ type: "agent" })}>+ Add Agent</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {agents.map((a) => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8, background: COLORS.cardAlt }}>
                {a.image ? <img src={a.image} alt={a.name} style={styles.avatarImg} /> : <div style={styles.avatar}>{getInitials(a.name)}</div>}
                <span style={{ flex: 1, fontWeight: 600, color: COLORS.text }}>{a.name}</span>
                <span style={{ fontSize: 13, color: COLORS.textDim }}>Target: {fmt(a.target)} QAR</span>
                <button style={{ ...styles.btnOutline, padding: "4px 12px" }} onClick={() => setModal({ type: "agent", agent: a })}>Edit</button>
                <button style={{ ...styles.btn(COLORS.danger), padding: "4px 12px" }} onClick={() => handleDeleteAgent(a.id)}>✕</button>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Logo Upload */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>🖼️ Company Logo</div>
            <p style={{ fontSize: 13, color: COLORS.textDim, margin: "0 0 12px" }}>Upload your company logo. It will appear in the navigation bar and TV mode.</p>
            {logo && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <img src={logo} alt="Logo" style={{ height: 50, objectFit: "contain", background: COLORS.cardAlt, borderRadius: 8, padding: 8 }} />
                <button style={{ ...styles.btn(COLORS.danger), padding: "6px 14px", fontSize: 12 }} onClick={() => setLogo("")}>Remove</button>
              </div>
            )}
            <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: "none" }} />
            <button style={{ ...styles.btn(COLORS.purple), width: "100%", textAlign: "center" }} onClick={() => logoInputRef.current?.click()}>
              📷 {logo ? "Change Logo" : "Upload Logo"}
            </button>
          </div>

          <div style={styles.card}>
            <div style={styles.cardTitle}>📝 Data Input</div>
            <p style={{ fontSize: 13, color: COLORS.textDim, margin: "0 0 16px" }}>Use these forms to update agent collections and company data.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button style={{ ...styles.btn(), width: "100%", textAlign: "center" }} onClick={() => setModal({ type: "monthly" })}>Update Monthly Collections</button>
              <button style={{ ...styles.btn(COLORS.purple), width: "100%", textAlign: "center" }} onClick={() => setModal({ type: "weekly" })}>Update Weekly Collections</button>
              <button style={{ ...styles.btn(COLORS.success), width: "100%", textAlign: "center" }} onClick={() => setModal({ type: "pipeline" })}>Update Lead Pipeline</button>
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardTitle}>🏢 Quarterly Targets</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {["q1Target", "q2Target", "q3Target", "q4Target", "q1Done", "q3Done", "q4Done"].map((k) => (
                <div key={k}>
                  <label style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 4, display: "block" }}>{k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}</label>
                  <input type="number" style={styles.input} value={company[k]} onChange={(e) => setCompany({ ...company, [k]: Number(e.target.value) || 0 })} />
                </div>
              ))}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardTitle}>📺 TV Display</div>
            <p style={{ fontSize: 13, color: COLORS.textDim, margin: "0 0 12px" }}>Launch the auto-rotating TV display for the meeting room screen.</p>
            <button style={{ ...styles.btn(), width: "100%", fontSize: 16, padding: "14px 20px", marginBottom: 12 }} onClick={() => setTvMode(true)}>
              🖥️ Launch TV Mode
            </button>
            <div style={{ background: COLORS.cardAlt, borderRadius: 8, padding: 14, border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 6 }}>📎 Share this link with the TV operator:</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="text" readOnly value={`${window.location.origin}${window.location.pathname}?tv=true`} style={{ ...styles.input, fontSize: 12, flex: 1 }} onClick={(e) => e.target.select()} />
                <button style={{ ...styles.btn(), padding: "10px 14px", whiteSpace: "nowrap" }} onClick={() => { navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?tv=true`); alert("TV link copied!"); }}>
                  📋 Copy
                </button>
              </div>
              <p style={{ fontSize: 11, color: COLORS.textDim, margin: "8px 0 0" }}>Opening this link auto-starts the TV slideshow. Press ESC or click "Exit TV" to return.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={styles.app}>
      <nav style={{ ...styles.nav, position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {logo ? <img src={logo} alt="Logo" style={{ height: 32, objectFit: "contain" }} /> : <div style={{ width: 36, height: 36, borderRadius: 8, background: `linear-gradient(135deg, ${COLORS.accent}, #6366f1)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "#fff" }}>S</div>}
          <span style={{ fontSize: 20, fontWeight: 700, background: `linear-gradient(135deg, ${COLORS.accent}, #a78bfa)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Sales Dashboard</span>
        </div>
        {/* Center logo */}
        {logo && (
          <div style={styles.navCenter}>
            <img src={logo} alt="Company Logo" style={{ height: 36, objectFit: "contain" }} />
          </div>
        )}
        <div style={styles.navBtns}>
          <button style={styles.navBtn(page === "dashboard")} onClick={() => setPage("dashboard")}>📊 Dashboard</button>
          <button style={styles.navBtn(page === "settings")} onClick={() => setPage("settings")}>⚙️ Settings</button>
          <button style={{ ...styles.navBtn(false), background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff" }} onClick={() => setTvMode(true)}>📺 TV Mode</button>
          <button style={{ ...styles.navBtn(false), color: COLORS.danger }} onClick={handleLogout}>🚪 Logout</button>
        </div>
      </nav>
      {page === "dashboard" ? <DashboardPage /> : <SettingsPage />}
      {modal?.type === "monthly" && <DataInputModal agents={agents} onSave={handleDataSave} onClose={() => setModal(null)} type="monthly" />}
      {modal?.type === "weekly" && <DataInputModal agents={agents} onSave={handleDataSave} onClose={() => setModal(null)} type="weekly" />}
      {modal?.type === "agent" && <AgentModal agent={modal.agent} onSave={handleAgentSave} onClose={() => setModal(null)} />}
      {modal?.type === "pipeline" && <PipelineModal pipeline={pipeline} onSave={(d) => { setPipeline(d); setModal(null); }} onClose={() => setModal(null)} />}
    </div>
  );
}
