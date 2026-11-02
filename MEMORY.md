# Memoria del proyecto

## Producto y arquitectura

- qaTestGE gestiona bugs, casos, ejecuciones y evidencias por proyecto/organización.
- React + TypeScript + Vite; Express MVC en backend/; PostgreSQL mediante pg, sin fallback en memoria.
- Las cuentas representan personas; la membresía y el rol explícito delimitan cada proyecto. Los responsables QA deben ser miembros activos con acceso al proyecto.
- Mantener relaciones explícitas por ID y claves compuestas de proyecto. Las escrituras de pasos, snapshots y vínculos son transaccionales.
- IA e imagen de perfil siguen siendo maquetas. No hay proveedores externos reales; futuras integraciones viven en servicios/.

## Operación

- Rama de pruebas qa-env; promover a main por PR. No publicar ramas sin petición del usuario.
- Validar pnpm typecheck, pnpm lint, pnpm test, pnpm format:check y pnpm build.
- Nunca usar la BD personal para integración destructiva. TEST_DATABASE_URL selecciona una base efímera explícita.
- Instalación: base qa_test_ge vacía + pnpm db:setup. Actualización: pnpm db:migrate. No reimportar 001 sobre una instalación existente.
- El catálogo compartido backend/src/migrations.ts instala 001 y aplica 004–018; no carga seed automáticamente.
- CI comprueba PostgreSQL efímero, frontend/API y E2E. Push a main genera artefactos; no hay despliegue automático.

## Flujos implementados al 2026-11-01

- Migración 013: testType, lifecycle (Borrador/Listo/Obsoleto) y version en casos, versiones históricas, planes/casos, plan/origen en runs, título/versión en snapshots, origen/severidad/entorno/versión en bugs y flujo por proyecto.
- El resultado histórico del caso (Pendiente/Aprobado/Fallido) permanece separado de su ciclo documental. Suite se conserva; solo categorías conocidas se infieren como tipo en el backfill inicial.
- El trigger diferido captura caso/pasos/tags al confirmar. Formularios y diseñador envían expectedVersion; una edición concurrente antigua devuelve 409. No se reconstruye historial anterior a la migración.
- Crear bug con sourceResultId exige fallo registrado del mismo proyecto y enlaza caso, run, snapshot y evidencias en una transacción. Solo un bug de origen por resultado. Nuevos adjuntos al resultado también se enlazan al bug.
- Test Plan permite crear/editar/buscar planes, buscar y consultar sus casos e iniciar Test Runs enlazados. Los planes con runs no se borran; cambios del plan afectan solo a ciclos nuevos.
- Clonar y reejecutar fallidos copia snapshots originales y reinicia notas/resultados/progreso. Conserva plan y origen; permite revisar versiones históricas aunque el caso luego quede obsoleto. No ejecuta pruebas automáticamente.
- Casos obsoletos no se incorporan a nuevas selecciones de ejecución. Orígenes y resultados con bugs/evidencias no se borran ni se retiran silenciosamente.
- Cada proyecto configura estados, transiciones, estado inicial y closedStates para métricas. Se comprueba revisión y no se retiran estados usados. Solo Admin configura el flujo; QA/Admin gestionan planes.
- Bugs tienen severidad independiente de prioridad, entorno y versión afectada; las exportaciones individuales incluyen estos campos y los IDs del origen.
- Tipo de prueba real desde el diseñador/formulario, filtros por tipo y ciclo documental, cobertura por tipo en Reportes. Cobertura por tipo = casos vigentes distintos con algún resultado registrado; la matriz de requisitos es una capacidad separada.
- CSV/.xlsx: plantilla, una fila por paso, clave de agrupación, vista previa y errores por fila antes de confirmar. ExcelJS existente, hoja nombrada del recurso o libro de una sola hoja y texto sin fórmulas. Máximo 2 MiB, 1000 filas y 100 pasos/caso.
- Importar crea bugs y casos nuevos mediante claves idempotentes; mantiene progreso parcial en la vista, no ofrece transacción global. Al cambiar de proyecto o salir, se detiene la cola y las respuestas tardías no modifican otro alcance.
- Las exportaciones de presentación se adaptan a la plantilla para importar; no existe un importador genérico de todos los libros Excel ni de evidencias.
- QualityRepository se expone como capacidad quality del repositorio, con decorador de autorización, rutas y OpenAPI propios. App compone vistas/controladores.

