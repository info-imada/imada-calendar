# Arquitectura

## Stack tecnológico confirmado

| Área | Tecnología |
|---|---|
| Framework | Next.js `16.2.10`, App Router y Turbopack |
| UI | React `19.2.3`, TypeScript `5.9.3` estricto |
| Estilos | Tailwind CSS 4, `tw-animate-css`, variables CSS |
| Componentes | ShadCN UI sobre Radix UI y Base UI; Lucide React |
| Formularios/validación | Estado React y Zod 4 |
| Calendario | React Big Calendar |
| Tablas | TanStack React Table donde aplica |
| Autenticación | NextAuth 4, Zoho OAuth y Credentials Provider |
| Persistencia | Prisma 7, PostgreSQL y `@prisma/adapter-pg` |
| Base alojada | PostgreSQL administrado por Dokploy según `docs/database/dokploy-postgres.md` |
| Feedback | Sonner, Alert, Skeleton y estados compartidos |
| Pruebas | Vitest, Testing Library y jsdom |

El gestor canónico es **pnpm**, porque `pnpm-lock.yaml` es el único lockfile versionado.

## Estructura de carpetas

```text
.
├── .ai/                    Contexto operativo para agentes
├── docs/                   Especificaciones, planes e historial técnico
├── prisma/
│   ├── migrations/         Migraciones SQL inmutables
│   ├── schema.prisma       Modelo persistente
│   ├── seed-data.ts        Catálogos y matriz seed
│   └── seed.ts             Seed idempotente
├── public/                 Activos estáticos, incluido logo Zoho
└── src/
    ├── app/                Rutas, layouts, Route Handlers y Server Actions
    ├── components/
    │   ├── ui/             Primitivas ShadCN/Base UI
    │   ├── product/        Patrones compartidos de producto
    │   ├── layout/         AppShell y navegación
    │   └── providers/      Tema y providers globales
    ├── features/           Módulos de interfaz por dominio
    ├── hooks/              Hooks reutilizables
    ├── lib/                Dominio, autenticación, autorización y datos
    ├── messages/           Copy centralizado
    ├── test/               Setup de Vitest
    └── types/              Extensiones de tipos externos
```

## Límites de ejecución

### Server Components

Las páginas de `src/app/` y componentes como `AgendaPage` son Server Components por defecto. Deben:

- leer la sesión y datos en servidor;
- construir modelos serializables;
- redirigir o renderizar estados de acceso antes de entregar UI interactiva;
- evitar exponer consultas Prisma al navegador.

### Client Components

Los archivos con `"use client"` viven principalmente en `src/features/` y componentes interactivos. Se ocupan de:

- estado de filtros, paneles, formularios y confirmaciones;
- interacción con React Big Calendar;
- invocar Server Actions;
- mostrar feedback con Sonner y Alert;
- representar capacidades ya calculadas por el servidor.

No deben convertirse en autoridad de autorización.

### Server Actions

`src/app/actions/` concentra mutaciones de autenticación, actividades, catálogo, usuarios, roles y permisos. El patrón esperado es:

1. validar entrada con Zod;
2. obtener actor persistido;
3. cargar recurso y scope;
4. resolver permisos efectivos;
5. ejecutar mutaciones relacionadas dentro de `$transaction`;
6. escribir `AuditLog` cuando corresponde;
7. devolver un resultado tipado y revalidar rutas afectadas.

### Route Handlers

Las rutas HTTP explícitas son limitadas:

- `/api/auth/[...nextauth]`: handlers GET/POST de NextAuth.
- `/activities/[activityId]`: GET de acceso directo con 403/404 HTML y redirección al Sheet de `/activities`.

No existe una API REST general para el dominio; la mayoría de las mutaciones usan Server Actions.

## Flujo de información

```text
Navegador
  ↓ request
src/proxy.ts (sesión y redirecciones generales)
  ↓
Layout/página RSC (getCurrentUser)
  ↓
Read model / Prisma (datos limitados por scope)
  ↓ modelo serializable
Feature Client Component
  ↓ interacción
Server Action
  ↓ Zod → autorización → transacción → AuditLog
Prisma Client + PrismaPg
  ↓
PostgreSQL de Dokploy
```

## Autenticación y protección de rutas

- `src/proxy.ts` usa `withAuth` y protege rutas salvo auth, assets y endpoints de NextAuth.
- `src/app/(app)/layout.tsx` vuelve a consultar el usuario y redirige a `/login` si no mantiene acceso activo.
- `src/lib/auth.ts` usa estrategia JWT, pero el callback `jwt` reconsulta la base para actualizar `accessDecision` y `mustChangePassword`.
- Las páginas `/access-pending` y `/change-password` hacen guardas bidireccionales según estado.

