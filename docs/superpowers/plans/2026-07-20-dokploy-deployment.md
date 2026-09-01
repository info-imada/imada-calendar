# Dokploy Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Empaquetar Calendar como una Dokploy Application reproducible que usa Neon externo, aplica migraciones al arrancar y expone un healthcheck seguro.

**Architecture:** Un Dockerfile multi-stage basado en Node 22 instala dependencias deterministas con pnpm, construye Next.js y genera una imagen final no-root con Prisma CLI y migraciones. El contenedor ejecuta `prisma migrate deploy` antes de `next start`; Dokploy y Docker verifican `/api/health`, que consulta Neon sin exponer detalles de error.

**Tech Stack:** Next.js 16 App Router, TypeScript 5.9, Node.js 22, pnpm 11.9.0, Prisma 7.8, PostgreSQL/Neon, Docker, Dokploy, Vitest.

## Global Constraints

- Trabajar directamente en `master`; no crear worktrees.
- Mantener PostgreSQL/Neon fuera de Dokploy.
- Usar una Dokploy Application con Build Type `Dockerfile`, contexto `.` y puerto interno `3000`.
- No copiar `.env` ni pasar secretos como Docker build args.
- Ejecutar migraciones con `prisma migrate deploy`; nunca `db push` ni seed automático.
- Ejecutar el servidor final como usuario no-root.
- No restaurar `e2e/` ni `scripts/`.
- Conservar toda la lógica de autenticación, permisos, Prisma y UI existente.

---

### Task 1: Dependencias de runtime deterministas

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: scripts existentes `postinstall`, `prebuild`, `build`, `start` y `db:migrate`.
- Produces: `packageManager: "pnpm@11.9.0"` y Prisma CLI/dotenv disponibles en el stage de producción.

- [x] **Step 1: Actualizar el contrato de paquete**

Agregar junto a `private`:

```json
"packageManager": "pnpm@11.9.0"
```

Mover sin cambiar versión:

```json
"dotenv": "^17.4.2",
"prisma": "7.8.0"
```

desde `devDependencies` a `dependencies`. Prisma debe existir en producción porque el contenedor ejecuta `prisma migrate deploy`; `prisma.config.ts` importa `dotenv/config`.

- [x] **Step 2: Sincronizar lockfile sin actualizar versiones ajenas**

Run: `pnpm install --lockfile-only`

Expected: exit 0 y `pnpm-lock.yaml` registra `dotenv` y `prisma` como dependencias de producción del importer raíz.

- [x] **Step 3: Verificar resolución exacta**

Run: `pnpm install --frozen-lockfile`

Expected: exit 0, `postinstall` ejecuta `prisma generate` y Prisma Client 7.8 se genera correctamente.

- [x] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "build: prepare runtime dependencies for Dokploy"
```

### Task 2: Healthcheck seguro con Neon real

**Files:**
- Create: `src/app/api/health/route.ts`
- Create: `src/app/api/health/route.test.ts`

**Interfaces:**
- Consumes: `getPrisma(): PrismaClient` de `src/lib/prisma.ts`.
- Produces: `GET(): Promise<Response>` público con status 200/503 y payload sanitizado.

- [x] **Step 1: Escribir pruebas que fallen**

Crear `src/app/api/health/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getPrisma } from "@/lib/prisma";

