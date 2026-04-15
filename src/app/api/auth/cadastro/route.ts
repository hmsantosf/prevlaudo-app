import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { z } from "zod";

const cadastroSchema = z.object({
  name: z.string().min(3, "Nome deve ter ao menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Senha deve ter ao menos 8 caracteres"),
});

function extractErrorMessage(err: unknown): string {
  if (!err) return "Erro desconhecido";
  if (typeof err === "string") return err;
  if (typeof err === "object") {
    const e = err as Record<string, unknown>;
    const msg = e.message ?? e.msg ?? e.code ?? e.error_description ?? e.error;
    if (typeof msg === "string" && msg.trim()) return msg;
    // Fallback: tenta serializar o objeto para expor a estrutura real
    try {
      return JSON.stringify(err, Object.getOwnPropertyNames(err));
    } catch {
      return "Erro desconhecido";
    }
  }
  return String(err);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = cadastroSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: "https://prevaerus.com.br/auth/callback",
        data: { name },
      },
    });

    if (authError) {
      const raw = extractErrorMessage(authError);
      const message = raw.toLowerCase().includes("already registered")
        ? "Este email já está cadastrado"
        : raw;
      return NextResponse.json({ error: message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: "Erro ao criar conta" }, { status: 500 });
    }

    // Usuário já cadastrado mas não confirmado (Supabase retorna identities vazio)
    if (authData.user.identities && authData.user.identities.length === 0) {
      return NextResponse.json(
        { error: "Este email já está cadastrado" },
        { status: 400 }
      );
    }

    const admin = supabaseAdmin();

    const insertPayload = { id: authData.user.id, name, email, user_type: "individual", categoria: "super", creditos: 0 };
    console.log("[cadastro] Inserindo profile:", insertPayload);

    const { error: profileError } = await admin.from("profiles").insert(insertPayload);

    if (profileError) {
      // Serializa todas as propriedades, incluindo não-enumeráveis (code, details, hint, message)
      const fullError = JSON.stringify(profileError, Object.getOwnPropertyNames(profileError));
      console.error("[cadastro] Erro ao inserir profile:", fullError);
      console.error("[cadastro] code:", profileError.code);
      console.error("[cadastro] message:", profileError.message);
      console.error("[cadastro] details:", profileError.details);
      console.error("[cadastro] hint:", profileError.hint);

      await admin.auth.admin.deleteUser(authData.user.id);

      return NextResponse.json(
        {
          error: `Erro ao criar perfil`,
          details: {
            code: profileError.code,
            message: profileError.message,
            details: profileError.details,
            hint: profileError.hint,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    const message = extractErrorMessage(err);
    return NextResponse.json({ error: `Erro interno: ${message}` }, { status: 500 });
  }
}
