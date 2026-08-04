import nodemailer from "nodemailer";

type VerificationEmailResult = { developmentCode?: string };

type InvitationEmailInput = {
  email: string;
  employeeName: string;
  companyName: string;
  invitedByName: string;
  role: string;
  invitationUrl: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

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
      subject: "Confirme seu acesso ao Pop Organize",
      text: `Recebemos uma solicitação de acesso à sua conta no Pop Organize. Abra esta mensagem para consultar o código de confirmação.\n\nCódigo: ${code}\n\nEle expira em 10 minutos e pode ser usado apenas uma vez.`,
      html: `
        <div style="font-family:Arial,sans-serif;color:#17212b;max-width:520px;margin:auto;padding:28px">
          <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">
            Abra esta mensagem para confirmar seu acesso ao Pop Organize.
            &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
          </div>
          <h1 style="font-size:22px;margin:0 0 14px">Confirme seu e-mail</h1>
          <p style="line-height:1.6">Recebemos uma solicitação de acesso. Use o código abaixo para entrar no Pop Organize:</p>
          <div style="font-size:34px;font-weight:800;letter-spacing:8px;color:#4f46e5;padding:20px 0">${code}</div>
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

export async function sendEmployeeInvitation({
  email,
  employeeName,
  companyName,
  invitedByName,
  role,
  invitationUrl,
}: InvitationEmailInput): Promise<{ delivered: boolean }> {
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
    console.info(`[Pop Organize] Convite para ${email}: ${invitationUrl}`);
    return { delivered: false };
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

  const safeName = escapeHtml(employeeName);
  const safeCompany = escapeHtml(companyName);
  const safeInviter = escapeHtml(invitedByName);
  const safeRole = escapeHtml(role);
  const safeUrl = escapeHtml(invitationUrl);

  try {
    await transporter.sendMail({
      from: `Pop Organize <${from}>`,
      to: email,
      subject: `Convite para entrar na equipe ${companyName}`,
      text: `${invitedByName} convidou você para fazer parte da equipe ${companyName} no Pop Organize como ${role}.\n\nAceite o convite e ative sua conta: ${invitationUrl}\n\nEste convite expira em 7 dias. Se você não esperava este convite, ignore esta mensagem.`,
      html: `
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">
          Você recebeu um convite para fazer parte de uma equipe no Pop Organize.
          &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
        </div>
        <div style="background:#f4f7fb;padding:32px 16px;font-family:Arial,sans-serif;color:#17212b">
          <div style="max-width:560px;margin:auto;background:#fff;border-radius:24px;padding:32px;box-shadow:0 18px 45px rgba(18,35,51,.10)">
            <div style="font-size:20px;font-weight:800;margin-bottom:24px;color:#122333">Pop <span style="color:#4f46e5">Organize</span></div>
            <h1 style="font-size:24px;line-height:1.25;margin:0 0 14px">Olá, ${safeName}!</h1>
            <p style="font-size:15px;line-height:1.65;margin:0 0 12px;color:#3c4747">
              <strong>${safeInviter}</strong> convidou você para fazer parte da equipe <strong>${safeCompany}</strong>.
            </p>
            <p style="font-size:14px;line-height:1.6;margin:0 0 24px;color:#657383">Cargo: ${safeRole}</p>
            <a href="${safeUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:15px 22px;border-radius:14px">
              Aceitar convite
            </a>
            <p style="font-size:12px;line-height:1.55;margin:24px 0 0;color:#8fa0a1">
              Este convite expira em 7 dias. Se o botão não funcionar, copie este endereço:<br />
              <a href="${safeUrl}" style="color:#4f46e5;word-break:break-all">${safeUrl}</a>
            </p>
          </div>
        </div>
      `,
    });
  } catch (error) {
    console.error("Invitation email delivery failed", error);
    throw Object.assign(new Error("Não foi possível enviar o convite por e-mail."), {
      statusCode: 502,
    });
  } finally {
    transporter.close();
  }

  return { delivered: true };
}
