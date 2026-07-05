import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from "react";
import { PlusCircle, Wallet, Trash2, Settings, BarChart2, Home, X, Plus, AlertTriangle, Scissors, BookOpen, ChevronDown, ChevronUp, Sparkles, ArrowLeft, ChevronLeft, ChevronRight, TrendingUp, Globe, Download, Pencil, RotateCcw, Bell, Type } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie } from "recharts";

// ═══════════════════════════════════════════════════════════════════════════════
// SPLITPRO — DATABASE LAYER
// ═══════════════════════════════════════════════════════════════════════════════
const _spTodayStr = () => new Date().toISOString().slice(0, 10);
const _spNowISO   = () => new Date().toISOString();
const _spUid      = () => "x" + Math.random().toString(36).slice(2, 11);
const _spFmt      = (n) => new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(Math.abs(n));
const _spFmtDate  = (d, lang = "EN") => { const dt = new Date(d + "T00:00:00"); const today = new Date(); const diff = Math.round((today - dt) / 864e5); if (diff === 0) return lang === "TH" ? "วันนี้" : "Today"; if (diff === 1) return lang === "TH" ? "เมื่อวาน" : "Yesterday"; return dt.toLocaleDateString(lang === "TH" ? "th-TH" : "en-US", { month: "short", day: "numeric" }); };
const _spFmtTime  = (iso) => new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

const SPDB = {
  _store: null,
  init() {
    try { const raw = localStorage.getItem("splitpro_db"); this._store = raw ? JSON.parse(raw) : this._seed(); }
    catch { this._store = this._seed(); }
    return this;
  },
  _seed() {
    // Start clean: only the app owner ("You") exists. No demo groups/expenses.
    return {
      groups: [],
      members: [
        { id: "u1", name: "You", initials: "YO", color: "#6C63FF" },
      ],
      expenses: [],
      settlements: [],
      activity: [],
    };
  },
  save() { try { localStorage.setItem("splitpro_db", JSON.stringify(this._store)); } catch {} },
  get(table) { return this._store[table] || []; },
  insert(table, row) { this._store[table] = [...(this._store[table] || []), row]; this.save(); },
  update(table, id, patch) { this._store[table] = this._store[table].map(r => r.id === id ? { ...r, ...patch } : r); this.save(); },
  delete(table, id) { this._store[table] = this._store[table].filter(r => r.id !== id); this.save(); },
};

// ─── Debt simplification engine ──────────────────────────────────────────────
function spSimplifyDebts(memberIds, expenses, settlements = []) {
  const net = {};
  memberIds.forEach(id => net[id] = 0);
  expenses.forEach(exp => {
    exp.splits.forEach(s => {
      if (s.id !== exp.paidBy) {
        net[exp.paidBy] = (net[exp.paidBy] || 0) + s.amount;
        net[s.id]       = (net[s.id] || 0) - s.amount;
      }
    });
  });
  settlements.forEach(s => {
    net[s.from] = (net[s.from] || 0) + s.amount;
    net[s.to]   = (net[s.to]   || 0) - s.amount;
  });
  const pos = [], neg = [];
  Object.entries(net).forEach(([id, bal]) => {
    if (bal > 0.5)  pos.push({ id, bal });
    if (bal < -0.5) neg.push({ id, bal: -bal });
  });
  pos.sort((a, b) => b.bal - a.bal); neg.sort((a, b) => b.bal - a.bal);
  const result = []; let pi = 0, ni = 0;
  while (pi < pos.length && ni < neg.length) {
    const p = pos[pi], n = neg[ni], amt = Math.min(p.bal, n.bal);
    result.push({ from: n.id, to: p.id, amount: Math.round(amt) });
    p.bal -= amt; n.bal -= amt;
    if (p.bal < 0.5) pi++; if (n.bal < 0.5) ni++;
  }
  return result;
}

// ─── NLP parser ──────────────────────────────────────────────────────────────
function spParseNL(text, members) {
  const result = { description: text, amount: 0, category: "Other", participants: [] };
  const amtMatch = text.match(/[\$฿€£]?\s*(\d+(?:\.\d{1,2})?)/);
  if (amtMatch) result.amount = parseFloat(amtMatch[1]);
  const catMap = [
    { cat: "Food",   words: ["dinner","lunch","breakfast","food","eat","restaurant","cafe","coffee"] },
    { cat: "Travel", words: ["uber","taxi","grab","bus","train","flight","bts","mrt","airport"] },
    { cat: "Stay",   words: ["hotel","airbnb","hostel","room","resort"] },
    { cat: "Fun",    words: ["movie","bar","club","concert","karaoke","beach"] },
    { cat: "Bills",  words: ["electric","water","internet","wifi","bill","gas","phone","rent"] },
    { cat: "Shop",   words: ["shopping","groceries","market","store"] },
  ];
  const lower = text.toLowerCase();
  for (const { cat, words } of catMap) {
    if (words.some(w => lower.includes(w))) { result.category = cat; break; }
  }
  members.forEach(m => { if (m.name !== "You" && lower.includes(m.name.toLowerCase())) result.participants.push(m.id); });
  result.description = text.replace(/[\$฿€£]?\s*\d+(?:\.\d{1,2})?/, "").replace(/\bwith\b|\bsplit\b/gi, "").trim() || text;
  return result;
}

// ─── SplitPro Categories ─────────────────────────────────────────────────────
const SP_CATS = [
  { v: "Food",   l: "Food",    icon: "🍜", color: "#FF6B6B" },
  { v: "Travel", l: "Travel",  icon: "🚇", color: "#4ECDC4" },
  { v: "Stay",   l: "Stay",    icon: "🏨", color: "#FFB347" },
  { v: "Fun",    l: "Fun",     icon: "🎉", color: "#A29BFE" },
  { v: "Bills",  l: "Bills",   icon: "⚡", color: "#FDCB6E" },
  { v: "Shop",   l: "Shopping",icon: "🛍️", color: "#74B9FF" },
  { v: "Other",  l: "Other",   icon: "📦", color: "#B2BEC3" },
];
const spGetCat = v => SP_CATS.find(c => c.v === v) || SP_CATS[SP_CATS.length - 1];

// Map a SplitPro category onto a main-app expense category so linked Home
// transactions land in a sensible bucket.
const SP_TO_APP_CAT = { Food: "Food", Travel: "Transport", Stay: "Other", Fun: "Other", Bills: "Bills", Shop: "Shopping", Other: "Other" };
const spToAppCat = v => SP_TO_APP_CAT[v] || "Other";

// ─── SplitPro i18n ───────────────────────────────────────────────────────────
const SP_T = {
  EN: {
    noGroups: "No groups yet", noGroupsSub: "Create a group to start tracking shared expenses",
    noExpenses: "No expenses yet", noExpensesSub: "Add the first expense to get started",
    noData: "No data yet", noDataSub: "Add expenses to see analytics",
    noFriends: "No friends yet", noFriendsSub: "Add members to your groups to see them here",
    noActivity: "No activity yet", noActivitySub: "Your expense history will appear here",
    balanced: "✓ Balanced", remaining: (v) => `Remaining: ${v}`,
    addExpense: "Add Expense", editExpense: "Edit Expense", quickAdd: "✨ Quick add",
    quickAddPh: 'e.g. "Dinner ฿1200 with Aom"', parse: "Parse", whatFor: "What's this for?",
    group: "Group", date: "Date", category: "Category", paidBy: "Paid by", splitMethod: "Split method",
    mEqual: "Equal", mCustom: "Custom", mPercent: "%", mShares: "Shares",
    errDesc: "Enter a description", errAmount: "Enter a valid amount", errGroup: "Select a group",
    errMember: "Include at least one member", errSum: (a) => `Amounts must sum to ${a}`, errPct: "Percentages must sum to 100%",
    saveExpense: "Save Expense", updateExpense: "Update Expense",
    newGroup: "New Group", groupNamePh: "Group name…", color: "Color", members: "Members",
    addMember: "Add new member", createGroup: "Create Group",
    settleUp: "Settle Up", allClear: "You're all clear!", nothingSettle: "Nothing to settle in this group",
    pay: (n) => `Pay ${n}`, paying: (n) => `Paying ${n}`, amount: "Amount", full: "Full", markSettled: (a) => `✓ Mark ${a} as settled`,
    paidWord: "paid", youPaid: "you paid", yourShareN: (a) => `your share ${a}`, notIncluded: "not included",
    splitDetails: "Split details", edit: "Edit", del: "Delete",
    tabExpenses: "Expenses", tabBalances: "Balances", tabAnalytics: "Analytics",
    membersExpenses: (m, e) => `${m} members · ${e} expenses`,
    stTotal: "Total", stYouPaid: "You paid", stYourShare: "Your share",
    addExpenseBtn: "+ Add expense", allSettled: "All settled up!", everyoneEven: "Everyone is even",
    memberBalances: "Member balances", spendByCat: "Spending by category", whoSpent: "Who spent what",
    confirmDelGroup: (n) => `Delete "${n}"? This removes its expenses and any linked transactions.`,
    settle: "Settle →",
    navGroups: "👥 Groups", navFriends: "◎ Friends", navActivity: "◈ Activity",
    netBalance: "Your net balance", othersOwe: "others owe you", youOweOthers: "you owe others",
    acrossGroups: (n) => `across ${n} groups`, newGroupBtn: "👥 New Group",
    totalMembers: (t, m) => `${t} total · ${m} members`,
    youreOwed: "You're owed", youOwe: "You owe", settled: "Settled", even: "Even",
    owedToYou: "Owed to you", owesYou: "owes you", sharedGroups: (n) => `${n} shared group${n !== 1 ? "s" : ""}`,
    tExpAdded: "Expense added ✓", tExpUpdated: "Expense updated ✓", tExpRemoved: "Expense removed",
    tGroupCreated: "Group created!", tGroupDeleted: "Group deleted", tSettled: "Settled up! 🎉",
    actAdded: (u, d, a, g) => `${u} added "${d}" (${a}) in ${g}`,
    actSettled: (u, a, to) => `${u} settled ${a}${to ? ` with ${to}` : ""}`,
    actGroupCreated: (n) => `Group "${n}" was created`,
    someone: "Someone", aGroup: "a group",
  },
  TH: {
    noGroups: "ยังไม่มีกลุ่ม", noGroupsSub: "สร้างกลุ่มเพื่อเริ่มติดตามค่าใช้จ่ายร่วมกัน",
    noExpenses: "ยังไม่มีรายการ", noExpensesSub: "เพิ่มรายการแรกเพื่อเริ่มต้น",
    noData: "ยังไม่มีข้อมูล", noDataSub: "เพิ่มรายการเพื่อดูสถิติ",
    noFriends: "ยังไม่มีเพื่อน", noFriendsSub: "เพิ่มสมาชิกในกลุ่มเพื่อแสดงที่นี่",
    noActivity: "ยังไม่มีกิจกรรม", noActivitySub: "ประวัติค่าใช้จ่ายจะแสดงที่นี่",
    balanced: "✓ สมดุลแล้ว", remaining: (v) => `เหลือ: ${v}`,
    addExpense: "เพิ่มรายการ", editExpense: "แก้ไขรายการ", quickAdd: "✨ เพิ่มด่วน",
    quickAddPh: 'เช่น "มื้อเย็น ฿1200 กับ อ้อม"', parse: "แยก", whatFor: "รายการนี้คืออะไร?",
    group: "กลุ่ม", date: "วันที่", category: "หมวดหมู่", paidBy: "ผู้จ่าย", splitMethod: "วิธีหาร",
    mEqual: "เท่ากัน", mCustom: "กำหนดเอง", mPercent: "%", mShares: "สัดส่วน",
    errDesc: "กรอกรายละเอียด", errAmount: "กรอกจำนวนเงินที่ถูกต้อง", errGroup: "เลือกกลุ่ม",
    errMember: "เลือกสมาชิกอย่างน้อยหนึ่งคน", errSum: (a) => `ยอดรวมต้องเท่ากับ ${a}`, errPct: "เปอร์เซ็นต์ต้องรวมได้ 100%",
    saveExpense: "บันทึกรายการ", updateExpense: "อัปเดตรายการ",
    newGroup: "กลุ่มใหม่", groupNamePh: "ชื่อกลุ่ม…", color: "สี", members: "สมาชิก",
    addMember: "เพิ่มสมาชิกใหม่", createGroup: "สร้างกลุ่ม",
    settleUp: "ชำระยอด", allClear: "คุณเคลียร์หมดแล้ว!", nothingSettle: "ไม่มียอดต้องชำระในกลุ่มนี้",
    pay: (n) => `จ่ายให้ ${n}`, paying: (n) => `กำลังจ่ายให้ ${n}`, amount: "จำนวน", full: "เต็มจำนวน", markSettled: (a) => `✓ ทำเครื่องหมายชำระ ${a}`,
    paidWord: "จ่าย", youPaid: "คุณจ่าย", yourShareN: (a) => `ส่วนของคุณ ${a}`, notIncluded: "ไม่ได้ร่วม",
    splitDetails: "รายละเอียดการหาร", edit: "แก้ไข", del: "ลบ",
    tabExpenses: "รายการ", tabBalances: "ยอดคงเหลือ", tabAnalytics: "สถิติ",
    membersExpenses: (m, e) => `${m} สมาชิก · ${e} รายการ`,
    stTotal: "ทั้งหมด", stYouPaid: "คุณจ่าย", stYourShare: "ส่วนของคุณ",
    addExpenseBtn: "+ เพิ่มรายการ", allSettled: "ชำระครบแล้ว!", everyoneEven: "ทุกคนเท่ากันแล้ว",
    memberBalances: "ยอดของสมาชิก", spendByCat: "ค่าใช้จ่ายตามหมวดหมู่", whoSpent: "ใครจ่ายเท่าไหร่",
    confirmDelGroup: (n) => `ลบ "${n}"? การกระทำนี้จะลบรายการและธุรกรรมที่เชื่อมโยงทั้งหมด`,
    settle: "ชำระ →",
    navGroups: "👥 กลุ่ม", navFriends: "◎ เพื่อน", navActivity: "◈ กิจกรรม",
    netBalance: "ยอดสุทธิของคุณ", othersOwe: "คนอื่นเป็นหนี้คุณ", youOweOthers: "คุณเป็นหนี้คนอื่น",
    acrossGroups: (n) => `จาก ${n} กลุ่ม`, newGroupBtn: "👥 กลุ่มใหม่",
    totalMembers: (t, m) => `${t} ทั้งหมด · ${m} สมาชิก`,
    youreOwed: "คุณจะได้รับ", youOwe: "คุณต้องจ่าย", settled: "ชำระแล้ว", even: "เท่ากัน",
    owedToYou: "ยอดที่จะได้รับ", owesYou: "เป็นหนี้คุณ", sharedGroups: (n) => `${n} กลุ่มร่วมกัน`,
    tExpAdded: "เพิ่มรายการแล้ว ✓", tExpUpdated: "อัปเดตรายการแล้ว ✓", tExpRemoved: "ลบรายการแล้ว",
    tGroupCreated: "สร้างกลุ่มแล้ว!", tGroupDeleted: "ลบกลุ่มแล้ว", tSettled: "ชำระยอดแล้ว! 🎉",
    actAdded: (u, d, a, g) => `${u} เพิ่ม "${d}" (${a}) ใน ${g}`,
    actSettled: (u, a, to) => `${u} ชำระ ${a}${to ? ` ให้ ${to}` : ""}`,
    actGroupCreated: (n) => `สร้างกลุ่ม "${n}" แล้ว`,
    someone: "บางคน", aGroup: "กลุ่ม",
  },
};

// ─── SplitPro Shared Atoms ───────────────────────────────────────────────────
const SP_FONT = "'IBM Plex Sans Thai','Kanit',-apple-system,sans-serif";
const SP_MONO = "'IBM Plex Mono','DM Mono',monospace";

function SpSheet({ onClose, title, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 600, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--surface)", borderRadius: "26px 26px 0 0", padding: "0 20px 44px", width: "100%", maxWidth: 430, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 -20px 60px rgba(0,0,0,0.2)", animation: "spSlideUp 0.32s cubic-bezier(0.32,0.72,0,1)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0 20px", position: "sticky", top: 0, background: "var(--surface)", zIndex: 10 }}>
          <div style={{ width: 40, height: 4, borderRadius: 99, background: "var(--border)", margin: "0 auto", position: "absolute", left: "50%", transform: "translateX(-50%)", top: 8 }} />
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text)", fontFamily: SP_FONT }}>{title}</h3>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 99, background: "var(--fill)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-2)", fontSize: 16 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SpAvatar({ m, size = 36 }) {
  if (!m) return <div style={{ width: size, height: size, borderRadius: size * 0.35, background: "var(--border)", flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.35, background: m.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.33, fontWeight: 700, color: "#fff", flexShrink: 0, fontFamily: SP_FONT }}>
      {m.initials}
    </div>
  );
}

function SpEmpty({ icon, title, sub }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px", background: "var(--surface)", borderRadius: 22, border: "1px solid var(--border)", marginBottom: 12 }}>
      <div style={{ fontSize: 44, marginBottom: 12 }}>{icon}</div>
      <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: "0 0 6px", fontFamily: SP_FONT }}>{title}</p>
      <p style={{ fontSize: 13, color: "var(--text-3)", margin: 0, lineHeight: 1.5, fontFamily: SP_FONT }}>{sub}</p>
    </div>
  );
}

function SpValidationBar({ val, target, suffix = "", L }) {
  const ok = Math.abs(val - target) < 1;
  return (
    <div style={{ marginTop: 10, padding: "8px 12px", background: ok ? "#F0FDF4" : "#FFF1F2", borderRadius: 10, border: `1px solid ${ok ? "#BBF7D0" : "#FECDD3"}` }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: ok ? "#15803D" : "#BE123C", fontFamily: SP_FONT }}>{ok ? L.balanced : L.remaining(`${(target - val).toFixed(0)}${suffix}`)}</p>
    </div>
  );
}

