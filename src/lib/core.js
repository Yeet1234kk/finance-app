// Shared helpers: ids, dates, money formatting and safe localStorage access.

export const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const pad = (n) => String(n).padStart(2, "0");
// Local-calendar date strings (toISOString would roll over to UTC "tomorrow" late at night).
export const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayStr = () => toDateStr(new Date());
export const currentMonth = () => todayStr().slice(0, 7);
export const monthKey = (y, m) => `${y}-${pad(m + 1)}`;
export const parseMonthKey = (key) => ({ y: +key.slice(0, 4), m: +key.slice(5, 7) - 1 });
export const shiftMonth = (key, k) => { const { y, m } = parseMonthKey(key); const d = new Date(y, m + k, 1); return monthKey(d.getFullYear(), d.getMonth()); };

export const fmt = (n) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(n || 0);
// Signed amount for lists: "−฿120" / "+฿5,000".
export const fmtSigned = (n, income) => `${income ? "+" : "−"}${fmt(Math.abs(n))}`;

const locale = (lang) => (lang === "TH" ? "th-TH" : "en-US");
export const monthName = (key, lang, style = "long") => {
  const { y, m } = parseMonthKey(key);
  return new Date(y, m, 1).toLocaleDateString(locale(lang), { month: style, year: "numeric" });
};
export const monthShort = (m, lang) => new Date(2000, m, 1).toLocaleDateString(locale(lang), { month: "short" });
export const dayLabel = (dateStr, lang) => {
  const t = todayStr();
  const y = toDateStr(new Date(Date.now() - 864e5));
  if (dateStr === t) return lang === "TH" ? "วันนี้" : "Today";
  if (dateStr === y) return lang === "TH" ? "เมื่อวาน" : "Yesterday";
  return new Date(dateStr + "T00:00:00").toLocaleDateString(locale(lang), { weekday: "short", month: "short", day: "numeric" });
};
export const shortDate = (dateStr, lang) =>
  new Date(dateStr + "T00:00:00").toLocaleDateString(locale(lang), { month: "short", day: "numeric" });

export const extractTags = (note) => ((note || "").match(/#\w+/g) || []).map((t) => t.toLowerCase());

// Budget tone for a spent/limit ratio: calm under 75%, warning to 100%, over after.
export const budgetTone = (pct) => (pct >= 1 ? "over" : pct >= 0.75 ? "warn" : "");

export const lsGet = (k, def) => {
  try {
    if (typeof window === "undefined") return def;
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : def;
  } catch {
    return def;
  }
};
// Writes report failure instead of swallowing it: a full or blocked storage would
// otherwise lose every change silently. The app shows a warning via onStorageError.
let storageErrorHandler = null;
export const onStorageError = (fn) => { storageErrorHandler = fn; };
export const lsSet = (k, v) => {
  try {
    if (typeof window !== "undefined") localStorage.setItem(k, JSON.stringify(v));
    return true;
  } catch (err) {
    storageErrorHandler?.(err);
    return false;
  }
};

// Rough size of everything this app keeps in the browser, in bytes (UTF-16, 2 bytes a char).
export const storageBytes = () => {
  try {
    let n = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      n += (k.length + (localStorage.getItem(k) || "").length) * 2;
    }
    return n;
  } catch {
    return 0;
  }
};

// Group a list of transactions into [{ date, items }] newest first.
export const byDay = (txns) => {
  const map = new Map();
  [...txns].sort((a, b) => b.date.localeCompare(a.date)).forEach((tx) => {
    if (!map.has(tx.date)) map.set(tx.date, []);
    map.get(tx.date).push(tx);
  });
  return [...map].map(([date, items]) => ({ date, items }));
};

export const sumBy = (txns, pred = () => true) => txns.reduce((s, tx) => (pred(tx) ? s + tx.amount : s), 0);
export const isIncome = (tx) => tx.type === "income";