## Capacidades anteriores conservadas

- CRUD de bugs/casos/runs/evidencias/tags, asignaciones, adjuntos privados (2 MiB), plantillas personales, invitaciones de equipo de un solo uso y gestión de proyectos/equipos.
- Resultados manuales por caso, finalización/reapertura y snapshots; los recursos referenciados no se eliminan en cascada.
- Borradores de bugs y preferencias del diseñador por usuario/proyecto, documentos versionados, revisiones y Web Locks. El diseñador usa ejemplos ilustrativos, no IA.
- Claves idempotentes persistentes para bug/case/run/plan por actor/proyecto/recurso; huella y recurso se confirman juntos. No reintentar automáticamente ni renovar la clave tras una respuesta ambigua.
- Contratos Zod de HTTP/almacenamiento, errores seguros, CSRF, autorización de servidor, X-Request-ID y logs sin cuerpos/cookies/secretos.
- Tablas con páginas de 50/exportación visible, BEM, alertas superiores, footer compartido y navegación adaptable. Dashboard/Reportes consultan agregados del servidor; los demás listados conservan su carga existente.
- Tipografía src/typography.css; pluralización central y guardián ESLint. Mantener textos funcionales >=14 px.

## Colaboración y permisos (014)

- Comentarios en bugs/casos/runs, cuerpo de 1–5000 caracteres, UUID idempotente por actor/proyecto, revisión para editar/eliminar y control autor/Admin. Borrado lógico con contenido anterior en actividad.
- @menciones mediante tokens de ID estable, máximo 20; @Nombre completo único también se resuelve transaccionalmente. Homónimos exigen selección; las automenciones generan avisos. La campana y Mis menciones comparten consulta cada 15 s visibles y al recuperar foco; abrir no marca leído y el botón verde envía el PATCH explícito; avisos privados deduplicados, sin email ni push.
- Activity registra cambios confirmados con actor, requestId y antes/después. Triggers niegan UPDATE/DELETE/TRUNCATE; no captura bytes, claves de almacenamiento ni idempotencia. No reconstruye historia anterior a 014 ni pretende resistir a un superusuario de BD.
- actorDatabase vincula actor/requestId a cada transacción de auth/dominio con set_config local y restaura el pool al terminar. Los triggers validan capacidades; el decorador limita lecturas a proyectos vigentes.
- Roles: Admin configura y administra accesos; QA gestiona recursos de prueba; Dev gestiona bugs/evidencias/comentarios; Solo lectura consulta y descarga. El propietario tiene Admin implícito. Crear proyectos y administrar equipos sigue siendo del propietario.
- Miembros anteriores reciben QA explícito en proyectos existentes. Invitaciones y proyectos nuevos no otorgan accesos automáticamente. Revocar conserva revisión con rol null; protege propietario, último Admin y asignaciones.
- Las escrituras mantienen bloqueo compartido del proyecto; cambiar roles usa bloqueo exclusivo. Notificaciones y respuestas tardías conservan el alcance. Actividad global pagina de 50; conversación/avisos muestran últimos 100.
- PR #24–#33 fusionados; este lote trabaja en fix/filtros-cobertura-y-alertas desde qa-env (896d84b), con nuevo PR hacia qa-env.

## Analítica, cobertura e importación (015)

