# Contribuir a qaTestGE

1. Leer [README.md](./README.md), [RULES.md](./docs/RULES.md) y [architecture.md](./docs/architecture.md) para entender el alcance real.
2. Preparar el entorno con [DEVELOPMENT.md](./docs/DEVELOPMENT.md). Revisar el código antes de añadir dependencias.
3. Implementar cambios acotados, manteniendo las referencias entre entidades y el funcionamiento sin IA.
4. Añadir o ajustar pruebas pertinentes. Las unitarias van en `tests/unit/`; las de endpoints en `backend/tests/`.
5. Ejecutar `pnpm typecheck`, `pnpm build` y `pnpm test`. Para cambios de interfaz, revisar ambos temas y tamaños móvil/escritorio.
6. Actualizar la documentación afectada y `CHANGELOG.md`. Mantener [API.md](./docs/API.md) sincronizado si cambia el contrato de servidor.
7. Abrir un pull request con la plantilla del repositorio, explicando problema, comportamiento final y validación realizada.

Usar las plantillas de GitHub para reportar bugs o proponer mejoras. Incluir pasos reproducibles y datos ficticios; nunca adjuntar credenciales o evidencia sensible.

Los commits siguen Conventional Commits, por ejemplo `feat(ui): añadir vista de casos` o `docs(api): documentar validaciones`. No generar commits automáticamente sin solicitud. La revisión puede apoyarse en los propietarios definidos en `.github/CODEOWNERS`.
