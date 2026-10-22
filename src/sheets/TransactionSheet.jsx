import { useEffect, useRef, useState } from "react";
import { Sheet, Segmented, Field, Switch, ConfirmButton, AmountInput, CatIcon } from "../ui/kit";
import { expenseCats, incomeCats, getCat } from "../lib/categories";
import { fmt, todayStr, extractTags, shortDate } from "../lib/core";

// One sheet for adding and editing income or expenses.
// `initial` is a transaction being edited, or defaults for a new one.
export default function TransactionSheet({ initial, lang, onSave, onDelete, onClose }) {
  const tr = (en, th) => (lang === "TH" ? th : en);
  const editing = !!initial?.id;
  const [type, setType] = useState(initial?.type || "expense");
  const [amount, setAmount] = useState(initial?.amount ? String(initial.originalAmount || initial.amount) : "");
  const [category, setCategory] = useState(initial?.category || (type === "income" ? "Salary" : "Food"));
  const [note, setNote] = useState(initial?.note || "");
  const [date, setDate] = useState(initial?.date || todayStr());
  const [split, setSplit] = useState(!!initial?.split);
  const [reimbursed, setReimbursed] = useState(initial?.reimbursed ? String(initial.reimbursed) : "");
  const [error, setError] = useState("");
  const amountRef = useRef(null);
  useEffect(() => { if (!editing) setTimeout(() => amountRef.current?.focus(), 250); }, [editing]);

  // Card and group entries are copies kept in sync from their own tabs.
  const linked = initial?.cardEntryId ? "cards" : initial?.groupExpenseId ? "groups" : null;
  if (linked) {
    const cat = getCat(initial.category, lang);
    return (
      <Sheet title={tr("Transaction", "รายการ")} onClose={onClose}>
        <div className="amount"><span className="display-sm">{fmt(initial.amount)}</span></div>
        <div className="group">
          <div className="row"><span className="row-main row-title">{initial.note || cat.label}</span></div>
          <div className="row"><span className="row-main muted">{tr("Category", "หมวดหมู่")}</span><span className="row-value">{cat.label}</span></div>
          <div className="row"><span className="row-main muted">{tr("Date", "วันที่")}</span><span className="row-value">{shortDate(initial.date, lang)}</span></div>
        </div>
        <p className="section-note" style={{ marginBottom: "1rem" }}>
          {linked === "cards"
            ? tr("This comes from the Cards tab. Change or delete it there.", "รายการนี้มาจากแท็บบัตร แก้ไขหรือลบได้ที่นั่น")
            : tr("This comes from the Groups tab. Change or delete it there.", "รายการนี้มาจากแท็บกลุ่ม แก้ไขหรือลบได้ที่นั่น")}
        </p>
        <button className="btn btn-quiet btn-block" onClick={onClose}>{tr("Done", "เสร็จ")}</button>
      </Sheet>
    );
  }

  const cats = type === "income" ? incomeCats(lang) : expenseCats(lang);
  const amt = parseFloat(String(amount).replace(/,/g, "")) || 0;
  const back = parseFloat(String(reimbursed).replace(/,/g, "")) || 0;
  const net = type === "expense" && split ? Math.max(amt - back, 0) : amt;

  const switchType = (t) => {
    if (t === type) return;
    setType(t);
    setCategory(t === "income" ? "Salary" : "Food");
    setSplit(false);
  };

  const save = () => {
    if (amt <= 0 || net <= 0) { setError(tr("Enter an amount above zero.", "กรอกจำนวนเงินมากกว่าศูนย์")); return; }
    onSave({
      ...(editing ? initial : {}),
      type, amount: net, originalAmount: amt, category, note: note.trim(), date,
      tags: extractTags(note), split: type === "expense" && split, reimbursed: type === "expense" && split ? back : 0,
      pending: false,
    });
  };

  return (
    <Sheet title={editing ? tr("Edit", "แก้ไข") : tr("Add", "เพิ่มรายการ")} onClose={onClose}>
      <Segmented label={tr("Type", "ประเภท")} value={type} onChange={switchType}
        options={[["expense", tr("Expense", "รายจ่าย")], ["income", tr("Income", "รายรับ")]]} />

      <AmountInput ref={amountRef} value={amount} label={tr("Amount in baht", "จำนวนเงิน (บาท)")} onChange={(v) => { setAmount(v); setError(""); }} />
      {error && <p className="error">{error}</p>}

      <Field group label={tr("Category", "หมวดหมู่")}>
        <div className="cat-grid">
          {cats.map((c) => (
            <button key={c.value} type="button" className="cat-tile" aria-pressed={category === c.value} onClick={() => setCategory(c.value)}>
              <CatIcon cat={c} small /><span>{c.labelShort}</span>
            </button>
          ))}
        </div>
      </Field>

      <Field label={tr("Note", "บันทึก")} hint={tr("Add #tags to group things, e.g. #trip", "ใส่ #แท็ก เพื่อจัดกลุ่ม เช่น #เที่ยว")}>
        <input className="input" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder={tr("What was it for?", "ใช้จ่ายเรื่องอะไร")} />
      </Field>

      <Field label={tr("Date", "วันที่")}>
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value || todayStr())} />
      </Field>

      {type === "expense" && (
        <div className="group" style={{ marginBottom: "1.25rem" }}>
          <div className="row">
            <div className="row-main">
              <div className="row-title">{tr("Someone paid me back", "มีคนคืนเงินให้")}</div>
              <div className="row-sub">{tr("Count only your share", "นับเฉพาะส่วนของคุณ")}</div>
            </div>
            <Switch checked={split} onChange={setSplit} label={tr("Someone paid me back", "มีคนคืนเงินให้")} />
          </div>
          {split && (
            <div className="row">
              <span className="row-main">{tr("Amount paid back", "ยอดที่ได้คืน")}</span>
              <input className="input input-inline" inputMode="decimal" placeholder="0" value={reimbursed}
                onChange={(e) => setReimbursed(e.target.value.replace(/[^\d.,]/g, ""))} aria-label={tr("Amount paid back", "ยอดที่ได้คืน")} />
            </div>
          )}
          {split && amt > 0 && (
            <div className="row"><span className="row-main muted">{tr("Your share", "ส่วนของคุณ")}</span><span className="row-value">{fmt(net)}</span></div>
          )}
        </div>
      )}

      <div className="stack">
        <button className="btn btn-primary btn-block" onClick={save}>
          {editing ? tr("Save changes", "บันทึกการแก้ไข") : tr("Save", "บันทึก")}{amt > 0 ? ` · ${fmt(net)}` : ""}
        </button>
        {editing && (
          <ConfirmButton confirmLabel={tr("Tap again to delete", "แตะอีกครั้งเพื่อลบ")} onConfirm={() => onDelete(initial.id)}>
            {tr("Delete", "ลบรายการ")}
          </ConfirmButton>
        )}
      </div>
    </Sheet>
  );
}
