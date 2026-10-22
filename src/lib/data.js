// Validation for everything read from storage or a backup file, plus full backup/restore.
// Anything malformed is dropped rather than trusted, so one bad record can't break the app.

import { lsGet, lsSet } from "./core";

const MAX_AMOUNT = 1e10;
const isStr = (v, max = 500) => typeof v === "string" && v.length <= max;
const isDate = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isAmount = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= MAX_AMOUNT;

export const cleanTxns = (raw) =>
  Array.isArray(raw)
    ? raw.filter((t) => t && typeof t === "object" && isStr(t.id, 120) && isAmount(t.amount) && isDate(t.date) && isStr(t.category, 120))
        .map((t) => ({ ...t, type: t.type === "income" ? "income" : "expense", note: isStr(t.note) ? t.note : "", tags: Array.isArray(t.tags) ? t.tags.filter((g) => isStr(g, 60)) : [] }))
    : [];

export const cleanCats = (raw, fallback, defaults) => {
  if (!Array.isArray(raw)) return fallback;
  const list = raw.filter((c) => c && typeof c === "object" && isStr(c.value, 120) && isStr(c.label || "", 120));
  if (!list.length) return fallback;
  // Built-in categories pick up the current default icon and colour (older saves used emoji).
  return list.map((c) => {
    const d = c.builtin && defaults.find((x) => x.value === c.value);
    return d ? { ...c, icon: d.icon, bar: d.bar, pastelBg: d.pastelBg, pastelText: d.pastelText } : c;
  });
};

export const cleanSubs = (raw) =>
  Array.isArray(raw) ? raw.filter((s) => s && isStr(s.id, 120) && isStr(s.name, 120) && isAmount(Number(s.amount)) && isStr(String(s.category), 120)) : [];

export const cleanBudgets = (raw) => {
  const b = raw && typeof raw === "object" ? raw : {};
  const num = (v) => (isStr(String(v ?? ""), 20) && /^\d*\.?\d*$/.test(String(v ?? "")) ? String(v ?? "") : "");
  const cats = b.categories && typeof b.categories === "object" ? b.categories : {};
  return { total: num(b.total), categories: Object.fromEntries(Object.entries(cats).filter(([k]) => isStr(k, 120)).map(([k, v]) => [k, num(v)])) };
};

export const cleanProfile = (raw) => {
  const name = raw && isStr(raw.name, 60) ? raw.name : "You";
  return { name, initials: (raw && isStr(raw.initials, 4) ? raw.initials : name.slice(0, 2)).toUpperCase() };
};

export const cleanCards = (raw) => {
  const ok = raw && typeof raw === "object" ? raw : {};
  const cards = Array.isArray(ok.cards) ? ok.cards.filter((c) => c && isStr(c.id, 120) && isStr(c.name, 80) && Number.isInteger(c.cutoffDay) && Number.isInteger(c.dueDay)) : [];
  const ids = new Set(cards.map((c) => c.id));
  const kinds = ["purchase", "installment", "interest", "fee", "cashback", "payment"];
  const entries = Array.isArray(ok.entries) ? ok.entries.filter((e) => e && isStr(e.id, 120) && ids.has(e.cardId) && kinds.includes(e.kind) && isAmount(e.amount) && isDate(e.date)) : [];
  return { cards, entries };
};

// ── Backup ───────────────────────────────────────────────────────────────────
const KEYS = ["ft_txns", "ft_subs", "ft_budgets", "ft_cats_exp", "ft_cats_inc", "ft_profile", "ft_cards", "splitpro_db", "ft_lang", "ft_dark", "ft_text_scale"];

export const makeBackup = () =>
  JSON.stringify({ app: "finance-tracker", version: 1, exportedAt: new Date().toISOString(), data: Object.fromEntries(KEYS.map((k) => [k, lsGet(k, null)]).filter(([, v]) => v != null)) });

// Validates a backup file and writes it. Returns { ok, error }. Only known keys are
// restored, each through the same checks used at startup.
export const restoreBackup = (text, defaults) => {
  if (text.length > 4_500_000) return { ok: false, error: "too_big" };
  let parsed;
  try { parsed = JSON.parse(text); } catch { return { ok: false, error: "not_json" }; }
  if (!parsed || parsed.app !== "finance-tracker" || typeof parsed.data !== "object" || !parsed.data) return { ok: false, error: "not_backup" };
  const d = parsed.data;
  const out = {
    ft_txns: cleanTxns(d.ft_txns),
    ft_subs: cleanSubs(d.ft_subs),
    ft_budgets: cleanBudgets(d.ft_budgets),
    ft_cats_exp: cleanCats(d.ft_cats_exp, defaults.exp, defaults.exp),
    ft_cats_inc: cleanCats(d.ft_cats_inc, defaults.inc, defaults.inc),
    ft_profile: cleanProfile(d.ft_profile),
    ft_cards: cleanCards(d.ft_cards),
  };
  if (d.splitpro_db && typeof d.splitpro_db === "object") out.splitpro_db = d.splitpro_db; // re-validated by the Groups store on load
  if (d.ft_lang === "EN" || d.ft_lang === "TH") out.ft_lang = d.ft_lang;
  if (typeof d.ft_dark === "boolean") out.ft_dark = d.ft_dark;
  if (typeof d.ft_text_scale === "number") out.ft_text_scale = Math.min(Math.max(d.ft_text_scale, 0.9), 1.3);
  for (const [k, v] of Object.entries(out)) if (!lsSet(k, v)) return { ok: false, error: "storage_full" };
  return { ok: true, count: out.ft_txns.length };
};
