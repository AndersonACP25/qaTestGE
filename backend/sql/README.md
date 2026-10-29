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
