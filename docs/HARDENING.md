# Robustez aplicada

Implementación de la revisión de código del 29 de octubre de 2026. Las reglas propuestas están incorporadas en AGENTS.md.

| Área                 | Resultado                                                                                                                                                                                                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alcance asíncrono    | `useProjectData` mantiene la caché por proyecto y cancela lecturas obsoletas. `useOperationScope` invalida callbacks al cambiar de cuenta/proyecto, incluso al volver al mismo proyecto. Los diálogos y mutaciones no actualizan una vista de otro alcance. |
| Contratos HTTP       | Zod valida el sobre y los DTO de los endpoints JSON consumidos. Los DTO de registros se infieren de los esquemas. JSON inválido, tipos incorrectos y un 204 inesperado producen `INVALID_RESPONSE`.                                                         |
| Recuperación         | `ErrorBoundary` en la raíz ofrece recargar sin mostrar trazas. Se conserva la última información válida del proyecto hasta recuperar la conexión.                                                                                                           |
| Preferencias         | Un documento v2 por usuario conserva revisión, catálogo, cantidades y selección. Migra las tres claves antiguas y se escribe una sola vez bajo Web Lock, comprobando la revisión. Corrupción, cuota o revisión obsoleta no sobrescriben el documento.       |
| Borradores           | Conservan versión y revisión; la escritura usa Web Locks. Los cambios de otra pestaña se detectan y la lista se puede actualizar sin descartar la vista previa. Los documentos corruptos no se sobrescriben.                                                |
| CI PostgreSQL        | Un job importa el esquema inicial, ejecuta las migraciones dos veces y verifica integración en una base efímera. Las unitarias siguen sin red ni base de datos.                                                                                             |
| Creación idempotente | La migración 012 registra actor, proyecto, recurso, UUID, huella e ID creado en la misma transacción del recurso. Un advisory lock serializa solicitudes iguales. No se guarda el cuerpo completo.                                                          |
| SQL                  | Filas específicas por dominio sustituyen el `Row` común. Se mantienen consultas parametrizadas y autorización por proyecto.                                                                                                                                 |
| Lint y tipos         | Entornos browser/Node/tests separados, reglas de hooks y comprobación tipada de promesas. Los límites nuevos usan también `noUncheckedIndexedAccess` y `exactOptionalPropertyTypes` mediante `tsconfig.boundaries.json`.                                    |
| Modularidad          | App delega tablas, primitivas visuales, adjuntos, preferencias y carga por proyecto. Proyectos/equipos salen de app.ts; filas SQL y solicitudes de creación tienen módulos propios.                                                                         |
| Listados             | API de bugs/casos/runs admite límites y filtros parametrizados. La UI muestra páginas de 50 filas y exporta únicamente la página visible.                                                                                                                   |
| Observabilidad       | `X-Request-ID` generado por el servidor y logs JSON de método, patrón de ruta, estado y duración. No se registran cuerpos, consultas, cookies, claves, evidencias ni prompts.                                                                               |

## Preferencias y tipos

`CaseDesignSettings` permite añadir, editar y eliminar tipos, incluidos los predeterminados. Renombrar conserva el ID, las cantidades y la selección. Eliminar no modifica las Suites de casos guardados. Hay entre 1 y 100 tipos, con nombres únicos de 1–60 caracteres y entre 1 y 5 ejemplos por tipo.

`qatestge-case-preferences-v2:<usuario>` contiene versión, revisión, pares ID/nombre, cantidades y selección. Lee las tres claves v1 anteriores sin borrarlas. Al eliminar una selección, se usa el primer tipo restante. Si otra pestaña cambia las preferencias, hay que recargar antes de guardar; no se descarta silenciosamente una edición pendiente.

Los borradores conservan su clave anterior por usuario/proyecto, pero leen arrays antiguos y documentos v2 con revisión. **Actualizar lista de borradores** conserva la vista previa. Las escrituras requieren Web Locks; si el navegador no los permite, se muestra un error en lugar de guardar sin exclusión. No hay sincronización entre dispositivos.

## Creaciones y reintentos

Aplicar `pnpm db:migrate` antes de iniciar esta versión. `012_creation_requests.sql` es aditiva y está registrada en el migrador y la comprobación de esquema.

Los POST de bugs, casos y ejecuciones aceptan `Idempotency-Key` como UUID opcional. La autorización fija el actor real y comprueba el proyecto. La clave se limita a usuario/proyecto/recurso. Repetir el mismo cuerpo devuelve el recurso actual ya creado; cambiar el contenido produce `REQUEST_KEY_CONFLICT` (409). Si el recurso fue eliminado, se devuelve `CREATED_RESOURCE_REMOVED` (409), sin recrearlo. Borrar el proyecto elimina sus claves.

Los formularios y diseñadores conservan la clave durante cada creación; un replay no añade duplicados a la caché local. No se habilitaron reintentos automáticos. Abrir una nueva creación inicia otra clave. Cancelar fetch no promete revertir una escritura confirmada en PostgreSQL.

## Paginación y límites

Los GET de bugs/casos/ejecuciones aceptan `limit` 1–100 (50 al activar opciones), `offset` 0–1000000, `search` de hasta 200 caracteres y `status` válido. Usar estas opciones exige `projectId`. Se escapan los comodines de búsqueda y se ordena por ID descendente. Sin opciones se conserva el contrato de colección completa.

La UI pagina el snapshot filtrado a 50 filas, y Exportar tabla utiliza esa página. Dashboard y Reportes siguen calculándose desde el snapshot completo: sustituirlo por agregados y paginación remota es una evolución de capacidad cuando crezca el volumen. La paginación visual no reduce ese snapshot. No se afirma haber hecho pruebas de carga ni optimizado ILIKE con índices nuevos.

## Verificación y operación

- PostgreSQL efímero de CI: esquema inicial, migraciones repetidas y `pnpm --dir backend test:db` con `TEST_DATABASE_URL` exclusivo.
- Integración equivalente ejecutada localmente en otro puerto: sesiones, CSRF, aislamiento, rollback, creaciones idempotentes de los tres recursos, dos creaciones simultáneas con la misma clave, filtros, resultados concurrentes y reasignación antes de retirar integrantes. La instancia temporal se cierra y retira al terminar; la base personal no se utiliza.
- Regresiones Playwright: respuesta tardía de A mientras B está seleccionado, contrato inválido recuperable, edición/eliminación de tipos predeterminados, paginación de 55 filas y exportación visible, además de los flujos existentes.
- Unitarias: contratos inválidos, migración de preferencias, conflictos de revisión, cuota/corrupción, SQL parametrizado, huella estable y logs sin valores sensibles.

La adopción de comprobaciones TypeScript adicionales sigue siendo gradual. No se instaló Testcontainers ni un servicio de monitoreo: se reutilizan PostgreSQL efímero y logs JSON. IA sigue siendo una maqueta, sin proveedores ni envíos externos.
