import { forwardRef, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Glyph } from "./icons";

// Small building blocks shared by every screen. Styling lives in theme.css.

// Bottom sheet. Drag the handle or header down to close it; Escape closes it too.
export function Sheet({ title, onClose, children, action }) {
  const [drag, setDrag] = useState(0);
  const start = useRef(null);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const down = (e) => { if (e.target.closest("button")) return; start.current = e.clientY; e.currentTarget.setPointerCapture?.(e.pointerId); };
  const move = (e) => { if (start.current != null) setDrag(Math.max(0, e.clientY - start.current)); };
  const up = () => { if (start.current == null) return; start.current = null; if (drag > 110) onClose(); else setDrag(0); };
  return (
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && onClose()} style={{ background: drag ? `rgba(0,0,0,${Math.max(0.05, 0.38 - drag / 900)})` : undefined }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}
        style={{ transform: drag ? `translateY(${drag}px)` : undefined, transition: drag && start.current != null ? "none" : "transform 0.25s cubic-bezier(0.32,0.72,0,1)" }}>
        <div className="sheet-head" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <span className="grabber" aria-hidden="true" />
          <h2 className="sheet-title">{title}</h2>
          <div className="hstack">
            {action}
            <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

// Full-screen page pushed over the tabs, with a back button and optional trailing action.
export function FullPage({ title, backLabel, onBack, action, children }) {
  return (
    <div className="fullpage">
      <div className="navbar">
        <button className="back" onClick={onBack}><ChevronLeft size={24} />{backLabel}</button>
        <div className="navbar-title">{title}</div>
        <div style={{ minWidth: "2.75rem", display: "flex", justifyContent: "flex-end" }}>{action}</div>
      </div>
      <div className="fullpage-inner">{children}</div>
    </div>
  );
}

export function Segmented({ options, value, onChange, label }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([v, l]) => (
        <button key={v} aria-pressed={value === v} onClick={() => onChange(v)}>{l}</button>
      ))}
    </div>
  );
}

export function Section({ title, action, note, children, style }) {
  return (
    <section className="section" style={style}>
      {(title || action) && (
        <div className="section-head">
          {title ? <h3 className="section-title">{title}</h3> : <span />}
          {action}
        </div>
      )}
      {children}
      {note && <p className="section-note">{note}</p>}
    </section>
  );
}

export function Row({ icon, title, sub, value, valueSub, valueClass = "", onClick, chevron, children, after }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag className="row" onClick={onClick}>
      {icon}
      <div className="row-main">
        <div className="row-title">{title}</div>
        {sub && <div className="row-sub">{sub}</div>}
        {children}
      </div>
      {(value != null || valueSub) && (
        <div className={"row-value " + valueClass}>
          {value}
          {valueSub && <div className="row-sub">{valueSub}</div>}
        </div>
      )}
      {after}
      {chevron && <ChevronRight size={20} className="row-chev" />}
    </Tag>
  );
}

// Category badge: line icon on a soft tint of the category colour.
export const CatIcon = ({ cat, small, color }) => {
  const c = color || cat?.bar || "var(--ink-3)";
  return (
    <span className={"icon" + (small ? " icon-sm" : "")} aria-hidden="true" style={{ color: c, background: `color-mix(in srgb, ${c} 14%, transparent)` }}>
      <Glyph icon={cat?.icon} size={small ? 16 : 20} />
    </span>
  );
};

// Money set like a price tag: small baht sign, light numerals.
export function Money({ value, className = "display", sign = "" }) {
  const n = Math.abs(Math.round(value || 0));
  return (
    <p className={className + " money"} aria-label={`${sign}${n.toLocaleString("en-US")} baht`}>
      {sign && <span className="money-sign">{sign}</span>}<span className="money-cur">฿</span>{n.toLocaleString("en-US")}
    </p>
  );
}

// Progress ring, the same shape as the app icon.
export function Ring({ pct, size = 88, tone = "", children }) {
  const r = 40, c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(pct, 1));
  return (
    <div className={"ring " + tone} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
        <circle cx="50" cy="50" r={r} className="ring-track" />
        <circle cx="50" cy="50" r={r} className="ring-fill" strokeDasharray={`${c * p} ${c}`} transform="rotate(-90 50 50)" />
      </svg>
      <div className="ring-label">{children}</div>
    </div>
  );
}

export const Avatar = ({ m, small }) => (
  <span className={"avatar" + (small ? " avatar-sm" : "")} style={{ background: m?.color || "var(--ink-3)" }} aria-hidden="true">{m?.initials?.slice(0, 2) || "?"}</span>
);

export function Bar({ pct, tone = "" }) {
  return <div className={"bar " + tone}><i style={{ width: `${Math.max(0, Math.min(pct, 1)) * 100}%` }} /></div>;
}

export function Switch({ checked, onChange, label }) {
  return <button className="switch" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} />;
}

export function Empty({ title, sub, children }) {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      {sub && <p className="empty-sub">{sub}</p>}
      {children}
    </div>
  );
}

export function Switcher({ label, onPrev, onNext, prevDisabled, nextDisabled }) {
  return (
    <div className="switcher">
      <button className="icon-btn" onClick={onPrev} disabled={prevDisabled} aria-label="Previous"><ChevronLeft size={20} /></button>
      <div className="switcher-label">{label}</div>
      <button className="icon-btn" onClick={onNext} disabled={nextDisabled} aria-label="Next"><ChevronRight size={20} /></button>
    </div>
  );
}

// Destructive button that asks for a second tap instead of a browser dialog
// (dialogs are blocked inside artifacts and easy to dismiss by accident).
export function ConfirmButton({ children, confirmLabel, onConfirm, className = "btn btn-danger btn-block" }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button className={className + (armed ? " armed" : "")} onClick={() => (armed ? onConfirm() : setArmed(true))}>
      {armed ? confirmLabel : children}
    </button>
  );
}

// Large centred money input whose width follows its digits, so ฿ sits right beside the number.
export const AmountInput = forwardRef(function AmountInput({ value, onChange, label, autoFocus }, ref) {
  return (
    <div className="amount">
      <span className="amount-cur">฿</span>
      <input ref={ref} className="amount-input" inputMode="decimal" placeholder="0" value={value} autoFocus={autoFocus} aria-label={label}
        style={{ width: `${Math.max(String(value).length, 1) + 0.6}ch` }}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ""))} />
    </div>
  );
});

// `group` renders a plain container for button sets: wrapping buttons in a <label>
// would make a tap on the label text press the first button.
export function Field({ label, hint, group, children }) {
  const Tag = group ? "div" : "label";
  return (
    <Tag className="field" role={group ? "group" : undefined} aria-label={group ? label : undefined}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <div className="field-hint">{hint}</div>}
    </Tag>
  );
}
