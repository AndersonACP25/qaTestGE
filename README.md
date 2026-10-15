# qaTestGE

**Plataforma de gestión de bugs, casos de prueba, ejecuciones y evidencias.**

> **Versión objetivo:** 1.0  
> **Estado actual:** frontend de demostración y API MVC inicial; aún sin base de datos.

## Propósito

qaTestGE busca centralizar el trabajo de QA y desarrollo: registrar y dar seguimiento a bugs, documentar casos de prueba, ejecutar pruebas manualmente y mantener evidencia vinculada con cada resultado. La meta es que un equipo pueda entender qué se probó, qué falló y con qué evidencia, sin perder el contexto entre herramientas.

La v1.0 incorpora asistencia opcional de IA para acelerar la redacción y el análisis. La IA propone; las personas revisan y deciden.

## Alcance de la v1.0

- Organizaciones y proyectos como espacios de trabajo.
- Registro y seguimiento de bugs con estado, prioridad, severidad, responsable y comentarios.
- Casos de prueba con precondiciones, pasos y resultados esperados.
- Test runs manuales con resultados por caso: aprobado, fallido, bloqueado o no ejecutado.
- Carga y asociación de evidencias a bugs, ejecuciones y resultados.
- Trazabilidad entre bugs, casos, ejecuciones y evidencias.
- Acceso autenticado, permisos por proyecto e historial de cambios.
- IA optativa para proponer borradores de bugs, sugerir casos de prueba y resumir ejecuciones.

## Principios de IA

- La aplicación debe seguir funcionando si no se configura IA, si el proveedor falla o si se agota una cuota.
- La persona usuaria elige cuándo solicitar ayuda y revisa cada propuesta antes de aplicarla.
- La IA no cambia registros por su cuenta ni ejecuta pruebas o código.
- Se envía solo el contexto mínimo necesario. Las evidencias no se comparten con IA por defecto.
- La interfaz debe indicar qué datos se enviarán al proveedor y la configuración debe permitir desactivar la función.
- Proveedores intercambiables detrás de una interfaz del servidor; claves y secretos nunca se exponen al navegador.

La disponibilidad de cada proveedor, sus condiciones de privacidad, ubicación de procesamiento y costos se deben verificar antes de habilitarlo. No se asume una integración concreta en esta definición.

## Fuera del alcance inicial

- Ejecución automatizada o integración obligatoria con pipelines CI/CD.
- Cambios autónomos realizados por IA.
- Entrenamiento de modelos con los datos del cliente.
- Un proveedor de IA, framework o infraestructura seleccionados de antemano.

## Estado del repositorio

El frontend usa React, Vite y TypeScript. La interfaz todavía muestra datos de demostración en el navegador y no consume la API. El backend usa Express y TypeScript, organizado en rutas, controladores y modelos, con endpoints iniciales para bugs, casos de prueba, test runs y metadatos de evidencias. La API guarda datos únicamente en memoria y los pierde al reiniciar; no hay base de datos, autenticación ni almacenamiento del contenido binario de evidencias. La IA sigue sin estar conectada.

## Documentación

- [AGENTS.md](./AGENTS.md): instrucciones y límites para agentes que trabajen en el proyecto.
- [architecture.md](./architecture.md): componentes, dominio, flujos, privacidad y decisiones pendientes.
- [CHANGELOG.md](./CHANGELOG.md): historial de cambios por versión.
- [`.opencode/`](./.opencode/): memoria y comandos de proyecto para OpenCode.
- [`.opencode/skills/`](./.opencode/skills/): skills base para diseño de funciones de IA, prompts y validación de salidas.
- [`tests/`](./tests/): pruebas unitarias del frontend.
- [`backend/`](./backend/): API Express MVC con modelos en memoria y pruebas de endpoints.
- [`.github/CODEOWNERS`](./.github/CODEOWNERS): propietarios sugeridos para revisión en GitHub.

## Contribuir mediante GitHub

- Usa **Reportar un bug** o **Solicitar una mejora** al abrir una issue para proporcionar el contexto necesario.
- Al abrir un pull request, completa la plantilla con el resumen, el tipo de cambio y las validaciones realizadas.
- Mantén fuera del repositorio dependencias instaladas, builds, cachés, archivos locales y secretos; las reglas están en [`.gitignore`](./.gitignore).

## Criterios de salida para v1.0

La versión se considerará lista cuando:

1. Un usuario autorizado pueda crear y gestionar bugs y casos de prueba dentro de un proyecto.
2. Pueda crear una ejecución, registrar resultados por caso y completar la ejecución.
3. Pueda cargar, consultar y eliminar evidencia con autorización y vínculos trazables.
4. Los permisos se apliquen en el servidor y las acciones importantes queden auditadas.
5. La asistencia de IA, cuando esté configurada, entregue propuestas revisables; desactivarla o sufrir un error no impida los flujos manuales.
6. Los datos enviados a IA sean explícitos y limitados al contexto autorizado por la persona usuaria.
7. Las rutas críticas tengan validación automatizada y se documenten los pasos de instalación, configuración, ejecución y respaldo.

## Desarrollo

Requiere Node.js y pnpm:

```bash
pnpm install
pnpm dev
```

En otra terminal, inicia la API:

```bash
pnpm dev:api
```

La API escucha por defecto en `http://localhost:3000`. El frontend corre en `http://localhost:5173`.

### Endpoints disponibles

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/health` | Estado de la API |
| `GET`, `POST` | `/api/bugs` | Listar y crear bugs |
| `GET`, `POST` | `/api/test-cases` | Listar y crear casos de prueba |
| `GET`, `POST` | `/api/test-runs` | Listar y crear ejecuciones |
| `GET`, `POST` | `/api/evidence` | Listar y registrar metadatos de evidencia |

Las escrituras de evidencia registran metadatos únicamente, no cargan el archivo. Todos los recursos se almacenan en memoria temporal.

### Validación

```bash
pnpm test
pnpm test:watch
pnpm typecheck
pnpm build
```

`pnpm build` verifica tipos y genera la compilación del frontend y backend. La API puede configurarse con `PORT` y `FRONTEND_ORIGIN`. No configures secretos en el cliente. Antes de usar datos reales, implementa una base de datos, autenticación, autorización y almacenamiento seguro para evidencias.
