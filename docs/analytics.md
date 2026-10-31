# Analítica y cobertura

Dashboard presenta cuatro indicadores, distribución de bugs, aprobación por ejecución de los últimos 30 días y cobertura de requisitos. Reportes permite elegir hasta 366 días inclusivos, ver tendencias y exportar CSV. Ambos consultan agregados PostgreSQL, sin descargar bugs, casos, ejecuciones ni evidencias completos.

| Métrica                         | Definición y alcance                                                                                                                                                                                       |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bugs abiertos/cerrados actuales | Total actual, clasificado mediante closedStates del proyecto.                                                                                                                                              |
| Casos activos                   | Casos cuyo estado documental no es Obsoleto.                                                                                                                                                               |
| Ejecuciones activas             | Estado En curso.                                                                                                                                                                                           |
| Aprobación del período          | Aprobados / (aprobados + fallidos + bloqueados), con executed_at en el rango UTC. Excluye omitidos y pendientes; sin denominador muestra Sin datos.                                                        |
| Aprobación por ejecución        | Tasa actual de resultados registrados de cada ejecución creada en el rango; hasta las 60 más recientes, ordenadas cronológicamente.                                                                        |
| Bugs en el tiempo               | Saldo abierto/cerrado al cierre de cada día UTC. El día actual es parcial. Comienza con 015; los días anteriores carecen de datos. Incluye reaperturas, eliminaciones y reclasificaciones de closedStates. |
| Fallos frecuentes               | Hasta 10 casos ordenados por cantidad de resultados fallidos registrados en el período; la barra compara fallos con resultados evaluados. Una corrección de resultado modifica las métricas actuales.      |
| Cobertura por tipo              | Casos activos distintos con algún resultado registrado en cualquier fecha / casos activos del tipo. Un resultado registrado omitido cuenta como ejecución registrada. No mide cobertura de código.         |
| Cobertura de requisitos         | Requisitos con al menos un caso activo vinculado / requisitos actuales. No exige un resultado aprobado.                                                                                                    |

Los conteos actuales no cambian al filtrar fechas. Los gráficos de aprobación usan la fecha de creación de la ejecución; el resumen y los fallos frecuentes usan la fecha de registro del resultado. Estas métricas se distinguen en la interfaz. El CSV conserva el período, las series de bugs, aprobación y fallos frecuentes mostradas.

## Matriz

En **Cobertura y requisitos**, QA/Admin pueden crear y editar requisitos con código único por proyecto, título, descripción y hasta 100 casos. La búsqueda de casos y bugs consulta páginas de hasta 50 coincidencias; refina el texto para localizar otros registros. La matriz muestra requisitos sin casos y casos sin bugs. Vincular un bug lo asocia al caso y por ello aparece en todos sus requisitos. Las referencias nunca cruzan proyectos.

Ediciones y eliminaciones comprueban versión para evitar sobrescribir cambios de otra persona. Los vínculos y requisitos se auditan. Solo lectura y Dev pueden consultar la matriz; QA/Admin gestionan requisitos y vínculos. La paginación muestra hasta 50 filas por página; un caso con varios bugs ocupa varias filas.

## Compartir una ejecución

En **Test runs**, abre la ejecución y pulsa **Exportar informe PDF**. Incluye proyecto, responsable, fecha, resumen, título/versión/pasos capturados al crear la ejecución, resultados y notas actuales, bugs originados desde el resultado y referencias de evidencia del resultado o de la ejecución. Los archivos binarios no se incluyen. El acceso a la fuente del informe exige sesión y acceso al proyecto; descargar el PDF no crea un enlace público.

## Operación y límites

Aplica `pnpm db:migrate` para instalar 015 antes de iniciar. Las agregaciones se calculan en transacciones de lectura consistente en PostgreSQL; no se guardan métricas redundantes. Hay índices por proyecto/fecha y resultados, sin introducir un almacén analítico ni un servicio adicional. No se han realizado pruebas de carga con datos productivos. Los listados de mantenimiento conservan su carga existente; esta mejora reduce el volumen de Dashboard, Reportes y la matriz.

Para importar consulta la [guía](../public/templates/guia-importacion.md) y la [plantilla](../public/templates/plantilla-qaTestGE.xlsx), también disponibles desde el botón **Importar**.
