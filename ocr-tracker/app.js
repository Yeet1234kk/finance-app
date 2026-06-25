// ═══════════════════════════════════════════════════════════════════
//  My Expenses — vanilla JS + Tesseract.js OCR receipt tracker
//  Storage: localStorage key "ocr_txns" (separate from the React app)
// ═══════════════════════════════════════════════════════════════════

// ── Categories (slip-focused) ──────────────────────────────────────
const CATEGORIES = [
  { id: "food",          emoji: "🍜", color: "#FF9F0A", en: "Food",          th: "อาหาร" },
  { id: "shopping",      emoji: "🛍️", color: "#AF52DE", en: "Shopping",      th: "ช้อปปิ้ง" },
  { id: "transport",    emoji: "🚇", color: "#5AC8FA", en: "Transport",      th: "เดินทาง" },
  { id: "bills",         emoji: "⚡", color: "#FFCC00", en: "Bills",         th: "บิล" },
  { id: "health",        emoji: "💊", color: "#FF375F", en: "Health",        th: "สุขภาพ" },
  { id: "entertainment", emoji: "🎬", color: "#64D2FF", en: "Entertainment", th: "บันเทิง" },
  { id: "other",         emoji: "📦", color: "#8E8E93", en: "Other",         th: "อื่นๆ" },
];
const catById = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];

// ── i18n ───────────────────────────────────────────────────────────
const I18N = {
  EN: {
    title: "My Expenses", totalLabel: "Total Spent", recent: "Recent",
    txns: (n) => `${n} transaction${n !== 1 ? "s" : ""}`,
    emptyTitle: "No transactions yet", emptySub: "Tap + to scan a receipt",
    loading: (p) => `Reading receipt… ${p}%`,
    confirmTitle: "Confirm Transaction",
    amount: "Amount", category: "Category", date: "Date", note: "Note (optional)", save: "Save",
    hintFound: "We found an amount — please verify it's correct.",
    hintManual: "Couldn't read the total. Please type the amount from the image.",
    notePh: "e.g. 7-Eleven",
  },
  TH: {
    title: "ค่าใช้จ่ายของฉัน", totalLabel: "ยอดใช้จ่ายทั้งหมด", recent: "ล่าสุด",
    txns: (n) => `${n} รายการ`,
    emptyTitle: "ยังไม่มีรายการ", emptySub: "แตะ + เพื่อสแกนใบเสร็จ",
    loading: (p) => `กำลังอ่านใบเสร็จ… ${p}%`,
    confirmTitle: "ยืนยันรายการ",
    amount: "จำนวนเงิน", category: "หมวดหมู่", date: "วันที่", note: "โน้ต (ไม่บังคับ)", save: "บันทึก",
    hintFound: "เราพบจำนวนเงินแล้ว — โปรดตรวจสอบความถูกต้อง",
    hintManual: "อ่านยอดรวมไม่ได้ โปรดพิมพ์จำนวนเงินจากรูปภาพ",
    notePh: "เช่น เซเว่น",
  },
};
let lang = localStorage.getItem("ocr_lang") || "EN";
const t = () => I18N[lang];

// ── State / storage (CRUD) ─────────────────────────────────────────
const STORE_KEY = "ocr_txns";
let transactions = loadTxns();

function loadTxns() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((x) => x && typeof x.amount === "number") : [];
  } catch { return []; }
}
function saveTxns() { localStorage.setItem(STORE_KEY, JSON.stringify(transactions)); }
function addTxn(txn) { transactions.unshift(txn); saveTxns(); render(); }
function deleteTxn(id) { transactions = transactions.filter((x) => x.id !== id); saveTxns(); render(); }

// ── Helpers ────────────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const uid = () => "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtBaht = (n) =>
  "฿" + Number(n).toLocaleString(lang === "TH" ? "th-TH" : "en-US", { maximumFractionDigits: 2 });
function fmtDate(d) {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString(lang === "TH" ? "th-TH" : "en-US", { day: "numeric", month: "short", year: "numeric" });
}

