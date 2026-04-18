import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const { token_hash, password } = await request.json();

  const { data: verifyData, error: verifyError } = await supabaseAdmin()
    .auth.verifyOtp({ token_hash, type: "recovery" });

  if (verifyError || !verifyData.user) {
    return NextResponse.json({ error: "Token inválido ou expirado" }, { status: 400 });
  }

  const { error: updateError } = await supabaseAdmin()
    .auth.admin.updateUserById(verifyData.user.id, { password });

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
