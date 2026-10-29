# Base PostgreSQL: qa_test_ge

Scripts de importación inicial. La API usa pg y el esquema qa mediante DATABASE_URL en backend/.env. La importación inicial es manual: si ya creaste la base y las tablas, no vuelvas a ejecutarla. `pnpm db:check` verifica la conexión sin modificar datos y `pnpm db:migrate` aplica las migraciones aditivas de cuenta, plantillas, Suite opcional y adjuntos de casos.

## Importación con psql

Ejecutar desde la raíz con PostgreSQL instalado y un usuario autorizado. Sustituir `postgres` por el usuario local que corresponda; `-W` solicita la contraseña sin escribirla en el archivo o comando.

```bash
psql -h localhost -U postgres -W -d postgres -v ON_ERROR_STOP=1 -f backend/sql/000_create_database.sql
psql -h localhost -U postgres -W -d qa_test_ge -v ON_ERROR_STOP=1 -f backend/sql/001_schema.sql
psql -h localhost -U postgres -W -d qa_test_ge -v ON_ERROR_STOP=1 -f backend/sql/003_verify.sql
```

Opcional, solo para ejemplos ficticios:

```bash
psql -h localhost -U postgres -W -d qa_test_ge -v ON_ERROR_STOP=1 -f backend/sql/002_demo_seed.sql
```

En pgAdmin, ejecutar `000_create_database.sql` sobre `postgres` con autocommit, fuera de una transacción. Refrescar las bases, abrir Query Tool sobre `qa_test_ge` y ejecutar el esquema; después, la verificación y, opcionalmente, el seed. Son archivos SQL de texto para Query Tool/psql, no backups para la opción Restore.

`000` necesita privilegio CREATEDB y se omite si la base ya existe. `001` crea el esquema `qa` de forma transaccional y falla si ya existe: no borra ni reemplaza datos. `002` se importa una sola vez, porque repetirlo añade otro conjunto de ejemplos. `003` revierte sus filas al terminar, aunque las secuencias identity pueden avanzar. Detenerse ante cualquier error; no ejecutar borrados para intentar repetir la importación. Las futuras modificaciones del esquema requerirán migraciones versionadas nuevas.

## Usuarios y sesiones (bases existentes)

Después de importar el esquema inicial, ejecutar desde la raíz:

```bash
pnpm db:migrate
pnpm db:check
```

El comando aplica en orden `004_authentication.sql`, `005_bug_templates.sql`, `006_optional_test_suite.sql`, `007_test_case_attachments.sql`, `008_evidence_files.sql`, `009_tags.sql`, `010_team_invitations.sql` y `011_qa_assignments.sql` sobre la base configurada en backend/.env. Cada migración usa una transacción, bloqueo y registro de versión; repetirlas no duplica tablas. No vuelve a importar 001/002 ni cambia sus filas. Para pgAdmin, ejecutar los archivos en orden desde Query Tool conectado a qa_test_ge.

Tablas añadidas: qa.users (correo único normalizado y hash scrypt), qa.organization_members (usuario/organización/rol), qa.auth_sessions (hash de token, CSRF, expiración), qa.schema_migrations, qa.bug_templates (plantillas de bugs propiedad de una cuenta) y qa.test_case_attachments (adjuntos de casos). El registro crea cuenta, workspace, membresía owner y proyecto; no concede acceso a los datos previamente importados.

Para conceder acceso a una organización existente, un administrador con acceso SQL debe revisar el usuario y organización y ejecutar una operación explícita. Ejemplo con valores ficticios, que se deben sustituir:

```sql
INSERT INTO qa.organization_members (organization_id, user_id, role)
SELECT o.id, u.id, 'member'
FROM qa.organizations o CROSS JOIN qa.users u
WHERE o.id = 1 AND u.email = 'tu-cuenta@example.com';
```

No usar este ejemplo sin confirmar los destinatarios. No existe un endpoint público que permita autoasignarse organizaciones ni cambiar roles.

## Modelo inicial

