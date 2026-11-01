# Arquitectura — qaTestGE v1.0

La migración 011 vincula el responsable de bugs y casos con una membresía de la organización del proyecto mediante claves foráneas compuestas. El backend comprueba que el integrante esté activo y bloquea la retirada mientras conserve asignaciones. El antiguo responsable textual de bugs se mantiene para compatibilidad.

La gestión de proyectos valida en PostgreSQL que quien crea, edita o elimina sea propietario de la organización. El borrado de proyectos con referencias se rechaza; no se eliminan datos QA en cascada.

La Wiki del frontend documenta el flujo implementado. Las tablas de bugs, casos y ejecuciones ofrecen acciones de edición y eliminación. Test Runs permite abrir la ejecución desde su fila y enfocar el primer resultado pendiente para registrarlo manualmente. El espacio Reportes agrega bugs, casos, ejecuciones, resultados registrados y evidencias del proyecto activo; permite exportar los indicadores y distribuciones a CSV, sin persistir información calculada. El borrado de bugs utiliza la autorización por proyecto y conserva la integridad referencial: PostgreSQL rechaza la operación cuando hay casos o evidencias vinculados y la API responde con un conflicto.

## Estado del documento

Este documento combina la arquitectura objetivo de la v1.0 con el estado real del repositorio. El frontend usa React, Vite y TypeScript; existe una API Express MVC en TypeScript con repositorio PostgreSQL sobre qa_test_ge. Hay cuentas locales de una persona, sesiones persistidas, autorización de los proyectos de la cuenta, plantillas personales de bugs y CRUD de casos con adjuntos privados de imágenes/enlaces. Las imágenes de casos se guardan en PostgreSQL; la carga binaria general de evidencias está implementada y la integración con proveedores de IA sigue pendiente. GitHub Actions valida cambios y publica artefactos compilados al hacer push a main; el despliegue a un proveedor aún no está configurado.

## Objetivos

- Gestionar el ciclo de vida de bugs, casos de prueba, ejecuciones y evidencias desde un mismo espacio de trabajo.
- Mantener trazabilidad entre un bug, los casos que lo cubren, las ejecuciones y sus resultados.
- Mantener los datos aislados por organización; la membresía y el rol explícito limitan el acceso a cada proyecto.
- Ofrecer asistencia de IA útil sin convertirla en autoridad ni requisito para usar el producto.
- Proteger los datos del proyecto y hacer explícito cuándo información sale a un proveedor de IA.

## Límites y decisiones actuales

- Workspace pnpm con frontend en la raíz y API en `backend/`. `pnpm dev` (alias `pnpm dev:all`) ejecuta ambos scripts de desarrollo en paralelo; `pnpm dev:frontend` inicia solo Vite.
- El backend organiza Bugs y Test Case en rutas, controladores, modelos y repositorios. Usuarios/autenticación sigue la misma separación mediante rutas HTTP, controlador de autenticación, modelo tipado y proveedor PostgreSQL.
- El diseñador de casos usa ejemplos ilustrativos: `src/models/caseDesign.model.ts` mantiene el catálogo/validación, un hook controlador gestiona estado y exportación, y la vista permite guardar explícitamente cada ejemplo como caso del proyecto. No genera casos dinámicamente ni usa IA.
- La API requiere DATABASE_URL, usa un pool pg y comprueba el esquema qa al arrancar. No existe fallback en memoria ni importación automática del SQL.
- Los endpoints permiten listar y crear bugs, casos de prueba, ejecuciones y metadatos de evidencias. Los bugs y casos se pueden editar; los casos se pueden eliminar si no tienen referencias a ejecuciones, y sus imágenes/enlaces se administran por separado. Los metadatos de evidencias permiten editarse y eliminarse.
- Bugs y casos de prueba permiten actualizar su estado mediante endpoints PATCH, con los valores validados por modelo y las restricciones existentes de PostgreSQL. La configuración de vocabulario y transiciones de bugs se conserva por proyecto (migración 013).
- El propietario puede crear, renombrar y eliminar equipos sin proyectos ni otros integrantes. Al crear proyectos se selecciona un equipo propio. La interfaz permite generar invitaciones de un solo uso y retirar integrantes. El código se comparte manualmente, solo se almacena su hash, caduca en 24 horas y su aceptación es autenticada y transaccional. La membresía permite participar en el equipo; cada proyecto requiere un rol explícito salvo para el propietario (Admin implícito).
- Configuración conserva las cantidades iniciales del diseñador por categoría en localStorage, separadas por usuario en el navegador; no se envían a la API ni a PostgreSQL.
- Los archivos generales de evidencia se guardan como bytes privados en PostgreSQL, máximo 2 MiB, y se entregan como descarga autenticada con comprobación de proyecto.

## Objetivos futuros para v1.0

- Producto web con API de servidor y persistencia duradera.
- Una organización contiene proyectos; cada proyecto contiene sus bugs, casos, ejecuciones y evidencias.
- La autenticación y el aislamiento por organización/proyecto se aplican en el servidor, no solo en la interfaz.
- La carga general de evidencias acepta archivos de hasta 2 MiB. Los adjuntos de casos admiten imágenes PNG/JPEG/GIF/WebP de hasta 2 MiB y enlaces HTTP(S).
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

