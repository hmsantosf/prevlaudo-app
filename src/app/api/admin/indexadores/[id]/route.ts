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
  sigla: z.string().min(1, "Sigla é obrigatória").max(10, "Sigla deve ter no máximo 10 caracteres"),
  ativo: z.boolean(),
  casas_decimais: z.number().int().min(0).max(6),
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
    .from("indexadores")
    .update({ nome: parsed.data.nome, sigla: parsed.data.sigla, ativo: parsed.data.ativo, casas_decimais: parsed.data.casas_decimais })
    .eq("id", id)
    .select("id, nome, sigla, ativo, casas_decimais, created_at")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Erro ao atualizar indexador", detail: error.message },
      { status: 500 }
    );
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
    .from("indexadores")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Erro ao excluir indexador" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
