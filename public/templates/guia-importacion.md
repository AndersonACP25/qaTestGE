# Importar Bugs, Casos y Tags

En el listado correspondiente pulsa **Importar**, descarga la plantilla Excel, elimina sus ejemplos y completa la hoja **Bugs**, **Casos** o **Tags**. Selecciona el archivo, revisa la vista previa y pulsa **Confirmar importación de pendientes**. Solo se importa el recurso del listado actual; las demás hojas se ignoran.

Se admiten `.xlsx` y CSV UTF-8 con coma o punto y coma. También se acepta un Excel con una sola hoja. Mantén los encabezados exactos en la primera fila. Máximo 2 MiB, 1000 filas de datos y 30 columnas; celdas de texto, sin fórmulas, fechas, números tipados, imágenes ni celdas combinadas. Para versiones numéricas utiliza formato Texto antes de escribir.

## Bugs

| Columna     | Regla                                          |
| ----------- | ---------------------------------------------- |
| titulo      | Obligatorio, hasta 200 caracteres.             |
| descripcion | Hasta 5000 caracteres; admite saltos de línea. |
| prioridad   | Crítica, Alta, Media o Baja. Obligatorio.      |
| severidad   | Crítica, Alta, Media o Baja. Obligatorio.      |
| entorno     | Opcional, hasta 100 caracteres.                |
| version     | Opcional, hasta 100 caracteres.                |

Una fila crea un bug nuevo en el estado inicial del flujo del proyecto. No se importan IDs, responsables ni estados arbitrarios.

## Casos

| Columna           | Regla                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------- |
| clave             | Hasta 100 caracteres. Agrupa filas del mismo caso; si está vacía se agrupa por título. |
| titulo            | Obligatorio, hasta 200 caracteres.                                                     |
| suite             | Opcional, hasta 100 caracteres.                                                        |
| tipo              | Obligatorio, hasta 100 caracteres. Por ejemplo Funcional, Regresión o Seguridad.       |
| estado            | Borrador, Listo u Obsoleto.                                                            |
| precondiciones    | Opcional, hasta 10000 caracteres.                                                      |
| accion            | Obligatoria, hasta 10000 caracteres.                                                   |
| resultadoEsperado | Obligatorio, hasta 10000 caracteres.                                                   |

Una fila por paso, hasta 100 pasos por caso. Repite todos los datos del caso en cada fila; deben coincidir. La clave es una agrupación del archivo, no un ID del proyecto. No se sobrescriben casos existentes.

## Tags

| Columna | Regla                                                          |
| ------- | -------------------------------------------------------------- |
| nombre  | Obligatorio, hasta 50 caracteres, sin repetidos en el archivo. |
| color   | Obligatorio, hexadecimal de seis dígitos, por ejemplo #7462DF. |

El lote de tags es atómico: mismo nombre (sin distinguir mayúsculas) y color conserva el existente; un color diferente rechaza el lote entero. No se asignan tags a bugs o casos automáticamente.

## Validación y fallos

Si hay errores de estructura o contenido, no se habilita la confirmación. Corrige el archivo y vuelve a seleccionarlo antes de confirmar. Para importar se requiere permiso de escritura del recurso en el proyecto.

Bugs y casos se crean secuencialmente. Si falla una fila, las anteriores se conservan; mantén abierto el diálogo y vuelve a confirmar para continuar los pendientes con sus mismas claves. El archivo queda bloqueado tras iniciar la importación. Cambiar de página o proyecto detiene las solicitudes siguientes, pero una solicitud enviada puede haberse guardado. Al cerrar el diálogo, revisa el listado y elimina del archivo los registros ya creados antes de empezar otra importación. No se reintenta automáticamente.