La interfaz consume la API mediante el proxy /api y envía la cookie de sesión y el token CSRF en escrituras. `GET /api/health` permite verificar disponibilidad. Bugs y evidencias exponen edición; evidencias también permiten eliminar metadatos. Casos y ejecuciones tienen CRUD. Los estados de bug se actualizan mediante `PATCH /api/bugs/{bugId}`.

### Interfaz web

Presenta espacios de trabajo, proyectos, listas y formularios para los cuatro recursos principales. Dashboard y Reportes consultan agregados del servidor mediante /analytics, sin cargar los listados completos del proyecto; Reportes añade rango UTC y exportación CSV. El componente de pie de página es compartido entre el workspace y la pantalla de acceso; las notificaciones globales se muestran en la parte superior con ancho limitado. Para el diseñador de casos, el modelo contiene el catálogo fijo, el hook controlador gestiona la interacción y la vista renderiza el flujo. Debe mostrar estados de carga y error, validar formularios para facilitar el uso y no confiar en validaciones del cliente como control de seguridad.

### API y capa de aplicación

Las rutas delegan en controladores HTTP. Los controladores validan entradas y coordinan modelos/proveedores y repositorios; los modelos tipados describen Bugs, Test Case y usuarios. El proveedor PostgreSQL implementa persistencia. Los middlewares autentican sesiones y el repositorio autorizado limita operaciones a proyectos de organizaciones con membresía vigente. Devuelve errores explícitos y no expone credenciales de almacenamiento ni secretos de proveedores a la interfaz.

### Dominio

La lógica de estados y relaciones vive en servicios de dominio o de aplicación, no en componentes de presentación. Las operaciones que cambian datos deben comprobar la autorización y dejar trazabilidad.

### Persistencia

La API usa `PostgresRepository` mediante una interfaz inyectada en `createApp`. El pool vive únicamente en el arranque del servidor; las pruebas pueden inyectar dobles sin cargar configuración local ni abrir conexiones. Se eliminó el almacén en memoria. Las consultas usan parámetros para valores; las únicas columnas dinámicas provienen de una lista fija para vínculos de evidencias. Las operaciones de casos con pasos, ejecuciones con resultados y evidencias con vínculos usan una transacción y un solo cliente, con rollback y liberación garantizada.

PostgreSQL conserva los datos tras reiniciar. Los proyectos/organizaciones existentes se descubren en GET /api/projects; no se crean automáticamente. projectId es obligatorio en las creaciones. Los IDs bigint se mantienen como strings; los IDs públicos de recursos conservan prefijos BUG, TC, RUN, EVD y RES. La base verifica existencia y pertenencia al mismo proyecto mediante claves compuestas. Las ejecuciones reciben caseIds en vez de caseCount, conservan un snapshot de los pasos y calculan cantidad/progreso a partir de resultados. La respuesta de evidencia usa un array related para conservar todos los vínculos existentes.

`pnpm db:setup` instala 001 y las migraciones desde un catálogo común en backend/src/migrations.ts; requiere una base qa_test_ge creada previamente. No carga seed ni reimporta un esquema existente. El historial SQL se conserva y las actualizaciones usan `pnpm db:migrate`. La 004 agrega usuarios, membresías y sesiones; la 005 crea plantillas personales en qa.bug_templates; la 006 permite Suite opcional; la 007 agrega adjuntos privados de casos; la 008 agrega almacenamiento privado de archivos de evidencia; la 009 añade tags por proyecto y asociaciones explícitas a bugs, casos y ejecuciones. `db:migrate` las aplica de forma idempotente y `db:check` valida las tablas requeridas sin escrituras. La baja de cuenta conserva membresías y recursos: la fila de usuario queda inactiva y anonimizada, se revocan sesiones y se eliminan las plantillas. La migración 014 implementa permisos granulares y auditoría; quedan pendientes las políticas operativas de respaldos. El repositorio autorizado añade control de acceso y las claves foráneas mantienen integridad. El frontend consulta estos recursos, realiza CRUD de casos y adjunta imágenes/enlaces.

Los tags tienen nombre único (sin distinción de mayúsculas) y color hexadecimal dentro de cada proyecto. Los recursos exponen `tagIds`; la API valida que todas las etiquetas asignadas pertenezcan al mismo proyecto. El CRUD de tags se limita al proyecto autorizado y borrar un tag elimina sus asociaciones, no los registros QA.

### Evidencias

