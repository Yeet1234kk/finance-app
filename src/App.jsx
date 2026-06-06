import { useState, useEffect } from "react";
import { PlusCircle, Wallet, Trash2, Settings, BarChart2, Home, X, Plus, AlertTriangle, Scissors, BookOpen, ChevronDown, ChevronUp, Sparkles, ArrowLeft, ChevronLeft, ChevronRight, TrendingUp, Globe, Download, Pencil, RotateCcw, Bell } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie } from "recharts";

// ─── Translation map ───────────────────────────────────────────────────────────
const TRANSLATIONS = {
  EN: {
    totalSpent:       "Total spent",
    inReview:         (y) => `${y} in Review`,
    allMonths:        "All Months",
    noData:           "No data",
    noExpenses:       "No expenses yet",
    noExpensesMonth:  "No expenses recorded this month",
    addTransaction:   "Add Transaction",
    cancel:           "Cancel",
    newTransaction:   "New Transaction",
    amountTHB:        "Amount (THB)",
    splitBill:        "Split Bill",
    splitSub:         "Deduct reimbursed amount",
    reimbursedAmt:    "Reimbursed Amount",
    category:         "Category",
    noteTags:         "Note + #tags",
    date:             "Date",
    saveTransaction:  "Save Transaction",
    transactions:     "Transactions",
    noTransYet:       "No transactions yet",
    tapToAdd:         'Tap "Add Transaction" to begin',
    spendingByCat:    "Spending by Category",
    topTagsMonth:     "Top Tags This Month",
    addToSeeAnalytics:"Add transactions to see analytics",
    year:             "Year",
    yearTotal:        (y) => `${y} total`,
    backStatements:   "Statements",
    totalSpentLabel:  "Total Spent",
    categories:       "Categories",
    allTransactions:  "All Transactions",
    showAll:          "Show all",
    noTransIn:        (m) => `No transactions in ${m}`,
    tapMonthExplore:  "Tap a Month to Explore",
    monthByMonth:     "Month-by-Month",
    tapBarDrill:      "Tap a bar to drill into that month",
    yearInReview:     "Year in Review",
    yourYear:         (y) => `Your ${y} in Review`,
    totalSpentYear:   "Total Spent This Year",
    monthlyAvg:       "Monthly Avg",
    biggestExpense:   (y) => `Biggest Expense of ${y}`,
    noTxRecorded:     (y) => `No transactions recorded for ${y}`,
    monthlyTrend:     "Monthly Spending Trend",
    noDataFor:        (y) => `No data for ${y}`,
    lightest:         "Lightest ↗",
    heaviest:         "Heaviest ↗",
    spendingByCatLabel: "Spending by Category",
    noCatData:        (y) => `No category data for ${y}`,
    budgetLimits:     "💰 Budget Limits",
    monthlyTotalTHB:  "Monthly total (THB)",
    perCatLimits:     "Per-category limits",
    subscriptions:    "🔄 Subscriptions",
    noSubsYet:        "No subscriptions added yet",
    addSub:           "Add",
    saveSubscription: "Save Subscription",
    billingDay:       "Billing day",
    dayEachMonth:     (d) => `Day ${d} each month`,
    monthlyBudget:    "Monthly Budget",
    used:             "used",
    spent:            "spent",
    of:               "of",
    budgetExceeded:   "Budget exceeded!",
    approachingBudget:"Approaching your budget limit",
    overLimit:        "Over limit!",
    nearLimit:        "Near limit",
    top:              "Top",
    home:             "Home",
    analytics:        "Analytics",
    statement:        "Statement",
    settings:         "Settings",
    now:              "NOW",
    peak:             "PEAK",
    tapToView:        "tap to view ›",
    noNote:           "No note",
    split:            "split",
    auto:             "auto",
    net:              "net",
    notDataFor:       (y) => `No data for ${y}`,
    // categories
    catFood:          "Food & Drink",
    catTransport:     "Transport",
    catShopping:      "Shopping",
    catBills:         "Bills",
    catOther:         "Other",
    catFoodShort:     "Food",
    catTransportShort:"Transport",
    catShoppingShort: "Shopping",
    catBillsShort:    "Bills",
    catOtherShort:    "Other",
    notePlaceholder:  "e.g. lunch #grab #work",
    namePlaceholder:  "Name (e.g. Netflix)",
    amountPlaceholder:"Amount (THB)",
    noLimit:          "No limit",
    validAmount:      "Enter a valid amount.",
    autoAdded:        (n) => `Auto-added ${n} subscription${n > 1 ? "s" : ""} 🔄`,
    transactionCount: (n) => `Transactions · ${n}`,
    txIn:             (m) => `transactions in ${m}`,
    txRecorded:       "transactions recorded",
    summaryLabel:     (m, y) => `${m} ${y} Summary`,
  },
  TH: {
    totalSpent:       "ยอดใช้จ่ายทั้งหมด",
    inReview:         (y) => `สรุปปี ${y}`,
    allMonths:        "เดือนทั้งหมด",
    noData:           "ไม่มีข้อมูล",
    noExpenses:       "ยังไม่มีรายจ่าย",
    noExpensesMonth:  "ไม่มีรายจ่ายในเดือนนี้",
    addTransaction:   "เพิ่มรายการ",
    cancel:           "ยกเลิก",
    newTransaction:   "รายการใหม่",
    amountTHB:        "จำนวนเงิน (บาท)",
    splitBill:        "หารบิล",
    splitSub:         "หักยอดที่ได้รับคืน",
    reimbursedAmt:    "ยอดที่ได้รับคืน",
    category:         "หมวดหมู่",
    noteTags:         "บันทึก + #แท็ก",
    date:             "วันที่",
    saveTransaction:  "บันทึกรายการ",
    transactions:     "รายการ",
    noTransYet:       "ยังไม่มีรายการ",
    tapToAdd:         'กด "เพิ่มรายการ" เพื่อเริ่มต้น',
    spendingByCat:    "ค่าใช้จ่ายตามหมวด",
    topTagsMonth:     "แท็กยอดนิยมเดือนนี้",
    addToSeeAnalytics:"เพิ่มรายการเพื่อดูการวิเคราะห์",
    year:             "ปี",
    yearTotal:        (y) => `รวม ${y}`,
    backStatements:   "รายการ",
    totalSpentLabel:  "ยอดรวม",
    categories:       "หมวดหมู่",
    allTransactions:  "รายการทั้งหมด",
    showAll:          "ดูทั้งหมด",
    noTransIn:        (m) => `ไม่มีรายการใน ${m}`,
    tapMonthExplore:  "แตะเดือนเพื่อดูรายละเอียด",
    monthByMonth:     "รายเดือน",
    tapBarDrill:      "แตะแท่งเพื่อดูรายละเอียด",
    yearInReview:     "สรุปประจำปี",
    yourYear:         (y) => `สรุปปี ${y} ของคุณ`,
    totalSpentYear:   "ยอดใช้จ่ายรวมทั้งปี",
    monthlyAvg:       "เฉลี่ย/เดือน",
    biggestExpense:   (y) => `รายจ่ายสูงสุดปี ${y}`,
    noTxRecorded:     (y) => `ไม่มีรายการในปี ${y}`,
    monthlyTrend:     "แนวโน้มรายจ่ายรายเดือน",
    noDataFor:        (y) => `ไม่มีข้อมูลปี ${y}`,
    lightest:         "น้อยสุด ↗",
    heaviest:         "มากสุด ↗",
    spendingByCatLabel: "ค่าใช้จ่ายตามหมวด",
    noCatData:        (y) => `ไม่มีข้อมูลหมวดหมู่ปี ${y}`,
    budgetLimits:     "💰 วงเงินงบประมาณ",
    monthlyTotalTHB:  "งบรายเดือน (บาท)",
    perCatLimits:     "วงเงินต่อหมวดหมู่",
    subscriptions:    "🔄 ค่าบริการรายเดือน",
    noSubsYet:        "ยังไม่มีค่าบริการ",
    addSub:           "เพิ่ม",
    saveSubscription: "บันทึกค่าบริการ",
    billingDay:       "วันตัดบัญชี",
    dayEachMonth:     (d) => `ตัดทุกวันที่ ${d}`,
    monthlyBudget:    "งบประมาณรายเดือน",
    used:             "ใช้แล้ว",
    spent:            "ใช้ไป",
    of:               "จาก",
    budgetExceeded:   "เกินงบประมาณ!",
    approachingBudget:"ใกล้ถึงวงเงินงบประมาณ",
    overLimit:        "เกินวงเงิน!",
    nearLimit:        "ใกล้วงเงิน",
    top:              "อันดับ 1",
    home:             "หน้าหลัก",
    analytics:        "วิเคราะห์",
    statement:        "รายการ",
    settings:         "ตั้งค่า",
    now:              "ตอนนี้",
    peak:             "สูงสุด",
    tapToView:        "แตะเพื่อดู ›",
    noNote:           "ไม่มีบันทึก",
    split:            "หาร",
    auto:             "อัตโนมัติ",
    net:              "สุทธิ",
    notDataFor:       (y) => `ไม่มีข้อมูลปี ${y}`,
    // categories
    catFood:          "อาหาร & เครื่องดื่ม",
    catTransport:     "เดินทาง",
    catShopping:      "ช้อปปิ้ง",
    catBills:         "บิล/ค่าใช้จ่าย",
    catOther:         "อื่นๆ",
    catFoodShort:     "อาหาร",
    catTransportShort:"เดินทาง",
    catShoppingShort: "ช้อปปิ้ง",
    catBillsShort:    "บิล",
    catOtherShort:    "อื่นๆ",
    notePlaceholder:  "เช่น อาหารกลางวัน #grab #งาน",
    namePlaceholder:  "ชื่อ (เช่น Netflix)",
    amountPlaceholder:"จำนวนเงิน (บาท)",
    noLimit:          "ไม่จำกัด",
    validAmount:      "กรุณาใส่จำนวนเงินที่ถูกต้อง",
    autoAdded:        (n) => `เพิ่มอัตโนมัติ ${n} รายการ 🔄`,
    transactionCount: (n) => `รายการ · ${n}`,
    txIn:             (m) => `รายการใน ${m}`,
    txRecorded:       "รายการที่บันทึกไว้",
    summaryLabel:     (m, y) => `สรุป ${m} ${y}`,
  },
};

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTH_NAMES    = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_NAMES_TH = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];

const CATEGORIES_BASE = [
  { value: "Food",      pastelBg: "#FFF8F0", pastelText: "#C2410C", bar: "#FB923C", icon: "🍜" },
  { value: "Transport", pastelBg: "#EFF6FF", pastelText: "#1D4ED8", bar: "#60A5FA", icon: "🚇" },
  { value: "Shopping",  pastelBg: "#F5F3FF", pastelText: "#6D28D9", bar: "#A78BFA", icon: "🛍️" },
  { value: "Bills",     pastelBg: "#FEFCE8", pastelText: "#A16207", bar: "#FACC15", icon: "⚡" },
  { value: "Other",     pastelBg: "#F8FAFC", pastelText: "#475569", bar: "#94A3B8", icon: "📦" },
];

const getCategoriesForLang = (lang) => {
  const t = TRANSLATIONS[lang];
  return [
    { ...CATEGORIES_BASE[0], label: t.catFood,     labelShort: t.catFoodShort },
    { ...CATEGORIES_BASE[1], label: t.catTransport, labelShort: t.catTransportShort },
    { ...CATEGORIES_BASE[2], label: t.catShopping,  labelShort: t.catShoppingShort },
    { ...CATEGORIES_BASE[3], label: t.catBills,     labelShort: t.catBillsShort },
    { ...CATEGORIES_BASE[4], label: t.catOther,     labelShort: t.catOtherShort },
  ];
};

const INCOME_CATEGORIES = [
  { value: "Salary",     label: "Salary",       labelShort: "Salary",     icon: "💼", pastelBg: "#F0FDF4", pastelText: "#15803D", bar: "#22C55E" },
  { value: "Gift",       label: "Gift",          labelShort: "Gift",       icon: "🎁", pastelBg: "#FFF0F6", pastelText: "#BE185D", bar: "#EC4899" },
  { value: "Investment", label: "Investment",    labelShort: "Invest",     icon: "📈", pastelBg: "#EFF6FF", pastelText: "#1D4ED8", bar: "#3B82F6" },
  { value: "Freelance",  label: "Freelance",     labelShort: "Freelance",  icon: "💻", pastelBg: "#F5F3FF", pastelText: "#6D28D9", bar: "#8B5CF6" },
  { value: "OtherIncome",label: "Other Income",  labelShort: "Other",      icon: "💵", pastelBg: "#F8FAFC", pastelText: "#475569", bar: "#94A3B8" },
];

const getIncomeCategoriesForLang = (lang) => {
  if (lang === "TH") {
    return [
      { ...INCOME_CATEGORIES[0], label: "เงินเดือน",    labelShort: "เงินเดือน" },
      { ...INCOME_CATEGORIES[1], label: "ของขวัญ",      labelShort: "ของขวัญ" },
      { ...INCOME_CATEGORIES[2], label: "การลงทุน",     labelShort: "ลงทุน" },
      { ...INCOME_CATEGORIES[3], label: "ฟรีแลนซ์",     labelShort: "ฟรีแลนซ์" },
      { ...INCOME_CATEGORIES[4], label: "รายได้อื่นๆ",  labelShort: "อื่นๆ" },
    ];
  }
  return INCOME_CATEGORIES;
};

const getIncomeCategory = (val, lang = "EN") =>
  getIncomeCategoriesForLang(lang).find((c) => c.value === val) || null;

