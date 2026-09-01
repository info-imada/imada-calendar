# Prompts reutilizables para trabajar con IA

## Instrucciones comunes

Antes de usar cualquiera de estos prompts, añade el objetivo concreto y el contexto del usuario. Todo agente debe:

1. leer `AGENTS.md` y `.ai/AGENTS.md`;
2. seleccionar y leer los documentos `.ai/` relacionados;
3. inspeccionar el código real antes de afirmar cómo funciona;
4. trabajar en `master` sin worktree aislado;
5. preservar cambios existentes ajenos a la tarea;
6. no exponer valores de `.env`, contraseñas, tokens o datos sensibles;
7. distinguir hechos verificados, inferencias y asuntos pendientes;
8. ejecutar verificaciones actuales antes de afirmar que algo funciona;
9. actualizar `.ai/` si cambia una decisión estable del producto.

## Implementar un feature

```text
Actúa como Senior Full-Stack Engineer de Calendar.

Objetivo: [describe el resultado observable].
Criterios de aceptación: [lista concreta].

Antes de editar:
- Lee AGENTS.md, .ai/AGENTS.md, .ai/PROJECT_CONTEXT.md, .ai/ARCHITECTURE.md y .ai/MODULES.md.
- Lee además .ai/BUSINESS_RULES.md, .ai/PERMISSIONS.md, .ai/DATABASE.md, .ai/API_GUIDE.md y .ai/UI_GUIDE.md según corresponda.
- Localiza rutas, Server Actions, políticas, modelos, componentes y tests existentes; cita sus paths.
- Explica brevemente el flujo actual y propone un plan acotado. No inventes APIs ni modelos.

Implementa con TypeScript estricto, Server Components por defecto, Server Actions para mutaciones, Zod en servidor, permisos efectivos por recurso, transacción y AuditLog cuando aplique. Reutiliza ShadCN y src/components/product.

Agrega tests proporcionales al riesgo y ejecuta tests, lint y build aplicables. Entrega: resultado, archivos cambiados, reglas preservadas, comandos ejecutados y pendientes reales. No declares éxito si una verificación no se ejecutó.
```

## Corregir un bug

```text
Diagnostica y corrige este bug en Calendar: [síntoma, pasos y error].

Lee primero AGENTS.md, .ai/AGENTS.md y los documentos del módulo. Reproduce el fallo antes de editar si el entorno lo permite. Rastrea la causa desde UI/ruta hasta Server Action, autorización y Prisma; diferencia causa raíz de síntomas.

Escribe primero un test que falle cuando sea viable. Aplica el cambio mínimo que resuelva la causa sin debilitar Zod, scope, permisos, AuditLog ni manejo de estados. No cambies expectativas de test para ocultar un defecto.

Verifica la reproducción original, el test nuevo, la suite relacionada, lint y build. Reporta causa, diff conceptual, evidencia de corrección y cualquier riesgo que no se pudo verificar.
```

## Revisar seguridad

```text
Realiza una revisión de seguridad acotada de Calendar sobre: [superficie].

Lee AGENTS.md, .ai/ARCHITECTURE.md, .ai/BUSINESS_RULES.md, .ai/API_GUIDE.md, .ai/PERMISSIONS.md y .ai/DATABASE.md. Inspecciona código real y migraciones; no concluyas por nombres de archivos.

Busca al menos: autenticación y estados ACTIVE/PENDING/SUSPENDED, cambio obligatorio de contraseña, enumeración, IDOR, validación Zod, autorización en servidor, scope GLOBAL/COUNTRY/TEAM, overrides DENY/GRANT, anti-escalación, auto-mutación, TOCTOU/concurrencia, último administrador, exposición de secretos, inyección, cascadas y AuditLog.

Entrega hallazgos ordenados por severidad con path/línea, escenario explotable, impacto, evidencia y corrección concreta. Separa vulnerabilidades confirmadas de hardening. Si se solicita corregir, agrega pruebas de regresión y ejecuta la verificación completa pertinente.
```

## Refactorizar

```text
Refactoriza [área] de Calendar con este objetivo: [mantenibilidad, rendimiento o UX].

Antes de editar, lee la documentación .ai/ relevante y mapea consumidores, contratos públicos, tests y reglas de negocio. Establece qué comportamiento debe permanecer idéntico. Evita mezclar un refactor estructural con cambios funcionales no solicitados.

Para UI, reutiliza src/components/product y ShadCN, mantén ambos temas y los tres breakpoints. Para backend, conserva firmas de Server Actions, Zod, transacciones, permisos por recurso y AuditLog. Para datos, no edites migraciones aplicadas.

Trabaja en pasos pequeños y verifica después de cada bloque. Entrega antes/después técnico, archivos afectados, compatibilidad, tests ejecutados y cualquier deuda que deliberadamente quedó fuera.
```

