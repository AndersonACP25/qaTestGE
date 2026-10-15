# Changelog

Todos los cambios importantes de qaTestGE se documentan aquí. El formato sigue [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) y el versionado pretende seguir [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Archivo `.github/CODEOWNERS` para revisión del propietario del repositorio.
- Workspace pnpm y una API Express MVC inicial en TypeScript.
- Endpoints de salud y operaciones de listado/creación para bugs, casos de prueba, ejecuciones y metadatos de evidencias.
- Pruebas de integración de API y configuración TypeScript estricta para frontend y backend.
- Comandos de proyecto para OpenCode: `/plan`, `/implement`, `/review` y `/test`.
- Memoria de proyecto para OpenCode en `.opencode/memory.md`.
- Skills base de OpenCode para diseño de funciones de IA, diseño de prompts y validación de salidas.
- Vitest y una primera suite de pruebas unitarias en `tests/unit/`.

### Changed

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