Los archivos generales de evidencias se guardan en `qa.evidence.file_bytes` con un límite de 2 MiB. La API limita la subida, valida tipo MIME, requiere sesión y proyecto, y los descarga con `Content-Disposition: attachment`, `nosniff` y política privada sin caché; los registros heredados solo con metadatos permiten adjuntar el archivo después. Los adjuntos de casos usan `qa.test_case_attachments`: guardan hasta 2 MiB por imagen en PostgreSQL. La API admite PNG/JPEG/GIF/WebP con firma comprobada, consulta autenticada y enlaces HTTP(S) sin credenciales. El selector permite arrastrar o elegir hasta cinco imágenes por operación. Se eliminan los adjuntos junto con el caso en una transacción; si el caso tiene referencias a ejecuciones, el borrado se rechaza para preservar integridad.

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
- Recuperación de contraseña, verificación de correo y MFA; invitaciones, permisos de proyecto y sesiones ya están implementados.
- - Carga binaria de evidencias, límites y retención; las imágenes adjuntas a casos tienen límite 2 MiB y se guardan en PostgreSQL.
- Proveedores de IA permitidos, ubicación de procesamiento, consentimiento, costos y cuotas.
- Mapeo de formatos de importación adicionales a la plantilla CSV/XLSX implementada.
- Objetivos de disponibilidad, respaldo y recuperación.

### Autenticación local y tema

Session comprueba /api/auth/me al cargar, usa /register y /login y revoca la sesión en /logout. Configuración permite cambiar nombre/correo, actualizar la contraseña con verificación de la contraseña actual, gestionar plantillas personales de bugs y desactivar/anonimizar la cuenta. Al desactivar, la operación verifica contraseña y confirmación, elimina plantillas, revoca sesiones y conserva recursos relacionados. Cambiar contraseña revoca las otras sesiones. La configuración de proveedor de IA es solo maqueta y no almacena claves. No mantiene tokens de autenticación en localStorage. El tema sigue siendo una preferencia local independiente de la autenticación.

PostgresAuth deriva contraseñas con scrypt (N=131072, r=8, p=1) y sal aleatoria de 16 bytes; compara claves con timingSafeEqual y limita la concurrencia de derivación. Los tokens de sesión son aleatorios de 32 bytes y se almacenan como hash SHA-256; las sesiones expiran a los siete días, se rotan en login y se revocan en logout. La cookie es HttpOnly, SameSite=Lax y Secure en producción. Un token CSRF separado protege POST autenticados; las escrituras validan además Origin y Content-Type JSON. Se limita login/registro a 20 intentos por IP/15 minutos en memoria por proceso.

Cada registro crea usuario, organización, proyecto, membresía owner y sesión en una transacción. Nunca reclama organizaciones existentes. AuthorizedRepository consulta las membresías actuales y no lee/crea recursos de proyectos ajenos. Owner/member describe el equipo; los roles por proyecto y su administración HTTP se implementan con la migración 014. Las rutas de salud, contrato Swagger y autenticación son públicas; los datos del proyecto están protegidos.

El frontend carga proyectos y recursos reales, muestra estados de carga/error, y permite crear y editar bugs, casos con pasos, ejecuciones con casos seleccionados y evidencias con archivos. Bugs y casos tienen una vista modal de detalle; los casos también se pueden eliminar si ninguna ejecución los referencia, y el formulario permite adjuntar imágenes o enlaces. Los metadatos de evidencias se pueden editar y eliminar; los archivos se pueden subir, reemplazar y descargar autenticadamente. Los contadores del resumen se calculan de los registros del proyecto. No se muestran gráficos con cifras ficticias. El diseñador de test cases continúa siendo una maqueta: el usuario puede guardar cada ejemplo de forma explícita, pero no se generan casos por IA ni hay guardado automático.

### Maqueta del diseñador de test cases

La navegación `case-builder` monta el componente `CaseBuilder`. El texto, la selección múltiple, las cantidades y la visibilidad de la tabla viven en estado React. El catálogo define categorías con pruebas ilustrativas; cada categoría seleccionada tiene una cantidad permitida conservada durante la interacción. Los valores inválidos impiden mostrar la tabla. La vista previa y las exportaciones comparten la selección y las cantidades; el texto introducido no se procesa. Al usar la acción explícita de guardado, el controlador crea un caso mediante la API, asociando categoría como Suite, descripción como precondición y los pasos editados. La vista previa no se guarda automáticamente; las propuestas no son generadas por IA.

El flujo futuro podrá partir de una descripción, categorías y cantidades y solicitar propuestas mediante la interfaz opcional de proveedor en el servidor. Cualquier propuesta requerirá revisión y confirmación antes de crear casos con identificadores y referencias de proyecto explícitos. La integración de IA sigue sin implementarse.

## Documentación complementaria

### Ejecuciones manuales y QA en 1.1.0

`TestRunDialog` permite editar ejecuciones y registrar resultados con notas por caso. `PostgresRepository` usa las tablas existentes `test_runs` y `test_run_results`; no hay migración nueva. Las operaciones bloquean la ejecución con `FOR UPDATE` dentro de una transacción para serializar edición, resultados y eliminación. Los casos mantenidos conservan resultado y snapshot; los nuevos capturan sus pasos actuales. Las consultas y claves de proyecto mantienen referencias explícitas. Borrar o retirar resultados con evidencias se rechaza sin eliminar las evidencias ni los casos.

El progreso cuenta `executed_at` no nulos, distinguiendo pendientes de resultados explícitos Omitido. Completar exige al menos un caso y todos sus resultados registrados; reabrir restaura `En curso` y permite corregirlos. El diseñador convierte y valida todos los pasos de la vista actual y actualiza el mismo ID cuando el usuario vuelve a guardar un ejemplo ya creado.

