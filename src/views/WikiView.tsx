const guides = [
  {
    title: "1. Selecciona un proyecto",
    text: "En Proyectos el propietario puede crear y editar proyectos, o eliminar los que no tengan registros vinculados. El selector superior determina los datos visibles; cada cuenta accede a los proyectos de sus organizaciones.",
  },
  {
    title: "2. Documenta casos de prueba",
    text: "En Casos de prueba registra el título, precondiciones y pasos con su resultado esperado. La suite es opcional. Puedes asignar el caso a un integrante activo, editarlo, eliminarlo y añadir imágenes o enlaces.",
  },
  {
    title: "3. Registra bugs",
    text: "En Bugs documenta la incidencia, su prioridad y descripción. Puedes asignarla a un integrante activo del equipo, editarla y cambiar su estado. Los responsables históricos escritos como texto se conservan.",
  },
  {
    title: "4. Ejecuta pruebas",
    text: "En Test runs crea una ejecución con al menos un caso. Registra el resultado y las notas de cada caso; para completar la ejecución deben registrarse todos los resultados. Puedes reabrirla o editarla.",
  },
  {
    title: "5. Guarda evidencias y clasifica",
    text: "En Evidencias registra metadatos o carga archivos de hasta 2 MiB y relaciónalos con la actividad de QA. En Tags crea etiquetas por proyecto y asígnalas a bugs, casos o ejecuciones.",
  },
  {
    title: "Equipos y acceso",
    text: "Crea equipos y selecciona el equipo propietario de cada proyecto. Una invitación es de un solo uso y concede acceso a todos los proyectos del equipo. Para retirar a un integrante debes reasignar primero sus bugs y casos.",
  },
  {
    title: "Diseñador y configuración",
    text: "El diseñador ofrece ejemplos ilustrativos que puedes editar, exportar y guardar explícitamente. No utiliza IA. En Configuración puedes administrar tu cuenta, plantillas de bugs y preferencias del diseñador; la conexión de IA es una maqueta.",
  },
];

export default function WikiView() {
  return (
    <div className="wiki-view">
      {guides.map((guide) => (
        <section className="wiki-view__card" key={guide.title}>
          <h2>{guide.title}</h2>
          <p>{guide.text}</p>
        </section>
      ))}
    </div>
  );
}
