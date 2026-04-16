import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function enviarEmail(to: string, subject: string, html: string) {
  try {
    await resend.emails.send({
      from: "prevAERUS <noreply@prevaerus.com.br>",
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error("[email] Erro ao enviar:", err);
    // Não propaga — falha de e-mail não deve quebrar o fluxo principal
  }
}

export function emailConfirmacaoCreditos(params: {
  nome: string;
  quantidade: number;
  valor: number;
}) {
  const fmtValor = params.valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #1d4ed8;">Créditos adicionados com sucesso!</h2>
      <p>Olá, <strong>${params.nome}</strong>!</p>
      <p>
        Seu pagamento foi confirmado e
        <strong>${params.quantidade} crédito${params.quantidade !== 1 ? "s" : ""}</strong>
        foram adicionados à sua conta.
      </p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:24px 0;">
        <p style="margin:0;font-size:14px;color:#166534;">
          <strong>Valor pago:</strong> ${fmtValor}<br/>
          <strong>Créditos adicionados:</strong> ${params.quantidade}
        </p>
      </div>
      <p style="color:#6b7280;font-size:13px;">
        Acesse <a href="https://prevaerus.com.br/dashboard">prevaerus.com.br</a> para usar seus créditos.
      </p>
    </div>
  `;
}
