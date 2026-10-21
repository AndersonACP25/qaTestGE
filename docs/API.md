# API de qaTestGE

SwaggerUI: `http://localhost:3000/api/docs/`. OpenAPI 3.0.3: `GET /api/openapi.json`. El portal abre la documentación a través del proxy `/api`. Los POST de Try it out ahora escriben datos persistentes en PostgreSQL. Los recursos requieren sesión y autorización por organización.

## Conexión y contrato

- Base local: `http://localhost:3000/api`. JSON de hasta `1mb`.
- PostgreSQL `qa_test_ge`, esquema `qa`; configuración en `backend/.env` mediante `DATABASE_URL`.
- `GET /health` comprueba conexión: 200 con `{"data":{"status":"ok","database":"postgresql"}}` o 503 con `DATABASE_UNAVAILABLE`.
- Hay autenticación y autorización por organización. No hay paginación ni endpoints de edición/eliminación para bugs, casos, ejecuciones o evidencias; el CRUD de plantillas personales sí permite editar y eliminar.
- CORS usa `FRONTEND_ORIGIN`, o su alias `CORS_ORIGIN`, por defecto `http://localhost:5173`.
- Los IDs bigint de proyecto y organización se envían como **strings decimales**, sin conversión a Number. Máximo: `9223372036854775807`.
- Los recursos conservan prefijos (`BUG-001`, `TC-001`, `RUN-001`, `EVD-001`); no se recortan IDs de más de tres dígitos. `RES-001` referencia un resultado de ejecución.

## Endpoints

| Método | Ruta | Respuesta correcta |
|---|---|---|
| GET | `/health` | 200: disponibilidad de conexión |
| GET | `/projects` | 200: proyectos con `id`, `organizationId`, `name`, `description` |
| GET, POST | `/bugs` | 200: colección / 201: bug creado |
| GET, POST | `/test-cases` | 200: colección / 201: caso y pasos creados |
| GET, POST | `/test-runs` | 200: colección / 201: ejecución con casos reales |
| GET, POST | `/evidence` | 200: colección / 201: metadatos y vínculo opcional |
| GET | `/docs/`, `/openapi.json` | Documentación interactiva / contrato |

Las colecciones usan `{"data":[...]}`; las creaciones `{"data":{...}}`. Las listas de recursos admiten `?projectId=1`; omitir el filtro devuelve únicamente recursos de los proyectos autorizados para la cuenta. Orden por ID descendente, salvo proyectos (ascendente). Para seleccionar un proyecto existente, consultar primero `/projects`. No se crean proyectos u organizaciones automáticamente.

## Autenticación y autorización

| Método | Ruta | Entrada / respuesta |
|---|---|---|
| POST | `/auth/register` | Nombre (hasta 100), correo (hasta 254), contraseña (12–128). 201 con usuario y csrfToken; crea workspace, proyecto y membresía owner en una transacción |
| POST | `/auth/login` | Correo y contraseña. 200 con usuario y csrfToken; rota la sesión previa del navegador |
| GET, PATCH, DELETE | `/auth/me` | Consultar sesión, actualizar perfil o desactivar/anonimizar cuenta |
| PATCH | `/auth/password` | Verifica contraseña actual, cambia la nueva (12–128) y revoca las demás sesiones |
| GET, POST | `/auth/bug-templates` | Listar y crear plantillas personales para bugs |
| PATCH, DELETE | `/auth/bug-templates/{templateId}` | Editar o eliminar una plantilla propia |
| POST | `/auth/logout` | JSON vacío y X-CSRF-Token; 204 revoca sesión y borra cookie |

Registro e inicio establecen qa_session: cookie HttpOnly, SameSite=Lax, Path=/api, Secure en producción y expiración absoluta de siete días. La base solo conserva su hash SHA-256. La respuesta pública contiene `{"data":{"user":{"id":"1","name":"QA","email":"qa@example.test"},"csrfToken":"..."}}`; nunca contraseñas, hashes ni el token de sesión.

Los recursos y proyectos requieren la cookie. Todas las escrituras protegidas (POST, PATCH y DELETE), incluido logout, exigen X-CSRF-Token obtenido de login/registro/me. Las peticiones de escritura usan JSON y se rechazan si declaran un Origin distinto de FRONTEND_ORIGIN/CORS_ORIGIN o API_ORIGIN. La autorización consulta la membresía actual; una cuenta sin acceso recibe 404 PROJECT_NOT_FOUND al seleccionar un proyecto ajeno. Los miembros tienen lectura y creación dentro de la organización; no hay administración HTTP de roles o invitaciones.

En SwaggerUI, iniciar sesión con el endpoint login, consultar me y copiar csrfToken al campo X-CSRF-Token de **Authorize** para probar POST. La cookie se envía automáticamente desde el mismo origen. No introducir el token de sesión manualmente en JavaScript.

Login y registro comparten un límite básico en memoria por proceso: 20 solicitudes por IP/15 minutos, con Retry-After y 429. La derivación de contraseñas limita también la concurrencia; ante saturación se devuelve AUTH_BUSY. Cambiar la contraseña requiere la contraseña actual; se mantiene la sesión actual y se revocan las demás. No hay recuperación de contraseña, verificación de correo ni MFA.

### Plantillas de bugs

Las plantillas son privadas por usuario y se guardan en `qa.bug_templates`. El payload de alta/edición requiere `name` (hasta 100), `title` (hasta 200), `description` (hasta 5000) y `priority` (`Crítica`, `Alta`, `Media` o `Baja`). El contenido es texto plano; no se ejecuta ni renderiza como HTML. Los endpoints solo leen, editan o eliminan plantillas cuyo `user_id` coincide con la sesión autenticada. Al crear una cuenta no hay plantillas iniciales.