import { GET } from "./route";

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(),
}));

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 when Neon is reachable", async () => {
    const queryRaw = vi.fn().mockResolvedValue([{ reachable: 1 }]);
    vi.mocked(getPrisma).mockReturnValue({ $queryRaw: queryRaw } as never);

    const response = await GET();

    expect(queryRaw).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("returns a sanitized 503 when Neon is unavailable", async () => {
    const queryRaw = vi
      .fn()
      .mockRejectedValue(new Error("postgresql://user:secret@internal-host/database"));
    vi.mocked(getPrisma).mockReturnValue({ $queryRaw: queryRaw } as never);

    const response = await GET();
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(JSON.parse(body)).toEqual({ status: "unavailable" });
    expect(body).not.toContain("secret");
    expect(body).not.toContain("internal-host");
  });
});
```

- [x] **Step 2: Ejecutar la prueba y confirmar el fallo**

Run: `pnpm exec vitest run src/app/api/health/route.test.ts`

Expected: FAIL porque `src/app/api/health/route.ts` todavía no existe.

- [x] **Step 3: Implementar el Route Handler mínimo**

Crear `src/app/api/health/route.ts`:

```ts
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
```

- [x] **Step 4: Ejecutar la prueba y confirmar éxito**

Run: `pnpm exec vitest run src/app/api/health/route.test.ts`

Expected: 2 tests passed.

- [x] **Step 5: Commit**

```bash
git add src/app/api/health/route.ts src/app/api/health/route.test.ts
git commit -m "feat: add production health endpoint"
```

### Task 3: Imagen Docker multi-stage

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`

**Interfaces:**
- Consumes: `packageManager`, scripts de package, `.next`, `public/`, `prisma/schema.prisma`, `prisma/migrations/`, `prisma.config.ts`, `GET /api/health`.
- Produces: imagen Linux no-root que escucha en `0.0.0.0:3000`, migra Neon y expone Docker HEALTHCHECK.

- [x] **Step 1: Crear `.dockerignore`**

```dockerignore
.git
.gitignore
.next
node_modules
.pnpm-store
.env
.env.*
!.env.example
coverage
artifacts
test-results
playwright-report
*.log
*.tmp
.vscode
.idea
.ai
docs
AGENTS.md
```

- [x] **Step 2: Crear el Dockerfile multi-stage**

```dockerfile
# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NEXT_TELEMETRY_DISABLED="1"
WORKDIR /app

RUN apt-get update \
  && apt-get install --yes --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/* \
  && npm install --global pnpm@11.9.0 \
  && npm cache clean --force

FROM base AS dependencies
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN pnpm install --frozen-lockfile

FROM dependencies AS builder
COPY . .
RUN pnpm build

FROM base AS production-dependencies
ENV NODE_ENV="production"
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN pnpm install --prod --frozen-lockfile

FROM base AS runner
ENV NODE_ENV="production"
ENV HOSTNAME="0.0.0.0"
ENV PORT="3000"

COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/public ./public
COPY --chown=node:node package.json pnpm-lock.yaml prisma.config.ts ./
COPY --chown=node:node prisma ./prisma

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then((response) => { if (!response.ok) process.exit(1) }).catch(() => process.exit(1))"]

CMD ["sh", "-c", "pnpm exec prisma migrate deploy && exec pnpm exec next start --hostname 0.0.0.0 --port 3000"]
```

- [x] **Step 3: Validar estructura y ausencia de secretos**

Run: `rg -n "FROM|USER node|EXPOSE 3000|HEALTHCHECK|prisma migrate deploy|next start" Dockerfile`

Expected: aparecen los cinco stages, el usuario no-root, puerto, healthcheck, migración y servidor.

Run: `rg -n "\.env|node_modules|\.next|\.git" .dockerignore`

Expected: todos los artefactos sensibles o regenerables están excluidos.

- [x] **Step 4: Intentar build Docker cuando exista CLI**

Run: `docker build --tag calendar:dokploy .`

Expected si Docker está disponible: exit 0 y una imagen con healthcheck. Si el CLI no existe, registrar la limitación y usar `pnpm build` como verificación local; no afirmar que la imagen fue construida.

- [x] **Step 5: Commit**

```bash
git add Dockerfile .dockerignore
git commit -m "build: add Dokploy production image"
```

### Task 4: Guía operativa de Dokploy y contexto permanente

**Files:**
- Create: `docs/deployment/dokploy.md`
- Modify: `.ai/ARCHITECTURE.md`
- Modify: `.ai/DEVELOPMENT_GUIDE.md`
- Modify: `.ai/CHANGELOG_CONTEXT.md`
- Modify: `.env.example`

