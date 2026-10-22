// Editable categories. Built-ins carry EN/TH names until the user renames them;
// custom categories store a plain label. The stored shape (value, label, icon, bar,
// pastelBg, pastelText) is unchanged from earlier versions so saved data still loads.

const EXP = [
  { value: "Food",      icon: "utensils", bar: "#E07A3F", en: ["Food & Drink", "Food"],   th: ["อาหาร & เครื่องดื่ม", "อาหาร"] },
  { value: "Transport", icon: "train", bar: "#3B82C4", en: ["Transport", "Transport"], th: ["เดินทาง", "เดินทาง"] },
  { value: "Shopping",  icon: "bag", bar: "#8B6FD6", en: ["Shopping", "Shopping"],   th: ["ช้อปปิ้ง", "ช้อปปิ้ง"] },
  { value: "Bills",     icon: "bolt", bar: "#C9A227", en: ["Bills", "Bills"],         th: ["บิล/ค่าใช้จ่าย", "บิล"] },
  { value: "Other",     icon: "box", bar: "#7C8796", en: ["Other", "Other"],         th: ["อื่นๆ", "อื่นๆ"] },
];
const INC = [
  { value: "Salary",      icon: "briefcase", bar: "#2E9D6A", en: ["Salary", "Salary"],             th: ["เงินเดือน", "เงินเดือน"] },
  { value: "Gift",        icon: "gift", bar: "#D0578F", en: ["Gift", "Gift"],                 th: ["ของขวัญ", "ของขวัญ"] },
  { value: "Investment",  icon: "trend", bar: "#3B82C4", en: ["Investment", "Invest"],         th: ["การลงทุน", "ลงทุน"] },
  { value: "Freelance",   icon: "laptop", bar: "#8B6FD6", en: ["Freelance", "Freelance"],       th: ["ฟรีแลนซ์", "ฟรีแลนซ์"] },
  { value: "OtherIncome", icon: "cash", bar: "#7C8796", en: ["Other income", "Other"],        th: ["รายได้อื่นๆ", "อื่นๆ"] },
];

const build = (c) => ({
  value: c.value, icon: c.icon, bar: c.bar, pastelBg: c.bar + "22", pastelText: c.bar, builtin: true,
  label: c.en[0], labelShort: c.en[1],
  i18n: { EN: c.en[0], TH: c.th[0] }, i18nShort: { EN: c.en[1], TH: c.th[1] },
});
export const defaultExpCats = () => EXP.map(build);
export const defaultIncCats = () => INC.map(build);

export const UNCATEGORIZED = { value: "Uncategorized", icon: "folder", bar: "#7C8796", label: "Uncategorized", labelShort: "Other", i18n: { EN: "Uncategorized", TH: "ไม่มีหมวดหมู่" }, i18nShort: { EN: "Other", TH: "อื่นๆ" } };

// Live registry mirrored from React state so plain helpers can resolve a category
// anywhere without prop-drilling.
let REGISTRY = { exp: defaultExpCats(), inc: defaultIncCats() };
export const setCatRegistry = (next) => { REGISTRY = next; };

const localize = (c, lang) => ({
  ...c,
  label: c.i18n?.[lang] || c.label,
  labelShort: c.i18nShort?.[lang] || c.labelShort || c.label,
});

export const expenseCats = (lang) => REGISTRY.exp.map((c) => localize(c, lang));
export const incomeCats = (lang) => REGISTRY.inc.map((c) => localize(c, lang));
export const getCat = (value, lang = "EN") => {
  const c = REGISTRY.exp.find((x) => x.value === value) || REGISTRY.inc.find((x) => x.value === value) || UNCATEGORIZED;
  return localize(c, lang);
};
export const isIncomeCat = (value) => REGISTRY.inc.some((c) => c.value === value);

// Muted, mid-tone colours that read on both the light and dark themes.
export const CAT_COLORS = ["#E07A3F","#3B82C4","#8B6FD6","#C9A227","#D0578F","#2E9D6A","#C2524A","#1F9AA0","#6D7FD6","#A5793D","#5E8C3A","#7C8796"];
