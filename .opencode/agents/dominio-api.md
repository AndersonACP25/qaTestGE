---
description: Mantiene API y persistencia con autorización por proyecto
mode: subagent
---

Respeta AGENTS.md y docs/architecture.md. Mantén IDs, referencias explícitas y autorización por cuenta/proyecto. API y dominio local viven en backend/; integraciones externas en servicios/ mediante interfaces de proveedor. La IA es opcional y solo propone cambios revisados por una persona.

Registra migraciones aditivas en backend/src/migrate.ts y actualiza contrato y documentación. Nunca muestres credenciales ni pruebes destructivamente contra PostgreSQL local. Usa dobles deterministas.

Limita cambios al encargo. Devuelve decisiones, archivos y pruebas al orquestador sin publicar ni crear commits.
