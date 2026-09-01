import "server-only";

import { AccessStatus } from "@prisma/client";
import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import ZohoProvider from "next-auth/providers/zoho";

import { assertLoginAllowed, recordLoginAttempt } from "@/lib/login-attempts";
import { getPrisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { credentialsInputSchema } from "@/lib/validations/authentication";
import { canSignInWithZoho, getOAuthAccessDecision } from "@/lib/access-policy";
import { createAuthAdapter } from "@/lib/auth-adapter";
import { dispatchNotificationIds } from "@/lib/notifications/dispatcher";
import { provisionZohoUser } from "@/lib/zoho-provisioning";

async function findAuthorizedUser(email: string) {
  return getPrisma().user.findUnique({
    where: { email },
    include: { credential: true, roleAssignments: { select: { id: true } } },
  });
}

function hasActiveAccess(user: Awaited<ReturnType<typeof findAuthorizedUser>>): boolean {
  return Boolean(user && user.accessStatus === AccessStatus.ACTIVE && user.roleAssignments.length > 0);
}

function canEstablishCredentialsSession(
  user: Awaited<ReturnType<typeof findAuthorizedUser>>,
): boolean {
  if (!user) return false;
  if (user.accessStatus === AccessStatus.PENDING) return true;
  return hasActiveAccess(user);
}

export function createAuthOptions(): NextAuthOptions {
  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  const secret = process.env.NEXTAUTH_SECRET;

  return {
    adapter: process.env.DATABASE_URL ? createAuthAdapter() : undefined,
    secret: secret ?? "local-development-secret-not-for-production",
    session: { strategy: "jwt" },
    pages: { signIn: "/login" },
    providers: [
      ...(clientId && clientSecret ? [ZohoProvider({ clientId, clientSecret, allowDangerousEmailAccountLinking: true })] : []),
      CredentialsProvider({
        name: "Credenciales",
        credentials: {
          email: { label: "Correo electrónico", type: "email" },
          password: { label: "Contraseña", type: "password" },
        },
        async authorize(credentials) {
          const parsedCredentials = credentialsInputSchema.safeParse(credentials);
          if (!parsedCredentials.success) return null;

          const { email, password } = parsedCredentials.data;
          const lockout = await assertLoginAllowed(email);
          if (lockout.locked) return null;

          const user = await findAuthorizedUser(email);
          const validPassword = Boolean(user?.credential && await verifyPassword(user.credential.passwordHash, password));

          if (
            !validPassword ||
            !canEstablishCredentialsSession(user) ||
            !user?.credential
          ) {
            await recordLoginAttempt(email, false);
            return null;
          }

          await recordLoginAttempt(email, true);
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            mustChangePassword: user.credential.mustChangePassword,
          };
        },
      }),
    ],
    callbacks: {
      async signIn({ user, account }) {
        if (account?.provider === "credentials") return true;

        const databaseUser = user.email ? await findAuthorizedUser(user.email) : null;
        return canSignInWithZoho(
          { email: user.email },
          databaseUser
            ? { accessStatus: databaseUser.accessStatus, hasCredential: Boolean(databaseUser.credential) }
            : null,
        );
      },
      async jwt({ token, user, account }) {
        if (user) token.sub = user.id;

        if (account?.provider === "zoho" && user?.id && user.email) {
          try {
            const provisioned = await provisionZohoUser({
              userId: user.id,
              email: user.email,
              name: user.name,
            });
            if (provisioned?.notificationIds.length) {
              try {
                await dispatchNotificationIds(provisioned.notificationIds);
              } catch (error) {
                console.error("Zoho welcome notification failed", error);
              }
            }
          } catch (error) {
            console.error("Zoho provisioning failed", error);
          }
        }

        const email = user?.email ?? token.email;
        const databaseUser = email ? await findAuthorizedUser(email) : null;
        token.mustChangePassword = databaseUser?.credential?.mustChangePassword ?? false;
        token.accessDecision = databaseUser
          ? getOAuthAccessDecision(databaseUser.accessStatus, databaseUser.roleAssignments.length > 0)
          : "DENIED";
        return token;
      },
      async session({ session, token }) {
        if (session.user) {
          session.user.id = token.sub ?? "";
          session.user.mustChangePassword = Boolean(token.mustChangePassword);
          session.user.accessDecision = token.accessDecision ?? "DENIED";
        }
        return session;
      },
    },
  };
}

export async function getCurrentUser() {
  const session = await getServerSession(createAuthOptions());
  if (!session?.user?.email) return null;

  const user = await findAuthorizedUser(session.user.email);
  return hasActiveAccess(user) ? user : null;
}

export async function getAuthenticationState() {
  const session = await getServerSession(createAuthOptions());
  if (!session?.user?.email) return null;

  return {
    accessDecision: session.user.accessDecision,
    email: session.user.email,
    mustChangePassword: session.user.mustChangePassword,
  };
}
