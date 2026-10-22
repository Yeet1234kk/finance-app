import {
  Utensils, TramFront, Bus, ShoppingBag, Zap, Package, Briefcase, Gift, TrendingUp, Laptop, Banknote, Coffee,
  ShoppingCart, Fuel, Home, Lightbulb, PartyPopper, Gamepad2, Clapperboard, Pill, Stethoscope, Plane, Palmtree,
  Shirt, Sparkles, BookOpen, Cat, Dog, GraduationCap, Dumbbell, Music, Leaf, Wrench, Heart, Baby, Smartphone, Wifi,
  Car, Receipt, CreditCard, PiggyBank, Landmark, Percent, Coins, CalendarClock, CheckCircle2, BedDouble, Tent,
  Umbrella, Pizza, Target, Folder, HandCoins, Ticket,
} from "lucide-react";

// Line icons replace emoji everywhere: one stroke weight, tinted with the category colour.
export const ICONS = {
  utensils: Utensils, coffee: Coffee, pizza: Pizza, cart: ShoppingCart, bag: ShoppingBag, shirt: Shirt, beauty: Sparkles,
  train: TramFront, bus: Bus, car: Car, fuel: Fuel, plane: Plane,
  home: Home, bolt: Zap, bulb: Lightbulb, wifi: Wifi, phone: Smartphone, receipt: Receipt,
  health: Stethoscope, pill: Pill, fitness: Dumbbell, baby: Baby, heart: Heart,
  gift: Gift, party: PartyPopper, game: Gamepad2, film: Clapperboard, music: Music, ticket: Ticket, book: BookOpen, school: GraduationCap,
  travel: Palmtree, beach: Umbrella, tent: Tent, bed: BedDouble, cat: Cat, dog: Dog, leaf: Leaf, tools: Wrench, target: Target,
  briefcase: Briefcase, laptop: Laptop, trend: TrendingUp, cash: Banknote, coins: Coins, savings: PiggyBank, bank: Landmark, handcoins: HandCoins,
  card: CreditCard, percent: Percent, calendar: CalendarClock, check: CheckCircle2, box: Package, folder: Folder,
};

// Icons offered when creating a category or group, in a sensible order.
export const CATEGORY_ICON_KEYS = ["utensils", "coffee", "cart", "bag", "shirt", "beauty", "train", "bus", "car", "fuel", "plane", "home", "bolt", "bulb", "wifi", "phone", "health", "pill", "fitness", "baby", "heart", "gift", "party", "game", "film", "music", "book", "school", "travel", "cat", "dog", "leaf", "tools", "briefcase", "laptop", "trend", "cash", "savings", "bank", "box"];
export const GROUP_ICON_KEYS = ["plane", "home", "party", "utensils", "tent", "briefcase", "school", "game", "bag", "fitness", "beach", "music", "pizza", "target", "travel", "heart"];

// Saved data from earlier versions stores emoji; map them to the matching line icon.
const FROM_EMOJI = {
  "🍜": "utensils", "🍔": "utensils", "☕": "coffee", "🛒": "cart", "🚇": "train", "⛽": "fuel", "🏠": "home", "💡": "bulb",
  "🎁": "gift", "🎉": "party", "🎮": "game", "🎬": "film", "💊": "pill", "🏥": "health", "✈️": "plane", "🏖️": "beach",
  "👕": "shirt", "💄": "beauty", "📚": "book", "🐱": "cat", "🐶": "dog", "💼": "briefcase", "📈": "trend", "💻": "laptop",
  "💵": "cash", "🎓": "school", "🏋️": "fitness", "⚽": "target", "🎵": "music", "🌿": "leaf", "🔧": "tools", "📦": "box",
  "🛍️": "bag", "⚡": "bolt", "🗂️": "folder", "🏨": "bed", "🏕️": "tent", "💪": "fitness", "🎸": "music", "🍕": "pizza",
  "🎯": "target", "🌴": "travel", "🗓️": "calendar", "🧾": "receipt", "✅": "check",
};

export const iconKey = (icon) => (ICONS[icon] ? icon : FROM_EMOJI[icon] || null);

// Renders a stored icon (line-icon key or legacy emoji) as a line icon.
export function Glyph({ icon, size = 20, strokeWidth = 1.75 }) {
  const C = ICONS[iconKey(icon)];
  if (C) return <C size={size} strokeWidth={strokeWidth} aria-hidden="true" />;
  return <span aria-hidden="true" style={{ fontSize: size * 0.9, lineHeight: 1 }}>{icon || "•"}</span>;
}
