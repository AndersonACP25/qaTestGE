# Base PostgreSQL: qa_test_ge

Scripts de importación inicial. La API ya usa pg y el esquema qa mediante DATABASE_URL en backend/.env. La importación es manual: si ya creaste la base y las tablas, no necesitas repetirla. pnpm db:check verifica la conexión sin modificar datos. La migración aditiva de autenticación se aplica mediante pnpm db:migrate. El frontend ya consume la API con sesiones reales.

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

El comando aplica en orden `004_authentication.sql` y `005_bug_templates.sql` sobre la base configurada en backend/.env. Cada migración usa una transacción, bloqueo y registro de versión; repetirlas no duplica tablas. No vuelve a importar 001/002 ni cambia sus filas. Para pgAdmin, ejecutar ambos archivos en orden desde Query Tool conectado a qa_test_ge.

Tablas añadidas: qa.users (correo único normalizado y hash scrypt), qa.organization_members (usuario/organización/rol), qa.auth_sessions (hash de token, CSRF, expiración), qa.schema_migrations y qa.bug_templates (plantillas de bugs propiedad de una cuenta). El registro crea cuenta, workspace, membresía owner y proyecto; no concede acceso a los datos previamente importados.

Para conceder acceso a una organización existente, un administrador con acceso SQL debe revisar el usuario y organización y ejecutar una operación explícita. Ejemplo con valores ficticios, que se deben sustituir:

```sql
INSERT INTO qa.organization_members (organization_id, user_id, role)
SELECT o.id, u.id, 'member'
FROM qa.organizations o CROSS JOIN qa.users u
WHERE o.id = 1 AND u.email = 'tu-cuenta@example.com';
```

No usar este ejemplo sin confirmar los destinatarios. No existe un endpoint público que permita autoasignarse organizaciones ni cambiar roles.

## Modelo inicial

| Tabla | Propósito |
|---|---|
| `qa.organizations`, `qa.projects` | Alcance organizativo y proyectos |
| `qa.bugs` | Incidencias con prioridad, estado y responsable textual |
| `qa.test_cases`, `qa.test_case_steps` | Casos y pasos ordenados con acción y resultado esperado |
| `qa.test_runs`, `qa.test_run_results` | Ejecuciones, resultados por caso y snapshot de pasos |
| `qa.bug_test_cases` | Relación explícita entre bugs y casos |
| `qa.evidence`, `qa.evidence_links` | Metadatos y vínculos a bugs, casos, ejecuciones o resultados |

Los IDs son `bigint` identity. Las claves foráneas compuestas verifican que los recursos vinculados pertenecen al mismo proyecto. No hay eliminaciones en cascada: los vínculos deben resolverse explícitamente antes de eliminar recursos. Una evidencia puede existir sin vínculo y tener después varios; cada vínculo tiene exactamente un destino. `storage_key` es una referencia futura, no contenido de archivo.

Las fechas usan `timestamptz`. Los estados de presentación mantienen los valores de los modelos actuales; los resultados de ejecución usan `passed`, `failed`, `blocked` y `skipped`. El repositorio calcula la cantidad de casos y el avance a partir de los resultados. La semántica de omitido frente a no ejecutado deberá refinarse al implementar ese flujo.

Los pasos de un resultado se guardan en `steps_snapshot` como un array JSON para preservar lo evaluado. La futura capa de aplicación deberá validar su estructura y crearlo a partir de los pasos del caso al añadirlo a la ejecución.

## Pendientes de integración

El driver pg, los repositorios, las transacciones, projectId, las referencias verificadas y los IDs bigint como texto ya están integrados. Las migraciones 004 y 005 y la capa de autenticación implementan usuarios, sesiones, autorización por membresía y plantillas privadas en la API. Las claves de proyecto siguen asegurando integridad. Desactivar una cuenta la anonimiza, revoca sus sesiones y elimina sus plantillas; conserva membresías y recursos relacionados. Pendiente: permisos granulares, auditoría y respaldos. No se configuran roles PostgreSQL, secretos, RLS ni almacenamiento binario.

Referencias oficiales utilizadas: [CREATE DATABASE](https://www.postgresql.org/docs/current/sql-createdatabase.html), [restricciones y claves foráneas](https://www.postgresql.org/docs/current/ddl-constraints.html) y [psql](https://www.postgresql.org/docs/current/app-psql.html).
