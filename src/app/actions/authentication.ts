"use server";

import { appendAuditLog } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { getPrisma } from "@/lib/prisma";
import { passwordChangeInputSchema } from "@/lib/validations/authentication";

export async function changePassword(input: {
  password: string;
  confirmPassword: string;
}) {
  const user = await getCurrentUser();
  const parsedInput = passwordChangeInputSchema.safeParse(input);

  if (!user || !parsedInput.success || !user.credential)
    return { success: false };

  await getPrisma().userCredential.update({
    where: { userId: user.id },
    data: {
      passwordHash: await hashPassword(parsedInput.data.password),
      mustChangePassword: false,
      changedAt: new Date(),
    },
  });
  await appendAuditLog({
    actorId: user.id,
    entityType: "UserCredential",
    entityId: user.id,
    action: "CHANGE_PASSWORD",
  });
  return { success: true };
}
