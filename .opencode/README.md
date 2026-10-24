# Agentes de desarrollo

Selecciona `orquestador` como principal en OpenCode. Los perfiles de `agents/` incluyen `frontend`, `dominio-api`, `calidad` y `qa`, invocados mediante Task según el área. QA cubre Vitest y Playwright con API simulada, escritorio y móviles. Usan `mode: primary` y `mode: subagent` y no requieren servicios nuevos.

Flujo: inspección → delegación → integración → revisión y validación → documentación y commits. AGENTS.md prevalece. No habilitan agentes autónomos ni proveedores de IA dentro del producto.
