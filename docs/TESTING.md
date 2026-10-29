# Pruebas y verificación

## Comandos

Desde la raíz, después de instalar las dependencias del workspace:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

`format:check` valida Prettier sin modificar archivos; `lint` ejecuta ESLint. `typecheck` valida el frontend y las pruebas incluidas en su tsconfig. `build` verifica tipos y compila frontend y backend. `test` ejecuta Vitest según `vite.config.ts`, incluyendo `tests/**/*.test.ts` y `backend/tests/**/*.test.ts`. `pnpm test:watch` inicia observación.

GitHub Actions (`.github/workflows/ci.yml`) ejecuta estos checks además de instalar dependencias con lockfile congelado. En push a `main` publica como artefacto temporal los directorios `dist/` y `backend/dist/`.

Para una suite concreta:

```bash
pnpm exec vitest run tests/unit/caseBuilder.test.ts
pnpm exec vitest run backend/tests/api.test.ts
```

## Cobertura funcional actual

- `tests/unit/filterItems.test.ts`: búsqueda y filtros de recursos.
- `tests/unit/workspace.test.ts`: marca compartida y ausencia de los indicadores retirados.
- `tests/unit/auth.test.ts`: derivación de contraseñas, hashes de sesión y aislamiento por proyecto.
- `tests/unit/api.test.ts`: cookies, CSRF, errores de red y sesión expirada mediante fetch simulado.
- `backend/tests/auth.test.ts`: rutas de acceso, cookies, CSRF, autorización y límite de intentos con proveedor simulado.
- `backend/tests/auth.test.ts`: también valida CRUD de plantillas con CSRF y la confirmación de desactivación/anonimización de cuenta.
- `tests/unit/theme.test.ts`: preferencia de tema y validación del formulario de acceso real.
- `tests/unit/caseBuilder.test.ts`: maqueta del diseñador; no valida generación real con IA.
- `tests/unit/exportCases.test.ts`: estructura y cantidades de ejemplos exportados.
- `tests/unit/database.test.ts`: IDs bigint, configuración validada sin secretos, consultas parametrizadas y rollback con dobles de cliente.
- `tests/unit/authProvider.test.ts`: ownership de plantillas y anonimización/revocación transaccional mediante dobles de PostgreSQL.
- `tests/unit/openapi.test.ts`: contrato OpenAPI.
- `backend/tests/api.test.ts`: endpoints Express con Supertest, validaciones y errores; se inyecta un repositorio simulado y no se conecta a PostgreSQL.
- `backend/tests/api.test.ts`: también cubre CRUD/adjuntos de casos, autorización, enlaces HTTP(S), firma/MIME de imágenes y headers de consulta privada.

No se configura un umbral ni un informe de cobertura automatizado. Las pruebas actuales no certifican accesibilidad, integración con una base de datos ni comportamiento completo de navegador.

## Reglas para nuevas pruebas

Pruebas unitarias deterministas en `tests/unit/`, con Vitest y sin backend, red ni servicios externos. Probar reglas y resultados observables; no depender de hora real, datos persistentes ni proveedores de IA. Las pruebas de endpoints viven en `backend/tests/` y usan la aplicación Express directamente, sin levantar un servidor de desarrollo separado.

## Revisión manual del frontend

1. Iniciar `pnpm dev:all` y abrir la URL anunciada por Vite. Confirmar el favicon y la misma marca en el workspace.
2. Probar registro, inicio y cierre de sesión reales, contraseñas distintas, cierre de sesión y recarga.
3. Cambiar temas claro y oscuro; comprobar legibilidad, navegación con teclado y tamaños móvil/escritorio.
4. Confirmar que no aparecen el panel de almacenamiento ni la etiqueta «Demo local» en la barra superior. El diseñador de test cases debe conservar su aviso de maqueta sin IA.
5. Revisar búsqueda, filtros, estados vacíos y formularios locales.
6. En el diseñador, probar texto vacío, categorías y cantidades; comprobar Acción / Resultado esperado, limpieza de vista previa y exportaciones Excel/PDF.
7. En Diseñar test cases, guardar un ejemplo de forma explícita y verificar que aparece en Casos de prueba; editarlo, adjuntar enlace e imagen mediante selector y arrastre, abrir el detalle, y probar la eliminación (debe impedirse si se usa en una ejecución).
8. En Configuración, crear/editar/eliminar una plantilla, cargarla en «Nuevo bug» y ajustar sus campos antes de guardar.
9. Verificar que la sección de IA se presenta como maqueta deshabilitada y no pide ni envía credenciales.
10. Si se prueba la baja de cuenta, usar solo una cuenta y base desechables: confirma la revocación de sesiones y la conservación de recursos QA relacionados.
11. Abrir SwaggerUI. Recordar que las escrituras de Try it out sí modifican datos persistentes en PostgreSQL.

