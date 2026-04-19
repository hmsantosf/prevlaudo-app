import { NextRequest, NextResponse } from "next/server";
import { extrairDadosTutelaComGemini } from "@/lib/gemini-extract-tutela";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

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

  let buffer: Buffer;
  try {
    buffer = Buffer.from(await arquivo.arrayBuffer());
    console.log(`[extrair-tutela] PDF recebido: "${arquivo.name}", ${(buffer.length / 1024).toFixed(0)} KB`);
  } catch (err) {
    return NextResponse.json(
      { error: "Falha ao ler o arquivo", detalhe: String(err) },
      { status: 500 }
    );
  }

  let resultado;
  try {
    resultado = await extrairDadosTutelaComGemini(buffer);
  } catch (err: unknown) {
    console.error("[extrair-tutela] erro no Gemini:", err);
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

  const { _respostaGemini, ...dados } = resultado;

  return NextResponse.json({
    dados,
    ...(process.env.NODE_ENV === "development" ? { _respostaGemini } : {}),
  });
}
