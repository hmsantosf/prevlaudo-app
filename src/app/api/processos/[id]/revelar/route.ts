import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { auth } from "@/lib/auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const userId = session.user.id;
  const admin = supabaseAdmin();

  // ── Buscar créditos do usuário ────────────────────────────────
  const { data: perfil } = await admin
    .from("profiles")
    .select("creditos")
    .eq("id", userId)
    .single();

  const creditos = (perfil as { creditos: number } | null)?.creditos ?? 0;

  if (creditos < 1) {
    return NextResponse.json({ error: "Créditos insuficientes" }, { status: 402 });
  }

  // ── Buscar nome do cliente via processo ───────────────────────
  const { data: processo } = await admin
    .from("processos")
    .select("cliente_id, clientes(name)")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (!processo) {
    return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });
  }

  const clienteNome =
    (processo as any).clientes?.name ?? "Cliente desconhecido";

  // ── Deduzir 1 crédito ─────────────────────────────────────────
  const { error: errCredito } = await admin
    .from("profiles")
    .update({ creditos: creditos - 1 })
    .eq("id", userId);

  if (errCredito) {
    return NextResponse.json({ error: "Erro ao deduzir crédito" }, { status: 500 });
  }

  // ── Marcar processo como revelado ─────────────────────────────
  const { error: errProcesso } = await admin
    .from("processos")
    .update({ revelado: true, status: "calculado" })
    .eq("id", id)
    .eq("user_id", userId);

  if (errProcesso) {
    return NextResponse.json({ error: "Erro ao atualizar processo" }, { status: 500 });
  }

  // ── Registrar histórico ───────────────────────────────────────
  await admin.from("creditos_historico").insert({
    user_id: userId,
    tipo: "debito",
    quantidade: 1,
    origem: "revisao",
    descricao: `Revisão de benefício – ${clienteNome}`,
    cliente_nome: clienteNome,
  });

  return NextResponse.json({ ok: true });
}
