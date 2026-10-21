export interface CaseCategory {
  id: string;
  label: string;
  description: string;
  color: string;
  steps: { action: string; expected: string }[];
}

const categoryColors: Record<string, string> = {
  smoke: "#2563eb",
  regression: "#7c3aed",
  functional: "#047857",
  ui: "#be185d",
  ux: "#c2410c",
  integration: "#0e7490",
  sanity: "#4d7c0f",
  e2e: "#4f46e5",
  unit: "#0f766e",
  acceptance: "#9333ea",
  accessibility: "#0369a1",
  security: "#dc2626",
  performance: "#a21caf",
  compatibility: "#a16207",
  edge: "#475569",
  exploratory: "#be123c",
  stress: "#b45309",
  api: "#15803d",
};

function category(id: string, label: string, description: string, examples: [string, string][]): CaseCategory {
  return { id, label, description, color: categoryColors[id], steps: examples.map(([action, expected]) => ({ action, expected })) };
}

// Escenarios ilustrativos de un registro hipotético; no dependen del requisito escrito.
export const categories: CaseCategory[] = [
  category("smoke", "Smoke", "Comprobaciones rápidas de los flujos críticos.", [
    ["Abrir el formulario de registro.", "El formulario carga y permite introducir datos."],
    ["Completar un registro con datos válidos.", "Se confirma la creación de la cuenta de prueba."],
    ["Acceder con la cuenta recién creada.", "Se muestra el área inicial de la cuenta."],
  ]),
  category("regression", "Regresión", "Verificación de comportamientos existentes tras un cambio.", [
    ["Repetir un registro válido después de un cambio en el formulario.", "El registro conserva el comportamiento previamente aprobado."],
    ["Repetir la validación de correo duplicado después del cambio.", "Se mantiene el rechazo de cuentas duplicadas."],
    ["Comprobar el acceso de una cuenta anterior al cambio.", "La cuenta existente sigue pudiendo acceder."],
  ]),
  category("functional", "Funcionales", "Reglas de negocio y resultados de cada función.", [
    ["Registrar un nombre, correo y contraseña válidos.", "Se crea una cuenta con los datos proporcionados."],
    ["Registrar un correo ya utilizado.", "Se rechaza el duplicado con un mensaje claro."],
    ["Introducir confirmaciones de contraseña diferentes.", "No se permite completar el registro."],
  ]),
  category("ui", "UI", "Presentación y estados visuales de la interfaz.", [
    ["Inspeccionar etiquetas, campos y botón de registro.", "La disposición coincide con el diseño aprobado."],
    ["Activar errores de validación.", "Los mensajes son visibles y no se superponen a los campos."],
    ["Abrir el formulario en una pantalla móvil.", "El contenido se adapta sin desplazamiento horizontal."],
  ]),
  category("ux", "UX", "Claridad, navegación y recuperación de errores.", [
    ["Completar el registro siguiendo las instrucciones visibles.", "El siguiente paso es comprensible sin ayuda externa."],
    ["Corregir un correo inválido después de enviar el formulario.", "El mensaje ayuda a corregirlo y conserva los demás datos."],
    ["Completar el registro y revisar su confirmación.", "Se comunica el resultado y cómo continuar."],
  ]),
  category("integration", "Integración", "Interacción entre componentes y servicios.", [
    ["Enviar el formulario al servicio de registro de pruebas.", "La interfaz interpreta correctamente la respuesta del servicio."],
    ["Simular una indisponibilidad del servicio de correo en el entorno de pruebas.", "Se aplica el comportamiento de recuperación acordado."],
    ["Consultar la cuenta creada desde el servicio de perfiles.", "El perfil referencia el identificador de la cuenta correcta."],
  ]),
  category("sanity", "Sanity", "Verificación acotada después de una corrección.", [
    ["Repetir el escenario de correo inválido tras corregir su validación.", "El defecto corregido no se reproduce."],
    ["Probar un correo válido después de esa corrección.", "La corrección permite continuar el registro válido."],
    ["Revisar el mensaje asociado a la validación corregida.", "El mensaje describe el problema correcto."],
  ]),
  category("e2e", "E2E", "Recorridos completos desde la perspectiva del usuario.", [
    ["Registrar una cuenta y acceder a su perfil en el entorno de pruebas.", "El recorrido termina con el perfil de la cuenta creada."],
    ["Registrar una cuenta y completar su verificación mediante el buzón de pruebas.", "La cuenta queda verificada según el flujo acordado."],
    ["Cerrar sesión y volver a entrar con la cuenta de prueba.", "Se recupera el acceso a la misma cuenta."],
  ]),
  category("unit", "Unitarias", "Comportamiento aislado de funciones y componentes.", [
    ["Evaluar el validador de correo con una entrada válida.", "El validador indica que el formato es válido."],
    ["Evaluar el validador con una cadena vacía.", "El validador devuelve el error requerido."],
    ["Evaluar la comparación de contraseñas diferentes.", "La función informa que no coinciden."],
  ]),
  category("acceptance", "Aceptación", "Cumplimiento de criterios de aceptación acordados.", [
    ["Ejecutar el criterio de registro con datos válidos.", "Se cumple el resultado acordado para el criterio."],
    ["Ejecutar el criterio de campos obligatorios vacíos.", "Se cumplen las validaciones definidas en el criterio."],
    ["Ejecutar el criterio de correo único.", "El sistema cumple la regla de unicidad acordada."],
  ]),
  category("accessibility", "Accesibilidad", "Uso con teclado y tecnologías de asistencia.", [
    ["Recorrer y enviar el formulario solo con teclado.", "Todos los controles son accesibles y el foco es visible."],
    ["Leer los campos con un lector de pantalla.", "Cada campo tiene un nombre accesible y su estado se anuncia."],
    ["Ampliar la página al 200 %.", "Se conserva la lectura y el acceso a los controles."],
  ]),
  category("security", "Seguridad", "Validaciones y protección de datos en un entorno autorizado.", [
    ["Revisar la respuesta del registro con credenciales ficticias.", "La respuesta no expone la contraseña ni secretos."],
    ["Introducir texto con etiquetas HTML en el nombre de prueba.", "El contenido se presenta como texto y no se ejecuta."],
    ["Consultar un perfil ajeno con una cuenta de prueba sin permisos.", "El servicio rechaza el acceso según la política definida."],
  ]),
  category("performance", "Rendimiento y carga", "Latencia y capacidad bajo la carga prevista.", [
    ["Medir el registro con la carga nominal autorizada.", "La latencia y la tasa de errores cumplen los umbrales acordados."],
    ["Mantener la carga prevista durante el período acordado.", "El servicio mantiene el rendimiento esperado."],
    ["Medir la carga inicial del formulario en el dispositivo objetivo.", "El tiempo de carga cumple el presupuesto acordado."],
  ]),
  category("compatibility", "Compatibilidad", "Comportamiento entre navegadores y dispositivos.", [
    ["Registrar una cuenta en los navegadores soportados.", "El flujo funciona de manera consistente."],
    ["Completar el registro en los dispositivos móviles soportados.", "Los campos y controles se pueden utilizar."],
    ["Completar el formulario con distintos tamaños de pantalla soportados.", "El flujo conserva sus validaciones y permite enviar los datos."],
  ]),
  category("edge", "Edge cases", "Límites, entradas vacías y situaciones inesperadas.", [
    ["Enviar el formulario con los campos obligatorios vacíos.", "Se indican los campos requeridos y no se crea la cuenta."],
    ["Ingresar un nombre que exceda la longitud máxima permitida.", "Se muestra una validación clara y se conservan los demás datos."],
    ["Introducir un nombre con la longitud máxima permitida.", "El nombre se acepta según el límite definido."],
  ]),
  category("exploratory", "Exploratory", "Recorridos libres para descubrir comportamientos.", [
    ["Explorar el registro alternando teclado, ratón y navegación hacia atrás.", "El flujo conserva un orden de foco coherente."],
    ["Cambiar el tamaño de pantalla mientras se completa el registro.", "Los campos y mensajes permanecen utilizables."],
    ["Explorar correcciones sucesivas de varios campos inválidos.", "El formulario conserva los datos y actualiza sus mensajes."],
  ]),
  category("stress", "Pruebas de estrés", "Límites de capacidad y recuperación.", [
    ["Aumentar progresivamente los registros concurrentes en un entorno autorizado.", "Se identifican errores y latencia respecto a los umbrales acordados."],
    ["Reducir la carga tras alcanzar el límite autorizado.", "El servicio recupera su nivel esperado y conserva los datos."],
    ["Alcanzar el límite de solicitudes acordado para la prueba.", "El servicio limita la carga según su política sin exponer errores internos."],
  ]),
  category("api", "API", "Contratos, respuestas y validaciones del servicio.", [
    ["Enviar una solicitud de registro válida al endpoint del contrato.", "La respuesta cumple el código y esquema acordados."],
    ["Enviar una solicitud omitiendo un atributo obligatorio.", "La API devuelve un error de validación y no crea el recurso."],
    ["Enviar un cuerpo JSON mal formado.", "La API devuelve el error definido para JSON inválido."],
  ]),
];

export const maxCaseCount = 3;

export function validCaseCount(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= maxCaseCount;
}

export function selectCaseExamples(selected: readonly string[], counts: Record<string, number>) {
  return categories.filter((item) => selected.includes(item.id)).map((item) => ({
    ...item,
    steps: validCaseCount(counts[item.id] ?? 1) ? item.steps.slice(0, counts[item.id] ?? 1) : [],
  }));
}
