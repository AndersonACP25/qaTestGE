# qaTestGE

**qaTestGE es una plataforma web para organizar bugs, casos de prueba, ejecuciones y evidencias dentro de proyectos QA.** Una cuenta puede gestionar sus proyectos, registrar incidencias y casos, crear ejecuciones manuales y relacionar metadatos de evidencias. La aplicación vincula los recursos mediante identificadores y valida el acceso a los proyectos en el backend.

> **Estado actual:** frontend React conectado a una API Express y PostgreSQL. El diseñador permite editar pasos de ejemplos ilustrativos y ofrece una acción explícita para guardar cada caso seleccionado; no usa IA ni guarda la vista previa automáticamente. Los casos guardados admiten hasta 100 pasos con acción y resultado esperado, Suite opcional, imágenes y enlaces relacionados. Las evidencias almacenan el archivo en PostgreSQL y permiten descargarlo de forma autenticada (máximo 2 MiB).

La sección Wiki explica el flujo disponible de proyectos, bugs, casos, ejecuciones, evidencias, tags y configuración. Las tablas de bugs, casos y ejecuciones ofrecen acciones directas para editar y eliminar. No se puede eliminar un bug con casos o evidencias vinculados.

Los botones de exportación de bugs y casos permiten elegir PDF, Excel o Markdown. Los pasos de casos se editan en una tabla adaptable a dispositivos móviles. Los ajustes se organizan en apartados para cuenta y seguridad, plantillas, diseño de casos e IA.

En Proyectos, el propietario puede crear y editar proyectos de su espacio. La eliminación está permitida únicamente cuando no existen registros vinculados; los proyectos accesibles siguen limitados por membresía de organización.

