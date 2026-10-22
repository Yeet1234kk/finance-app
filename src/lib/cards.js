// Credit-card logic: billing cycles, installment plans, statement totals and
// statement-text parsing. All dates are "YYYY-MM-DD" strings; m is 0-based.

export const CARD_COLORS = ["#1e293b", "#0f766e", "#1d4ed8", "#7c3aed", "#be123c", "#b45309", "#15803d", "#475569"];

export const KINDS = {
  purchase:    { en: "Purchase",     th: "ใช้จ่าย",      icon: "bag", sign: 1 },
  installment: { en: "Installment",  th: "ผ่อนชำระ",     icon: "calendar", sign: 1 },
  interest:    { en: "Interest",     th: "ดอกเบี้ย",     icon: "percent", sign: 1 },
  fee:         { en: "Fee",          th: "ค่าธรรมเนียม", icon: "receipt", sign: 1 },
  cashback:    { en: "Cashback",     th: "เงินคืน",      icon: "coins", sign: -1 },
  payment:     { en: "Payment",      th: "ชำระบัตร",     icon: "check", sign: -1 },
};

// ─── Date helpers (all dates are "YYYY-MM-DD" strings; m is 0-based) ─────────
export const pad = (n) => String(n).padStart(2, "0");
export const dim = (y, m) => new Date(y, m + 1, 0).getDate();
export const norm = (y, m) => ({ y: y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 });
export const ymd = (y, m, d) => { const n = norm(y, m); return `${n.y}-${pad(n.m + 1)}-${pad(Math.min(d, dim(n.y, n.m)))}`; };
export const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return { y, m: m - 1, d }; };
export const addMonths = (s, k) => { const p = parse(s); return ymd(p.y, p.m + k, p.d); };
export const nextDay = (s) => { const p = parse(s); const dt = new Date(p.y, p.m, p.d + 1); return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`; };
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const round2 = (n) => Math.round(n * 100) / 100;

// The statement a date falls in, identified by its closing (cut-off) month.
export function cycleOf(c, dateStr) {
  const p = parse(dateStr);
  return p.d <= Math.min(c.cutoffDay, dim(p.y, p.m)) ? norm(p.y, p.m) : norm(p.y, p.m + 1);
}
export function cycleRange(c, y, m) {
  const end = ymd(y, m, c.cutoffDay);
  const start = nextDay(ymd(y, m - 1, c.cutoffDay));
  const due = c.dueDay > c.cutoffDay ? ymd(y, m, c.dueDay) : ymd(y, m + 1, c.dueDay);
  return { start, end, due };
}

// Installment plans spread their total across monthly portions; everything else is one line.
export function expand(entries) {
  const out = [];
  entries.forEach((e) => {
    const n = e.kind === "installment" ? Math.max(1, parseInt(e.months) || 1) : 1;
    if (n === 1) { out.push({ ...e, entryId: e.id, idx: 0, portion: e.amount, label: e.note }); return; }
    const each = round2(e.amount / n);
    for (let i = 0; i < n; i++) {
      const portion = i === n - 1 ? round2(e.amount - each * (n - 1)) : each;
      out.push({ ...e, entryId: e.id, idx: i, date: addMonths(e.date, i), portion, label: `${e.note || ""} (${i + 1}/${n})`.trim() });
    }
  });
  return out;
}

export function statementFor(c, entries, y, m) {
  const r = cycleRange(c, y, m);
  const lines = expand(entries.filter((e) => e.cardId === c.id && e.kind !== "payment"))
    .filter((l) => l.date >= r.start && l.date <= r.end)
    .sort((a, b) => b.date.localeCompare(a.date));
  const sum = (k) => lines.filter((l) => k.includes(l.kind)).reduce((s, l) => s + l.portion, 0);
  const spending = sum(["purchase"]), installments = sum(["installment"]), charges = sum(["interest", "fee"]), cashback = sum(["cashback"]);
  const totalDue = Math.max(0, round2(spending + installments + charges - cashback));
  // Payments made after the cut-off and before the next cut-off settle this statement.
  const next = cycleRange(c, y, m + 1);
  const payments = entries.filter((e) => e.cardId === c.id && e.kind === "payment" && e.date > r.end && e.date <= next.end);
  const paid = payments.reduce((s, e) => s + e.amount, 0);
  return { ...r, lines, payments, spending, installments, charges, cashback, totalDue, paid };
}

export function outstanding(c, entries) {
  return round2(entries.filter((e) => e.cardId === c.id).reduce((s, e) => s + KINDS[e.kind].sign * e.amount, 0));
}

// ─── Statement OCR parsing ───────────────────────────────────────────────────
// Statement rows look like "12/09 13/09 STARBUCKS SIAM 145.00" or "...1,200.00 CR".
// Each row needs a leading dd/mm date and a trailing 2-decimal amount; the kind is
// guessed from keywords and the user confirms everything on the review sheet.
export function parseStatementText(text, closing) {
  const rows = [];
  text.split(/\r?\n/).forEach((raw) => {
    const line = raw.replace(/\s+/g, " ").trim();
    const dm = line.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b/);
    const am = line.match(/(-)?\s?(\d{1,3}(?:,\d{3})*\.\d{2}|\d+\.\d{2})\s*(CR|-)?\s*$/i);
    if (!dm || !am) return;
    const d = +dm[1], mo = +dm[2] - 1;
    if (d < 1 || d > 31 || mo < 0 || mo > 11) return;
    let y = dm[3] ? +dm[3] : closing.y;
    if (y < 100) y += y > 50 ? 2500 : 2000; // "68" is BE 2568, "25" is CE 2025
    if (y > 2400) y -= 543; // Buddhist era
    if (!dm[3] && mo > closing.m) y -= 1; // a December row on a January statement
    const amount = parseFloat(am[2].replace(/,/g, ""));
    if (!(amount > 0)) return;
    const credit = !!(am[1] || am[3]);
    // Description: drop leading dates (posting + transaction) and the trailing amount.
    const desc = line.slice(0, am.index).replace(/^(\s*\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?)+/, "").trim();
    const up = desc.toUpperCase();
    let kind = "purchase";
    if (/PAYMENT|THANK YOU|ชำระ/.test(up)) kind = "payment";
    else if (/CASH ?BACK|REBATE|เงินคืน/.test(up)) kind = "cashback";
    else if (/INTEREST|ดอกเบี้ย/.test(up)) kind = "interest";
    else if (/\bFEE\b|ค่าธรรมเนียม|LATE CHARGE/.test(up)) kind = "fee";
    else if (/INSTAL|IPP|ผ่อน|\b\d{1,2}\/\d{1,2}\b/.test(up)) kind = "installment";
    else if (credit) kind = "cashback";
    rows.push({ id: Math.random().toString(36).slice(2), on: kind !== "payment", date: ymd(y, mo, d), amount, note: desc.slice(0, 60), kind, category: kind === "purchase" || kind === "installment" ? "Shopping" : "Bills" });
  });
  return rows;
}
