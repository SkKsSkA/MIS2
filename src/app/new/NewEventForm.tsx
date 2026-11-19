"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { COVER_BG, COVER_ORDER } from "@/lib/cover";
import { KINDS, makeSlug } from "@/lib/format";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { normalizeKaspiLink, normalizePhone } from "@/lib/pay";
import type { AiDraft, CoverColor, Visibility } from "@/lib/types";

const COVER_NAME: Record<CoverColor, string> = { coral: "Коралловая", sun: "Лимонная", violet: "Сиреневая" };

export function NewEventForm() {
  const router = useRouter();

  const [prompt, setPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState("");

  const [kind, setKind] = useState<string>(KINDS[1]);
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [place, setPlace] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [dress, setDress] = useState("");
  const [bring, setBring] = useState("");
  const [moneyOn, setMoneyOn] = useState(false);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalAmount, setGoalAmount] = useState("");
  const [payPhone, setPayPhone] = useState("");
  const [payRecipient, setPayRecipient] = useState("");
  const [payLink, setPayLink] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("link");
  const [cover, setCover] = useState<CoverColor>("coral");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setAiBusy(true);
    setAiNote("");
    try {
      const res = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) {
        setAiNote(res.status === 400 ? "Опиши встречу подробнее: от 3 до 600 символов." : "Не получилось. Попробуй ещё раз.");
        return;
      }
      const { draft, source } = (await res.json()) as { draft: AiDraft; source: "ai" | "fallback" };
      setKind(draft.kind);
      setTitle(draft.title);
      setDescription(draft.description);
      if (draft.starts_at) setStartsAt(draft.starts_at);
      if (draft.location_name) setPlace(draft.location_name);
      setDress(draft.dress_code.join(", "));
      setBring(draft.bring.join("\n"));
      setAiNote(
        source === "ai"
          ? "Готово: проверь поля ниже и поправь, что нужно."
          : "Заполнили по ключевым словам. ИИ-ключ не подключён, так что проверь поля ниже.",
      );
    } catch {
      setAiNote("Нет связи. Заполни поля вручную или попробуй позже.");
    } finally {
      setAiBusy(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const sb = getBrowserSupabase();
    if (!sb) return;
    if (!title.trim()) return setError("Напиши название встречи.");
    if (!startsAt) return setError("Выбери дату и время.");
    const amount = Math.round(Number(goalAmount));
    if (moneyOn && (!Number.isFinite(amount) || amount <= 0)) return setError("Укажи сумму сбора цифрами.");
    const phone = moneyOn ? normalizePhone(payPhone) : null;
    if (moneyOn && !phone) return setError("Укажи номер Kaspi, на который переводить: +7 и 10 цифр.");
    const link = moneyOn && payLink.trim() ? normalizeKaspiLink(payLink) : null;
    if (moneyOn && payLink.trim() && !link) return setError("Ссылка должна вести на kaspi.kz и начинаться с https://.");

    setSaving(true);
    const { data: auth } = await sb.auth.getUser();
    if (!auth.user) {
      router.push("/login?next=/new");
      return;
    }

    const payload = {
      host_id: auth.user.id,
      kind,
      title: title.trim(),
      description: description.trim(),
      starts_at: new Date(startsAt).toISOString(),
      location_name: place.trim(),
      address: address.trim(),
      dress_code: dress
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 8),
      visibility,
      cover_color: cover,
      goal_title: moneyOn ? goalTitle.trim() || "Общий сбор" : null,
      goal_amount: moneyOn ? amount : null,
      // Поля оплаты отправляем только при включённом сборе, чтобы создание встречи работало и без миграции 0002.
      ...(moneyOn
        ? { pay_phone: phone, pay_recipient: payRecipient.trim() || null, pay_link: link }
        : {}),
    };

    let slug = makeSlug(title);
    let { data, error: err } = await sb.from("events").insert({ ...payload, slug }).select("id, slug").single();
    if (err?.code === "23505") {
      slug = makeSlug(title);
      ({ data, error: err } = await sb.from("events").insert({ ...payload, slug }).select("id, slug").single());
    }
    if (err || !data) {
      setSaving(false);
      return setError("Не получилось сохранить встречу. Проверь поля и попробуй ещё раз.");
    }

    const items = bring
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 20)
      .map((label) => ({ event_id: data.id, label: label.slice(0, 80) }));
    if (items.length) await sb.from("bring_items").insert(items);

    router.push(`/dashboard/${data.slug}`);
  }

  return (
    <form onSubmit={save} className="mt-6 space-y-5">
      <section className="card-pop bg-violet" aria-labelledby="ai-h">
        <h2 id="ai-h" className="h-display text-base">
          Опиши встречу одной фразой
        </h2>
        <label htmlFor="prompt" className="sr-only">
          Описание встречи
        </label>
        <textarea
          id="prompt"
          rows={3}
          maxLength={600}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="День рождения Дины в субботу в 19:00, 15 человек, дресс-код яркий"
          className="field mt-3 resize-none"
        />
        <button type="button" onClick={generate} disabled={aiBusy || prompt.trim().length < 3} className="btn-sun mt-3 w-full disabled:opacity-60">
          {aiBusy ? "Думаю…" : "Заполнить с ИИ"}
        </button>
        {aiNote && (
          <p role="status" className="mt-3 rounded-2xl border-2 border-ink bg-ink p-3 text-[15px] font-semibold text-white">
            {aiNote}
          </p>
        )}
      </section>

      <section className="card bg-sun">
        <h2 className="h-display text-base">Тип встречи</h2>
        <div className="mt-3.5 flex flex-wrap gap-2.5">
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={`chip ${kind === k ? "bg-ink text-white" : "bg-transparent"}`}
            >
              {k}
            </button>
          ))}
        </div>
      </section>

      <section className="card bg-mint space-y-4">
        <div>
          <label htmlFor="title" className="block font-bold">
            Название
          </label>
          <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required className="field mt-1.5" />
        </div>
        <div>
          <label htmlFor="when" className="block font-bold">
            Дата и время
          </label>
          <input id="when" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required className="field mt-1.5" />
        </div>
        <div>
          <label htmlFor="place" className="block font-bold">
            Место
          </label>
          <input id="place" value={place} onChange={(e) => setPlace(e.target.value)} maxLength={120} placeholder="Лофт на набережной" className="field mt-1.5" />
        </div>
        <div>
          <label htmlFor="address" className="block font-bold">
            Адрес
          </label>
          <input id="address" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} placeholder="Алматы, ул. Абая, 10" className="field mt-1.5" />
        </div>
        <div>
          <label htmlFor="desc" className="block font-bold">
            Описание
          </label>
          <textarea id="desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} className="field mt-1.5" />
        </div>
      </section>

      <section className="card bg-sky space-y-4">
        <div>
          <label htmlFor="dress" className="block font-bold">
            Дресс-код <span className="font-medium">(через запятую)</span>
          </label>
          <input id="dress" value={dress} onChange={(e) => setDress(e.target.value)} placeholder="Яркое, без чёрного" className="field mt-1.5" />
        </div>
        <div>
          <label htmlFor="bring" className="block font-bold">
            Кто что принесёт <span className="font-medium">(по одному в строке)</span>
          </label>
          <textarea id="bring" rows={3} value={bring} onChange={(e) => setBring(e.target.value)} placeholder={"Торт\nНапитки\nКолонка"} className="field mt-1.5" />
        </div>
      </section>

      <section className="card bg-pink">
        <label className="flex min-h-[44px] items-center justify-between gap-3 font-bold">
          Собрать деньги
          <input type="checkbox" checked={moneyOn} onChange={(e) => setMoneyOn(e.target.checked)} className="h-6 w-6 accent-ink" />
        </label>
        {moneyOn && (
          <div className="mt-3 space-y-3">
            <div>
              <label htmlFor="goalTitle" className="block text-sm font-bold">
                На что
              </label>
              <input id="goalTitle" value={goalTitle} onChange={(e) => setGoalTitle(e.target.value)} placeholder="Скидываемся на подарок" className="field mt-1" />
            </div>
            <div>
              <label htmlFor="goalAmount" className="block text-sm font-bold">
                Нужно собрать, ₸
              </label>
              <input id="goalAmount" inputMode="numeric" value={goalAmount} onChange={(e) => setGoalAmount(e.target.value)} placeholder="20000" className="field mt-1" />
            </div>
            <div>
              <label htmlFor="payPhone" className="block text-sm font-bold">
                Номер Kaspi для переводов
              </label>
              <input id="payPhone" type="tel" inputMode="tel" autoComplete="tel" value={payPhone} onChange={(e) => setPayPhone(e.target.value)} placeholder="+7 707 123 45 67" className="field mt-1" />
            </div>
            <div>
              <label htmlFor="payRecipient" className="block text-sm font-bold">
                Как имя показывается в Kaspi <span className="font-medium">(необязательно)</span>
              </label>
              <input id="payRecipient" value={payRecipient} onChange={(e) => setPayRecipient(e.target.value)} maxLength={60} placeholder="Отар А." className="field mt-1" />
            </div>
            <div>
              <label htmlFor="payLink" className="block text-sm font-bold">
                Ссылка Kaspi <span className="font-medium">(необязательно, только kaspi.kz)</span>
              </label>
              <input id="payLink" type="url" inputMode="url" value={payLink} onChange={(e) => setPayLink(e.target.value)} placeholder="https://kaspi.kz/..." className="field mt-1" />
            </div>
            <p className="text-sm font-medium">
              Деньги через сервис не проходят: гость сам переводит на твой номер в Kaspi и нажимает «Я отправил», а ты сверяешь
              поступление и подтверждаешь. Номер увидят все, у кого есть ссылка на встречу.
            </p>
          </div>
        )}
      </section>

      <section className="card bg-sun">
        <h2 className="h-display text-base">Кто видит встречу</h2>
        <div className="mt-3.5 grid grid-cols-2 gap-2.5">
          {(
            [
              ["link", "По ссылке"],
              ["public", "Публичная"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              aria-pressed={visibility === v}
              onClick={() => setVisibility(v)}
              className={`min-h-[48px] rounded-full border-2 border-ink font-bold ${visibility === v ? "bg-ink text-white" : "bg-transparent"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <h2 className="h-display mt-5 text-base">Цвет обложки</h2>
        <div className="mt-3.5 flex gap-3">
          {COVER_ORDER.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={cover === c}
              aria-label={COVER_NAME[c]}
              onClick={() => setCover(c)}
              className={`h-11 w-11 rounded-full border-2 border-ink ${COVER_BG[c]} ${cover === c ? "ring-4 ring-ink/30" : ""}`}
            />
          ))}
        </div>
      </section>

      {error && (
        <p role="alert" className="rounded-2xl border-2 border-ink bg-coral p-3.5 font-semibold">
          {error}
        </p>
      )}
      <button disabled={saving} className="btn-sun btn-big w-full disabled:opacity-60">
        {saving ? "Сохраняю…" : "Опубликовать и получить ссылку"}
      </button>
    </form>
  );
}
