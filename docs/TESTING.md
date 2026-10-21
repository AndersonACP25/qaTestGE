# Pruebas y verificación

## Comandos

Desde la raíz, después de instalar las dependencias del workspace:

```bash
pnpm typecheck
pnpm build
pnpm test
```

`typecheck` valida el frontend y las pruebas incluidas en su tsconfig. `build` verifica tipos y compila frontend y backend. `test` ejecuta Vitest según `vite.config.ts`, incluyendo `tests/**/*.test.ts` y `backend/tests/**/*.test.ts`. `pnpm test:watch` inicia observación.

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
- `tests/unit/theme.test.ts`: preferencia de tema y validación del formulario de acceso real.
- `tests/unit/caseBuilder.test.ts`: maqueta del diseñador; no valida generación real con IA.
- `tests/unit/exportCases.test.ts`: estructura y cantidades de ejemplos exportados.
- `tests/unit/database.test.ts`: IDs bigint, configuración validada sin secretos, consultas parametrizadas y rollback con dobles de cliente.
- `tests/unit/openapi.test.ts`: contrato OpenAPI.
- `backend/tests/api.test.ts`: endpoints Express con Supertest, validaciones y errores; se inyecta un repositorio simulado y no se conecta a PostgreSQL.

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
7. Abrir SwaggerUI. Recordar que los POST de Try it out sí escriben datos persistentes en PostgreSQL.

## SQL y PostgreSQL

Las pruebas Vitest no necesitan PostgreSQL. Para verificar el esquema manualmente en una base local de prueba, seguir [`backend/sql/README.md`](../backend/sql/README.md) e importar `003_verify.sql` después del esquema. Para probar la API, aplicar también 004_authentication.sql o db:migrate antes de test:db. Comprueba referencias entre proyectos, prioridades, posiciones únicas y destinos de evidencias; revierte sus filas al finalizar. Se requiere un servidor PostgreSQL; no se afirma persistencia de la aplicación por importar esos archivos.

Los scripts SQL iniciales se verificaron con PostgreSQL 18 en una instancia temporal aislada: creación de la base, esquema, seed y comprobaciones de integridad. La API ya usa un repositorio PostgreSQL; el esquema sigue importándose manualmente.

## Integración opcional del repositorio y API

`pnpm test` mantiene todas sus pruebas independientes de PostgreSQL. Para verificar escrituras reales, usar una base de pruebas aislada con el esquema importado y definir `TEST_DATABASE_URL` explícitamente antes de ejecutar:

```bash
pnpm --dir backend test:db
```

El script no carga `.env`. Crea cuentas y organizaciones/proyectos de prueba, comprueba registro/login/logout, hashes, expiración, revocación, CSRF, aislamiento entre cuentas, POST/GET, pasos, referencias, transacciones y lectura desde una conexión nueva. Al terminar elimina exclusivamente sus registros, pero las secuencias pueden avanzar. No ejecutarlo contra la base de trabajo. La integración se verificó con PostgreSQL 18 temporal aislado. La conexión de trabajo se comprobó con `db:check`, solo lectura.
