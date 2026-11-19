import Link from "next/link";
import { Logo } from "./Logo";
import { getServerSupabase } from "@/lib/supabase/server";

export async function SiteHeader() {
  const sb = getServerSupabase();
  const user = sb ? (await sb.auth.getUser()).data.user : null;

  return (
    <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
      <Logo />
      <nav className="flex flex-wrap items-center gap-2" aria-label="Основное меню">
        <a href="/#how" className="hidden min-h-[44px] items-center px-3 font-semibold sm:flex">
          Как это работает
        </a>
        {user ? (
          <>
            <Link href="/dashboard" className="flex min-h-[44px] items-center px-3 font-semibold">
              Мои встречи
            </Link>
            <form action="/auth/signout" method="post">
              <button className="flex min-h-[44px] items-center px-3 font-semibold underline">Выйти</button>
            </form>
          </>
        ) : (
          <Link href="/login" className="flex min-h-[44px] items-center px-3 font-semibold">
            Войти
          </Link>
        )}
        <Link href="/new" className="btn-sun">
          Создать встречу
        </Link>
      </nav>
    </header>
  );
}
