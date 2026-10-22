import { useState } from "react";
import { Sheet, Field, CatIcon } from "../ui/kit";
import { Glyph, CATEGORY_ICON_KEYS, iconKey } from "../ui/icons";
import { CAT_COLORS } from "../lib/categories";
import { uid } from "../lib/core";

// Add or edit a category: name, icon and chart colour.
export default function CategorySheet({ type, initial, lang, onSave, onClose }) {
  const tr = (en, th) => (lang === "TH" ? th : en);
  const [name, setName] = useState(initial?.label || "");
  const [icon, setIcon] = useState(iconKey(initial?.icon) || CATEGORY_ICON_KEYS[0]);
  const [color, setColor] = useState(CAT_COLORS.includes(initial?.bar) ? initial.bar : CAT_COLORS[0]);
  const [error, setError] = useState("");

  const save = () => {
    const label = name.trim();
    if (!label) { setError(tr("Enter a name.", "กรอกชื่อหมวดหมู่")); return; }
    // Saving drops the built-in EN/TH names so the chosen name sticks in both languages.
    onSave({ value: initial?.value || "c_" + uid().slice(0, 8), label, labelShort: label, icon, bar: color, pastelBg: color + "22", pastelText: color, custom: true });
  };

  const kind = type === "income" ? tr("income", "รายรับ") : tr("expense", "รายจ่าย");
  return (
    <Sheet title={initial ? tr(`Edit ${kind} category`, `แก้ไขหมวด${kind}`) : tr(`New ${kind} category`, `หมวด${kind}ใหม่`)} onClose={onClose}>
      <div className="row" style={{ padding: "0.5rem 0 1.25rem" }}>
        <CatIcon cat={{ icon }} color={color} />
        <span className="row-title">{name.trim() || tr("Category name", "ชื่อหมวดหมู่")}</span>
      </div>
      <Field label={tr("Name", "ชื่อ")}>
        <input className="input" maxLength={40} value={name} autoFocus placeholder={tr("e.g. Coffee", "เช่น กาแฟ")} onChange={(e) => { setName(e.target.value); setError(""); }} />
      </Field>
      {error && <p className="error">{error}</p>}
      <Field group label={tr("Icon", "ไอคอน")}>
        <div className="icon-pick">
          {CATEGORY_ICON_KEYS.map((k) => <button key={k} type="button" aria-pressed={icon === k} aria-label={k} onClick={() => setIcon(k)} style={icon === k ? { color } : undefined}><Glyph icon={k} size={22} /></button>)}
        </div>
      </Field>
      <Field group label={tr("Chart colour", "สีในกราฟ")}>
        <div className="swatches">
          {CAT_COLORS.map((c) => <button key={c} type="button" className="swatch" style={{ background: c }} aria-pressed={color === c} aria-label={c} onClick={() => setColor(c)} />)}
        </div>
      </Field>
      <button className="btn btn-primary btn-block" onClick={save}>{initial ? tr("Save changes", "บันทึกการแก้ไข") : tr("Add category", "เพิ่มหมวดหมู่")}</button>
    </Sheet>
  );
}
