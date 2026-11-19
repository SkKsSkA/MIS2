import { Logo } from "@/components/Logo";
import { SetupNotice } from "@/components/SetupNotice";
import { supabaseConfigured } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Вход" };

export default function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  return (
    <main className="mx-auto max-w-md px-5 py-8">
      <Logo />
      {supabaseConfigured ? (
        <div className="card-pop mt-10">
          <h1 className="h-display text-2xl">Вход для организатора</h1>
          <p className="mt-3">
            Гостям вход не нужен. А чтобы создавать встречи, введи почту: пришлём ссылку для входа, пароль не нужен.
          </p>
          <LoginForm next={searchParams.next} />
        </div>
      ) : (
        <SetupNotice />
      )}
    </main>
  );
}
