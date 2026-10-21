# qaTestGE

**Plataforma de gestión de bugs, casos de prueba, ejecuciones y evidencias.**

> **Versión objetivo:** 1.0  
> **Estado actual:** frontend conectado a la API, usuarios y sesiones en PostgreSQL; IA y carga binaria pendientes.

## Stack tecnológico

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-12-F69220?logo=pnpm&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-4-6E9F18?logo=vitest&logoColor=white)
![SwaggerUI](https://img.shields.io/badge/SwaggerUI-85EA2D?logo=swagger&logoColor=black)
![ExcelJS](https://img.shields.io/badge/ExcelJS-4-217346)
![jsPDF](https://img.shields.io/badge/jsPDF-4-E34F26)

**Base de datos de la API:**
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)

La API usa PostgreSQL (`qa_test_ge`, esquema `qa`) mediante `pg`. El frontend usa esa API con sesiones de usuario y proyectos autorizados.

## Propósito

qaTestGE busca centralizar el trabajo de QA y desarrollo: registrar y dar seguimiento a bugs, documentar casos de prueba, ejecutar pruebas manualmente y mantener evidencia vinculada con cada resultado. La meta es que un equipo pueda entender qué se probó, qué falló y con qué evidencia, sin perder el contexto entre herramientas.

La v1.0 prevé asistencia opcional de IA para acelerar la redacción y el análisis; esta integración todavía no está implementada. La IA propone; las personas revisan y deciden.

## Alcance previsto de la v1.0

Los siguientes puntos describen el objetivo del producto; consulta **Estado del repositorio** para distinguir lo disponible actualmente.

- Organizaciones y proyectos como espacios de trabajo.
- Registro y seguimiento de bugs con estado, prioridad, severidad, responsable y comentarios.
- Casos de prueba con precondiciones, pasos y resultados esperados.
- Test runs manuales con resultados por caso: aprobado, fallido, bloqueado o no ejecutado.
- Carga y asociación de evidencias a bugs, ejecuciones y resultados.
- Trazabilidad entre bugs, casos, ejecuciones y evidencias.
- Acceso autenticado, permisos por proyecto e historial de cambios.
- IA optativa para proponer borradores de bugs, sugerir casos de prueba y resumir ejecuciones.

## Principios de IA

- La aplicación debe seguir funcionando si no se configura IA, si el proveedor falla o si se agota una cuota.
- La persona usuaria elige cuándo solicitar ayuda y revisa cada propuesta antes de aplicarla.
- La IA no cambia registros por su cuenta ni ejecuta pruebas o código.
- Se envía solo el contexto mínimo necesario. Las evidencias no se comparten con IA por defecto.
- La interfaz debe indicar qué datos se enviarán al proveedor y la configuración debe permitir desactivar la función.
- Proveedores intercambiables detrás de una interfaz del servidor; claves y secretos nunca se exponen al navegador.

La disponibilidad de cada proveedor, sus condiciones de privacidad, ubicación de procesamiento y costos se deben verificar antes de habilitarlo. No se asume una integración concreta en esta definición.

## Fuera del alcance inicial

- Ejecución automatizada o integración obligatoria con pipelines CI/CD.
- Cambios autónomos realizados por IA.
- Entrenamiento de modelos con los datos del cliente.
- Un proveedor de IA, framework o infraestructura seleccionados de antemano.

## Estado del repositorio

El frontend usa React, Vite y TypeScript y consume la API Express con PostgreSQL. Login y registro crean sesiones reales; proyectos y recursos se limitan a las organizaciones de las que el usuario es miembro. Los listados, contadores y formularios manuales de bugs, casos, ejecuciones y metadatos de evidencias usan datos persistentes. El diseñador de test cases conserva ejemplos fijos y exportaciones locales; la IA no está conectada y no se sube contenido binario de archivos.

## Autenticación y apariencia

- Registro con nombre, correo y contraseña de **12 a 128 caracteres**, con confirmación en el frontend. Cada cuenta recibe su propio workspace y un proyecto inicial.
- Inicio de sesión con correo y contraseña reales. Los correos se normalizan; las contraseñas se guardan como hashes scrypt con sal aleatoria.
- Sesión de siete días en cookie HttpOnly/SameSite=Lax, Secure en producción. El token de sesión no se guarda en localStorage y su hash se almacena en PostgreSQL. Recargar recupera la sesión; **Salir** la revoca.
- La API protege recursos y valida membresía por organización. Los POST autenticados requieren X-CSRF-Token; el frontend lo gestiona automáticamente. Login/registro tienen límite básico de intentos por IP.
- Los datos anteriores no se borran ni se asignan al primer usuario que se registre. Su acceso exige una membresía explícita, según [backend/sql/README.md](./backend/sql/README.md).
- Tema claro/oscuro con preferencia del sistema y selección recordada en localStorage cuando esté disponible. Favicon y marca compartidos desde public/favicon.svg.
- Los fallos de conexión se muestran como errores; no hay fallback a usuarios o datos simulados. Recuperación de contraseña, verificación de correo, MFA e invitaciones todavía no están implementadas.

## Maqueta de diseño de test cases

En el menú **Diseñar test cases** puedes recorrer el flujo previsto para el futuro asistente:

1. Escribir una descripción, requisito o historia de usuario, o cargar el texto de ejemplo.
2. Marcar una o varias categorías: **Smoke**, **Regresión**, **Funcionales**, **UI**, **UX**, **Integración**, **Sanity**, **E2E**, **Unitarias**, **Aceptación**, **Accesibilidad**, **Seguridad**, **Rendimiento y carga**, **Compatibilidad**, **Edge cases**, **Exploratory**, **Pruebas de estrés** y **API**.
3. Ajustar el contador de cada categoría seleccionada entre **1 y 3 pruebas** y pulsar **Mostrar tabla de ejemplo**. Cada fila contiene una prueba distinta con **Acción** y **Resultado esperado**; el total y las exportaciones respetan las cantidades. El máximo corresponde a los tres ejemplos fijos disponibles por categoría.
4. Pulsar **Exportar Excel** o **Exportar PDF** para descargar la vista previa con la descripción introducida, las categorías seleccionadas, los pasos y los resultados esperados.

Esta es una maqueta frontend responsive compatible con los temas claro y oscuro. Los ejemplos son fijos y describen un registro de usuario hipotético: no se analiza el texto, no se llama a IA ni a la API, no se ejecutan pruebas y no se guardan casos. Cambiar el texto o las categorías limpia la vista previa; salir de la vista descarta su estado.

La generación contextual y la edición, revisión y confirmación antes de crear casos reales quedan para una etapa futura. La IA deberá seguir siendo opcional y usar la interfaz de proveedor del servidor descrita en la arquitectura.

## SwaggerUI y exportación de casos

- Con `pnpm dev:all`, abre **SwaggerUI · API** en el menú lateral del portal. La documentación interactiva está en `http://localhost:3000/api/docs/` y el contrato OpenAPI en `/api/openapi.json`. Las operaciones POST de «Try it out» escriben registros persistentes en PostgreSQL.
- En **Diseñar test cases**, muestra la tabla de ejemplo y pulsa **Exportar Excel** o **Exportar PDF**. Se descargan archivos `.xlsx` o `.pdf` con la descripción, las categorías seleccionadas, los pasos y los resultados esperados. Los archivos indican que son ejemplos fijos; no se generan ni guardan casos reales.
- La exportación se realiza en el navegador, sin enviar el contenido a servicios externos. ExcelJS y jsPDF/AutoTable se cargan al solicitar la exportación.
- El enlace usa `/api/docs/`: Vite lo reenvía al backend mediante el proxy `/api`. Al desplegar el frontend por separado, configura ese mismo proxy para `/api`, incluidos SwaggerUI y OpenAPI.

## Documentación

Las guías técnicas están en [`docs/`](./docs/). README, AGENTS, CONTRIBUTING, SECURITY y CHANGELOG permanecen en la raíz para facilitar su consulta y descubrimiento en GitHub.

- [TESTING.md](./docs/TESTING.md): pruebas automatizadas, revisión manual y verificación del SQL.
- [API.md](./docs/API.md): endpoints, cuerpos, respuestas, validaciones y límites actuales.
- [DESIGN.md](./docs/DESIGN.md): interfaz, temas, accesibilidad y maquetas.
- [RULES.md](./docs/RULES.md): reglas de producto, código, IA y documentación.
- [DEVELOPMENT.md](./docs/DEVELOPMENT.md): entorno, scripts y configuración local.
- [CONTRIBUTING.md](./CONTRIBUTING.md): flujo de contribución y validación.
- [SECURITY.md](./SECURITY.md): estado de seguridad, privacidad y reporte de problemas.
- [AGENTS.md](./AGENTS.md): instrucciones y límites para agentes que trabajen en el proyecto.
- [architecture.md](./docs/architecture.md): componentes, dominio, flujos, privacidad y decisiones pendientes.
- [CHANGELOG.md](./CHANGELOG.md): historial de cambios por versión.
- [`.opencode/`](./.opencode/): memoria y comandos de proyecto para OpenCode.
- [`.opencode/skills/`](./.opencode/skills/): skills base para diseño de funciones de IA, prompts y validación de salidas.
- [`tests/`](./tests/): pruebas unitarias del frontend.
- [`backend/`](./backend/): API Express MVC con repositorio PostgreSQL y pruebas de endpoints aisladas.
- [`.github/CODEOWNERS`](./.github/CODEOWNERS): propietarios sugeridos para revisión en GitHub.

## Contribuir mediante GitHub

- Usa **Reportar un bug** o **Solicitar una mejora** al abrir una issue para proporcionar el contexto necesario.
- Al abrir un pull request, completa la plantilla con el resumen, el tipo de cambio y las validaciones realizadas.
- Mantén fuera del repositorio dependencias instaladas, builds, cachés, archivos locales y secretos; las reglas están en [`.gitignore`](./.gitignore).
- Incluye `pnpm-lock.yaml` junto con los cambios de dependencias y `pnpm-workspace.yaml` para conservar una instalación reproducible. Los archivos fuente, las pruebas y la documentación también forman parte del repositorio.

## Criterios de salida para v1.0

La versión se considerará lista cuando:

1. Un usuario autorizado pueda crear y gestionar bugs y casos de prueba dentro de un proyecto.
2. Pueda crear una ejecución, registrar resultados por caso y completar la ejecución.
3. Pueda cargar, consultar y eliminar evidencia con autorización y vínculos trazables.
4. Los permisos se apliquen en el servidor y las acciones importantes queden auditadas.
5. La asistencia de IA, cuando esté configurada, entregue propuestas revisables; desactivarla o sufrir un error no impida los flujos manuales.
6. Los datos enviados a IA sean explícitos y limitados al contexto autorizado por la persona usuaria.
7. Las rutas críticas tengan validación automatizada y se documenten los pasos de instalación, configuración, ejecución y respaldo.

## Base inicial PostgreSQL

La base prevista se llama **`qa_test_ge`**. Los scripts están en [`backend/sql/`](./backend/sql/):

1. `000_create_database.sql`: crear la base fuera de una transacción, conectado a `postgres`.
2. `001_schema.sql`: importar tablas, relaciones, restricciones e índices conectado a `qa_test_ge`.
3. `003_verify.sql`: verificar integridad con datos temporales y rollback.
4. `002_demo_seed.sql`: datos ficticios opcionales para una importación inicial.

Consulta las instrucciones para psql y pgAdmin en [`backend/sql/README.md`](./backend/sql/README.md). La API ya usa el driver pg y repositorios PostgreSQL. Las creaciones requieren projectId; GET /api/projects lista los proyectos. Las ejecuciones reciben caseIds y las referencias de evidencias se validan dentro del mismo proyecto. Importar el SQL es manual; no se ejecuta al arrancar. Autenticación y membresías por organización están implementadas; la administración de invitaciones y permisos granulares sigue pendiente.

## Desarrollo

Requiere Node.js compatible con las dependencias del proyecto y pnpm `12.11.2`, según `packageManager` en `package.json`:

```bash
pnpm install --frozen-lockfile
# Configura backend/.env a partir del ejemplo con tu DATABASE_URL local
pnpm db:migrate
pnpm db:check
pnpm dev:all
```

La API escucha por defecto en `http://localhost:3000`. El frontend corre en `http://localhost:5173`; si el puerto está ocupado, Vite muestra otro disponible en la terminal. SwaggerUI está en `http://localhost:3000/api/docs/`.

`pnpm dev:all` inicia ambos servicios en paralelo; `Ctrl+C` detiene la sesión conjunta. Para iniciarlos por separado usa `pnpm dev:frontend` y `pnpm dev:backend`. Se conservan `pnpm dev` (frontend) y `pnpm dev:api` (backend). También existen `pnpm build:frontend` y `pnpm build:backend`. Consulta [DEVELOPMENT.md](./docs/DEVELOPMENT.md) para todos los comandos.

### Endpoints disponibles

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/health` | Estado de la API y conexión PostgreSQL |
| `GET` | `/api/projects` | Proyectos autorizados para la cuenta |
| `POST` | `/api/auth/register`, `/api/auth/login` | Registro e inicio de sesión |
| `GET` | `/api/auth/me` | Usuario y token CSRF de la sesión |
| `POST` | `/api/auth/logout` | Revocar la sesión |
| `GET`, `POST` | `/api/bugs` | Listar y crear bugs |
| `GET`, `POST` | `/api/test-cases` | Listar y crear casos de prueba |
| `GET`, `POST` | `/api/test-runs` | Listar y crear ejecuciones |
| `GET`, `POST` | `/api/evidence` | Listar y registrar metadatos de evidencia |
| `GET` | `/api/docs/` | Documentación interactiva SwaggerUI |
| `GET` | `/api/openapi.json` | Contrato OpenAPI 3.0.3 |

Las escrituras de evidencia registran metadatos únicamente, no cargan el archivo. Los recursos de la API se conservan en PostgreSQL tras reiniciar. El frontend consulta recursos del proyecto seleccionado.

### Validación

```bash
pnpm test
pnpm test:watch
pnpm typecheck
pnpm build
```

`pnpm build` verifica tipos y genera la compilación del frontend y backend. La API carga backend/.env (con alternativa en la raíz) y requiere DATABASE_URL. También admite PORT y FRONTEND_ORIGIN o CORS_ORIGIN. No usa JWT_SECRET: las sesiones son opacas y revocables en PostgreSQL. No configures secretos en el cliente. Antes de un despliegue público, configura HTTPS y protección operativa, respaldos y almacenamiento seguro para el contenido de evidencias.
