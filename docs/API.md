# API de qaTestGE

SwaggerUI: `http://localhost:3000/api/docs/`. OpenAPI 3.0.3: `GET /api/openapi.json`. El portal abre la documentación a través del proxy `/api`. Los POST de Try it out ahora escriben datos persistentes en PostgreSQL. Los recursos requieren sesión y autorización por organización.

## Conexión y contrato

- Base local: `http://localhost:3000/api`. JSON de hasta `1mb`.
- PostgreSQL `qa_test_ge`, esquema `qa`; configuración en `backend/.env` mediante `DATABASE_URL`.
- `GET /health` comprueba conexión: 200 con `{"data":{"status":"ok","database":"postgresql"}}` o 503 con `DATABASE_UNAVAILABLE`.
- Hay autenticación y autorización por proyecto. No hay paginación. Los casos de prueba y ejecuciones tienen CRUD; los bugs permiten edición y cambio de estado; las evidencias permiten edición/eliminación de metadatos y subida/descarga de archivos privados de hasta 2 MiB. Las ejecuciones permiten registrar resultados por caso, completar y reabrir.
- CORS usa `FRONTEND_ORIGIN`, o su alias `CORS_ORIGIN`, por defecto `http://localhost:5173`.
- Los IDs bigint de proyecto y organización se envían como **strings decimales**, sin conversión a Number. Máximo: `9223372036854775807`.
- Los recursos conservan prefijos (`BUG-001`, `TC-001`, `RUN-001`, `EVD-001`); no se recortan IDs de más de tres dígitos. `RES-001` referencia un resultado de ejecución.

## Endpoints

| Método        | Ruta                                                    | Respuesta correcta                                                 |
| ------------- | ------------------------------------------------------- | ------------------------------------------------------------------ |
| GET           | `/health`                                               | 200: disponibilidad de conexión                                    |
| GET           | `/projects`                                             | 200: proyectos con `id`, `organizationId`, `name`, `description`   |
| GET, POST     | `/bugs`                                                 | 200: colección / 201: bug creado                                   |
| PATCH         | `/bugs/{bugId}`                                         | 200: datos del bug actualizados                                    |
| PATCH         | `/bugs/{bugId}/status`                                  | 200: bug con estado actualizado                                    |
| GET, POST     | `/test-cases`                                           | 200: colección / 201: caso y pasos creados                         |
| PATCH, DELETE | `/test-cases/{caseId}`                                  | Actualizar caso o eliminarlo si no tiene referencias a ejecuciones |
| PATCH         | `/test-cases/{caseId}/status`                           | 200: caso con estado actualizado                                   |
| GET, POST     | `/test-cases/{caseId}/attachments`                      | Listar adjuntos y agregar enlaces HTTP(S)                          |
| POST          | `/test-cases/{caseId}/attachments/image`                | Guardar una imagen privada PNG/JPEG/GIF/WebP (hasta 2 MiB)         |
| GET           | `/test-cases/{caseId}/attachments/{attachmentId}/image` | Consultar una imagen autenticada                                   |
| DELETE        | `/test-cases/{caseId}/attachments/{attachmentId}`       | Eliminar un adjunto                                                |
| GET, POST     | `/test-runs`                                            | 200: colección / 201: ejecución con casos reales                   |
| PATCH, DELETE | `/test-runs/{runId}`                                    | Editar ejecución / eliminar sin evidencias vinculadas              |
| PATCH         | `/test-runs/{runId}/results/{resultId}`                 | Registrar resultado y notas; devuelve ejecución actualizada        |
| GET, POST     | `/tags?projectId=1`                                     | Listar y crear tags dentro del proyecto                            |
| PATCH, DELETE | `/tags/{tagId}`                                         | Actualizar o eliminar un tag; DELETE también requiere projectId    |
| GET, POST     | `/evidence`                                             | 200: colección / 201: metadatos y vínculo opcional                 |
| PATCH         | `/evidence/{evidenceId}`                                | 200: metadatos y vínculo actualizados                              |
| DELETE        | `/evidence/{evidenceId}?projectId=1`                    | Eliminar metadatos y vínculos                                      |
| POST          | `/evidence/upload?projectId=1&name=capture.png`         | Crear evidencia y almacenar archivo (máximo 2 MiB)                 |
| GET, POST     | `/evidence/{evidenceId}/file?projectId=1`               | Descargar o reemplazar el archivo privado                          |
| GET           | `/docs/`, `/openapi.json`                               | Documentación interactiva / contrato                               |

