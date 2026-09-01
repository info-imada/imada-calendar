import { z } from "zod";

export const passwordAccountInputSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(2).max(120),
  temporaryPassword: z.string().min(12).max(128),
});

export const credentialsInputSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128),
});

export const passwordChangeInputSchema = z.object({
  password: z.string().min(12).max(128),
  confirmPassword: z.string().min(12).max(128),
}).refine((value) => value.password === value.confirmPassword, {
  path: ["confirmPassword"],
});
