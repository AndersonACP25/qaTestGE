# Guía de uso de qaTestGE

Organiza el trabajo de calidad de tu equipo en un solo lugar: registra bugs, prepara casos de prueba, ejecuta pruebas manuales y conserva sus evidencias por proyecto.

## Empieza a trabajar

1. Crea tu cuenta o inicia sesión.
2. En **Proyectos**, crea o selecciona el proyecto en el que vas a trabajar.
3. Registra tus **Bugs** con descripción, prioridad, estado y responsable.
4. Prepara tus **Casos de prueba** con precondiciones, pasos y resultados esperados.
5. Crea una **Ejecución**, selecciona los casos y registra sus resultados y notas.
6. Adjunta **Evidencias** para documentar lo que ocurrió y consulta los **Reportes** del proyecto.

## Qué puedes hacer

- **Bugs:** crear, consultar, editar y organizar incidencias con tags y responsables. Puedes usar plantillas personales y exportar registros.
- **Casos de prueba:** documentar procedimientos, adjuntar imágenes o enlaces y relacionarlos con bugs. La Suite es opcional.
- **Ejecuciones:** agrupar casos, registrar sus resultados y completar la ejecución cuando todos tengan un resultado. Puedes reabrirla para corregirlos.
- **Evidencias:** subir y descargar archivos privados de hasta **2 MiB**, vinculados al trabajo del proyecto.
- **Dashboard y reportes:** consultar el estado del proyecto y descargar el reporte en CSV.
- **Proyectos y equipos:** crear espacios de colaboración y aceptar códigos de invitación de un solo uso. Los integrantes acceden a todos los proyectos de su equipo.

Los listados muestran hasta 50 filas por página; usa Anterior y Siguiente para recorrer los resultados filtrados.

La eliminación de registros puede bloquearse cuando existen relaciones que deben conservarse, como casos usados en ejecuciones o recursos con evidencias.

En **Bugs**, **Casos de prueba** y **Test runs**, el botón verde **Exportar tabla** descarga los registros de la página visible que coinciden con tus filtros, con las columnas del listado, en Excel, PDF o Markdown. Los botones **Exportar** de cada fila de bugs y casos descargan el detalle de ese registro. También puedes exportar las tablas de registros recientes del Dashboard.

## Diseña tus casos

El **Diseñador de casos** ofrece ejemplos ilustrativos por tipo de prueba. Describe tu flujo, selecciona tipos y cantidades (de 1 a 5), y adapta los pasos y resultados de la vista previa. Puedes exportarla a Excel, PDF o Markdown, o guardar cada caso en el proyecto mediante una acción explícita.

En **Configuración → Diseño de casos** puedes añadir tipos personalizados y elegir los tipos y cantidades iniciales. Estas preferencias se guardan para tu usuario **en este navegador**; no se sincronizan entre dispositivos. Cada tipo nuevo incluye escenarios de partida que debes adaptar a tus pruebas.

El diseñador no analiza tu descripción ni genera contenido con IA. Revisa siempre los ejemplos antes de guardarlos.

## Diseña tus bugs

En **Diseñar bugs**, describe el problema y elige una plantilla personal si la necesitas. **Preparar bug** combina ese texto con la plantilla para crear una vista previa local editable; no analiza el problema con IA ni inventa hechos. Revisa título, descripción y prioridad, asigna tags del proyecto y confirma **Guardar bug en el proyecto**.

Puedes conservar varios borradores con **Guardar borrador**, abrirlos o eliminarlos. Se guardan únicamente en este navegador por usuario y proyecto; no son bugs del proyecto y no se sincronizan entre dispositivos. Si otra pestaña cambia la lista, usa **Actualizar lista de borradores** antes de guardar para evitar sobrescribirla. Evita incluir credenciales o datos sensibles. Al crear el bug se retira su borrador local.

En **Configuración → Diseño de casos**, cada tipo tiene botones **Editar** y **Eliminar**, incluidos los predeterminados. Renombrarlos conserva sus preferencias; eliminarlos no modifica casos ya guardados. Conserva al menos un tipo.

Si administras la instalación y quieres conectar un proveedor de IA, consulta la [guía de integración gradual](AI_INTEGRATION.md). La integración real aún no está implementada.

## Personaliza tu cuenta

En **Configuración** puedes actualizar tu nombre y correo, cambiar tu contraseña y crear plantillas personales de bugs. También puedes cambiar el tema de la interfaz.

El cambio de imagen de perfil aparece como una maqueta: todavía no permite seleccionar ni subir imágenes.

