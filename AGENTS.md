# Instrucciones para agentes

## Contexto del proyecto

qaTestGE es una plataforma para gestionar bugs, casos de prueba, ejecuciones y evidencias. La visión y los límites del producto están en [README.md](./README.md); las responsabilidades y los flujos técnicos están en [architecture.md](./architecture.md).

## Reglas de trabajo

- Mantén las entidades de bugs, casos de prueba, ejecuciones y evidencias relacionadas mediante identificadores y referencias explícitas.
- Trata la IA como una capacidad opcional detrás de una interfaz de proveedor. La aplicación debe seguir siendo útil cuando la IA no esté configurada o no esté disponible.
- La IA propone contenido; una persona debe revisar y confirmar cualquier cambio en datos del proyecto. No envíes evidencias, credenciales ni datos sensibles a un proveedor sin una decisión explícita del usuario y controles de privacidad.
- No presentes funciones documentadas como disponibles si todavía no están implementadas. Actualiza README y arquitectura cuando cambien el alcance o las decisiones técnicas.
- Antes de introducir dependencias, servicios o formatos de datos, revisa el código y reutiliza las convenciones existentes. Evita añadir complejidad que no sea necesaria para la v1.0.
- Valida cambios TypeScript con `pnpm typecheck`, frontend con `pnpm build` y pruebas con `pnpm test`.
- Escribe siempre los mensajes de commit en formato Conventional Commits: `<tipo>(ámbito opcional): descripción`. Usa tipos claros como `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `build` o `chore`. No crees commits salvo que se solicite.
- Para el frontend, nombra clases CSS nuevas y modificadas siguiendo BEM: `bloque__elemento--modificador`. Mantén los estilos encapsulados en el bloque del componente y evita selectores globales para detalles internos.
- Añade pruebas unitarias en `tests/unit/` con Vitest. Las pruebas deben ser deterministas y no depender de un backend, red ni servicios externos.
- Las skills reutilizables de OpenCode viven en `.opencode/skills/<nombre>/SKILL.md`; respeta el frontmatter requerido por OpenCode y las reglas de IA de `architecture.md`.

## Estructura y estado conocido

- `src/` contiene el frontend React/Vite en TypeScript.
- `backend/src/` contiene la API Express en TypeScript organizada por modelos, controladores y rutas.
- `backend/src/models/in-memory-store.ts` es temporal: no hay base de datos y los datos se pierden al reiniciar el proceso.
- `tests/` contiene pruebas unitarias y `backend/tests/` pruebas de endpoints.
- No describas autenticación, persistencia, carga de archivos ni integración real con IA como disponibles.
