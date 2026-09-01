# Guía de desarrollo

## Requisitos locales

- Node.js compatible con Next.js 16 y Prisma 7. El repositorio no fija una versión en `.nvmrc` ni `package.json`.
- pnpm, porque `pnpm-lock.yaml` es el lockfile versionado y `package.json` declara `packageManager`.
- PostgreSQL accesible mediante las URLs de entorno.
- Git.

En Windows, ejecuta los comandos desde PowerShell en la raíz del proyecto. Todo trabajo solicitado por el propietario de este repositorio se realiza directamente en `master`; no crees worktrees aislados.

## Instalación

```powershell
pnpm install --frozen-lockfile
```

`postinstall` ejecuta `prisma generate`. `prebuild` vuelve a generarlo antes del build para evitar un cliente Prisma desactualizado.

Si se eliminó `node_modules`, el error `"next" no se reconoce` se resuelve instalando dependencias; no instales Next globalmente.

## Variables de entorno

Copia `.env.example` a `.env` y proporciona valores locales seguros. Las variables declaradas son:

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Conexión PostgreSQL usada por la aplicación/Prisma. |
| `DIRECT_DATABASE_URL` | Conexión directa para tareas que la requieran. |
| `NEXTAUTH_URL` | URL base de NextAuth. |
| `NEXTAUTH_SECRET` | Firma/cifrado de sesión. |
| `ZOHO_CLIENT_ID` | Cliente OAuth Zoho. |
| `ZOHO_CLIENT_SECRET` | Secreto OAuth Zoho. |
| `SEED_ADMIN_PASSWORD` | Contraseña local opcional del administrador sembrado. |

Nunca escribas valores reales en documentación, commits, logs, capturas o mensajes de error. Verifica que `.env` permanezca ignorado.

## Comandos vigentes

| Objetivo | Comando |
| --- | --- |
| Desarrollo | `pnpm dev` |
| Build de producción | `pnpm build` |
| Inicio de build generado | `pnpm start` |
| Lint | `pnpm lint` |
| Tests unitarios/RTL | `pnpm test` |
| Tests en modo watch | `pnpm test:watch` |
| Prisma generate | `pnpm db:generate` |
| Aplicar migraciones | `pnpm db:migrate` |
| Seed base | `pnpm db:seed` |

También funcionan los scripts equivalentes con npm después de instalar dependencias, pero pnpm es la opción canónica por el lockfile.

## Comandos residuales no operativos

`package.json` todavía declara scripts que apuntan a infraestructura eliminada del repositorio:

- `test:e2e` espera `playwright.config.ts` y `e2e/`;
- `db:seed:e2e` espera `scripts/seed-e2e.ts`;
- `db:bootstrap-admin` espera un script dentro de `scripts/`;
- `db:verify` espera un script dentro de `scripts/`.

No reportes esos comandos como verificación exitosa ni recrees la infraestructura sin una solicitud explícita. Esta discrepancia debe resolverse en una tarea separada: eliminar scripts obsoletos o restaurar una suite aprobada.

## Base de datos

### Cambio de esquema

1. Lee `.ai/DATABASE.md`, `.ai/PERMISSIONS.md` y las migraciones existentes.
2. Modifica `prisma/schema.prisma`.
3. Genera una migración nueva; no edites una migración ya aplicada.
4. Revisa manualmente el SQL, incluyendo constraints, índices, borrados y backfills.
5. Ejecuta `pnpm db:generate`.
6. Aplica la migración en una base no productiva.
7. Ejecuta tests y build.
8. Documenta compatibilidad y plan de reversión.

No uses `db push` como sustituto de una migración auditable. No borres datos ni restablezcas una base sin autorización explícita.

### Seed

`prisma/seed.ts` crea catálogos y datos reproducibles. Es idempotente por upserts, pero también sincroniza la matriz de permisos de roles del sistema y elimina asociaciones no declaradas para esos roles. Revisa el impacto antes de ejecutarlo contra una base con configuración real.

## Patrón de implementación

### Antes de editar

1. Lee `AGENTS.md` y los documentos `.ai/` relevantes.
2. Confirma la rama y revisa `git status`.
3. Inspecciona página, Server Action, política, schema y tests afectados.
4. Define resultado observable, reglas de autorización, alcance de datos y estados de error.
5. Preserva cambios ajenos presentes en el working tree.

### Backend

- Usa Server Components para lectura inicial y Server Actions para mutaciones de producto.
- Valida inputs con Zod en el límite del servidor.
- Recalcula permisos efectivos y alcance en servidor; no confíes en datos enviados por el cliente.
- Para operaciones sensibles, reconsulta autorización dentro de la transacción.
- Escribe la entidad y su AuditLog en la misma transacción cuando corresponda.
- Devuelve resultados discriminados y mensajes seguros; no expongas stack, hashes, tokens ni configuración.

### Frontend

- Mantén Server Components salvo que interacción/estado requiera `"use client"`.
- Reutiliza `src/components/product/` y `src/components/ui/`.
- No dupliques validación de negocio como única defensa en cliente.
- Incluye estados de carga, vacío, error y pendiente.
- Sigue `.ai/UI_GUIDE.md` y verifica ambos temas y tres breakpoints.

## Tests

Los tests versionados actuales están junto al código como `*.test.ts` y `*.test.tsx` y se ejecutan con Vitest:

```powershell
pnpm test
```

Para lógica de autorización, cubre al menos:

- permiso concedido y denegado;
- GLOBAL, COUNTRY y TEAM;
- override GRANT y DENY;
- autoescalación y prioridad igual/mayor;
- recurso fuera de alcance/IDOR;
- continuidad del último administrador;
- concurrencia de mutaciones críticas.