## Analizar permisos

```text
Analiza este cambio o incidente de permisos en Calendar: [caso].

Lee .ai/PERMISSIONS.md, .ai/DATABASE.md, .ai/API_GUIDE.md y el código de src/lib/authorization y src/app/actions/authorization.ts. No uses el nombre del rol como sustituto del permiso efectivo salvo que el predicado existente lo exija explícitamente.

Construye una matriz actor/recurso con roles, prioridades, scope del actor, scope del recurso, permisos de rol, overrides aplicables y resultado. Recuerda: sin recurso solo aplica GLOBAL; cualquier DENY aplicable gana; el actor debe tener prioridad estrictamente mayor para delegar; no puede automodificarse; el último acceso administrativo crítico debe sobrevivir.

Comprueba UI y servidor por separado, incluido acceso directo/IDOR. Propón tests para GLOBAL, COUNTRY, TEAM, rol personalizado, GRANT, DENY y conflicto. Cita las funciones y constraints reales que sostienen cada conclusión.
```

## Revisar base de datos

```text
Revisa o diseña este cambio de base de datos para Calendar: [cambio].

Lee .ai/DATABASE.md, prisma/schema.prisma, prisma/seed.ts y todas las migraciones relacionadas. Describe modelos, relaciones, constraints, índices, cascadas y volumen/compatibilidad esperados. Distingue schema Prisma, SQL aplicado y validación de aplicación.

No uses db push ni reescribas migraciones aplicadas. Propón una migración aditiva cuando sea posible, con backfill auditable, tratamiento de duplicados, validación previa/posterior y rollback. Revisa especialmente scopeKey, asignaciones/overrides, AuditLog inmutable y el efecto del seed sobre matrices editables.

Entrega SQL relevante, riesgos de datos, plan de aplicación por ambiente y pruebas. No ejecutes operaciones destructivas en una base real sin autorización explícita.
```

## Documentar cambios

```text
Actualiza la documentación interna de Calendar para reflejar este cambio ya implementado: [cambio y commits].

Lee AGENTS.md y todos los documentos .ai/. Verifica la implementación, tests, migraciones y git log; no documentes la intención si difiere del código. Actualiza solo los archivos afectados: contexto, arquitectura, negocio, módulos, datos, API, UI, permisos, desarrollo o historial.

Escribe en español, enlaza paths reales, no copies secretos y usa “Pendiente por confirmar” cuando la evidencia no alcance. Agrega una entrada a .ai/CHANGELOG_CONTEXT.md solo si cambió una decisión estable o flujo crítico.

Al final, valida que el único nombre de producto usado sea “Calendar”, que todos los paths existan, que git diff --check pase y que la documentación no contradiga schema, Server Actions o políticas actuales.
```

## Crear o editar un usuario administrado

```text
Implementa o revisa el flujo de usuario administrado de Calendar: [objetivo].

Respeta que en esta etapa no existe invitación. Un administrador crea/edita el usuario, puede generar o resetear una contraseña temporal y debe gestionar estado, rol y scope sin escalación. Lee .ai/BUSINESS_RULES.md, .ai/PERMISSIONS.md y .ai/API_GUIDE.md.

Valida email, contraseña temporal y alcance con Zod; no permitas auto-mutación ni rol de prioridad igual/mayor; autoriza dentro de transacción; protege al último administrador; no escribas la contraseña en AuditLog; fuerza mustChangePassword y confirma acciones sensibles con Dialog.

Prueba ACTIVE, PENDING, SUSPENDED, contraseña temporal, rol personalizado, scope ajeno y concurrencia de asignación.
```

## Evaluar documentación desactualizada

```text
Audita la documentación .ai/ de Calendar contra el código actual sin modificar producto.

Contrasta package.json, estructura, rutas, auth, autorización, Prisma, migraciones, seed, componentes y tests. Produce una tabla: documento/sección, afirmación, evidencia actual, coincide, corrección propuesta. No interpretes documentos históricos como estado vigente.

Aplica solo correcciones verificables, registra incertidumbres y ejecuta validaciones de paths, secretos, nombre del producto y git diff --check.
```
