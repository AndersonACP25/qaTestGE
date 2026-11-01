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
- **Proyectos y equipos:** crear espacios de colaboración y aceptar códigos de invitación de un solo uso. Los integrantes necesitan un rol en cada proyecto; el propietario conserva Admin.

Los listados muestran hasta 50 filas por página; usa Anterior y Siguiente para recorrer los resultados filtrados.

La eliminación de registros puede bloquearse cuando existen relaciones que deben conservarse, como casos usados en ejecuciones o recursos con evidencias.

En **Bugs**, **Casos de prueba** y **Test runs**, el botón verde **Exportar tabla** descarga los registros de la página visible que coinciden con tus filtros, con las columnas del listado, en Excel, PDF o Markdown. Los botones **Exportar** de cada fila de bugs y casos descargan el detalle de ese registro. También puedes exportar las tablas de registros recientes del Dashboard.

## Diseña tus casos

El **Diseñador de casos** ofrece ejemplos ilustrativos por tipo de prueba. Describe tu flujo, selecciona tipos y cantidades (de 1 a 5), y adapta los pasos y resultados de la vista previa. Puedes exportarla a Excel, PDF o Markdown, o guardar cada caso en el proyecto mediante una acción explícita.

En **Configuración → Diseño de casos** puedes añadir tipos personalizados y elegir los tipos y cantidades iniciales. Estas preferencias se guardan para tu usuario **en este navegador**; no se sincronizan entre dispositivos. Cada tipo nuevo incluye escenarios de partida que debes adaptar a tus pruebas.

El diseñador no analiza tu descripción ni genera contenido con IA. Revisa siempre los ejemplos antes de guardarlos.

## Diseña tus bugs

En **Diseñar bugs**, describe el problema y elige una plantilla personal si la necesitas. **Preparar bug** combina ese texto con la plantilla para crear una vista previa local editable; no analiza el problema con IA ni inventa hechos. Revisa título, descripción y prioridad, asigna tags del proyecto y confirma **Guardar en Bugs**.

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
- **Test Plan:** entra en Test Plan, indica un nombre y selecciona casos. «Iniciar Test Run» crea una ejecución enlazada al plan. Editar el plan afecta a los ciclos futuros. Una ejecución conserva sus resultados aunque el plan cambie. Los planes con ejecuciones no se eliminan.
- **Clonar y reejecutar:** en el detalle de una ejecución puedes clonar todos sus casos o reejecutar solo los fallidos registrados. La nueva ejecución empieza sin resultados registrados, mantiene el plan y referencia al origen y copia los pasos/versiones evaluados. No realiza pruebas automáticamente. Si no hay fallidos, la opción queda deshabilitada.
- **Importar:** abre Casos de prueba → Importar y descarga la plantilla CSV. Excel admite `.xlsx`, una hoja y celdas de texto. Usa las columnas `clave`, `titulo`, `suite`, `tipo`, `estado`, `precondiciones`, `accion`, `resultadoEsperado`. Cada fila representa un paso; repite la clave y los datos del caso para agruparlo. Si omites clave, se agrupa por título. Máximo 2 MiB, 1000 filas y 100 pasos por caso. Revisa los errores y la vista previa antes de confirmar. Se crean casos nuevos; no se actualizan casos por coincidencia de título. Las exportaciones individuales y de listados tienen un formato de presentación: adapta sus columnas a la plantilla para importarlas. Si falla una escritura, los casos confirmados permanecen y puedes continuar los pendientes con las mismas claves de solicitud; no cambies de archivo para reintentar. Esta recuperación se conserva mientras mantengas abierta la vista.
- **Flujo de bugs:** cada proyecto tiene su vocabulario y transiciones en Flujo de bugs. El primer estado se asigna al crear; marca las transiciones permitidas y cuáles cuentan como resueltos en métricas. El servidor rechaza transiciones no permitidas, revisiones antiguas y la retirada de estados en uso. La severidad es independiente de la prioridad; ambas usan Crítica, Alta, Media y Baja. Entorno y versión afectada admiten texto hasta 100 caracteres.

## Comentarios, menciones y actividad

Abre el detalle de un bug, caso o ejecución y utiliza **Comentarios y actividad**. Escribe el comentario y revisa su contenido antes de publicarlo. Para mencionar a alguien, escribe `@`, busca su nombre y selecciónalo en las sugerencias. El editor muestra solo `@Nombre` y conserva internamente el destinatario seleccionado. También puedes escribir un nombre completo y único; si hay homónimos, selecciona la persona en las sugerencias. Puedes mencionar hasta 20 integrantes activos con acceso al proyecto. No se envían correos ni mensajes externos.

**Mis menciones** muestra tus avisos del proyecto. **Abrir registro** abre el bug, caso o ejecución sin cambiar su lectura. Usa el botón verde **Marcar como leída** para actualizarla explícitamente. La lista se actualiza cada 15 segundos mientras está visible y al recuperar el foco; también puedes actualizarla manualmente. Incluye las automenciones. No hay avisos push. Los avisos dejan de mostrarse si se retira la mención, se elimina el comentario o pierdes el acceso al proyecto.

