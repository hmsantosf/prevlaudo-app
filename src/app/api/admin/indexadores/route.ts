import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { z } from "zod";

async function verificarLiper(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin()
    .from("profiles")
    .select("categoria")
    .eq("id", userId)
    .maybeSingle();
  return data?.categoria === "liper";
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  if (!(await verificarLiper(session.user.id))) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin()
    .from("indexadores")
    .select("id, nome, sigla, ativo, casas_decimais, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Erro ao buscar indexadores" }, { status: 500 });
  }

  return NextResponse.json(data);
}

const postSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  sigla: z.string().min(1, "Sigla é obrigatória").max(10, "Sigla deve ter no máximo 10 caracteres"),
  ativo: z.boolean().default(true),
  casas_decimais: z.number().int().min(0).max(6).default(2),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  if (!(await verificarLiper(session.user.id))) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin()
    .from("indexadores")
    .insert({ nome: parsed.data.nome, sigla: parsed.data.sigla, ativo: parsed.data.ativo, casas_decimais: parsed.data.casas_decimais })
    .select("id, nome, sigla, ativo, casas_decimais, created_at")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Erro ao criar indexador", detail: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data, { status: 201 });
}
