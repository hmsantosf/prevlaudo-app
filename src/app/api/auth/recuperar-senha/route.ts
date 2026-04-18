import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { enviarEmail, emailRecuperacaoSenha } from "@/lib/email";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const email = (body as { email?: unknown }).email;
  if (typeof email !== "string" || !email.includes("@")) {
    // Always return success to not reveal whether the email exists
    return NextResponse.json({ ok: true });
  }

  const { data, error } = await supabaseAdmin().auth.admin.generateLink({
    type: "recovery",
    email: email,
    options: {
      redirectTo: "https://www.prevaerus.com.br/redefinir-senha",
    },
  });

  if (error || !data?.properties?.action_link) {
    console.error("[recuperar-senha] Erro ao gerar link:", error?.message);
    // Still return success — don't reveal the error to the client
    return NextResponse.json({ ok: true });
  }

  await enviarEmail(
    email,
    "Recuperação de senha – prevAERUS",
    emailRecuperacaoSenha({ link: data.properties.action_link })
  );

  return NextResponse.json({ ok: true });
}
