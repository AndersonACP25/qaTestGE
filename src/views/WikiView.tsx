const guides = [
  {
    title: "1. Selecciona un proyecto",
    text: "El selector superior determina los datos visibles en el Dashboard y las demás secciones. Cada cuenta solo accede a los proyectos de sus organizaciones.",
  },
  {
    title: "2. Documenta casos de prueba",
    text: "En Casos de prueba registra el título, precondiciones y pasos con su resultado esperado. La suite es opcional. Puedes editar, consultar y eliminar casos, y añadir imágenes o enlaces.",
  },
  {
    title: "3. Registra bugs",
    text: "En Bugs documenta la incidencia, su prioridad y descripción. Puedes editarla y cambiar su estado durante el seguimiento. El campo de asignación actual es texto libre.",
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
