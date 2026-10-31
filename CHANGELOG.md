# Changelog

Todos los cambios importantes de qaTestGE se documentan aquí. El formato sigue [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) y el versionado pretende seguir [Semantic Versioning](https://semver.org/).

## [Unreleased]

- Importación revisada de Bugs, Casos y Tags desde Excel/CSV con plantilla y guía descargables.
- Dashboard visual sin tablas; Reportes con agregados PostgreSQL, períodos, aprobación por ejecución, bugs históricos y fallos frecuentes.
- Requisitos versionados y matriz requisito/caso/bug paginada.
- Informe de ejecución PDF con snapshots, notas y referencias de evidencia.
- Migración aditiva 015 con eventos históricos inmutables e importación atómica de tags.

- Comentarios con revisión y @menciones en bugs, casos y ejecuciones, con avisos internos por destinatario.
- Actividad persistente con cambios antes/después, actor y correlación, inmutable desde aplicación/PostgreSQL ordinario.
- Admin, QA, Dev y Solo lectura por proyecto; administración de accesos, protección de propietario/último Admin y revocación controlada.
- Migración 014 que conserva accesos heredados explícitos y elimina la concesión automática de proyectos futuros.

- Bug desde un fallo con caso, ejecución, snapshot y evidencias enlazados; severidad, entorno y versión afectada.
- Tipo de prueba independiente, cobertura por tipo y ciclo documental Borrador/Listo/Obsoleto con historial y control de versiones concurrentes.
- Planes/ciclos, clonación de ejecuciones y reejecución de fallidos conservando snapshots originales.
- Importación revisada CSV/Excel con plantilla, validación por fila, claves idempotentes y recuperación de avances parciales.
- Flujo de estados, transiciones y estados resueltos configurable por proyecto, validado en servidor.
- Migración aditiva 013, contratos/OpenAPI, guía de uso y regresiones de PostgreSQL y navegador en tres tamaños.

## [1.1.0] — 2026-10-23

- Gestión de Test Runs: crear, consultar, editar título/responsable/casos/estado y eliminar con confirmación.
- Registro de resultados Aprobado, Fallido, Bloqueado u Omitido por caso, con notas y pasos conservados como snapshot.
- Progreso basado en resultados registrados, incluido Omitido explícito; completar exige al menos un caso y todos sus resultados. Reabrir permite corregirlos.
- Protección de ejecuciones y resultados con evidencias vinculadas; los casos originales se conservan al eliminar una ejecución.
- Vista adaptable de listados y diálogos para Mobile-M (375 px) y Mobile-L (425 px), con contenido largo sin scroll horizontal permanente.
- El diseñador permite actualizar el mismo caso ya guardado con todos sus pasos actuales, sin crear duplicados; valida campos incompletos sin descartarlos.
- Playwright con Chromium, tres viewports, API simulada y regresiones de navegación, responsive, casos, diseñador y ejecuciones. Integrado en CI.
- Subagente QA de desarrollo en `.opencode/agents/qa.md` y guía de pruebas en `docs/TESTING.md`.

No requiere migraciones nuevas ni habilita IA real. PostgreSQL conserva las tablas y relaciones existentes.

### Added

- CRUD de tags por proyecto con color, asociación a bugs/casos/ejecuciones y migración versionada 009.
- Adjuntar y descargar archivos privados de evidencias (hasta 2 MiB) con autorización por proyecto y migración 008.
- Preferencias por usuario para seleccionar las categorías iniciales del diseñador de casos.
- CI de validación en pushes a `qa-env`, manteniendo la publicación de artefactos limitada a `main`.
- Edición autorizada de bugs y vista modal de detalle para bugs y casos, con pasos y resultados esperados legibles.
- CRUD de metadatos y vínculos de evidencias, incluida la edición y eliminación con validación de proyecto.
- Documentación del flujo de ramas `qa-env` → pull request a `main` y del formato de asunto/trailers de commits.
- GitHub Actions CI/CD: validación de instalación, tipos, pruebas y build; artefacto frontend/backend al publicar en `main`.
- Migración aditiva 005 para plantillas personales de bugs persistidas en PostgreSQL.
- CRUD de plantillas por usuario en Configuración y selector que rellena título, descripción y prioridad al crear bugs.
- Maqueta deshabilitada de configuración de IA, sin almacenamiento de claves ni conexión a proveedores.
- Desactivación y anonimización de cuenta con verificación de contraseña, revocación de sesiones y conservación de referencias QA.
- Pruebas para ownership de plantillas, validación HTTP y transacción de baja de cuenta.

- Migración aditiva 004_authentication: usuarios, membresías y sesiones con registro versionado, y comando db:migrate.
- Registro/login/logout reales con scrypt, cookies HttpOnly, CSRF, expiración, revocación y autorización por organización; pruebas de aislamiento y acceso.
- Frontend conectado a proyectos y recursos reales, formularios persistentes y resumen calculado desde la API, con carga y errores explícitos.

- Conexión PostgreSQL con pg, carga de backend/.env, verificación de esquema al arrancar y comando db:check de solo lectura.
- Repositorio con consultas parametrizadas, pasos de casos, referencias de proyecto y transacciones para ejecuciones y evidencias.
- GET /api/projects y verificación opcional test:db sobre PostgreSQL aislado; pruebas unitarias y de endpoints sin base de datos.

- Favicon SVG compartido con la marca del workspace.
- Guía docs/TESTING.md y badges del stack tecnológico en README.
- Scripts de PostgreSQL para qa_test_ge: creación, esquema relacionado por proyecto, datos ficticios opcionales y verificación transaccional. La API todavía usa memoria.

- Catálogo del diseñador ampliado a 18 categorías, con contador independiente de 1 a 3 pruebas ilustrativas y cantidades compartidas entre la vista previa y las exportaciones.
- Directorio `docs/` para las guías de API, diseño, desarrollo, reglas y arquitectura; enlaces actualizados en documentación e instrucciones de agentes.

- Guías API.md, DESIGN.md, RULES.md, DEVELOPMENT.md, CONTRIBUTING.md y SECURITY.md basadas en la implementación actual.
- Scripts dev:all para levantar frontend y backend en paralelo, alias dev:frontend/dev:backend y builds separados.
- Maqueta de diseño de test cases con descripción, selección múltiple de categorías y tablas de ejemplo Acción / Resultado esperado, sin generación real ni guardado.
- Inicio de sesión y registro simulados, perfil local y cierre de sesión.
- Temas claro y oscuro con preferencia del sistema y selección recordada en el navegador.
- Archivo `.github/CODEOWNERS` para revisión del propietario del repositorio.
- Workspace pnpm y una API Express MVC inicial en TypeScript.
- Endpoints de salud y operaciones de listado/creación para bugs, casos de prueba, ejecuciones y metadatos de evidencias.
- Pruebas de integración de API y configuración TypeScript estricta para frontend y backend.
- Comandos de proyecto para OpenCode: `/plan`, `/implement`, `/review` y `/test`.
- Memoria de proyecto para OpenCode en `.opencode/memory.md`.
- Skills base de OpenCode para diseño de funciones de IA, diseño de prompts y validación de salidas.
- Vitest y una primera suite de pruebas unitarias en `tests/unit/`.

### Changed

- Se mejoró el botón para guardar casos diseñados, con estados visuales de guardado, foco, hover y carga.
- La API usa PostgreSQL sin fallback en memoria; requiere projectId, sustituye caseCount de entrada por caseIds y devuelve related como array en evidencias. Swagger y documentación actualizados.

- Retirados el panel de almacenamiento y la etiqueta Demo local de la barra superior.

- Migración de la aplicación, configuración Vite, utilidades y pruebas de JavaScript a TypeScript.
- Documentación actualizada para reflejar el backend en memoria y la ausencia de base de datos.
- Se establecieron Conventional Commits como formato obligatorio para los mensajes de commit.
- Se estableció BEM (`bloque__elemento--modificador`) para las clases CSS del frontend.
- La lógica de filtrado de bugs, casos, ejecuciones y evidencias se extrajo a funciones puras para probarla de forma aislada.

## [1.0.0] - 2026-10-14

### Added

- Interfaz frontend de demostración en React y Vite para el workspace de qaTestGE.
- Vistas de resumen, bugs, casos de prueba, test runs y evidencias con datos de ejemplo.
- Navegación responsive, búsqueda, filtros y formularios de demostración locales.
- Plantillas de GitHub para reportes de bugs, solicitudes de mejora y pull requests.
- Reglas de `.gitignore` para dependencias, compilados, cachés y archivos locales.

### Notes

- Esta versión es solo frontend: no incluye backend, persistencia, autenticación ni integración real con IA.
- Los datos de la interfaz son demostrativos y se mantienen únicamente en memoria durante la sesión.
