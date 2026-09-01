# Control Horario IMADA — documentación de integración y replicación
## 1. Propósito
Control Horario IMADA es una aplicación web para registrar jornadas de técnicos, asociarlas a clientes/ubicaciones y documentar el trabajo realizado mediante texto y archivos adjuntos. El sistema controla las horas desde el servidor, evita que el navegador envíe horas arbitrarias, mantiene borradores, notifica por correo, genera PDF y ofrece un historial unificado con exportación Excel.
Este documento describe la implementación actual y sirve como contexto técnico para replicar el mismo flujo en otra aplicación. Las capturas visuales son solo referencias; las reglas descritas aquí son la fuente funcional.
## 2. Stack y arquitectura
- **Backend:** PHP 8.3, Laravel 12, Eloquent ORM y Blade.
- **Frontend:** Blade, Tailwind CSS 4, Vite, Alpine.js/JavaScript progresivo. No existe una API REST pública: los formularios usan sesiones, CSRF y redirecciones web.
- **Base de datos:** compatible con MySQL/MariaDB en producción y SQLite para pruebas.
- **Autenticación:** sesión Laravel; usuarios activos; middleware adicional para exigir cambio de contraseña.
- **Roles:** Spatie Laravel Permission (`admin`, `tecnico`). Todo usuario nuevo recibe siempre el rol `tecnico`; puede recibir además `admin`.
- **Correo:** Laravel Mail con SMTP o transporte Resend; los correos se encolan cuando corresponde.
- **Archivos:** Cloudflare R2 mediante driver S3-compatible. El navegador sube directamente a R2 usando URLs prefirmadas.
- **PDF:** `barryvdh/laravel-dompdf` a partir de una vista Blade.
- **Excel:** `maatwebsite/excel` con un exportador basado en consulta.
- **Despliegue:** Apache sirve `/public_html/controlhorario.imadamaq.com`; el código Laravel vive en `/home/<usuario>/controlhorario_laravel`. Los assets compilados deben existir en la raíz pública que sirve Apache.
### Componentes relevantes
| Área | Archivos principales |
|---|---|
| Rutas | `routes/web.php` |
| Jornada | `app/Http/Controllers/WorkLogController.php`, `app/Models/WorkLog.php` |
| Adjuntos | `WorkLogAttachmentController.php`, `WorkLogAttachment.php` |
| Historial | `HistoryController.php`, `TimeHistoryQuery.php`, `HistoryExport.php` |
| Usuarios | `UserManagementController.php`, `User.php` |
| Clientes | `ClientController.php`, `Contacts.php`, `ClientLocation.php` |
| Hora local | `app/Support/WorkLogTime.php` |
| PDF | `app/Support/WorkLogPdf.php`, `resources/views/pdf/work_log.blade.php` |
| Correos | `app/Mail/*`, `resources/views/email/*` |
## 3. Reglas funcionales esenciales
1. El técnico pulsa **Marcar hora de inicio**. El servidor captura `now('UTC')`; nunca se acepta una hora enviada por el navegador.
2. Se crea una jornada `in_progress`, con una sola jornada activa por técnico.
3. El técnico completa los datos y puede guardar un borrador tantas veces como necesite.
4. El reinicio de inicio es opcional, solo una vez y dentro de los primeros 2 minutos. No existe pausa.
5. El primer guardado de borrador envía un correo al técnico y copia a administradores activos. El correo incluye un PDF del estado actual.
6. El técnico pulsa **Marcar hora de finalización**. Un diálogo solicita confirmación; el servidor captura el instante UTC, calcula `duration_minutes` y cambia a `completion_pending`.
7. Desde `completion_pending` no se pueden alterar las horas. El técnico completa los campos restantes y guarda definitivamente.
8. Al completar, el estado pasa a `completed`, se libera la jornada activa y se envía el correo final con PDF e imágenes.
9. Un administrador puede ver cualquier jornada. Solo puede editar datos operativos de un borrador guardado (`in_progress` con `draft_notified_at` no nulo); nunca puede editar las horas ni una jornada pendiente/finalizada.
10. Todos los tiempos se persisten como instantes UTC. Cada jornada guarda una copia de la zona horaria del técnico para que su representación no cambie si el usuario cambia de zona posteriormente.
## 4. Estados de `work_logs`
| Estado | Significado | Puede editar técnico | Puede editar admin | Notificación |
|---|---|---:|---:|---|
| `in_progress` | Inicio marcado, jornada abierta o borrador | Sí, datos y adjuntos | Solo si ya se guardó un borrador | Primer guardado: borrador |
| `completion_pending` | Finalización marcada, datos aún por completar | Sí, datos y adjuntos; horas no | No | Aún no hay correo final |
| `completed` | Datos completos y jornada cerrada | Solo lectura | Solo lectura | Correo final una sola vez |
`active_key` contiene `user:{id}` mientras el estado es activo y es `NULL` al completar. Una clave única nullable impide dos jornadas activas simultáneas por técnico.
## 5. Modelo de datos final
### `users`
Campos relevantes:
- `id` bigint PK
- `name` varchar
- `email` varchar único
- `password` varchar hash
- `must_change_password` boolean
- `is_active` boolean
- `timezone` varchar(64), por defecto `America/Panama`
- timestamps
Relaciones: `workLogs()`, `workLogAttachments()`, `activeWorkLog()` (uno activo filtrado por `in_progress`/`completion_pending`), `extratime()`, `approvals()` y roles Spatie.
### `contacts` (clientes)
- `id` bigint PK
- `name` varchar único
- timestamps
Relaciones: `locations()`, `workLogs()`, `extratime()`.
### `client_locations`
- `id` bigint PK
- `contact_id` FK a `contacts`, cascade delete
- `name` varchar
- `is_active` boolean default `true`
- timestamps
- único compuesto `(contact_id, name)`
Una ubicación seleccionada debe pertenecer al cliente actual y estar activa.
### `work_logs`
- `id` bigint PK
- `user_id` FK a `users`, cascade delete
- `client_id` FK nullable a `contacts` (nullable durante borrador; obligatorio al completar)
- `client_location_id` FK nullable a `client_locations`, null on delete
- `work_date` date: fecha local de la jornada según la zona capturada
- `timezone` varchar(64), por defecto `America/Panama`
- `started_at` datetime nullable en datos heredados, obligatorio en nuevos registros; instante UTC
- `ended_at` datetime nullable; instante UTC
- `duration_minutes` unsigned integer nullable hasta finalizar
- `status` varchar(32), por defecto `completed`
- `start_reset_used_at` datetime nullable
- `completed_at` datetime nullable
- `active_key` varchar(64) nullable, único
- `draft_notified_at` datetime nullable; evita correos de borrador duplicados
- `machine_reference` varchar nullable
- `location` varchar/text nullable
- `description` text nullable
- timestamps
Índices: `(user_id, work_date)`, `(client_id, work_date)`, `machine_reference`, `(user_id, status)` y único `active_key`.
### `work_log_attachments`
- `id` bigint PK
- `work_log_id` FK nullable; cascade delete
- `user_id` FK; cascade delete
- `upload_uuid` UUID único
- `object_key` varchar único: `registro-de-tareas/{userId}/{uuid}/{uuid}.{ext}`
- `reference_url` URL relativa nullable
- `original_name`, `mime_type`, `size_bytes`, `etag`
- timestamps
Un adjunto puede existir temporalmente con `work_log_id = NULL`. Se vincula al guardar borrador/final mediante `attachment_ids[]`, validando propietario, existencia en R2, tamaño y MIME.
### Flujo de horas extras heredado
Se conserva para compatibilidad: `extratime`, `approval_types`, `approvals` y `compensations`. El historial unificado lo muestra, aunque el acceso visible puede estar desactivado por `OVERTIME_REQUEST_BUTTON_VISIBLE=false`. No mezclar sus estados con los tres estados de `work_logs`.
## 6. Zonas horarias
### Principio
- Configuración global Laravel: `UTC`.
- Valores aceptados actualmente: `America/Panama` y `Europe/Madrid`.
- El usuario selecciona su zona en crear/editar usuario.
- Al iniciar una jornada, se captura `timezone` del usuario en `work_logs`.
- `started_at`, `ended_at`, `completed_at`, `created_at` y `updated_at` se guardan como UTC.
- La UI, historial, Excel, correo y PDF convierten el instante usando la zona almacenada en esa jornada.
- `work_date` representa la fecha local de la jornada, no la fecha UTC.
- Madrid observa automáticamente CET/CEST según la fecha.
Ejemplo: un técnico con `Europe/Madrid` marca a las 09:30 CEST. Se persiste aproximadamente `07:30 UTC`, pero se muestra `09:30 AM (Europe/Madrid, CEST)` en todos los documentos.
La migración `2026_08_31_000002_add_timezones_and_normalize_work_log_dates.php` añade las columnas y convierte registros anteriores interpretándolos como horario histórico de Panamá. Es importante no volver a convertir esos datos en una segunda migración.
`WorkLogTime` centraliza la conversión:
- `timezone(WorkLog)` obtiene la zona de la jornada con fallback a la zona del usuario y Panamá.
- `nowFor(User)` devuelve la hora actual en la zona del usuario.
- `format(value, workLog, format)` convierte un instante.
- `formatInTimezone(value, timezone, format)` sirve para consultas/exportaciones.
- `label(workLog)` devuelve, por ejemplo, `Europe/Madrid (CEST)`.
## 7. Autenticación, autorización y middleware
Rutas protegidas por `auth`, `active` y `password.changed`:
- `auth`: requiere sesión.
- `active`: rechaza usuarios con `is_active = false`.
- `password.changed`: redirige a cambio de contraseña si `must_change_password` es verdadero.
- `role:admin`: restringe administración.
`WorkLogPolicy`:
- `view`: propietario o administrador.
- `update`: propietario y estado distinto de `completed`.
- `resetStart`: propietario, estado `in_progress` y ventana vigente.
- `finish`: propietario y estado `in_progress`.
- `complete`: propietario y estado `completion_pending`.
- `adminUpdate`: administrador, estado `in_progress` y `draft_notified_at` presente.
- `delete`: administrador.
Todas las transiciones sensibles usan transacción y `lockForUpdate`. Las horas se calculan dentro de la transacción para evitar carreras.
## 8. Endpoints web
La aplicación usa formularios HTML con sesión y token CSRF. Los métodos son los siguientes (el prefijo común es `/dashboard`):
### Dashboard e historial
| Método | Ruta | Nombre | Acceso | Función |
|---|---|---|---|---|
| GET | `/` | `dashboard` | autenticado | Dashboard y banner de jornada activa |
| GET | `/history` | `dashboard.history` | autenticado | Historial unificado paginado |
| GET | `/history/export` | `dashboard.history.export` | admin | Excel con los mismos filtros |
Filtros de historial: `type` (`work_log` o vacío), `date_from`, `date_to`, `user_id` (admin), `client_id`, `reference`, `status`. La opción visible de solicitudes de horas extras se oculta del select, aunque el backend conserva compatibilidad con el valor antiguo.
### Ciclo de Registro de Tarea
| Método | Ruta | Nombre | Función |
|---|---|---|---|
| GET | `/work-logs/create` | `dashboard.work-logs.create` | Inicia formulario; si ya hay jornada activa redirige a editarla |
| POST | `/work-logs/start` | `dashboard.work-logs.start` | Crea jornada con hora/zona del servidor |
| GET | `/work-logs/{workLog}/edit` | `dashboard.work-logs.edit` | Formulario del propietario |
| PATCH | `/work-logs/{workLog}` | `dashboard.work-logs.update` | Guarda borrador y adjuntos |
| POST | `/work-logs/{workLog}/reset-start` | `dashboard.work-logs.reset-start` | Reinicio único dentro de 2 minutos |
| POST | `/work-logs/{workLog}/finish` | `dashboard.work-logs.finish` | Persiste datos actuales y marca finalización con hora UTC |
| POST | `/work-logs/{workLog}/complete` | `dashboard.work-logs.complete` | Valida campos obligatorios, completa y notifica |
| GET | `/work-logs/{workLog}` | `dashboard.work-logs.show` | Detalle para propietario/admin |
| PATCH | `/work-logs/{workLog}/admin-update` | `dashboard.work-logs.admin-update` | Edición administrativa solo de borradores guardados |
| DELETE | `/work-logs/{workLog}` | `dashboard.work-logs.destroy` | Admin elimina registro y objetos R2 |
| POST | `/work-logs/attachments/presign` | `dashboard.work-logs.attachments.presign` | Genera URLs de subida R2 |
| GET | `/work-logs/{workLog}/attachments/{attachment}` | `dashboard.work-logs.attachments.show` | Stream inline del adjunto autorizado |
| POST | `/work-logs` | `dashboard.work-logs.store` | Compatibilidad; rechaza horas manuales |
### Usuarios (admin)
| Método | Ruta | Nombre | Función |
|---|---|---|---|
| GET | `/users` | `dashboard.users` | Lista paginada |
| GET | `/users/create` | `dashboard.users.create` | Formulario con roles y zona |
| POST | `/users` | `dashboard.users.store` | Crea usuario, sincroniza roles y envía bienvenida |
| GET | `/users/{id}` | `dashboard.users.edit` | Edita cuenta, roles y zona |
| PUT | `/users/{id}` | `dashboard.users.update` | Guarda cambios |
| PATCH | `/users/{user}/deactivate` | `dashboard.users.deactivate` | Desactiva; no permite auto-desactivación |
| PATCH | `/users/{user}/activate` | `dashboard.users.activate` | Activa |
| DELETE | `/users/{user}` | `dashboard.users.destroy` | Elimina usuario, roles, jornadas y adjuntos R2; no permite autoeliminación |
### Clientes
| Método | Ruta | Nombre | Función |
|---|---|---|---|
| GET | `/clients` | `dashboard.clients` | Catálogo, búsqueda y ubicaciones |
| POST | `/clients` | `dashboard.clients.store` | Crea cliente y ubicaciones |
| PUT | `/clients/{contact}` | `dashboard.clients.update` | Actualiza cliente/ubicaciones |
| DELETE | `/clients/{contact}` | `dashboard.clients.destroy` | Admin elimina cliente, ubicaciones, horas extras, jornadas y adjuntos R2 |
### Horas extras heredadas
Se mantienen `/extratime/create`, `/extratime/show/{id}`, `/extratime/history`, `/extratime/store`, `/extratime/close/{id}`, `/extratime/approve`, `/extratime/export`, `/extratime/stats`, `/extratime/compensate/{id}` y sus acciones asociadas. No deben eliminarse al replicar si se requiere compatibilidad histórica.
## 9. Formularios y validación
### `SaveWorkLogDraftRequest`
Campos opcionales para borrador: `client_id` existente, `client_location_id` activo y perteneciente al cliente, `machine_reference` máximo 255, `location` máximo 255, `description` máximo 5000 y hasta cinco `attachment_ids` distintos.
### `CompleteWorkLogRequest`
Mismas reglas, pero `client_id`, `machine_reference`, `location` y `description` son obligatorios. No incluye `started_at`, `ended_at`, `duration_minutes`, `status` ni `user_id`: esos valores son exclusivamente del servidor.
### `AdminUpdateWorkLogRequest`
Requiere `client_id`, `machine_reference`, `location` y `description`; permite ubicación de cliente opcional. La autorización de la request y el controlador vuelven a comprobar que sea un borrador `in_progress`.
### Adjuntos
Tipos actuales permitidos: imágenes JPEG/PNG/WEBP/HEIC y vídeos MP4/MOV/WEBM. Máximo 5 archivos y 100 MB por archivo. El flujo es:
1. `POST /work-logs/attachments/presign` con `{files:[{name,type,size}]}`.
2. El servidor crea una fila huérfana y devuelve `{id, upload_uuid, url, headers}` por archivo.
3. El navegador hace `PUT` directo a la URL R2 con los headers indicados.
4. El formulario envía todos los `attachment_ids[]` al guardar.
5. El backend verifica pertenencia, existencia, tamaño y MIME antes de vincular.
La UI debe renderizar una galería con todos los adjuntos existentes y nuevos; las imágenes usan `object-fit: contain` y los enlaces abren el original.
## 10. Flujo de correo y PDF
### Correos
- `WorkLogDraftSaved`: asunto `Borrador de Registro de Tarea | {técnico}`; destinatario técnico y CC de administradores activos. Incluye resumen parcial, botón **Revisar tarea**, galería de imágenes embebidas y enlaces para otros archivos.
- `WorkLogRegistered`: asunto `Registro de Tarea registrado | {técnico}`; destinatario técnico y CC configurado (`NOTIFICATION_EMAILS`). Incluye galería de imágenes y botón **Ver jornada**.
- `WorkLogAdminUpdated`: notifica al técnico y al administrador que realizó el cambio, con lista de campos modificados.
- `UserWelcome`: se envía al crear usuario e incluye nombre, email, roles, zona, contraseña inicial y obligación de cambio.
Los correos se envían mediante `Mail::queue`/`Mail::to()->cc()`. El PDF se adjunta con `Attachment::fromData(fn () => WorkLogPdf::make($workLog), WorkLogPdf::filename($workLog))` y MIME `application/pdf`. El correo de borrador y el final deben tener ambos esta misma lógica.
### PDF
`WorkLogPdf::make()` carga `pdf.work_log`, el logo como data URI y los adjuntos. La vista debe:
- mostrar técnico, fecha local, hora de inicio, hora de finalización, duración y zona (`Europe/Madrid (CEST)`, por ejemplo);
- usar `Pendiente` para datos ausentes del borrador;
- mostrar cliente, modelo/serie, ubicación y descripción;
- presentar imágenes en galería de dos columnas y vídeos como filas enlazadas;
- mantener el contenido en una página Letter cuando sea posible.
Nunca generar notificación final para `in_progress` o `completion_pending`. `draft_notified_at` evita repetir la notificación inicial en guardados sucesivos.
## 11. Historial y Excel
`TimeHistoryQuery` hace `UNION ALL` entre jornadas y horas extras, normaliza ambos a columnas comunes y filtra por propietario/administrador, fechas, cliente, referencia y estado. Para jornadas devuelve también `timezone` y `attachment_count`.
La exportación `GET /dashboard/history/export` reutiliza exactamente esos filtros y genera una sola hoja con estas columnas:
1. Tipo de registro
2. Estado
3. ID
4. Técnico
5. Cliente
6. Ubicación
7. Modelo o número de serie
8. Fecha
9. Hora de inicio
10. Hora de finalización
11. Duración
12. Descripción
13. Adjuntos
14. Fecha de creación
Para horas extras, inicio/finalización quedan vacíos. Para jornadas, fechas y horas se convierten desde UTC con la zona almacenada.
## 12. Variables de entorno
Valores mínimos orientativos (no incluir secretos en Git):
```dotenv
APP_ENV=production
APP_URL=https://controlhorario.imadamaq.com
# config/app.php mantiene la zona global en UTC
DB_CONNECTION=mysql
DB_HOST=...
DB_DATABASE=...
DB_USERNAME=...
DB_PASSWORD=...
QUEUE_CONNECTION=database
MAIL_MAILER=smtp # o resend
MAIL_HOST=smtp.resend.com
MAIL_PORT=465
MAIL_USERNAME=resend
MAIL_PASSWORD=re_...
MAIL_SCHEME=smtps
MAIL_FROM_ADDRESS=info@imadamaq.com
MAIL_FROM_NAME="Control Horario IMADA"
MAIL_REPLY_TO_ADDRESS=info@imadamaq.com
NOTIFICATION_EMAILS=admin@ejemplo.com
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_ENDPOINT=https://<account>.r2.cloudflarestorage.com
R2_BUCKET=control-horario
R2_REGION=auto
R2_UPLOAD_EXPIRATION=10
OVERTIME_REQUEST_BUTTON_VISIBLE=false
```
El transporte Resend vía API usa `MAIL_MAILER=resend` y `RESEND_KEY`; el transporte SMTP usa `MAIL_MAILER=smtp` con `smtp.resend.com`, usuario `resend` y la API key como contraseña. Después de cambiar variables en producción, ejecutar `php artisan optimize:clear`, `config:cache` y reiniciar workers.
## 13. Despliegue y assets
1. Instalar dependencias: `composer install --no-dev --prefer-dist --optimize-autoloader`.
2. Compilar: `npm ci && npm run build`.
3. Desplegar código sin `.env`, `vendor`, `node_modules` ni `bootstrap/cache`.
4. En producción: `php artisan migrate --force`.
5. Limpiar y regenerar: `php artisan optimize:clear`, `config:cache`, `route:cache`, `view:cache`.
6. Reiniciar cola: `php artisan queue:restart`.
7. **Importante:** el dominio actual sirve Apache desde `/home/<usuario>/public_html/controlhorario.imadamaq.com`, no desde `controlhorario_laravel/public`. Sincronizar `controlhorario_laravel/public/build` a `public_html/controlhorario.imadamaq.com/build`; de lo contrario el HTML puede apuntar a un CSS nuevo que Apache responderá con 404 y la aplicación aparecerá sin estilos.
8. Comprobar `GET /login` y `GET /build/assets/<archivo-css-del-manifesto>` esperando `200`, además de revisar logs y jobs fallidos.
## 14. Pruebas de aceptación
La réplica debe cubrir, como mínimo:
- inicio con hora del servidor y rechazo de horas manuales;
- una sola jornada activa;
- reinicio único dentro de 2 minutos y rechazo posterior;
- guardado de borradores incompletos;
- persistencia de todos los adjuntos;
- finalización con hora del servidor e inmutabilidad posterior;
- completado solo con campos requeridos;
- correo/PDF de borrador y correo/PDF final sin duplicados;
- galería de imágenes en correo, PDF y detalle;
- permisos de propietario/admin/otro técnico;
- botón de edición admin solo para borradores guardados;
- zona Panamá y Madrid, incluido cambio CET/CEST;
- historial, filtros, estados y Excel;
- eliminación en cascada segura de usuario/cliente y objetos R2;
- compatibilidad del flujo de horas extras;
- compilación Vite y disponibilidad HTTP de todos los assets del manifiesto.
En este repositorio, la suite de referencia se ejecuta con `php artisan test`; debe mantenerse verde antes de publicar.