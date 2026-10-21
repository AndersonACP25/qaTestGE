# Arquitectura — qaTestGE v1.0

## Estado del documento

Este documento combina la arquitectura objetivo de la v1.0 con el estado real del repositorio. El frontend usa React, Vite y TypeScript; existe una API Express MVC en TypeScript con repositorio PostgreSQL sobre qa_test_ge. Hay cuentas locales de una persona, sesiones persistidas, autorización de los proyectos de la cuenta, plantillas personales de bugs y CRUD de casos con adjuntos privados de imágenes/enlaces. Las imágenes de casos se guardan en PostgreSQL; la carga binaria general de evidencias y la integración con proveedores de IA siguen pendientes. GitHub Actions valida cambios y publica artefactos compilados al hacer push a main; el despliegue a un proveedor aún no está configurado.

## Objetivos

- Gestionar el ciclo de vida de bugs, casos de prueba, ejecuciones y evidencias desde un mismo espacio de trabajo.
- Mantener trazabilidad entre un bug, los casos que lo cubren, las ejecuciones y sus resultados.
- Mantener los datos de cada cuenta aislados por proyecto, dejando la colaboración multiusuario para una etapa futura.
- Ofrecer asistencia de IA útil sin convertirla en autoridad ni requisito para usar el producto.
- Proteger los datos del proyecto y hacer explícito cuándo información sale a un proveedor de IA.

## Límites y decisiones actuales

- Workspace pnpm con frontend en la raíz y API en `backend/`. `pnpm dev` (alias `pnpm dev:all`) ejecuta ambos scripts de desarrollo en paralelo; `pnpm dev:frontend` inicia solo Vite.
- El backend organiza Bugs y Test Case en rutas, controladores, modelos y repositorios. Usuarios/autenticación sigue la misma separación mediante rutas HTTP, controlador de autenticación, modelo tipado y proveedor PostgreSQL.
- El diseñador de casos usa ejemplos ilustrativos: `src/models/caseDesign.model.ts` mantiene el catálogo/validación, un hook controlador gestiona estado y exportación, y la vista permite guardar explícitamente cada ejemplo como caso del proyecto. No genera casos dinámicamente ni usa IA.
- La API requiere DATABASE_URL, usa un pool pg y comprueba el esquema qa al arrancar. No existe fallback en memoria ni importación automática del SQL.
- Los endpoints listan y crean bugs, casos de prueba, ejecuciones y metadatos de evidencias. Los casos de prueba además permiten editar/eliminar y gestionar imágenes/enlaces adjuntos.
- Bugs y casos de prueba permiten actualizar su estado mediante endpoints PATCH, con los valores validados por modelo y las restricciones existentes de PostgreSQL. No se requiere una tabla adicional de estados.
- La interfaz es de cuenta individual: no ofrece gestión de equipo, invitaciones ni administración de membresías.
- Configuración conserva las cantidades iniciales del diseñador por categoría en localStorage, separadas por usuario en el navegador; no se envían a la API ni a PostgreSQL.
- No se sube el contenido binario de evidencias; solo se registra metadata.

## Objetivos futuros para v1.0

- Producto web con API de servidor y persistencia duradera.
- Una organización contiene proyectos; cada proyecto contiene sus bugs, casos, ejecuciones y evidencias.
- La autenticación y el aislamiento por organización/proyecto se aplican en el servidor, no solo en la interfaz.
- La carga binaria general de evidencias sigue pendiente. Para adjuntos de casos de prueba, PostgreSQL conserva imágenes privadas PNG/JPEG/GIF/WebP de hasta 2 MiB y metadatos de enlaces HTTP(S).
- La IA se integra mediante un servicio de aplicación y adaptadores de proveedores intercambiables. La configuración de IA es opcional.
- Las recomendaciones de IA requieren revisión humana antes de modificar registros.
- La v1.0 no incluye ejecución automatizada de pruebas, agentes con capacidad de actuar sin aprobación, ni entrenamiento de modelos con datos del cliente.

## Componentes lógicos

```text
Navegador
   |
   v
Interfaz React/Vite (TypeScript, raíz)
   |
   v
API Express (backend/, TypeScript)
   |
   +-- Rutas -> Controladores -> Repositorio -> Pool pg -> PostgreSQL (actual)
   |
   +-- Modelo/Proveedor de usuarios, controlador HTTP de autenticación y permisos
```

La interfaz consume la API mediante el proxy /api y envía la cookie de sesión y el token CSRF en escrituras. `GET /api/health` permite verificar disponibilidad. Bugs y evidencias exponen edición; evidencias también permiten eliminar metadatos. Casos y ejecuciones tienen alta y consulta. Los estados de bug se actualizan mediante `PATCH /api/bugs/{bugId}`.