// ─── AddExpenseModal ──────────────────────────────────────────────────────────
function SpAddExpenseModal({ data, me, activeGid, editExpense, onSave, onClose, L }) {
  const ed = editExpense || null;
  const [nlText,     setNlText]     = useState("");
  const [desc,       setDesc]       = useState(ed?.description || "");
  const [amount,     setAmount]     = useState(ed ? String(ed.amount) : "");
  const [category,   setCategory]   = useState(ed?.category || "Food");
  const [paidBy,     setPaidBy]     = useState(ed?.paidBy || me?.id || "");
  const [groupId,    setGroupId]    = useState(ed?.groupId || activeGid || data.groups[0]?.id || "");
  const [date,       setDate]       = useState(ed?.date || _spTodayStr());
  // Editing prefills exact per-member amounts via the "custom" method so the
  // original split is preserved precisely regardless of how it was created.
  const [method,     setMethod]     = useState(ed ? "custom" : "equal");
  const [included,   setIncluded]   = useState(ed ? ed.splits.map(s => s.id) : []);
  const [customAmts, setCustomAmts] = useState(ed ? Object.fromEntries(ed.splits.map(s => [s.id, String(s.amount)])) : {});
  const [percents,   setPercents]   = useState({});
  const [shares,     setShares]     = useState({});
  const [error,      setError]      = useState("");
  const amtRef = useRef(null);

  const group   = data.groups.find(g => g.id === groupId);
  const members = group ? data.members.filter(m => group.memberIds.includes(m.id)) : [];

  useEffect(() => { if (members.length && included.length === 0) setIncluded(members.map(m => m.id)); }, [groupId]);
  useEffect(() => { setTimeout(() => amtRef.current?.focus(), 300); }, []);

  const handleNLP = () => {
    const p = spParseNL(nlText, members);
    setDesc(p.description);
    if (p.amount > 0) setAmount(String(p.amount));
    setCategory(p.category);
    if (p.participants.length > 0) setIncluded([me.id, ...p.participants]);
  };

  const amt = parseFloat(amount) || 0;
  const totalCustom = included.reduce((s, id) => s + (parseFloat(customAmts[id]) || 0), 0);
  const totalPct    = included.reduce((s, id) => s + (parseFloat(percents[id]) || 0), 0);
  const totalShares = included.reduce((s, id) => s + (parseFloat(shares[id]) || 1), 0);

  const getSplits = () => {
    if (method === "equal")   return included.map(id => ({ id, amount: Math.round(amt / included.length * 100) / 100 }));
    if (method === "custom")  return included.map(id => ({ id, amount: parseFloat(customAmts[id]) || 0 }));
    if (method === "percent") return included.map(id => ({ id, amount: Math.round((parseFloat(percents[id]) || 0) / 100 * amt * 100) / 100 }));
    if (method === "shares")  { const each = amt / totalShares; return included.map(id => ({ id, amount: Math.round((parseFloat(shares[id]) || 1) * each * 100) / 100 })); }
    return [];
  };

  const handleSave = () => {
    if (!desc.trim()) { setError(L.errDesc); return; }
    if (amt <= 0)     { setError(L.errAmount); return; }
    if (!groupId)     { setError(L.errGroup); return; }
    if (included.length === 0) { setError(L.errMember); return; }
    if (method === "custom" && Math.abs(totalCustom - amt) > 1) { setError(L.errSum(_spFmt(amt))); return; }
    if (method === "percent" && Math.abs(totalPct - 100) > 1)   { setError(L.errPct); return; }
    onSave({ id: ed?.id || _spUid(), groupId, description: desc.trim(), amount: amt, category, paidBy, date, splits: getSplits(), createdAt: ed?.createdAt || _spNowISO(), note: ed?.note || "" });
  };

  const indigo = "var(--primary)";
  const indigoLight = "var(--primary-tint)";

  return (
    <SpSheet onClose={onClose} title={ed ? L.editExpense : L.addExpense}>
      {error && <div style={{ background: "#FFF1F2", border: "1px solid #FECDD3", borderRadius: 12, padding: "10px 14px", marginBottom: 14, fontSize: 13, fontWeight: 600, color: "#BE123C", fontFamily: SP_FONT }}>{error}</div>}

      {/* NLP */}
      <div style={{ background: "var(--bg)", borderRadius: 16, padding: "12px 14px", marginBottom: 14, border: "1px solid var(--border)" }}>
        <p style={{ margin: "0 0 7px", fontSize: 10, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: SP_FONT }}>{L.quickAdd}</p>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={nlText} onChange={e => setNlText(e.target.value)} onKeyDown={e => e.key === "Enter" && nlText && handleNLP()} placeholder={L.quickAddPh} style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 13, color: "var(--text)", fontFamily: SP_FONT }} />
          {nlText && <button onClick={handleNLP} style={{ background: indigo, color: "#fff", border: "none", borderRadius: 9, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: SP_FONT }}>{L.parse}</button>}
        </div>
      </div>

      {/* Amount hero */}
      <div style={{ background: "var(--surface)", borderRadius: 20, padding: "18px 20px", marginBottom: 12, border: "1.5px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: "var(--text-3)", fontFamily: SP_MONO }}>฿</span>
          <input ref={amtRef} type="text" inputMode="decimal" value={amount} onChange={e => { setAmount(e.target.value); setError(""); }} placeholder="0" style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 40, fontWeight: 700, color: "var(--text)", fontFamily: SP_MONO, letterSpacing: "-2px" }} />
        </div>
        <input value={desc} onChange={e => { setDesc(e.target.value); setError(""); }} placeholder={L.whatFor} style={{ width: "100%", background: "transparent", border: "none", borderTop: "1px solid var(--border)", outline: "none", padding: "12px 0 0", fontSize: 15, fontWeight: 600, color: "var(--text)", fontFamily: SP_FONT, boxSizing: "border-box" }} />
      </div>

      {/* Group + Date */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        <div>
          <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: SP_FONT }}>{L.group}</p>
          <select value={groupId} onChange={e => { setGroupId(e.target.value); setIncluded([]); }} style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1.5px solid var(--border)", fontSize: 13, fontFamily: SP_FONT, color: "var(--text)", outline: "none", background: "var(--bg)" }}>
            {data.groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div>
          <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: SP_FONT }}>{L.date}</p>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1.5px solid var(--border)", fontSize: 13, fontFamily: SP_FONT, color: "var(--text)", outline: "none", background: "var(--bg)", boxSizing: "border-box" }} />
        </div>
      </div>

      {/* Category pills */}
      <div style={{ marginBottom: 12 }}>
        <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: SP_FONT }}>{L.category}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {SP_CATS.map(c => (
            <button key={c.v} onClick={() => setCategory(c.v)} style={{ padding: "6px 12px", borderRadius: 99, border: `1.5px solid ${category === c.v ? c.color : "transparent"}`, background: category === c.v ? `${c.color}22` : "var(--bg)", color: category === c.v ? c.color : "var(--text-2)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: SP_FONT, display: "flex", alignItems: "center", gap: 5 }}>
              {c.icon} {c.l}
            </button>
          ))}
        </div>
      </div>

      {/* Paid by */}
      {members.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: SP_FONT }}>{L.paidBy}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {members.map(m => (
              <button key={m.id} onClick={() => setPaidBy(m.id)} style={{ padding: "7px 14px", borderRadius: 99, border: `1.5px solid ${paidBy === m.id ? m.color : "transparent"}`, background: paidBy === m.id ? `${m.color}22` : "var(--bg)", color: paidBy === m.id ? m.color : "var(--text-2)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: SP_FONT, display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 16, height: 16, borderRadius: 99, background: m.color, flexShrink: 0 }} />{m.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Split method */}
      {members.length > 0 && (
        <div style={{ background: "var(--bg)", borderRadius: 20, padding: "16px", marginBottom: 16, border: "1px solid var(--border)" }}>
          <p style={{ margin: "0 0 10px", fontSize: 10, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: SP_FONT }}>{L.splitMethod}</p>
          <div style={{ display: "flex", gap: 4, background: "var(--border)", borderRadius: 12, padding: 3, marginBottom: 14 }}>
            {[["equal",L.mEqual],["custom",L.mCustom],["percent",L.mPercent],["shares",L.mShares]].map(([v,l]) => (
              <button key={v} onClick={() => setMethod(v)} style={{ flex: 1, padding: "7px 4px", borderRadius: 10, border: "none", fontFamily: SP_FONT, fontSize: 11, fontWeight: 700, cursor: "pointer", background: method === v ? "var(--surface)" : "transparent", color: method === v ? "var(--text)" : "var(--text-3)", boxShadow: method === v ? "0 1px 6px rgba(15,23,42,0.10)" : "none", transition: "all 0.15s" }}>{l}</button>
            ))}
          </div>
          {members.map(m => {
            const isIn = included.includes(m.id);
            const shareCount = parseFloat(shares[m.id]) || 1;
            return (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
                <button onClick={() => setIncluded(p => isIn ? p.filter(x => x !== m.id) : [...p, m.id])} style={{ width: 22, height: 22, borderRadius: 7, border: `1.5px solid ${isIn ? m.color : "var(--border)"}`, background: isIn ? m.color : "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                  {isIn && <span style={{ fontSize: 9, color: "#fff", fontWeight: 700 }}>✓</span>}
                </button>
                <SpAvatar m={m} size={28} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: isIn ? "var(--text)" : "var(--text-3)", fontFamily: SP_FONT }}>{m.name}</span>
                {isIn && method === "equal"   && <span style={{ fontSize: 12, fontWeight: 700, color: indigo, fontFamily: SP_MONO }}>{included.length > 0 ? _spFmt(amt / included.length) : ""}</span>}
                {isIn && method === "custom"  && <input type="text" inputMode="decimal" placeholder="฿0" value={customAmts[m.id] || ""} onChange={e => setCustomAmts(p => ({ ...p, [m.id]: e.target.value }))} style={{ width: 80, padding: "5px 9px", borderRadius: 9, border: "1.5px solid var(--border)", fontSize: 12, fontFamily: SP_MONO, fontWeight: 700, color: "var(--text)", outline: "none", background: "var(--surface)", textAlign: "right" }} />}
                {isIn && method === "percent" && <div style={{ display: "flex", alignItems: "center", gap: 3 }}><input type="text" inputMode="decimal" placeholder="0" value={percents[m.id] || ""} onChange={e => setPercents(p => ({ ...p, [m.id]: e.target.value }))} style={{ width: 52, padding: "5px 8px", borderRadius: 9, border: "1.5px solid var(--border)", fontSize: 12, fontFamily: SP_MONO, fontWeight: 700, color: "var(--text)", outline: "none", background: "var(--surface)", textAlign: "right" }} /><span style={{ fontSize: 11, color: "var(--text-3)" }}>%</span></div>}
                {isIn && method === "shares"  && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button onClick={() => setShares(p => ({ ...p, [m.id]: Math.max(1, (parseFloat(p[m.id]) || 1) - 1) }))} style={{ width: 24, height: 24, borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>-</button>
                    <span style={{ fontSize: 12, fontWeight: 700, color: indigo, minWidth: 16, textAlign: "center" }}>{shareCount}</span>
                    <button onClick={() => setShares(p => ({ ...p, [m.id]: (parseFloat(p[m.id]) || 1) + 1 }))} style={{ width: 24, height: 24, borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                  </div>
                )}
              </div>
            );
          })}
          {method === "custom"  && <SpValidationBar val={totalCustom} target={amt} L={L} />}
          {method === "percent" && <SpValidationBar val={totalPct} target={100} suffix="%" L={L} />}
        </div>
      )}

      <button onClick={handleSave} style={{ width: "100%", padding: "15px", borderRadius: 18, border: "none", background: indigo, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: SP_FONT, boxShadow: "0 8px 24px rgba(79,70,229,0.3)", letterSpacing: "-0.3px" }}>
        {ed ? L.updateExpense : L.saveExpense}
      </button>
    </SpSheet>
  );
}

// ─── AddGroupModal ────────────────────────────────────────────────────────────
const SP_EMOJIS = ["✈️","🏠","🎉","🍜","🏕️","💼","🎓","🎮","🛍️","💪","🏖️","🎸","🍕","🎯","🌴"];
const SP_COLORS = ["#FF6B6B","#4ECDC4","#FFB347","#A29BFE","#74B9FF","#55EFC4","#FDCB6E","#E17055","var(--primary)","#00CEC9"];

function SpAddGroupModal({ data, me, onSave, onClose, L }) {
  const [name,    setName]    = useState("");
  const [emoji,   setEmoji]   = useState("✈️");
  const [color,   setColor]   = useState("var(--primary)");
  const [members, setMembers] = useState([me?.id || "u1"]);
  const [newMem,  setNewMem]  = useState("");
  const [tempMembers, setTempMembers] = useState([]);

  const addTempMember = () => {
    if (!newMem.trim()) return;
    const id = _spUid(), initials = newMem.trim().slice(0, 2).toUpperCase();
    const colors = ["#FF6B6B","#4ECDC4","#FFB347","#A29BFE","#74B9FF"];
    const nm = { id, name: newMem.trim(), initials, color: colors[tempMembers.length % colors.length] };
    setTempMembers(p => [...p, nm]);
    setMembers(p => [...p, id]);
    setNewMem("");
    SPDB.insert("members", nm);
  };

  const allMembers = [...data.members, ...tempMembers];

  const save = () => {
    if (!name.trim()) return;
    onSave({ id: _spUid(), name: `${emoji} ${name.trim()}`, emoji, color, createdAt: _spTodayStr(), memberIds: members, archivedAt: null });
  };

  return (
    <SpSheet onClose={onClose} title={L.newGroup}>
      <div style={{ background: "var(--surface)", borderRadius: 18, padding: "16px", marginBottom: 12, border: "1.5px solid var(--border)", display: "flex", gap: 12, alignItems: "center" }}>
        <button onClick={() => setEmoji(SP_EMOJIS[(SP_EMOJIS.indexOf(emoji) + 1) % SP_EMOJIS.length])} style={{ width: 52, height: 52, borderRadius: 16, background: `${color}22`, border: `1.5px solid ${color}44`, fontSize: 24, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>{emoji}</button>
        <input value={name} onChange={e => setName(e.target.value)} placeholder={L.groupNamePh} autoFocus style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 17, fontWeight: 700, color: "var(--text)", fontFamily: SP_FONT }} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: SP_FONT }}>{L.color}</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {SP_COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)} style={{ width: 32, height: 32, borderRadius: 99, background: c, border: color === c ? "3px solid #fff" : "3px solid transparent", outline: color === c ? `3px solid ${c}` : "none", cursor: "pointer", transition: "all 0.15s" }} />
          ))}
        </div>
      </div>
      <div style={{ background: "var(--bg)", borderRadius: 18, padding: "16px", marginBottom: 16, border: "1px solid var(--border)" }}>
        <p style={{ margin: "0 0 12px", fontSize: 10, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: SP_FONT }}>{L.members}</p>
        {allMembers.map(m => (
          <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
            <button onClick={() => setMembers(p => p.includes(m.id) ? p.filter(x => x !== m.id) : [...p, m.id])} style={{ width: 22, height: 22, borderRadius: 7, border: `1.5px solid ${members.includes(m.id) ? m.color : "var(--border)"}`, background: members.includes(m.id) ? m.color : "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
              {members.includes(m.id) && <span style={{ fontSize: 9, color: "#fff", fontWeight: 700 }}>✓</span>}
            </button>
            <SpAvatar m={m} size={30} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", fontFamily: SP_FONT }}>{m.name}</span>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input value={newMem} onChange={e => setNewMem(e.target.value)} onKeyDown={e => e.key === "Enter" && addTempMember()} placeholder={L.addMember} style={{ flex: 1, padding: "10px 13px", borderRadius: 12, border: "1.5px solid var(--border)", fontSize: 13, fontFamily: SP_FONT, color: "var(--text)", outline: "none", background: "var(--surface)" }} />
          <button onClick={addTempMember} style={{ width: 40, height: 40, borderRadius: 12, border: "none", background: "var(--primary)", color: "#fff", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>+</button>
        </div>
      </div>
      <button onClick={save} disabled={!name.trim()} style={{ width: "100%", padding: "15px", borderRadius: 18, border: "none", background: name.trim() ? "var(--primary)" : "var(--border)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: name.trim() ? "pointer" : "not-allowed", fontFamily: SP_FONT, boxShadow: name.trim() ? "0 8px 24px rgba(79,70,229,0.3)" : "none" }}>
        {L.createGroup}
      </button>
    </SpSheet>
  );
}

// ─── SettleModal ──────────────────────────────────────────────────────────────
function SpSettleModal({ data, me, gid, allBalances, onSave, onClose, L }) {
  const debts    = allBalances[gid]?.debts || [];
  const myDebts  = debts.filter(d => d.from === me?.id);
  const [selected, setSelected] = useState(myDebts[0] || null);
  const [partial,  setPartial]  = useState(selected?.amount || 0);
  useEffect(() => { if (selected) setPartial(selected.amount); }, [selected]);

  const settle = () => {
    if (!selected || partial <= 0) return;
    onSave({ id: _spUid(), groupId: gid, from: selected.from, to: selected.to, amount: parseFloat(partial), date: _spTodayStr(), createdAt: _spNowISO() });
  };
  const to = data.members.find(m => m.id === selected?.to);

  return (
    <SpSheet onClose={onClose} title={L.settleUp}>
      {myDebts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px" }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>🎉</div>
          <p style={{ fontSize: 16, fontWeight: 700, color: "#15803D", margin: "0 0 4px", fontFamily: SP_FONT }}>{L.allClear}</p>
          <p style={{ fontSize: 12, color: "var(--text-3)", margin: 0, fontFamily: SP_FONT }}>{L.nothingSettle}</p>
        </div>
      ) : (
        <>
          {myDebts.map(d => {
            const toM = data.members.find(m => m.id === d.to);
            return (
              <div key={`${d.from}-${d.to}`} onClick={() => setSelected(d)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 16, marginBottom: 8, border: `2px solid ${selected?.to === d.to ? "var(--primary)" : "var(--border)"}`, background: selected?.to === d.to ? "var(--primary-tint)" : "var(--surface)", cursor: "pointer" }}>
                <SpAvatar m={toM} size={40} />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 700, color: "var(--text)", fontFamily: SP_FONT }}>{L.pay(toM?.name)}</p>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#EF4444", fontFamily: SP_MONO }}>{_spFmt(d.amount)}</p>
                </div>
                {selected?.to === d.to && <span style={{ fontSize: 14, color: "var(--primary)" }}>✓</span>}
              </div>
            );
          })}
          {selected && (
            <div style={{ background: "var(--bg)", borderRadius: 20, padding: "20px", marginTop: 8, border: "1px solid var(--border)" }}>
              <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 600, color: "var(--text-2)", fontFamily: SP_FONT }}>{L.paying(to?.name)}</p>
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: "var(--text-3)", fontFamily: SP_FONT }}>{L.amount}: {_spFmt(partial)}</span>
                  <span style={{ fontSize: 12, color: "var(--text-3)", fontFamily: SP_FONT }}>{L.full}: {_spFmt(selected.amount)}</span>
                </div>
                <input type="range" min={1} max={selected.amount} value={partial} onChange={e => setPartial(Number(e.target.value))} step={1} style={{ width: "100%", accentColor: "var(--primary)" }} />
              </div>
              <button onClick={settle} style={{ width: "100%", padding: "14px", borderRadius: 16, border: "none", background: "#10B981", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: SP_FONT, boxShadow: "0 8px 24px rgba(16,185,129,0.3)" }}>
                {L.markSettled(_spFmt(partial))}
              </button>
            </div>
          )}
        </>
      )}
    </SpSheet>
  );
}

// ─── GroupExpenseRow ──────────────────────────────────────────────────────────
function SpExpenseRow({ e, data, me, onEdit, onDelete, L, lang }) {
  const [expanded, setExpanded] = useState(false);
  const cat   = spGetCat(e.category);
  const payer = data.members.find(m => m.id === e.paidBy);
  const myShare  = e.splits.find(s => s.id === me?.id)?.amount || 0;
  const iMePaid  = e.paidBy === me?.id;

  return (
    <div style={{ background: "var(--surface)", borderRadius: 16, marginBottom: 6, border: "1px solid var(--border)", overflow: "hidden" }}>
      <div onClick={() => setExpanded(x => !x)} style={{ padding: "13px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
        <div style={{ width: 40, height: 40, borderRadius: 13, background: `${cat.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, border: `1px solid ${cat.color}33` }}>{cat.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: SP_FONT }}>{e.description}</p>
          <p style={{ margin: 0, fontSize: 11, color: "var(--text-3)", fontFamily: SP_FONT }}>{payer?.name} {L.paidWord} · {_spFmtDate(e.date, lang)}</p>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p style={{ margin: "0 0 2px", fontSize: 15, fontWeight: 700, color: "var(--text)", fontFamily: SP_MONO }}>{_spFmt(e.amount)}</p>
          <p style={{ margin: 0, fontSize: 10, color: iMePaid ? "#15803D" : myShare > 0 ? "#EF4444" : "var(--text-3)", fontWeight: 700, fontFamily: SP_FONT }}>{iMePaid ? L.youPaid : myShare > 0 ? L.yourShareN(_spFmt(myShare)) : L.notIncluded}</p>
        </div>
      </div>
      {expanded && (
        <div style={{ padding: "0 14px 13px", borderTop: "1px solid var(--fill)" }}>
          <p style={{ margin: "10px 0 7px", fontSize: 10, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: SP_FONT }}>{L.splitDetails}</p>
          {e.splits.map(s => {
            const m = data.members.find(x => x.id === s.id);
            return (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: "var(--text-2)", display: "flex", alignItems: "center", gap: 6, fontFamily: SP_FONT }}><SpAvatar m={m} size={18} />{m?.name}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", fontFamily: SP_MONO }}>{_spFmt(s.amount)}</span>
              </div>
            );
          })}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={() => onEdit(e)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 9, border: "none", background: "var(--primary-tint)", color: "var(--primary)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: SP_FONT }}>✏️ {L.edit}</button>
            <button onClick={() => onDelete(e.id)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 9, border: "none", background: "#FFF1F2", color: "#EF4444", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: SP_FONT }}>🗑 {L.del}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── GroupDetailScreen ────────────────────────────────────────────────────────
function SpGroupDetail({ data, me, gid, allBalances, onBack, onAddExpense, onEditExpense, onSettle, onDelete, onDeleteGroup, L, lang }) {
  const [tab, setTab] = useState("expenses");
  const g = data.groups.find(x => x.id === gid);
  if (!g) return null;
  const expenses = data.expenses.filter(e => e.groupId === gid);
  const gMembers = data.members.filter(m => g.memberIds.includes(m.id));
  const bal   = allBalances[gid] || {};
  const debts = bal.debts || [];
  const total = bal.total || 0;
  const meShare = expenses.reduce((s, e) => s + (e.splits.find(sp => sp.id === me.id)?.amount || 0), 0);
  const mePaid  = expenses.filter(e => e.paidBy === me.id).reduce((s, e) => s + e.amount, 0);

  const grouped = useMemo(() => {
    const g2 = {};
    [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(e => {
      const k = _spFmtDate(e.date, lang);
      if (!g2[k]) g2[k] = [];
      g2[k].push(e);
    });
    return g2;
  }, [expenses, lang]);

  const catSpend = useMemo(() => {
    const r = {};
    expenses.forEach(e => { r[e.category] = (r[e.category] || 0) + e.amount; });
    return Object.entries(r).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  const indigo = "var(--primary)";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "var(--bg)", overflowY: "auto", fontFamily: SP_FONT }}>
      {/* Cover */}
      <div style={{ background: `linear-gradient(160deg,${g.color}44 0%,var(--bg) 60%)`, padding: "44px 20px 0", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <button onClick={onBack} style={{ width: 38, height: 38, borderRadius: 13, background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)", border: "1px solid var(--border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 16, color: "var(--text)" }}>←</span>
          </button>
          <button onClick={() => { if (window.confirm(L.confirmDelGroup(g.name.replace(/^[^\w\s]+\s*/, "")))) onDeleteGroup(gid); }} style={{ width: 38, height: 38, borderRadius: 13, background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)", border: "1px solid #FECDD3", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 15, color: "#EF4444" }}>🗑</span>
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <div style={{ width: 56, height: 56, borderRadius: 20, background: `linear-gradient(135deg,${g.color}44,${g.color}77)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0, boxShadow: `0 8px 24px ${g.color}44` }}>{g.emoji}</div>
          <div>
            <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.5px", fontFamily: SP_FONT }}>{g.name.replace(/^[^\w\s]+\s*/, "")}</h2>
            <p style={{ margin: 0, fontSize: 12, color: "var(--text-2)", fontFamily: SP_FONT }}>{L.membersExpenses(gMembers.length, expenses.length)}</p>
          </div>
        </div>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 16 }}>
          {[
            { l: L.stTotal,     val: _spFmt(total),   c: "var(--text)",  bg: `${g.color}18` },
            { l: L.stYouPaid,   val: _spFmt(mePaid),  c: indigo,     bg: "var(--primary-tint)" },
            { l: L.stYourShare, val: _spFmt(meShare),  c: meShare > mePaid ? "#EF4444" : "#15803D", bg: meShare > mePaid ? "#FFF1F2" : "#F0FDF4" },
          ].map(s => (
            <div key={s.l} style={{ background: s.bg, borderRadius: 14, padding: "11px 12px", border: "1px solid var(--border)" }}>
              <p style={{ margin: "0 0 4px", fontSize: 8, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: SP_FONT }}>{s.l}</p>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: s.c, fontFamily: SP_MONO, letterSpacing: "-0.3px" }}>{s.val}</p>
            </div>
          ))}
        </div>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 2, background: "rgba(0,0,0,0.05)", borderRadius: 14, padding: 3 }}>
          {[["expenses",L.tabExpenses],["balances",L.tabBalances],["analytics",L.tabAnalytics]].map(([t,lbl]) => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "9px", borderRadius: 12, border: "none", fontFamily: SP_FONT, fontSize: 11, fontWeight: 700, cursor: "pointer", background: tab === t ? "var(--surface)" : "transparent", color: tab === t ? "var(--text)" : "var(--text-3)", boxShadow: tab === t ? "0 2px 8px rgba(15,23,42,0.08)" : "none", transition: "all 0.15s" }}>{lbl}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: "14px 16px 100px" }}>
        {/* EXPENSES TAB */}
        {tab === "expenses" && (
          <>
            <button onClick={onAddExpense} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "13px", borderRadius: 16, border: `1.5px dashed ${indigo}55`, background: "var(--primary-tint)", color: indigo, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: SP_FONT, marginBottom: 16 }}>
              {L.addExpenseBtn}
            </button>
            {expenses.length === 0 && <SpEmpty icon="💸" title={L.noExpenses} sub={L.noExpensesSub} />}
            {Object.entries(grouped).map(([dateLabel, exps]) => (
              <div key={dateLabel}>
                <p style={{ margin: "8px 0 8px 4px", fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: SP_FONT }}>{dateLabel}</p>
                {exps.map(e => <SpExpenseRow key={e.id} e={e} data={data} me={me} onEdit={onEditExpense} onDelete={onDelete} L={L} lang={lang} />)}
              </div>
            ))}
          </>
        )}

        {/* BALANCES TAB */}
        {tab === "balances" && (
          <>
            {debts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", background: "var(--surface)", borderRadius: 22, border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 48, marginBottom: 10 }}>🎉</div>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#15803D", margin: "0 0 4px", fontFamily: SP_FONT }}>{L.allSettled}</p>
                <p style={{ fontSize: 12, color: "var(--text-3)", margin: 0, fontFamily: SP_FONT }}>{L.everyoneEven}</p>
              </div>
            ) : (
              <>
                {debts.map((d, i) => {
                  const from = data.members.find(m => m.id === d.from);
                  const to   = data.members.find(m => m.id === d.to);
                  const isMe = d.from === me?.id;
                  return (
                    <div key={i} style={{ background: isMe ? "#FFF1F2" : "var(--surface)", borderRadius: 18, padding: "14px 16px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12, border: `1px solid ${isMe ? "#FECDD3" : "var(--border)"}` }}>
                      <SpAvatar m={from} size={38} />
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 700, color: "var(--text)", fontFamily: SP_FONT }}>{from?.name} <span style={{ color: "var(--text-3)", fontWeight: 500 }}>→</span> {to?.name}</p>
                        <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: isMe ? "#EF4444" : "var(--text)", fontFamily: SP_MONO }}>{_spFmt(d.amount)}</p>
                      </div>
                      {isMe && <button onClick={() => onSettle(gid)} style={{ padding: "9px 16px", borderRadius: 99, border: "none", background: "#10B981", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: SP_FONT, boxShadow: "0 4px 14px rgba(16,185,129,0.3)" }}>{L.settle}</button>}
                    </div>
                  );
                })}
                <p style={{ margin: "20px 0 10px 4px", fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: SP_FONT }}>{L.memberBalances}</p>
                {gMembers.map(m => {
                  const paid  = expenses.filter(e => e.paidBy === m.id).reduce((s, e) => s + e.amount, 0);
                  const share = expenses.reduce((s, e) => s + (e.splits.find(sp => sp.id === m.id)?.amount || 0), 0);
                  const net   = paid - share;
                  return (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--surface)", borderRadius: 14, marginBottom: 6, border: "1px solid var(--border)" }}>
                      <SpAvatar m={m} size={34} />
                      <p style={{ margin: 0, flex: 1, fontSize: 13, fontWeight: 700, color: "var(--text)", fontFamily: SP_FONT }}>{m.name}</p>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: net > 0 ? "#15803D" : net < 0 ? "#EF4444" : "var(--text-3)", fontFamily: SP_MONO }}>{net > 0 ? "+" : ""}{_spFmt(net)}</p>
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}

        {/* ANALYTICS TAB */}
        {tab === "analytics" && (
          catSpend.length === 0 ? <SpEmpty icon="📊" title={L.noData} sub={L.noDataSub} /> : (
            <div style={{ background: "var(--surface)", borderRadius: 22, padding: "20px", marginBottom: 12, border: "1px solid var(--border)", boxShadow: "0 4px 24px rgba(15,23,42,0.06)" }}>
              <p style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "var(--text)", fontFamily: SP_FONT }}>{L.spendByCat}</p>
              {catSpend.map(([cat, amt]) => {
                const c = spGetCat(cat);
                const pct = total > 0 ? amt / total * 100 : 0;
                return (
                  <div key={cat} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", fontFamily: SP_FONT }}>{c.icon} {c.l}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", fontFamily: SP_MONO }}>{_spFmt(amt)}</span>
                    </div>
                    <div style={{ height: 6, background: "var(--fill)", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: c.color, borderRadius: 99, transition: "width 0.8s cubic-bezier(0.34,1.56,0.64,1)" }} />
                    </div>
                  </div>
                );
              })}
              <p style={{ margin: "20px 0 12px", fontSize: 14, fontWeight: 700, color: "var(--text)", fontFamily: SP_FONT }}>{L.whoSpent}</p>
              {gMembers.map(m => {
                const paid = expenses.filter(e => e.paidBy === m.id).reduce((s, e) => s + e.amount, 0);
                return (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <SpAvatar m={m} size={30} />
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "var(--text)", fontFamily: SP_FONT }}>{m.name}</span>
                    <div style={{ width: 90, height: 5, background: "var(--fill)", borderRadius: 99, overflow: "hidden", marginRight: 8 }}>
                      <div style={{ height: "100%", width: `${total > 0 ? paid / total * 100 : 0}%`, background: m.color, borderRadius: 99 }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", fontFamily: SP_MONO, minWidth: 70, textAlign: "right" }}>{_spFmt(paid)}</span>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ─── GroupsTab (full tab rendered inside FinanceTracker) ─────────────────────
function GroupsTab({ profile, onLinkUpsert, onLinkDelete, language = "EN" }) {
  const L = SP_T[language] || SP_T.EN;
  const lang = language;
  SPDB.init();
  const [spData, setSpData] = useState(() => ({
    groups: SPDB.get("groups"), members: SPDB.get("members"),
    expenses: SPDB.get("expenses"), settlements: SPDB.get("settlements"), activity: SPDB.get("activity"),
  }));
  const refresh = useCallback(() => setSpData({
    groups: SPDB.get("groups"), members: SPDB.get("members"),
    expenses: SPDB.get("expenses"), settlements: SPDB.get("settlements"), activity: SPDB.get("activity"),
  }), []);

  const me = spData.members.find(m => m.id === "u1") || spData.members.find(m => m.name === "You") || spData.members[0];

  // Keep the "You" member in sync with the app-wide profile name.
  useEffect(() => {
    if (!profile || !me) return;
    const name = (profile.name || "You").trim() || "You";
    const initials = (profile.initials || name.slice(0, 2)).toUpperCase().slice(0, 2);
    if (me.name !== name || me.initials !== initials) {
      SPDB.update("members", me.id, { name, initials });
      refresh();
    }
  }, [profile?.name, profile?.initials]);

  const [activeGid,   setActiveGid]   = useState(null);
  const [editingExp,  setEditingExp]  = useState(null);
  const [modal,       setModal]       = useState(null); // "addExpense" | "editExpense" | "addGroup" | "settle"
  const [navInner,    setNavInner]    = useState("groups"); // "groups" | "friends" | "activity"
  const [spToast,     setSpToast]     = useState(null);
  const toastRef = useRef(null);

  const showSpToast = useCallback((msg) => {
    if (toastRef.current) clearTimeout(toastRef.current);
    setSpToast(msg);
    toastRef.current = setTimeout(() => setSpToast(null), 3000);
  }, []);

  const allBalances = useMemo(() => {
    const result = {};
    spData.groups.forEach(g => {
      const gExps  = spData.expenses.filter(e => e.groupId === g.id);
      const gSetts = spData.settlements.filter(s => s.groupId === g.id);
      const debts  = spSimplifyDebts(g.memberIds, gExps, gSetts);
      result[g.id] = { debts, total: gExps.reduce((s, e) => s + e.amount, 0) };
    });
    return result;
  }, [spData]);

  const myNetBalance = useMemo(() => {
    let total = 0;
    spData.groups.forEach(g => {
      const debts = allBalances[g.id]?.debts || [];
      total += debts.filter(d => d.to === me?.id).reduce((s, d) => s + d.amount, 0);
      total -= debts.filter(d => d.from === me?.id).reduce((s, d) => s + d.amount, 0);
    });
    return total;
  }, [allBalances, me]);

  // Mirror a group expense into the main Home ledger when "You" paid: record the
  // full amount paid out, with the others' shares tracked as reimbursement.
  const linkExpense = useCallback((exp) => {
    if (!onLinkUpsert || !onLinkDelete) return;
    if (exp.paidBy !== me?.id) { onLinkDelete(exp.id); return; }
    const grp = SPDB.get("groups").find(g => g.id === exp.groupId);
    const grpName = grp ? grp.name.replace(/^[^\w\s]+\s*/, "") : "Group";
    const yourShare = exp.splits.find(s => s.id === me.id)?.amount || 0;
    onLinkUpsert({
      groupExpenseId: exp.id,
      type: "expense",
      amount: Math.round(yourShare),
      originalAmount: Math.round(exp.amount),
      reimbursed: Math.round(exp.amount - yourShare),
      split: true,
      category: spToAppCat(exp.category),
      note: `${exp.description} · ${grpName}`,
      date: exp.date,
    });
  }, [me, onLinkUpsert, onLinkDelete]);

  const addExpense = (exp) => {
    SPDB.insert("expenses", exp);
    SPDB.insert("activity", { id: _spUid(), type: "expense_added", groupId: exp.groupId, expenseId: exp.id, userId: me.id, timestamp: _spNowISO(), meta: { description: exp.description, amount: exp.amount } });
    linkExpense(exp);
    refresh(); setModal(null); showSpToast(L.tExpAdded);
  };
  const editExpense = (exp) => {
    SPDB.update("expenses", exp.id, exp);
    linkExpense(exp);
    refresh(); setModal(null); setEditingExp(null); showSpToast(L.tExpUpdated);
  };
  const deleteExpense = (id) => { SPDB.delete("expenses", id); onLinkDelete?.(id); refresh(); showSpToast(L.tExpRemoved); };
  const addGroup = (g) => { SPDB.insert("groups", g); refresh(); setActiveGid(g.id); setModal(null); showSpToast(L.tGroupCreated); };
  const deleteGroup = (gid) => {
    SPDB.get("expenses").filter(e => e.groupId === gid).forEach(e => { SPDB.delete("expenses", e.id); onLinkDelete?.(e.id); });
    SPDB.get("settlements").filter(s => s.groupId === gid).forEach(s => SPDB.delete("settlements", s.id));
    SPDB.get("activity").filter(a => a.groupId === gid).forEach(a => SPDB.delete("activity", a.id));
    SPDB.delete("groups", gid);
    setActiveGid(null); refresh(); showSpToast(L.tGroupDeleted);
  };
  const addSettlement = (s) => {
    SPDB.insert("settlements", s);
    const toM = spData.members.find(m => m.id === s.to);
    SPDB.insert("activity", { id: _spUid(), type: "settlement", groupId: s.groupId, userId: s.from, timestamp: _spNowISO(), meta: { amount: s.amount, to: toM?.name } });
    refresh(); setModal(null); showSpToast(L.tSettled);
  };

  const indigo = "var(--primary)";
  const indigoLight = "var(--primary-tint)";

  return (
    <div style={{ fontFamily: SP_FONT }}>
      {/* Inner toast */}
      {spToast && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 999, background: "var(--text)", color: "var(--on-inverse)", padding: "10px 20px", borderRadius: 99, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", boxShadow: "0 8px 32px rgba(15,23,42,0.22)", fontFamily: SP_FONT }}>
          {spToast}
        </div>
      )}

      {/* Group detail overlay */}
      {activeGid && navInner === "groups" && (
        <SpGroupDetail
          data={spData} me={me} gid={activeGid} allBalances={allBalances}
          onBack={() => setActiveGid(null)}
          onAddExpense={() => setModal("addExpense")}
          onEditExpense={(e) => { setEditingExp(e); setModal("editExpense"); }}
          onSettle={(gid) => { setActiveGid(gid); setModal("settle"); }}
          onDelete={deleteExpense}
          onDeleteGroup={deleteGroup}
          L={L} lang={lang}
        />
      )}

      {/* Inner sub-nav */}
      <div style={{ display: "flex", gap: 4, padding: "0 16px 14px", background: "var(--bg)", borderBottom: "1px solid var(--border)", marginBottom: 0 }}>
        {[["groups",L.navGroups],["friends",L.navFriends],["activity",L.navActivity]].map(([id, label]) => (
          <button key={id} onClick={() => { setNavInner(id); setActiveGid(null); }} style={{ flex: 1, padding: "8px 4px", borderRadius: 10, border: "none", fontFamily: SP_FONT, fontSize: 11, fontWeight: 700, cursor: "pointer", background: navInner === id ? "var(--text)" : "var(--surface)", color: navInner === id ? "var(--surface)" : "var(--text-3)", transition: "all 0.18s" }}>{label}</button>
        ))}
      </div>

      {/* ── GROUPS view ── */}
      {navInner === "groups" && (
        <div style={{ padding: "0 16px" }}>
          {/* Net balance hero */}
          <div style={{ padding: "20px 0 16px" }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: SP_FONT }}>{L.netBalance}</p>
            <p style={{ margin: 0, fontSize: 36, fontWeight: 700, color: myNetBalance >= 0 ? "#15803D" : "#EF4444", fontFamily: SP_MONO, letterSpacing: "-1.5px" }}>{myNetBalance >= 0 ? "+" : "-"}{_spFmt(Math.abs(myNetBalance))}</p>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-3)", fontFamily: SP_FONT }}>{myNetBalance >= 0 ? L.othersOwe : L.youOweOthers} {L.acrossGroups(spData.groups.length)}</p>
          </div>

          {/* Add group button */}
          <button onClick={() => setModal("addGroup")} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "12px", borderRadius: 16, border: `1.5px dashed ${indigo}55`, background: indigoLight, color: indigo, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: SP_FONT, marginBottom: 14 }}>
            {L.newGroupBtn}
          </button>

          {spData.groups.length === 0 && <SpEmpty icon="👥" title={L.noGroups} sub={L.noGroupsSub} />}
          {spData.groups.map(g => {
            const bal   = allBalances[g.id] || {};
            const debts = bal.debts || [];
            const iOwe  = debts.filter(d => d.from === me?.id).reduce((s, d) => s + d.amount, 0);
            const owedMe= debts.filter(d => d.to === me?.id).reduce((s, d) => s + d.amount, 0);
            const net   = owedMe - iOwe;
            const members = spData.members.filter(m => g.memberIds.includes(m.id));
            const settled = debts.length === 0;
            return (
              <div key={g.id} onClick={() => setActiveGid(g.id)} style={{ background: "var(--surface)", borderRadius: 22, padding: "18px 20px", marginBottom: 10, cursor: "pointer", border: "1px solid var(--border)", boxShadow: "0 4px 24px rgba(15,23,42,0.06)", display: "flex", gap: 14, alignItems: "center" }}>
                <div style={{ width: 52, height: 52, borderRadius: 18, background: `${g.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0, border: `1px solid ${g.color}44` }}>{g.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: "0 0 3px", fontSize: 15, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: SP_FONT }}>{g.name.replace(/^[^\w\s]+\s*/, "")}</p>
                  <p style={{ margin: "0 0 8px", fontSize: 11, color: "var(--text-3)", fontFamily: SP_FONT }}>{L.totalMembers(_spFmt(bal.total || 0), members.length)}</p>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    {members.slice(0, 6).map((m, i) => (
                      <div key={m.id} style={{ width: 22, height: 22, borderRadius: 99, background: m.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "#fff", marginLeft: i === 0 ? 0 : -8, border: "2px solid var(--surface)" }}>{m.initials.slice(0, 1)}</div>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  {settled ? (
                    <span style={{ fontSize: 10, fontWeight: 700, background: "#F0FDF4", color: "#15803D", padding: "5px 10px", borderRadius: 99, border: "1px solid rgba(0,200,150,0.2)" }}>{L.settled}</span>
                  ) : net !== 0 ? (
                    <>
                      <p style={{ margin: "0 0 2px", fontSize: 9, color: "var(--text-3)", fontWeight: 600, fontFamily: SP_FONT }}>{net > 0 ? L.youreOwed : L.youOwe}</p>
                      <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: net > 0 ? "#15803D" : "#EF4444", fontFamily: SP_MONO }}>{_spFmt(Math.abs(net))}</p>
                    </>
                  ) : (
                    <span style={{ fontSize: 10, fontWeight: 700, background: indigoLight, color: indigo, padding: "5px 10px", borderRadius: 99 }}>{L.even}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── FRIENDS view ── */}
      {navInner === "friends" && (() => {
        const friendBalances = {};
        spData.groups.forEach(g => {
          const debts = allBalances[g.id]?.debts || [];
          debts.forEach(d => {
            if (d.from === me?.id) friendBalances[d.to]   = (friendBalances[d.to]   || 0) - d.amount;
            if (d.to   === me?.id) friendBalances[d.from] = (friendBalances[d.from] || 0) + d.amount;
          });
        });
        const friends   = spData.members.filter(m => m.id !== me?.id);
        const totalOwed = Object.values(friendBalances).filter(v => v > 0).reduce((s, v) => s + v, 0);
        const totalOwe  = Object.values(friendBalances).filter(v => v < 0).reduce((s, v) => s + Math.abs(v), 0);
        return (
          <div style={{ padding: "0 16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "16px 0" }}>
              <div style={{ background: "#F0FDF4", borderRadius: 18, padding: "14px 16px", border: "1px solid rgba(0,200,150,0.2)" }}>
                <p style={{ margin: "0 0 4px", fontSize: 9, fontWeight: 700, color: "#15803D", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: SP_FONT }}>{L.owedToYou}</p>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#15803D", fontFamily: SP_MONO }}>+{_spFmt(totalOwed)}</p>
              </div>
              <div style={{ background: "#FFF1F2", borderRadius: 18, padding: "14px 16px", border: "1px solid rgba(255,91,91,0.2)" }}>
                <p style={{ margin: "0 0 4px", fontSize: 9, fontWeight: 700, color: "#EF4444", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: SP_FONT }}>{L.youOwe}</p>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#EF4444", fontFamily: SP_MONO }}>{_spFmt(totalOwe)}</p>
              </div>
            </div>
            {friends.length === 0 ? <SpEmpty icon="👤" title={L.noFriends} sub={L.noFriendsSub} /> : (
              friends.map(f => {
                const bal = friendBalances[f.id] || 0;
                const sharedGroups = spData.groups.filter(g => g.memberIds.includes(f.id) && g.memberIds.includes(me?.id));
                return (
                  <div key={f.id} style={{ background: "var(--surface)", borderRadius: 20, padding: "16px 18px", marginBottom: 8, display: "flex", alignItems: "center", gap: 14, border: "1px solid var(--border)", boxShadow: "0 4px 24px rgba(15,23,42,0.06)" }}>
                    <SpAvatar m={f} size={46} />
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: "0 0 3px", fontSize: 15, fontWeight: 700, color: "var(--text)", fontFamily: SP_FONT }}>{f.name}</p>
                      <p style={{ margin: 0, fontSize: 11, color: "var(--text-3)", fontFamily: SP_FONT }}>{L.sharedGroups(sharedGroups.length)}</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      {bal === 0 ? <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", fontFamily: SP_FONT }}>{L.settled}</span> : (
                        <>
                          <p style={{ margin: "0 0 1px", fontSize: 9, color: "var(--text-3)", fontWeight: 600, fontFamily: SP_FONT }}>{bal > 0 ? L.owesYou : L.youOwe}</p>
                          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: bal > 0 ? "#15803D" : "#EF4444", fontFamily: SP_MONO }}>{_spFmt(Math.abs(bal))}</p>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        );
      })()}

      {/* ── ACTIVITY view ── */}
      {navInner === "activity" && (() => {
        const activities = [...spData.activity].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const getIcon = t => ({ expense_added: "💸", settlement: "✅", group_created: "👥" }[t] || "•");
        const getLabel = (act) => {
          const u = spData.members.find(m => m.id === act.userId);
          const g = spData.groups.find(x => x.id === act.groupId);
          if (act.type === "expense_added") return L.actAdded(u?.name || L.someone, act.meta?.description, _spFmt(act.meta?.amount || 0), g?.name || L.aGroup);
          if (act.type === "settlement")    return L.actSettled(u?.name || L.someone, _spFmt(act.meta?.amount || 0), act.meta?.to);
          if (act.type === "group_created") return L.actGroupCreated(act.meta?.name);
          return L.tabAnalytics;
        };
        return (
          <div style={{ padding: "16px 16px 0" }}>
            {activities.length === 0 ? <SpEmpty icon="📋" title={L.noActivity} sub={L.noActivitySub} /> : (
              activities.map(act => (
                <div key={act.id} style={{ display: "flex", gap: 12, marginBottom: 8, background: "var(--surface)", padding: "14px 16px", borderRadius: 16, border: "1px solid var(--border)" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 12, background: "var(--primary-tint)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{getIcon(act.type)}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: "0 0 3px", fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1.4, fontFamily: SP_FONT }}>{getLabel(act)}</p>
                    <p style={{ margin: 0, fontSize: 11, color: "var(--text-3)", fontFamily: SP_FONT }}>{_spFmtDate(act.timestamp.slice(0, 10), lang)} · {_spFmtTime(act.timestamp)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        );
      })()}

      {/* Modals */}
      {modal === "addExpense" && <SpAddExpenseModal data={spData} me={me} activeGid={activeGid} onSave={addExpense} onClose={() => setModal(null)} L={L} />}
      {modal === "editExpense" && editingExp && <SpAddExpenseModal data={spData} me={me} activeGid={activeGid} editExpense={editingExp} onSave={editExpense} onClose={() => { setModal(null); setEditingExp(null); }} L={L} />}
      {modal === "addGroup"   && <SpAddGroupModal   data={spData} me={me} onSave={addGroup}    onClose={() => setModal(null)} L={L} />}
      {modal === "settle" && activeGid && <SpSettleModal data={spData} me={me} gid={activeGid} allBalances={allBalances} onSave={addSettlement} onClose={() => setModal(null)} L={L} />}
    </div>
  );
}

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
    availableToSpend: "Available to Spend",
    income:           "income",
    overspent:        "Overspent this month",
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
    availableToSpend: "ยอดที่ใช้จ่ายได้",
    income:           "รายรับ",
    overspent:        "ใช้จ่ายเกินรายรับเดือนนี้",
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
  { value: "Other",     pastelBg: "var(--on-inverse)", pastelText: "var(--text-2)", bar: "var(--text-3)", icon: "📦" },
];

const INCOME_CATEGORIES = [
  { value: "Salary",     label: "Salary",       labelShort: "Salary",     icon: "💼", pastelBg: "#F0FDF4", pastelText: "#15803D", bar: "#22C55E" },
  { value: "Gift",       label: "Gift",          labelShort: "Gift",       icon: "🎁", pastelBg: "#FFF0F6", pastelText: "#BE185D", bar: "#EC4899" },
  { value: "Investment", label: "Investment",    labelShort: "Invest",     icon: "📈", pastelBg: "#EFF6FF", pastelText: "#1D4ED8", bar: "#3B82F6" },
  { value: "Freelance",  label: "Freelance",     labelShort: "Freelance",  icon: "💻", pastelBg: "#F5F3FF", pastelText: "#6D28D9", bar: "#8B5CF6" },
  { value: "OtherIncome",label: "Other Income",  labelShort: "Other",      icon: "💵", pastelBg: "var(--on-inverse)", pastelText: "var(--text-2)", bar: "var(--text-3)" },
];

// ─── Editable category system ────────────────────────────────────────────────
// Categories are user-editable state. Built-ins carry i18n maps so EN/TH keeps
// working until the user renames them; custom categories store a plain label.
const _incTH = { Salary: ["เงินเดือน","เงินเดือน"], Gift: ["ของขวัญ","ของขวัญ"], Investment: ["การลงทุน","ลงทุน"], Freelance: ["ฟรีแลนซ์","ฟรีแลนซ์"], OtherIncome: ["รายได้อื่นๆ","อื่นๆ"] };

const defaultExpCats = () => CATEGORIES_BASE.map((c) => ({
  ...c, builtin: true,
  label: TRANSLATIONS.EN["cat" + c.value], labelShort: TRANSLATIONS.EN["cat" + c.value + "Short"],
  i18n:      { EN: TRANSLATIONS.EN["cat" + c.value],          TH: TRANSLATIONS.TH["cat" + c.value] },
  i18nShort: { EN: TRANSLATIONS.EN["cat" + c.value + "Short"], TH: TRANSLATIONS.TH["cat" + c.value + "Short"] },
}));
const defaultIncCats = () => INCOME_CATEGORIES.map((c) => ({
  ...c, builtin: true,
  i18n:      { EN: c.label,      TH: _incTH[c.value]?.[0] || c.label },
  i18nShort: { EN: c.labelShort, TH: _incTH[c.value]?.[1] || c.labelShort },
}));

// Live registry mirrored from React state so the module-level helpers below
// (used by many components) always see the current categories without prop-drilling.
let CAT_REGISTRY = { exp: defaultExpCats(), inc: defaultIncCats() };
const setCatRegistry = (next) => { CAT_REGISTRY = next; };

const _applyLang = (c, lang) => ({
  ...c,
  label:      c.i18n      ? (c.i18n[lang]      || c.label)      : c.label,
  labelShort: c.i18nShort ? (c.i18nShort[lang] || c.labelShort) : c.labelShort,
});

const UNCATEGORIZED = { value: "Uncategorized", icon: "🗂️", pastelBg: "var(--fill)", pastelText: "var(--text-2)", bar: "var(--text-3)", label: "Uncategorized", labelShort: "Other" };

const getCategoriesForLang       = (lang) => CAT_REGISTRY.exp.map((c) => _applyLang(c, lang));
const getIncomeCategoriesForLang = (lang) => CAT_REGISTRY.inc.map((c) => _applyLang(c, lang));

const getIncomeCategory = (val, lang = "EN") =>
  getIncomeCategoriesForLang(lang).find((c) => c.value === val) || null;

const getCat = (val, lang = "EN") =>
  getCategoriesForLang(lang).find((c) => c.value === val)
  || getIncomeCategoriesForLang(lang).find((c) => c.value === val)
  || { ...UNCATEGORIZED, label: TRANSLATIONS[lang]?.catOther || UNCATEGORIZED.label };
const uid          = () => (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
const todayStr     = () => new Date().toISOString().slice(0, 10);
const currentMonth = () => new Date().toISOString().slice(0, 7);
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
// Fonts resolve through CSS variables so the redesign's type stack (Hanken Grotesk
// headings, Inter body, mono labels) applies everywhere — Thai faces stay in the stack.
const FONT_FAMILY = "var(--font-sans)";
const MONO_FAMILY = "var(--font-mono)";

// Theme tokens reference CSS variables (see THEME_CSS) so light/dark flip in one place.
const T = {
  pageBg:     "var(--bg)",
  card:       { background: "var(--surface)", borderRadius: 20, border: "1px solid var(--border)", boxShadow: "var(--card-shadow)" },
  h1:         { fontSize: 40, fontWeight: 700, letterSpacing: "-1.5px", color: "var(--text)", fontFamily: FONT_FAMILY, lineHeight: 1.1 },
  h2:         { fontSize: 16, fontWeight: 600, color: "var(--text)", fontFamily: FONT_FAMILY },
  label:      { fontSize: 11, fontWeight: 500, color: "var(--text-3)", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: MONO_FAMILY },
  muted:      { fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 },
  mono:       { fontFamily: MONO_FAMILY },
  indigo:     "var(--primary)",
  indigoLight:"var(--primary-tint)",
  input:      { width: "100%", padding: "13px 16px", borderRadius: 12, border: "1.5px solid var(--border)", fontSize: 14, color: "var(--text)", fontFamily: FONT_FAMILY, background: "var(--surface)", outline: "none", boxSizing: "border-box", lineHeight: 1.6 },
};

// ─── Theme palette (Muted Minimalism: Serene Precision light / Infinite Depth dark) ──
const THEME_CSS = `
:root{
  --font-sans:'Hanken Grotesk','Inter','IBM Plex Sans Thai','Kanit',-apple-system,BlinkMacSystemFont,sans-serif;
  --font-mono:'JetBrains Mono','Geist Mono','IBM Plex Mono',ui-monospace,monospace;
  --bg:#f4f6fa; --surface:#ffffff; --surface-2:#eef1f6; --fill:#f1f5f9;
  --border:#e2e8f0; --text:#1e293b; --text-2:#64748b; --text-3:#94a3b8;
  --primary:#5a6b7d; --primary-tint:#eef2f6; --on-primary:#ffffff;
  --inverse:#1e293b; --on-inverse:#f8fafc;
  --card-shadow:0 4px 24px rgba(30,41,59,0.05),0 1px 2px rgba(30,41,59,0.04);
}
[data-theme="dark"]{
  --bg:#0f172a; --surface:#1a2236; --surface-2:#222a3d; --fill:#222a3d;
  --border:rgba(255,255,255,0.09); --text:#e2e8f0; --text-2:#94a3b8; --text-3:#7c8aa0;
  --primary:#4a5c70; --primary-tint:#222a3d; --on-primary:#f8fafc;
  --inverse:#e2e8f0; --on-inverse:#1e293b;
  --card-shadow:0 8px 32px rgba(0,0,0,0.35);
}
body{background:var(--bg);}
`;

// ─── Thai-aware body text style ───────────────────────────────────────────────
const thaiBody = { fontFamily: FONT_FAMILY, lineHeight: 1.7, letterSpacing: "0.01em" };
const thaiHeader = { fontFamily: FONT_FAMILY, lineHeight: 1.5, letterSpacing: "0.02em", fontWeight: 600 };

// ─── YearlySummary (top-level, so hooks are never called conditionally) ────────
function YearlySummary({ transactions, language, yearlyYear, setYearlyYear, setShowYearlySummary, computeYearlyData, t }) {
  const tr = (en, th) => (language === "TH" ? th : en);
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
      <div style={{ background: "var(--text)", padding: "8px 14px", borderRadius: 12 }}>
        <p style={{ margin: 0, fontSize: 11, color: "var(--text-3)", fontWeight: 500, fontFamily: FONT_FAMILY }}>{label}</p>
        <p style={{ margin: "2px 0 0", fontSize: 14, color: "var(--on-inverse)", fontWeight: 600, fontFamily: MONO_FAMILY }}>{fmt(payload[0].value)}</p>
      </div>
    );
  };

  // ── Month detail view ──
  if (selectedMonth !== null) {
    const mIdx = selectedMonth;
    const mKey = monthKey(yearlyYear, mIdx);
    const mName = `${getMonthName(mIdx, language)} ${yearlyYear}`;
    const mTxns = transactions.filter((tx) => tx.date.startsWith(mKey) && tx.type !== "income").sort((a, b) => new Date(b.date) - new Date(a.date));
    const mTotal = mTxns.reduce((s, tx) => s + tx.amount, 0);
    const mCatTotals = {};
    mTxns.forEach((tx) => { mCatTotals[tx.category] = (mCatTotals[tx.category] || 0) + tx.amount; });
    const mCatSorted = Object.entries(mCatTotals).sort((a, b) => b[1] - a[1]);
    const visibleTxns = selectedCat ? mTxns.filter((tx) => tx.category === selectedCat) : mTxns;
    const activeCat = selectedCat ? getCat(selectedCat, language) : null;
    const goPrev = () => { setSelectedCat(null); setSelectedMonth((m) => m > 0 ? m - 1 : m); };
    const goNext = () => { setSelectedCat(null); setSelectedMonth((m) => m < 11 ? m + 1 : m); };

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 210, background: "var(--bg)", overflowY: "auto", fontFamily: FONT_FAMILY }}>
          <div style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(248,247,244,0.94)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(226,232,240,0.6)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => { setSelectedMonth(null); setSelectedCat(null); }} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--surface)", border: "none", cursor: "pointer", padding: "8px 16px", borderRadius: 99, fontFamily: FONT_FAMILY, fontSize: 13, fontWeight: 600, color: "var(--text)", boxShadow: "0 2px 8px rgba(15,23,42,0.08)", flexShrink: 0 }}>
              <ArrowLeft size={14} /> {yearlyYear}
            </button>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <button onClick={goPrev} disabled={mIdx === 0} style={{ background: mIdx === 0 ? "var(--fill)" : "var(--surface)", border: "none", cursor: mIdx === 0 ? "default" : "pointer", width: 34, height: 34, borderRadius: 99, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: mIdx === 0 ? "none" : "0 2px 8px rgba(15,23,42,0.08)", color: mIdx === 0 ? "#CBD5E1" : "var(--text)" }}>
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", minWidth: 110, textAlign: "center", fontFamily: FONT_FAMILY }}>{mName}</span>
              <button onClick={goNext} disabled={mIdx === 11} style={{ background: mIdx === 11 ? "var(--fill)" : "var(--surface)", border: "none", cursor: mIdx === 11 ? "default" : "pointer", width: 34, height: 34, borderRadius: 99, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: mIdx === 11 ? "none" : "0 2px 8px rgba(15,23,42,0.08)", color: mIdx === 11 ? "#CBD5E1" : "var(--text)" }}>
                <ChevronRight size={16} />
              </button>
            </div>
            <div style={{ width: 80, flexShrink: 0 }} />
          </div>
          <div style={{ maxWidth: 430, margin: "0 auto", padding: "0 16px 48px" }}>
            <div style={{ padding: "28px 4px 16px" }}>
              <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: FONT_FAMILY }}>{t.totalSpentLabel}</p>
              <p style={{ margin: 0, fontSize: 40, fontWeight: 600, letterSpacing: "-1.5px", color: "var(--text)", lineHeight: 1.1, fontFamily: FONT_FAMILY }}>{fmt(mTotal)}</p>
              <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--text-3)", fontWeight: 400, fontFamily: FONT_FAMILY, lineHeight: 1.6 }}>{mTxns.length} {t.txIn(mName)}</p>
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
                      <button key={catVal} onClick={() => setSelectedCat(isActive ? null : catVal)} style={{ width: "100%", border: "none", fontFamily: FONT_FAMILY, cursor: "pointer", textAlign: "left", padding: "16px 20px", borderRadius: 20, background: isActive ? cat.pastelBg : "var(--surface)", outline: isActive ? `2px solid ${cat.bar}` : "2px solid transparent", boxShadow: isActive ? `0 6px 24px ${cat.bar}30` : "0 2px 12px rgba(15,23,42,0.06)", transition: "all 0.18s" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                          <div style={{ width: 42, height: 42, borderRadius: 14, flexShrink: 0, background: isActive ? "var(--surface)" : cat.pastelBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{cat.icon}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                              <span style={{ fontSize: 14, fontWeight: 600, color: isActive ? cat.pastelText : "var(--text)", fontFamily: FONT_FAMILY }}>{cat.label}</span>
                              <span style={{ fontFamily: MONO_FAMILY, fontSize: 15, fontWeight: 600, color: isActive ? cat.pastelText : "var(--text)" }}>{fmt(amt)}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
                              <span style={{ fontSize: 11, color: isActive ? cat.pastelText : "var(--text-3)", fontWeight: 400, fontFamily: FONT_FAMILY, lineHeight: 1.6 }}>{catTxCount} {t.transactions}</span>
                              <span style={{ fontSize: 12, fontWeight: 600, color: isActive ? cat.pastelText : "var(--text-3)", fontFamily: FONT_FAMILY }}>{(pct * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ height: 5, background: isActive ? `${cat.bar}30` : "var(--fill)", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct * 100}%`, background: cat.bar, borderRadius: 99, transition: "width 0.45s cubic-bezier(0.34,1.56,0.64,1)" }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, paddingLeft: 4 }}>
                  <p style={{ ...T.label, margin: 0, fontFamily: FONT_FAMILY }}>{selectedCat ? `${activeCat.icon} ${activeCat.label}` : t.allTransactions} · {visibleTxns.length}</p>
                  {selectedCat && (
                    <button onClick={() => setSelectedCat(null)} style={{ display: "flex", alignItems: "center", gap: 5, background: "var(--fill)", border: "none", cursor: "pointer", padding: "5px 12px", borderRadius: 99, fontFamily: FONT_FAMILY, fontSize: 11, fontWeight: 600, color: "var(--text-2)" }}>
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
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", fontFamily: FONT_FAMILY }}>{tx.note || cat.label}</span>
                          {tx.split && <span style={{ fontSize: 10, fontWeight: 600, background: "var(--primary-tint)", color: T.indigo, padding: "1px 6px", borderRadius: 5, fontFamily: FONT_FAMILY }}>{t.split}</span>}
                          {tx.recurringId && <span style={{ fontSize: 10, fontWeight: 600, background: "#FEFCE8", color: "#A16207", padding: "1px 6px", borderRadius: 5, fontFamily: FONT_FAMILY }}>{t.auto}</span>}
                        </div>
                        <p style={{ ...T.muted, margin: "2px 0 0", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: FONT_FAMILY }}>{cat.label} · {fmtDate(tx.date)}</p>
                        {tags.length > 0 && <div style={{ display: "flex", gap: 3, marginTop: 4, flexWrap: "wrap" }}>{tags.map((tag) => <span key={tag} style={{ fontSize: 10, fontWeight: 600, background: "var(--primary-tint)", color: "#6366F1", padding: "1px 7px", borderRadius: 99, fontFamily: FONT_FAMILY }}>{tag}</span>)}</div>}
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
      <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "var(--bg)", overflowY: "auto", fontFamily: FONT_FAMILY }}>
        <div style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(248,247,244,0.92)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(226,232,240,0.6)", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={() => setShowYearlySummary(false)} style={{ display: "flex", alignItems: "center", gap: 7, background: "var(--surface)", border: "none", cursor: "pointer", padding: "8px 16px", borderRadius: 99, fontFamily: FONT_FAMILY, fontSize: 13, fontWeight: 600, color: "var(--text)", boxShadow: "0 2px 8px rgba(15,23,42,0.08)" }}>
            <ArrowLeft size={14} /> Dashboard
          </button>
          <div style={{ display: "flex", gap: 4, background: "var(--surface)", padding: 4, borderRadius: 99, boxShadow: "0 2px 8px rgba(15,23,42,0.08)" }}>
            {yearOptions.map((y) => (
              <button key={y} onClick={() => setYearlyYear(y)} style={{ padding: "6px 14px", borderRadius: 99, border: "none", cursor: "pointer", fontFamily: FONT_FAMILY, fontSize: 13, fontWeight: 600, background: yearlyYear === y ? "var(--text)" : "transparent", color: yearlyYear === y ? "var(--surface)" : "var(--text-2)", transition: "all 0.18s" }}>{y}</button>
            ))}
          </div>
        </div>
        <div style={{ maxWidth: 430, margin: "0 auto", padding: "0 16px 48px" }}>
          <div style={{ padding: "32px 4px 24px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, marginBottom: 8, padding: "5px 12px", background: "var(--primary-tint)", borderRadius: 99 }}>
              <Sparkles size={13} color="var(--primary)" />
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--primary)", letterSpacing: "0.05em", textTransform: "uppercase", fontFamily: FONT_FAMILY }}>{t.yearInReview}</span>
            </div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, color: "var(--text)", letterSpacing: "-0.5px", lineHeight: 1.3, fontFamily: FONT_FAMILY }}>{t.yourYear(yearlyYear)}</h1>
          </div>
          <div style={{ ...T.card, padding: "26px 26px", marginBottom: 12, background: "var(--text)" }}>
            <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 500, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: FONT_FAMILY }}>{t.totalSpentYear}</p>
            <p style={{ margin: "0 0 16px", fontSize: 38, fontWeight: 600, letterSpacing: "-1.5px", color: "var(--on-inverse)", fontFamily: FONT_FAMILY, lineHeight: 1.1 }}>{fmt(totalSpent)}</p>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1, padding: "12px 14px", background: "rgba(255,255,255,0.07)", borderRadius: 14 }}>
                <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 500, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: FONT_FAMILY }}>{t.monthlyAvg}</p>
                <p style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "var(--on-inverse)", fontFamily: MONO_FAMILY }}>{fmt(monthlyAvg)}</p>
              </div>
              <div style={{ flex: 1, padding: "12px 14px", background: "rgba(255,255,255,0.07)", borderRadius: 14 }}>
                <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 500, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: FONT_FAMILY }}>{t.transactions}</p>
                <p style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "var(--on-inverse)", fontFamily: MONO_FAMILY }}>{computeYearlyData(yearlyYear).yearTxns.length}</p>
              </div>
            </div>
          </div>
          {biggestTx ? (
            <div style={{ ...T.card, padding: "20px 22px", marginBottom: 12, background: "var(--primary-tint)" }}>
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
            <div style={{ ...T.card, padding: "20px 22px", marginBottom: 12, background: "var(--primary-tint)", textAlign: "center" }}>
              <p style={{ margin: 0, color: "#6366F1", fontWeight: 500, fontSize: 14, fontFamily: FONT_FAMILY }}>{t.noTxRecorded(yearlyYear)}</p>
            </div>
          )}
          <div style={{ ...T.card, padding: "20px 22px", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
              <BarChart2 size={15} color="var(--primary)" />
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text)", fontFamily: FONT_FAMILY }}>{t.monthlyTrend}</p>
            </div>
            {totalSpent > 0 ? (
              <ResponsiveContainer width="100%" height={150}>
                <AreaChart data={monthlyTrend} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="yearGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 500, fill: "var(--text-3)", fontFamily: FONT_FAMILY }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<AreaTooltip />} />
                  <Area type="monotone" dataKey="total" stroke="var(--primary)" strokeWidth={2} fill="url(#yearGrad)" dot={{ r: 3, fill: "var(--primary)", strokeWidth: 0 }} activeDot={{ r: 5, fill: "var(--primary)", strokeWidth: 0, cursor: "pointer", onClick: (_, payload) => { if (payload?.index !== undefined) setSelectedMonth(payload.index); } }} />
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
            <p style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "var(--text)", fontFamily: FONT_FAMILY }}>{t.spendingByCatLabel}</p>
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
                    <p style={{ margin: 0, fontSize: 9, fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", fontFamily: FONT_FAMILY }}>{tr("Total", "ทั้งหมด")}</p>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text)", fontFamily: MONO_FAMILY }}>{fmt(totalSpent)}</p>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 6 }}>
                  {donutData.sort((a, b) => b.value - a.value).map((d) => {
                    const pct = totalSpent > 0 ? (d.value / totalSpent * 100).toFixed(1) : 0;
                    return (
                      <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 9, height: 9, borderRadius: 3, background: d.cat.bar, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text)", flex: 1, fontFamily: FONT_FAMILY }}>{d.cat.icon} {d.name}</span>
                        <span style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 400, fontFamily: FONT_FAMILY }}>{pct}%</span>
                        <span style={{ fontFamily: MONO_FAMILY, fontSize: 13, fontWeight: 600, color: "var(--text)", minWidth: 72, textAlign: "right" }}>{fmt(d.value)}</span>
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
                <button key={monthIdx} onClick={() => hasData && setSelectedMonth(monthIdx)} style={{ ...T.card, padding: "12px 14px", border: "none", fontFamily: FONT_FAMILY, cursor: hasData ? "pointer" : "default", textAlign: "left", background: isMax ? "var(--primary-tint)" : "var(--surface)", outline: isCurrentMo ? `2px solid ${T.indigo}` : "none", opacity: hasData ? 1 : 0.45, transition: "transform 0.15s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 5 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: isMax ? T.indigo : isCurrentMo ? T.indigo : "var(--text)", fontFamily: FONT_FAMILY }}>{name}</span>
                    {isCurrentMo && <span style={{ fontSize: 8, fontWeight: 600, background: T.indigoLight, color: T.indigo, padding: "2px 5px", borderRadius: 99, fontFamily: FONT_FAMILY }}>{t.now}</span>}
                    {isMax && !isCurrentMo && <span style={{ fontSize: 8, fontWeight: 600, background: "var(--primary-tint)", color: T.indigo, padding: "2px 5px", borderRadius: 99, fontFamily: FONT_FAMILY }}>{t.peak}</span>}
                  </div>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "var(--text)", fontFamily: MONO_FAMILY }}>{hasData ? fmt(total) : "—"}</p>
                  {hasData && <p style={{ margin: "3px 0 0", fontSize: 9, color: "var(--text-3)", fontWeight: 400, fontFamily: FONT_FAMILY }}>{t.tapToView}</p>}
                </button>
              );
            })}
          </div>
          <div style={{ ...T.card, padding: "20px 22px", marginBottom: 12 }}>
            <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: "var(--text)", fontFamily: FONT_FAMILY }}>{t.monthByMonth}</p>
            <p style={{ margin: "0 0 14px", fontSize: 11, color: "var(--text-3)", fontWeight: 400, fontFamily: FONT_FAMILY }}>{t.tapBarDrill}</p>
            {totalSpent > 0 ? (
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={monthlyTrend} margin={{ top: 4, right: 0, left: 0, bottom: 0 }} barSize={16}
                  onClick={(data) => { if (data?.activePayload?.[0]?.payload?.total > 0) setSelectedMonth(data.activePayload[0].payload.monthIdx); }}>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 500, fill: "var(--text-3)", fontFamily: FONT_FAMILY }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<AreaTooltip />} cursor={{ fill: "rgba(79,70,229,0.06)", radius: 8 }} />
                  <Bar dataKey="total" radius={[5, 5, 2, 2]}>
                    {monthlyTrend.map((entry, i) => {
                      const isMax = entry.total === Math.max(...monthlyTrend.map((m) => m.total)) && entry.total > 0;
                      const isCurrentMo = monthKey(yearlyYear, i) === currentMonth();
                      return <Cell key={i} fill={isMax ? "var(--primary)" : isCurrentMo ? "#818CF8" : "#C7D2FE"} style={{ cursor: entry.total > 0 ? "pointer" : "default" }} />;
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
        background: "var(--surface)", border: "1.5px solid var(--border)",
        cursor: "pointer", padding: "6px 12px", borderRadius: 99,
        fontFamily: FONT_FAMILY, fontSize: 12, fontWeight: 600,
        color: "var(--text-2)", boxShadow: "0 1px 4px rgba(15,23,42,0.07)",
        transition: "all 0.18s",
      }}
    >
      <Globe size={13} color="var(--primary)" />
      <span style={{ color: language === "EN" ? T.indigo : "var(--text-3)", fontWeight: language === "EN" ? 700 : 500 }}>EN</span>
      <span style={{ color: "#CBD5E1" }}>/</span>
      <span style={{ color: language === "TH" ? T.indigo : "var(--text-3)", fontWeight: language === "TH" ? 700 : 500 }}>TH</span>
    </button>
  );
}

