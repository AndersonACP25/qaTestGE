# Diseño de interfaz

## Alcance

Frontend React/Vite conectado a la API: Dashboard, bugs, casos, ejecuciones, evidencias, tags y configuración individual. El diseñador ofrece ejemplos ilustrativos editables; no hay IA conectada. La navegación vive en estado React, sin rutas URL. `src/styles.css` define los tokens y ambos temas; este documento fija las reglas para extenderlos.

## Colores

| Rol                        | Token                | Uso                             |
| -------------------------- | -------------------- | ------------------------------- |
| Marca y acción principal   | `--purple`           | CTA principal, selección y foco |
| Superficie                 | `--panel`            | Tarjetas, alertas y diálogos    |
| Separación                 | `--line`             | Bordes y divisores              |
| Texto principal existente  | `--color-202334`     | Títulos y contenido             |
| Texto secundario existente | `--color-626678`     | Ayuda y metadatos               |
| Éxito                      | `--feedback-success` | Operación confirmada            |
| Advertencia                | `--feedback-warning` | Atención requerida              |
| Error                      | `--feedback-error`   | Fallo y recuperación            |
| Información                | `--feedback-info`    | Contexto y límites              |

Reutilizar tokens; no crear un hexadecimal distinto por componente. Los tokens `--color-*` son legado: para roles nuevos definir nombres semánticos con valores en `:root` y `:root[data-theme="dark"]`. Los colores de categorías y tags identifican grupos, no severidad. Nunca comunicar estados solo con color: acompañarlos de texto e icono. Mantener contraste AA: 4.5:1 para texto normal y 3:1 para texto grande y controles. Verificar hover, foco y deshabilitado en ambos temas.

La marca usa `public/favicon.svg`. El tema inicial respeta el sistema; una elección explícita se guarda en `qatestge-theme` cuando localStorage está disponible.

## Tipografía y textos con cantidades

`src/typography.css` centraliza tamaños en rem y clases BEM reutilizables. Los bloques existentes consumen los mismos tokens, sin sobrescribirlos con píxeles menores en móvil.

| Rol               | Token / clase                            | Tamaño base        |
| ----------------- | ---------------------------------------- | ------------------ |
| Título de página  | `--font-title` / `typography__title`     | 24–28 px adaptable |
| Sección           | `--font-section` / `typography__section` | 20 px              |
| Subtítulo         | `--font-heading` / `typography__heading` | 18 px              |
| Contenido         | `--font-body` / `typography__body`       | 16 px              |
| Acción / entrada  | `--font-control` / `typography__control` | 16 px              |
| Ayuda / metadatos | `--font-caption` / `typography__caption` | 14 px mínimo       |

Los botones de creación comparten el tamaño de control y un alto mínimo de 44 px. Mantener saltos de línea, zoom y lectura con texto ampliado; no resolver desbordamientos reduciendo la fuente. No aplicar estos tamaños a iconos decorativos ni contadores gráficos de gran tamaño. Nuevos encabezados usan clases semánticas y el bloque del componente controla sus márgenes.

Toda frase ligada a una cantidad usa `formatCount(cantidad, "resultado registrado", "resultados registrados")`; para verbos usa `pluralize(cantidad, "Se exportará", "Se exportarán")`. Las formas son explícitas para permitir acentos y plurales irregulares. `Intl.PluralRules("es")` elige la forma; 0 usa plural. `product/pluralization` bloquea interpolaciones conocidas con texto fijo tanto en JSX como en plantillas. Es un guardián de vocabulario, no un analizador gramatical completo: extenderlo al introducir nuevos sustantivos y probar 0, 1 y varios en contexto. Los títulos de colecciones pueden ser plurales sin contador.

El nombre/avatar del usuario es un botón accesible que abre Configuración y cierra el menú móvil.

## Componentes y contratos