Las colecciones usan `{"data":[...]}`; las creaciones `{"data":{...}}`. Las listas de recursos admiten `?projectId=1`; omitir el filtro devuelve únicamente recursos de los proyectos autorizados para la cuenta. Orden por ID descendente, salvo proyectos (ascendente). Para seleccionar un proyecto existente, consultar primero `/projects`. No se crean proyectos u organizaciones automáticamente.

## Autenticación y autorización

### Ejecuciones en 1.1.0

`PATCH /test-runs/RUN-001` requiere `{ projectId, title, owner, caseIds, status }` y admite `tagIds`. Estado: `En curso` o `Completado`. Se conservan los resultados y snapshots de los casos mantenidos y se crean snapshots para los nuevos. Se rechazan referencias a otros proyectos y la retirada de resultados con evidencias (`409 RUN_REFERENCED`). Completar exige al menos un caso y todos sus resultados registrados (`409 RUN_INCOMPLETE`). Cambiar a `En curso` permite reabrir.

`PATCH /test-runs/RUN-001/results/RES-001` requiere `{ projectId, status, notes }`. Estados: `passed`, `failed`, `blocked`, `skipped`; notas de hasta 10000 caracteres. Actualiza `executedAt` y devuelve la ejecución con `results`. Los resultados incluyen ID, `caseId`, título actual del caso, estado, notas y pasos conservados en `steps`. Un `executedAt: null` significa pendiente; un Omitido registrado cuenta como ejecutado. El progreso es el porcentaje de resultados registrados, no el de aprobados. Una ejecución completada rechaza cambios de resultado (`409 RUN_COMPLETED`) hasta reabrirse.

`DELETE /test-runs/RUN-001?projectId=1`, con cuerpo `{}`, devuelve 204. Elimina resultados y tags de la ejecución, conserva los casos y rechaza evidencias vinculadas a la ejecución o a sus resultados (`409 RUN_REFERENCED`). Las tres operaciones requieren sesión y CSRF; recurso no disponible devuelve 404. No requieren migraciones nuevas.

| Método             | Ruta                               | Entrada / respuesta                                                                                                                                     |
| ------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST               | `/auth/register`                   | Nombre (hasta 100), correo (hasta 254), contraseña (12–128). 201 con usuario y csrfToken; crea workspace, proyecto y membresía owner en una transacción |
| POST               | `/auth/login`                      | Correo y contraseña. 200 con usuario y csrfToken; rota la sesión previa del navegador                                                                   |
| GET, PATCH, DELETE | `/auth/me`                         | Consultar sesión, actualizar perfil o desactivar/anonimizar cuenta                                                                                      |
| PATCH              | `/auth/password`                   | Verifica contraseña actual, cambia la nueva (12–128) y revoca las demás sesiones                                                                        |
| GET, POST          | `/auth/bug-templates`              | Listar y crear plantillas personales para bugs                                                                                                          |
| PATCH, DELETE      | `/auth/bug-templates/{templateId}` | Editar o eliminar una plantilla propia                                                                                                                  |
| POST               | `/auth/logout`                     | JSON vacío y X-CSRF-Token; 204 revoca sesión y borra cookie                                                                                             |

Registro e inicio establecen qa_session: cookie HttpOnly, SameSite=Lax, Path=/api, Secure en producción y expiración absoluta de siete días. Cada cuenta crea su workspace y proyecto propios; no hay gestión de miembros o invitaciones en la interfaz. La base solo conserva el hash SHA-256 del token de sesión. La respuesta pública contiene `{"data":{"user":{"id":"1","name":"QA","email":"qa@example.test"},"csrfToken":"..."}}`; nunca contraseñas, hashes ni el token de sesión.

