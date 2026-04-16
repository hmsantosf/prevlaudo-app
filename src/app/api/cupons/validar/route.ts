import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { codigo } = await request.json();
  if (!codigo?.trim()) {
    return NextResponse.json({ error: "Código do cupom é obrigatório" }, { status: 400 });
  }

  const hoje = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  const { data: cupom } = await supabaseAdmin()
    .from("cupons")
    .select("id, nome, desconto, tipo_desconto, validade, ativo")
    .eq("nome", codigo.trim().toUpperCase())
    .eq("ativo", true)
    .maybeSingle();

  if (!cupom) {
    return NextResponse.json({ error: "Cupom inválido ou inativo" }, { status: 404 });
  }

  if (cupom.validade && cupom.validade < hoje) {
    return NextResponse.json({ error: "Cupom expirado" }, { status: 410 });
  }

  return NextResponse.json({
    id: cupom.id,
    nome: cupom.nome,
    desconto: cupom.desconto,
    tipo_desconto: cupom.tipo_desconto,
    validade: cupom.validade,
  });
}
