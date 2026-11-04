# Piloto Playwright en qaTestGE

La suite se ejecuta en el repositorio de automatización. qaTestGE recibe los estados de una ejecución de GitHub Actions y crea un Test Run completado con los casos vigentes del proyecto. El detalle muestra suite, entorno, rama, commit, enlace a CI e intentos por caso. La tabla distingue las ejecuciones de Playwright.

## Preparar qaTestGE

1. Ejecuta `pnpm db:migrate` para aplicar la migración 019.
2. Designa una cuenta con rol QA o Admin del proyecto piloto. Configura `PLAYWRIGHT_PROJECT_ID` y `PLAYWRIGHT_ACTOR_ID` con sus identificadores numéricos.
3. Genera un secreto aleatorio de 32 bytes en hexadecimal. Configura su SHA-256 en hexadecimal como `PLAYWRIGHT_TOKEN_SHA256` en el servidor. Reinicia el backend para activar, rotar o revocar la credencial.
4. En el repositorio de automatización guarda el secreto original como `QATESTGE_PLAYWRIGHT_TOKEN`. Configura la URL HTTPS de qaTestGE como variable `QATESTGE_URL`. Habilita estos pasos en ramas de confianza que tengan acceso a ese entorno.

La credencial permite publicar resultados en un solo proyecto y solo en el endpoint del piloto. La cuenta debe conservar acceso y permisos de escritura. El valor original del secreto se guarda en GitHub Actions.

## Vincular y ejecutar

Identifica cada prueba con un solo caso, por ejemplo `test("[TC-123] Iniciar sesión @smoke", async ({ page }) => { ... })`. También puedes usar una anotación `{ type: "qatestge", description: "TC-123" }`. Usa un ID distinto por prueba dentro del proyecto de Playwright. Si el vínculo es ambiguo, el publicador se detiene con un error.

Copia `servicios/playwright/publish.mjs` al repositorio de automatización y añade estos pasos después de instalar Playwright. Sustituye `chromium` por el nombre del proyecto en tu configuración.

```yaml
- name: Ejecutar smoke
  id: smoke
  run: pnpm exec playwright test --grep @smoke --project chromium --reporter json
  env:
    PLAYWRIGHT_JSON_OUTPUT_FILE: smoke-results.json

- name: Publicar en qaTestGE
  if: ${{ !cancelled() && (steps.smoke.outcome == 'success' || steps.smoke.outcome == 'failure') }}
  run: node servicios/playwright/publish.mjs smoke-results.json chromium smoke QA
  env:
    QATESTGE_URL: ${{ vars.QATESTGE_URL }}
    QATESTGE_PLAYWRIGHT_TOKEN: ${{ secrets.QATESTGE_PLAYWRIGHT_TOKEN }}
```

El publicador transmite IDs, estados y metadatos. El reporte JSON completo, los mensajes de error, trazas y evidencias se quedan en el repositorio de automatización. Los casos inexistentes, obsoletos o ajenos al proyecto se identifican como pendientes de conciliación. Si no queda ningún caso vigente, la API devuelve 422 y no crea una ejecución.

El último intento determina el estado registrado. Un timeout se registra como fallido, una interrupción como bloqueada y una prueba omitida como omitida. Las notas conservan la secuencia de intentos, incluso cuando un reintento termina aprobado. Los intentos de GitHub Actions son ejecuciones distintas. Repetir la publicación del mismo reporte del mismo intento conserva el ID de qaTestGE. Si cambian sus resultados, la API devuelve 409.

Una ejecución publicada conserva el historial de CI. QA puede crear bugs vinculados desde resultados fallidos y clonar ejecuciones para seguimiento manual.