Al desactivar tu cuenta se revocan tus sesiones y se anonimizan tus datos personales; los recursos QA y las membresías se conservan para mantener la trazabilidad.

## Límites actuales

La conexión con IA es una maqueta: no guarda claves ni envía información a proveedores. Tampoco están disponibles la recuperación de contraseña, la verificación de correo, MFA ni invitaciones por correo. Las ejecuciones registran pruebas manuales; no ejecutan pruebas automáticamente.

## Instalación y documentación técnica

Para ejecutar tu propia instancia, consulta la [guía de desarrollo](DEVELOPMENT.md). Al actualizar una instalación existente, aplica `pnpm db:migrate` antes de iniciar la API; esta versión incorpora la migración 012 para evitar creaciones duplicadas. Encontrarás los detalles técnicos en [Arquitectura](architecture.md), [API](API.md), [Pruebas](TESTING.md) y [Seguridad](../SECURITY.md). Para colaborar con el proyecto, consulta [CONTRIBUTING.md](../CONTRIBUTING.md).

## Trazabilidad y organización de pruebas

- **Crear bug desde un fallo:** abre una ejecución, registra un resultado como Fallido y selecciona «Crear bug desde este fallo». Revisa título, descripción, severidad, entorno y versión afectada antes de confirmar. El bug conserva las referencias al caso, resultado y ejecución, los pasos evaluados y las evidencias existentes. Los nuevos archivos adjuntados a ese resultado también quedan enlazados al bug. Solo se permite un bug de origen por resultado; un fallo en otra reejecución puede generar otro bug.
- **Tipo de prueba:** el tipo es independiente de Suite. El diseñador guarda su categoría en Tipo de prueba. Puedes editarlo y filtrar los casos por tipo y estado documental. Dashboard y Reportes muestran cobertura: casos vigentes con algún resultado registrado dividido entre casos vigentes del tipo. Cuenta casos distintos, no ejecuciones repetidas; no equivale a cobertura de código o requisitos.
- **Estado y versiones:** Borrador, Listo y Obsoleto describen la preparación del caso; Pendiente, Aprobado y Fallido conservan su significado anterior de resultado. El detalle muestra el historial de versiones con pasos y precondiciones. Editar desde el formulario o diseñador comprueba la versión que abriste y rechaza cambios obsoletos. Los casos obsoletos no se pueden añadir a ejecuciones nuevas; una copia histórica conserva los casos y pasos del origen.
- **Planes y ciclos:** entra en Planes y ciclos, indica un nombre y selecciona casos. «Iniciar ciclo» crea una ejecución enlazada al plan. Editar el plan afecta a los ciclos futuros. Una ejecución conserva sus resultados aunque el plan cambie. Los planes con ejecuciones no se eliminan.
- **Clonar y reejecutar:** en el detalle de una ejecución puedes clonar todos sus casos o reejecutar solo los fallidos registrados. La nueva ejecución empieza sin resultados registrados, mantiene el plan y referencia al origen y copia los pasos/versiones evaluados. No realiza pruebas automáticamente. Si no hay fallidos, la opción queda deshabilitada.
- **Importar:** abre Casos de prueba → Importar casos desde CSV o Excel y descarga la plantilla CSV. Excel admite `.xlsx`, una hoja y celdas de texto. Usa las columnas `clave`, `titulo`, `suite`, `tipo`, `estado`, `precondiciones`, `accion`, `resultadoEsperado`. Cada fila representa un paso; repite la clave y los datos del caso para agruparlo. Si omites clave, se agrupa por título. Máximo 2 MiB, 1000 filas y 100 pasos por caso. Revisa los errores y la vista previa antes de confirmar. Se crean casos nuevos; no se actualizan casos por coincidencia de título. Las exportaciones individuales y de listados tienen un formato de presentación: adapta sus columnas a la plantilla para importarlas. Si falla una escritura, los casos confirmados permanecen y puedes continuar los pendientes con las mismas claves de solicitud; no cambies de archivo para reintentar. Esta recuperación se conserva mientras mantengas abierta la vista.
- **Flujo de bugs:** cada proyecto tiene su vocabulario y transiciones en Flujo de bugs. El primer estado se asigna al crear; marca las transiciones permitidas y cuáles cuentan como resueltos en métricas. El servidor rechaza transiciones no permitidas, revisiones antiguas y la retirada de estados en uso. La severidad es independiente de la prioridad; ambas usan Crítica, Alta, Media y Baja. Entorno y versión afectada admiten texto hasta 100 caracteres.
