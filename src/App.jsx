import { useState, useEffect } from "react";
import MonthHeader from "./MonthHeader";
import ListEditor from "./ListEditor";
import { PlusCircle, Wallet, Trash2, Settings, BarChart2, Home, X, Plus, AlertTriangle, Scissors, BookOpen, ChevronDown, Sparkles, ArrowLeft, ChevronLeft, ChevronRight, TrendingUp, Globe } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie } from "recharts";

// ─── Translations ─────────────────────────────────────────────────────────────
const TRANSLATIONS = {
  EN: {
    totalSpent: "Total spent",
    yearInReview: (y) => `${y} in Review`,
    yearInReviewTitle: (y) => `Your ${y} in Review`,
    allMonths: "ALL MONTHS",
    noData: "No data",
    addTransaction: "Add Transaction",
    cancel: "Cancel",
    newTransaction: "New Transaction",
    amount: "Amount (THB)",
    splitBill: "Split Bill",
    splitDesc: "Deduct reimbursed amount",
    reimbursed: "Reimbursed Amount",
    category: "Category",
    noteAndTags: "Note + #tags",
    date: "Date",
    save: "Save",
    saveNet: (amt) => `Save (${amt} net)`,
    noTxYet: "No transactions yet",
    transactions: "Transactions",
    tapToBegin: 'Tap "Add Transaction" to begin',
    spendingByCategory: "Spending by Category",
    topTagsThisMonth: "Top Tags This Month",
    addTxToSeeAnalytics: "Add transactions to see analytics",
    year: "Year",
    statement: "Statement",
    total: "Total",
    allTransactions: "All Transactions",
    showAll: "Show all",
    noTransactionsIn: (m) => `No transactions recorded in ${m}`,
    transactionsIn: (n, m) => `${n} transaction${n !== 1 ? "s" : ""} in ${m}`,
    categories: "Categories",
    spentOn: (cat) => `Spent on ${cat}`,
    tapAMonthToExplore: "Tap a Month to Explore",
    monthByMonth: "Month-by-Month",
    tapBarToDrill: "Tap a bar to drill into that month",
    biggestExpenseOf: (y) => `Biggest Expense of ${y}`,
    totalSpentThisYear: "Total Spent This Year",
    monthlyAvg: "Monthly Avg",
    noTxFor: (y) => `No transactions recorded for ${y}`,
    spendingByCategory2: "Spending by Category",
    noDataFor: (y) => `No category data for ${y}`,
    lightest: "Lightest ↗",
    heaviest: "Heaviest ↗",
    monthlySpendingTrend: "Monthly Spending Trend",
    noDataYear: (y) => `No data for ${y}`,
    budgetLimits: "💰 Budget Limits",
    monthlyTotal: "Monthly total (THB)",
    perCategoryLimits: "Per-category limits",
    subscriptions: "🔄 Subscriptions",
    add: "Add",
    noSubsYet: "No subscriptions added yet",
    saveSubscription: "Save Subscription",
    billingDay: "Billing day",
    dayEachMonth: (d) => `Day ${d} each month`,
    nowBadge: "NOW",
    peakBadge: "PEAK",
    tapToView: "tap to view ›",
    autoAdded: (n) => `Auto-added ${n} subscription${n > 1 ? "s" : ""} 🔄`,
    yearTotalLabel: (y) => `${y} total`,
    enterValidAmt: "Enter a valid amount.",
    overLimit: "Over limit!",
    nearLimit: "Near limit",
    budgetExceeded: "Budget exceeded!",
    approachingLimit: "Approaching your budget limit",
    monthlyBudget: "Monthly Budget",
    used: (pct) => `${pct}% used`,
    spent: (amt) => `${amt} spent`,
    of: (amt) => `of ${amt}`,
    top: "Top:",
    yearInReviewBtn: (y) => `${y} in Review`,
    dashboard: "Dashboard",
    home: "Home",
    analytics: "Analytics",
    settings: "Settings",
    noNote: "No note",
    split: "split",
    auto: "auto",
    catFood: "Food & Drink",
    catTransport: "Transport",
    catShopping: "Shopping",
    catBills: "Bills",
    catOther: "Other",
    txCount: (n) => `${n} transaction${n !== 1 ? "s" : ""}`,
    yearInReviewLabel: "Year in Review",
  },
  TH: {
    totalSpent: "ยอดใช้จ่ายทั้งหมด",
    yearInReview: (y) => `สรุปปี ${y}`,
    yearInReviewTitle: (y) => `สรุปปี ${y} ของคุณ`,
    allMonths: "เดือนทั้งหมด",
    noData: "ไม่มีข้อมูล",
    addTransaction: "เพิ่มรายการ",
    cancel: "ยกเลิก",
    newTransaction: "รายการใหม่",
    amount: "จำนวน (บาท)",
    splitBill: "แบ่งบิล",
    splitDesc: "หักจำนวนที่ได้รับคืน",
    reimbursed: "จำนวนที่ได้รับคืน",
    category: "หมวดหมู่",
    noteAndTags: "โน้ต + #แท็ก",
    date: "วันที่",
    save: "บันทึก",
    saveNet: (amt) => `บันทึก (สุทธิ ${amt})`,
    noTxYet: "ยังไม่มีรายการ",
    transactions: "รายการ",
    tapToBegin: 'กด "เพิ่มรายการ" เพื่อเริ่มต้น',
    spendingByCategory: "ค่าใช้จ่ายตามหมวดหมู่",
    topTagsThisMonth: "แท็กยอดนิยมเดือนนี้",
    addTxToSeeAnalytics: "เพิ่มรายการเพื่อดูการวิเคราะห์",
    year: "ปี",
    statement: "รายการ",
    total: "รวม",
    allTransactions: "รายการทั้งหมด",
    showAll: "แสดงทั้งหมด",
    noTransactionsIn: (m) => `ไม่มีรายการใน ${m}`,
    transactionsIn: (n, m) => `${n} รายการ ใน ${m}`,
    categories: "หมวดหมู่",
    spentOn: (cat) => `ใช้จ่ายใน ${cat}`,
    tapAMonthToExplore: "แตะเดือนเพื่อดูรายละเอียด",
    monthByMonth: "รายเดือน",
    tapBarToDrill: "แตะแถบเพื่อดูรายละเอียดเดือนนั้น",
    biggestExpenseOf: (y) => `รายจ่ายสูงสุดของปี ${y}`,
    totalSpentThisYear: "ยอดใช้จ่ายรวมปีนี้",
    monthlyAvg: "เฉลี่ย/เดือน",
    noTxFor: (y) => `ไม่มีรายการในปี ${y}`,
    spendingByCategory2: "ค่าใช้จ่ายตามหมวดหมู่",
    noDataFor: (y) => `ไม่มีข้อมูลหมวดหมู่ในปี ${y}`,
    lightest: "เบาสุด ↗",
    heaviest: "หนักสุด ↗",
    monthlySpendingTrend: "แนวโน้มรายเดือน",
    noDataYear: (y) => `ไม่มีข้อมูลปี ${y}`,
    budgetLimits: "💰 งบประมาณ",
    monthlyTotal: "รวมรายเดือน (บาท)",
    perCategoryLimits: "งบแต่ละหมวด",
    subscriptions: "🔄 การสมัครสมาชิก",
    add: "เพิ่ม",
    noSubsYet: "ยังไม่มีการสมัครสมาชิก",
    saveSubscription: "บันทึกการสมัคร",
    billingDay: "วันที่เรียกเก็บ",
    dayEachMonth: (d) => `วันที่ ${d} ของทุกเดือน`,
    nowBadge: "ตอนนี้",
    peakBadge: "สูงสุด",
    tapToView: "แตะเพื่อดู ›",
    autoAdded: (n) => `เพิ่มอัตโนมัติ ${n} รายการ 🔄`,
    yearTotalLabel: (y) => `รวมปี ${y}`,
    enterValidAmt: "กรุณาใส่จำนวนที่ถูกต้อง",
    overLimit: "เกินงบ!",
    nearLimit: "ใกล้ถึงงบแล้ว",
    budgetExceeded: "เกินงบแล้ว!",
    approachingLimit: "ใกล้ถึงขีดจำกัดงบ",
    monthlyBudget: "งบประมาณรายเดือน",
    used: (pct) => `ใช้ไป ${pct}%`,
    spent: (amt) => `ใช้ ${amt}`,
    of: (amt) => `จาก ${amt}`,
    top: "มากสุด:",
    yearInReviewBtn: (y) => `สรุปปี ${y}`,
    dashboard: "แดชบอร์ด",
    home: "หน้าหลัก",
    analytics: "วิเคราะห์",
    settings: "ตั้งค่า",
    noNote: "ไม่มีโน้ต",
    split: "แบ่ง",
    auto: "อัตโนมัติ",
    catFood: "อาหาร",
    catTransport: "เดินทาง",
    catShopping: "ช้อปปิ้ง",
    catBills: "บิล/ค่าใช้จ่าย",
    catOther: "อื่นๆ",
    txCount: (n) => `${n} รายการ`,
    yearInReviewLabel: "สรุปประจำปี",
  },
};

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES_BASE = [
  { value: "Food",      icon: "🍜", pastelBg: "#FFF8F0", pastelText: "#C2410C", bar: "#FB923C" },
  { value: "Transport", icon: "🚇", pastelBg: "#EFF6FF", pastelText: "#1D4ED8", bar: "#60A5FA" },
  { value: "Shopping",  icon: "🛍️", pastelBg: "#F5F3FF", pastelText: "#6D28D9", bar: "#A78BFA" },
  { value: "Bills",     icon: "⚡", pastelBg: "#FEFCE8", pastelText: "#A16207", bar: "#FACC15" },
  { value: "Other",     icon: "📦", pastelBg: "#F8FAFC", pastelText: "#475569", bar: "#94A3B8" },
];

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_NAMES_TH = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];

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
  pageBg:      "#F8F7F4",
  fontFamily:  "'IBM Plex Sans Thai', 'Kanit', -apple-system, sans-serif",
  card:        { background: "#FFFFFF", borderRadius: 28, boxShadow: "0 8px 40px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)" },
  h1:          { fontSize: 48, fontWeight: 600, letterSpacing: "-2px", color: "#0F172A", lineHeight: 1 },
  h2:          { fontSize: 17, fontWeight: 600, color: "#0F172A" },
  label:       { fontSize: 12, fontWeight: 500, color: "#64748B", letterSpacing: "0.06em", textTransform: "uppercase" },
  muted:       { fontSize: 13, color: "#94A3B8", lineHeight: 1.6 },
  mono:        { fontFamily: "'DM Mono', 'IBM Plex Mono', monospace" },
  indigo:      "#4F46E5",
  indigoLight: "#EEF2FF",
  input:       { width: "100%", padding: "13px 16px", borderRadius: 16, border: "1.5px solid #E2E8F0", fontSize: 14, fontWeight: 400, color: "#0F172A", background: "#FFFFFF", outline: "none", boxSizing: "border-box", lineHeight: 1.6 },
};

