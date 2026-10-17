import { createClient } from "@/lib/supabase/server";
import { emailDomainAllowed } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";

// Exchanges the Google OAuth code for a session, then enforces the
// allowed-domain gate. A signed-in user from a disallowed domain is
// signed back out immediately rather than left with a dangling session.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    return NextResponse.redirect(`${origin}/login?error=sign_in_failed`);
  }

  if (!emailDomainAllowed(data.session.user.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=domain_not_allowed`);
  }

  return NextResponse.redirect(`${origin}/admin`);
}
