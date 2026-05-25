import { useState, useEffect } from "react";
import { PlusCircle, Wallet, Trash2, Settings, BarChart2, Home, X, Plus, AlertTriangle, Scissors, BookOpen, ChevronDown, ChevronUp, Sparkles, ArrowLeft, ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie } from "recharts";

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: "Food",      label: "Food & Drink", icon: "🍜", pastelBg: "#FFF8F0", pastelText: "#C2410C", bar: "#FB923C" },
  { value: "Transport", label: "Transport",     icon: "🚇", pastelBg: "#EFF6FF", pastelText: "#1D4ED8", bar: "#60A5FA" },
  { value: "Shopping",  label: "Shopping",      icon: "🛍️", pastelBg: "#F5F3FF", pastelText: "#6D28D9", bar: "#A78BFA" },
  { value: "Bills",     label: "Bills",         icon: "⚡", pastelBg: "#FEFCE8", pastelText: "#A16207", bar: "#FACC15" },
  { value: "Other",     label: "Other",         icon: "📦", pastelBg: "#F8FAFC", pastelText: "#475569", bar: "#94A3B8" },
];
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const getCat       = (val) => CATEGORIES.find((c) => c.value === val) || CATEGORIES[4];
const todayStr     = () => new Date().toISOString().slice(0, 10);
const currentMonth = () => new Date().toISOString().slice(0, 7);
const todayDay     = () => new Date().getDate();
const fmt          = (n) => new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(n);
const fmtDate      = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
const extractTags  = (note) => (note.match(/#\w+/g) || []).map((t) => t.toLowerCase());
const monthKey     = (y, m) => `${y}-${String(m + 1).padStart(2, "0")}`;

const budgetColor = (pct) => {
  if (pct >= 0.95) return { bar: "#EF4444", text: "#DC2626", track: "#FEE2E2" };
  if (pct >= 0.75) return { bar: "#F59E0B", text: "#D97706", track: "#FEF3C7" };
  return { bar: "#10B981", text: "#059669", track: "#D1FAE5" };
};

const lsGet = (k, def) => { try { if (typeof window === "undefined") return def; const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } };
const lsSet = (k, v)   => { try { if (typeof window === "undefined") return; localStorage.setItem(k, JSON.stringify(v)); } catch {} };

// ─── Style tokens ──────────────────────────────────────────────────────────────
const T = {
  pageBg:     "#F8F7F4",
  card:       { background: "#FFFFFF", borderRadius: 28, boxShadow: "0 8px 40px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)" },
  h1:         { fontSize: 42, fontWeight: 800, letterSpacing: "-2px", color: "#0F172A", fontFamily: "'DM Sans', sans-serif", lineHeight: 1 },
  h2:         { fontSize: 17, fontWeight: 700, color: "#0F172A", fontFamily: "'DM Sans', sans-serif" },
  label:      { fontSize: 12, fontWeight: 600, color: "#64748B", letterSpacing: "0.04em", textTransform: "uppercase" },
  muted:      { fontSize: 13, color: "#94A3B8" },
  mono:       { fontFamily: "'DM Mono', monospace" },
  indigo:     "#4F46E5",
  indigoLight:"#EEF2FF",
  input:      { width: "100%", padding: "13px 16px", borderRadius: 16, border: "1.5px solid #E2E8F0", fontSize: 14, color: "#0F172A", fontFamily: "'DM Sans', sans-serif", background: "#FFFFFF", outline: "none", boxSizing: "border-box" },
};

export default function FinanceTracker() {
  const [transactions,  setTransactions]  = useState(() => lsGet("ft_txns",    []));
  const [subscriptions, setSubscriptions] = useState(() => lsGet("ft_subs",    []));
  const [budgets,       setBudgets]       = useState(() => lsGet("ft_budgets", { total: "", categories: {} }));
  const [tab,           setTab]           = useState("home");
  const [showForm,      setShowForm]      = useState(false);
  const [showSubForm,   setShowSubForm]   = useState(false);
  const [deletingId,    setDeletingId]    = useState(null);
  const [toast,         setToast]         = useState(null);
  const [error,         setError]         = useState("");

  // Statement state
  const [stmtYear,      setStmtYear]      = useState(new Date().getFullYear());
  const [openMonth,     setOpenMonth]     = useState(null); // "YYYY-MM" or null
  const [activeDetailMonth, setActiveDetailMonth] = useState(null); // { key: "YYYY-MM", year: number, monthIdx: number } or null
  const [detailCat,     setDetailCat]     = useState(null); // category filter for detail view

  // Yearly Summary state
  const [showYearlySummary, setShowYearlySummary] = useState(false);
  const [yearlyYear,        setYearlyYear]         = useState(new Date().getFullYear());

  const blankForm = { amount: "", reimbursed: "", split: false, category: "Food", note: "", date: todayStr() };
  const [form,    setForm]    = useState(blankForm);
  const blankSub  = { name: "", amount: "", category: "Bills", day: "1" };
  const [subForm, setSubForm] = useState(blankSub);

  useEffect(() => lsSet("ft_txns",    transactions),  [transactions]);
  useEffect(() => lsSet("ft_subs",    subscriptions), [subscriptions]);
  useEffect(() => lsSet("ft_budgets", budgets),       [budgets]);

  // Auto-inject recurring subs
  useEffect(() => {
    if (!subscriptions.length) return;
    const day = todayDay(), month = currentMonth(), injected = [];
    subscriptions.forEach((sub) => {
      if (parseInt(sub.day) !== day) return;
      const already = transactions.some((t) => t.recurringId === sub.id && t.date.startsWith(month));
      if (!already) injected.push({ id: Date.now() + Math.random(), amount: parseFloat(sub.amount), category: sub.category, note: sub.name + " (auto)", date: todayStr(), recurringId: sub.id });
    });
    if (injected.length) { setTransactions((p) => [...injected, ...p]); showToast(`Auto-added ${injected.length} subscription${injected.length > 1 ? "s" : ""} 🔄`); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  // ── Derived (current month) ───────────────────────────────────────────────
  const month       = currentMonth();
  const monthTxns   = transactions.filter((t) => t.date.startsWith(month));
  const monthlyTotal= monthTxns.reduce((s, t) => s + t.amount, 0);
  const totalBudget = parseFloat(budgets.total) || 0;
  const budgetPct   = totalBudget > 0 ? Math.min(monthlyTotal / totalBudget, 1) : 0;
  const bc          = budgetColor(budgetPct);
  const catTotals   = {};
  monthTxns.forEach((t) => { catTotals[t.category] = (catTotals[t.category] || 0) + t.amount; });
  const topCat    = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
  const tagTotals = {};
  monthTxns.forEach((t) => { extractTags(t.note).forEach((tag) => { tagTotals[tag] = (tagTotals[tag] || 0) + t.amount; }); });
  const topTags   = Object.entries(tagTotals).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxTagAmt = topTags[0]?.[1] || 1;

  // ── Statement derived ─────────────────────────────────────────────────────
  // Monthly totals for every month in stmtYear
  const yearMonthData = MONTH_NAMES.map((name, i) => {
    const key  = monthKey(stmtYear, i);
    const txns = transactions.filter((t) => t.date.startsWith(key));
    const total= txns.reduce((s, t) => s + t.amount, 0);
    return { name, key, txns, total, monthIdx: i };
  });
  const yearTotal   = yearMonthData.reduce((s, m) => s + m.total, 0);
  const maxMonthAmt = Math.max(...yearMonthData.map((m) => m.total), 1);
  const availableYears = [...new Set(transactions.map((t) => t.date.slice(0, 4)))].sort((a, b) => b - a);
  if (!availableYears.includes(String(stmtYear))) availableYears.push(String(stmtYear));
  availableYears.sort((a, b) => b - a);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const netAmount = () => { const a = parseFloat(form.amount)||0, r = parseFloat(form.reimbursed)||0; return form.split ? Math.max(a-r,0) : a; };

  const handleAdd = () => {
    const net = netAmount();
    if (!form.amount || net <= 0) { setError("Enter a valid amount."); return; }
    setTransactions((p) => [{ id: Date.now(), amount: net, category: form.category, note: form.note.trim(), date: form.date, tags: extractTags(form.note), split: form.split, originalAmount: parseFloat(form.amount), reimbursed: form.split ? parseFloat(form.reimbursed)||0 : 0 }, ...p]);
    setForm(blankForm); setShowForm(false); setError("");
  };

  const handleDelete = (id) => {
    setDeletingId(id);
    setTimeout(() => { setTransactions((p) => p.filter((t) => t.id !== id)); setDeletingId(null); }, 300);
  };

  const handleAddSub = () => {
    if (!subForm.name || !subForm.amount || parseFloat(subForm.amount) <= 0) return;
    setSubscriptions((p) => [...p, { ...subForm, id: Date.now(), amount: parseFloat(subForm.amount) }]);
    setSubForm(blankSub); setShowSubForm(false);
  };

  const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

  // ── Reusable atoms ────────────────────────────────────────────────────────
  const SectionLabel = ({ children, style: s = {} }) => (
    <p style={{ ...T.label, margin: "0 0 14px", paddingLeft: 4, ...s }}>{children}</p>
  );
  const CardWrap = ({ children, style: s = {} }) => (
    <div style={{ ...T.card, padding: "22px 24px", marginBottom: 14, ...s }}>{children}</div>
  );
  const TxRow = ({ tx }) => {
    const cat = getCat(tx.category);
    const isDeleting = deletingId === tx.id;
    const tags = extractTags(tx.note);
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, opacity: isDeleting ? 0 : 1, transform: isDeleting ? "translateX(50px)" : "none", transition: "all 0.28s", padding: "11px 0", borderBottom: "1px solid #F1F5F9" }}>
        <div style={{ width: 40, height: 40, borderRadius: 14, background: cat.pastelBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{cat.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{cat.label}</span>
            {tx.split && <span style={{ fontSize: 10, fontWeight: 700, background: "#EEF2FF", color: T.indigo, padding: "1px 6px", borderRadius: 5 }}>split</span>}
            {tx.recurringId && <span style={{ fontSize: 10, fontWeight: 700, background: "#FEFCE8", color: "#A16207", padding: "1px 6px", borderRadius: 5 }}>auto</span>}
          </div>
          <p style={{ ...T.muted, margin: "2px 0 0", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {tx.note || "No note"} · {fmtDate(tx.date)}
          </p>
          {tags.length > 0 && (
            <div style={{ display: "flex", gap: 3, marginTop: 4, flexWrap: "wrap" }}>
              {tags.map((tag) => <span key={tag} style={{ fontSize: 10, fontWeight: 700, background: "#EEF2FF", color: "#6366F1", padding: "1px 7px", borderRadius: 99 }}>{tag}</span>)}
            </div>
          )}
        </div>
        <span style={{ ...T.mono, fontSize: 14, fontWeight: 700, color: "#EF4444", flexShrink: 0 }}>−{fmt(tx.amount)}</span>
        <button onClick={() => handleDelete(tx.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 5, color: "#CBD5E1", flexShrink: 0 }}><Trash2 size={14} /></button>
      </div>
    );
  };

  // ── Yearly Summary aggregation ────────────────────────────────────────────
  const computeYearlyData = (year) => {
    const yearStr = String(year);
    const yearTxns = transactions.filter((t) => t.date.startsWith(yearStr));

    // Total spent
    const totalSpent = yearTxns.reduce((s, t) => s + t.amount, 0);

    // Monthly average
    const now = new Date();
    const isCurrentYear = year === now.getFullYear();
    const divisor = isCurrentYear ? now.getMonth() + 1 : 12;
    const monthlyAvg = divisor > 0 ? totalSpent / divisor : 0;

    // Biggest single transaction
    const biggestTx = yearTxns.length > 0
      ? yearTxns.reduce((max, t) => t.amount > max.amount ? t : max, yearTxns[0])
      : null;

    // Per-category totals
    const catTotalsYear = {};
    yearTxns.forEach((t) => { catTotalsYear[t.category] = (catTotalsYear[t.category] || 0) + t.amount; });

    // Per-month totals (Jan–Dec)
    const monthlyTrend = MONTH_NAMES.map((name, i) => {
      const key = monthKey(year, i);
      const total = yearTxns.filter((t) => t.date.startsWith(key)).reduce((s, t) => s + t.amount, 0);
      return { name, total, monthIdx: i };
    });

    return { totalSpent, monthlyAvg, biggestTx, catTotalsYear, monthlyTrend, yearTxns };
  };

  // ── Yearly Summary component ──────────────────────────────────────────────
  const YearlySummary = () => {
    const [selectedMonth, setSelectedMonth] = useState(null); // monthIdx 0-11 or null
    const { totalSpent, monthlyAvg, biggestTx, catTotalsYear, monthlyTrend } = computeYearlyData(yearlyYear);

    // Year options: current ±1 plus any year with data
    const currentYr = new Date().getFullYear();
    const yearOptions = [currentYr - 1, currentYr, currentYr + 1].filter((y) => y >= 2024);

    // Donut data
    const donutData = CATEGORIES.map((cat) => ({
      name: cat.label, value: catTotalsYear[cat.value] || 0, cat,
    })).filter((d) => d.value > 0);

    // Custom tooltip
    const AreaTooltip = ({ active, payload, label }) => {
      if (!active || !payload?.length) return null;
      return (
        <div style={{ background: "#0F172A", padding: "8px 14px", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }}>
          <p style={{ margin: 0, fontSize: 11, color: "#94A3B8", fontWeight: 600 }}>{label}</p>
          <p style={{ margin: "2px 0 0", fontSize: 14, color: "#F8FAFC", fontWeight: 800, fontFamily: "'DM Mono', monospace" }}>{fmt(payload[0].value)}</p>
        </div>
      );
    };

    // ── Month detail drill-down ──────────────────────────────────────────────
    if (selectedMonth !== null) {
      const [selectedCat, setSelectedCat] = useState(null); // category value string or null

      const mIdx = selectedMonth;
      const mKey = monthKey(yearlyYear, mIdx);
      const mName = `${MONTH_NAMES[mIdx]} ${yearlyYear}`;
      const mTxns = transactions.filter((t) => t.date.startsWith(mKey)).sort((a, b) => new Date(b.date) - new Date(a.date));
      const mTotal = mTxns.reduce((s, t) => s + t.amount, 0);
      const mCatTotals = {};
      mTxns.forEach((t) => { mCatTotals[t.category] = (mCatTotals[t.category] || 0) + t.amount; });
      const mCatSorted = Object.entries(mCatTotals).sort((a, b) => b[1] - a[1]);

      // Filtered transactions — all if no cat selected, else just that cat
      const visibleTxns = selectedCat ? mTxns.filter((t) => t.category === selectedCat) : mTxns;
      const activeCat = selectedCat ? getCat(selectedCat) : null;

      // Navigate prev/next month (reset cat filter on switch)
      const goPrev = () => { setSelectedCat(null); setSelectedMonth((m) => m > 0 ? m - 1 : m); };
      const goNext = () => { setSelectedCat(null); setSelectedMonth((m) => m < 11 ? m + 1 : m); };

      return (
        <div style={{ position: "fixed", inset: 0, zIndex: 210, background: "#F8F7F4", overflowY: "auto", fontFamily: "'DM Sans', sans-serif" }}>
          {/* Sticky nav */}
          <div style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(248,247,244,0.94)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(226,232,240,0.6)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setSelectedMonth(null)} style={{ display: "flex", alignItems: "center", gap: 6, background: "#FFFFFF", border: "none", cursor: "pointer", padding: "9px 16px", borderRadius: 99, fontFamily: "inherit", fontSize: 13, fontWeight: 700, color: "#334155", boxShadow: "0 2px 8px rgba(15,23,42,0.08)", flexShrink: 0 }}>
              <ArrowLeft size={15} /> {yearlyYear}
            </button>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <button onClick={goPrev} disabled={mIdx === 0} style={{ background: mIdx === 0 ? "#F1F5F9" : "#FFFFFF", border: "none", cursor: mIdx === 0 ? "default" : "pointer", width: 34, height: 34, borderRadius: 99, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: mIdx === 0 ? "none" : "0 2px 8px rgba(15,23,42,0.08)", color: mIdx === 0 ? "#CBD5E1" : "#334155" }}>
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: 15, fontWeight: 800, color: "#0F172A", minWidth: 110, textAlign: "center" }}>{mName}</span>
              <button onClick={goNext} disabled={mIdx === 11} style={{ background: mIdx === 11 ? "#F1F5F9" : "#FFFFFF", border: "none", cursor: mIdx === 11 ? "default" : "pointer", width: 34, height: 34, borderRadius: 99, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: mIdx === 11 ? "none" : "0 2px 8px rgba(15,23,42,0.08)", color: mIdx === 11 ? "#CBD5E1" : "#334155" }}>
                <ChevronRight size={16} />
              </button>
            </div>
            <div style={{ width: 80, flexShrink: 0 }} />
          </div>

          <div style={{ maxWidth: 430, margin: "0 auto", padding: "0 16px 48px" }}>
            {/* Month hero */}
            <div style={{ padding: "28px 4px 16px" }}>
              <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Total Spent</p>
              <p style={{ margin: 0, fontSize: 44, fontWeight: 800, letterSpacing: "-2px", color: "#0F172A", lineHeight: 1 }}>{fmt(mTotal)}</p>
              <p style={{ margin: "8px 0 0", fontSize: 13, color: "#94A3B8", fontWeight: 500 }}>{mTxns.length} transaction{mTxns.length !== 1 ? "s" : ""} in {mName}</p>
            </div>

            {mTxns.length === 0 ? (
              <div style={{ ...T.card, padding: "40px 24px", textAlign: "center" }}>
                <p style={{ ...T.muted, margin: 0, fontWeight: 500 }}>No transactions recorded in {mName}</p>
              </div>
            ) : (
              <>
                {/* ── Category cards — tappable ── */}
                <p style={{ ...T.label, margin: "0 0 10px", paddingLeft: 4 }}>Categories</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                  {mCatSorted.map(([catVal, amt]) => {
                    const cat = getCat(catVal);
                    const pct = mTotal > 0 ? amt / mTotal : 0;
                    const isActive = selectedCat === catVal;
                    const catTxCount = mTxns.filter((t) => t.category === catVal).length;
                    return (
                      <button
                        key={catVal}
                        onClick={() => setSelectedCat(isActive ? null : catVal)}
                        style={{
                          width: "100%", border: "none", fontFamily: "inherit", cursor: "pointer", textAlign: "left",
                          padding: "16px 20px", borderRadius: 22,
                          background: isActive ? cat.pastelBg : "#FFFFFF",
                          outline: isActive ? `2.5px solid ${cat.bar}` : "2.5px solid transparent",
                          boxShadow: isActive
                            ? `0 6px 24px ${cat.bar}30`
                            : "0 2px 12px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)",
                          transition: "all 0.18s",
                        }}
                      >
                        {/* Top row: icon + name + amount */}
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                          <div style={{
                            width: 44, height: 44, borderRadius: 16, flexShrink: 0,
                            background: isActive ? "#FFFFFF" : cat.pastelBg,
                            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                            boxShadow: isActive ? `0 2px 8px ${cat.bar}40` : "none",
                            transition: "all 0.18s",
                          }}>{cat.icon}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                              <span style={{ fontSize: 15, fontWeight: 800, color: isActive ? cat.pastelText : "#0F172A" }}>{cat.label}</span>
                              <span style={{ ...T.mono, fontSize: 16, fontWeight: 800, color: isActive ? cat.pastelText : "#0F172A" }}>{fmt(amt)}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
                              <span style={{ fontSize: 11, color: isActive ? cat.pastelText : "#94A3B8", fontWeight: 500, opacity: isActive ? 0.75 : 1 }}>{catTxCount} transaction{catTxCount !== 1 ? "s" : ""}</span>
                              <span style={{ fontSize: 12, fontWeight: 700, color: isActive ? cat.pastelText : "#94A3B8" }}>{(pct * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        </div>
                        {/* Progress bar */}
                        <div style={{ height: 6, background: isActive ? `${cat.bar}30` : "#F1F5F9", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct * 100}%`, background: cat.bar, borderRadius: 99, transition: "width 0.45s cubic-bezier(0.34,1.56,0.64,1)" }} />
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* ── Transaction list — filtered or all ── */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, paddingLeft: 4 }}>
                  <p style={{ ...T.label, margin: 0 }}>
                    {selectedCat ? `${activeCat.icon} ${activeCat.label}` : "All Transactions"} · {visibleTxns.length}
                  </p>
                  {selectedCat && (
                    <button onClick={() => setSelectedCat(null)} style={{ display: "flex", alignItems: "center", gap: 5, background: "#F1F5F9", border: "none", cursor: "pointer", padding: "5px 12px", borderRadius: 99, fontFamily: "inherit", fontSize: 11, fontWeight: 700, color: "#64748B" }}>
                      <X size={11} /> Show all
                    </button>
                  )}
                </div>

                {/* Active category total banner */}
                {selectedCat && (
                  <div style={{ padding: "14px 20px", borderRadius: 18, marginBottom: 12, background: activeCat.pastelBg, border: `1.5px solid ${activeCat.bar}40` }}>
                    <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 600, color: activeCat.pastelText, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.7 }}>Spent on {activeCat.label}</p>
                    <p style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: "-1px", color: activeCat.pastelText, fontFamily: "'DM Mono', monospace" }}>{fmt(mCatTotals[selectedCat])}</p>
                  </div>
                )}

                {visibleTxns.map((tx) => {
                  const cat = getCat(tx.category);
                  const tags = extractTags(tx.note);
                  return (
                    <div key={tx.id} style={{ ...T.card, padding: "14px 18px", marginBottom: 9, display: "flex", alignItems: "center", gap: 13 }}>
                      <div style={{ width: 42, height: 42, borderRadius: 15, background: cat.pastelBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, flexShrink: 0 }}>{cat.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{cat.label}</span>
                          {tx.split && <span style={{ fontSize: 10, fontWeight: 700, background: "#EEF2FF", color: T.indigo, padding: "1px 6px", borderRadius: 5 }}>split</span>}
                          {tx.recurringId && <span style={{ fontSize: 10, fontWeight: 700, background: "#FEFCE8", color: "#A16207", padding: "1px 6px", borderRadius: 5 }}>auto</span>}
                        </div>
                        <p style={{ ...T.muted, margin: "2px 0 0", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.note || "No note"} · {fmtDate(tx.date)}</p>
                        {tags.length > 0 && (
                          <div style={{ display: "flex", gap: 3, marginTop: 4, flexWrap: "wrap" }}>
                            {tags.map((tag) => <span key={tag} style={{ fontSize: 10, fontWeight: 700, background: "#EEF2FF", color: "#6366F1", padding: "1px 7px", borderRadius: 99 }}>{tag}</span>)}
                          </div>
                        )}
                      </div>
                      <span style={{ ...T.mono, fontSize: 14, fontWeight: 700, color: "#EF4444", flexShrink: 0 }}>−{fmt(tx.amount)}</span>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      );
    }

    // ── Main yearly overview ─────────────────────────────────────────────────
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "#F8F7F4", overflowY: "auto", fontFamily: "'DM Sans', sans-serif" }}>
        {/* Sticky header */}
        <div style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(248,247,244,0.92)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(226,232,240,0.6)", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={() => setShowYearlySummary(false)} style={{ display: "flex", alignItems: "center", gap: 7, background: "#FFFFFF", border: "none", cursor: "pointer", padding: "9px 16px", borderRadius: 99, fontFamily: "inherit", fontSize: 13, fontWeight: 700, color: "#334155", boxShadow: "0 2px 8px rgba(15,23,42,0.08)" }}>
            <ArrowLeft size={15} /> Dashboard
          </button>
          {/* Year toggle */}
          <div style={{ display: "flex", gap: 4, background: "#FFFFFF", padding: 4, borderRadius: 99, boxShadow: "0 2px 8px rgba(15,23,42,0.08)" }}>
            {yearOptions.map((y) => (
              <button key={y} onClick={() => setYearlyYear(y)} style={{ padding: "6px 14px", borderRadius: 99, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700, background: yearlyYear === y ? "#0F172A" : "transparent", color: yearlyYear === y ? "#FFFFFF" : "#64748B", transition: "all 0.18s" }}>{y}</button>
            ))}
          </div>
        </div>

        <div style={{ maxWidth: 430, margin: "0 auto", padding: "0 16px 48px" }}>
          {/* Title */}
          <div style={{ padding: "32px 4px 24px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, marginBottom: 8, padding: "5px 12px", background: "#EEF2FF", borderRadius: 99 }}>
              <Sparkles size={13} color="#4F46E5" />
              <span style={{ fontSize: 11, fontWeight: 700, color: "#4F46E5", letterSpacing: "0.05em", textTransform: "uppercase" }}>Year in Review</span>
            </div>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, color: "#0F172A", letterSpacing: "-1px", lineHeight: 1.1 }}>Your {yearlyYear}<br />in Review</h1>
          </div>

          {/* Hero total */}
          <div style={{ ...T.card, padding: "28px 28px", marginBottom: 14, background: "#0F172A" }}>
            <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}>Total Spent This Year</p>
            <p style={{ margin: "0 0 16px", fontSize: 42, fontWeight: 800, letterSpacing: "-2px", color: "#F8FAFC", fontFamily: "'DM Sans', sans-serif", lineHeight: 1 }}>{fmt(totalSpent)}</p>
            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ flex: 1, padding: "14px 16px", background: "rgba(255,255,255,0.07)", borderRadius: 16 }}>
                <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Monthly Avg</p>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#F8FAFC", fontFamily: "'DM Mono', monospace" }}>{fmt(monthlyAvg)}</p>
              </div>
              <div style={{ flex: 1, padding: "14px 16px", background: "rgba(255,255,255,0.07)", borderRadius: 16 }}>
                <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Transactions</p>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#F8FAFC", fontFamily: "'DM Mono', monospace" }}>{computeYearlyData(yearlyYear).yearTxns.length}</p>
              </div>
            </div>
          </div>

          {/* Biggest expense */}
          {biggestTx ? (
            <div style={{ ...T.card, padding: "22px 24px", marginBottom: 14, background: "#EEF2FF", boxShadow: "0 8px 32px rgba(79,70,229,0.12)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <div style={{ width: 30, height: 30, borderRadius: 10, background: "#C7D2FE", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <TrendingUp size={15} color="#4338CA" />
                </div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#4338CA", textTransform: "uppercase", letterSpacing: "0.06em" }}>Biggest Expense of {yearlyYear}</p>
              </div>
              <p style={{ margin: "0 0 4px", fontSize: 32, fontWeight: 800, color: "#312E81", letterSpacing: "-1.5px", fontFamily: "'DM Mono', monospace" }}>{fmt(biggestTx.amount)}</p>
              <p style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 600, color: "#4338CA" }}>{biggestTx.note || getCat(biggestTx.category).label}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 9, background: "#C7D2FE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{getCat(biggestTx.category).icon}</div>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#6366F1" }}>{getCat(biggestTx.category).label} · {fmtDate(biggestTx.date)}</span>
              </div>
            </div>
          ) : (
            <div style={{ ...T.card, padding: "22px 24px", marginBottom: 14, background: "#EEF2FF", textAlign: "center" }}>
              <p style={{ margin: 0, color: "#6366F1", fontWeight: 600, fontSize: 14 }}>No transactions recorded for {yearlyYear}</p>
            </div>
          )}

          {/* Monthly trend area chart */}
          <div style={{ ...T.card, padding: "22px 24px", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <BarChart2 size={16} color="#4F46E5" />
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0F172A" }}>Monthly Spending Trend</p>
            </div>
            {totalSpent > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={monthlyTrend} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="yearGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 600, fill: "#94A3B8", fontFamily: "'DM Sans',sans-serif" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<AreaTooltip />} />
                  <Area type="monotone" dataKey="total" stroke="#4F46E5" strokeWidth={2.5} fill="url(#yearGrad)" dot={{ r: 3, fill: "#4F46E5", strokeWidth: 0 }} activeDot={{ r: 5, fill: "#4F46E5", strokeWidth: 0, cursor: "pointer", onClick: (_, payload) => { if (payload?.index !== undefined) setSelectedMonth(payload.index); } }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p style={{ ...T.muted, fontSize: 13, fontWeight: 500 }}>No data for {yearlyYear}</p>
              </div>
            )}
            {/* Lightest/heaviest pills */}
            {totalSpent > 0 && (() => {
              const activeMths = monthlyTrend.filter((m) => m.total > 0);
              if (activeMths.length < 2) return null;
              const best = activeMths.reduce((min, m) => m.total < min.total ? m : min, activeMths[0]);
              const worst = activeMths.reduce((max, m) => m.total > max.total ? m : max, activeMths[0]);
              return (
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <div onClick={() => setSelectedMonth(best.monthIdx)} style={{ flex: 1, padding: "10px 14px", background: "#F0FDF4", borderRadius: 14, cursor: "pointer" }}>
                    <p style={{ margin: "0 0 2px", fontSize: 10, fontWeight: 700, color: "#15803D", textTransform: "uppercase" }}>Lightest ↗</p>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#166534", fontFamily: "'DM Mono', monospace" }}>{best.name} · {fmt(best.total)}</p>
                  </div>
                  <div onClick={() => setSelectedMonth(worst.monthIdx)} style={{ flex: 1, padding: "10px 14px", background: "#FFF1F2", borderRadius: 14, cursor: "pointer" }}>
                    <p style={{ margin: "0 0 2px", fontSize: 10, fontWeight: 700, color: "#BE123C", textTransform: "uppercase" }}>Heaviest ↗</p>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#9F1239", fontFamily: "'DM Mono', monospace" }}>{worst.name} · {fmt(worst.total)}</p>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Category donut */}
          <div style={{ ...T.card, padding: "22px 24px", marginBottom: 14 }}>
            <p style={{ margin: "0 0 18px", fontSize: 14, fontWeight: 700, color: "#0F172A" }}>Spending by Category</p>
            {donutData.length > 0 ? (
              <>
                <div style={{ position: "relative", height: 180 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={donutData} cx="50%" cy="50%" innerRadius={52} outerRadius={80} paddingAngle={3} dataKey="value" strokeWidth={0}>
                        {donutData.map((entry, i) => <Cell key={i} fill={entry.cat.bar} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center", pointerEvents: "none" }}>
                    <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase" }}>Total</p>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#0F172A", fontFamily: "'DM Mono', monospace" }}>{fmt(totalSpent)}</p>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                  {donutData.sort((a, b) => b.value - a.value).map((d) => {
                    const pct = totalSpent > 0 ? (d.value / totalSpent * 100).toFixed(1) : 0;
                    return (
                      <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: d.cat.bar, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#334155", flex: 1 }}>{d.cat.icon} {d.name}</span>
                        <span style={{ fontSize: 12, color: "#94A3B8", fontWeight: 500 }}>{pct}%</span>
                        <span style={{ ...T.mono, fontSize: 13, fontWeight: 700, color: "#0F172A", minWidth: 72, textAlign: "right" }}>{fmt(d.value)}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p style={{ ...T.muted, fontSize: 13, fontWeight: 500 }}>No category data for {yearlyYear}</p>
              </div>
            )}
          </div>

          {/* Clickable month grid */}
          <p style={{ ...T.label, margin: "0 0 12px", paddingLeft: 4 }}>Tap a Month to Explore</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
            {monthlyTrend.map(({ name, total, monthIdx }) => {
              const hasData = total > 0;
              const isCurrentMo = monthKey(yearlyYear, monthIdx) === currentMonth();
              const isMax = total > 0 && total === Math.max(...monthlyTrend.map((m) => m.total));
              return (
                <button key={monthIdx} onClick={() => hasData && setSelectedMonth(monthIdx)} style={{
                  ...T.card,
                  padding: "14px 16px", border: "none", fontFamily: "inherit",
                  cursor: hasData ? "pointer" : "default",
                  textAlign: "left",
                  background: isMax ? "#EEF2FF" : "#FFFFFF",
                  outline: isCurrentMo ? `2px solid ${T.indigo}` : "none",
                  opacity: hasData ? 1 : 0.45,
                  transition: "transform 0.15s, box-shadow 0.15s",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: isMax ? T.indigo : isCurrentMo ? T.indigo : "#0F172A" }}>{name}</span>
                    {isCurrentMo && <span style={{ fontSize: 8, fontWeight: 700, background: T.indigoLight, color: T.indigo, padding: "2px 5px", borderRadius: 99 }}>NOW</span>}
                    {isMax && !isCurrentMo && <span style={{ fontSize: 8, fontWeight: 700, background: "#EEF2FF", color: T.indigo, padding: "2px 5px", borderRadius: 99 }}>PEAK</span>}
                  </div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#0F172A", fontFamily: "'DM Mono', monospace" }}>{hasData ? fmt(total) : "—"}</p>
                  {hasData && <p style={{ margin: "3px 0 0", fontSize: 10, color: "#94A3B8", fontWeight: 500 }}>tap to view ›</p>}
                </button>
              );
            })}
          </div>

          {/* Bar chart */}
          <div style={{ ...T.card, padding: "22px 24px", marginBottom: 14 }}>
            <p style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 700, color: "#0F172A" }}>Month-by-Month</p>
            <p style={{ margin: "0 0 16px", fontSize: 11, color: "#94A3B8", fontWeight: 500 }}>Tap a bar to drill into that month</p>
            {totalSpent > 0 ? (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={monthlyTrend} margin={{ top: 4, right: 0, left: 0, bottom: 0 }} barSize={18}
                  onClick={(data) => { if (data?.activePayload?.[0]?.payload?.total > 0) setSelectedMonth(data.activePayload[0].payload.monthIdx); }}>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 600, fill: "#94A3B8", fontFamily: "'DM Sans',sans-serif" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<AreaTooltip />} cursor={{ fill: "rgba(79,70,229,0.06)", radius: 8 }} />
                  <Bar dataKey="total" radius={[6, 6, 2, 2]}>
                    {monthlyTrend.map((entry, i) => {
                      const isMax = entry.total === Math.max(...monthlyTrend.map((m) => m.total)) && entry.total > 0;
                      const isCurrentMo = monthKey(yearlyYear, i) === currentMonth();
                      return <Cell key={i} fill={isMax ? "#4F46E5" : isCurrentMo ? "#818CF8" : "#C7D2FE"} style={{ cursor: entry.total > 0 ? "pointer" : "default" }} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p style={{ ...T.muted, fontSize: 13 }}>No data</p>
              </div>
            )}
          </div>

        </div>
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: T.pageBg, paddingBottom: 90 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700;0,9..40,800&family=DM+Mono:wght@500&display=swap" rel="stylesheet" />

      {/* Yearly Summary full-screen overlay */}
      {showYearlySummary && <YearlySummary />}

      {/* Monthly Detail full-screen overlay */}
      {activeDetailMonth && (() => {
        const { key, year, monthIdx, name: mShortName } = activeDetailMonth;
        const mName  = `${mShortName} ${year} Summary`;
        const mTxns  = transactions.filter((t) => t.date.startsWith(key)).sort((a, b) => new Date(b.date) - new Date(a.date));
        const mTotal = mTxns.reduce((s, t) => s + t.amount, 0);
        const mCatTotals = {};
        mTxns.forEach((t) => { mCatTotals[t.category] = (mCatTotals[t.category] || 0) + t.amount; });
        const mCatSorted = Object.entries(mCatTotals).sort((a, b) => b[1] - a[1]);
        const visibleTxns = detailCat ? mTxns.filter((t) => t.category === detailCat) : mTxns;
        const activeCatObj = detailCat ? getCat(detailCat) : null;

        // prev/next navigation across all 12 months
        const prevMonthIdx = monthIdx > 0 ? monthIdx - 1 : null;
        const nextMonthIdx = monthIdx < 11 ? monthIdx + 1 : null;
        const goToMonth = (idx) => {
          const newKey = monthKey(year, idx);
          setActiveDetailMonth({ key: newKey, year, monthIdx: idx, name: MONTH_NAMES[idx] });
          setDetailCat(null);
        };

        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "#F8F7F4", overflowY: "auto", fontFamily: "'DM Sans', sans-serif" }}>
            {/* Sticky top nav */}
            <div style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(248,247,244,0.94)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(226,232,240,0.6)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={() => { setActiveDetailMonth(null); setDetailCat(null); }}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "#FFFFFF", border: "none", cursor: "pointer", padding: "9px 16px", borderRadius: 99, fontFamily: "inherit", fontSize: 13, fontWeight: 700, color: "#334155", boxShadow: "0 2px 8px rgba(15,23,42,0.08)", flexShrink: 0 }}>
                <ArrowLeft size={15} /> Statements
              </button>
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <button onClick={() => prevMonthIdx !== null && goToMonth(prevMonthIdx)} disabled={prevMonthIdx === null}
                  style={{ width: 34, height: 34, borderRadius: 99, border: "none", display: "flex", alignItems: "center", justifyContent: "center", background: prevMonthIdx !== null ? "#FFFFFF" : "#F1F5F9", color: prevMonthIdx !== null ? "#334155" : "#CBD5E1", cursor: prevMonthIdx !== null ? "pointer" : "default", boxShadow: prevMonthIdx !== null ? "0 2px 8px rgba(15,23,42,0.08)" : "none" }}>
                  <ChevronLeft size={16} />
                </button>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#0F172A", minWidth: 110, textAlign: "center" }}>{mShortName} {year}</span>
                <button onClick={() => nextMonthIdx !== null && goToMonth(nextMonthIdx)} disabled={nextMonthIdx === null}
                  style={{ width: 34, height: 34, borderRadius: 99, border: "none", display: "flex", alignItems: "center", justifyContent: "center", background: nextMonthIdx !== null ? "#FFFFFF" : "#F1F5F9", color: nextMonthIdx !== null ? "#334155" : "#CBD5E1", cursor: nextMonthIdx !== null ? "pointer" : "default", boxShadow: nextMonthIdx !== null ? "0 2px 8px rgba(15,23,42,0.08)" : "none" }}>
                  <ChevronRight size={16} />
                </button>
              </div>
              <div style={{ width: 100, flexShrink: 0 }} />
            </div>

            <div style={{ maxWidth: 430, margin: "0 auto", padding: "0 16px 100px" }}>
              {/* Hero total */}
              <div style={{ padding: "28px 4px 20px" }}>
                <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{mShortName} {year} Summary</p>
                <p style={{ margin: 0, fontSize: 48, fontWeight: 800, letterSpacing: "-2.5px", color: "#0F172A", lineHeight: 1, fontFamily: "'DM Mono', monospace" }}>{fmt(mTotal)}</p>
                <p style={{ margin: "10px 0 0", fontSize: 13, color: "#94A3B8", fontWeight: 500 }}>{mTxns.length} transaction{mTxns.length !== 1 ? "s" : ""} recorded</p>
              </div>

              {mTxns.length === 0 ? (
                /* Empty state */
                <div style={{ ...T.card, padding: "56px 24px", textAlign: "center", marginTop: 8 }}>
                  <div style={{ width: 64, height: 64, borderRadius: 24, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                    <Wallet size={28} color="#CBD5E1" />
                  </div>
                  <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: "#94A3B8" }}>No expenses recorded</p>
                  <p style={{ margin: 0, fontSize: 13, color: "#CBD5E1", fontWeight: 500 }}>this month</p>
                </div>
              ) : (
                <>
                  {/* Category breakdown cards */}
                  <p style={{ ...T.label, margin: "0 0 10px", paddingLeft: 4 }}>Categories</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                    {mCatSorted.map(([catVal, amt]) => {
                      const cat = getCat(catVal);
                      const pct = mTotal > 0 ? amt / mTotal : 0;
                      const isActive = detailCat === catVal;
                      const catCount = mTxns.filter((t) => t.category === catVal).length;
                      return (
                        <button key={catVal} onClick={() => setDetailCat(isActive ? null : catVal)}
                          style={{ width: "100%", border: "none", fontFamily: "inherit", cursor: "pointer", textAlign: "left", padding: "16px 20px", borderRadius: 22, background: isActive ? cat.pastelBg : "#FFFFFF", outline: isActive ? `2.5px solid ${cat.bar}` : "2.5px solid transparent", boxShadow: isActive ? `0 6px 24px ${cat.bar}30` : "0 2px 12px rgba(15,23,42,0.06)", transition: "all 0.18s" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 16, flexShrink: 0, background: isActive ? "#FFFFFF" : cat.pastelBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, boxShadow: isActive ? `0 2px 8px ${cat.bar}40` : "none", transition: "all 0.18s" }}>{cat.icon}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                                <span style={{ fontSize: 15, fontWeight: 800, color: isActive ? cat.pastelText : "#0F172A" }}>{cat.label}</span>
                                <span style={{ ...T.mono, fontSize: 16, fontWeight: 800, color: isActive ? cat.pastelText : "#0F172A" }}>{fmt(amt)}</span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                                <span style={{ fontSize: 11, color: isActive ? cat.pastelText : "#94A3B8", fontWeight: 500, opacity: isActive ? 0.75 : 1 }}>{catCount} transaction{catCount !== 1 ? "s" : ""}</span>
                                <span style={{ fontSize: 12, fontWeight: 700, color: isActive ? cat.pastelText : "#94A3B8" }}>{(pct * 100).toFixed(0)}%</span>
                              </div>
                            </div>
                          </div>
                          <div style={{ height: 6, background: isActive ? `${cat.bar}30` : "#F1F5F9", borderRadius: 99, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct * 100}%`, background: cat.bar, borderRadius: 99, transition: "width 0.45s cubic-bezier(0.34,1.56,0.64,1)" }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Transaction list header */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, paddingLeft: 4 }}>
                    <p style={{ ...T.label, margin: 0 }}>
                      {detailCat ? `${activeCatObj.icon} ${activeCatObj.label}` : "All Transactions"} · {visibleTxns.length}
                    </p>
                    {detailCat && (
                      <button onClick={() => setDetailCat(null)} style={{ display: "flex", alignItems: "center", gap: 5, background: "#F1F5F9", border: "none", cursor: "pointer", padding: "5px 12px", borderRadius: 99, fontFamily: "inherit", fontSize: 11, fontWeight: 700, color: "#64748B" }}>
                        <X size={11} /> Show all
                      </button>
                    )}
                  </div>

                  {/* Category total banner when filtered */}
                  {detailCat && (
                    <div style={{ padding: "14px 20px", borderRadius: 18, marginBottom: 12, background: activeCatObj.pastelBg, border: `1.5px solid ${activeCatObj.bar}40` }}>
                      <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 600, color: activeCatObj.pastelText, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.7 }}>Spent on {activeCatObj.label}</p>
                      <p style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: "-1px", color: activeCatObj.pastelText, fontFamily: "'DM Mono', monospace" }}>{fmt(mCatTotals[detailCat])}</p>
                    </div>
                  )}

                  {/* Transactions */}
                  {visibleTxns.map((tx) => {
                    const cat = getCat(tx.category);
                    const tags = extractTags(tx.note);
                    const isDeleting = deletingId === tx.id;
                    return (
                      <div key={tx.id} style={{ ...T.card, padding: "14px 18px", marginBottom: 9, display: "flex", alignItems: "center", gap: 13, opacity: isDeleting ? 0 : 1, transform: isDeleting ? "translateX(50px)" : "none", transition: "all 0.28s" }}>
                        <div style={{ width: 42, height: 42, borderRadius: 15, background: cat.pastelBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, flexShrink: 0 }}>{cat.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{cat.label}</span>
                            {tx.split && <span style={{ fontSize: 10, fontWeight: 700, background: "#EEF2FF", color: T.indigo, padding: "1px 6px", borderRadius: 5 }}>split</span>}
                            {tx.recurringId && <span style={{ fontSize: 10, fontWeight: 700, background: "#FEFCE8", color: "#A16207", padding: "1px 6px", borderRadius: 5 }}>auto</span>}
                          </div>
                          <p style={{ ...T.muted, margin: "2px 0 0", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.note || "No note"} · {fmtDate(tx.date)}</p>
                          {tags.length > 0 && (
                            <div style={{ display: "flex", gap: 3, marginTop: 4, flexWrap: "wrap" }}>
                              {tags.map((tag) => <span key={tag} style={{ fontSize: 10, fontWeight: 700, background: "#EEF2FF", color: "#6366F1", padding: "1px 7px", borderRadius: 99 }}>{tag}</span>)}
                            </div>
                          )}
                        </div>
                        <span style={{ ...T.mono, fontSize: 14, fontWeight: 700, color: "#EF4444", flexShrink: 0 }}>−{fmt(tx.amount)}</span>
                        <button onClick={() => handleDelete(tx.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 5, color: "#CBD5E1", flexShrink: 0 }}><Trash2 size={14} /></button>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 999, background: "#0F172A", color: "#F8FAFC", padding: "11px 22px", borderRadius: 99, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", boxShadow: "0 8px 32px rgba(15,23,42,0.22)" }}>
          {toast}
        </div>
      )}

      {/* ══ HERO HEADER ══ */}
      <div style={{ padding: "36px 24px 28px", background: T.pageBg }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <p style={{ ...T.muted, margin: 0, fontWeight: 600, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>
          <button onClick={() => { setYearlyYear(new Date().getFullYear()); setShowYearlySummary(true); }} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "#0F172A", border: "none", cursor: "pointer",
            padding: "7px 14px", borderRadius: 99, fontFamily: "inherit",
            fontSize: 12, fontWeight: 700, color: "#F8FAFC",
            boxShadow: "0 2px 12px rgba(15,23,42,0.22)",
          }}>
            <Sparkles size={12} /> {new Date().getFullYear()} in Review
          </button>
        </div>
        <p style={{ ...T.muted, margin: "0 0 10px", fontSize: 13 }}>Total spent</p>
        <span style={{ ...T.h1 }}>{fmt(monthlyTotal)}</span>

        {topCat && !totalBudget && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12, padding: "5px 12px", background: "#FFFFFF", borderRadius: 99, boxShadow: "0 2px 8px rgba(15,23,42,0.07)" }}>
            <span style={{ fontSize: 14 }}>{getCat(topCat[0]).icon}</span>
            <span style={{ fontSize: 12, color: "#64748B", fontWeight: 500 }}>Top: <span style={{ color: "#334155", fontWeight: 700 }}>{getCat(topCat[0]).label}</span></span>
          </div>
        )}

        {totalBudget > 0 && (
          <div style={{ marginTop: 16, ...T.card, padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>Monthly Budget</span>
              <span style={{ ...T.mono, fontSize: 13, fontWeight: 600, color: bc.text }}>{Math.round(budgetPct * 100)}% used</span>
            </div>
            <div style={{ height: 8, background: bc.track, borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min(budgetPct*100,100)}%`, background: bc.bar, borderRadius: 99, transition: "width 0.6s cubic-bezier(0.34,1.56,0.64,1)" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <span style={{ ...T.muted, fontSize: 12 }}>{fmt(monthlyTotal)} spent</span>
              <span style={{ ...T.muted, fontSize: 12 }}>of {fmt(totalBudget)}</span>
            </div>
            {budgetPct >= 0.75 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, padding: "8px 12px", background: bc.track, borderRadius: 12 }}>
                <AlertTriangle size={13} color={bc.text} />
                <span style={{ fontSize: 12, fontWeight: 600, color: bc.text }}>{budgetPct >= 0.95 ? "Budget exceeded!" : "Approaching your budget limit"}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══ HOME ══ */}
      {tab === "home" && (
        <div style={{ padding: "0 16px" }}>
          <button onClick={() => { setShowForm(!showForm); setError(""); }} style={{
            width: "100%", padding: "16px", borderRadius: 22, border: "none",
            background: showForm ? "#E2E8F0" : T.indigo, color: showForm ? "#475569" : "#FFFFFF",
            fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 14,
            boxShadow: showForm ? "none" : "0 6px 24px rgba(79,70,229,0.32)", transition: "all 0.22s"
          }}>
            <PlusCircle size={19} />
            {showForm ? "Cancel" : "Add Transaction"}
          </button>

          {showForm && (
            <CardWrap style={{ marginBottom: 14 }}>
              <p style={{ ...T.h2, margin: "0 0 20px" }}>New Transaction</p>
              <p style={{ ...T.label, margin: "0 0 8px" }}>Amount (THB)</p>
              <input type="number" inputMode="decimal" placeholder="0" value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                style={{ ...T.input, fontSize: 32, fontWeight: 800, ...T.mono, letterSpacing: "-1px", marginBottom: 16, padding: "14px 18px" }} />

              <div onClick={() => setForm({ ...form, split: !form.split, reimbursed: "" })}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderRadius: 18, background: form.split ? "#EEF2FF" : "#F8F7F4", border: `1.5px solid ${form.split ? "#C7D2FE" : "#E2E8F0"}`, marginBottom: 14, cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 12, background: form.split ? "#EEF2FF" : "#E2E8F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Scissors size={16} color={form.split ? T.indigo : "#94A3B8"} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0F172A" }}>Split Bill</p>
                    <p style={{ margin: 0, fontSize: 12, color: "#94A3B8" }}>Deduct reimbursed amount</p>
                  </div>
                </div>
                <div style={{ width: 46, height: 26, borderRadius: 99, background: form.split ? T.indigo : "#CBD5E1", position: "relative", transition: "background 0.22s", flexShrink: 0 }}>
                  <div style={{ position: "absolute", top: 3, left: form.split ? 23 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.22s", boxShadow: "0 1px 4px rgba(0,0,0,0.18)" }} />
                </div>
              </div>

              {form.split && (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ ...T.label, margin: "0 0 8px" }}>Reimbursed Amount</p>
                  <input type="number" inputMode="decimal" placeholder="0" value={form.reimbursed}
                    onChange={(e) => setForm({ ...form, reimbursed: e.target.value })}
                    style={{ ...T.input, ...T.mono, fontSize: 18, fontWeight: 600, marginBottom: 10 }} />
                  {form.amount && (
                    <div style={{ padding: "10px 16px", background: "#F0FDF4", borderRadius: 14, border: "1px solid #BBF7D0" }}>
                      <span style={{ fontSize: 13, color: "#15803D", ...T.mono, fontWeight: 600 }}>
                        {fmt(parseFloat(form.amount)||0)} − {fmt(parseFloat(form.reimbursed)||0)} = <strong>{fmt(netAmount())}</strong> net
                      </span>
                    </div>
                  )}
                </div>
              )}

              <p style={{ ...T.label, margin: "0 0 10px" }}>Category</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
                {CATEGORIES.map((cat) => {
                  const active = form.category === cat.value;
                  return (
                    <button key={cat.value} onClick={() => setForm({ ...form, category: cat.value })} style={{ padding: "12px 6px", borderRadius: 18, cursor: "pointer", fontFamily: "inherit", border: `2px solid ${active ? cat.bar : "transparent"}`, background: active ? cat.pastelBg : "#F8F7F4", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, transition: "all 0.15s" }}>
                      <span style={{ fontSize: 22 }}>{cat.icon}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: active ? cat.pastelText : "#94A3B8" }}>{cat.label.split(" ")[0]}</span>
                    </button>
                  );
                })}
              </div>

              <p style={{ ...T.label, margin: "0 0 8px" }}>Note + #tags</p>
              <input type="text" placeholder="e.g. lunch #grab #work" value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                style={{ ...T.input, marginBottom: extractTags(form.note).length ? 8 : 14 }} />
              {extractTags(form.note).length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                  {extractTags(form.note).map((tag) => <span key={tag} style={{ background: "#EEF2FF", color: T.indigo, fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 99 }}>{tag}</span>)}
                </div>
              )}

              <p style={{ ...T.label, margin: "0 0 8px" }}>Date</p>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                style={{ ...T.input, marginBottom: 18 }} />

              {error && <p style={{ color: "#EF4444", fontSize: 13, marginBottom: 12, fontWeight: 500 }}>{error}</p>}

              <button onClick={handleAdd} style={{ width: "100%", padding: "15px", borderRadius: 18, border: "none", background: T.indigo, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 18px rgba(79,70,229,0.28)" }}>
                Save {form.split ? `(${fmt(netAmount())} net)` : "Transaction"}
              </button>
            </CardWrap>
          )}

          <SectionLabel>{sorted.length === 0 ? "No transactions yet" : `Transactions · ${sorted.length}`}</SectionLabel>
          {sorted.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 20px" }}>
              <div style={{ width: 64, height: 64, borderRadius: 24, background: "#E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}><Wallet size={28} color="#94A3B8" /></div>
              <p style={{ ...T.muted, margin: 0, fontWeight: 500 }}>Tap "Add Transaction" to begin</p>
            </div>
          ) : sorted.map((tx) => {
            const cat = getCat(tx.category);
            const isDeleting = deletingId === tx.id;
            const tags = extractTags(tx.note);
            return (
              <div key={tx.id} style={{ ...T.card, padding: "16px 18px", marginBottom: 10, display: "flex", alignItems: "center", gap: 14, opacity: isDeleting ? 0 : 1, transform: isDeleting ? "translateX(50px)" : "none", transition: "all 0.28s" }}>
                <div style={{ width: 48, height: 48, borderRadius: 18, background: cat.pastelBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{cat.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{cat.label}</span>
                    {tx.split && <span style={{ fontSize: 10, fontWeight: 700, background: "#EEF2FF", color: T.indigo, padding: "2px 7px", borderRadius: 6 }}>split</span>}
                    {tx.recurringId && <span style={{ fontSize: 10, fontWeight: 700, background: "#FEFCE8", color: "#A16207", padding: "2px 7px", borderRadius: 6 }}>auto</span>}
                  </div>
                  <p style={{ ...T.muted, margin: "3px 0 0", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.note || "No note"} · {fmtDate(tx.date)}</p>
                  {tags.length > 0 && (
                    <div style={{ display: "flex", gap: 4, marginTop: 5, flexWrap: "wrap" }}>
                      {tags.map((tag) => <span key={tag} style={{ fontSize: 10, fontWeight: 700, background: "#EEF2FF", color: "#6366F1", padding: "2px 8px", borderRadius: 99 }}>{tag}</span>)}
                    </div>
                  )}
                </div>
                <span style={{ ...T.mono, fontSize: 15, fontWeight: 700, color: "#EF4444", flexShrink: 0 }}>−{fmt(tx.amount)}</span>
                <button onClick={() => handleDelete(tx.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, color: "#CBD5E1", flexShrink: 0 }}><Trash2 size={15} /></button>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ ANALYTICS ══ */}
      {tab === "analytics" && (
        <div style={{ padding: "0 16px" }}>
          <SectionLabel>Spending by Category</SectionLabel>
          {CATEGORIES.map((cat) => {
            const amt = catTotals[cat.value] || 0;
            const pct = monthlyTotal > 0 ? amt / monthlyTotal : 0;
            const catBudget = parseFloat(budgets.categories?.[cat.value]) || 0;
            const catPct = catBudget > 0 ? Math.min(amt / catBudget, 1) : pct;
            const cbc = catBudget > 0 ? budgetColor(catPct) : null;
            return (
              <div key={cat.value} style={{ ...T.card, padding: "18px 20px", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 14, background: cat.pastelBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{cat.icon}</div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#0F172A" }}>{cat.label}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ ...T.mono, fontSize: 15, fontWeight: 700, color: cbc ? cbc.text : "#0F172A" }}>{fmt(amt)}</span>
                    {catBudget > 0 && <span style={{ ...T.muted, fontSize: 11, display: "block" }}>/ {fmt(catBudget)}</span>}
                  </div>
                </div>
                <div style={{ height: 7, background: cbc ? cbc.track : "#F1F5F9", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min((cbc ? catPct : pct)*100,100)}%`, background: cbc ? cbc.bar : cat.bar, borderRadius: 99, transition: "width 0.5s" }} />
                </div>
                {catBudget > 0 && catPct >= 0.75 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8 }}>
                    <AlertTriangle size={12} color={cbc.text} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: cbc.text }}>{catPct >= 0.95 ? "Over limit!" : "Near limit"}</span>
                  </div>
                )}
              </div>
            );
          })}
          {topTags.length > 0 && (
            <>
              <SectionLabel style={{ marginTop: 8 }}>Top Tags This Month</SectionLabel>
              {topTags.map(([tag, amt]) => (
                <div key={tag} style={{ ...T.card, padding: "14px 18px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: T.indigo, minWidth: 90 }}>{tag}</span>
                  <div style={{ flex: 1, height: 6, background: "#EEF2FF", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(amt / maxTagAmt)*100}%`, background: T.indigo, borderRadius: 99 }} />
                  </div>
                  <span style={{ ...T.mono, fontSize: 13, fontWeight: 700, color: "#0F172A", minWidth: 72, textAlign: "right" }}>{fmt(amt)}</span>
                </div>
              ))}
            </>
          )}
          {monthTxns.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 20px" }}>
              <div style={{ width: 64, height: 64, borderRadius: 24, background: "#E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}><BarChart2 size={28} color="#94A3B8" /></div>
              <p style={{ ...T.muted, margin: 0, fontWeight: 500 }}>Add transactions to see analytics</p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════ STATEMENT TAB ═════════════════════ */}
      {tab === "statement" && (() => {

        // ── Full-screen month detail ───────────────────────────────────────
        if (openMonth) {
          const mData = yearMonthData.find((m) => m.key === openMonth);
          const mIdx  = mData ? mData.monthIdx : 0;
          const mName = mData ? `${MONTH_NAMES[mIdx]} ${stmtYear}` : "";
          const mTxns = mData ? [...mData.txns].sort((a, b) => new Date(b.date) - new Date(a.date)) : [];
          const mTotal = mData ? mData.total : 0;
          const mCatTotals = {};
          mTxns.forEach((t) => { mCatTotals[t.category] = (mCatTotals[t.category] || 0) + t.amount; });
          const mCatSorted = Object.entries(mCatTotals).sort((a, b) => b[1] - a[1]);

          // Category filter — stored in openMonth-scoped state via key trick
          // We use a simple module-level variable workaround since this is inside render
          const [stmtCat, setStmtCat] = useState(null);
          const visibleTxns = stmtCat ? mTxns.filter((t) => t.category === stmtCat) : mTxns;
          const activeCat = stmtCat ? getCat(stmtCat) : null;

          // prev / next month navigation (skip empty months too so user can see all)
          const allKeys = yearMonthData.map((m) => m.key);
          const curKeyIdx = allKeys.indexOf(openMonth);
          const prevKey = curKeyIdx > 0 ? allKeys[curKeyIdx - 1] : null;
          const nextKey = curKeyIdx < allKeys.length - 1 ? allKeys[curKeyIdx + 1] : null;

          return (
            <div style={{ position: "fixed", inset: 0, zIndex: 150, background: "#F8F7F4", overflowY: "auto", fontFamily: "'DM Sans', sans-serif" }}>
              {/* Sticky top nav */}
              <div style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(248,247,244,0.94)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(226,232,240,0.6)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 10 }}>
                <button onClick={() => { setOpenMonth(null); setStmtCat(null); }} style={{ display: "flex", alignItems: "center", gap: 6, background: "#FFFFFF", border: "none", cursor: "pointer", padding: "9px 16px", borderRadius: 99, fontFamily: "inherit", fontSize: 13, fontWeight: 700, color: "#334155", boxShadow: "0 2px 8px rgba(15,23,42,0.08)", flexShrink: 0 }}>
                  <ArrowLeft size={15} /> {stmtYear}
                </button>
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                  <button onClick={() => { setStmtCat(null); setOpenMonth(prevKey); }} disabled={!prevKey} style={{ width: 34, height: 34, borderRadius: 99, border: "none", display: "flex", alignItems: "center", justifyContent: "center", background: prevKey ? "#FFFFFF" : "#F1F5F9", color: prevKey ? "#334155" : "#CBD5E1", cursor: prevKey ? "pointer" : "default", boxShadow: prevKey ? "0 2px 8px rgba(15,23,42,0.08)" : "none" }}>
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ fontSize: 15, fontWeight: 800, color: "#0F172A", minWidth: 110, textAlign: "center" }}>{mName}</span>
                  <button onClick={() => { setStmtCat(null); setOpenMonth(nextKey); }} disabled={!nextKey} style={{ width: 34, height: 34, borderRadius: 99, border: "none", display: "flex", alignItems: "center", justifyContent: "center", background: nextKey ? "#FFFFFF" : "#F1F5F9", color: nextKey ? "#334155" : "#CBD5E1", cursor: nextKey ? "pointer" : "default", boxShadow: nextKey ? "0 2px 8px rgba(15,23,42,0.08)" : "none" }}>
                    <ChevronRight size={16} />
                  </button>
                </div>
                <div style={{ width: 80, flexShrink: 0 }} />
              </div>

              <div style={{ maxWidth: 430, margin: "0 auto", padding: "0 16px 100px" }}>
                {/* Hero total */}
                <div style={{ padding: "28px 4px 16px" }}>
                  <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Total Spent</p>
                  <p style={{ margin: 0, fontSize: 44, fontWeight: 800, letterSpacing: "-2px", color: "#0F172A", lineHeight: 1 }}>{fmt(mTotal)}</p>
                  <p style={{ margin: "8px 0 0", fontSize: 13, color: "#94A3B8", fontWeight: 500 }}>{mTxns.length} transaction{mTxns.length !== 1 ? "s" : ""} in {mName}</p>
                </div>

                {mTxns.length === 0 ? (
                  <div style={{ ...T.card, padding: "48px 24px", textAlign: "center", marginTop: 8 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 20, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                      <Wallet size={24} color="#94A3B8" />
                    </div>
                    <p style={{ ...T.muted, margin: 0, fontWeight: 500 }}>No transactions in {mName}</p>
                  </div>
                ) : (
                  <>
                    {/* ── Category cards — tappable ── */}
                    <p style={{ ...T.label, margin: "0 0 10px", paddingLeft: 4 }}>Categories</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                      {mCatSorted.map(([catVal, amt]) => {
                        const cat = getCat(catVal);
                        const pct = mTotal > 0 ? amt / mTotal : 0;
                        const isActive = stmtCat === catVal;
                        const catCount = mTxns.filter((t) => t.category === catVal).length;
                        return (
                          <button key={catVal} onClick={() => setStmtCat(isActive ? null : catVal)} style={{
                            width: "100%", border: "none", fontFamily: "inherit", cursor: "pointer", textAlign: "left",
                            padding: "16px 20px", borderRadius: 22,
                            background: isActive ? cat.pastelBg : "#FFFFFF",
                            outline: isActive ? `2.5px solid ${cat.bar}` : "2.5px solid transparent",
                            boxShadow: isActive ? `0 6px 24px ${cat.bar}30` : "0 2px 12px rgba(15,23,42,0.06)",
                            transition: "all 0.18s",
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                              <div style={{ width: 44, height: 44, borderRadius: 16, flexShrink: 0, background: isActive ? "#FFFFFF" : cat.pastelBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, boxShadow: isActive ? `0 2px 8px ${cat.bar}40` : "none", transition: "all 0.18s" }}>{cat.icon}</div>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                                  <span style={{ fontSize: 15, fontWeight: 800, color: isActive ? cat.pastelText : "#0F172A" }}>{cat.label}</span>
                                  <span style={{ ...T.mono, fontSize: 16, fontWeight: 800, color: isActive ? cat.pastelText : "#0F172A" }}>{fmt(amt)}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                                  <span style={{ fontSize: 11, color: isActive ? cat.pastelText : "#94A3B8", fontWeight: 500, opacity: isActive ? 0.75 : 1 }}>{catCount} transaction{catCount !== 1 ? "s" : ""}</span>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: isActive ? cat.pastelText : "#94A3B8" }}>{(pct * 100).toFixed(0)}%</span>
                                </div>
                              </div>
                            </div>
                            <div style={{ height: 6, background: isActive ? `${cat.bar}30` : "#F1F5F9", borderRadius: 99, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${pct * 100}%`, background: cat.bar, borderRadius: 99, transition: "width 0.45s cubic-bezier(0.34,1.56,0.64,1)" }} />
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* ── Transaction list header ── */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, paddingLeft: 4 }}>
                      <p style={{ ...T.label, margin: 0 }}>
                        {stmtCat ? `${activeCat.icon} ${activeCat.label}` : "All Transactions"} · {visibleTxns.length}
                      </p>
                      {stmtCat && (
                        <button onClick={() => setStmtCat(null)} style={{ display: "flex", alignItems: "center", gap: 5, background: "#F1F5F9", border: "none", cursor: "pointer", padding: "5px 12px", borderRadius: 99, fontFamily: "inherit", fontSize: 11, fontWeight: 700, color: "#64748B" }}>
                          <X size={11} /> Show all
                        </button>
                      )}
                    </div>

                    {/* Category total banner when filtered */}
                    {stmtCat && (
                      <div style={{ padding: "14px 20px", borderRadius: 18, marginBottom: 12, background: activeCat.pastelBg, border: `1.5px solid ${activeCat.bar}40` }}>
                        <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 600, color: activeCat.pastelText, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.7 }}>Spent on {activeCat.label}</p>
                        <p style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: "-1px", color: activeCat.pastelText, fontFamily: "'DM Mono', monospace" }}>{fmt(mCatTotals[stmtCat])}</p>
                      </div>
                    )}

                    {/* ── Transactions ── */}
                    {visibleTxns.map((tx) => {
                      const cat = getCat(tx.category);
                      const tags = extractTags(tx.note);
                      const isDeleting = deletingId === tx.id;
                      return (
                        <div key={tx.id} style={{ ...T.card, padding: "14px 18px", marginBottom: 9, display: "flex", alignItems: "center", gap: 13, opacity: isDeleting ? 0 : 1, transform: isDeleting ? "translateX(50px)" : "none", transition: "all 0.28s" }}>
                          <div style={{ width: 42, height: 42, borderRadius: 15, background: cat.pastelBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, flexShrink: 0 }}>{cat.icon}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{cat.label}</span>
                              {tx.split && <span style={{ fontSize: 10, fontWeight: 700, background: "#EEF2FF", color: T.indigo, padding: "1px 6px", borderRadius: 5 }}>split</span>}
                              {tx.recurringId && <span style={{ fontSize: 10, fontWeight: 700, background: "#FEFCE8", color: "#A16207", padding: "1px 6px", borderRadius: 5 }}>auto</span>}
                            </div>
                            <p style={{ ...T.muted, margin: "2px 0 0", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.note || "No note"} · {fmtDate(tx.date)}</p>
                            {tags.length > 0 && (
                              <div style={{ display: "flex", gap: 3, marginTop: 4, flexWrap: "wrap" }}>
                                {tags.map((tag) => <span key={tag} style={{ fontSize: 10, fontWeight: 700, background: "#EEF2FF", color: "#6366F1", padding: "1px 7px", borderRadius: 99 }}>{tag}</span>)}
                              </div>
                            )}
                          </div>
                          <span style={{ ...T.mono, fontSize: 14, fontWeight: 700, color: "#EF4444", flexShrink: 0 }}>−{fmt(tx.amount)}</span>
                          <button onClick={() => handleDelete(tx.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 5, color: "#CBD5E1", flexShrink: 0 }}><Trash2 size={14} /></button>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          );
        }

        // ── Month overview grid ────────────────────────────────────────────
        return (
          <div style={{ padding: "0 16px" }}>
            {/* Year selector */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <SectionLabel style={{ margin: 0 }}>Year</SectionLabel>
              <div style={{ display: "flex", gap: 6 }}>
                {availableYears.map((y) => (
                  <button key={y} onClick={() => { setStmtYear(parseInt(y)); setOpenMonth(null); }} style={{
                    padding: "6px 14px", borderRadius: 99, border: "none", cursor: "pointer", fontFamily: "inherit",
                    fontSize: 13, fontWeight: 700,
                    background: stmtYear === parseInt(y) ? T.indigo : "#FFFFFF",
                    color: stmtYear === parseInt(y) ? "#FFFFFF" : "#64748B",
                    boxShadow: stmtYear === parseInt(y) ? "0 2px 10px rgba(79,70,229,0.3)" : "0 1px 4px rgba(15,23,42,0.06)"
                  }}>{y}</button>
                ))}
              </div>
            </div>

            {/* Yearly total card with sparkline */}
            <div style={{ ...T.card, padding: "22px 24px", marginBottom: 14 }}>
              <p style={{ ...T.label, margin: "0 0 6px" }}>{stmtYear} total</p>
              <p style={{ ...T.h1, fontSize: 34, marginBottom: 18 }}>{fmt(yearTotal)}</p>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 72 }}>
                {yearMonthData.map(({ name, key, total }) => {
                  const heightPct = maxMonthAmt > 0 ? total / maxMonthAmt : 0;
                  const isNow = key === currentMonth();
                  return (
                    <div key={key} onClick={() => total > 0 && setOpenMonth(key)}
                      style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: total > 0 ? "pointer" : "default" }}>
                      <div style={{ width: "100%", height: 56, display: "flex", alignItems: "flex-end" }}>
                        <div style={{ width: "100%", height: `${Math.max(heightPct * 100, total > 0 ? 8 : 3)}%`, minHeight: total > 0 ? 6 : 2, borderRadius: "6px 6px 3px 3px", background: isNow ? "#818CF8" : total > 0 ? "#C7D2FE" : "#F1F5F9", transition: "all 0.3s" }} />
                      </div>
                      <span style={{ fontSize: 9, fontWeight: isNow ? 800 : 500, color: isNow ? "#4F46E5" : "#94A3B8", textAlign: "center" }}>{name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Month grid */}
            <SectionLabel>All Months</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
              {yearMonthData.map(({ name, key, txns, total, monthIdx }) => {
                const isNow   = key === currentMonth();
                const hasData = txns.length > 0;
                const catKeys = [...new Set(txns.map((t) => t.category))];
                return (
                  <button key={key}
                    onClick={() => { setActiveDetailMonth({ key, year: stmtYear, monthIdx, name }); setDetailCat(null); }}
                    style={{
                      width: "100%", ...T.card, padding: "18px 18px", border: "none",
                      cursor: "pointer", textAlign: "left",
                      fontFamily: "inherit", transition: "transform 0.15s, box-shadow 0.15s",
                      outline: isNow ? `2px solid ${T.indigo}` : "none",
                    }}
                    onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.96)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(15,23,42,0.06)"; }}
                    onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = ""; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = ""; }}
                    onTouchStart={(e) => { e.currentTarget.style.transform = "scale(0.96)"; }}
                    onTouchEnd={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                      <div>
                        <span style={{ fontSize: 16, fontWeight: 800, color: isNow ? T.indigo : "#0F172A" }}>{name}</span>
                        {isNow && <span style={{ fontSize: 9, fontWeight: 700, background: T.indigoLight, color: T.indigo, padding: "2px 7px", borderRadius: 99, marginLeft: 6 }}>NOW</span>}
                      </div>
                      <ChevronRight size={14} color={hasData ? "#94A3B8" : "#CBD5E1"} />
                    </div>
                    <p style={{ ...T.mono, fontSize: 16, fontWeight: 800, color: hasData ? "#0F172A" : "#CBD5E1", margin: "0 0 8px" }}>{fmt(total)}</p>
                    {hasData ? (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", gap: 3 }}>
                          {catKeys.slice(0, 4).map((cv) => (
                            <span key={cv} style={{ fontSize: 14 }}>{getCat(cv).icon}</span>
                          ))}
                        </div>
                        <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 500 }}>{txns.length} tx</span>
                      </div>
                    ) : (
                      <p style={{ fontSize: 11, color: "#CBD5E1", margin: 0, fontWeight: 500 }}>No expenses yet</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ══ SETTINGS ══ */}
      {tab === "settings" && (
        <div style={{ padding: "0 16px" }}>
          <CardWrap>
            <p style={{ ...T.h2, margin: "0 0 18px" }}>💰 Budget Limits</p>
            <p style={{ ...T.label, margin: "0 0 8px" }}>Monthly total (THB)</p>
            <input type="number" placeholder="e.g. 30,000" value={budgets.total}
              onChange={(e) => setBudgets({ ...budgets, total: e.target.value })}
              style={{ ...T.input, ...T.mono, fontSize: 18, fontWeight: 600, marginBottom: 18 }} />
            <p style={{ ...T.label, margin: "0 0 12px" }}>Per-category limits</p>
            {CATEGORIES.map((cat) => (
              <div key={cat.value} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 13, background: cat.pastelBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{cat.icon}</div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#334155", minWidth: 76 }}>{cat.label.split(" ")[0]}</span>
                <input type="number" placeholder="No limit" value={budgets.categories?.[cat.value] || ""}
                  onChange={(e) => setBudgets({ ...budgets, categories: { ...budgets.categories, [cat.value]: e.target.value } })}
                  style={{ ...T.input, flex: 1, ...T.mono, fontSize: 14, padding: "10px 14px" }} />
              </div>
            ))}
          </CardWrap>

          <CardWrap>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <p style={{ ...T.h2, margin: 0 }}>🔄 Subscriptions</p>
              <button onClick={() => setShowSubForm(!showSubForm)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 16px", borderRadius: 99, border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 13, background: showSubForm ? "#F1F5F9" : T.indigoLight, color: showSubForm ? "#64748B" : T.indigo }}>
                {showSubForm ? <><X size={13} /> Cancel</> : <><Plus size={13} /> Add</>}
              </button>
            </div>
            {showSubForm && (
              <div style={{ padding: "18px", background: "#F8F7F4", borderRadius: 20, marginBottom: 16 }}>
                <input placeholder="Name (e.g. Netflix)" value={subForm.name} onChange={(e) => setSubForm({ ...subForm, name: e.target.value })} style={{ ...T.input, marginBottom: 10 }} />
                <input type="number" placeholder="Amount (THB)" value={subForm.amount} onChange={(e) => setSubForm({ ...subForm, amount: e.target.value })} style={{ ...T.input, ...T.mono, fontSize: 16, fontWeight: 600, marginBottom: 10 }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                  <div>
                    <p style={{ ...T.label, margin: "0 0 6px" }}>Category</p>
                    <select value={subForm.category} onChange={(e) => setSubForm({ ...subForm, category: e.target.value })} style={{ ...T.input, padding: "10px 12px" }}>
                      {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.icon} {c.value}</option>)}
                    </select>
                  </div>
                  <div>
                    <p style={{ ...T.label, margin: "0 0 6px" }}>Billing day</p>
                    <input type="number" min="1" max="31" placeholder="1–31" value={subForm.day} onChange={(e) => setSubForm({ ...subForm, day: e.target.value })} style={{ ...T.input, ...T.mono, padding: "10px 12px" }} />
                  </div>
                </div>
                <button onClick={handleAddSub} style={{ width: "100%", padding: "13px", borderRadius: 16, border: "none", background: T.indigo, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 14px rgba(79,70,229,0.24)" }}>Save Subscription</button>
              </div>
            )}
            {subscriptions.length === 0 && !showSubForm && <p style={{ ...T.muted, textAlign: "center", margin: "8px 0", fontWeight: 500, fontSize: 13 }}>No subscriptions added yet</p>}
            {subscriptions.map((sub, i) => {
              const cat = getCat(sub.category);
              return (
                <div key={sub.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 0", borderTop: i === 0 ? "none" : "1px solid #F1F5F9" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 14, background: cat.pastelBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{cat.icon}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{sub.name}</p>
                    <p style={{ ...T.muted, margin: 0, fontSize: 12 }}>Day {sub.day} each month</p>
                  </div>
                  <span style={{ ...T.mono, fontSize: 14, fontWeight: 700, color: "#EF4444" }}>{fmt(sub.amount)}</span>
                  <button onClick={() => setSubscriptions((p) => p.filter((s) => s.id !== sub.id))} style={{ background: "none", border: "none", cursor: "pointer", color: "#CBD5E1", padding: 6 }}><Trash2 size={15} /></button>
                </div>
              );
            })}
          </CardWrap>
        </div>
      )}

      {/* ══ BOTTOM NAV ══ */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, zIndex: 100, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(226,232,240,0.7)", display: "flex", padding: "0 4px" }}>
        {[
          { id: "home",      label: "Home",      Icon: Home },
          { id: "analytics", label: "Analytics", Icon: BarChart2 },
          { id: "statement", label: "Statement", Icon: BookOpen },
          { id: "settings",  label: "Settings",  Icon: Settings },
        ].map(({ id, label, Icon }) => {
          const active = tab === id;
          return (
            <button key={id} onClick={() => { setTab(id); setShowForm(false); }} style={{ flex: 1, padding: "11px 4px 16px", border: "none", background: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: active ? T.indigo : "#94A3B8", fontFamily: "inherit", transition: "color 0.18s" }}>
              <div style={{ width: 34, height: 34, borderRadius: 12, background: active ? T.indigoLight : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.18s" }}>
                <Icon size={18} />
              </div>
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, letterSpacing: "0.02em" }}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}