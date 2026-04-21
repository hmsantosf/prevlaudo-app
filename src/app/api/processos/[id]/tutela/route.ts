import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { extrairDadosTutelaComGemini } from "@/lib/gemini-extract-tutela";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;

  const { data: processo, error } = await supabaseAdmin()
    .from("processos")
    .select("id, dados_tutela, pdf_tutela_url")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single();

  if (error || !processo) {
    return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });
  }

  let pdfSignedUrl: string | null = null;
  if (processo.pdf_tutela_url) {
    const { data: signedData } = await supabaseAdmin()
      .storage
      .from("processos")
      .createSignedUrl(processo.pdf_tutela_url as string, 3600);
    pdfSignedUrl = signedData?.signedUrl ?? null;
  }

  return NextResponse.json({
    dados_tutela: processo.dados_tutela ?? null,
    pdf_signed_url: pdfSignedUrl,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;

  let body: { dados_tutela: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { error } = await supabaseAdmin()
    .from("processos")
    .update({ dados_tutela: body.dados_tutela })
    .eq("id", id)
    .eq("user_id", session.user.id);

  if (error) {
    return NextResponse.json(
      { error: "Erro ao salvar dados da tutela", detalhe: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const admin = supabaseAdmin();

  // ── Verificar que o processo pertence ao usuário ──────────────
  const { data: processo } = await admin
    .from("processos")
    .select("id")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single();

  if (!processo) {
    return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });
  }

  // ── Leitura do formulário ─────────────────────────────────────
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (err) {
    return NextResponse.json(
      { error: "Falha ao ler o formulário enviado", detalhe: String(err) },
      { status: 400 }
    );
  }

  const arquivo = formData.get("pdf") as File | null;

  if (!arquivo) {
    return NextResponse.json(
      { error: "Nenhum arquivo enviado (campo 'pdf' ausente)" },
      { status: 400 }
    );
  }

  if (arquivo.type !== "application/pdf") {
    return NextResponse.json(
      { error: `Tipo inválido: esperado 'application/pdf', recebido '${arquivo.type}'` },
      { status: 400 }
    );
  }

  if (arquivo.size > 20 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Arquivo muito grande (máx. 20 MB)" },
      { status: 400 }
    );
  }

  // ── Converte para buffer ──────────────────────────────────────
  let buffer: Buffer;
  try {
    buffer = Buffer.from(await arquivo.arrayBuffer());
    console.log(`[tutela] PDF recebido: "${arquivo.name}", ${(buffer.length / 1024).toFixed(0)} KB`);
  } catch (err) {
    return NextResponse.json(
      { error: "Falha ao ler o arquivo", detalhe: String(err) },
      { status: 500 }
    );
  }

  // ── Extração via Gemini ───────────────────────────────────────
  let resultado;
  try {
    resultado = await extrairDadosTutelaComGemini(buffer);
  } catch (err: unknown) {
    console.error("[tutela] erro no Gemini:", err);
    const message = err instanceof Error ? err.message : String(err);
    const stack   = err instanceof Error ? err.stack   : undefined;
    return NextResponse.json(
      {
        error: "Falha na extração pelo Gemini",
        detalhe: message,
        ...(process.env.NODE_ENV === "development" ? { stack } : {}),
      },
      { status: 422 }
    );
  }

  const { _respostaGemini, ...dadosTutela } = resultado;

  // ── Upload do PDF para o Storage ──────────────────────────────
  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9\-_]/g, "_");
  const cpf = dadosTutela.cpfCredor ? sanitize(dadosTutela.cpfCredor) : id;
  const storagePath = `${session.user.id}/${cpf}/tutela.pdf`;

  const { error: errUpload } = await admin.storage
    .from("processos")
    .upload(storagePath, buffer, { contentType: "application/pdf", upsert: true });

  if (errUpload) {
    console.error("[tutela] erro no upload do Storage:", errUpload.message);
  }

  const pdfTutelaUrl = errUpload ? null : storagePath;

  // ── Salvar no processo ────────────────────────────────────────
  const updatePayload: Record<string, unknown> = { dados_tutela: dadosTutela };
  if (pdfTutelaUrl) updatePayload.pdf_tutela_url = pdfTutelaUrl;

  const { error: errUpdate } = await admin
    .from("processos")
    .update(updatePayload)
    .eq("id", id)
    .eq("user_id", session.user.id);

  if (errUpdate) {
    return NextResponse.json(
      { error: "Erro ao salvar dados da tutela", detalhe: errUpdate.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    dados_tutela: dadosTutela,
    ...(process.env.NODE_ENV === "development" ? { _respostaGemini } : {}),
  });
}
