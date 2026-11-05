# Piloto de IA con Google AI Studio

El primer lote implementa en el backend una propuesta de bug con Gemini. La pantalla de configuración permite conectar Gemini con una clave personal. Los diseñadores todavía funcionan como antes. El siguiente lote podrá conectar el endpoint al formulario **Diseñar bugs** y mostrar una vista previa editable antes de guardar.

## Conectar desde Configuración

1. Ejecuta `pnpm db:migrate` para aplicar la migración 023.
2. Genera una clave maestra para el servidor con `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Guarda el resultado como `AI_SETTINGS_ENCRYPTION_KEY` en `backend/.env.ai.local` o en el gestor de secretos del despliegue. Conserva la misma clave maestra entre reinicios e instancias. Si se cambia, cada cuenta tendrá que reconectar su clave de Gemini.
3. Reinicia la API. En **Configuración → Inteligencia artificial**, pega tu clave de Google AI Studio y pulsa **Conectar Gemini**. Usa HTTPS en despliegues remotos.
4. Para sustituirla o eliminarla, usa **Reemplazar clave** o **Desconectar Gemini**. Las operaciones visuales surten efecto sin reiniciar la API.

La conexión visual comprueba que Google acepta la clave para consultar el modelo y que el modelo anuncia generación de contenido. La primera generación real confirma la cuota disponible. PostgreSQL guarda solo datos cifrados por cuenta. La clave personal tiene prioridad para las propuestas de esa cuenta. Al desconectarla, se usa la configuración del servidor cuando está habilitada. [API de modelos de Gemini](https://ai.google.dev/api/models).

## Alternativa mediante variables del servidor

1. Crea una clave en el proyecto de [Google AI Studio](https://aistudio.google.com/api-keys). Si una clave quedó expuesta, revócala y genera otra.
2. Crea `backend/.env.ai.local` con el siguiente contenido y pega la nueva clave después de `GEMINI_API_KEY=`. El archivo está ignorado por Git.
3. Reinicia la API con `pnpm dev:backend`. En un servidor, inyecta las variables mediante su configuración de secretos. Las variables del proceso tienen prioridad sobre los archivos dotenv.

```dotenv
AI_BUG_PROPOSALS_ENABLED=true
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.1-flash-lite
```

El modelo predeterminado está disponible en el nivel gratuito sujeto a las cuotas del proyecto de Google. Google indica que puede utilizar el contenido del nivel gratuito para mejorar sus productos. Prueba con datos sintéticos y elimina del texto credenciales, datos personales y detalles internos antes de aprobar el envío. [Precios y tratamiento de datos de Gemini](https://ai.google.dev/gemini-api/docs/pricing).

## Probar desde Swagger

1. Inicia sesión en qaTestGE con acceso de escritura a bugs y abre Swagger en `/api/docs/` desde el mismo origen de la sesión.
2. Obtén `csrfToken` de `GET /api/auth/me` y úsalo en el encabezado `X-CSRF-Token`. La solicitud usa la cookie de sesión del navegador.
3. Ejecuta `POST /api/ai/bug-proposals` con un `projectId` real de tu cuenta y texto sintético.

```json
{
  "projectId": "1",
  "consent": true,
  "description": "Al pulsar Guardar sin título, el formulario vuelve a la lista sin indicar que falta el campo."
}
```

La respuesta devuelve `data.title`, `data.description` y `data.priority` para revisar. La creación de un bug sigue pasando por `POST /api/bugs`. El campo opcional `templateText` permite enviar el texto visible de una plantilla revisada. Gemini recibe solo la descripción y el texto opcional, sin identificadores de proyecto ni adjuntos. La API valida la propuesta y registra estado y duración de la solicitud sin guardar prompts ni respuestas.

El piloto permite tres solicitudes por cuenta y minuto y dos simultáneas por proceso. Una llamada a Gemini tiene un tiempo máximo de 15 segundos. El endpoint responde `503 AI_DISABLED` si el piloto está desactivado o le falta configuración. Para desactivar la clave compartida del servidor, establece `AI_BUG_PROPOSALS_ENABLED=false` y reinicia el backend. Para desactivar también las claves personales, retira `AI_SETTINGS_ENCRYPTION_KEY` del entorno y de los archivos de configuración.

## Conectar la interfaz

Muestra el texto exacto que se enviará, identifica a Gemini y solicita confirmación. Aplica la propuesta al borrador original solo si el usuario y proyecto siguen siendo los mismos. Conserva el borrador cuando el proveedor falle y deja la creación como una acción separada después de revisar la propuesta.
