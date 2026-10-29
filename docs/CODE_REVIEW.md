# Revisión de robustez — 29 de octubre de 2026

Revisión original del frontend, API, persistencia, pruebas y CI. Las medidas aplicadas y sus límites actuales están en [HARDENING.md](HARDENING.md); AGENTS.md ya incorpora las reglas. Los hallazgos siguientes describen el estado previo para conservar la trazabilidad. Las reproducciones originales no usaron la base personal.

## Hallazgos prioritarios

### 1. Alta: una respuesta tardía puede mezclar proyectos en la interfaz

Ubicación: `src/App.tsx:1308` y `src/views/BugDesignView.tsx:79`.

Al terminar `createBug`, el componente llama a `onSaved`; ese callback añade el bug al estado actual sin comprobar a qué proyecto pertenece. Cambiar de proyecto desmonta el diseñador, pero no detiene el callback pendiente del componente anterior.

**Reproducción confirmada con Playwright y API simulada:** preparar un bug en A, retrasar su POST, cambiar el selector a B, esperar que B termine de cargar y liberar la respuesta de A. Al abrir Bugs con B seleccionado se muestra el bug de A. Esto demuestra una mezcla de estado de presentación, no un bypass de autorización del servidor.

**Recomendación:** conservar el alcance de cada operación y actualizar solamente la caché/estado correspondiente a ese usuario y proyecto. Descartar respuestas obsoletas para la vista activa; revisar también las otras mutaciones asíncronas. Cancelar una solicitud en el navegador no garantiza deshacer una escritura ya recibida por el servidor. Añadir esta secuencia como regresión permanente.

### 2. Alta: el cliente API no valida el contrato de respuestas

Ubicación: `src/api.ts:140–174`.

`api<T>` comprueba el estado HTTP y que el contenido sea JSON, pero devuelve `body.data as T`. La aserción no valida ni el sobre ni el contenido en ejecución.

**Reproducción confirmada con fetch simulado:** HTTP 200 con `{}` devuelve `undefined`; `{data: "incorrecto"}` se acepta aunque se espere una lista; `null` provoca `TypeError` en vez de `ApiError`. Un consumidor puede fallar después, lejos del origen del problema. La raíz React no dispone de un Error Boundary de aplicación que ofrezca recuperación ante errores de renderizado.

**Recomendación:** validar primero el sobre y después el DTO de cada endpoint. Normalizar fallos a `INVALID_RESPONSE`, preservar el último estado válido y añadir un Error Boundary como protección complementaria. Priorizar usuarios/sesiones, proyectos y listados. Mantener validación de entradas en el servidor: validar respuestas en frontend no la reemplaza.

### 3. Media: guardado parcial de preferencias y conflictos entre pestañas

Ubicación: `src/App.tsx:1276–1289` y `src/models/bugDesign.ts:74–76`.

Los tipos, cantidades y selección se guardan mediante tres llamadas separadas a localStorage. Si una escritura posterior falla, las anteriores no se revierten y el estado React no llega a actualizarse. Se deduce del orden del código; no se reprodujo una cuota real del navegador.

Los borradores guardan la lista completa desde el estado de una pestaña. Dos pestañas que cargan la misma lista y luego guardan borradores diferentes pueden sobrescribir cambios: no hay revisión ni coordinación entre ellas.

**Recomendación:** un único documento versionado para preferencias relacionadas y una migración compatible con las claves actuales. Para borradores, detectar conflictos por revisión y avisar antes de sobrescribir, o adoptar almacenamiento transaccional si se necesita escritura simultánea. Un evento `storage` ayuda a detectar cambios, pero por sí solo no garantiza exclusión mutua. No confundir consistencia local con sincronización entre dispositivos.

### 4. Alta para datos: CI no ejecuta integración real con PostgreSQL

Ubicación: `.github/workflows/ci.yml`, `backend/scripts/verify-postgres.ts` y `tests/unit/database.test.ts`.

CI ejecuta Vitest y Playwright, pero no levanta PostgreSQL ni llama a `test:db`. Existe una verificación optativa con `TEST_DATABASE_URL`; las pruebas con dobles siguen siendo útiles, pero no garantizan que SQL, restricciones, migraciones y bloqueos funcionen en PostgreSQL real.

**Recomendación:** añadir un job con una base efímera exclusiva. Reutilizar la verificación existente y ampliar escenarios de aislamiento entre cuentas, migraciones, rollback, asignaciones y edición concurrente de ejecuciones. Empezaría con un servicio PostgreSQL de GitHub Actions para evitar otra dependencia; Testcontainers es una alternativa si interesa el mismo arranque automático en desarrollo. Mantener las unitarias sin red ni base de datos. No ejecutar el script actual contra una base compartida: crea y elimina datos.

## Mejoras preventivas

