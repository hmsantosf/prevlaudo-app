const BASE_URL =
  process.env.ASAAS_ENV === "production"
    ? "https://www.asaas.com/api/v3"
    : "https://sandbox.asaas.com/api/v3";

const API_KEY = process.env.ASAAS_API_KEY ?? "";

async function asaasFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        access_token: API_KEY,
        ...(options.headers ?? {}),
      },
    });

    const json = await res.json();

    if (!res.ok) {
      const msg =
        json?.errors?.[0]?.description ??
        json?.error ??
        `Asaas error ${res.status}`;
      console.error(`[asaas] ${options.method ?? "GET"} ${path} →`, JSON.stringify(json));
      return { data: null, error: msg };
    }

    return { data: json as T, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[asaas] fetch exception ${path}:`, msg);
    return { data: null, error: msg };
  }
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type AsaasCustomer = {
  id: string;
  name: string;
  email: string;
};

export type AsaasPayment = {
  id: string;
  status: string;
  billingType: string;
  value: number;
  dueDate: string;
  bankSlipUrl: string | null;
  invoiceUrl: string | null;
  nossoNumero: string | null;
};

export type AsaasPixQrCode = {
  encodedImage: string; // base64 PNG
  payload: string;      // copia-e-cola
  expirationDate: string;
};

export type AsaasCreditCard = {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
};

export type AsaasCreditCardHolderInfo = {
  name: string;
  email: string;
  cpfCnpj: string;
  postalCode: string;
  addressNumber: string;
  phone: string;
};

// ── Funções ───────────────────────────────────────────────────────────────────

/** Busca cliente por e-mail; retorna o primeiro encontrado ou null */
export async function buscarClientePorEmail(email: string) {
  const { data } = await asaasFetch<{ data: AsaasCustomer[] }>(
    `/customers?email=${encodeURIComponent(email)}&limit=1`
  );
  return data?.data?.[0] ?? null;
}

/** Cria cliente no Asaas */
export async function criarCliente(name: string, email: string, cpfCnpj: string) {
  return asaasFetch<AsaasCustomer>("/customers", {
    method: "POST",
    body: JSON.stringify({ name, email, cpfCnpj }),
  });
}

/** Garante que o cliente existe no Asaas; cria se necessário. Se já existir, atualiza o cpfCnpj. */
export async function garantirCliente(name: string, email: string, cpfCnpj: string) {
  const existente = await buscarClientePorEmail(email);
  if (existente) {
    await asaasFetch(`/customers/${existente.id}`, {
      method: "PATCH",
      body: JSON.stringify({ cpfCnpj }),
    });
    return { data: existente, error: null };
  }
  return criarCliente(name, email, cpfCnpj);
}

/** Due date: hoje + 3 dias em formato YYYY-MM-DD */
export function dueDateDaqui(dias = 3): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().split("T")[0];
}

/** Cria cobrança PIX ou Boleto */
export async function criarCobranca(params: {
  customerId: string;
  billingType: "PIX" | "BOLETO";
  value: number;
  externalReference: string;
  description: string;
}) {
  return asaasFetch<AsaasPayment>("/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: params.customerId,
      billingType: params.billingType,
      value: params.value,
      dueDate: dueDateDaqui(3),
      description: params.description,
      externalReference: params.externalReference,
    }),
  });
}

/** Cria cobrança com Cartão de Crédito */
export async function criarCobrancaCartao(params: {
  customerId: string;
  value: number;
  externalReference: string;
  description: string;
  creditCard: AsaasCreditCard;
  creditCardHolderInfo: AsaasCreditCardHolderInfo;
  remoteIp: string;
}) {
  return asaasFetch<AsaasPayment>("/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: params.customerId,
      billingType: "CREDIT_CARD",
      value: params.value,
      dueDate: dueDateDaqui(0),
      description: params.description,
      externalReference: params.externalReference,
      creditCard: params.creditCard,
      creditCardHolderInfo: params.creditCardHolderInfo,
      remoteIp: params.remoteIp,
    }),
  });
}

/** Busca QR Code PIX de um pagamento */
export async function buscarPixQrCode(paymentId: string) {
  return asaasFetch<AsaasPixQrCode>(`/payments/${paymentId}/pixQrCode`);
}
