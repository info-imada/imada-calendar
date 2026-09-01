# Incidente del primer despliegue de producción en Dokploy

## Resumen

| Campo | Valor |
| --- | --- |
| Fecha | 21 de julio de 2026 |
| Servicio | Calendar |
| Dominio | `calendar.combiliftsales.com` |
| Estado | Resuelto |
| Impacto | La imagen llegó a construirse, pero la aplicación no estuvo disponible hasta corregir el arranque del contenedor. |

El primer despliegue de producción expuso dos defectos distintos en el contrato Docker/pnpm. El primero detenía la construcción porque la política `allowBuilds` no estaba disponible en los stages de instalación. Después de corregir el build, el contenedor final entraba en un ciclo de reinicios: el `CMD` usaba `pnpm exec`, pnpm intentaba validar o reparar las dependencias y fallaba al escribir en `/app` como el usuario no-root `node`.

El dominio alcanzaba Traefik y devolvía `502 Bad Gateway`; por tanto, el DNS no era la causa del fallo final. El backend no permanecía disponible debido al reinicio del contenedor.

## Síntomas e impacto

- El primer build falló con `ERR_PNPM_IGNORED_BUILDS`.
- Los builds posteriores aparecían como completados, pero las tareas del servicio terminaban con código 1 y se recreaban continuamente.
- Los logs del runtime mostraban `EACCES` sobre un archivo temporal dentro de `/app` y un intento de `pnpm install --production` con exit code 243.
- El dominio público pasó de no responder a devolver `502 Bad Gateway` cuando Traefik ya podía recibir la solicitud.
- La aplicación no llegó a escuchar de forma estable en el puerto interno `3000` hasta aplicar la corrección final.

No se identificaron cambios de esquema, pérdida de datos ni exposición de secretos como parte del incidente.

## Línea temporal

1. Dokploy ejecutó el primer build Linux y pnpm rechazó scripts de instalación no aprobados porque `pnpm-workspace.yaml` no estaba presente en los stages de dependencias.
2. El commit `453d2c6` añadió `pnpm-workspace.yaml` antes de las instalaciones completa y de producción, conservando `allowBuilds` explícito.
3. El commit `b866558` añadió el mismo archivo al stage final `runner` para mantener la política disponible en la imagen.
4. El build terminó, pero el runtime siguió reiniciándose con `EACCES` y `pnpm install --production`.
5. La ejecución directa de `./node_modules/.bin/prisma --version` y `./node_modules/.bin/next --version` confirmó que ambos binarios ya existían y funcionaban como `node`; el problema era la capa de ejecución de pnpm, no las dependencias construidas.
6. El commit `348bda5` cambió el `CMD` para ejecutar directamente Prisma y Next.js desde `node_modules/.bin`.
7. Dokploy marcó el deployment de `348bda5` como completado y `https://calendar.combiliftsales.com` mostró la pantalla de login.

## Causas raíz

### 1. Política de instalación ausente durante el build

`pnpm-workspace.yaml` contiene la política versionada `allowBuilds`. Copiar solamente `package.json` y `pnpm-lock.yaml` antes de `pnpm install` omitía esa política dentro del contexto de los stages `dependencies` y `production-dependencies`.

La corrección fue copiar los tres archivos antes de ambos installs. No se habilitó `dangerouslyAllowAllBuilds` ni se cambió el gestor de paquetes.

### 2. pnpm ejecutándose dentro del runtime inmutable

El `CMD` original llamaba `pnpm exec prisma` y `pnpm exec next`. pnpm realizó una comprobación de dependencias previa al comando e intentó `pnpm install --production`. Como el stage final usa correctamente `USER node`, esa instalación no podía crear `/app/_tmp_...` y el proceso terminaba.

Las dependencias ya estaban construidas en la imagen. La solución fue evitar la capa de pnpm en el arranque:

```dockerfile
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && exec ./node_modules/.bin/next start --hostname 0.0.0.0 --port 3000"]
```

No se modificaron permisos de `/app`, no se ejecutó el runtime como root y no se permitieron instalaciones durante el arranque.

### 3. Advertencia de IP privada que no causaba el 502

Dokploy administra el Remote Server mediante su IP privada dentro de la red interna. El registro DNS público, en cambio, apunta a la IP pública del nodo donde Traefik recibe las conexiones externas. Son planos distintos:

```text
Dokploy ── red privada/SSH ──> Remote Server
Internet ── DNS público/HTTPS ──> Traefik en el Remote Server ──> aplicación:3000
```

El validador de dominio comparó el DNS con la dirección administrativa privada y mostró una advertencia. El hecho de recibir un `502` desde Traefik demostró que la resolución y el ingreso público ya funcionaban; el backend era el componente no disponible.

## Resolución aplicada

- `453d2c6`: incluyó la política pnpm en ambos stages de instalación.
- `b866558`: incluyó el contrato de workspace en la imagen final.
- `348bda5`: ejecutó los binarios empaquetados directamente en el runtime.
- Se conservó `USER node`, el puerto `3000`, el healthcheck y `prisma migrate deploy` antes de `next start`.
- El Remote Server continuó administrándose por la red privada y el dominio público continuó usando el punto de entrada público.

## Procedimiento de diagnóstico reutilizable

1. Distingue el estado del build del estado del contenedor. Un build exitoso no garantiza que la aplicación haya arrancado.
2. Si el dominio devuelve `502`, revisa primero las tareas y logs del backend: Traefik ya recibió la solicitud.
3. Busca la primera línea de error anterior al stack trace y determina si corresponde a migraciones, variables, conectividad o instalación inesperada.
4. Inspecciona el usuario y el comando configurados en la imagen:

   ```bash
   docker image inspect calendar:dokploy --format '{{json .Config.Cmd}} {{.Config.User}}'
   ```

5. Verifica los binarios sin ejecutar pnpm ni cargar secretos:

   ```bash
   docker run --rm --entrypoint sh calendar:dokploy -c 'id; test -f /app/pnpm-workspace.yaml; ./node_modules/.bin/prisma --version; ./node_modules/.bin/next --version'
   ```

6. Confirma que el resultado usa `node`, que ambos binarios responden y que no aparece `pnpm install`.
7. Después de un cambio de imagen, construye sin caché, redespliega, comprueba que la tarea permanece activa y consulta `/api/health`.

`--rm` elimina únicamente el contenedor temporal creado por la comprobación cuando termina. No elimina la imagen ni afecta al servicio desplegado.

## Prevención

- Tratar `package.json`, `pnpm-lock.yaml` y `pnpm-workspace.yaml` como una unidad en todos los stages que ejecuten instalaciones.
- Mantener `allowBuilds` explícito y revisar deliberadamente cualquier nueva dependencia con scripts de instalación.
- No invocar `pnpm exec` desde el `CMD` de la imagen final.
- Mantener el filesystem de la aplicación inmutable y el proceso como usuario no-root.
- Verificar por separado build, migración, arranque, healthcheck y acceso HTTPS.
- No cambiar un registro DNS público a una IP privada para satisfacer una comparación de la interfaz administrativa.

## Evidencia y límites de verificación

La evidencia conservada confirma que Dokploy completó el deployment del commit `348bda5` y que la pantalla de login se renderizó mediante HTTPS en el dominio de producción. Esta verificación no demuestra que el login local, Zoho OAuth ni todos los flujos autenticados hayan sido probados.

Este documento no contiene credenciales, URLs de conexión, identificadores internos de infraestructura ni direcciones IP concretas.

La configuración operativa vigente se mantiene en el [runbook de despliegue en Dokploy](../dokploy.md).
