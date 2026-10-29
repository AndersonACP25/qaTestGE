# qaTestGE

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

Si administras la instalación y quieres conectar un proveedor de IA, consulta la [guía de integración gradual](docs/AI_INTEGRATION.md). La integración real aún no está implementada.

## Personaliza tu cuenta

En **Configuración** puedes actualizar tu nombre y correo, cambiar tu contraseña y crear plantillas personales de bugs. También puedes cambiar el tema de la interfaz.

El cambio de imagen de perfil aparece como una maqueta: todavía no permite seleccionar ni subir imágenes.

Al desactivar tu cuenta se revocan tus sesiones y se anonimizan tus datos personales; los recursos QA y las membresías se conservan para mantener la trazabilidad.

## Límites actuales

La conexión con IA es una maqueta: no guarda claves ni envía información a proveedores. Tampoco están disponibles la recuperación de contraseña, la verificación de correo, MFA ni invitaciones por correo. Las ejecuciones registran pruebas manuales; no ejecutan pruebas automáticamente.

## Instalación y documentación técnica

Para ejecutar tu propia instancia, consulta la [guía de desarrollo](docs/DEVELOPMENT.md). Al actualizar una instalación existente, aplica `pnpm db:migrate` antes de iniciar la API; esta versión incorpora la migración 012 para evitar creaciones duplicadas. Encontrarás los detalles técnicos en [Arquitectura](docs/architecture.md), [API](docs/API.md), [Pruebas](docs/TESTING.md) y [Seguridad](SECURITY.md). Para colaborar con el proyecto, consulta [CONTRIBUTING.md](CONTRIBUTING.md).