### Interfaz web

Presenta espacios de trabajo, proyectos, listas y formularios para los cuatro recursos principales. Para el diseñador de casos, el modelo contiene el catálogo fijo, el hook controlador gestiona la interacción y la vista renderiza el flujo. Debe mostrar estados de carga y error, validar formularios para facilitar el uso y no confiar en validaciones del cliente como control de seguridad.

### API y capa de aplicación

Las rutas delegan en controladores HTTP. Los controladores validan entradas y coordinan modelos/proveedores y repositorios; los modelos tipados describen Bugs, Test Case y usuarios. El proveedor PostgreSQL implementa persistencia. Los middlewares autentican sesiones y el repositorio autorizado limita operaciones a proyectos de organizaciones con membresía vigente. Devuelve errores explícitos y no expone credenciales de almacenamiento ni secretos de proveedores a la interfaz.

### Dominio

La lógica de estados y relaciones vive en servicios de dominio o de aplicación, no en componentes de presentación. Las operaciones que cambian datos deben comprobar la autorización y dejar trazabilidad.

### Persistencia

La API usa `PostgresRepository` mediante una interfaz inyectada en `createApp`. El pool vive únicamente en el arranque del servidor; las pruebas pueden inyectar dobles sin cargar configuración local ni abrir conexiones. Se eliminó el almacén en memoria. Las consultas usan parámetros para valores; las únicas columnas dinámicas provienen de una lista fija para vínculos de evidencias. Las operaciones de casos con pasos, ejecuciones con resultados y evidencias con vínculos usan una transacción y un solo cliente, con rollback y liberación garantizada.

PostgreSQL conserva los datos tras reiniciar. Los proyectos/organizaciones existentes se descubren en GET /api/projects; no se crean automáticamente. projectId es obligatorio en las creaciones. Los IDs bigint se mantienen como strings; los IDs públicos de recursos conservan prefijos BUG, TC, RUN, EVD y RES. La base verifica existencia y pertenencia al mismo proyecto mediante claves compuestas. Las ejecuciones reciben caseIds en vez de caseCount, conservan un snapshot de los pasos y calculan cantidad/progreso a partir de resultados. La respuesta de evidencia usa un array related para conservar todos los vínculos existentes.

backend/sql/ sigue siendo la base de importación manual; las migraciones posteriores son aditivas. La 004 agrega usuarios, membresías y sesiones; la 005 crea plantillas personales en qa.bug_templates; la 006 permite Suite opcional; la 007 agrega qa.test_case_attachments para imágenes y enlaces privados de casos. `db:migrate` las aplica de forma idempotente y `db:check` valida las tablas requeridas sin escrituras. La baja de cuenta conserva membresías y recursos: la fila de usuario queda inactiva y anonimizada, se revocan sesiones y se eliminan las plantillas. Falta permisos granulares, auditoría y respaldos. El repositorio autorizado añade control de acceso y las claves foráneas mantienen integridad. El frontend consulta estos recursos, realiza CRUD de casos y adjunta imágenes/enlaces.

### Evidencias

El endpoint general de evidencias solo registra/lista metadatos; no recibe ni sirve esos archivos. Como capacidad distinta, los adjuntos de casos usan `qa.test_case_attachments`: guarda metadatos y hasta 2 MiB de bytes de imagen por adjunto en PostgreSQL. La API admite PNG/JPEG/GIF/WebP con firma comprobada, consulta autenticada con `nosniff` y enlaces HTTP(S) sin credenciales. El selector permite arrastrar o elegir hasta cinco imágenes por operación. Se eliminan los adjuntos junto con el caso en una transacción; si el caso tiene referencias a ejecuciones, el borrado se rechaza para preservar integridad.

### Servicio de IA

Expone operaciones de producto limitadas y tipadas, por ejemplo:

- Crear un borrador estructurado de bug a partir de una descripción proporcionada por el usuario.
- Sugerir casos de prueba a partir de un requisito o bug seleccionado.
- Resumir resultados de una ejecución y señalar patrones o cobertura potencialmente faltante.

El servicio valida la entrada y la respuesta, registra el proveedor/modelo y el resultado de la operación sin guardar secretos, y devuelve propuestas que el usuario puede editar o descartar. No ejecuta consultas arbitrarias, no altera datos de dominio y no accede a archivos salvo que el usuario los seleccione expresamente y la política del proyecto lo permita.

## Modelo de dominio