**Interfaces:**
- Consumes: contrato del Dockerfile, variables actuales y callback NextAuth `/api/auth/callback/zoho`.
- Produces: instrucciones completas de build, entorno, dominio, migración, healthcheck, rollback y troubleshooting.

- [x] **Step 1: Ampliar `.env.example` sin valores**

Mantener las variables privadas vacías y añadir comentarios que distingan URL pooled/directa, URL pública HTTPS y uso exclusivo del seed. No incluir credenciales reales.

- [x] **Step 2: Crear `docs/deployment/dokploy.md`**

Documentar exactamente:

```text
Provider: GitHub
Branch: master
Build Path: /
Build Type: Dockerfile
Dockerfile Path: Dockerfile
Docker Context Path: .
Docker Build Stage: vacío
Container Port: 3000
Health Path: /api/health
```

Incluir:

- preparación de Neon (`DATABASE_URL` pooled y `DIRECT_DATABASE_URL` directa);
- generación segura de `NEXTAUTH_SECRET`;
- `NEXTAUTH_URL=https://<dominio>`;
- configuración opcional Zoho con callback `https://<dominio>/api/auth/callback/zoho`;
- dominio/HTTPS en Dokploy;
- primer deploy, lectura de logs de `prisma migrate deploy`, healthcheck y rollback;
- seed manual únicamente cuando el administrador decida cargar catálogos;
- troubleshooting para conexión Neon, callback OAuth, variables y healthcheck.

- [x] **Step 3: Actualizar documentación de agentes**

Agregar a `.ai/ARCHITECTURE.md` el contenedor y Neon externo; a `.ai/DEVELOPMENT_GUIDE.md`, comandos Docker y guía Dokploy; a `.ai/CHANGELOG_CONTEXT.md`, la decisión de despliegue del 2026-07-20.

- [x] **Step 4: Verificar documentación y secretos**

Run: `rg -n "Dockerfile|Dokploy|Neon|3000|api/health|NEXTAUTH_URL|callback/zoho" docs/deployment/dokploy.md .ai/ARCHITECTURE.md .ai/DEVELOPMENT_GUIDE.md .ai/CHANGELOG_CONTEXT.md .env.example`

Expected: configuración completa y referencias cruzadas presentes.

Run: `rg -n "postgres(ql)?://[^<]|NEXTAUTH_SECRET=.+|ZOHO_CLIENT_SECRET=.+" docs/deployment/dokploy.md .env.example Dockerfile`

Expected: ninguna credencial o URL real.

- [x] **Step 5: Commit**

```bash
git add docs/deployment/dokploy.md .ai/ARCHITECTURE.md .ai/DEVELOPMENT_GUIDE.md .ai/CHANGELOG_CONTEXT.md .env.example
git commit -m "docs: add Dokploy production runbook"
```

### Task 5: Verificación transversal y cierre

**Files:**
- Verify: todos los archivos modificados en Tasks 1–4.

**Interfaces:**
- Consumes: paquete, endpoint, Dockerfile y runbook terminados.
- Produces: evidencia actual de que el proyecto compila y el cambio está listo para el build Linux de Dokploy.

- [x] **Step 1: Ejecutar prueba focal**

Run: `pnpm exec vitest run src/app/api/health/route.test.ts`

Expected: 2 tests passed.

- [x] **Step 2: Ejecutar suite completa**

Run: `pnpm test`

Expected: exit 0, incluyendo las dos pruebas nuevas.

- [x] **Step 3: Ejecutar lint**

Run: `pnpm lint`

Expected: 0 errores. La advertencia preexistente `react-hooks/incompatible-library` de TanStack Table puede permanecer y debe reportarse.

- [x] **Step 4: Ejecutar build Next.js**

Run: `pnpm build`

Expected: Prisma Client generado, TypeScript y build Next.js con exit 0; `/api/health` aparece en la tabla de rutas.