// ── Rendering ──────────────────────────────────────────────────────
function render() {
  const total = transactions.reduce((s, x) => s + x.amount, 0);
  $("#totalAmount").textContent = fmtBaht(total);
  $("#totalSub").textContent = t().txns(transactions.length);

  const list = $("#txnList");
  list.innerHTML = "";
  transactions.forEach((x) => {
    const c = catById(x.category);
    const item = document.createElement("div");
    item.className = "txn-item";
    item.innerHTML = `
      <div class="txn-icon" style="background:${c.color}22">${c.emoji}</div>
      <div class="txn-info">
        <p class="txn-cat">${c[lang.toLowerCase()]}${x.note ? ` · ${escapeHtml(x.note)}` : ""}</p>
        <p class="txn-date">${fmtDate(x.date)}</p>
      </div>
      <span class="txn-amount">${fmtBaht(x.amount)}</span>
      <button class="txn-del" aria-label="Delete">🗑</button>`;
    item.querySelector(".txn-del").addEventListener("click", () => deleteTxn(x.id));
    list.appendChild(item);
  });

  $("#emptyState").classList.toggle("hidden", transactions.length > 0);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

function applyLang() {
  const L = t();
  $("#t-title").textContent = L.title;
  $("#t-totalLabel").textContent = L.totalLabel;
  $("#t-recent").textContent = L.recent;
  $("#t-emptyTitle").textContent = L.emptyTitle;
  $("#t-emptySub").textContent = L.emptySub;
  $("#t-confirmTitle").textContent = L.confirmTitle;
  $("#t-amountLabel").textContent = L.amount;
  $("#t-catLabel").textContent = L.category;
  $("#t-dateLabel").textContent = L.date;
  $("#t-noteLabel").textContent = L.note;
  $("#saveBtn").textContent = L.save;
  $("#noteInput").placeholder = L.notePh;
  $("#langToggle").textContent = lang === "EN" ? "TH" : "EN";
  document.documentElement.lang = lang === "TH" ? "th" : "en";
  buildCatGrid();
  render();
}

// ── Category picker in modal ───────────────────────────────────────
let selectedCat = "other";
function buildCatGrid() {
  const grid = $("#catGrid");
  grid.innerHTML = "";
  CATEGORIES.forEach((c) => {
    const btn = document.createElement("button");
    btn.className = "cat-btn" + (c.id === selectedCat ? " active" : "");
    btn.innerHTML = `<span class="emoji">${c.emoji}</span>${c[lang.toLowerCase()]}`;
    btn.addEventListener("click", () => { selectedCat = c.id; buildCatGrid(); });
    grid.appendChild(btn);
  });
}

// ── OCR pipeline (Tesseract) ───────────────────────────────────────
// Worker is created lazily on first upload and reused afterwards.
let ocrWorker = null;
async function getWorker(onProgress) {
  if (ocrWorker) return ocrWorker;
  // eng + tha so Thai-slip keywords/digits read better.
  ocrWorker = await Tesseract.createWorker(["eng", "tha"], 1, {
    logger: (m) => { if (m.status === "recognizing text") onProgress(Math.round(m.progress * 100)); },
  });
  return ocrWorker;
}

async function processImage(file) {
  showLoading(0);
  try {
    const worker = await getWorker((p) => showLoading(p));
    const { data } = await worker.recognize(file);
    const amount = extractAmount(data.text);
    hideLoading();
    openConfirm(amount);
  } catch (err) {
    console.error("OCR failed:", err);
    hideLoading();
    openConfirm(null); // fall back to manual entry
  }
}

// ── Regex extraction strategy ──────────────────────────────────────
// 1) Keyword (Total / Amount / รวม / จำนวนเงิน …) followed by a number.
// 2) Otherwise, pick the largest currency-shaped number in the text.
function extractAmount(text) {
  if (!text) return null;
  const NUM = "(\\d{1,3}(?:,\\d{3})*(?:\\.\\d{1,2})?|\\d+(?:\\.\\d{1,2})?)";
  const KEYWORDS = ["grand total", "total", "amount due", "amount", "balance",
                    "ยอดรวมสุทธิ", "ยอดรวม", "ยอดชำระ", "รวมทั้งสิ้น", "จำนวนเงิน", "รวม"];
  for (const kw of KEYWORDS) {
    const re = new RegExp(kw.replace(/\s+/g, "\\s*") + "[\\s:.\\-฿]*" + NUM, "i");
    const m = text.match(re);
    if (m && m[1]) {
      const v = parseFloat(m[1].replace(/,/g, ""));
      if (v > 0) return v;
    }
  }
  // Fallback: largest number that looks like money (prefer ones with decimals).
  const all = [...text.matchAll(new RegExp(NUM, "g"))]
    .map((m) => parseFloat(m[0].replace(/,/g, "")))
    .filter((v) => !isNaN(v) && v >= 1 && v < 10_000_000);
  if (!all.length) return null;
  return Math.max(...all);
}

// ── Loading overlay ────────────────────────────────────────────────
function showLoading(pct) {
  $("#loadingText").textContent = t().loading(pct);
  $("#loadingOverlay").classList.remove("hidden");
}
function hideLoading() { $("#loadingOverlay").classList.add("hidden"); }

// ── Confirm modal ──────────────────────────────────────────────────
function openConfirm(amount) {
  selectedCat = "other";
  buildCatGrid();
  $("#amountInput").value = amount != null ? String(amount) : "";
  $("#dateInput").value = todayStr();
  $("#noteInput").value = "";
  $("#ocrHint").textContent = amount != null ? t().hintFound : t().hintManual;
  $("#confirmOverlay").classList.remove("hidden");
  if (amount == null) setTimeout(() => $("#amountInput").focus(), 250);
}
function closeConfirm() { $("#confirmOverlay").classList.add("hidden"); }

function saveFromModal() {
  const amount = parseFloat(($("#amountInput").value || "").replace(/,/g, ""));
  if (!amount || amount <= 0) { $("#amountInput").focus(); return; }
  addTxn({
    id: uid(),
    amount: Math.round(amount * 100) / 100,
    category: selectedCat,
    date: $("#dateInput").value || todayStr(),
    note: ($("#noteInput").value || "").trim(),
    createdAt: new Date().toISOString(),
  });
  closeConfirm();
}

// ── Wire up events ─────────────────────────────────────────────────
$("#fab").addEventListener("click", () => $("#fileInput").click());
$("#fileInput").addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  e.target.value = ""; // allow re-selecting the same file
  if (file) processImage(file);
});
$("#confirmClose").addEventListener("click", closeConfirm);
$("#saveBtn").addEventListener("click", saveFromModal);
$("#confirmOverlay").addEventListener("click", (e) => { if (e.target.id === "confirmOverlay") closeConfirm(); });
$("#langToggle").addEventListener("click", () => {
  lang = lang === "EN" ? "TH" : "EN";
  localStorage.setItem("ocr_lang", lang);
  applyLang();
});

// ── Init ───────────────────────────────────────────────────────────
applyLang();
