# Usuarios gestionados y autenticación — Diseño

## Objetivo

Incorporar en `/team` un flujo completo para crear y editar usuarios sin implementar invitaciones, integrándolo con los roles, alcances, estados, credenciales y permisos dinámicos existentes. Modernizar además `/login` con una experiencia compacta, profesional y responsive, manteniendo Zoho como acceso principal e incorporando el recurso `public/zoho-svgrepo-com.svg`.

## Decisión de producto

La creación admite dos métodos de acceso seleccionables:

1. **Zoho**: crea previamente la identidad por correo, sin credencial local. El usuario podrá vincular su cuenta en el primer acceso con Zoho.
2. **Cuenta local**: crea una `UserCredential` con contraseña temporal generada en el servidor y `mustChangePassword = true`. La contraseña se devuelve y muestra una sola vez al administrador; la aplicación no envía correos ni genera invitaciones.

El formulario exige un rol inicial y un alcance válido. Así, una cuenta marcada como activa nunca queda creada accidentalmente sin capacidades. El estado inicial se puede elegir entre `ACTIVE` y `PENDING`; `SUSPENDED` queda reservado para la gestión posterior.

## Autorización y seguridad

- Solo un administrador con acceso administrativo global puede crear identidades, editar nombre/correo o elegir el método de autenticación inicial.
- La creación no permite autoobjetivo porque el usuario aún no existe, pero sí aplica la misma regla de anti-escalación de `assignUserRole`: el rol inicial debe tener prioridad estrictamente inferior a la del actor.
- El alcance inicial puede ser `GLOBAL`, `COUNTRY` o `TEAM`; se valida su coherencia y existencia en la misma transacción.
- La creación de `User`, `UserCredential` cuando corresponda, `UserRoleAssignment` y `AuditLog` es atómica.
- El correo se normaliza con `trim().toLowerCase()` y debe ser único.
- La contraseña temporal usa el generador criptográfico existente, se almacena solo como hash bcrypt y nunca se escribe en `AuditLog`.
- Editar un usuario no permite modificar al propio actor.
- El nombre se puede editar siempre que el actor esté autorizado. El correo solo se puede editar si el usuario no tiene una cuenta OAuth Zoho vinculada; esto evita desincronizar la identidad del proveedor.
- Cambiar el correo vuelve a validar unicidad dentro de la transacción.
- La edición no cambia roles, overrides ni estado de acceso silenciosamente. Esas operaciones permanecen en sus controles explícitos con confirmación.
- Toda creación y edición genera `AuditLog` con actor, entidad, acción y metadata antes/después, excluyendo secretos.

## Contratos del servidor

Se añaden esquemas Zod discriminados:

- `managedUserCreateInputSchema`: nombre, correo, estado inicial, método `ZOHO | LOCAL`, rol y alcance discriminado.
- `managedUserUpdateInputSchema`: `userId`, nombre y correo.

Se añaden Server Actions:

- `createManagedUser(input)`: devuelve `{ success: true, entityId, temporaryPassword? }` o el error tipado ya usado por autorización.
- `updateManagedUser(input)`: devuelve `{ success: true, entityId }` o error tipado.

Los conflictos de correo devuelven `CONFLICT`; validación, ausencia de entidad y autorización conservan los códigos `VALIDATION`, `NOT_FOUND` y `FORBIDDEN`. Las acciones revalidan `/team` y `/settings` al completar.

No se requiere una migración de Prisma: `User`, `UserCredential`, `Account`, `UserRoleAssignment` y `AuditLog` ya contienen la estructura necesaria. El tipo de autenticación se deriva de la existencia de `credential` y de cuentas Zoho; no se duplica como una columna adicional.

## Experiencia de `/team`

### Listado y acciones

- El encabezado incorpora **Nuevo usuario** como acción primaria solo para `ADMIN GLOBAL`.
- Cada fila mantiene la apertura del detalle y añade una acción accesible **Editar usuario** para administradores globales, sin convertir toda la fila en controles anidados.
- En móvil, crear y editar usan `Drawer`; en tablet/escritorio usan el `ResponsiveSheet` compartido.

### Formulario de creación

El formulario se organiza en secciones consistentes:

