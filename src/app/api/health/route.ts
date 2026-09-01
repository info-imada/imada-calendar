import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "no-store",
};

export async function GET(): Promise<Response> {
  try {
    await getPrisma().$queryRaw`SELECT 1 AS reachable`;

    return Response.json(
      { status: "ok" },
      { status: 200, headers: noStoreHeaders },
    );
  } catch {
    return Response.json(
      { status: "unavailable" },
      { status: 503, headers: noStoreHeaders },
    );
  }
}
