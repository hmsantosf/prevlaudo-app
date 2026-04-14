import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function GET() {
  const transporter = nodemailer.createTransport({
    host: "smtp.locaweb.com.br",
    port: 587,
    secure: false,
    auth: {
      user: "noreply@prevaerus.com.br",
      pass: process.env.SMTP_PASSWORD,
    },
  });

  try {
    // Verifica se consegue conectar ao servidor SMTP
    await transporter.verify();

    const info = await transporter.sendMail({
      from: '"prevAERUS" <noreply@prevaerus.com.br>',
      to: "hmsantosf@gmail.com",
      subject: "Teste SMTP – prevAERUS",
      text: "Se você recebeu este e-mail, o envio via Locaweb está funcionando corretamente.",
      html: "<p>Se você recebeu este e-mail, o envio via Locaweb está funcionando corretamente.</p>",
    });

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      response: info.response,
      accepted: info.accepted,
      rejected: info.rejected,
    });
  } catch (err: unknown) {
    const e = err as Record<string, unknown>;
    return NextResponse.json(
      {
        success: false,
        error: {
          message: e.message ?? String(err),
          code: e.code,
          command: e.command,
          responseCode: e.responseCode,
          response: e.response,
        },
      },
      { status: 500 }
    );
  }
}
