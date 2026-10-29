---
description: Ejecuta la validación disponible para el cambio y resume los resultados
---

Lee @AGENTS.md y @.opencode/memory.md. Inspecciona los scripts de `package.json` y los archivos modificados antes de elegir las comprobaciones.

Valida `$ARGUMENTS` o, si no se especifica un alcance, los cambios locales pendientes. Ejecuta `pnpm typecheck`, `pnpm build`, `pnpm test`, `pnpm lint` y `pnpm format:check` según AGENTS.md. Si cambian flujos de interfaz, añade Playwright con API simulada y revisión de escritorio/móviles, ambos temas y teclado. Si cambia instalación, SQL o transacciones, verifica db:setup repetido y actualización con test:db solo en PostgreSQL efímero y TEST_DATABASE_URL explícita, sin cargar el .env personal. No instales dependencias salvo que una comprobación necesaria falle por una dependencia ausente. Informa comandos, resultados y límites de cobertura.