| Entidad              | Propósito                                                                                    | Relaciones principales                                        |
| -------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Organización         | Límite de colaboración y administración                                                      | Tiene miembros y proyectos                                    |
| Proyecto             | Contenedor de trabajo y configuración                                                        | Pertenece a una organización                                  |
| Miembro / rol        | Identidad y permisos dentro de un alcance                                                    | Pertenece a una organización y puede tener acceso a proyectos |
| Bug                  | Incidencia con título, descripción, estado, prioridad, severidad, asignado y fechas          | Puede vincularse a casos, ejecuciones y evidencias            |
| Caso de prueba       | Procedimiento con precondiciones, pasos y resultado esperado                                 | Pertenece a un proyecto y puede asociarse con bugs            |
| Ejecución (test run) | Registro de una corrida de un conjunto/version de casos                                      | Contiene resultados individuales de casos y observaciones     |
| Resultado de caso    | Estado de un caso dentro de una ejecución (`passed`, `failed`, `blocked`, `skipped`) y notas | Pertenece a una ejecución y referencia un caso                |
| Evidencia            | Metadatos del archivo, autor, fecha y referencia privada al contenido                        | Puede asociarse a un bug, ejecución o resultado               |
| Evento de auditoría  | Actor, acción, recurso, fecha y cambios pertinentes                                          | Asociado al alcance y recurso afectados                       |

Los estados de los bugs y los campos obligatorios deben definirse como vocabulario controlado por proyecto. Las fechas se almacenan en UTC y se presentan según la zona horaria de la persona usuaria. Toda relación entre recursos debe comprobar que ambos pertenecen al mismo proyecto, salvo excepciones explícitas del dominio.

## Flujos principales

### Registrar un bug

1. La persona selecciona un proyecto y envía los campos del bug.
2. La API valida el contenido y comprueba el permiso de creación.
3. El bug se guarda y se registra el evento de auditoría.
4. Opcionalmente, la persona solicita un borrador de IA; revisa y aplica los campos manualmente.

### Preparar y ejecutar pruebas

1. Se crean casos con pasos y resultados esperados.
2. Se crea una ejecución asociada al proyecto y se seleccionan casos.
3. Se registra un resultado por caso; una ejecución puede estar en curso y luego completarse.
4. Las evidencias se asocian a un resultado, ejecución o bug, preservando autoría y trazabilidad.

### Cargar evidencia

1. La API valida autorización y restricciones del archivo.
2. El contenido se almacena de manera privada y se guardan sus metadatos.
3. La descarga vuelve a comprobar permisos y entrega el archivo con acceso temporal o autenticado.
4. La eliminación actualiza metadatos y contenido según la política de retención del proyecto.

## Seguridad, privacidad y confiabilidad

- Aplicar autorización de mínimo privilegio y comprobar el alcance de organización/proyecto en cada operación.
- Guardar secretos solo en configuración segura del servidor; nunca en el cliente o el control de versiones.
- Validar y limitar archivos; tratar los nombres y tipos declarados por el cliente como no confiables.
- Usar TLS en tránsito, almacenamiento privado y respaldos con acceso controlado.
- Registrar acciones relevantes sin incluir contraseñas, tokens, contenido completo de archivos o datos innecesarios.
- Antes de invocar IA, mostrar qué contenido se enviará y aplicar una política configurable de exclusión/redacción de datos sensibles.
- Enviar a IA únicamente el contexto mínimo necesario. No incluir evidencias por defecto.
- Manejar errores y límites del proveedor explícitamente; permitir continuar los flujos no relacionados con IA.
- Considerar las salidas del modelo como contenido no confiable: validar formato, escapar al presentar y nunca ejecutarlas como instrucciones, código o consultas.
- Definir retención, eliminación y exportación de datos antes de habilitar uso productivo.

## Observabilidad

Correlacionar solicitudes y errores con identificadores de operación. Medir latencia y errores de API, cargas/descargas de evidencia y latencia, disponibilidad y consumo de IA. No registrar prompts o respuestas completos por defecto; si se habilita telemetría de contenido para depuración, debe ser explícita, protegida y con retención limitada.

## Decisiones pendientes antes de implementar

- Migraciones automáticas y proveedor de almacenamiento binario; PostgreSQL, el driver pg, React/TypeScript y Express ya están implementados.
- Invitaciones, permisos granulares de proyecto, recuperación de contraseña, verificación de correo y MFA; el acceso básico con sesiones ya está implementado.
- - Carga binaria de evidencias, límites y retención; las imágenes adjuntas a casos tienen límite 2 MiB y se guardan en PostgreSQL.
- Proveedores de IA permitidos, ubicación de procesamiento, consentimiento, costos y cuotas.
- Necesidades de importación/exportación y migración de datos.
- Objetivos de disponibilidad, respaldo y recuperación.

### Autenticación local y tema

