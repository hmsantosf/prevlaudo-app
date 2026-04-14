// pdf-parse v1.x — API simples: pdfParse(buffer) → { text, numpages }
// Não usa pdfjs-dist diretamente, evitando o erro "DOMMatrix is not defined"
import pdfParse from "pdf-parse";

// ─────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────

export interface DadosAerus {
  nomeCredor: string;
  cpfCredor: string;
  dataNascimentoCredor: string;
  matriculaAerus: string;
  sexoCredor: string;
  dataConcessao: string;
  idadeConcessao: string;
  tipoBeneficio: string;
  tipoRenda: string;
  percentualContinuacao: string;
  montanteConcessao: string;   // "INDENIZACAO ATUALIZADA REFERENCIA"
  valorCota: string;           // "VALOR COTA"
  anuidadeConcessao: string;   // "ANUIDADE P/ CONCESSAO"
  nomeBeneficiario: string;
  sexoBeneficiario: string;
  dataNascBeneficiario: string;
  tpBem: string;
  tpPes: string;
  cpfBeneficiario: string;
}

// ─────────────────────────────────────────────
// Helpers de extração
// ─────────────────────────────────────────────

/** Primeiro match do grupo 1, ou "". */
function rx(text: string, pattern: RegExp): string {
  return text.match(pattern)?.[1]?.trim() ?? "";
}

/** Todos os matches do grupo 1 de um padrão. */
function rxAll(text: string, pattern: RegExp): string[] {
  const out: string[] = [];
  const re = new RegExp(pattern.source, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m[1]) out.push(m[1].trim());
  }
  return out;
}

/**
 * Captura o conteúdo entre dois rótulos.
 * Pega tudo depois de `after` até encontrar `until` (ou fim do texto).
 * Remove espaços e quebras de linha extras.
 */
function entre(text: string, after: RegExp, until: RegExp): string {
  const startM = text.match(after);
  if (!startM || startM.index === undefined) return "";
  const from = startM.index + startM[0].length;
  const remaining = text.slice(from);
  const endM = remaining.match(until);
  const raw = endM ? remaining.slice(0, endM.index) : remaining.slice(0, 120);
  return raw.replace(/\s+/g, " ").trim();
}

// ─────────────────────────────────────────────
// Extração principal
// ─────────────────────────────────────────────

