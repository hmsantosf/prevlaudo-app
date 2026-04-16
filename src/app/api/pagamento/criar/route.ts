import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { z } from "zod";
import {
  garantirCliente,
  criarCobranca,
  criarCobrancaCartao,
  buscarPixQrCode,
} from "@/lib/asaas";

const schema = z.object({
  quantidade: z.number().int().min(1).max(100),
  valorTotal: z.number().positive(),
  cupomId: z.string().uuid().nullable().optional(),
  metodoPagamento: z.enum(["PIX", "BOLETO", "CREDIT_CARD"]),
  cartao: z
    .object({
      numero: z.string().min(13).max(19),
      nome: z.string().min(3),
      validade: z.string().regex(/^\d{2}\/\d{2}$/, "Formato MM/AA"),
      cvv: z.string().min(3).max(4),
      cpf: z.string().min(11).max(14),
      cep: z.string().min(8).max(9),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { quantidade, valorTotal, metodoPagamento, cartao } = parsed.data;
  const userId = session.user.id;
  const userName = session.user.name ?? "Usuário";
  const userEmail = session.user.email!;

  if (metodoPagamento === "CREDIT_CARD" && !cartao) {
    return NextResponse.json({ error: "Dados do cartão são obrigatórios" }, { status: 400 });
  }

  console.log("[pagamento/criar] userId:", userId, "método:", metodoPagamento, "valor:", valorTotal);

  // ── Garantir cliente no Asaas ──────────────────────────────────
  const { data: cliente, error: errCliente } = await garantirCliente(userName, userEmail);
  if (!cliente) {
    console.error("[pagamento/criar] Erro ao criar cliente Asaas:", errCliente);
    return NextResponse.json({ error: `Erro ao registrar cliente: ${errCliente}` }, { status: 500 });
  }

  const externalReference = `${userId}|${quantidade}`;
  const description = `Compra de ${quantidade} crédito${quantidade !== 1 ? "s" : ""} – prevAERUS`;

  // ── Criar cobrança ─────────────────────────────────────────────
  if (metodoPagamento === "PIX" || metodoPagamento === "BOLETO") {
    const { data: pagamento, error: errPag } = await criarCobranca({
      customerId: cliente.id,
      billingType: metodoPagamento,
      value: valorTotal,
      externalReference,
      description,
    });

    if (!pagamento) {
      console.error("[pagamento/criar] Erro ao criar cobrança:", errPag);
      return NextResponse.json({ error: `Erro ao criar cobrança: ${errPag}` }, { status: 500 });
    }

    // Salvar o pagamento no Supabase para rastreamento
    await supabaseAdmin().from("pagamentos").insert({
      user_id: userId,
      asaas_payment_id: pagamento.id,
      quantidade,
      valor: valorTotal,
      metodo: metodoPagamento,
      status: pagamento.status,
    }).then(({ error }) => {
      if (error) console.error("[pagamento/criar] Erro ao salvar pagamento local:", error.message);
    });

    if (metodoPagamento === "PIX") {
      const { data: qr, error: errQr } = await buscarPixQrCode(pagamento.id);
      if (!qr) {
        console.error("[pagamento/criar] Erro ao buscar QR code:", errQr);
        return NextResponse.json({ error: `Erro ao gerar QR code: ${errQr}` }, { status: 500 });
      }
      return NextResponse.json({
        tipo: "PIX",
        paymentId: pagamento.id,
        qrCode: qr.encodedImage,
        copiaCola: qr.payload,
        expiracao: qr.expirationDate,
      });
    }

    // BOLETO
    return NextResponse.json({
      tipo: "BOLETO",
      paymentId: pagamento.id,
      boletoUrl: pagamento.bankSlipUrl,
      invoiceUrl: pagamento.invoiceUrl,
      nossoNumero: pagamento.nossoNumero,
    });
  }

  // ── Cartão de Crédito ──────────────────────────────────────────
  const [mes, ano] = cartao!.validade.split("/");
  const anoCompleto = ano.length === 2 ? `20${ano}` : ano;

  // IP do cliente para antifraude Asaas
  const remoteIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "127.0.0.1";

  const { data: pagamento, error: errPag } = await criarCobrancaCartao({
    customerId: cliente.id,
    value: valorTotal,
    externalReference,
    description,
    creditCard: {
      holderName: cartao!.nome,
      number: cartao!.numero.replace(/\s/g, ""),
      expiryMonth: mes,
      expiryYear: anoCompleto,
      ccv: cartao!.cvv,
    },
    creditCardHolderInfo: {
      name: cartao!.nome,
      email: userEmail,
      cpfCnpj: cartao!.cpf.replace(/\D/g, ""),
      postalCode: cartao!.cep.replace(/\D/g, ""),
      addressNumber: "S/N",
      phone: "00000000000",
    },
    remoteIp,
  });

  if (!pagamento) {
    console.error("[pagamento/criar] Erro cartão:", errPag);
    return NextResponse.json({ error: errPag ?? "Erro ao processar cartão" }, { status: 500 });
  }

  await supabaseAdmin().from("pagamentos").insert({
    user_id: userId,
    asaas_payment_id: pagamento.id,
    quantidade,
    valor: valorTotal,
    metodo: "CREDIT_CARD",
    status: pagamento.status,
  }).then(({ error }) => {
    if (error) console.error("[pagamento/criar] Erro ao salvar pagamento local:", error.message);
  });

  return NextResponse.json({
    tipo: "CREDIT_CARD",
    paymentId: pagamento.id,
    status: pagamento.status,
  });
}