## SQL y PostgreSQL

Las pruebas Vitest no necesitan PostgreSQL. Para integración real usa exclusivamente una instancia efímera y `TEST_DATABASE_URL` explícita según [`backend/sql/README.md`](../backend/sql/README.md). Prepara la base vacía con `pnpm db:setup`; repite el comando y `pnpm db:migrate` para verificar idempotencia antes de `test:db`. CI también prueba actualizar desde el esquema 001 con migraciones 004–012. Nunca uses la base personal: la integración crea y elimina datos. `003_verify.sql` es una comprobación manual del modelo inicial, no sustituye los escenarios de autenticación, aislamiento y concurrencia de la API.

Los scripts SQL iniciales se verificaron con PostgreSQL 18 en una instancia temporal aislada: creación de la base, esquema, seed y comprobaciones de integridad. La API ya usa un repositorio PostgreSQL; el esquema sigue importándose manualmente.

## Integración opcional del repositorio y API

`pnpm test` mantiene todas sus pruebas independientes de PostgreSQL. Para verificar escrituras reales, usar una base de pruebas aislada con el esquema importado y definir `TEST_DATABASE_URL` explícitamente antes de ejecutar:

```bash
pnpm --dir backend test:db
```

El script no carga `.env`. Crea cuentas y organizaciones/proyectos de prueba, comprueba registro/login/logout, hashes, expiración, revocación, CSRF, aislamiento entre cuentas, POST/GET, pasos, referencias, transacciones y lectura desde una conexión nueva. Al terminar elimina exclusivamente sus registros, pero las secuencias pueden avanzar. No ejecutarlo contra la base de trabajo. La integración se verificó con PostgreSQL 18 temporal aislado. La conexión de trabajo se comprobó con `db:check`, solo lectura.

## Playwright

Instalar dependencias con `pnpm install` y el navegador con `pnpm exec playwright install chromium`. Ejecutar `pnpm test:e2e`; para un viewport: `pnpm test:e2e --project=Mobile-M`. `pnpm test:e2e:ui` abre el runner interactivo y `pnpm test:e2e:report` el informe local.

La configuración inicia su propio Vite en `127.0.0.1:4174`, con puerto estricto y sin reutilizar servidores. No necesita backend ni PostgreSQL: la fixture intercepta `/api/**` y mantiene datos sintéticos por prueba. No usa sesiones reales, contraseñas, evidencias ni servicios externos. Desktop (1440×900), Mobile-M (375×812) y Mobile-L (425×900) ejecutan los mismos flujos.

La suite verifica navegación y desbordamientos en ambos temas, creación/edición de casos con varios pasos y un solo modal, guardado y actualización del diseñador, descarga Markdown y ciclo de una ejecución con resultados, notas, validación de finalización y eliminación. Las aserciones revisan las cargas enviadas y el estado simulado; los tests de repositorio verifican SQL parametrizado, transacciones, rollback, referencias y autorización por separado.

El mock no certifica la conectividad ni la ejecución SQL en PostgreSQL. Las pruebas unitarias usan dobles, no la base local. Los snapshots de pasos y las referencias se preservan en el repositorio transaccional. Las pruebas de navegador no sustituyen una auditoría completa de accesibilidad.

Playwright conserva capturas y trazas de fallos en `test-results/`; además, las pruebas de listados y ejecuciones generan capturas para revisión visual. El informe está en `playwright-report/`. Ambas carpetas están ignoradas por Git, ESLint y Prettier. CI instala Chromium y ejecuta la suite, y conserva artefactos de fallos durante siete días.

Configuración y aislamiento de red basados en la documentación oficial de [webServer](https://playwright.dev/docs/test-webserver) e [interceptación de red](https://playwright.dev/docs/network).
