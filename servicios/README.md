# Integraciones externas

Este directorio aloja clientes, adaptadores y contratos para APIs o servicios externos que se incorporen al producto. Cada integración debe quedar detrás de una interfaz de proveedor, manejar explícitamente errores y disponibilidad, y mantener secretos en el servidor.

No hay integraciones externas implementadas actualmente. La API Express y sus repositorios PostgreSQL son servicios internos del producto y permanecen en `backend/`.

La [guía de integración de IA](../docs/AI_INTEGRATION.md) describe el contrato de propuestas, el adaptador futuro y los controles de privacidad antes de conectar un proveedor.
