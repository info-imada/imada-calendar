# Diseño de despliegue de Calendar en Dokploy

**Fecha:** 2026-07-20  
**Estado:** Aprobado por el propietario  
**Destino:** Dokploy Application con Build Type `Dockerfile`  
**Base de datos:** PostgreSQL/Neon externo

## Objetivo

Preparar Calendar para un despliegue de producción reproducible en Dokploy sin incorporar PostgreSQL al host de Dokploy. El repositorio debe contener todo lo necesario para construir y ejecutar la aplicación como un contenedor stateless, aplicar migraciones pendientes de Prisma de forma segura y permitir a Dokploy validar la salud antes de enrutar tráfico.

## Alcance

El cambio incluye:

- Dockerfile multi-stage versionado;
- contexto de build reducido mediante `.dockerignore`;
- versión de pnpm declarada explícitamente;
- ejecución de migraciones con `prisma migrate deploy` al iniciar;
- ejecución de Next.js como usuario no-root en el puerto 3000;
- endpoint público de health/readiness sin datos sensibles;
- healthcheck de Docker;
- prueba automatizada del endpoint;
- guía exacta de configuración en Dokploy;
- actualización de la documentación interna `.ai/`.

No incluye:

- desplegar PostgreSQL dentro de Dokploy;
- crear volúmenes persistentes;
- modificar el esquema o generar migraciones nuevas;
- ejecutar el seed automáticamente en producción;
- crear una pipeline externa de registro de imágenes;
- configurar el dominio o los secretos directamente en la instancia del usuario;
- restaurar la infraestructura E2E eliminada.

## Alternativas consideradas

### Dockerfile multi-stage para Dokploy Application — elegida

Encaja con la Application ya creada, mantiene el build bajo control del repositorio y permite fijar Node, pnpm, Prisma, usuario, puerto y healthcheck.

### Docker Compose con migrador separado

Separa estrictamente migraciones y servidor, pero obliga a cambiar el tipo de servicio de Dokploy y coordinar dos servicios para una aplicación con una única instancia prevista.

### Railpack o Nixpacks

Reduce configuración inicial, pero deja más decisiones de dependencias, comandos y runtime en autodetección. Se descartó para evitar diferencias entre builds y pérdida de control sobre Prisma.

## Arquitectura del contenedor

### Imagen base

Se usará `node:22-bookworm-slim`:

- Node 22 es una línea LTS compatible con Next.js 16 y Prisma 7;
- Debian slim evita incompatibilidades frecuentes de OpenSSL/libc de imágenes Alpine con herramientas nativas;
- se instalarán únicamente certificados CA y OpenSSL requeridos en runtime/build.

pnpm se fijará en `11.9.0` tanto en `package.json` mediante `packageManager` como dentro del contenedor.

### Stages

1. `base`: Node, paquetes mínimos del sistema, pnpm y variables comunes.
2. `dependencies`: instalación completa con `pnpm install --frozen-lockfile` para construir.
3. `builder`: copia del código y ejecución de `pnpm build`.
4. `production-dependencies`: instalación solo de dependencias de producción, incluyendo Prisma CLI necesario para `migrate deploy`.
5. `runner`: copia del build, recursos públicos, dependencias de producción, schema y migraciones.

Los dos stages que instalan dependencias consumen el mismo contrato versionado antes de ejecutar pnpm: `package.json`, `pnpm-lock.yaml` y `pnpm-workspace.yaml`. El stage `dependencies` usa esos tres archivos para la instalación completa y `production-dependencies` vuelve a usarlos para la instalación `--prod`.

La reproducibilidad no depende solo del lockfile: `pnpm-workspace.yaml` contiene la política explícita `allowBuilds` que autoriza los paquetes requeridos para ejecutar scripts de build durante la instalación. Esa política forma parte del input reproducible de ambos installs; no debe reemplazarse por `dangerouslyAllowAllBuilds`.

`prisma` y `dotenv`, necesarios para cargar `prisma.config.ts` durante la migración dentro del contenedor, pasarán a dependencias de producción. No se ejecutará `prisma generate` mediante descarga o instalación dinámica al arrancar.

### Proceso de arranque

El comando final ejecutará secuencialmente:

```text
prisma migrate deploy
        ↓ éxito
next start en 0.0.0.0:3000
```

Si la migración falla, el proceso termina con código distinto de cero y Next.js no inicia. Dokploy mostrará el despliegue como fallido en lugar de servir una versión incompatible con el esquema.

`migrate deploy` usa `DIRECT_DATABASE_URL` cuando esté definida y cae a `DATABASE_URL` mediante `prisma.config.ts`. `DATABASE_URL` seguirá siendo la URL pooled usada por la aplicación.

Prisma serializa las migraciones mediante su mecanismo de locking. El diseño está orientado inicialmente a una única réplica; antes de escalar horizontalmente se deberá separar la migración a un job de despliegue.

### Usuario y filesystem

El proceso final se ejecutará con el usuario no-root incluido en la imagen Node (`node`). Los archivos copiados al stage final tendrán propiedad compatible. La aplicación no depende de almacenamiento local persistente; la caché local de Next.js se considera efímera para una sola instancia.

## Configuración de Next.js

Se conservará el servidor Node de Next.js, porque Calendar utiliza:

- Server Components;
- Server Actions;
- Route Handlers;
- NextAuth;
- acceso dinámico a Prisma;
- proxy/middleware.

