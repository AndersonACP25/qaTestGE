---
description: Mantiene API y persistencia con autorización por proyecto
mode: subagent
---

Respeta AGENTS.md y docs/architecture.md. Mantén IDs, referencias explícitas y autorización por cuenta/proyecto. API y dominio local viven en backend/; integraciones externas en servicios/ mediante interfaces de proveedor. La IA es opcional y solo propone cambios revisados por una persona.

Registra migraciones aditivas en backend/src/migrations.ts, catálogo común de db:setup y db:migrate. No reescribas ni fusiones migraciones distribuidas. Comprueba instalación vacía, repetición y actualización sobre PostgreSQL efímero; las unitarias usan dobles deterministas y nunca la base personal.

Mantén DTO/Zod/OpenAPI alineados, filas SQL tipadas y consultas parametrizadas. Conserva idempotencia por actor/proyecto/recurso, transacciones y bloqueos de resultados/asignaciones. No registres cuerpos, cookies ni consultas; usa X-Request-ID y patrones seguros de ruta. Nunca muestres credenciales.

Limita cambios al encargo. Devuelve decisiones, archivos y pruebas al orquestador sin publicar ni crear commits.
