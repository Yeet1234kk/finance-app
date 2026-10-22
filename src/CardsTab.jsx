import { useState, useEffect, useMemo } from "react";
import { Plus, ChevronLeft, ChevronRight, ArrowLeft, Trash2, Upload, Pencil, CreditCard, Check } from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// CREDIT CARDS — statements per billing cycle, installment plans, interest,
// cashback and statement upload (OCR). Charges are mirrored into Home
// transactions via onSync so budgets and analytics include card spending.
// ═══════════════════════════════════════════════════════════════════════════════

const FONT = "var(--font-sans)";
const MONO = "var(--font-mono)";
const LS_KEY = "ft_cards";

const card = { background: "var(--surface)", borderRadius: 20, border: "1px solid var(--border)", boxShadow: "var(--card-shadow)" };
const label = { fontSize: 11, fontWeight: 500, color: "var(--text-3)", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: MONO };
const input = { width: "100%", padding: "12px 14px", borderRadius: 12, border: "1.5px solid var(--border)", fontSize: 14, color: "var(--text)", fontFamily: FONT, background: "var(--surface)", outline: "none", boxSizing: "border-box" };
const pill = (on) => ({ flex: 1, padding: "9px 4px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: FONT, fontSize: 12, fontWeight: 600, background: on ? "var(--surface)" : "transparent", color: on ? "var(--text)" : "var(--text-3)", boxShadow: on ? "0 2px 8px rgba(15,23,42,0.08)" : "none" });
const primaryBtn = { width: "100%", padding: "14px", borderRadius: 14, border: "none", background: "var(--inverse)", color: "var(--on-inverse)", fontFamily: FONT, fontSize: 14, fontWeight: 700, cursor: "pointer" };

const CARD_COLORS = ["#1e293b", "#0f766e", "#1d4ed8", "#7c3aed", "#be123c", "#b45309", "#15803d", "#475569"];

const KINDS = {
  purchase:    { en: "Purchase",     th: "ใช้จ่าย",      icon: "🛒", sign: 1 },
  installment: { en: "Installment",  th: "ผ่อนชำระ",     icon: "🗓️", sign: 1 },
  interest:    { en: "Interest",     th: "ดอกเบี้ย",     icon: "📈", sign: 1 },
  fee:         { en: "Fee",          th: "ค่าธรรมเนียม", icon: "🧾", sign: 1 },
  cashback:    { en: "Cashback",     th: "เงินคืน",      icon: "🎁", sign: -1 },
  payment:     { en: "Payment",      th: "ชำระบัตร",     icon: "✅", sign: -1 },
};

// ─── Date helpers (all dates are "YYYY-MM-DD" strings; m is 0-based) ─────────
const pad = (n) => String(n).padStart(2, "0");
const dim = (y, m) => new Date(y, m + 1, 0).getDate();
const norm = (y, m) => ({ y: y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 });
const ymd = (y, m, d) => { const n = norm(y, m); return `${n.y}-${pad(n.m + 1)}-${pad(Math.min(d, dim(n.y, n.m)))}`; };
const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return { y, m: m - 1, d }; };
const addMonths = (s, k) => { const p = parse(s); return ymd(p.y, p.m + k, p.d); };
const nextDay = (s) => { const p = parse(s); const dt = new Date(p.y, p.m, p.d + 1); return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`; };
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const round2 = (n) => Math.round(n * 100) / 100;

// The statement a date falls in, identified by its closing (cut-off) month.
function cycleOf(c, dateStr) {
  const p = parse(dateStr);
  return p.d <= Math.min(c.cutoffDay, dim(p.y, p.m)) ? norm(p.y, p.m) : norm(p.y, p.m + 1);
}
function cycleRange(c, y, m) {
  const end = ymd(y, m, c.cutoffDay);
  const start = nextDay(ymd(y, m - 1, c.cutoffDay));
  const due = c.dueDay > c.cutoffDay ? ymd(y, m, c.dueDay) : ymd(y, m + 1, c.dueDay);
  return { start, end, due };
}

// Installment plans spread their total across monthly portions; everything else is one line.
function expand(entries) {
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

function statementFor(c, entries, y, m) {
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

function outstanding(c, entries) {
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

// ─── Small building blocks ───────────────────────────────────────────────────
function Sheet({ title, onClose, children }) {
  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 600, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ background: "var(--surface)", borderRadius: "26px 26px 0 0", padding: "0 20px 40px", width: "100%", maxWidth: 430, maxHeight: "92vh", overflowY: "auto", animation: "spSlideUp 0.32s cubic-bezier(0.32,0.72,0,1)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 0", position: "sticky", top: 0, background: "var(--surface)", zIndex: 2 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text)", fontFamily: FONT }}>{title}</h3>
          <button onClick={onClose} aria-label="Close" style={{ width: 32, height: 32, borderRadius: 99, background: "var(--fill)", border: "none", cursor: "pointer", color: "var(--text-2)" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ name, children }) {
  return <label style={{ display: "block", marginBottom: 14 }}><span style={{ ...label, display: "block", marginBottom: 6 }}>{name}</span>{children}</label>;
}

function CardFace({ c, balance, fmt, tr, onClick }) {
  const used = c.limit > 0 ? Math.min(Math.max(balance, 0) / c.limit, 1) : 0;
  return (
    <button onClick={onClick} style={{ width: "100%", textAlign: "left", border: "none", cursor: onClick ? "pointer" : "default", borderRadius: 22, padding: "20px 22px", marginBottom: 12, color: "#fff", fontFamily: FONT, background: `linear-gradient(135deg, ${c.color} 0%, ${c.color}cc 100%)`, boxShadow: "0 10px 30px rgba(15,23,42,0.18)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>{c.name}</span>
        <CreditCard size={20} style={{ opacity: 0.8 }} />
      </div>
      <p style={{ margin: "18px 0 2px", fontSize: 11, opacity: 0.75, letterSpacing: "0.06em", textTransform: "uppercase" }}>{tr("Outstanding", "ยอดค้างชำระ")}</p>
      <p style={{ margin: 0, fontSize: 26, fontWeight: 700, fontFamily: MONO }}>{fmt(Math.max(balance, 0))}</p>
      {c.limit > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ height: 5, background: "rgba(255,255,255,0.25)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${used * 100}%`, background: used > 0.8 ? "#fecaca" : "#fff", borderRadius: 99 }} />
          </div>
          <p style={{ margin: "6px 0 0", fontSize: 11, opacity: 0.8 }}>{tr("Available", "วงเงินคงเหลือ")} {fmt(Math.max(c.limit - Math.max(balance, 0), 0))} / {fmt(c.limit)}</p>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, fontSize: 12, opacity: 0.85, fontFamily: MONO }}>
        <span>•••• {c.last4 || "0000"}</span>
        <span>{tr("Cut-off", "ตัดรอบ")} {c.cutoffDay} · {tr("Due", "ครบกำหนด")} {c.dueDay}</span>
      </div>
    </button>
  );
}

