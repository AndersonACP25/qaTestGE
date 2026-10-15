# qaTestGE — memoria del proyecto

## Producto

- Plataforma de QA para bugs, casos de prueba, test runs y evidencias.
- El nombre del producto se escribe `qaTestGE`.
- El alcance objetivo de producto está descrito en [README.md](../README.md) y [architecture.md](../architecture.md).

## Estado técnico actual

- Frontend React 18 + Vite 6, JavaScript y CSS.
- Scripts: `npm run dev`, `npm run build` y `npm run preview`.
- La UI es una demostración con datos de ejemplo en memoria.
- No hay backend, persistencia, autenticación, conexión real a IA ni carga de archivos a servidor.
- No presentes funcionalidades objetivo como implementadas.

## Convenciones

- Sigue [AGENTS.md](../AGENTS.md) para las reglas del repositorio.
- Mensajes de commit siempre en formato Conventional Commits (`tipo(ámbito): descripción`). No hagas commits salvo que te lo pidan.
- En el frontend, clases CSS según BEM: `bloque__elemento--modificador`.
- Conserva la interfaz en español y mantén el diseño responsive.
- No agregues secretos, datos sensibles ni configuración privada al cliente.
- Valida cambios del frontend con `npm run build`.

## Cambios recientes relevantes

- Se agregó la interfaz demostrativa React/Vite, navegación por bugs, casos, ejecuciones y evidencias.
- Se añadieron `.gitignore`, plantillas de issues de GitHub y plantilla de pull request.
- `node_modules/` y `dist/` deben permanecer ignorados y sin seguimiento de Git.
