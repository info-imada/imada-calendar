# Calendar — Sistema Balanceado y refactor de Agenda

## Objetivo

Introducir un sistema visual compacto inspirado en la densidad y claridad de Supabase, adaptado a la marca Calendar (`#34B27B`), y aplicarlo primero al módulo Agenda sin modificar permisos, Prisma, auditoría, filtros, drag and drop ni reglas de negocio existentes.

## Contrato de tema

Se conservará el mecanismo explícito por clases de `next-themes`:

- `ThemeProvider` mantiene `attribute="class"`, `defaultTheme="dark"` y `enableSystem={false}`.
- Los temas estándar de `next-themes` son `light` y `dark`; sin una propiedad `value`, la biblioteca aplica directamente `.light` o `.dark` sobre `<html>`.
- No se añadirá `value={{ light: "light", dark: "dark" }}` porque sería una asignación identidad redundante.
- El bloque oscuro seguirá usando `:root, .dark` para que el render inicial tenga una base oscura coherente con `defaultTheme="dark"`.
- El bloque `.light`, declarado después, sobrescribirá los valores del tema oscuro cuando el usuario seleccione modo claro.
- No se usará `:root:not(.dark)`, porque durante el render previo a la hidratación la ausencia temporal de `.dark` podría activar colores claros aunque el tema predeterminado sea oscuro.

## Estrategia de merge de tokens

`globals.css` se editará sobre los bloques existentes; no se agregará un segundo conjunto de variables en paralelo.

- Cada variable tendrá una sola declaración por tema.
- Se preservarán `--brand-rgb`, `--success-rgb`, `--warning-rgb`, `--danger-rgb` y `--info-rgb`, porque alimentan estados, calendario y superficies semánticas.
- La revisión actual del repositorio no encuentra `--stage-rgb`, `--delivered-rgb`, `.tone-*` ni `.bg-*-soft`. No se inventarán valores sin un consumidor real. Si aparecen antes del merge, se conservarán y se integrarán en el mismo bloque semántico.
- Las clases `.status-*` y los estados del calendario seguirán consumiendo las mismas variables RGB, sin colores duplicados dentro de componentes.
- Los nuevos tokens de borde, superficie, densidad y tipografía se añadirán una sola vez y serán compartidos por ambos temas.
- Los primitivos ShadCN/Base UI conservarán sus estados `disabled`, `aria-invalid`, hover y focus; únicamente cambiarán sus valores visuales mediante tokens.

## Tokens Balanceados

### Tipografía

- Título de página: `clamp(1.375rem, 1.2rem + 0.35vw, 1.625rem)`, peso 600, interlineado 1.2.
- Título de sección: `0.875rem`, peso 600.
- Cuerpo: `0.875rem`, interlineado 1.45.
- Caption: `0.75rem`.
- Overline: `0.625rem`, peso 700 y tracking `0.08em`.
- Manrope continúa para títulos; DM Sans para interfaz; JetBrains Mono para cifras y horarios.

### Geometría y densidad

- Radios: 6 px, 8 px, 10 px, 12 px y 14 px.
- Separación de página: 14–20 px responsive.
- Separación de sección: 12 px.
- Separación label/control: 6 px.
- Control de formulario: 36 px; filtros compactos: 32 px; móvil: 40 px visuales con objetivo táctil mínimo de 44 px cuando corresponda.
- Fila de tabla desktop: 40 px; móvil: mínimo 44 px.
- Sombras eliminadas en superficies ordinarias; reservadas para popovers, sheets y elementos flotantes.

### Superficies y contraste

- Oscuro: fondo verde-negro, cards `#131B17`, superficies internas `#17211C` y borde de control fuerte `#3B5145`.
- Claro: fondo `#F7F9F8`, cards blancas, superficies internas `#F2F5F3` y borde de control fuerte `#B8C7BF`.
- Focus: borde `#34B27B` y halo de marca al 18 %.
- La marca se mantiene como acción primaria; estados semánticos conservan sus familias RGB actuales.