| Tabla                                 | Propósito                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------- |
| `qa.organizations`, `qa.projects`     | Alcance organizativo y proyectos                                          |
| `qa.bugs`                             | Incidencias con prioridad, estado y responsable textual                   |
| `qa.test_cases`, `qa.test_case_steps` | Casos y pasos ordenados con acción y resultado esperado                   |
| `qa.test_case_attachments`            | Enlaces HTTP(S) e imágenes PNG/JPEG/GIF/WebP privadas asociadas a un caso |
| `qa.test_runs`, `qa.test_run_results` | Ejecuciones, resultados por caso y snapshot de pasos                      |
| `qa.bug_test_cases`                   | Relación explícita entre bugs y casos                                     |
| `qa.evidence`, `qa.evidence_links`    | Metadatos y vínculos a bugs, casos, ejecuciones o resultados              |
| `qa.tags` y `qa.*_tags`               | Tags por proyecto y sus asociaciones a bugs, casos y ejecuciones          |

Los IDs son `bigint` identity. Las claves foráneas compuestas verifican que los recursos vinculados pertenecen al mismo proyecto. Las asociaciones de tags se eliminan en cascada al borrar un tag; otros vínculos deben resolverse explícitamente antes de eliminar recursos. La API elimina los adjuntos de un caso en la misma transacción y conserva el caso si está relacionado con ejecuciones. Una evidencia puede existir sin vínculo y tener después varios; cada vínculo tiene exactamente un destino. `storage_key` de evidencia es una referencia futura, no contenido de archivo.

Las imágenes adjuntas a casos se guardan en la columna `image_bytes` de PostgreSQL, con máximo de 2 MiB y MIME permitido restringido a PNG, JPEG, GIF o WebP. Los enlaces HTTP(S) se guardan como texto y no pueden incluir credenciales en la URL. Los archivos de evidencia general se guardan en `qa.evidence.file_bytes`, hasta 2 MiB, y se sirven como descargas privadas con autorización por proyecto.

La migración 009 crea `qa.tags` y las tablas `qa.bug_tags`, `qa.test_case_tags` y `qa.test_run_tags`. Cada asociación verifica por claves foráneas compuestas que recurso y tag pertenecen al mismo proyecto. Los nombres de tags son únicos sin distinguir mayúsculas dentro de su proyecto; el color se almacena como hexadecimal `#RRGGBB`. Eliminar un tag elimina únicamente sus vínculos.

Las fechas usan `timestamptz`. Bugs y casos guardan estados validados en columnas restringidas (`qa.bugs.status` y `qa.test_cases.status`); las rutas PATCH actualizan esos campos y no requieren una migración adicional. Los resultados de ejecución usan `passed`, `failed`, `blocked` y `skipped`. El repositorio calcula la cantidad de casos y el avance a partir de los resultados. La semántica de omitido frente a no ejecutado deberá refinarse al implementar ese flujo.

Los pasos de un resultado se guardan en `steps_snapshot` como un array JSON para preservar lo evaluado. La futura capa de aplicación deberá validar su estructura y crearlo a partir de los pasos del caso al añadirlo a la ejecución.

## Pendientes de integración

El driver pg, los repositorios, las transacciones, projectId, las referencias verificadas y los IDs bigint como texto ya están integrados. Las migraciones 004–007 y la capa de autenticación implementan usuarios, sesiones, autorización por membresía, plantillas privadas y adjuntos de casos en la API. Las claves de proyecto siguen asegurando integridad. Desactivar una cuenta la anonimiza, revoca sus sesiones y elimina sus plantillas; conserva membresías y recursos relacionados. Pendiente: permisos granulares, auditoría y respaldos. No se configuran roles PostgreSQL, secretos ni RLS.

Referencias oficiales utilizadas: [CREATE DATABASE](https://www.postgresql.org/docs/current/sql-createdatabase.html), [restricciones y claves foráneas](https://www.postgresql.org/docs/current/ddl-constraints.html) y [psql](https://www.postgresql.org/docs/current/app-psql.html).

La migración 010 añade códigos de invitación de un solo uso: únicamente se guarda el hash y la fecha de expiración. Las invitaciones se aceptan con una cuenta autenticada y conceden acceso a todos los proyectos de la organización.

La migración 011 añade referencias opcionales de responsable a bugs y casos. Las claves compuestas exigen que el responsable sea miembro de la organización del proyecto; el texto histórico de responsable en bugs no se elimina.

La migración 012 añade qa.creation_requests para creaciones idempotentes de bugs, casos y ejecuciones. Guarda actor, proyecto, recurso, UUID, huella e ID creado en la misma transacción. Borrar un proyecto elimina sus claves. Debe aplicarse antes de iniciar esta versión.
