import { useState } from "react";
import { Plus } from "lucide-react";
import { Section, Segmented, Switcher, Row, CatIcon, Bar, Empty, Money } from "../ui/kit";
import TxList from "../ui/TxList";
import { getCat, expenseCats } from "../lib/categories";
import { fmt, monthName, monthShort, monthKey, parseMonthKey, shiftMonth, currentMonth, todayStr, sumBy, isIncome, extractTags, budgetTone, shortDate } from "../lib/core";

// Reports: one month in detail, or a whole year at a glance.
export default function Reports({ lang, txns, budgets, view, setView, month, setMonth, year, setYear, onOpenTx, onAddForMonth }) {
  const tr = (en, th) => (lang === "TH" ? th : en);
  return (
    <>
      <header className="topbar">
        <h1 className="title">{tr("Reports", "รายงาน")}</h1>
        {view === "month" && (
          <button className="icon-btn" onClick={() => onAddForMonth(month)} aria-label={tr("Add to this month", "เพิ่มในเดือนนี้")}><Plus size={20} /></button>
        )}
      </header>
      <div className="page" style={{ marginTop: "0.75rem" }}>
        <Segmented label={tr("Period", "ช่วงเวลา")} value={view} onChange={setView} options={[["month", tr("Month", "รายเดือน")], ["year", tr("Year", "รายปี")]]} />
      </div>
      {view === "month"
        ? <MonthView lang={lang} txns={txns} budgets={budgets} month={month} setMonth={setMonth} onOpenTx={onOpenTx} />
        : <YearView lang={lang} txns={txns} year={year} setYear={setYear} onOpenMonth={(k) => { setMonth(k); setView("month"); }} />}
    </>
  );
}

function MonthView({ lang, txns, budgets, month, setMonth, onOpenTx }) {
  const tr = (en, th) => (lang === "TH" ? th : en);
  const [cat, setCat] = useState(null);
  const mTxns = txns.filter((tx) => !tx.pending && tx.date.startsWith(month));
  const spent = sumBy(mTxns, (t) => !isIncome(t));
  const income = sumBy(mTxns, isIncome);
  const isNow = month === currentMonth();
  const go = (k) => { setMonth(shiftMonth(month, k)); setCat(null); };

  const totals = {};
  mTxns.filter((t) => !isIncome(t)).forEach((t) => { totals[t.category] = (totals[t.category] || 0) + t.amount; });
  const known = expenseCats(lang).map((c) => c.value);
  const catRows = [...new Set([...known, ...Object.keys(totals)])]
    .map((v) => ({ v, amt: totals[v] || 0, limit: parseFloat(budgets.categories?.[v]) || 0 }))
    .filter((r) => r.amt > 0 || r.limit > 0)
    .sort((a, b) => b.amt - a.amt);

  const tags = {};
  mTxns.forEach((t) => extractTags(t.note).forEach((g) => { tags[g] = (tags[g] || 0) + t.amount; }));
  const tagRows = Object.entries(tags).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const listed = cat ? mTxns.filter((t) => t.category === cat) : mTxns;

  return (
    <>
      <div className="page" style={{ marginTop: "1.25rem" }}>
        <Switcher label={monthName(month, lang)} onPrev={() => go(-1)} onNext={() => go(1)} />
      </div>
      <div className="summary" style={{ paddingTop: "1rem" }}>
        <p className="caption" style={{ margin: 0 }}>{isNow ? tr("Spent so far", "ใช้ไปแล้ว") : tr("Spent", "ใช้ไป")}</p>
        <Money value={spent} />
        {income > 0 && (
          <div className="summary-line">
            <span>{tr("Income", "รายรับ")} <b className="pos">{fmt(income)}</b></span>
            <span>{income - spent >= 0 ? tr("Left", "คงเหลือ") : tr("Over by", "เกิน")} <b className={income - spent >= 0 ? "" : "neg"}>{fmt(Math.abs(income - spent))}</b></span>
          </div>
        )}
      </div>

      <Section title={tr("Day by day", "รายวัน")}>
        <DayCalendar lang={lang} month={month} txns={mTxns} onOpenTx={onOpenTx} />
      </Section>

      {catRows.length > 0 && (
        <Section title={tr("Where it went", "ใช้ไปกับอะไร")} note={tr("Tap a category to see its items.", "แตะหมวดหมู่เพื่อดูรายการ")}>
          <div className="group">
            {catRows.map(({ v, amt, limit }) => {
              const c = getCat(v, lang);
              const pct = limit > 0 ? amt / limit : spent > 0 ? amt / spent : 0;
              const on = cat === v;
              return (
                <Row key={v} onClick={() => setCat(on ? null : v)} icon={<CatIcon cat={c} />}
                  title={<>{c.label}{on && <span className="tag">{tr("showing", "กำลังแสดง")}</span>}</>}
                  value={fmt(amt)}
                  valueSub={limit > 0 ? `${tr("of", "จาก")} ${fmt(limit)}` : `${Math.round(pct * 100)}%`}>
                  <div className="row-bar">
                    {limit > 0
                      ? <Bar pct={pct} tone={budgetTone(pct)} />
                      : <div className="bar"><i style={{ width: `${pct * 100}%`, background: c.bar }} /></div>}
                  </div>
                </Row>
              );
            })}
          </div>
        </Section>
      )}

      {tagRows.length > 0 && (
        <Section title={tr("Tags", "แท็ก")}>
          <div className="group">
            {tagRows.map(([tag, amt]) => <Row key={tag} title={tag} value={fmt(amt)} />)}
          </div>
        </Section>
      )}

      <Section title={cat ? `${getCat(cat, lang).label} · ${listed.length}` : tr(`All items · ${listed.length}`, `รายการทั้งหมด · ${listed.length}`)}
        action={cat ? <button className="link" onClick={() => setCat(null)}>{tr("Show all", "ดูทั้งหมด")}</button> : null} style={{ marginBottom: "-0.75rem" }} />
      {listed.length === 0
        ? <Empty title={tr("Nothing recorded", "ไม่มีรายการ")} sub={tr("Use + at the top to add something to this month.", "แตะ + ด้านบนเพื่อเพิ่มรายการในเดือนนี้")} />
        : <TxList txns={listed} lang={lang} onOpen={onOpenTx} />}
    </>
  );
}

