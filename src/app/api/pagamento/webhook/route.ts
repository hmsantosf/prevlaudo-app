import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { enviarEmail, emailConfirmacaoCreditos } from "@/lib/email";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const payload = body as {
    event: string;
    payment?: {
      id: string;
      value: number;
      status: string;
      externalReference: string | null;
    };
  };

  console.log("[webhook] evento recebido:", payload.event, "payment:", payload.payment?.id);

  const eventosConfirmados = ["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"];
  if (!eventosConfirmados.includes(payload.event)) {
    return NextResponse.json({ ok: true, ignorado: true });
  }

  const pagamento = payload.payment;
  if (!pagamento?.externalReference) {
    console.warn("[webhook] pagamento sem externalReference:", pagamento?.id);
    return NextResponse.json({ ok: true });
  }

  // externalReference = "{userId}|{quantidade}"
  const partes = pagamento.externalReference.split("|");
  if (partes.length !== 2) {
    console.warn("[webhook] externalReference inválido:", pagamento.externalReference);
    return NextResponse.json({ ok: true });
  }

  const [userId, quantidadeStr] = partes;
  const quantidade = parseInt(quantidadeStr);

  if (!userId || isNaN(quantidade) || quantidade < 1) {
    console.warn("[webhook] dados inválidos no externalReference:", pagamento.externalReference);
    return NextResponse.json({ ok: true });
  }

  const admin = supabaseAdmin();

  // ── Buscar perfil do usuário ───────────────────────────────────
  const { data: perfil, error: errPerfil } = await admin
    .from("profiles")
    .select("name, email, creditos")
    .eq("id", userId)
    .maybeSingle();

  if (errPerfil || !perfil) {
    console.error("[webhook] usuário não encontrado:", userId, errPerfil?.message);
    return NextResponse.json({ ok: true });
  }

  // ── Idempotência: verificar se já processamos este pagamento ──
  const { data: pagamentoLocal } = await admin
    .from("pagamentos")
    .select("status")
    .eq("asaas_payment_id", pagamento.id)
    .maybeSingle();

  if (pagamentoLocal?.status === "CONFIRMED") {
    console.log("[webhook] pagamento já confirmado anteriormente:", pagamento.id);
    return NextResponse.json({ ok: true });
  }

  // ── Adicionar créditos ─────────────────────────────────────────
  const novosCreditos = (perfil.creditos ?? 0) + quantidade;

  const { error: errUpdate } = await admin
    .from("profiles")
    .update({ creditos: novosCreditos })
    .eq("id", userId);

  if (errUpdate) {
    console.error("[webhook] erro ao atualizar créditos:", errUpdate.message);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }

  console.log(`[webhook] créditos atualizados: userId=${userId} +${quantidade} → total=${novosCreditos}`);

  // ── Atualizar status local ─────────────────────────────────────
  await admin
    .from("pagamentos")
    .update({ status: "CONFIRMED" })
    .eq("asaas_payment_id", pagamento.id);

  // ── Enviar e-mail de confirmação ───────────────────────────────
  await enviarEmail(
    perfil.email,
    `${quantidade} crédito${quantidade !== 1 ? "s" : ""} adicionado${quantidade !== 1 ? "s" : ""} – prevAERUS`,
    emailConfirmacaoCreditos({
      nome: perfil.name,
      quantidade,
      valor: pagamento.value,
    })
  );

  return NextResponse.json({ ok: true });
}
