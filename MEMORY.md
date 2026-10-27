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

## Estado conocido al 2026-10-27

- La Wiki presenta el flujo disponible y aclara los límites actuales del diseñador y la IA.
- Las tablas de bugs, casos y ejecuciones incluyen acciones directas de edición y eliminación con confirmación. Un bug con casos o evidencias vinculadas no se puede eliminar.
- Las acciones de tablas tienen columna suficiente y botones sin cortes; la regresión E2E verifica Dashboard y listados en escritorio y móvil.
- El propietario puede crear, editar y eliminar proyectos vacíos desde Proyectos. Los proyectos con registros vinculados no se borran.
- Equipos permite listar espacios y miembros, crear invitaciones de un solo uso y retirar integrantes. Aceptar una invitación concede acceso a todos los proyectos de la organización; requiere migración 010.
- Equipos permite crear, renombrar y eliminar espacios sin proyectos ni otros integrantes. Los proyectos nuevos se crean en el equipo propietario seleccionado.
- Bugs y casos se asignan a integrantes activos de la organización mediante migración 011. Retirar a un integrante con asignaciones está bloqueado hasta reasignarlas; se conserva el responsable textual histórico de bugs.
- Configuración se organiza por cuenta y seguridad, plantillas, diseño de casos e IA. La configuración de IA sigue siendo una maqueta.
- Los botones Exportar de bugs y casos abren la selección de formato; el editor de pasos utiliza una tabla adaptable en creación y edición.

- CI valida pull requests y pushes a `main` y `qa-env`; artefacto solo se publica desde `main`.
- El job 120736496879 falló en `format:check` por 36 archivos de skills importadas. `.prettierignore` excluye `.agents/skills/` y los informes de pruebas; código, documentación y `.opencode/skills/` conservan la validación estricta. No se desactiva ningún paso del workflow.
- Validación local del arreglo: formato global, lint, tipos, build frontend/backend y 92 pruebas pasan. La ejecución remota seguirá usando la configuración anterior hasta integrar esta rama; no se ha publicado ni reejecutado Actions.
- Bugs, casos, evidencias y tags admiten sus CRUD implementados; evidencias pueden almacenar/descargar archivos privados con límite de 2 MiB. Adjuntos de casos admiten imágenes/enlaces; migraciones `007` y `008`.
- Los conteos y las categorías iniciales del diseñador se guardan por usuario en localStorage.
- Tags tienen CRUD por proyecto, nombre único por proyecto, color y asignaciones explícitas a bugs/casos/runs. Migración `009`.
- Migraciones actuales: 004 autenticación, 005 plantillas, 006 Suite opcional, 007 adjuntos de casos, 008 archivos de evidencia y 009 tags.
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
- Validación del arreglo: tipos, lint, build y 96 pruebas Vitest/API pasan; 3 regresiones de filtros pasan en 375/425/1024/1180/1440 px y ambos temas. Las 12 E2E previas también pasan; capturas revisadas. `format:check` global falla por formato previo en 36 archivos de `.agents/skills/`; mantenerlos ajenos. Sin pruebas contra PostgreSQL local.
- Incidencia de API resuelta: faltaban objetos de migraciones en el esquema; `pnpm db:migrate` aplicó/verificó 004–009 y `pnpm db:check` pasó. Backend usa puerto 4000 desde configuración local; `/api/health` da 200 y `/api/auth/me` sin sesión da 401 por backend y Vite. El backend valida esquema antes de escuchar.

- Diagnóstico actual: 500 de Vite por backend detenido en puerto 4000; API iniciada y `/api/auth/me` responde 401 sin cookie. `db:check` pasa sin modificar datos.
- Cliente central y descargas conservan errores HTTP con mensajes de respaldo; proxy devuelve 503 JSON cuando la API no responde. Reutilizar `Alert` en las vistas y capturas equivalentes a try/catch; regla en AGENTS.md.