| Necesidad   | Reutilizar                              | Reglas                                                                                                  |
| ----------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Mensajes    | `src/Alert.tsx`                         | `success`, `warning`, `error`, `info`; título, mensaje y cierre opcional; sin autocierre de errores     |
| Diálogos    | `src/Dialog.tsx`                        | Título accesible, Escape, foco inicial, contención y restauración de foco                               |
| Detalle QA  | `src/views/RecordDetailsDialog.tsx`     | Cerrar el detalle al abrir edición; un único diálogo activo por flujo                                   |
| Formularios | Controles nativos del workspace         | Etiquetas asociadas, validación, bloqueo durante guardado y datos conservados ante fallo                |
| Listados    | `workspace-table__scroll`               | Encabezados semánticos y scroll horizontal cuando sea necesario; sin scroll vertical interno permanente |
| Diseñador   | Modelo → controlador → `CaseDesignView` | Vista previa, totales y exportaciones comparten los datos editados                                      |

`Alert` usa `role="alert"` para errores/advertencias y `role="status"` para éxito/información. Escribir mensajes concretos con una forma de continuar cuando corresponda. No usar alertas bloqueantes del navegador ni duplicar sistemas de notificaciones. Reservar confirmaciones para acciones destructivas que las requieran.

## Composición y CSS

- Usar BEM en clases nuevas y modificadas: `bloque__elemento--modificador`. Encapsular reglas; no añadir selectores globales para detalles internos.
- Reutilizar botones, paneles y controles existentes. Una acción principal por sección; acciones secundarias con menor peso visual.
- Usar pasos de espacio de 4, 8, 12, 16, 24 y 32 px y radios de 8–14 px para superficies. Tipografía del sistema y jerarquía consistente entre títulos, etiquetas, contenido y ayuda.
- En móvil, apilar paneles y permitir lectura de tablas sin cortar columnas. Contenido largo debe envolver o truncarse con acceso al valor completo.
- Los diálogos limitan su altura al viewport y desplazan su propio contenido; no resolver superposiciones aumentando z-index arbitrariamente.
- Mantener foco visible, cierres accesibles y animación breve que respete `prefers-reduced-motion`.

## Comportamiento vigente

Dashboard muestra conteos reales del proyecto y no incluye Nuevo bug. Los bugs se crean desde su listado. El selector usa proyectos autorizados del servidor.

El diseñador tiene 18 categorías con cantidades de 1 a 5 e iniciales configurables por usuario en el navegador. Exige descripción, categoría y cantidades válidas. Cada caso admite edición de pasos y guardado explícito mediante API. Exporta la vista previa editada a Excel, PDF y Markdown localmente. El requisito escrito no genera contenido: mantener los avisos de ejemplos ilustrativos e IA no conectada.

Las evidencias permiten archivos privados de hasta 2 MiB; los casos admiten imágenes y enlaces. Hay invitaciones por código de un solo uso. No describir como disponibles IA real, invitaciones por correo, MFA, recuperación de contraseña o verificación de correo. La configuración de IA sigue deshabilitada y no almacena claves.

## Revisión

La versión 1.1.0 prueba Mobile-M (375 px) y Mobile-L (425 px). A 620 px o menos, las tablas QA se reorganizan como filas con etiquetas visibles y encabezados semánticos conservados. En escritorio usan columnas flexibles y texto que puede envolver. No ocultar el overflow de toda la página para simular que cabe el contenido.

`TestRunDialog` centraliza edición, resultados por caso, snapshots de pasos y confirmación de eliminación. Mantener un único diálogo activo. Distinguir Pendiente de ejecutar de Omitido registrado; completar exige un resultado explícito por caso. Las ejecuciones completadas deben reabrirse antes de corregir resultados.

Antes de añadir un componente, comprobar si puede resolverse con una variante existente. Documentar propósito, propiedades, estados y accesibilidad al ampliar un contrato. Revisar escritorio/móvil, ambos temas, teclado, contenido largo, carga, vacío, error y éxito. Ejecutar los cinco comandos de AGENTS.md; las pruebas automáticas no sustituyen una revisión visual ni certifican accesibilidad.