Los recursos y proyectos requieren la cookie. Todas las escrituras protegidas (POST, PATCH y DELETE), incluido logout, exigen X-CSRF-Token obtenido de login/registro/me. Las peticiones de escritura usan JSON, salvo subida de archivos en rutas específicas; se rechazan si declaran un Origin distinto de FRONTEND_ORIGIN/CORS_ORIGIN o API_ORIGIN. La autorización consulta la membresía actual; una cuenta sin acceso recibe 404 PROJECT_NOT_FOUND al seleccionar un proyecto ajeno. Los miembros autorizados pueden leer y crear recursos, editar bugs y evidencias, y eliminar evidencias; no hay administración HTTP de roles o invitaciones.

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
{
  "projectId": "1",
  "title": "El checkout falla",
  "priority": "Alta",
  "description": "Pasos para reproducir",
  "assignee": null
}
```

Título: hasta 200 caracteres; prioridad: `Crítica`, `Alta`, `Media` o `Baja`. Descripción opcional hasta 5000, por defecto vacía. Responsable opcional, null o texto de hasta 100. Estado inicial: `Abierto`; los estados permitidos son `Abierto`, `En progreso`, `En revisión` y `Resuelto`. La respuesta añade `project` como nombre informativo; ya no se acepta ese nombre en lugar de `projectId`.

Para cambiar solo el estado se usa `PATCH /bugs/{bugId}/status` con `{"projectId":"1","status":"En progreso"}`. El identificador y proyecto se comprueban en conjunto; un proyecto no autorizado no puede modificar el registro.

`PATCH /bugs/{bugId}` recibe el mismo `projectId`, título y prioridad, con descripción y responsable opcionales, y admite `status` (`Abierto`, `En progreso`, `En revisión` o `Resuelto`). Solo actualiza un bug perteneciente al proyecto autorizado indicado.

### Casos y pasos

```json
{
  "projectId": "1",
  "title": "Validar registro",
  "preconditions": "Abrir el formulario",
  "steps": [
    { "action": "Enviar campos vacíos", "expectedResult": "Se muestran validaciones" },
    { "action": "Completar los datos requeridos", "expectedResult": "Se permite continuar" }
  ]
}
```

Título obligatorio hasta 200; `suite` opcional hasta 100 (si se omite o queda vacío se guarda como nula). Precondiciones opcionales hasta 10000. Hasta 100 pasos opcionales, cada uno con acción y resultado esperado no vacíos de hasta 10000 caracteres. El orden del array determina la posición. Caso y pasos se crean en una transacción. Estado inicial: `Pendiente`; se puede cambiar a `Aprobado` o `Fallido` desde la interfaz o mediante `PATCH /test-cases/{caseId}/status` con `{"projectId":"1","status":"Aprobado"}`. El estado solo se modifica cuando el caso pertenece al proyecto autorizado.

La migración `006_optional_test_suite.sql`, aplicada por `pnpm db:migrate`, ajusta el esquema existente para permitir Suite nula sin alterar casos actuales.

Los casos se pueden editar mediante `PATCH /test-cases/{caseId}` enviando `projectId`, `title` y, opcionalmente, Suite, precondiciones y pasos; los pasos enviados reemplazan el conjunto anterior en una transacción. `DELETE /test-cases/{caseId}?projectId=1` borra un caso y sus adjuntos solo si no tiene referencias a ejecuciones u otros recursos. Una referencia existente devuelve `409 TEST_CASE_IN_USE`. Los DELETE requieren cookie, CSRF y JSON `{}` para cumplir la validación de origen.

Los adjuntos son opcionales y se administran por proyecto. El POST de enlace acepta `{"projectId":"1","name":"Especificación","url":"https://example.com/spec"}`; solo permite URL HTTP(S) de hasta 2048 caracteres y sin credenciales. La carga de imagen envía bytes sin multipart, con el MIME como `Content-Type` y el nombre en query (`?projectId=1&name=captura.png`). Se aceptan PNG, JPEG, GIF o WebP, con firma de contenido validada y máximo de 2 MiB por imagen. La respuesta de listado contiene metadatos, nunca los bytes; `GET .../{attachmentId}/image` los entrega solo con sesión y acceso al proyecto. El cliente permite hasta cinco imágenes por operación. La migración `007_test_case_attachments.sql` guarda los bytes en PostgreSQL; eliminar el caso elimina sus adjuntos en la misma transacción.

### Ejecuciones

```json
{ "projectId": "1", "title": "Regresión", "owner": "QA", "caseIds": ["TC-001"] }
```

Título y responsable obligatorios, máximos 200 y 100. `caseIds` es opcional (por defecto vacío), máximo 1000, sin duplicados después de normalizar el ID. Cada caso debe existir en el mismo proyecto. La ejecución y sus resultados iniciales (`skipped`) se crean en una transacción, conservando un snapshot de los pasos. Una referencia inválida revierte toda la operación.

`caseCount` ya no se acepta como entrada: se calcula a partir de los casos relacionados. La respuesta incluye `caseIds`, `caseCount` y `progress`, calculado como porcentaje de resultados distintos de `skipped`. Inicialmente es 0; los resultados persistidos pueden dar otro valor. La distinción entre omitido y no ejecutado se refinará al implementar la edición de resultados. Todavía no hay endpoints para registrar resultados o completar ejecuciones.

### Tags

Los tags se administran por proyecto: `GET /tags?projectId=1`, `POST /tags`, `PATCH /tags/{tagId}` y `DELETE /tags/{tagId}?projectId=1`. Crear/actualizar requiere `projectId`, `name` (hasta 50 caracteres) y `color` en formato `#RRGGBB`. El nombre no distingue mayúsculas y debe ser único dentro del proyecto. Los POST de bugs, casos y ejecuciones aceptan `tagIds`, un array opcional de hasta 100 IDs decimales únicos; todos los tags deben pertenecer al proyecto del recurso. Las respuestas de estos recursos incluyen `tagIds` (array vacío si no hay asignaciones). Eliminar un tag elimina sus asociaciones, no los bugs, casos ni ejecuciones.

