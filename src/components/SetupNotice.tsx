/** Показывается, пока не заданы ключи Supabase (файл .env.local). */
export function SetupNotice() {
  return (
    <div className="card-pop mx-auto mt-10 max-w-xl">
      <h2 className="h-display text-xl">Нужно подключить базу данных</h2>
      <p className="mt-3">
        Эта страница работает через Supabase. Создай проект на supabase.com, выполни файл{" "}
        <code className="rounded bg-ink/10 px-1.5 py-0.5 text-sm">supabase/migrations/0001_init.sql</code> в SQL Editor и
        впиши ключи в <code className="rounded bg-ink/10 px-1.5 py-0.5 text-sm">.env.local</code> (пример в{" "}
        <code className="rounded bg-ink/10 px-1.5 py-0.5 text-sm">.env.example</code>). Потом перезапусти сервер.
      </p>
      <a href="/e/demo" className="btn-sun mt-5">
        Пока посмотреть демо-встречу
      </a>
    </div>
  );
}