Actualmente no existe una suite E2E versionada. No afirmes cobertura E2E sin restaurarla y ejecutarla realmente.

En este equipo, algunas pruebas UI con `userEvent` pueden superar su timeout de 5 segundos cuando Vitest ejecuta toda la suite en paralelo. Si el fallo es exclusivamente un timeout, repite primero el archivo afectado y luego diagnostica con:

```powershell
pnpm exec vitest run --maxWorkers=1
```

No aumentes timeouts ni relajes aserciones sin demostrar antes que se trata de contención y no de una regresión funcional.

## Verificación mínima antes de entregar

Ejecuta en este orden, ajustando solo si la tarea documenta una razón concreta:

```powershell
pnpm test
pnpm lint
pnpm build
git diff --check
git status --short
```

Un cambio de documentación puede limitar la verificación a enlaces/rutas, `git diff --check` y build, pero debe indicarlo explícitamente. Un cambio de seguridad, Prisma, autenticación o permisos exige tests específicos además de la suite general.

No declares “pasa” basándote en una ejecución anterior. Reporta comando, momento y resultado de la corrida actual.

## Docker y Dokploy

El despliegue de producción usa el `Dockerfile` raíz y PostgreSQL administrado por Dokploy. Configuración canónica de Dokploy:

```text
Branch: master
Build Type: Dockerfile
Dockerfile Path: Dockerfile
Docker Context Path: .
Container Port: 3000
Health Path: /api/health
```

Construcción local, cuando Docker esté instalado:

```powershell
docker build --tag calendar:dokploy .
```

Los stages `dependencies` y `production-dependencies` deben copiar siempre `package.json`, `pnpm-lock.yaml` y `pnpm-workspace.yaml` antes de ejecutar, respectivamente, `pnpm install --frozen-lockfile` y `pnpm install --prod --frozen-lockfile`. `pnpm-workspace.yaml` es parte del contrato reproducible porque mantiene la política explícita `allowBuilds` para los paquetes autorizados a ejecutar scripts de build. Agrega nuevas aprobaciones solo de forma deliberada; no uses `dangerouslyAllowAllBuilds`.

El stage `runner` conserva `USER node` y trata `/app` como contenido inmutable. Su `CMD` invoca `./node_modules/.bin/prisma migrate deploy` y `./node_modules/.bin/next start` directamente desde las dependencias incluidas en la imagen. No uses `pnpm exec` en este comando: pnpm puede activar `verifyDepsBeforeRun`, intentar `pnpm install --production` y fallar con `EACCES` porque el usuario no-root no debe escribir archivos temporales en `/app`.

El contenedor no instala, repara ni actualiza dependencias durante el arranque. No cambies a `USER root` ni concedas permisos amplios para permitirlo. Las migraciones deben completarse antes de iniciar Next.js mediante los binarios ya construidos. El runtime no ejecuta seed. Configura `DATABASE_URL`, `DIRECT_DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET` y las variables opcionales de Zoho en Dokploy, nunca como build args o archivos versionados.

Consulta `docs/deployment/dokploy.md` antes del primer deploy, cambio de dominio, rollback o escalado.

## Git

- Rama de trabajo requerida por el propietario: `master`.
- No usar worktrees aislados.
- Commits recientes siguen en general el patrón `feat:`, `fix:`, `refactor:` y `docs:`, pero no se encontró una política formal versionada.
- Haz commits pequeños por unidad lógica y no incluyas cambios ajenos.
- No uses `git reset --hard` ni descartes archivos del usuario.
- No reescribas migraciones publicadas.

## Seguridad operativa

- No registres contraseñas temporales en AuditLog.
- No expongas si un correo existe más allá de lo necesario para la UX aprobada.
- Mantén límites de intentos de login y cambio obligatorio de contraseña.
- Evita interpolar comandos o SQL desde input sin validar.
- Revisa onDelete y cascadas antes de eliminar entidades.
- Un control oculto en UI nunca sustituye una autorización del servidor.
- No registres HTML, destinatarios completos, API keys ni contraseñas en errores de Resend.
- Prueba concurrencia/deduplicación del outbox y ejecuta el job solo con `NOTIFICATION_JOB_SECRET`.

## Checklist de entrega

- [ ] Leí la documentación contextual necesaria.
- [ ] El cambio está acotado a la solicitud y conserva trabajo ajeno.
- [ ] Inputs validados con Zod y tipos explícitos.
- [ ] Permisos efectivos y scope comprobados en servidor.
- [ ] AuditLog incluido en mutaciones auditables.
- [ ] No expuse secretos o datos sensibles.
- [ ] Agregué/actualicé tests proporcionales al riesgo.
- [ ] Ejecuté tests, lint y build aplicables.
- [ ] Verifiqué `git diff --check` y `git status`.
- [ ] Actualicé `.ai/` si cambió arquitectura, negocio, datos, API, UI o permisos.

## Pendiente por confirmar

- Versión oficial de Node.js y política de actualización de dependencias.
- Pipeline automática previa a Dokploy; no hay workflows versionados que ejecuten tests antes del autodeploy.
- Política formal de ramas, revisiones y releases más allá de la instrucción actual de usar `master`.
- Estrategia de backup, recuperación y promoción de migraciones entre ambientes.
- Decisión sobre scripts residuales de E2E/administración que apuntan a archivos eliminados.

## Registro de tarea

Variables opcionales requeridas para adjuntos: `R2_ENDPOINT`, `R2_BUCKET`, `R2_REGION`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` y `R2_PRESIGN_EXPIRES_SECONDS`. El importador se ejecuta con `pnpm controlhorario:import --dry-run` o `pnpm controlhorario:import --apply`; el dry-run no abre ni modifica PostgreSQL. No se deben almacenar claves R2, binarios grandes ni credenciales en PostgreSQL.
