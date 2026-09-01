import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getEffectivePermissions } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";

function htmlResponse(status: number, title: string, description: string) {
  return new Response(
    `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body><main><h1>${title}</h1><p>${description}</p></main></body></html>`,
    {
      status,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "private, no-store",
      },
    },
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ activityId: string }> },
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.redirect(
      new URL("/login?callbackUrl=/dashboard", request.url),
    );
  }

  const { activityId } = await params;
  const activity = await getPrisma().activity.findUnique({
    where: { id: activityId },
    select: { countryId: true, teamId: true },
  });
  if (!activity) {
    return htmlResponse(
      404,
      "Actividad no encontrada",
      "El recurso solicitado no existe.",
    );
  }

  const permissions = await getEffectivePermissions(currentUser.id, activity);
  if (!permissions.can("activity:read")) {
    return htmlResponse(
      403,
      "Acceso denegado",
      "No tienes permiso para consultar esta actividad.",
    );
  }

  return NextResponse.redirect(
    new URL(`/dashboard?activityId=${encodeURIComponent(activityId)}`, request.url),
  );
}
