import { useState } from "react";
import { Plus, Download, Pencil, Trash2, Archive, RotateCcw } from "lucide-react";
import { Section, Row, CatIcon, Segmented, Switch, FullPage, Sheet, Field, Empty } from "../ui/kit";
import { expenseCats, incomeCats, getCat } from "../lib/categories";
import { fmt } from "../lib/core";

const SIZES = [0.9, 1, 1.1, 1.2, 1.3];

export default function Settings(props) {
  const { lang, setLang, dark, setDark, textScale, setTextScale, profile, setProfile, budgets, subscriptions, txCount, onExport, alertCount, onBackup, onRestore, storageUsed } = props;
  const tr = (en, th) => (lang === "TH" ? th : en);
  const [page, setPage] = useState(null); // "budgets" | "categories" | "repeating"
  const budgetCount = (parseFloat(budgets.total) > 0 ? 1 : 0) + Object.values(budgets.categories || {}).filter((v) => parseFloat(v) > 0).length;

  return (
    <>
      <header className="topbar"><h1 className="title">{tr("Settings", "ตั้งค่า")}</h1></header>

      <Section title={tr("Your name", "ชื่อของคุณ")} note={tr("Shown as you in Groups.", "ใช้แสดงเป็นคุณในแท็บกลุ่ม")}>
        <input className="input" maxLength={40} value={profile.name} placeholder={tr("Your name", "ชื่อของคุณ")} aria-label={tr("Your name", "ชื่อของคุณ")}
          onChange={(e) => { const name = e.target.value; setProfile({ name, initials: (name.trim() || "You").slice(0, 2).toUpperCase() }); }} />
      </Section>

      <Section title={tr("Display", "การแสดงผล")}>
        <div className="group">
          <div className="row" style={{ flexDirection: "column", alignItems: "stretch", gap: "0.625rem" }}>
            <div className="hstack" style={{ justifyContent: "space-between" }}>
              <span className="row-title">{tr("Text size", "ขนาดตัวอักษร")}</span>
              <span className="caption">{Math.round(textScale * 100)}%</span>
            </div>
            <div className="seg" role="group" aria-label={tr("Text size", "ขนาดตัวอักษร")}>
              {SIZES.map((s) => (
                <button key={s} aria-pressed={Math.abs(textScale - s) < 0.01} onClick={() => setTextScale(s)} aria-label={`${Math.round(s * 100)}%`}
                  style={{ fontSize: `${s * 0.95}rem` }}>A</button>
              ))}
            </div>
          </div>
          <div className="row">
            <span className="row-main row-title">{tr("Dark mode", "โหมดมืด")}</span>
            <Switch checked={dark} onChange={setDark} label={tr("Dark mode", "โหมดมืด")} />
          </div>
          <div className="row">
            <span className="row-main row-title">{tr("Language", "ภาษา")}</span>
            <div style={{ width: "11rem" }}>
              <Segmented label={tr("Language", "ภาษา")} value={lang} onChange={setLang} options={[["EN", "English"], ["TH", "ไทย"]]} />
            </div>
          </div>
        </div>
      </Section>

      <Section title={tr("Money", "การเงิน")}>
        <div className="group">
          <Row chevron onClick={() => setPage("budgets")} title={tr("Budgets", "งบประมาณ")}
            value={alertCount > 0 ? <span className="warn">{tr(`${alertCount} near limit`, `ใกล้เต็ม ${alertCount}`)}</span> : budgetCount ? <span className="muted" style={{ fontWeight: 400 }}>{budgetCount}</span> : null} />
          <Row chevron onClick={() => setPage("categories")} title={tr("Categories", "หมวดหมู่")} />
          <Row chevron onClick={() => setPage("repeating")} title={tr("Repeating payments", "รายจ่ายประจำ")}
            value={subscriptions.length ? <span className="muted" style={{ fontWeight: 400 }}>{subscriptions.length}</span> : null} />
        </div>
      </Section>

      <Section title={tr("Your data", "ข้อมูลของคุณ")}
        note={tr(`Stored only on this device, never sent anywhere. Using ${(storageUsed / 1024).toFixed(0)} KB of about 5,000 KB. Save a backup now and then in case this browser's data is cleared.`,
          `เก็บไว้ในเครื่องนี้เท่านั้น ไม่ส่งไปที่ใด ใช้ไป ${(storageUsed / 1024).toFixed(0)} KB จากประมาณ 5,000 KB ควรบันทึกข้อมูลสำรองเป็นระยะ`)}>
        <div className="group">
          <Row onClick={onBackup} icon={<span className="icon icon-sm"><Archive size={18} /></span>}
            title={tr("Save a backup", "บันทึกข้อมูลสำรอง")} sub={tr("Everything, as one file", "ข้อมูลทั้งหมดในไฟล์เดียว")} />
          <label className="row" style={{ cursor: "pointer" }}>
            <span className="icon icon-sm"><RotateCcw size={18} /></span>
            <span className="row-main"><span className="row-title" style={{ display: "block" }}>{tr("Restore from backup", "กู้คืนจากข้อมูลสำรอง")}</span><span className="row-sub" style={{ display: "block" }}>{tr("Replaces what is on this device", "แทนที่ข้อมูลในเครื่องนี้")}</span></span>
            <input type="file" accept="application/json,.json" hidden onChange={(e) => { onRestore(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          <Row onClick={onExport} icon={<span className="icon icon-sm"><Download size={18} /></span>}
            title={tr("Export as spreadsheet (CSV)", "ส่งออกเป็นไฟล์ CSV")} sub={tr(`${txCount} items`, `${txCount} รายการ`)} />
        </div>
      </Section>

      {page === "budgets" && <BudgetsPage {...props} tr={tr} onBack={() => setPage(null)} />}
      {page === "categories" && <CategoriesPage {...props} tr={tr} onBack={() => setPage(null)} />}
      {page === "repeating" && <RepeatingPage {...props} tr={tr} onBack={() => setPage(null)} />}
    </>
  );
}

function BudgetsPage({ lang, budgets, setBudgets, catSpent, monthSpent, tr, onBack }) {
  const num = (v) => v.replace(/[^\d.]/g, "");
  return (
    <FullPage title={tr("Budgets", "งบประมาณ")} backLabel={tr("Settings", "ตั้งค่า")} onBack={onBack}>
      <Section title={tr("Monthly budget", "งบต่อเดือน")} note={tr(`Spent so far this month: ${fmt(monthSpent)}`, `เดือนนี้ใช้ไปแล้ว ${fmt(monthSpent)}`)}>
        <input className="input" inputMode="decimal" placeholder={tr("No limit", "ไม่จำกัด")} value={budgets.total || ""} style={{ fontSize: "1.375rem", fontWeight: 600 }}
          aria-label={tr("Monthly budget in baht", "งบต่อเดือน (บาท)")} onChange={(e) => setBudgets({ ...budgets, total: num(e.target.value) })} />
      </Section>
      <Section title={tr("Per category", "แยกตามหมวด")} note={tr("Leave blank for no limit.", "เว้นว่างไว้หากไม่ต้องการจำกัด")}>
        <div className="group">
          {expenseCats(lang).map((c) => (
            <div key={c.value} className="row">
              <CatIcon cat={c} />
              <div className="row-main">
                <div className="row-title">{c.label}</div>
                <div className="row-sub">{tr("Spent", "ใช้ไป")} {fmt(catSpent[c.value] || 0)}</div>
              </div>
              <input className="input input-inline" inputMode="decimal" placeholder={tr("No limit", "ไม่จำกัด")} value={budgets.categories?.[c.value] || ""}
                aria-label={`${c.label} ${tr("budget", "งบ")}`} onChange={(e) => setBudgets({ ...budgets, categories: { ...budgets.categories, [c.value]: num(e.target.value) } })} />
            </div>
          ))}
        </div>
      </Section>
    </FullPage>
  );
}

function CategoriesPage({ lang, onEditCategory, onDeleteCategory, countCatTxns, tr, onBack }) {
  const [confirm, setConfirm] = useState(null); // { type, cat, count }
  const remove = (type, cat) => {
    const count = countCatTxns(type, cat.value);
    if (count > 0) setConfirm({ type, cat, count });
    else onDeleteCategory(type, cat.value, "delete");
  };
  return (
    <FullPage title={tr("Categories", "หมวดหมู่")} backLabel={tr("Settings", "ตั้งค่า")} onBack={onBack}>
      {[["expense", tr("Expenses", "รายจ่าย"), expenseCats(lang)], ["income", tr("Income", "รายรับ"), incomeCats(lang)]].map(([type, title, list]) => (
        <Section key={type} title={title} action={<button className="link" onClick={() => onEditCategory(type, null)}><Plus size={18} />{tr("Add", "เพิ่ม")}</button>}>
          <div className="group">
            {list.map((c) => (
              <Row key={c.value} icon={<CatIcon cat={c} />} title={c.label}
                after={<>
                  <button className="icon-btn plain" onClick={() => onEditCategory(type, c)} aria-label={tr(`Edit ${c.label}`, `แก้ไข ${c.label}`)}><Pencil size={18} /></button>
                  <button className="icon-btn plain" onClick={() => remove(type, c)} aria-label={tr(`Delete ${c.label}`, `ลบ ${c.label}`)}><Trash2 size={18} /></button>
                </>} />
            ))}
          </div>
        </Section>
      ))}
      {confirm && (
        <Sheet title={tr(`Delete “${confirm.cat.label}”?`, `ลบ “${confirm.cat.label}”?`)} onClose={() => setConfirm(null)}>
          <p style={{ marginTop: 0 }}>{tr(`${confirm.count} items use this category. What should happen to them?`, `มี ${confirm.count} รายการที่ใช้หมวดนี้ จะทำอย่างไรกับรายการเหล่านั้น`)}</p>
          <div className="stack">
            <button className="btn btn-secondary btn-block" onClick={() => { onDeleteCategory(confirm.type, confirm.cat.value, "reassign"); setConfirm(null); }}>
              {tr("Keep them as “Uncategorized”", "เก็บไว้เป็น “ไม่มีหมวดหมู่”")}
            </button>
            <button className="btn btn-danger btn-block" onClick={() => { onDeleteCategory(confirm.type, confirm.cat.value, "delete"); setConfirm(null); }}>
              {tr(`Delete the ${confirm.count} items too`, `ลบ ${confirm.count} รายการด้วย`)}
            </button>
          </div>
        </Sheet>
      )}
    </FullPage>
  );
}

function RepeatingPage({ lang, subscriptions, setSubscriptions, tr, onBack }) {
  const blank = { name: "", amount: "", category: "Bills", day: "1" };
  const [form, setForm] = useState(null);
  const amt = parseFloat(form?.amount) || 0;
  return (
    <FullPage title={tr("Repeating payments", "รายจ่ายประจำ")} backLabel={tr("Settings", "ตั้งค่า")} onBack={onBack}
      action={<button className="icon-btn plain" onClick={() => setForm(blank)} aria-label={tr("Add", "เพิ่ม")}><Plus size={22} /></button>}>
      <Section note={tr("Each one is added to your spending automatically on its day.", "ระบบจะเพิ่มเป็นรายจ่ายให้อัตโนมัติตามวันที่กำหนด")}>
        {subscriptions.length === 0 ? (
          <div className="group"><Empty title={tr("No repeating payments", "ยังไม่มีรายจ่ายประจำ")} sub={tr("Add rent, phone, streaming and other bills that come every month.", "เพิ่มค่าเช่า ค่าโทรศัพท์ หรือบิลรายเดือนอื่นๆ")}>
            <button className="btn btn-primary" style={{ marginTop: "1rem" }} onClick={() => setForm(blank)}><Plus size={20} />{tr("Add one", "เพิ่ม")}</button>
          </Empty></div>
        ) : (
          <div className="group">
            {subscriptions.map((s) => {
              const c = getCat(s.category, lang);
              return (
                <Row key={s.id} icon={<CatIcon cat={c} />} title={s.name} sub={tr(`Every month on day ${s.day}`, `ทุกเดือน วันที่ ${s.day}`)} value={fmt(s.amount)}
                  after={<button className="icon-btn plain" onClick={() => setSubscriptions((p) => p.filter((x) => x.id !== s.id))} aria-label={tr(`Remove ${s.name}`, `ลบ ${s.name}`)}><Trash2 size={18} /></button>} />
              );
            })}
          </div>
        )}
      </Section>
      {form && (
        <Sheet title={tr("Repeating payment", "รายจ่ายประจำ")} onClose={() => setForm(null)}>
          <Field label={tr("Name", "ชื่อ")}><input className="input" maxLength={60} autoFocus value={form.name} placeholder="Netflix" onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <div className="btn-row">
            <Field label={tr("Amount", "จำนวนเงิน")}><input className="input" inputMode="decimal" value={form.amount} placeholder="0" onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
            <Field label={tr("Day of month", "วันที่ของเดือน")}><input className="input" inputMode="numeric" value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value.replace(/\D/g, "").slice(0, 2) })} /></Field>
          </div>
          <Field group label={tr("Category", "หมวดหมู่")}>
            <div className="cat-grid">
              {expenseCats(lang).map((c) => <button key={c.value} type="button" className="cat-tile" aria-pressed={form.category === c.value} onClick={() => setForm({ ...form, category: c.value })}><CatIcon cat={c} small /><span>{c.labelShort}</span></button>)}
            </div>
          </Field>
          <button className="btn btn-primary btn-block" disabled={!form.name.trim() || amt <= 0}
            onClick={() => { setSubscriptions((p) => [...p, { id: crypto.randomUUID?.() || String(Date.now()), name: form.name.trim(), amount: amt, category: form.category, day: String(Math.min(Math.max(parseInt(form.day) || 1, 1), 31)) }]); setForm(null); }}>
            {tr("Save", "บันทึก")}
          </button>
        </Sheet>
      )}
    </FullPage>
  );
}
