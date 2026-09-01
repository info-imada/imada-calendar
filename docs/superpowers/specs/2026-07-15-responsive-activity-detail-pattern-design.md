# Patrón responsive de detalle de actividad

**Fecha:** 15 de julio de 2026

**Estado:** Aprobado para planificación técnica

**Alcance de esta fase:** patrón compartido de detalle y su primera aplicación en Actividades

## Contexto

El detalle de actividad actual presenta información correcta y conserva la lógica operativa validada, pero mezcla tratamientos visuales: badges dentro de la cabecera y próximos al cierre, programación y asignación en una misma tarjeta, descripción sin contenedor, recurrencia y ciclo de vida como alertas independientes, y trazabilidad como texto suelto. En anchos estrechos, las fechas se dividen de forma incómoda.

Esta fase corrige la arquitectura de información del detalle sin cambiar Prisma, Server Actions, permisos, auditoría, comentarios, validaciones o reglas de mutación de actividades cerradas.

## Objetivos

1. Establecer un patrón compartido y composable para detalles operativos.
2. Dar a cada agrupación temática el mismo tratamiento visual.
3. Evitar cortes de fecha y valores ambiguos en todos los breakpoints.
4. Mantener accesibilidad, densidad y comportamiento táctil adecuados.
5. Conservar toda la funcionalidad y los permisos existentes.
6. Crear una base reutilizable para los detalles posteriores de Equipo y Administración.

## Decisión de arquitectura

Se implementarán primitivos semánticos compartidos sobre el sistema existente:

- `ResponsiveSheet`: se reutilizará como contenedor adaptativo.
- `DetailSection`: sección temática uniforme con título, icono opcional y contenido.
- `DetailField`: par label/valor con soporte de icono, contenido ausente y control de wrapping.
- `DetailBadgeRow`: banda de metadatos superior con grupos semánticos.

No se usará un renderizador genérico basado en configuración. Los primitivos serán composables para permitir que cada detalle conserve su contenido y acciones específicas sin duplicar el lenguaje visual.

## Comportamiento responsive

### Móvil: menos de 640 px

- Drawer inferior con `max-height` basado en `dvh`, handle visible y scroll interno.
- Cabecera, tabs y contenido permanecen dentro del Drawer; el documento no adquiere overflow horizontal.
- Campos de programación y asignación pasan a una columna cuando el ancho no permite dos valores legibles.
- Los badges pueden ocupar dos filas completas sin invadir el área de cierre.
- Controles y acciones conservan un área táctil mínima de 44 px.

### Tablet y escritorio: 640 px o más

- Sheet lateral derecho, con ancho completo limitado a `max-w-2xl`.
- Programación y ubicación/responsable pueden usar dos columnas.
- El contenido mantiene scroll interno y no desplaza la página subyacente.

## Jerarquía de cabecera

La cabecera se organiza en tres niveles:

1. **Identificación:** eyebrow `Detalle de actividad`, título de la actividad y subtítulo `tipo · país`.
2. **Metadatos:** fila separada debajo del título. Estado y prioridad forman el grupo principal; recurrencia queda como metadato secundario y puede pasar a otra línea en móvil.
3. **Navegación:** tabs `Resumen`, `Comentarios` y `Auditoría`, separados visualmente del encabezado.

El botón de cierre conserva una zona exclusiva y accesible. Ningún badge se sitúa junto a él.

## Secciones del resumen

Todas las agrupaciones usarán el mismo patrón de borde, radio, fondo, padding, título, espaciado y densidad.

### Programación

- Inicio y fin como `DetailField`.
- Formato compacto en español: `30 jul 2026 · 9:00 a. m.`.
- La fecha y la hora forman una unidad visual no divisible.
- Dos columnas solo cuando ambas caben; una columna en anchos estrechos.

### Ubicación y responsable

- País/equipo y técnico asignado como campos separados.
- Valores ausentes explícitos: `Sin equipo` o `Sin técnico asignado`.
- No se mostrarán celdas vacías.

### Descripción

- Contenedor idéntico al resto de secciones.
- Texto con line-height legible y wrapping natural.
- Estado ausente explícito: `Sin descripción`.

### Recurrencia

- Visible solo para actividades recurrentes.
- Presenta frecuencia, intervalo y fecha final con lenguaje legible.
- No se representa como una alerta si no requiere una acción del usuario.