### Evidencias

```json
{
  "projectId": "1",
  "name": "checkout.png",
  "type": "Imagen",
  "sizeBytes": 1024,
  "related": "BUG-001"
}
```

Nombre obligatorio de hasta 255; tipo `Imagen`, `Video` o `Archivo`; tamaño entero seguro no negativo. `related` es opcional, null o un ID con prefijo BUG, TC, RUN o RES. La referencia debe existir en el mismo proyecto. Metadatos y vínculo se crean en una transacción. El endpoint JSON registra metadatos; la carga binaria usa las rutas específicas siguientes.

En la **respuesta**, `related` es ahora un array de referencias (`[]` si no hay vínculos) porque el SQL permite varias asociaciones para una evidencia. El POST actual crea como máximo un vínculo. No se expone `storage_key`.

`PATCH /evidence/{evidenceId}` requiere `projectId`, `name`, `type` y `sizeBytes`. Si se omite `related`, se conservan todos los vínculos existentes; enviar `null` los elimina, y enviar un ID válido sustituye los vínculos por esa referencia. `DELETE /evidence/{evidenceId}?projectId=1` elimina metadatos, archivo y vínculos. DELETE requiere cookie, CSRF y JSON `{}`.

`POST /evidence/upload?projectId=1&name=capture.png` recibe los bytes sin multipart y con su MIME en `Content-Type`; opcionalmente recibe `related`. Crea el registro y archivo en una transacción, con un máximo de 2 MiB. `POST /evidence/{evidenceId}/file?projectId=1&name=capture.png` reemplaza/sube el archivo de una evidencia existente. Ambos requieren cookie, CSRF y proyecto autorizado. `GET /evidence/{evidenceId}/file?projectId=1` descarga el archivo como attachment (no se interpreta en el navegador), con `nosniff`, sin caché y comprobación de acceso al proyecto. El límite también se aplica en Express y PostgreSQL. Las evidencias previas sin contenido binario responden `404 EVIDENCE_FILE_NOT_FOUND` hasta que se suba un archivo.

## Errores

Formato: `{"error":{"code":"INVALID_REFERENCE","message":"..."}}`.

| HTTP | Códigos                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 400  | `INVALID_BUG`, `INVALID_TEST_CASE`, `INVALID_TEST_CASE_STATUS`, `INVALID_CASE_LINK`, `INVALID_CASE_IMAGE`, `INVALID_ATTACHMENT_REFERENCE`, `INVALID_TEST_RUN`, `INVALID_EVIDENCE`, `INVALID_TAG`, `PROJECT_REQUIRED`, `INVALID_PROJECT_ID`, `INVALID_REFERENCE`, `INVALID_JSON`, `INVALID_REGISTRATION`, `INVALID_LOGIN`, `INVALID_PROFILE`, `INVALID_PASSWORD`, `INVALID_TEMPLATE`, `INVALID_ACCOUNT_DELETION` |
| 401  | `UNAUTHENTICATED`, `INVALID_CREDENTIALS`, `INVALID_PASSWORD` (contraseña actual incorrecta)                                                                                                                                                                                                                                                                                                                     |
| 403  | `INVALID_CSRF`, `INVALID_ORIGIN`                                                                                                                                                                                                                                                                                                                                                                                |
| 404  | `NOT_FOUND`, `PROJECT_NOT_FOUND`, `TEMPLATE_NOT_FOUND`, `TAG_NOT_FOUND`, `TEST_CASE_NOT_FOUND`, `CASE_ATTACHMENT_NOT_FOUND`, `CASE_IMAGE_NOT_FOUND`                                                                                                                                                                                                                                                             |
| 429  | `TOO_MANY_ATTEMPTS`, `AUTH_BUSY`                                                                                                                                                                                                                                                                                                                                                                                |
| 409  | `CONFLICT` (vínculo duplicado), `TAG_ALREADY_EXISTS` (nombre repetido en el proyecto), `ACCOUNT_EXISTS` (correo registrado), `TEST_CASE_IN_USE` (caso vinculado a una ejecución)                                                                                                                                                                                                                                |
| 413  | `PAYLOAD_TOO_LARGE` o imagen superior a 2 MiB                                                                                                                                                                                                                                                                                                                                                                   |
| 503  | `DATABASE_UNAVAILABLE`                                                                                                                                                                                                                                                                                                                                                                                          |
| 500  | `INTERNAL_ERROR`                                                                                                                                                                                                                                                                                                                                                                                                |

