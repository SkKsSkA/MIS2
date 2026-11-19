"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { COVER_BG } from "@/lib/cover";
import { daysLabel, formatDate, formatMoney, formatTime } from "@/lib/format";
import { randomKey } from "@/lib/guest";
import { formatPhone, normalizeKaspiLink, normalizePhone } from "@/lib/pay";
import { getBrowserSupabase } from "@/lib/supabase/client";
import type { BringItemRow, ContributionRow, EventRow, RsvpRow, RsvpStatus } from "@/lib/types";

const STATUS_LABEL: Record<RsvpStatus, string> = { yes: "Придёт", maybe: "Думает", no: "Не придёт" };
const STATUS_BG: Record<RsvpStatus, string> = { yes: "bg-sun", maybe: "bg-violet", no: "bg-pink" };

export function OrganizerPanel({
  event,
  rsvps,
  contributions: initialContrib,
  items: initialItems,
  siteUrl,
}: {
  event: EventRow;
  rsvps: RsvpRow[];
  contributions: ContributionRow[];
  items: BringItemRow[];
  siteUrl: string;
}) {
  const [origin, setOrigin] = useState(siteUrl);
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState<"all" | RsvpStatus>("all");
  const [contrib, setContrib] = useState(initialContrib);
  const [items, setItems] = useState(initialItems);
  const [newItem, setNewItem] = useState("");
  const [error, setError] = useState("");
  const [payPhone, setPayPhone] = useState(event.pay_phone ? formatPhone(event.pay_phone) : "");
  const [payRecipient, setPayRecipient] = useState(event.pay_recipient ?? "");
  const [payLink, setPayLink] = useState(event.pay_link ?? "");
  const [payNote, setPayNote] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualAmount, setManualAmount] = useState("");

  useEffect(() => {
    if (!siteUrl) setOrigin(window.location.origin);
  }, [siteUrl]);

  const link = `${origin}/e/${event.slug}`;
  const count = (s: RsvpStatus) => rsvps.filter((r) => r.status === s).length;
  const shown = filter === "all" ? rsvps : rsvps.filter((r) => r.status === filter);
  const raised = contrib.filter((c) => c.confirmed).reduce((sum, c) => sum + c.amount, 0);
  const pending = contrib.filter((c) => !c.confirmed);
  const confirmedList = contrib.filter((c) => c.confirmed);
  const pct = event.goal_amount ? Math.min(100, Math.round((raised / event.goal_amount) * 100)) : 0;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Не удалось скопировать. Выдели ссылку и скопируй вручную.");
    }
  }

  async function shareReminder() {
    const text = `Напоминаю про «${event.title}»: ${formatDate(event.starts_at)}, ${formatTime(event.starts_at)}. Ответь, пожалуйста, одним нажатием: ${link}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* окно закрыли */
    }
  }

  async function confirm(id: string) {
    const sb = getBrowserSupabase();
    if (!sb) return;
    const { error: err } = await sb.from("contributions").update({ confirmed: true }).eq("id", id);
    if (err) return setError("Не получилось подтвердить перевод.");
    setContrib((cur) => cur.map((c) => (c.id === id ? { ...c, confirmed: true } : c)));
  }

  /** Отклонить ошибочный или неоплаченный взнос. */
  async function reject(id: string) {
    const sb = getBrowserSupabase();
    if (!sb) return;
    const { error: err } = await sb.from("contributions").delete().eq("id", id);
    if (err) return setError("Не получилось отклонить взнос.");
    setContrib((cur) => cur.filter((c) => c.id !== id));
  }

  /** Взнос, который внёс сам организатор или принял наличными: сразу подтверждён. */
  async function addManual(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const sb = getBrowserSupabase();
    const nameClean = manualName.trim();
    const value = Math.round(Number(manualAmount.replace(/\s/g, "")));
    if (!sb) return;
    if (!nameClean) return setError("Напиши, чей это взнос.");
    if (!Number.isFinite(value) || value <= 0 || value > 10_000_000) return setError("Укажи сумму цифрами, например 5000.");
    const { data, error: err } = await sb
      .from("contributions")
      .insert({ event_id: event.id, guest_key: randomKey(), guest_name: nameClean.slice(0, 60), amount: value, confirmed: true })
      .select("id, guest_name, amount, confirmed, payer_hint, created_at")
      .single();
    if (err || !data) return setError("Не получилось добавить взнос.");
    setContrib((cur) => [...cur, data as ContributionRow]);
    setManualName("");
    setManualAmount("");
  }

  async function savePay(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPayNote("");
    const sb = getBrowserSupabase();
    if (!sb) return;
    const phone = payPhone.trim() ? normalizePhone(payPhone) : null;
    if (payPhone.trim() && !phone) return setError("Номер должен быть таким: +7 и 10 цифр.");
    const link = payLink.trim() ? normalizeKaspiLink(payLink) : null;
    if (payLink.trim() && !link) return setError("Ссылка должна вести на kaspi.kz и начинаться с https://.");
    const { error: err } = await sb
      .from("events")
      .update({ pay_phone: phone, pay_recipient: payRecipient.trim() || null, pay_link: link })
      .eq("id", event.id);
    if (err) return setError("Не получилось сохранить реквизиты. Проверь, что выполнена миграция 0002.");
    setPayPhone(phone ? formatPhone(phone) : "");
    setPayLink(link ?? "");
    setPayNote(phone ? "Сохранено: гости увидят этот номер на странице встречи." : "Номер убран: гости не увидят, куда переводить.");
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    const label = newItem.trim();
    const sb = getBrowserSupabase();
    if (!label || !sb) return;
    const { data, error: err } = await sb
      .from("bring_items")
      .insert({ event_id: event.id, label: label.slice(0, 80) })
      .select("id, label, taken_by")
      .single();
    if (err || !data) return setError("Не получилось добавить пункт.");
    setItems((cur) => [...cur, data as BringItemRow]);
    setNewItem("");
  }

  async function removeItem(id: string) {
    const sb = getBrowserSupabase();
    if (!sb) return;
    const { error: err } = await sb.from("bring_items").delete().eq("id", id);
    if (err) return setError("Не получилось удалить пункт.");
    setItems((cur) => cur.filter((i) => i.id !== id));
  }

  return (
    <main className="mx-auto max-w-2xl px-5 pb-12 pt-2 sm:px-8">
      <div className={`rounded-3xl border-2 border-ink p-6 text-ink ${COVER_BG[event.cover_color]}`}>
        <span className="rounded-full border-2 border-ink bg-ink px-3.5 py-1.5 text-sm font-bold text-white">Панель организатора</span>
        <h1 className="h-display mt-5 text-3xl leading-tight">{event.title}</h1>
        <p className="mt-2 font-semibold">
          {formatDate(event.starts_at)} · {formatTime(event.starts_at)} · {daysLabel(event.starts_at)}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {(["yes", "maybe", "no"] as const).map((s) => (
          <div key={s} className={`rounded-2xl border-2 border-ink p-3.5 text-center text-ink shadow-pop-sm ${STATUS_BG[s]}`}>
            <div className="h-display text-3xl">{count(s)}</div>
            <div className="text-sm font-semibold">{s === "yes" ? "придут" : s === "maybe" ? "думают" : "не придут"}</div>
          </div>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-5 rounded-2xl border-2 border-ink bg-coral p-3.5 font-semibold">
          {error}
        </p>
      )}

      <section className="card bg-sky mt-5" aria-labelledby="link-h">
        <h2 id="link-h" className="h-display text-base">
          Ссылка для гостей
        </h2>
        <div className="mt-3 flex items-center gap-2.5">
          <input readOnly value={link} aria-label="Ссылка на встречу" onFocus={(e) => e.currentTarget.select()} className="field min-w-0 flex-1 text-[15px]" />
          <button onClick={copy} className="btn-sun">
            {copied ? "Готово" : "Копировать"}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2.5">
          <Link href={`/e/${event.slug}`} className="btn-dark">
            Открыть как гость
          </Link>
          <button onClick={shareReminder} className="btn-dark">
            Поделиться напоминанием
          </button>
        </div>
      </section>

      <section className="card bg-mint mt-5" aria-labelledby="guests-h">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="guests-h" className="h-display text-base">
            Гости
          </h2>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Фильтр гостей">
            {(
              [
                ["all", "Все"],
                ["yes", "Придут"],
                ["maybe", "Думают"],
                ["no", "Не придут"],
              ] as const
            ).map(([k, label]) => (
              <button key={k} aria-pressed={filter === k} onClick={() => setFilter(k)} className={`chip ${filter === k ? "bg-ink text-white" : "bg-transparent"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {shown.length === 0 ? (
          <p className="mt-4 font-medium">
            {rsvps.length === 0 ? "Пока никто не ответил. Отправь ссылку гостям." : "В этой группе пока никого."}
          </p>
        ) : (
          <ul className="mt-3">
            {shown.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 border-t-2 border-ink/15 py-2.5 first:border-t-0">
                <span className="font-semibold">{r.guest_name}</span>
                <span className={`rounded-full border-2 border-ink px-3 py-1 text-[13px] font-bold ${STATUS_BG[r.status]}`}>
                  {STATUS_LABEL[r.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-sm font-medium">
          Сервис не может написать гостям сам: имён и контактов, кроме имени из ответа, у него нет. Напоминание отправь через
          мессенджер.
        </p>
      </section>

      {event.goal_amount ? (
        <section className="card bg-sun mt-5" aria-labelledby="money-h">
          <h2 id="money-h" className="h-display text-base">
            {event.goal_title || "Общий сбор"}
          </h2>
          <div className="mt-3.5 h-5 overflow-hidden rounded-full border-2 border-ink bg-ink/20">
            <div className="h-full border-r-2 border-ink bg-sun" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2.5 text-[15px] font-medium">
            Подтверждено {formatMoney(raised)} из {formatMoney(event.goal_amount)}
          </p>
          {pending.length > 0 ? (
            <div className="mt-4">
              <h3 className="font-bold">Ждут подтверждения</h3>
              <p className="mt-1 text-sm font-medium">
                Открой Kaspi, найди входящий перевод на эту сумму и только потом нажимай «Деньги получил».
              </p>
              <ul className="mt-1">
                {pending.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-ink/15 py-2.5 first:border-t-0">
                    <span className="font-semibold">
                      {c.guest_name} · {formatMoney(c.amount)}
                      {c.payer_hint ? <span className="block text-sm font-medium">В Kaspi: {c.payer_hint}</span> : null}
                    </span>
                    <span className="flex items-center gap-2">
                      <button onClick={() => confirm(c.id)} className="chip bg-sun">
                        Деньги получил
                      </button>
                      <button onClick={() => reject(c.id)} className="chip bg-transparent" aria-label={`Отклонить взнос: ${c.guest_name}`}>
                        Отклонить
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {confirmedList.length > 0 && (
            <div className="mt-4">
              <h3 className="font-bold">Внесли</h3>
              <ul className="mt-1">
                {confirmedList.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 border-t-2 border-ink/15 py-2.5 first:border-t-0">
                    <span className="font-semibold">
                      {c.guest_name} · {formatMoney(c.amount)}
                    </span>
                    <button onClick={() => reject(c.id)} className="chip bg-transparent" aria-label={`Удалить взнос: ${c.guest_name}`}>
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <form onSubmit={addManual} className="mt-4 rounded-2xl border-2 border-ink bg-white/60 p-4">
            <h3 className="font-bold">Добавить взнос вручную</h3>
            <p className="mt-1 text-sm font-medium">Свою долю или наличные: сразу попадёт в «Подтверждено».</p>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-[1fr_8rem_auto]">
              <label htmlFor="manual-name" className="sr-only">
                Имя
              </label>
              <input id="manual-name" value={manualName} onChange={(e) => setManualName(e.target.value)} maxLength={60} placeholder="Имя" className="field min-w-0" />
              <label htmlFor="manual-amount" className="sr-only">
                Сумма, ₸
              </label>
              <input id="manual-amount" inputMode="numeric" value={manualAmount} onChange={(e) => setManualAmount(e.target.value)} placeholder="Сумма, ₸" className="field min-w-0" />
              <button className="btn-sun">Добавить</button>
            </div>
          </form>

          <form onSubmit={savePay} className="mt-4 rounded-2xl border-2 border-ink bg-white/60 p-4">
            <h3 className="font-bold">Куда переводить (Kaspi)</h3>
            <p className="mt-1 text-sm font-medium">Номер и имя увидят все, у кого есть ссылка на встречу.</p>
            <div className="mt-3 space-y-3">
              <div>
                <label htmlFor="pay-phone" className="block text-sm font-bold">
                  Номер Kaspi
                </label>
                <input id="pay-phone" type="tel" inputMode="tel" value={payPhone} onChange={(e) => setPayPhone(e.target.value)} placeholder="+7 707 123 45 67" className="field mt-1" />
              </div>
              <div>
                <label htmlFor="pay-recipient" className="block text-sm font-bold">
                  Имя в Kaspi <span className="font-medium">(необязательно)</span>
                </label>
                <input id="pay-recipient" value={payRecipient} onChange={(e) => setPayRecipient(e.target.value)} maxLength={60} placeholder="Отар А." className="field mt-1" />
              </div>
              <div>
                <label htmlFor="pay-link" className="block text-sm font-bold">
                  Ссылка Kaspi <span className="font-medium">(необязательно)</span>
                </label>
                <input id="pay-link" type="url" inputMode="url" value={payLink} onChange={(e) => setPayLink(e.target.value)} placeholder="https://kaspi.kz/..." className="field mt-1" />
              </div>
              <button className="btn-dark">Сохранить реквизиты</button>
              {payNote && (
                <p role="status" className="text-sm font-semibold">
                  {payNote}
                </p>
              )}
            </div>
          </form>
        </section>
      ) : null}

      <section className="card bg-pink mt-5" aria-labelledby="bring-h">
        <h2 id="bring-h" className="h-display text-base">
          Кто что принесёт
        </h2>
        {items.length > 0 && (
          <ul className="mt-2">
            {items.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 border-t-2 border-ink/15 py-2.5 first:border-t-0">
                <span className="font-semibold">{i.label}</span>
                <span className="flex items-center gap-2">
                  <span className={`chip ${i.taken_by ? "bg-violet" : "bg-transparent"}`}>{i.taken_by ?? "Свободно"}</span>
                  <button onClick={() => removeItem(i.id)} aria-label={`Удалить: ${i.label}`} className="chip bg-transparent">
                    ×
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={addItem} className="mt-4 flex gap-2.5">
          <label htmlFor="new-item" className="sr-only">
            Новый пункт
          </label>
          <input id="new-item" value={newItem} onChange={(e) => setNewItem(e.target.value)} maxLength={80} placeholder="Например, лёд" className="field min-w-0 flex-1" />
          <button className="btn-sun">Добавить</button>
        </form>
      </section>
    </main>
  );
}
