import "server-only";

import { sanitizeHeader } from "@/lib/email/escape-html";

export type EmailConfig = {
  apiKey: string;
  appUrl: string;
  from: string;
  replyTo?: string;
};

export function getEmailConfig(): EmailConfig {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  const appUrl = process.env.NEXTAUTH_URL?.trim();
  if (!apiKey || !fromEmail || !appUrl) throw new Error("EMAIL_NOT_CONFIGURED");

  const fromName = sanitizeHeader(
    process.env.RESEND_FROM_NAME?.trim() || "Calendar",
  );
  const replyTo = process.env.RESEND_REPLY_TO?.trim();

  return {
    apiKey,
    appUrl: new URL(appUrl).origin,
    from: `${fromName} <${sanitizeHeader(fromEmail)}>`,
    ...(replyTo ? { replyTo: sanitizeHeader(replyTo) } : {}),
  };
}
