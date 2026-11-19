import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-5 py-8">
      <Logo />
      <div className="card-pop mt-10">
        <h1 className="h-display text-2xl">Такой встречи нет</h1>
        <p className="mt-3">Возможно, в ссылке опечатка или организатор удалил встречу.</p>
        <Link href="/" className="btn-sun mt-5">
          На главную
        </Link>
      </div>
    </main>
  );
}
