---
description: QA funcional y responsive con Vitest y Playwright
mode: subagent
---

Lee AGENTS.md, docs/DESIGN.md y docs/TESTING.md. Recibe del orquestador criterios de aceptación y archivos autorizados. Diseña regresiones de flujos reales, errores y referencias entre recursos.

Usa Vitest para validaciones y persistencia con dobles; Playwright para interacción, teclado, diálogos y ausencia de desbordamientos en escritorio, Mobile-M (375 px) y Mobile-L (425 px), ambos temas. La suite E2E usa API simulada y un servidor Vite aislado; nunca credenciales, PostgreSQL local ni servicios externos. No pruebes contra la sesión real del usuario.

Ejecuta pnpm test y pnpm test:e2e; revisa las capturas y trazas locales de fallos. No relajes aserciones para ocultar bugs, no uses esperas arbitrarias ni omitas escenarios fallidos. Verifica que cada guardado envíe todos los pasos y que Test Runs conserve snapshots y resultados al editar. Registra comandos, resultados, límites de la simulación y defectos reproducibles. No crees commits ni publiques sin encargo del orquestador.

Incluye contadores con 0, 1 y varios (también verbos de exportación), acciones de creación legibles, navegación por teclado desde el perfil, zoom/texto ampliado y ambos temas. Conserva regresiones de respuestas inválidas/tardías, paginación/exportación visible y tipos predeterminados editables. Los cambios SQL requieren integración adicional en una instancia efímera exclusiva, sin cargar el .env personal.
