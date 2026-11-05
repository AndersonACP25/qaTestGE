# Integraciones externas

Este directorio aloja clientes, adaptadores y contratos para APIs o servicios externos que se incorporen al producto. Cada integración debe quedar detrás de una interfaz de proveedor, manejar explícitamente errores y disponibilidad, y mantener secretos en el servidor.

El [piloto Playwright](../docs/PLAYWRIGHT_PILOT.md) incluye un publicador para GitHub Actions. La API Express y sus repositorios PostgreSQL son servicios internos del producto y permanecen en `backend/`.

El [contrato de enlaces de cuenta](account-links/README.md) permite delegar la entrega de correos a un webhook HTTPS.

La [guía de integración de IA](../docs/AI_INTEGRATION.md) describe el contrato de propuestas, el adaptador Gemini en `ia/` y los controles de privacidad del piloto.
