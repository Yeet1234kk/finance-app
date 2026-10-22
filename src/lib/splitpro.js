// Shared-expense (Groups) data layer: local store, debt simplification, one-line parser, strings.

import { todayStr, lsGet, lsSet } from "./core";

export const _spTodayStr = todayStr; // local calendar day, not UTC
export const _spNowISO   = () => new Date().toISOString();
export const _spUid      = () => "x" + Math.random().toString(36).slice(2, 11);
export const _spFmt      = (n) => new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(Math.abs(n));
export const _spFmtDate  = (d, lang = "EN") => { const dt = new Date(d + "T00:00:00"); const today = new Date(); const diff = Math.round((today - dt) / 864e5); if (diff === 0) return lang === "TH" ? "วันนี้" : "Today"; if (diff === 1) return lang === "TH" ? "เมื่อวาน" : "Yesterday"; return dt.toLocaleDateString(lang === "TH" ? "th-TH" : "en-US", { month: "short", day: "numeric" }); };
export const _spFmtTime  = (iso) => new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

export const SPDB = {
  _store: null,
  init() {
    if (this._store) return this; // loaded once per page; writes go through save()
    const seed = this._seed();
    const raw = lsGet("splitpro_db", null);
    // Keep only well-formed tables so a damaged save can't crash the Groups tab.
    const ok = raw && typeof raw === "object" ? raw : {};
    const arr = (t, check) => (Array.isArray(ok[t]) ? ok[t].filter((r) => r && typeof r === "object" && typeof r.id === "string" && check(r)) : seed[t]);
    this._store = {
      groups: arr("groups", (g) => typeof g.name === "string" && Array.isArray(g.memberIds)),
      members: arr("members", (m) => typeof m.name === "string"),
      expenses: arr("expenses", (e) => typeof e.amount === "number" && Array.isArray(e.splits) && typeof e.date === "string"),
      settlements: arr("settlements", (x) => typeof x.amount === "number"),
      activity: arr("activity", (x) => typeof x.timestamp === "string"),
    };
    if (!this._store.members.some((m) => m.id === "u1")) this._store.members = [seed.members[0], ...this._store.members];
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
  save() { lsSet("splitpro_db", this._store); },
  get(table) { return this._store[table] || []; },
  insert(table, row) { this._store[table] = [...(this._store[table] || []), row]; this.save(); },
  update(table, id, patch) { this._store[table] = this._store[table].map(r => r.id === id ? { ...r, ...patch } : r); this.save(); },
  delete(table, id) { this._store[table] = this._store[table].filter(r => r.id !== id); this.save(); },
};

// ─── Debt simplification engine ──────────────────────────────────────────────
export function spSimplifyDebts(memberIds, expenses, settlements = []) {
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
export function spParseNL(text, members) {
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
export const SP_CATS = [
  { v: "Food",   l: "Food",    icon: "utensils", color: "#E07A3F" },
  { v: "Travel", l: "Travel",  icon: "train", color: "#3B82C4" },
  { v: "Stay",   l: "Stay",    icon: "bed", color: "#A5793D" },
  { v: "Fun",    l: "Fun",     icon: "party", color: "#8B6FD6" },
  { v: "Bills",  l: "Bills",   icon: "bolt", color: "#C9A227" },
  { v: "Shop",   l: "Shopping",icon: "bag", color: "#D0578F" },
  { v: "Other",  l: "Other",   icon: "box", color: "#7C8796" },
];
export const spGetCat = v => SP_CATS.find(c => c.v === v) || SP_CATS[SP_CATS.length - 1];

// Map a SplitPro category onto a main-app expense category so linked Home
// transactions land in a sensible bucket.
export const SP_TO_APP_CAT = { Food: "Food", Travel: "Transport", Stay: "Other", Fun: "Other", Bills: "Bills", Shop: "Shopping", Other: "Other" };
export const spToAppCat = v => SP_TO_APP_CAT[v] || "Other";

// ─── SplitPro i18n ───────────────────────────────────────────────────────────
export const SP_T = {
  EN: {
    noGroups: "No groups yet", noGroupsSub: "Create a group to start tracking shared expenses",
    noExpenses: "No expenses yet", noExpensesSub: "Add the first expense to get started",
    noData: "No data yet", noDataSub: "Add expenses to see analytics",
    noFriends: "No friends yet", noFriendsSub: "Add members to your groups to see them here",
    noActivity: "No activity yet", noActivitySub: "Your expense history will appear here",
    balanced: "Adds up", remaining: (v) => `Remaining: ${v}`,
    addExpense: "Add Expense", editExpense: "Edit Expense", quickAdd: "Type it in one line",
    quickAddPh: 'e.g. "Dinner ฿1200 with Aom"', parse: "Parse", whatFor: "What's this for?",
    group: "Group", date: "Date", category: "Category", paidBy: "Paid by", splitMethod: "Split method",
    mEqual: "Equal", mCustom: "Custom", mPercent: "%", mShares: "Shares",
    errDesc: "Enter a description", errAmount: "Enter a valid amount", errGroup: "Select a group",
    errMember: "Include at least one member", errSum: (a) => `Amounts must sum to ${a}`, errPct: "Percentages must sum to 100%",
    saveExpense: "Save Expense", updateExpense: "Update Expense",
    newGroup: "New Group", groupNamePh: "Group name…", color: "Color", members: "Members",
    addMember: "Add new member", createGroup: "Create Group",
    settleUp: "Settle Up", allClear: "You're all clear!", nothingSettle: "Nothing to settle in this group",
    pay: (n) => `Pay ${n}`, paying: (n) => `Paying ${n}`, amount: "Amount", full: "Full", markSettled: (a) => `Mark ${a} as paid`,
    paidWord: "paid", youPaid: "you paid", yourShareN: (a) => `your share ${a}`, notIncluded: "not included",
    splitDetails: "Split details", edit: "Edit", del: "Delete",
    tabExpenses: "Expenses", tabBalances: "Balances", tabAnalytics: "Analytics",
    membersExpenses: (m, e) => `${m} members · ${e} expenses`,
    stTotal: "Total", stYouPaid: "You paid", stYourShare: "Your share",
    addExpenseBtn: "Add expense", allSettled: "All settled up!", everyoneEven: "Everyone is even",
    memberBalances: "Member balances", spendByCat: "Spending by category", whoSpent: "Who spent what",
    confirmDelGroup: (n) => `Delete "${n}"? This removes its expenses and any linked transactions.`,
    settle: "Settle",
    navGroups: "Groups", navFriends: "People", navActivity: "Activity",
    netBalance: "Your net balance", othersOwe: "others owe you", youOweOthers: "you owe others",
    acrossGroups: (n) => `across ${n} groups`, newGroupBtn: "New group",
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
    balanced: "ยอดตรงแล้ว", remaining: (v) => `เหลือ: ${v}`,
    addExpense: "เพิ่มรายการ", editExpense: "แก้ไขรายการ", quickAdd: "พิมพ์บรรทัดเดียว",
    quickAddPh: 'เช่น "มื้อเย็น ฿1200 กับ อ้อม"', parse: "แยก", whatFor: "รายการนี้คืออะไร?",
    group: "กลุ่ม", date: "วันที่", category: "หมวดหมู่", paidBy: "ผู้จ่าย", splitMethod: "วิธีหาร",
    mEqual: "เท่ากัน", mCustom: "กำหนดเอง", mPercent: "%", mShares: "สัดส่วน",
    errDesc: "กรอกรายละเอียด", errAmount: "กรอกจำนวนเงินที่ถูกต้อง", errGroup: "เลือกกลุ่ม",
    errMember: "เลือกสมาชิกอย่างน้อยหนึ่งคน", errSum: (a) => `ยอดรวมต้องเท่ากับ ${a}`, errPct: "เปอร์เซ็นต์ต้องรวมได้ 100%",
    saveExpense: "บันทึกรายการ", updateExpense: "อัปเดตรายการ",
    newGroup: "กลุ่มใหม่", groupNamePh: "ชื่อกลุ่ม…", color: "สี", members: "สมาชิก",
    addMember: "เพิ่มสมาชิกใหม่", createGroup: "สร้างกลุ่ม",
    settleUp: "ชำระยอด", allClear: "คุณเคลียร์หมดแล้ว!", nothingSettle: "ไม่มียอดต้องชำระในกลุ่มนี้",
    pay: (n) => `จ่ายให้ ${n}`, paying: (n) => `กำลังจ่ายให้ ${n}`, amount: "จำนวน", full: "เต็มจำนวน", markSettled: (a) => `บันทึกว่าจ่าย ${a} แล้ว`,
    paidWord: "จ่าย", youPaid: "คุณจ่าย", yourShareN: (a) => `ส่วนของคุณ ${a}`, notIncluded: "ไม่ได้ร่วม",
    splitDetails: "รายละเอียดการหาร", edit: "แก้ไข", del: "ลบ",
    tabExpenses: "รายการ", tabBalances: "ยอดคงเหลือ", tabAnalytics: "สถิติ",
    membersExpenses: (m, e) => `${m} สมาชิก · ${e} รายการ`,
    stTotal: "ทั้งหมด", stYouPaid: "คุณจ่าย", stYourShare: "ส่วนของคุณ",
    addExpenseBtn: "เพิ่มรายการ", allSettled: "ชำระครบแล้ว!", everyoneEven: "ทุกคนเท่ากันแล้ว",
    memberBalances: "ยอดของสมาชิก", spendByCat: "ค่าใช้จ่ายตามหมวดหมู่", whoSpent: "ใครจ่ายเท่าไหร่",
    confirmDelGroup: (n) => `ลบ "${n}"? การกระทำนี้จะลบรายการและธุรกรรมที่เชื่อมโยงทั้งหมด`,
    settle: "ชำระ",
    navGroups: "กลุ่ม", navFriends: "เพื่อน", navActivity: "กิจกรรม",
    netBalance: "ยอดสุทธิของคุณ", othersOwe: "คนอื่นเป็นหนี้คุณ", youOweOthers: "คุณเป็นหนี้คนอื่น",
    acrossGroups: (n) => `จาก ${n} กลุ่ม`, newGroupBtn: "กลุ่มใหม่",
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