Consulta [`PERMISSIONS.md`](PERMISSIONS.md) para autorización por recurso.

## Acceso a datos

`src/lib/prisma.ts` crea un `Pool` de `pg` con máximo 1 conexión por instancia y lo adapta mediante `PrismaPg`. En desarrollo reutiliza el cliente a través de `globalThis`.

Los read models deben aplicar scopes antes de devolver registros. `src/lib/activities/read-model.ts` es el patrón principal: obtiene asignaciones, construye filtros territoriales, carga actividades y calcula capacidades por recurso.

## Capas compartidas

- `src/components/ui/`: primitivas de bajo nivel; evita cambios de producto específicos aquí.
- `src/components/product/`: headers, toolbars, filtros, formularios responsive, detalles, badges y estados reutilizables.
- `src/messages/`: copy recurrente en español.
- `src/lib/validations/`: contratos Zod por dominio.
- `src/lib/authorization/`: políticas puras, resolución efectiva y protecciones globales.
- `src/features/*`: composición específica de cada módulo.

## Configuración relevante

- `tsconfig.json`: `strict`, `noEmit`, alias `@/* → ./src/*`.
- `components.json`: estilo `base-nova`, RSC, TypeScript, base neutral y variables CSS.
- `src/app/globals.css`: tokens, temas y adaptación de React Big Calendar.
- `prisma.config.ts`: usa `DIRECT_DATABASE_URL`, luego `DATABASE_URL`, para migraciones.
- `src/app/layout.tsx`: fuentes Manrope, DM Sans y JetBrains Mono; tema oscuro por defecto sin seguir sistema.

## Patrones de error y carga

- `error.tsx` y `loading.tsx` existen en Actividades y Calendario.
- `src/components/product/states.tsx` define estados vacíos, error y skeleton.
- Los errores esperados de Server Actions se convierten en códigos de dominio, no excepciones genéricas hacia UI.
- Los formularios muestran Alert y Sonner; las operaciones destructivas usan confirmación.

## Notificaciones y Resend

- Las mutaciones escriben `EmailNotification` en la misma transacción que el dominio y AuditLog.
- Cada fila representa una sola llamada a Resend con `toRecipients` y `ccRecipients`; `dedupeKey` evita duplicados por evento.
- El dispatcher reclama filas mediante estado/lease, intenta inmediatamente post-commit y reintenta desde `POST /api/jobs/notifications`.
- El job usa bearer `NOTIFICATION_JOB_SECRET`; no es un endpoint genérico de envío.
- Las plantillas HTML/texto viven en `src/lib/email/templates/` y escapan contenido controlado por usuarios.

## Despliegue de producción

El destino confirmado es una Dokploy Application construida desde el `Dockerfile` raíz:

```text
GitHub master
    ↓ Docker build multi-stage (Node 22 + pnpm 11.9)
Imagen de aplicación no-root
    ↓ prisma migrate deploy mediante DIRECT_DATABASE_URL
Next.js en 0.0.0.0:3000
    ↓ Traefik/Dokploy HTTPS
Dominio público
```

PostgreSQL se ejecuta como servicio administrado en Dokploy: `DATABASE_URL` y `DIRECT_DATABASE_URL` apuntan a la URL interna del servicio de base de datos. La imagen no contiene base, volumen persistente ni secretos.

`GET /api/health` valida Next.js y conectividad con PostgreSQL. El contenedor ejecuta una única réplica inicialmente; antes de escalar deben separarse las migraciones y coordinarse caché/Server Actions. Consulta `docs/deployment/dokploy.md`.

## Archivos que debes leer

- `src/app/layout.tsx`
- `src/app/(app)/layout.tsx`
- `src/proxy.ts`
- `src/lib/prisma.ts`
- `src/lib/auth.ts`
- `src/lib/activities/read-model.ts`
- `src/components/product/`
- `src/app/actions/`
- `tsconfig.json`
- `components.json`
- `Dockerfile`
- `docs/deployment/dokploy.md`

## Pendiente por confirmar

- Pipeline CI/CD; no hay workflows versionados en el estado actual.
- Política de cache/streaming más allá de revalidaciones explícitas.

## Registro de tarea

`Activity` representa trabajo planificado y `WorkLog` trabajo ejecutado. La relación `Activity.workLog` es opcional, única e idempotente; eliminar una actividad deja el registro histórico sin vínculo. El alcance territorial se copia al iniciar y se vuelve a evaluar en cada lectura o mutación. R2 almacena binarios y `EmailNotification` conserva únicamente payloads pequeños y deduplicables.
