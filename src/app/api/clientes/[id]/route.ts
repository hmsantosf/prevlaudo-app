import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { auth } from "@/lib/auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const admin = supabaseAdmin();

  // Verifica que o cliente pertence ao usuário logado
  const { data: cliente } = await admin
    .from("clientes")
    .select("id")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (!cliente) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  }

  // Deleta processos do cliente primeiro
  const { error: errProcessos } = await admin
    .from("processos")
    .delete()
    .eq("cliente_id", id)
    .eq("user_id", session.user.id);

  if (errProcessos) {
    return NextResponse.json({ error: "Erro ao excluir processos do cliente" }, { status: 500 });
  }

  // Deleta o cliente
  const { error: errCliente } = await admin
    .from("clientes")
    .delete()
    .eq("id", id)
    .eq("user_id", session.user.id);

  if (errCliente) {
    return NextResponse.json({ error: "Erro ao excluir cliente" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
