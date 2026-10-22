import { useCallback, useEffect, useMemo, useState } from "react";
import { Home as HomeIcon, BarChart3, CreditCard, Users, Settings as SettingsIcon } from "lucide-react";
import "./ui/theme.css";
import Home from "./screens/Home";
import Reports from "./screens/Reports";
import Cards from "./screens/Cards";
import Groups from "./screens/Groups";
import Settings from "./screens/Settings";
import TransactionSheet from "./sheets/TransactionSheet";
import CategorySheet from "./sheets/CategorySheet";
import { defaultExpCats, defaultIncCats, setCatRegistry, expenseCats, UNCATEGORIZED } from "./lib/categories";
import { uid, todayStr, currentMonth, lsGet, lsSet, sumBy, isIncome, extractTags, onStorageError, storageBytes } from "./lib/core";
import { cleanTxns, cleanCats, cleanSubs, cleanBudgets, cleanProfile, makeBackup, restoreBackup } from "./lib/data";
import { getOcrWorker, preprocessReceiptImage, extractSlipAmount, readImageText } from "./lib/ocr";

const prefersDark = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-color-scheme: dark)").matches;

export default function App() {
  // ── Stored state (keys and shapes unchanged so existing data loads) ──────
  const [lang, setLang] = useState(() => lsGet("ft_lang", "EN"));
  const [dark, setDark] = useState(() => lsGet("ft_dark", prefersDark()));
  const [textScale, setTextScale] = useState(() => Math.min(Math.max(lsGet("ft_text_scale", 1.1), 0.9), 1.3));
  // Everything read from storage is validated first (see lib/data.js).
  const [transactions, setTransactions] = useState(() => cleanTxns(lsGet("ft_txns", [])));
  const [subscriptions, setSubscriptions] = useState(() => cleanSubs(lsGet("ft_subs", [])));
  const [budgets, setBudgets] = useState(() => cleanBudgets(lsGet("ft_budgets", null)));
  const [cats, setCats] = useState(() => ({ exp: cleanCats(lsGet("ft_cats_exp", null), defaultExpCats(), defaultExpCats()), inc: cleanCats(lsGet("ft_cats_inc", null), defaultIncCats(), defaultIncCats()) }));
  const [profile, setProfile] = useState(() => cleanProfile(lsGet("ft_profile", null)));
  const [storageFull, setStorageFull] = useState(false);
  useEffect(() => onStorageError(() => setStorageFull(true)), []);
  const [dismissed, setDismissed] = useState(() => lsGet("ft_dismissed_alerts", {}));
  setCatRegistry(cats); // keep module helpers in step with state (idempotent)

  useEffect(() => { lsSet("ft_txns", transactions); }, [transactions]);
  useEffect(() => { lsSet("ft_subs", subscriptions); }, [subscriptions]);
  useEffect(() => { lsSet("ft_budgets", budgets); }, [budgets]);
  useEffect(() => { lsSet("ft_profile", profile); }, [profile]);
  useEffect(() => { lsSet("ft_dismissed_alerts", dismissed); }, [dismissed]);
  useEffect(() => { lsSet("ft_cats_exp", cats.exp); lsSet("ft_cats_inc", cats.inc); }, [cats]);
  useEffect(() => { lsSet("ft_lang", lang); document.documentElement.lang = lang === "TH" ? "th" : "en"; }, [lang]);
  useEffect(() => { lsSet("ft_dark", dark); document.documentElement.setAttribute("data-theme", dark ? "dark" : "light"); }, [dark]);
  // Text size scales the root font size; every size in theme.css is in rem.
  useEffect(() => { lsSet("ft_text_scale", textScale); document.documentElement.style.fontSize = `${16 * textScale}px`; }, [textScale]);

  // ── UI state ─────────────────────────────────────────────────────────────
  const [tab, setTab] = useState("home");
  const [txSheet, setTxSheet] = useState(null); // transaction being edited, or defaults for a new one
  const [catSheet, setCatSheet] = useState(null); // { type, cat }
  const [reportView, setReportView] = useState("month");
  const [reportMonth, setReportMonth] = useState(currentMonth());
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [scanning, setScanning] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const [undo, setUndo] = useState(null);
  const toast = useCallback((msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), 3000); }, []);
  const tr = (en, th) => (lang === "TH" ? th : en);
  useEffect(() => { window.scrollTo(0, 0); }, [tab]);

  // Repeating payments: add any that fell due earlier this month and haven't been added yet.
  useEffect(() => {
    if (!subscriptions.length) return;
    const now = new Date();
    const month = currentMonth();
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const due = subscriptions.filter((s) => Math.min(parseInt(s.day) || 1, last) <= now.getDate() && !transactions.some((t) => t.recurringId === s.id && t.date.startsWith(month)));
    if (!due.length) return;
    setTransactions((p) => [...due.map((s) => ({ id: uid(), type: "expense", amount: parseFloat(s.amount), originalAmount: parseFloat(s.amount), category: s.category, note: s.name, date: `${month}-${String(Math.min(parseInt(s.day) || 1, last)).padStart(2, "0")}`, tags: [], split: false, reimbursed: 0, recurringId: s.id })), ...p]);
    toast(tr(`Added ${due.length} repeating payment${due.length > 1 ? "s" : ""}`, `เพิ่มรายจ่ายประจำ ${due.length} รายการ`));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptions]);

  // ── Derived numbers for this month ───────────────────────────────────────
  const month = currentMonth();
  const pending = transactions.filter((t) => t.pending);
  const monthTxns = useMemo(() => transactions.filter((t) => !t.pending && t.date.startsWith(month)), [transactions, month]);
  const stats = { spent: sumBy(monthTxns, (t) => !isIncome(t)), income: sumBy(monthTxns, isIncome) };
  const catSpent = {};
  monthTxns.filter((t) => !isIncome(t)).forEach((t) => { catSpent[t.category] = (catSpent[t.category] || 0) + t.amount; });
  const budgetTotal = parseFloat(budgets.total) || 0;
  const alertKeys = [
    ...(budgetTotal > 0 && stats.spent / budgetTotal >= 0.75 ? [`${month}_total`] : []),
    ...expenseCats(lang).filter((c) => { const lim = parseFloat(budgets.categories?.[c.value]) || 0; return lim > 0 && (catSpent[c.value] || 0) / lim >= 0.75; }).map((c) => `${month}_${c.value}`),
  ].filter((k) => !dismissed[k]);

  // ── Transactions ─────────────────────────────────────────────────────────
  const saveTx = (tx) => {
    if (tx.id) setTransactions((p) => p.map((t) => (t.id === tx.id ? tx : t)));
    else setTransactions((p) => [{ ...tx, id: uid() }, ...p]);
    setTxSheet(null);
    toast(tx.id ? tr("Changes saved", "บันทึกการแก้ไขแล้ว") : tr("Saved", "บันทึกแล้ว"));
  };
  const deleteTx = (id) => {
    const idx = transactions.findIndex((t) => t.id === id);
    if (idx < 0) return;
    const tx = transactions[idx];
    setTransactions((p) => p.filter((t) => t.id !== id));
    setTxSheet(null);
    setUndo({ tx, idx, at: Date.now() });
  };
  useEffect(() => { if (!undo) return; const t = setTimeout(() => setUndo(null), 5000); return () => clearTimeout(t); }, [undo]);
  const undoDelete = () => {
    if (!undo) return;
    setTransactions((p) => { const a = [...p]; a.splice(Math.min(undo.idx, a.length), 0, undo.tx); return a; });
    setUndo(null);
  };
  const openNew = (date) => setTxSheet({ type: lsGet("ft_last_type", "expense"), date: date || todayStr() });

  // Copies from Cards and Groups, kept in sync by those tabs.
  const syncCardTxns = useCallback((list) => setTransactions((p) => [...list, ...p.filter((t) => !t.cardEntryId)]), []);
  const linkUpsert = useCallback((x) => setTransactions((p) => {
    const i = p.findIndex((t) => t.groupExpenseId === x.groupExpenseId);
    const row = { type: x.type, amount: x.amount, originalAmount: x.originalAmount, reimbursed: x.reimbursed, split: x.split, category: x.category, note: x.note, date: x.date, tags: extractTags(x.note), groupExpenseId: x.groupExpenseId };
    if (i < 0) return [{ id: uid(), ...row }, ...p];
    const c = [...p]; c[i] = { ...c[i], ...row }; return c;
  }), []);
  const linkDelete = useCallback((gid) => setTransactions((p) => p.filter((t) => t.groupExpenseId !== gid)), []);

  // ── Slip scanning ────────────────────────────────────────────────────────
  const scanFiles = async (files) => {
    const list = files.filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;
    if (!window.Tesseract) { toast(tr("Slip reading isn't available here. Check your connection.", "อ่านสลิปไม่ได้ในตอนนี้ ตรวจสอบอินเทอร์เน็ต")); return; }
    let worker;
    try { worker = await getOcrWorker(() => {}); } catch (err) { console.error(err); toast(tr("Slip reading couldn't start. Try again.", "เริ่มอ่านสลิปไม่สำเร็จ ลองใหม่")); return; }
    const made = [];
    let failed = 0;
    for (let i = 0; i < list.length; i++) {
      setScanning({ i: i + 1, n: list.length });
      try {
        let input = list[i];
        try { input = await preprocessReceiptImage(list[i]); } catch {}
        const { data } = await worker.recognize(input);
        const a = extractSlipAmount(data.text);
        const amt = a != null ? Math.round(a * 100) / 100 : 0;
        made.push({ id: uid(), type: "expense", amount: amt, originalAmount: amt, category: "Uncategorized", pending: true, note: "", date: todayStr(), tags: [], split: false, reimbursed: 0 });
      } catch (err) { console.error(err); failed++; }
    }
    setScanning(null);
    if (made.length) setTransactions((p) => [...made, ...p]);
    toast(made.length
      ? (failed ? tr(`${made.length} read, ${failed} couldn't be read`, `อ่านได้ ${made.length} อ่านไม่ได้ ${failed}`) : tr(`${made.length} slip${made.length > 1 ? "s" : ""} added below`, `เพิ่ม ${made.length} สลิปแล้ว`))
      : tr("Couldn't read those slips. Try a clearer photo.", "อ่านสลิปไม่ได้ ลองรูปที่ชัดขึ้น"));
  };
  const editPending = (id, patch) => setTransactions((p) => p.map((t) => (t.id === id ? { ...t, ...patch, ...(patch.amount != null ? { originalAmount: patch.amount } : {}), ...(patch.note != null ? { tags: extractTags(patch.note) } : {}) } : t)));
  const filePending = (id, category) => {
    const tx = transactions.find((t) => t.id === id);
    if (!tx || !(tx.amount > 0)) { toast(tr("Enter the amount first", "กรอกจำนวนเงินก่อน")); return; }
    setTransactions((p) => p.map((t) => (t.id === id ? { ...t, category, pending: false } : t)));
    toast(tr("Filed", "จัดหมวดแล้ว"));
  };

  // ── Categories ───────────────────────────────────────────────────────────
  const saveCategory = (type, cat) => {
    const key = type === "income" ? "inc" : "exp";
    setCats((p) => ({ ...p, [key]: p[key].some((c) => c.value === cat.value) ? p[key].map((c) => (c.value === cat.value ? cat : c)) : [...p[key], cat] }));
    setCatSheet(null);
  };
  const matchesType = (type, value) => (t) => (type === "income" ? isIncome(t) : !isIncome(t)) && t.category === value;
  const countCatTxns = (type, value) => transactions.filter(matchesType(type, value)).length;
  const deleteCategory = (type, value, mode) => {
    const key = type === "income" ? "inc" : "exp";
    const hit = matchesType(type, value);
    setTransactions((p) => (mode === "delete" ? p.filter((t) => !hit(t)) : p.map((t) => (hit(t) ? { ...t, category: "Uncategorized" } : t))));
    setCats((p) => {
      let list = p[key].filter((c) => c.value !== value);
      if (mode === "reassign" && !list.some((c) => c.value === "Uncategorized")) list = [...list, { ...UNCATEGORIZED }];
      return { ...p, [key]: list };
    });
  };

  // ── Export ───────────────────────────────────────────────────────────────
  const exportCSV = async () => {
    const esc = (v) => { let s = String(v ?? ""); if (/^[=+\-@]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; }; // blocks spreadsheet formula injection
    const rows = [["Date", "Type", "Category", "Note", "Amount", "Shared", "Paid back", "Tags"],
      ...[...transactions].filter((t) => !t.pending).sort((a, b) => b.date.localeCompare(a.date))
        .map((t) => [t.date, t.type || "expense", t.category, t.note || "", t.amount, t.split ? "yes" : "no", t.reimbursed || 0, (t.tags || []).join(" ")])];
    const csv = rows.map((r) => r.map(esc).join(",")).join("\n");
    // Inside a claude.ai artifact plain download links are blocked; saveFile uses its downloads capability instead.
    if (await saveFile(`transactions_${todayStr()}.csv`, csv, "text/csv")) toast(tr("Exported", "ส่งออกแล้ว"));
  };

  // ── Backup ───────────────────────────────────────────────────────────────
  const saveFile = async (filename, text, mime) => {
    const downloads = window.claude?.use ? await window.claude.use("downloads").catch(() => null) : null;
    if (downloads) {
      try { await downloads.save({ filename, data: text }); return true; }
      catch (err) { if (err?.code !== "declined") toast(tr("Saving files isn't available here", "บันทึกไฟล์ไม่ได้ในหน้านี้")); return false; }
    }
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
    return true;
  };
  const backup = async () => { if (await saveFile(`finance-backup_${todayStr()}.json`, makeBackup(), "application/json")) toast(tr("Backup saved", "บันทึกข้อมูลสำรองแล้ว")); };
  const restore = async (file) => {
    if (!file) return;
    const res = restoreBackup(await file.text(), { exp: defaultExpCats(), inc: defaultIncCats() });
    if (!res.ok) {
      toast({ too_big: tr("That file is too large to be a backup.", "ไฟล์ใหญ่เกินไป"), not_json: tr("That file isn't a backup from this app.", "ไฟล์นี้ไม่ใช่ข้อมูลสำรองของแอปนี้"), not_backup: tr("That file isn't a backup from this app.", "ไฟล์นี้ไม่ใช่ข้อมูลสำรองของแอปนี้"), storage_full: tr("Not enough space on this device to restore.", "พื้นที่ในเครื่องไม่พอ") }[res.error]);
      return;
    }
    window.location.reload();
  };

  const tabs = [
    ["home", tr("Home", "หน้าแรก"), HomeIcon],
    ["reports", tr("Reports", "รายงาน"), BarChart3],
    ["cards", tr("Cards", "บัตร"), CreditCard],
    ["groups", tr("Groups", "กลุ่ม"), Users],
    ["settings", tr("Settings", "ตั้งค่า"), SettingsIcon],
  ];

  return (
    <div className="app">
      <main>
        {tab === "home" && (
          <Home lang={lang} stats={stats} monthTxns={monthTxns} pending={pending} budgetTotal={budgetTotal}
            alertCount={alertKeys.length} onDismissAlerts={() => setDismissed((d) => ({ ...d, ...Object.fromEntries(alertKeys.map((k) => [k, true])) }))}
            onOpenReports={() => { setReportView("month"); setReportMonth(month); setTab("reports"); }}
            onAdd={() => openNew()} onScanFiles={scanFiles} scanning={scanning} onOpenTx={setTxSheet}
            onEditPending={editPending} onFilePending={filePending} onDeletePending={(id) => setTransactions((p) => p.filter((t) => t.id !== id))} />
        )}
        {tab === "reports" && (
          <Reports lang={lang} txns={transactions} budgets={budgets} view={reportView} setView={setReportView}
            month={reportMonth} setMonth={setReportMonth} year={reportYear} setYear={setReportYear}
            onOpenTx={setTxSheet} onAddForMonth={(k) => openNew(k === month ? todayStr() : `${k}-01`)} />
        )}
        {tab === "cards" && <Cards lang={lang} onSync={syncCardTxns} readImage={readImageText} toast={toast} />}
        {tab === "groups" && <Groups lang={lang} profile={profile} onLinkUpsert={linkUpsert} onLinkDelete={linkDelete} toast={toast} />}
        {tab === "settings" && (
          <Settings lang={lang} setLang={setLang} dark={dark} setDark={setDark} textScale={textScale} setTextScale={setTextScale}
            profile={profile} setProfile={setProfile} budgets={budgets} setBudgets={setBudgets} subscriptions={subscriptions} setSubscriptions={setSubscriptions}
            txCount={transactions.filter((t) => !t.pending).length} onExport={exportCSV} alertCount={alertKeys.length} catSpent={catSpent} monthSpent={stats.spent}
            onEditCategory={(type, cat) => setCatSheet({ type, cat })} onDeleteCategory={deleteCategory} countCatTxns={countCatTxns}
            onBackup={backup} onRestore={restore} storageUsed={storageBytes()} />
        )}
      </main>

      <nav className="tabbar" aria-label={tr("Sections", "เมนู")}>
        {tabs.map(([id, label, Icon]) => (
          <button key={id} aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)}>
            <Icon size={24} strokeWidth={tab === id ? 2.4 : 1.8} />
            {label}
            {id === "settings" && alertKeys.length > 0 && <span className="dot" aria-label={tr("Budget alert", "แจ้งเตือนงบ")} />}
          </button>
        ))}
      </nav>

      {txSheet && (
        <TransactionSheet key={txSheet.id || "new"} initial={txSheet} lang={lang} onClose={() => setTxSheet(null)}
          onSave={(t) => { lsSet("ft_last_type", t.type); saveTx(t); }} onDelete={deleteTx} />
      )}
      {catSheet && <CategorySheet type={catSheet.type} initial={catSheet.cat} lang={lang} onSave={(c) => saveCategory(catSheet.type, c)} onClose={() => setCatSheet(null)} />}

      {storageFull && (
        <div className="notice storage-full" role="alert">
          <span style={{ flex: 1 }}>{tr("This device's storage is full, so recent changes may not be kept. Save a backup in Settings, then remove old items.", "พื้นที่จัดเก็บในเครื่องเต็ม การแก้ไขล่าสุดอาจไม่ถูกบันทึก บันทึกข้อมูลสำรองในการตั้งค่า แล้วลบรายการเก่า")}</span>
          <button className="icon-btn plain" onClick={() => setStorageFull(false)} aria-label={tr("Dismiss", "ปิด")}>×</button>
        </div>
      )}
      {undo ? (
        <div className="toast" role="status">{tr("Deleted", "ลบแล้ว")}<button onClick={undoDelete}>{tr("Undo", "เลิกทำ")}</button></div>
      ) : toastMsg ? (
        <div className="toast" role="status">{toastMsg}</div>
      ) : null}
      {scanning && <div className="busy"><div><span className="spinner" />{tr("Reading slip", "กำลังอ่านสลิป")} {scanning.i}/{scanning.n}</div></div>}
    </div>
  );
}
