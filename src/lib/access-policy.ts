import { AccessStatus } from "@prisma/client";

export type OAuthAccessDecision = "ACTIVE" | "PENDING" | "DENIED";

type ZohoIdentity = { email?: string | null };
type StoredOAuthUser = { accessStatus: AccessStatus; hasCredential: boolean } | null;

export function canSignInWithZoho(identity: ZohoIdentity, storedUser: StoredOAuthUser): boolean {
  if (!identity.email) return false;
  if (!storedUser) return true;

  return storedUser.accessStatus !== AccessStatus.SUSPENDED && !storedUser.hasCredential;
}

export function getOAuthAccessDecision(accessStatus: AccessStatus, hasRoleAssignment: boolean): OAuthAccessDecision {
  if (accessStatus === AccessStatus.SUSPENDED) return "DENIED";
  if (accessStatus === AccessStatus.PENDING || !hasRoleAssignment) return "PENDING";
  return "ACTIVE";
}
