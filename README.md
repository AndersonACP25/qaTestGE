# qaTestGE

Una plataforma para organizar el trabajo de QA de tu equipo: bugs, casos de prueba, ejecuciones manuales y evidencias, conectados dentro de cada proyecto.

<img width="1920" height="1007" alt="image" src="https://github.com/user-attachments/assets/eae6f7ae-0621-408b-aa02-7b2fc4c57543" />

<img width="1920" height="1007" alt="image" src="https://github.com/user-attachments/assets/ac8bbae0-7ff1-47ee-b8a2-c10884b06ff3" />

<img width="1920" height="1007" alt="image" src="https://github.com/user-attachments/assets/51df3a44-407e-4d17-a249-91fb8ce25abc" />

<img width="1920" height="1007" alt="image" src="https://github.com/user-attachments/assets/54a8b5a2-b68d-42ef-9c1b-a35e04398bf5" />

## Qué ofrece

- **Bugs y casos de prueba:** registra incidencias, documenta pasos, asigna responsables y organiza el trabajo con tags.
- **Ejecuciones y evidencias:** registra resultados manuales, crea bugs enlazados desde fallos y adjunta archivos privados de hasta 2 MiB.
- **Test Plan:** agrupa casos, clona ejecuciones o reejecuta solo los fallidos conservando los pasos originales.
- **Casos versionados e importación:** tipo de prueba independiente, Borrador/Listo/Obsoleto, historial e importación revisada de CSV/Excel.
- **Flujo de bugs por proyecto:** estados y transiciones configurables, severidad, entorno y versión afectada.
- **Comentarios y menciones:** conversa en bugs, casos y ejecuciones; selecciona a la persona tras @ o escribe su nombre completo único. Mis menciones y la campana del navbar comparten los avisos del proyecto. Abrir un registro no cambia su lectura: se marca explícitamente con el botón verde. Incluye automenciones, filtros, lectura masiva de todos los avisos propios e historial de actividad.
- **Configuración:** reúne Proyectos, Equipos, Accesos al proyecto, Flujo de bugs y Actividad y auditoría con sus permisos vigentes; el rol del proyecto se identifica mediante un badge.
- **Roles y auditoría:** Admin, QA, Dev y Solo lectura por proyecto, con registro persistente de cambios. Admin puede crear cuentas y asignarles un rol únicamente en el proyecto actual. Auditoría ofrece perfiles General/Calidad/Seguridad y filtros en servidor.
- **Work Items:** detalles de bugs, casos, ejecuciones y evidencias con identidad, navegación por secciones y panel de propiedades. Test Plan separa planificación y catálogo.
- **Evidencias:** selecciona o arrastra archivos al registro, al bug o al resultado de una ejecución; máximo 2 MiB y descarga privada.
- **Equipos y proyectos:** colabora mediante invitaciones de un solo uso.
- **Dashboard visual y analítica:** indicadores resumidos, tendencias de aprobación y bugs, fallos frecuentes y cobertura por tipo con agregaciones PostgreSQL.
- **Cobertura de requisitos:** vincula requisitos, casos y bugs en una matriz paginada.
- **Importación Excel:** botón Importar en Bugs, Casos y Tags, vista previa, [plantilla](public/templates/plantilla-qaTestGE.xlsx) y [guía](public/templates/guia-importacion.md) descargables.
- **Informes compartibles:** exporta cada ejecución desde su fila o detalle a PDF con sus snapshots, notas y referencias de evidencia.
- **Diseñadores:** prepara casos a partir de ejemplos y bugs desde plantillas; revisa el contenido y confirma **Guardar en Bugs** para crearlos en el mantenimiento, incluidos borradores antiguos.
- **Texto con formato:** los campos de texto largo incluyen negrita, cursiva, tachado, código, listas, citas y vista previa. Se conserva como Markdown y se representa sin HTML.

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

La migración **015** incorpora analítica y requisitos; la **016** recupera avisos de automenciones existentes sin duplicarlos ni cambiar su estado de lectura. Antes de iniciar una instalación existente ejecuta `pnpm db:migrate`. Consulta [definiciones y límites de las métricas](docs/analytics.md).

## Accesos y verificación del CORE

En Configuración → Accesos al proyecto, un Admin puede agregar integrantes registrados y activos del equipo, consultar/buscar usuarios con acceso, editar su rol (Admin, QA, Dev o Solo lectura) y retirar su acceso a ese proyecto. Los nuevos integrantes se incorporan desde Equipos; esta pantalla no crea ni modifica cuentas globales. El propietario conserva su acceso; antes de retirar a un responsable hay que reasignar sus bugs/casos. Los cambios concurrentes exigen actualizar la lista.

Dashboard encabeza el menú lateral y presenta 0/0% cuando no hay indicadores evaluables, sin convertir fechas desconocidas en datos históricos. Las tarjetas separan encabezados, contenido y acciones. Las pruebas unitarias priorizan reglas del CORE, seguridad e integridad; [TESTING](docs/TESTING.md) y AGENTS.md describen qué validar y qué revisar en navegador.
