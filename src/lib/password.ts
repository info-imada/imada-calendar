import bcrypt from "bcryptjs";
import { z } from "zod";

const passwordSchema = z.string().min(12).max(128);

export function validatePassword(password: string) {
  return passwordSchema.safeParse(password);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(passwordHash: string, password: string) {
  return bcrypt.compare(password, passwordHash);
}
