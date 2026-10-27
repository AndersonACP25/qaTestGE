# Instrucciones para agentes

## Contexto del proyecto

qaTestGE es una plataforma para gestionar bugs, casos de prueba, ejecuciones y evidencias. La visión y los límites del producto están en [README.md](./README.md); las responsabilidades y los flujos técnicos están en [architecture.md](./docs/architecture.md).

## Reglas de trabajo

- Captura errores asíncronos con try/catch o captura equivalente; Express 5 los propaga al middleware central. Conserva el código HTTP y devuelve mensajes seguros para 400, 401, 403, 404, 409, 413, 422, 429 y 5xx. Usa el cliente API central y el componente `Alert` para mostrar errores en frontend, sin trazas ni credenciales. Un 401 al comprobar sesión sin autenticar es esperado.

- Mantén las entidades de bugs, casos de prueba, ejecuciones y evidencias relacionadas mediante identificadores y referencias explícitas.
- Trata la IA como una capacidad opcional detrás de una interfaz de proveedor. La aplicación debe seguir siendo útil cuando la IA no esté configurada o no esté disponible.
- La IA propone contenido; una persona debe revisar y confirmar cualquier cambio en datos del proyecto. No envíes evidencias, credenciales ni datos sensibles a un proveedor sin una decisión explícita del usuario y controles de privacidad.
- No presentes funciones documentadas como disponibles si todavía no están implementadas. Actualiza README y arquitectura cuando cambien el alcance o las decisiones técnicas.
- Antes de introducir dependencias, servicios o formatos de datos, revisa el código y reutiliza las convenciones existentes. Evita añadir complejidad que no sea necesaria para la v1.0.
- Valida cambios TypeScript con `pnpm typecheck`, frontend y backend con `pnpm build`, pruebas con `pnpm test`, lint con `pnpm lint` y formato con `pnpm format:check`.
- Para cada paquete de cambios, inspecciona el estado de Git, crea una rama de trabajo dedicada, valida y crea un commit en español con formato Conventional Commits: `<tipo>(ámbito opcional): descripción`. No publiques la rama salvo que el usuario lo solicite.
- Divide los cambios en commits pequeños y coherentes, uno por capacidad o área revisable; evita mezclar funcionalidades independientes.
- Usa tipos claros en commits como `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `build` o `chore`. Ademas agrega mediante una lista desordenada los cambios implementados
- Para el frontend, nombra clases CSS nuevas y modificadas siguiendo BEM: `bloque__elemento--modificador`. Mantén los estilos encapsulados en el bloque del componente y evita selectores globales para detalles internos.
- Añade pruebas unitarias en `tests/unit/` con Vitest. Las pruebas deben ser deterministas y no depender de un backend, red ni servicios externos.
- Las skills reutilizables de OpenCode viven en `.opencode/skills/<nombre>/SKILL.md`; respeta el frontmatter requerido por OpenCode y las reglas de IA de `docs/architecture.md`.
- Si estoy en `main` o `qa-env` y solicito una funcionalidad, un arreglo o una refactorización, primero comprueba si hay cambios locales pendientes de subir. Si los hay, no crees una rama nueva; si el árbol está limpio, crea una rama nueva que siga el estándar del repositorio antes de implementar.
- Al terminar cada prompt de trabajo, actualiza `MEMORY.md` con el estado técnico y las decisiones vigentes; mantenlo en menos de 100 líneas y reemplaza información obsoleta en vez de acumular historial.
- Las integraciones con APIs y servicios externos se implementan bajo `servicios/`, con interfaces de proveedor y sin acoplar credenciales o datos sensibles al frontend. Los servicios locales de dominio/API permanecen en `backend/`.

## Estructura y estado conocido

- `src/` contiene el frontend React/Vite en TypeScript.
- `backend/src/` contiene la API Express en TypeScript organizada por modelos, controladores y rutas.
- La API usa PostgreSQL mediante pg y backend/src/repositories/postgres.repository.ts. DATABASE_URL se carga desde backend/.env; no mostrar credenciales ni usar la base local para pruebas destructivas. El esquema inicial y el seed de backend/sql/ se importan manualmente; las migraciones versionadas se aplican con pnpm db:migrate. Las migraciones 004, 005 y 006 agregan autenticación, plantillas de bugs y Suite opcional.
- `tests/` contiene pruebas unitarias y `backend/tests/` pruebas de endpoints.
- Hay autenticación local con usuarios/sesiones en PostgreSQL y autorización de proyectos por cuenta; cada cuenta representa una persona; Equipos permite aceptar códigos de un solo uso y administrar integrantes, con acceso a todos los proyectos de la organización. Las plantillas personales de bugs se guardan en PostgreSQL. La baja desactiva y anonimiza al usuario, revoca sesiones y conserva membresías y recursos QA.
- Bugs y casos de prueba tienen estados limitados por sus modelos y restricciones de PostgreSQL; las actualizaciones se realizan mediante API autenticada y scoped al proyecto.
- Los valores iniciales de cantidades del diseñador se guardan localmente por usuario en el navegador; no requieren migración de base de datos.
- GitHub Actions valida pull requests y pushes a `main` y `qa-env`; los pushes a `main` publican artefactos compilados. No hay despliegue automático a un proveedor.
- No describas IA real, recuperación de contraseña, verificación de correo, MFA o invitaciones por correo como disponibles. Las imágenes adjuntas a casos (007) y archivos generales de evidencia (008, máximo 2 MiB) se guardan en PostgreSQL con autorización por proyecto. La configuración de IA es solo una maqueta. La migración 004 añade usuarios sin asignarles organizaciones existentes; la 005 agrega plantillas por usuario; la 006 permite Suite opcional; la 009 añade tags por proyecto asociados con bugs, casos y ejecuciones; la 010 añade invitaciones de un solo uso.
- Las migraciones nuevas deben ser aditivas, quedar registradas en `backend/src/migrate.ts` y documentarse en README y arquitectura cuando cambien capacidades o límites. La carpeta `servicios/` documenta el límite para integraciones externas; no hay proveedores externos implementados todavía.
- La API valida conectividad y esquema PostgreSQL antes de abrir el puerto; si no inicia, ejecuta `pnpm db:check` (solo lectura) y luego importa el esquema inicial y aplica `pnpm db:migrate` si corresponde.