- **Lint y tipos:** `eslint.config.js` usa el preset recomendado sin información de tipos y mezcla globals de navegador, Node y tests en todos los archivos. Activar lint tipado progresivamente y separar entornos; añadir reglas de hooks. En `postgres.repository.ts`, el `Row` común extiende `QueryResultRow` y deja numerosas columnas sin tipos explícitos: sustituirlo por filas específicas de bugs, casos y ejecuciones. Evaluar `noUncheckedIndexedAccess` y `exactOptionalPropertyTypes` por etapas, sin silenciar errores con aserciones.
- **Separación de responsabilidades:** App tiene unas 2748 líneas y styles.css unas 4777. Extraer tablas, diálogos y controladores por capacidad, dejando App como composición. Dividir las rutas de proyectos/equipos fuera de `app.ts` y separar gradualmente los repositorios por dominio. Usar límites por responsabilidad, no un número arbitrario de líneas. No hace falta migrar de framework ni introducir un gestor global de estado para hacerlo.
- **Listados con límites:** `listBugs`, `listCases` y `listRuns` no ofrecen paginación. Los filtros son locales. Antes de aumentar volumen, llevar filtros y paginación a la API, con orden estable e índices verificados. Definir si Exportar tabla significa página visible o todos los resultados filtrados al cambiar este contrato.
- **Escrituras reintentables:** bloquear un botón evita algunos duplicados, pero no cubre una creación confirmada por el servidor cuya respuesta se pierde. Antes de añadir reintentos automáticos, definir idempotencia para POST o un mecanismo de reconciliación. No reintentar creaciones a ciegas.
- **Observabilidad segura:** los errores de API registran mensajes genéricos sin un identificador que vincule la solicitud con el fallo. Añadir request ID, ruta, estado y duración, con códigos de error seguros y redacción. No registrar cookies, credenciales, prompts, evidencias ni descripciones completas. Puede iniciarse con JSON estructurado sin añadir un servicio externo.

## Herramientas que aportan valor

| Herramienta                         | Aplicación concreta                                           | Adopción propuesta                                                                                                                                                                                 |
| ----------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| typescript-eslint con tipos         | Detectar promesas mal usadas y propagación de tipos inseguros | Reutilizar el paquete instalado; habilitar por etapas `recommendedTypeChecked`, `no-floating-promises` y `no-misused-promises`. Revisar también el manejo real de rechazos: `void` no los captura. |
| eslint-plugin-react-hooks           | Comprobar reglas de hooks y dependencias de efectos           | Añadir como dependencia de desarrollo compatible con ESLint actual; empezar con `rules-of-hooks` y `exhaustive-deps`.                                                                              |
| Zod                                 | Validar DTO de API y documentos locales en ejecución          | Evaluar una sola biblioteca de esquemas, compartir contratos y evitar mantener validaciones divergentes. Empezar por una ruta, no migrar todos los formularios a la vez.                           |
| PostgreSQL efímero / Testcontainers | Probar SQL, migraciones, relaciones y concurrencia reales     | Preferir primero un servicio de CI; Testcontainers si compensa el requisito de un runtime de contenedores en desarrollo.                                                                           |

No instalar todas las herramientas simultáneamente. Para v1, priorizar contratos, concurrencia y pruebas de datos sobre añadir plataformas de monitoreo, colas o frameworks nuevos.

Documentación oficial consultada: [lint tipado](https://typescript-eslint.io/getting-started/typed-linting/), [promesas sin manejar](https://typescripteslint.com/rules/no-floating-promises/), [reglas de hooks](https://react.dev/reference/eslint-plugin-react-hooks), [validación con Zod](https://zod.dev/basics) y [PostgreSQL con Testcontainers](https://node.testcontainers.org/modules/postgresql/).

## Reglas propuestas para AGENTS.md

Estas reglas ya se incorporaron a AGENTS.md; se conserva aquí su motivación:

1. **Contratos externos:** tratar JSON de API, almacenamiento local y proveedores como `unknown`; validar estructura y límites antes de usarlo. Una aserción `as T` no cuenta como validación. Mantener DTO, validación y OpenAPI alineados.
2. **Alcance asíncrono:** toda operación captura usuario y proyecto; una respuesta tardía no puede modificar el estado de otro alcance. Probar cambios de proyecto durante lecturas y escrituras.
3. **Reintentos:** no reintentar automáticamente una creación sin garantizar idempotencia o reconciliación. No afirmar que abortar fetch revierte una escritura.
4. **Persistencia local:** versionar documentos, migrar formatos anteriores, agrupar preferencias relacionadas y manejar corrupción, cuotas y conflictos entre pestañas sin sobrescribir datos silenciosamente.
5. **SQL y autorización:** cambios en migraciones, relaciones, permisos o transacciones requieren pruebas de integración en PostgreSQL efímero, además de unitarias deterministas. Nunca usar la base personal o productiva.
6. **Promesas:** toda promesa debe tener un responsable de manejar su rechazo; usar `void` requiere que la función invocada ya gestione los fallos o que exista una captura explícita. Mantener los errores seguros y la excepción documentada del 401 al comprobar sesión.
7. **Responsabilidades:** no añadir nueva lógica de dominio o persistencia a App. Extraer por capacidad y reutilizar componentes con contratos claros; evitar abstracciones genéricas sin más de un uso concreto.
8. **Regresiones:** cada arreglo debe probar el fallo observable cuando corresponda. Cubrir respuestas inválidas, errores parciales, cambios de alcance y concurrencia; evitar pruebas que solo repitan la implementación.

## Orden recomendado

1. Corregir la respuesta tardía entre proyectos y blindar `api<T>` con pruebas de regresión.
2. Añadir lint tipado y de hooks, y mejorar tipos de filas SQL.
3. Introducir integración PostgreSQL efímera en CI.
4. Consolidar persistencia local y extraer módulos de App.
5. Abordar paginación, idempotencia y observabilidad según uso previsto; después conectar IA sobre estas bases.

## Alcance de la verificación

Se realizó inspección de código y dos reproducciones aisladas: respuestas inválidas del cliente y respuesta tardía de creación entre proyectos. Los archivos temporales originales se retiraron; sus regresiones permanentes están ahora en tests/e2e/hardening.spec.ts. No se repitió la suite completa, no se midió rendimiento con carga y no se ejecutaron pruebas contra PostgreSQL. La revisión no concluye que la seguridad o la concurrencia del resto del sistema estén exhaustivamente verificadas.
