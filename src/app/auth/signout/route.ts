import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const sb = getServerSupabase();
  if (sb) await sb.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
