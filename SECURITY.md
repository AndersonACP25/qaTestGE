# Seguridad y privacidad

## Estado actual

qaTestGE es una demostración en desarrollo. El acceso del frontend acepta credenciales ficticias y no crea identidades ni protege la API. El backend no tiene autenticación, autorización, base de datos ni almacenamiento binario de evidencias. CORS no sustituye controles de acceso.

Usar datos ficticios en un entorno local controlado. No está preparado para exposición pública con información real. Los datos en memoria se pierden al reiniciar y no existe un procedimiento de respaldo implementado.

## Manejo de información

- No incluir claves, tokens, contraseñas, archivos privados ni datos personales en commits, issues o ejemplos.
- El formulario de acceso no guarda ni envía credenciales; solo mantiene el nombre en estado React. El tema puede guardarse en `localStorage`.
- La maqueta del diseñador no envía el requisito a servicios ni genera contenido real.
- Una integración futura con IA deberá mostrar qué información se envía, limitarla al contexto autorizado y exigir revisión humana para cambiar datos. No enviar evidencias por defecto.

## Reportar un problema

No existe aún un canal privado de seguridad dedicado ni un plazo de respuesta comprometido. Contactar al propietario por un canal privado acordado antes de compartir detalles explotables. Evitar publicar secretos o datos sensibles en una issue pública; si se publica una referencia, limitarla a una descripción general sin instrucciones de explotación.

## Pendiente antes de producción

Autenticación y permisos de servidor, aislamiento por proyecto, validación de relaciones, almacenamiento privado, límites de archivos, gestión segura de secretos, TLS, auditoría, persistencia, respaldos y políticas de retención. Los objetivos están descritos en [architecture.md](./architecture.md); no son capacidades disponibles.
