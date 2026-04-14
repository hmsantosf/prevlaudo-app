import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { z } from "zod";

const processoSchema = z.object({
  // Credor
  nomeCredor:           z.string().min(1, "Nome do credor é obrigatório"),
  cpfCredor:            z.string(),
  dataNascimentoCredor: z.string(),
  matriculaAerus:       z.string(),
  matriculaFuncional:   z.string(),
  sexoCredor:           z.string(),
  dataConcessao:        z.string(),
  tipoBeneficio:        z.string(),
  tipoRenda:            z.string(),
  // Valores
  valorCota:            z.string(),
  montanteConcessao:    z.string(),
  anuidadeConcessao:    z.string(),
  indenizacaoConcessao: z.string(),
  indiceCorrecao:       z.string(),
  indenizacaoAtualizada:z.string(),
  // Beneficiário
  nomeBeneficiario:     z.string(),
  cpfBeneficiario:      z.string(),
  dataNascBeneficiario: z.string(),
  // Identificação do relatório
  dataRelatorio:         z.string(),
  percentualContinuacao: z.string(),
});

/**
 * Converte data no formato brasileiro (DD/MM/AAAA) para ISO (AAAA-MM-DD).
 * Retorna null se a entrada for vazia ou inválida.
 */
function toISODate(dataBR: string): string | null {
  if (!dataBR?.trim()) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dataBR.trim())) return dataBR.trim();
  const match = dataBR.trim().match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = processoSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const dados = parsed.data;
  const admin = supabaseAdmin();

  // ── PASSO 1: Buscar cliente pelo CPF + user_id ─────────────────────
  const { data: clienteExistente } = await admin
    .from("clientes")
    .select("id")
    .eq("user_id", session.user.id)
    .eq("cpf", dados.cpfCredor)
    .maybeSingle();

  let clienteId: string;

  if (clienteExistente) {
    // ── PASSO 2a: Cliente JÁ existe — verificar duplicata de processo ──
    clienteId = clienteExistente.id;
    console.log(`[processos] cliente encontrado: ${clienteId}`);

    if (dados.dataRelatorio) {
      const { data: processoExistente, error: errBusca } = await admin
        .from("processos")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("cliente_id", clienteId)
        .filter("dados_aerus->>dataRelatorio", "eq", dados.dataRelatorio)
        .maybeSingle();

      console.log(`[processos] busca duplicata — cliente_id: ${clienteId}, data_relatorio: "${dados.dataRelatorio}", encontrado: ${processoExistente?.id ?? "nenhum"}, erro: ${errBusca?.message ?? "nenhum"}`);

      if (processoExistente) {
        console.log(`[processos] processo duplicado detectado: ${processoExistente.id}`);
        return NextResponse.json(
          {
            error: `Já existe um processo cadastrado para este cliente com o relatório de ${dados.dataRelatorio}.`,
          },
          { status: 409 }
        );
      }
    }

    console.log(`[processos] criando novo processo para cliente existente: ${clienteId}`);
  } else {
    // ── PASSO 2b: Cliente NÃO existe — criar cliente ───────────────────
    const dataNascISO = toISODate(dados.dataNascimentoCredor);
    console.log(`[processos] cliente não encontrado — criando. cpf: ${dados.cpfCredor}, data_nascimento: ${dados.dataNascimentoCredor} → ${dataNascISO}`);

    const { data: novoCliente, error: errCliente } = await admin
      .from("clientes")
      .insert({
        user_id:                 session.user.id,
        name:                    dados.nomeCredor,
        cpf:                     dados.cpfCredor,
        data_nascimento:         dataNascISO,
        matricula_aerus:         dados.matriculaAerus         || null,
        matricula_funcional:     dados.matriculaFuncional     || null,
        sexo:                    dados.sexoCredor             || null,
        data_concessao:          toISODate(dados.dataConcessao),
        tipo_beneficio:          dados.tipoBeneficio          || null,
        tipo_renda:              dados.tipoRenda              || null,
        valor_cota:              dados.valorCota              || null,
        montante_concessao:      dados.montanteConcessao      || null,
        anuidade_concessao:      dados.anuidadeConcessao      || null,
        indenizacao_concessao:   dados.indenizacaoConcessao   || null,
        indice_correcao:         dados.indiceCorrecao         || null,
        indenizacao_atualizada:  dados.indenizacaoAtualizada  || null,
        nome_beneficiario:       dados.nomeBeneficiario       || null,
        cpf_beneficiario:        dados.cpfBeneficiario        || null,
        data_nasc_beneficiario:  toISODate(dados.dataNascBeneficiario),
        data_relatorio:          dados.dataRelatorio          || null,
        percentual_continuacao:  dados.percentualContinuacao  || null,
      })
      .select("id")
      .single();

    if (errCliente || !novoCliente) {
      console.error("[processos] erro ao criar cliente:", JSON.stringify(errCliente, null, 2));
      return NextResponse.json(
        {
          error: "Erro ao criar cliente",
          supabase_code:    errCliente?.code,
          supabase_message: errCliente?.message,
          supabase_details: errCliente?.details,
          supabase_hint:    errCliente?.hint,
        },
        { status: 500 }
      );
    }

    clienteId = novoCliente.id;
    console.log(`[processos] cliente criado: ${clienteId}`);
  }

  // ── PASSO 3: Salvar o processo ─────────────────────────────────────
  const { data: processo, error: errProcesso } = await admin
    .from("processos")
    .insert({
      user_id:        session.user.id,
      cliente_id:     clienteId,
      tipo:           dados.tipoBeneficio || "Revisão AERUS",
      status:         "pendente",
      data_relatorio: dados.dataRelatorio || null,
      dados_aerus:    dados,
    })
    .select("id")
    .single();

  if (errProcesso || !processo) {
    console.error("[processos] erro ao salvar processo:", JSON.stringify(errProcesso, null, 2));

    // Constraint unique_processo violada — banco rejeitou duplicata
    if (errProcesso?.code === "23505") {
      console.log(`[processos] processo duplicado detectado via constraint (23505)`);
      return NextResponse.json(
        {
          error: `Já existe um processo cadastrado para este cliente com o relatório de ${dados.dataRelatorio || "data desconhecida"}.`,
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: "Erro ao salvar processo",
        supabase_code:    errProcesso?.code,
        supabase_message: errProcesso?.message,
        supabase_details: errProcesso?.details,
        supabase_hint:    errProcesso?.hint,
      },
      { status: 500 }
    );
  }

  console.log(`[processos] processo salvo: ${processo.id}`);
  return NextResponse.json({ id: processo.id }, { status: 201 });
}
