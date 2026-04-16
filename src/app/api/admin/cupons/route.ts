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
    .from("cupons")
    .select("id, nome, desconto, tipo_desconto, validade, ativo")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Erro ao buscar cupons" }, { status: 500 });
  }

  return NextResponse.json(data);
}

const postSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  desconto: z.number().int().min(1, "Desconto deve ser positivo"),
  tipo_desconto: z.enum(["real", "percentual"]),
  validade: z.string().nullable().optional(),
  ativo: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  console.log("[cupons POST] session.user:", JSON.stringify(session?.user ?? null));

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const isLiper = await verificarLiper(session.user.id);
  console.log("[cupons POST] userId:", session.user.id, "| isLiper:", isLiper);

  if (!isLiper) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const payload = {
    nome: parsed.data.nome,
    desconto: parsed.data.desconto,
    tipo_desconto: parsed.data.tipo_desconto,
    validade: parsed.data.validade ?? null,
    ativo: parsed.data.ativo,
  };
  console.log("[cupons POST] payload enviado ao Supabase:", JSON.stringify(payload));

  const { data, error } = await supabaseAdmin()
    .from("cupons")
    .insert(payload)
    .select("id, nome, desconto, tipo_desconto, validade, ativo")
    .single();

  if (error) {
    console.error("[cupons POST] erro Supabase:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    console.error('Erro detalhado:', JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: "Erro ao criar cupom", detail: error.message, code: error.code, hint: error.hint },
      { status: 500 }
    );
  }

  return NextResponse.json(data, { status: 201 });
}
