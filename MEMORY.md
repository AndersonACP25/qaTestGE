# Memoria del proyecto

## Producto y arquitectura

- qaTestGE gestiona bugs, casos, ejecuciones y evidencias por proyecto/organización.
- React + TypeScript + Vite; Express MVC en backend/; PostgreSQL mediante pg, sin fallback en memoria.
- Las cuentas representan personas; la membresía y el rol explícito delimitan cada proyecto. Los responsables QA deben ser miembros activos con acceso al proyecto.
- Mantener relaciones explícitas por ID y claves compuestas de proyecto. Las escrituras de pasos, snapshots y vínculos son transaccionales.
- IA e imagen de perfil siguen siendo maquetas. No hay proveedores externos reales; futuras integraciones viven en servicios/.

## Operación

- Rama de pruebas qa-env; promover a main por PR. No publicar ramas sin petición del usuario.
- Revisar el árbol antes de crear ramas; commits pequeños Conventional Commits en español con lista de cambios.
- Validar pnpm typecheck, pnpm lint, pnpm test, pnpm format:check y pnpm build.
- Nunca usar la BD personal para integración destructiva. TEST_DATABASE_URL selecciona una base efímera explícita.
- Instalación: base qa_test_ge vacía + pnpm db:setup. Actualización: pnpm db:migrate. No reimportar 001 sobre una instalación existente.
- El catálogo compartido backend/src/migrations.ts instala 001 y aplica 004–014; no carga seed automáticamente.
- CI comprueba PostgreSQL efímero, frontend/API y E2E. Push a main genera artefactos; no hay despliegue automático.

## Flujos implementados al 2026-10-30

- Migración 013: testType, lifecycle (Borrador/Listo/Obsoleto) y version en casos, versiones históricas, planes/casos, plan/origen en runs, título/versión en snapshots, origen/severidad/entorno/versión en bugs y flujo por proyecto.
- El resultado histórico del caso (Pendiente/Aprobado/Fallido) permanece separado de su ciclo documental. Suite se conserva; solo categorías conocidas se infieren como tipo en el backfill inicial.
- El trigger diferido captura caso/pasos/tags al confirmar. Formularios y diseñador envían expectedVersion; una edición concurrente antigua devuelve 409. No se reconstruye historial anterior a la migración.
- Crear bug con sourceResultId exige fallo registrado del mismo proyecto y enlaza caso, run, snapshot y evidencias en una transacción. Solo un bug de origen por resultado. Nuevos adjuntos al resultado también se enlazan al bug.
- Planes y ciclos permiten crear/editar grupos de casos e iniciar runs enlazados. Los planes con runs no se borran; cambios del plan afectan solo a ciclos nuevos.
- Clonar y reejecutar fallidos copia snapshots originales y reinicia notas/resultados/progreso. Conserva plan y origen; permite revisar versiones históricas aunque el caso luego quede obsoleto. No ejecuta pruebas automáticamente.
- Casos obsoletos no se incorporan a nuevas selecciones de ejecución. Orígenes y resultados con bugs/evidencias no se borran ni se retiran silenciosamente.
- Cada proyecto configura estados, transiciones, estado inicial y closedStates para métricas. Se comprueba revisión y no se retiran estados usados. Solo Admin configura el flujo; QA/Admin gestionan planes.
- Bugs tienen severidad independiente de prioridad, entorno y versión afectada; las exportaciones individuales incluyen estos campos y los IDs del origen.
- Tipo de prueba real desde el diseñador/formulario, filtros por tipo y ciclo documental, cobertura por tipo en Dashboard/Reportes. Cobertura = casos vigentes distintos con algún resultado registrado, no cobertura de código/requisitos.
- CSV/.xlsx: plantilla, una fila por paso, clave de agrupación, vista previa y errores por fila antes de confirmar. ExcelJS existente, una hoja y texto sin fórmulas. Máximo 2 MiB, 1000 filas y 100 pasos/caso.
- Importar crea casos nuevos mediante claves idempotentes; mantiene progreso parcial en la vista, no ofrece transacción global. Al cambiar de proyecto o salir, se detiene la cola y las respuestas tardías no modifican otro alcance.
- Las exportaciones de presentación se adaptan a la plantilla para importar; no existe un importador genérico de todos los libros Excel ni de evidencias.
- QualityRepository se expone como capacidad quality del repositorio, con decorador de autorización, rutas y OpenAPI propios. App compone vistas/controladores.