const getCat       = (val, lang = "EN") => getCategoriesForLang(lang).find((c) => c.value === val) || getCategoriesForLang(lang)[4];
const todayStr     = () => new Date().toISOString().slice(0, 10);
const currentMonth = () => new Date().toISOString().slice(0, 7);
const todayDay     = () => new Date().getDate();
const fmt          = (n) => new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(n);
const fmtDate      = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
const extractTags  = (note) => (note.match(/#\w+/g) || []).map((t) => t.toLowerCase());
const monthKey     = (y, m) => `${y}-${String(m + 1).padStart(2, "0")}`;

const getMonthName = (idx, lang) => lang === "TH" ? MONTH_NAMES_TH[idx] : MONTH_NAMES[idx];

const budgetColor = (pct) => {
  if (pct >= 0.95) return { bar: "#EF4444", text: "#DC2626", track: "#FEE2E2" };
  if (pct >= 0.75) return { bar: "#F59E0B", text: "#D97706", track: "#FEF3C7" };
  return { bar: "#10B981", text: "#059669", track: "#D1FAE5" };
};

const lsGet = (k, def) => { try { if (typeof window === "undefined") return def; const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } };
const lsSet = (k, v)   => { try { if (typeof window === "undefined") return; localStorage.setItem(k, JSON.stringify(v)); } catch {} };

// ─── Style tokens ──────────────────────────────────────────────────────────────
const FONT_FAMILY = "'IBM Plex Sans Thai', 'Kanit', -apple-system, sans-serif";
const MONO_FAMILY = "'IBM Plex Mono', 'DM Mono', monospace";

const T = {
  pageBg:     "#F8F7F4",
  card:       { background: "#FFFFFF", borderRadius: 24, boxShadow: "0 4px 24px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)" },
  h1:         { fontSize: 40, fontWeight: 600, letterSpacing: "-1.5px", color: "#0F172A", fontFamily: FONT_FAMILY, lineHeight: 1.1 },
  h2:         { fontSize: 16, fontWeight: 600, color: "#0F172A", fontFamily: FONT_FAMILY },
  label:      { fontSize: 11, fontWeight: 500, color: "#64748B", letterSpacing: "0.06em", textTransform: "uppercase" },
  muted:      { fontSize: 13, color: "#94A3B8", lineHeight: 1.6 },
  mono:       { fontFamily: MONO_FAMILY },
  indigo:     "#4F46E5",
  indigoLight:"#EEF2FF",
  input:      { width: "100%", padding: "13px 16px", borderRadius: 14, border: "1.5px solid #E2E8F0", fontSize: 14, color: "#0F172A", fontFamily: FONT_FAMILY, background: "#FFFFFF", outline: "none", boxSizing: "border-box", lineHeight: 1.6 },
};

// ─── Thai-aware body text style ───────────────────────────────────────────────
const thaiBody = { fontFamily: FONT_FAMILY, lineHeight: 1.7, letterSpacing: "0.01em" };
const thaiHeader = { fontFamily: FONT_FAMILY, lineHeight: 1.5, letterSpacing: "0.02em", fontWeight: 600 };

// ─── YearlySummary (top-level, so hooks are never called conditionally) ────────
function YearlySummary({ transactions, language, yearlyYear, setYearlyYear, setShowYearlySummary, computeYearlyData, t }) {
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedCat,   setSelectedCat]   = useState(null);

  const { totalSpent, monthlyAvg, biggestTx, catTotalsYear, monthlyTrend } = computeYearlyData(yearlyYear);
  const currentYr  = new Date().getFullYear();
  const yearOptions = [currentYr - 1, currentYr, currentYr + 1].filter((y) => y >= 2024);
  const CATEGORIES  = getCategoriesForLang(language);
  const donutData   = CATEGORIES.map((cat) => ({ name: cat.label, value: catTotalsYear[cat.value] || 0, cat })).filter((d) => d.value > 0);

  const AreaTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: "#0F172A", padding: "8px 14px", borderRadius: 12 }}>
        <p style={{ margin: 0, fontSize: 11, color: "#94A3B8", fontWeight: 500, fontFamily: FONT_FAMILY }}>{label}</p>
        <p style={{ margin: "2px 0 0", fontSize: 14, color: "#F8FAFC", fontWeight: 600, fontFamily: MONO_FAMILY }}>{fmt(payload[0].value)}</p>
      </div>
    );
  };

  // ── Month detail view ──
  if (selectedMonth !== null) {
    const mIdx = selectedMonth;
    const mKey = monthKey(yearlyYear, mIdx);
    const mName = `${getMonthName(mIdx, language)} ${yearlyYear}`;
    const mTxns = transactions.filter((tx) => tx.date.startsWith(mKey)).sort((a, b) => new Date(b.date) - new Date(a.date));
    const mTotal = mTxns.reduce((s, tx) => s + tx.amount, 0);
    const mCatTotals = {};
    mTxns.forEach((tx) => { mCatTotals[tx.category] = (mCatTotals[tx.category] || 0) + tx.amount; });
    const mCatSorted = Object.entries(mCatTotals).sort((a, b) => b[1] - a[1]);
    const visibleTxns = selectedCat ? mTxns.filter((tx) => tx.category === selectedCat) : mTxns;
    const activeCat = selectedCat ? getCat(selectedCat, language) : null;
    const goPrev = () => { setSelectedCat(null); setSelectedMonth((m) => m > 0 ? m - 1 : m); };
    const goNext = () => { setSelectedCat(null); setSelectedMonth((m) => m < 11 ? m + 1 : m); };

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 210, background: "#F8F7F4", overflowY: "auto", fontFamily: FONT_FAMILY }}>
          <div style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(248,247,244,0.94)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(226,232,240,0.6)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => { setSelectedMonth(null); setSelectedCat(null); }} style={{ display: "flex", alignItems: "center", gap: 6, background: "#FFFFFF", border: "none", cursor: "pointer", padding: "8px 16px", borderRadius: 99, fontFamily: FONT_FAMILY, fontSize: 13, fontWeight: 600, color: "#334155", boxShadow: "0 2px 8px rgba(15,23,42,0.08)", flexShrink: 0 }}>
              <ArrowLeft size={14} /> {yearlyYear}
            </button>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <button onClick={goPrev} disabled={mIdx === 0} style={{ background: mIdx === 0 ? "#F1F5F9" : "#FFFFFF", border: "none", cursor: mIdx === 0 ? "default" : "pointer", width: 34, height: 34, borderRadius: 99, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: mIdx === 0 ? "none" : "0 2px 8px rgba(15,23,42,0.08)", color: mIdx === 0 ? "#CBD5E1" : "#334155" }}>
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: 15, fontWeight: 600, color: "#0F172A", minWidth: 110, textAlign: "center", fontFamily: FONT_FAMILY }}>{mName}</span>
              <button onClick={goNext} disabled={mIdx === 11} style={{ background: mIdx === 11 ? "#F1F5F9" : "#FFFFFF", border: "none", cursor: mIdx === 11 ? "default" : "pointer", width: 34, height: 34, borderRadius: 99, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: mIdx === 11 ? "none" : "0 2px 8px rgba(15,23,42,0.08)", color: mIdx === 11 ? "#CBD5E1" : "#334155" }}>
                <ChevronRight size={16} />
              </button>
            </div>
            <div style={{ width: 80, flexShrink: 0 }} />
          </div>
          <div style={{ maxWidth: 430, margin: "0 auto", padding: "0 16px 48px" }}>
            <div style={{ padding: "28px 4px 16px" }}>
              <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 500, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: FONT_FAMILY }}>{t.totalSpentLabel}</p>
              <p style={{ margin: 0, fontSize: 40, fontWeight: 600, letterSpacing: "-1.5px", color: "#0F172A", lineHeight: 1.1, fontFamily: FONT_FAMILY }}>{fmt(mTotal)}</p>
              <p style={{ margin: "8px 0 0", fontSize: 13, color: "#94A3B8", fontWeight: 400, fontFamily: FONT_FAMILY, lineHeight: 1.6 }}>{mTxns.length} {t.txIn(mName)}</p>
            </div>
            {mTxns.length === 0 ? (
              <div style={{ ...T.card, padding: "40px 24px", textAlign: "center" }}>
                <p style={{ ...T.muted, margin: 0, fontFamily: FONT_FAMILY }}>{t.noTransIn(mName)}</p>
              </div>
            ) : (
              <>
                <p style={{ ...T.label, margin: "0 0 10px", paddingLeft: 4, fontFamily: FONT_FAMILY }}>{t.categories}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                  {mCatSorted.map(([catVal, amt]) => {
                    const cat = getCat(catVal, language);
                    const pct = mTotal > 0 ? amt / mTotal : 0;
                    const isActive = selectedCat === catVal;
                    const catTxCount = mTxns.filter((tx) => tx.category === catVal).length;
                    return (
                      <button key={catVal} onClick={() => setSelectedCat(isActive ? null : catVal)} style={{ width: "100%", border: "none", fontFamily: FONT_FAMILY, cursor: "pointer", textAlign: "left", padding: "16px 20px", borderRadius: 20, background: isActive ? cat.pastelBg : "#FFFFFF", outline: isActive ? `2px solid ${cat.bar}` : "2px solid transparent", boxShadow: isActive ? `0 6px 24px ${cat.bar}30` : "0 2px 12px rgba(15,23,42,0.06)", transition: "all 0.18s" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                          <div style={{ width: 42, height: 42, borderRadius: 14, flexShrink: 0, background: isActive ? "#FFFFFF" : cat.pastelBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{cat.icon}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                              <span style={{ fontSize: 14, fontWeight: 600, color: isActive ? cat.pastelText : "#0F172A", fontFamily: FONT_FAMILY }}>{cat.label}</span>
                              <span style={{ fontFamily: MONO_FAMILY, fontSize: 15, fontWeight: 600, color: isActive ? cat.pastelText : "#0F172A" }}>{fmt(amt)}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
                              <span style={{ fontSize: 11, color: isActive ? cat.pastelText : "#94A3B8", fontWeight: 400, fontFamily: FONT_FAMILY, lineHeight: 1.6 }}>{catTxCount} {t.transactions}</span>
                              <span style={{ fontSize: 12, fontWeight: 600, color: isActive ? cat.pastelText : "#94A3B8", fontFamily: FONT_FAMILY }}>{(pct * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ height: 5, background: isActive ? `${cat.bar}30` : "#F1F5F9", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct * 100}%`, background: cat.bar, borderRadius: 99, transition: "width 0.45s cubic-bezier(0.34,1.56,0.64,1)" }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, paddingLeft: 4 }}>
                  <p style={{ ...T.label, margin: 0, fontFamily: FONT_FAMILY }}>{selectedCat ? `${activeCat.icon} ${activeCat.label}` : t.allTransactions} · {visibleTxns.length}</p>
                  {selectedCat && (
                    <button onClick={() => setSelectedCat(null)} style={{ display: "flex", alignItems: "center", gap: 5, background: "#F1F5F9", border: "none", cursor: "pointer", padding: "5px 12px", borderRadius: 99, fontFamily: FONT_FAMILY, fontSize: 11, fontWeight: 600, color: "#64748B" }}>
                      <X size={11} /> {t.showAll}
                    </button>
                  )}
                </div>
                {selectedCat && (
                  <div style={{ padding: "14px 20px", borderRadius: 16, marginBottom: 12, background: activeCat.pastelBg, border: `1.5px solid ${activeCat.bar}40` }}>
                    <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 500, color: activeCat.pastelText, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.7, fontFamily: FONT_FAMILY }}>{activeCat.label}</p>
                    <p style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: "-1px", color: activeCat.pastelText, fontFamily: MONO_FAMILY }}>{fmt(mCatTotals[selectedCat])}</p>
                  </div>
                )}
                {visibleTxns.map((tx) => {
                  const cat = getCat(tx.category, language);
                  const tags = extractTags(tx.note);
                  return (
                    <div key={tx.id} style={{ ...T.card, padding: "14px 18px", marginBottom: 9, display: "flex", alignItems: "center", gap: 13 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 14, background: cat.pastelBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{cat.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", fontFamily: FONT_FAMILY }}>{cat.label}</span>
                          {tx.split && <span style={{ fontSize: 10, fontWeight: 600, background: "#EEF2FF", color: T.indigo, padding: "1px 6px", borderRadius: 5, fontFamily: FONT_FAMILY }}>{t.split}</span>}
                          {tx.recurringId && <span style={{ fontSize: 10, fontWeight: 600, background: "#FEFCE8", color: "#A16207", padding: "1px 6px", borderRadius: 5, fontFamily: FONT_FAMILY }}>{t.auto}</span>}
                        </div>
                        <p style={{ ...T.muted, margin: "2px 0 0", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: FONT_FAMILY }}>{tx.note || t.noNote} · {fmtDate(tx.date)}</p>
                        {tags.length > 0 && <div style={{ display: "flex", gap: 3, marginTop: 4, flexWrap: "wrap" }}>{tags.map((tag) => <span key={tag} style={{ fontSize: 10, fontWeight: 600, background: "#EEF2FF", color: "#6366F1", padding: "1px 7px", borderRadius: 99, fontFamily: FONT_FAMILY }}>{tag}</span>)}</div>}
                      </div>
                      <span style={{ fontFamily: MONO_FAMILY, fontSize: 14, fontWeight: 600, color: "#EF4444", flexShrink: 0 }}>−{fmt(tx.amount)}</span>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
    );
  }

  // ── Main year overview ──
  return (
      <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "#F8F7F4", overflowY: "auto", fontFamily: FONT_FAMILY }}>
        <div style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(248,247,244,0.92)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(226,232,240,0.6)", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={() => setShowYearlySummary(false)} style={{ display: "flex", alignItems: "center", gap: 7, background: "#FFFFFF", border: "none", cursor: "pointer", padding: "8px 16px", borderRadius: 99, fontFamily: FONT_FAMILY, fontSize: 13, fontWeight: 600, color: "#334155", boxShadow: "0 2px 8px rgba(15,23,42,0.08)" }}>
            <ArrowLeft size={14} /> Dashboard
          </button>
          <div style={{ display: "flex", gap: 4, background: "#FFFFFF", padding: 4, borderRadius: 99, boxShadow: "0 2px 8px rgba(15,23,42,0.08)" }}>
            {yearOptions.map((y) => (
              <button key={y} onClick={() => setYearlyYear(y)} style={{ padding: "6px 14px", borderRadius: 99, border: "none", cursor: "pointer", fontFamily: FONT_FAMILY, fontSize: 13, fontWeight: 600, background: yearlyYear === y ? "#0F172A" : "transparent", color: yearlyYear === y ? "#FFFFFF" : "#64748B", transition: "all 0.18s" }}>{y}</button>
            ))}
          </div>
        </div>
        <div style={{ maxWidth: 430, margin: "0 auto", padding: "0 16px 48px" }}>
          <div style={{ padding: "32px 4px 24px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, marginBottom: 8, padding: "5px 12px", background: "#EEF2FF", borderRadius: 99 }}>
              <Sparkles size={13} color="#4F46E5" />
              <span style={{ fontSize: 11, fontWeight: 600, color: "#4F46E5", letterSpacing: "0.05em", textTransform: "uppercase", fontFamily: FONT_FAMILY }}>{t.yearInReview}</span>
            </div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, color: "#0F172A", letterSpacing: "-0.5px", lineHeight: 1.3, fontFamily: FONT_FAMILY }}>{t.yourYear(yearlyYear)}</h1>
          </div>
          <div style={{ ...T.card, padding: "26px 26px", marginBottom: 12, background: "#0F172A" }}>
            <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 500, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: FONT_FAMILY }}>{t.totalSpentYear}</p>
            <p style={{ margin: "0 0 16px", fontSize: 38, fontWeight: 600, letterSpacing: "-1.5px", color: "#F8FAFC", fontFamily: FONT_FAMILY, lineHeight: 1.1 }}>{fmt(totalSpent)}</p>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1, padding: "12px 14px", background: "rgba(255,255,255,0.07)", borderRadius: 14 }}>
                <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 500, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: FONT_FAMILY }}>{t.monthlyAvg}</p>
                <p style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "#F8FAFC", fontFamily: MONO_FAMILY }}>{fmt(monthlyAvg)}</p>
              </div>
              <div style={{ flex: 1, padding: "12px 14px", background: "rgba(255,255,255,0.07)", borderRadius: 14 }}>
                <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 500, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: FONT_FAMILY }}>{t.transactions}</p>
                <p style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "#F8FAFC", fontFamily: MONO_FAMILY }}>{computeYearlyData(yearlyYear).yearTxns.length}</p>
              </div>
            </div>
          </div>
          {biggestTx ? (
            <div style={{ ...T.card, padding: "20px 22px", marginBottom: 12, background: "#EEF2FF" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: 9, background: "#C7D2FE", display: "flex", alignItems: "center", justifyContent: "center" }}><TrendingUp size={14} color="#4338CA" /></div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "#4338CA", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: FONT_FAMILY }}>{t.biggestExpense(yearlyYear)}</p>
              </div>
              <p style={{ margin: "0 0 4px", fontSize: 30, fontWeight: 600, color: "#312E81", letterSpacing: "-1px", fontFamily: MONO_FAMILY }}>{fmt(biggestTx.amount)}</p>
              <p style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 500, color: "#4338CA", fontFamily: FONT_FAMILY, lineHeight: 1.6 }}>{biggestTx.note || getCat(biggestTx.category, language).label}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: "#C7D2FE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>{getCat(biggestTx.category, language).icon}</div>
                <span style={{ fontSize: 12, fontWeight: 500, color: "#6366F1", fontFamily: FONT_FAMILY }}>{getCat(biggestTx.category, language).label} · {fmtDate(biggestTx.date)}</span>
              </div>
            </div>
          ) : (
            <div style={{ ...T.card, padding: "20px 22px", marginBottom: 12, background: "#EEF2FF", textAlign: "center" }}>
              <p style={{ margin: 0, color: "#6366F1", fontWeight: 500, fontSize: 14, fontFamily: FONT_FAMILY }}>{t.noTxRecorded(yearlyYear)}</p>
            </div>
          )}
          <div style={{ ...T.card, padding: "20px 22px", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
              <BarChart2 size={15} color="#4F46E5" />
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#0F172A", fontFamily: FONT_FAMILY }}>{t.monthlyTrend}</p>
            </div>
            {totalSpent > 0 ? (
              <ResponsiveContainer width="100%" height={150}>
                <AreaChart data={monthlyTrend} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="yearGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 500, fill: "#94A3B8", fontFamily: FONT_FAMILY }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<AreaTooltip />} />
                  <Area type="monotone" dataKey="total" stroke="#4F46E5" strokeWidth={2} fill="url(#yearGrad)" dot={{ r: 3, fill: "#4F46E5", strokeWidth: 0 }} activeDot={{ r: 5, fill: "#4F46E5", strokeWidth: 0, cursor: "pointer", onClick: (_, payload) => { if (payload?.index !== undefined) setSelectedMonth(payload.index); } }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 150, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p style={{ ...T.muted, fontSize: 13, fontFamily: FONT_FAMILY }}>{t.noDataFor(yearlyYear)}</p>
              </div>
            )}
            {totalSpent > 0 && (() => {
              const activeMths = monthlyTrend.filter((m) => m.total > 0);
              if (activeMths.length < 2) return null;
              const best  = activeMths.reduce((min, m) => m.total < min.total ? m : min, activeMths[0]);
              const worst = activeMths.reduce((max, m) => m.total > max.total ? m : max, activeMths[0]);
              return (
                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  <div onClick={() => setSelectedMonth(best.monthIdx)} style={{ flex: 1, padding: "10px 14px", background: "#F0FDF4", borderRadius: 12, cursor: "pointer" }}>
                    <p style={{ margin: "0 0 2px", fontSize: 10, fontWeight: 600, color: "#15803D", textTransform: "uppercase", fontFamily: FONT_FAMILY }}>{t.lightest}</p>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#166534", fontFamily: MONO_FAMILY }}>{best.name} · {fmt(best.total)}</p>
                  </div>
                  <div onClick={() => setSelectedMonth(worst.monthIdx)} style={{ flex: 1, padding: "10px 14px", background: "#FFF1F2", borderRadius: 12, cursor: "pointer" }}>
                    <p style={{ margin: "0 0 2px", fontSize: 10, fontWeight: 600, color: "#BE123C", textTransform: "uppercase", fontFamily: FONT_FAMILY }}>{t.heaviest}</p>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#9F1239", fontFamily: MONO_FAMILY }}>{worst.name} · {fmt(worst.total)}</p>
                  </div>
                </div>
              );
            })()}
          </div>
          <div style={{ ...T.card, padding: "20px 22px", marginBottom: 12 }}>
            <p style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "#0F172A", fontFamily: FONT_FAMILY }}>{t.spendingByCatLabel}</p>
            {donutData.length > 0 ? (
              <>
                <div style={{ position: "relative", height: 170 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={donutData} cx="50%" cy="50%" innerRadius={50} outerRadius={76} paddingAngle={3} dataKey="value" strokeWidth={0}>
                        {donutData.map((entry, i) => <Cell key={i} fill={entry.cat.bar} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center", pointerEvents: "none" }}>
                    <p style={{ margin: 0, fontSize: 9, fontWeight: 500, color: "#94A3B8", textTransform: "uppercase", fontFamily: FONT_FAMILY }}>Total</p>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#0F172A", fontFamily: MONO_FAMILY }}>{fmt(totalSpent)}</p>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 6 }}>
                  {donutData.sort((a, b) => b.value - a.value).map((d) => {
                    const pct = totalSpent > 0 ? (d.value / totalSpent * 100).toFixed(1) : 0;
                    return (
                      <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 9, height: 9, borderRadius: 3, background: d.cat.bar, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 400, color: "#334155", flex: 1, fontFamily: FONT_FAMILY }}>{d.cat.icon} {d.name}</span>
                        <span style={{ fontSize: 12, color: "#94A3B8", fontWeight: 400, fontFamily: FONT_FAMILY }}>{pct}%</span>
                        <span style={{ fontFamily: MONO_FAMILY, fontSize: 13, fontWeight: 600, color: "#0F172A", minWidth: 72, textAlign: "right" }}>{fmt(d.value)}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div style={{ height: 110, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p style={{ ...T.muted, fontSize: 13, fontFamily: FONT_FAMILY }}>{t.noCatData(yearlyYear)}</p>
              </div>
            )}
          </div>
          <p style={{ ...T.label, margin: "0 0 10px", paddingLeft: 4, fontFamily: FONT_FAMILY }}>{t.tapMonthExplore}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7, marginBottom: 12 }}>
            {monthlyTrend.map(({ name, total, monthIdx }) => {
              const hasData = total > 0;
              const isCurrentMo = monthKey(yearlyYear, monthIdx) === currentMonth();
              const isMax = total > 0 && total === Math.max(...monthlyTrend.map((m) => m.total));
              return (
                <button key={monthIdx} onClick={() => hasData && setSelectedMonth(monthIdx)} style={{ ...T.card, padding: "12px 14px", border: "none", fontFamily: FONT_FAMILY, cursor: hasData ? "pointer" : "default", textAlign: "left", background: isMax ? "#EEF2FF" : "#FFFFFF", outline: isCurrentMo ? `2px solid ${T.indigo}` : "none", opacity: hasData ? 1 : 0.45, transition: "transform 0.15s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 5 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: isMax ? T.indigo : isCurrentMo ? T.indigo : "#0F172A", fontFamily: FONT_FAMILY }}>{name}</span>
                    {isCurrentMo && <span style={{ fontSize: 8, fontWeight: 600, background: T.indigoLight, color: T.indigo, padding: "2px 5px", borderRadius: 99, fontFamily: FONT_FAMILY }}>{t.now}</span>}
                    {isMax && !isCurrentMo && <span style={{ fontSize: 8, fontWeight: 600, background: "#EEF2FF", color: T.indigo, padding: "2px 5px", borderRadius: 99, fontFamily: FONT_FAMILY }}>{t.peak}</span>}
                  </div>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "#0F172A", fontFamily: MONO_FAMILY }}>{hasData ? fmt(total) : "—"}</p>
                  {hasData && <p style={{ margin: "3px 0 0", fontSize: 9, color: "#94A3B8", fontWeight: 400, fontFamily: FONT_FAMILY }}>{t.tapToView}</p>}
                </button>
              );
            })}
          </div>
          <div style={{ ...T.card, padding: "20px 22px", marginBottom: 12 }}>
            <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: "#0F172A", fontFamily: FONT_FAMILY }}>{t.monthByMonth}</p>
            <p style={{ margin: "0 0 14px", fontSize: 11, color: "#94A3B8", fontWeight: 400, fontFamily: FONT_FAMILY }}>{t.tapBarDrill}</p>
            {totalSpent > 0 ? (
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={monthlyTrend} margin={{ top: 4, right: 0, left: 0, bottom: 0 }} barSize={16}
                  onClick={(data) => { if (data?.activePayload?.[0]?.payload?.total > 0) setSelectedMonth(data.activePayload[0].payload.monthIdx); }}>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 500, fill: "#94A3B8", fontFamily: FONT_FAMILY }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<AreaTooltip />} cursor={{ fill: "rgba(79,70,229,0.06)", radius: 8 }} />
                  <Bar dataKey="total" radius={[5, 5, 2, 2]}>
                    {monthlyTrend.map((entry, i) => {
                      const isMax = entry.total === Math.max(...monthlyTrend.map((m) => m.total)) && entry.total > 0;
                      const isCurrentMo = monthKey(yearlyYear, i) === currentMonth();
                      return <Cell key={i} fill={isMax ? "#4F46E5" : isCurrentMo ? "#818CF8" : "#C7D2FE"} style={{ cursor: entry.total > 0 ? "pointer" : "default" }} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 90, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p style={{ ...T.muted, fontSize: 13, fontFamily: FONT_FAMILY }}>{t.noData}</p>
              </div>
            )}
          </div>
        </div>
      </div>
  );
}

// ─── Static helper components (must be top-level to avoid remount on every render) ─
const SectionLabel = ({ children, style: s = {} }) => (
  <p style={{ ...T.label, margin: "0 0 14px", paddingLeft: 4, ...s }}>{children}</p>
);
const CardWrap = ({ children, style: s = {} }) => (
  <div style={{ ...T.card, padding: "20px 22px", marginBottom: 12, ...s }}>{children}</div>
);
function LangToggle({ language, setLanguage }) {
  return (
    <button
      onClick={() => setLanguage((l) => l === "EN" ? "TH" : "EN")}
      style={{
        display: "flex", alignItems: "center", gap: 5,
        background: "#FFFFFF", border: "1.5px solid #E2E8F0",
        cursor: "pointer", padding: "6px 12px", borderRadius: 99,
        fontFamily: FONT_FAMILY, fontSize: 12, fontWeight: 600,
        color: "#475569", boxShadow: "0 1px 4px rgba(15,23,42,0.07)",
        transition: "all 0.18s",
      }}
    >
      <Globe size={13} color="#4F46E5" />
      <span style={{ color: language === "EN" ? T.indigo : "#94A3B8", fontWeight: language === "EN" ? 700 : 500 }}>EN</span>
      <span style={{ color: "#CBD5E1" }}>/</span>
      <span style={{ color: language === "TH" ? T.indigo : "#94A3B8", fontWeight: language === "TH" ? 700 : 500 }}>TH</span>
    </button>
  );
}

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
  const [language,      setLanguage]      = useState(() => lsGet("ft_lang", "EN"));
  const [formTxType,    setFormTxType]    = useState(() => lsGet("ft_last_type", "expense"));
  const [formPrefilledMonth, setFormPrefilledMonth] = useState(null); // "YYYY-MM" or null

  // NEW: Edit transaction
  const [editingTx,     setEditingTx]     = useState(null); // tx object being edited

  // NEW: Undo delete
  const [undoStack,     setUndoStack]     = useState([]); // [{tx, idx}]
  const [undoToast,     setUndoToast]     = useState(null); // {tx, timeoutId}

  // NEW: Swipe-to-delete state (touch tracking)
  const [swipeState,    setSwipeState]    = useState({}); // {[txId]: offsetX}

  // NEW: Search
  const [searchQuery,   setSearchQuery]   = useState("");
  const [showSearch,    setShowSearch]    = useState(false);

  // NEW: Budget alerts (dismissed per month)
  const [dismissedAlerts, setDismissedAlerts] = useState(() => lsGet("ft_dismissed_alerts", {}));

  // Statement state
  const [stmtYear,      setStmtYear]      = useState(new Date().getFullYear());
  const [openMonth,     setOpenMonth]     = useState(null);
  const [stmtCat,       setStmtCat]       = useState(null); // category filter inside openMonth detail
  const [activeDetailMonth, setActiveDetailMonth] = useState(null);
  const [detailCat,     setDetailCat]     = useState(null);

  // Yearly Summary state
  const [showYearlySummary, setShowYearlySummary] = useState(false);
  const [yearlyYear,        setYearlyYear]         = useState(new Date().getFullYear());

  const t = TRANSLATIONS[language];
  const CATEGORIES = getCategoriesForLang(language);
  const INCOME_CATS = getIncomeCategoriesForLang(language);

  const blankForm = { amount: "", reimbursed: "", split: false, category: "Food", note: "", date: todayStr() };
  const [form,    setForm]    = useState(blankForm);
  const blankSub  = { name: "", amount: "", category: "Bills", day: "1" };
  const [subForm, setSubForm] = useState(blankSub);

  useEffect(() => lsSet("ft_txns",    transactions),  [transactions]);
  useEffect(() => lsSet("ft_subs",    subscriptions), [subscriptions]);
  useEffect(() => lsSet("ft_budgets", budgets),       [budgets]);
  useEffect(() => lsSet("ft_lang",    language),      [language]);
  useEffect(() => lsSet("ft_dismissed_alerts", dismissedAlerts), [dismissedAlerts]);

  useEffect(() => {
    if (!subscriptions.length) return;
    const day = todayDay(), month = currentMonth(), injected = [];
    subscriptions.forEach((sub) => {
      if (parseInt(sub.day) !== day) return;
      const already = transactions.some((tx) => tx.recurringId === sub.id && tx.date.startsWith(month));
      if (!already) injected.push({ id: Date.now() + Math.random(), amount: parseFloat(sub.amount), category: sub.category, note: sub.name + " (auto)", date: todayStr(), recurringId: sub.id });
    });
    if (injected.length) { setTransactions((p) => [...injected, ...p]); showToast(t.autoAdded(injected.length)); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const month        = currentMonth();
  const monthTxns    = transactions.filter((tx) => tx.date.startsWith(month));
  const monthlyTotal = monthTxns.filter((tx) => tx.type !== "income").reduce((s, tx) => s + tx.amount, 0);
  const totalBudget  = parseFloat(budgets.total) || 0;
  const budgetPct    = totalBudget > 0 ? Math.min(monthlyTotal / totalBudget, 1) : 0;
  const bc           = budgetColor(budgetPct);
  const catTotals    = {};
  monthTxns.filter((tx) => tx.type !== "income").forEach((tx) => { catTotals[tx.category] = (catTotals[tx.category] || 0) + tx.amount; });
  const topCat    = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
  const tagTotals = {};
  monthTxns.forEach((tx) => { extractTags(tx.note).forEach((tag) => { tagTotals[tag] = (tagTotals[tag] || 0) + tx.amount; }); });
  const topTags   = Object.entries(tagTotals).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxTagAmt = topTags[0]?.[1] || 1;

  const yearMonthData = Array.from({ length: 12 }, (_, i) => {
    const key  = monthKey(stmtYear, i);
    const txns = transactions.filter((tx) => tx.date.startsWith(key));
    const expenseTxns = txns.filter((tx) => tx.type !== "income");
    const incomeTxns  = txns.filter((tx) => tx.type === "income");
    const total       = expenseTxns.reduce((s, tx) => s + tx.amount, 0);
    const incomeTotal = incomeTxns.reduce((s, tx) => s + tx.amount, 0);
    return { name: getMonthName(i, language), key, txns, total, incomeTotal, monthIdx: i };
  });
  const yearTotal    = yearMonthData.reduce((s, m) => s + m.total, 0);
  const maxMonthAmt  = Math.max(...yearMonthData.map((m) => m.total), 1);
  const availableYears = [...new Set(transactions.map((tx) => tx.date.slice(0, 4)))].sort((a, b) => b - a);
  if (!availableYears.includes(String(stmtYear))) availableYears.push(String(stmtYear));
  availableYears.sort((a, b) => b - a);

  const netAmount = () => { const a = parseFloat(form.amount)||0, r = parseFloat(form.reimbursed)||0; return form.split ? Math.max(a-r,0) : a; };

  const openEditForm = (tx) => {
    setEditingTx(tx);
    setFormTxType(tx.type || "expense");
    setForm({
      amount: String(tx.originalAmount || tx.amount),
      reimbursed: String(tx.reimbursed || ""),
      split: tx.split || false,
      category: tx.category,
      note: tx.note || "",
      date: tx.date,
    });
    setShowForm(true);
    setError("");
    setFormPrefilledMonth(null);
  };

  const handleAdd = () => {
    const net = netAmount();
    if (!form.amount || net <= 0) { setError(t.validAmount); return; }
    if (editingTx) {
      // UPDATE existing
      setTransactions((p) => p.map((tx) => tx.id === editingTx.id
        ? { ...tx, type: formTxType, amount: net, category: form.category, note: form.note.trim(), date: form.date, tags: extractTags(form.note), split: formTxType === "expense" ? form.split : false, originalAmount: parseFloat(form.amount), reimbursed: (formTxType === "expense" && form.split) ? parseFloat(form.reimbursed)||0 : 0 }
        : tx
      ));
      showToast("✓ Transaction updated");
      setEditingTx(null);
    } else {
      // ADD new
      setTransactions((p) => [{ id: Date.now(), type: formTxType, amount: net, category: form.category, note: form.note.trim(), date: form.date, tags: extractTags(form.note), split: formTxType === "expense" ? form.split : false, originalAmount: parseFloat(form.amount), reimbursed: (formTxType === "expense" && form.split) ? parseFloat(form.reimbursed)||0 : 0 }, ...p]);
      showToast("✓ Transaction saved");
    }
    setForm(blankForm); setShowForm(false); setError(""); setFormPrefilledMonth(null);
  };

  const handleDelete = (id) => {
    const txIdx = transactions.findIndex((tx) => tx.id === id);
    const tx = transactions[txIdx];
    if (!tx) return;
    setDeletingId(id);
    setTimeout(() => {
      setTransactions((p) => p.filter((t) => t.id !== id));
      setDeletingId(null);
      // Undo toast
      const timeoutId = setTimeout(() => setUndoToast(null), 4500);
      setUndoToast({ tx, txIdx, timeoutId });
    }, 300);
  };

  const handleUndo = () => {
    if (!undoToast) return;
    clearTimeout(undoToast.timeoutId);
    setTransactions((p) => {
      const arr = [...p];
      arr.splice(Math.min(undoToast.txIdx, arr.length), 0, undoToast.tx);
      return arr;
    });
    setUndoToast(null);
  };

  // CSV Export
  const handleExportCSV = () => {
    const header = ["Date","Type","Category","Note","Amount","Split","Reimbursed","Tags"];
    const rows = [...transactions].sort((a,b) => new Date(b.date)-new Date(a.date)).map((tx) => [
      tx.date,
      tx.type || "expense",
      tx.category,
      `"${(tx.note||"").replace(/"/g,'""')}"`,
      tx.amount,
      tx.split ? "yes" : "no",
      tx.reimbursed || 0,
      (tx.tags||[]).join(" "),
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `transactions_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    showToast("✓ CSV exported");
  };

  const handleAddSub = () => {
    if (!subForm.name || !subForm.amount || parseFloat(subForm.amount) <= 0) return;
    setSubscriptions((p) => [...p, { ...subForm, id: Date.now(), amount: parseFloat(subForm.amount) }]);
    setSubForm(blankSub); setShowSubForm(false);
  };

  const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

  // NEW: Search filtering
  const searchFiltered = (txList) => {
    if (!searchQuery.trim()) return txList;
    const q = searchQuery.toLowerCase();
    return txList.filter((tx) =>
      (tx.note||"").toLowerCase().includes(q) ||
      tx.category.toLowerCase().includes(q) ||
      (tx.tags||[]).some((tag) => tag.toLowerCase().includes(q)) ||
      tx.amount.toString().includes(q)
    );
  };

  // NEW: Per-category budget alerts (for notification badge)
  const catAlertCount = CATEGORIES.filter((cat) => {
    const catBudget = parseFloat(budgets.categories?.[cat.value]) || 0;
    if (!catBudget) return false;
    const amt = catTotals[cat.value] || 0;
    const pct = amt / catBudget;
    const alertKey = `${currentMonth()}_${cat.value}`;
    return pct >= 0.75 && !dismissedAlerts[alertKey];
  }).length + (totalBudget > 0 && budgetPct >= 0.75 && !dismissedAlerts[`${currentMonth()}_total`] ? 1 : 0);

  // SectionLabel, CardWrap, LangToggle are top-level components (see above FinanceTracker)

  // ── Yearly Summary ─────────────────────────────────────────────────────────
  const computeYearlyData = (year) => {
    const yearStr  = String(year);
    const yearTxns = transactions.filter((tx) => tx.date.startsWith(yearStr));
    const totalSpent = yearTxns.reduce((s, tx) => s + tx.amount, 0);
    const now = new Date();
    const isCurrentYear = year === now.getFullYear();
    const divisor = isCurrentYear ? now.getMonth() + 1 : 12;
    const monthlyAvg = divisor > 0 ? totalSpent / divisor : 0;
    const biggestTx = yearTxns.length > 0 ? yearTxns.reduce((max, tx) => tx.amount > max.amount ? tx : max, yearTxns[0]) : null;
    const catTotalsYear = {};
    yearTxns.forEach((tx) => { catTotalsYear[tx.category] = (catTotalsYear[tx.category] || 0) + tx.amount; });
    const monthlyTrend = Array.from({ length: 12 }, (_, i) => {
      const key   = monthKey(year, i);
      const total = yearTxns.filter((tx) => tx.date.startsWith(key)).reduce((s, tx) => s + tx.amount, 0);
      return { name: getMonthName(i, language), total, monthIdx: i };
    });
    return { totalSpent, monthlyAvg, biggestTx, catTotalsYear, monthlyTrend, yearTxns };
  };

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ fontFamily: FONT_FAMILY, maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: T.pageBg, paddingBottom: 90 }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Kanit:wght@300;400;500;600&display=swap" rel="stylesheet" />

      {showYearlySummary && <YearlySummary transactions={transactions} language={language} yearlyYear={yearlyYear} setYearlyYear={setYearlyYear} setShowYearlySummary={setShowYearlySummary} computeYearlyData={computeYearlyData} t={t} />}

      {/* ── Global Add Transaction bottom sheet (works from overlay too) ── */}
      {showForm && formPrefilledMonth && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", flexDirection: "column", justifyContent: "flex-end", fontFamily: FONT_FAMILY }}>
          <div onClick={() => { setShowForm(false); setError(""); setFormPrefilledMonth(null); }} style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(2px)" }} />
          <div style={{ position: "relative", background: "#FFFFFF", borderRadius: "28px 28px 0 0", padding: "24px 20px 40px", maxWidth: 430, width: "100%", margin: "0 auto", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 -8px 40px rgba(15,23,42,0.18)" }}>
            {/* drag handle */}
            <div style={{ width: 36, height: 4, background: "#E2E8F0", borderRadius: 99, margin: "0 auto 20px" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <p style={{ ...T.h2, margin: 0, fontFamily: FONT_FAMILY }}>{t.newTransaction}</p>
              <button onClick={() => { setShowForm(false); setError(""); setFormPrefilledMonth(null); }} style={{ width: 32, height: 32, borderRadius: 99, border: "none", cursor: "pointer", background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748B" }}><X size={14} /></button>
            </div>

            {/* Income / Expense toggle */}
            <div style={{ display: "flex", gap: 0, marginBottom: 20, background: "#F1F5F9", borderRadius: 14, padding: 4 }}>
              {[{ key: "expense", label: "💸 Expense" }, { key: "income", label: "💰 Income" }].map(({ key: k, label }) => {
                const active = formTxType === k;
                return (
                  <button key={k} onClick={() => {
                    setFormTxType(k);
                    lsSet("ft_last_type", k);
                    setForm((f) => ({ ...f, category: k === "income" ? "Salary" : "Food", split: false, reimbursed: "" }));
                  }} style={{ flex: 1, padding: "10px 8px", borderRadius: 11, border: "none", cursor: "pointer", fontFamily: FONT_FAMILY, fontSize: 13, fontWeight: 600, background: active ? "#FFFFFF" : "transparent", color: active ? (k === "income" ? "#15803D" : T.indigo) : "#94A3B8", boxShadow: active ? "0 1px 6px rgba(15,23,42,0.10)" : "none", transition: "all 0.18s" }}>
                    {label}
                  </button>
                );
              })}
            </div>

            <p style={{ ...T.label, margin: "0 0 8px", fontFamily: FONT_FAMILY }}>{t.amountTHB}</p>
            <input type="text" inputMode="decimal" placeholder="0" value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              style={{ ...T.input, fontSize: 30, fontWeight: 600, fontFamily: MONO_FAMILY, letterSpacing: "-1px", marginBottom: 16, padding: "14px 18px" }} />

            {formTxType === "expense" && (
              <>
                <div onClick={() => setForm({ ...form, split: !form.split, reimbursed: "" })}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderRadius: 16, background: form.split ? "#EEF2FF" : "#F8F7F4", border: `1.5px solid ${form.split ? "#C7D2FE" : "#E2E8F0"}`, marginBottom: 14, cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 11, background: form.split ? "#EEF2FF" : "#E2E8F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Scissors size={15} color={form.split ? T.indigo : "#94A3B8"} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#0F172A", fontFamily: FONT_FAMILY }}>{t.splitBill}</p>
                      <p style={{ margin: 0, fontSize: 12, color: "#94A3B8", fontFamily: FONT_FAMILY, lineHeight: 1.6 }}>{t.splitSub}</p>
                    </div>
                  </div>
                  <div style={{ width: 44, height: 24, borderRadius: 99, background: form.split ? T.indigo : "#CBD5E1", position: "relative", transition: "background 0.22s", flexShrink: 0 }}>
                    <div style={{ position: "absolute", top: 2, left: form.split ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.22s", boxShadow: "0 1px 4px rgba(0,0,0,0.18)" }} />
                  </div>
                </div>
                {form.split && (
                  <div style={{ marginBottom: 14 }}>
                    <p style={{ ...T.label, margin: "0 0 8px", fontFamily: FONT_FAMILY }}>{t.reimbursedAmt}</p>
                    <input type="text" inputMode="decimal" placeholder="0" value={form.reimbursed}
                      onChange={(e) => setForm({ ...form, reimbursed: e.target.value })}
                      style={{ ...T.input, fontFamily: MONO_FAMILY, fontSize: 18, fontWeight: 600, marginBottom: 10 }} />
                    {form.amount && (
                      <div style={{ padding: "10px 16px", background: "#F0FDF4", borderRadius: 12, border: "1px solid #BBF7D0" }}>
                        <span style={{ fontSize: 13, color: "#15803D", fontFamily: MONO_FAMILY, fontWeight: 600 }}>
                          {fmt(parseFloat(form.amount)||0)} − {fmt(parseFloat(form.reimbursed)||0)} = <strong>{fmt(netAmount())}</strong> {t.net}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            <p style={{ ...T.label, margin: "0 0 10px", fontFamily: FONT_FAMILY }}>{t.category}</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 7, marginBottom: 16 }}>
              {(formTxType === "income" ? INCOME_CATS : CATEGORIES).map((cat) => {
                const active = form.category === cat.value;
                return (
                  <button key={cat.value} onClick={() => setForm({ ...form, category: cat.value })} style={{ padding: "11px 6px", borderRadius: 16, cursor: "pointer", fontFamily: FONT_FAMILY, border: `2px solid ${active ? cat.bar : "transparent"}`, background: active ? cat.pastelBg : "#F8F7F4", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, transition: "all 0.15s" }}>
                    <span style={{ fontSize: 21 }}>{cat.icon}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: active ? cat.pastelText : "#94A3B8", fontFamily: FONT_FAMILY, lineHeight: 1.5 }}>{cat.labelShort}</span>
                  </button>
                );
              })}
            </div>

            <p style={{ ...T.label, margin: "0 0 8px", fontFamily: FONT_FAMILY }}>{t.noteTags}</p>
            <input type="text" placeholder={t.notePlaceholder} value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              style={{ ...T.input, marginBottom: 8 }} />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14, minHeight: 0 }}>
              {extractTags(form.note).map((tag) => <span key={tag} style={{ background: "#EEF2FF", color: T.indigo, fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 99, fontFamily: FONT_FAMILY }}>{tag}</span>)}
            </div>

            <p style={{ ...T.label, margin: "0 0 8px", fontFamily: FONT_FAMILY }}>{t.date}</p>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
              style={{ ...T.input, marginBottom: 18 }} />

            {error && <p style={{ color: "#EF4444", fontSize: 13, marginBottom: 12, fontWeight: 500, fontFamily: FONT_FAMILY }}>{error}</p>}

            <button onClick={handleAdd} style={{ width: "100%", padding: "14px", borderRadius: 16, border: "none", background: T.indigo, color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: FONT_FAMILY, boxShadow: "0 4px 18px rgba(79,70,229,0.24)" }}>
              {form.split ? `${t.saveTransaction} (${fmt(netAmount())} ${t.net})` : t.saveTransaction}
            </button>
          </div>
        </div>
      )}

      {/* ── Monthly Detail full-screen overlay ── */}
      {activeDetailMonth && (() => {
        const { key, year, monthIdx, name: mShortName } = activeDetailMonth;
        const mTxns  = transactions.filter((tx) => tx.date.startsWith(key)).sort((a, b) => new Date(b.date) - new Date(a.date));
        const mExpenseTxns = mTxns.filter((tx) => tx.type !== "income");
        const mIncomeTxns  = mTxns.filter((tx) => tx.type === "income");
        const mTotal = mExpenseTxns.reduce((s, tx) => s + tx.amount, 0);
        const mIncomeTotal = mIncomeTxns.reduce((s, tx) => s + tx.amount, 0);
        const mCatTotals = {};
        mExpenseTxns.forEach((tx) => { mCatTotals[tx.category] = (mCatTotals[tx.category] || 0) + tx.amount; });
        const mCatSorted = Object.entries(mCatTotals).sort((a, b) => b[1] - a[1]);
        const visibleTxns = detailCat ? mTxns.filter((tx) => tx.category === detailCat) : mTxns;
        const activeCatObj = detailCat ? getCat(detailCat, language) : null;
        const prevMonthIdx = monthIdx > 0 ? monthIdx - 1 : null;
        const nextMonthIdx = monthIdx < 11 ? monthIdx + 1 : null;
        const goToMonth = (idx) => {
          const newKey = monthKey(year, idx);
          setActiveDetailMonth({ key: newKey, year, monthIdx: idx, name: getMonthName(idx, language) });
          setDetailCat(null);
        };
        const closeDetail = () => { setActiveDetailMonth(null); setDetailCat(null); };

        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "#F8F7F4", overflowY: "auto", fontFamily: FONT_FAMILY }}>
            {/* Sticky top nav */}
            <div style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(248,247,244,0.94)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(226,232,240,0.6)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={closeDetail}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "#FFFFFF", border: "none", cursor: "pointer", padding: "8px 16px", borderRadius: 99, fontFamily: FONT_FAMILY, fontSize: 13, fontWeight: 600, color: "#334155", boxShadow: "0 2px 8px rgba(15,23,42,0.08)", flexShrink: 0 }}>
                <ArrowLeft size={14} /> {t.backStatements}
              </button>
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <button onClick={() => prevMonthIdx !== null && goToMonth(prevMonthIdx)} disabled={prevMonthIdx === null}
                  style={{ width: 34, height: 34, borderRadius: 99, border: "none", display: "flex", alignItems: "center", justifyContent: "center", background: prevMonthIdx !== null ? "#FFFFFF" : "#F1F5F9", color: prevMonthIdx !== null ? "#334155" : "#CBD5E1", cursor: prevMonthIdx !== null ? "pointer" : "default", boxShadow: prevMonthIdx !== null ? "0 2px 8px rgba(15,23,42,0.08)" : "none" }}>
                  <ChevronLeft size={16} />
                </button>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", minWidth: 110, textAlign: "center", fontFamily: FONT_FAMILY }}>{mShortName} {year}</span>
                <button onClick={() => nextMonthIdx !== null && goToMonth(nextMonthIdx)} disabled={nextMonthIdx === null}
                  style={{ width: 34, height: 34, borderRadius: 99, border: "none", display: "flex", alignItems: "center", justifyContent: "center", background: nextMonthIdx !== null ? "#FFFFFF" : "#F1F5F9", color: nextMonthIdx !== null ? "#334155" : "#CBD5E1", cursor: nextMonthIdx !== null ? "pointer" : "default", boxShadow: nextMonthIdx !== null ? "0 2px 8px rgba(15,23,42,0.08)" : "none" }}>
                  <ChevronRight size={16} />
                </button>
              </div>
              {/* ── Add + Close buttons (top-right) ── */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <button
                  onClick={() => {
                    const isThisMonth = key === currentMonth();
                    const preDate = isThisMonth ? todayStr() : `${key}-01`;
                    const lastType = lsGet("ft_last_type", "expense");
                    setFormTxType(lastType);
                    setForm({ amount: "", reimbursed: "", split: false, category: lastType === "income" ? "Salary" : "Food", note: "", date: preDate });
                    setFormPrefilledMonth(key);
                    setShowForm(true);
                    setError("");
                  }}
                  style={{ width: 36, height: 36, borderRadius: 99, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: T.indigoLight, color: T.indigo, flexShrink: 0, transition: "background 0.15s" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#C7D2FE"}
                  onMouseLeave={(e) => e.currentTarget.style.background = T.indigoLight}
                  title="Add transaction"
                >
                  <Plus size={16} strokeWidth={2.5} />
                </button>
                <button onClick={closeDetail}
                  style={{ width: 36, height: 36, borderRadius: 99, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: "#F1F5F9", color: "#64748B", flexShrink: 0, transition: "background 0.15s" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#E2E8F0"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "#F1F5F9"}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div style={{ maxWidth: 430, margin: "0 auto", padding: "0 16px 100px" }}>
              <div style={{ padding: "26px 4px 18px" }}>
                <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 500, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: FONT_FAMILY }}>{t.summaryLabel(mShortName, year)}</p>
                <p style={{ margin: 0, fontSize: 44, fontWeight: 600, letterSpacing: "-2px", color: mTotal > 0 ? "#EF4444" : "#0F172A", lineHeight: 1.1, fontFamily: MONO_FAMILY }}>{mTotal > 0 ? `−${fmt(mTotal)}` : fmt(mTotal)}</p>
                {mIncomeTotal > 0 && (
                  <p style={{ margin: "4px 0 0", fontSize: 16, fontWeight: 600, color: "#15803D", fontFamily: MONO_FAMILY }}>+{fmt(mIncomeTotal)} income</p>
                )}
                <p style={{ margin: "8px 0 0", fontSize: 13, color: "#94A3B8", fontWeight: 400, fontFamily: FONT_FAMILY, lineHeight: 1.6 }}>{mTxns.length} {t.txRecorded}</p>
              </div>

              {mTxns.length === 0 ? (
                <div style={{ ...T.card, padding: "56px 24px", textAlign: "center", marginTop: 8 }}>
                  <div style={{ width: 60, height: 60, borderRadius: 22, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                    <Wallet size={26} color="#CBD5E1" />
                  </div>
                  <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 600, color: "#94A3B8", fontFamily: FONT_FAMILY }}>{t.noExpenses}</p>
                  <p style={{ margin: 0, fontSize: 13, color: "#CBD5E1", fontWeight: 400, fontFamily: FONT_FAMILY }}>{t.noExpensesMonth}</p>
                </div>
              ) : (
                <>
                  <p style={{ ...T.label, margin: "0 0 10px", paddingLeft: 4, fontFamily: FONT_FAMILY }}>{t.categories}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                    {mCatSorted.map(([catVal, amt]) => {
                      const cat = getCat(catVal, language);
                      const pct = mTotal > 0 ? amt / mTotal : 0;
                      const isActive = detailCat === catVal;
                      const catCount = mTxns.filter((tx) => tx.category === catVal).length;
                      return (
                        <button key={catVal} onClick={() => setDetailCat(isActive ? null : catVal)}
                          style={{ width: "100%", border: "none", fontFamily: FONT_FAMILY, cursor: "pointer", textAlign: "left", padding: "16px 20px", borderRadius: 20, background: isActive ? cat.pastelBg : "#FFFFFF", outline: isActive ? `2px solid ${cat.bar}` : "2px solid transparent", boxShadow: isActive ? `0 6px 24px ${cat.bar}30` : "0 2px 12px rgba(15,23,42,0.06)", transition: "all 0.18s" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                            <div style={{ width: 42, height: 42, borderRadius: 14, flexShrink: 0, background: isActive ? "#FFFFFF" : cat.pastelBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, transition: "all 0.18s" }}>{cat.icon}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                                <span style={{ fontSize: 14, fontWeight: 600, color: isActive ? cat.pastelText : "#0F172A", fontFamily: FONT_FAMILY }}>{cat.label}</span>
                                <span style={{ fontFamily: MONO_FAMILY, fontSize: 15, fontWeight: 600, color: isActive ? cat.pastelText : "#0F172A" }}>{fmt(amt)}</span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                                <span style={{ fontSize: 11, color: isActive ? cat.pastelText : "#94A3B8", fontWeight: 400, fontFamily: FONT_FAMILY, lineHeight: 1.6 }}>{catCount} {t.transactions}</span>
                                <span style={{ fontSize: 12, fontWeight: 600, color: isActive ? cat.pastelText : "#94A3B8", fontFamily: FONT_FAMILY }}>{(pct * 100).toFixed(0)}%</span>
                              </div>
                            </div>
                          </div>
                          <div style={{ height: 5, background: isActive ? `${cat.bar}30` : "#F1F5F9", borderRadius: 99, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct * 100}%`, background: cat.bar, borderRadius: 99, transition: "width 0.45s cubic-bezier(0.34,1.56,0.64,1)" }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, paddingLeft: 4 }}>
                    <p style={{ ...T.label, margin: 0, fontFamily: FONT_FAMILY }}>
                      {detailCat ? `${activeCatObj.icon} ${activeCatObj.label}` : t.allTransactions} · {visibleTxns.length}
                    </p>
                    {detailCat && (
                      <button onClick={() => setDetailCat(null)} style={{ display: "flex", alignItems: "center", gap: 5, background: "#F1F5F9", border: "none", cursor: "pointer", padding: "5px 12px", borderRadius: 99, fontFamily: FONT_FAMILY, fontSize: 11, fontWeight: 600, color: "#64748B" }}>
                        <X size={11} /> {t.showAll}
                      </button>
                    )}
                  </div>
                  {detailCat && (
                    <div style={{ padding: "14px 20px", borderRadius: 16, marginBottom: 12, background: activeCatObj.pastelBg, border: `1.5px solid ${activeCatObj.bar}40` }}>
                      <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 500, color: activeCatObj.pastelText, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.7, fontFamily: FONT_FAMILY }}>{activeCatObj.label}</p>
                      <p style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: "-1px", color: activeCatObj.pastelText, fontFamily: MONO_FAMILY }}>{fmt(mCatTotals[detailCat])}</p>
                    </div>
                  )}
                  {visibleTxns.map((tx) => {
                    const isIncome = tx.type === "income";
                    const cat = isIncome ? (getIncomeCategory(tx.category, language) || getCat(tx.category, language)) : getCat(tx.category, language);
                    const tags = extractTags(tx.note);
                    const isDeleting = deletingId === tx.id;
                    return (
                      <div key={tx.id} style={{ ...T.card, padding: "14px 18px", marginBottom: 9, display: "flex", alignItems: "center", gap: 13, opacity: isDeleting ? 0 : 1, transform: isDeleting ? "translateX(50px)" : "none", transition: "all 0.28s" }}>
                        <div style={{ width: 40, height: 40, borderRadius: 14, background: cat.pastelBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{cat.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", fontFamily: FONT_FAMILY }}>{cat.label}</span>
                            {isIncome && <span style={{ fontSize: 10, fontWeight: 600, background: "#F0FDF4", color: "#15803D", padding: "1px 6px", borderRadius: 5, fontFamily: FONT_FAMILY }}>income</span>}
                            {!isIncome && tx.split && <span style={{ fontSize: 10, fontWeight: 600, background: "#EEF2FF", color: T.indigo, padding: "1px 6px", borderRadius: 5, fontFamily: FONT_FAMILY }}>{t.split}</span>}
                            {tx.recurringId && <span style={{ fontSize: 10, fontWeight: 600, background: "#FEFCE8", color: "#A16207", padding: "1px 6px", borderRadius: 5, fontFamily: FONT_FAMILY }}>{t.auto}</span>}
                          </div>
                          <p style={{ ...T.muted, margin: "2px 0 0", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: FONT_FAMILY }}>{tx.note || t.noNote} · {fmtDate(tx.date)}</p>
                          {tags.length > 0 && <div style={{ display: "flex", gap: 3, marginTop: 4, flexWrap: "wrap" }}>{tags.map((tag) => <span key={tag} style={{ fontSize: 10, fontWeight: 600, background: "#EEF2FF", color: "#6366F1", padding: "1px 7px", borderRadius: 99, fontFamily: FONT_FAMILY }}>{tag}</span>)}</div>}
                        </div>
                        <span style={{ fontFamily: MONO_FAMILY, fontSize: 14, fontWeight: 600, color: isIncome ? "#15803D" : "#EF4444", flexShrink: 0 }}>{isIncome ? "+" : "−"}{fmt(tx.amount)}</span>
                        <button onClick={() => { openEditForm(tx); setActiveDetailMonth(null); setDetailCat(null); setTab("home"); setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#CBD5E1", flexShrink: 0 }}><Pencil size={12} /></button>
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
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 999, background: "#0F172A", color: "#F8FAFC", padding: "10px 20px", borderRadius: 99, fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", boxShadow: "0 8px 32px rgba(15,23,42,0.22)", fontFamily: FONT_FAMILY }}>
          {toast}
        </div>
      )}

      {/* NEW: Undo delete toast */}
      {undoToast && (
        <div style={{ position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)", zIndex: 999, background: "#1E293B", color: "#F8FAFC", padding: "12px 18px", borderRadius: 16, fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", boxShadow: "0 8px 32px rgba(15,23,42,0.28)", fontFamily: FONT_FAMILY, display: "flex", alignItems: "center", gap: 12 }}>
          <span>Transaction deleted</span>
          <button onClick={handleUndo} style={{ display: "flex", alignItems: "center", gap: 5, background: T.indigo, border: "none", cursor: "pointer", color: "#FFFFFF", padding: "5px 12px", borderRadius: 99, fontSize: 12, fontWeight: 700, fontFamily: FONT_FAMILY }}>
            <RotateCcw size={11} /> Undo
          </button>
        </div>
      )}

      {/* NEW: Budget alert banner (dismissible) */}
      {tab === "home" && catAlertCount > 0 && (
        <div style={{ margin: "0 16px 12px", padding: "12px 16px", background: "#FFFBEB", borderRadius: 16, border: "1.5px solid #FDE68A", display: "flex", alignItems: "center", gap: 10 }}>
          <AlertTriangle size={15} color="#D97706" />
          <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "#92400E", fontFamily: FONT_FAMILY }}>
            {catAlertCount} budget {catAlertCount === 1 ? "category is" : "categories are"} near or over limit
          </span>
          <button onClick={() => {
            const newDismissed = { ...dismissedAlerts };
            if (totalBudget > 0 && budgetPct >= 0.75) newDismissed[`${currentMonth()}_total`] = true;
            CATEGORIES.forEach((cat) => {
              const catBudget = parseFloat(budgets.categories?.[cat.value]) || 0;
              if (catBudget && (catTotals[cat.value]||0)/catBudget >= 0.75) newDismissed[`${currentMonth()}_${cat.value}`] = true;
            });
            setDismissedAlerts(newDismissed);
          }} style={{ background: "none", border: "none", cursor: "pointer", color: "#D97706", padding: 4 }}><X size={13} /></button>
        </div>
      )}

      {/* ══ HERO HEADER ══ */}
      <div style={{ padding: "32px 22px 24px", background: T.pageBg }}>
        {/* Top bar: date + lang toggle + year in review */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <p style={{ ...T.muted, margin: 0, fontWeight: 500, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: FONT_FAMILY }}>
              {new Date().toLocaleDateString(language === "TH" ? "th-TH" : "en-US", { month: "long", year: "numeric" })}
            </p>
            <LangToggle language={language} setLanguage={setLanguage} />
          </div>
          <button onClick={() => { setYearlyYear(new Date().getFullYear()); setShowYearlySummary(true); }} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "#0F172A", border: "none", cursor: "pointer",
            padding: "7px 14px", borderRadius: 99, fontFamily: FONT_FAMILY,
            fontSize: 12, fontWeight: 600, color: "#F8FAFC",
            boxShadow: "0 2px 12px rgba(15,23,42,0.22)",
          }}>
            <Sparkles size={12} /> {t.inReview(new Date().getFullYear())}
          </button>
        </div>

        <p style={{ ...T.muted, margin: "0 0 8px", fontSize: 13, fontFamily: FONT_FAMILY, fontWeight: 400 }}>{t.totalSpent}</p>
        <span style={{ ...T.h1 }}>{fmt(monthlyTotal)}</span>

        {topCat && !totalBudget && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12, padding: "5px 12px", background: "#FFFFFF", borderRadius: 99, boxShadow: "0 2px 8px rgba(15,23,42,0.07)" }}>
            <span style={{ fontSize: 14 }}>{getCat(topCat[0], language).icon}</span>
            <span style={{ fontSize: 12, color: "#64748B", fontWeight: 400, fontFamily: FONT_FAMILY }}>{t.top}: <span style={{ color: "#334155", fontWeight: 600 }}>{getCat(topCat[0], language).label}</span></span>
          </div>
        )}

        {totalBudget > 0 && (
          <div style={{ marginTop: 16, ...T.card, padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: FONT_FAMILY }}>{t.monthlyBudget}</span>
              <span style={{ fontFamily: MONO_FAMILY, fontSize: 13, fontWeight: 600, color: bc.text }}>{Math.round(budgetPct * 100)}% {t.used}</span>
            </div>
            <div style={{ height: 7, background: bc.track, borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min(budgetPct*100,100)}%`, background: bc.bar, borderRadius: 99, transition: "width 0.6s cubic-bezier(0.34,1.56,0.64,1)" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <span style={{ ...T.muted, fontSize: 12, fontFamily: FONT_FAMILY }}>{fmt(monthlyTotal)} {t.spent}</span>
              <span style={{ ...T.muted, fontSize: 12, fontFamily: FONT_FAMILY }}>{t.of} {fmt(totalBudget)}</span>
            </div>
            {budgetPct >= 0.75 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, padding: "8px 12px", background: bc.track, borderRadius: 12 }}>
                <AlertTriangle size={13} color={bc.text} />
                <span style={{ fontSize: 12, fontWeight: 600, color: bc.text, fontFamily: FONT_FAMILY }}>{budgetPct >= 0.95 ? t.budgetExceeded : t.approachingBudget}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══ HOME ══ */}
      {tab === "home" && (
        <div style={{ padding: "0 16px" }}>
          <button onClick={() => { 
            if (showForm) { setShowForm(false); setError(""); setFormPrefilledMonth(null); setEditingTx(null); setForm(blankForm); }
            else { setShowForm(true); setError(""); setFormPrefilledMonth(null); setEditingTx(null); }
          }} style={{
            width: "100%", padding: "15px", borderRadius: 20, border: "none",
            background: showForm ? "#E2E8F0" : T.indigo, color: showForm ? "#475569" : "#FFFFFF",
            fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: FONT_FAMILY,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 14,
            boxShadow: showForm ? "none" : "0 6px 24px rgba(79,70,229,0.28)", transition: "all 0.22s"
          }}>
            <PlusCircle size={18} />
            {showForm ? t.cancel : t.addTransaction}
          </button>

          {showForm && !formPrefilledMonth && (
            <CardWrap style={{ marginBottom: 14 }}>
              <p style={{ ...T.h2, margin: "0 0 16px", fontFamily: FONT_FAMILY }}>{editingTx ? "✏️ Edit Transaction" : t.newTransaction}</p>

              {/* Income / Expense toggle */}
              <div style={{ display: "flex", gap: 0, marginBottom: 20, background: "#F1F5F9", borderRadius: 14, padding: 4 }}>
                {[{ key: "expense", label: "💸 Expense" }, { key: "income", label: "💰 Income" }].map(({ key, label }) => {
                  const active = formTxType === key;
                  return (
                    <button key={key} onClick={() => {
                      setFormTxType(key);
                      lsSet("ft_last_type", key);
                      setForm((f) => ({ ...f, category: key === "income" ? "Salary" : "Food", split: false, reimbursed: "" }));
                    }} style={{ flex: 1, padding: "10px 8px", borderRadius: 11, border: "none", cursor: "pointer", fontFamily: FONT_FAMILY, fontSize: 13, fontWeight: 600, background: active ? "#FFFFFF" : "transparent", color: active ? (key === "income" ? "#15803D" : T.indigo) : "#94A3B8", boxShadow: active ? "0 1px 6px rgba(15,23,42,0.10)" : "none", transition: "all 0.18s" }}>
                      {label}
                    </button>
                  );
                })}
              </div>

              <p style={{ ...T.label, margin: "0 0 8px", fontFamily: FONT_FAMILY }}>{t.amountTHB}</p>
              <input type="text" inputMode="decimal" placeholder="0" value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                style={{ ...T.input, fontSize: 30, fontWeight: 600, fontFamily: MONO_FAMILY, letterSpacing: "-1px", marginBottom: 16, padding: "14px 18px" }} />

              {/* Split bill — expense only */}
              {formTxType === "expense" && (
                <>
                  <div onClick={() => setForm({ ...form, split: !form.split, reimbursed: "" })}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderRadius: 16, background: form.split ? "#EEF2FF" : "#F8F7F4", border: `1.5px solid ${form.split ? "#C7D2FE" : "#E2E8F0"}`, marginBottom: 14, cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 11, background: form.split ? "#EEF2FF" : "#E2E8F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Scissors size={15} color={form.split ? T.indigo : "#94A3B8"} />
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#0F172A", fontFamily: FONT_FAMILY }}>{t.splitBill}</p>
                        <p style={{ margin: 0, fontSize: 12, color: "#94A3B8", fontFamily: FONT_FAMILY, lineHeight: 1.6 }}>{t.splitSub}</p>
                      </div>
                    </div>
                    <div style={{ width: 44, height: 24, borderRadius: 99, background: form.split ? T.indigo : "#CBD5E1", position: "relative", transition: "background 0.22s", flexShrink: 0 }}>
                      <div style={{ position: "absolute", top: 2, left: form.split ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.22s", boxShadow: "0 1px 4px rgba(0,0,0,0.18)" }} />
                    </div>
                  </div>
                  {form.split && (
                    <div style={{ marginBottom: 14 }}>
                      <p style={{ ...T.label, margin: "0 0 8px", fontFamily: FONT_FAMILY }}>{t.reimbursedAmt}</p>
                      <input type="text" inputMode="decimal" placeholder="0" value={form.reimbursed}
                        onChange={(e) => setForm({ ...form, reimbursed: e.target.value })}
                        style={{ ...T.input, fontFamily: MONO_FAMILY, fontSize: 18, fontWeight: 600, marginBottom: 10 }} />
                      {form.amount && (
                        <div style={{ padding: "10px 16px", background: "#F0FDF4", borderRadius: 12, border: "1px solid #BBF7D0" }}>
                          <span style={{ fontSize: 13, color: "#15803D", fontFamily: MONO_FAMILY, fontWeight: 600 }}>
                            {fmt(parseFloat(form.amount)||0)} − {fmt(parseFloat(form.reimbursed)||0)} = <strong>{fmt(netAmount())}</strong> {t.net}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              <p style={{ ...T.label, margin: "0 0 10px", fontFamily: FONT_FAMILY }}>{t.category}</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 7, marginBottom: 16 }}>
                {(formTxType === "income" ? INCOME_CATS : CATEGORIES).map((cat) => {
                  const active = form.category === cat.value;
                  return (
                    <button key={cat.value} onClick={() => setForm({ ...form, category: cat.value })} style={{ padding: "11px 6px", borderRadius: 16, cursor: "pointer", fontFamily: FONT_FAMILY, border: `2px solid ${active ? cat.bar : "transparent"}`, background: active ? cat.pastelBg : "#F8F7F4", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, transition: "all 0.15s" }}>
                      <span style={{ fontSize: 21 }}>{cat.icon}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: active ? cat.pastelText : "#94A3B8", fontFamily: FONT_FAMILY, lineHeight: 1.5 }}>{cat.labelShort}</span>
                    </button>
                  );
                })}
              </div>

              <p style={{ ...T.label, margin: "0 0 8px", fontFamily: FONT_FAMILY }}>{t.noteTags}</p>
              <input type="text" placeholder={t.notePlaceholder} value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                style={{ ...T.input, marginBottom: 8 }} />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14, minHeight: 0 }}>
                {extractTags(form.note).map((tag) => <span key={tag} style={{ background: "#EEF2FF", color: T.indigo, fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 99, fontFamily: FONT_FAMILY }}>{tag}</span>)}
              </div>

              <p style={{ ...T.label, margin: "0 0 8px", fontFamily: FONT_FAMILY }}>{t.date}</p>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                style={{ ...T.input, marginBottom: 18 }} />

              {error && <p style={{ color: "#EF4444", fontSize: 13, marginBottom: 12, fontWeight: 500, fontFamily: FONT_FAMILY }}>{error}</p>}

              <button onClick={handleAdd} style={{ width: "100%", padding: "14px", borderRadius: 16, border: "none", background: T.indigo, color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: FONT_FAMILY, boxShadow: "0 4px 18px rgba(79,70,229,0.24)" }}>
                {editingTx ? "💾 Update Transaction" : (form.split ? `${t.saveTransaction} (${fmt(netAmount())} ${t.net})` : t.saveTransaction)}
              </button>
            </CardWrap>
          )}

          {/* Search bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <SectionLabel style={{ margin: 0, flex: 1 }}>{monthTxns.length === 0 ? t.noTransYet : t.transactionCount(monthTxns.length)}</SectionLabel>
            <button onClick={() => { setShowSearch((s) => !s); setSearchQuery(""); }} style={{ background: showSearch ? T.indigoLight : "none", border: "none", cursor: "pointer", padding: "5px 10px", borderRadius: 99, color: showSearch ? T.indigo : "#94A3B8", fontSize: 12, fontWeight: 600, fontFamily: FONT_FAMILY, display: "flex", alignItems: "center", gap: 4 }}>
              🔍 {showSearch ? "Clear" : "Search"}
            </button>
          </div>
          {showSearch && (
            <input autoFocus type="text" placeholder="Search by note, category, tag, amount…" value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ ...T.input, marginBottom: 12, fontSize: 13 }} />
          )}
          {monthTxns.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 20px" }}>
              <div style={{ width: 60, height: 60, borderRadius: 22, background: "#E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}><Wallet size={26} color="#94A3B8" /></div>
              <p style={{ ...T.muted, margin: "0 0 6px", fontWeight: 600, fontSize: 15, color: "#64748B", fontFamily: FONT_FAMILY }}>{t.noTransYet}</p>
              <p style={{ ...T.muted, margin: 0, fontWeight: 400, fontFamily: FONT_FAMILY }}>{t.tapToAdd}</p>
            </div>
          ) : searchFiltered([...monthTxns].sort((a, b) => new Date(b.date) - new Date(a.date))).length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 20px" }}>
              <p style={{ ...T.muted, margin: 0, fontFamily: FONT_FAMILY }}>No results for "{searchQuery}"</p>
            </div>
          ) : searchFiltered([...monthTxns].sort((a, b) => new Date(b.date) - new Date(a.date))).map((tx) => {
            const isIncome = tx.type === "income";
            const cat = isIncome ? (getIncomeCategory(tx.category, language) || getCat(tx.category, language)) : getCat(tx.category, language);
            const isDeleting = deletingId === tx.id;
            const tags = extractTags(tx.note);
            return (
              <div key={tx.id} style={{ ...T.card, padding: "14px 18px", marginBottom: 9, display: "flex", alignItems: "center", gap: 13, opacity: isDeleting ? 0 : 1, transform: isDeleting ? "translateX(50px)" : "none", transition: "all 0.28s" }}>
                <div style={{ width: 44, height: 44, borderRadius: 16, background: cat.pastelBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{cat.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", fontFamily: FONT_FAMILY }}>{cat.label}</span>
                    {isIncome && <span style={{ fontSize: 10, fontWeight: 600, background: "#F0FDF4", color: "#15803D", padding: "2px 7px", borderRadius: 6, fontFamily: FONT_FAMILY }}>income</span>}
                    {!isIncome && tx.split && <span style={{ fontSize: 10, fontWeight: 600, background: "#EEF2FF", color: T.indigo, padding: "2px 7px", borderRadius: 6, fontFamily: FONT_FAMILY }}>{t.split}</span>}
                    {tx.recurringId && <span style={{ fontSize: 10, fontWeight: 600, background: "#FEFCE8", color: "#A16207", padding: "2px 7px", borderRadius: 6, fontFamily: FONT_FAMILY }}>{t.auto}</span>}
                  </div>
                  <p style={{ ...T.muted, margin: "3px 0 0", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: FONT_FAMILY }}>{tx.note || t.noNote} · {fmtDate(tx.date)}</p>
                  {tags.length > 0 && (
                    <div style={{ display: "flex", gap: 4, marginTop: 5, flexWrap: "wrap" }}>
                      {tags.map((tag) => <span key={tag} style={{ fontSize: 10, fontWeight: 600, background: "#EEF2FF", color: "#6366F1", padding: "2px 8px", borderRadius: 99, fontFamily: FONT_FAMILY }}>{tag}</span>)}
                    </div>
                  )}
                </div>
                <span style={{ fontFamily: MONO_FAMILY, fontSize: 15, fontWeight: 600, color: isIncome ? "#15803D" : "#EF4444", flexShrink: 0 }}>{isIncome ? "+" : "−"}{fmt(tx.amount)}</span>
                <button onClick={() => { openEditForm(tx); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 5, color: "#CBD5E1", flexShrink: 0 }}><Pencil size={13} /></button>
                <button onClick={() => handleDelete(tx.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 5, color: "#CBD5E1", flexShrink: 0 }}><Trash2 size={13} /></button>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ ANALYTICS ══ */}
      {tab === "analytics" && (
        <div style={{ padding: "0 16px" }}>
          <SectionLabel>{t.spendingByCat}</SectionLabel>
          {CATEGORIES.map((cat) => {
            const amt = catTotals[cat.value] || 0;
            const pct = monthlyTotal > 0 ? amt / monthlyTotal : 0;
            const catBudget = parseFloat(budgets.categories?.[cat.value]) || 0;
            const catPct = catBudget > 0 ? Math.min(amt / catBudget, 1) : pct;
            const cbc = catBudget > 0 ? budgetColor(catPct) : null;
            return (
              <div key={cat.value} style={{ ...T.card, padding: "16px 18px", marginBottom: 9 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 13, background: cat.pastelBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{cat.icon}</div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", fontFamily: FONT_FAMILY }}>{cat.label}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontFamily: MONO_FAMILY, fontSize: 15, fontWeight: 600, color: cbc ? cbc.text : "#0F172A" }}>{fmt(amt)}</span>
                    {catBudget > 0 && <span style={{ ...T.muted, fontSize: 11, display: "block", fontFamily: MONO_FAMILY }}>/ {fmt(catBudget)}</span>}
                  </div>
                </div>
                <div style={{ height: 6, background: cbc ? cbc.track : "#F1F5F9", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min((cbc ? catPct : pct)*100,100)}%`, background: cbc ? cbc.bar : cat.bar, borderRadius: 99, transition: "width 0.5s" }} />
                </div>
                {catBudget > 0 && catPct >= 0.75 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8 }}>
                    <AlertTriangle size={12} color={cbc.text} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: cbc.text, fontFamily: FONT_FAMILY }}>{catPct >= 0.95 ? t.overLimit : t.nearLimit}</span>
                  </div>
                )}
              </div>
            );
          })}
          {topTags.length > 0 && (
            <>
              <SectionLabel style={{ marginTop: 8 }}>{t.topTagsMonth}</SectionLabel>
              {topTags.map(([tag, amt]) => (
                <div key={tag} style={{ ...T.card, padding: "13px 18px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.indigo, minWidth: 90, fontFamily: FONT_FAMILY }}>{tag}</span>
                  <div style={{ flex: 1, height: 5, background: "#EEF2FF", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(amt / maxTagAmt)*100}%`, background: T.indigo, borderRadius: 99 }} />
                  </div>
                  <span style={{ fontFamily: MONO_FAMILY, fontSize: 13, fontWeight: 600, color: "#0F172A", minWidth: 72, textAlign: "right" }}>{fmt(amt)}</span>
                </div>
              ))}
            </>
          )}

          {/* NEW: Income vs Expense year-to-date chart */}
          {(() => {
            const yearStr = String(new Date().getFullYear());
            const incomeVsExpData = Array.from({ length: 12 }, (_, i) => {
              const key = monthKey(parseInt(yearStr), i);
              const mTxns = transactions.filter((tx) => tx.date.startsWith(key));
              const expense = mTxns.filter((tx) => tx.type !== "income").reduce((s,tx) => s+tx.amount, 0);
              const income  = mTxns.filter((tx) => tx.type === "income").reduce((s,tx) => s+tx.amount, 0);
              return { name: getMonthName(i, language), expense, income, monthIdx: i };
            });
            const hasIncome = incomeVsExpData.some((m) => m.income > 0);
            if (!hasIncome) return null;
            return (
              <>
                <SectionLabel style={{ marginTop: 8 }}>Income vs Expenses {yearStr}</SectionLabel>
                <div style={{ ...T.card, padding: "20px 22px", marginBottom: 12 }}>
                  <ResponsiveContainer width="100%" height={150}>
                    <BarChart data={incomeVsExpData} barSize={10} barGap={2} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 500, fill: "#94A3B8", fontFamily: FONT_FAMILY }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip formatter={(val, name) => [fmt(val), name === "expense" ? "Expenses" : "Income"]} contentStyle={{ fontFamily: FONT_FAMILY, fontSize: 12, borderRadius: 10, border: "none", boxShadow: "0 4px 16px rgba(15,23,42,0.12)" }} />
                      <Bar dataKey="expense" fill="#FCA5A5" radius={[4,4,2,2]} />
                      <Bar dataKey="income"  fill="#86EFAC" radius={[4,4,2,2]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 10, height: 10, borderRadius: 3, background: "#FCA5A5" }} /><span style={{ fontSize: 11, color: "#64748B", fontFamily: FONT_FAMILY }}>Expenses</span></div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 10, height: 10, borderRadius: 3, background: "#86EFAC" }} /><span style={{ fontSize: 11, color: "#64748B", fontFamily: FONT_FAMILY }}>Income</span></div>
                  </div>
                </div>
              </>
            );
          })()}

          {monthTxns.length === 0 && (
            <div style={{ textAlign: "center", padding: "56px 20px" }}>
              <div style={{ width: 64, height: 64, borderRadius: 22, background: "linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}><BarChart2 size={28} color={T.indigo} /></div>
              <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 600, color: "#334155", fontFamily: FONT_FAMILY }}>No data yet</p>
              <p style={{ ...T.muted, margin: 0, fontWeight: 400, fontFamily: FONT_FAMILY }}>{t.addToSeeAnalytics}</p>
            </div>
          )}
        </div>
      )}

      {/* ══ STATEMENT TAB ══ */}
      {tab === "statement" && (() => {
        if (openMonth) {
          const mData = yearMonthData.find((m) => m.key === openMonth);
          const mIdx  = mData ? mData.monthIdx : 0;
          const mName = mData ? `${getMonthName(mIdx, language)} ${stmtYear}` : "";
          const mTxns = mData ? [...mData.txns].sort((a, b) => new Date(b.date) - new Date(a.date)) : [];
          const mTotal = mData ? mData.total : 0;
          const mIncomeTotal = mData ? mData.incomeTotal : 0;
          const mCatTotals = {};
          mTxns.filter((tx) => tx.type !== "income").forEach((tx) => { mCatTotals[tx.category] = (mCatTotals[tx.category] || 0) + tx.amount; });
          const mCatSorted = Object.entries(mCatTotals).sort((a, b) => b[1] - a[1]);
          const visibleTxns = stmtCat ? mTxns.filter((tx) => tx.category === stmtCat) : mTxns;
          const activeCat = stmtCat ? getCat(stmtCat, language) : null;
          const allKeys = yearMonthData.map((m) => m.key);
          const curKeyIdx = allKeys.indexOf(openMonth);
          const prevKey = curKeyIdx > 0 ? allKeys[curKeyIdx - 1] : null;
          const nextKey = curKeyIdx < allKeys.length - 1 ? allKeys[curKeyIdx + 1] : null;

          return (
            <div style={{ position: "fixed", inset: 0, zIndex: 150, background: "#F8F7F4", overflowY: "auto", fontFamily: FONT_FAMILY }}>
              <div style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(248,247,244,0.94)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(226,232,240,0.6)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 10 }}>
                <button onClick={() => { setOpenMonth(null); setStmtCat(null); }} style={{ display: "flex", alignItems: "center", gap: 6, background: "#FFFFFF", border: "none", cursor: "pointer", padding: "8px 16px", borderRadius: 99, fontFamily: FONT_FAMILY, fontSize: 13, fontWeight: 600, color: "#334155", boxShadow: "0 2px 8px rgba(15,23,42,0.08)", flexShrink: 0 }}>
                  <ArrowLeft size={14} /> {stmtYear}
                </button>
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                  <button onClick={() => { setStmtCat(null); if (prevKey) setOpenMonth(prevKey); }} disabled={!prevKey} style={{ width: 34, height: 34, borderRadius: 99, border: "none", display: "flex", alignItems: "center", justifyContent: "center", background: prevKey ? "#FFFFFF" : "#F1F5F9", color: prevKey ? "#334155" : "#CBD5E1", cursor: prevKey ? "pointer" : "default", boxShadow: prevKey ? "0 2px 8px rgba(15,23,42,0.08)" : "none" }}><ChevronLeft size={16} /></button>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", minWidth: 110, textAlign: "center", fontFamily: FONT_FAMILY }}>{mName}</span>
                  <button onClick={() => { setStmtCat(null); if (nextKey) setOpenMonth(nextKey); }} disabled={!nextKey} style={{ width: 34, height: 34, borderRadius: 99, border: "none", display: "flex", alignItems: "center", justifyContent: "center", background: nextKey ? "#FFFFFF" : "#F1F5F9", color: nextKey ? "#334155" : "#CBD5E1", cursor: nextKey ? "pointer" : "default", boxShadow: nextKey ? "0 2px 8px rgba(15,23,42,0.08)" : "none" }}><ChevronRight size={16} /></button>
                </div>
                <div style={{ width: 80, flexShrink: 0 }} />
              </div>
              <div style={{ maxWidth: 430, margin: "0 auto", padding: "0 16px 100px" }}>
                <div style={{ padding: "26px 4px 16px" }}>
                  <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 500, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: FONT_FAMILY }}>{t.totalSpentLabel}</p>
                  <p style={{ margin: 0, fontSize: 40, fontWeight: 600, letterSpacing: "-1.5px", color: mTotal > 0 ? "#EF4444" : "#0F172A", lineHeight: 1.1, fontFamily: MONO_FAMILY }}>{mTotal > 0 ? `−${fmt(mTotal)}` : fmt(mTotal)}</p>
                  {mIncomeTotal > 0 && (
                    <p style={{ margin: "4px 0 0", fontSize: 15, fontWeight: 600, color: "#15803D", fontFamily: MONO_FAMILY }}>+{fmt(mIncomeTotal)} income</p>
                  )}
                  <p style={{ margin: "8px 0 0", fontSize: 13, color: "#94A3B8", fontWeight: 400, fontFamily: FONT_FAMILY, lineHeight: 1.6 }}>{mTxns.length} {t.txIn(mName)}</p>
                </div>
                {mTxns.length === 0 ? (
                  <div style={{ ...T.card, padding: "48px 24px", textAlign: "center", marginTop: 8 }}>
                    <div style={{ width: 54, height: 54, borderRadius: 19, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}><Wallet size={22} color="#94A3B8" /></div>
                    <p style={{ ...T.muted, margin: 0, fontWeight: 400, fontFamily: FONT_FAMILY }}>{t.noTransIn(mName)}</p>
                  </div>
                ) : (
                  <>
                    <p style={{ ...T.label, margin: "0 0 10px", paddingLeft: 4, fontFamily: FONT_FAMILY }}>{t.categories}</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                      {mCatSorted.map(([catVal, amt]) => {
                        const cat = getCat(catVal, language);
                        const pct = mTotal > 0 ? amt / mTotal : 0;
                        const isActive = stmtCat === catVal;
                        const catCount = mTxns.filter((tx) => tx.category === catVal).length;
                        return (
                          <button key={catVal} onClick={() => setStmtCat(isActive ? null : catVal)} style={{ width: "100%", border: "none", fontFamily: FONT_FAMILY, cursor: "pointer", textAlign: "left", padding: "15px 18px", borderRadius: 20, background: isActive ? cat.pastelBg : "#FFFFFF", outline: isActive ? `2px solid ${cat.bar}` : "2px solid transparent", boxShadow: isActive ? `0 6px 24px ${cat.bar}30` : "0 2px 12px rgba(15,23,42,0.06)", transition: "all 0.18s" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                              <div style={{ width: 40, height: 40, borderRadius: 13, flexShrink: 0, background: isActive ? "#FFFFFF" : cat.pastelBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19 }}>{cat.icon}</div>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                                  <span style={{ fontSize: 14, fontWeight: 600, color: isActive ? cat.pastelText : "#0F172A", fontFamily: FONT_FAMILY }}>{cat.label}</span>
                                  <span style={{ fontFamily: MONO_FAMILY, fontSize: 15, fontWeight: 600, color: isActive ? cat.pastelText : "#0F172A" }}>{fmt(amt)}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                                  <span style={{ fontSize: 11, color: isActive ? cat.pastelText : "#94A3B8", fontWeight: 400, fontFamily: FONT_FAMILY, lineHeight: 1.6 }}>{catCount} {t.transactions}</span>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: isActive ? cat.pastelText : "#94A3B8", fontFamily: FONT_FAMILY }}>{(pct * 100).toFixed(0)}%</span>
                                </div>
                              </div>
                            </div>
                            <div style={{ height: 5, background: isActive ? `${cat.bar}30` : "#F1F5F9", borderRadius: 99, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${pct * 100}%`, background: cat.bar, borderRadius: 99, transition: "width 0.45s cubic-bezier(0.34,1.56,0.64,1)" }} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, paddingLeft: 4 }}>
                      <p style={{ ...T.label, margin: 0, fontFamily: FONT_FAMILY }}>{stmtCat ? `${activeCat.icon} ${activeCat.label}` : t.allTransactions} · {visibleTxns.length}</p>
                      {stmtCat && (
                        <button onClick={() => setStmtCat(null)} style={{ display: "flex", alignItems: "center", gap: 5, background: "#F1F5F9", border: "none", cursor: "pointer", padding: "5px 12px", borderRadius: 99, fontFamily: FONT_FAMILY, fontSize: 11, fontWeight: 600, color: "#64748B" }}>
                          <X size={11} /> {t.showAll}
                        </button>
                      )}
                    </div>
                    {stmtCat && (
                      <div style={{ padding: "13px 18px", borderRadius: 16, marginBottom: 12, background: activeCat.pastelBg, border: `1.5px solid ${activeCat.bar}40` }}>
                        <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 500, color: activeCat.pastelText, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.7, fontFamily: FONT_FAMILY }}>{activeCat.label}</p>
                        <p style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: "-1px", color: activeCat.pastelText, fontFamily: MONO_FAMILY }}>{fmt(mCatTotals[stmtCat])}</p>
                      </div>
                    )}
                    {visibleTxns.map((tx) => {
                      const isIncome = tx.type === "income";
                      const cat = isIncome ? (getIncomeCategory(tx.category, language) || getCat(tx.category, language)) : getCat(tx.category, language);
                      const tags = extractTags(tx.note);
                      const isDeleting = deletingId === tx.id;
                      return (
                        <div key={tx.id} style={{ ...T.card, padding: "13px 17px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12, opacity: isDeleting ? 0 : 1, transform: isDeleting ? "translateX(50px)" : "none", transition: "all 0.28s" }}>
                          <div style={{ width: 40, height: 40, borderRadius: 13, background: cat.pastelBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{cat.icon}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", fontFamily: FONT_FAMILY }}>{cat.label}</span>
                              {isIncome && <span style={{ fontSize: 10, fontWeight: 600, background: "#F0FDF4", color: "#15803D", padding: "1px 6px", borderRadius: 5, fontFamily: FONT_FAMILY }}>income</span>}
                              {!isIncome && tx.split && <span style={{ fontSize: 10, fontWeight: 600, background: "#EEF2FF", color: T.indigo, padding: "1px 6px", borderRadius: 5, fontFamily: FONT_FAMILY }}>{t.split}</span>}
                              {tx.recurringId && <span style={{ fontSize: 10, fontWeight: 600, background: "#FEFCE8", color: "#A16207", padding: "1px 6px", borderRadius: 5, fontFamily: FONT_FAMILY }}>{t.auto}</span>}
                            </div>
                            <p style={{ ...T.muted, margin: "2px 0 0", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: FONT_FAMILY }}>{tx.note || t.noNote} · {fmtDate(tx.date)}</p>
                            {tags.length > 0 && <div style={{ display: "flex", gap: 3, marginTop: 4, flexWrap: "wrap" }}>{tags.map((tag) => <span key={tag} style={{ fontSize: 10, fontWeight: 600, background: "#EEF2FF", color: "#6366F1", padding: "1px 7px", borderRadius: 99, fontFamily: FONT_FAMILY }}>{tag}</span>)}</div>}
                          </div>
                          <span style={{ fontFamily: MONO_FAMILY, fontSize: 14, fontWeight: 600, color: isIncome ? "#15803D" : "#EF4444", flexShrink: 0 }}>{isIncome ? "+" : "−"}{fmt(tx.amount)}</span>
                          <button onClick={() => { openEditForm(tx); setOpenMonth(null); setTab("home"); setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#CBD5E1", flexShrink: 0 }}><Pencil size={12} /></button>
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

        return (
          <div style={{ padding: "0 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <SectionLabel style={{ margin: 0 }}>{t.year}</SectionLabel>
              <div style={{ display: "flex", gap: 6 }}>
                {availableYears.map((y) => (
                  <button key={y} onClick={() => { setStmtYear(parseInt(y)); setOpenMonth(null); }} style={{ padding: "6px 14px", borderRadius: 99, border: "none", cursor: "pointer", fontFamily: FONT_FAMILY, fontSize: 13, fontWeight: 600, background: stmtYear === parseInt(y) ? T.indigo : "#FFFFFF", color: stmtYear === parseInt(y) ? "#FFFFFF" : "#64748B", boxShadow: stmtYear === parseInt(y) ? "0 2px 10px rgba(79,70,229,0.3)" : "0 1px 4px rgba(15,23,42,0.06)" }}>{y}</button>
                ))}
              </div>
            </div>
            <div style={{ ...T.card, padding: "20px 22px", marginBottom: 12 }}>
              <p style={{ ...T.label, margin: "0 0 5px", fontFamily: FONT_FAMILY }}>{t.yearTotal(stmtYear)}</p>
              <p style={{ ...T.h1, fontSize: 32, marginBottom: 16 }}>{fmt(yearTotal)}</p>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 68 }}>
                {yearMonthData.map(({ name, key, total }) => {
                  const heightPct = maxMonthAmt > 0 ? total / maxMonthAmt : 0;
                  const isNow = key === currentMonth();
                  return (
                    <div key={key} onClick={() => { if (total > 0) { setStmtCat(null); setOpenMonth(key); } }} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: total > 0 ? "pointer" : "default" }}>
                      <div style={{ width: "100%", height: 52, display: "flex", alignItems: "flex-end" }}>
                        <div style={{ width: "100%", height: `${Math.max(heightPct * 100, total > 0 ? 8 : 3)}%`, minHeight: total > 0 ? 5 : 2, borderRadius: "5px 5px 2px 2px", background: isNow ? "#818CF8" : total > 0 ? "#C7D2FE" : "#F1F5F9", transition: "all 0.3s" }} />
                      </div>
                      <span style={{ fontSize: 8, fontWeight: isNow ? 700 : 400, color: isNow ? "#4F46E5" : "#94A3B8", textAlign: "center", fontFamily: FONT_FAMILY }}>{name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <SectionLabel>{t.allMonths}</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 24 }}>
              {yearMonthData.map(({ name, key, txns, total, incomeTotal, monthIdx }) => {
                const isNow   = key === currentMonth();
                const hasData = txns.length > 0;
                const catKeys = [...new Set(txns.filter((tx) => tx.type !== "income").map((tx) => tx.category))];
                const incomeCatKeys = [...new Set(txns.filter((tx) => tx.type === "income").map((tx) => tx.category))];
                return (
                  <button key={key}
                    onClick={() => { setActiveDetailMonth({ key, year: stmtYear, monthIdx, name }); setDetailCat(null); }}
                    style={{ width: "100%", ...T.card, padding: "16px 16px", border: "none", cursor: "pointer", textAlign: "left", fontFamily: FONT_FAMILY, transition: "transform 0.15s, box-shadow 0.15s", outline: isNow ? `2px solid ${T.indigo}` : "none" }}
                    onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.96)"; }}
                    onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                    onTouchStart={(e) => { e.currentTarget.style.transform = "scale(0.96)"; }}
                    onTouchEnd={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 7 }}>
                      <div>
                        <span style={{ fontSize: 15, fontWeight: 600, color: isNow ? T.indigo : "#0F172A", fontFamily: FONT_FAMILY }}>{name}</span>
                        {isNow && <span style={{ fontSize: 9, fontWeight: 600, background: T.indigoLight, color: T.indigo, padding: "2px 7px", borderRadius: 99, marginLeft: 6, fontFamily: FONT_FAMILY }}>{t.now}</span>}
                      </div>
                      <ChevronRight size={13} color={hasData ? "#94A3B8" : "#CBD5E1"} />
                    </div>
                    <p style={{ fontFamily: MONO_FAMILY, fontSize: 15, fontWeight: 600, color: total > 0 ? "#EF4444" : (hasData ? "#0F172A" : "#CBD5E1"), margin: "0 0 3px" }}>
                      {total > 0 ? `−${fmt(total)}` : (hasData ? fmt(total) : fmt(0))}
                    </p>
                    {incomeTotal > 0 && (
                      <p style={{ fontFamily: MONO_FAMILY, fontSize: 12, fontWeight: 600, color: "#15803D", margin: "0 0 6px" }}>+{fmt(incomeTotal)}</p>
                    )}
                    {hasData ? (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: incomeTotal > 0 ? 0 : 4 }}>
                        <div style={{ display: "flex", gap: 3 }}>
                          {catKeys.slice(0, 3).map((cv) => <span key={cv} style={{ fontSize: 13 }}>{getCat(cv, language).icon}</span>)}
                          {incomeCatKeys.slice(0, 1).map((cv) => { const ic = getIncomeCategory(cv, language); return ic ? <span key={cv} style={{ fontSize: 13 }}>{ic.icon}</span> : null; })}
                        </div>
                        <span style={{ fontSize: 10, color: "#94A3B8", fontWeight: 400, fontFamily: FONT_FAMILY }}>{txns.length} tx</span>
                      </div>
                    ) : (
                      <p style={{ fontSize: 11, color: "#CBD5E1", margin: 0, fontWeight: 400, fontFamily: FONT_FAMILY }}>{t.noExpenses}</p>
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
            <p style={{ ...T.h2, margin: "0 0 16px", fontFamily: FONT_FAMILY }}>{t.budgetLimits}</p>
            <p style={{ ...T.label, margin: "0 0 8px", fontFamily: FONT_FAMILY }}>{t.monthlyTotalTHB}</p>
            <input type="text" inputMode="decimal" placeholder="e.g. 30,000" value={budgets.total}
              onChange={(e) => setBudgets({ ...budgets, total: e.target.value })}
              style={{ ...T.input, fontFamily: MONO_FAMILY, fontSize: 18, fontWeight: 600, marginBottom: 16 }} />
            <p style={{ ...T.label, margin: "0 0 10px", fontFamily: FONT_FAMILY }}>{t.perCatLimits}</p>
            {CATEGORIES.map((cat) => (
              <div key={cat.value} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 11 }}>
                <div style={{ width: 36, height: 36, borderRadius: 12, background: cat.pastelBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>{cat.icon}</div>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#334155", minWidth: 80, fontFamily: FONT_FAMILY }}>{cat.labelShort}</span>
                <input type="text" inputMode="decimal" placeholder={t.noLimit} value={budgets.categories?.[cat.value] || ""}
                  onChange={(e) => setBudgets({ ...budgets, categories: { ...budgets.categories, [cat.value]: e.target.value } })}
                  style={{ ...T.input, flex: 1, fontFamily: MONO_FAMILY, fontSize: 14, padding: "9px 13px" }} />
              </div>
            ))}
          </CardWrap>

          {/* NEW: Export Data card */}
          <CardWrap>
            <p style={{ ...T.h2, margin: "0 0 4px", fontFamily: FONT_FAMILY }}>📤 Export Data</p>
            <p style={{ ...T.muted, margin: "0 0 14px", fontSize: 12, fontFamily: FONT_FAMILY }}>Download all {transactions.length} transactions as a CSV file</p>
            <button onClick={handleExportCSV} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 18px", borderRadius: 14, border: "none", background: "#0F172A", color: "#F8FAFC", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: FONT_FAMILY }}>
              <Download size={15} /> Export CSV
            </button>
          </CardWrap>
          <CardWrap>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <p style={{ ...T.h2, margin: 0, fontFamily: FONT_FAMILY }}>{t.subscriptions}</p>
              <button onClick={() => setShowSubForm(!showSubForm)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 99, border: "none", cursor: "pointer", fontFamily: FONT_FAMILY, fontWeight: 600, fontSize: 13, background: showSubForm ? "#F1F5F9" : T.indigoLight, color: showSubForm ? "#64748B" : T.indigo }}>
                {showSubForm ? <><X size={12} /> {t.cancel}</> : <><Plus size={12} /> {t.addSub}</>}
              </button>
            </div>
            {showSubForm && (
              <div style={{ padding: "16px", background: "#F8F7F4", borderRadius: 18, marginBottom: 14 }}>
                <input placeholder={t.namePlaceholder} value={subForm.name} onChange={(e) => setSubForm({ ...subForm, name: e.target.value })} style={{ ...T.input, marginBottom: 9 }} />
                <input type="text" inputMode="decimal" placeholder={t.amountPlaceholder} value={subForm.amount} onChange={(e) => setSubForm({ ...subForm, amount: e.target.value })} style={{ ...T.input, fontFamily: MONO_FAMILY, fontSize: 16, fontWeight: 600, marginBottom: 9 }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 12 }}>
                  <div>
                    <p style={{ ...T.label, margin: "0 0 6px", fontFamily: FONT_FAMILY }}>{t.category}</p>
                    <select value={subForm.category} onChange={(e) => setSubForm({ ...subForm, category: e.target.value })} style={{ ...T.input, padding: "9px 11px" }}>
                      {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.icon} {c.labelShort}</option>)}
                    </select>
                  </div>
                  <div>
                    <p style={{ ...T.label, margin: "0 0 6px", fontFamily: FONT_FAMILY }}>{t.billingDay}</p>
                    <input type="text" inputMode="numeric"  placeholder="1–31" value={subForm.day} onChange={(e) => setSubForm({ ...subForm, day: e.target.value })} style={{ ...T.input, fontFamily: MONO_FAMILY, padding: "9px 11px" }} />
                  </div>
                </div>
                <button onClick={handleAddSub} style={{ width: "100%", padding: "12px", borderRadius: 14, border: "none", background: T.indigo, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: FONT_FAMILY }}>{t.saveSubscription}</button>
              </div>
            )}
            {subscriptions.length === 0 && !showSubForm && <p style={{ ...T.muted, textAlign: "center", margin: "8px 0", fontWeight: 400, fontSize: 13, fontFamily: FONT_FAMILY }}>{t.noSubsYet}</p>}
            {subscriptions.map((sub, i) => {
              const cat = getCat(sub.category, language);
              return (
                <div key={sub.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "13px 0", borderTop: i === 0 ? "none" : "1px solid #F1F5F9" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 13, background: cat.pastelBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>{cat.icon}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#0F172A", fontFamily: FONT_FAMILY }}>{sub.name}</p>
                    <p style={{ ...T.muted, margin: 0, fontSize: 12, fontFamily: FONT_FAMILY }}>{t.dayEachMonth(sub.day)}</p>
                  </div>
                  <span style={{ fontFamily: MONO_FAMILY, fontSize: 14, fontWeight: 600, color: "#EF4444" }}>{fmt(sub.amount)}</span>
                  <button onClick={() => setSubscriptions((p) => p.filter((s) => s.id !== sub.id))} style={{ background: "none", border: "none", cursor: "pointer", color: "#CBD5E1", padding: 6 }}><Trash2 size={14} /></button>
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
          const showBadge = id === "settings" && catAlertCount > 0;
          return (
            <button key={id} onClick={() => { setTab(id); setShowForm(false); }} style={{ flex: 1, padding: "10px 4px 15px", border: "none", background: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: active ? T.indigo : "#94A3B8", fontFamily: FONT_FAMILY, transition: "color 0.18s" }}>
              <div style={{ width: 32, height: 32, borderRadius: 11, background: active ? T.indigoLight : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.18s", position: "relative" }}>
                <Icon size={17} />
                {showBadge && <div style={{ position: "absolute", top: 4, right: 4, width: 7, height: 7, borderRadius: "50%", background: "#EF4444", border: "1.5px solid #F8F7F4" }} />}
              </div>
              <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, letterSpacing: "0.01em", fontFamily: FONT_FAMILY }}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
