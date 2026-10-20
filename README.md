# qaTestGE

**Plataforma de gestión de bugs, casos de prueba, ejecuciones y evidencias.**

> **Versión objetivo:** 1.0  
> **Estado actual:** frontend de demostración y API MVC inicial; aún sin base de datos.

## Propósito

qaTestGE busca centralizar el trabajo de QA y desarrollo: registrar y dar seguimiento a bugs, documentar casos de prueba, ejecutar pruebas manualmente y mantener evidencia vinculada con cada resultado. La meta es que un equipo pueda entender qué se probó, qué falló y con qué evidencia, sin perder el contexto entre herramientas.

La v1.0 prevé asistencia opcional de IA para acelerar la redacción y el análisis; esta integración todavía no está implementada. La IA propone; las personas revisan y deciden.

## Alcance previsto de la v1.0

Los siguientes puntos describen el objetivo del producto; consulta **Estado del repositorio** para distinguir lo disponible actualmente.

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

## Acceso de demostración y apariencia

- Pantalla de **Inicio de sesión** y **Registro**: acepta cualquier usuario y contraseña no vacíos. En registro, la confirmación debe coincidir; al enviar, se entra directamente al panel.
- El formulario de acceso está centrado horizontal y verticalmente, con desplazamiento disponible cuando el contenido supera la altura de la pantalla.
- El nombre introducido aparece en el perfil y el saludo. **Salir** vuelve al acceso y reinicia los datos de demostración del panel; recargar también requiere entrar de nuevo.
- No se crean cuentas reales, se verifican identidades ni se guardan o envían credenciales. Usa datos de prueba: esta pantalla no protege la API ni sustituye autenticación o autorización en el servidor.
- **Tema oscuro y claro** disponibles en el acceso y la barra superior. La primera visita respeta la preferencia del sistema; la selección se guarda en `localStorage` cuando está disponible. Si el almacenamiento está bloqueado, funciona durante la sesión.
- Los datos de QA siguen siendo ejemplos locales y no se sincronizan con la API.

## Maqueta de diseño de test cases

En el menú **Diseñar test cases** puedes recorrer el flujo previsto para el futuro asistente:

1. Escribir una descripción, requisito o historia de usuario, o cargar el texto de ejemplo.
2. Marcar una o varias categorías: **Edge cases**, **Exploratory**, **Pruebas de estrés** y **API**.
3. Pulsar **Mostrar tabla de ejemplo** para ver dos pasos por categoría, con las columnas **Acción** y **Resultado esperado**.
4. Pulsar **Exportar Excel** o **Exportar PDF** para descargar la vista previa con la descripción introducida, las categorías seleccionadas, los pasos y los resultados esperados.

Esta es una maqueta frontend responsive compatible con los temas claro y oscuro. Los ejemplos son fijos y describen un registro de usuario hipotético: no se analiza el texto, no se llama a IA ni a la API, no se ejecutan pruebas y no se guardan casos. Cambiar el texto o las categorías limpia la vista previa; salir de la vista descarta su estado.

La generación contextual y la edición, revisión y confirmación antes de crear casos reales quedan para una etapa futura. La IA deberá seguir siendo opcional y usar la interfaz de proveedor del servidor descrita en la arquitectura.

## SwaggerUI y exportación de casos

- Con `pnpm dev:all`, abre **SwaggerUI · API** en el menú lateral del portal. La documentación interactiva está en `http://localhost:3000/api/docs/` y el contrato OpenAPI en `/api/openapi.json`. Las operaciones POST de «Try it out» crean registros temporales en la API.
- En **Diseñar test cases**, muestra la tabla de ejemplo y pulsa **Exportar Excel** o **Exportar PDF**. Se descargan archivos `.xlsx` o `.pdf` con la descripción, las categorías seleccionadas, los pasos y los resultados esperados. Los archivos indican que son ejemplos fijos; no se generan ni guardan casos reales.
- La exportación se realiza en el navegador, sin enviar el contenido a servicios externos. ExcelJS y jsPDF/AutoTable se cargan al solicitar la exportación.
- El enlace usa `/api/docs/`: Vite lo reenvía al backend mediante el proxy `/api`. Al desplegar el frontend por separado, configura ese mismo proxy para `/api`, incluidos SwaggerUI y OpenAPI.

## Documentación

- [API.md](./API.md): endpoints, cuerpos, respuestas, validaciones y límites actuales.
- [DESIGN.md](./DESIGN.md): interfaz, temas, accesibilidad y maquetas.
- [RULES.md](./RULES.md): reglas de producto, código, IA y documentación.
- [DEVELOPMENT.md](./DEVELOPMENT.md): entorno, scripts y configuración local.
- [CONTRIBUTING.md](./CONTRIBUTING.md): flujo de contribución y validación.
- [SECURITY.md](./SECURITY.md): estado de seguridad, privacidad y reporte de problemas.
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
- Incluye `pnpm-lock.yaml` junto con los cambios de dependencias y `pnpm-workspace.yaml` para conservar una instalación reproducible. Los archivos fuente, las pruebas y la documentación también forman parte del repositorio.

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

Requiere Node.js compatible con las dependencias del proyecto y pnpm `12.11.2`, según `packageManager` en `package.json`:

```bash
pnpm install --frozen-lockfile
pnpm dev:all
```

La API escucha por defecto en `http://localhost:3000`. El frontend corre en `http://localhost:5173`; si el puerto está ocupado, Vite muestra otro disponible en la terminal. SwaggerUI está en `http://localhost:3000/api/docs/`.

`pnpm dev:all` inicia ambos servicios en paralelo; `Ctrl+C` detiene la sesión conjunta. Para iniciarlos por separado usa `pnpm dev:frontend` y `pnpm dev:backend`. Se conservan `pnpm dev` (frontend) y `pnpm dev:api` (backend). También existen `pnpm build:frontend` y `pnpm build:backend`. Consulta [DEVELOPMENT.md](./DEVELOPMENT.md) para todos los comandos.

### Endpoints disponibles

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/health` | Estado de la API |
| `GET`, `POST` | `/api/bugs` | Listar y crear bugs |
| `GET`, `POST` | `/api/test-cases` | Listar y crear casos de prueba |
| `GET`, `POST` | `/api/test-runs` | Listar y crear ejecuciones |
| `GET`, `POST` | `/api/evidence` | Listar y registrar metadatos de evidencia |
| `GET` | `/api/docs/` | Documentación interactiva SwaggerUI |
| `GET` | `/api/openapi.json` | Contrato OpenAPI 3.0.3 |

Las escrituras de evidencia registran metadatos únicamente, no cargan el archivo. Todos los recursos se almacenan en memoria temporal.

### Validación

```bash
pnpm test
pnpm test:watch
pnpm typecheck
pnpm build
```

`pnpm build` verifica tipos y genera la compilación del frontend y backend. La API puede configurarse con `PORT` y `FRONTEND_ORIGIN`. No configures secretos en el cliente. Antes de usar datos reales, implementa una base de datos, autenticación, autorización y almacenamiento seguro para evidencias.
