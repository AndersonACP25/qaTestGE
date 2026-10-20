# Diseño de interfaz

## Alcance actual

Interfaz React/Vite de demostración. Incluye acceso simulado, resumen, listados de bugs, casos, ejecuciones y evidencias, y la maqueta del diseñador de test cases. Equipo y configuración muestran vistas pendientes. No hay sincronización con la API.

## Estructura

| Archivo | Responsabilidad |
|---|---|
| `src/Session.tsx` | Acceso y registro simulados, cierre de sesión y preferencia de tema |
| `src/App.tsx` | Navegación en estado React, shell, vistas y datos locales |
| `src/CaseBuilder.tsx` | Descripción, selección de categorías, cantidades y tablas fijas de ejemplo |
| `src/utils/caseCatalog.ts` | Catálogo de escenarios ilustrativos y validación de cantidades |
| `src/styles.css` | Estilos actuales, variables de color y reglas responsive |
| `src/types.ts` | Tipos de navegación y modelos de presentación |

La navegación actual no usa rutas URL. Recargar reinicia el acceso y los datos locales.

## Lenguaje visual

- Acento violeta, superficies de tarjetas, bordes discretos y jerarquía de títulos y textos auxiliares.
- Colores compartidos mediante variables CSS. El atributo `data-theme` de la raíz activa el tema claro u oscuro.
- La primera visita respeta el tema del sistema; `qatestge-theme` en `localStorage` recuerda una elección explícita cuando el almacenamiento está disponible.
- Reutilizar las variables existentes y comprobar contraste, foco, estados deshabilitados y legibilidad en ambos temas.
- Clases nuevas y modificadas con BEM: `bloque__elemento--modificador`. Hay clases heredadas anteriores a esa convención; evitar extenderlas con estilos globales.

## Flujos y estados

El acceso admite cualquier usuario y contraseña no vacíos; el registro comprueba la confirmación sin crear cuentas. La interfaz debe identificarlo siempre como demo.

El diseñador permite combinar 18 categorías, incluidas Smoke, Regresión, Funcionales, UI, UX e Integración. Cada una tiene una casilla y un contador etiquetado de 1 a 3 pruebas, habilitado al seleccionarla y con valor inicial de una. El botón de vista previa exige descripción no vacía, al menos una categoría y cantidades enteras válidas. Cada fila es una prueba fija con Acción / Resultado esperado; la cantidad determina cuántos ejemplos distintos se muestran. El total, Excel y PDF usan la misma selección. Cambiar las entradas limpia la vista previa; abandonar la vista descarta su estado. No presentar esos ejemplos como contenido generado a partir del requisito.

Para la futura IA, diseñar propuestas editables y descartables con confirmación humana antes de crear casos reales. Esa edición y confirmación aún no existen.

## Accesibilidad y adaptación

- Usar controles nativos, etiquetas asociadas, encabezados coherentes, `fieldset` para grupos y tablas con encabezados y caption.
- Mantener foco visible y navegación mediante teclado; no depender solo del color para comunicar estados.
- Usar mensajes accesibles para errores y cambios de resultados.
- En móvil, la navegación lateral se abre mediante menú; los paneles se apilan y las tablas deben permitir lectura sin cortar contenido.
- Revisar escritorio y móvil, ambos temas, entradas largas y estados vacíos antes de entregar cambios visuales. Las pruebas automatizadas actuales no sustituyen una revisión visual ni certifican accesibilidad completa.
