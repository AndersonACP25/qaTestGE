# Agentes de desarrollo

Selecciona `orquestador` como principal en OpenCode. Los perfiles de `agents/` incluyen `frontend`, `dominio-api` y `calidad`, invocados mediante Task según el área. Usan `mode: primary` y `mode: subagent` y no requieren servicios nuevos.

Flujo: inspección → delegación → integración → revisión y validación → documentación y commits. AGENTS.md prevalece. No habilitan agentes autónomos ni proveedores de IA dentro del producto.