## Aplicación inicial: Agenda

### Header

- Eyebrow, título, descripción y acciones se compactan en una franja de baja altura.
- En desktop, información y acción primaria comparten una fila.
- En móvil, el CTA permanece visible y ocupa solo el ancho necesario salvo que el espacio obligue a una segunda fila.

### KPI pills

- `StatSummary` recibirá una variante `pill` para migrar Agenda sin cambiar todavía Calendario, Actividades o Administración.
- Cada pill mostrará icono de 14 px, valor tabular destacado y etiqueta breve.
- Tres pills cabrán en una fila móvil cuando el contenido lo permita; cuatro o más usarán desplazamiento horizontal intencional, sin wrap irregular.
- No habrá helper text permanente dentro del pill; la información secundaria se resolverá con texto accesible o tooltip cuando aporte valor.

### Filtros

- Búsqueda, país, técnico, estado y rango de fecha compartirán altura, radio y separación.
- Desktop y tablet usarán una toolbar compacta alineada.
- Móvil conservará el Drawer actual para filtros, con controles de 40 px y acción clara para ver resultados.

### Lista y Kanban

- Las columnas Kanban reducirán padding y espacio vacío, manteniendo objetivos de arrastre y acciones por teclado.
- Las tarjetas de actividad usarán borde sutil, jerarquía de título/fecha/asignado y badges semánticos existentes.
- La vista de lista reducirá altura de fila y mantendrá la presentación mobile basada en cards.
- Se preservarán drag and drop, cambio optimista de estado, rollback, toast y accesibilidad de “Mover a…”.

### Formulario de actividad

- Las secciones Detalles, Programación, Asignación y Recurrencia conservarán su estructura funcional y adoptarán una densidad de 12 px.
- Inputs, Select, Calendar, TimePicker, Checkbox y Textarea usarán superficies y bordes del nuevo sistema.
- La hora final debe ser estrictamente posterior a la inicial.
- Una actividad que cruza medianoche requiere seleccionar explícitamente el día siguiente; no se interpretará automáticamente `01:00` como el día posterior.
- La incoherencia se mostrará junto a Programación antes del envío y seguirá siendo validada por el esquema Zod/acción del servidor.

## Alcance y aislamiento

- `globals.css` recibirá los tokens globales y el merge semántico.
- Los cambios estructurales de componentes compartidos se introducirán mediante variantes opt-in utilizadas inicialmente por Agenda.
- No se rediseñarán todavía Calendario, Actividades, Equipo ni Administración.
- No se modificarán modelos Prisma, permisos, auditoría ni contratos de Server Actions salvo la validación explícita de coherencia temporal ya solicitada.

## Verificación

### Automatizada

- Tests de componentes existentes de Agenda.
- Test de la variante compacta de header y KPI pills.
- Tests del formulario para fin igual/anterior al inicio y cruce de medianoche explícito.
- Suite completa de Vitest, TypeScript, lint y build.

### Visual

Se capturará Agenda en modo claro y oscuro en:

- Móvil: 390 × 844 px.
- Tablet: 768 × 1024 px.
- Desktop: 1440 × 900 px.

Cada captura verificará contraste, focus, bordes, densidad, ausencia de overflow documental, toolbar, KPI pills, lista/Kanban y Sheet/Drawer. Las seis capturas se entregarán antes de iniciar Calendario.

## Criterios de aceptación

- El selector de tema produce `.light` y `.dark` sobre `<html>` y ambos temas son legibles.
- No hay variables semánticas eliminadas ni duplicadas dentro del mismo tema.
- El header y los KPIs ocupan notablemente menos altura que en las capturas actuales.
- Agenda conserva toda la funcionalidad validada.
- El formulario impide intervalos temporales inválidos con feedback inmediato y validación de servidor.
- Los tres breakpoints funcionan sin overflow de página y cuentan con captura clara y oscura.