## Stack tecnológico

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-24-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-4169E1?logo=postgresql&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-12-F69220?logo=pnpm&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-4-6E9F18?logo=vitest&logoColor=white)
![SwaggerUI](https://img.shields.io/badge/SwaggerUI-85EA2D?logo=swagger&logoColor=black)
![ExcelJS](https://img.shields.io/badge/ExcelJS-4-217346)
![jsPDF](https://img.shields.io/badge/jsPDF-4-E34F26)

El frontend usa React, TypeScript y Vite. La API usa Node.js, Express, TypeScript y `pg`; PostgreSQL guarda el esquema `qa` en la base `qa_test_ge`. pnpm gestiona el workspace y Vitest las pruebas.

## Funciones implementadas

- Registro e inicio de sesión con sesiones persistidas y contraseñas protegidas con scrypt.
- Actualización de nombre, correo y contraseña desde **Configuración**.
- Plantillas personales de bugs guardadas en PostgreSQL, administrables en Configuración y cargables al crear una incidencia.
- Desactivación y anonimización de cuenta con contraseña actual, revocación de sesiones y conservación de proyectos y registros QA relacionados.
- Configuración de IA visible como maqueta no funcional: no guarda claves ni conecta proveedores.
- Una cuenta corresponde a una persona; no hay gestión de equipo, invitaciones ni administración de membresías desde la interfaz.
- Alta, consulta, edición y eliminación de casos de prueba. Los cambios se persisten en PostgreSQL; un caso asociado a una ejecución no se puede eliminar para preservar sus referencias.
- Casos de prueba con estados (`Pendiente`, `Aprobado`, `Fallido`), Suite opcional y hasta 100 pasos, cada uno con acción y resultado esperado.
- Adjuntos de imágenes PNG, JPEG, GIF o WebP (máximo 2 MiB cada una y 5 por carga) y enlaces HTTP(S), almacenados o referenciados en PostgreSQL. Su consulta requiere sesión y acceso al proyecto.
- Vista previa del diseñador editable localmente, con múltiples pasos por caso y exportación actualizada a Excel/PDF/Markdown.
- Exportación de bugs y casos de prueba individuales a PDF, Excel o Markdown desde el menú de tres puntos, incluidos los pasos del caso.
- Creación de ejecuciones manuales vinculadas a casos.
- Evidencias con archivos privados de hasta 2 MiB, vínculo a recursos QA y descarga autenticada desde el mantenimiento.
- Diseñador de casos de prueba con categorías identificadas por colores, cantidades ajustables, vista previa editable y ejemplos exportables a Excel/PDF/Markdown. El usuario puede guardar explícitamente casos individuales en el proyecto; la descripción no se analiza y no se llama a IA. Configuración permite guardar cantidades iniciales por categoría en el navegador.
- ESLint y Prettier para validar y mantener consistentes el estilo y formato del código.
- Temas claro y oscuro.

La integración de IA es opcional y todavía no está implementada. No se ofrecen actualmente recuperación de contraseña, verificación de correo, MFA, invitaciones, permisos granulares ni auditoría.

## CI/CD

GitHub Actions valida cada pull request y cada push a `main` o `qa-env` con Node.js 24 y pnpm 12.11.2: instalación congelada, formato, lint, TypeScript, pruebas y build. Los pushes a `main` publican el frontend y el backend compilados como artefacto descargable de Actions durante 14 días; los pushes a `qa-env` solo ejecutan validaciones. No se despliega automáticamente a un servidor porque este repositorio aún no define un proveedor ni un entorno de despliegue.

### Flujo de ramas

`qa-env` es la rama del ambiente de pruebas. Integra ahí los cambios para validarlos antes de promoverlos mediante un pull request a `main`. La rama no implica un despliegue automático: el flujo actual de Actions valida pull requests y publica artefactos solo al hacer push a `main`.

## Requisitos

- Node.js **24.12.0** o una versión compatible con los scripts y dependencias del proyecto.
- pnpm **12.11.2**.
- PostgreSQL **18** (o una versión compatible con los scripts SQL).
- `psql` en el PATH para importar el esquema desde la terminal, o pgAdmin para ejecutar los mismos archivos manualmente.

Comprueba las versiones antes de continuar:

```bash
node --version
pnpm --version
psql --version
```

Si pnpm aún no está instalado, instálalo con la versión fijada por el proyecto:

```bash
npm install --global pnpm@12.11.2
```

## Instalación desde cero

### 1. Obtener el proyecto e instalar dependencias

Clona el repositorio y ejecuta los comandos desde su raíz:

```bash
git clone https://github.com/AndersonACP25/qaTestGE.git
cd qaTestGE
pnpm install --frozen-lockfile
```

Si trabajas sobre una copia local del repositorio, omite `git clone` y entra directamente a la carpeta raíz.

### 2. Crear la base de datos y el esquema inicial

El rol de PostgreSQL usado aquí debe tener permiso para crear bases de datos. En PowerShell, Terminal o una consola con `psql`:

```bash
psql -h localhost -U postgres -d postgres -v ON_ERROR_STOP=1 -f backend/sql/000_create_database.sql
psql -h localhost -U postgres -d qa_test_ge -v ON_ERROR_STOP=1 -f backend/sql/001_schema.sql
```

`000_create_database.sql` se ejecuta conectado a `postgres`; `001_schema.sql`, conectado a `qa_test_ge`. El esquema inicial crea tablas y restricciones y no debe repetirse sobre una base ya inicializada. Para pgAdmin, consulta [backend/sql/README.md](./backend/sql/README.md).

Opcionalmente puedes comprobar la integridad con `003_verify.sql`. El seed `002_demo_seed.sql` agrega datos ficticios; ejecútalo como máximo una vez. Esos datos no se asignan automáticamente a la primera cuenta que se registre.

### 3. Configurar la conexión local

Crea `backend/.env` copiando [backend/.env.example](./backend/.env.example) y ajusta `DATABASE_URL` a las credenciales locales de PostgreSQL. Ejemplo de formato:

```dotenv
DATABASE_URL=postgresql://postgres:<CONTRASEÑA_LOCAL>@localhost:5432/qa_test_ge
PORT=3000
FRONTEND_ORIGIN=http://localhost:5173
```

No incluyas los signos `<` y `>` al reemplazar la contraseña. Si contiene caracteres reservados de URL, codifícalos. El archivo `.env` es local e ignorado por Git: **no lo publiques ni compartas sus credenciales**. No uses un secreto real en `VITE_*` ni en el frontend.

La API requiere la base `qa_test_ge` y el esquema `qa` inicializado antes de arrancar.

### 4. Aplicar las migraciones de cuenta y plantillas

```bash
pnpm db:migrate
pnpm db:check
```

`db:migrate` aplica idempotentemente las migraciones `004_authentication.sql` (usuarios, membresías y sesiones), `005_bug_templates.sql` (plantillas personales), `006_optional_test_suite.sql` (Suite opcional), `007_test_case_attachments.sql` (imágenes y enlaces de casos), `008_evidence_files.sql` (archivos privados de evidencias, hasta 2 MiB) y `009_tags.sql` (tags de proyecto y asociaciones con bugs, casos y ejecuciones). No borra ni asigna datos existentes. `db:check` comprueba la conexión y el esquema sin modificar datos.

Si partes de una base que ya tenía el esquema inicial, **no vuelvas a importar `001_schema.sql`**: configura la conexión y ejecuta `pnpm db:migrate` y `pnpm db:check`.

### 5. Iniciar la aplicación

```bash
pnpm dev
```

El comando levanta Vite y la API en paralelo:

- Frontend: `http://localhost:5173` (si el puerto está ocupado, Vite anunciará otro).
- API: `http://localhost:3000`; disponibilidad: `/api/health`.
- SwaggerUI: `http://localhost:3000/api/docs/`.

Vite lee el `PORT` de `backend/.env` para reenviar `/api` al puerto de la API. Reinicia los servicios tras cambiar la configuración. Si aparece `vite http proxy error` con `ECONNREFUSED`, comprueba que la API inició, revisa `PORT` y ejecuta `pnpm db:check`.

Para iniciar solo una parte:

```bash
pnpm dev:frontend
pnpm dev:backend
```

Al abrir la aplicación, registra una cuenta para crear un workspace y proyecto propios. Los datos de ejemplo o proyectos anteriores requieren una membresía explícita; el registro no concede acceso automático a ellos.

## Comandos útiles

La versión **1.1.0** añade CRUD de Test Runs, resultados por caso con notas y snapshots, finalización/reapertura, guardado completo y actualización de pasos del diseñador, y listados adaptados a Mobile-M/Mobile-L. Consulta [CHANGELOG.md](./CHANGELOG.md) y la [guía Playwright](./docs/TESTING.md#playwright).

| Comando                      | Descripción                                                            |
| ---------------------------- | ---------------------------------------------------------------------- |
| `pnpm dev`                   | Inicia frontend y API                                                  |
| `pnpm dev:frontend`          | Inicia solo Vite                                                       |
| `pnpm dev:backend`           | Inicia solo la API                                                     |
| `pnpm db:migrate`            | Aplica/verifica las migraciones versionadas de cuenta, recursos y tags |
| `pnpm db:check`              | Comprueba la base y el esquema sin escrituras                          |
| `pnpm lint`                  | Ejecuta ESLint                                                         |
| `pnpm format`                | Formatea los archivos compatibles con Prettier                         |
| `pnpm format:check`          | Comprueba el formato sin modificar archivos                            |
| `pnpm typecheck`             | Comprueba tipos del frontend y pruebas incluidas                       |
| `pnpm test`                  | Ejecuta pruebas unitarias y de API sin requerir PostgreSQL             |
| `pnpm test:e2e`              | Playwright: escritorio, Mobile-M y Mobile-L con API simulada           |
| `pnpm test:e2e:ui`           | Abre el runner interactivo de Playwright                               |
| `pnpm build`                 | Compila frontend y backend                                             |
| `pnpm --dir backend test:db` | Ejecuta pruebas opcionales con `TEST_DATABASE_URL` aislada             |

No uses `test:db` contra una base con datos de trabajo: requiere una base de pruebas descartable definida explícitamente. Consulta [docs/TESTING.md](./docs/TESTING.md).

## Migrar una instalación existente

1. Haz un respaldo de PostgreSQL con el procedimiento de tu entorno y verifica que puedas restaurarlo.
2. Actualiza el código y las dependencias con `pnpm install --frozen-lockfile`.
3. Conserva la base y el esquema actuales; no reejecutes `000_create_database.sql` ni `001_schema.sql` sobre una instalación existente.
4. Configura `DATABASE_URL` para la base `qa_test_ge`.
5. Ejecuta `pnpm db:migrate` y luego `pnpm db:check`.
6. Ejecuta `pnpm typecheck`, `pnpm test` y `pnpm build` antes de reiniciar la aplicación.

Las migraciones 004–009 son idempotentes. La 004 no asigna organizaciones o proyectos existentes a nuevos usuarios; la 005 crea la tabla de plantillas por usuario; la 006 permite Suite vacía/nula sin modificar los datos existentes; la 007 añade imágenes y enlaces de casos; la 008 añade archivos privados de evidencia; la 009 agrega tags por proyecto con asociaciones para bugs, casos y ejecuciones. No hay migración automática al arrancar; futuras modificaciones deben agregarse como migraciones versionadas. Al desactivar una cuenta desde Configuración, el usuario se anonimiza y queda inactivo, se revocan las sesiones y se eliminan sus plantillas; las membresías, proyectos y registros QA se conservan.

## API y documentación

La documentación interactiva está en `/api/docs/`; el contrato OpenAPI en `/api/openapi.json`.

| Método            | Ruta                                                        | Descripción                                             |
| ----------------- | ----------------------------------------------------------- | ------------------------------------------------------- |
| `GET`             | `/api/health`                                               | Estado de API y PostgreSQL                              |
| `GET`             | `/api/projects`                                             | Proyectos autorizados                                   |
| `POST`            | `/api/auth/register`, `/api/auth/login`                     | Registro e inicio de sesión                             |
| `GET`, `PATCH`    | `/api/auth/me`                                              | Consultar o actualizar nombre y correo                  |
| `DELETE`          | `/api/auth/me`                                              | Desactivar y anonimizar cuenta con confirmación         |
| `PATCH`           | `/api/auth/password`                                        | Cambiar contraseña                                      |
| `GET`, `POST`     | `/api/auth/bug-templates`                                   | Listar y crear plantillas personales de bugs            |
| `PATCH`, `DELETE` | `/api/auth/bug-templates/{templateId}`                      | Editar o eliminar una plantilla propia                  |
| `POST`            | `/api/auth/logout`                                          | Revocar sesión                                          |
| `GET`, `POST`     | `/api/bugs`                                                 | Listar y crear bugs                                     |
| `PATCH`           | `/api/bugs/{bugId}`                                         | Editar los datos de un bug                              |
| `PATCH`           | `/api/bugs/{bugId}/status`                                  | Actualizar el estado de un bug                          |
| `GET`, `POST`     | `/api/test-cases`                                           | Listar y crear casos de prueba                          |
| `PATCH`, `DELETE` | `/api/test-cases/{caseId}`                                  | Editar o eliminar un caso no asociado a ejecuciones     |
| `PATCH`           | `/api/test-cases/{caseId}/status`                           | Actualizar el estado de un caso de prueba               |
| `GET`, `POST`     | `/api/test-cases/{caseId}/attachments`                      | Listar adjuntos o agregar enlaces HTTP(S)               |
| `POST`            | `/api/test-cases/{caseId}/attachments/image`                | Guardar una imagen privada en PostgreSQL (2 MiB máximo) |
| `GET`             | `/api/test-cases/{caseId}/attachments/{attachmentId}/image` | Consultar bytes de imagen autenticada                   |
| `DELETE`          | `/api/test-cases/{caseId}/attachments/{attachmentId}`       | Eliminar un adjunto                                     |
| `GET`, `POST`     | `/api/test-runs`                                            | Listar y crear ejecuciones                              |
| `PATCH`, `DELETE` | `/api/test-runs/{runId}`                                    | Editar y eliminar ejecuciones autorizadas               |
| `PATCH`           | `/api/test-runs/{runId}/results/{resultId}`                 | Registrar estado y notas por caso                       |
| `GET`, `POST`     | `/api/tags`                                                 | Listar y crear tags del proyecto                        |
| `PATCH`, `DELETE` | `/api/tags/{tagId}`                                         | Editar o eliminar un tag y sus asignaciones             |
| `GET`, `POST`     | `/api/evidence`                                             | Listar evidencias o registrar metadatos                 |
| `PATCH`, `DELETE` | `/api/evidence/{evidenceId}`                                | Editar o eliminar metadatos y vínculos de evidencias    |
| `POST`            | `/api/evidence/upload`                                      | Guardar archivo privado (máximo 2 MiB)                  |
| `GET`, `POST`     | `/api/evidence/{evidenceId}/file`                           | Descargar, subir o reemplazar archivo de evidencia      |

Las escrituras autenticadas requieren cookie de sesión y protección CSRF; la API valida las referencias y la pertenencia al proyecto. Los tags se crean por proyecto, tienen nombre único y color propio y se pueden asignar a bugs, casos y ejecuciones. Consulta [docs/API.md](./docs/API.md) para los límites de imágenes y los detalles de las operaciones.

## Documentación adicional

- [Arquitectura](./docs/architecture.md)
- [Desarrollo local y configuración](./docs/DEVELOPMENT.md)
- [API](./docs/API.md)
- [Pruebas](./docs/TESTING.md)
- [Esquema, SQL y acceso a proyectos](./backend/sql/README.md)
- [Seguridad y privacidad](./SECURITY.md)
- [Contribuciones](./CONTRIBUTING.md)

Los perfiles de desarrollo de OpenCode viven en `.opencode/agents/`: un orquestador coordina frontend, dominio/API y calidad. El Dashboard sustituye a Resumen; el diseñador admite de 1 a 5 casos por categoría.
