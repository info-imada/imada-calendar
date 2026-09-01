# Despliegue de Calendar en Dokploy

Esta guía configura Calendar como una **Application** de Dokploy construida desde el `Dockerfile` del repositorio. PostgreSQL se ejecuta como servicio administrado en Dokploy; la aplicación Next.js se conecta a la base por la red interna de Dokploy.

Referencias oficiales:

- [Dokploy: Build Type](https://docs.dokploy.com/docs/core/applications/build-type)
- [Dokploy: Next.js](https://docs.dokploy.com/docs/core/nextjs)
- [Dokploy: Going Production](https://docs.dokploy.com/docs/core/applications/going-production)
- [Next.js: Self-Hosting](https://nextjs.org/docs/app/guides/self-hosting)

## 1. Requisitos previos

- Repositorio accesible desde la cuenta GitHub conectada a Dokploy.
- Rama `master` actualizada.
- Base PostgreSQL creada en Dokploy.
- Dominio con un registro DNS apuntando al servidor de Dokploy.
- Aplicación OAuth en Zoho si se habilitará el acceso corporativo.

No copies `.env` al repositorio. Todos los valores se configuran en la pestaña **Environment** de Dokploy.

## 2. Preparar PostgreSQL en Dokploy

En el servicio PostgreSQL de Dokploy, usa la sección **Internal Credentials**:

- `DATABASE_URL`: conexión interna del servicio PostgreSQL de Dokploy, usada por Next.js en runtime.
- `DIRECT_DATABASE_URL`: la misma conexión interna del servicio PostgreSQL de Dokploy, usada por `prisma migrate deploy`.

Para producción dentro de Dokploy usa la URL interna, no la externa. No publiques ni versiones la URL real.

El contenedor ejecuta las migraciones automáticamente antes de iniciar Next.js. No ejecuta `prisma db push` ni el seed. Las migraciones incluyen el bootstrap mínimo de catálogos para bases nuevas.

## 3. Crear o configurar la Application

En la pantalla **General**:

| Campo | Valor |
| --- | --- |
| Provider | GitHub |
| Repository | Repositorio de Calendar |
| Branch | `master` |
| Build Path | `/` |
| Trigger Type | `On Push` si se desea autodeploy |
| Build Type | `Dockerfile` |
| Dockerfile Path | `Dockerfile` |
| Docker Context Path | `.` |
| Docker Build Stage | Vacío; usa el stage final `runner` |

No selecciones **Static**: la aplicación necesita Server Components, Server Actions, NextAuth y Prisma en runtime. No añadas un comando de inicio custom en Dokploy; el `CMD` del Dockerfile ya ejecuta migraciones y luego Next.js.

## 4. Variables de entorno

Configura en **Environment**:

```dotenv
DATABASE_URL=<DOKPLOY_INTERNAL_DATABASE_URL>
DIRECT_DATABASE_URL=<DOKPLOY_INTERNAL_DATABASE_URL>
NEXTAUTH_URL=https://calendar.combiliftsales.com
NEXTAUTH_SECRET=<SECRETO_ALEATORIO_DE_PRODUCCION>
```

Genera `NEXTAUTH_SECRET` en un equipo confiable:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Para habilitar Zoho, agrega ambas variables:

```dotenv
ZOHO_CLIENT_ID=<ZOHO_CLIENT_ID>
ZOHO_CLIENT_SECRET=<ZOHO_CLIENT_SECRET>
```

No configures `SEED_ADMIN_PASSWORD` en la Application salvo durante una operación manual y controlada fuera del contenedor. El runtime no ejecuta el seed.

El Dockerfile ya define:

```dotenv
NODE_ENV=production
HOSTNAME=0.0.0.0
PORT=3000
NEXT_TELEMETRY_DISABLED=1
```

No pases secretos como Docker build arguments: deben existir solo en runtime.

## 5. Dominio y HTTPS

En **Domains**:

1. agrega el dominio público;
2. selecciona el puerto interno `3000`;
3. habilita HTTPS con Let's Encrypt;
4. habilita redirección de HTTP a HTTPS;
5. confirma que el DNS resuelve a la IP pública del nodo remoto donde Traefik recibe tráfico.

La dirección configurada en **Remote Servers** y el destino del DNS cumplen funciones distintas. Dokploy puede administrar el nodo remoto por su IP privada —por ejemplo, para SSH, despliegues y órdenes Docker dentro de una red interna— mientras que el registro público `A` o `AAAA` debe apuntar a una dirección del mismo nodo accesible desde Internet. No cambies el DNS a una IP privada porque el validador de Dokploy la muestre como dirección esperada: algunas versiones comparan el dominio con la dirección administrativa guardada para el Remote Server, aunque esa dirección no sea el punto de entrada público.

`NEXTAUTH_URL` debe coincidir exactamente con el origen HTTPS público, sin rutas adicionales. Si el dominio cambia, actualiza esta variable y la configuración de Zoho antes de redesplegar.

## 6. Configurar Zoho OAuth

En Zoho Developer Console registra como callback autorizado:

```text
https://<DOMINIO_DE_PRODUCCION>/api/auth/callback/zoho
```

La combinación de dominio, protocolo y ruta debe coincidir exactamente. Mantén también el callback local que utilices en desarrollo, si aplica.

## 7. Healthcheck

La imagen incluye un Docker `HEALTHCHECK` que consulta:

```text
GET /api/health
```

La ruta comprueba una consulta mínima contra PostgreSQL:

- `200 { "status": "ok" }`: Next.js y PostgreSQL disponibles.
- `503 { "status": "unavailable" }`: PostgreSQL o la configuración no están disponibles.

No devuelve URLs, credenciales ni mensajes internos. Si la versión de Dokploy permite healthchecks adicionales en **Advanced**, usa:

| Campo | Valor |
| --- | --- |
| Path | `/api/health` |
| Port | `3000` |
| Initial delay/start period | al menos 45 segundos |
| Timeout | 5 segundos |

## 8. Primer despliegue

1. Guarda General, Environment y Domains.
2. Pulsa **Deploy**.
3. Revisa los logs del build: debe finalizar `pnpm build`.
4. Revisa los logs de runtime: `prisma migrate deploy` debe completar antes de `next start`.
5. Confirma que el contenedor aparece healthy.
6. Abre `https://<DOMINIO_DE_PRODUCCION>/api/health` y confirma el estado `ok`.
7. Prueba login local y, si está configurado, login Zoho.

El primer arranque puede tardar más por instalación/build y migraciones. No interrumpas el despliegue mientras Prisma tenga una migración en curso.

## 9. Datos iniciales

Las migraciones crean los catálogos mínimos necesarios para que Calendar arranque sobre una base vacía de Dokploy:

- roles de sistema `ADMIN` y `TECNICO`;
- permisos y matriz base;
- países/equipos iniciales;
- tipos, estados y prioridades de actividad.

El seed no se ejecuta automáticamente porque también puede crear una cuenta administrativa local si `SEED_ADMIN_PASSWORD` existe y sincroniza la matriz de permisos de roles de sistema. Si necesitas ejecutar el seed manualmente:

1. revisa `.ai/DATABASE.md` y `prisma/seed.ts`;
2. configura las URLs de producción temporalmente en un entorno administrativo confiable con dependencias completas;
3. ejecuta `pnpm db:seed` una sola vez y revisa el resultado;
4. elimina las variables/credenciales temporales del equipo usado.

No ejecutes el seed desde el contenedor de aplicación: la imagen de producción no incluye `tsx`.

## 10. Actualizaciones y rollback

Con Autodeploy activo, un push a `master` inicia un build nuevo. Dokploy conserva registros de despliegue para revisar logs y volver a una imagen anterior.

Las migraciones de Prisma son **forward-only** en este flujo. Volver a una imagen anterior no revierte automáticamente el esquema. Antes de desplegar una migración destructiva:

- crea una migración compatible en fases;
- realiza backup del servicio PostgreSQL de Dokploy;
- verifica que la versión anterior de la aplicación pueda convivir temporalmente con el esquema nuevo;
- documenta el procedimiento de rollback de datos.

## 11. Troubleshooting

Para la cronología y causas raíz del primer despliegue, consulta el [informe del incidente del 21 de julio de 2026](incidents/2026-07-21-first-production-deploy.md).

### El build falla durante `pnpm install`

- Confirma que `pnpm-lock.yaml` está committeado y sincronizado.
- Si aparece `ERR_PNPM_IGNORED_BUILDS`, confirma que `pnpm-workspace.yaml` está committeado y que el Dockerfile lo copia, junto con `package.json` y `pnpm-lock.yaml`, antes de **ambos** installs: `pnpm install --frozen-lockfile` en `dependencies` y `pnpm install --prod --frozen-lockfile` en `production-dependencies`.
- Revisa que `allowBuilds` en `pnpm-workspace.yaml` apruebe explícitamente cada paquete que necesita ejecutar scripts de build durante la instalación. Si una dependencia nativa nueva lo requiere, agrégala de forma deliberada a esa lista y vuelve a construir sin caché.
- No uses `dangerouslyAllowAllBuilds`: elude la aprobación selectiva y permite scripts de instalación de cualquier dependencia.
- No cambies el gestor a npm dentro de Dokploy.
- Usa **Clean Cache** solo si hay evidencia de capas corruptas.

### `502 Bad Gateway` y contenedor en reinicio

Un `502 Bad Gateway` confirma que el dominio alcanzó Traefik, pero Traefik no encontró un backend disponible. Un build marcado como exitoso no demuestra que el proceso del contenedor haya arrancado: revisa **Logs** y el estado de las tareas del servicio.

Si los logs contienen una secuencia como esta:

```text
EACCES: permission denied, open '/app/_tmp_...'
Command failed with exit code 243: pnpm install --production
```

verifica que el `CMD` de la imagen no use `pnpm exec`. pnpm puede ejecutar una comprobación de dependencias antes del comando e intentar una instalación de producción. El usuario no-root `node` no debe modificar `/app` ni instalar o reparar dependencias durante el arranque.

El contrato correcto del runtime es:

```dockerfile
USER node
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && exec ./node_modules/.bin/next start --hostname 0.0.0.0 --port 3000"]
```

Estas comprobaciones locales no necesitan secretos ni modifican la imagen:

```bash
docker image inspect calendar:dokploy --format '{{json .Config.Cmd}} {{.Config.User}}'
docker run --rm --entrypoint sh calendar:dokploy -c 'id; test -f /app/pnpm-workspace.yaml; ./node_modules/.bin/prisma --version; ./node_modules/.bin/next --version'
```

La segunda orden crea un contenedor temporal y `--rm` lo elimina al terminar; no elimina la imagen, el servicio ni los datos de la aplicación. El resultado debe mostrar el usuario `node` y las versiones ya instaladas de Prisma y Next.js, sin ejecutar `pnpm install`.

No resuelvas este fallo cambiando a `USER root`, concediendo permisos amplios sobre `/app` ni instalando dependencias durante el arranque. Después de corregir el Dockerfile, construye sin caché, redespliega y confirma que `prisma migrate deploy` termina antes de que Next.js escuche en el puerto `3000`.

### El contenedor termina antes de iniciar Next.js

Busca el bloque `prisma migrate deploy` en logs. Verifica:

- `DIRECT_DATABASE_URL` con la URL interna de Dokploy PostgreSQL;
- acceso de red de la Application al servicio PostgreSQL;
- credenciales y nombre de base;
- estado de las migraciones en `prisma/migrations/`.

No sustituyas el comando por `db push`.

### Dokploy advierte que el dominio debería apuntar a una IP privada

- Confirma que **Remote Servers** usa la IP privada únicamente para la comunicación administrativa entre los servidores.
- Confirma que el DNS público apunta a la IP pública del nodo que ejecuta Traefik y la aplicación.
- Verifica externamente la resolución DNS y la respuesta HTTPS. Si el dominio alcanza Traefik, una advertencia basada en la IP administrativa no justifica cambiar el DNS a una dirección privada.
- Si la respuesta es `502`, continúa con la revisión del backend y sus logs; ya no es un fallo de resolución DNS.

### Healthcheck 503

- Confirma `DATABASE_URL` con la URL interna del servicio PostgreSQL de Dokploy.
- Revisa que el servicio de base de datos esté desplegado y healthy.
- Consulta logs del contenedor; la respuesta HTTP no expone el error deliberadamente.

### Redirección repetida al login

- Confirma `NEXTAUTH_URL` con el dominio HTTPS exacto.
- Confirma que `NEXTAUTH_SECRET` esté definido y estable entre redespliegues.
- Revisa que el usuario esté ACTIVE y tenga una asignación de rol válida.

### Zoho devuelve Callback u OAuthAccountNotLinked

- Comprueba las dos variables Zoho.
- Comprueba el callback exacto en Zoho Developer Console.
- Confirma que la cuenta no esté almacenada como una identidad local incompatible con el flujo de enlace esperado.

### Resend y job de notificaciones

Configura como secretos de runtime:

```text
RESEND_API_KEY
RESEND_FROM_EMAIL
RESEND_FROM_NAME
RESEND_REPLY_TO
NOTIFICATION_JOB_SECRET
```

El dominio de `RESEND_FROM_EMAIL` debe estar verificado en Resend. `NEXTAUTH_URL` se reutiliza para construir enlaces absolutos. Programa en Dokploy una solicitud `POST` cada minuto a `/api/jobs/notifications` con `Authorization: Bearer <NOTIFICATION_JOB_SECRET>`. No incluyas el secreto en el repositorio, logs o capturas.

Si Resend falla, la operación de negocio permanece confirmada. Revisa filas `EmailNotification` en estado `FAILED`, número de intentos y `lastError` sanitizado; no reenvíes manualmente una fila `SENT`. Los correos con contraseña no se guardan en la cola y deben regenerarse desde la acción administrativa si el envío inicial falla.

## 12. Escalado futuro

Esta configuración está orientada a una sola réplica. Antes de habilitar múltiples réplicas:

- mueve `prisma migrate deploy` a un job único anterior al rollout;
- fija `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` durante build;
- coordina la caché y revalidaciones de Next.js entre instancias;
- revisa el límite de conexiones del servicio PostgreSQL.