Session comprueba /api/auth/me al cargar, usa /register y /login y revoca la sesión en /logout. Configuración permite cambiar nombre/correo, actualizar la contraseña con verificación de la contraseña actual, gestionar plantillas personales de bugs y desactivar/anonimizar la cuenta. Al desactivar, la operación verifica contraseña y confirmación, elimina plantillas, revoca sesiones y conserva recursos relacionados. Cambiar contraseña revoca las otras sesiones. La configuración de proveedor de IA es solo maqueta y no almacena claves. No mantiene tokens de autenticación en localStorage. El tema sigue siendo una preferencia local independiente de la autenticación.

PostgresAuth deriva contraseñas con scrypt (N=131072, r=8, p=1) y sal aleatoria de 16 bytes; compara claves con timingSafeEqual y limita la concurrencia de derivación. Los tokens de sesión son aleatorios de 32 bytes y se almacenan como hash SHA-256; las sesiones expiran a los siete días, se rotan en login y se revocan en logout. La cookie es HttpOnly, SameSite=Lax y Secure en producción. Un token CSRF separado protege POST autenticados; las escrituras validan además Origin y Content-Type JSON. Se limita login/registro a 20 intentos por IP/15 minutos en memoria por proceso.

Cada registro crea usuario, organización, proyecto, membresía owner y sesión en una transacción. Nunca reclama organizaciones existentes. AuthorizedRepository consulta las membresías actuales y no lee/crea recursos de proyectos ajenos. Los roles owner/member permiten las operaciones actuales de lectura y creación; no existe administración HTTP de membresías ni roles. Las rutas de salud, contrato Swagger y autenticación son públicas; los datos del proyecto están protegidos.

El frontend carga proyectos y recursos reales, muestra estados de carga/error, y permite crear bugs, casos con pasos, ejecuciones con casos seleccionados y metadatos de evidencias. Casos de prueba se pueden editar y eliminar, salvo que una ejecución los referencie; el formulario también permite adjuntar imágenes o enlaces. Los contadores del resumen se calculan de los registros del proyecto. No se muestran gráficos con cifras ficticias. El diseñador de test cases continúa siendo una maqueta: el usuario puede guardar cada ejemplo de forma explícita, pero no se generan casos por IA ni hay guardado automático.

### Maqueta del diseñador de test cases

La navegación `case-builder` monta el componente `CaseBuilder`. El texto, la selección múltiple, las cantidades y la visibilidad de la tabla viven en estado React. El catálogo define categorías con pruebas ilustrativas; cada categoría seleccionada tiene una cantidad permitida conservada durante la interacción. Los valores inválidos impiden mostrar la tabla. La vista previa y las exportaciones comparten la selección y las cantidades; el texto introducido no se procesa. Al usar la acción explícita de guardado, el controlador crea un caso mediante la API, asociando categoría como Suite, descripción como precondición y los pasos editados. La vista previa no se guarda automáticamente; las propuestas no son generadas por IA.

El flujo futuro podrá partir de una descripción, categorías y cantidades y solicitar propuestas mediante la interfaz opcional de proveedor en el servidor. Cualquier propuesta requerirá revisión y confirmación antes de crear casos con identificadores y referencias de proyecto explícitos. La integración de IA sigue sin implementarse.

## Documentación complementaria

### Documentación interactiva y exportaciones locales

`backend/src/openapi.ts` define OpenAPI 3.0.3 para las catorce operaciones existentes, con esquemas de entrada, respuestas y errores. Express lo expone en `/api/openapi.json` y sirve SwaggerUI con `swagger-ui-express` en `/api/docs/`. Los servidores relativos permiten probar la API desde su origen directo o el proxy `/api` de Vite. Los recursos requieren cookie de sesión y los POST también token CSRF; Try it out escribe en PostgreSQL. Los cambios de endpoints deben actualizar este contrato y `API.md`. SwaggerUI sirve sus recursos localmente y desactiva el validador externo.

El portal enlaza `/api/docs/`. En un despliegue separado se requiere reenviar `/api` al backend.

`src/utils/exportCases.ts` genera Excel `.xlsx` con ExcelJS y PDF con jsPDF y AutoTable, mediante importaciones dinámicas al exportar. El diseñador exporta la vista previa seleccionada y su descripción, con aviso de contenido ilustrativo. No envía información fuera del navegador ni crea entidades del dominio. El PDF ajusta texto y repite encabezados al paginar; Excel conserva las entradas como texto, sin convertirlas en fórmulas. No hay cambios de persistencia ni integración de IA.

Consultar [API.md](./API.md) para el contrato implementado, [DESIGN.md](./DESIGN.md) para la interfaz, [RULES.md](./RULES.md) para convenciones y [DEVELOPMENT.md](./DEVELOPMENT.md) para comandos y entorno. [CONTRIBUTING.md](../CONTRIBUTING.md) describe el flujo de contribución y [SECURITY.md](../SECURITY.md) los límites de seguridad actuales.
