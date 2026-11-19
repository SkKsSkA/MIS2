"use client";

import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

export function LoginForm({ next }: { next?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const sb = getBrowserSupabase();
    if (!sb) return;
    setState("busy");
    const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
    const { error } = await sb.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(target)}` },
    });
    if (error) {
      setState("error");
      setMessage(error.message);
    } else {
      setState("sent");
    }
  }

  if (state === "sent") {
    return (
      <div className="mt-6 rounded-2xl border-2 border-ink bg-sun p-4 font-semibold" role="status">
        Письмо отправлено на {email}. Открой ссылку из него, и мы вернём тебя сюда.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
      <label htmlFor="email" className="font-bold">
        Почта
      </label>
      <input
        id="email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="name@example.com"
        className="field"
      />
      {state === "error" && (
        <p role="alert" className="rounded-2xl border-2 border-ink bg-coral px-4 py-3 font-semibold">
          Не получилось отправить: {message}
        </p>
      )}
      <button disabled={state === "busy"} className="btn-sun btn-big mt-2 disabled:opacity-60">
        {state === "busy" ? "Отправляю…" : "Получить ссылку для входа"}
      </button>
    </form>
  );
}
