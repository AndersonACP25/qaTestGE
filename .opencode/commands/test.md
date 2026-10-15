---
description: Ejecuta la validación disponible para el cambio y resume los resultados
---

Lee @AGENTS.md y @.opencode/memory.md. Inspecciona los scripts de `package.json` y los archivos modificados antes de elegir las comprobaciones.

Valida `$ARGUMENTS` o, si no se especifica un alcance, los cambios locales pendientes. Para cambios del frontend o backend ejecuta `pnpm build` y `pnpm test`. No instales dependencias salvo que una comprobación necesaria falle por una dependencia ausente. Informa comandos, resultado y cualquier cobertura que no fue posible validar.