// ─── Text Resizer Overlay ────────────────────────────────────────────────────
function TextSizerOverlay({ textScale, setTextScale, onClose, language = "EN" }) {
  const tr = (en, th) => (language === "TH" ? th : en);
  const pct = Math.round(textScale * 100);
  const steps = [0.85, 0.90, 0.95, 1.00, 1.05, 1.10, 1.15, 1.20, 1.25, 1.30];
  const stepLabels = { 0.85: "A−", 1.00: "A", 1.30: "A+" };
  const trackPct = ((textScale - 0.85) / (1.30 - 0.85)) * 100;

  const sizeLabel = pct <= 90 ? tr("Smaller", "เล็กลง") : pct <= 99 ? tr("Slightly Small", "เล็กเล็กน้อย") : pct === 100 ? tr("Standard", "มาตรฐาน") : pct <= 110 ? tr("Slightly Large", "ใหญ่เล็กน้อย") : pct <= 120 ? tr("Large", "ใหญ่") : tr("Extra Large", "ใหญ่พิเศษ");
  const sizeColor = pct < 100 ? "#6366F1" : pct === 100 ? "#10B981" : "#F59E0B";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <style>{`
        @keyframes sheetUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .text-sizer-sheet { animation: sheetUp 0.32s cubic-bezier(0.32, 0.72, 0, 1) forwards; }
        .ts-range { -webkit-appearance: none; appearance: none; width: 100%; height: 6px; border-radius: 99px; outline: none; cursor: pointer; background: transparent; }
        .ts-range::-webkit-slider-thumb { -webkit-appearance: none; width: 24px; height: 24px; border-radius: 50%; background: var(--primary); box-shadow: 0 2px 8px rgba(79,70,229,0.4); cursor: pointer; border: 3px solid #fff; transition: transform 0.15s; }
        .ts-range::-webkit-slider-thumb:hover { transform: scale(1.15); }
        .ts-range::-moz-range-thumb { width: 24px; height: 24px; border-radius: 50%; background: var(--primary); box-shadow: 0 2px 8px rgba(79,70,229,0.4); cursor: pointer; border: 3px solid #fff; }
      `}</style>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)" }} />
      <div className="text-sizer-sheet" style={{ position: "relative", background: "var(--surface)", borderRadius: "28px 28px 0 0", padding: "8px 24px 48px", width: "100%", maxWidth: 430, boxShadow: "0 -12px 48px rgba(15,23,42,0.22)", fontFamily: FONT_FAMILY }}>
        {/* Drag handle */}
        <div style={{ width: 40, height: 4, background: "var(--border)", borderRadius: 99, margin: "12px auto 20px" }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text)", fontFamily: FONT_FAMILY, letterSpacing: "-0.3px" }}>{tr("Text Size", "ขนาดตัวอักษร")}</p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: sizeColor, fontWeight: 600, fontFamily: FONT_FAMILY, transition: "color 0.2s" }}>{sizeLabel}</p>
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 99, border: "none", background: "var(--fill)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-2)" }}>
            <X size={15} />
          </button>
        </div>

        {/* Live preview card */}
        <div style={{ background: "var(--bg)", borderRadius: 20, padding: "16px", marginBottom: 24, border: "1.5px solid #E8E6E2", overflow: "hidden" }}>
          {/* Preview label */}
          <p style={{ margin: "0 0 10px", fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: FONT_FAMILY }}>{tr("Live Preview", "ตัวอย่าง")}</p>

          {/* Summary row */}
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: FONT_FAMILY }}>{tr("Monthly Summary", "สรุปรายเดือน")}</p>
            <span style={{ fontSize: 10, fontWeight: 600, background: "var(--primary-tint)", color: "var(--primary)", padding: "2px 7px", borderRadius: 99, fontFamily: FONT_FAMILY }}>Jun 2025</span>
          </div>
          <p style={{ margin: "0 0 10px", fontSize: 28, fontWeight: 700, letterSpacing: "-1.5px", color: "var(--text)", lineHeight: 1.05, fontFamily: MONO_FAMILY }}>฿12,840</p>

          {/* Budget bar */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 10, color: "var(--text-3)", fontFamily: FONT_FAMILY }}>{tr("Budget used", "ใช้งบไปแล้ว")}</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#F59E0B", fontFamily: MONO_FAMILY }}>64%</span>
            </div>
            <div style={{ height: 5, background: "#FEF3C7", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", width: "64%", background: "#F59E0B", borderRadius: 99 }} />
            </div>
          </div>

          {/* Transaction item */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--surface)", borderRadius: 14, boxShadow: "0 2px 8px rgba(15,23,42,0.05)" }}>
            <div style={{ width: 36, height: 36, minWidth: 28, borderRadius: 11, background: "#FFF8F0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>🍜</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--text)", fontFamily: FONT_FAMILY, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tr("Your Expenses", "รายจ่ายของคุณ")}</p>
              <p style={{ margin: "1px 0 0", fontSize: 11, color: "var(--text-3)", fontFamily: FONT_FAMILY }}>{tr("Food & Drink · Jun 6", "อาหารและเครื่องดื่ม · 6 มิ.ย.")}</p>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#EF4444", fontFamily: MONO_FAMILY, flexShrink: 0 }}>−฿320</span>
          </div>
        </div>

        {/* Slider section */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
            <Type size={13} color="#CBD5E1" strokeWidth={2.5} />
            <div style={{ flex: 1, position: "relative" }}>
              {/* Custom track background */}
              <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 6, marginTop: -3, borderRadius: 99, background: "var(--fill)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", top: "50%", left: 0, width: `${trackPct}%`, height: 6, marginTop: -3, borderRadius: 99, background: "linear-gradient(90deg, #818CF8, var(--primary))", pointerEvents: "none", transition: "width 0.1s" }} />
              <input
                type="range" min={0.85} max={1.30} step={0.05}
                value={textScale}
                onChange={(e) => setTextScale(parseFloat(e.target.value))}
                className="ts-range"
                style={{ position: "relative", zIndex: 1 }}
              />
            </div>
            <Type size={20} color="var(--primary)" strokeWidth={2.5} />
          </div>

          {/* Step dots */}
          <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: 27, paddingRight: 34 }}>
            {steps.map((s) => {
              const isActive = Math.abs(textScale - s) < 0.001;
              const isPassed = textScale >= s;
              return (
                <button key={s} onClick={() => setTextScale(s)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: "2px 0" }}>
                  <div style={{ width: isActive ? 8 : 5, height: isActive ? 8 : 5, borderRadius: "50%", background: isActive ? "var(--primary)" : isPassed ? "#818CF8" : "var(--border)", transition: "all 0.15s", boxShadow: isActive ? "0 0 0 3px rgba(79,70,229,0.2)" : "none" }} />
                  {stepLabels[s] && <span style={{ fontSize: 9, fontWeight: 700, color: isActive ? "var(--primary)" : "#CBD5E1", fontFamily: FONT_FAMILY, transition: "color 0.15s" }}>{stepLabels[s]}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Percentage badge + reset */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ background: "var(--primary-tint)", borderRadius: 99, padding: "6px 14px" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--primary)", fontFamily: MONO_FAMILY }}>{pct}%</span>
            </div>
            <span style={{ fontSize: 12, color: "var(--text-3)", fontFamily: FONT_FAMILY }}>{tr("of standard size", "ของขนาดมาตรฐาน")}</span>
          </div>
          {textScale !== 1 && (
            <button onClick={() => setTextScale(1)} style={{ display: "flex", alignItems: "center", gap: 5, background: "var(--bg)", border: "1.5px solid var(--border)", cursor: "pointer", padding: "7px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600, color: "var(--text-2)", fontFamily: FONT_FAMILY, transition: "all 0.15s" }}>
              {tr("Reset", "รีเซ็ต")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Category add/edit modal ─────────────────────────────────────────────────
const CAT_EMOJIS = ["🍜","🍔","☕","🛒","🚇","⛽","🏠","💡","🎁","🎉","🎮","🎬","💊","🏥","✈️","🏖️","👕","💄","📚","🐱","🐶","💼","📈","💻","💵","🎓","🏋️","⚽","🎵","🌿","🔧","📦"];
const CAT_COLORS = ["#FB923C","#60A5FA","#A78BFA","#FACC15","#F87171","#34D399","#22C55E","#EC4899","#3B82F6","#8B5CF6","#14B8A6","var(--text-3)"];

function CategoryForm({ type, initial, onSave, onClose, language = "EN" }) {
  const tr = (en, th) => (language === "TH" ? th : en);
  const isEdit = !!initial;
  const [name,  setName]  = useState(initial?.label || "");
  const [icon,  setIcon]  = useState(initial?.icon || CAT_EMOJIS[0]);
  const [color, setColor] = useState(initial?.bar || CAT_COLORS[0]);
  const [error, setError] = useState("");

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) { setError(tr("Enter a category name", "กรอกชื่อหมวดหมู่")); return; }
    const cat = {
      value: initial?.value || ("c_" + _spUid()),
      label: trimmed, labelShort: trimmed,
      icon, bar: color, pastelBg: color + "22", pastelText: color,
      custom: true, // editing strips i18n so the chosen name sticks in both languages
    };
    onSave(cat);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 700, display: "flex", alignItems: "flex-end", justifyContent: "center", fontFamily: FONT_FAMILY }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "relative", background: "var(--surface)", borderRadius: "28px 28px 0 0", padding: "8px 22px 40px", width: "100%", maxWidth: 430, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 -12px 48px rgba(15,23,42,0.22)", animation: "spSlideUp 0.32s cubic-bezier(0.32,0.72,0,1)" }}>
        <div style={{ width: 40, height: 4, background: "var(--border)", borderRadius: 99, margin: "12px auto 18px" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text)", fontFamily: FONT_FAMILY }}>{isEdit ? tr("Edit Category", "แก้ไขหมวดหมู่") : tr("New Category", "หมวดหมู่ใหม่")} <span style={{ fontSize: 12, fontWeight: 600, color: type === "income" ? "#15803D" : T.indigo }}>· {type === "income" ? tr("Income", "รายรับ") : tr("Expense", "รายจ่าย")}</span></p>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 99, border: "none", background: "var(--fill)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-2)" }}><X size={15} /></button>
        </div>

        {/* Preview chip */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 18, background: color + "18", border: `1.5px solid ${color}55`, marginBottom: 18 }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>{icon}</div>
          <span style={{ fontSize: 16, fontWeight: 700, color, fontFamily: FONT_FAMILY }}>{name.trim() || tr("Category name", "ชื่อหมวดหมู่")}</span>
        </div>

        <p style={{ ...T.label, margin: "0 0 8px", fontFamily: FONT_FAMILY }}>{tr("Name", "ชื่อ")}</p>
        <input value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder={tr("e.g. Coffee", "เช่น กาแฟ")} autoFocus style={{ ...T.input, marginBottom: 16 }} />

        <p style={{ ...T.label, margin: "0 0 8px", fontFamily: FONT_FAMILY }}>{tr("Icon", "ไอคอน")}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 6, marginBottom: 16 }}>
          {CAT_EMOJIS.map((e) => (
            <button key={e} onClick={() => setIcon(e)} style={{ aspectRatio: "1", borderRadius: 12, border: `2px solid ${icon === e ? color : "transparent"}`, background: icon === e ? color + "18" : "var(--bg)", fontSize: 19, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{e}</button>
          ))}
        </div>

        <p style={{ ...T.label, margin: "0 0 8px", fontFamily: FONT_FAMILY }}>{tr("Color", "สี")}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginBottom: 20 }}>
          {CAT_COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)} style={{ width: 34, height: 34, borderRadius: 99, background: c, border: color === c ? "3px solid #fff" : "3px solid transparent", outline: color === c ? `2px solid ${c}` : "none", cursor: "pointer" }} />
          ))}
        </div>

        {error && <p style={{ color: "#EF4444", fontSize: 13, marginBottom: 12, fontWeight: 500, fontFamily: FONT_FAMILY }}>{error}</p>}
        <button onClick={save} style={{ width: "100%", padding: "15px", borderRadius: 16, border: "none", background: T.indigo, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: FONT_FAMILY, boxShadow: "0 8px 24px rgba(79,70,229,0.28)" }}>
          {isEdit ? tr("Save Changes", "บันทึกการเปลี่ยนแปลง") : tr("Add Category", "เพิ่มหมวดหมู่")}
        </button>
      </div>
    </div>
  );
}

