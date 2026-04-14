import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { z } from "zod";

const cadastroSchema = z.object({
  name: z.string().min(3, "Nome deve ter ao menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Senha deve ter ao menos 8 caracteres"),
});

export async function POST(request: NextRequest) {
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
    const message = authError.message.includes("already registered")
      ? "Este email já está cadastrado"
      : authError.message;
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
  const { error: profileError } = await admin.from("profiles").insert({
    id: authData.user.id,
    name,
    email,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json(
      { error: "Erro ao criar perfil. Tente novamente." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
