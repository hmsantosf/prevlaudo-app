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

const patchSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  desconto: z.number().positive("Desconto deve ser positivo"),
  tipo: z.enum(["real", "percentual"]),
  validade: z.string().nullable().optional(),
  ativo: z.boolean(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  if (!(await verificarLiper(session.user.id))) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin()
    .from("cupons")
    .update({
      nome: parsed.data.nome,
      desconto: parsed.data.desconto,
      tipo: parsed.data.tipo,
      validade: parsed.data.validade ?? null,
      ativo: parsed.data.ativo,
    })
    .eq("id", id)
    .select("id, nome, desconto, tipo, validade, ativo")
    .single();

  if (error) {
    return NextResponse.json({ error: "Erro ao atualizar cupom" }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  if (!(await verificarLiper(session.user.id))) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;

  const { error } = await supabaseAdmin()
    .from("cupons")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Erro ao excluir cupom" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
