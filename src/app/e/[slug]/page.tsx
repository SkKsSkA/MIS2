import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SetupNotice } from "@/components/SetupNotice";
import { Logo } from "@/components/Logo";
import { demoEvent } from "@/lib/demo";
import { formatDate, formatTime } from "@/lib/format";
import { getServerSupabase } from "@/lib/supabase/server";
import type { EventPublic } from "@/lib/types";
import { InviteClient } from "./InviteClient";

async function loadEvent(slug: string): Promise<EventPublic | "no-backend" | null> {
  if (slug === "demo") return demoEvent();
  const sb = getServerSupabase();
  if (!sb) return "no-backend";
  const { data } = await sb.rpc("get_event_public", { p_slug: slug });
  return (data as EventPublic | null) ?? null;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const ev = await loadEvent(params.slug);
  if (!ev || ev === "no-backend") return { title: "Приглашение" };
  return {
    title: ev.title,
    description: `${formatDate(ev.starts_at)}, ${formatTime(ev.starts_at)} · ${ev.location_name || "место уточняется"}`,
    openGraph: { title: ev.title, description: ev.description.slice(0, 160) },
  };
}

export default async function InvitePage({ params }: { params: { slug: string } }) {
  const ev = await loadEvent(params.slug);
  if (ev === "no-backend") {
    return (
      <main className="mx-auto max-w-xl px-5 py-8">
        <Logo />
        <SetupNotice />
      </main>
    );
  }
  if (!ev) notFound();
  return <InviteClient initial={ev} demo={params.slug === "demo"} />;
}
