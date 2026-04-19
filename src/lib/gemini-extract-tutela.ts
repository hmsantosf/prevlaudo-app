import { GoogleGenerativeAI } from "@google/generative-ai";

// ─────────────────────────────────────────────────────────────────
// Interface de dados extraídos do Histórico de Tutela Antecipada
// ─────────────────────────────────────────────────────────────────
export interface PagamentoTutela {
  competencia: string;      // MM/AAAA
  dataPagamento: string;    // DD/MM/AAAA
  valorBruto: string;
  valorIr: string;
  valorLiquido: string;
}

export interface DadosTutela {
  // Identificação do credor
  nomeCredor: string;
  cpfCredor: string;
  matriculaAerus: string;
  // Histórico de pagamentos
  pagamentos: PagamentoTutela[];
  // Totais
  totalBruto: string;
  totalIr: string;
  totalLiquido: string;
  // Identificação do documento
  dataDocumento: string;
}

// ─────────────────────────────────────────────────────────────────
// Prompt enviado ao Gemini
// ─────────────────────────────────────────────────────────────────
const PROMPT = `Analise este PDF que é um "Histórico de Pagamento de Rateio de Crédito / Tutela Antecipada União" da AERUS (previdência complementar brasileira).

Extraia os seguintes dados e retorne APENAS um JSON válido, sem markdown, sem código, sem explicação — somente o objeto JSON:

{
  "nome_credor": "nome completo do credor/participante no cabeçalho",
  "cpf_credor": "CPF no formato 000.000.000-00",
  "matricula_aerus": "número da matrícula AERUS",
  "pagamentos": [
    {
      "competencia": "competência no formato MM/AAAA",
      "data_pagamento": "data de pagamento no formato DD/MM/AAAA",
      "valor_bruto": "valor bruto numérico como string, ex: 1234.56",
      "valor_ir": "valor do IR retido como string, ex: 123.45",
      "valor_liquido": "valor líquido pago como string, ex: 1111.11"
    }
  ],
  "total_bruto": "total bruto como string numérica",
  "total_ir": "total IR retido como string numérica",
  "total_liquido": "total líquido como string numérica",
  "data_documento": "data do documento no formato DD/MM/AAAA se presente"
}

Importante:
- Extraia TODOS os registros da tabela de pagamentos, na ordem que aparecem no documento
- Para valores monetários, use ponto como separador decimal (ex: "1234.56"), sem símbolos de moeda
- Se um campo não existir no documento, use string vazia ""
- Para o array de pagamentos, se não houver registros, retorne array vazio []
- Retorne SOMENTE o JSON, nada mais.`;

// ─────────────────────────────────────────────────────────────────
// Extrai o JSON da resposta
// ─────────────────────────────────────────────────────────────────
function parseGeminiResponse(text: string): Record<string, unknown> {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]+\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error(`Resposta do Gemini não é JSON válido:\n${text.slice(0, 500)}`);
  }
}

// ─────────────────────────────────────────────────────────────────
// Função principal
// ─────────────────────────────────────────────────────────────────
export async function extrairDadosTutelaComGemini(
  buffer: Buffer
): Promise<DadosTutela & { _respostaGemini: string }> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_GEMINI_API_KEY não configurada no .env.local");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

  const base64 = buffer.toString("base64");

  console.log(`[gemini-tutela] enviando PDF (${(buffer.length / 1024).toFixed(0)} KB) para gemini-2.5-flash-lite...`);

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: "application/pdf",
        data: base64,
      },
    },
    PROMPT,
  ]);

  const responseText = result.response.text();
  console.log("[gemini-tutela] resposta bruta:\n", responseText);

  const json = parseGeminiResponse(responseText);

  const pagamentosRaw = Array.isArray(json.pagamentos) ? json.pagamentos : [];
  const pagamentos: PagamentoTutela[] = pagamentosRaw.map((p: Record<string, unknown>) => ({
    competencia:    String(p.competencia    ?? ""),
    dataPagamento:  String(p.data_pagamento ?? ""),
    valorBruto:     String(p.valor_bruto    ?? ""),
    valorIr:        String(p.valor_ir       ?? ""),
    valorLiquido:   String(p.valor_liquido  ?? ""),
  }));

  const dados: DadosTutela = {
    nomeCredor:    String(json.nome_credor    ?? ""),
    cpfCredor:     String(json.cpf_credor     ?? ""),
    matriculaAerus: String(json.matricula_aerus ?? ""),
    pagamentos,
    totalBruto:    String(json.total_bruto    ?? ""),
    totalIr:       String(json.total_ir       ?? ""),
    totalLiquido:  String(json.total_liquido  ?? ""),
    dataDocumento: String(json.data_documento ?? ""),
  };

  console.log(`[gemini-tutela] ${pagamentos.length} pagamentos extraídos`);

  return { ...dados, _respostaGemini: responseText };
}