Playwright ejecuta regresiones sobre Vite aislado y una API simulada por prueba, sin PostgreSQL ni credenciales. Vitest verifica validaciones, autorización y transacciones con dobles de repositorio/cliente. CI ejecuta Chromium en escritorio, 375 px y 425 px. Consultar [TESTING.md](./TESTING.md).

### Documentación interactiva y exportaciones locales

`backend/src/openapi.ts` define OpenAPI 3.0.3 para las catorce operaciones existentes, con esquemas de entrada, respuestas y errores. Express lo expone en `/api/openapi.json` y sirve SwaggerUI con `swagger-ui-express` en `/api/docs/`. Los servidores relativos permiten probar la API desde su origen directo o el proxy `/api` de Vite. Los recursos requieren cookie de sesión y los POST también token CSRF; Try it out escribe en PostgreSQL. Los cambios de endpoints deben actualizar este contrato y `API.md`. SwaggerUI sirve sus recursos localmente y desactiva el validador externo.

El portal enlaza `/api/docs/`. En un despliegue separado se requiere reenviar `/api` al backend.

`src/utils/exportCases.ts` genera Excel `.xlsx` con ExcelJS y PDF con jsPDF y AutoTable, mediante importaciones dinámicas al exportar. El diseñador exporta la vista previa seleccionada y su descripción, con aviso de contenido ilustrativo. No envía información fuera del navegador ni crea entidades del dominio. El PDF ajusta texto y repite encabezados al paginar; Excel conserva las entradas como texto, sin convertirlas en fórmulas. No hay cambios de persistencia ni integración de IA.

Consultar [API.md](./API.md) para el contrato implementado, [DESIGN.md](./DESIGN.md) para la interfaz, [RULES.md](./RULES.md) para convenciones y [DEVELOPMENT.md](./DEVELOPMENT.md) para comandos y entorno. [CONTRIBUTING.md](../CONTRIBUTING.md) describe el flujo de contribución y [SECURITY.md](../SECURITY.md) los límites de seguridad actuales.

El diseñador admite de 1 a 5 ejemplos por categoría y exporta Markdown `.md` de la vista previa editada, con texto escapado y descarga local, sin dependencias adicionales. Los perfiles de `.opencode/agents/` coordinan el desarrollo en OpenCode y no son agentes dentro del producto.

### Preferencias y tipos del diseñador

CaseDesignSettings permite editar y eliminar todos los tipos, incluidos los predeterminados. Conserva IDs y preferencias al renombrar, y no altera casos guardados. useCasePreferences guarda un documento v2 con revisión, catálogo, cantidades y selección bajo un Web Lock; lee las claves anteriores y rechaza escrituras obsoletas, corrupción y cuotas. La selección tras eliminar tipos usa el primer tipo disponible. Se conserva al menos un tipo.

### Diseñador local de bugs

`BugDesignView` prepara título, descripción y prioridad a partir del texto y una plantilla personal cargada mediante el cliente central. Es una composición determinista, sin análisis semántico ni proveedor de IA. Reutiliza `TagPicker` con tags del proyecto. La creación exige revisión explícita mediante casilla o diálogo de confirmación; llama a `createBug` una vez y bloquea una segunda creación de la misma vista previa tras el éxito. Los errores conservan el contenido editable.

`models/bugDesign.ts` mantiene borradores explícitos en localStorage bajo clave por usuario y proyecto; valida la forma del contenido al recuperarlo. No añade un estado Borrador al dominio ni una migración. Cada borrador conserva su propio ID y puede abrirse, actualizarse o eliminarse. Tras publicar se intenta retirar el borrador local; un fallo de limpieza se comunica sin volver a crear el bug. No hay sincronización entre navegadores, subida de archivos ni envío externo. El componente se monta con clave usuario/proyecto para aislar el estado. La preparación rechaza descripciones combinadas mayores a 5000 caracteres sin recortarlas silenciosamente.

La [guía de integración de IA](AI_INTEGRATION.md) describe una implementación futura bajo `servicios/`, con endpoint autenticado, consentimiento, salida estructurada, cuotas y revisión humana. No hay proveedor real implementado.

### Exportación de listados y maqueta de perfil

`TableExport` reutiliza el diálogo y los formatos existentes para exportar Bugs, Casos de prueba y Test runs. `models/tableExport.ts` transforma únicamente las filas filtradas recibidas y las columnas visibles en datos tabulares, sin descripciones, pasos ni resultados internos. Los tags se incluyen junto al título tal como aparecen en el listado. `utils/exportTable.ts` genera Excel, PDF apaisado y Markdown con las dependencias existentes y descarga local compartida con la exportación individual; no solicita datos adicionales a la API. Las celdas de Excel son texto y Markdown escapa separadores y HTML. Cada tabla mantiene sus controles y acciones de dominio; se reutiliza la capacidad de exportación sin introducir una abstracción genérica de celdas.

Configuración muestra una vista preliminar de imagen de perfil con iniciales y un botón deshabilitado. No selecciona ni sube archivos, no persiste imágenes y no añade endpoints ni migraciones.

### Robustez implementada

