# Desarrollo local

## Preparación

El entorno validado en este proyecto usa Node.js 24.12.0 y pnpm 12.11.2. El campo `packageManager` fija la versión de pnpm. Tener `pnpm` disponible en PATH y ejecutar desde la raíz:

```bash
pnpm install
pnpm dev:all
```

`dev:all` usa los filtros del workspace pnpm para ejecutar en paralelo el script `dev` de la raíz y de `@qatestge/api`, con salida identificada por paquete. Frontend: `http://localhost:5173`; API: `http://localhost:3000/api/health`. Detener la sesión conjunta con `Ctrl+C`.

Iniciar ambos servicios no conecta automáticamente los datos: el frontend todavía funciona con ejemplos propios.

## Scripts de la raíz

| Comando | Uso |
|---|---|
| `pnpm dev:all` | Frontend y backend en paralelo con recarga de desarrollo |
| `pnpm dev` / `pnpm dev:frontend` | Solo frontend con Vite |
| `pnpm dev:backend` / `pnpm dev:api` | Solo backend con tsx watch |
| `pnpm build` | Tipos del frontend y compilación de frontend y backend |
| `pnpm build:frontend` | Tipos y build del frontend en `dist/` |
| `pnpm build:backend` | Build del backend en `backend/dist/` |
| `pnpm preview` | Vista previa local del frontend compilado, normalmente en puerto 4173 |
| `pnpm typecheck` | Tipos del frontend y pruebas unitarias incluidas en su tsconfig |
| `pnpm test` | Pruebas unitarias y de endpoints |
| `pnpm test:watch` | Vitest en modo observación |

`pnpm build` también valida los tipos del backend. Para ejecutar su compilado usar `pnpm --dir backend start` después del build. `vite preview` es una herramienta de comprobación local, no una estrategia de despliegue productivo.

## Configuración

| Variable | Valor por defecto | Alcance |
|---|---|---|
| `PORT` | `3000` | Puerto de la API, entero entre 1 y 65535 |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | Origen permitido por CORS en la API |

Establecer variables en la terminal antes de iniciar el proceso. No hay carga explícita de archivos `.env` en el backend actual.

Ejemplo en PowerShell:

```powershell
$env:PORT = '3000'
$env:FRONTEND_ORIGIN = 'http://localhost:5173'
pnpm dev:all
```

Vite redirige `/api` a `http://localhost:3000` durante desarrollo según `vite.config.ts`. Si cambias el puerto de la API, ajusta ese destino. Si Vite usa otro puerto porque 5173 está ocupado, revisa la URL anunciada y `FRONTEND_ORIGIN` para solicitudes directas a la API.

## Verificación y problemas comunes

```bash
pnpm typecheck
pnpm build
pnpm test
```

Si faltan módulos, ejecutar `pnpm install` desde la raíz. Si el puerto 3000 está ocupado, cerrar el proceso que lo usa o configurar otro puerto. El reinicio del backend, incluso por tsx watch, borra sus datos en memoria. No hay base de datos, migraciones ni restauración de datos implementadas.

Las pruebas unitarias no necesitan servicios externos; las de API usan Supertest sobre la aplicación Express sin levantar un backend de desarrollo separado.
