# Calendar — Diseño de documentación para agentes de IA

## Objetivo

Crear una capa de documentación interna, en español y basada en el código vigente, que permita a una IA o a un desarrollador comprender rápidamente el producto, su arquitectura, sus reglas operativas y sus límites de seguridad antes de modificarlo.

## Evidencia vigente

La documentación se derivará de estas fuentes primarias:

- `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `tsconfig.json`, `next.config.ts`, `components.json`, `prisma.config.ts` y `.env.example`.
- `prisma/schema.prisma`, `prisma/seed.ts`, `prisma/seed-data.ts` y todas las migraciones versionadas.
- Rutas y layouts de `src/app/`, Server Actions de `src/app/actions/` y proxy de `src/proxy.ts`.
- Autenticación, permisos, políticas, auditoría y validaciones de `src/lib/`.
- Módulos de producto en `src/features/`, componentes compartidos en `src/components/` y tokens de `src/app/globals.css`.
- Pruebas Vitest existentes bajo `src/` y documentos históricos en `docs/`.
- Historial Git reciente, usado solo para decisiones comprobables.

No existe `README.md` en el estado auditado del repositorio. No se creará dentro de este alcance. Los comandos de `package.json` que todavía apuntan a la carpeta eliminada `scripts/` se registrarán como una inconsistencia pendiente, no se corregirán como parte de esta tarea documental.

## Arquitectura documental

La documentación tendrá tres niveles:

1. `AGENTS.md` en la raíz: entrada breve, orden de lectura y reglas obligatorias.
2. `.ai/AGENTS.md`: protocolo operativo completo para agentes.
3. Documentos especializados en `.ai/`: contexto, arquitectura, negocio, módulos, datos, APIs, UI, permisos, desarrollo, historial y prompts.

Cada documento especializado contendrá, cuando aplique:

- propósito;
- fuentes verificadas;
- comportamiento confirmado;
- convenciones y riesgos;
- archivos que deben revisarse antes de cambiar el dominio;
- referencias cruzadas;
- una sección `Pendiente por confirmar` para incertidumbres reales.

## Responsabilidad de cada archivo

- `AGENTS.md`: entrada canónica para cualquier agente y orden mínimo de lectura.
- `.ai/AGENTS.md`: método de análisis, implementación, seguridad, verificación y entrega.
- `.ai/PROJECT_CONTEXT.md`: producto, problema, usuarios, flujo empresarial y límites conocidos.
- `.ai/ARCHITECTURE.md`: stack, carpetas, límites RSC/cliente/servidor, flujo de datos y patrones.
- `.ai/BUSINESS_RULES.md`: autenticación, actividades, recurrencia, solapamientos, auditoría, usuarios y catálogos.
- `.ai/MODULES.md`: mapa por módulo con rutas, archivos, dependencias y cautelas.
- `.ai/DATABASE.md`: Prisma/PostgreSQL, modelos, relaciones, constraints, migraciones, seed y riesgos.
- `.ai/API_GUIDE.md`: Route Handlers, NextAuth, Server Actions, contratos de resultado, errores y autorización.
- `.ai/UI_GUIDE.md`: sistema visual, ShadCN/Base UI, formularios, estados, responsive, accesibilidad y tema.
- `.ai/PERMISSIONS.md`: roles, prioridades, matriz seed, scopes, overrides, anti-escalación y protección del último administrador.
- `.ai/DEVELOPMENT_GUIDE.md`: instalación, entorno, comandos vigentes, pruebas, migraciones y checklist.
- `.ai/CHANGELOG_CONTEXT.md`: decisiones comprobables, documentos históricos, cambios recientes y pendientes.
- `.ai/PROMPTS.md`: prompts reutilizables que obligan a leer contexto, citar evidencia y verificar cambios.

## Reglas de exactitud

- El nombre único del producto es **Calendar**; cualquier denominación distinta debe tratarse como un error de contexto.
- No se copiarán valores de `.env`, credenciales, tokens, contraseñas, hashes ni cadenas de conexión.
- Se documentará únicamente la funcionalidad presente en código o respaldada por migraciones/pruebas vigentes.
- Los documentos históricos se citarán como historial, no como fuente automática del estado actual.
- Los hallazgos históricos de E2E se contrastarán con el código actual antes de declararlos vigentes.
- Las rutas eliminadas `e2e/` y `scripts/` no se presentarán como infraestructura disponible; cualquier referencia residual se marcará como pendiente.
- No se modificará lógica de negocio, esquema, migraciones, UI ni configuración funcional.

## Navegación y mantenimiento

Los documentos usarán enlaces relativos y una sección de “Archivos que debes leer” para reducir búsquedas. Cuando una regla cambie, la implementación y el documento especializado correspondiente deben actualizarse en el mismo cambio; `CHANGELOG_CONTEXT.md` recibirá una nota solo si la decisión tiene impacto transversal o histórico.

## Verificación

La entrega se validará con:

- existencia de los doce archivos solicitados;
- búsqueda de nombres incorrectos, placeholders ambiguos y posibles secretos;
- comprobación de enlaces relativos a archivos del repositorio;
- comparación de roles, permisos, rutas, modelos y comandos contra sus fuentes;
- `git diff --check`;
- `npm run build` para confirmar que la documentación no afecta el producto;
- revisión del diff para garantizar que no haya cambios de lógica.

## Pendiente por confirmar

- Propietarios empresariales y técnicos del producto.
- Entornos de despliegue y proceso CI/CD vigente; no hay configuración de CI versionada.
- Política formal de branches, commits y releases; solo se observa la rama `master` y convenciones de mensajes en el historial.
- Destino definitivo de los comandos residuales que dependen de `scripts/`.
- Alcance funcional futuro de notificaciones y ausencias, cuyos modelos existen pero no tienen módulos completos visibles en la navegación actual.
