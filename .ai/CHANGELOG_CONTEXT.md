# Historial contextual para agentes

## Cómo usar este archivo

Este historial registra decisiones visibles en commits, documentos y código actual. No pretende sustituir `git log`, las migraciones ni la documentación de diseño en `docs/superpowers/`. Antes de asumir que una decisión sigue vigente, contrástala con la implementación actual.

## 2026-07-14 — Base versionada y refactor visual balanceado

Evidencia: commits `48af82f` a `9f52907`.

- Se creó un baseline funcional antes del refactor visual.
- Se incorporaron tokens de diseño “balanceado”.
- Agenda recibió encabezado compacto, KPI pills y ajustes del formulario de actividades.
- Se agregó validación de coherencia del rango horario.
- Se cerró una primera pasada visual de Agenda.

Contexto vigente: la UI usa paleta neutral con marca `#34B27B`, encabezados compactos y métricas densas. La validación temporal es regla de negocio, no solo decisión visual.

## 2026-07-15 — Refactor operativo transversal

Evidencia: commits `af229ed` a `f64ccaa` y documentos de diseño fechados ese día.

- El refactor se extendió a módulos operativos restantes.
- Se corrigió el tinte ambiental verde y el overflow de filtros en Agenda.
- Se diseñó e implementó un patrón responsive para detalle de actividad.
- Se añadieron formato compacto de fecha, primitivas compartidas de detalle y placeholders de formulario.
- Se creó una toolbar operativa sin superficie tipo card y se reemplazó el patrón anterior en varios componentes.

Contexto vigente: los toolbars deben ser transparentes, organizados por grupos y responsive; los Sheet/Drawer de detalle deben usar secciones temáticas consistentes.

## 2026-07-16 — Autorización dinámica y usuarios administrados

Evidencia: commits de diseño `1a288cc`, `496e0ae`, `f3f3e17`, `9ec76c2`, implementación `adb3a90`, `prisma/schema.prisma`, migraciones `20260716113000_dynamic_authorization` y `20260716124500_harden_role_assignments`.

- Se tomó la decisión de persistir Role, Permission, RolePermission y overrides individuales.
- Los cinco roles base quedaron como roles de sistema con prioridad.
- Se diseñaron reglas de anti-escalación, delegación por scope, DENY prevalente y protección del último administrador.
- Se diseñó la creación/edición de usuarios administrados, sin flujo de invitación.
- Se incorporó el panel compartido `ManagedUserSheet` y pruebas asociadas.
- La asignación de roles quedó endurecida con `scopeKey`, unique compuesto y upsert atómico.

Contexto vigente: no agregues checks por nombre de rol para controlar botones o Server Actions. Usa permisos efectivos y recurso/alcance.

## 2026-07-17 — Especificación y verificación RBAC; flujo de autenticación

Evidencia: commits `72d1ba9`, `5964579`, `06671dc`, `6374469`, `docs/testing/2026-07-17-rbac-e2e-report.md`, `docs/superpowers/specs/2026-07-17-rbac-e2e-matrix-design.md` y código actual de autenticación.

- Se congeló una matriz normativa RBAC y se creó una suite E2E real.
- El reporte histórico registró discrepancias encontradas en aquella corrida. Varias fueron corregidas posteriormente en el código; no trates el reporte como estado presente sin reproducirlo.
- El flujo de autenticación local pasó a contemplar ACTIVE, PENDING, SUSPENDED y `mustChangePassword`.
- La sesión JWT revalida el usuario persistido y las páginas de estado aplican redirecciones según decisión de acceso.
- Se mantuvo Zoho como proveedor corporativo opcional y credenciales locales para cuentas administradas.

Contexto vigente: la suspensión debe surtir efecto en la siguiente revalidación; PENDING solo obtiene una sesión limitada para llegar a `/access-pending`; una contraseña temporal obliga el cambio.

## 2026-07-20 — Limpieza de pruebas y documentación para agentes

Evidencia: commit `5e5804f` y commits de documentación posteriores.

- Se eliminaron del repositorio `e2e/` y `scripts/` que contenían la infraestructura E2E y utilidades de base de datos.
- `package.json` conserva algunos scripts que aún apuntan a esos archivos ausentes. Están documentados como residuales, no como comandos operativos.
- Se reforzó la generación de Prisma mediante hooks `postinstall` y `prebuild` visibles en `package.json`.
- Se creó `AGENTS.md` y el sistema `.ai/` como contexto permanente basado en el código real.
- Se definió Dokploy Application como destino de producción, con Dockerfile multi-stage, Node 22, pnpm fijado, runtime no-root y PostgreSQL de Dokploy externo.
- El contenedor aplica `prisma migrate deploy` antes de iniciar Next.js y publica `/api/health` para readiness contra PostgreSQL.

Contexto vigente: no restaures artefactos E2E ni scripts eliminados por inferencia. Si se necesita cobertura E2E, debe definirse y aprobarse como una nueva tarea.

## 2026-07-21 — Corrección y verificación del primer despliegue en Dokploy

Evidencia: commits `453d2c6`, `b866558` y `348bda5`; construcción local fresca `docker build --no-cache --tag calendar:dokploy .` con exit code 0; deployment de `348bda5` marcado como exitoso en Dokploy y pantalla de login accesible por HTTPS en `calendar.combiliftsales.com`.

