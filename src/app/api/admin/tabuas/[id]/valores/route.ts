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
    .from("tabuas_valores")
    .select("idade, qx")
    .eq("tabua_id", id)
    .order("idade", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Erro ao buscar valores" }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

const putSchema = z.object({
  valores: z.array(
    z.object({
      idade: z.number().int().min(0).max(119),
      qx: z.number().min(0).max(1),
    })
  ).length(120, "Esperados exatamente 120 valores (idades 0-119)"),
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

  const rows = parsed.data.valores.map(({ idade, qx }) => ({
    tabua_id: id,
    idade,
    qx,
  }));

  const { error } = await supabaseAdmin()
    .from("tabuas_valores")
    .upsert(rows, { onConflict: "tabua_id,idade" });

  if (error) {
    return NextResponse.json({ error: "Erro ao salvar valores", detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
