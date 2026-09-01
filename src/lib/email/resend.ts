import "server-only";

import { Resend } from "resend";

import { getEmailConfig } from "@/lib/email/config";
import { sanitizeHeader } from "@/lib/email/escape-html";

export type SendEmailInput = {
  to: string[];
  cc?: string[];
  subject: string;
  html?: string;
  text: string;
  replyTo?: string;
  attachments?: { filename: string; content: Buffer | string; contentType?: string }[];
};

export type SendEmailResult =
  | { success: true; id: string }
  | { success: false; error: string };

let resendClient: Resend | null = null;
let resendClientKey: string | null = null;

function getResendClient(apiKey: string) {
  if (!resendClient || resendClientKey !== apiKey) {
    resendClient = new Resend(apiKey);
    resendClientKey = apiKey;
  }
  return resendClient;
}

export function resetResendClientForTests() {
  resendClient = null;
  resendClientKey = null;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  try {
    const config = getEmailConfig();
    const subject = sanitizeHeader(input.subject);
    const replyTo = input.replyTo
      ? sanitizeHeader(input.replyTo)
      : config.replyTo;
    const { data, error } = await getResendClient(config.apiKey).emails.send({
      from: config.from,
      to: input.to,
      cc: input.cc?.length ? input.cc : undefined,
      subject,
      html: input.html,
      text: input.text,
      replyTo,
      attachments: input.attachments?.map((attachment) => ({
        filename: sanitizeHeader(attachment.filename),
        content: attachment.content,
        contentType: attachment.contentType,
      })),
    });
    if (error) return { success: false, error: error.message };
    return { success: true, id: data?.id ?? "" };
  } catch (error) {
    const message =
      error instanceof Error && error.message === "EMAIL_NOT_CONFIGURED"
        ? "EMAIL_NOT_CONFIGURED"
        : "EMAIL_DELIVERY_FAILED";
    return { success: false, error: message };
  }
}
