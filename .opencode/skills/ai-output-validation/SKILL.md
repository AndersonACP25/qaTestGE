---
name: ai-output-validation
description: Define validación y manejo seguro para salidas de modelos usadas por funciones de IA de qaTestGE.
metadata:
  opencode/slash: "true"
---

# Validación de salidas de IA

Usa esta skill al implementar o revisar el consumo, parseo o presentación de respuestas de modelos.

## Requisitos

1. Trata toda salida del modelo como entrada no confiable, incluso cuando solicite un formato estructurado.
2. Valida sintaxis y esquema en el límite de integración; comprueba campos requeridos, tipos, enumeraciones, longitudes y límites de listas.
3. Valida reglas de negocio por separado del esquema. No aceptes identificadores, estados o relaciones que el usuario no esté autorizado a usar.
4. Rechaza o presenta un error explícito para contenido malformado; no conviertas errores en una respuesta aparentemente exitosa ni guardes silenciosamente datos parciales.
5. Escapa texto al mostrarlo y no interpretes HTML, Markdown activo, código o instrucciones devueltas como acciones ejecutables.
6. Muestra propuestas para revisión y edición; persiste solo después de una confirmación explícita y una nueva comprobación de autorización.
7. No incluyas prompts, respuestas, secretos ni datos personales en logs por defecto. Registra solo metadatos necesarios para diagnosticar fallos.
8. Añade pruebas para campos ausentes, tipos incorrectos, contenido excesivo, valores fuera de catálogo, referencias no autorizadas y respuesta vacía/malformada.

Separa errores recuperables del proveedor de errores de validación y hazlos visibles. Mantén disponibles las tareas no dependientes de IA.
