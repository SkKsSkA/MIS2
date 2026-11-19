import { notFound, redirect } from "next/navigation";
import { SetupNotice } from "@/components/SetupNotice";
import { SiteHeader } from "@/components/SiteHeader";
import { getServerSupabase } from "@/lib/supabase/server";
import type { BringItemRow, ContributionRow, EventRow, RsvpRow } from "@/lib/types";
import { OrganizerPanel } from "./OrganizerPanel";

export const metadata = { title: "Панель организатора" };

export default async function OrganizerPage({ params }: { params: { slug: string } }) {
  const sb = getServerSupabase();
  if (!sb) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-xl px-5">
          <SetupNotice />
        </main>
      </>
    );
  }
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) redirect(`/login?next=/dashboard/${params.slug}`);

  const { data: event } = await sb
    .from("events")
    .select("id, slug, host_id, kind, title, description, starts_at, location_name, address, dress_code, visibility, cover_color, goal_title, goal_amount, pay_phone, pay_recipient, pay_link, created_at")
    .eq("slug", params.slug)
    .eq("host_id", auth.user.id)
    .maybeSingle();
  if (!event) notFound();
  const ev = event as EventRow;

  const [rsvps, contributions, items] = await Promise.all([
    sb.from("rsvps").select("id, guest_name, status, created_at").eq("event_id", ev.id).order("created_at"),
    sb.from("contributions").select("id, guest_name, amount, confirmed, payer_hint, created_at").eq("event_id", ev.id).order("created_at"),
    sb.from("bring_items").select("id, label, taken_by").eq("event_id", ev.id).order("created_at"),
  ]);

  return (
    <>
      <SiteHeader />
      <OrganizerPanel
        event={ev}
        rsvps={(rsvps.data ?? []) as RsvpRow[]}
        contributions={(contributions.data ?? []) as ContributionRow[]}
        items={(items.data ?? []) as BringItemRow[]}
        siteUrl={(process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "")}
      />
    </>
  );
}
