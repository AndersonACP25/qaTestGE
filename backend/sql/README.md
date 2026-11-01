# Instalación de PostgreSQL

## Una sola entrada

Crea la base `qa_test_ge` y configura `DATABASE_URL` en `backend/.env`. Desde la raíz:

```bash
pnpm db:setup
pnpm db:check
```

`db:setup` instala `001_schema.sql` solo cuando el esquema `qa` no existe; después aplica en orden las migraciones 004–012. No crea la base, no carga ejemplos, no concede membresías y no borra ni reemplaza datos. Puede repetirse. Si encuentra un esquema parcial o incompatible, falla y requiere revisar su estado; no intenta reconstruirlo.

Para actualizar una instalación:

```bash
pnpm db:migrate
```

Ambos comandos usan el mismo catálogo en `backend/src/migrations.ts`, un bloqueo de instalación y las transacciones/versiones de cada migración. Un fallo conserva las migraciones ya confirmadas; corrige la causa y repite. No hay migraciones al arrancar la API.

## Por qué se conserva el historial

Los archivos tienen responsabilidades distintas. Fusionar migraciones ya distribuidas rompería la correspondencia con `qa.schema_migrations` en instalaciones existentes y duplicar un esquema consolidado crearía dos fuentes de verdad. Se unifica **la instalación**, conservando los pasos versionados que la hacen repetible y verificable.

| Archivos                  | Uso                                                                                                                           |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `000_create_database.sql` | Alternativa manual a `createdb`, conectado a `postgres` con privilegio CREATEDB                                               |
| `001_schema.sql`          | Base inicial; la instala automáticamente `db:setup`                                                                           |
| `002_demo_seed.sql`       | Ejemplos opcionales; nunca se ejecuta automáticamente y no debe repetirse                                                     |
| `003_verify.sql`          | Verificación manual del modelo inicial con rollback; no sustituye la integración actual                                       |
| `004`–`012`               | Historial aditivo: cuentas, plantillas, Suite opcional, adjuntos, evidencias, tags, invitaciones, responsables e idempotencia |

No ejecutes `001` manualmente sobre una instalación existente. Para pgAdmin puedes crear la base y continuar con `pnpm db:setup`; no necesitas abrir cada migración en Query Tool.

Los ejemplos no se asignan a cuentas nuevas. Regístrate en la aplicación para obtener tu propio equipo y proyecto; acepta un código de invitación para acceder a otro equipo.

## Verificación segura

`pnpm db:check` solo lee conexión y esquema. Las pruebas de integración usan exclusivamente `TEST_DATABASE_URL` en PostgreSQL efímero; crean y eliminan datos. Nunca apuntarlas a una base personal o productiva. CI valida instalación desde cero, repetición y actualización del historial.

### 013 · Flujos de calidad

Ejecuta `pnpm db:migrate` antes de iniciar esta versión. Añade versiones y estados documentales de casos, tipo propio, planes/ciclos, snapshots con título/versión, origen de bugs, severidad/entorno/versión y flujos por proyecto. Conserva estados de resultado y Suite. El backfill reconoce categorías anteriores conocidas una sola vez y no reconstruye cambios previos. Las claves compuestas preservan aislamiento; los recursos con trazabilidad no se eliminan en cascada. Las versiones del caso se retiran únicamente cuando se elimina un caso sin otras referencias. Incluye claves idempotentes para crear planes.

### 014 · Colaboración, auditoría y permisos

Aplicar con `pnpm db:migrate`. Añade accesos por proyecto, comentarios/versiones, menciones, avisos privados y auditoría inmutable. Preserva acceso de miembros actuales mediante QA explícito; las invitaciones y proyectos futuros no generan permisos automáticos. El propietario mantiene Admin. La auditoría comienza al aplicar esta migración y no incluye archivos binarios ni secretos. La aplicación envía contexto transaccional de actor/correlación. Operaciones administrativas directas a PostgreSQL sin contexto se consideran mantenimiento confiable y se atribuyen a Sistema. El catálogo omite migraciones 013/014 ya registradas; no ejecutar los archivos a mano ni modificar migraciones distribuidas.

### 015: analítica y cobertura

`015_analytics_coverage.sql` añade requisitos/casos, lotes idempotentes de tags, eventos inmutables para tendencias de bugs e índices por fecha/proyecto. Se aplica una vez desde el catálogo común. El historial comienza al aplicarla; los datos anteriores no se reconstruyen. Actualiza con `pnpm db:migrate` antes de iniciar la API.

### 017 · Administración de usuarios y auditoría

Ejecuta `pnpm db:migrate`. Añade configuración de vista de auditoría por proyecto con revisión y control Admin, registro idempotente de altas de cuentas y un índice de filtros de actividad. Conserva todos los eventos existentes; no introduce retención ni desactivación del registro. Las cuentas creadas reciben membresía de equipo sin administración y el rol seleccionado solo en el proyecto actual. No modifica cuentas con un correo ya registrado.