function DayCalendar({ lang, month, txns, onOpenTx }) {
  const tr = (en, th) => (lang === "TH" ? th : en);
  const [picked, setPicked] = useState(null);
  const { y, m } = parseMonthKey(month);
  const days = new Date(y, m + 1, 0).getDate();
  const lead = (new Date(y, m, 1).getDay() + 6) % 7; // weeks start on Monday
  const perDay = {};
  txns.filter((t) => !isIncome(t)).forEach((t) => { perDay[t.date] = (perDay[t.date] || 0) + t.amount; });
  const max = Math.max(...Object.values(perDay), 1);
  const spent = Object.values(perDay).reduce((s, v) => s + v, 0);
  const today = todayStr();
  const elapsed = month === today.slice(0, 7) ? +today.slice(8) : days;
  const wd = lang === "TH" ? ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"] : ["M", "T", "W", "T", "F", "S", "S"];
  const short = (v) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : Math.round(v));
  const dayTx = picked ? txns.filter((t) => t.date === picked) : [];

  return (
    <div className="panel">
      <div className="cal">
        {wd.map((w, i) => <div key={i} className="cal-wd">{w}</div>)}
        {Array.from({ length: lead }, (_, i) => <div key={"b" + i} />)}
        {Array.from({ length: days }, (_, i) => {
          const date = `${month}-${String(i + 1).padStart(2, "0")}`;
          const amt = perDay[date] || 0;
          const r = amt / max;
          const level = !amt ? "" : r > 0.66 ? " l3" : r > 0.33 ? " l2" : " l1";
          return (
            <button key={date} className={"cal-day" + level + (date === today ? " today" : "")} aria-pressed={picked === date}
              aria-label={`${shortDate(date, lang)}: ${fmt(amt)}`} onClick={() => setPicked(picked === date ? null : date)}>
              {i + 1}
              {amt > 0 && <small>{short(amt)}</small>}
            </button>
          );
        })}
      </div>
      <p className="caption" style={{ margin: "0.75rem 0 0" }}>
        {tr("Daily average", "เฉลี่ยต่อวัน")} <span className="strong">{fmt(spent / Math.max(elapsed, 1))}</span>
        {" · "}{tr("darker means more spent", "สีเข้ม = ใช้มาก")}
      </p>
      {picked && (
        <div style={{ marginTop: "0.75rem" }}>
          <div className="hstack" style={{ justifyContent: "space-between", fontWeight: 600, padding: "0.25rem 0" }}>
            <span>{shortDate(picked, lang)}</span><span>{fmt(perDay[picked] || 0)}</span>
          </div>
          {dayTx.length === 0 && <p className="caption" style={{ margin: "0.25rem 0 0" }}>{tr("Nothing on this day.", "ไม่มีรายการในวันนี้")}</p>}
          {dayTx.map((t) => {
            const c = getCat(t.category, lang);
            return (
              <button key={t.id} className="row" style={{ padding: "0.5rem 0", minHeight: "3rem" }} onClick={() => onOpenTx(t)}>
                <CatIcon cat={c} small />
                <span className="row-main row-title">{t.note || c.label}</span>
                <span className={"row-value " + (isIncome(t) ? "pos" : "")}>{isIncome(t) ? "+" : "−"}{fmt(t.amount)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function YearView({ lang, txns, year, setYear, onOpenMonth }) {
  const tr = (en, th) => (lang === "TH" ? th : en);
  const yTxns = txns.filter((t) => !t.pending && t.date.startsWith(String(year)));
  const spendTx = yTxns.filter((t) => !isIncome(t));
  const spent = sumBy(spendTx);
  const income = sumBy(yTxns, isIncome);
  const now = new Date();
  const monthsSoFar = year === now.getFullYear() ? now.getMonth() + 1 : 12;
  const biggest = spendTx.reduce((b, t) => (!b || t.amount > b.amount ? t : b), null);
  const months = Array.from({ length: 12 }, (_, i) => {
    const key = monthKey(year, i);
    const mt = yTxns.filter((t) => t.date.startsWith(key));
    return { i, key, spent: sumBy(mt, (t) => !isIncome(t)), income: sumBy(mt, isIncome), count: mt.length };
  });
  const max = Math.max(...months.map((m) => m.spent), 1);
  const peak = months.reduce((p, m) => (m.spent > p.spent ? m : p), months[0]);

  const totals = {};
  spendTx.forEach((t) => { totals[t.category] = (totals[t.category] || 0) + t.amount; });
  const catRows = Object.entries(totals).sort((a, b) => b[1] - a[1]);

  return (
    <>
      <div className="page" style={{ marginTop: "1.25rem" }}>
        <Switcher label={String(year)} onPrev={() => setYear(year - 1)} onNext={() => setYear(year + 1)} nextDisabled={year >= now.getFullYear() + 1} />
      </div>
      <div className="summary" style={{ paddingTop: "1rem" }}>
        <p className="caption" style={{ margin: 0 }}>{tr(`Spent in ${year}`, `ใช้ไปในปี ${year}`)}</p>
        <Money value={spent} />
        {income > 0 && <div className="summary-line"><span>{tr("Income", "รายรับ")} <b className="pos">{fmt(income)}</b></span></div>}
      </div>

      {yTxns.length === 0 ? (
        <Empty title={tr(`Nothing recorded in ${year}`, `ไม่มีรายการในปี ${year}`)} />
      ) : (
        <>
          <div className="section">
            <dl className="kv">
              <div><dt>{tr("Monthly average", "เฉลี่ยต่อเดือน")}</dt><dd>{fmt(spent / monthsSoFar)}</dd></div>
              <div><dt>{tr("Items recorded", "จำนวนรายการ")}</dt><dd>{yTxns.length}</dd></div>
              <div><dt>{tr("Busiest month", "เดือนที่ใช้มากสุด")}</dt><dd>{peak.spent > 0 ? monthShort(peak.i, lang) : "—"}</dd></div>
              <div><dt>{tr("Biggest expense", "รายจ่ายสูงสุด")}</dt><dd>{biggest ? fmt(biggest.amount) : "—"}</dd></div>
            </dl>
            {biggest && <p className="section-note">{tr("Biggest:", "สูงสุด:")} {biggest.note || getCat(biggest.category, lang).label} · {shortDate(biggest.date, lang)}</p>}
          </div>

          <Section title={tr("Month by month", "รายเดือน")} note={tr("Tap a month to open it.", "แตะเดือนเพื่อดูรายละเอียด")}>
            <div className="panel">
              <div className="cols">
                {months.map((m) => (
                  <button key={m.key} className={"col" + (m.key === currentMonth() ? " on" : "")} onClick={() => onOpenMonth(m.key)}
                    aria-label={`${monthShort(m.i, lang)}: ${fmt(m.spent)}`}>
                    <div className="col-track">
                      <div className={"col-fill" + (m.key === currentMonth() ? " on" : "")} style={{ height: `${(m.spent / max) * 100}%` }} />
                    </div>
                    <span className="col-label">{lang === "TH" ? monthShort(m.i, lang).replace(/\./g, "") : monthShort(m.i, lang).charAt(0)}</span>
                  </button>
                ))}
              </div>
            </div>
          </Section>

          {catRows.length > 0 && (
            <Section title={tr("Where it went", "ใช้ไปกับอะไร")}>
              <div className="group">
                {catRows.map(([v, amt]) => {
                  const c = getCat(v, lang);
                  return (
                    <Row key={v} icon={<CatIcon cat={c} />} title={c.label} value={fmt(amt)} valueSub={`${Math.round((amt / spent) * 100)}%`}>
                      <div className="row-bar"><div className="bar"><i style={{ width: `${(amt / spent) * 100}%`, background: c.bar }} /></div></div>
                    </Row>
                  );
                })}
              </div>
            </Section>
          )}

          <Section title={tr("Months", "เดือน")}>
            <div className="group">
              {months.filter((m) => m.count > 0).reverse().map((m) => (
                <Row key={m.key} chevron onClick={() => onOpenMonth(m.key)} title={monthName(m.key, lang)}
                  sub={m.income > 0 ? `${tr("Income", "รายรับ")} ${fmt(m.income)}` : tr(`${m.count} items`, `${m.count} รายการ`)}
                  value={fmt(m.spent)} />
              ))}
            </div>
          </Section>
        </>
      )}
    </>
  );
}