La API no devuelve SQL, parámetros, credenciales ni errores internos del driver. El arranque falla si no existe una conexión válida y el esquema importado; no hay fallback en memoria. `pnpm db:check` comprueba la configuración sin modificar datos.

## Contratos de robustez

POST de bugs, casos y ejecuciones acepta Idempotency-Key (UUID) opcional. Conservar cuenta, proyecto, clave y cuerpo recupera el mismo recurso sin duplicarlo. Datos diferentes producen REQUEST_KEY_CONFLICT (409); una creación eliminada produce CREATED_RESOURCE_REMOVED (409). No hay reintentos automáticos. Requiere migración 012.

GET de esas colecciones admite limit (1–100; 50 al activar opciones), offset (0–1000000), search (hasta 200; literal) y status del dominio. Usar estas opciones exige projectId. data sigue siendo un array con orden por ID descendente; sin opciones se conserva la colección completa. INVALID_PAGINATION, INVALID_FILTER y PROJECT_REQUIRED son errores 400. La UI muestra páginas de 50 y exporta la visible.

X-Request-ID permite correlacionar logs sin datos sensibles. INVALID_RESPONSE es el error local del cliente cuando el JSON o un 204 incumple el contrato esperado.

## Calidad y trazabilidad (013)

- `GET/POST /api/test-plans`: projectId obligatorio; creación con name, description, caseIds (1–1000, únicos) y `Idempotency-Key` opcional. Devuelve id PLAN, revisión y casos.
- `PATCH/DELETE /api/test-plans/{planId}`: edición requiere projectId y revisión actual en cuerpo; borrado usa projectId en query, 409 si tiene ciclos.
- `GET /api/test-cases/{caseId}/history?projectId=…`: versiones descendentes con snapshot y changedAt. Los inputs de caso añaden testType (1–100), lifecycle (Borrador/Listo/Obsoleto), expectedVersion opcional para detectar conflictos de actualización.
- `POST /api/test-runs`: acepta planId para resolver casos del plan o sourceRunId y failedOnly para copiar una ejecución; conserva el snapshot del origen y reinicia resultados. No admite ejecuciones vacías ni casos obsoletos en selecciones nuevas. Devuelve planId/sourceRunId y caseVersion por resultado.
- `POST /api/bugs`: sourceResultId debe ser un fallo registrado del proyecto; crea vínculos al caso y evidencia en la misma transacción. Solo un bug por resultado. Inputs añaden severity (Crítica/Alta/Media/Baja), environment y affectedVersion (0–100). Respuesta añade sourceResultId/sourceCaseId/sourceRunId/sourceSteps.
- `GET/PUT /api/bug-workflow?projectId=…`: states (1–20, únicos, 1–60 caracteres), transitions (lista de destinos por cada estado), closedStates opcional y revision positiva. El primer estado es el inicial; closedStates identifica resueltos. PUT requiere revisión actual, no puede retirar estados usados ni referenciar destinos inexistentes.

Todas las rutas requieren sesión y alcance del proyecto; escrituras requieren CSRF. Los conflictos de revisión y flujo devuelven 409. Swagger describe las formas completas. La importación usa POST de casos con claves idempotentes individuales; no existe un endpoint masivo ni rollback de todo el archivo.
