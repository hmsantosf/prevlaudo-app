import { GoogleGenerativeAI } from "@google/generative-ai";

// ─────────────────────────────────────────────────────────────────
// Interface de dados extraídos
// Mantida em sync com Step2Confirmacao.tsx e api/processos/route.ts
// ─────────────────────────────────────────────────────────────────
export interface DadosAerus {
  // Credor
  nomeCredor: string;
  cpfCredor: string;
  dataNascimentoCredor: string;
  matriculaAerus: string;
  matriculaFuncional: string;
  sexoCredor: string;
  dataConcessao: string;
  tipoBeneficio: string;
  tipoRenda: string;
  // Valores financeiros
  valorCota: string;
  montanteConcessao: string;
  anuidadeConcessao: string;
  indenizacaoConcessao: string;
  indiceCorrecao: string;
  indenizacaoAtualizada: string;
  // Beneficiário
  nomeBeneficiario: string;
  cpfBeneficiario: string;
  dataNascBeneficiario: string;
  // Identificação do relatório
  dataRelatorio: string;
  percentualContinuacao: string;
}

// ─────────────────────────────────────────────────────────────────
// Prompt enviado ao Gemini
// ─────────────────────────────────────────────────────────────────
const PROMPT = `Analise a página 1 deste PDF que é um Relatório de Concessão de Indenização de previdência complementar brasileiro.

Extraia os seguintes dados e retorne APENAS um JSON válido, sem markdown, sem código, sem explicação — somente o objeto JSON:

{
  "nome_credor": "nome completo do credor/participante",
  "cpf": "CPF no formato 000.000.000-00",
  "data_nascimento": "data no formato DD/MM/AAAA",
  "matricula_aerus": "número da matrícula AERUS",
  "matricula_funcional": "matrícula funcional se houver",
  "sexo": "Masculino ou Feminino",
  "data_concessao": "data de concessão no formato DD/MM/AAAA",
  "tipo_beneficio": "descrição do tipo de benefício",
  "tipo_renda": "descrição do tipo de renda",
  "valor_cota": "valor da cota numérico",
  "montante_concessao": "montante para concessão numérico",
  "anuidade_concessao": "anuidade para concessão numérico",
  "indenizacao_concessao": "indenização na concessão numérico",
  "indice_correcao": "índice de correção",
  "indenizacao_atualizada": "indenização atualizada referência numérico",
  "nome_beneficiario": "nome completo do beneficiário se houver",
  "cpf_beneficiario": "CPF do beneficiário no formato 000.000.000-00",
  "data_nascimento_beneficiario": "data de nascimento do beneficiário DD/MM/AAAA",
  "data_relatorio": "data que aparece no canto superior direito do PDF, formato DD/MM/AAAA. Neste exemplo seria 04/03/2026",
  "percentual_continuacao": "valor do campo % CONTINUACAO, ex: 70,00 %"
}

Para campos não encontrados no documento, use string vazia "".
Retorne SOMENTE o JSON, nada mais.`;

// ─────────────────────────────────────────────────────────────────
// Extrai o JSON da resposta (Gemini às vezes envolve em ```json```)
// ─────────────────────────────────────────────────────────────────
function parseGeminiResponse(text: string): Record<string, string> {
  // Remove blocos de código markdown se presentes
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Tenta extrair só a parte JSON se houver texto ao redor
    const match = cleaned.match(/\{[\s\S]+\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error(`Resposta do Gemini não é JSON válido:\n${text.slice(0, 500)}`);
  }
}

// ─────────────────────────────────────────────────────────────────
// Função principal
// ─────────────────────────────────────────────────────────────────
export async function extrairDadosComGemini(
  buffer: Buffer
): Promise<DadosAerus & { _respostaGemini: string }> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_GEMINI_API_KEY não configurada no .env.local");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

  const base64 = buffer.toString("base64");

  console.log(`[gemini] enviando PDF (${(buffer.length / 1024).toFixed(0)} KB) para gemini-2.5-flash-lite...`);

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
  console.log("[gemini] resposta bruta:\n", responseText);

  const json = parseGeminiResponse(responseText);

  // Mapeia snake_case → camelCase (interface DadosAerus)
  const dados: DadosAerus = {
    nomeCredor:             String(json.nome_credor             ?? ""),
    cpfCredor:              String(json.cpf                     ?? ""),
    dataNascimentoCredor:   String(json.data_nascimento         ?? ""),
    matriculaAerus:         String(json.matricula_aerus         ?? ""),
    matriculaFuncional:     String(json.matricula_funcional     ?? ""),
    sexoCredor:             String(json.sexo                    ?? ""),
    dataConcessao:          String(json.data_concessao          ?? ""),
    tipoBeneficio:          String(json.tipo_beneficio          ?? ""),
    tipoRenda:              String(json.tipo_renda              ?? ""),
    valorCota:              String(json.valor_cota              ?? ""),
    montanteConcessao:      String(json.montante_concessao      ?? ""),
    anuidadeConcessao:      String(json.anuidade_concessao      ?? ""),
    indenizacaoConcessao:   String(json.indenizacao_concessao   ?? ""),
    indiceCorrecao:         String(json.indice_correcao         ?? ""),
    indenizacaoAtualizada:  String(json.indenizacao_atualizada  ?? ""),
    nomeBeneficiario:       String(json.nome_beneficiario       ?? ""),
    cpfBeneficiario:        String(json.cpf_beneficiario        ?? ""),
    dataNascBeneficiario:   String(json.data_nascimento_beneficiario ?? ""),
    dataRelatorio:          String(json.data_relatorio          ?? ""),
    percentualContinuacao:  String(json.percentual_continuacao  ?? ""),
  };

  const preenchidos = Object.values(dados).filter(Boolean).length;
  console.log(`[gemini] ${preenchidos}/${Object.keys(dados).length} campos extraídos`);

  return { ...dados, _respostaGemini: responseText };
}
