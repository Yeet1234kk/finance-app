import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Check } from "lucide-react";
import { Sheet, FullPage, Section, Row, Avatar, Segmented, Empty, Field, Bar, ConfirmButton, AmountInput, CatIcon, Money } from "../ui/kit";
import { Glyph, GROUP_ICON_KEYS } from "../ui/icons";
import { SPDB, SP_T, SP_CATS, spGetCat, spSimplifyDebts, spParseNL, spToAppCat, _spFmt as money, _spFmtDate, _spFmtTime, _spTodayStr, _spNowISO, _spUid } from "../lib/splitpro";

const cleanName = (g) => g.name.replace(/^[^\w\s]+\s*/, "");

// Shared expenses with friends: groups, who owes whom, settling up.
// When you paid, your share is copied into the main ledger via onLinkUpsert.
export default function Groups({ lang, profile, onLinkUpsert, onLinkDelete, toast }) {
  const L = SP_T[lang] || SP_T.EN;
  const tr = (en, th) => (lang === "TH" ? th : en);
  SPDB.init();
  const snapshot = () => ({ groups: SPDB.get("groups"), members: SPDB.get("members"), expenses: SPDB.get("expenses"), settlements: SPDB.get("settlements"), activity: SPDB.get("activity") });
  const [data, setData] = useState(snapshot);
  const refresh = useCallback(() => setData(snapshot()), []);
  const [view, setView] = useState("groups");
  const [activeGid, setActiveGid] = useState(null);
  const [modal, setModal] = useState(null); // { kind: "expense", exp? } | "group" | "settle"

  const me = data.members.find((m) => m.id === "u1") || data.members[0];

  // Keep "You" in step with the profile name from Settings.
  useEffect(() => {
    if (!profile || !me) return;
    const name = (profile.name || "You").trim() || "You";
    const initials = (profile.initials || name.slice(0, 2)).toUpperCase().slice(0, 2);
    if (me.name !== name || me.initials !== initials) { SPDB.update("members", me.id, { name, initials }); refresh(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.name, profile?.initials]);

  const balances = useMemo(() => {
    const r = {};
    data.groups.forEach((g) => {
      const ex = data.expenses.filter((e) => e.groupId === g.id);
      r[g.id] = { debts: spSimplifyDebts(g.memberIds, ex, data.settlements.filter((s) => s.groupId === g.id)), total: ex.reduce((s, e) => s + e.amount, 0) };
    });
    return r;
  }, [data]);
  const netFor = (gid) => { const d = balances[gid]?.debts || []; return d.filter((x) => x.to === me?.id).reduce((s, x) => s + x.amount, 0) - d.filter((x) => x.from === me?.id).reduce((s, x) => s + x.amount, 0); };
  const net = data.groups.reduce((s, g) => s + netFor(g.id), 0);

  const link = useCallback((exp) => {
    if (exp.paidBy !== me?.id) { onLinkDelete(exp.id); return; }
    const grp = SPDB.get("groups").find((g) => g.id === exp.groupId);
    const share = exp.splits.find((s) => s.id === me.id)?.amount || 0;
    onLinkUpsert({ groupExpenseId: exp.id, type: "expense", amount: Math.round(share), originalAmount: Math.round(exp.amount), reimbursed: Math.round(exp.amount - share), split: true, category: spToAppCat(exp.category), note: `${exp.description} · ${grp ? cleanName(grp) : "Group"}`, date: exp.date });
  }, [me, onLinkUpsert, onLinkDelete]);

  const saveExpense = (exp, isEdit) => {
    if (isEdit) SPDB.update("expenses", exp.id, exp);
    else {
      SPDB.insert("expenses", exp);
      SPDB.insert("activity", { id: _spUid(), type: "expense_added", groupId: exp.groupId, expenseId: exp.id, userId: me.id, timestamp: _spNowISO(), meta: { description: exp.description, amount: exp.amount } });
    }
    link(exp); refresh(); setModal(null); toast(isEdit ? L.tExpUpdated : L.tExpAdded);
  };
  const deleteExpense = (id) => { SPDB.delete("expenses", id); onLinkDelete(id); refresh(); setModal(null); toast(L.tExpRemoved); };
  const addGroup = (g) => { SPDB.insert("groups", g); refresh(); setActiveGid(g.id); setModal(null); toast(L.tGroupCreated); };
  const deleteGroup = (gid) => {
    SPDB.get("expenses").filter((e) => e.groupId === gid).forEach((e) => { SPDB.delete("expenses", e.id); onLinkDelete(e.id); });
    SPDB.get("settlements").filter((s) => s.groupId === gid).forEach((s) => SPDB.delete("settlements", s.id));
    SPDB.get("activity").filter((a) => a.groupId === gid).forEach((a) => SPDB.delete("activity", a.id));
    SPDB.delete("groups", gid);
    setActiveGid(null); refresh(); toast(L.tGroupDeleted);
  };
  const settle = (s) => {
    SPDB.insert("settlements", s);
    SPDB.insert("activity", { id: _spUid(), type: "settlement", groupId: s.groupId, userId: s.from, timestamp: _spNowISO(), meta: { amount: s.amount, to: data.members.find((m) => m.id === s.to)?.name } });
    refresh(); setModal(null); toast(L.tSettled.replace(" 🎉", ""));
  };

  const people = useMemo(() => {
    const bal = {};
    data.groups.forEach((g) => (balances[g.id]?.debts || []).forEach((d) => {
      if (d.from === me?.id) bal[d.to] = (bal[d.to] || 0) - d.amount;
      if (d.to === me?.id) bal[d.from] = (bal[d.from] || 0) + d.amount;
    }));
    return data.members.filter((m) => m.id !== me?.id).map((m) => ({ m, bal: bal[m.id] || 0, groups: data.groups.filter((g) => g.memberIds.includes(m.id) && g.memberIds.includes(me?.id)).length }));
  }, [data, balances, me]);

  const balanceText = (v) => (v > 0 ? { text: L.youreOwed, cls: "pos" } : v < 0 ? { text: L.youOwe, cls: "neg" } : { text: L.settled, cls: "muted" });

  return (
    <>
      <header className="topbar">
        <h1 className="title">{tr("Groups", "กลุ่ม")}</h1>
        <button className="icon-btn" onClick={() => setModal("group")} aria-label={L.newGroup}><Plus size={20} /></button>
      </header>
      <div className="page" style={{ marginTop: "0.75rem" }}>
        <Segmented label={tr("View", "มุมมอง")} value={view} onChange={setView} options={[["groups", L.navGroups], ["people", L.navFriends], ["activity", L.navActivity]]} />
      </div>

      {view === "groups" && (
        <>
          <div className="summary">
            <p className="caption" style={{ margin: 0 }}>{net >= 0 ? tr("Others owe you", "คนอื่นต้องจ่ายคุณ") : tr("You owe others", "คุณต้องจ่ายคนอื่น")}</p>
            <Money value={net} className={"display " + (net > 0 ? "pos" : net < 0 ? "neg" : "")} />
          </div>
          {data.groups.length === 0 ? (
            <Empty title={L.noGroups} sub={L.noGroupsSub}>
              <button className="btn btn-primary" style={{ marginTop: "1.25rem" }} onClick={() => setModal("group")}><Plus size={20} />{L.newGroupBtn}</button>
            </Empty>
          ) : (
            <Section>
              <div className="group">
                {data.groups.map((g) => {
                  const n = netFor(g.id);
                  const b = balanceText(n);
                  return (
                    <Row key={g.id} chevron onClick={() => setActiveGid(g.id)} icon={<CatIcon cat={{ icon: g.emoji }} color="var(--ink-2)" />}
                      title={cleanName(g)} sub={L.totalMembers(money(balances[g.id]?.total || 0), g.memberIds.length)}
                      value={n !== 0 ? money(Math.abs(n)) : null} valueSub={b.text} valueClass={b.cls} />
                  );
                })}
              </div>
            </Section>
          )}
        </>
      )}

      {view === "people" && (
        people.length === 0 ? <Empty title={L.noFriends} sub={L.noFriendsSub} /> : (
          <Section>
            <div className="group">
              {people.map(({ m, bal, groups }) => {
                const b = bal > 0 ? { text: L.owesYou, cls: "pos" } : bal < 0 ? { text: L.youOwe, cls: "neg" } : { text: L.settled, cls: "muted" };
                return <Row key={m.id} icon={<Avatar m={m} />} title={m.name} sub={L.sharedGroups(groups)} value={bal !== 0 ? money(Math.abs(bal)) : null} valueSub={b.text} valueClass={b.cls} />;
              })}
            </div>
          </Section>
        )
      )}

      {view === "activity" && (() => {
        const acts = [...data.activity].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        if (!acts.length) return <Empty title={L.noActivity} sub={L.noActivitySub} />;
        const label = (a) => {
          const u = data.members.find((m) => m.id === a.userId)?.name || L.someone;
          const g = data.groups.find((x) => x.id === a.groupId);
          if (a.type === "expense_added") return L.actAdded(u, a.meta?.description, money(a.meta?.amount || 0), g ? cleanName(g) : L.aGroup);
          if (a.type === "settlement") return L.actSettled(u, money(a.meta?.amount || 0), a.meta?.to);
          return L.actGroupCreated(a.meta?.name);
        };
        return (
          <Section>
            <div className="group">
              {acts.map((a) => (
                <div key={a.id} className="row">
                  <div className="row-main">
                    <div style={{ fontSize: "1rem" }}>{label(a)}</div>
                    <div className="row-sub">{_spFmtDate(a.timestamp.slice(0, 10), lang)} · {_spFmtTime(a.timestamp)}</div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        );
      })()}

      {activeGid && data.groups.some((g) => g.id === activeGid) && (
        <GroupDetail data={data} me={me} gid={activeGid} balances={balances} L={L} lang={lang} tr={tr}
          onBack={() => setActiveGid(null)} onAdd={() => setModal({ kind: "expense" })} onOpenExpense={(exp) => setModal({ kind: "expense", exp })}
          onSettle={() => setModal("settle")} onDeleteGroup={() => deleteGroup(activeGid)} />
      )}

      {modal?.kind === "expense" && <ExpenseSheet data={data} me={me} gid={activeGid} exp={modal.exp} L={L} tr={tr} onSave={saveExpense} onDelete={deleteExpense} onClose={() => setModal(null)} />}
      {modal === "group" && <GroupSheet data={data} me={me} L={L} tr={tr} onSave={addGroup} onClose={() => setModal(null)} onMemberAdded={refresh} />}
      {modal === "settle" && activeGid && <SettleSheet data={data} me={me} gid={activeGid} balances={balances} L={L} tr={tr} onSave={settle} onClose={() => setModal(null)} />}
    </>
  );
}

function GroupDetail({ data, me, gid, balances, L, lang, tr, onBack, onAdd, onOpenExpense, onSettle, onDeleteGroup }) {
  const [tab, setTab] = useState("expenses");
  const g = data.groups.find((x) => x.id === gid);
  const expenses = data.expenses.filter((e) => e.groupId === gid);
  const members = data.members.filter((m) => g.memberIds.includes(m.id));
  const { debts = [], total = 0 } = balances[gid] || {};
  const myShare = expenses.reduce((s, e) => s + (e.splits.find((x) => x.id === me.id)?.amount || 0), 0);
  const iPaid = expenses.filter((e) => e.paidBy === me.id).reduce((s, e) => s + e.amount, 0);
  const days = {};
  [...expenses].sort((a, b) => b.date.localeCompare(a.date)).forEach((e) => { (days[e.date] = days[e.date] || []).push(e); });
  const cats = {};
  expenses.forEach((e) => { cats[e.category] = (cats[e.category] || 0) + e.amount; });

  return (
    <FullPage title={cleanName(g)} backLabel={tr("Groups", "กลุ่ม")} onBack={onBack}
      action={<button className="icon-btn plain" onClick={onAdd} aria-label={L.addExpense}><Plus size={22} /></button>}>
      <div className="summary">
        <div className="hstack">
          <span style={{ transform: "scale(1.2)", transformOrigin: "left center", marginRight: "0.5rem" }}><CatIcon cat={{ icon: g.emoji }} color="var(--ink-2)" /></span>
          <div className="row-main">
            <div className="row-title" style={{ fontSize: "1.25rem", fontWeight: 700 }}>{cleanName(g)}</div>
            <div className="avatars" style={{ marginTop: "0.25rem" }}>{members.slice(0, 7).map((m) => <Avatar key={m.id} m={m} small />)}</div>
          </div>
        </div>
      </div>
      <div className="section" style={{ marginTop: "0.75rem" }}>
        <dl className="kv" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
          <div><dt>{L.stTotal}</dt><dd>{money(total)}</dd></div>
          <div><dt>{L.stYouPaid}</dt><dd>{money(iPaid)}</dd></div>
          <div><dt>{L.stYourShare}</dt><dd>{money(myShare)}</dd></div>
        </dl>
      </div>
      <div className="page" style={{ marginTop: "1.25rem" }}>
        <Segmented label={tr("Section", "ส่วน")} value={tab} onChange={setTab} options={[["expenses", L.tabExpenses], ["balances", L.tabBalances], ["breakdown", tr("Breakdown", "สรุป")]]} />
      </div>

      {tab === "expenses" && (
        <>
          <div className="page" style={{ marginTop: "1rem" }}>
            <button className="btn btn-primary btn-block" onClick={onAdd}><Plus size={20} />{L.addExpenseBtn}</button>
          </div>
          {expenses.length === 0 && <Empty title={L.noExpenses} sub={L.noExpensesSub} />}
          {Object.entries(days).map(([date, list]) => (
            <Section key={date} title={_spFmtDate(date, lang)} style={{ marginTop: "1.25rem" }}>
              <div className="group">
                {list.map((e) => {
                  const c = spGetCat(e.category);
                  const payer = data.members.find((m) => m.id === e.paidBy);
                  const share = e.splits.find((s) => s.id === me.id)?.amount || 0;
                  const mine = e.paidBy === me.id;
                  return (
                    <Row key={e.id} onClick={() => onOpenExpense(e)} icon={<CatIcon cat={{ icon: c.icon, bar: c.color }} />}
                      title={e.description} sub={`${payer?.name || "?"} ${L.paidWord}`}
                      value={money(e.amount)} valueSub={mine ? L.youPaid : share > 0 ? L.yourShareN(money(share)) : L.notIncluded} />
                  );
                })}
              </div>
            </Section>
          ))}
        </>
      )}

      {tab === "balances" && (
        <>
          {debts.length === 0 ? <Empty title={L.allSettled} sub={L.everyoneEven} /> : (
            <Section title={tr("To settle", "ยอดที่ต้องจ่าย")}>
              <div className="group">
                {debts.map((d, i) => {
                  const from = data.members.find((m) => m.id === d.from);
                  const to = data.members.find((m) => m.id === d.to);
                  const mine = d.from === me.id;
                  return (
                    <Row key={i} icon={<Avatar m={from} />} title={`${from?.name} → ${to?.name}`} value={money(d.amount)} valueClass={mine ? "neg" : ""}
                      after={mine ? <button className="btn btn-quiet" style={{ minHeight: "2.75rem", padding: "0 0.875rem" }} onClick={onSettle}>{L.settle}</button> : null} />
                  );
                })}
              </div>
            </Section>
          )}
          <Section title={L.memberBalances}>
            <div className="group">
              {members.map((m) => {
                const paid = expenses.filter((e) => e.paidBy === m.id).reduce((s, e) => s + e.amount, 0);
                const share = expenses.reduce((s, e) => s + (e.splits.find((x) => x.id === m.id)?.amount || 0), 0);
                const n = paid - share;
                return <Row key={m.id} icon={<Avatar m={m} />} title={m.name} value={(n > 0 ? "+" : n < 0 ? "−" : "") + money(n)} valueClass={n > 0 ? "pos" : n < 0 ? "neg" : "muted"} />;
              })}
            </div>
          </Section>
        </>
      )}

      {tab === "breakdown" && (
        expenses.length === 0 ? <Empty title={L.noData} sub={L.noDataSub} /> : (
          <>
            <Section title={L.spendByCat}>
              <div className="group">
                {Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([v, amt]) => {
                  const c = spGetCat(v);
                  return <Row key={v} icon={<CatIcon cat={{ icon: c.icon, bar: c.color }} />} title={c.l} value={money(amt)}><div className="row-bar"><Bar pct={amt / total} /></div></Row>;
                })}
              </div>
            </Section>
            <Section title={L.whoSpent}>
              <div className="group">
                {members.map((m) => {
                  const paid = expenses.filter((e) => e.paidBy === m.id).reduce((s, e) => s + e.amount, 0);
                  return <Row key={m.id} icon={<Avatar m={m} />} title={m.name} value={money(paid)}><div className="row-bar"><Bar pct={total ? paid / total : 0} /></div></Row>;
                })}
              </div>
            </Section>
          </>
        )
      )}

      <div className="page" style={{ marginTop: "2.5rem" }}>
        <ConfirmButton confirmLabel={tr("Tap again to delete this group", "แตะอีกครั้งเพื่อลบกลุ่มนี้")} onConfirm={onDeleteGroup}>{tr("Delete group", "ลบกลุ่ม")}</ConfirmButton>
        <p className="section-note">{L.confirmDelGroup(cleanName(g))}</p>
      </div>
    </FullPage>
  );
}

function ExpenseSheet({ data, me, gid, exp, L, tr, onSave, onDelete, onClose }) {
  const [nl, setNl] = useState("");
  const [desc, setDesc] = useState(exp?.description || "");
  const [amount, setAmount] = useState(exp ? String(exp.amount) : "");
  const [category, setCategory] = useState(exp?.category || "Food");
  const [paidBy, setPaidBy] = useState(exp?.paidBy || me.id);
  const [groupId, setGroupId] = useState(exp?.groupId || gid || data.groups[0]?.id || "");
  const [date, setDate] = useState(exp?.date || _spTodayStr());
  // Editing starts on "custom" so the original per-person amounts are kept exactly.
  const [method, setMethod] = useState(exp ? "custom" : "equal");
  const group = data.groups.find((g) => g.id === groupId);
  const members = group ? data.members.filter((m) => group.memberIds.includes(m.id)) : [];
  const [included, setIncluded] = useState(exp ? exp.splits.map((s) => s.id) : members.map((m) => m.id));
  const [custom, setCustom] = useState(exp ? Object.fromEntries(exp.splits.map((s) => [s.id, String(s.amount)])) : {});
  const [pct, setPct] = useState({});
  const [shares, setShares] = useState({});
  const [error, setError] = useState("");
  const firstGroup = useRef(groupId);
  useEffect(() => { if (groupId !== firstGroup.current) setIncluded(members.map((m) => m.id)); }, [groupId]); // eslint-disable-line react-hooks/exhaustive-deps

  const amt = parseFloat(amount) || 0;
  const sumCustom = included.reduce((s, id) => s + (parseFloat(custom[id]) || 0), 0);
  const sumPct = included.reduce((s, id) => s + (parseFloat(pct[id]) || 0), 0);
  const sumShares = included.reduce((s, id) => s + (parseFloat(shares[id]) || 1), 0);
  const splits = () => {
    if (method === "custom") return included.map((id) => ({ id, amount: parseFloat(custom[id]) || 0 }));
    if (method === "percent") return included.map((id) => ({ id, amount: Math.round(((parseFloat(pct[id]) || 0) / 100) * amt * 100) / 100 }));
    if (method === "shares") return included.map((id) => ({ id, amount: Math.round((parseFloat(shares[id]) || 1) * (amt / sumShares) * 100) / 100 }));
    return included.map((id) => ({ id, amount: Math.round((amt / included.length) * 100) / 100 }));
  };
  const save = () => {
    if (!desc.trim()) return setError(L.errDesc);
    if (amt <= 0) return setError(L.errAmount);
    if (!groupId) return setError(L.errGroup);
    if (!included.length) return setError(L.errMember);
    if (method === "custom" && Math.abs(sumCustom - amt) > 1) return setError(L.errSum(money(amt)));
    if (method === "percent" && Math.abs(sumPct - 100) > 1) return setError(L.errPct);
    onSave({ id: exp?.id || _spUid(), groupId, description: desc.trim(), amount: amt, category, paidBy, date, splits: splits(), createdAt: exp?.createdAt || _spNowISO(), note: exp?.note || "" }, !!exp);
  };
  const parseLine = () => {
    const p = spParseNL(nl, members);
    setDesc(p.description);
    if (p.amount > 0) setAmount(String(p.amount));
    setCategory(p.category);
    if (p.participants.length) setIncluded([me.id, ...p.participants]);
  };
  const remaining = method === "custom" ? amt - sumCustom : method === "percent" ? 100 - sumPct : 0;

  return (
    <Sheet title={exp ? L.editExpense : L.addExpense} onClose={onClose}>
      {!exp && (
        <Field label={L.quickAdd} hint={L.quickAddPh}>
          <div className="hstack">
            <input className="input" value={nl} onChange={(e) => setNl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && nl && parseLine()} />
            <button className="btn btn-quiet" onClick={parseLine} disabled={!nl}>{L.parse}</button>
          </div>
        </Field>
      )}
      <AmountInput value={amount} label={L.amount} onChange={(v) => { setAmount(v); setError(""); }} />
      <Field label={L.whatFor}><input className="input" maxLength={120} value={desc} onChange={(e) => { setDesc(e.target.value); setError(""); }} /></Field>
      {error && <p className="error">{error}</p>}
      <div className="btn-row">
        <Field label={L.group}>
          <select className="input" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            {data.groups.map((g) => <option key={g.id} value={g.id}>{cleanName(g)}</option>)}
          </select>
        </Field>
        <Field label={L.date}><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      </div>
      <Field group label={L.category}>
        <div className="chips">{SP_CATS.map((c) => <button key={c.v} className="chip" aria-pressed={category === c.v} onClick={() => setCategory(c.v)}><Glyph icon={c.icon} size={18} /> {c.l}</button>)}</div>
      </Field>
      {members.length > 0 && (
        <>
          <Field group label={L.paidBy}>
            <div className="chips">{members.map((m) => <button key={m.id} className="chip" aria-pressed={paidBy === m.id} onClick={() => setPaidBy(m.id)}>{m.name}</button>)}</div>
          </Field>
          <Field group label={L.splitMethod}>
            <Segmented label={L.splitMethod} value={method} onChange={setMethod} options={[["equal", L.mEqual], ["custom", L.mCustom], ["percent", L.mPercent], ["shares", L.mShares]]} />
          </Field>
          <div className="group" style={{ marginBottom: "1rem" }}>
            {members.map((m) => {
              const on = included.includes(m.id);
              return (
                <div key={m.id} className="row">
                  <input type="checkbox" checked={on} style={{ width: "1.375rem", height: "1.375rem" }} aria-label={m.name}
                    onChange={() => setIncluded((p) => (on ? p.filter((x) => x !== m.id) : [...p, m.id]))} />
                  <Avatar m={m} small />
                  <span className={"row-main row-title" + (on ? "" : " muted")}>{m.name}</span>
                  {on && method === "equal" && <span className="row-value">{money(amt / included.length)}</span>}
                  {on && method === "custom" && <input className="input input-inline" inputMode="decimal" placeholder="0" value={custom[m.id] || ""} onChange={(e) => setCustom((p) => ({ ...p, [m.id]: e.target.value }))} aria-label={m.name} />}
                  {on && method === "percent" && <input className="input input-inline" style={{ width: "5rem" }} inputMode="decimal" placeholder="%" value={pct[m.id] || ""} onChange={(e) => setPct((p) => ({ ...p, [m.id]: e.target.value }))} aria-label={m.name} />}
                  {on && method === "shares" && (
                    <div className="hstack" style={{ gap: "0.25rem" }}>
                      <button className="icon-btn" onClick={() => setShares((p) => ({ ...p, [m.id]: Math.max(1, (parseFloat(p[m.id]) || 1) - 1) }))} aria-label="−">−</button>
                      <span className="strong" style={{ minWidth: "1.5rem", textAlign: "center" }}>{parseFloat(shares[m.id]) || 1}</span>
                      <button className="icon-btn" onClick={() => setShares((p) => ({ ...p, [m.id]: (parseFloat(p[m.id]) || 1) + 1 }))} aria-label="+">+</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {(method === "custom" || method === "percent") && (
            <p className={Math.abs(remaining) < 1 ? "pos strong" : "warn strong"} style={{ marginTop: 0 }}>
              {Math.abs(remaining) < 1 ? L.balanced : L.remaining(method === "percent" ? `${remaining.toFixed(0)}%` : money(remaining))}
            </p>
          )}
        </>
      )}
      <div className="stack">
        <button className="btn btn-primary btn-block" onClick={save}>{exp ? L.updateExpense : L.saveExpense}</button>
        {exp && <ConfirmButton confirmLabel={tr("Tap again to delete", "แตะอีกครั้งเพื่อลบ")} onConfirm={() => onDelete(exp.id)}>{L.del}</ConfirmButton>}
      </div>
    </Sheet>
  );
}

const PERSON_COLORS = ["#C2410C","#0F766E","#A16207","#6D28D9","#1D4ED8","#BE123C","#15803D","#475569"];

function GroupSheet({ data, me, L, tr, onSave, onClose, onMemberAdded }) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(GROUP_ICON_KEYS[0]);
  const [ids, setIds] = useState([me.id]);
  const [newName, setNewName] = useState("");
  const addPerson = () => {
    const n = newName.trim();
    if (!n) return;
    const m = { id: _spUid(), name: n, initials: n.slice(0, 2).toUpperCase(), color: PERSON_COLORS[data.members.length % PERSON_COLORS.length] };
    SPDB.insert("members", m);
    setIds((p) => [...p, m.id]);
    setNewName("");
    onMemberAdded();
  };
  return (
    <Sheet title={L.newGroup} onClose={onClose}>
      <Field label={tr("Name", "ชื่อกลุ่ม")}><input className="input" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder={L.groupNamePh} autoFocus /></Field>
      <Field group label={tr("Icon", "ไอคอน")}>
        <div className="icon-pick">{GROUP_ICON_KEYS.map((k) => <button key={k} type="button" aria-pressed={emoji === k} aria-label={k} onClick={() => setEmoji(k)}><Glyph icon={k} size={22} /></button>)}</div>
      </Field>
      <Field group label={L.members}>
        <div className="group">
          {data.members.map((m) => {
            const on = ids.includes(m.id);
            return (
              <label key={m.id} className="row" style={{ cursor: "pointer" }}>
                <input type="checkbox" checked={on} disabled={m.id === me.id} style={{ width: "1.375rem", height: "1.375rem" }}
                  onChange={() => setIds((p) => (on ? p.filter((x) => x !== m.id) : [...p, m.id]))} />
                <Avatar m={m} small />
                <span className="row-main row-title">{m.name}{m.id === me.id ? ` (${tr("you", "คุณ")})` : ""}</span>
              </label>
            );
          })}
        </div>
        <div className="hstack" style={{ marginTop: "0.625rem" }}>
          <input className="input" maxLength={30} value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addPerson()} placeholder={L.addMember} aria-label={L.addMember} />
          <button className="btn btn-quiet" onClick={addPerson} disabled={!newName.trim()}>{tr("Add", "เพิ่ม")}</button>
        </div>
      </Field>
      <button className="btn btn-primary btn-block" disabled={!name.trim()}
        onClick={() => onSave({ id: _spUid(), name: name.trim(), emoji, color: "#141413", createdAt: _spTodayStr(), memberIds: ids, archivedAt: null })}>
        {L.createGroup}
      </button>
    </Sheet>
  );
}

function SettleSheet({ data, me, gid, balances, L, onSave, onClose }) {
  const mine = (balances[gid]?.debts || []).filter((d) => d.from === me.id);
  const [sel, setSel] = useState(mine[0] || null);
  const [amount, setAmount] = useState(mine[0] ? String(mine[0].amount) : "");
  const to = data.members.find((m) => m.id === sel?.to);
  const amt = parseFloat(amount) || 0;
  return (
    <Sheet title={L.settleUp} onClose={onClose}>
      {mine.length === 0 ? <Empty title={L.allClear} sub={L.nothingSettle} /> : (
        <>
          <div className="group" style={{ marginBottom: "1.25rem" }}>
            {mine.map((d) => {
              const m = data.members.find((x) => x.id === d.to);
              const on = sel?.to === d.to;
              return (
                <Row key={d.to} onClick={() => { setSel(d); setAmount(String(d.amount)); }} icon={<Avatar m={m} />} title={L.pay(m?.name)} value={money(d.amount)} valueClass="neg"
                  after={on ? <Check size={20} /> : null} />
              );
            })}
          </div>
          {sel && (
            <>
              <Field label={L.paying(to?.name)} hint={`${L.full}: ${money(sel.amount)}`}>
                <input className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </Field>
              <button className="btn btn-primary btn-block" disabled={amt <= 0}
                onClick={() => onSave({ id: _spUid(), groupId: gid, from: sel.from, to: sel.to, amount: Math.min(amt, sel.amount), date: _spTodayStr(), createdAt: _spNowISO() })}>
                {L.markSettled(money(Math.min(amt, sel.amount)))}
              </button>
            </>
          )}
        </>
      )}
    </Sheet>
  );
}
