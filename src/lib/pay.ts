/** Помощники для взносов через перевод Kaspi. Деньги через сервис не проходят. */

/** Приводит номер к виду +7XXXXXXXXXX. Принимает 8707…, 7707…, +7 707… и т. п. Иначе возвращает null. */
export function normalizePhone(raw: string): string | null {
  let d = raw.replace(/\D/g, "");
  if (d.length === 11 && (d.startsWith("8") || d.startsWith("7"))) d = d.slice(1);
  if (d.length !== 10 || !d.startsWith("7")) return null;
  return `+7${d}`;
}

/** «+77071234567» → «+7 707 123 45 67». */
export function formatPhone(p: string): string {
  const m = /^\+7(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(p);
  return m ? `+7 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : p;
}

/** Ссылка принимается только на kaspi.kz и его поддомены (то же правило стоит в базе). */
export function normalizeKaspiLink(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    const host = u.hostname.toLowerCase();
    if (u.protocol !== "https:" || u.username || u.password) return null;
    if (host !== "kaspi.kz" && !host.endsWith(".kaspi.kz")) return null;
    const s = u.toString();
    return s.length <= 300 ? s : null;
  } catch {
    return null;
  }
}

/** Копирование в буфер с запасным вариантом для старых браузеров. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}
