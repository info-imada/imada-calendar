import { z } from "zod";

const environmentSchema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_DATABASE_URL: z.string().url().optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(16),
  ZOHO_CLIENT_ID: z.string().min(1),
  ZOHO_CLIENT_SECRET: z.string().min(1),
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),
  RESEND_FROM_NAME: z.string().min(1).optional(),
  RESEND_REPLY_TO: z.string().email().optional(),
  NOTIFICATION_JOB_SECRET: z.string().min(32).optional(),
});

export function parseEnvironment(values: Record<string, string | undefined>) {
  return environmentSchema.parse(values);
}
