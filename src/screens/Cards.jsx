import { useEffect, useMemo, useState } from "react";
import { Plus, Upload, Pencil, Check } from "lucide-react";
import { Glyph } from "../ui/icons";
import { Sheet, FullPage, Section, Row, CatIcon, Bar, Empty, Field, Segmented, Switcher, ConfirmButton, AmountInput, Money } from "../ui/kit";
import { expenseCats, getCat } from "../lib/categories";
import { fmt, lsGet, lsSet, uid } from "../lib/core";
import { cleanCards } from "../lib/data";
import { CARD_COLORS, KINDS, cycleOf, expand, statementFor, outstanding, parseStatementText, norm, parse, nextDay, today, round2 } from "../lib/cards";

// Credit cards: statements per billing cycle, installment plans, interest,
// cashback and statement upload. Charges are copied into the main ledger via onSync.
export default function Cards({ lang, onSync, readImage, toast }) {
  const tr = (en, th) => (lang === "TH" ? th : en);
  const [data, setData] = useState(() => cleanCards(lsGet("ft_cards", null)));
  const [openId, setOpenId] = useState(null);
  const [sheet, setSheet] = useState(null); // "card" | "edit" | "entry" | { rows }

  useEffect(() => {
    lsSet("ft_cards", data);
    const byId = Object.fromEntries(data.cards.map((c) => [c.id, c]));
    onSync(expand(data.entries.filter((e) => e.kind !== "payment" && byId[e.cardId])).map((l) => ({
      id: `card_${l.entryId}_${l.idx}`,
      type: l.kind === "cashback" ? "income" : "expense",
      amount: l.portion, originalAmount: l.portion,
      category: l.kind === "cashback" ? "OtherIncome" : l.category || "Bills",
      note: `${byId[l.cardId].name} · ${l.label || tr(KINDS[l.kind].en, KINDS[l.kind].th)}`,
      date: l.date, tags: [], split: false, reimbursed: 0, cardEntryId: l.entryId,
    })));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const saveCard = (f) => {
    if (sheet === "edit") setData((p) => ({ ...p, cards: p.cards.map((c) => (c.id === openId ? { ...c, ...f } : c)) }));
    else setData((p) => ({ ...p, cards: [...p.cards, { ...f, id: uid() }] }));
    setSheet(null);
  };
  const deleteCard = () => {
    setData((p) => ({ cards: p.cards.filter((c) => c.id !== openId), entries: p.entries.filter((e) => e.cardId !== openId) }));
    setSheet(null); setOpenId(null);
  };

  const open = data.cards.find((c) => c.id === openId);
  const totalOut = data.cards.reduce((s, c) => s + Math.max(outstanding(c, data.entries), 0), 0);

  return (
    <>
      <header className="topbar">
        <h1 className="title">{tr("Cards", "บัตรเครดิต")}</h1>
        <button className="icon-btn" onClick={() => setSheet("card")} aria-label={tr("Add card", "เพิ่มบัตร")}><Plus size={20} /></button>
      </header>

      {data.cards.length === 0 ? (
        <Empty title={tr("Track your credit cards", "จดค่าบัตรเครดิต")}
          sub={tr("Add a card, then log purchases, installments, interest and cashback, or upload a statement photo.", "เพิ่มบัตร แล้วจดรายจ่าย ยอดผ่อน ดอกเบี้ย เงินคืน หรืออัปโหลดรูปใบแจ้งยอด")}>
          <button className="btn btn-primary" style={{ marginTop: "1.25rem" }} onClick={() => setSheet("card")}><Plus size={20} />{tr("Add a card", "เพิ่มบัตร")}</button>
        </Empty>
      ) : (
        <>
          <div className="summary">
            <p className="caption" style={{ margin: 0 }}>{tr("Owed on all cards", "ยอดค้างชำระทุกบัตร")}</p>
            <Money value={totalOut} />
          </div>
          <div className="section stack">
            {data.cards.map((c) => {
              const bal = outstanding(c, data.entries);
              const now = cycleOf(c, today());
              const last = statementFor(c, data.entries, now.y, now.m - 1);
              const unpaid = Math.max(last.totalDue - last.paid, 0);
              return (
                <div key={c.id}>
                  <CardFace c={c} balance={bal} tr={tr} onClick={() => setOpenId(c.id)} />
                  {last.totalDue > 0 && (
                    <p className="section-note">
                      {unpaid > 0 && last.due < today()
                        ? <span className="neg strong" style={{ color: "var(--neg)" }}>{tr(`${fmt(unpaid)} overdue since ${fmtDay(last.due, lang)}`, `ค้างชำระ ${fmt(unpaid)} ตั้งแต่ ${fmtDay(last.due, lang)}`)}</span>
                        : unpaid > 0
                          ? tr(`${fmt(unpaid)} due ${fmtDay(last.due, lang)}`, `ต้องชำระ ${fmt(unpaid)} ภายใน ${fmtDay(last.due, lang)}`)
                          : tr("Last statement is paid", "ชำระรอบล่าสุดแล้ว")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {open && (
        <CardDetail key={open.id} card={open} data={data} setData={setData} lang={lang} tr={tr} readImage={readImage} toast={toast}
          onBack={() => setOpenId(null)} onEdit={() => setSheet("edit")} />
      )}

      {(sheet === "card" || sheet === "edit") && (
        <CardForm initial={sheet === "edit" ? open : null} tr={tr} onSave={saveCard} onDelete={sheet === "edit" ? deleteCard : null} onClose={() => setSheet(null)} />
      )}
    </>
  );
}

const fmtDay = (s, lang) => { const p = parse(s); return new Date(p.y, p.m, p.d).toLocaleDateString(lang === "TH" ? "th-TH" : "en-US", { month: "short", day: "numeric" }); };

function CardFace({ c, balance, tr, onClick }) {
  const used = c.limit > 0 ? Math.min(Math.max(balance, 0) / c.limit, 1) : 0;
  const Tag = onClick ? "button" : "div";
  return (
    <Tag className="ccard" style={{ backgroundColor: c.color }} onClick={onClick}>
      <div className="ccard-top"><span>{c.name}</span><span style={{ fontWeight: 500, opacity: 0.85 }}>•••• {c.last4 || "0000"}</span></div>
      <div>
        <div style={{ fontSize: "0.875rem", opacity: 0.8 }}>{tr("Owed", "ยอดค้าง")}</div>
        <div className="ccard-amt"><span style={{ fontSize: "0.55em", opacity: 0.75, verticalAlign: "0.5em", marginRight: "0.1em" }}>฿</span>{Math.round(Math.max(balance, 0)).toLocaleString("en-US")}</div>
        {c.limit > 0 && <div className="bar"><i style={{ width: `${used * 100}%` }} /></div>}
      </div>
      <div className="ccard-foot">
        <span>{c.limit > 0 ? `${tr("Available", "วงเงินเหลือ")} ${fmt(Math.max(c.limit - Math.max(balance, 0), 0))}` : ""}</span>
        <span>{tr("Due day", "ครบกำหนดวันที่")} {c.dueDay}</span>
      </div>
    </Tag>
  );
}

function CardDetail({ card, data, setData, lang, tr, readImage, toast, onBack, onEdit }) {
  const [cycle, setCycle] = useState(() => cycleOf(card, today()));
  const [sheet, setSheet] = useState(null);
  const [scanning, setScanning] = useState(null);
  const stmt = useMemo(() => statementFor(card, data.entries, cycle.y, cycle.m), [card, data.entries, cycle]);
  const closed = stmt.end < today();
  const unpaid = Math.max(stmt.totalDue - stmt.paid, 0);
  const monthLabel = new Date(cycle.y, cycle.m, 1).toLocaleDateString(lang === "TH" ? "th-TH" : "en-US", { month: "long", year: "numeric" });

  const addEntries = (list) => setData((p) => ({ ...p, entries: [...list.map((e) => ({ ...e, id: uid(), cardId: card.id })), ...p.entries] }));
  const removeEntry = (id) => setData((p) => ({ ...p, entries: p.entries.filter((e) => e.id !== id) }));

  const plans = data.entries.filter((e) => e.cardId === card.id && e.kind === "installment" && (parseInt(e.months) || 1) > 1)
    .map((e) => ({ ...e, n: parseInt(e.months), done: expand([e]).filter((l) => l.date <= today()).length }))
    .filter((p) => p.done < p.n);

  const upload = async (files) => {
    const list = [...(files || [])].filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;
    const rows = [];
    try {
      for (let i = 0; i < list.length; i++) {
        setScanning({ i: i + 1, n: list.length });
        rows.push(...parseStatementText(await readImage(list[i]), cycle));
      }
    } catch (err) {
      console.error("Statement OCR failed:", err);
      toast(tr("Couldn't read that statement. Try a sharper photo.", "อ่านใบแจ้งยอดไม่สำเร็จ ลองรูปที่ชัดขึ้น"));
    }
    setScanning(null);
    setSheet({ rows });
  };

  const items = [...stmt.lines, ...stmt.payments.map((e) => ({ ...e, entryId: e.id, idx: 0, portion: e.amount, label: e.note }))];

  return (
    <FullPage title={card.name} backLabel={tr("Cards", "บัตร")} onBack={onBack}
      action={<button className="icon-btn plain" onClick={onEdit} aria-label={tr("Edit card", "แก้ไขบัตร")}><Pencil size={20} /></button>}>
      <div className="page" style={{ marginTop: "1rem" }}>
        <CardFace c={card} balance={outstanding(card, data.entries)} tr={tr} />
      </div>
      <div className="page" style={{ marginTop: "1.25rem" }}>
        <Switcher label={tr(`${monthLabel} statement`, `ใบแจ้งยอด ${monthLabel}`)}
          onPrev={() => setCycle(norm(cycle.y, cycle.m - 1))} onNext={() => setCycle(norm(cycle.y, cycle.m + 1))} />
        <p className="caption" style={{ textAlign: "center", margin: "0.375rem 0 0" }}>
          {fmtDay(stmt.start, lang)} – {fmtDay(stmt.end, lang)}{closed ? "" : ` · ${tr("still open", "ยังไม่ตัดรอบ")}`}
        </p>
      </div>

      <div className="summary">
        <p className="caption" style={{ margin: 0 }}>{tr("To pay", "ยอดที่ต้องชำระ")} · {tr("due", "ภายใน")} {fmtDay(stmt.due, lang)}</p>
        <Money value={stmt.totalDue} />
      </div>
      <div className="section" style={{ marginTop: "0.75rem" }}>
        <dl className="kv">
          <div><dt>{tr("Spending", "ใช้จ่าย")}</dt><dd>{fmt(stmt.spending)}</dd></div>
          <div><dt>{tr("Installments", "ยอดผ่อน")}</dt><dd>{fmt(stmt.installments)}</dd></div>
          <div><dt>{tr("Interest and fees", "ดอกเบี้ย/ค่าธรรมเนียม")}</dt><dd className={stmt.charges > 0 ? "warn" : ""}>{fmt(stmt.charges)}</dd></div>
          <div><dt>{tr("Cashback", "เงินคืน")}</dt><dd className={stmt.cashback > 0 ? "pos" : ""}>{stmt.cashback > 0 ? "−" : ""}{fmt(stmt.cashback)}</dd></div>
        </dl>
      </div>

      <div className="page stack" style={{ marginTop: "1.25rem" }}>
        {closed && stmt.totalDue > 0 && (unpaid > 0 ? (
          <button className="btn btn-primary btn-block" onClick={() => { addEntries([{ kind: "payment", amount: round2(unpaid), note: tr("Statement payment", "ชำระใบแจ้งยอด"), date: today() > stmt.end ? today() : nextDay(stmt.end) }]); toast(tr("Marked as paid", "บันทึกการชำระแล้ว")); }}>
            <Check size={20} />{tr(`Mark ${fmt(unpaid)} as paid`, `บันทึกว่าชำระ ${fmt(unpaid)} แล้ว`)}
          </button>
        ) : (
          <p className="pos strong" style={{ textAlign: "center", margin: 0 }}>{tr(`Paid ${fmt(stmt.paid)}`, `ชำระแล้ว ${fmt(stmt.paid)}`)}</p>
        ))}
        <div className="stack">
          <button className="btn btn-secondary btn-block" onClick={() => setSheet("entry")}><Plus size={20} />{tr("Add an item", "เพิ่มรายการ")}</button>
          <label className="btn btn-secondary btn-block" style={{ cursor: scanning ? "wait" : "pointer" }}>
            <Upload size={20} />{scanning ? `${scanning.i}/${scanning.n}…` : tr("Scan statement", "สแกนใบแจ้งยอด")}
            <input type="file" accept="image/*" multiple hidden disabled={!!scanning} onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
          </label>
        </div>
      </div>

      {plans.length > 0 && (
        <Section title={tr("Installment plans", "แผนผ่อนชำระ")}>
          <div className="group">
            {plans.map((p) => (
              <Row key={p.id} title={p.note || tr("Installment", "ผ่อนชำระ")} value={`${fmt(p.amount / p.n)}`} valueSub={tr("a month", "ต่อเดือน")}
                sub={tr(`${p.done} of ${p.n} paid · ${fmt(p.amount - (p.amount / p.n) * p.done)} left`, `จ่ายแล้ว ${p.done}/${p.n} งวด · เหลือ ${fmt(p.amount - (p.amount / p.n) * p.done)}`)}>
                <div className="row-bar"><Bar pct={p.done / p.n} /></div>
              </Row>
            ))}
          </div>
        </Section>
      )}

      <Section title={tr(`This statement · ${items.length}`, `รายการรอบนี้ · ${items.length}`)}>
        {items.length === 0 ? (
          <div className="group"><p className="empty-sub" style={{ padding: "1.25rem", margin: 0, textAlign: "center" }}>{tr("Nothing in this cycle yet.", "ยังไม่มีรายการในรอบนี้")}</p></div>
        ) : (
          <div className="group">
            {items.map((l) => {
              const k = KINDS[l.kind];
              const cat = l.kind === "purchase" || l.kind === "installment" ? getCat(l.category, lang) : null;
              const isPlan = l.kind === "installment" && (parseInt(l.months) || 1) > 1;
              return (
                <Row key={`${l.entryId}_${l.idx}`} icon={<CatIcon cat={cat && l.kind === "purchase" ? cat : { icon: k.icon, bar: k.sign < 0 ? "#2E9D6A" : l.kind === "interest" || l.kind === "fee" ? "#C9A227" : "#7C8796" }} />}
                  title={l.label || tr(k.en, k.th)} sub={`${fmtDay(l.date, lang)} · ${tr(k.en, k.th)}`}
                  value={(k.sign < 0 ? "−" : "") + fmt(l.portion)} valueClass={k.sign < 0 ? "pos" : ""}
                  onClick={() => setSheet({ item: { ...l, isPlan } })} />
              );
            })}
          </div>
        )}
      </Section>

      {sheet === "entry" && <EntryForm cardName={card.name} lang={lang} tr={tr} defaultDate={closed ? stmt.end : today()}
        onClose={() => setSheet(null)} onSave={(e) => { addEntries([e]); setSheet(null); toast(tr("Saved", "บันทึกแล้ว")); }} />}
      {sheet?.item && <ItemSheet item={sheet.item} lang={lang} tr={tr} onClose={() => setSheet(null)} onDelete={() => { removeEntry(sheet.item.entryId); setSheet(null); }} />}
      {sheet?.rows && <ImportReview rows={sheet.rows} lang={lang} tr={tr} onClose={() => setSheet(null)}
        onSave={(list) => { addEntries(list); setSheet(null); toast(tr(`Added ${list.length} items`, `เพิ่ม ${list.length} รายการ`)); }} />}
    </FullPage>
  );
}

// One card item. Deleting a single month of an installment plan removes the whole plan, so it says so.
function ItemSheet({ item, lang, tr, onClose, onDelete }) {
  const k = KINDS[item.kind];
  return (
    <Sheet title={item.label || tr(k.en, k.th)} onClose={onClose}>
      <div className="amount"><span className={"display-sm" + (k.sign < 0 ? " pos" : "")}>{(k.sign < 0 ? "−" : "") + fmt(item.portion)}</span></div>
      <div className="group" style={{ marginBottom: "1.25rem" }}>
        <Row title={tr("Type", "ประเภท")} value={tr(k.en, k.th)} />
        <Row title={tr("Date", "วันที่")} value={fmtDay(item.date, lang)} />
        {item.isPlan && <Row title={tr("Installment plan", "แผนผ่อน")} sub={tr(`${fmt(item.amount)} over ${item.months} months`, `${fmt(item.amount)} ผ่อน ${item.months} เดือน`)} />}
      </div>
      <ConfirmButton confirmLabel={tr("Tap again to delete", "แตะอีกครั้งเพื่อลบ")} onConfirm={onDelete}>
        {item.isPlan ? tr("Delete the whole plan", "ลบทั้งแผนผ่อน") : tr("Delete", "ลบรายการ")}
      </ConfirmButton>
    </Sheet>
  );
}

function CardForm({ initial, tr, onSave, onDelete, onClose }) {
  const [f, setF] = useState(() => initial
    ? { ...initial, limit: String(initial.limit || ""), cutoffDay: String(initial.cutoffDay), dueDay: String(initial.dueDay) }
    : { name: "", last4: "", limit: "", cutoffDay: "25", dueDay: "10", color: CARD_COLORS[0] });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const day = (v) => Math.min(Math.max(parseInt(v) || 1, 1), 31);
  return (
    <Sheet title={initial ? tr("Edit card", "แก้ไขบัตร") : tr("Add a card", "เพิ่มบัตร")} onClose={onClose}>
      <Field label={tr("Card name", "ชื่อบัตร")}><input className="input" maxLength={40} value={f.name} onChange={set("name")} placeholder="KBank Platinum" autoFocus /></Field>
      <div className="btn-row">
        <Field label={tr("Last 4 digits", "เลขท้าย 4 หลัก")}><input className="input" inputMode="numeric" value={f.last4} onChange={(e) => setF((p) => ({ ...p, last4: e.target.value.replace(/\D/g, "").slice(0, 4) }))} placeholder="1234" /></Field>
        <Field label={tr("Credit limit", "วงเงิน")}><input className="input" inputMode="decimal" value={f.limit} onChange={set("limit")} placeholder="50000" /></Field>
      </div>
      <div className="btn-row">
        <Field label={tr("Statement day", "วันตัดรอบ")}><input className="input" inputMode="numeric" value={f.cutoffDay} onChange={set("cutoffDay")} /></Field>
        <Field label={tr("Payment due day", "วันครบกำหนด")}><input className="input" inputMode="numeric" value={f.dueDay} onChange={set("dueDay")} /></Field>
      </div>
      <Field group label={tr("Colour", "สี")}>
        <div className="swatches">
          {CARD_COLORS.map((c) => <button key={c} type="button" className="swatch" style={{ background: c }} aria-pressed={f.color === c} aria-label={c} onClick={() => setF((p) => ({ ...p, color: c }))} />)}
        </div>
      </Field>
      <div className="stack">
        <button className="btn btn-primary btn-block" disabled={!f.name.trim()}
          onClick={() => onSave({ name: f.name.trim(), last4: f.last4, color: f.color, limit: parseFloat(f.limit) || 0, cutoffDay: day(f.cutoffDay), dueDay: day(f.dueDay) })}>
          {tr("Save card", "บันทึกบัตร")}
        </button>
        {onDelete && <ConfirmButton confirmLabel={tr("Tap again to delete the card and its items", "แตะอีกครั้งเพื่อลบบัตรและรายการ")} onConfirm={onDelete}>{tr("Delete card", "ลบบัตร")}</ConfirmButton>}
      </div>
    </Sheet>
  );
}

function EntryForm({ cardName, lang, tr, defaultDate, onSave, onClose }) {
  const [kind, setKind] = useState("purchase");
  const [f, setF] = useState({ amount: "", months: "10", note: "", date: defaultDate, category: "Shopping" });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const amt = parseFloat(String(f.amount).replace(/,/g, "")) || 0;
  const months = Math.max(1, parseInt(f.months) || 1);
  const isSpend = kind === "purchase" || kind === "installment";
  return (
    <Sheet title={tr(`Add to ${cardName}`, `เพิ่มใน ${cardName}`)} onClose={onClose}>
      <Field group label={tr("What is it?", "ประเภท")}>
        <div className="chips">
          {Object.entries(KINDS).map(([k, v]) => <button key={k} className="chip" aria-pressed={kind === k} onClick={() => setKind(k)}><Glyph icon={v.icon} size={18} /> {lang === "TH" ? v.th : v.en}</button>)}
        </div>
      </Field>
      <AmountInput value={f.amount} autoFocus onChange={(v) => setF((p) => ({ ...p, amount: v }))} label={kind === "installment" ? tr("Full price", "ราคาเต็ม") : tr("Amount", "จำนวนเงิน")} />
      {kind === "installment" && (
        <Field group label={tr("Number of months", "จำนวนงวด")} hint={amt > 0 ? tr(`About ${fmt(amt / months)} a month`, `ประมาณ ${fmt(amt / months)} ต่อเดือน`) : tr("Enter the full price above.", "กรอกราคาเต็มด้านบน")}>
          <Segmented label={tr("Months", "งวด")} value={String(months)} onChange={(v) => setF((p) => ({ ...p, months: v }))} options={[3, 4, 6, 10, 12].map((n) => [String(n), String(n)])} />
        </Field>
      )}
      {isSpend && (
        <Field group label={tr("Category", "หมวดหมู่")}>
          <div className="cat-grid">
            {expenseCats(lang).map((c) => <button key={c.value} type="button" className="cat-tile" aria-pressed={f.category === c.value} onClick={() => setF((p) => ({ ...p, category: c.value }))}><CatIcon cat={c} small /><span>{c.labelShort}</span></button>)}
          </div>
        </Field>
      )}
      <Field label={tr("Note", "บันทึก")}><input className="input" maxLength={120} value={f.note} onChange={set("note")} placeholder={tr("Optional", "ไม่บังคับ")} /></Field>
      <Field label={kind === "installment" ? tr("First payment month", "งวดแรก") : tr("Date", "วันที่")}><input className="input" type="date" value={f.date} onChange={set("date")} /></Field>
      <button className="btn btn-primary btn-block" disabled={amt <= 0}
        onClick={() => onSave({ kind, amount: round2(amt), months: kind === "installment" ? months : undefined, note: f.note.trim(), date: f.date, category: isSpend ? f.category : "Bills" })}>
        {tr("Save", "บันทึก")}
      </button>
    </Sheet>
  );
}

function ImportReview({ rows: initialRows, lang, tr, onSave, onClose }) {
  const [rows, setRows] = useState(initialRows);
  const upd = (id, patch) => setRows((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const chosen = rows.filter((r) => r.on);
  return (
    <Sheet title={tr("Check the statement", "ตรวจสอบใบแจ้งยอด")} onClose={onClose}>
      {rows.length === 0 ? (
        <p className="empty-sub">{tr("No lines with a date and amount were found. Try a sharper, straight-on photo of the list of charges.", "ไม่พบรายการที่มีวันที่และยอดเงิน ลองถ่ายรูปให้ชัดและตรงขึ้น")}</p>
      ) : (
        <>
          <p className="caption" style={{ marginTop: 0 }}>{tr("Untick anything that isn't a charge.", "เอาเครื่องหมายออกหากไม่ใช่รายการ")}</p>
          <div className="stack">
            {rows.map((r) => (
              <div key={r.id} className="panel" style={{ opacity: r.on ? 1 : 0.5 }}>
                <div className="hstack">
                  <input type="checkbox" checked={r.on} onChange={(e) => upd(r.id, { on: e.target.checked })} style={{ width: "1.5rem", height: "1.5rem" }} aria-label={tr("Include", "รวมรายการนี้")} />
                  <input className="input" value={r.note} onChange={(e) => upd(r.id, { note: e.target.value })} aria-label={tr("Description", "รายละเอียด")} />
                </div>
                <div className="btn-row" style={{ marginTop: "0.5rem" }}>
                  <input className="input" inputMode="decimal" value={r.amount} onChange={(e) => upd(r.id, { amount: e.target.value })} aria-label={tr("Amount", "จำนวนเงิน")} />
                  <input className="input" type="date" value={r.date} onChange={(e) => upd(r.id, { date: e.target.value })} aria-label={tr("Date", "วันที่")} />
                </div>
                <div className="btn-row" style={{ marginTop: "0.5rem" }}>
                  <select className="input" value={r.kind} onChange={(e) => upd(r.id, { kind: e.target.value })} aria-label={tr("Type", "ประเภท")}>
                    {Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{lang === "TH" ? v.th : v.en}</option>)}
                  </select>
                  {(r.kind === "purchase" || r.kind === "installment") && (
                    <select className="input" value={r.category} onChange={(e) => upd(r.id, { category: e.target.value })} aria-label={tr("Category", "หมวดหมู่")}>
                      {expenseCats(lang).map((c) => <option key={c.value} value={c.value}>{c.labelShort}</option>)}
                    </select>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      <button className="btn btn-primary btn-block" style={{ marginTop: "1rem" }} disabled={!chosen.length}
        onClick={() => onSave(chosen.map((r) => ({ kind: r.kind, amount: round2(parseFloat(r.amount) || 0), note: r.note.trim(), date: r.date, category: r.kind === "purchase" || r.kind === "installment" ? r.category : "Bills" })).filter((r) => r.amount > 0))}>
        {tr(`Add ${chosen.length} items`, `เพิ่ม ${chosen.length} รายการ`)}
      </button>
    </Sheet>
  );
}
