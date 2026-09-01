# Configuración histórica de Dokploy PostgreSQL

> Documento histórico. Calendar utiliza actualmente la base MySQL/MariaDB legacy de Control Horario IMADA. No uses estas URLs para el despliegue actual.

Calendar usa PostgreSQL administrado por Dokploy. La aplicación Next.js y la base de datos se comunican por la red interna de Dokploy usando el hostname del servicio PostgreSQL.

## Conexión de runtime

Configura `DATABASE_URL` en la pestaña **Environment** de la Application con la URL interna generada por Dokploy para la base de datos.

No incluyas la URL real en archivos versionados, logs, capturas o documentación. La contraseña debe permanecer únicamente en `.env` local seguro o en el Environment de Dokploy.

## Conexión de migraciones

Configura `DIRECT_DATABASE_URL` con la misma URL interna de Dokploy, salvo que en el futuro exista una URL separada para migraciones.

Prisma CLI lee `DIRECT_DATABASE_URL` primero mediante `prisma.config.ts` y cae a `DATABASE_URL` si no está definida.

## Bootstrap de base nueva

Una base nueva de Dokploy se inicializa con `prisma migrate deploy`. Las migraciones versionadas crean el esquema y los catálogos mínimos de sistema: roles, permisos, países, equipos, tipos, estados y prioridades.

El bootstrap de migraciones no crea usuarios demo, credenciales ni actividades. Los usuarios deben entrar por Zoho o ser creados por un administrador autorizado.

## Seguridad local

Nunca uses credenciales de producción en pruebas automatizadas. Las pruebas E2E o ensayos de migración deben usar una base aislada mediante `TEST_DATABASE_URL`.