[HARDENING.md](HARDENING.md) documenta contratos Zod y DTO inferidos, caché y tokens de alcance por proyecto, ErrorBoundary, persistencia con revisiones, separación de tablas/controladores/rutas, lint tipado y flags TypeScript adicionales por etapas. Los borradores leen arrays antiguos y documentos v2; Actualizar lista conserva la vista previa y evita sobrescribir cambios de otra pestaña. Las escrituras locales requieren Web Locks.

La migración 012 añade qa.creation_requests. Bugs, casos y ejecuciones admiten Idempotency-Key por actor/proyecto/recurso; el advisory lock, la huella y el ID se confirman en la misma transacción del recurso. Repetir contenido distinto o un recurso eliminado devuelve 409; no se introducen reintentos automáticos. El esquema se comprueba antes de abrir el puerto.

Los listados API admiten filtros y paginación opcionales con parámetros ligados, projectId obligatorio y orden estable por ID. La UI muestra páginas de 50 y exporta la página visible. Dashboard/Reportes usan agregaciones PostgreSQL y deshabilitan loadProject; no se han medido cargas de producción.

CI dispone de PostgreSQL efímero, migraciones repetidas y verificación de aislamiento, rollback, concurrencia, idempotencia y asignaciones. requestContext genera X-Request-ID y logs JSON seguros sin cuerpos, consultas, cookies ni secretos. No se añade un proveedor externo.

## Preparación y consistencia del release

La tipografía se centraliza en src/typography.css con tokens rem y clases por rol. Las frases con cantidades usan formatCount/pluralize y un guardián ESLint de vocabulario. El perfil del lateral abre Configuración con navegación interna, conservando la sesión. Los perfiles de desarrollo comparten MEMORY.md y los criterios de docs/RELEASE.md; no son agentes dentro del producto.

## Flujos de calidad implementados (migración 013)

`013_quality_workflows.sql` añade tipo, ciclo de vida documental y revisión a casos; tablas de versiones, planes y sus miembros; plan/origen en ejecuciones; título y versión del caso en el snapshot de resultados; origen, severidad, entorno y versión afectada en bugs; y configuración de estados, transiciones y estados resueltos por proyecto. No sustituye los estados históricos de resultados ni cambia Suite. Infiere únicamente categorías conocidas de suites anteriores una vez; conserva el texto original y crea una versión de referencia. No reconstruye versiones anteriores a la instalación.

El trigger diferido de versiones captura el caso y sus pasos al confirmar la transacción; el bloqueo y `expectedVersion` detectan ediciones concurrentes desde el formulario y diseñador. Cambios del estado histórico también generan versión. Los adjuntos tienen su ciclo independiente y no se copian como bytes en cada versión. Una ejecución nueva conserva título, versión y pasos; clonar usa el snapshot del origen incluso si el caso cambió o quedó obsoleto. Los resultados y notas nuevos se reinician. Los planes mantienen asociaciones explícitas; los ciclos referencian el plan y conservan su propia selección/snapshot.

Crear un bug con `sourceResultId` bloquea su ejecución, comprueba que sea un fallo registrado del mismo proyecto y guarda bug, relación con el caso y asociaciones de evidencia en una transacción. Una restricción única impide dos bugs de origen para el mismo resultado. Un trigger enlaza automáticamente evidencias nuevas del resultado al bug. Se conservan las referencias originales; no se duplican archivos. Borrar una ejecución origen o retirar un resultado con bug se rechaza. Las reejecuciones y planes tienen claves foráneas compuestas por proyecto.

`QualityRepository` extiende las capacidades a través de la propiedad `quality` del repositorio, con implementación PostgreSQL y autorización por proyecto en el decorador. Las nuevas rutas, DTO, validadores y OpenAPI se mantienen separados del componente App. El servidor valida el vocabulario/las aristas de bugs contra la configuración bloqueada del proyecto; la edición de configuración usa revisión y conserva estados usados. QA y Admin pueden gestionar planes; solo Admin modifica el flujo del proyecto (migración 014).

Importación CSV/XLSX usa ExcelJS ya instalado y validación Zod previa; todo permanece en el navegador hasta la confirmación. Las escrituras usan el endpoint existente y claves idempotentes por caso; el progreso parcial se mantiene en el componente y se detiene al salir de su alcance. No hay transacción global del archivo ni importación de evidencias. Planes admiten `Idempotency-Key` bajo el mismo mecanismo transaccional de creación; las copias y ciclos reutilizan el mecanismo de ejecuciones. No hay reintentos automáticos.

Las comprobaciones PostgreSQL incluyen instalación/repetición, snapshots, concurrencia de versiones, planes, referencias, fallos sin ejecutar, evidencia posterior, idempotencia, estados y aislamiento entre cuentas. La cobertura por tipo es un cálculo de casos vigentes con resultados registrados, no una medición de requisitos o código.

## Colaboración, auditoría y autorización (014)

La migración `014_collaboration_permissions.sql` añade `project_members` con roles Admin/QA/Dev/Solo lectura, comentarios con versión, menciones y avisos privados por destinatario, y `activity` como registro inmutable. El propietario tiene Admin implícito. Los miembros heredados reciben QA explícito solo en los proyectos actuales; aceptar una invitación nueva no concede proyectos. Las asignaciones y menciones exigen un usuario activo con acceso al proyecto. La revocación mantiene una fila sin rol y aumenta su revisión, evitando reutilizar revisiones tras retirar y restaurar acceso.

