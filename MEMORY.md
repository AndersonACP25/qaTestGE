# Memoria del proyecto

## Producto y arquitectura

- qaTestGE gestiona bugs, casos de prueba, ejecuciones y evidencias por proyecto.
- Frontend: React + TypeScript + Vite en `src/`; API: Express + TypeScript en `backend/src/`; PostgreSQL mediante `pg`.
- Mantener referencias explícitas entre entidades y autorización por proyecto/cuenta.
- La IA sigue siendo maqueta opcional. No enviar archivos ni datos sensibles a proveedores externos.
- Integraciones externas nuevas viven en `servicios/`; API y lógica local de dominio permanecen en `backend/`.

## Operación y validación

- Rama de pruebas: `qa-env`; promover a `main` por pull request.
- Antes de crear rama, revisar el árbol. Si `main`/`qa-env` tiene cambios locales pendientes, no cambiar de rama.
- Crear commits pequeños, coherentes, Conventional Commits en español; no hacer push salvo petición explícita.
- Validar con `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm format:check` y `pnpm build`.
- Actualizar este archivo al terminar cada prompt de trabajo; máximo 99 líneas.
- No usar la base de datos local para pruebas destructivas; las migraciones se ejecutan con `pnpm db:migrate`.

## Estado conocido al 2026-10-29

- La Wiki presenta el flujo disponible y aclara los límites actuales del diseñador y la IA.
- Revisión aplicada en docs/HARDENING.md: contratos Zod/DTO inferidos, ErrorBoundary, caché y tokens por proyecto; regresiones de respuestas inválidas y tardías corregidas.
- Lint tipado de promesas/hooks, globals por entorno, flags TypeScript adicionales en tsconfig.boundaries.json, filas SQL específicas y extracción de tablas/primitivas/adjuntos/controladores/rutas. AGENTS.md incorpora las reglas del informe.
- Diseñar bugs combina texto y plantillas personales localmente, permite prioridad/tags y borradores versionados por usuario/proyecto con revisión y Web Locks. Actualizar lista conserva la vista previa; corrupción/conflictos no se sobrescriben. Crear exige revisión y usa Idempotency-Key. No hay IA ni nuevo estado Borrador de dominio.
- docs/AI_INTEGRATION.md orienta la conexión futura: proveedor bajo servicios/, endpoint autenticado, consentimiento, secretos del servidor y salidas estructuradas. No hay proveedor externo real.
- Interfaz: registros de tabla a 16 px (15 px en móvil), títulos a 16 px y contadores a 14 px; Proyectos/Equipos con títulos compactos y espaciado uniforme; Configuración con apartados de selección visible. Botones habilitados tienen hover por brillo sin sombra lateral y respetan movimiento reducido. Exportar usa verde. README orientado al usuario; detalles técnicos enlazados en docs/.
- Las tablas de bugs, casos y ejecuciones incluyen acciones directas de edición y eliminación con confirmación. Un bug con casos o evidencias vinculadas no se puede eliminar.
- Las tablas de registros usan tipografía ampliada y se validan en escritorio y móvil. Test Runs permite abrir una ejecución y enfocar el primer resultado pendiente desde su fila.
- El propietario puede crear, editar y eliminar proyectos vacíos desde Proyectos. Los proyectos con registros vinculados no se borran.
- Equipos permite listar espacios y miembros, crear invitaciones de un solo uso y retirar integrantes. Aceptar una invitación concede acceso a todos los proyectos de la organización; requiere migración 010.
- Equipos permite crear, renombrar y eliminar espacios sin proyectos ni otros integrantes. Los proyectos nuevos se crean en el equipo propietario seleccionado.
- Bugs y casos se asignan a integrantes activos de la organización mediante migración 011. Retirar a un integrante con asignaciones está bloqueado hasta reasignarlas; se conserva el responsable textual histórico de bugs.
- Configuración se organiza por cuenta y seguridad, plantillas, diseño de casos e IA. Imagen de perfil e IA son maquetas sin carga de archivos ni credenciales. Se retiró «Sesión activa» del lateral.
- Exportación individual de bugs/casos y TableExport compartido para filas filtradas de bugs/casos/runs y recientes del Dashboard: Excel/PDF/Markdown locales. Exporta las columnas externas y tags, sin detalle interno; mantiene acciones de dominio por tabla. Editor de pasos adaptable.

