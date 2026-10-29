# Conectar IA a qaTestGE

Esta es una propuesta de implementación, no una integración disponible. Los diseñadores actuales funcionan localmente y la configuración de IA continúa siendo una maqueta.

## Primer objetivo

Conectar primero **Diseñar bugs**: enviar una descripción revisada y, opcionalmente, una plantilla; recibir un título, una descripción y una prioridad sugeridos. La persona edita la propuesta, selecciona tags del proyecto y confirma la creación mediante la API existente. Después se puede aplicar el mismo patrón al diseñador de casos.

## Recorrido propuesto

1. El frontend muestra exactamente qué texto se enviará, qué proveedor se usará y permite cancelar. No incluye evidencias, credenciales, borradores completos ni datos del proyecto por defecto. La persona debe aprobar el envío.
2. Un endpoint nuevo en `backend/`, por ejemplo `POST /api/ai/bug-proposals`, comprueba sesión, CSRF, autorización del proyecto y límites del texto. Si recibe una referencia a plantilla, verifica que pertenece al usuario.
3. El backend llama a una interfaz de proveedor cuyo contrato y adaptador externo viven bajo `servicios/ia/`. El proveedor recibe solo el texto aprobado y devuelve una propuesta; nunca recibe acceso al repositorio ni guarda bugs.
4. El frontend muestra la propuesta editable. **Guardar bug en el proyecto** sigue siendo una acción humana separada de **Proponer con IA**. Los borradores locales siguen disponibles si falla el proveedor.

No se necesitan agentes con herramientas ni acceso del modelo a PostgreSQL para este primer objetivo.

## Si eliges OpenAI

- Configura la clave como secreto del servidor, por ejemplo `OPENAI_API_KEY`, y el modelo mediante configuración del backend. Nunca uses variables `VITE_*` para secretos ni pidas la clave en el chat. La documentación oficial indica que las claves deben cargarse en el servidor. [Autenticación de la API](https://developers.openai.com/api/reference/overview).
- Usa Responses API con salida estructurada para definir un esquema cerrado: `title`, `description` y `priority`, con prioridad limitada a los valores del dominio y sin propiedades adicionales. Mantén las restricciones de longitud en la validación del backend. Structured Outputs ajusta la forma de la respuesta al esquema, pero no garantiza que el contenido sea correcto. [Salidas estructuradas](https://developers.openai.com/api/docs/guides/structured-outputs).
- En las instrucciones del proveedor exige conservar hechos aportados y señalar información faltante; no inventar pasos, resultados, responsables ni gravedad. El texto del usuario y la plantilla son datos no confiables, no instrucciones de sistema.
- Maneja rechazos, respuestas incompletas, tiempo de espera, límites de consumo y errores del proveedor. No reintentes indefinidamente. Devuelve mensajes seguros mediante el middleware y `Alert`; conserva el trabajo local.

## Orden de implementación recomendado

1. Definir el contrato de propuesta y un proveedor falso determinista para pruebas. Mantener la preparación local existente.
2. Añadir el endpoint autenticado, consentimiento de envío y vista previa. Actualizar OpenAPI, API y arquitectura.
3. Incorporar un adaptador real, secreto del servidor, timeout, cuotas por cuenta y límite de concurrencia. Revisar la configuración TypeScript/workspace antes de importar código de `servicios/`, porque el backend actual compila con `rootDir: src`.
4. Probar con requisitos sintéticos, sin evidencias ni información sensible. Evaluar fidelidad a los hechos, campos inventados, rechazo de entradas inválidas, latencia y costo por propuesta antes de abrirlo a usuarios.

Antes de habilitar envíos reales debes elegir proveedor/modelo, presupuesto y política de datos: qué se permite enviar, ubicación y retención aceptables. No registres prompts ni respuestas completas en logs; registra identificador de operación, duración y resultado sin secretos. La IA debe poder desactivarse y la creación manual debe seguir funcionando.