- El primer build Linux real falló con `ERR_PNPM_IGNORED_BUILDS` porque los stages `dependencies` y `production-dependencies` no recibían `pnpm-workspace.yaml` ni su política versionada `allowBuilds`. `453d2c6` incorporó el archivo antes de ambos installs, sin habilitar `dangerouslyAllowAllBuilds`.
- El runner también necesitaba el contrato de workspace disponible; `b866558` incorporó `pnpm-workspace.yaml` a la imagen final. Esa presencia era necesaria para representar la política, pero no impedía por sí sola que `pnpm exec` comprobara el estado de las dependencias.
- Aunque el build terminaba correctamente, el contenedor entraba en reinicio con `EACCES` sobre `/app/_tmp_...`: `pnpm exec` activaba una comprobación previa e intentaba `pnpm install --production` como el usuario no-root `node`.
- `348bda5` sustituyó `pnpm exec` por los binarios ya empaquetados `./node_modules/.bin/prisma` y `./node_modules/.bin/next`. Se mantuvieron `USER node`, la migración previa al servidor y el runtime inmutable.
- La comunicación administrativa de Dokploy con el Remote Server permanece en la red privada, mientras que el DNS público apunta al punto de entrada público del nodo. La advertencia de validación basada en la IP privada no fue la causa del `502`; Traefik recibía la solicitud, pero el backend no estaba disponible por el reinicio del contenedor.
- La evidencia final confirma deployment exitoso y renderizado de la pantalla de login por HTTPS. No se ejecutó una verificación completa de login local, OAuth Zoho ni del resto de los flujos autenticados.

Contexto vigente: `pnpm-workspace.yaml` y `allowBuilds` forman parte del contrato reproducible de instalación; el runtime no ejecuta pnpm ni instala dependencias, y arranca Prisma/Next.js mediante sus binarios locales como usuario `node`.

## Decisiones que deben preservarse

1. Nombre del producto: **Calendar**. Cualquier nombre alternativo incluido por error en solicitudes anteriores no pertenece al sistema.
2. Trabajo en la rama principal `master`, sin worktrees aislados, por instrucción del propietario.
3. Autorización dinámica persistida; el seed refleja una matriz base, no una razón para hardcodear roles en UI.
4. DENY gana sobre GRANT y permiso de rol cuando el override aplica al recurso.
5. Scope GLOBAL, COUNTRY y TEAM se evalúa contra el recurso; sin recurso solo aplica GLOBAL.
6. AuditLog es inmutable y las mutaciones auditables deben registrar actor y cambio.
7. React Big Calendar sigue siendo la base del calendario operativo.
8. ShadCN y los componentes de `src/components/product/` son la base de UI.
9. Paleta neutral; verde de marca reservado para significado de marca/acción.
10. No hay funcionalidad de invitación de usuarios en esta etapa; sí creación y edición administrada.
11. Producción se despliega desde `master`; Calendar utiliza la base MySQL/MariaDB legacy de Control Horario IMADA y ningún secreto entra al build de Docker.
12. Desde 2026-08-12 el correo usa Resend con un outbox `EmailNotification`: un mensaje por evento, usuario afectado en `to` y supervisores autorizados por permisos/scope en `cc`.
13. Las credenciales temporales se envían sin CC y nunca se persisten en texto plano; los demás fallos se reintentan mediante un job protegido.
14. El detalle de usuario usa selector de sección en móvil para evitar el desborde de tabs y los formularios compartidos contienen ancho desde 320 px.

## 2026-09-01 — Cambio de persistencia a la base legacy MySQL

- Prisma y el runtime cambiaron de PostgreSQL a MySQL/MariaDB mediante `@prisma/adapter-mariadb`.
- Las entidades de Calendar se aíslan con el prefijo `calendar_` para no modificar tablas Laravel existentes.
- Las migraciones activas viven en `prisma/migrations-mysql`; las migraciones PostgreSQL históricas se conservan como referencia.
- La verificación remota desde este equipo alcanzó el puerto 3306, pero el servidor no completó el handshake MySQL y terminó en timeout; la aplicación no debe declararse conectada hasta resolver el acceso remoto del proveedor.

## Documentos históricos relevantes

- `docs/superpowers/specs/2026-07-16-dynamic-authorization-design.md`
- `docs/superpowers/plans/2026-07-16-dynamic-authorization-implementation.md`
- `docs/superpowers/specs/2026-07-16-managed-users-and-login-design.md`
- `docs/superpowers/plans/2026-07-16-managed-users-and-login.md`
- `docs/superpowers/specs/2026-07-17-rbac-e2e-matrix-design.md`
- `docs/testing/2026-07-17-rbac-e2e-report.md`
- `docs/superpowers/specs/2026-07-20-ai-agent-documentation-design.md`
- `docs/superpowers/plans/2026-07-20-ai-agent-documentation.md`

## Cómo actualizar este historial

Agrega una entrada cuando cambie una decisión arquitectónica, una regla de negocio, la matriz de permisos, un flujo crítico o la infraestructura de verificación. Incluye fecha, evidencia concreta, qué cambió y qué contexto sigue vigente. No registres cambios cosméticos menores ni copies todo el changelog de Git.

## Pendiente por documentar

- Motivo y fecha exactos de la implementación original anterior al baseline `48af82f`; el historial disponible empieza con un proyecto funcional.
- Resultado real de deduplicación al aplicar `20260716124500_harden_role_assignments` en la base de desarrollo/producción; el repositorio no conserva ese conteo.
- Política formal de releases más allá de los deployments y rollback de imagen ofrecidos por Dokploy.
- Decisión futura sobre retirar scripts residuales de `package.json` o restaurar infraestructura equivalente.