- CI valida PR/push a main y qa-env; artefacto solo desde main. Job PostgreSQL efímero importa esquema inicial, repite migraciones y verifica aislamiento, concurrencia, asignaciones e idempotencia.
- Bugs, casos, evidencias y tags admiten sus CRUD implementados; evidencias pueden almacenar/descargar archivos privados con límite de 2 MiB. Adjuntos de casos admiten imágenes/enlaces; migraciones `007` y `008`.
- Preferencias del diseñador: documento v2 por usuario, migración de tres claves anteriores, revisión y Web Lock por escritura. Tipos incluidos y personalizados editables/eliminables desde su fila, ID estable, mínimo uno y máximo 100, nombres únicos de 1–60 caracteres. No modifica casos existentes.
- Tags tienen CRUD por proyecto, nombre único por proyecto, color y asignaciones explícitas a bugs/casos/runs. Migración `009`.
- Migraciones actuales: 004 autenticación, 005 plantillas, 006 Suite opcional, 007 adjuntos, 008 evidencias, 009 tags, 010 invitaciones, 011 responsables y 012 claves de creación por actor/proyecto/recurso con hash e ID, transaccionales. Aplicar db:migrate antes de iniciar esta versión.
- No hay integraciones externas reales en `servicios/`; solo se define ahí el lugar de futuras integraciones.
- Alertas reutilizables `Alert` para errores, éxitos, avisos e información; aplicadas en sesión, operaciones del workspace, ajustes, tags y diseño de casos.
- Alertas con tokens semánticos `--feedback-*` para ambos temas, icono destacado, cierre accesible y movimiento reducido.
- Resumen se llama Dashboard y no ofrece Nuevo bug. Editar un caso cierra primero su detalle, igual que al editar bugs; no apilar diálogos del mismo flujo.
- Tablas usan BEM `workspace-table__scroll` y `workspace-table__table`: columnas ajustadas en escritorio, filas con etiquetas en móvil hasta 620 px, sin scroll horizontal permanente. Menú móvil con icono visible y controles táctiles ampliados.
- El scroll vertical señalado encima de las tablas provenía de los filtros: `overflow-x:auto` y subrayado `bottom:-1px` creaban 1 px de overflow vertical. Se reprodujo con Playwright antes de corregirlo. Usar bloque BEM `listing-filters`, filtros con wrap y subrayado dentro del contenedor; no reintroducir overflow en esa barra.
- El diseñador admite 1–5 ejemplos por categoría y exporta su vista previa editada a Excel, PDF y Markdown local. No hay cambios de esquema ni IA real.
- El diseñador valida/envía todos los pasos actuales y permite actualizar el mismo caso ya guardado mediante confirmación explícita. No crea duplicados al actualizar.
- Test Runs permite crear, consultar, editar y eliminar; resultados por caso con notas y snapshots, progreso por `executed_at` y finalización/reapertura. Se exige al menos un caso y todos los resultados registrados para completar.
- Edición, resultados y borrado de runs se serializan en transacciones con bloqueo de la ejecución; conservar resultados/snapshots de casos mantenidos y rechazar retirada/borrado con evidencias vinculadas. No requiere migración nueva.
- `.opencode/agents/` contiene orquestador y subagentes frontend, dominio-api, calidad y qa; son perfiles de desarrollo, no funciones del producto.
- `docs/DESIGN.md` fija tokens, componentes reutilizables, BEM, accesibilidad y estados; sustituye referencias obsoletas al catálogo y capacidades.
- Playwright/Chromium usa Vite aislado en 127.0.0.1:4174 y API sintética por prueba, bloqueando red externa. Proyectos desktop, Mobile-M 375 px y Mobile-L 425 px. Scripts `test:e2e`, `test:e2e:ui`, `test:e2e:report`; CI instala Chromium y conserva artefactos de fallos.
- Cliente central y descargas conservan errores HTTP con mensajes de respaldo; proxy devuelve 503 JSON cuando la API no responde. Reutilizar `Alert` en las vistas y capturas equivalentes a try/catch; regla en AGENTS.md.
- Reportes del proyecto calculan conteos por estado, progreso promedio y aprobación solo con resultados ejecutados; permiten descargar CSV sin persistencia adicional. No se añade migración.
- El footer reutilizable se comparte entre el workspace y la pantalla de acceso. Las notificaciones globales se muestran arriba, con ancho máximo de 360 px; alertas contextuales permanecen junto a su contenido.
- Validación vigente en curso de cierre: 144 unitarias/endpoints y regresión E2E de 57 casos. PostgreSQL real temporal en puerto distinto validó migraciones repetibles, rollback, aislamiento, asignaciones, concurrencia y creaciones idempotentes de bugs/casos/runs; instancia cerrada y retirada sin tocar la BD personal.

- Tablas: filtros/búsqueda a 14 px, páginas visibles de 50 y exportación de la página; API admite limit/offset/search/status parametrizados con projectId. Dashboard/Reportes aún calculan el snapshot completo. X-Request-ID y logs JSON no incluyen cuerpos, cookies, consultas ni secretos.