- [x] **Step 5: Auditar diff y repositorio**

Run: `git diff --check`

Expected: exit 0.

Run: `git status --short`

Expected: solo archivos del alcance si queda algún cambio sin commit.

- [x] **Step 6: Actualizar el plan y commit final si es necesario**

Marcar los pasos ejecutados con `[x]`, registrar únicamente limitaciones reales y versionar el plan:

```bash
git add docs/superpowers/plans/2026-07-20-dokploy-deployment.md
git commit -m "docs: add Dokploy deployment implementation plan"
```

## Registro de ejecución

- El ciclo TDD de `/api/health` se verificó en rojo y verde.
- La prueba HTTP sobre un build de producción detectó que el proxy de autenticación interceptaba `/api/health`; se añadió una regresión a `src/proxy.test.ts` y se excluyó únicamente ese endpoint público del matcher.
- La verificación HTTP final devolvió `200`, `application/json`, `Cache-Control: no-store` y `{ "status": "ok" }` usando la conexión Neon configurada localmente.
- `pnpm test` en paralelo agotó el timeout de 5 segundos de dos a cuatro pruebas UI preexistentes según la corrida. Los cuatro archivos fallidos aprobaron 17/17 aisladamente y la suite completa aprobó con `pnpm exec vitest run --maxWorkers=1`: 140 tests aprobados y 1 omitido.
- `pnpm lint` terminó con 0 errores y la advertencia preexistente de TanStack Table/React Compiler.
- `pnpm build` terminó con exit code 0 y publicó `/api/health` como Route Handler dinámico.
- `docker build` no se ejecutó porque Docker CLI no está instalado en este equipo; el primer build Linux real debe confirmarse en Dokploy.

### 2026-07-21 — Corrección del contrato de instalación pnpm

- El primer build Linux real en Dokploy falló con `ERR_PNPM_IGNORED_BUILDS`: los stages `dependencies` y `production-dependencies` copiaban `package.json` y `pnpm-lock.yaml`, pero no `pnpm-workspace.yaml`, por lo que ambos installs carecían de la política versionada `allowBuilds`.
- La corrección en `453d2c6` hizo que los dos stages copien `package.json`, `pnpm-lock.yaml` y `pnpm-workspace.yaml` antes de sus respectivos `pnpm install`. Se mantuvo la aprobación explícita de los paquetes requeridos y no se habilitó `dangerouslyAllowAllBuilds`.
- Una construcción local fresca ejecutada después de la corrección con `docker build --no-cache --tag calendar:dokploy .` terminó con exit code 0.
- El redespliegue corregido en Dokploy no se realizó y permanece sin verificar; el build local no sustituye esa validación operativa.

### 2026-07-21 — Corrección final del runtime y verificación en producción

- Después del registro anterior, `b866558` incorporó `pnpm-workspace.yaml` al stage final `runner`, pero el contenedor continuó reiniciándose con `EACCES` sobre `/app/_tmp_...` y un intento inesperado de `pnpm install --production`.
- La ejecución directa de los binarios incluidos en la imagen confirmó Prisma 7.8.0 y Next.js 16.2.10 disponibles como el usuario no-root `node`. El fallo provenía de `pnpm exec`, que realizaba una comprobación de dependencias antes de delegar el comando.
- `348bda5` cambió el `CMD` para usar `./node_modules/.bin/prisma migrate deploy` y `./node_modules/.bin/next start`. No se cambiaron el usuario, los permisos de `/app`, las dependencias ni la configuración de Dokploy.
- El Remote Server siguió administrándose por la red privada y el DNS público permaneció dirigido al punto de entrada público. El `502 Bad Gateway` observado provenía del backend en reinicio, no de la resolución DNS.
- Dokploy marcó el deployment de `348bda5` como completado y `calendar.combiliftsales.com` renderizó la pantalla de login por HTTPS. No se verificaron en esta operación todos los flujos de autenticación local u OAuth.