`qa.project_role` consulta membresía, usuario activo y rol del proyecto. `qa.require_permission` comprueba la capacidad y mantiene un bloqueo compartido del proyecto durante la transacción. Cambiar accesos bloquea el proyecto en exclusivo; así se serializa con escrituras y menciones. Los triggers comprueban permisos en bugs, casos/pasos/adjuntos, runs/resultados, evidencias/vínculos, tags/asociaciones, planes, flujo y comentarios. El decorador autorizado sigue filtrando proyectos de lectura; sin acceso devuelve 404, con rol insuficiente una escritura devuelve 403. El UI usa la misma matriz para orientar a la persona, sin sustituir la comprobación del servidor.

`actorDatabase` mantiene actor y request ID en variables de PostgreSQL de alcance transaccional (`set_config(..., true)`); cada consulta independiente usa una transacción y las operaciones existentes conservan su cliente transaccional. El contexto nunca se comparte mediante variables globales ni queda en una sesión reutilizada del pool. Los proveedores de auth y dominio se vinculan a la identidad autenticada; no aceptan el actor desde el cuerpo HTTP.

Los triggers registran insert/update/delete en la misma transacción del recurso. El evento conserva proyecto, clase/ID, actor, correlación, fecha y campos antes/después. Los cambios de pasos y comentarios se vinculan al caso/bug/run correspondiente. Se excluyen bytes de archivos, claves de almacenamiento y claves/huellas de idempotencia. No se auditan hashes de contraseña, sesiones ni cuerpos HTTP generales. Los nombres se resuelven desde usuarios para respetar la anonimización de cuentas. Los eventos no tienen FK de borrado al proyecto: sobreviven al borrado de proyectos vacíos y no bloquean su eliminación; sin proyecto accesible no se consultan por API. Triggers rechazan UPDATE, DELETE y TRUNCATE sobre actividad. Una persona con administración directa de PostgreSQL sigue siendo un operador confiable; esto no es un almacén criptográfico contra un superusuario ni un servicio externo de cumplimiento.

Los comentarios están enlazados con claves compuestas y un único destino bug/case/run. Creación con UUID persistente por actor/proyecto, huella del contenido y advisory lock: una repetición devuelve el mismo comentario, contenido distinto devuelve 409. Editar/borrar exige revisión y autoría o Admin; el borrado lógico limpia el cuerpo visible y conserva el anterior en auditoría. Eliminar el recurso retira sus comentarios y avisos en cascada, dejando la actividad persistida. La lista ofrece los últimos 100 comentarios; la actividad global pagina de 50 en 50 por ID descendente.

Las menciones persisten tokens `@[Nombre](user:ID)`, pero el editor muestra `@Nombre` y mantiene rangos/IDs separados en `mentionDraft`. Al editar un nombre se retira su selección; los homónimos conservan el ID seleccionado. `FormattedText` representa un subconjunto de Markdown mediante React escapado, nunca HTML. Se comprueban IDs contra acceso vigente, no se confía en la etiqueta enviada para identificar al destinatario. La escritura de comentario/menciones/avisos es atómica. Las automenciones también generan avisos; la migración 016 repone las existentes en comentarios activos con acceso vigente, sin sobrescribir avisos ni lecturas. Un aviso por comentario/destinatario evita duplicados; editar sin retirar la mención no genera otro aviso. Solo el destinatario puede marcarlo leído y solo mientras conserve acceso. Retirar menciones o eliminar comentarios retira sus avisos. No se envían emails, no hay push/tiempo real y no se integra un proveedor externo.

Las rutas y contratos nuevos viven en `collaboration.routes.ts`, `collaboration-openapi.ts` y `CollaborationRepository`. Las vistas compartidas se montan por proyecto/registro y descartan respuestas tardías al salir de su alcance. `pnpm db:migrate` omite 013/014/015/016 ya registradas para no reinstalar funciones previas sobre las nuevas reglas; la instalación y actualización comparten catálogo y bloqueo.

## Analítica, cobertura e importación (015)

`AnalyticsRepository` es una capacidad separada, autorizada por proyecto y documentada en OpenAPI. Las consultas de lectura compuestas usan `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY` antes de fijar el actor transaccional y la zona UTC. Dashboard y Reportes desactivan el snapshot de `useProjectData`; `useAnalytics` descarta respuestas de otro proyecto/rango. La matriz y los requisitos paginan en el servidor; sus selectores buscan páginas de hasta 50 recursos. Los demás listados mantienen su carga existente.

015 añade requisitos versionados, vínculos de casos con claves compuestas por proyecto y auditoría transaccional. Reutiliza `bug_test_cases` para cerrar la matriz; editar requisitos exige `cases.write`, y vincular bugs exige también `bugs.write`. Los requisitos admiten hasta 100 casos, creaciones idempotentes y edición/eliminación con versión. Los recursos referenciados conservan integridad, sin cascadas de eliminación de casos o bugs.

