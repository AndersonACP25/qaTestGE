import "./wiki.css";
import { useState } from "react";
import { formatCount } from "../utils/pluralization";
const guides = [
  {
    title: "Importar desde Excel",
    text: "En Bugs, Casos de prueba o Tags pulsa Importar. Descarga la plantilla y la guía, elimina los ejemplos y completa la hoja correspondiente. Selecciona el archivo, revisa los errores y confirma. Bugs y casos conservan lo ya guardado si una fila falla: mantén el diálogo abierto para continuar los pendientes. Los tags se validan como un lote completo. Antes de repetir un archivo en un diálogo nuevo, revisa el listado.",
  },
  {
    title: "Dashboard y analítica",
    text: "Dashboard resume el estado actual con indicadores y gráficos. Reportes y métricas permite seleccionar un período, consultar aprobación por ejecución, bugs abiertos/cerrados y casos que fallan con frecuencia, y exportar CSV. Los días anteriores al inicio del historial de bugs aparecen sin datos. La cobertura por tipo cuenta casos activos con resultados registrados.",
  },
  {
    title: "Cobertura de requisitos",
    text: "En Cobertura y requisitos crea códigos y títulos y busca casos para vincularlos. La matriz conecta requisitos, casos y bugs, mostrando también los requisitos sin casos. QA y Admin pueden gestionar estos vínculos; todos los roles con acceso pueden consultar.",
  },
  {
    title: "Compartir una ejecución",
    text: "Abre el detalle en Test runs y pulsa Exportar informe PDF. El informe incluye el resumen, los pasos y la versión capturados al crear la ejecución, los resultados, las notas y las referencias a bugs y evidencias. Descarga el archivo y compártelo con quien corresponda; no contiene los archivos de evidencia ni abre un enlace público.",
  },
  {
    title: "1. Selecciona un proyecto",
    text: "En Configuración → Proyectos, el propietario crea proyectos; sus Admin pueden editarlos o eliminar los que estén vacíos. El selector superior muestra solo proyectos donde tienes acceso, con tu rol Admin, QA, Dev o Solo lectura.",
  },
  {
    title: "2. Documenta casos de prueba",
    text: "En Casos de prueba registra el título, precondiciones y pasos con su resultado esperado. La suite es opcional. Puedes asignar el caso a un integrante activo, editarlo, eliminarlo y añadir imágenes o enlaces.",
  },
  {
    title: "3. Registra bugs",
    text: "En Bugs documenta la incidencia, su prioridad y descripción. Diseñar bugs prepara una vista previa local a partir del texto y una plantilla; permite tags, borradores en este navegador y creación tras revisión. No utiliza IA. Puedes asignarla a un integrante activo del equipo, editarla y cambiar su estado. Los responsables históricos escritos como texto se conservan.",
  },
  {
    title: "4. Ejecuta pruebas",
    text: "En Test runs crea una ejecución con al menos un caso. Registra el resultado y las notas de cada caso; para completar la ejecución deben registrarse todos los resultados. Puedes reabrirla o editarla.",
  },
  {
    title: "5. Guarda evidencias y clasifica",
    text: "En Evidencias pulsa Subir evidencia para cargar archivos de hasta 2 MiB y relaciónalos con la actividad de QA. En Tags crea etiquetas por proyecto y asígnalas a bugs, casos o ejecuciones.",
  },
  {
    title: "Equipos y acceso",
    text: "En Configuración → Equipos, crea equipos y selecciona el equipo propietario de cada proyecto. Una invitación es de un solo uso y permite unirte al equipo; después un Admin asigna tu acceso a cada proyecto. En Accesos al proyecto, un Admin puede crear cuentas nuevas y asignar roles en ese proyecto. Para retirar a un integrante debes reasignar primero sus bugs, casos y ejecuciones.",
  },
  {
    title: "Comentarios, menciones y auditoría",
    text: "Comenta en el detalle de bugs, casos y ejecuciones. Escribe @ y selecciona un integrante con acceso, o escribe su nombre completo si es único. La campana del navbar y Mis menciones se actualizan cada 15 segundos; abrir un registro no marca la mención como leída. Usa Marcar como leída o Marcar todas como leídas; también incluye tus propias menciones. El acceso Ver todas las menciones aparece arriba en la campana. El autor y los Admin pueden editar o eliminar comentarios, conservando el historial. En Configuración, la pestaña Actividad y auditoría muestra los cambios confirmados y sus actores desde que se habilitó el historial. No se envían correos.",
  },
  {
    title: "Flujo de bugs en Configuración",
    text: "Selecciona el proyecto y abre Configuración → Flujo de bugs. Un Admin puede definir el estado inicial, las transiciones y qué estados cuentan como resueltos. Al guardar se muestra una confirmación; los estados en uso no se pueden retirar.",
  },
  {
    title: "Diseñador y configuración",
    text: "El diseñador ofrece ejemplos ilustrativos que puedes editar, exportar y guardar explícitamente. No utiliza IA. En Configuración puedes administrar tu cuenta, plantillas de bugs y preferencias del diseñador; la conexión de IA es una maqueta.",
  },
  {
    title: "Mis asignaciones",
    text: "Consulta bugs, casos y Test Runs asignados a tu cuenta en el proyecto. Usa búsqueda, tipo y estado y navega con Anterior/Siguiente. Los responsables se identifican por su cuenta; los nombres históricos ambiguos de ejecuciones requieren una asignación explícita desde Editar ejecución.",
  },
  {
    title: "Filtros de registros",
    text: "En Bugs, Casos de prueba y Test runs, la sección Filtros combina búsqueda y estado con responsable y tags. Bugs añade prioridad/severidad; los casos permiten tipo y estado documental; las ejecuciones permiten Test Plan. Limpiar filtros restaura la vista. Los contadores y Exportar tabla corresponden al resultado filtrado y su página visible.",
  },
  {
    title: "Gestionar Test Plan",
    text: "Crea o edita el plan, busca casos y selecciona los visibles. Buscar conserva las selecciones anteriores. Las tarjetas muestran los casos incluidos y cuántos están Listos. Iniciar Test Run crea una ejecución vinculada; cambiar el plan afecta solo a ejecuciones nuevas.",
  },
  {
    title: "Auditoría paginada y exportación",
    text: "En Configuración → Actividad y auditoría aplica perfil, recurso, operación, autor, fechas UTC y búsqueda. Anterior/Siguiente navega por páginas; Exportar página genera Excel, PDF o Markdown de la página visible. Un Admin puede guardar el perfil, detalle y tamaño de página predeterminados. Esta configuración no elimina ni desactiva el historial.",
  },
  {
    title: "Evidencias opcionales en diseñadores",
    text: "Evidencias opcionales es una sección desplegable y cerrada inicialmente en Diseñar bugs y Diseñar test cases. Ábrela si necesitas anexar un archivo. Puedes seleccionarlo antes de guardar, pero Anexar evidencia se habilita cuando existe el registro. Los archivos no se guardan en los borradores locales ni se envían a IA.",
  },
  {
    title: "Confirmaciones de acciones",
    text: "Las alertas de éxito aparecen arriba a la derecha, incluso con un modal abierto. Puedes cerrarlas con Ocultar confirmación. Confirman acciones terminadas; consultar datos no genera un aviso de éxito por cada respuesta. Los errores y las advertencias se mantienen junto al formulario correspondiente.",
  },
];