- Dashboard no tiene tablas: indicadores, distribución de bugs, aprobación por run y cobertura de requisitos. Reportes muestra tendencias por período UTC, fallos frecuentes y cobertura por tipo; CSV de las series.
- AnalyticsRepository limita lecturas al proyecto y usa transacciones REPEATABLE READ READ ONLY con UTC. actorDatabase reconoce BEGIN con opciones y fija contexto después de iniciar. useProjectData se desactiva para overview/reports/coverage; errores de listados no bloquean analítica.
- Aprobación = passed/(passed+failed+blocked), solo resultados registrados; null sin denominador. Resumen/fallos usan executed_at; tendencia de hasta 60 runs usa created_at y tasa actual de cada run. Hasta 366 días inclusivos y 10 casos con más fallos.
- bug_state_events es inmutable: baseline único al instalar 015, estados, reaperturas, eliminaciones y reclasificación de closedStates. Saldo diario UTC, día actual parcial y fechas previas sin datos; no reconstruir historia.
- Requisitos versionados, código único por proyecto y hasta 100 casos; matriz plana paginada y selectores con búsquedas de hasta 50 coincidencias. Reutiliza bug_test_cases; vínculos de un caso aparecen en todos sus requisitos. QA/Admin escribe, todos los roles autorizados consultan. Auditoría transaccional e integridad entre proyectos.
- Botón Importar en Bugs/Casos/Tags, vista previa y confirmación. Plantilla estática public/templates/plantilla-qaTestGE.xlsx con Guía/Bugs/Casos/Tags y guía Markdown descargable. Se verificó el archivo distribuido con el lector real; se normalizaron prefijos XML del exportador para ExcelJS.
- Importación: 2 MiB, 1000 filas, solo texto. Bugs/casos guardan secuencialmente con claves persistentes por fila y progreso parcial; tags tiene lote atómico idempotente y conserva nombre/color existentes, conflicto si cambia color. No reintentar automáticamente. Mantener diálogo para continuar; al cerrarlo revisar el listado antes de repetir.
- GET /test-runs/:id/report es autenticado, readonly para todos los roles con acceso; PDF local con jsPDF/AutoTable, snapshots de título/versión/pasos, resultados actuales, notas, bugs de origen y referencias de evidencia. No incluye binarios ni genera URLs públicas.
- Guías: docs/analytics.md y public/templates/guia-importacion.md; README, Wiki, arquitectura, OpenAPI y chequeo de esquema actualizados. Aplicar pnpm db:migrate antes de iniciar.

## Interacción y configuración

- Importar vive junto a Exportar tabla para Bugs/Casos/Tags. Los listados conservan su montaje durante recargas/fallos para mantener progreso y claves idempotentes. Acento verde común, descargas con estilo de acción, hover/foco sin subrayado y contador de tags a 14 px.
- src/controls.css centraliza interacción de controles y respeta reducción de movimiento. AGENTS.md y docs/DESIGN.md exigen feedback accesible para acciones relevantes, sin alertas indiscriminadas por GET/200.
- Configuración compone Proyectos, Equipos, Accesos al proyecto, Flujo de bugs y Actividad y auditoría con permisos originales; el lateral muestra badge de rol. Los formularios personales se desmontan en gestión. Componentes descartan respuestas tardías; Configuración no carga snapshot QA completo.
- Auditoría ofrece perfiles General/Calidad/Seguridad y filtros en servidor con cursor descendente. Tabla con Anterior/Siguiente y páginas previas en memoria; búsqueda local sobre la página actual. Exporta solo la página visible (Excel/PDF/Markdown); Resumen omite antes/después. Cambiar filtros/actualizar vuelve al inicio. Configuración versionada solo Admin (017), sin suspender ni eliminar eventos.
- Confirmaciones en tags, flujo, requisitos/vínculos, accesos, comentarios, adjuntos, planes, invitaciones, importación y exportaciones. Scope guards impiden mensajes tardíos en otro proyecto. Las alertas de Tags ocupan su propia fila.
- Cobertura usa buscador en filas, selección/carga/error y Enter sin submit. Vincular bug enfoca/destaca su triple con filtros SQL requirementId/caseId/bugId y permite restaurar la matriz completa, incluso desde otra página. Aplicar período mide 44 px y reaplica consultas aunque las fechas no cambien; Actualizar invalida también Reportes, Cobertura y actividad.
- src/spacing.css centraliza escala 8/16/24/32 y layout__panel/inset/stack/actions; interiores de paneles/diálogos >=16 px, 24 px escritorio. AGENTS y DESIGN fijan la regla; badges compactos.
- Dialog separa encabezado/cierre del cuerpo desplazable y usa overflow clip; WorkItemLayout desplaza solo el cuerpo al Historial y propiedades sticky en escritorio. Foco/Escape y reducción de movimiento intactos. Sidebar usa scrollbar nativo fino con alternativa en colores forzados. Comentarios separan contenido/acciones 16 px y tarjetas 24 px.
- Wiki agrupa guías por categorías/búsqueda e incluye filtros, asignaciones, Test Plan, auditoría y evidencias opcionales. Reportes renueva tarjetas, tendencias y ranking; valida fechas reales, Desde<=Hasta y máximo 366 días inclusivos antes de consultar.

