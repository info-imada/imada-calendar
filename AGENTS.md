# Calendar

Calendar es la aplicación operativa de Soporte Técnico LATAM para planificar actividades, coordinar técnicos y administrar acceso por roles, permisos y alcance territorial.

## Instrucciones obligatorias para agentes

Antes de modificar cualquier archivo:

1. Lee [`.ai/AGENTS.md`](.ai/AGENTS.md).
2. Lee [`.ai/PROJECT_CONTEXT.md`](.ai/PROJECT_CONTEXT.md), [`.ai/BUSINESS_RULES.md`](.ai/BUSINESS_RULES.md) y [`.ai/ARCHITECTURE.md`](.ai/ARCHITECTURE.md).
3. Consulta [`.ai/MODULES.md`](.ai/MODULES.md) para localizar el módulo afectado.
4. Si la tarea toca autenticación, datos, Server Actions o acceso, lee [`.ai/PERMISSIONS.md`](.ai/PERMISSIONS.md), [`.ai/DATABASE.md`](.ai/DATABASE.md) y [`.ai/API_GUIDE.md`](.ai/API_GUIDE.md).
5. Si toca interfaz, lee [`.ai/UI_GUIDE.md`](.ai/UI_GUIDE.md).
6. Antes de ejecutar o entregar, sigue [`.ai/DEVELOPMENT_GUIDE.md`](.ai/DEVELOPMENT_GUIDE.md) y revisa [`.ai/CHANGELOG_CONTEXT.md`](.ai/CHANGELOG_CONTEXT.md).

## Reglas generales

- Trabaja en la rama `master`; no uses worktrees aislados.
- Verifica el comportamiento en código actual. Los documentos históricos son contexto, no autoridad superior al código.
- No supongas capacidades por el nombre del rol: resuelve permisos efectivos y alcance del recurso.
- Toda autorización sensible debe validarse en el servidor; ocultar un control en la UI no protege la operación.
- No expongas secretos, credenciales, hashes ni valores de `.env`.
- No edites migraciones ya aplicadas ni omitas AuditLog en mutaciones sensibles.
- Conserva cambios ajenos y limita el diff al alcance solicitado.
- Ejecuta las verificaciones proporcionales al cambio antes de declarar que está completo.

Consulta [`.ai/PROMPTS.md`](.ai/PROMPTS.md) para plantillas de trabajo reutilizables.
