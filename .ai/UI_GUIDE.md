# Guía de interfaz y experiencia de usuario

## Propósito

Este documento describe el sistema visual que existe hoy en Calendar y las reglas que deben respetarse al modificar una pantalla. No sustituye la inspección del componente afectado: antes de cambiar UI, lee también `.ai/MODULES.md`, el archivo de página y los componentes de producto que esa página reutiliza.

## Tecnologías de interfaz

- React 19 y Next.js App Router.
- Tailwind CSS 4 para estilos utilitarios y tokens CSS.
- ShadCN UI con estilo `base-nova`, apoyado en Radix UI y Base UI.
- Lucide React para iconografía.
- Sonner para notificaciones.
- React Big Calendar para las vistas operativas de calendario.
- `next-themes` para tema claro/oscuro mediante clase en el elemento raíz.

Los componentes ShadCN instalados viven en `src/components/ui/`. Antes de crear un control custom, comprueba si ya existe allí un primitivo accesible equivalente.

## Tokens y temas

La fuente de verdad es `src/app/globals.css`. La configuración de tema está en `src/components/providers/theme-provider.tsx` y el control de cambio de tema forma parte del shell.

### Paleta

- Marca: `#34B27B`.
- Oscuro: superficies neutrales, con fondo base `#171717` y tarjetas cercanas a `#1c1c1c`.
- Claro: superficies neutrales, con fondo base `#f7f7f7` y tarjetas blancas.
- El verde de marca se reserva para acciones primarias, foco, navegación activa y estados con significado positivo. No debe teñir los fondos neutrales.
- Éxito, advertencia, peligro e información usan colores semánticos distintos. No representes todos los estados con verde.

Los dos temas usan clases `.dark` y `.light`; no introduzcas selectores que dependan de la ausencia de una clase sin revisar primero `ThemeProvider`.

### Tipografía

- `Manrope`: títulos y texto de display.
- `DM Sans`: interfaz y cuerpo.
- `JetBrains Mono`: datos monoespaciados, atajos o valores técnicos.

Los encabezados de página son compactos. Mantén eyebrow, título, descripción y acciones dentro de una franja de baja altura; evita H1 sobredimensionados.

### Bordes, foco y superficies

- Los controles deben diferenciarse del fondo en ambos temas mediante los tokens de input/borde existentes.
- Todo control interactivo debe conservar `focus-visible` claro con el color de marca.
- Evita sombras pesadas y contenedores anidados sin propósito.
- Las toolbars operativas no deben parecer una tarjeta: fondo transparente, sin padding exterior artificial; organiza sus grupos mediante alineación, gaps y divisores sutiles.

## Componentes de producto compartidos

`src/components/product/` contiene los patrones preferidos:

| Componente/patrón | Uso |
| --- | --- |
| `PageContainer` | Ancho, espaciado y estructura de página. |
| `PageHeader` | Eyebrow, título, descripción y acciones consistentes. |
| `OperationalToolbar` / `FilterBar` | Búsqueda, filtros, vistas y acciones secundarias. |
| `StatSummary` | Métricas compactas tipo pill, no KPI cards vacías. |
| `ResponsiveSheet` | Drawer en móvil y Sheet en pantallas mayores. |
| `FormSection` | Agrupación temática uniforme de formularios. |
| `ConfirmActionDialog` | Confirmación de acciones sensibles o destructivas. |
| `DetailSection`, `DetailField`, `DetailBadgeRow` | Jerarquía consistente en paneles de detalle. |
| `ResponsiveDataView` | Alternancia entre tabla densa y representación móvil. |
| estados de carga/vacío/error | Feedback uniforme con Skeleton, Empty State y Alert. |
| badges semánticos | Estado, prioridad y alcance con significado consistente. |

Reutiliza estos patrones antes de duplicarlos dentro de un módulo. Si un cambio transversal es necesario, valida todos sus consumidores.

## Layout responsive

Los tres rangos que deben verificarse explícitamente son:

- móvil: menos de 640 px;
- tablet: 640–1024 px;
- escritorio: más de 1024 px.

Reglas:

1. No debe existir overflow horizontal de página.
2. En móvil, acciones primarias y controles táctiles deben conservar área cómoda; los filtros secundarios pueden pasar a Drawer.
3. En tablet, las toolbars pueden ocupar dos filas deliberadas, pero nunca cortar selects o labels.
4. En escritorio, aprovecha el ancho sin inflar tarjetas ni crear grandes áreas vacías.
5. Tablas densas deben transformarse en filas/tarjetas legibles en móvil cuando el scroll horizontal no sea la mejor experiencia.
6. El scroll interno sí es válido para superficies naturalmente densas, como semana/técnicos de React Big Calendar.
7. Un Sheet lateral se convierte en Drawer móvil mediante `ResponsiveSheet`; no implementes dos flujos funcionales distintos.

## Formularios

### Controles

Usa los componentes de `src/components/ui/`:

- `Input` para texto;
- `Textarea` para texto largo;
- `Select` para opciones cerradas;
- `Checkbox`, `Switch` o `RadioGroup` según la semántica;
- `Calendar` dentro de `Popover` para fecha y rangos; en móvil usa el patrón responsive existente cuando el popover sea incómodo;
- componentes ShadCN para hora; no vuelvas a introducir controles HTML nativos sin revisar accesibilidad y consistencia.