`bug_state_events` conserva una base de los bugs existentes y movimientos inmutables desde la instalación de 015. Los cambios de estado, eliminaciones y cambios de `closedStates` generan eventos en la misma transacción. Las tendencias no inventan historia previa y muestran saldo diario UTC; el día actual es parcial. Véanse las definiciones en [analytics.md](analytics.md).

La importación usa un diálogo compartido para Bugs/Casos/Tags con plantilla Excel y guía estáticas en public/templates. ExcelJS lee la hoja nombrada del recurso o una hoja única, solo texto y sin fórmulas. La vista previa se valida antes de habilitar confirmación. Bugs y casos usan creaciones individuales idempotentes con progreso parcial; tags usa un lote atómico con huella persistente por actor/proyecto/UUID y conflicto de color. No se reintenta automáticamente. La plantilla se generó con Artifact Tool; se normalizaron los prefijos XML del paquete para compatibilidad con el lector ExcelJS, verificada con el archivo distribuido.

`GET /test-runs/:runId/report` devuelve un DTO autenticado de solo lectura con el snapshot original, resultados actuales y referencias de bugs/evidencia. jsPDF/AutoTable generan localmente el informe paginado. No se publican URLs ni se incluyen bytes de archivos de evidencia. Todos los roles con acceso pueden descargarlo.

## Ajustes de interacción y configuración

Flujo de bugs y Actividad y auditoría se componen dentro de AccountSettingsView. Las pestañas conservan permisos y se montan por proyecto; al cambiar de alcance se descartan respuestas anteriores. Configuración no descarga el snapshot QA completo. La auditoría conserva una búsqueda local explícita y añade filtros en servidor por perfil, recurso, operación, autor, fechas UTC y búsqueda, con cursor descendente.

Los mantenimientos reutilizan Alert para confirmar escrituras y descargas, además de errores. Tags, flujo, requisitos/vínculos, accesos, comentarios, adjuntos y eliminación de planes tienen confirmaciones explícitas. Los controles de importación comparten ubicación, acento y estados; la capa común controls.css define hover/foco y elimina subrayados de acciones. Reaplicar un período vuelve a consultar sus agregados incluso si las fechas no cambian; Actualizar invalida también Reportes, Cobertura y la actividad del proyecto.

### Gestión, lectura de menciones y espaciado

Proyectos y Equipos también se componen como pestañas de AccountSettingsView; se conservan autorización y callbacks de selección/actualización. Los formularios personales se desmontan al visitar las pestañas de gestión para evitar controles ocultos con etiquetas repetidas. El rol visible usa un badge. Dialog separa encabezado fijo y cuerpo desplazable; spacing.css proporciona tokens y clases de espaciado reutilizables. Wiki ofrece búsqueda local/categorías; Reportes valida fechas reales, orden y hasta 366 días inclusivos antes de consultar, además de la validación independiente del servidor.

Los comentarios convierten `@Nombre completo` en el token estable existente cuando corresponde exactamente a un único integrante activo con acceso. Nombres duplicados devuelven 400 y requieren seleccionar un ID en las sugerencias. No se interpretan correos ni prefijos de nombres. La normalización se verifica dentro de la misma transacción del comentario y conserva idempotencia sobre la solicitud original; no cambia el esquema. La entrega sigue siendo privada, deduplicada y sin avisos para el propio autor.

`useMentionNotifications` comparte la bandeja y la campana del navbar por usuario/proyecto: consulta al montar, recuperar foco/visibilidad y cada 15 segundos visibles. Las lecturas se abortan y descartan al cambiar de alcance; las confirmaciones locales de lectura impiden que una respuesta anterior vuelva a mostrar el aviso pendiente. Solo el botón Marcar como leída envía PATCH. Abrir registro recarga el snapshot del proyecto sin cambiar el aviso. No hay WebSocket ni push; se mantiene el límite de los últimos 100 avisos.

### Accesos por proyecto y pruebas del CORE

AccountSettingsView compone Accesos al proyecto cuando existe projectId y la persona tiene access.manage; se elimina la página lateral independiente y Dashboard pasa a ser la primera opción. ProjectAccessView separa alta de acceso, consulta/búsqueda, edición de rol y retirada. Reutiliza GET /project-members?candidates=true y PUT /project-members/:userId con role/revision, para integrantes registrados, activos y pertenecientes al equipo. La migración 017 añade además el alta administrativa de cuentas nuevas mediante POST /project-users. Retirar equivale a revocar esa membresía, no borrar la cuenta. Admin no propietario también puede gestionarlas. Se conservan validación de servidor, propietario/último Admin protegido, asignaciones y conflicto de revisión; no hay reintentos automáticos.

El componente por proyecto aborta lecturas al desmontar y descarta resultados tardíos de escritura, con bloqueo durante el guardado y mensajes concretos. El Dashboard representa tasas null como 0% solo al presentar, con explicación; el contrato de analítica y Reportes conserva null para ausencias históricas. El espaciado compartido separa los hijos de paneles/tarjetas y respeta hidden.

