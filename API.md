# API de qaTestGE

SwaggerUI: `http://localhost:3000/api/docs/`. Contrato OpenAPI 3.0.3: `GET /api/openapi.json`. El portal incluye un enlace **SwaggerUI · API** a través del proxy `/api` de Vite. Los recursos de SwaggerUI se sirven desde el backend, sin CDN ni validador remoto. Las operaciones POST de «Try it out» crean registros temporales; el acceso simulado del portal no protege la documentación ni los endpoints.

Contrato actual de la API Express. Consulta [architecture.md](./architecture.md) para el diseño futuro.

## Conexión y límites

- Base local: `http://localhost:3000/api`. Puerto configurable con `PORT`.
- Solicitudes de creación: `Content-Type: application/json`; límite del cuerpo JSON: `1mb`.
- CORS permite el origen de `FRONTEND_ORIGIN`, por defecto `http://localhost:5173`. CORS no es autorización.
- No hay autenticación, permisos, paginación, filtros ni persistencia. Reiniciar la API elimina los datos.
- El frontend todavía no consume estos endpoints; usa su propio estado de demostración.

## Endpoints

| Método | Ruta | Respuesta correcta |
|---|---|---|
| GET | `/health` | 200: `{"data":{"status":"ok"}}` |
| GET | `/bugs` | 200: `{"data":[]}` con los bugs actuales |
| POST | `/bugs` | 201: `{"data":{...}}` con el bug creado |
| GET | `/test-cases` | 200: colección en `data` |
| POST | `/test-cases` | 201: caso creado en `data` |
| GET | `/test-runs` | 200: colección en `data` |
| POST | `/test-runs` | 201: ejecución creada en `data` |
| GET | `/evidence` | 200: colección en `data` |
| POST | `/evidence` | 201: metadatos creados en `data` |

Las colecciones empiezan vacías y presentan primero los registros más recientes. No existen rutas de detalle, edición o eliminación.

## Cuerpos de creación

Las longitudes máximas se comprueban sobre el texto recibido, antes de recortarlo. Los campos obligatorios de texto deben tener contenido después de `trim`.

### Bugs

```json
{"title":"El checkout falla","project":"Web Store","priority":"Alta","description":"Pasos para reproducir","assignee":null}
```

| Campo | Reglas |
|---|---|
| `title` | Obligatorio, texto de hasta 200 caracteres |
| `project` | Obligatorio, texto de hasta 100 caracteres; actualmente es un nombre, no un ID |
| `priority` | Obligatorio: `Crítica`, `Alta`, `Media` o `Baja` |
| `description` | Opcional, texto de hasta 5000 caracteres; por defecto `""` |
| `assignee` | Opcional, `null` o texto de hasta 100 caracteres; por defecto `null` |

La respuesta añade `id` (desde `BUG-001`), `status: "Abierto"` y `createdAt` en ISO UTC. Se recortan título, descripción y proyecto.

### Casos de prueba

```json
{"title":"Validar checkout","suite":"Checkout"}
```

`title` es obligatorio y admite hasta 200 caracteres; `suite` es obligatorio y admite hasta 100. Ambos se recortan. La respuesta añade `id` (desde `TC-001`), `status: "Pendiente"` y `createdAt`. Aún no recibe pasos, resultados esperados ni categorías del diseñador de test cases.

### Ejecuciones

```json
{"title":"Regresión","owner":"QA","caseCount":4}
```

`title` y `owner` son obligatorios, con máximos de 200 y 100 caracteres respectivamente; ambos se recortan. `caseCount` es opcional, entero mayor o igual a cero, por defecto `0`. La respuesta añade `id` (desde `RUN-001`), `progress: 0`, `status: "En curso"` y `createdAt`. El contador todavía no referencia casos concretos.

### Evidencias

```json
{"name":"checkout.png","type":"Imagen","sizeBytes":1024,"related":"BUG-001"}
```

`name` es obligatorio, texto de hasta 255 caracteres, y se recorta. `type` debe ser `Imagen`, `Video` o `Archivo`. `sizeBytes` es obligatorio, entero seguro no negativo. `related` es opcional, `null` o texto de hasta 100 caracteres, por defecto `null`. La respuesta añade `id` (desde `EVD-001`) y `createdAt`.

Solo se guardan metadatos: no se cargan ni descargan archivos. Actualmente no se comprueba que `related` exista ni pertenezca a un proyecto. Esa validación de trazabilidad queda pendiente.

## Errores

```json
{"error":{"code":"INVALID_TEST_CASE","message":"Título y suite son obligatorios."}}
```

| HTTP | Código | Motivo |
|---|---|---|
| 400 | `INVALID_BUG` | Campos de bug inválidos |
| 400 | `INVALID_TEST_CASE` | Campos de caso inválidos |
| 400 | `INVALID_TEST_RUN` | Campos de ejecución inválidos |
| 400 | `INVALID_EVIDENCE` | Metadatos inválidos |
| 400 | `INVALID_JSON` | JSON malformado |
| 404 | `NOT_FOUND` | Ruta o método sin handler |
| 413 | `PAYLOAD_TOO_LARGE` | JSON superior al límite |
| 500 | `INTERNAL_ERROR` | Error no controlado |

## Comprobación local

```bash
curl http://localhost:3000/api/health
```

En PowerShell también puedes usar `Invoke-RestMethod http://localhost:3000/api/health`.

La implementación está en [`backend/src/controllers/`](./backend/src/controllers/) y las pruebas en [`backend/tests/api.test.ts`](./backend/tests/api.test.ts).
