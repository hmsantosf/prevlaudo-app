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

export async function GET(
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

  const { data, error } = await supabaseAdmin()
    .from("indexadores_valores")
    .select("mes, valor_acumulado, taxa_mensal")
    .eq("indexador_id", id)
    .order("mes", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Erro ao buscar valores" }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

const putSchema = z.object({
  valores: z.array(
    z.object({
      mes: z.string().regex(/^\d{4}-\d{2}-01$/, "Formato de mês inválido (esperado YYYY-MM-01)"),
      valor_acumulado: z.number(),
    })
  ).min(1, "Envie ao menos um valor"),
});

export async function PUT(
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
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  // Sort ASC to calculate taxa_mensal correctly
  const sorted = [...parsed.data.valores].sort((a, b) => a.mes.localeCompare(b.mes));

  const rows = sorted.map((v, i) => {
    let taxa_mensal: number | null = null;
    if (i > 0) {
      const anterior = sorted[i - 1].valor_acumulado;
      if (anterior !== 0) {
        taxa_mensal = v.valor_acumulado / anterior - 1;
      }
    }
    return {
      indexador_id: id,
      mes: v.mes,
      valor_acumulado: v.valor_acumulado,
      taxa_mensal,
    };
  });

  const { error } = await supabaseAdmin()
    .from("indexadores_valores")
    .upsert(rows, { onConflict: "indexador_id,mes" });

  if (error) {
    return NextResponse.json(
      { error: "Erro ao salvar valores", detail: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