### Estado del ciclo de vida

- Centraliza el estado operativo de una actividad cerrada y su explicación.
- Conserva tono semántico e iconografía apropiados.
- Mantiene la regla existente que oculta cambios de estado, edición y cancelación cuando la actividad ya no admite mutaciones.
- La trazabilidad de creación se integra como metadato secundario dentro de esta agrupación o en un pie visualmente ligado a ella, nunca como texto flotante.

## Comentarios y auditoría

- No se modifican endpoints, acciones, permisos ni estructura de datos.
- Los registros adoptan la misma densidad, bordes y ritmo vertical del patrón de detalle.
- Se conservan estados vacíos claros.
- El formulario de comentario mantiene su placeholder específico y feedback actual.

## Fechas y localización

Se consolidará el formato compacto en un helper compartido y probado. El formato debe ser determinista para la zona horaria operativa (`America/Panama`) y no depender de un formato numérico ambiguo del navegador.

Ejemplo esperado:

- Entrada: `2026-07-30T14:00:00.000Z`
- Salida operativa: `30 jul 2026 · 9:00 a. m.`

El helper existente se actualizará o extenderá sin cambiar la semántica temporal de los datos.

## Placeholders

La auditoría global se ejecutará módulo por módulo para respetar los puntos de aprobación solicitados.

En esta fase se revisan los campos relacionados con Actividades y se exige que todo campo editable vacío tenga orientación específica, por ejemplo:

- Título: `Ej. Mantenimiento preventivo flota Panamá`
- Descripción: `Describe el trabajo, alcance y resultado esperado`
- Comentario: `Escribe una actualización para el equipo...`

Los `Select`, date pickers y time pickers usarán mensajes de selección contextuales. No se reemplazarán labels por placeholders; ambos cumplen funciones distintas.

## Accesibilidad

- El diálogo conserva nombre accesible `Detalle de actividad`.
- Tabs, cierre, acciones y campos mantienen navegación por teclado.
- El Drawer conserva focus trap y cierre accesible.
- Los badges no serán el único medio para comunicar un estado crítico.
- Contraste y focus rings se apoyan en los tokens ya aprobados.
- Los valores no se ocultan mediante truncado cuando son esenciales para la operación.

## Estados y errores

- Carga, vacío y error conservan los componentes existentes o sus equivalentes ShadCN.
- Una actividad cerrada continúa mostrando su explicación y eliminando acciones inválidas.
- Datos opcionales ausentes se representan con texto explícito.
- Ningún error de datos deberá causar un bloque visual vacío o romper el Drawer/Sheet.

## Estrategia de pruebas

### Unitarias

- El formateador devuelve el formato compacto esperado en `America/Panama`.
- Casos de mañana, tarde y cambio de día.

### Componente

- Abre el detalle con nombre accesible correcto.
- Muestra tabs de comentarios y auditoría.
- Agrupa estado, prioridad y recurrencia fuera del área de cierre.
- Muestra las cinco secciones cuando aplican.
- Representa valores opcionales ausentes de forma explícita.
- Conserva la protección de actividades canceladas.
- El contenido usa Drawer en móvil y Sheet en tablet/escritorio.

### Regresión

- Ejecutar la suite existente de Actividades.
- Ejecutar lint y verificación TypeScript/build aplicable al proyecto.
- Confirmar que no cambian llamadas a Server Actions ni contratos de datos.

### Verificación visual

- Comparar la captura de referencia y el resultado en un montaje lado a lado.
- Capturar claro y oscuro en móvil, tablet y escritorio.
- Verificar explícitamente: ausencia de overflow horizontal, fechas sin cortes, área de cierre despejada, secciones uniformes, tabs utilizables y scroll interno.

## Fuera de alcance

- Cambios de esquema Prisma o migraciones.
- Cambios de permisos, auditoría, recurrencia o solapamiento.
- Rediseño completo de Agenda, Calendario, Equipo o Administración en esta fase.
- Auditoría de placeholders de módulos posteriores antes de su ciclo de aprobación.

## Secuencia de entrega

1. Implementar los primitivos compartidos y pruebas.
2. Aplicarlos al detalle de actividad.
3. Verificar la lógica funcional existente.
4. Realizar QA visual comparativo en los seis estados.
5. Entregar antes/después y esperar aprobación del usuario.
6. Solo después continuar con el siguiente componente o módulo.