// ─── Quick Add (MeowJot-style fast keypad logging) ───────────────────────────
function QuickAddSheet({ expenseCats, incomeCats, defaultCat, defaultType = "expense", initialAmount, onSave, onDetailed, onClose, language = "EN" }) {
  const tr = (en, th) => (language === "TH" ? th : en);
  const [type, setType] = useState(defaultType);
  const categories = type === "income" ? incomeCats : expenseCats;
  const [amount, setAmount] = useState(initialAmount != null ? String(initialAmount) : "");
  const [category, setCategory] = useState(defaultCat || categories[0]?.value);
  const [note, setNote] = useState("");
  const amt = parseFloat(amount) || 0;
  const cat = categories.find((c) => c.value === category) || categories[0];

  // When switching type, snap the selected category to the new list's first option.
  const switchType = (next) => { if (next === type) return; setType(next); setCategory((next === "income" ? incomeCats : expenseCats)[0]?.value); };
  const accent = type === "income" ? "#22C55E" : (cat?.bar || "#FB923C");

  const press = (k) => setAmount((a) => {
    if (k === "⌫") return a.slice(0, -1);
    if (k === ".") return a.includes(".") ? a : (a === "" ? "0." : a + ".");
    if (a.includes(".") && a.split(".")[1].length >= 2) return a; // max 2 decimals
    if (a.replace(".", "").length >= 9) return a;                  // sane length cap
    return a === "0" ? k : a + k;
  });

  const keys = ["1","2","3","4","5","6","7","8","9",".","0","⌫"];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 650, display: "flex", alignItems: "flex-end", justifyContent: "center", fontFamily: FONT_FAMILY }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "relative", background: "#FFFDF8", borderRadius: "26px 26px 0 0", padding: "2px 18px 14px", width: "100%", maxWidth: 430, boxShadow: "0 -12px 48px rgba(15,23,42,0.22)", animation: "spSlideUp 0.32s cubic-bezier(0.32,0.72,0,1)" }}>
        <div style={{ width: 38, height: 4, background: "#E7E2D6", borderRadius: 99, margin: "7px auto 8px" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text)", fontFamily: FONT_FAMILY }}>🐱 {tr("Quick Add", "เพิ่มด่วน")}</p>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 99, border: "none", background: "#F1ECE0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#94896E" }}><X size={15} /></button>
        </div>

        {/* Expense / Income toggle */}
        <div style={{ display: "flex", gap: 4, background: "#F1ECE0", borderRadius: 14, padding: 4, marginBottom: 6 }}>
          {[["expense", tr("Expense", "รายจ่าย"), "#FB923C"], ["income", tr("Income", "รายรับ"), "#22C55E"]].map(([v, lbl, c]) => (
            <button key={v} onClick={() => switchType(v)} style={{ flex: 1, padding: "7px 0", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: FONT_FAMILY, fontSize: 13, fontWeight: 700, background: type === v ? "var(--surface)" : "transparent", color: type === v ? c : "#94896E", boxShadow: type === v ? "0 1px 6px rgba(15,23,42,0.10)" : "none", transition: "all 0.15s" }}>{lbl}</button>
          ))}
        </div>

        {/* Amount display */}
        <div style={{ textAlign: "center", padding: "2px 0 6px" }}>
          <span style={{ fontSize: 19, fontWeight: 700, color: amt > 0 ? accent : "#CBBFA3", fontFamily: MONO_FAMILY, verticalAlign: "middle", marginRight: 4 }}>{type === "income" ? "+฿" : "฿"}</span>
          <span style={{ fontSize: 34, fontWeight: 700, color: amt > 0 ? "var(--text)" : "#CBBFA3", fontFamily: MONO_FAMILY, letterSpacing: "-1.5px" }}>{amount || "0"}</span>
        </div>

        {/* Category quick row */}
        <div style={{ display: "flex", gap: 7, overflowX: "auto", padding: "2px 2px 7px", WebkitOverflowScrolling: "touch" }}>
          {categories.map((c) => {
            const on = c.value === category;
            return (
              <button key={c.value} onClick={() => setCategory(c.value)} style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6, padding: "6px 11px", borderRadius: 99, border: `2px solid ${on ? c.bar : "transparent"}`, background: on ? c.pastelBg : "#F4EFE4", color: on ? c.pastelText : "#8C8674", cursor: "pointer", fontFamily: FONT_FAMILY, fontSize: 13, fontWeight: 600, transition: "all 0.15s" }}>
                <span style={{ fontSize: 16 }}>{c.icon}</span>{c.labelShort}
              </button>
            );
          })}
        </div>

        {/* Note */}
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={tr("Add a note… (optional)", "เพิ่มโน้ต… (ไม่บังคับ)")} style={{ width: "100%", boxSizing: "border-box", padding: "8px 14px", borderRadius: 12, border: "1.5px solid #EAE3D4", background: "var(--surface)", fontSize: 13, fontFamily: FONT_FAMILY, color: "var(--text)", outline: "none", marginBottom: 7 }} />

        {/* Keypad */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 7 }}>
          {keys.map((k) => (
            <button key={k} onClick={() => press(k)} style={{ padding: "7px 0", borderRadius: 11, border: "none", background: k === "⌫" ? "#F1ECE0" : "var(--surface)", boxShadow: "0 1px 4px rgba(15,23,42,0.06)", fontSize: 18, fontWeight: 600, color: "var(--text)", fontFamily: MONO_FAMILY, cursor: "pointer", transition: "transform 0.08s" }}
              onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.94)"}
              onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}>
              {k}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onDetailed} style={{ flexShrink: 0, padding: "11px 18px", borderRadius: 14, border: "1.5px solid #EAE3D4", background: "var(--surface)", color: "#8A7E63", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: FONT_FAMILY }}>{tr("More", "เพิ่มเติม")}</button>
          <button onClick={() => amt > 0 && onSave({ category, amount: amt, note, type })} disabled={amt <= 0} style={{ flex: 1, padding: "11px", borderRadius: 14, border: "none", background: amt > 0 ? accent : "#E7E2D6", color: "#fff", fontSize: 16, fontWeight: 700, cursor: amt > 0 ? "pointer" : "not-allowed", fontFamily: FONT_FAMILY, boxShadow: amt > 0 ? `0 8px 22px ${accent}55` : "none", transition: "all 0.18s" }}>
            {tr("Save", "บันทึก")} {amt > 0 ? `฿${amt.toLocaleString()}` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Receipt OCR (Tesseract.js via CDN window.Tesseract) ─────────────────────
let _ocrWorker = null;
async function getOcrWorker(onProgress) {
  if (_ocrWorker) return _ocrWorker;
  _ocrWorker = await window.Tesseract.createWorker(["eng", "tha"], 1, {
    logger: (m) => { if (m.status === "recognizing text") onProgress(Math.round(m.progress * 100)); },
  });
  return _ocrWorker;
}
// Extract a total: keyword priority (Total/Amount/รวม/จำนวนเงิน…), else the best price-shaped number.
//
// NUM's first branch requires >=1 comma-group so it only fires for genuinely comma-formatted
// numbers (e.g. "12,345.67"); previously it used `*` (zero-or-more), which let it match just the
// leading 1-3 digits of ANY plain digit run before the second branch ever got a chance, silently
// truncating any total >= 1000 written without a thousands separator (e.g. "1500.00" -> "150").
function extractSlipAmount(text) {
  if (!text) return null;
  const NUM = "(\\d{1,3}(?:,\\d{3})+(?:\\.\\d{1,2})?|\\d+(?:\\.\\d{1,2})?)";
  const KEYWORDS = ["grand total", "total", "amount due", "amount", "balance",
                    "ยอดรวมสุทธิ", "ยอดรวม", "ยอดชำระ", "รวมทั้งสิ้น", "จำนวนเงิน", "รวม"];
  for (const kw of KEYWORDS) {
    const re = new RegExp(kw.replace(/\s+/g, "\\s*") + "[\\s:.\\-฿]*" + NUM, "i");
    const m = text.match(re);
    if (m && m[1]) { const v = parseFloat(m[1].replace(/,/g, "")); if (v > 0) return v; }
  }
  // No keyword matched (OCR garbled the label, or an unlisted phrasing was used). Rather than
  // picking "the biggest number anywhere in the text" -- which lets invoice numbers, tax IDs,
  // phone numbers and dates outrank the real total -- prefer numbers that look like a price
  // (carry a decimal amount), and among those the last one, since totals are conventionally
  // printed at the bottom of a receipt.
  const candidates = [...text.matchAll(new RegExp(NUM, "g"))]
    .map((m) => ({ value: parseFloat(m[0].replace(/,/g, "")), hasDecimal: /\.\d{1,2}$/.test(m[0]) }))
    .filter((c) => !isNaN(c.value) && c.value >= 1 && c.value < 10_000_000)
    // Exclude bare integers that look like a calendar year (e.g. a printed date) unless they
    // carry a decimal amount -- a real total in that range almost always has one.
    .filter((c) => c.hasDecimal || !(Number.isInteger(c.value) && c.value >= 1900 && c.value <= 2099));
  if (!candidates.length) return null;
  const withDecimal = candidates.filter((c) => c.hasDecimal);
  const pool = withDecimal.length ? withDecimal : candidates;
  return pool[pool.length - 1].value;
}

export default function FinanceTracker() {
  const [textScale,      setTextScale]      = useState(() => lsGet("ft_text_scale", 1));
  const [showTextSizer,  setShowTextSizer]  = useState(false);
  const [dark,           setDark]           = useState(() => lsGet("ft_dark", false));
  const [transactions,  setTransactions]  = useState(() => {
    const raw = lsGet("ft_txns", []);
    // Drop malformed rows so one bad entry can't crash every reduce/getCat downstream.
    return Array.isArray(raw)
      ? raw.filter((tx) => tx && typeof tx.amount === "number" && !Number.isNaN(tx.amount) && typeof tx.date === "string" && typeof tx.category === "string")
      : [];
  });
  const [subscriptions, setSubscriptions] = useState(() => lsGet("ft_subs",    []));
  const [budgets,       setBudgets]       = useState(() => lsGet("ft_budgets", { total: "", categories: {} }));
  const [cats,          setCats]          = useState(() => ({
    exp: lsGet("ft_cats_exp", null) || defaultExpCats(),
    inc: lsGet("ft_cats_inc", null) || defaultIncCats(),
  }));
  // Category management UI state
  const [showQuickAdd,  setShowQuickAdd]  = useState(false);
  const [analyticsCat,  setAnalyticsCat]  = useState(null); // drill-down category in Analytics tab
  const [expandedHomeCats, setExpandedHomeCats] = useState({}); // collapsible category sections on Home
  const [catModal,      setCatModal]      = useState(null); // { type, cat } | null
  const [catDeleteTgt,  setCatDeleteTgt]  = useState(null); // { type, cat, count } | null
  setCatRegistry(cats); // mirror to module-level helpers every render (idempotent)
  const [tab,           setTab]           = useState("home");
  const [showForm,      setShowForm]      = useState(false);
  // Receipt scanning (OCR)
  const [scanProgress,  setScanProgress]  = useState(null); // null = idle, 0..100 while reading
  const [scanAmount,    setScanAmount]    = useState(null); // prefilled amount handed to Quick Add
  const scanInputRef = useRef(null);
  const [showSubForm,   setShowSubForm]   = useState(false);
  const [deletingId,    setDeletingId]    = useState(null);
  const [toast,         setToast]         = useState(null);
  const [error,         setError]         = useState("");
  const [language,      setLanguage]      = useState(() => lsGet("ft_lang", "EN"));
  const [formTxType,    setFormTxType]    = useState(() => lsGet("ft_last_type", "expense"));
  const [formPrefilledMonth, setFormPrefilledMonth] = useState(null); // "YYYY-MM" or null

  // NEW: Edit transaction
  const [editingTx,     setEditingTx]     = useState(null); // tx object being edited

  // Profile (used as the "You" identity inside Groups)
  const [profile,       setProfile]       = useState(() => lsGet("ft_profile", { name: "You", initials: "YO" }));
  useEffect(() => lsSet("ft_profile", profile), [profile]);

  // Insert/update or remove a Home transaction mirrored from a group expense,
  // keyed by groupExpenseId so edits/deletes stay in sync.
  const linkUpsertTx = useCallback((p) => {
    setTransactions((prev) => {
      const idx = prev.findIndex((t) => t.groupExpenseId === p.groupExpenseId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], type: p.type, amount: p.amount, originalAmount: p.originalAmount, reimbursed: p.reimbursed, split: p.split, category: p.category, note: p.note, date: p.date, tags: extractTags(p.note) };
        return copy;
      }
      return [{ id: uid(), type: p.type, amount: p.amount, originalAmount: p.originalAmount, reimbursed: p.reimbursed, split: p.split, category: p.category, note: p.note, date: p.date, tags: extractTags(p.note), groupExpenseId: p.groupExpenseId }, ...prev];
    });
  }, []);
  const linkDeleteTx = useCallback((groupExpenseId) => {
    setTransactions((prev) => prev.filter((t) => t.groupExpenseId !== groupExpenseId));
  }, []);

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
  const tr = (en, th) => (language === "TH" ? th : en); // inline i18n for labels not in the main map
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
  useEffect(() => lsSet("ft_text_scale", textScale), [textScale]);
  useEffect(() => { lsSet("ft_dark", dark); document.documentElement.setAttribute("data-theme", dark ? "dark" : "light"); }, [dark]);
  useEffect(() => lsSet("ft_dismissed_alerts", dismissedAlerts), [dismissedAlerts]);
  useEffect(() => lsSet("ft_cats_exp", cats.exp), [cats.exp]);
  useEffect(() => lsSet("ft_cats_inc", cats.inc), [cats.inc]);

  // ── Category CRUD ──────────────────────────────────────────────────────────
  const saveCategory = (type, cat) => {
    const key = type === "income" ? "inc" : "exp";
    setCats((p) => {
      const exists = p[key].some((c) => c.value === cat.value);
      return { ...p, [key]: exists ? p[key].map((c) => c.value === cat.value ? cat : c) : [...p[key], cat] };
    });
    setCatModal(null);
    showToast(catModal?.cat ? "✓ Category updated" : "✓ Category added");
  };
  const countCatTxns = (type, value) =>
    transactions.filter((tx) => (type === "income" ? tx.type === "income" : tx.type !== "income") && tx.category === value).length;
  const deleteCategory = (type, value, mode) => {
    const key = type === "income" ? "inc" : "exp";
    const isType = (tx) => (type === "income" ? tx.type === "income" : tx.type !== "income") && tx.category === value;
    setTransactions((prev) => mode === "delete"
      ? prev.filter((tx) => !isType(tx))
      : prev.map((tx) => isType(tx) ? { ...tx, category: "Uncategorized" } : tx));
    setCats((p) => {
      let list = p[key].filter((c) => c.value !== value);
      if (mode === "reassign" && !list.some((c) => c.value === "Uncategorized")) list = [...list, { ...UNCATEGORIZED }];
      return { ...p, [key]: list };
    });
    setCatDeleteTgt(null);
    showToast(mode === "delete" ? "Category & its transactions removed" : "Category removed, transactions kept");
  };

  useEffect(() => {
    if (!subscriptions.length) return;
    const now = new Date();
    const day = now.getDate(), month = currentMonth(), injected = [];
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    subscriptions.forEach((sub) => {
      // Clamp the billing day to the month length so e.g. day 31 still charges on Feb 28.
      const billingDay = Math.min(parseInt(sub.day) || 1, lastDayOfMonth);
      if (billingDay !== day) return;
      const already = transactions.some((tx) => tx.recurringId === sub.id && tx.date.startsWith(month));
      if (!already) injected.push({ id: uid(), amount: parseFloat(sub.amount), category: sub.category, note: sub.name + " (auto)", date: todayStr(), recurringId: sub.id });
    });
    if (injected.length) { setTransactions((p) => [...injected, ...p]); showToast(t.autoAdded(injected.length)); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const month        = currentMonth();
  // Uncategorized uploads wait in their own list and stay out of totals/analytics until categorized.
  const pendingTxns  = transactions.filter((tx) => tx.pending);
  const monthTxns    = transactions.filter((tx) => !tx.pending && tx.date.startsWith(month));
  const monthlyTotal = monthTxns.filter((tx) => tx.type !== "income").reduce((s, tx) => s + tx.amount, 0);
  const monthIncomeTotal = monthTxns.filter((tx) => tx.type === "income").reduce((s, tx) => s + tx.amount, 0);
  const availableToSpend = monthIncomeTotal - monthlyTotal;
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
      setTransactions((p) => [{ id: uid(), type: formTxType, amount: net, category: form.category, note: form.note.trim(), date: form.date, tags: extractTags(form.note), split: formTxType === "expense" ? form.split : false, originalAmount: parseFloat(form.amount), reimbursed: (formTxType === "expense" && form.split) ? parseFloat(form.reimbursed)||0 : 0 }, ...p]);
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
    // Quote every field and neutralise CSV-injection (a leading =,+,-,@ is read as a formula by Excel/Sheets).
    const esc = (v) => {
      let s = String(v ?? "");
      if (/^[=+\-@]/.test(s)) s = "'" + s;
      return `"${s.replace(/"/g, '""')}"`;
    };
    const header = ["Date","Type","Category","Note","Amount","Split","Reimbursed","Tags"];
    const rows = [...transactions].sort((a,b) => new Date(b.date)-new Date(a.date)).map((tx) => [
      tx.date,
      tx.type || "expense",
      tx.category,
      tx.note || "",
      tx.amount,
      tx.split ? "yes" : "no",
      tx.reimbursed || 0,
      (tx.tags||[]).join(" "),
    ]);
    const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `transactions_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    showToast("✓ CSV exported");
  };

  // Open the full transaction form with a category pre-selected (used from drill-down "add")
  const openAddForm = (category, type = "expense") => {
    setEditingTx(null);
    setFormTxType(type);
    setForm({ ...blankForm, category });
    setFormPrefilledMonth(null);
    setShowQuickAdd(false);
    setShowForm(true);
    setTab("home");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const quickSave = ({ category, amount, note, type = "expense" }) => {
    const net = parseFloat(amount) || 0;
    if (net <= 0) return;
    setTransactions((p) => [{ id: uid(), type, amount: net, category, note: (note || "").trim(), date: todayStr(), tags: extractTags(note || ""), split: false, originalAmount: net, reimbursed: 0 }, ...p]);
    setShowQuickAdd(false);
    setScanAmount(null);
    showToast("✓ Saved");
  };

  // Bulk receipt OCR: read each uploaded image → extract total → queue as an
  // "Uncategorized" pending transaction for the user to categorize afterwards.
  const handleUploadFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f && f.type.startsWith("image/"));
    if (!files.length) return;
    if (!window.Tesseract) { showToast(tr("OCR not loaded — check connection", "โหลด OCR ไม่สำเร็จ — ตรวจสอบเน็ต")); return; }
    let worker;
    try {
      worker = await getOcrWorker(() => {});
    } catch (err) {
      console.error("OCR worker failed to start:", err);
      showToast(tr("OCR failed to start — try again", "เริ่ม OCR ไม่สำเร็จ — ลองใหม่"));
      return;
    }
    // Each slip is OCR'd independently so one corrupt/unreadable image can't discard the
    // slips that already scanned successfully earlier in the same batch.
    const created = [];
    let failed = 0;
    for (let i = 0; i < files.length; i++) {
      setScanProgress({ i: i + 1, n: files.length });
      try {
        const { data } = await worker.recognize(files[i]);
        const amount = extractSlipAmount(data.text);
        created.push({
          id: uid(), type: "expense", amount: amount != null ? Math.round(amount * 100) / 100 : 0,
          category: "Uncategorized", pending: true, note: "", date: todayStr(),
          tags: [], split: false, originalAmount: amount != null ? Math.round(amount * 100) / 100 : 0, reimbursed: 0,
        });
      } catch (err) {
        console.error("OCR failed for a slip:", err);
        failed++;
      }
    }
    setScanProgress(null);
    if (created.length) setTransactions((p) => [...created, ...p]);
    if (created.length && !failed) {
      showToast(tr(`${created.length} slip${created.length !== 1 ? "s" : ""} added — categorize them`, `เพิ่ม ${created.length} สลิป — รอจัดหมวดหมู่`));
    } else if (created.length && failed) {
      showToast(tr(`${created.length} added, ${failed} failed — try those again`, `เพิ่ม ${created.length} รายการ, ล้มเหลว ${failed} รายการ — ลองใหม่`));
    } else {
      showToast(tr("Upload failed — try again", "อัปโหลดไม่สำเร็จ — ลองใหม่"));
    }
  };

  // Assign a category to a pending (uncategorized) upload.
  const categorizePending = (id, category) =>
    setTransactions((p) => p.map((tx) => tx.id === id ? { ...tx, category, pending: false } : tx));

  const handleAddSub = () => {
    if (!subForm.name || !subForm.amount || parseFloat(subForm.amount) <= 0) return;
    setSubscriptions((p) => [...p, { ...subForm, id: uid(), amount: parseFloat(subForm.amount) }]);
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
    // Yearly Summary is a *spending* report — exclude income so totals/avg/biggest/charts aren't inflated.
    const yearTxns = transactions.filter((tx) => tx.date.startsWith(yearStr) && tx.type !== "income");
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
    <div style={{ fontFamily: FONT_FAMILY, maxWidth: `min(430px, ${100 / textScale}vw)`, margin: "0 auto", minHeight: "100vh", background: T.pageBg, paddingBottom: 90, zoom: textScale }}>
      <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&family=IBM+Plex+Sans+Thai:wght@300;400;500;600;700&family=Kanit:wght@300;400;500;600&display=swap" rel="stylesheet" />
      <style>{THEME_CSS + `@keyframes spSlideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes spSpin{to{transform:rotate(360deg)}}`}</style>

      {showYearlySummary && <YearlySummary transactions={transactions} language={language} yearlyYear={yearlyYear} setYearlyYear={setYearlyYear} setShowYearlySummary={setShowYearlySummary} computeYearlyData={computeYearlyData} t={t} />}

      {/* ── Global Add Transaction bottom sheet (works from overlay too) ── */}
      {showForm && formPrefilledMonth && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", flexDirection: "column", justifyContent: "flex-end", fontFamily: FONT_FAMILY }}>
          <div onClick={() => { setShowForm(false); setError(""); setFormPrefilledMonth(null); }} style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(2px)" }} />
          <div style={{ position: "relative", background: "var(--surface)", borderRadius: "28px 28px 0 0", padding: "24px 20px 40px", maxWidth: 430, width: "100%", margin: "0 auto", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 -8px 40px rgba(15,23,42,0.18)" }}>
            {/* drag handle */}
            <div style={{ width: 36, height: 4, background: "var(--border)", borderRadius: 99, margin: "0 auto 20px" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <p style={{ ...T.h2, margin: 0, fontFamily: FONT_FAMILY }}>{t.newTransaction}</p>
              <button onClick={() => { setShowForm(false); setError(""); setFormPrefilledMonth(null); }} style={{ width: 32, height: 32, borderRadius: 99, border: "none", cursor: "pointer", background: "var(--fill)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-2)" }}><X size={14} /></button>
            </div>

            {/* Income / Expense toggle */}
            <div style={{ display: "flex", gap: 0, marginBottom: 20, background: "var(--fill)", borderRadius: 14, padding: 4 }}>
              {[{ key: "expense", label: "💸 Expense" }, { key: "income", label: "💰 Income" }].map(({ key: k, label }) => {
                const active = formTxType === k;
                return (
                  <button key={k} onClick={() => {
                    setFormTxType(k);
                    lsSet("ft_last_type", k);
                    setForm((f) => ({ ...f, category: k === "income" ? "Salary" : "Food", split: false, reimbursed: "" }));
                  }} style={{ flex: 1, padding: "10px 8px", borderRadius: 11, border: "none", cursor: "pointer", fontFamily: FONT_FAMILY, fontSize: 13, fontWeight: 600, background: active ? "var(--surface)" : "transparent", color: active ? (k === "income" ? "#15803D" : T.indigo) : "var(--text-3)", boxShadow: active ? "0 1px 6px rgba(15,23,42,0.10)" : "none", transition: "all 0.18s" }}>
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
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderRadius: 16, background: form.split ? "var(--primary-tint)" : "var(--bg)", border: `1.5px solid ${form.split ? "#C7D2FE" : "var(--border)"}`, marginBottom: 14, cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 11, background: form.split ? "var(--primary-tint)" : "var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Scissors size={15} color={form.split ? T.indigo : "var(--text-3)"} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text)", fontFamily: FONT_FAMILY }}>{t.splitBill}</p>
                      <p style={{ margin: 0, fontSize: 12, color: "var(--text-3)", fontFamily: FONT_FAMILY, lineHeight: 1.6 }}>{t.splitSub}</p>
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
                  <button key={cat.value} onClick={() => setForm({ ...form, category: cat.value })} style={{ padding: "11px 6px", borderRadius: 16, cursor: "pointer", fontFamily: FONT_FAMILY, border: `2px solid ${active ? cat.bar : "transparent"}`, background: active ? cat.pastelBg : "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, transition: "all 0.15s" }}>
                    <span style={{ fontSize: 21 }}>{cat.icon}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: active ? cat.pastelText : "var(--text-3)", fontFamily: FONT_FAMILY, lineHeight: 1.5 }}>{cat.labelShort}</span>
                  </button>
                );
              })}
            </div>

            <p style={{ ...T.label, margin: "0 0 8px", fontFamily: FONT_FAMILY }}>{t.noteTags}</p>
            <input type="text" placeholder={t.notePlaceholder} value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              style={{ ...T.input, marginBottom: 8 }} />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14, minHeight: 0 }}>
              {extractTags(form.note).map((tag) => <span key={tag} style={{ background: "var(--primary-tint)", color: T.indigo, fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 99, fontFamily: FONT_FAMILY }}>{tag}</span>)}
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
          <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "var(--bg)", overflowY: "auto", fontFamily: FONT_FAMILY }}>
            {/* Sticky top nav */}
            <div style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(248,247,244,0.94)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(226,232,240,0.6)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={closeDetail}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--surface)", border: "none", cursor: "pointer", padding: "8px 16px", borderRadius: 99, fontFamily: FONT_FAMILY, fontSize: 13, fontWeight: 600, color: "var(--text)", boxShadow: "0 2px 8px rgba(15,23,42,0.08)", flexShrink: 0 }}>
                <ArrowLeft size={14} /> {t.backStatements}
              </button>
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <button onClick={() => prevMonthIdx !== null && goToMonth(prevMonthIdx)} disabled={prevMonthIdx === null}
                  style={{ width: 34, height: 34, borderRadius: 99, border: "none", display: "flex", alignItems: "center", justifyContent: "center", background: prevMonthIdx !== null ? "var(--surface)" : "var(--fill)", color: prevMonthIdx !== null ? "var(--text)" : "#CBD5E1", cursor: prevMonthIdx !== null ? "pointer" : "default", boxShadow: prevMonthIdx !== null ? "0 2px 8px rgba(15,23,42,0.08)" : "none" }}>
                  <ChevronLeft size={16} />
                </button>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", minWidth: 110, textAlign: "center", fontFamily: FONT_FAMILY }}>{mShortName} {year}</span>
                <button onClick={() => nextMonthIdx !== null && goToMonth(nextMonthIdx)} disabled={nextMonthIdx === null}
                  style={{ width: 34, height: 34, borderRadius: 99, border: "none", display: "flex", alignItems: "center", justifyContent: "center", background: nextMonthIdx !== null ? "var(--surface)" : "var(--fill)", color: nextMonthIdx !== null ? "var(--text)" : "#CBD5E1", cursor: nextMonthIdx !== null ? "pointer" : "default", boxShadow: nextMonthIdx !== null ? "0 2px 8px rgba(15,23,42,0.08)" : "none" }}>
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
                  style={{ width: 36, height: 36, borderRadius: 99, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--fill)", color: "var(--text-2)", flexShrink: 0, transition: "background 0.15s" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--border)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "var(--fill)"}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div style={{ maxWidth: 430, margin: "0 auto", padding: "0 16px 100px" }}>
              <div style={{ padding: "26px 4px 18px" }}>
                <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: FONT_FAMILY }}>{t.summaryLabel(mShortName, year)}</p>
                <p style={{ margin: 0, fontSize: 44, fontWeight: 600, letterSpacing: "-2px", color: mTotal > 0 ? "#EF4444" : "var(--text)", lineHeight: 1.1, fontFamily: MONO_FAMILY }}>{mTotal > 0 ? `−${fmt(mTotal)}` : fmt(mTotal)}</p>
                {mIncomeTotal > 0 && (
                  <p style={{ margin: "4px 0 0", fontSize: 16, fontWeight: 600, color: "#15803D", fontFamily: MONO_FAMILY }}>+{fmt(mIncomeTotal)} income</p>
                )}
                {mIncomeTotal > 0 && (() => {
                  const mAvailable = mIncomeTotal - mTotal;
                  return (
                    <p style={{ margin: "6px 0 0", fontSize: 13, fontWeight: 600, color: mAvailable >= 0 ? "#15803D" : "#EF4444", fontFamily: FONT_FAMILY }}>
                      {t.availableToSpend}: <span style={{ fontFamily: MONO_FAMILY }}>{mAvailable < 0 && "−"}{fmt(Math.abs(mAvailable))}</span>
                    </p>
                  );
                })()}
                <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--text-3)", fontWeight: 400, fontFamily: FONT_FAMILY, lineHeight: 1.6 }}>{mTxns.length} {t.txRecorded}</p>
              </div>

              {mTxns.length === 0 ? (
                <div style={{ ...T.card, padding: "56px 24px", textAlign: "center", marginTop: 8 }}>
                  <div style={{ width: 60, height: 60, borderRadius: 22, background: "var(--fill)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                    <Wallet size={26} color="#CBD5E1" />
                  </div>
                  <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 600, color: "var(--text-3)", fontFamily: FONT_FAMILY }}>{t.noExpenses}</p>
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
                          style={{ width: "100%", border: "none", fontFamily: FONT_FAMILY, cursor: "pointer", textAlign: "left", padding: "16px 20px", borderRadius: 20, background: isActive ? cat.pastelBg : "var(--surface)", outline: isActive ? `2px solid ${cat.bar}` : "2px solid transparent", boxShadow: isActive ? `0 6px 24px ${cat.bar}30` : "0 2px 12px rgba(15,23,42,0.06)", transition: "all 0.18s" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                            <div style={{ width: 42, height: 42, borderRadius: 14, flexShrink: 0, background: isActive ? "var(--surface)" : cat.pastelBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, transition: "all 0.18s" }}>{cat.icon}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                                <span style={{ fontSize: 14, fontWeight: 600, color: isActive ? cat.pastelText : "var(--text)", fontFamily: FONT_FAMILY }}>{cat.label}</span>
                                <span style={{ fontFamily: MONO_FAMILY, fontSize: 15, fontWeight: 600, color: isActive ? cat.pastelText : "var(--text)" }}>{fmt(amt)}</span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                                <span style={{ fontSize: 11, color: isActive ? cat.pastelText : "var(--text-3)", fontWeight: 400, fontFamily: FONT_FAMILY, lineHeight: 1.6 }}>{catCount} {t.transactions}</span>
                                <span style={{ fontSize: 12, fontWeight: 600, color: isActive ? cat.pastelText : "var(--text-3)", fontFamily: FONT_FAMILY }}>{(pct * 100).toFixed(0)}%</span>
                              </div>
                            </div>
                          </div>
                          <div style={{ height: 5, background: isActive ? `${cat.bar}30` : "var(--fill)", borderRadius: 99, overflow: "hidden" }}>
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
                      <button onClick={() => setDetailCat(null)} style={{ display: "flex", alignItems: "center", gap: 5, background: "var(--fill)", border: "none", cursor: "pointer", padding: "5px 12px", borderRadius: 99, fontFamily: FONT_FAMILY, fontSize: 11, fontWeight: 600, color: "var(--text-2)" }}>
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
                            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", fontFamily: FONT_FAMILY }}>{tx.note || cat.label}</span>
                            {isIncome && <span style={{ fontSize: 10, fontWeight: 600, background: "#F0FDF4", color: "#15803D", padding: "1px 6px", borderRadius: 5, fontFamily: FONT_FAMILY }}>{tr("income", "รายรับ")}</span>}
                            {!isIncome && tx.split && <span style={{ fontSize: 10, fontWeight: 600, background: "var(--primary-tint)", color: T.indigo, padding: "1px 6px", borderRadius: 5, fontFamily: FONT_FAMILY }}>{t.split}</span>}
                            {tx.recurringId && <span style={{ fontSize: 10, fontWeight: 600, background: "#FEFCE8", color: "#A16207", padding: "1px 6px", borderRadius: 5, fontFamily: FONT_FAMILY }}>{t.auto}</span>}
                          </div>
                          <p style={{ ...T.muted, margin: "2px 0 0", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: FONT_FAMILY }}>{cat.label} · {fmtDate(tx.date)}</p>
                          {tags.length > 0 && <div style={{ display: "flex", gap: 3, marginTop: 4, flexWrap: "wrap" }}>{tags.map((tag) => <span key={tag} style={{ fontSize: 10, fontWeight: 600, background: "var(--primary-tint)", color: "#6366F1", padding: "1px 7px", borderRadius: 99, fontFamily: FONT_FAMILY }}>{tag}</span>)}</div>}
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

      {showTextSizer && <TextSizerOverlay textScale={textScale} setTextScale={setTextScale} onClose={() => setShowTextSizer(false)} language={language} />}

      {/* Quick Add keypad */}
      {showQuickAdd && (
        <QuickAddSheet
          key={scanAmount != null ? "scan-" + scanAmount : "manual"}
          expenseCats={CATEGORIES}
          incomeCats={INCOME_CATS}
          defaultType={formTxType}
          defaultCat={formTxType === "income" ? INCOME_CATS[0]?.value : form.category}
          initialAmount={scanAmount}
          onSave={quickSave}
          onDetailed={() => { setShowQuickAdd(false); setScanAmount(null); setEditingTx(null); setForm(blankForm); setFormPrefilledMonth(null); setShowForm(true); setTab("home"); }}
          onClose={() => { setShowQuickAdd(false); setScanAmount(null); }}
          language={language}
        />
      )}

      {/* OCR scanning overlay */}
      {scanProgress !== null && (
        <div style={{ position: "fixed", inset: 0, zIndex: 800, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_FAMILY }}>
          <div style={{ background: "var(--surface)", borderRadius: 22, padding: "28px 36px", textAlign: "center", boxShadow: "0 20px 60px rgba(15,23,42,0.3)" }}>
            <div style={{ width: 40, height: 40, margin: "0 auto 14px", borderRadius: "50%", border: "3px solid var(--border)", borderTopColor: T.indigo, animation: "spSpin 0.8s linear infinite" }} />
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--text)", fontFamily: FONT_FAMILY }}>{tr("Reading slip", "กำลังอ่านสลิป")} {scanProgress?.i}/{scanProgress?.n}…</p>
          </div>
        </div>
      )}

      {/* Category add/edit modal */}
      {catModal && (
        <CategoryForm type={catModal.type} initial={catModal.cat} onSave={(cat) => saveCategory(catModal.type, cat)} onClose={() => setCatModal(null)} language={language} />
      )}

      {/* Safe-delete confirm (category has transactions) */}
      {catDeleteTgt && (
        <div style={{ position: "fixed", inset: 0, zIndex: 720, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_FAMILY, padding: 24 }}>
          <div onClick={() => setCatDeleteTgt(null)} style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(4px)" }} />
          <div style={{ position: "relative", background: "var(--surface)", borderRadius: 24, padding: "24px 22px", width: "100%", maxWidth: 360, boxShadow: "0 20px 60px rgba(15,23,42,0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: "#FFF1F2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{catDeleteTgt.cat.icon}</div>
              <div>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text)", fontFamily: FONT_FAMILY }}>{tr(`Delete "${catDeleteTgt.cat.label}"?`, `ลบ "${catDeleteTgt.cat.label}"?`)}</p>
                <p style={{ margin: 0, fontSize: 12, color: "var(--text-3)", fontFamily: FONT_FAMILY }}>{tr(`${catDeleteTgt.count} transaction${catDeleteTgt.count !== 1 ? "s" : ""} use this category`, `${catDeleteTgt.count} รายการใช้หมวดหมู่นี้`)}</p>
              </div>
            </div>
            <p style={{ ...T.muted, margin: "0 0 16px", fontSize: 13, fontFamily: FONT_FAMILY }}>{tr("Choose what happens to those transactions:", "เลือกว่าจะทำอย่างไรกับรายการเหล่านั้น:")}</p>
            <button onClick={() => deleteCategory(catDeleteTgt.type, catDeleteTgt.cat.value, "reassign")} style={{ width: "100%", padding: "13px", borderRadius: 14, border: "1.5px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: FONT_FAMILY, marginBottom: 9, textAlign: "left", display: "flex", flexDirection: "column", gap: 2 }}>
              <span>{tr("Keep transactions", "เก็บรายการไว้")}</span>
              <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-3)" }}>{tr('Move them to "Uncategorized"', "ย้ายไปที่ “ไม่มีหมวดหมู่”")}</span>
            </button>
            <button onClick={() => deleteCategory(catDeleteTgt.type, catDeleteTgt.cat.value, "delete")} style={{ width: "100%", padding: "13px", borderRadius: 14, border: "none", background: "#FFF1F2", color: "#BE123C", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: FONT_FAMILY, marginBottom: 9, textAlign: "left", display: "flex", flexDirection: "column", gap: 2 }}>
              <span>{tr("Delete everything", "ลบทั้งหมด")}</span>
              <span style={{ fontSize: 11, fontWeight: 400, color: "#FB7185" }}>{tr(`Remove the category and its ${catDeleteTgt.count} transaction${catDeleteTgt.count !== 1 ? "s" : ""}`, `ลบหมวดหมู่และ ${catDeleteTgt.count} รายการ`)}</span>
            </button>
            <button onClick={() => setCatDeleteTgt(null)} style={{ width: "100%", padding: "11px", borderRadius: 14, border: "none", background: "var(--fill)", color: "var(--text-2)", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: FONT_FAMILY }}>{tr("Cancel", "ยกเลิก")}</button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 999, background: "var(--text)", color: "var(--on-inverse)", padding: "10px 20px", borderRadius: 99, fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", boxShadow: "0 8px 32px rgba(15,23,42,0.22)", fontFamily: FONT_FAMILY }}>
          {toast}
        </div>
      )}

      {/* NEW: Undo delete toast */}
      {undoToast && (
        <div style={{ position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)", zIndex: 999, background: "#1E293B", color: "var(--on-inverse)", padding: "12px 18px", borderRadius: 16, fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", boxShadow: "0 8px 32px rgba(15,23,42,0.28)", fontFamily: FONT_FAMILY, display: "flex", alignItems: "center", gap: 12 }}>
          <span>{tr("Transaction deleted", "ลบรายการแล้ว")}</span>
          <button onClick={handleUndo} style={{ display: "flex", alignItems: "center", gap: 5, background: T.indigo, border: "none", cursor: "pointer", color: "var(--surface)", padding: "5px 12px", borderRadius: 99, fontSize: 12, fontWeight: 700, fontFamily: FONT_FAMILY }}>
            <RotateCcw size={11} /> {tr("Undo", "เลิกทำ")}
          </button>
        </div>
      )}

      {/* NEW: Budget alert banner (dismissible) */}
      {tab === "home" && catAlertCount > 0 && (
        <div style={{ margin: "0 16px 12px", padding: "12px 16px", background: "#FFFBEB", borderRadius: 16, border: "1.5px solid #FDE68A", display: "flex", alignItems: "center", gap: 10 }}>
          <AlertTriangle size={15} color="#D97706" />
          <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "#92400E", fontFamily: FONT_FAMILY }}>
            {tr(`${catAlertCount} budget ${catAlertCount === 1 ? "category is" : "categories are"} near or over limit`, `${catAlertCount} หมวดหมู่ใกล้หรือเกินงบที่ตั้งไว้`)}
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
        {/* Top bar: date + year in review (language & text size now live in Settings) */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <p style={{ ...T.muted, margin: 0, fontWeight: 500, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: FONT_FAMILY }}>
              {new Date().toLocaleDateString(language === "TH" ? "th-TH" : "en-US", { month: "long", year: "numeric" })}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { setYearlyYear(new Date().getFullYear()); setShowYearlySummary(true); }} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "var(--text)", border: "none", cursor: "pointer",
            padding: "7px 14px", borderRadius: 99, fontFamily: FONT_FAMILY,
            fontSize: 12, fontWeight: 600, color: "var(--on-inverse)",
            boxShadow: "0 2px 12px rgba(15,23,42,0.22)",
          }}>
            <Sparkles size={12} /> {t.inReview(new Date().getFullYear())}
          </button>
          </div>
        </div>

        <p style={{ ...T.muted, margin: "0 0 8px", fontSize: 13, fontFamily: FONT_FAMILY, fontWeight: 400 }}>{t.totalSpent}</p>
        <span style={{ ...T.h1 }}>{fmt(monthlyTotal)}</span>

        {monthIncomeTotal > 0 && (
          <div style={{ marginTop: 16, ...T.card, padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: FONT_FAMILY }}>{t.availableToSpend}</span>
              {availableToSpend < 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: "#EF4444", fontFamily: FONT_FAMILY }}>
                  <AlertTriangle size={12} /> {t.overspent}
                </span>
              )}
            </div>
            <span style={{ fontFamily: MONO_FAMILY, fontSize: 30, fontWeight: 700, letterSpacing: "-1px", color: availableToSpend >= 0 ? "#15803D" : "#EF4444" }}>
              {availableToSpend < 0 && "−"}{fmt(Math.abs(availableToSpend))}
            </span>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <span style={{ ...T.muted, fontSize: 12, fontFamily: FONT_FAMILY }}>+{fmt(monthIncomeTotal)} {t.income}</span>
              <span style={{ ...T.muted, fontSize: 12, fontFamily: FONT_FAMILY }}>−{fmt(monthlyTotal)} {t.spent}</span>
            </div>
          </div>
        )}

        {topCat && !totalBudget && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12, padding: "5px 12px", background: "var(--surface)", borderRadius: 99, boxShadow: "0 2px 8px rgba(15,23,42,0.07)" }}>
            <span style={{ fontSize: 14 }}>{getCat(topCat[0], language).icon}</span>
            <span style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 400, fontFamily: FONT_FAMILY }}>{t.top}: <span style={{ color: "var(--text)", fontWeight: 600 }}>{getCat(topCat[0], language).label}</span></span>
          </div>
        )}

        {totalBudget > 0 && (
          <div style={{ marginTop: 16, ...T.card, padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: FONT_FAMILY }}>{t.monthlyBudget}</span>
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
            else { setError(""); setFormPrefilledMonth(null); setEditingTx(null); setShowQuickAdd(true); }
          }} style={{
            width: "100%", padding: "15px", borderRadius: 20, border: "none",
            background: showForm ? "var(--border)" : T.indigo, color: showForm ? "var(--text-2)" : "var(--surface)",
            fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: FONT_FAMILY,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 14,
            boxShadow: showForm ? "none" : "0 6px 24px rgba(79,70,229,0.28)", transition: "all 0.22s"
          }}>
            <PlusCircle size={18} />
            {showForm ? t.cancel : t.addTransaction}
          </button>

          {/* Scan receipt (OCR) */}
          {!showForm && (
            <>
              <input ref={scanInputRef} type="file" accept="image/*" multiple hidden
                onChange={(e) => { const files = Array.from(e.target.files || []); e.target.value = ""; handleUploadFiles(files); }} />
              <button onClick={() => scanInputRef.current?.click()} disabled={scanProgress !== null} style={{
                width: "100%", padding: "13px", borderRadius: 20, border: "1.5px solid var(--border)",
                background: "var(--surface)", color: T.indigo, fontSize: 14, fontWeight: 600,
                cursor: scanProgress !== null ? "default" : "pointer", fontFamily: FONT_FAMILY,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 14,
              }}>
                🖼️ {tr("Upload slips", "อัปโหลดสลิป")}
              </button>
            </>
          )}

          {/* Waiting to be categorized */}
          {!showForm && pendingTxns.length > 0 && (
            <CardWrap style={{ marginBottom: 14, background: "#FFFBEB", border: "1.5px solid #FDE68A" }}>
              <p style={{ ...T.label, margin: "0 0 10px", color: "#92400E", fontFamily: FONT_FAMILY }}>
                🗂️ {tr("Waiting to categorize", "รอจัดหมวดหมู่")} · {pendingTxns.length}
              </p>
              {pendingTxns.map((tx) => (
                <div key={tx.id} style={{ background: "var(--surface)", borderRadius: 16, padding: "12px 14px", marginBottom: 8, border: "1px solid #FDE68A" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-3)", fontFamily: MONO_FAMILY }}>฿</span>
                    <input type="text" inputMode="decimal" value={tx.amount || ""} placeholder="0"
                      onChange={(e) => { const v = parseFloat(e.target.value.replace(/,/g, "")) || 0; setTransactions((p) => p.map((x) => x.id === tx.id ? { ...x, amount: v, originalAmount: v } : x)); }}
                      style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 22, fontWeight: 700, color: "var(--text)", fontFamily: MONO_FAMILY, width: "100%" }} />
                    <button onClick={() => handleDelete(tx.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#CBD5E1", padding: 4 }}><Trash2 size={15} /></button>
                  </div>
                  <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
                    {CATEGORIES.map((c) => (
                      <button key={c.value} onClick={() => { if ((tx.amount || 0) > 0) categorizePending(tx.id, c.value); else showToast(tr("Enter an amount first", "กรอกจำนวนเงินก่อน")); }}
                        style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 99, border: "1.5px solid var(--border)", background: "var(--on-inverse)", color: "var(--text-2)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT_FAMILY }}>
                        <span style={{ fontSize: 15 }}>{c.icon}</span>{c.labelShort}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </CardWrap>
          )}

          {showForm && !formPrefilledMonth && (
            <CardWrap style={{ marginBottom: 14 }}>
              <p style={{ ...T.h2, margin: "0 0 16px", fontFamily: FONT_FAMILY }}>{editingTx ? "✏️ Edit Transaction" : t.newTransaction}</p>

              {/* Income / Expense toggle */}
              <div style={{ display: "flex", gap: 0, marginBottom: 20, background: "var(--fill)", borderRadius: 14, padding: 4 }}>
                {[{ key: "expense", label: "💸 Expense" }, { key: "income", label: "💰 Income" }].map(({ key, label }) => {
                  const active = formTxType === key;
                  return (
                    <button key={key} onClick={() => {
                      setFormTxType(key);
                      lsSet("ft_last_type", key);
                      setForm((f) => ({ ...f, category: key === "income" ? "Salary" : "Food", split: false, reimbursed: "" }));
                    }} style={{ flex: 1, padding: "10px 8px", borderRadius: 11, border: "none", cursor: "pointer", fontFamily: FONT_FAMILY, fontSize: 13, fontWeight: 600, background: active ? "var(--surface)" : "transparent", color: active ? (key === "income" ? "#15803D" : T.indigo) : "var(--text-3)", boxShadow: active ? "0 1px 6px rgba(15,23,42,0.10)" : "none", transition: "all 0.18s" }}>
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
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderRadius: 16, background: form.split ? "var(--primary-tint)" : "var(--bg)", border: `1.5px solid ${form.split ? "#C7D2FE" : "var(--border)"}`, marginBottom: 14, cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 11, background: form.split ? "var(--primary-tint)" : "var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Scissors size={15} color={form.split ? T.indigo : "var(--text-3)"} />
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text)", fontFamily: FONT_FAMILY }}>{t.splitBill}</p>
                        <p style={{ margin: 0, fontSize: 12, color: "var(--text-3)", fontFamily: FONT_FAMILY, lineHeight: 1.6 }}>{t.splitSub}</p>
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
                    <button key={cat.value} onClick={() => setForm({ ...form, category: cat.value })} style={{ padding: "11px 6px", borderRadius: 16, cursor: "pointer", fontFamily: FONT_FAMILY, border: `2px solid ${active ? cat.bar : "transparent"}`, background: active ? cat.pastelBg : "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, transition: "all 0.15s" }}>
                      <span style={{ fontSize: 21 }}>{cat.icon}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: active ? cat.pastelText : "var(--text-3)", fontFamily: FONT_FAMILY, lineHeight: 1.5 }}>{cat.labelShort}</span>
                    </button>
                  );
                })}
              </div>

              <p style={{ ...T.label, margin: "0 0 8px", fontFamily: FONT_FAMILY }}>{t.noteTags}</p>
              <input type="text" placeholder={t.notePlaceholder} value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                style={{ ...T.input, marginBottom: 8 }} />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14, minHeight: 0 }}>
                {extractTags(form.note).map((tag) => <span key={tag} style={{ background: "var(--primary-tint)", color: T.indigo, fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 99, fontFamily: FONT_FAMILY }}>{tag}</span>)}
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
            <button onClick={() => { setShowSearch((s) => !s); setSearchQuery(""); }} style={{ background: showSearch ? T.indigoLight : "none", border: "none", cursor: "pointer", padding: "5px 10px", borderRadius: 99, color: showSearch ? T.indigo : "var(--text-3)", fontSize: 12, fontWeight: 600, fontFamily: FONT_FAMILY, display: "flex", alignItems: "center", gap: 4 }}>
              🔍 {showSearch ? tr("Clear", "ล้าง") : tr("Search", "ค้นหา")}
            </button>
          </div>
          {showSearch && (
            <input autoFocus type="text" placeholder={tr("Search by note, category, tag, amount…", "ค้นหาด้วยโน้ต หมวดหมู่ แท็ก จำนวนเงิน…")} value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ ...T.input, marginBottom: 12, fontSize: 13 }} />
          )}
          {monthTxns.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 20px" }}>
              <div style={{ width: 60, height: 60, borderRadius: 22, background: "var(--border)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}><Wallet size={26} color="var(--text-3)" /></div>
              <p style={{ ...T.muted, margin: "0 0 6px", fontWeight: 600, fontSize: 15, color: "var(--text-2)", fontFamily: FONT_FAMILY }}>{t.noTransYet}</p>
              <p style={{ ...T.muted, margin: 0, fontWeight: 400, fontFamily: FONT_FAMILY }}>{t.tapToAdd}</p>
            </div>
          ) : searchFiltered([...monthTxns].sort((a, b) => new Date(b.date) - new Date(a.date))).length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 20px" }}>
              <p style={{ ...T.muted, margin: 0, fontFamily: FONT_FAMILY }}>{tr(`No results for "${searchQuery}"`, `ไม่พบผลลัพธ์สำหรับ "${searchQuery}"`)}</p>
            </div>
          ) : (() => {
            // Group this month's (filtered) transactions by category — collapsible sections.
            const filtered = searchFiltered([...monthTxns]);
            const searching = !!searchQuery.trim();
            const groups = {};
            filtered.forEach((tx) => { (groups[tx.category] = groups[tx.category] || []).push(tx); });
            const entries = Object.entries(groups).map(([catVal, txs]) => {
              const isIncome = !!getIncomeCategory(catVal, language);
              const c = isIncome ? getIncomeCategory(catVal, language) : getCat(catVal, language);
              txs.sort((a, b) => new Date(b.date) - new Date(a.date));
              return { catVal, c, isIncome, txs, total: txs.reduce((s, x) => s + x.amount, 0) };
            }).sort((a, b) => b.total - a.total);

            return entries.map(({ catVal, c, isIncome, txs, total }) => {
              const open = searching || !!expandedHomeCats[catVal];
              return (
                <div key={catVal} style={{ ...T.card, padding: 0, marginBottom: 9, overflow: "hidden" }}>
                  {/* Category header */}
                  <button onClick={() => setExpandedHomeCats((p) => ({ ...p, [catVal]: !p[catVal] }))}
                    style={{ width: "100%", border: "none", background: open ? c.pastelBg : "var(--surface)", cursor: "pointer", fontFamily: FONT_FAMILY, padding: "13px 16px", display: "flex", alignItems: "center", gap: 12, textAlign: "left", transition: "background 0.18s" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 13, background: open ? "var(--surface)" : c.pastelBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, flexShrink: 0 }}>{c.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: open ? c.pastelText : "var(--text)", fontFamily: FONT_FAMILY }}>{c.label}</span>
                      <p style={{ ...T.muted, margin: "1px 0 0", fontSize: 11, fontFamily: FONT_FAMILY }}>{txs.length} {t.transactions}</p>
                    </div>
                    <span style={{ fontFamily: MONO_FAMILY, fontSize: 15, fontWeight: 700, color: isIncome ? "#15803D" : "#EF4444", flexShrink: 0 }}>{isIncome ? "+" : "−"}{fmt(total)}</span>
                    <ChevronDown size={16} color={open ? c.pastelText : "#CBD5E1"} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
                  </button>
                  {/* Transactions */}
                  {open && txs.map((tx) => {
                    const isDeleting = deletingId === tx.id;
                    const tags = extractTags(tx.note);
                    return (
                      <div key={tx.id} style={{ padding: "12px 16px", borderTop: "1px solid var(--fill)", display: "flex", alignItems: "center", gap: 12, opacity: isDeleting ? 0 : 1, transform: isDeleting ? "translateX(50px)" : "none", transition: "all 0.28s" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", fontFamily: FONT_FAMILY }}>{tx.note || c.label}</span>
                            {!isIncome && tx.split && <span style={{ fontSize: 10, fontWeight: 600, background: "var(--primary-tint)", color: T.indigo, padding: "1px 6px", borderRadius: 5, fontFamily: FONT_FAMILY }}>{t.split}</span>}
                            {tx.recurringId && <span style={{ fontSize: 10, fontWeight: 600, background: "#FEFCE8", color: "#A16207", padding: "1px 6px", borderRadius: 5, fontFamily: FONT_FAMILY }}>{t.auto}</span>}
                          </div>
                          <p style={{ ...T.muted, margin: "2px 0 0", fontSize: 11, fontFamily: FONT_FAMILY }}>{fmtDate(tx.date)}{tags.length > 0 ? " · " + tags.join(" ") : ""}</p>
                        </div>
                        <span style={{ fontFamily: MONO_FAMILY, fontSize: 14, fontWeight: 600, color: isIncome ? "#15803D" : "#EF4444", flexShrink: 0 }}>{isIncome ? "+" : "−"}{fmt(tx.amount)}</span>
                        <button onClick={() => { openEditForm(tx); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#CBD5E1", flexShrink: 0 }}><Pencil size={13} /></button>
                        <button onClick={() => handleDelete(tx.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#CBD5E1", flexShrink: 0 }}><Trash2 size={13} /></button>
                      </div>
                    );
                  })}
                  {/* Quick add into this category */}
                  {open && (
                    <button onClick={() => openAddForm(catVal, isIncome ? "income" : "expense")} style={{ width: "100%", border: "none", borderTop: "1px dashed var(--border)", background: "var(--surface)", cursor: "pointer", fontFamily: FONT_FAMILY, padding: "11px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: c.pastelText, fontSize: 12, fontWeight: 600 }}>
                      <Plus size={13} /> Add to {c.label}
                    </button>
                  )}
                </div>
              );
            });
          })()}
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
            const isActive = analyticsCat === cat.value;
            const canDrill = amt > 0;
            const pctTotal = monthlyTotal > 0 ? (amt / monthlyTotal * 100) : 0;
            const pctBudget = catBudget > 0 ? (amt / catBudget * 100) : null;
            const drillTxns = isActive ? monthTxns.filter((tx) => tx.type !== "income" && tx.category === cat.value).sort((a, b) => new Date(b.date) - new Date(a.date)) : [];
            return (
              <Fragment key={cat.value}>
              <button onClick={() => canDrill && setAnalyticsCat(isActive ? null : cat.value)}
                style={{ width: "100%", textAlign: "left", border: isActive ? `2px solid ${cat.bar}` : "2px solid transparent", ...T.card, padding: "16px 18px", marginBottom: isActive ? 0 : 9, borderBottomLeftRadius: isActive ? 0 : 24, borderBottomRightRadius: isActive ? 0 : 24, cursor: canDrill ? "pointer" : "default", fontFamily: FONT_FAMILY, background: isActive ? cat.pastelBg : "var(--surface)", transition: "all 0.18s" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 13, background: isActive ? "var(--surface)" : cat.pastelBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{cat.icon}</div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: isActive ? cat.pastelText : "var(--text)", fontFamily: FONT_FAMILY }}>{cat.label}</span>
                    {canDrill && <ChevronRight size={13} color={isActive ? cat.pastelText : "#CBD5E1"} style={{ transform: isActive ? "rotate(90deg)" : "none", transition: "transform 0.18s" }} />}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontFamily: MONO_FAMILY, fontSize: 15, fontWeight: 600, color: cbc ? cbc.text : (isActive ? cat.pastelText : "var(--text)") }}>{fmt(amt)}</span>
                    {catBudget > 0 && <span style={{ ...T.muted, fontSize: 11, display: "block", fontFamily: MONO_FAMILY }}>/ {fmt(catBudget)}</span>}
                  </div>
                </div>
                <div style={{ height: 6, background: cbc ? cbc.track : (isActive ? "var(--surface)" : "var(--fill)"), borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min((cbc ? catPct : pct)*100,100)}%`, background: cbc ? cbc.bar : cat.bar, borderRadius: 99, transition: "width 0.5s" }} />
                </div>
                {catBudget > 0 && catPct >= 0.75 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8 }}>
                    <AlertTriangle size={12} color={cbc.text} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: cbc.text, fontFamily: FONT_FAMILY }}>{catPct >= 0.95 ? t.overLimit : t.nearLimit}</span>
                  </div>
                )}
              </button>

              {/* Inline drill-down, directly under the tapped category */}
              {isActive && (
                <div style={{ ...T.card, padding: "16px 18px 18px", marginBottom: 9, borderRadius: 0, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, border: `2px solid ${cat.bar}`, borderTop: "none", background: "var(--surface)", animation: "spSlideUp 0.22s ease" }}>
                  {/* Breakdown stats */}
                  <div style={{ display: "grid", gridTemplateColumns: pctBudget !== null ? "1fr 1fr 1fr" : "1fr 1fr", gap: 8, marginBottom: 14 }}>
                    {[
                      { l: t.spent, v: fmt(amt) },
                      { l: "% of total", v: `${pctTotal.toFixed(0)}%` },
                      ...(pctBudget !== null ? [{ l: "% of budget", v: `${pctBudget.toFixed(0)}%` }] : []),
                    ].map((s) => (
                      <div key={s.l} style={{ background: cat.pastelBg, borderRadius: 14, padding: "10px 12px" }}>
                        <p style={{ margin: "0 0 3px", fontSize: 9, fontWeight: 600, color: cat.pastelText, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: FONT_FAMILY }}>{s.l}</p>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: cat.pastelText, fontFamily: MONO_FAMILY }}>{s.v}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <p style={{ ...T.label, margin: 0, fontSize: 11, fontFamily: FONT_FAMILY }}>{drillTxns.length} {t.transactions}</p>
                    <button onClick={() => setAnalyticsCat(null)} style={{ display: "flex", alignItems: "center", gap: 5, background: "var(--fill)", border: "none", cursor: "pointer", padding: "5px 12px", borderRadius: 99, fontFamily: FONT_FAMILY, fontSize: 11, fontWeight: 600, color: "var(--text-2)" }}><X size={11} /> {t.showAll}</button>
                  </div>
                  {drillTxns.map((tx) => {
                    const tags = extractTags(tx.note);
                    return (
                      <div key={tx.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 0", borderTop: "1px solid var(--fill)" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", fontFamily: FONT_FAMILY }}>{tx.note || cat.label}</span>
                          <p style={{ ...T.muted, margin: "2px 0 0", fontSize: 11, fontFamily: FONT_FAMILY }}>{fmtDate(tx.date)}{tags.length > 0 ? " · " + tags.join(" ") : ""}</p>
                        </div>
                        <span style={{ fontFamily: MONO_FAMILY, fontSize: 14, fontWeight: 600, color: "#EF4444", flexShrink: 0 }}>−{fmt(tx.amount)}</span>
                        <button onClick={() => openEditForm(tx)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#CBD5E1", flexShrink: 0 }}><Pencil size={13} /></button>
                        <button onClick={() => handleDelete(tx.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#CBD5E1", flexShrink: 0 }}><Trash2 size={13} /></button>
                      </div>
                    );
                  })}
                  <button onClick={() => openAddForm(cat.value, "expense")} style={{ width: "100%", border: "none", borderTop: "1px dashed var(--border)", marginTop: 4, background: "transparent", cursor: "pointer", fontFamily: FONT_FAMILY, padding: "12px 0 2px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: cat.pastelText, fontSize: 13, fontWeight: 700 }}>
                    <Plus size={14} /> Add to {cat.label}
                  </button>
                </div>
              )}
              </Fragment>
            );
          })}
          {topTags.length > 0 && (
            <>
              <SectionLabel style={{ marginTop: 8 }}>{t.topTagsMonth}</SectionLabel>
              {topTags.map(([tag, amt]) => (
                <div key={tag} style={{ ...T.card, padding: "13px 18px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.indigo, minWidth: 90, fontFamily: FONT_FAMILY }}>{tag}</span>
                  <div style={{ flex: 1, height: 5, background: "var(--primary-tint)", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(amt / maxTagAmt)*100}%`, background: T.indigo, borderRadius: 99 }} />
                  </div>
                  <span style={{ fontFamily: MONO_FAMILY, fontSize: 13, fontWeight: 600, color: "var(--text)", minWidth: 72, textAlign: "right" }}>{fmt(amt)}</span>
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
                      <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 500, fill: "var(--text-3)", fontFamily: FONT_FAMILY }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip formatter={(val, name) => [fmt(val), name === "expense" ? "Expenses" : "Income"]} contentStyle={{ fontFamily: FONT_FAMILY, fontSize: 12, borderRadius: 10, border: "none", boxShadow: "0 4px 16px rgba(15,23,42,0.12)" }} />
                      <Bar dataKey="expense" fill="#FCA5A5" radius={[4,4,2,2]} />
                      <Bar dataKey="income"  fill="#86EFAC" radius={[4,4,2,2]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 10, height: 10, borderRadius: 3, background: "#FCA5A5" }} /><span style={{ fontSize: 11, color: "var(--text-2)", fontFamily: FONT_FAMILY }}>{tr("Expenses", "รายจ่าย")}</span></div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 10, height: 10, borderRadius: 3, background: "#86EFAC" }} /><span style={{ fontSize: 11, color: "var(--text-2)", fontFamily: FONT_FAMILY }}>{tr("Income", "รายรับ")}</span></div>
                  </div>
                </div>
              </>
            );
          })()}

          {monthTxns.length === 0 && (
            <div style={{ textAlign: "center", padding: "56px 20px" }}>
              <div style={{ width: 64, height: 64, borderRadius: 22, background: "linear-gradient(135deg, var(--primary-tint) 0%, #E0E7FF 100%)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}><BarChart2 size={28} color={T.indigo} /></div>
              <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 600, color: "var(--text)", fontFamily: FONT_FAMILY }}>{tr("No data yet", "ยังไม่มีข้อมูล")}</p>
              <p style={{ ...T.muted, margin: 0, fontWeight: 400, fontFamily: FONT_FAMILY }}>{t.addToSeeAnalytics}</p>
            </div>
          )}
        </div>
      )}

      {/* ══ GROUPS (SplitPro) ══ */}
      {tab === "groups" && (
        <div style={{ padding: "0" }}>
          <GroupsTab profile={profile} onLinkUpsert={linkUpsertTx} onLinkDelete={linkDeleteTx} language={language} />
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
            <div style={{ position: "fixed", inset: 0, zIndex: 150, background: "var(--bg)", overflowY: "auto", fontFamily: FONT_FAMILY }}>
              <div style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(248,247,244,0.94)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(226,232,240,0.6)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 10 }}>
                <button onClick={() => { setOpenMonth(null); setStmtCat(null); }} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--surface)", border: "none", cursor: "pointer", padding: "8px 16px", borderRadius: 99, fontFamily: FONT_FAMILY, fontSize: 13, fontWeight: 600, color: "var(--text)", boxShadow: "0 2px 8px rgba(15,23,42,0.08)", flexShrink: 0 }}>
                  <ArrowLeft size={14} /> {stmtYear}
                </button>
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                  <button onClick={() => { setStmtCat(null); if (prevKey) setOpenMonth(prevKey); }} disabled={!prevKey} style={{ width: 34, height: 34, borderRadius: 99, border: "none", display: "flex", alignItems: "center", justifyContent: "center", background: prevKey ? "var(--surface)" : "var(--fill)", color: prevKey ? "var(--text)" : "#CBD5E1", cursor: prevKey ? "pointer" : "default", boxShadow: prevKey ? "0 2px 8px rgba(15,23,42,0.08)" : "none" }}><ChevronLeft size={16} /></button>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", minWidth: 110, textAlign: "center", fontFamily: FONT_FAMILY }}>{mName}</span>
                  <button onClick={() => { setStmtCat(null); if (nextKey) setOpenMonth(nextKey); }} disabled={!nextKey} style={{ width: 34, height: 34, borderRadius: 99, border: "none", display: "flex", alignItems: "center", justifyContent: "center", background: nextKey ? "var(--surface)" : "var(--fill)", color: nextKey ? "var(--text)" : "#CBD5E1", cursor: nextKey ? "pointer" : "default", boxShadow: nextKey ? "0 2px 8px rgba(15,23,42,0.08)" : "none" }}><ChevronRight size={16} /></button>
                </div>
                <div style={{ width: 80, flexShrink: 0 }} />
              </div>
              <div style={{ maxWidth: 430, margin: "0 auto", padding: "0 16px 100px" }}>
                <div style={{ padding: "26px 4px 16px" }}>
                  <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: FONT_FAMILY }}>{t.totalSpentLabel}</p>
                  <p style={{ margin: 0, fontSize: 40, fontWeight: 600, letterSpacing: "-1.5px", color: mTotal > 0 ? "#EF4444" : "var(--text)", lineHeight: 1.1, fontFamily: MONO_FAMILY }}>{mTotal > 0 ? `−${fmt(mTotal)}` : fmt(mTotal)}</p>
                  {mIncomeTotal > 0 && (
                    <p style={{ margin: "4px 0 0", fontSize: 15, fontWeight: 600, color: "#15803D", fontFamily: MONO_FAMILY }}>+{fmt(mIncomeTotal)} income</p>
                  )}
                  {mIncomeTotal > 0 && (() => {
                    const mAvailable = mIncomeTotal - mTotal;
                    return (
                      <p style={{ margin: "6px 0 0", fontSize: 13, fontWeight: 600, color: mAvailable >= 0 ? "#15803D" : "#EF4444", fontFamily: FONT_FAMILY }}>
                        {t.availableToSpend}: <span style={{ fontFamily: MONO_FAMILY }}>{mAvailable < 0 && "−"}{fmt(Math.abs(mAvailable))}</span>
                      </p>
                    );
                  })()}
                  <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--text-3)", fontWeight: 400, fontFamily: FONT_FAMILY, lineHeight: 1.6 }}>{mTxns.length} {t.txIn(mName)}</p>
                </div>
                {mTxns.length === 0 ? (
                  <div style={{ ...T.card, padding: "48px 24px", textAlign: "center", marginTop: 8 }}>
                    <div style={{ width: 54, height: 54, borderRadius: 19, background: "var(--fill)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}><Wallet size={22} color="var(--text-3)" /></div>
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
                          <button key={catVal} onClick={() => setStmtCat(isActive ? null : catVal)} style={{ width: "100%", border: "none", fontFamily: FONT_FAMILY, cursor: "pointer", textAlign: "left", padding: "15px 18px", borderRadius: 20, background: isActive ? cat.pastelBg : "var(--surface)", outline: isActive ? `2px solid ${cat.bar}` : "2px solid transparent", boxShadow: isActive ? `0 6px 24px ${cat.bar}30` : "0 2px 12px rgba(15,23,42,0.06)", transition: "all 0.18s" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                              <div style={{ width: 40, height: 40, borderRadius: 13, flexShrink: 0, background: isActive ? "var(--surface)" : cat.pastelBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19 }}>{cat.icon}</div>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                                  <span style={{ fontSize: 14, fontWeight: 600, color: isActive ? cat.pastelText : "var(--text)", fontFamily: FONT_FAMILY }}>{cat.label}</span>
                                  <span style={{ fontFamily: MONO_FAMILY, fontSize: 15, fontWeight: 600, color: isActive ? cat.pastelText : "var(--text)" }}>{fmt(amt)}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                                  <span style={{ fontSize: 11, color: isActive ? cat.pastelText : "var(--text-3)", fontWeight: 400, fontFamily: FONT_FAMILY, lineHeight: 1.6 }}>{catCount} {t.transactions}</span>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: isActive ? cat.pastelText : "var(--text-3)", fontFamily: FONT_FAMILY }}>{(pct * 100).toFixed(0)}%</span>
                                </div>
                              </div>
                            </div>
                            <div style={{ height: 5, background: isActive ? `${cat.bar}30` : "var(--fill)", borderRadius: 99, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${pct * 100}%`, background: cat.bar, borderRadius: 99, transition: "width 0.45s cubic-bezier(0.34,1.56,0.64,1)" }} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, paddingLeft: 4 }}>
                      <p style={{ ...T.label, margin: 0, fontFamily: FONT_FAMILY }}>{stmtCat ? `${activeCat.icon} ${activeCat.label}` : t.allTransactions} · {visibleTxns.length}</p>
                      {stmtCat && (
                        <button onClick={() => setStmtCat(null)} style={{ display: "flex", alignItems: "center", gap: 5, background: "var(--fill)", border: "none", cursor: "pointer", padding: "5px 12px", borderRadius: 99, fontFamily: FONT_FAMILY, fontSize: 11, fontWeight: 600, color: "var(--text-2)" }}>
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
                              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", fontFamily: FONT_FAMILY }}>{tx.note || cat.label}</span>
                              {isIncome && <span style={{ fontSize: 10, fontWeight: 600, background: "#F0FDF4", color: "#15803D", padding: "1px 6px", borderRadius: 5, fontFamily: FONT_FAMILY }}>{tr("income", "รายรับ")}</span>}
                              {!isIncome && tx.split && <span style={{ fontSize: 10, fontWeight: 600, background: "var(--primary-tint)", color: T.indigo, padding: "1px 6px", borderRadius: 5, fontFamily: FONT_FAMILY }}>{t.split}</span>}
                              {tx.recurringId && <span style={{ fontSize: 10, fontWeight: 600, background: "#FEFCE8", color: "#A16207", padding: "1px 6px", borderRadius: 5, fontFamily: FONT_FAMILY }}>{t.auto}</span>}
                            </div>
                            <p style={{ ...T.muted, margin: "2px 0 0", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: FONT_FAMILY }}>{cat.label} · {fmtDate(tx.date)}</p>
                            {tags.length > 0 && <div style={{ display: "flex", gap: 3, marginTop: 4, flexWrap: "wrap" }}>{tags.map((tag) => <span key={tag} style={{ fontSize: 10, fontWeight: 600, background: "var(--primary-tint)", color: "#6366F1", padding: "1px 7px", borderRadius: 99, fontFamily: FONT_FAMILY }}>{tag}</span>)}</div>}
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
                  <button key={y} onClick={() => { setStmtYear(parseInt(y)); setOpenMonth(null); }} style={{ padding: "6px 14px", borderRadius: 99, border: "none", cursor: "pointer", fontFamily: FONT_FAMILY, fontSize: 13, fontWeight: 600, background: stmtYear === parseInt(y) ? T.indigo : "var(--surface)", color: stmtYear === parseInt(y) ? "var(--surface)" : "var(--text-2)", boxShadow: stmtYear === parseInt(y) ? "0 2px 10px rgba(79,70,229,0.3)" : "0 1px 4px rgba(15,23,42,0.06)" }}>{y}</button>
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
                        <div style={{ width: "100%", height: `${Math.max(heightPct * 100, total > 0 ? 8 : 3)}%`, minHeight: total > 0 ? 5 : 2, borderRadius: "5px 5px 2px 2px", background: isNow ? "#818CF8" : total > 0 ? "#C7D2FE" : "var(--fill)", transition: "all 0.3s" }} />
                      </div>
                      <span style={{ fontSize: 8, fontWeight: isNow ? 700 : 400, color: isNow ? "var(--primary)" : "var(--text-3)", textAlign: "center", fontFamily: FONT_FAMILY }}>{name}</span>
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
                        <span style={{ fontSize: 15, fontWeight: 600, color: isNow ? T.indigo : "var(--text)", fontFamily: FONT_FAMILY }}>{name}</span>
                        {isNow && <span style={{ fontSize: 9, fontWeight: 600, background: T.indigoLight, color: T.indigo, padding: "2px 7px", borderRadius: 99, marginLeft: 6, fontFamily: FONT_FAMILY }}>{t.now}</span>}
                      </div>
                      <ChevronRight size={13} color={hasData ? "var(--text-3)" : "#CBD5E1"} />
                    </div>
                    <p style={{ fontFamily: MONO_FAMILY, fontSize: 15, fontWeight: 600, color: total > 0 ? "#EF4444" : (hasData ? "var(--text)" : "#CBD5E1"), margin: "0 0 3px" }}>
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
                        <span style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 400, fontFamily: FONT_FAMILY }}>{txns.length} tx</span>
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
          {/* Profile — your identity in Groups */}
          <CardWrap>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Settings size={16} color={T.indigo} />
              <p style={{ ...T.h2, margin: 0, fontFamily: FONT_FAMILY }}>{tr("Profile", "โปรไฟล์")}</p>
            </div>
            <p style={{ ...T.muted, margin: "0 0 12px", fontSize: 12, fontFamily: FONT_FAMILY }}>{tr("Your name shown as “You” across Groups.", "ชื่อของคุณจะแสดงเป็น “คุณ” ในกลุ่ม")}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: "#6C63FF", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 15, fontFamily: FONT_FAMILY, flexShrink: 0 }}>{(profile.initials || "YO").toUpperCase().slice(0, 2)}</div>
              <input value={profile.name} placeholder={tr("Your name", "ชื่อของคุณ")}
                onChange={(e) => { const name = e.target.value; setProfile({ name, initials: (name.trim() || "You").slice(0, 2).toUpperCase() }); }}
                style={{ ...T.input, flex: 1 }} />
            </div>
          </CardWrap>
          {/* Appearance & Language */}
          <CardWrap>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Settings size={16} color={T.indigo} />
              <p style={{ ...T.h2, margin: 0, fontFamily: FONT_FAMILY }}>{tr("Appearance & Language", "การแสดงผลและภาษา")}</p>
            </div>
            {/* Language row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: T.indigoLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Globe size={17} color={T.indigo} /></div>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text)", fontFamily: FONT_FAMILY }}>{tr("Language", "ภาษา")}</p>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--text-3)", fontFamily: FONT_FAMILY }}>{language === "EN" ? "English" : "ภาษาไทย"}</p>
                </div>
              </div>
              <LangToggle language={language} setLanguage={setLanguage} />
            </div>
            {/* Text size row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid var(--fill)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: T.indigoLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Type size={17} color={T.indigo} /></div>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text)", fontFamily: FONT_FAMILY }}>{tr("Text Size", "ขนาดตัวอักษร")}</p>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--text-3)", fontFamily: FONT_FAMILY }}>{Math.round(textScale * 100)}{tr("% of standard", "% ของมาตรฐาน")}</p>
                </div>
              </div>
              <button onClick={() => setShowTextSizer(true)} style={{ display: "flex", alignItems: "center", gap: 5, background: "var(--surface)", border: "1.5px solid var(--border)", cursor: "pointer", padding: "8px 14px", borderRadius: 99, fontFamily: FONT_FAMILY, fontSize: 12, fontWeight: 600, color: "var(--text-2)", boxShadow: "0 1px 4px rgba(15,23,42,0.07)" }}>
                <Type size={13} color={T.indigo} /> {tr("Adjust", "ปรับ")}
              </button>
            </div>
            {/* Dark mode row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid var(--fill)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: T.indigoLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 17 }}>{dark ? "🌙" : "☀️"}</div>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text)", fontFamily: FONT_FAMILY }}>{tr("Dark Mode", "โหมดมืด")}</p>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--text-3)", fontFamily: FONT_FAMILY }}>{dark ? tr("On", "เปิด") : tr("Off", "ปิด")}</p>
                </div>
              </div>
              <button onClick={() => setDark((d) => !d)} aria-label="Toggle dark mode" style={{ width: 52, height: 30, borderRadius: 99, border: "none", cursor: "pointer", background: dark ? T.indigo : "var(--border)", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                <span style={{ position: "absolute", top: 3, left: dark ? 25 : 3, width: 24, height: 24, borderRadius: "50%", background: "var(--surface)", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
              </button>
            </div>
          </CardWrap>

          {/* Manage Categories */}
          <CardWrap>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <BookOpen size={16} color={T.indigo} />
              <p style={{ ...T.h2, margin: 0, fontFamily: FONT_FAMILY }}>{tr("Categories", "หมวดหมู่")}</p>
            </div>
            <p style={{ ...T.muted, margin: "0 0 14px", fontSize: 12, fontFamily: FONT_FAMILY }}>{tr("Add, rename, recolor or remove categories. Changes apply everywhere instantly.", "เพิ่ม เปลี่ยนชื่อ เปลี่ยนสี หรือลบหมวดหมู่ การเปลี่ยนแปลงจะมีผลทุกที่ทันที")}</p>
            {[{ type: "expense", list: CATEGORIES, label: tr("Expense", "รายจ่าย") }, { type: "income", list: INCOME_CATS, label: tr("Income", "รายรับ") }].map(({ type, list, label }) => (
              <div key={type} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: type === "income" ? "#15803D" : T.indigo, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: FONT_FAMILY }}>{label}</span>
                  <button onClick={() => setCatModal({ type, cat: null })} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 11px", borderRadius: 99, border: "none", cursor: "pointer", fontFamily: FONT_FAMILY, fontWeight: 600, fontSize: 12, background: T.indigoLight, color: T.indigo }}><Plus size={12} /> {tr("Add", "เพิ่ม")}</button>
                </div>
                {list.map((cat) => (
                  <div key={cat.value} style={{ display: "flex", alignItems: "center", gap: 11, padding: "8px 0", borderTop: "1px solid var(--fill)" }}>
                    <div style={{ width: 34, height: 34, borderRadius: 11, background: cat.pastelBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{cat.icon}</div>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "var(--text)", fontFamily: FONT_FAMILY }}>{cat.label}</span>
                    <button onClick={() => setCatModal({ type, cat })} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: 6 }}><Pencil size={14} /></button>
                    <button onClick={() => { const count = countCatTxns(type, cat.value); if (count > 0) setCatDeleteTgt({ type, cat, count }); else deleteCategory(type, cat.value, "delete"); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#CBD5E1", padding: 6 }}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            ))}
          </CardWrap>

          <CardWrap>
            <p style={{ ...T.h2, margin: "0 0 16px", fontFamily: FONT_FAMILY }}>{t.budgetLimits}</p>
            <p style={{ ...T.label, margin: "0 0 8px", fontFamily: FONT_FAMILY }}>{t.monthlyTotalTHB}</p>
            <input type="text" inputMode="decimal" placeholder={tr("e.g. 30,000", "เช่น 30,000")} value={budgets.total}
              onChange={(e) => setBudgets({ ...budgets, total: e.target.value })}
              style={{ ...T.input, fontFamily: MONO_FAMILY, fontSize: 18, fontWeight: 600, marginBottom: 16 }} />
            <p style={{ ...T.label, margin: "0 0 10px", fontFamily: FONT_FAMILY }}>{t.perCatLimits}</p>
            {CATEGORIES.map((cat) => (
              <div key={cat.value} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 11 }}>
                <div style={{ width: 36, height: 36, borderRadius: 12, background: cat.pastelBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>{cat.icon}</div>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", minWidth: 80, fontFamily: FONT_FAMILY }}>{cat.labelShort}</span>
                <input type="text" inputMode="decimal" placeholder={t.noLimit} value={budgets.categories?.[cat.value] || ""}
                  onChange={(e) => setBudgets({ ...budgets, categories: { ...budgets.categories, [cat.value]: e.target.value } })}
                  style={{ ...T.input, flex: 1, fontFamily: MONO_FAMILY, fontSize: 14, padding: "9px 13px" }} />
              </div>
            ))}
          </CardWrap>

          {/* NEW: Export Data card */}
          <CardWrap>
            <p style={{ ...T.h2, margin: "0 0 4px", fontFamily: FONT_FAMILY }}>📤 {tr("Export Data", "ส่งออกข้อมูล")}</p>
            <p style={{ ...T.muted, margin: "0 0 14px", fontSize: 12, fontFamily: FONT_FAMILY }}>{tr(`Download all ${transactions.length} transactions as a CSV file`, `ดาวน์โหลดรายการทั้งหมด ${transactions.length} รายการเป็นไฟล์ CSV`)}</p>
            <button onClick={handleExportCSV} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 18px", borderRadius: 14, border: "none", background: "var(--text)", color: "var(--on-inverse)", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: FONT_FAMILY }}>
              <Download size={15} /> Export CSV
            </button>
          </CardWrap>
          <CardWrap>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <p style={{ ...T.h2, margin: 0, fontFamily: FONT_FAMILY }}>{t.subscriptions}</p>
              <button onClick={() => setShowSubForm(!showSubForm)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 99, border: "none", cursor: "pointer", fontFamily: FONT_FAMILY, fontWeight: 600, fontSize: 13, background: showSubForm ? "var(--fill)" : T.indigoLight, color: showSubForm ? "var(--text-2)" : T.indigo }}>
                {showSubForm ? <><X size={12} /> {t.cancel}</> : <><Plus size={12} /> {t.addSub}</>}
              </button>
            </div>
            {showSubForm && (
              <div style={{ padding: "16px", background: "var(--bg)", borderRadius: 18, marginBottom: 14 }}>
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
                <div key={sub.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "13px 0", borderTop: i === 0 ? "none" : "1px solid var(--fill)" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 13, background: cat.pastelBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>{cat.icon}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text)", fontFamily: FONT_FAMILY }}>{sub.name}</p>
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
          { id: "groups",    label: tr("Groups", "กลุ่ม"), Icon: Wallet },
          { id: "statement", label: t.statement, Icon: BookOpen },
          { id: "settings",  label: t.settings,  Icon: Settings },
        ].map(({ id, label, Icon }) => {
          const active = tab === id;
          const showBadge = id === "settings" && catAlertCount > 0;
          return (
            <button key={id} onClick={() => { setTab(id); setShowForm(false); }} style={{ flex: 1, padding: "10px 4px 15px", border: "none", background: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: active ? T.indigo : "var(--text-3)", fontFamily: FONT_FAMILY, transition: "color 0.18s" }}>
              <div style={{ width: 32, height: 32, borderRadius: 11, background: active ? T.indigoLight : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.18s", position: "relative" }}>
                <Icon size={17} />
                {showBadge && <div style={{ position: "absolute", top: 4, right: 4, width: 7, height: 7, borderRadius: "50%", background: "#EF4444", border: "1.5px solid var(--bg)" }} />}
              </div>
              <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, letterSpacing: "0.01em", fontFamily: FONT_FAMILY }}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