// ─── Sheets ──────────────────────────────────────────────────────────────────
function CardForm({ initial, onSave, onDelete, onClose, tr }) {
  const [f, setF] = useState(initial || { name: "", last4: "", limit: "", cutoffDay: "25", dueDay: "10", color: CARD_COLORS[0] });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const day = (v) => Math.min(Math.max(parseInt(v) || 1, 1), 31);
  const valid = f.name.trim();
  return (
    <Sheet title={initial ? tr("Edit card", "แก้ไขบัตร") : tr("Add credit card", "เพิ่มบัตรเครดิต")} onClose={onClose}>
      <Field name={tr("Card name", "ชื่อบัตร")}><input style={input} value={f.name} onChange={set("name")} placeholder="e.g. KBank Platinum" autoFocus /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field name={tr("Last 4 digits", "เลขท้าย 4 หลัก")}><input style={input} value={f.last4} onChange={(e) => setF((p) => ({ ...p, last4: e.target.value.replace(/\D/g, "").slice(0, 4) }))} inputMode="numeric" placeholder="1234" /></Field>
        <Field name={tr("Credit limit", "วงเงิน")}><input style={input} value={f.limit} onChange={set("limit")} inputMode="decimal" placeholder="50000" /></Field>
        <Field name={tr("Cut-off day", "วันตัดรอบ")}><input style={input} value={f.cutoffDay} onChange={set("cutoffDay")} inputMode="numeric" /></Field>
        <Field name={tr("Payment due day", "วันครบกำหนดชำระ")}><input style={input} value={f.dueDay} onChange={set("dueDay")} inputMode="numeric" /></Field>
      </div>
      <Field name={tr("Colour", "สี")}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {CARD_COLORS.map((col) => (
            <button key={col} onClick={(e) => { e.preventDefault(); setF((p) => ({ ...p, color: col })); }} aria-label={col} style={{ width: 34, height: 34, borderRadius: 11, background: col, border: f.color === col ? "3px solid var(--text)" : "3px solid transparent", cursor: "pointer" }} />
          ))}
        </div>
      </Field>
      <button disabled={!valid} style={{ ...primaryBtn, opacity: valid ? 1 : 0.4 }} onClick={() => onSave({ ...f, name: f.name.trim(), limit: parseFloat(f.limit) || 0, cutoffDay: day(f.cutoffDay), dueDay: day(f.dueDay) })}>{tr("Save card", "บันทึกบัตร")}</button>
      {onDelete && <button onClick={onDelete} style={{ ...primaryBtn, marginTop: 10, background: "var(--negative-tint)", color: "var(--negative)" }}>{tr("Delete card and its entries", "ลบบัตรและรายการทั้งหมด")}</button>}
    </Sheet>
  );
}

