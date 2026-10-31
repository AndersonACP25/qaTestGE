import { test, expect, navigate, noHorizontalOverflow } from "./fixture";
import type {
  Comment,
  Activity,
  ProjectMember,
} from "../../backend/src/models/collaboration.model";
const date = "2026-10-30T12:00:00.000Z";
const members: ProjectMember[] = [
  { id: "1", name: "QA Local", role: "Admin", owner: true, revision: 0 },
  { id: "2", name: "María Dev", role: "Dev", owner: false, revision: 1 },
];
test.beforeEach(async ({ page, workspace }) => {
  void workspace;
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
});
test("publica comentario con mención, lo edita y consulta actividad", async ({ page }) => {
  let comments: Comment[] = [];
  let events: Activity[] = [];
  await page.route("**/api/project-members?*", (route) =>
    route.fulfill({ json: { data: members } }),
  );
  await page.route("**/api/activity?*", (route) => route.fulfill({ json: { data: events } }));
  await page.route("**/api/comments**", async (route) => {
    const method = route.request().method();
    if (method === "POST") {
      const b = route.request().postDataJSON();
      comments = [
        {
          id: "CMT-001",
          projectId: "1",
          target: b.target,
          body: b.body,
          version: 1,
          authorId: "1",
          authorName: "QA Local",
          createdAt: date,
          editedAt: null,
          deletedAt: null,
          mentions: [{ id: "2", name: "María Dev" }],
        },
      ];
      events = [
        {
          id: "1",
          projectId: "1",
          kind: "bug",
          resourceId: "BUG-001",
          action: "comments.insert",
          actorId: "1",
          actorName: "QA Local",
          createdAt: date,
          requestId: "test-request",
          before: null,
          after: { body: b.body },
        },
      ];
      await route.fulfill({ status: 201, json: { data: comments[0] } });
    } else if (method === "PATCH") {
      const b = route.request().postDataJSON();
      comments = [{ ...comments[0], body: b.body, version: 2, editedAt: date }];
      await route.fulfill({ json: { data: comments[0] } });
    } else await route.fulfill({ json: { data: comments } });
  });
  await navigate(page, "Bugs");
  await page.locator(".bug-title").first().click();
  await page.getByLabel("Nuevo comentario", { exact: true }).fill("Revisar @Mar");
  await page.getByRole("button", { name: "@María Dev", exact: true }).click();
  await expect(page.getByLabel("Nuevo comentario", { exact: true })).toHaveValue(
    "Revisar @[María Dev](user:2) ",
  );
  await page.getByRole("button", { name: "Publicar comentario", exact: true }).click();
  await expect(page.locator(".collaboration__mention")).toHaveText("@María Dev");
  await expect(page.getByText("Comentario publicado.", { exact: true })).toBeVisible();
  expect(comments).toHaveLength(1);
  await page.getByRole("button", { name: "Editar comentario", exact: true }).click();
  await page
    .getByLabel("Editar comentario", { exact: true })
    .fill("Contenido revisado @[María Dev](user:2)");
  await page.getByRole("button", { name: "Guardar comentario", exact: true }).click();
  await expect(page.locator(".collaboration__body")).toContainText("Contenido revisado");
  await expect(page.getByText("Comentario actualizado.", { exact: true })).toBeVisible();
  await page.getByText("Ver historial de actividad del registro", { exact: true }).click();
  await expect(page.locator(".collaboration__activity")).toContainText("Comentario creado");
  await noHorizontalOverflow(page);
});
test("Solo lectura consulta sin controles de escritura", async ({ page }) => {
  await page.route("**/api/projects", (route) =>
    route.fulfill({
      json: {
        data: [
          { id: "1", organizationId: "1", name: "Consulta", description: "", role: "Solo lectura" },
        ],
      },
    }),
  );
  await page.reload();
  await navigate(page, "Bugs");
  await expect(page.getByRole("button", { name: "Nuevo bug", exact: true })).toBeDisabled();
  await expect(page.getByRole("combobox", { name: "Cambiar estado de BUG-001" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Editar BUG-001", exact: true })).toHaveCount(0);
  await page.locator(".bug-title").first().click();
  await expect(page.getByRole("button", { name: "Editar bug", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Publicar comentario", exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByText("Tu rol permite consultar esta conversación.", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await navigate(page, "Configuración");
  await expect(page.getByRole("button", { name: "Accesos al proyecto", exact: true })).toHaveCount(
    0,
  );
  await noHorizontalOverflow(page);
});
test("Admin cambia un rol y una mención abre el recurso", async ({ page }) => {
  let current = members.map((m) => ({ ...m }));
  let read = false;
  await page.route("**/api/project-members**", async (route) => {
    if (route.request().method() === "PUT") {
      const b = route.request().postDataJSON();
      current = current.map((m) =>
        m.id === "2" ? { ...m, role: b.role, revision: m.revision + 1 } : m,
      );
      await route.fulfill({ status: 204 });
    } else await route.fulfill({ json: { data: current } });
  });
  await page.route("**/api/mention-notifications**", async (route) => {
    if (route.request().method() === "PATCH") {
      read = true;
      await route.fulfill({ status: 204 });
    } else
      await route.fulfill({
        json: {
          data: [
            {
              id: "NTF-001",
              commentId: "CMT-001",
              target: { kind: "bug", id: "BUG-001" },
              authorName: "María Dev",
              createdAt: date,
              readAt: read ? date : null,
            },
          ],
        },
      });
  });
  await navigate(page, "Accesos al proyecto");
  const member = page.getByRole("article", { name: "Acceso de María Dev", exact: true });
  await member.getByRole("button", { name: "Editar rol", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Rol de María Dev", exact: true })
    .selectOption("Solo lectura");
  await page.getByRole("button", { name: "Guardar rol", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(member.locator(".role-badge")).toHaveText("Solo lectura");
  expect(current[1].role).toBe("Solo lectura");
  await navigate(page, "Mis menciones");
  await expect(page.getByText(/Sin leer/)).toBeVisible();
  await page.getByRole("button", { name: "Abrir registro", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect.poll(() => read).toBe(true);
  await noHorizontalOverflow(page);
});
test("una respuesta tardía de comentarios no aparece en otro proyecto", async ({ page }) => {
  await page.route("**/api/projects", (route) =>
    route.fulfill({
      json: {
        data: [
          { id: "1", organizationId: "1", name: "Proyecto A", description: "", role: "Admin" },
          { id: "2", organizationId: "1", name: "Proyecto B", description: "", role: "Admin" },
        ],
      },
    }),
  );
  let release!: () => void;
  let started!: () => void;
  const waiting = new Promise<void>((r) => {
    release = r;
  });
  const requested = new Promise<void>((r) => {
    started = r;
  });
  await page.route("**/api/comments**", async (route) => {
    if (new URL(route.request().url()).searchParams.get("projectId") === "1") {
      started();
      await waiting;
      await route.fulfill({
        json: {
          data: [
            {
              id: "CMT-001",
              projectId: "1",
              target: { kind: "bug", id: "BUG-001" },
              authorId: "1",
              authorName: "QA Local",
              body: "Solo de A",
              version: 1,
              createdAt: date,
              editedAt: null,
              deletedAt: null,
              mentions: [],
            },
          ],
        },
      });
    } else await route.fulfill({ json: { data: [] } });
  });
  await page.reload();
  await navigate(page, "Bugs");
  await page.locator(".bug-title").first().click();
  await requested;
  await page.keyboard.press("Escape");
  await page.getByRole("combobox", { name: "Proyecto", exact: true }).selectOption("2");
  release();
  await expect(page.getByRole("combobox", { name: "Proyecto", exact: true })).toHaveValue("2");
  await page.locator(".bug-title").first().click();
  await expect(page.getByText("Aún no hay comentarios.", { exact: true })).toBeVisible();
  await expect(page.getByText("Solo de A", { exact: true })).toHaveCount(0);
});
