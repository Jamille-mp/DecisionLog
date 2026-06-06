type PasswordResetEmailInput = {
  email: string;
  name: string;
  token: string;
};

function getClientUrl() {
  return (
    process.env.CLIENT_URL ||
    process.env.OIDC_FRONTEND_REDIRECT_URL ||
    "http://localhost:5173"
  );
}

function getResetUrl(token: string) {
  const url = new URL(getClientUrl());
  url.searchParams.set("resetToken", token);
  return url.toString();
}

export function isPasswordResetEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

export async function sendPasswordResetEmail({
  email,
  name,
  token,
}: PasswordResetEmailInput) {
  if (!isPasswordResetEmailConfigured()) {
    return false;
  }

  const resetUrl = getResetUrl(token);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM,
      to: email,
      subject: "Recuperação de senha - DecisionLog",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5;color:#183354">
          <h2>Recuperação de senha</h2>
          <p>Olá, ${name}.</p>
          <p>Recebemos uma solicitação para redefinir sua senha no DecisionLog.</p>
          <p><a href="${resetUrl}" style="display:inline-block;background:#183354;color:#fff;padding:12px 16px;border-radius:8px;text-decoration:none">Redefinir senha</a></p>
          <p>Este link expira em 30 minutos. Se você não solicitou a recuperação, ignore este e-mail.</p>
        </div>
      `,
    }),
  });

  return response.ok;
}
