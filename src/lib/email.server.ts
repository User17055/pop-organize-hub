type VerificationEmailResult = { developmentCode?: string };

export async function sendVerificationCode(
  email: string,
  code: string,
): Promise<VerificationEmailResult> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_EMAIL_API_TOKEN?.trim();
  const from = process.env.EMAIL_FROM?.trim();

  if (!accountId || !apiToken || !from) {
    if (process.env.NODE_ENV === "production") {
      throw Object.assign(new Error("O envio de e-mail ainda não foi configurado."), {
        statusCode: 503,
      });
    }
    console.info(`[Pop Organize] Código de acesso para ${email}: ${code}`);
    return { developmentCode: code };
  }

  const html = `
    <div style="font-family:Arial,sans-serif;color:#17212b;max-width:520px;margin:auto;padding:28px">
      <h1 style="font-size:22px;margin:0 0 14px">Confirme seu e-mail</h1>
      <p style="line-height:1.6">Use o código abaixo para entrar no Pop Organize:</p>
      <div style="font-size:34px;font-weight:800;letter-spacing:8px;color:#1687f8;padding:20px 0">${code}</div>
      <p style="color:#657383;font-size:13px">O código expira em 10 minutos e pode ser usado apenas uma vez.</p>
      <p style="color:#657383;font-size:13px">Se você não solicitou este acesso, ignore este e-mail.</p>
    </div>
  `;
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/email/sending/send`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: email,
        subject: `${code} é seu código do Pop Organize`,
        html,
        text: `Seu código do Pop Organize é ${code}. Ele expira em 10 minutos.`,
      }),
    },
  );

  const result = (await response.json().catch(() => null)) as
    | { success?: boolean; errors?: Array<{ message?: string }> }
    | null;
  if (!response.ok || result?.success !== true) {
    console.error("Verification email delivery failed", response.status, result?.errors ?? result);
    throw Object.assign(new Error("Não foi possível enviar o código por e-mail."), {
      statusCode: 502,
    });
  }

  return {};
}