export default function FinanceTracker() {
  const [language, setLanguage] = useState(() => lsGet("ft_lang", "EN"));
  const t = TRANSLATIONS[language];

  const [transactions,  setTransactions]  = useState(() => lsGet("ft_txns",    []));
  const [subscriptions, setSubscriptions] = useState(() => lsGet("ft_subs",    []));
  const [budgets,       setBudgets]       = useState(() => lsGet("ft_budgets", { total: "", categories: {} }));

  const [tab,           setTab]           = useState("home");
  const [showForm,      setShowForm]      = useState(false);
  const [showSubForm,   setShowSubForm]   = useState(false);
  const [deletingId,    setDeletingId]    = useState(null);
  const [toast,         setToast]         = useState(null);
  const [error,         setError]         = useState("");

  const [stmtYear,      setStmtYear]      = useState(new Date().getFullYear());
  // Centralized selected month key for all sections
  const [selectedMonthKey, setSelectedMonthKey] = useState(currentMonth());
  // For Statement modal
  const [openMonth,     setOpenMonth]     = useState(null);

  const [showYearlySummary, setShowYearlySummary] = useState(false);
  const [yearlyYear,        setYearlyYear]         = useState(new Date().getFullYear());

  // Localised category labels
  const getCatLabel = (value) => {
    const map = { Food: t.catFood, Transport: t.catTransport, Shopping: t.catShopping, Bills: t.catBills, Other: t.catOther };
    return map[value] || value;
  };
  const CATEGORIES = CATEGORIES_BASE.map((c) => ({ ...c, label: getCatLabel(c.value) }));
  const getCat = (val) => CATEGORIES.find((c) => c.value === val) || CATEGORIES[4];

  const monthNames = language === "TH" ? MONTH_NAMES_TH : MONTH_NAMES;

  const blankForm = { amount: "", reimbursed: "", split: false, category: "Food", note: "", date: todayStr() };
  const [form,    setForm]    = useState(blankForm);
  const blankSub  = { name: "", amount: "", category: "Bills", day: "1" };
  const [subForm, setSubForm] = useState(blankSub);

  useEffect(() => lsSet("ft_txns",    transactions),  [transactions]);
  useEffect(() => lsSet("ft_subs",    subscriptions), [subscriptions]);
  useEffect(() => lsSet("ft_budgets", budgets),       [budgets]);
  useEffect(() => lsSet("ft_lang",    language),      [language]);

  useEffect(() => {
    if (!subscriptions.length) return;
    const day = todayDay(), month = currentMonth(), injected = [];
    subscriptions.forEach((sub) => {
      if (parseInt(sub.day) !== day) return;
      const already = transactions.some((t) => t.recurringId === sub.id && t.date.startsWith(month));
      if (!already) injected.push({ id: Date.now() + Math.random(), amount: parseFloat(sub.amount), category: sub.category, note: sub.name + " (auto)", date: todayStr(), recurringId: sub.id });
    });
    if (injected.length) { setTransactions((p) => [...injected, ...p]); showToast(t.autoAdded(injected.length)); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  // Use selectedMonthKey for filtering
  const month        = selectedMonthKey;
  const monthTxns    = transactions.filter((tx) => tx.date.startsWith(month));
  const monthlyTotal = monthTxns.reduce((s, tx) => s + tx.amount, 0);
  const totalBudget  = parseFloat(budgets.total) || 0;
  const budgetPct    = totalBudget > 0 ? Math.min(monthlyTotal / totalBudget, 1) : 0;
  const bc           = budgetColor(budgetPct);
  const catTotals    = {};
  monthTxns.forEach((tx) => { catTotals[tx.category] = (catTotals[tx.category] || 0) + tx.amount; });
  const topCat   = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
  const tagTotals = {};
  monthTxns.forEach((tx) => { extractTags(tx.note).forEach((tag) => { tagTotals[tag] = (tagTotals[tag] || 0) + tx.amount; }); });
  const topTags   = Object.entries(tagTotals).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxTagAmt = topTags[0]?.[1] || 1;

  const yearMonthData = monthNames.map((name, i) => {
    const key  = monthKey(stmtYear, i);
    const txns = transactions.filter((tx) => tx.date.startsWith(key));
    const total= txns.reduce((s, tx) => s + tx.amount, 0);
    return { name, key, txns, total, monthIdx: i };
  });
  const yearTotal   = yearMonthData.reduce((s, m) => s + m.total, 0);
  const maxMonthAmt = Math.max(...yearMonthData.map((m) => m.total), 1);
  const availableYears = [...new Set(transactions.map((tx) => tx.date.slice(0, 4)))].sort((a, b) => b - a);
  if (!availableYears.includes(String(stmtYear))) availableYears.push(String(stmtYear));
  availableYears.sort((a, b) => b - a);

  const netAmount = () => { const a = parseFloat(form.amount)||0, r = parseFloat(form.reimbursed)||0; return form.split ? Math.max(a-r,0) : a; };

  const handleAdd = () => {
    const net = netAmount();
    if (!form.amount || net <= 0) { setError(t.enterValidAmt); return; }
    setTransactions((p) => [{ id: Date.now(), amount: net, category: form.category, note: form.note.trim(), date: form.date, tags: extractTags(form.note), split: form.split, originalAmount: parseFloat(form.amount), reimbursed: form.split ? parseFloat(form.reimbursed)||0 : 0 }, ...p]);
    setForm(blankForm); setShowForm(false); setError("");
  };

  const handleDelete = (id) => {
    setDeletingId(id);
    setTimeout(() => { setTransactions((p) => p.filter((tx) => tx.id !== id)); setDeletingId(null); }, 300);
  };

  const handleAddSub = () => {
    if (!subForm.name || !subForm.amount || parseFloat(subForm.amount) <= 0) return;
    setSubscriptions((p) => [...p, { ...subForm, id: Date.now(), amount: parseFloat(subForm.amount) }]);
    setSubForm(blankSub); setShowSubForm(false);
  };

  const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

  // ── Atoms ──────────────────────────────────────────────────────────────────
  const fontStyle = { fontFamily: T.fontFamily };

  const SectionLabel = ({ children, style: s = {} }) => (
    <p style={{ ...T.label, ...fontStyle, margin: "0 0 14px", paddingLeft: 4, ...s }}>{children}</p>
  );
  const CardWrap = ({ children, style: s = {} }) => (
    <div style={{ ...T.card, padding: "22px 24px", marginBottom: 14, ...s }}>{children}</div>
  );
  const TxRow = ({ tx }) => {
    const cat = getCat(tx.category);
    const isDeleting = deletingId === tx.id;
    const tags = extractTags(tx.note);
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, opacity: isDeleting ? 0 : 1, transform: isDeleting ? "translateX(50px)" : "none", transition: "all 0.28s", padding: "11px 0", borderBottom: "1px solid #F1F5F9" }} className="ft-tx-row">
        <div style={{ width: 40, height: 40, borderRadius: 14, background: cat.pastelBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{cat.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", lineHeight: 1.5 }}>{cat.label}</span>
            {tx.split && <span style={{ fontSize: 10, fontWeight: 500, background: "#EEF2FF", color: T.indigo, padding: "1px 6px", borderRadius: 5 }}>{t.split}</span>}
            {tx.recurringId && <span style={{ fontSize: 10, fontWeight: 500, background: "#FEFCE8", color: "#A16207", padding: "1px 6px", borderRadius: 5 }}>{t.auto}</span>}
          </div>
          <p style={{ ...T.muted, ...fontStyle, margin: "2px 0 0", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {tx.note || t.noNote} · {fmtDate(tx.date)}
          </p>
          {tags.length > 0 && (
            <div style={{ display: "flex", gap: 3, marginTop: 4, flexWrap: "wrap" }}>
              {tags.map((tag) => <span key={tag} style={{ fontSize: 10, fontWeight: 500, background: "#EEF2FF", color: "#6366F1", padding: "1px 7px", borderRadius: 99 }}>{tag}</span>)}
            </div>
          )}
        </div>
        <span style={{ ...T.mono, fontSize: 14, fontWeight: 600, color: "#EF4444", flexShrink: 0 }}>−{fmt(tx.amount)}</span>
        <button onClick={() => handleDelete(tx.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 5, color: "#CBD5E1", flexShrink: 0 }}><Trash2 size={14} /></button>
      </div>
    );
  };

  // ── Yearly Summary ────────────────────────────────────────────────────────
  const computeYearlyData = (year) => {
    const yearStr = String(year);
    const yearTxns = transactions.filter((tx) => tx.date.startsWith(yearStr));
    const totalSpent = yearTxns.reduce((s, tx) => s + tx.amount, 0);
    const now = new Date();
    const isCurrentYear = year === now.getFullYear();
    const divisor = isCurrentYear ? now.getMonth() + 1 : 12;
    const monthlyAvg = divisor > 0 ? totalSpent / divisor : 0;
    const biggestTx = yearTxns.length > 0 ? yearTxns.reduce((max, tx) => tx.amount > max.amount ? tx : max, yearTxns[0]) : null;
    const catTotalsYear = {};
    yearTxns.forEach((tx) => { catTotalsYear[tx.category] = (catTotalsYear[tx.category] || 0) + tx.amount; });
    const monthlyTrend = monthNames.map((name, i) => {
      const key = monthKey(year, i);
      const total = yearTxns.filter((tx) => tx.date.startsWith(key)).reduce((s, tx) => s + tx.amount, 0);
      return { name, total, monthIdx: i };
    });
    return { totalSpent, monthlyAvg, biggestTx, catTotalsYear, monthlyTrend, yearTxns };
  };

  const YearlySummary = () => {
    const [selectedMonth, setSelectedMonth] = useState(null);
    const { totalSpent, monthlyAvg, biggestTx, catTotalsYear, monthlyTrend } = computeYearlyData(yearlyYear);

    const currentYr = new Date().getFullYear();
    const yearOptions = [currentYr - 1, currentYr, currentYr + 1].filter((y) => y >= 2024);

    const donutData = CATEGORIES.map((cat) => ({
      name: cat.label, value: catTotalsYear[cat.value] || 0, cat,
    })).filter((d) => d.value > 0);

    const AreaTooltip = ({ active, payload, label }) => {
      if (!active || !payload?.length) return null;
      return (
        <div style={{ background: "#0F172A", padding: "8px 14px", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.2)", fontFamily: T.fontFamily }}>
          <p style={{ margin: 0, fontSize: 11, color: "#94A3B8", fontWeight: 500 }}>{label}</p>
          <p style={{ margin: "2px 0 0", fontSize: 14, color: "#F8FAFC", fontWeight: 600, fontFamily: T.mono.fontFamily }}>{fmt(payload[0].value)}</p>
        </div>
      );
    };

    // ── Month detail drill-down ──────────────────────────────────────────────
    if (selectedMonth !== null) {
      const [selectedCat, setSelectedCat] = useState(null);

      const mIdx  = selectedMonth;
      const mKey  = monthKey(yearlyYear, mIdx);
      const mName = `${monthNames[mIdx]} ${yearlyYear}`;
      const mTxns = transactions.filter((tx) => tx.date.startsWith(mKey)).sort((a, b) => new Date(b.date) - new Date(a.date));
      const mTotal = mTxns.reduce((s, tx) => s + tx.amount, 0);
      const mCatTotals = {};
      mTxns.forEach((tx) => { mCatTotals[tx.category] = (mCatTotals[tx.category] || 0) + tx.amount; });
      const mCatSorted = Object.entries(mCatTotals).sort((a, b) => b[1] - a[1]);

      const visibleTxns = selectedCat ? mTxns.filter((tx) => tx.category === selectedCat) : mTxns;
      const activeCat   = selectedCat ? getCat(selectedCat) : null;

      const goPrev = () => { setSelectedCat(null); setSelectedMonth((m) => m > 0 ? m - 1 : m); };
      const goNext = () => { setSelectedCat(null); setSelectedMonth((m) => m < 11 ? m + 1 : m); };

      return (
        <div style={{ position: "fixed", inset: 0, zIndex: 210, background: "#F8F7F4", overflowY: "auto", fontFamily: T.fontFamily }}>
          {/* Sticky nav */}
          <div style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(248,247,244,0.94)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(226,232,240,0.6)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setSelectedMonth(null)} style={{ display: "flex", alignItems: "center", gap: 6, background: "#FFFFFF", border: "none", cursor: "pointer", padding: "9px 16px", borderRadius: 99, fontFamily: T.fontFamily, fontSize: 13, fontWeight: 500, color: "#334155", boxShadow: "0 2px 8px rgba(15,23,42,0.08)", flexShrink: 0 }}>
              <ArrowLeft size={15} /> {yearlyYear}
            </button>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <button onClick={goPrev} disabled={mIdx === 0} style={{ background: mIdx === 0 ? "#F1F5F9" : "#FFFFFF", border: "none", cursor: mIdx === 0 ? "default" : "pointer", width: 34, height: 34, borderRadius: 99, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: mIdx === 0 ? "none" : "0 2px 8px rgba(15,23,42,0.08)", color: mIdx === 0 ? "#CBD5E1" : "#334155" }}>
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: 15, fontWeight: 600, color: "#0F172A", minWidth: 110, textAlign: "center" }}>{mName}</span>
              <button onClick={goNext} disabled={mIdx === 11} style={{ background: mIdx === 11 ? "#F1F5F9" : "#FFFFFF", border: "none", cursor: mIdx === 11 ? "default" : "pointer", width: 34, height: 34, borderRadius: 99, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: mIdx === 11 ? "none" : "0 2px 8px rgba(15,23,42,0.08)", color: mIdx === 11 ? "#CBD5E1" : "#334155" }}>
                <ChevronRight size={16} />
              </button>
            </div>
            {/* ── CLOSE BUTTON (Requirement 4) ── */}
            <button
              onClick={() => setSelectedMonth(null)}
              aria-label="Close"
              style={{ background: "#F1F5F9", border: "none", cursor: "pointer", padding: 8, borderRadius: "50%", color: "#64748B", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.18s" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#E2E8F0"}
              onMouseLeave={(e) => e.currentTarget.style.background = "#F1F5F9"}
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ maxWidth: 430, margin: "0 auto", padding: "0 16px 48px" }}>
            {/* Month hero */}
            <div style={{ padding: "28px 4px 16px" }}>
              <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 500, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t.totalSpent}</p>
              <p style={{ margin: 0, fontSize: 48, fontWeight: 600, letterSpacing: "-2px", color: "#0F172A", lineHeight: 1 }}>{fmt(mTotal)}</p>
              <p style={{ margin: "8px 0 0", fontSize: 13, color: "#94A3B8", fontWeight: 400, lineHeight: 1.6 }}>{t.transactionsIn(mTxns.length, mName)}</p>
            </div>

            {mTxns.length === 0 ? (
              <div style={{ ...T.card, padding: "40px 24px", textAlign: "center" }}>
                <p style={{ ...T.muted, ...fontStyle, margin: 0, fontWeight: 400 }}>{t.noTransactionsIn(mName)}</p>
              </div>
            ) : (
              <>
                <p style={{ ...T.label, ...fontStyle, margin: "0 0 10px", paddingLeft: 4 }}>{t.categories}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                  {mCatSorted.map(([catVal, amt]) => {
                    const cat = getCat(catVal);
                    const pct = mTotal > 0 ? amt / mTotal : 0;
                    const isActive = selectedCat === catVal;
                    const catTxCount = mTxns.filter((tx) => tx.category === catVal).length;
                    return (
                      <button
                        key={catVal}
                        onClick={() => setSelectedCat(isActive ? null : catVal)}
                        style={{ width: "100%", border: "none", fontFamily: T.fontFamily, cursor: "pointer", textAlign: "left", padding: "16px 20px", borderRadius: 22, background: isActive ? cat.pastelBg : "#FFFFFF", outline: isActive ? `2.5px solid ${cat.bar}` : "2.5px solid transparent", boxShadow: isActive ? `0 6px 24px ${cat.bar}30` : "0 2px 12px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)", transition: "all 0.18s" }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                          <div style={{ width: 44, height: 44, borderRadius: 16, flexShrink: 0, background: isActive ? "#FFFFFF" : cat.pastelBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, boxShadow: isActive ? `0 2px 8px ${cat.bar}40` : "none", transition: "all 0.18s" }}>{cat.icon}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                              <span style={{ fontSize: 15, fontWeight: 600, color: isActive ? cat.pastelText : "#0F172A" }}>{cat.label}</span>
                              <span style={{ ...T.mono, fontSize: 16, fontWeight: 600, color: isActive ? cat.pastelText : "#0F172A" }}>{fmt(amt)}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
                              <span style={{ fontSize: 11, color: isActive ? cat.pastelText : "#94A3B8", fontWeight: 400, lineHeight: 1.6, opacity: isActive ? 0.75 : 1 }}>{t.txCount(catTxCount)}</span>
                              <span style={{ fontSize: 12, fontWeight: 500, color: isActive ? cat.pastelText : "#94A3B8" }}>{(pct * 100).toFixed(0)}%</span>
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

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, paddingLeft: 4 }}>
                  <p style={{ ...T.label, ...fontStyle, margin: 0 }}>
                    {selectedCat ? `${activeCat.icon} ${activeCat.label}` : t.allTransactions} · {visibleTxns.length}
                  </p>
                  {selectedCat && (
                    <button onClick={() => setSelectedCat(null)} style={{ display: "flex", alignItems: "center", gap: 5, background: "#F1F5F9", border: "none", cursor: "pointer", padding: "5px 12px", borderRadius: 99, fontFamily: T.fontFamily, fontSize: 11, fontWeight: 500, color: "#64748B" }}>
                      <X size={11} /> {t.showAll}
                    </button>
                  )}
                </div>

                {selectedCat && (
                  <div style={{ padding: "14px 20px", borderRadius: 18, marginBottom: 12, background: activeCat.pastelBg, border: `1.5px solid ${activeCat.bar}40` }}>
                    <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 500, color: activeCat.pastelText, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.7 }}>{t.spentOn(activeCat.label)}</p>
                    <p style={{ margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: "-1px", color: activeCat.pastelText, fontFamily: T.mono.fontFamily }}>{fmt(mCatTotals[selectedCat])}</p>
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
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", lineHeight: 1.5 }}>{cat.label}</span>
                          {tx.split && <span style={{ fontSize: 10, fontWeight: 500, background: "#EEF2FF", color: T.indigo, padding: "1px 6px", borderRadius: 5 }}>{t.split}</span>}
                          {tx.recurringId && <span style={{ fontSize: 10, fontWeight: 500, background: "#FEFCE8", color: "#A16207", padding: "1px 6px", borderRadius: 5 }}>{t.auto}</span>}
                        </div>
                        <p style={{ ...T.muted, ...fontStyle, margin: "2px 0 0", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.note || t.noNote} · {fmtDate(tx.date)}</p>
                        {tags.length > 0 && (
                          <div style={{ display: "flex", gap: 3, marginTop: 4, flexWrap: "wrap" }}>
                            {tags.map((tag) => <span key={tag} style={{ fontSize: 10, fontWeight: 500, background: "#EEF2FF", color: "#6366F1", padding: "1px 7px", borderRadius: 99 }}>{tag}</span>)}
                          </div>
                        )}
                      </div>
                      <span style={{ ...T.mono, fontSize: 14, fontWeight: 600, color: "#EF4444", flexShrink: 0 }}>−{fmt(tx.amount)}</span>
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
      <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "#F8F7F4", overflowY: "auto", fontFamily: T.fontFamily, animation: "ft-fade-up 0.32s cubic-bezier(0.34,1.3,0.64,1) both" }}>
        <div style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(248,247,244,0.92)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(226,232,240,0.6)", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={() => setShowYearlySummary(false)} className="ft-icon-btn" style={{ display: "flex", alignItems: "center", gap: 7, background: "#FFFFFF", border: "none", cursor: "pointer", padding: "9px 16px", borderRadius: 99, fontFamily: T.fontFamily, fontSize: 13, fontWeight: 500, color: "#334155", boxShadow: "0 2px 8px rgba(15,23,42,0.08)" }}>
            <ArrowLeft size={15} /> {t.dashboard}
          </button>
          <div style={{ display: "flex", gap: 4, background: "#FFFFFF", padding: 4, borderRadius: 99, boxShadow: "0 2px 8px rgba(15,23,42,0.08)" }}>
            {yearOptions.map((y) => (
              <button key={y} onClick={() => setYearlyYear(y)} style={{ padding: "6px 14px", borderRadius: 99, border: "none", cursor: "pointer", fontFamily: T.fontFamily, fontSize: 13, fontWeight: 600, background: yearlyYear === y ? "#0F172A" : "transparent", color: yearlyYear === y ? "#FFFFFF" : "#64748B", transition: "all 0.18s" }}>{y}</button>
            ))}
          </div>
        </div>

        <div style={{ maxWidth: 430, margin: "0 auto", padding: "0 16px 48px" }}>
          <div style={{ padding: "32px 4px 24px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, marginBottom: 8, padding: "5px 12px", background: "#EEF2FF", borderRadius: 99 }}>
              <Sparkles size={13} color="#4F46E5" />
              <span style={{ fontSize: 11, fontWeight: 500, color: "#4F46E5", letterSpacing: "0.05em", textTransform: "uppercase" }}>{t.yearInReviewLabel}</span>
            </div>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 600, color: "#0F172A", letterSpacing: "-1px", lineHeight: 1.2 }}>{t.yearInReviewTitle(yearlyYear)}</h1>
          </div>

          <div style={{ ...T.card, padding: "28px 28px", marginBottom: 14, background: "#0F172A" }}>
            <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 500, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t.totalSpentThisYear}</p>
            <p style={{ margin: "0 0 16px", fontSize: 48, fontWeight: 600, letterSpacing: "-2px", color: "#F8FAFC", lineHeight: 1 }}>{fmt(totalSpent)}</p>
            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ flex: 1, padding: "14px 16px", background: "rgba(255,255,255,0.07)", borderRadius: 16 }}>
                <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 500, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t.monthlyAvg}</p>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#F8FAFC", fontFamily: T.mono.fontFamily }}>{fmt(monthlyAvg)}</p>
              </div>
              <div style={{ flex: 1, padding: "14px 16px", background: "rgba(255,255,255,0.07)", borderRadius: 16 }}>
                <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 500, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t.transactions}</p>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#F8FAFC", fontFamily: T.mono.fontFamily }}>{computeYearlyData(yearlyYear).yearTxns.length}</p>
              </div>
            </div>
          </div>

          {biggestTx ? (
            <div style={{ ...T.card, padding: "22px 24px", marginBottom: 14, background: "#EEF2FF", boxShadow: "0 8px 32px rgba(79,70,229,0.12)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <div style={{ width: 30, height: 30, borderRadius: 10, background: "#C7D2FE", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <TrendingUp size={15} color="#4338CA" />
                </div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: "#4338CA", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t.biggestExpenseOf(yearlyYear)}</p>
              </div>
              <p style={{ margin: "0 0 4px", fontSize: 32, fontWeight: 600, color: "#312E81", letterSpacing: "-1.5px", fontFamily: T.mono.fontFamily }}>{fmt(biggestTx.amount)}</p>
              <p style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 500, color: "#4338CA", lineHeight: 1.6 }}>{biggestTx.note || getCat(biggestTx.category).label}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 9, background: "#C7D2FE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{getCat(biggestTx.category).icon}</div>
                <span style={{ fontSize: 12, fontWeight: 500, color: "#6366F1" }}>{getCat(biggestTx.category).label} · {fmtDate(biggestTx.date)}</span>
              </div>
            </div>
          ) : (
            <div style={{ ...T.card, padding: "22px 24px", marginBottom: 14, background: "#EEF2FF", textAlign: "center" }}>
              <p style={{ margin: 0, color: "#6366F1", fontWeight: 500, fontSize: 14 }}>{t.noTxFor(yearlyYear)}</p>
            </div>
          )}

          <div style={{ ...T.card, padding: "22px 24px", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <BarChart2 size={16} color="#4F46E5" />
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{t.monthlySpendingTrend}</p>
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
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 500, fill: "#94A3B8", fontFamily: T.fontFamily }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<AreaTooltip />} />
                  <Area type="monotone" dataKey="total" stroke="#4F46E5" strokeWidth={2.5} fill="url(#yearGrad)" dot={{ r: 3, fill: "#4F46E5", strokeWidth: 0 }} activeDot={{ r: 5, fill: "#4F46E5", strokeWidth: 0, cursor: "pointer", onClick: (_, payload) => { if (payload?.index !== undefined) setSelectedMonth(payload.index); } }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p style={{ ...T.muted, ...fontStyle, fontSize: 13, fontWeight: 400 }}>{t.noDataYear(yearlyYear)}</p>
              </div>
            )}
            {totalSpent > 0 && (() => {
              const activeMths = monthlyTrend.filter((m) => m.total > 0);
              if (activeMths.length < 2) return null;
              const best  = activeMths.reduce((min, m) => m.total < min.total ? m : min, activeMths[0]);
              const worst = activeMths.reduce((max, m) => m.total > max.total ? m : max, activeMths[0]);
              return (
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <div onClick={() => setSelectedMonth(best.monthIdx)} style={{ flex: 1, padding: "10px 14px", background: "#F0FDF4", borderRadius: 14, cursor: "pointer" }}>
                    <p style={{ margin: "0 0 2px", fontSize: 10, fontWeight: 600, color: "#15803D", textTransform: "uppercase" }}>{t.lightest}</p>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#166534", fontFamily: T.mono.fontFamily }}>{best.name} · {fmt(best.total)}</p>
                  </div>
                  <div onClick={() => setSelectedMonth(worst.monthIdx)} style={{ flex: 1, padding: "10px 14px", background: "#FFF1F2", borderRadius: 14, cursor: "pointer" }}>
                    <p style={{ margin: "0 0 2px", fontSize: 10, fontWeight: 600, color: "#BE123C", textTransform: "uppercase" }}>{t.heaviest}</p>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#9F1239", fontFamily: T.mono.fontFamily }}>{worst.name} · {fmt(worst.total)}</p>
                  </div>
                </div>
              );
            })()}
          </div>

          <div style={{ ...T.card, padding: "22px 24px", marginBottom: 14 }}>
            <p style={{ margin: "0 0 18px", fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{t.spendingByCategory2}</p>
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
                    <p style={{ margin: 0, fontSize: 10, fontWeight: 500, color: "#94A3B8", textTransform: "uppercase" }}>{t.total}</p>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#0F172A", fontFamily: T.mono.fontFamily }}>{fmt(totalSpent)}</p>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                  {donutData.sort((a, b) => b.value - a.value).map((d) => {
                    const pct = totalSpent > 0 ? (d.value / totalSpent * 100).toFixed(1) : 0;
                    return (
                      <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: d.cat.bar, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 500, color: "#334155", flex: 1, lineHeight: 1.6 }}>{d.cat.icon} {d.name}</span>
                        <span style={{ fontSize: 12, color: "#94A3B8", fontWeight: 400 }}>{pct}%</span>
                        <span style={{ ...T.mono, fontSize: 13, fontWeight: 600, color: "#0F172A", minWidth: 72, textAlign: "right" }}>{fmt(d.value)}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p style={{ ...T.muted, ...fontStyle, fontSize: 13, fontWeight: 400 }}>{t.noDataFor(yearlyYear)}</p>
              </div>
            )}
          </div>

          <p style={{ ...T.label, ...fontStyle, margin: "0 0 12px", paddingLeft: 4 }}>{t.tapAMonthToExplore}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
            {monthlyTrend.map(({ name, total, monthIdx }) => {
              const hasData = total > 0;
              const isCurrentMo = monthKey(yearlyYear, monthIdx) === currentMonth();
              const isMax = total > 0 && total === Math.max(...monthlyTrend.map((m) => m.total));
              return (
                <button key={monthIdx} onClick={() => hasData && setSelectedMonth(monthIdx)} style={{ ...T.card, padding: "14px 16px", border: "none", fontFamily: T.fontFamily, cursor: hasData ? "pointer" : "default", textAlign: "left", background: isMax ? "#EEF2FF" : "#FFFFFF", outline: isCurrentMo ? `2px solid ${T.indigo}` : "none", opacity: hasData ? 1 : 0.45, transition: "transform 0.15s, box-shadow 0.15s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: isMax ? T.indigo : isCurrentMo ? T.indigo : "#0F172A" }}>{name}</span>
                    {isCurrentMo && <span style={{ fontSize: 8, fontWeight: 600, background: T.indigoLight, color: T.indigo, padding: "2px 5px", borderRadius: 99 }}>{t.nowBadge}</span>}
                    {isMax && !isCurrentMo && <span style={{ fontSize: 8, fontWeight: 600, background: "#EEF2FF", color: T.indigo, padding: "2px 5px", borderRadius: 99 }}>{t.peakBadge}</span>}
                  </div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#0F172A", fontFamily: T.mono.fontFamily }}>{hasData ? fmt(total) : "—"}</p>
                  {hasData && <p style={{ margin: "3px 0 0", fontSize: 10, color: "#94A3B8", fontWeight: 400 }}>{t.tapToView}</p>}
                </button>
              );
            })}
          </div>

          <div style={{ ...T.card, padding: "22px 24px", marginBottom: 14 }}>
            <p style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{t.monthByMonth}</p>
            <p style={{ margin: "0 0 16px", fontSize: 11, color: "#94A3B8", fontWeight: 400 }}>{t.tapBarToDrill}</p>
            {totalSpent > 0 ? (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={monthlyTrend} margin={{ top: 4, right: 0, left: 0, bottom: 0 }} barSize={18}
                  onClick={(data) => { if (data?.activePayload?.[0]?.payload?.total > 0) setSelectedMonth(data.activePayload[0].payload.monthIdx); }}>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 500, fill: "#94A3B8", fontFamily: T.fontFamily }} axisLine={false} tickLine={false} />
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
                <p style={{ ...T.muted, ...fontStyle, fontSize: 13 }}>{t.noData}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ fontFamily: T.fontFamily, maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: T.pageBg, paddingBottom: 90 }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@300;400;500;600&family=Kanit:wght@300;400;500;600&family=DM+Mono:wght@500&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes ft-fade-in   { from { opacity: 0 } to { opacity: 1 } }
        @keyframes ft-fade-up   { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes ft-fade-down { from { opacity: 0; transform: translateY(-10px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes ft-scale-in  { from { opacity: 0; transform: translate(-50%,-50%) scale(0.88) } to { opacity: 1; transform: translate(-50%,-50%) scale(1) } }
        @keyframes ft-toast-in  { from { opacity: 0; transform: translateX(-50%) translateY(-12px) } to { opacity: 1; transform: translateX(-50%) translateY(0) } }
        .ft-fade-up   { animation: ft-fade-up   0.28s cubic-bezier(0.34,1.4,0.64,1) both }
        .ft-fade-down { animation: ft-fade-down  0.22s cubic-bezier(0.34,1.4,0.64,1) both }
        .ft-slide-up  { animation: ft-fade-up   0.32s cubic-bezier(0.34,1.4,0.64,1) both }
        .ft-yearly-in { animation: ft-fade-up   0.35s cubic-bezier(0.34,1.3,0.64,1) both }
        .ft-btn:active      { transform: scale(0.95) !important; transition: transform 0.1s !important }
        .ft-card-btn:active { transform: scale(0.97) !important; transition: transform 0.1s !important }
        .ft-tab-btn:active  { transform: scale(0.90) !important }
        .ft-icon-btn:active { transform: scale(0.85) !important; transition: transform 0.12s !important }
        .ft-month-card { transition: transform 0.18s, box-shadow 0.18s }
        .ft-month-card:hover  { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(15,23,42,0.10) !important }
        .ft-month-card:active { transform: scale(0.97) !important }
        .ft-tx-row  { transition: background 0.15s }
        .ft-tx-row:hover  { background: #FAFAFE }
        .ft-sub-row { transition: background 0.15s }
        .ft-sub-row:hover { background: #FAFAFE }
      `}</style>

      {showYearlySummary && <YearlySummary />}

      {toast && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 999, background: "#0F172A", color: "#F8FAFC", padding: "11px 22px", borderRadius: 99, fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", boxShadow: "0 8px 32px rgba(15,23,42,0.22)", fontFamily: T.fontFamily, animation: "ft-toast-in 0.3s cubic-bezier(0.34,1.4,0.64,1) both" }}>
          {toast}
        </div>
      )}

      {/* ══ HERO HEADER ══ */}
      <div style={{ padding: "36px 24px 8px", background: T.pageBg }}>
          {/* Month Header for Home/Analytics/Statement */}
          <MonthHeader monthKey={selectedMonthKey} monthNames={monthNames} year={stmtYear} />
        {/* ── Language toggle + Year-in-Review row (Requirement 3) ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          {/* Language Toggle */}
          <button className="ft-icon-btn"
            onClick={() => setLanguage((l) => l === "EN" ? "TH" : "EN")}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "#FFFFFF", border: "1.5px solid #E2E8F0", cursor: "pointer", padding: "6px 14px", borderRadius: 99, fontFamily: T.fontFamily, fontSize: 12, fontWeight: 600, color: "#475569", boxShadow: "0 1px 4px rgba(15,23,42,0.06)", transition: "all 0.18s" }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = "#C7D2FE"}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = "#E2E8F0"}
          >
            <Globe size={13} color="#6366F1" />
            <span style={{ color: language === "TH" ? T.indigo : "#94A3B8", fontWeight: language === "TH" ? 700 : 500 }}>TH</span>
            <span style={{ color: "#CBD5E1", fontSize: 10 }}>|</span>
            <span style={{ color: language === "EN" ? T.indigo : "#94A3B8", fontWeight: language === "EN" ? 700 : 500 }}>EN</span>
          </button>

          {/* Year-in-Review button */}
          <button onClick={() => { setYearlyYear(new Date().getFullYear()); setShowYearlySummary(true); }} className="ft-btn" style={{ display: "flex", alignItems: "center", gap: 6, background: "#0F172A", border: "none", cursor: "pointer", padding: "7px 14px", borderRadius: 99, fontFamily: T.fontFamily, fontSize: 12, fontWeight: 500, color: "#F8FAFC", boxShadow: "0 2px 12px rgba(15,23,42,0.22)" }}>
            <Sparkles size={12} /> {t.yearInReviewBtn(new Date().getFullYear())}
          </button>
        </div>

        <p style={{ ...T.muted, ...fontStyle, margin: "10px 0 10px", fontSize: 13, fontWeight: 400, lineHeight: 1.7, letterSpacing: "0.01em" }}>{t.totalSpent}</p>
        <span style={{ ...T.h1, fontFamily: T.fontFamily }}>{fmt(monthlyTotal)}</span>

        {topCat && !totalBudget && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12, padding: "5px 12px", background: "#FFFFFF", borderRadius: 99, boxShadow: "0 2px 8px rgba(15,23,42,0.07)" }}>
            <span style={{ fontSize: 14 }}>{getCat(topCat[0]).icon}</span>
            <span style={{ fontSize: 12, color: "#64748B", fontWeight: 400, lineHeight: 1.6 }}>{t.top} <span style={{ color: "#334155", fontWeight: 600 }}>{getCat(topCat[0]).label}</span></span>
          </div>
        )}

        {totalBudget > 0 && (
          <div style={{ marginTop: 16, ...T.card, padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t.monthlyBudget}</span>
              <span style={{ ...T.mono, fontSize: 13, fontWeight: 500, color: bc.text }}>{t.used(Math.round(budgetPct * 100))}</span>
            </div>
            <div style={{ height: 8, background: bc.track, borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min(budgetPct*100,100)}%`, background: bc.bar, borderRadius: 99, transition: "width 0.6s cubic-bezier(0.34,1.56,0.64,1)" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <span style={{ ...T.muted, ...fontStyle, fontSize: 12 }}>{t.spent(fmt(monthlyTotal))}</span>
              <span style={{ ...T.muted, ...fontStyle, fontSize: 12 }}>{t.of(fmt(totalBudget))}</span>
            </div>
            {budgetPct >= 0.75 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, padding: "8px 12px", background: bc.track, borderRadius: 12 }}>
                <AlertTriangle size={13} color={bc.text} />
                <span style={{ fontSize: 12, fontWeight: 500, color: bc.text }}>{budgetPct >= 0.95 ? t.budgetExceeded : t.approachingLimit}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══ HOME ══ */}
      {tab === "home" && (
        <div style={{ padding: "0 16px" }}>
          <button onClick={() => { setShowForm(!showForm); setError(""); }} className="ft-btn" style={{ width: "100%", padding: "16px", borderRadius: 22, border: "none", background: showForm ? "#E2E8F0" : T.indigo, color: showForm ? "#475569" : "#FFFFFF", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: T.fontFamily, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 14, boxShadow: showForm ? "none" : "0 6px 24px rgba(79,70,229,0.32)", transition: "all 0.22s", lineHeight: 1.5 }}>
            <PlusCircle size={19} />
            {showForm ? t.cancel : t.addTransaction}
          </button>

          {showForm && (
            <CardWrap style={{ marginBottom: 14, animation: "ft-fade-up 0.28s cubic-bezier(0.34,1.4,0.64,1) both" }}>
              <p style={{ ...T.h2, ...fontStyle, margin: "0 0 20px" }}>{t.newTransaction}</p>
              <p style={{ ...T.label, ...fontStyle, margin: "0 0 8px" }}>{t.amount}</p>
              <input type="number" inputMode="decimal" placeholder="0" value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                style={{ ...T.input, fontFamily: T.mono.fontFamily, fontSize: 32, fontWeight: 600, letterSpacing: "-1px", marginBottom: 16, padding: "14px 18px" }} />

              <div onClick={() => setForm({ ...form, split: !form.split, reimbursed: "" })}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderRadius: 18, background: form.split ? "#EEF2FF" : "#F8F7F4", border: `1.5px solid ${form.split ? "#C7D2FE" : "#E2E8F0"}`, marginBottom: 14, cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 12, background: form.split ? "#EEF2FF" : "#E2E8F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Scissors size={16} color={form.split ? T.indigo : "#94A3B8"} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{t.splitBill}</p>
                    <p style={{ margin: 0, fontSize: 12, color: "#94A3B8", lineHeight: 1.6 }}>{t.splitDesc}</p>
                  </div>
                </div>
                <div style={{ width: 46, height: 26, borderRadius: 99, background: form.split ? T.indigo : "#CBD5E1", position: "relative", transition: "background 0.22s", flexShrink: 0 }}>
                  <div style={{ position: "absolute", top: 3, left: form.split ? 23 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.22s", boxShadow: "0 1px 4px rgba(0,0,0,0.18)" }} />
                </div>
              </div>

              {form.split && (
                <div style={{ marginBottom: 14, animation: "ft-fade-up 0.22s cubic-bezier(0.34,1.4,0.64,1) both" }}>
                  <p style={{ ...T.label, ...fontStyle, margin: "0 0 8px" }}>{t.reimbursed}</p>
                  <input type="number" inputMode="decimal" placeholder="0" value={form.reimbursed}
                    onChange={(e) => setForm({ ...form, reimbursed: e.target.value })}
                    style={{ ...T.input, fontFamily: T.mono.fontFamily, fontSize: 18, fontWeight: 500, marginBottom: 10 }} />
                  {form.amount && (
                    <div style={{ padding: "10px 16px", background: "#F0FDF4", borderRadius: 14, border: "1px solid #BBF7D0" }}>
                      <span style={{ fontSize: 13, color: "#15803D", fontFamily: T.mono.fontFamily, fontWeight: 500 }}>
                        {fmt(parseFloat(form.amount)||0)} − {fmt(parseFloat(form.reimbursed)||0)} = <strong>{fmt(netAmount())}</strong> net
                      </span>
                    </div>
                  )}
                </div>
              )}

              <p style={{ ...T.label, ...fontStyle, margin: "0 0 10px" }}>{t.category}</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
                {CATEGORIES.map((cat) => {
                  const active = form.category === cat.value;
                  return (
                    <button key={cat.value} onClick={() => setForm({ ...form, category: cat.value })} style={{ padding: "12px 6px", borderRadius: 18, cursor: "pointer", fontFamily: T.fontFamily, border: `2px solid ${active ? cat.bar : "transparent"}`, background: active ? cat.pastelBg : "#F8F7F4", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, transition: "all 0.15s" }}>
                      <span style={{ fontSize: 22 }}>{cat.icon}</span>
                      <span style={{ fontSize: 11, fontWeight: active ? 600 : 400, color: active ? cat.pastelText : "#94A3B8", lineHeight: 1.5 }}>{cat.label.split(" ")[0]}</span>
                    </button>
                  );
                })}
              </div>

              <p style={{ ...T.label, ...fontStyle, margin: "0 0 8px" }}>{t.noteAndTags}</p>
              <input type="text" placeholder="e.g. lunch #grab #work" value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                style={{ ...T.input, fontFamily: T.fontFamily, marginBottom: extractTags(form.note).length ? 8 : 14 }} />
              {extractTags(form.note).length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                  {extractTags(form.note).map((tag) => <span key={tag} style={{ background: "#EEF2FF", color: T.indigo, fontSize: 12, fontWeight: 500, padding: "4px 12px", borderRadius: 99 }}>{tag}</span>)}
                </div>
              )}

              <p style={{ ...T.label, ...fontStyle, margin: "0 0 8px" }}>{t.date}</p>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                style={{ ...T.input, fontFamily: T.fontFamily, marginBottom: 18 }} />

              {error && <p style={{ color: "#EF4444", fontSize: 13, marginBottom: 12, fontWeight: 400, lineHeight: 1.6 }}>{error}</p>}

              <button onClick={handleAdd} className="ft-btn" style={{ width: "100%", padding: "15px", borderRadius: 18, border: "none", background: T.indigo, color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: T.fontFamily, boxShadow: "0 4px 18px rgba(79,70,229,0.28)" }}>
                {form.split ? t.saveNet(fmt(netAmount())) : t.save}
              </button>
            </CardWrap>
          )}

          <SectionLabel>{sorted.length === 0 ? t.noTxYet : `${t.transactions} · ${sorted.length}`}</SectionLabel>
          {sorted.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 20px" }}>
              <div style={{ width: 64, height: 64, borderRadius: 24, background: "#E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}><Wallet size={28} color="#94A3B8" /></div>
              <p style={{ ...T.muted, ...fontStyle, margin: 0, fontWeight: 400, lineHeight: 1.7 }}>{t.tapToBegin}</p>
            </div>
          ) : sorted.map((tx) => {
            const cat = getCat(tx.category);
            const isDeleting = deletingId === tx.id;
            const tags = extractTags(tx.note);
            return (
              <div key={tx.id} className="ft-tx-row" style={{ ...T.card, padding: "16px 18px", marginBottom: 10, display: "flex", alignItems: "center", gap: 14, opacity: isDeleting ? 0 : 1, transform: isDeleting ? "translateX(50px)" : "none", transition: "all 0.28s" }}>
                <div style={{ width: 48, height: 48, borderRadius: 18, background: cat.pastelBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{cat.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", lineHeight: 1.5 }}>{cat.label}</span>
                    {tx.split && <span style={{ fontSize: 10, fontWeight: 500, background: "#EEF2FF", color: T.indigo, padding: "2px 7px", borderRadius: 6 }}>{t.split}</span>}
                    {tx.recurringId && <span style={{ fontSize: 10, fontWeight: 500, background: "#FEFCE8", color: "#A16207", padding: "2px 7px", borderRadius: 6 }}>{t.auto}</span>}
                  </div>
                  <p style={{ ...T.muted, ...fontStyle, margin: "3px 0 0", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.note || t.noNote} · {fmtDate(tx.date)}</p>
                  {tags.length > 0 && (
                    <div style={{ display: "flex", gap: 4, marginTop: 5, flexWrap: "wrap" }}>
                      {tags.map((tag) => <span key={tag} style={{ fontSize: 10, fontWeight: 500, background: "#EEF2FF", color: "#6366F1", padding: "2px 8px", borderRadius: 99 }}>{tag}</span>)}
                    </div>
                  )}
                </div>
                <span style={{ ...T.mono, fontSize: 15, fontWeight: 600, color: "#EF4444", flexShrink: 0 }}>−{fmt(tx.amount)}</span>
                <button onClick={() => handleDelete(tx.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, color: "#CBD5E1", flexShrink: 0 }}><Trash2 size={15} /></button>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ ANALYTICS ══ */}
      {tab === "analytics" && (
        <div style={{ padding: "0 16px" }}>
          <SectionLabel>{t.spendingByCategory}</SectionLabel>
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
                    <span style={{ fontSize: 15, fontWeight: 600, color: "#0F172A", lineHeight: 1.5 }}>{cat.label}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ ...T.mono, fontSize: 15, fontWeight: 600, color: cbc ? cbc.text : "#0F172A" }}>{fmt(amt)}</span>
                    {catBudget > 0 && <span style={{ ...T.muted, ...fontStyle, fontSize: 11, display: "block" }}>/ {fmt(catBudget)}</span>}
                  </div>
                </div>
                <div style={{ height: 7, background: cbc ? cbc.track : "#F1F5F9", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min((cbc ? catPct : pct)*100,100)}%`, background: cbc ? cbc.bar : cat.bar, borderRadius: 99, transition: "width 0.5s" }} />
                </div>
                {catBudget > 0 && catPct >= 0.75 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8 }}>
                    <AlertTriangle size={12} color={cbc.text} />
                    <span style={{ fontSize: 11, fontWeight: 500, color: cbc.text }}>{catPct >= 0.95 ? t.overLimit : t.nearLimit}</span>
                  </div>
                )}
              </div>
            );
          })}
          {topTags.length > 0 && (
            <>
              <SectionLabel style={{ marginTop: 8 }}>{t.topTagsThisMonth}</SectionLabel>
              {topTags.map(([tag, amt]) => (
                <div key={tag} style={{ ...T.card, padding: "14px 18px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.indigo, minWidth: 90 }}>{tag}</span>
                  <div style={{ flex: 1, height: 6, background: "#EEF2FF", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(amt / maxTagAmt)*100}%`, background: T.indigo, borderRadius: 99 }} />
                  </div>
                  <span style={{ ...T.mono, fontSize: 13, fontWeight: 600, color: "#0F172A", minWidth: 72, textAlign: "right" }}>{fmt(amt)}</span>
                </div>
              ))}
            </>
          )}
          {monthTxns.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 20px" }}>
              <div style={{ width: 64, height: 64, borderRadius: 24, background: "#E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}><BarChart2 size={28} color="#94A3B8" /></div>
              <p style={{ ...T.muted, ...fontStyle, margin: 0, fontWeight: 400, lineHeight: 1.7 }}>{t.addTxToSeeAnalytics}</p>
            </div>
          )}
        </div>
      )}

      {/* ══ STATEMENT ══ */}
      {tab === "statement" && (
        <div style={{ padding: "0 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <SectionLabel style={{ margin: 0 }}>{t.year}</SectionLabel>
            <div style={{ display: "flex", gap: 6 }}>
              {availableYears.map((y) => (
                <button key={y} onClick={() => { setStmtYear(parseInt(y)); setOpenMonth(null); }} style={{ padding: "6px 14px", borderRadius: 99, border: "none", cursor: "pointer", fontFamily: T.fontFamily, fontSize: 13, fontWeight: 600, background: stmtYear === parseInt(y) ? T.indigo : "#FFFFFF", color: stmtYear === parseInt(y) ? "#FFFFFF" : "#64748B", boxShadow: stmtYear === parseInt(y) ? "0 2px 10px rgba(79,70,229,0.3)" : "0 1px 4px rgba(15,23,42,0.06)" }}>{y}</button>
              ))}
            </div>
          </div>

          <div style={{ ...T.card, padding: "22px 24px", marginBottom: 14 }}>
            <p style={{ ...T.label, ...fontStyle, margin: "0 0 6px" }}>{t.yearTotalLabel(stmtYear)}</p>
            <p style={{ ...T.h1, fontFamily: T.fontFamily, fontSize: 34, marginBottom: 18 }}>{fmt(yearTotal)}</p>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 72 }}>
              {yearMonthData.map(({ name, key, total, monthIdx }) => {
                const heightPct = maxMonthAmt > 0 ? total / maxMonthAmt : 0;
                const isNow  = key === currentMonth();
                const isOpen = key === openMonth;
                return (
                  <div key={key} onClick={() => { setOpenMonth(isOpen ? null : key); setSelectedMonthKey(key); }}
                    style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: total > 0 ? "pointer" : "default" }}>
                    <div style={{ width: "100%", height: 56, display: "flex", alignItems: "flex-end" }}>
                      <div style={{ width: "100%", height: `${Math.max(heightPct * 100, total > 0 ? 8 : 3)}%`, minHeight: total > 0 ? 6 : 2, borderRadius: "6px 6px 3px 3px", background: isOpen ? T.indigo : isNow ? "#818CF8" : total > 0 ? "#C7D2FE" : "#F1F5F9", transition: "all 0.3s" }} />
                    </div>
                    <span style={{ fontSize: 9, fontWeight: isNow ? 700 : 400, color: isOpen ? T.indigo : isNow ? "#4F46E5" : "#94A3B8", textAlign: "center", fontFamily: T.fontFamily }}>{name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <SectionLabel>{t.allMonths}</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            {yearMonthData.map(({ name, key, txns, total, monthIdx }) => {
              const isNow   = key === currentMonth();
              const hasData = txns.length > 0;
              const topC    = (() => { const ct = {}; txns.forEach((tx) => { ct[tx.category] = (ct[tx.category]||0)+tx.amount; }); const top = Object.entries(ct).sort((a,b)=>b[1]-a[1])[0]; return top ? getCat(top[0]) : null; })();

              return (
                <div key={key}>
                  <button onClick={() => { setOpenMonth(key); setSelectedMonthKey(key); }} className="ft-month-card" style={{ width: "100%", ...T.card, padding: "16px 18px", border: "none", cursor: "pointer", textAlign: "left", fontFamily: T.fontFamily, outline: "none", background: "#FFFFFF" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                      <div>
                        <span style={{ fontSize: 16, fontWeight: 600, color: isNow ? T.indigo : "#0F172A" }}>{name}</span>
                        {isNow && <span style={{ fontSize: 9, fontWeight: 600, background: T.indigoLight, color: T.indigo, padding: "2px 7px", borderRadius: 99, marginLeft: 6 }}>{t.nowBadge}</span>}
                      </div>
                      {hasData && <ChevronDown size={14} color="#94A3B8" />}
                    </div>
                    {hasData ? (
                      <>
                        <p style={{ ...T.mono, fontSize: 15, fontWeight: 600, color: "#0F172A", margin: "8px 0 4px" }}>{fmt(total)}</p>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          {topC && <span style={{ fontSize: 13 }}>{topC.icon}</span>}
                          <span style={{ ...T.muted, ...fontStyle, fontSize: 11 }}>{t.txCount(txns.length)}</span>
                        </div>
                      </>
                    ) : (
                      <p style={{ ...T.muted, ...fontStyle, fontSize: 12, margin: "8px 0 0" }}>{t.noData}</p>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* ── Month Drilldown Modal ── */}
          {openMonth && (() => {
            const mData = yearMonthData.find((m) => m.key === openMonth);
            if (!mData) return null;
            const mName = `${monthNames[mData.monthIdx]} ${stmtYear}`;
            // ListEditor logic
            const handleAdd = (tx) => {
              const date = `${openMonth}-01`;
              const newTx = { id: Date.now() + Math.random(), ...tx, date };
              setTransactions((prev) => [newTx, ...prev]);
            };
            const handleDelete = (id) => {
              setTransactions((prev) => prev.filter((tx) => tx.id !== id));
            };
            // Overlay state for animation
            const [showOverlay, setShowOverlay] = useState(false);
            return (
              <>
                {/* Semi-transparent backdrop */}
                <div
                  onClick={() => setOpenMonth(null)}
                  style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(3px)", animation: "ft-fade-in 0.22s ease both" }}
                />
                {/* Centered modal card */}
                <div
                  style={{ position: "fixed", left: "50%", top: "50%", transform: "translate(-50%, -50%)", zIndex: 301, width: "calc(100% - 32px)", maxWidth: 400, maxHeight: "82vh", overflowY: "auto", borderRadius: 28, background: "#FFFFFF", boxShadow: "0 24px 64px rgba(15,23,42,0.22), 0 4px 16px rgba(15,23,42,0.1)", padding: "22px 24px", animation: "ft-scale-in 0.3s cubic-bezier(0.34,1.4,0.64,1) both", position: "relative" }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseEnter={() => setShowOverlay(true)}
                  onMouseLeave={() => setShowOverlay(false)}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                    <div>
                      <p style={{ ...T.label, ...fontStyle, margin: "0 0 4px" }}>{t.statement}</p>
                      <p style={{ ...T.h2, ...fontStyle, margin: 0 }}>{mName}</p>
                    </div>
                    <button
                      onClick={() => setOpenMonth(null)}
                      aria-label="Close"
                      className="ft-icon-btn"
                      style={{ background: "#F1F5F9", border: "none", cursor: "pointer", padding: 8, borderRadius: "50%", color: "#64748B", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.18s" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#E2E8F0"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "#F1F5F9"}
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div style={{ position: "relative" }}>
                    <ListEditor
                      txns={mData.txns}
                      onAdd={handleAdd}
                      onDelete={handleDelete}
                      monthName={mName}
                      fmt={fmt}
                      categories={CATEGORIES}
                      getCatLabel={getCatLabel}
                    />
                    {/* Overlay with + Add here button */}
                    <div
                      className={showOverlay ? "ft-month-overlay ft-month-overlay-active" : "ft-month-overlay"}
                      style={{
                        position: "absolute",
                        left: 0, right: 0, bottom: 0, height: "40%",
                        display: "flex", alignItems: "flex-end", justifyContent: "center",
                        background: "rgba(255,255,255,0.7)",
                        backdropFilter: "blur(8px)",
                        opacity: showOverlay ? 1 : 0,
                        pointerEvents: showOverlay ? "auto" : "none",
                        transform: showOverlay ? "translateY(0)" : "translateY(40px)",
                        transition: "opacity 0.28s cubic-bezier(0.34,1.4,0.64,1), transform 0.28s cubic-bezier(0.34,1.4,0.64,1)",
                        zIndex: 10
                      }}
                    >
                      <button
                        className="add-here-btn"
                        style={{
                          margin: "0 0 24px 0",
                          padding: "14px 32px",
                          borderRadius: 99,
                          border: "none",
                          background: "#4F46E5",
                          color: "#fff",
                          fontSize: "1rem",
                          fontWeight: 600,
                          boxShadow: "0 6px 24px rgba(79,70,229,0.18)",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          cursor: "pointer",
                          transition: "transform 0.18s"
                        }}
                        onClick={() => {/* You can trigger add logic here if needed */}}
                      >
                        <span style={{ fontSize: "1.2em", fontWeight: "bold", display: "inline-block" }}>+</span> Add here
                      </button>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* ══ SETTINGS ══ */}
      {tab === "settings" && (
        <div style={{ padding: "0 16px" }}>
          <CardWrap>
            <p style={{ ...T.h2, ...fontStyle, margin: "0 0 18px" }}>{t.budgetLimits}</p>
            <p style={{ ...T.label, ...fontStyle, margin: "0 0 8px" }}>{t.monthlyTotal}</p>
            <input type="number" placeholder="e.g. 30,000" value={budgets.total}
              onChange={(e) => setBudgets({ ...budgets, total: e.target.value })}
              style={{ ...T.input, fontFamily: T.mono.fontFamily, fontSize: 18, fontWeight: 500, marginBottom: 18 }} />
            <p style={{ ...T.label, ...fontStyle, margin: "0 0 12px" }}>{t.perCategoryLimits}</p>
            {CATEGORIES.map((cat) => (
              <div key={cat.value} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 13, background: cat.pastelBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{cat.icon}</div>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#334155", minWidth: 76 }}>{cat.label.split(" ")[0]}</span>
                <input type="number" placeholder="No limit" value={budgets.categories?.[cat.value] || ""}
                  onChange={(e) => setBudgets({ ...budgets, categories: { ...budgets.categories, [cat.value]: e.target.value } })}
                  style={{ ...T.input, flex: 1, fontFamily: T.mono.fontFamily, fontSize: 14, padding: "10px 14px" }} />
              </div>
            ))}
          </CardWrap>

          <CardWrap>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <p style={{ ...T.h2, ...fontStyle, margin: 0 }}>{t.subscriptions}</p>
              <button onClick={() => setShowSubForm(!showSubForm)} className="ft-icon-btn" style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 16px", borderRadius: 99, border: "none", cursor: "pointer", fontFamily: T.fontFamily, fontWeight: 600, fontSize: 13, background: showSubForm ? "#F1F5F9" : T.indigoLight, color: showSubForm ? "#64748B" : T.indigo, transition: "all 0.18s" }}>
                {showSubForm ? <><X size={13} /> {t.cancel}</> : <><Plus size={13} /> {t.add}</>}
              </button>
            </div>
            {showSubForm && (
              <div style={{ padding: "18px", background: "#F8F7F4", borderRadius: 20, marginBottom: 16, animation: "ft-fade-up 0.26s cubic-bezier(0.34,1.4,0.64,1) both" }}>
                <input placeholder="Name (e.g. Netflix)" value={subForm.name} onChange={(e) => setSubForm({ ...subForm, name: e.target.value })} style={{ ...T.input, fontFamily: T.fontFamily, marginBottom: 10 }} />
                <input type="number" placeholder="Amount (THB)" value={subForm.amount} onChange={(e) => setSubForm({ ...subForm, amount: e.target.value })} style={{ ...T.input, fontFamily: T.mono.fontFamily, fontSize: 16, fontWeight: 500, marginBottom: 10 }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                  <div>
                    <p style={{ ...T.label, ...fontStyle, margin: "0 0 6px" }}>{t.category}</p>
                    <select value={subForm.category} onChange={(e) => setSubForm({ ...subForm, category: e.target.value })} style={{ ...T.input, padding: "10px 12px", fontFamily: T.fontFamily }}>
                      {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.icon} {c.value}</option>)}
                    </select>
                  </div>
                  <div>
                    <p style={{ ...T.label, ...fontStyle, margin: "0 0 6px" }}>{t.billingDay}</p>
                    <input type="number" min="1" max="31" placeholder="1–31" value={subForm.day} onChange={(e) => setSubForm({ ...subForm, day: e.target.value })} style={{ ...T.input, fontFamily: T.mono.fontFamily, padding: "10px 12px" }} />
                  </div>
                </div>
                <button onClick={handleAddSub} className="ft-btn" style={{ width: "100%", padding: "13px", borderRadius: 16, border: "none", background: T.indigo, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: T.fontFamily, boxShadow: "0 4px 14px rgba(79,70,229,0.24)" }}>{t.saveSubscription}</button>
              </div>
            )}
            {subscriptions.length === 0 && !showSubForm && <p style={{ ...T.muted, ...fontStyle, textAlign: "center", margin: "8px 0", fontWeight: 400, fontSize: 13 }}>{t.noSubsYet}</p>}
            {subscriptions.map((sub, i) => {
              const cat = getCat(sub.category);
              return (
                <div key={sub.id} className="ft-sub-row" style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 0", borderTop: i === 0 ? "none" : "1px solid #F1F5F9", borderRadius: 8 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 14, background: cat.pastelBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{cat.icon}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{sub.name}</p>
                    <p style={{ ...T.muted, ...fontStyle, margin: 0, fontSize: 12 }}>{t.dayEachMonth(sub.day)}</p>
                  </div>
                  <span style={{ ...T.mono, fontSize: 14, fontWeight: 600, color: "#EF4444" }}>{fmt(sub.amount)}</span>
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
          { id: "home",      label: t.home,      Icon: Home },
          { id: "analytics", label: t.analytics, Icon: BarChart2 },
          { id: "statement", label: t.statement, Icon: BookOpen },
          { id: "settings",  label: t.settings,  Icon: Settings },
        ].map(({ id, label, Icon }) => {
          const active = tab === id;
          return (
            <button key={id} onClick={() => { setTab(id); setShowForm(false); if (id === "home" || id === "analytics" || id === "statement") setSelectedMonthKey(currentMonth()); }} className="ft-tab-btn" style={{ flex: 1, padding: "11px 4px 16px", border: "none", background: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: active ? T.indigo : "#94A3B8", fontFamily: T.fontFamily, transition: "color 0.18s" }}>
              <div style={{ width: 34, height: 34, borderRadius: 12, background: active ? T.indigoLight : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.18s" }}>
                <Icon size={18} />
              </div>
              <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, letterSpacing: "0.02em", lineHeight: 1.4 }}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}