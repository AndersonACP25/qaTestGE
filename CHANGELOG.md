# Changelog

Todos los cambios importantes de qaTestGE se documentan aquí. El formato sigue [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) y el versionado pretende seguir [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

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