No se utilizará export estático. El servidor escuchará en `0.0.0.0` y en el puerto `3000`. El proxy inverso y TLS serán gestionados por Traefik/Dokploy.

La imagen se construirá con dependencias de producción y `.next` en lugar de una exportación SPA. Las variables privadas se resolverán en runtime; no se copiará `.env` al contexto.

## Healthcheck

Se añadirá `GET /api/health` como Route Handler público.

Comportamiento:

- ejecuta una consulta mínima `SELECT 1` mediante el cliente Prisma real;
- responde `200` con `{ "status": "ok" }` cuando la aplicación y Neon estén disponibles;
- responde `503` con `{ "status": "unavailable" }` ante un fallo;
- nunca incluye stack trace, URL de conexión, nombre del proveedor ni mensaje interno;
- usa `Cache-Control: no-store`.

El Dockerfile incluirá `HEALTHCHECK` contra `http://127.0.0.1:3000/api/health`. Dokploy debe configurar el dominio al puerto interno 3000 y puede reutilizar la misma ruta para healthcheck/rollback.

## Variables de entorno en Dokploy

Obligatorias:

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | URL pooled de Neon para la aplicación. |
| `DIRECT_DATABASE_URL` | URL directa de Neon para migraciones. |
| `NEXTAUTH_URL` | URL pública HTTPS exacta del dominio de producción. |
| `NEXTAUTH_SECRET` | Secreto aleatorio de producción, mínimo 16 caracteres. |

Condicionales:

| Variable | Uso |
| --- | --- |
| `ZOHO_CLIENT_ID` | Habilita OAuth Zoho junto con el secreto. |
| `ZOHO_CLIENT_SECRET` | Secreto OAuth Zoho. |
| `SEED_ADMIN_PASSWORD` | Solo para una ejecución manual y consciente del seed; no requerida por el contenedor. |

El Dockerfile fija `NODE_ENV=production`, `PORT=3000`, `HOSTNAME=0.0.0.0` y `NEXT_TELEMETRY_DISABLED=1`. Ningún valor secreto se pasa como `ARG` ni se incorpora a capas de la imagen.

## Configuración de Dokploy

La guía de operación documentará:

- Provider: GitHub;
- Repository: repositorio de Calendar;
- Branch: `master`;
- Build Path: `/`;
- Build Type: `Dockerfile`;
- Dockerfile Path: `Dockerfile`;
- Docker Context Path: `.`;
- Docker Build Stage: vacío para usar el stage final;
- Container Port: `3000`;
- Health path: `/api/health`;
- dominio con HTTPS y redirección HTTP→HTTPS;
- variables configuradas en `Environment`, no en Git;
- callback Zoho basado en `https://<dominio>/api/auth/callback/zoho`;
- primer despliegue, revisión de logs y rollback.

No se incluirán etiquetas Traefik ni `docker-compose.yml`, porque Dokploy Domains agrega el routing para una Application.

## Seguridad

- El runtime no se ejecuta como root.
- `.env`, `.env.*`, Git, dependencias locales, builds, logs, cobertura y artefactos de test quedan fuera del contexto.
- El endpoint de salud no revela detalles de infraestructura.
- Las migraciones no usan `db push` ni ejecutan seed.
- Los secretos solo existen en Dokploy/entorno de runtime.
- `NEXTAUTH_URL` debe usar HTTPS para callbacks y cookies de sesión en producción.
- El dominio autorizado debe configurarse también en Zoho Developer Console.

## Manejo de errores

- Fallo de instalación o build: Docker build termina y no reemplaza el contenedor anterior.
- Fallo de migración: el contenedor termina antes de iniciar Next.js.
- Fallo de Neon durante healthcheck: respuesta 503 y estado unhealthy; no se filtra el error.
- Variable obligatoria ausente: Prisma o NextAuth fallan de forma visible en logs de runtime; la guía incluye una lista previa al despliegue.
- Callback Zoho incorrecto: el login OAuth falla sin afectar credenciales locales; la guía incluye URL exacta.

## Verificación

Se ejecutará:

1. prueba Vitest del Route Handler con éxito y error sanitizado;
2. `pnpm test`;
3. `pnpm lint`;
4. `pnpm build`;
5. validación estática del Dockerfile y `.dockerignore`;
6. `docker build` solo si Docker CLI/daemon está disponible.

El equipo actual no dispone de Docker CLI, por lo que cualquier imposibilidad de construir localmente se reportará explícitamente. El build real de Dokploy será la verificación final de la imagen Linux.

## Criterios de aceptación

- Dokploy puede seleccionar `Dockerfile` con contexto `.` sin configuración de build custom.
- Ambos stages de dependencias instalan desde `package.json`, `pnpm-lock.yaml` y `pnpm-workspace.yaml`, incluida su política explícita `allowBuilds`.
- Ningún secreto o `.env` entra al contexto.
- Las migraciones se aplican antes de iniciar la aplicación.
- La aplicación escucha en `0.0.0.0:3000` como usuario no-root.
- `/api/health` devuelve 200/503 de manera sanitizada según disponibilidad de Neon.
- La guía permite configurar dominio, variables y callback Zoho sin inferencias.
- Tests, lint y build del proyecto continúan aprobando, salvo advertencias preexistentes documentadas.

## Consideración futura

Si se habilitan varias réplicas o rolling deployments simultáneos, se deberá extraer `prisma migrate deploy` a un job único anterior al rollout y coordinar caché/Server Actions según la guía de self-hosting de Next.js.