### Desactivación de cuenta

`DELETE /auth/me` requiere cookie de sesión, `X-CSRF-Token` y JSON `{"currentPassword":"...","confirmation":"ELIMINAR CUENTA"}`. Verifica la contraseña actual y la frase exacta. Responde 204 y borra la cookie; la cuenta queda inactiva y nombre/correo/contraseña se anonimizan, se revocan todas las sesiones y se eliminan sus plantillas. Se conservan la fila de usuario inactiva, membresías, proyectos y recursos QA para preservar referencias e historial. La operación se ejecuta en una transacción.

## Creación de recursos

Todos los POST requieren `projectId` y validan que el proyecto exista. Los textos obligatorios no pueden quedar vacíos tras trim; las longitudes máximas se comprueban antes del recorte. Las respuestas incluyen `id`, `projectId` y `createdAt` ISO UTC.

### Bugs

```json
{"projectId":"1","title":"El checkout falla","priority":"Alta","description":"Pasos para reproducir","assignee":null}
```

Título: hasta 200 caracteres; prioridad: `Crítica`, `Alta`, `Media` o `Baja`. Descripción opcional hasta 5000, por defecto vacía. Responsable opcional, null o texto de hasta 100. Estado inicial: `Abierto`. La respuesta añade `project` como nombre informativo; ya no se acepta ese nombre en lugar de `projectId`.

### Casos y pasos

```json
{"projectId":"1","title":"Validar registro","preconditions":"Abrir el formulario","steps":[{"action":"Enviar campos vacíos","expectedResult":"Se muestran validaciones"},{"action":"Completar los datos requeridos","expectedResult":"Se permite continuar"}]}
```

Título obligatorio hasta 200; `suite` opcional hasta 100 (si se omite o queda vacío se guarda como nula). Precondiciones opcionales hasta 10000. Hasta 100 pasos opcionales, cada uno con acción y resultado esperado no vacíos de hasta 10000 caracteres. El orden del array determina la posición. Caso y pasos se crean en una transacción. Estado inicial: `Pendiente`; los GET también pueden devolver `Aprobado` o `Fallido` según lo almacenado.

La migración `006_optional_test_suite.sql`, aplicada por `pnpm db:migrate`, ajusta el esquema existente para permitir Suite nula sin alterar casos actuales.

### Ejecuciones

```json
{"projectId":"1","title":"Regresión","owner":"QA","caseIds":["TC-001"]}
```

Título y responsable obligatorios, máximos 200 y 100. `caseIds` es opcional (por defecto vacío), máximo 1000, sin duplicados después de normalizar el ID. Cada caso debe existir en el mismo proyecto. La ejecución y sus resultados iniciales (`skipped`) se crean en una transacción, conservando un snapshot de los pasos. Una referencia inválida revierte toda la operación.

`caseCount` ya no se acepta como entrada: se calcula a partir de los casos relacionados. La respuesta incluye `caseIds`, `caseCount` y `progress`, calculado como porcentaje de resultados distintos de `skipped`. Inicialmente es 0; los resultados persistidos pueden dar otro valor. La distinción entre omitido y no ejecutado se refinará al implementar la edición de resultados. Todavía no hay endpoints para registrar resultados o completar ejecuciones.

### Evidencias

```json
{"projectId":"1","name":"checkout.png","type":"Imagen","sizeBytes":1024,"related":"BUG-001"}
```

Nombre obligatorio de hasta 255; tipo `Imagen`, `Video` o `Archivo`; tamaño entero seguro no negativo. `related` es opcional, null o un ID con prefijo BUG, TC, RUN o RES. La referencia debe existir en el mismo proyecto. Metadatos y vínculo se crean en una transacción. Solo se almacenan metadatos; no se carga ningún archivo.

En la **respuesta**, `related` es ahora un array de referencias (`[]` si no hay vínculos) porque el SQL permite varias asociaciones para una evidencia. El POST actual crea como máximo un vínculo. No se expone `storage_key`.

## Errores

Formato: `{"error":{"code":"INVALID_REFERENCE","message":"..."}}`.

| HTTP | Códigos |
|---|---|
| 400 | `INVALID_BUG`, `INVALID_TEST_CASE`, `INVALID_TEST_RUN`, `INVALID_EVIDENCE`, `INVALID_PROJECT_ID`, `INVALID_REFERENCE`, `INVALID_JSON`, `INVALID_REGISTRATION`, `INVALID_LOGIN`, `INVALID_PROFILE`, `INVALID_PASSWORD`, `INVALID_TEMPLATE`, `INVALID_ACCOUNT_DELETION` |
| 401 | `UNAUTHENTICATED`, `INVALID_CREDENTIALS`, `INVALID_PASSWORD` (contraseña actual incorrecta) |
| 403 | `INVALID_CSRF`, `INVALID_ORIGIN` |
| 404 | `NOT_FOUND`, `PROJECT_NOT_FOUND`, `TEMPLATE_NOT_FOUND` |
| 429 | `TOO_MANY_ATTEMPTS`, `AUTH_BUSY` |
| 409 | `CONFLICT` (vínculo duplicado), `ACCOUNT_EXISTS` (correo registrado) |
| 413 | `PAYLOAD_TOO_LARGE` |
| 503 | `DATABASE_UNAVAILABLE` |
| 500 | `INTERNAL_ERROR` |

La API no devuelve SQL, parámetros, credenciales ni errores internos del driver. El arranque falla si no existe una conexión válida y el esquema importado; no hay fallback en memoria. `pnpm db:check` comprueba la configuración sin modificar datos.
