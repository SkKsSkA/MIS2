/** Часовой пояс, в котором показываем время встреч (одинаково на сервере и в браузере). */
export const APP_TZ = "Asia/Almaty";

export const KINDS = [
  "День рождения",
  "Вечеринка",
  "Выезд на природу",
  "Книжный клуб",
  "Пробежка",
  "Настольные игры",
] as const;

export function formatDate(iso: string): string {
  const s = new Intl.DateTimeFormat("ru-RU", {
    timeZone: APP_TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(iso));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: APP_TZ,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatMoney(n: number): string {
  return `${new Intl.NumberFormat("ru-RU").format(n)} ₸`;
}

/** Разница в календарных днях по времени Алматы: сегодня = 0, завтра = 1. */
export function daysUntil(iso: string): number {
  const day = (d: Date) => new Date(`${d.toLocaleDateString("sv-SE", { timeZone: APP_TZ })}T00:00:00Z`).getTime();
  return Math.round((day(new Date(iso)) - day(new Date())) / 86_400_000);
}

export function daysLabel(iso: string): string {
  const d = daysUntil(iso);
  if (d < 0) return "уже прошла";
  if (d === 0) return "сегодня";
  if (d === 1) return "завтра";
  const last = d % 10;
  const word = d % 100 >= 11 && d % 100 <= 14 ? "дней" : last === 1 ? "день" : last >= 2 && last <= 4 ? "дня" : "дней";
  return `через ${d} ${word}`;
}

const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
  х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  ә: "a", ғ: "g", қ: "k", ң: "n", ө: "o", ұ: "u", ү: "u", һ: "h", і: "i",
};

/** Читаемый адрес встречи: «den-rozhdeniya-diny-k3x9». */
export function makeSlug(title: string): string {
  const base = title
    .toLowerCase()
    .split("")
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${base || "meet"}-${rand}`;
}

/** Ссылка на поиск места в 2GIS (без ключей API). */
export function mapLink(location: string, address: string): string {
  const q = encodeURIComponent([location, address].filter(Boolean).join(", "));
  return `https://2gis.kz/search/${q}`;
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}