export async function extrairDadosAerus(
  buffer: Buffer
): Promise<DadosAerus & { _textoExtraido: string }> {
  // Extrai apenas a primeira página
  const parsed = await pdfParse(buffer, { max: 1 });
  const raw = parsed.text;

  // Log sempre visível — ajuda a diagnosticar sem abrir DevTools
  console.log("\n========== TEXTO EXTRAÍDO (pág 1) ==========");
  console.log(raw);
  console.log("============================================\n");

  // Normaliza: colapsa espaços múltiplos mas preserva quebras de linha
  const texto = raw.replace(/[ \t]+/g, " ").replace(/\r/g, "");

  // ── Todos os CPFs (000.000.000-00) ───────────────────────────────
  const cpfs = rxAll(texto, /(\d{3}\.\d{3}\.\d{3}-\d{2})/);

  // ── Nome do credor ────────────────────────────────────────────────
  // Padrão: "DADOS DO CREDOR" seguido do nome na mesma linha ou na próxima
  const nomeCredor =
    rx(texto, /DADOS\s+DO\s+CREDOR[:\s\n]+([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][A-ZÁÀÂÃÉÊÍÓÔÕÚÇa-záàâãéêíóôõúç\s]+?)(?=\n|CPF|DATA|MATR|$)/i) ||
    entre(texto, /DADOS\s+DO\s+CREDOR/i, /\n|CPF\s|\d{3}\./);

  // ── Data de nascimento do credor ──────────────────────────────────
  const dataNascimentoCredor =
    rx(texto, /DATA\s+(?:DE\s+)?NASCIMENTO[:\s]+(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i) ||
    rx(texto, /NASC(?:IMENTO)?[:\s]+(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i);

  // ── Matrícula AERUS ───────────────────────────────────────────────
  const matriculaAerus =
    rx(texto, /MATR[ÍI]CULA\s+AERUS[:\s]+(\d+)/i) ||
    rx(texto, /MATRICULA\s+AERUS[:\s]+(\d+)/i) ||
    rx(texto, /N[°º\.]\s*MATR[ÍI]CULA[:\s]+(\d+)/i);

  // ── Sexo do credor ────────────────────────────────────────────────
  const sexoCredor =
    rx(texto, /SEXO[:\s]+(MASCULINO|FEMININO|M\b|F\b)/i);

  // ── Data de concessão ─────────────────────────────────────────────
  const dataConcessao =
    rx(texto, /DATA\s+(?:DE\s+)?CONCES[SÃ][AÃO]{1,2}[:\s]+(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i) ||
    rx(texto, /DT\.?\s*CONCES[SÃ][AÃO]{1,2}[:\s]+(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i);

  // ── Idade na concessão ────────────────────────────────────────────
  const idadeConcessao =
    rx(texto, /IDADE\s+(?:NA?\s+)?CONCES[SÃ][AÃO]{1,2}[:\s]+(\d{1,3})/i) ||
    rx(texto, /IDADE\s+CONCES[SÃ]{1,2}[:\s]+(\d{1,3})/i);

  // ── Tipo de benefício ─────────────────────────────────────────────
  const tipoBeneficio =
    rx(texto, /TIPO\s+BENEFICIO[:\s]+([^\n]+?)(?=\n|DATA\s+CONCES|TIPO\s+RENDA)/i) ||
    rx(texto, /TIPO\s+BENEF[ÍI]CIO[:\s]+([^\n]+?)(?=\n|DATA)/i);

  // ── Tipo de renda ─────────────────────────────────────────────────
  const tipoRenda =
    rx(texto, /TIPO\s+(?:DE\s+)?RENDA[:\s]+([^\n]+?)(?=\n|%|DATA)/i) ||
    rx(texto, /TP\.?\s*RENDA[:\s]+([^\n]+?)(?=\n)/i);

  // ── % Continuação ─────────────────────────────────────────────────
  const percentualContinuacao =
    rx(texto, /%\s*CONTINUA[CÇÃ][AÃO]{1,2}[:\s]*([\d,\.]+\s*%?)/i) ||
    rx(texto, /CONTINUA[CÇÃ][AÃO]{1,2}[:\s]*([\d,\.]+\s*%?)/i);

  // ── Indenização atualizada referência ─────────────────────────────
  const montanteConcessao =
    rx(texto, /INDENIZA[CÇ][AÃ]O\s+ATUALIZADA\s+REFER[EÊ]NCIA[:\s]+(?:R\$\s*)?([\d\.\,]+)/i) ||
    rx(texto, /INDENIZA[CÇ][AÃ]O\s+ATUALIZADA[:\s]+(?:R\$\s*)?([\d\.\,]+)/i) ||
    rx(texto, /INDENIZA[CÇ][AÃ]O[:\s]+(?:R\$\s*)?([\d\.\,]+)/i);

  // ── Valor cota ────────────────────────────────────────────────────
  const valorCota =
    rx(texto, /VALOR\s+(?:DA\s+)?COTA[:\s]+(?:R\$\s*)?([\d\.\,]+)/i) ||
    rx(texto, /VLR\.?\s*COTA[:\s]+(?:R\$\s*)?([\d\.\,]+)/i);

  // ── Anuidade p/ concessão ─────────────────────────────────────────
  const anuidadeConcessao =
    rx(texto, /ANUIDADE\s+P[\/\s]+CONCES[SÃ][AÃO]{1,2}[:\s]+(?:R\$\s*)?([\d\.\,]+)/i) ||
    rx(texto, /ANUIDADE\s+(?:PARA\s+)?CONCES[SÃ][AÃO]{1,2}[:\s]+(?:R\$\s*)?([\d\.\,]+)/i) ||
    rx(texto, /ANUIDADE\s+P\/?C[:\s]+(?:R\$\s*)?([\d\.\,]+)/i);

  // ── Beneficiário ──────────────────────────────────────────────────
  const nomeBeneficiario =
    rx(texto, /BENEFICI[ÁA]RIO[:\s]+([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][A-ZÁÀÂÃÉÊÍÓÔÕÚÇa-záàâãéêíóôõúç\s]+?)(?=\n|CPF|DATA|SEXO|TP\s)/i) ||
    entre(texto, /BENEFICI[ÁA]RIO/i, /\n|CPF\s|\d{3}\./);

  // Segundo sexo no documento = beneficiário
  const todosSexos = rxAll(texto, /SEXO[:\s]+(MASCULINO|FEMININO|M\b|F\b)/);
  const sexoBeneficiario = todosSexos[1] ?? "";

  // Segunda data de nascimento = beneficiário
  const todasDatasNasc = rxAll(texto, /(?:DATA\s+)?(?:DE\s+)?NASC(?:IMENTO)?[:\s]+(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i);
  const dataNascBeneficiario = todasDatasNasc[1] ?? "";

  // ── Tp Bem / Tp Pes ───────────────────────────────────────────────
  const tpBem =
    rx(texto, /TP\.?\s+BEM[:\s]+(\S+)/i) ||
    rx(texto, /TIPO\s+BEM[:\s]+(\S+)/i);

  const tpPes =
    rx(texto, /TP\.?\s+PES(?:SOA)?[:\s]+(\S+)/i) ||
    rx(texto, /TIPO\s+PES(?:SOA)?[:\s]+(\S+)/i);

  // ── Monta resultado ───────────────────────────────────────────────
  const result: DadosAerus & { _textoExtraido: string } = {
    nomeCredor:             nomeCredor.replace(/\s+/g, " ").trim(),
    cpfCredor:              cpfs[0] ?? "",
    dataNascimentoCredor:   dataNascimentoCredor,
    matriculaAerus:         matriculaAerus,
    sexoCredor:             sexoCredor,
    dataConcessao:          dataConcessao,
    idadeConcessao:         idadeConcessao,
    tipoBeneficio:          tipoBeneficio.replace(/\s+/g, " ").trim(),
    tipoRenda:              tipoRenda.replace(/\s+/g, " ").trim(),
    percentualContinuacao:  percentualContinuacao,
    montanteConcessao:      montanteConcessao,
    valorCota:              valorCota,
    anuidadeConcessao:      anuidadeConcessao,
    nomeBeneficiario:       nomeBeneficiario.replace(/\s+/g, " ").trim(),
    sexoBeneficiario:       sexoBeneficiario,
    dataNascBeneficiario:   dataNascBeneficiario,
    tpBem:                  tpBem,
    tpPes:                  tpPes,
    cpfBeneficiario:        cpfs.length > 1 ? (cpfs[cpfs.length - 1] ?? "") : "",
    _textoExtraido:         raw,
  };

  const preenchidos = Object.entries(result)
    .filter(([k, v]) => k !== "_textoExtraido" && Boolean(v))
    .length;

  console.log(`[extrair] ${preenchidos}/${Object.keys(result).length - 1} campos extraídos`);

  return result;
}
