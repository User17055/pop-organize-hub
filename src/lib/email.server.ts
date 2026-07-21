import nodemailer from "nodemailer";

type VerificationEmailResult = { developmentCode?: string };

export async function sendVerificationCode(
  email: string,
  code: string,
): Promise<VerificationEmailResult> {
  const host = process.env.SMTP_HOST?.trim() || "email-ssl.com.br";
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = (process.env.SMTP_SECURE || "true").toLowerCase() !== "false";
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD;
  const from = process.env.EMAIL_FROM?.trim() || user;

  if (!user || !password || !from) {
    if (process.env.NODE_ENV === "production") {
      throw Object.assign(new Error("O envio de e-mail ainda não foi configurado."), {
        statusCode: 503,
      });
    }
    console.info(`[Pop Organize] Código de acesso para ${email}: ${code}`);
    return { developmentCode: code };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass: password },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
  });

  try {
    await transporter.sendMail({
      from: `Pop Organize <${from}>`,
      to: email,
      subject: `${code} é seu código do Pop Organize`,
      text: `Seu código do Pop Organize é ${code}. Ele expira em 10 minutos.`,
      html: `
        <div style="font-family:Arial,sans-serif;color:#17212b;max-width:520px;margin:auto;padding:28px">
          <h1 style="font-size:22px;margin:0 0 14px">Confirme seu e-mail</h1>
          <p style="line-height:1.6">Use o código abaixo para entrar no Pop Organize:</p>
          <div style="font-size:34px;font-weight:800;letter-spacing:8px;color:#1687f8;padding:20px 0">${code}</div>
          <p style="color:#657383;font-size:13px">O código expira em 10 minutos e pode ser usado apenas uma vez.</p>
          <p style="color:#657383;font-size:13px">Se você não solicitou este acesso, ignore este e-mail.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Verification email delivery failed", error);
    throw Object.assign(new Error("Não foi possível enviar o código por e-mail."), {
      statusCode: 502,
    });
  } finally {
    transporter.close();
  }

  return {};
}
