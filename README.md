# qaTestGE

Una plataforma para organizar el trabajo de QA de tu equipo: bugs, casos de prueba, ejecuciones manuales y evidencias, conectados dentro de cada proyecto.

## Qué ofrece

- **Bugs y casos de prueba:** registra incidencias, documenta pasos, asigna responsables y organiza el trabajo con tags.
- **Ejecuciones y evidencias:** registra resultados de pruebas manuales y adjunta archivos privados de hasta 2 MiB.
- **Equipos y proyectos:** colabora mediante invitaciones de un solo uso.
- **Dashboard, reportes y exportación:** consulta avances y descarga registros en Excel, PDF, Markdown o reportes CSV.
- **Diseñadores:** prepara casos a partir de ejemplos y bugs desde plantillas; revisa el contenido antes de guardarlo.

La IA y el cambio de imagen de perfil siguen siendo maquetas. Las pruebas se ejecutan manualmente.

## Stack tecnológico

| Área              | Tecnologías                           |
| ----------------- | ------------------------------------- |
| Interfaz          | React, TypeScript y Vite              |
| API               | Node.js y Express                     |
| Datos y contratos | PostgreSQL y Zod                      |
| Calidad           | Vitest, Playwright, ESLint y Prettier |
| Workspace         | pnpm                                  |

## Clonar y ejecutar

Necesitas Git, Node.js 24, pnpm 12.11.2 y PostgreSQL con las herramientas de línea de comandos instaladas.

```bash
git clone https://github.com/AndersonACP25/qaTestGE.git
cd qaTestGE
pnpm install --frozen-lockfile
cp backend/.env.example backend/.env
```

Crea una base vacía (omite este paso si ya existe):

```bash
createdb -h localhost -U postgres -W qa_test_ge
```

Edita `DATABASE_URL` en `backend/.env` con tu usuario y contraseña de PostgreSQL. Después:

```bash
pnpm db:setup
pnpm dev
```

Abre **http://localhost:5173**, crea tu cuenta y empieza con tu primer proyecto. `db:setup` instala el esquema y las migraciones en orden, sin importar archivos SQL a mano ni cargar datos de ejemplo. Para una instalación existente, usa `pnpm db:migrate`.

## Más información

[Guía de uso](docs/USER_GUIDE.md) · [Desarrollo e instalación](docs/DEVELOPMENT.md) · [Arquitectura](docs/architecture.md) · [Contribuir](CONTRIBUTING.md) · [Seguridad](SECURITY.md)
