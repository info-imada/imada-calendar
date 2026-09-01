import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      mustChangePassword: boolean;
      accessDecision: "ACTIVE" | "PENDING" | "DENIED";
    };
  }

  interface User {
    mustChangePassword?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    mustChangePassword?: boolean;
    accessDecision?: "ACTIVE" | "PENDING" | "DENIED";
  }
}