const categories = [
  "Trabajo de QA",
  "Analítica",
  "Trabajo de QA",
  "Trabajo de QA",
  "Primeros pasos",
  "Trabajo de QA",
  "Trabajo de QA",
  "Trabajo de QA",
  "Trabajo de QA",
  "Administración",
  "Trabajo de QA",
  "Administración",
  "Administración",
  "Trabajo de QA",
  "Trabajo de QA",
  "Trabajo de QA",
  "Administración",
  "Trabajo de QA",
  "Primeros pasos",
];
export default function WikiView() {
  const [category, setCategory] = useState("Todas"),
    [search, setSearch] = useState("");
  const normalize = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es");
  const visible = guides
    .map((guide, i) => ({ ...guide, category: categories[i] }))
    .filter(
      (guide) =>
        (category === "Todas" || guide.category === category) &&
        normalize(`${guide.title} ${guide.text}`).includes(normalize(search.trim())),
    );
  return (
    <div className="wiki-hub layout__stack">
      <section className="wiki-hub__intro layout__panel">
        <div>
          <span className="wiki-hub__eyebrow">CENTRO DE AYUDA</span>
          <h2 className="typography__title">Tu guía de trabajo en qaTestGE</h2>
          <p>Encuentra cómo organizar proyectos, documentar pruebas y colaborar con tu equipo.</p>
        </div>
        <label className="workspace__field">
          Buscar en la Wiki
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pruebas, menciones, reportes…"
          />
        </label>
      </section>
      <nav className="wiki-hub__filters" aria-label="Categorías de la Wiki">
        {["Todas", "Primeros pasos", "Trabajo de QA", "Analítica", "Administración"].map((name) => (
          <button
            className="workspace__secondary"
            aria-pressed={category === name}
            key={name}
            onClick={() => setCategory(name)}
          >
            {name}
          </button>
        ))}
      </nav>
      <p className="typography__caption" role="status">
        {formatCount(visible.length, "guía disponible", "guías disponibles")}
      </p>
      <div className="wiki-hub__grid">
        {visible.map((guide, i) => (
          <article className="wiki-hub__card layout__panel" key={guide.title}>
            <span className="wiki-hub__category">{guide.category}</span>
            <h2 className="typography__section">{guide.title.replace(/^\d+\. /, "")}</h2>
            <p>{guide.text}</p>
            <span className="wiki-hub__number" aria-hidden="true">
              {String(i + 1).padStart(2, "0")}
            </span>
          </article>
        ))}
      </div>
      {!visible.length && (
        <section className="layout__panel">
          <h2 className="typography__section">No encontramos una guía</h2>
          <p>Prueba otra palabra o consulta todas las categorías.</p>
          <button
            className="workspace__secondary"
            onClick={() => {
              setSearch("");
              setCategory("Todas");
            }}
          >
            Ver todas las guías
          </button>
        </section>
      )}
    </div>
  );
}