El autor y los Admin pueden editar o eliminar comentarios. El borrado muestra una marca de comentario eliminado; la versión anterior queda en la auditoría. Si otra persona modificó el comentario mientras lo editabas, se rechaza tu actualización para evitar sobrescribirla: actualiza la conversación y revisa la nueva versión. Se muestran los 100 comentarios más recientes del recurso.

En el detalle puedes desplegar **Ver historial de actividad del registro**. La ventana **Actividad y auditoría** permite consultar cambios del proyecto y cargar entradas anteriores. Muestra actor, fecha, registro y cambios antes/después; también registra cambios de roles y permisos. El historial empieza al instalar la migración 014 y no reconstruye acciones anteriores. Los datos de auditoría se confirman junto con el cambio; las operaciones fallidas no dejan eventos de cambio. No se pueden editar ni eliminar desde la aplicación.

## Accesos y roles por proyecto

El propietario del equipo conserva Admin en sus proyectos. Desde **Accesos al proyecto**, un Admin puede asignar un rol a integrantes activos del equipo, cambiarlo o seleccionar **Sin acceso**. Los cambios requieren confirmación y se registran en actividad. Antes de retirar el acceso, reasigna sus bugs y casos pendientes. El sistema rechaza revisiones obsoletas y protege al propietario y al último Admin activo.

| Capacidad                                                | Admin | QA  | Dev | Solo lectura |
| -------------------------------------------------------- | ----- | --- | --- | ------------ |
| Consultar recursos, descargar evidencias y ver actividad | Sí    | Sí  | Sí  | Sí           |
| Comentar y mencionar                                     | Sí    | Sí  | Sí  | No           |
| Gestionar bugs y evidencias                              | Sí    | Sí  | Sí  | No           |
| Gestionar casos, resultados, planes y tags               | Sí    | Sí  | No  | No           |
| Configurar flujo de bugs y administrar accesos           | Sí    | No  | No  | No           |
| Editar o eliminar un proyecto vacío                      | Sí    | No  | No  | No           |

La creación de proyectos y la administración del equipo siguen correspondiendo al propietario del equipo. Ser miembro de un equipo ya no concede acceso automático a todos sus proyectos: una invitación nueva necesita una asignación posterior por proyecto. Al actualizar desde versiones anteriores, los miembros existentes reciben QA explícitamente en los proyectos que ya compartían, para preservar su acceso. Los proyectos futuros requieren asignaciones nuevas.

El rol se muestra junto a tu cuenta. Los controles de escritura se deshabilitan según el rol; el servidor vuelve a comprobarlo en cada escritura. Una revocación puede impedir una operación iniciada desde una pantalla que aún muestra datos anteriores. En ese caso, actualiza los proyectos disponibles.

## Formato, importación y descargas

En los campos de texto largo, selecciona texto y utiliza **Negrita**, **Cursiva**, **Tachado** o **Código en línea**. También puedes insertar listas y citas. **Vista previa** muestra el resultado; **Editar texto** vuelve al contenido. El formato se guarda como Markdown, sin ejecutar HTML.

En **Diseñar bugs**, prepara el bug y revisa sus campos. **Guardar en Bugs** solicita confirmación si aún no marcaste la revisión y después crea el registro en el proyecto; **Ver en Bugs** abre el mantenimiento. **Guardar borrador** conserva únicamente el borrador de este navegador.

**Importar** está junto a **Exportar tabla** en Bugs, Casos y Tags. En **Test runs**, el botón **Exportar** de cada fila permite descargar su informe PDF. Eliminar muestra únicamente la confirmación; cancelar conserva la ejecución. En **Evidencias**, **Descargar** aparece en los registros con archivo disponible, también desde su detalle.

En **Configuración → Inteligencia artificial** puedes consultar el catálogo de proveedores previstos. Todas las integraciones siguen pendientes: la lista no conecta proveedores ni guarda claves.

## Bandeja y notificaciones

La campana del navbar muestra las últimas menciones del proyecto, un contador de pendientes y **Ver todas las menciones**. El contador se comparte con Mis menciones; ambos se actualizan cada 15 segundos mientras la aplicación está visible y al recuperar el foco. La bandeja permite filtrar Todas, Sin leer y Leídas. Abrir un registro conserva el aviso pendiente; marcarlo como leído requiere el botón verde. Se consultan los últimos 100 avisos.

En la barra de comentarios, **@ Mencionar** abre la búsqueda de integrantes e inserta el nombre seleccionado donde está el cursor. También puedes escribir @ y seleccionar una sugerencia. Los campos largos tienen mayor altura inicial; Lista y Cita usan botones de texto.

En Importar, pulsa **Subir archivo** o arrastra un CSV/Excel al modal; revisa la vista previa antes de confirmar. En el detalle de un bug, **Subir evidencia** abre una ventana específica para seleccionar o arrastrar un archivo de hasta 2 MiB.

**Test Plan** permite crear, buscar, consultar y editar planes con su descripción y casos. Puedes buscar casos dentro del formulario y consultar los incluidos en cada plan. **Iniciar Test Run** crea una ejecución vinculada; los planes ya utilizados siguen protegidos frente al borrado.

Al ejecutar un Test Run, guardar un resultado conserva la posición del caso y muestra la confirmación junto a él. El historial de actividad se presenta sin numeración, del cambio más reciente al más antiguo.