1. **Identidad**: nombre y correo con placeholders específicos.
2. **Método de acceso**: selector Zoho/local con explicación contextual.
3. **Rol y alcance inicial**: rol, alcance y selectores condicionales de país/equipo.
4. **Estado inicial**: activo o pendiente, con aviso de las consecuencias.

Antes de guardar se presenta un resumen compacto. El submit bloquea dobles envíos y muestra feedback con Sonner. Los errores de validación aparecen junto al formulario mediante `Alert`.

Para una cuenta local, el Sheet no se cierra al completar: cambia a un estado de éxito que muestra la contraseña temporal una sola vez, con botón **Copiar** y advertencia de custodia. Al cerrar, el secreto se elimina del estado del cliente. Para Zoho, se confirma la creación y se cierra tras refrescar el listado.

### Formulario de edición

- Muestra nombre, correo y método actual en una estructura compacta.
- El correo aparece deshabilitado con explicación cuando existe una cuenta Zoho vinculada.
- Roles, permisos, estado y contraseña no se mezclan en este formulario; se gestionan desde las secciones existentes del detalle para conservar acciones sensibles explícitas.
- Guardar cambios requiere confirmación en `Dialog` y refresca el listado/detalle.

## Experiencia de `/login`

- Contenedor centrado de ancho contenido, sin una composición promocional innecesaria.
- Encabezado de marca compacto con monograma de Calendar, título y descripción breve.
- Botón Zoho como primera acción, con fondo de superficie, borde visible, foco de marca y el icono `public/zoho-svgrepo-com.svg` renderizado con `next/image` en tamaño controlado.
- Separador visual breve antes de credenciales locales.
- Campos con placeholders, `autoComplete`, bordes claros y control accesible para mostrar/ocultar contraseña.
- Los errores se muestran con `Alert`, no como texto suelto.
- El estado de carga distingue Zoho de credenciales y evita envíos repetidos.
- Responsive explícito: padding reducido y controles de ancho completo en `<640px`; tarjeta contenida en `640–1024px`; respiración mayor sin aumentar innecesariamente la tarjeta en `>1024px`.
- Paridad de contraste y foco en temas claro y oscuro usando los tokens globales existentes, sin introducir superficies teñidas.

## Accesibilidad

- Labels asociados por `htmlFor`/`id`, mensajes de error con `role="alert"` y foco visible.
- Los controles navegables conservan semántica nativa: botones para acciones y enlaces solo para navegación.
- El icono Zoho tiene `aria-hidden` porque el nombre accesible lo aporta el texto del botón.
- Los estados deshabilitados incluyen explicación textual; el color no es el único indicador.
- Drawer/Sheet conserva título y descripción accesibles y el secreto temporal no se anuncia hasta existir.

## Pruebas y verificación

### Servidor

- Creación local atómica con hash, `mustChangePassword`, rol y auditoría.
- Creación Zoho sin `UserCredential`.
- Rechazo de correo duplicado.
- Rechazo de rol de prioridad igual o mayor.
- Rechazo de alcance fuera de la autorización aplicable.
- Rollback completo si falla la asignación inicial.
- Edición de nombre/correo con auditoría.
- Rechazo de autoedición y de cambio de correo con cuenta Zoho vinculada.
- Confirmación de que nunca se registra una contraseña en auditoría.

### Interfaz

- El botón **Nuevo usuario** solo aparece para administrador global.
- El formulario muestra/oculta campos según método y alcance.
- La contraseña temporal aparece una sola vez y puede copiarse.
- Editar usuario respeta el bloqueo de correo Zoho.
- El login contiene el recurso visual Zoho, mantiene ambos proveedores y comunica errores con `Alert`.
- No se generan diagnósticos de Base UI por semántica incorrecta.

### Calidad final

- Suite Vitest completa.
- ESLint y build de producción.
- Verificación manual de `/team` y `/login` en claro/oscuro para móvil, tablet y escritorio, comprobando ausencia de overflow horizontal, foco, apertura/cierre de Sheet/Drawer y estados de carga/error/éxito.

## Fuera de alcance

- Invitaciones por correo, enlaces mágicos o tokens de invitación.
- Envío de credenciales por email, Slack u otro canal.
- Cambio del proveedor Zoho ya vinculado.
- Eliminación física de usuarios; se mantiene la suspensión como mecanismo reversible.
- Edición de roles u overrides dentro del formulario de perfil; continúan en los flujos especializados actuales.
