import { GoogleGenerativeAI } from "@google/generative-ai";

export interface PagamentoTutela {
  referencia: string;
  valor: number;
}

export interface DadosTutela {
  nomePlano: string;
  cnpb: string;
  isonomiaPlano: string;
  nomeCredor: string;
  cpfCredor: string;
  matriculaAerus: string;
  isonomiaIndividual: string;
  provisaoMatematicaIndividual: string;
  iip: string;
  pagamentos: PagamentoTutela[];
  totalPago: string;
  provisaoMatematicaPrincipal: string;
  correcaoMonetariaProvisao: string;
  jurosProvisaoMatematica: string;
  correcaoMonetariaJuros: string;
  dataDocumento: string;
}

const PROMPT = `Analise este PDF que é um "Histórico de Pagamento de Rateio de Crédito / Tutela Antecipada União" da AERUS (previdência complementar brasileira).

Extraia os seguintes dados e retorne APENAS um JSON válido, sem markdown, sem código, sem explicação — somente o objeto JSON:

{
  "nome_plano": "nome do plano de benefício",
  "cnpb": "código CNPB do plano",
  "isonomia_plano": "valor de isonomia do plano (com formatação original)",
  "nome_credor": "nome completo do credor/participante",
  "cpf_credor": "CPF no formato 000.000.000-00",
  "matricula_aerus": "número da matrícula AERUS",
  "isonomia_individual": "valor de isonomia individual (com formatação original)",
  "provisao_matematica_individual": "valor da provisão matemática individual (com formatação original)",
  "iip": "índice individual de participação (com formatação original)",
  "pagamentos": [
    {
      "referencia": "referência no formato MMM/AAAA, ex: FEV/2021",
      "valor": 1234.56
    }
  ],
  "total_pago": "total pago (com formatação original)",
  "provisao_matematica_principal": "provisão matemática principal (com formatação original)",
  "correcao_monetaria_provisao": "correção monetária da provisão (com formatação original)",
  "juros_provisao_matematica": "juros sobre provisão matemática (com formatação original)",
  "correcao_monetaria_juros": "correção monetária dos juros (com formatação original)",
  "data_documento": "data do documento no formato DD/MM/AAAA se presente"
}

Importante:
- Extraia TODOS os registros da tabela de pagamentos, na ordem que aparecem no documento
- Os valores dos pagamentos devem ser números JSON (não strings), usando ponto como separador decimal
- Os demais valores financeiros devem ser retornados como strings com a formatação original do documento
- Se um campo não existir no documento, use string vazia ""
- Retorne SOMENTE o JSON, nada mais.`;

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

export async function extrairDadosTutelaComGemini(
  buffer: Buffer
): Promise<DadosTutela & { _respostaGemini: string }> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_GEMINI_API_KEY não configurada no .env.local");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

  const base64 = buffer.toString("base64");

  console.log(`[gemini-tutela] enviando PDF (${(buffer.length / 1024).toFixed(0)} KB)...`);

  const result = await model.generateContent([
    { inlineData: { mimeType: "application/pdf", data: base64 } },
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
    nomePlano:                    String(json.nome_plano ?? ""),
    cnpb:                         String(json.cnpb ?? ""),
    isonomiaPlano:                String(json.isonomia_plano ?? ""),
    nomeCredor:                   String(json.nome_credor ?? ""),
    cpfCredor:                    String(json.cpf_credor ?? ""),
    matriculaAerus:               String(json.matricula_aerus ?? ""),
    isonomiaIndividual:           String(json.isonomia_individual ?? ""),
    provisaoMatematicaIndividual: String(json.provisao_matematica_individual ?? ""),
    iip:                          String(json.iip ?? ""),
    pagamentos,
    totalPago:                    String(json.total_pago ?? ""),
    provisaoMatematicaPrincipal:  String(json.provisao_matematica_principal ?? ""),
    correcaoMonetariaProvisao:    String(json.correcao_monetaria_provisao ?? ""),
    jurosProvisaoMatematica:      String(json.juros_provisao_matematica ?? ""),
    correcaoMonetariaJuros:       String(json.correcao_monetaria_juros ?? ""),
    dataDocumento:                String(json.data_documento ?? ""),
  };

  console.log(`[gemini-tutela] ${pagamentos.length} pagamentos extraídos`);

  return { ...dados, _respostaGemini: responseText };
}
