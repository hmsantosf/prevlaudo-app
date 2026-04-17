import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const formData = await request.formData();
  const pdf = formData.get("pdf") as File | null;
  const cpfCredor = (formData.get("cpfCredor") as string | null) ?? "sem-cpf";
  const dataRelatorio = (formData.get("dataRelatorio") as string | null) ?? "sem-data";

  if (!pdf) {
    return NextResponse.json({ error: "PDF não enviado" }, { status: 400 });
  }

  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9\-_]/g, "_");
  const path = `${session.user.id}/${sanitize(cpfCredor)}/${sanitize(dataRelatorio)}.pdf`;

  const bytes = await pdf.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const admin = supabaseAdmin();
  const { error } = await admin.storage
    .from("processos")
    .upload(path, buffer, { contentType: "application/pdf", upsert: true });

  if (error) {
    console.error("[upload-pdf] erro:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ path });
}
