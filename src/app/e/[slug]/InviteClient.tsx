"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { COVER_BG } from "@/lib/cover";
import { daysLabel, formatDate, formatMoney, formatTime, mapLink } from "@/lib/format";
import { getGuestKey, getGuestName, saveGuestName } from "@/lib/guest";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { copyText, formatPhone } from "@/lib/pay";
import type { EventPublic, RsvpStatus } from "@/lib/types";

const STATUS_TEXT: Record<RsvpStatus, string> = {
  yes: "Ты в списке гостей. До встречи!",
  maybe: "Записали: думаешь. Не забудь ответить, когда решишь.",
  no: "Жаль! Организатор получит твой ответ.",
};

function icsEscape(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function downloadIcs(ev: EventPublic) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const start = new Date(ev.starts_at);
  const end = new Date(start.getTime() + 3 * 3600_000);
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Lets meet//RU",
    "BEGIN:VEVENT",
    `UID:${ev.slug}@letsmeet`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${icsEscape(ev.title)}`,
    `LOCATION:${icsEscape([ev.location_name, ev.address].filter(Boolean).join(", "))}`,
    `DESCRIPTION:${icsEscape(ev.description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([body], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${ev.slug}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

export function InviteClient({ initial, demo }: { initial: EventPublic; demo: boolean }) {
  const [ev, setEv] = useState(initial);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [amount, setAmount] = useState("");
  const [payStep, setPayStep] = useState<"form" | "pay" | "done">("form");
  const [payerHint, setPayerHint] = useState("");
  const [moneyError, setMoneyError] = useState("");
  const [copied, setCopied] = useState("");
  const [shareNote, setShareNote] = useState("");

  const refresh = useCallback(async () => {
    const sb = getBrowserSupabase();
    if (!sb) return;
    const { data } = await sb.rpc("get_event_public", { p_slug: initial.slug, p_guest_key: getGuestKey() });
    if (data) setEv(data as EventPublic);
  }, [initial.slug]);

  useEffect(() => {
    setName(getGuestName());
    if (!demo) void refresh();
  }, [demo, refresh]);

  async function call<T>(
    fn: () => PromiseLike<{ error: { message: string } | null; data?: T }>,
    report: (msg: string) => void = setError,
  ) {
    setBusy(true);
    report("");
    const res = await fn();
    setBusy(false);
    if (res.error) {
      report("Не получилось сохранить. Попробуй ещё раз.");
      return null;
    }
    return res;
  }

  async function answer(status: RsvpStatus) {
    const clean = name.trim();
    if (!clean) {
      setError("Напиши, как тебя зовут: организатор увидит имя в списке.");
      return;
    }
    saveGuestName(clean);
    setError("");
    if (demo) {
      setEv((cur) => {
        const counts = { ...cur.counts };
        if (cur.my_rsvp) counts[cur.my_rsvp] -= 1;
        counts[status] += 1;
        return { ...cur, counts, my_rsvp: status };
      });
      return;
    }
    const sb = getBrowserSupabase();
    if (!sb) return;
    const ok = await call(() =>
      sb.rpc("submit_rsvp", { p_slug: ev.slug, p_guest_key: getGuestKey(), p_name: clean, p_status: status }),
    );
    if (ok) await refresh();
  }

  async function takeItem(id: string) {
    const clean = name.trim();
    if (!clean) {
      setError("Сначала напиши своё имя выше.");
      return;
    }
    saveGuestName(clean);
    if (demo) {
      setEv((cur) => ({
        ...cur,
        items: cur.items.map((i) => (i.id === id ? { ...i, taken_by: clean, mine: true } : i)),
      }));
      return;
    }
    const sb = getBrowserSupabase();
    if (!sb) return;
    const ok = await call(() => sb.rpc("claim_item", { p_item_id: id, p_guest_key: getGuestKey(), p_name: clean }));
    if (ok) await refresh();
  }

  async function dropItem(id: string) {
    if (demo) {
      setEv((cur) => ({
        ...cur,
        items: cur.items.map((i) => (i.id === id ? { ...i, taken_by: null, mine: false } : i)),
      }));
      return;
    }
    const sb = getBrowserSupabase();
    if (!sb) return;
    const ok = await call(() => sb.rpc("release_item", { p_item_id: id, p_guest_key: getGuestKey() }));
    if (ok) await refresh();
  }

  /** Проверяет имя и сумму; при ошибке показывает подсказку в блоке сбора. */
  function checkPledge(): { name: string; value: number } | null {
    const clean = name.trim();
    const value = Math.round(Number(amount.replace(/\s/g, "")));
    if (!clean) {
      setMoneyError("Сначала напиши своё имя в блоке «Ты придёшь?» выше.");
      return null;
    }
    if (!Number.isFinite(value) || value <= 0 || value > 10_000_000) {
      setMoneyError("Укажи сумму цифрами, например 5000.");
      return null;
    }
    setMoneyError("");
    saveGuestName(clean);
    return { name: clean, value };
  }

  /** Кнопка «Отправить деньги»: показываем реквизиты. Если организатор их не указал, сразу записываем «Я внёс». */
  function startPay() {
    if (!checkPledge()) return;
    if (ev.pay_phone) setPayStep("pay");
    else void sendPledge();
  }

  /** Гость перевёл деньги в Kaspi и сообщает об этом. В «Собрано» сумма попадёт после подтверждения организатором. */
  async function sendPledge() {
    const chk = checkPledge();
    if (!chk) return;
    if (demo) {
      setEv((cur) => ({
        ...cur,
        contributions: [
          ...cur.contributions,
          { id: `demo-${Date.now()}`, name: chk.name, amount: chk.value, confirmed: false, mine: true },
        ],
      }));
      setPayStep("done");
      setAmount("");
      return;
    }
    const sb = getBrowserSupabase();
    if (!sb) return;
    const ok = await call(
      () =>
        sb.rpc("add_pledge", {
          p_slug: ev.slug,
          p_guest_key: getGuestKey(),
          p_name: chk.name,
          p_amount: chk.value,
          p_hint: payerHint.trim() || null,
        }),
      setMoneyError,
    );
    if (ok) {
      await refresh();
      setPayStep("done");
      setAmount("");
      setPayerHint("");
    }
  }

  async function cancelPledge(id: string) {
    if (demo) {
      setEv((cur) => ({ ...cur, contributions: cur.contributions.filter((c) => c.id !== id) }));
      return;
    }
    const sb = getBrowserSupabase();
    if (!sb) return;
    const ok = await call(() => sb.rpc("cancel_pledge", { p_id: id, p_guest_key: getGuestKey() }), setMoneyError);
    if (ok) await refresh();
  }

  async function copy(key: string, text: string) {
    if (await copyText(text)) {
      setCopied(key);
      setTimeout(() => setCopied(""), 2000);
    } else {
      setMoneyError("Не получилось скопировать. Выдели и скопируй вручную.");
    }
  }

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: ev.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShareNote("Ссылка скопирована");
      }
    } catch {
      /* пользователь закрыл окно — ничего не делаем */
    }
  }

  const goalPct = ev.goal_amount ? Math.min(100, Math.round((ev.raised / ev.goal_amount) * 100)) : 0;
  const total = ev.counts.yes + ev.counts.maybe;

  return (
    <main className="mx-auto max-w-md pb-12">
      <div className={`relative rounded-b-[36px] border-b-2 border-ink px-6 pb-8 pt-7 text-ink ${COVER_BG[ev.cover_color]}`}>
        <span className="inline-block rounded-full border-2 border-ink bg-ink px-3.5 py-1.5 text-sm font-bold text-white">
          {ev.kind}
        </span>
        <div
          aria-hidden="true"
          className="absolute right-5 top-5 flex h-[84px] w-[84px] rotate-[10deg] flex-col items-center justify-center rounded-full border-2 border-ink bg-sun font-display font-extrabold leading-none"
        >
          <span className="text-2xl">{new Date(ev.starts_at).toLocaleDateString("ru-RU", { day: "numeric", timeZone: "Asia/Almaty" })}</span>
          <span className="mt-1 text-xs">
            {new Date(ev.starts_at).toLocaleDateString("ru-RU", { month: "short", timeZone: "Asia/Almaty" }).replace(".", "")}
          </span>
        </div>
        <h1 className="h-display mt-14 text-3xl leading-tight">{ev.title}</h1>
        <p className="mt-3 font-semibold">{daysLabel(ev.starts_at)}</p>
      </div>

      <div className="mt-5 space-y-5 px-5">
        <section className="card-pop bg-violet" aria-labelledby="rsvp-h">
          <h2 id="rsvp-h" className="h-display text-lg">
            Ты придёшь?
          </h2>
          <label htmlFor="guest-name" className="mt-4 block text-sm font-bold">
            Как тебя зовут
          </label>
          <input
            id="guest-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            autoComplete="given-name"
            placeholder="Имя"
            className="field mt-1.5"
          />
          <div className="mt-3 grid grid-cols-3 gap-2.5">
            {(
              [
                ["yes", "Я приду", "bg-sun"],
                ["maybe", "Думаю", "bg-mint"],
                ["no", "Не смогу", "bg-coral"],
              ] as const
            ).map(([s, label, bg]) => (
              <button
                key={s}
                disabled={busy}
                onClick={() => answer(s)}
                aria-pressed={ev.my_rsvp === s}
                className={`min-h-[52px] rounded-full border-2 border-ink px-2 text-[15px] font-bold shadow-pop-sm transition-transform active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-60 ${
                  ev.my_rsvp === s ? `${bg} ring-4 ring-ink/25` : ev.my_rsvp ? "bg-transparent" : bg
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {ev.my_rsvp && (
            <p className="mt-4 rounded-2xl border-2 border-ink bg-ink p-3.5 font-semibold text-white" role="status">
              {STATUS_TEXT[ev.my_rsvp]}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-4 rounded-2xl border-2 border-ink bg-coral p-3.5 font-semibold">
              {error}
            </p>
          )}
          <p className="mt-4 text-[15px] font-medium">
            {ev.counts.yes} придут · {ev.counts.maybe} думают
            {total === 0 ? " · будь первым" : ""}
          </p>
        </section>

        <section className="card bg-mint" aria-labelledby="when-h">
          <h2 id="when-h" className="sr-only">
            Когда и где
          </h2>
          <p className="font-semibold">
            {formatDate(ev.starts_at)} · {formatTime(ev.starts_at)}
          </p>
          {(ev.location_name || ev.address) && (
            <>
              <p className="mt-3 font-semibold">{ev.location_name}</p>
              {ev.address && <p className="text-[15px]">{ev.address}</p>}
              <a
                href={mapLink(ev.location_name, ev.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-dark mt-4 w-full"
              >
                Открыть на карте
              </a>
            </>
          )}
          <button onClick={() => downloadIcs(ev)} className="btn-dark mt-3 w-full">
            Добавить в календарь
          </button>
        </section>

        {ev.description && (
          <section className="card bg-pink">
            <h2 className="h-display text-lg">О встрече</h2>
            <p className="mt-3 whitespace-pre-line">{ev.description}</p>
          </section>
        )}

        {ev.dress_code.length > 0 && (
          <section className="card bg-sky">
            <h2 className="h-display text-lg">Дресс-код</h2>
            <div className="mt-3.5 flex flex-wrap gap-2.5">
              {ev.dress_code.map((d, i) => (
                <span key={d} className={`chip ${["bg-sun", "bg-coral", "bg-violet"][i % 3]}`}>
                  {d}
                </span>
              ))}
            </div>
          </section>
        )}

        {ev.goal_amount ? (
          <section className="card bg-sun" aria-labelledby="money-h">
            <h2 id="money-h" className="h-display text-lg">
              {ev.goal_title || "Общий сбор"}
            </h2>
            <div
              className="mt-3.5 h-5 overflow-hidden rounded-full border-2 border-ink bg-ink/20"
              role="progressbar"
              aria-valuenow={goalPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Собрано"
            >
              <div className="h-full border-r-2 border-ink bg-sun" style={{ width: `${goalPct}%` }} />
            </div>
            <p className="mt-2.5 text-[15px] font-medium">
              Собрано {formatMoney(ev.raised)} из {formatMoney(ev.goal_amount)}
            </p>
            {payStep === "done" ? (
              <div className="mt-4">
                <p role="status" className="rounded-2xl border-2 border-ink bg-ink p-3.5 font-semibold text-white">
                  Спасибо! Твой взнос появился в списке ниже со статусом «Ждёт подтверждения». В «Собрано» он попадёт, когда
                  организатор увидит перевод в Kaspi.
                </p>
                <button onClick={() => setPayStep("form")} className="btn-dark mt-3 w-full">
                  Внести ещё
                </button>
              </div>
            ) : payStep === "pay" && ev.pay_phone ? (
              <div className="mt-4 space-y-3 rounded-2xl border-2 border-ink bg-white/60 p-4">
                <h3 className="h-display text-base">Переведи {formatMoney(Math.round(Number(amount.replace(/\s/g, ""))) || 0)} в Kaspi</h3>
                <ol className="list-decimal space-y-2.5 pl-5 text-[15px] font-medium">
                  <li>Открой приложение Kaspi.kz и выбери перевод по номеру телефона.</li>
                  <li>
                    Номер получателя: <b className="whitespace-nowrap">{formatPhone(ev.pay_phone)}</b>
                    <button type="button" onClick={() => copy("phone", ev.pay_phone ?? "")} className="chip ml-2 bg-sun">
                      {copied === "phone" ? "Скопировано" : "Копировать"}
                    </button>
                  </li>
                  <li>
                    Сумма: <b className="whitespace-nowrap">{formatMoney(Math.round(Number(amount.replace(/\s/g, ""))) || 0)}</b>
                    <button type="button" onClick={() => copy("sum", String(Math.round(Number(amount.replace(/\s/g, "")))))} className="chip ml-2 bg-sun">
                      {copied === "sum" ? "Скопировано" : "Копировать"}
                    </button>
                  </li>
                  <li>
                    {ev.pay_recipient
                      ? `Перед отправкой проверь имя получателя: в Kaspi должно быть «${ev.pay_recipient}». Если имя другое, не переводи и напиши организатору.`
                      : "Перед отправкой проверь имя получателя: оно должно совпадать с именем организатора. Если нет, не переводи и напиши организатору."}
                  </li>
                  <li>Вернись сюда и нажми «Я отправил(а)». Деньги сайт не принимает, он только записывает твой взнос.</li>
                </ol>
                {ev.pay_link && (
                  <a href={ev.pay_link} target="_blank" rel="noopener noreferrer" className="btn-dark w-full">
                    Открыть ссылку Kaspi
                  </a>
                )}
                <div>
                  <label htmlFor="payer-hint" className="block text-sm font-bold">
                    Как ты записан в Kaspi <span className="font-medium">(если имя отличается)</span>
                  </label>
                  <input
                    id="payer-hint"
                    value={payerHint}
                    onChange={(e) => setPayerHint(e.target.value)}
                    maxLength={60}
                    placeholder="Например, Данияр С."
                    className="field mt-1.5"
                  />
                  <p className="mt-1 text-sm font-medium">Увидит только организатор: так ему проще найти твой перевод.</p>
                </div>
                <button disabled={busy} onClick={sendPledge} className="btn-sun w-full disabled:opacity-60">
                  Я отправил(а)
                </button>
                <button type="button" onClick={() => setPayStep("form")} className="chip bg-transparent">
                  Назад
                </button>
              </div>
            ) : (
              <div className="mt-4">
                <div className="flex gap-2.5">
                  <label htmlFor="pledge" className="sr-only">
                    Сумма, ₸
                  </label>
                  <input
                    id="pledge"
                    inputMode="numeric"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Твоя сумма, ₸"
                    className="field min-w-0 flex-1"
                  />
                  <button disabled={busy} onClick={startPay} className="btn-sun disabled:opacity-60">
                    {ev.pay_phone ? "Отправить деньги" : "Я внёс"}
                  </button>
                </div>
                {!ev.pay_phone && (
                  <p className="mt-2 text-sm font-medium">Организатор пока не указал, куда переводить. Уточни реквизиты у него.</p>
                )}
              </div>
            )}
            {moneyError && (
              <p role="alert" className="mt-3 rounded-2xl border-2 border-ink bg-coral p-3.5 font-semibold">
                {moneyError}
              </p>
            )}

            <div className="mt-5">
              <h3 className="font-bold">Кто сколько внёс</h3>
              {ev.contributions.length === 0 ? (
                <p className="mt-1.5 text-[15px] font-medium">Пока никто не внёс. Будь первым.</p>
              ) : (
                <ul className="mt-1">
                  {ev.contributions.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-ink/15 py-2.5 first:border-t-0">
                      <span className="font-semibold">
                        {c.name}
                        {c.mine ? " (ты)" : ""} · {formatMoney(c.amount)}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className={`chip ${c.confirmed ? "bg-mint" : "bg-transparent"}`}>
                          {c.confirmed ? "Подтверждено" : "Ждёт подтверждения"}
                        </span>
                        {c.mine && !c.confirmed && (
                          <button onClick={() => cancelPledge(c.id)} className="chip bg-transparent" aria-label={`Отменить взнос ${formatMoney(c.amount)}`}>
                            Отменить
                          </button>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-sm font-medium">
                Имена и суммы видят все, у кого есть ссылка. В «Собрано» входят только подтверждённые взносы.
              </p>
            </div>
          </section>
        ) : null}

        {ev.items.length > 0 && (
          <section className="card bg-mint" aria-labelledby="bring-h">
            <h2 id="bring-h" className="h-display text-lg">
              Кто что принесёт
            </h2>
            <ul className="mt-2">
              {ev.items.map((it) => (
                <li key={it.id} className="flex items-center justify-between gap-3 border-t-2 border-ink/15 py-2.5 first:border-t-0">
                  <span className="font-semibold">{it.label}</span>
                  {it.taken_by ? (
                    it.mine ? (
                      <button onClick={() => dropItem(it.id)} className="chip bg-sun" aria-label={`Отказаться: ${it.label}`}>
                        Беру я · отказаться
                      </button>
                    ) : (
                      <span className="chip bg-violet">{it.taken_by}</span>
                    )
                  ) : (
                    <button disabled={busy} onClick={() => takeItem(it.id)} className="chip bg-transparent disabled:opacity-60">
                      Беру
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="flex flex-col gap-3">
          <button onClick={share} className="btn-mint">
            Поделиться встречей
          </button>
          {shareNote && (
            <p role="status" className="text-center text-sm font-semibold">
              {shareNote}
            </p>
          )}
        </div>

        <footer className="pt-2 text-center text-sm font-medium">
          <p>
            Сделано в{" "}
            <Link href="/" className="font-bold underline">
              Let&apos;s meet!
            </Link>
          </p>
          <Link href="/new" className="mt-1 inline-block min-h-[44px] py-2 font-bold underline">
            Создать свою встречу
          </Link>
        </footer>
      </div>
    </main>
  );
}
