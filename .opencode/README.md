# Agentes de desarrollo

Selecciona `orquestador` como principal en OpenCode. Los perfiles de `agents/` incluyen `frontend`, `dominio-api`, `calidad` y `qa`, invocados mediante Task según el área. QA cubre Vitest y Playwright con API simulada, escritorio y móviles. Usan `mode: primary` y `mode: subagent` y no requieren servicios nuevos.

Flujo: inspección → trabajo acotado o delegación autorizada → integración → revisión y validación → documentación y commits. AGENTS.md prevalece. MEMORY.md en la raíz es la única memoria vigente; memory.md en esta carpeta solo enlaza a ella. No habilitan agentes autónomos ni proveedores de IA dentro del producto.

Se conservan los cinco perfiles: `calidad` revisa contratos, robustez y criterios de release; `qa` verifica comportamientos mediante pruebas. No hace falta otro agente de release ni uno de traducción: la preparación y el guardián de pluralización quedan cubiertos por esos roles y frontend. Los perfiles se actualizaron para PostgreSQL, contratos, concurrencia, instalación unificada y tipografía; no hay agentes de producto ejecutándose dentro de la aplicación.
