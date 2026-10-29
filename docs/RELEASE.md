# Preparación del release

Este documento define el cierre técnico; preparar cambios no crea una etiqueta ni publica una versión. La numeración sigue en 1.1.0 hasta elegir el próximo release.

## Comprobaciones

- Revisar diff, estado de Git y cambios de capacidad documentados; commits pequeños y coherentes.
- Ejecutar `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm format:check` y `pnpm build`.
- Ejecutar `pnpm test:e2e` con API simulada en escritorio y móviles; revisar ambos temas, creación/edición, pluralización 0/1/varios, tipografía, exportación visible y acceso al perfil por teclado.
- En PostgreSQL efímero, verificar actualización del historial, instalación desde cero con `pnpm db:setup`, repetición, `pnpm db:migrate` y `pnpm --dir backend test:db` con `TEST_DATABASE_URL` exclusivo. Nunca usar la base personal.
- Revisar README de instalación, guía de uso, arquitectura, AGENTS.md y MEMORY.md. No duplicar memoria en perfiles de agentes.

## Entrega

La instalación nueva requiere una base `qa_test_ge` vacía y `DATABASE_URL` configurada, seguida de `pnpm db:setup`. Las instalaciones existentes aplican `pnpm db:migrate`; el historial llega a 012 y no se fusiona ni reimporta. No se cargan ejemplos automáticamente.

Antes de desplegar en una instalación existente, obtener un respaldo por el procedimiento del operador y verificar su recuperación en un entorno separado. El repositorio no implementa respaldos ni despliegue a un proveedor. GitHub Actions valida PR/push a main y qa-env y publica artefactos compilados únicamente desde main.

IA y cambio de imagen siguen siendo maquetas. Dashboard/Reportes conservan el snapshot completo; las páginas de 50 filas de la interfaz no son paginación remota. El guardián de textos requiere revisar vocabulario nuevo. No presentar esos límites como capacidades resueltas.
