# qaTestGE — memoria del proyecto

## Producto

- Plataforma de QA para bugs, casos de prueba, test runs y evidencias.
- El nombre del producto se escribe `qaTestGE`.
- El alcance objetivo de producto está descrito en [README.md](../README.md) y [architecture.md](../architecture.md).

## Estado técnico actual

- Workspace pnpm con frontend React 18 + Vite 6 y backend Express 5, ambos en TypeScript.
- Scripts: `pnpm dev`, `pnpm dev:api`, `pnpm build`, `pnpm typecheck`, `pnpm test` y `pnpm test:watch`.
- El frontend aún es una demostración local con datos de ejemplo; todavía no consume la API.
- La API MVC expone endpoints para bugs, casos de prueba, ejecuciones y metadatos de evidencias.
- La API usa un almacén en memoria: no hay base de datos y los datos se pierden al reiniciar el proceso.
- No hay autenticación, almacenamiento binario de evidencias ni integración real con IA.
- No presentes funcionalidades objetivo como implementadas.

## Convenciones

- Sigue [AGENTS.md](../AGENTS.md) para las reglas del repositorio.
- Mensajes de commit siempre en formato Conventional Commits (`tipo(ámbito): descripción`). No hagas commits salvo que te lo pidan.
- En el frontend, clases CSS según BEM: `bloque__elemento--modificador`.
- Conserva la interfaz en español y mantén el diseño responsive.
- No agregues secretos, datos sensibles ni configuración privada al cliente.
- Valida cambios con `pnpm build`.
- Las pruebas frontend viven en `tests/unit/` y las pruebas API en `backend/tests/`; usa `pnpm test`.
- Las skills de OpenCode se definen en `.opencode/skills/<nombre>/SKILL.md`. Las skills base de IA cubren diseño de funciones, diseño de prompts y validación de salidas.

## Cambios recientes relevantes

- Se agregó la interfaz demostrativa React/Vite, navegación por bugs, casos, ejecuciones y evidencias.
- Se añadieron `.gitignore`, plantillas de issues de GitHub y plantilla de pull request.
- `node_modules/` y `dist/` deben permanecer ignorados y sin seguimiento de Git.
