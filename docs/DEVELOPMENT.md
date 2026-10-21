# Desarrollo local

## Preparación

Entorno validado: Node.js 24.12.0 y pnpm 12.11.2. Se usa `process.loadEnvFile` de Node para cargar la configuración del servidor. Tener pnpm en PATH y ejecutar desde la raíz:

```bash
pnpm install --frozen-lockfile
# Si aún no tienes configuración local:
# copiar backend/.env.example a backend/.env y ajustar DATABASE_URL
pnpm db:migrate
pnpm db:check
pnpm dev
```

No sobrescribir un `.env` existente. Los scripts SQL se importan manualmente una sola vez según [backend/sql/README.md](../backend/sql/README.md). Si ya creaste las tablas y los datos, no vuelvas a importarlos para iniciar la API.

`dev` levanta Vite y tsx watch en paralelo. Frontend: `http://localhost:5173`; API: `http://localhost:3000/api/health` por defecto (el puerto real se define con `PORT`). `Ctrl+C` detiene la sesión. El frontend recupera su sesión por cookie, lista los proyectos autorizados y consulta/crea recursos mediante /api. Registro crea un workspace y un proyecto propios; las membresías sobre datos anteriores se conceden explícitamente.

## Scripts

| Comando | Uso |
|---|---|
| `pnpm dev` / `pnpm dev:all` | Frontend y backend en paralelo |
| `pnpm dev:frontend` | Solo Vite |
| `pnpm dev:backend` / `pnpm dev:api` | API con tsx watch y PostgreSQL |
| `pnpm db:migrate` | Migración aditiva de usuarios y sesiones (004), repetible |
| `pnpm db:check` | Conexión y tablas del esquema qa, solo lectura |
| `pnpm build` | Tipos y compilación del frontend y backend |
| `pnpm build:frontend` / `pnpm build:backend` | Compilación por separado |
| `pnpm preview` | Vista previa local de dist/, normalmente en 4173 |
| `pnpm typecheck` | Tipos del frontend y pruebas unitarias incluidas |
| `pnpm test` / `pnpm test:watch` | Pruebas deterministas sin PostgreSQL |
| `pnpm --dir backend test:db` | Integración opcional con TEST_DATABASE_URL explícita |

Después del build, `pnpm --dir backend start` ejecuta el servidor compilado, con la misma carga de entorno. Vite preview es una herramienta local, no un despliegue productivo.

## Configuración del servidor

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Obligatoria, URL PostgreSQL para qa_test_ge; solo en el servidor |
| `PORT` | Puerto API, 3000 por defecto, entre 1 y 65535 |
| `FRONTEND_ORIGIN` | Origen CORS, 5173 por defecto |
| `CORS_ORIGIN` | Alias aceptado cuando FRONTEND_ORIGIN no está definido |
| `TEST_DATABASE_URL` | Solo verificación opcional sobre una base de pruebas |

`backend/.env` se busca respecto al módulo, tanto en src/ como dist/. Después se lee `.env` en la raíz como alternativa. Las variables ya definidas en el proceso tienen prioridad; el archivo de la raíz solo completa valores faltantes. Los cambios de `.env` requieren reiniciar el proceso. `backend/.env.example` contiene valores ficticios; `.env` está ignorado por Git. No añadir prefijos VITE_ a secretos. JWT_SECRET no se utiliza: las sesiones son opacas, con estado revocable en PostgreSQL. NODE_ENV=production activa cookies Secure y requiere servir la aplicación mediante HTTPS. API_ORIGIN permite configurar el origen directo del backend para escrituras desde SwaggerUI (por defecto localhost con PORT).

El servidor comprueba conexión y tablas antes de escuchar. Si falla, sale con error y no usa memoria. Si PostgreSQL se cae durante ejecución, health devuelve 503. Los logs y las respuestas no imprimen credenciales ni SQL.

Vite reenvía `/api` al puerto `PORT` del backend, leído desde `backend/.env` o el entorno (3000 por defecto). Reinicia Vite después de cambiar el puerto. Si `ECONNREFUSED` persiste, confirma que la API inició correctamente y que PostgreSQL está disponible con `pnpm db:check`. Para solicitudes directas desde otro origen, configurar CORS.

## Verificación

```bash
pnpm typecheck
pnpm build
pnpm test
```

Las pruebas de endpoints usan un repositorio simulado inyectado, sin cargar `.env` ni necesitar PostgreSQL. Las de repositorio comprueban parámetros y rollback mediante dobles. [TESTING.md](./TESTING.md) explica la verificación opcional con PostgreSQL real.

Los datos de la API ya no se pierden al reiniciar: viven en qa_test_ge. La aplicación no crea ni modifica el esquema al arrancar y db:migrate aplica explícitamente la migración 004, pero no hay migración automática al arrancar ni gestor de respaldos. Un puerto ocupado requiere detener su proceso o cambiar PORT; un error de conexión requiere revisar servicio, permisos, credenciales y tablas importadas. `pnpm db:check` hace esa comprobación sin escrituras.
