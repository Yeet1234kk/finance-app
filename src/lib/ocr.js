// ─── Receipt OCR (Tesseract.js via CDN window.Tesseract) ─────────────────────
let _ocrWorker = null;
export async function getOcrWorker(onProgress) {
  if (_ocrWorker) return _ocrWorker;
  _ocrWorker = await window.Tesseract.createWorker(["eng", "tha"], 1, {
    logger: (m) => { if (m.status === "recognizing text") onProgress(Math.round(m.progress * 100)); },
  });
  // Receipts are one uniform column of text; the default fully-automatic layout analysis
  // (PSM 3) can misread that as multiple columns/blocks on a noisy phone photo. PSM 6 tells
  // Tesseract to treat the whole image as a single block, which reads receipts more reliably.
  await _ocrWorker.setParameters({ tessedit_pageseg_mode: "6" });
  return _ocrWorker;
}

// Phone photos of receipts are the main source of OCR misreads: uneven lighting, glare, low
// contrast between faint thermal-printer ink and paper. Upscaling small photos (more pixels
// per character) and pushing a grayscale contrast stretch toward black/white before handing
// the image to Tesseract measurably improves character recognition versus feeding it the raw
// photo. Falls back to the original file if canvas processing fails for any reason.
export async function preprocessReceiptImage(file) {
  const img = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = URL.createObjectURL(file);
  });
  try {
    const scale = img.naturalWidth < 1200 ? 1200 / img.naturalWidth : 1;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const boosted = Math.min(255, Math.max(0, (gray - 128) * 1.6 + 128));
      d[i] = d[i + 1] = d[i + 2] = boosted;
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  } finally {
    URL.revokeObjectURL(img.src);
  }
}
// Extract a total: keyword priority (Total/Amount/รวม/จำนวนเงิน…), else the best price-shaped number.
//
// NUM's first branch requires >=1 comma-group so it only fires for genuinely comma-formatted
// numbers (e.g. "12,345.67"); previously it used `*` (zero-or-more), which let it match just the
// leading 1-3 digits of ANY plain digit run before the second branch ever got a chance, silently
// truncating any total >= 1000 written without a thousands separator (e.g. "1500.00" -> "150").
export function extractSlipAmount(text) {
  if (!text) return null;
  const NUM = "(\\d{1,3}(?:,\\d{3})+(?:\\.\\d{1,2})?|\\d+(?:\\.\\d{1,2})?)";
  const KEYWORDS = ["grand total", "total", "amount due", "amount", "balance",
                    "ยอดรวมสุทธิ", "ยอดรวม", "ยอดชำระ", "รวมทั้งสิ้น", "จำนวนเงิน", "รวม"];
  for (const kw of KEYWORDS) {
    // \b before the keyword stops "total" from matching inside "Subtotal" (no boundary
    // between "sub" and "total" -- without it, a receipt listing both lines would silently
    // grab the smaller subtotal). Global + last-match: receipts list subtotal/tax before the
    // final total, so the last matching line for a given keyword is the authoritative one.
    const re = new RegExp("\\b" + kw.replace(/\s+/g, "\\s*") + "\\b[\\s:.\\-฿]*" + NUM, "gi");
    const matches = [...text.matchAll(re)];
    if (matches.length) {
      const v = parseFloat(matches[matches.length - 1][1].replace(/,/g, ""));
      if (v > 0) return v;
    }
  }
  // No keyword matched (OCR garbled the label, or an unlisted phrasing was used). Rather than
  // picking "the biggest number anywhere in the text" -- which lets invoice numbers, tax IDs,
  // phone numbers and dates outrank the real total -- prefer numbers that look like a price
  // (carry a decimal amount), and among those the last one, since totals are conventionally
  // printed at the bottom of a receipt.
  const candidates = [...text.matchAll(new RegExp(NUM, "g"))]
    .map((m) => ({ value: parseFloat(m[0].replace(/,/g, "")), hasDecimal: /\.\d{1,2}$/.test(m[0]) }))
    .filter((c) => !isNaN(c.value) && c.value >= 1 && c.value < 10_000_000)
    // Exclude bare integers that look like a calendar year (e.g. a printed date) unless they
    // carry a decimal amount -- a real total in that range almost always has one.
    .filter((c) => c.hasDecimal || !(Number.isInteger(c.value) && c.value >= 1900 && c.value <= 2099));
  if (!candidates.length) return null;
  const withDecimal = candidates.filter((c) => c.hasDecimal);
  const pool = withDecimal.length ? withDecimal : candidates;
  return pool[pool.length - 1].value;
}

// Read all text from one image (slip or statement), using the shared worker.
export async function readImageText(file) {
  if (!window.Tesseract) throw new Error("OCR not loaded");
  const worker = await getOcrWorker(() => {});
  let input = file;
  try { input = await preprocessReceiptImage(file); } catch (err) { console.error("Preprocessing failed, using raw image:", err); }
  const { data } = await worker.recognize(input);
  return data.text;
}