function EntryForm({ cardName, expenseCats, defaultDate, onSave, onClose, tr, lang }) {
  const [kind, setKind] = useState("purchase");
  const [f, setF] = useState({ amount: "", months: "10", note: "", date: defaultDate, category: "Shopping" });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const amt = parseFloat(f.amount) || 0;
  const months = Math.max(1, parseInt(f.months) || 1);
  return (
    <Sheet title={`${tr("Add to", "เพิ่มใน")} ${cardName}`} onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, background: "var(--fill)", padding: 4, borderRadius: 12, marginBottom: 16 }}>
        {Object.entries(KINDS).map(([k, v]) => <button key={k} style={pill(kind === k)} onClick={() => setKind(k)}>{v.icon} {lang === "TH" ? v.th : v.en}</button>)}
      </div>
      <Field name={kind === "installment" ? tr("Total amount", "ยอดผ่อนทั้งหมด") : tr("Amount", "จำนวนเงิน")}>
        <input style={{ ...input, fontSize: 22, fontFamily: MONO, fontWeight: 600 }} value={f.amount} onChange={set("amount")} inputMode="decimal" placeholder="0.00" autoFocus />
      </Field>
      {kind === "installment" && (
        <Field name={tr("Months", "จำนวนงวด")}>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            {[3, 4, 6, 10, 12].map((n) => <button key={n} onClick={(e) => { e.preventDefault(); setF((p) => ({ ...p, months: String(n) })); }} style={{ ...pill(months === n), background: months === n ? "var(--inverse)" : "var(--fill)", color: months === n ? "var(--on-inverse)" : "var(--text-2)" }}>{n}</button>)}
          </div>
          <input style={input} value={f.months} onChange={set("months")} inputMode="numeric" />
          {amt > 0 && <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-2)", fontFamily: FONT }}>{tr("≈", "≈")} <b style={{ fontFamily: MONO }}>{(amt / months).toFixed(2)}</b> {tr("per month", "ต่อเดือน")}</p>}
        </Field>
      )}
      {(kind === "purchase" || kind === "installment") && (
        <Field name={tr("Category", "หมวดหมู่")}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {expenseCats.map((c) => <button key={c.value} onClick={(e) => { e.preventDefault(); setF((p) => ({ ...p, category: c.value })); }} style={{ padding: "7px 12px", borderRadius: 99, border: f.category === c.value ? `1.5px solid ${c.bar}` : "1.5px solid var(--border)", background: f.category === c.value ? c.pastelBg : "var(--surface)", color: f.category === c.value ? c.pastelText : "var(--text-2)", fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{c.icon} {c.labelShort || c.label}</button>)}
          </div>
        </Field>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field name={tr("Note", "บันทึก")}><input style={input} value={f.note} onChange={set("note")} placeholder={tr("Optional", "ไม่บังคับ")} /></Field>
        <Field name={kind === "installment" ? tr("First month", "งวดแรก") : tr("Date", "วันที่")}><input style={input} type="date" value={f.date} onChange={set("date")} /></Field>
      </div>
      <button disabled={amt <= 0} style={{ ...primaryBtn, opacity: amt > 0 ? 1 : 0.4 }} onClick={() => onSave({ kind, amount: round2(amt), months: kind === "installment" ? months : undefined, note: f.note.trim(), date: f.date, category: kind === "purchase" || kind === "installment" ? f.category : "Bills" })}>{tr("Save", "บันทึก")}</button>
    </Sheet>
  );
}

function ImportReview({ rows: initialRows, expenseCats, fmt, onSave, onClose, tr, lang }) {
  const [rows, setRows] = useState(initialRows);
  const upd = (id, patch) => setRows((p) => p.map((r) => r.id === id ? { ...r, ...patch } : r));
  const chosen = rows.filter((r) => r.on);
  return (
    <Sheet title={tr("Review statement", "ตรวจสอบใบแจ้งยอด")} onClose={onClose}>
      {rows.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-2)", fontFamily: FONT, lineHeight: 1.6 }}>{tr("No rows with a date and amount were found. Try a sharper, straight-on photo or screenshot of the transaction list.", "ไม่พบรายการที่มีวันที่และยอดเงิน ลองถ่ายภาพให้ชัดและตรงขึ้น หรือใช้ภาพหน้าจอรายการ")}</p>
      ) : (
        <>
          <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--text-2)", fontFamily: FONT }}>{tr("Check each row — untick anything that isn't a transaction.", "ตรวจสอบแต่ละรายการ — เอาเครื่องหมายออกหากไม่ใช่รายการ")}</p>
          {rows.map((r) => (
            <div key={r.id} style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 10, marginBottom: 8, opacity: r.on ? 1 : 0.45 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={r.on} onChange={(e) => upd(r.id, { on: e.target.checked })} style={{ width: 18, height: 18 }} />
                <input style={{ ...input, padding: "7px 10px", fontSize: 13 }} value={r.note} onChange={(e) => upd(r.id, { note: e.target.value })} />
                <input style={{ ...input, padding: "7px 10px", fontSize: 13, width: 96, fontFamily: MONO, textAlign: "right" }} value={r.amount} onChange={(e) => upd(r.id, { amount: e.target.value })} inputMode="decimal" />
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <input type="date" style={{ ...input, padding: "6px 8px", fontSize: 12 }} value={r.date} onChange={(e) => upd(r.id, { date: e.target.value })} />
                <select style={{ ...input, padding: "6px 8px", fontSize: 12 }} value={r.kind} onChange={(e) => upd(r.id, { kind: e.target.value })}>
                  {Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v.icon} {lang === "TH" ? v.th : v.en}</option>)}
                </select>
                {(r.kind === "purchase" || r.kind === "installment") && (
                  <select style={{ ...input, padding: "6px 8px", fontSize: 12 }} value={r.category} onChange={(e) => upd(r.id, { category: e.target.value })}>
                    {expenseCats.map((c) => <option key={c.value} value={c.value}>{c.icon} {c.labelShort || c.label}</option>)}
                  </select>
                )}
              </div>
            </div>
          ))}
        </>
      )}
      <button disabled={!chosen.length} style={{ ...primaryBtn, marginTop: 8, opacity: chosen.length ? 1 : 0.4 }}
        onClick={() => onSave(chosen.map((r) => ({ kind: r.kind, amount: round2(parseFloat(r.amount) || 0), note: r.note.trim(), date: r.date, category: r.kind === "purchase" || r.kind === "installment" ? r.category : "Bills" })).filter((r) => r.amount > 0))}>
        {tr(`Import ${chosen.length} rows`, `นำเข้า ${chosen.length} รายการ`)} · {fmt(chosen.reduce((s, r) => s + KINDS[r.kind].sign * (parseFloat(r.amount) || 0), 0))}
      </button>
    </Sheet>
  );
}

