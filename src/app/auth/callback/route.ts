import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  if (tokenHash && type) {
    // Fluxo por token hash (e-mail de confirmação padrão do Supabase)
    const admin = supabaseAdmin();
    await admin.auth.verifyOtp({ token_hash: tokenHash, type: type as any });
  } else if (code) {
    // Fluxo PKCE (via exchangeCodeForSession com client anon)
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await client.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}/login?verified=1`);
}
