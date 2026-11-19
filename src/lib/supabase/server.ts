import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieToSet = { name: string; value: string; options: CookieOptions };

export const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

/** Клиент для серверных компонентов и роутов. Вернёт null, если Supabase ещё не настроен. */
export function getServerSupabase() {
  if (!supabaseConfigured) return null;
  const store = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      cookies: {
        getAll() {
          return store.getAll();
        },
        setAll(list: CookieToSet[]) {
          try {
            list.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {
            // Вызов из серверного компонента: куки обновит middleware.
          }
        },
      },
    },
  );
}
