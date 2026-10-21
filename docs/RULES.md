# Reglas del proyecto

Esta guía resume las convenciones para personas colaboradoras. [AGENTS.md](../AGENTS.md) contiene las instrucciones de agentes y [architecture.md](./architecture.md) las decisiones de arquitectura. Mantenerlos alineados al modificar estas reglas.

## Producto y datos

- Diferenciar funciones disponibles, maquetas y objetivos futuros en interfaz y documentación.
- Mantener bugs, casos, ejecuciones y evidencias relacionados con identificadores y referencias explícitas. El repositorio PostgreSQL y las claves compuestas validan referencias y pertenencia al mismo proyecto; la autorización exige membresía de la cuenta en la organización del proyecto.
- No omitir la autenticación, el token CSRF o la autorización por organización en nuevas rutas de datos. El diseñador de IA sigue siendo una maqueta; los recursos manuales y cuentas ya son persistentes.
- No añadir servicios, dependencias o formatos antes de revisar y reutilizar las convenciones existentes.

## Código y estilos

- Frontend React y TypeScript en `src/`; API Express y TypeScript en `backend/src/`, organizada por rutas, controladores y modelos.
- Validar entradas en el servidor; la validación del navegador solo facilita el uso.
- Usar BEM para clases CSS nuevas o modificadas y mantener estilos encapsulados en el bloque del componente.
- Añadir pruebas unitarias deterministas con Vitest en `tests/unit/`, sin backend, red ni servicios externos. Las pruebas de endpoints viven en `backend/tests/`.
- Validar TypeScript con `pnpm typecheck`, compilación con `pnpm build` y pruebas con `pnpm test`.

## IA y privacidad

- La IA es opcional y debe quedar detrás de una interfaz de proveedor del servidor.
- Las propuestas requieren revisión y confirmación humana antes de cambiar datos.
- No enviar evidencias, credenciales ni datos sensibles sin decisión explícita de la persona usuaria y controles de privacidad.
- Mantener la aplicación útil cuando la IA no esté configurada o falle.
- Las skills reutilizables de OpenCode viven en `.opencode/skills/<nombre>/SKILL.md` con el frontmatter requerido.

## Cambios y documentación

- Actualizar README y arquitectura si cambia el alcance o una decisión técnica; registrar cambios relevantes en CHANGELOG.
- Mantener el contrato real de endpoints en [API.md](./API.md) y las pautas visuales en [DESIGN.md](./DESIGN.md).
- No incluir secretos, dependencias instaladas, builds o archivos locales en commits.
- Crear commits solo cuando se soliciten. Usar Conventional Commits: `feat: descripción`, `fix(api): descripción`, `docs: descripción`, etc.
