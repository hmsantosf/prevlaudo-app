import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { codigo } = await request.json();
  console.log("[validar] codigo recebido:", JSON.stringify(codigo));

  if (!codigo?.trim()) {
    return NextResponse.json({ error: "Código do cupom é obrigatório" }, { status: 400 });
  }

  const codigoFinal = codigo.trim().toUpperCase();
  console.log("[validar] codigoFinal:", codigoFinal);

  const hoje = new Date().toISOString().split("T")[0];
  console.log("[validar] hoje:", hoje);

  const { data: cupom, error } = await supabaseAdmin()
    .from("cupons")
    .select("id, nome, desconto, tipo_desconto, data_validade, ativo")
    .eq("nome", codigoFinal)
    .eq("ativo", true)
    .maybeSingle();

  console.log("[validar] cupom:", JSON.stringify(cupom));
  console.log("[validar] error:", JSON.stringify(error));

  if (!cupom) {
    return NextResponse.json({ error: "Cupom inválido ou inativo" }, { status: 404 });
  }

  if (cupom.data_validade && cupom.data_validade < hoje) {
    return NextResponse.json({ error: "Cupom expirado" }, { status: 410 });
  }

  return NextResponse.json({
    id: cupom.id,
    nome: cupom.nome,
    desconto: cupom.desconto,
    tipo_desconto: cupom.tipo_desconto,
    data_validade: cupom.data_validade,
  });