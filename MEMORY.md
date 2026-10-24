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

## Estado conocido al 2026-10-23

- Rama de trabajo: `fix/ci-formato-skills`, creada desde `main` limpio para corregir el bloqueo de formato de Actions. No publicar sin solicitud.
- CI valida pull requests y pushes a `main` y `qa-env`; artefacto solo se publica desde `main`.
- El job 120736496879 falló en `format:check` por 36 archivos de skills importadas. `.prettierignore` excluye `.agents/skills/` y los informes de pruebas; código, documentación y `.opencode/skills/` conservan la validación estricta. No se desactiva ningún paso del workflow.
- Validación local del arreglo: formato global, lint, tipos, build frontend/backend y 92 pruebas pasan. La ejecución remota seguirá usando la configuración anterior hasta integrar esta rama; no se ha publicado ni reejecutado Actions.
- Bugs, casos, evidencias y tags admiten sus CRUD implementados; evidencias pueden almacenar/descargar archivos privados con límite de 2 MiB. Adjuntos de casos admiten imágenes/enlaces; migraciones `007` y `008`.
- Los conteos y las categorías iniciales del diseñador se guardan por usuario en localStorage.
- Tags tienen CRUD por proyecto, nombre único por proyecto, color y asignaciones explícitas a bugs/casos/runs. Migración `009`.
- Migraciones actuales: 004 autenticación, 005 plantillas, 006 Suite opcional, 007 adjuntos de casos, 008 archivos de evidencia y 009 tags.
- No hay integraciones externas reales en `servicios/`; solo se define ahí el lugar de futuras integraciones.
- Alertas reutilizables `Alert` para errores, éxitos, avisos e información; aplicadas en sesión, operaciones del workspace, ajustes, tags y diseño de casos.
- Incidencia de API resuelta: faltaban objetos de migraciones en el esquema; `pnpm db:migrate` aplicó/verificó 004–009 y `pnpm db:check` pasó. Backend usa puerto 4000 desde configuración local; `/api/health` da 200 y `/api/auth/me` sin sesión da 401 por backend y Vite. El backend valida esquema antes de escuchar.

- Diagnóstico actual: 500 de Vite por backend detenido en puerto 4000; API iniciada y `/api/auth/me` responde 401 sin cookie. `db:check` pasa sin modificar datos.
- Cliente central y descargas conservan errores HTTP con mensajes de respaldo; proxy devuelve 503 JSON cuando la API no responde. Reutilizar `Alert` en las vistas y capturas equivalentes a try/catch; regla en AGENTS.md.
