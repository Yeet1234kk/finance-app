import { useRef, useState } from "react";
import { Plus, ScanLine, Search, X, AlertTriangle, Trash2 } from "lucide-react";
import { Section, Empty, Money, Ring } from "../ui/kit";
import { Glyph } from "../ui/icons";
import TxList from "../ui/TxList";
import { expenseCats } from "../lib/categories";
import { fmt, monthName, currentMonth, budgetTone } from "../lib/core";

export default function Home({ lang, stats, monthTxns, pending, budgetTotal, alertCount, onDismissAlerts, onAdd, onScanFiles, scanning, onOpenTx, onEditPending, onFilePending, onDeletePending, onOpenReports }) {
  const tr = (en, th) => (lang === "TH" ? th : en);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const fileRef = useRef(null);
  const { spent, income } = stats;
  const left = income - spent;
  const budgetPct = budgetTotal > 0 ? spent / budgetTotal : 0;

  const q = query.trim().toLowerCase();
  const shown = !q ? monthTxns : monthTxns.filter((tx) =>
    (tx.note || "").toLowerCase().includes(q) || tx.category.toLowerCase().includes(q) || String(tx.amount).includes(q));

  return (
    <>
      <header className="topbar">
        <div>
          <p className="caption" style={{ margin: 0 }}>{new Date().toLocaleDateString(lang === "TH" ? "th-TH" : "en-US", { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="title">{monthName(currentMonth(), lang)}</h1>
        </div>
        <button className="icon-btn" aria-label={searchOpen ? tr("Close search", "ปิดการค้นหา") : tr("Search", "ค้นหา")}
          onClick={() => { setSearchOpen((s) => !s); setQuery(""); }}>
          {searchOpen ? <X size={20} /> : <Search size={20} />}
        </button>
      </header>

      {searchOpen && (
        <div className="page" style={{ marginTop: "0.75rem" }}>
          <input className="input" autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder={tr("Search notes, categories, amounts", "ค้นหาบันทึก หมวดหมู่ จำนวนเงิน")} aria-label={tr("Search", "ค้นหา")} />
        </div>
      )}

      {!searchOpen && (
        <section className="hero" aria-label={tr("This month", "เดือนนี้")}>
          <div className="hero-top">
            <div>
              <p className="caption" style={{ margin: 0 }}>{tr("Spent this month", "ใช้ไปเดือนนี้")}</p>
              <Money value={spent} />
            </div>
            {(budgetTotal > 0 || income > 0) && (
              <Ring pct={budgetTotal > 0 ? budgetPct : spent / income} tone={budgetTone(budgetTotal > 0 ? budgetPct : spent / income)}>
                <span>{Math.round((budgetTotal > 0 ? budgetPct : spent / income) * 100)}%<small>{budgetTotal > 0 ? tr("of budget", "ของงบ") : tr("of income", "ของรายรับ")}</small></span>
              </Ring>
            )}
          </div>
          <dl className="hero-stats">
            <div><dt>{tr("Income", "รายรับ")}</dt><dd className={income > 0 ? "pos" : ""}>{fmt(income)}</dd></div>
            {budgetTotal > 0 ? (
              <div><dt>{spent > budgetTotal ? tr("Over budget", "เกินงบ") : tr("Left in budget", "งบคงเหลือ")}</dt><dd className={spent > budgetTotal ? "neg" : ""}>{fmt(Math.abs(budgetTotal - spent))}</dd></div>
            ) : (
              <div><dt>{left >= 0 ? tr("Left", "คงเหลือ") : tr("Over by", "เกิน")}</dt><dd className={left < 0 ? "neg" : ""}>{fmt(Math.abs(left))}</dd></div>
            )}
          </dl>
        </section>
      )}

      {!searchOpen && alertCount > 0 && (
        <div className="page" style={{ marginTop: "1rem" }}>
          <div className="notice">
            <AlertTriangle size={20} className="warn" />
            <button className="link" style={{ flex: 1, justifyContent: "flex-start", padding: 0, fontWeight: 500, textAlign: "left" }} onClick={onOpenReports}>
              {tr(`${alertCount} ${alertCount === 1 ? "budget is" : "budgets are"} close to the limit`, `งบ ${alertCount} รายการใกล้ถึงวงเงิน`)}
            </button>
            <button className="icon-btn plain" onClick={onDismissAlerts} aria-label={tr("Dismiss", "ปิด")}><X size={18} /></button>
          </div>
        </div>
      )}

      {!searchOpen && (
        <div className="page btn-row" style={{ marginTop: "1.25rem" }}>
          <button className="btn btn-primary" onClick={onAdd}><Plus size={20} />{tr("Add", "เพิ่มรายการ")}</button>
          <button className="btn btn-secondary" onClick={() => fileRef.current?.click()} disabled={!!scanning}>
            <ScanLine size={20} />{scanning ? `${scanning.i}/${scanning.n}…` : tr("Scan slip", "สแกนสลิป")}
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { const f = [...(e.target.files || [])]; e.target.value = ""; onScanFiles(f); }} />
        </div>
      )}

      {!searchOpen && pending.length > 0 && (
        <Section title={tr(`Slips to sort · ${pending.length}`, `สลิปรอจัดหมวด · ${pending.length}`)} note={tr("Check the amount, then pick a category.", "ตรวจยอดเงิน แล้วเลือกหมวดหมู่")}>
          <div className="stack">
            {pending.map((tx) => (
              <div key={tx.id} className="panel">
                <div className="hstack">
                  <span className="amount-cur" style={{ fontSize: "1.25rem" }}>฿</span>
                  <input className="input" style={{ fontSize: "1.375rem", fontWeight: 600 }} inputMode="decimal" value={tx.amount || ""} placeholder="0"
                    aria-label={tr("Amount", "จำนวนเงิน")} onChange={(e) => onEditPending(tx.id, { amount: parseFloat(e.target.value.replace(/,/g, "")) || 0 })} />
                  <button className="icon-btn plain" onClick={() => onDeletePending(tx.id)} aria-label={tr("Remove slip", "ลบสลิป")}><Trash2 size={20} /></button>
                </div>
                <input className="input" style={{ margin: "0.625rem 0" }} value={tx.note || ""} placeholder={tr("Note (optional)", "บันทึก (ไม่บังคับ)")}
                  onChange={(e) => onEditPending(tx.id, { note: e.target.value })} aria-label={tr("Note", "บันทึก")} />
                <div className="chips scroll">
                  {expenseCats(lang).map((c) => (
                    <button key={c.value} className="chip" onClick={() => onFilePending(tx.id, c.value)}><Glyph icon={c.icon} size={18} /> {c.labelShort}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {monthTxns.length === 0 ? (
        <Empty title={tr("Nothing recorded this month", "เดือนนี้ยังไม่มีรายการ")} sub={tr("Tap Add to record what you spend or earn.", "แตะ เพิ่มรายการ เพื่อบันทึกรายรับรายจ่าย")} />
      ) : shown.length === 0 ? (
        <Empty title={tr("No matches", "ไม่พบรายการ")} sub={tr(`Nothing this month matches “${query}”.`, `ไม่มีรายการที่ตรงกับ “${query}”`)} />
      ) : (
        <TxList txns={shown} lang={lang} onOpen={onOpenTx} />
      )}
    </>
  );
}
