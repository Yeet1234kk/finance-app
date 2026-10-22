import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Month calendar of daily spending: each day is tinted by how much was spent,
// tapping a day lists its transactions underneath.
const FONT = "var(--font-sans)";
const MONO = "var(--font-mono)";
const pad = (n) => String(n).padStart(2, "0");

export default function DailyCalendar({ transactions, fmt, getCat, language = "EN" }) {
  const tr = (en, th) => (language === "TH" ? th : en);
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [picked, setPicked] = useState(null);
  const key = `${ym.y}-${pad(ym.m + 1)}`;
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const shift = (k) => { const d = new Date(ym.y, ym.m + k, 1); setYm({ y: d.getFullYear(), m: d.getMonth() }); setPicked(null); };

  const monthTx = transactions.filter((tx) => !tx.pending && tx.date.startsWith(key));
  const perDay = {};
  monthTx.forEach((tx) => {
    if (tx.type === "income") return;
    perDay[tx.date] = (perDay[tx.date] || 0) + tx.amount;
  });
  const days = new Date(ym.y, ym.m + 1, 0).getDate();
  const lead = (new Date(ym.y, ym.m, 1).getDay() + 6) % 7; // Monday-first grid
  const max = Math.max(...Object.values(perDay), 1);
  const spent = Object.values(perDay).reduce((s, v) => s + v, 0);
  const elapsed = key === todayStr.slice(0, 7) ? now.getDate() : days;
  const weekdays = language === "TH" ? ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"] : ["M", "T", "W", "T", "F", "S", "S"];
  const dayTx = picked ? monthTx.filter((tx) => tx.date === picked).sort((a, b) => (a.type === "income") - (b.type === "income")) : [];

  return (
    <div style={{ background: "var(--surface)", borderRadius: 20, border: "1px solid var(--border)", boxShadow: "var(--card-shadow)", padding: "16px 16px 18px", marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <button aria-label="Previous month" onClick={() => shift(-1)} style={{ background: "var(--fill)", border: "none", borderRadius: 10, padding: 7, cursor: "pointer", color: "var(--text-2)" }}><ChevronLeft size={15} /></button>
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text)", fontFamily: FONT }}>{new Date(ym.y, ym.m, 1).toLocaleDateString(language === "TH" ? "th-TH" : "en-US", { month: "long", year: "numeric" })}</p>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-3)", fontFamily: MONO }}>{tr("avg", "เฉลี่ย")} {fmt(spent / Math.max(elapsed, 1))}/{tr("day", "วัน")}</p>
        </div>
        <button aria-label="Next month" onClick={() => shift(1)} style={{ background: "var(--fill)", border: "none", borderRadius: 10, padding: 7, cursor: "pointer", color: "var(--text-2)" }}><ChevronRight size={15} /></button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4 }}>
        {weekdays.map((w, i) => <div key={i} style={{ textAlign: "center", fontSize: 12, fontWeight: 600, color: "var(--text-3)", fontFamily: FONT, paddingBottom: 2 }}>{w}</div>)}
        {Array.from({ length: lead }, (_, i) => <div key={`b${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const date = `${key}-${pad(i + 1)}`;
          const amt = perDay[date] || 0;
          const a = amt ? 0.12 + 0.6 * (amt / max) : 0;
          const sel = picked === date;
          return (
            <button key={date} onClick={() => setPicked(sel ? null : date)}
              style={{ minWidth: 0, minHeight: 46, borderRadius: 10, cursor: "pointer", padding: "4px 0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", fontFamily: FONT,
                border: sel ? "2px solid var(--text)" : date === todayStr ? "1.5px solid var(--text-3)" : "1.5px solid transparent",
                background: amt ? `rgba(239,68,68,${a.toFixed(2)})` : "var(--fill)" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: a > 0.5 ? "#fff" : "var(--text-2)" }}>{i + 1}</span>
              {amt > 0 && <span style={{ fontSize: 10.5, fontWeight: 700, fontFamily: MONO, color: a > 0.5 ? "#fff" : "var(--text)", letterSpacing: "-0.02em" }}>{amt >= 1000 ? `${(amt / 1000).toFixed(amt >= 10000 ? 0 : 1)}k` : Math.round(amt)}</span>}
            </button>
          );
        })}
      </div>

      {picked && (
        <div style={{ marginTop: 14, borderTop: "1px solid var(--fill)", paddingTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 600, color: "var(--text-2)", fontFamily: FONT, marginBottom: 4 }}>
            <span>{new Date(picked + "T00:00:00").toLocaleDateString(language === "TH" ? "th-TH" : "en-US", { weekday: "long", month: "short", day: "numeric" })}</span>
            <span style={{ fontFamily: MONO }}>{fmt(perDay[picked] || 0)}</span>
          </div>
          {dayTx.length === 0 && <p style={{ margin: "8px 0 0", fontSize: 14, color: "var(--text-3)", fontFamily: FONT }}>{tr("No transactions this day", "ไม่มีรายการในวันนี้")}</p>}
          {dayTx.map((tx) => {
            const cat = getCat(tx);
            const inc = tx.type === "income";
            return (
              <div key={tx.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
                <span style={{ fontSize: 16 }}>{cat.icon}</span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 15, color: "var(--text)", fontFamily: FONT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tx.note || cat.label}</span>
                <span style={{ fontSize: 15, fontWeight: 600, fontFamily: MONO, color: inc ? "var(--positive)" : "var(--negative)" }}>{inc ? "+" : "−"}{fmt(tx.amount)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
