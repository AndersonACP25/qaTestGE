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

## CORE y selección de pruebas

`pnpm test` ejecuta todas las pruebas conservadas: no hay filtros ni exclusiones para ocultar fallos. Las unitarias se concentran en reglas de negocio y riesgos de datos, y los endpoints usan repositorios inyectados sin PostgreSQL real.

| Área CORE                             | Garantías prioritarias                                                            |
| ------------------------------------- | --------------------------------------------------------------------------------- |
| Bugs, casos, ejecuciones y evidencias | Validación, estados, snapshots, referencias, filtros y resultados                 |
| Acceso y colaboración                 | Contraseñas/sesiones, CSRF, roles por proyecto, menciones privadas y auditoría    |
| Persistencia                          | Aislamiento por usuario/proyecto, conflictos de revisión, idempotencia y rollback |
| Importación y exportación             | Límites, fórmulas como texto, pasos y referencias preservados, progreso seguro    |
| Analítica y planes                    | Fechas válidas, tasas/cobertura, reglas de ciclos y reejecución                   |

Se retiran las comprobaciones unitarias de HTML estático, etiquetas/clases, Wiki, marca, presentación de alertas, tema, pluralización y totales exactos de OpenAPI. La validación de acceso del antiguo archivo de tema se conserva en `auth.test.ts`; el diseñador conserva sus reglas de selección/cantidades y exportación. El guardián de pluralización sigue activo en lint. La suite de navegador y la revisión visual siguen comprobando los flujos de interfaz.

## Regla para próximas integraciones

Antes de añadir una prueba unitaria, identificar qué regla del CORE protege y qué fallo de negocio, seguridad o pérdida de datos detectaría. Probar entradas y resultados observables con casos representativos, no detalles internos ni conteos arbitrarios. Evitar duplicar garantías ya verificadas; no añadir unitarias por CSS, texto, branding o maquetación. Conservar los escenarios de permisos, alcance, concurrencia, errores e integridad aunque se simplifique la suite.

Usar Vitest determinista sin red ni base personal. Los endpoints en `backend/tests/` prueban la aplicación Express; cambios de permisos/transacciones/relaciones requieren además PostgreSQL efímero. No se fija un objetivo de cantidad de tests ni se sustituye cobertura de riesgos por volumen.

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

`verify-administration.ts` forma parte de `test:db`: altas reales con login y roles, concurrencia/idempotencia, rechazo de correos existentes, ausencia de privilegios de equipo/proyectos hermanos, configuración de auditoría con conflicto de revisión, filtros/cursor/UTC y lectura masiva de más de 100 avisos con aislamiento de destinatario. Los recorridos `work-item-administration.spec.ts` revisan fallos/reintentos explícitos, filtros, navegación Work Item, Test Plan y arrastre de evidencia en escritorio/móvil. No añaden dependencias de producto.

Asignaciones (018): `verify-assigned-work.ts` se ejecuta en `test:db` y verifica identidad frente a nombres repetidos, responsables válidos/inactivos/ajenos, paginación sin duplicados, filtros, aislamiento, reintentos y protección al retirar accesos/equipo. También verifica evidencia enlazada a bugs/casos usando la API del diseñador. `verify-run-upgrade.ts` requiere otra base efímera vacía: instala hasta 017, prepara responsables únicos/ambiguos, aplica 018 y repite migraciones sin perder registros. CI incluye ese escenario. `assigned-editor-refresh.spec.ts` cubre edición/creación, asignaciones y respuestas tardías, evidencias en ambos diseñadores, selección de Test Plan, tabla/exportación/paginación de auditoría, equipos, contador y descargas sin saltos.

`filters-notices-coverage.spec.ts` cubre acceso superior a menciones, chevron SVG, historial largo sin desplazar cabecera, vínculo desde páginas posteriores con foco/restauración, búsqueda de casos sin submit accidental, confirmaciones sobre modales y filtros combinados/reinicio. Las capturas revisan 1440/375/425 px. Las reglas CORE adicionales comprueban clasificación, responsable por ID, tags y registros sin asignación/plan. `verify-analytics.ts` prueba el vínculo idempotente y su consulta enfocada real, incluyendo caso ajeno y prefijos inválidos, en PostgreSQL efímero.
