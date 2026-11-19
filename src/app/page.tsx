import Link from "next/link";
import { KindCards } from "@/components/KindCards";
import { SiteHeader } from "@/components/SiteHeader";

const STEPS = [
  {
    n: "1",
    bg: "bg-coral",
    title: "Опиши встречу",
    text: "Одной фразой: когда, где и для кого. ИИ заполнит страницу и напишет приглашение.",
  },
  {
    n: "2",
    bg: "bg-sun",
    title: "Поделись ссылкой",
    text: "Отправь её в любой мессенджер. Гостям не нужно ставить приложение или создавать аккаунт.",
  },
  {
    n: "3",
    bg: "bg-mint",
    title: "Следи за ответами",
    text: "Кто придёт, кто думает, кто скинулся и что ещё нужно принести — всё в одном месте.",
  },
];

export default function Home() {
  return (
    <div className="relative overflow-hidden">
      {/* Декоративные цветные формы по краям, за контентом */}
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 top-28 h-56 w-56 rounded-full bg-pink" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-[430px] h-36 w-36 rounded-full bg-mint" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-10 top-[900px] h-28 w-28 rounded-full bg-sun" />
      <div aria-hidden="true" className="pointer-events-none absolute left-[46%] top-6 h-6 w-6 rounded-full bg-sun" />

      <div className="relative z-10">
        <SiteHeader />
        <main>
          <section className="mx-auto flex max-w-6xl flex-wrap items-center gap-12 px-5 pb-16 pt-8 sm:px-8">
            <div className="min-w-0 flex-1 basis-[420px]">
              <p className="inline-block rounded-full border-2 border-ink bg-mint px-4 py-2 text-sm font-bold text-ink">
                Встречи без переписок в чатах
              </p>
              <h1 className="h-display mt-6 text-4xl leading-[1.1] sm:text-6xl">
                Собери людей за <span className="text-sun">одну минуту</span>
              </h1>
              <p className="mt-6 max-w-xl text-xl text-white/90">
                Создай красивую страницу встречи, отправь ссылку — и гости ответят одним кликом. Без регистрации и
                установки.
              </p>
              <div className="mt-9 flex flex-wrap gap-4">
                <Link href="/new" className="btn-sun btn-big">
                  Создать встречу
                </Link>
                <Link href="/e/demo" className="btn-mint btn-big">
                  Посмотреть пример
                </Link>
              </div>
            </div>

            <div className="relative flex min-h-[500px] flex-1 basis-[340px] items-center justify-center">
              <div
                aria-hidden="true"
                className="absolute right-[6%] top-2 z-10 flex h-28 w-28 rotate-[10deg] items-center justify-center rounded-full border-2 border-ink bg-sun text-center font-display text-sm font-extrabold leading-tight text-ink"
              >
                RSVP
                <br />в 1 клик
              </div>
              <div className="w-[320px] -rotate-3 overflow-hidden rounded-[28px] border-2 border-ink bg-sky text-ink shadow-pop-lg">
                <div className="flex h-36 flex-col justify-end border-b-2 border-ink bg-coral p-5">
                  <div className="h-display text-2xl leading-tight">С днём рождения, Дина!</div>
                </div>
                <div className="flex flex-col gap-3 p-5 font-semibold">
                  <span>Сб, 24 октября · 19:00</span>
                  <span>Лофт на набережной</span>
                  <span>Дресс-код: яркое, без чёрного</span>
                  <div className="mt-1 flex gap-2.5">
                    <span className="flex-1 rounded-full border-2 border-ink bg-sun py-3 text-center font-bold">Я приду</span>
                    <span className="flex-1 rounded-full border-2 border-ink bg-pink py-3 text-center font-bold">Не смогу</span>
                  </div>
                  <span className="text-sm font-medium">12 придут · 3 думают</span>
                </div>
              </div>
            </div>
          </section>

          <section id="how" className="mx-auto max-w-6xl scroll-mt-4 px-5 pb-16 sm:px-8">
            <h2 className="h-display mb-8 text-3xl">Три шага до встречи</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {STEPS.map((s) => (
                <div key={s.n} className={`rounded-3xl border-2 border-ink p-7 text-ink shadow-pop ${s.bg}`}>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-ink bg-ink font-display font-extrabold text-white">
                    {s.n}
                  </div>
                  <h3 className="h-display mt-5 text-xl">{s.title}</h3>
                  <p className="mt-2.5 font-medium">{s.text}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mx-auto max-w-6xl px-5 pb-16 sm:px-8">
            <h2 className="h-display text-3xl">Для любой встречи</h2>
            <p className="mb-8 mt-3 max-w-xl text-lg text-white/90">
              День рождения, выезд на природу или вечер настольных игр: у каждой встречи своя страница с местом, временем и
              списком гостей.
            </p>
            <KindCards />
          </section>

          <section className="mx-auto max-w-6xl px-5 pb-12 sm:px-8">
            <div className="flex flex-wrap items-center justify-between gap-6 rounded-[36px] border-2 border-ink bg-sun p-8 text-ink shadow-pop-lg sm:p-12">
              <div className="h-display basis-[320px] text-3xl leading-tight">Готов собрать друзей?</div>
              <Link href="/new" className="rounded-full border-2 border-ink bg-ink px-8 py-4 text-lg font-bold text-white">
                Создать встречу
              </Link>
            </div>
          </section>
        </main>
        <footer className="mx-auto flex max-w-6xl flex-wrap justify-between gap-3 px-5 pb-10 text-sm font-medium text-white/80 sm:px-8">
          <span>© 2026 Let&apos;s meet!</span>
          <span>Қазақша · Русский · English</span>
        </footer>
      </div>
    </div>
  );
}
