# Arquitectura — qaTestGE v1.0

## Estado del documento

Este documento combina la arquitectura objetivo de la v1.0 con el estado real del repositorio. El frontend usa React, Vite y TypeScript; existe una API Express MVC en TypeScript con almacenamiento temporal en memoria. No hay base de datos, autenticación, autorización ni almacenamiento binario de evidencias. La interfaz aún no consume la API.

## Objetivos

- Gestionar el ciclo de vida de bugs, casos de prueba, ejecuciones y evidencias desde un mismo espacio de trabajo.
- Mantener trazabilidad entre un bug, los casos que lo cubren, las ejecuciones y sus resultados.
- Permitir colaboración con permisos definidos y un historial auditable.
- Ofrecer asistencia de IA útil sin convertirla en autoridad ni requisito para usar el producto.
- Proteger los datos del proyecto y hacer explícito cuándo información sale a un proveedor de IA.

## Límites y decisiones actuales

- Workspace pnpm con frontend en la raíz y API en `backend/`.
- La API Express organiza endpoints en rutas, controladores y modelos.
- El almacén temporal de la API vive en memoria y se reinicia con el proceso.
- Los endpoints iniciales listan y crean bugs, casos de prueba, ejecuciones y metadatos de evidencias.
- No se sube el contenido binario de evidencias; solo se registra metadata.

## Objetivos futuros para v1.0

- Producto web con API de servidor y persistencia duradera.
- Una organización contiene proyectos; cada proyecto contiene sus bugs, casos, ejecuciones y evidencias.
- La autenticación y el aislamiento por organización/proyecto se aplican en el servidor, no solo en la interfaz.
- El almacenamiento de archivos se separa de los metadatos: la base de datos conserva referencias y atributos; el almacén de objetos conserva el contenido.
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
   +-- Rutas -> Controladores -> Modelos -> Almacén en memoria (actual)
   |
   +-- Persistencia / servicio de IA (futuro)
```

La interfaz todavía no consume la API; ambas capas se ejecutan independientemente. `GET /api/health` permite verificar disponibilidad. Los recursos exponen `GET` y `POST` en `/api/bugs`, `/api/test-cases`, `/api/test-runs` y `/api/evidence`.

### Interfaz web

Presenta espacios de trabajo, proyectos, listas y formularios para los cuatro recursos principales. Debe mostrar estados de carga y error, validar formularios para facilitar el uso y no confiar en validaciones del cliente como control de seguridad.

### API y capa de aplicación

Autentica al usuario, comprueba permisos y pertenencia al proyecto, valida entradas y coordina casos de uso. Devuelve errores explícitos y no expone credenciales de almacenamiento ni secretos de proveedores a la interfaz.

### Dominio

La lógica de estados y relaciones vive en servicios de dominio o de aplicación, no en componentes de presentación. Las operaciones que cambian datos deben comprobar la autorización y dejar trazabilidad.

### Persistencia

Actualmente, los modelos usan `backend/src/models/in-memory-store.ts`, sin persistencia duradera. Los datos se reinician al detener el backend. Una base de datos relacional es adecuada para las relaciones y consultas de trazabilidad; el esquema y las migraciones quedan pendientes.

### Evidencias

Actualmente, el endpoint de evidencias solo registra/lista metadatos; no recibe ni sirve archivos. En una implementación futura, un servicio dedicado deberá gestionar la carga, consulta y eliminación autorizadas, guardar archivos de forma privada y validar tamaños y tipos.

### Servicio de IA

Expone operaciones de producto limitadas y tipadas, por ejemplo:

- Crear un borrador estructurado de bug a partir de una descripción proporcionada por el usuario.
- Sugerir casos de prueba a partir de un requisito o bug seleccionado.
- Resumir resultados de una ejecución y señalar patrones o cobertura potencialmente faltante.

El servicio valida la entrada y la respuesta, registra el proveedor/modelo y el resultado de la operación sin guardar secretos, y devuelve propuestas que el usuario puede editar o descartar. No ejecuta consultas arbitrarias, no altera datos de dominio y no accede a archivos salvo que el usuario los seleccione expresamente y la política del proyecto lo permita.

## Modelo de dominio

| Entidad | Propósito | Relaciones principales |
|---|---|---|
| Organización | Límite de colaboración y administración | Tiene miembros y proyectos |
| Proyecto | Contenedor de trabajo y configuración | Pertenece a una organización |
| Miembro / rol | Identidad y permisos dentro de un alcance | Pertenece a una organización y puede tener acceso a proyectos |
| Bug | Incidencia con título, descripción, estado, prioridad, severidad, asignado y fechas | Puede vincularse a casos, ejecuciones y evidencias |
| Caso de prueba | Procedimiento con precondiciones, pasos y resultado esperado | Pertenece a un proyecto y puede asociarse con bugs |
| Ejecución (test run) | Registro de una corrida de un conjunto/version de casos | Contiene resultados individuales de casos y observaciones |
| Resultado de caso | Estado de un caso dentro de una ejecución (`passed`, `failed`, `blocked`, `skipped`) y notas | Pertenece a una ejecución y referencia un caso |
| Evidencia | Metadatos del archivo, autor, fecha y referencia privada al contenido | Puede asociarse a un bug, ejecución o resultado |
| Evento de auditoría | Actor, acción, recurso, fecha y cambios pertinentes | Asociado al alcance y recurso afectados |

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

- Framework y lenguaje de interfaz/API, motor relacional y proveedor de almacenamiento.
- Estrategia de inicio de sesión, invitaciones, roles y permisos a nivel de proyecto.
- Límites de archivos, tipos admitidos, retención y política de borrado.
- Proveedores de IA permitidos, ubicación de procesamiento, consentimiento, costos y cuotas.
- Necesidades de importación/exportación y migración de datos.
- Objetivos de disponibilidad, respaldo y recuperación.