Las unitarias se concentran en CORE: dominio QA, acceso/autenticación, contratos de datos, persistencia/concurrencia, importación/exportación y reglas analíticas. Se retiran aserciones de markup, textos/clases y totales arbitrarios; no se filtran tests fallidos ni se reduce la protección de seguridad, rollback o aislamiento. Presentación y navegación se verifican con la suite E2E existente y revisión visual.

## Edición de texto e interacción

`RichTextarea` comparte la barra de formato y vista previa en todos los campos largos, conservando los formularios controlados y los basados en FormData. Se guarda texto Markdown en las mismas columnas y se mantienen los límites de longitud. `FormattedText` permite negrita, cursiva, tachado, código, listas y citas; no interpreta HTML, URLs ni imágenes. Las exportaciones conservan el texto fuente.

El listado se conserva montado durante su recarga para que Importar, situado junto a Exportar tabla, mantenga las claves idempotentes y el progreso parcial. La exportación individual de runs utiliza el informe autenticado existente, con diálogo específico. La eliminación usa un diálogo compacto sin montar resultados o conversación; las relaciones siguen protegiéndose en servidor. Los proveedores visibles en Configuración son un catálogo de futuras integraciones, sin nuevas dependencias ni llamadas externas.

## Interacción de registros y notificaciones

La campana y Mis menciones comparten estado y errores seguros; el marcado es una acción explícita, idempotente y privada del destinatario con la API existente. PATCH /mention-notifications/read-all marca atómicamente todos los avisos propios activos del proyecto, incluidos los anteriores a los 100 visibles; devuelve cantidad real y fecha del servidor. No afecta otros destinatarios ni menciones futuras.

Los borradores de bugs con ID UUID mantienen su clave existente; IDs locales antiguos se convierten en UUID v8 determinista mediante SHA-256 de usuario/proyecto/ID. Reintentar conserva la misma identidad y la huella de contenido sigue validándose en servidor. Publicar un bug sin borrador guardado evita una escritura local innecesaria; un fallo de limpieza de un borrador publicado no vuelve a crear el registro.

El editor de pasos usa tarjetas y columnas adaptables en lugar de una tabla estrecha. RichTextarea ofrece un callback de selección para insertar menciones de identidad estable en comentarios. Dialog usa IDs accesibles únicos, restaura foco sin desplazar la página y deja el desplazamiento en el cuerpo sin reservar dos canales de scrollbar. EvidenceUploadDialog abre una carga privada enlazada al bug, con componentes por alcance. FileDropzone y la importación conservan los límites y la revisión antes de escribir.

Los resultados del Test Run mantienen claves de React por ID; guardar no remonta su formulario ni desplaza el diálogo al inicio. El feedback y los errores de la mutación aparecen en el caso correspondiente y se conserva scrollTop. ActivityList ordena copias por fecha descendente e ID descendente en empates, sin numeración visible.

Test Plan conserva contratos, IDs, revisiones y permisos de /test-plans. La vista incorpora búsquedas de planes/casos, detalle de los casos, alta/edición y creación explícita de un Test Run enlazado. Los casos ocultos por búsqueda conservan sus selecciones; no se incorporan casos obsoletos nuevos.

## Administración del proyecto y Work Items (017)

La migración 017 añade project_audit_settings y project_user_requests, sus controles de permisos y un índice de consulta de actividad. GET/PUT /audit-settings usa perfil General (todos), Calidad (recursos QA) o Seguridad (accesos, usuarios, configuración y flujo), detalle Resumen/Detallado y páginas de 25/50/100. Solo Admin guarda, con revisión optimista; una revisión obsoleta devuelve 409. Esta configuración presenta/filtra eventos: nunca suspende, modifica ni elimina la auditoría transaccional. Los cambios de configuración también se auditan.

POST /project-users exige access.manage, UUID Idempotency-Key y nombre/correo/contraseña inicial/rol validados. Crea una cuenta global, membresía de equipo sin administración y rol exclusivamente en el proyecto elegido dentro de una sola transacción. Un correo ya existente devuelve 409 sin tomar control de esa cuenta. El bloqueo por proyecto serializa las altas/reintentos y la comprobación de contraseña con scrypt evita guardar una huella rápida de la contraseña. El historial solo registra nombre/rol, nunca correo, contraseña ni hash. El administrador comunica las credenciales iniciales por su propio canal; no se envían correos y no hay flujo de restablecimiento. QA, Dev y Solo lectura no pueden crear cuentas ni cambiar configuración.

WorkItemLayout compone identidad con acento por tipo, navegación a las secciones existentes y propiedades laterales adaptables para bugs, casos, ejecuciones y evidencias. No cambia contratos de los recursos. Los formularios amplían el espacio en escritorio, conservando el editor de pasos adaptable y el scroll de ejecución. Test Plan separa edición y catálogo con tarjetas y mantiene selección, revisiones, roles e idempotencia existentes.

FileDropzone permite selección y arrastre en alta/reemplazo de evidencia y resultados de Test Run, además de importación/carga del bug. El mismo objeto File se conserva en FormData tras un drop; se mantienen 2 MiB y autorización por proyecto. La lectura masiva comparte estado con la campana, bloquea acciones simultáneas y descarta respuestas de otro alcance. Abrir un registro sigue sin marcarlo leído.