React Big Calendar no debe reemplazarse por `Calendar`: cumplen funciones distintas.

### Organización

- Agrupa campos por significado con `FormSection`, título breve y ayuda contextual.
- Mantén un espaciado compacto y regular.
- Todo campo vacío debe tener placeholder específico y útil, no un ejemplo genérico.
- Los labels no se sustituyen por placeholders.
- Errores de Zod deben mostrarse junto al campo o en un Alert comprensible.
- Inicio/fin deben validar que el fin sea estrictamente posterior al inicio.
- Las acciones persistentes del Sheet/Drawer deben quedar en un footer claro, sin tapar contenido.

### Acciones sensibles

Suspender usuarios, revocar asignaciones, cambiar permisos, cancelar actividades y otras acciones sensibles requieren `Dialog` de confirmación. El resultado debe comunicarse con Sonner; los fallos de sistema o autorización deben usar mensajes explícitos, no silencios ni errores genéricos.

## Fechas, horas y texto

- La zona horaria operativa por defecto es `America/Panama`, salvo que el dato indique otra.
- Usa formatos compactos en paneles angostos, por ejemplo `30 jul 2026 · 9:00 a. m.`.
- Evita romper una fecha por la mitad; cambia el grid a una columna si no hay ancho.
- Los títulos largos deben truncarse solo cuando exista una vía evidente para ver el contenido completo.
- Mantén textos, labels y feedback en español.

## Estados de una pantalla

Cada módulo debe contemplar:

- carga mediante Skeleton o fallback de streaming;
- estado vacío con explicación y acción pertinente;
- error recuperable con Alert y, cuando aplique, reintento;
- acceso denegado explícito;
- éxito mediante toast;
- controles deshabilitados mientras una mutación está pendiente.

No muestres una pantalla vacía para representar un 403 o una colección sin registros.

## UI guiada por permisos

La visibilidad y habilitación de acciones depende de permisos efectivos, no del nombre del rol. Ejemplos:

- nueva actividad: `activity:create`;
- editar/cambiar estado/cancelar: `activity:update` sobre el recurso;
- reasignar: `activity:assign`;
- comentar: `activity:comment`;
- gestión de equipo: `team:manage` dentro del alcance;
- administración global: predicado descrito en `.ai/PERMISSIONS.md`.

Ocultar un botón mejora UX, pero no reemplaza la autorización de servidor.

## Accesibilidad

- Conserva nombres accesibles en icon buttons (`aria-label` o texto oculto).
- Asocia labels y errores con sus campos.
- Mantén navegación por teclado, orden de foco y cierre predecible de Dialog/Sheet/Popover.
- No uses solo color para comunicar estado.
- Revisa contraste en claro y oscuro, especialmente inputs, bordes, badges y texto secundario.
- Los triggers compuestos de Base UI/Radix deben tener un único elemento interactivo; evita anidar botones o enlaces.

## Calendario

`src/features/calendar/` integra React Big Calendar. Al modificarlo:

- conserva las vistas mes, semana y técnicos;
- crea/edita con el mismo formulario responsive de actividades;
- reutiliza validación y detección de solapamiento del dominio;
- mantén filtros de país/técnico condicionados al alcance;
- prueba selección, navegación, eventos largos y scroll en los tres breakpoints y ambos temas.

## Checklist de UI

- [ ] Reutilicé componentes de producto y ShadCN existentes.
- [ ] No introduje controles nativos inconsistentes.
- [ ] La acción se oculta o deshabilita por permiso efectivo y el servidor vuelve a autorizarla.
- [ ] Carga, vacío, error, acceso denegado y éxito están resueltos.
- [ ] Probé claro y oscuro.
- [ ] Probé menos de 640 px, 640–1024 px y más de 1024 px.
- [ ] No hay overflow horizontal de página.
- [ ] Formularios tienen labels, placeholders útiles, validación y foco visible.
- [ ] Acciones sensibles piden confirmación.
- [ ] No alteré la lógica de Prisma, permisos o auditoría por un cambio puramente visual.
- [ ] En móvil, labels de secciones largas usan Select o controles que envuelven texto; no fuerzan tabs horizontales fuera de pantalla.
- [ ] Drawer/Sheet, grids y acciones tienen `min-w-0`; a 320 px los CTA ocupan el ancho disponible y no se solapan.

## Pendiente por confirmar

- No hay pruebas visuales automatizadas versionadas actualmente; las capturas históricas no sustituyen una regresión visual repetible.
- No se encontró una especificación formal de contraste WCAG objetivo; usa al menos WCAG AA como criterio de revisión hasta que producto defina otro.
- No se encontró Storybook ni catálogo visual ejecutable.

## Registro de tarea

La pantalla es mobile-first: CTA de jornada en ancho completo, `FormActions` sticky, filtros en Drawer móvil, tarjetas hasta 639 px y tabla densa desde escritorio. Se usan controles nativos accesibles para fechas/selects, foco visible, estados de carga y mensajes en español. Adjuntos muestran imágenes con `object-fit: contain` y videos como enlaces reproducibles. Revisar manualmente 320 px, ambos temas, teclado y ausencia de overflow horizontal antes de liberar.
