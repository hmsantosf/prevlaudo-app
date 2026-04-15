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

  const isLiper = await verificarLiper(session.user.id);
  if (!isLiper) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin()
    .from("profiles")
    .select("id, name, email, categoria, creditos")
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Erro ao buscar usuários" }, { status: 500 });
  }

  return NextResponse.json(data);
}

const patchSchema = z.object({
  id: z.string().uuid(),
  categoria: z.enum(["super", "liper"]),
  creditos: z.number().int().min(0),
});

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const isLiper = await verificarLiper(session.user.id);
  if (!isLiper) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { id, categoria, creditos } = parsed.data;

  const { error } = await supabaseAdmin()
    .from("profiles")
    .update({ categoria, creditos })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Erro ao atualizar usuário" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
