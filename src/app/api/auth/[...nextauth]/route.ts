import NextAuth from "next-auth";

import { createAuthOptions } from "@/lib/auth";

export const runtime = "nodejs";

const handler = NextAuth(createAuthOptions());

export { handler as GET, handler as POST };
