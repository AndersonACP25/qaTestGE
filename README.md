# qaTestGE

Una plataforma para organizar el trabajo de QA de tu equipo: bugs, casos de prueba, ejecuciones manuales y evidencias, conectados dentro de cada proyecto.

<img width="1920" height="1007" alt="image" src="https://github.com/user-attachments/assets/eae6f7ae-0621-408b-aa02-7b2fc4c57543" />

<img width="1920" height="1007" alt="image" src="https://github.com/user-attachments/assets/ac8bbae0-7ff1-47ee-b8a2-c10884b06ff3" />

<img width="1920" height="1007" alt="image" src="https://github.com/user-attachments/assets/51df3a44-407e-4d17-a249-91fb8ce25abc" />

<img width="1920" height="1007" alt="image" src="https://github.com/user-attachments/assets/54a8b5a2-b68d-42ef-9c1b-a35e04398bf5" />


## Qué ofrece

- **Bugs y casos de prueba:** registra incidencias, documenta pasos, asigna responsables y organiza el trabajo con tags.
- **Ejecuciones y evidencias:** registra resultados de pruebas manuales y adjunta archivos privados de hasta 2 MiB.
- **Equipos y proyectos:** colabora mediante invitaciones de un solo uso.
- **Dashboard, reportes y exportación:** consulta avances y descarga registros en Excel, PDF, Markdown o reportes CSV.
- **Diseñadores:** prepara casos a partir de ejemplos y bugs desde plantillas; revisa el contenido antes de guardarlo.

La IA y el cambio de imagen de perfil siguen siendo maquetas. Las pruebas se ejecutan manualmente.

## Stack tecnológico

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-24-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-4169E1?logo=postgresql&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-12-F69220?logo=pnpm&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-4-6E9F18?logo=vitest&logoColor=white)
![SwaggerUI](https://img.shields.io/badge/SwaggerUI-85EA2D?logo=swagger&logoColor=black)
![ExcelJS](https://img.shields.io/badge/ExcelJS-4-217346)
![jsPDF](https://img.shields.io/badge/jsPDF-4-E34F26)

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