- Accesos: Admin gestiona integrantes existentes y crea cuentas nuevas mediante POST /project-users idempotente. Alta transaccional de usuario/equipo miembro/rol solo en este proyecto; correo existente=409, sin takeover ni privilegios de equipo. Contraseña inicial 12–128, hash scrypt; no envío de correo/restablecimiento. Reintentos conservan clave/cuerpo; historial solo nombre/rol. Propietario/último Admin, asignaciones y scopes protegidos.
- Dashboard es la primera opción; presenta 0/0% cuando no hay indicadores evaluables, sin cambiar null del servidor/Reportes. Paneles/tarjetas separan contenido y acciones 16–24 px; hidden se conserva.
- Unitarias CORE por regla en AGENTS/TESTING: se retiran SSR/markup, tema, pluralización y conteos arbitrarios; se conservan auth/roles, reglas QA, contratos de datos, concurrencia, import/export y rollback. Validación de acceso de theme pasa a auth; diseñador conserva selección/cantidades. Sin filtros para ocultar fallos.

- RichTextarea comparte formato Markdown y vista previa, altura inicial >=160 px y selección de menciones en comentarios. Pasos en tarjetas adaptables; Lista/Cita sin iconos. ActivityList presenta fecha/ID descendente sin números. FormattedText usa React escapado, sin HTML, URLs ni imágenes. Exportaciones conservan texto fuente. mentionDraft conserva rangos/IDs mientras el editor muestra @Nombre y descarta selecciones modificadas.
- Guardar en Bugs publica tras casilla de revisión o diálogo explícito; IDs locales antiguos derivan UUID v8 determinista por usuario/proyecto/borrador para idempotencia. Ver en Bugs abre el mantenimiento. Runs exportan PDF desde fila/detalle; guardado de resultados preserva formulario/scroll y muestra confirmación superior. Eliminar abre confirmación compacta, sin doble gutter. Evidencias se descargan desde fila/detalle; el detalle del bug abre carga específica con selección/arrastre. Errores inline <=560 px y éxitos superiores <=360 px; fecha con inicial mayúscula, sin Cuenta de/datos del proyecto/PostgreSQL en pie.
- Migración 016 repone automenciones previas de comentarios activos y usuarios con acceso, conserva fecha y lectura existentes. Requiere pnpm db:migrate. Proveedores de IA son catálogo futuro (OpenAI, Anthropic, Gemini, Azure OpenAI, Mistral, Ollama), sin conexiones ni claves.

- ListingFilters combina búsqueda/estado/responsable/tags y clasificación específica en bugs/casos/runs. IDs estables, Sin asignar/Sin tags/Sin plan, reinicio al cambiar ventana/proyecto. Conserva paginación/exportación sobre recursos cargados.
- Alert success usa portal global sobre modales arriba a la derecha, cierre/caducidad de 4 s y controles en Tab del diálogo. Solo confirmaciones de acciones; errores en contexto, sin avisos GET/200. Campana con enlace superior y ProjectPicker con chevron SVG.

## Validación y entrega

- WorkItemEditor comparte cabecera editable con título/responsable, propiedades y cuerpo al crear/editar bugs/casos/runs, conservando claves y formularios. Test Plan rediseña tarjetas, casos, preparación y selección por búsqueda. ProjectPicker conserva select nativo con estilo propio. Equipos ofrece tarjetas/búsqueda; Descargar no parte el texto. Contador de menciones a 16 px; campana 560 px y lectura masiva propia >100 intactas.
- PostgreSQL efímero: instalación vacía/repetición y seis integraciones aprobadas (auth, calidad, colaboración, analítica, administración, asignaciones). Actualización 017→018 repetida preserva registros y evita atribuir homónimos; CI la verifica en otra base vacía. Reglas CORE y permisos conservados; 169 unitarias CORE y 285 E2E aprobadas (1440/375/425 px), con TypeScript, lint, formato y build aprobados.
- Entrega actual en fix/filtros-cobertura-y-alertas hacia qa-env, después de PR #33; no fusionar. Sin dependencias nuevas. Mis asignaciones usa GET /assigned-work: cuenta autenticada, filtros/paginación SQL, bugs/casos por assignee y runs por ownerUserId. Migración 018 vincula solo responsables heredados con coincidencia única, valida acceso y protege retiradas de equipo/proyecto. DesignEvidencePanel cerrado por defecto selecciona File en memoria y lo anexa explícitamente tras guardar el bug/caso, sin borradores binarios ni IA.
