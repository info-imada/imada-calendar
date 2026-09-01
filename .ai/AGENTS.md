# Guía principal para agentes de IA

## Propósito

Esta guía define cómo analizar, modificar y entregar cambios en **Calendar**. Es obligatoria para agentes de IA y útil como protocolo de trabajo para desarrolladores.

## Orden de lectura

### Lectura mínima para cualquier tarea

1. [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md): producto y usuarios.
2. [`BUSINESS_RULES.md`](BUSINESS_RULES.md): invariantes funcionales.
3. [`ARCHITECTURE.md`](ARCHITECTURE.md): límites técnicos y flujo de datos.
4. [`MODULES.md`](MODULES.md): rutas y archivos del módulo afectado.
5. [`DEVELOPMENT_GUIDE.md`](DEVELOPMENT_GUIDE.md): comandos y checklist.

### Lectura adicional por dominio

- Autenticación, usuarios, roles o scopes: [`PERMISSIONS.md`](PERMISSIONS.md), [`API_GUIDE.md`](API_GUIDE.md) y [`DATABASE.md`](DATABASE.md).
- Prisma, MySQL/MariaDB, seed o migraciones: [`DATABASE.md`](DATABASE.md) y [`BUSINESS_RULES.md`](BUSINESS_RULES.md).
- Server Actions o Route Handlers: [`API_GUIDE.md`](API_GUIDE.md) y [`PERMISSIONS.md`](PERMISSIONS.md).
- Componentes, formularios, responsive o tema: [`UI_GUIDE.md`](UI_GUIDE.md).
- Decisiones anteriores o posibles contradicciones: [`CHANGELOG_CONTEXT.md`](CHANGELOG_CONTEXT.md).

## Jerarquía de fuentes

Cuando dos fuentes difieran, usa este orden:

1. Esquema y migraciones aplicadas para estructura persistente.
2. Código de servidor vigente y sus pruebas para comportamiento y seguridad.
3. Código de interfaz vigente y sus pruebas para presentación e interacción.
4. Configuración versionada y `package.json` para herramientas y comandos.
5. Documentos de `.ai/` para orientación consolidada.
6. `docs/` e historial Git para contexto temporal.

No conviertas una especificación histórica en regla vigente sin contrastarla con el código.

## Método de trabajo

### 1. Orientar

- Lee el contexto mínimo y el documento del dominio.
- Ejecuta `git status --short` y preserva cualquier cambio que no sea tuyo.
- Localiza la ruta, feature, Server Action, validación, política y modelo relacionados.
- Identifica si el cambio cruza fronteras de seguridad, persistencia o responsive.

### 2. Definir el contrato

- Expresa el resultado observable esperado.
- Separa requisitos confirmados de supuestos.
- Si un supuesto cambia alcance, seguridad o datos, pide confirmación.
- Prefiere el cambio mínimo coherente con patrones existentes; no mezcles refactors ajenos.

### 3. Investigar antes de corregir

- Reproduce bugs con el comando o flujo exacto.
- Sigue el dato desde UI hasta validación, autorización, transacción y base.
- Busca pruebas y patrones equivalentes antes de introducir una variante.
- Corrige la causa raíz. No ocultes errores de tipo con `any`, casts amplios o fallos silenciosos.

### 4. Implementar

- Server Components son el valor predeterminado; usa Client Components solo cuando haya estado, eventos o APIs de navegador.
- Reutiliza `src/components/ui/` y `src/components/product/` antes de crear primitivas nuevas.
- Valida entradas externas con Zod.
- Autoriza dentro del servidor y, para mutaciones sensibles, con lecturas frescas dentro de la transacción.
- Mantén consultas y datos limitados al scope del actor.
- Registra en `AuditLog` las mutaciones que ya forman parte del contrato auditable.

### 5. Verificar

- Ejecuta primero la prueba más cercana al cambio.
- Ejecuta `pnpm test` para cambios transversales de TypeScript o reglas.
- Ejecuta `npm run build` o `pnpm build` antes de entregar cambios que afecten compilación o rutas.
- Para UI, verifica claro/oscuro y los tres rangos: `<640 px`, `640–1024 px`, `>1024 px`.
- Revisa `git diff --check`, el diff completo y que no existan secretos.

### 6. Entregar

Reporta:

1. Resultado alcanzado.
2. Archivos creados o modificados.
3. Decisiones y reglas preservadas.
4. Comandos ejecutados con resultado real.
5. Riesgos, limitaciones y `Pendiente por confirmar`.

No declares una prueba, build o comportamiento como correcto si no fue comprobado durante la tarea.

## Cambios sensibles

### Base de datos

Antes de modificarla, lee `prisma/schema.prisma`, todas las migraciones relacionadas, `prisma/seed.ts`, [`DATABASE.md`](DATABASE.md) y las pruebas de contrato. No edites migraciones aplicadas: crea una nueva. Evalúa datos existentes, constraints, backfill, rollback operativo y AuditLog. Ejecuta `prisma generate` después de cambiar el esquema.

### Autenticación

Lee `src/lib/auth.ts`, `src/lib/access-policy.ts`, `src/proxy.ts`, las páginas de `src/app/(auth)/` y [`PERMISSIONS.md`](PERMISSIONS.md). Conserva la revalidación de estado contra base, el flujo PENDING, la obligación de cambio de contraseña y el rechazo de SUSPENDED. No enlaces identidades OAuth y locales de forma implícita.

### Roles y permisos

Lee `src/lib/permissions.ts`, `src/lib/authorization/`, `src/app/actions/authorization.ts` y [`PERMISSIONS.md`](PERMISSIONS.md). No autorices por nombre de rol salvo el requisito global ADMIN explícito de Administración. Respeta DENY, scope del recurso, prioridades, anti-autoasignación, roles de sistema y protección del último administrador global.

### APIs y Server Actions

Lee [`API_GUIDE.md`](API_GUIDE.md), la validación Zod y la política del dominio. No confíes en IDs recibidos ni en filtros de UI. Distingue VALIDATION, UNAUTHORIZED, FORBIDDEN, NOT_FOUND y CONFLICT sin convertir rechazos esperados en errores 500.

### UI/UX

Lee [`UI_GUIDE.md`](UI_GUIDE.md), `src/app/globals.css` y componentes compartidos. Mantén superficies neutras, marca `#34B27B` con intención semántica, controles ShadCN/Base UI, estados accesibles, densidad operativa y responsive real. La UI debe reflejar permisos efectivos, pero el servidor sigue siendo la autoridad.

## Reglas de repositorio

- Rama de trabajo: `master`.
- No crear worktrees.
- No borrar ni restaurar archivos del usuario sin evidencia y autorización.
- No incluir `.env`, artefactos, builds o dependencias en Git.
- El repositorio actual no contiene `README.md`, `e2e/` ni `scripts/`; consulta [`DEVELOPMENT_GUIDE.md`](DEVELOPMENT_GUIDE.md) antes de usar comandos que los referencien.

## Pendiente por confirmar

- Propietario técnico y propietario de negocio.
- Pipeline CI/CD y política formal de releases.
- Estrategia futura para restaurar o retirar comandos residuales dependientes de `scripts/`.