// ─── Main tab ────────────────────────────────────────────────────────────────
export default function CardsTab({ language = "EN", expenseCats, fmt, ocrRead, onSync, showToast }) {
  const tr = (en, th) => (language === "TH" ? th : en);
  const [data, setData] = useState(() => {
    try { const v = JSON.parse(localStorage.getItem(LS_KEY)); if (v && Array.isArray(v.cards)) return v; } catch {}
    return { cards: [], entries: [] };
  });
  const [openId, setOpenId] = useState(null);
  const [cycle, setCycle] = useState(null); // {y, m} closing month being viewed
  const [sheet, setSheet] = useState(null); // "card" | "editCard" | "entry" | {rows}
  const [scanning, setScanning] = useState(null);

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
    const byId = Object.fromEntries(data.cards.map((c) => [c.id, c]));
    const mirrored = expand(data.entries.filter((e) => e.kind !== "payment" && byId[e.cardId])).map((l) => ({
      id: `card_${l.entryId}_${l.idx}`,
      type: l.kind === "cashback" ? "income" : "expense",
      amount: l.portion,
      originalAmount: l.portion,
      category: l.kind === "cashback" ? "OtherIncome" : (l.category || "Bills"),
      note: `💳 ${byId[l.cardId].name} · ${l.label || tr(KINDS[l.kind].en, KINDS[l.kind].th)}`,
      date: l.date, tags: [], split: false, reimbursed: 0, cardEntryId: l.entryId,
    }));
    onSync(mirrored);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const open = data.cards.find((c) => c.id === openId);
  const cur = open ? (cycle || cycleOf(open, today())) : null;
  const stmt = useMemo(() => open && statementFor(open, data.entries, cur.y, cur.m), [open, data.entries, cur?.y, cur?.m]);

  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
  const addEntries = (list) => setData((p) => ({ ...p, entries: [...list.map((e) => ({ ...e, id: uid(), cardId: open.id })), ...p.entries] }));

  const saveCard = (f) => {
    if (sheet === "editCard") setData((p) => ({ ...p, cards: p.cards.map((c) => c.id === open.id ? { ...c, ...f } : c) }));
    else setData((p) => ({ ...p, cards: [...p.cards, { ...f, id: uid() }] }));
    setSheet(null);
  };
  const deleteCard = () => {
    if (!window.confirm(tr("Delete this card and all its entries?", "ลบบัตรนี้และรายการทั้งหมด?"))) return;
    setData((p) => ({ cards: p.cards.filter((c) => c.id !== open.id), entries: p.entries.filter((e) => e.cardId !== open.id) }));
    setSheet(null); setOpenId(null);
  };

  const handleStatementUpload = async (files) => {
    const list = Array.from(files || []).filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;
    const rows = [];
    try {
      for (let i = 0; i < list.length; i++) {
        setScanning({ i: i + 1, n: list.length });
        rows.push(...parseStatementText(await ocrRead(list[i]), cur));
      }
    } catch (err) {
      console.error("Statement OCR failed:", err);
      showToast(tr("Couldn't read that statement — try again", "อ่านใบแจ้งยอดไม่สำเร็จ — ลองใหม่"));
    }
    setScanning(null);
    setSheet({ rows });
  };

  const monthName = (y, m) => new Date(y, m, 1).toLocaleDateString(language === "TH" ? "th-TH" : "en-US", { month: "long", year: "numeric" });
  const shortDate = (s) => { const p = parse(s); return new Date(p.y, p.m, p.d).toLocaleDateString(language === "TH" ? "th-TH" : "en-US", { month: "short", day: "numeric" }); };

  // ── Card list ──
  if (!open) {
    const totalOut = data.cards.reduce((s, c) => s + Math.max(outstanding(c, data.entries), 0), 0);
    return (
      <div style={{ padding: "8px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <p style={{ ...label, margin: "0 0 4px" }}>{tr("Credit cards", "บัตรเครดิต")}</p>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: "var(--text)", fontFamily: MONO }}>{fmt(totalOut)}</p>
            <p style={{ margin: 0, fontSize: 12, color: "var(--text-2)", fontFamily: FONT }}>{tr("total outstanding", "ยอดค้างชำระรวม")}</p>
          </div>
          <button onClick={() => setSheet("card")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", borderRadius: 12, border: "none", background: "var(--inverse)", color: "var(--on-inverse)", fontFamily: FONT, fontSize: 13, fontWeight: 700, cursor: "pointer" }}><Plus size={15} /> {tr("Card", "บัตร")}</button>
        </div>

        {data.cards.length === 0 && (
          <div style={{ ...card, textAlign: "center", padding: "40px 24px" }}>
            <div style={{ fontSize: 42, marginBottom: 10 }}>💳</div>
            <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: "var(--text)", fontFamily: FONT }}>{tr("Track your credit cards", "จดค่าบัตรเครดิต")}</p>
            <p style={{ margin: "0 0 18px", fontSize: 13, color: "var(--text-2)", fontFamily: FONT, lineHeight: 1.6 }}>{tr("Add a card, then upload its statement or log purchases, installments, interest and cashback. Everything flows into your monthly spending.", "เพิ่มบัตร แล้วอัปโหลดใบแจ้งยอด หรือจดรายจ่าย ยอดผ่อน ดอกเบี้ย และเงินคืน ทุกอย่างรวมเข้ากับรายจ่ายรายเดือน")}</p>
            <button onClick={() => setSheet("card")} style={{ ...primaryBtn, width: "auto", padding: "12px 22px" }}>{tr("Add your first card", "เพิ่มบัตรใบแรก")}</button>
          </div>
        )}

        {data.cards.map((c) => {
          const bal = outstanding(c, data.entries);
          const now = cycleOf(c, today());
          const last = statementFor(c, data.entries, now.y, now.m - 1);
          const unpaid = last.totalDue - last.paid;
          return (
            <div key={c.id}>
              <CardFace c={c} balance={bal} fmt={fmt} tr={tr} onClick={() => { setOpenId(c.id); setCycle(null); }} />
              {last.totalDue > 0 && (
                <div style={{ ...card, borderRadius: 14, padding: "10px 14px", margin: "-4px 0 14px", display: "flex", justifyContent: "space-between", fontSize: 12, fontFamily: FONT, color: unpaid > 0 ? (last.due < today() ? "var(--negative)" : "var(--text-2)") : "var(--positive)" }}>
                  <span>{unpaid > 0 ? `${tr("Due", "ครบกำหนด")} ${shortDate(last.due)}` : tr("Last statement paid", "ชำระรอบล่าสุดแล้ว")}</span>
                  <span style={{ fontFamily: MONO, fontWeight: 600 }}>{fmt(Math.max(unpaid, 0) || last.totalDue)}</span>
                </div>
              )}
            </div>
          );
        })}

        {sheet === "card" && <CardForm onSave={saveCard} onClose={() => setSheet(null)} tr={tr} />}
      </div>
    );
  }

  // ── Card detail / statement ──
  const unpaid = Math.max(stmt.totalDue - stmt.paid, 0);
  const closed = stmt.end < today();
  const plans = data.entries.filter((e) => e.cardId === open.id && e.kind === "installment" && (parseInt(e.months) || 1) > 1).map((e) => {
    const n = parseInt(e.months);
    const done = expand([e]).filter((l) => l.date <= today()).length;
    return { ...e, n, done };
  }).filter((p) => p.done < p.n);

  return (
    <div style={{ padding: "8px 16px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <button onClick={() => setOpenId(null)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--text-2)", fontFamily: FONT, fontSize: 13, fontWeight: 600, padding: 0 }}><ArrowLeft size={15} /> {tr("All cards", "บัตรทั้งหมด")}</button>
        <button onClick={() => setSheet("editCard")} aria-label="Edit card" style={{ background: "var(--fill)", border: "none", borderRadius: 10, padding: 8, cursor: "pointer", color: "var(--text-2)" }}><Pencil size={14} /></button>
      </div>
      <CardFace c={open} balance={outstanding(open, data.entries)} fmt={fmt} tr={tr} />

      {/* Cycle switcher */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "6px 0 10px" }}>
        <button aria-label="Previous statement" onClick={() => setCycle(norm(cur.y, cur.m - 1))} style={{ background: "var(--fill)", border: "none", borderRadius: 10, padding: 8, cursor: "pointer", color: "var(--text-2)" }}><ChevronLeft size={16} /></button>
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text)", fontFamily: FONT }}>{tr("Statement", "ใบแจ้งยอด")} {monthName(cur.y, cur.m)}</p>
          <p style={{ margin: 0, fontSize: 11, color: "var(--text-3)", fontFamily: MONO }}>{shortDate(stmt.start)} – {shortDate(stmt.end)}{closed ? "" : ` · ${tr("open", "รอบปัจจุบัน")}`}</p>
        </div>
        <button aria-label="Next statement" onClick={() => setCycle(norm(cur.y, cur.m + 1))} style={{ background: "var(--fill)", border: "none", borderRadius: 10, padding: 8, cursor: "pointer", color: "var(--text-2)" }}><ChevronRight size={16} /></button>
      </div>

      {/* Summary */}
      <div style={{ ...card, padding: "18px 20px", marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
          <div>
            <p style={{ ...label, margin: "0 0 4px" }}>{tr("Total due", "ยอดที่ต้องชำระ")}</p>
            <p style={{ margin: 0, fontSize: 26, fontWeight: 700, color: "var(--text)", fontFamily: MONO }}>{fmt(stmt.totalDue)}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ ...label, margin: "0 0 4px" }}>{tr("Due date", "ครบกำหนด")}</p>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: closed && unpaid > 0 && stmt.due < today() ? "var(--negative)" : "var(--text)", fontFamily: FONT }}>{shortDate(stmt.due)}</p>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            [tr("Spending", "ใช้จ่าย"), stmt.spending, "var(--text)"],
            [tr("Installments", "ยอดผ่อน"), stmt.installments, "var(--text)"],
            [tr("Interest & fees", "ดอกเบี้ย/ค่าธรรมเนียม"), stmt.charges, "var(--warning)"],
            [tr("Cashback", "เงินคืน"), -stmt.cashback, "var(--positive)"],
          ].map(([l, v, col]) => (
            <div key={l} style={{ background: "var(--fill)", borderRadius: 12, padding: "9px 12px" }}>
              <p style={{ margin: "0 0 2px", fontSize: 10, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: FONT }}>{l}</p>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: col, fontFamily: MONO }}>{v < 0 ? "−" : ""}{fmt(Math.abs(v))}</p>
            </div>
          ))}
        </div>
        {closed && stmt.totalDue > 0 && (unpaid > 0 ? (
          <button onClick={() => { addEntries([{ kind: "payment", amount: round2(unpaid), note: tr("Statement payment", "ชำระใบแจ้งยอด"), date: today() > stmt.end ? today() : nextDay(stmt.end) }]); showToast(tr("✓ Marked as paid", "✓ บันทึกการชำระแล้ว")); }}
            style={{ ...primaryBtn, marginTop: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Check size={15} /> {tr("Mark paid", "ชำระแล้ว")} · {fmt(unpaid)}</button>
        ) : (
          <p style={{ margin: "14px 0 0", textAlign: "center", fontSize: 13, fontWeight: 600, color: "var(--positive)", fontFamily: FONT }}>✓ {tr("Paid", "ชำระแล้ว")} {fmt(stmt.paid)}</p>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        <button onClick={() => setSheet("entry")} style={{ ...card, borderRadius: 14, padding: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", fontFamily: FONT, fontSize: 13, fontWeight: 700, color: "var(--text)" }}><Plus size={15} /> {tr("Add entry", "เพิ่มรายการ")}</button>
        <label style={{ ...card, borderRadius: 14, padding: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: scanning ? "wait" : "pointer", fontFamily: FONT, fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
          <Upload size={15} /> {scanning ? `${tr("Reading", "กำลังอ่าน")} ${scanning.i}/${scanning.n}…` : tr("Upload statement", "อัปโหลดใบแจ้งยอด")}
          <input type="file" accept="image/*" multiple hidden disabled={!!scanning} onChange={(e) => { handleStatementUpload(e.target.files); e.target.value = ""; }} />
        </label>
      </div>

      {plans.length > 0 && (
        <>
          <p style={{ ...label, margin: "0 0 10px 4px" }}>{tr("Active installment plans", "แผนผ่อนชำระ")}</p>
          {plans.map((p) => (
            <div key={p.id} style={{ ...card, borderRadius: 16, padding: "12px 16px", marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: FONT, fontSize: 13 }}>
                <span style={{ fontWeight: 600, color: "var(--text)" }}>{p.note || tr("Installment", "ผ่อนชำระ")}</span>
                <span style={{ fontFamily: MONO, color: "var(--text-2)" }}>{fmt(p.amount / p.n)}/{tr("mo", "ด.")}</span>
              </div>
              <div style={{ height: 5, background: "var(--fill)", borderRadius: 99, margin: "8px 0 4px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(p.done / p.n) * 100}%`, background: open.color, borderRadius: 99 }} />
              </div>
              <p style={{ margin: 0, fontSize: 11, color: "var(--text-3)", fontFamily: FONT }}>{p.done}/{p.n} {tr("paid", "งวด")} · {fmt(p.amount - (p.amount / p.n) * p.done)} {tr("left", "คงเหลือ")}</p>
            </div>
          ))}
        </>
      )}

      <p style={{ ...label, margin: "14px 0 10px 4px" }}>{stmt.lines.length + stmt.payments.length} {tr("items this statement", "รายการในรอบนี้")}</p>
      <div style={{ ...card, padding: "4px 16px", marginBottom: 16 }}>
        {stmt.lines.length + stmt.payments.length === 0 && <p style={{ textAlign: "center", padding: "22px 0", margin: 0, fontSize: 13, color: "var(--text-3)", fontFamily: FONT }}>{tr("Nothing in this cycle yet", "ยังไม่มีรายการในรอบนี้")}</p>}
        {[...stmt.lines, ...stmt.payments.map((e) => ({ ...e, entryId: e.id, idx: 0, portion: e.amount, label: e.note }))].map((l) => {
          const k = KINDS[l.kind];
          const cat = expenseCats.find((c) => c.value === l.category);
          return (
            <div key={`${l.entryId}_${l.idx}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 0", borderBottom: "1px solid var(--fill)" }}>
              <div style={{ width: 34, height: 34, borderRadius: 11, background: "var(--fill)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{(l.kind === "purchase" && cat?.icon) || k.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--text)", fontFamily: FONT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.label || tr(k.en, k.th)}</p>
                <p style={{ margin: 0, fontSize: 11, color: "var(--text-3)", fontFamily: FONT }}>{shortDate(l.date)} · {tr(k.en, k.th)}</p>
              </div>
              <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: k.sign < 0 ? "var(--positive)" : "var(--text)" }}>{k.sign < 0 ? "−" : ""}{fmt(l.portion)}</span>
              <button aria-label="Delete" onClick={() => { if (l.kind !== "installment" || (parseInt(l.months) || 1) === 1 || window.confirm(tr("Delete the whole installment plan?", "ลบแผนผ่อนทั้งหมด?"))) setData((p) => ({ ...p, entries: p.entries.filter((e) => e.id !== l.entryId) })); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--text-3)" }}><Trash2 size={13} /></button>
            </div>
          );
        })}
      </div>

      {sheet === "editCard" && <CardForm initial={{ ...open, limit: String(open.limit || ""), cutoffDay: String(open.cutoffDay), dueDay: String(open.dueDay) }} onSave={saveCard} onDelete={deleteCard} onClose={() => setSheet(null)} tr={tr} />}
      {sheet === "entry" && <EntryForm cardName={open.name} expenseCats={expenseCats} defaultDate={closed ? stmt.end : today()} lang={language} tr={tr} onClose={() => setSheet(null)} onSave={(e) => { addEntries([e]); setSheet(null); showToast(tr("✓ Saved", "✓ บันทึกแล้ว")); }} />}
      {sheet?.rows && <ImportReview rows={sheet.rows} expenseCats={expenseCats} fmt={fmt} lang={language} tr={tr} onClose={() => setSheet(null)} onSave={(list) => { addEntries(list); setSheet(null); showToast(tr(`✓ Imported ${list.length} rows`, `✓ นำเข้า ${list.length} รายการ`)); }} />}
    </div>
  );
}