## Capacidades anteriores conservadas

- CRUD de bugs/casos/runs/evidencias/tags, asignaciones, adjuntos privados (2 MiB), plantillas personales, invitaciones de equipo de un solo uso y gestión de proyectos/equipos.
- Resultados manuales por caso, finalización/reapertura y snapshots; los recursos referenciados no se eliminan en cascada.
- Borradores de bugs y preferencias del diseñador por usuario/proyecto, documentos versionados, revisiones y Web Locks. El diseñador usa ejemplos ilustrativos, no IA.
- Claves idempotentes persistentes para bug/case/run/plan por actor/proyecto/recurso; huella y recurso se confirman juntos. No reintentar automáticamente ni renovar la clave tras una respuesta ambigua.
- Contratos Zod de HTTP/almacenamiento, errores seguros, CSRF, autorización de servidor, X-Request-ID y logs sin cuerpos/cookies/secretos.
- Tablas con páginas de 50/exportación visible, BEM, alertas superiores, footer compartido y navegación adaptable. Dashboard/Reportes cargan snapshot completo, sin afirmar paginación de esos agregados.
- Tipografía src/typography.css; pluralización central y guardián ESLint. Mantener textos funcionales >=14 px.
- .opencode/agents contiene perfiles de desarrollo; no son agentes del producto. MEMORY.md es la única memoria técnica compartida.

## Colaboración y permisos (014)

- Comentarios en bugs/casos/runs, cuerpo de 1–5000 caracteres, UUID idempotente por actor/proyecto, revisión para editar/eliminar y control autor/Admin. Borrado lógico con contenido anterior en actividad.
- @menciones mediante tokens de ID estable a integrantes activos con acceso, máximo 20. Avisos internos deduplicados, privados por destinatario; Mis menciones marca leído y abre el recurso. Sin emails, push ni tiempo real.
- Activity registra cambios confirmados con actor, requestId y antes/después. Triggers niegan UPDATE/DELETE/TRUNCATE; no captura bytes, claves de almacenamiento ni idempotencia. No reconstruye historia anterior a 014 ni pretende resistir a un superusuario de BD.
- actorDatabase vincula actor/requestId a cada transacción de auth/dominio con set_config local y restaura el pool al terminar. Los triggers validan capacidades; el decorador limita lecturas a proyectos vigentes.
- Roles: Admin configura y administra accesos; QA gestiona recursos de prueba; Dev gestiona bugs/evidencias/comentarios; Solo lectura consulta y descarga. El propietario tiene Admin implícito. Crear proyectos y administrar equipos sigue siendo del propietario.
- Miembros anteriores reciben QA explícito en proyectos existentes. Invitaciones y proyectos nuevos no otorgan accesos automáticamente. Revocar conserva revisión con rol null; protege propietario, último Admin y asignaciones.
- Las escrituras mantienen bloqueo compartido del proyecto; cambiar roles usa bloqueo exclusivo. Notificaciones y respuestas tardías conservan el alcance. Actividad global pagina de 50; conversación/avisos muestran últimos 100.
- PR anterior #24 fusionado en qa-env. Trabajo actual autorizado para commit y PR en feat/colaboracion-auditoria-permisos.

## Validación de este lote

- TypeScript, lint, formato, build y 173 pruebas unitarias/endpoints; 99 E2E (87 anteriores y 12 de colaboración) aprobadas en escritorio, 375 y 425 px.
- PostgreSQL 18 efímero: instalación vacía, repetición, actualización desde 001–013, conservación de acceso heredado y asignación explícita de proyectos nuevos. Integraciones de autenticación/calidad y colaboración verificadas: roles, denegaciones, revocación, comentarios/menciones, avisos privados, contexto del pool, auditoría inmutable sin bytes, idempotencia y rollback.
- Chromium 153 temporal para E2E: la descarga estándar de Playwright falló en este entorno; configuración temporal fuera de la entrega, sin nuevas dependencias del proyecto.
- Publicación autorizada completada: PR #25 hacia qa-env, https://github.com/AndersonACP25/qaTestGE/pull/25. GitHub Actions pendiente de finalizar; no se fusionó el PR.
