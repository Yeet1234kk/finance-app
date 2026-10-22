import { Fragment } from "react";
import { Section, Row, CatIcon } from "./kit";
import { getCat } from "../lib/categories";
import { byDay, dayLabel, fmt, sumBy, isIncome } from "../lib/core";

// Transactions grouped by day, newest first. Tapping a row opens it.
export default function TxList({ txns, lang, onOpen, limit }) {
  const tr = (en, th) => (lang === "TH" ? th : en);
  const days = byDay(txns);
  let shown = 0;
  return days.map(({ date, items }) => {
    if (limit && shown >= limit) return null;
    const visible = limit ? items.slice(0, limit - shown) : items;
    shown += visible.length;
    const spent = sumBy(items, (t) => !isIncome(t));
    return (
      <Section key={date} title={dayLabel(date, lang)} action={spent > 0 ? <span className="caption">{fmt(spent)}</span> : null} style={{ marginTop: "1.25rem" }}>
        <div className="group">
          {visible.map((tx) => {
            const cat = getCat(tx.category, lang);
            const inc = isIncome(tx);
            const badges = [
              tx.split && tr("shared", "หาร"),
              tx.recurringId && tr("repeats", "ประจำ"),
              tx.cardEntryId && tr("card", "บัตร"),
              tx.groupExpenseId && tr("group", "กลุ่ม"),
            ].filter(Boolean);
            return (
              <Row key={tx.id} onClick={() => onOpen(tx)} icon={<CatIcon cat={cat} />}
                title={tx.note || cat.label}
                sub={!tx.note && !badges.length ? null : <Fragment>{tx.note ? cat.label : ""}{badges.map((b) => <span key={b} className="tag" style={tx.note ? undefined : { marginLeft: 0 }}>{b}</span>)}</Fragment>}
                value={(inc ? "+" : "−") + fmt(tx.amount)} valueClass={inc ? "pos" : ""} />
            );
          })}
        </div>
      </Section>
    );
  });
}
