import { GoogleGenerativeAI } from "@google/generative-ai";

// ─────────────────────────────────────────────────────────────────
// Interface de dados extraídos do Histórico de Tutela Antecipada
// O PDF tem apenas duas colunas: Referência e Valor em R$
// ─────────────────────────────────────────────────────────────────
export interface PagamentoTutela {
  referencia: string; // ex: "FEV/2021"
  valor: number;      // valor em R$
}

export interface DadosTutela {
  nomeCredor: string;
  cpfCredor: string;
  matriculaAerus: string;
  pagamentos: PagamentoTutela[];
  totalValor: number;
  dataDocumento: string;
}

// ─────────────────────────────────────────────────────────────────
// Prompt enviado ao Gemini
// ─────────────────────────────────────────────────────────────────
const PROMPT = `Analise este PDF que é um "Histórico de Pagamento de Rateio de Crédito / Tutela Antecipada União" da AERUS (previdência complementar brasileira).

A tabela deste documento tem APENAS duas colunas: "Referência" (ex: FEV/2021) e "Valor em R$".

Extraia os seguintes dados e retorne APENAS um JSON válido, sem markdown, sem código, sem explicação — somente o objeto JSON:

{
  "nome_credor": "nome completo do credor/participante no cabeçalho",
  "cpf_credor": "CPF no formato 000.000.000-00",
  "matricula_aerus": "número da matrícula AERUS",
  "pagamentos": [
    {
      "referencia": "referência no formato MMM/AAAA, ex: FEV/2021",
      "valor": 1234.56
    }
  ],
  "total_valor": 99999.99,
  "data_documento": "data do documento no formato DD/MM/AAAA se presente"
}

Importante:
- Extraia TODOS os registros da tabela, na ordem que aparecem no documento
- Os valores numéricos devem ser números JSON (não strings), usando ponto como separador decimal
- Não invente colunas que não existem no documento (não há IR, data de pagamento, valor líquido, etc.)
- Se um campo de texto não existir, use string vazia ""
- Se total_valor não aparecer, use 0
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
      inlineData: { mimeType: "application/pdf", data: base64 },
    },
    PROMPT,
  ]);

  const responseText = result.response.text();
  console.log("[gemini-tutela] resposta bruta:\n", responseText);

  const json = parseGeminiResponse(responseText);

  const pagamentosRaw = Array.isArray(json.pagamentos) ? json.pagamentos : [];
  const pagamentos: PagamentoTutela[] = pagamentosRaw.map((p: Record<string, unknown>) => ({
    referencia: String(p.referencia ?? ""),
    valor: typeof p.valor === "number" ? p.valor : parseFloat(String(p.valor ?? "0")) || 0,
  }));

  const dados: DadosTutela = {
    nomeCredor:    String(json.nome_credor    ?? ""),
    cpfCredor:     String(json.cpf_credor     ?? ""),
    matriculaAerus: String(json.matricula_aerus ?? ""),
    pagamentos,
    totalValor: typeof json.total_valor === "number" ? json.total_valor : parseFloat(String(json.total_valor ?? "0")) || 0,
    dataDocumento: String(json.data_documento ?? ""),
  };

  console.log(`[gemini-tutela] ${pagamentos.length} pagamentos extraídos`);

  return { ...dados, _respostaGemini: responseText };
}
