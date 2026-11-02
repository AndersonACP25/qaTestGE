// Requires a NEW, empty disposable database. Never loads .env or clears an existing schema.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { createPool } from "../src/database.js";
import { applyMigrations, migrationFiles } from "../src/migrations.js";
if (!process.env.TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL efímero requerido.");
const pool = createPool(process.env.TEST_DATABASE_URL),
  client = await pool.connect();
try {
  assert.equal(
    (await client.query("SELECT to_regnamespace('qa') AS schema")).rows[0].schema,
    null,
    "Esta prueba requiere una base efímera vacía.",
  );
  await client.query(await readFile(new URL("../sql/001_schema.sql", import.meta.url), "utf8"));
  for (const migration of migrationFiles.filter((name) => !name.startsWith("018")))
    await client.query(await readFile(new URL(`../sql/${migration}`, import.meta.url), "utf8"));
  const users: string[] = [];
  for (const name of ["Único", "Duplicado", "Duplicado"]) {
    const created = await client.query<{ id: string }>(
      "INSERT INTO qa.users(name,email,password_hash) VALUES($1,$2,'non-login fixture') RETURNING id::text",
      [name, `${randomUUID()}@example.test`],
    );
    users.push(created.rows[0].id);
  }
  const organization = (
    await client.query<{ id: string }>(
      "INSERT INTO qa.organizations(name) VALUES('Equipo de actualización') RETURNING id::text",
    )
  ).rows[0].id;
  for (const [i, id] of users.entries())
    await client.query(
      "INSERT INTO qa.organization_members(organization_id,user_id,role) VALUES($1,$2,$3)",
      [organization, id, i === 0 ? "owner" : "member"],
    );
  const project = (
    await client.query<{ id: string }>(
      "INSERT INTO qa.projects(organization_id,name) VALUES($1,'Proyecto anterior a 018') RETURNING id::text",
      [organization],
    )
  ).rows[0].id;
  for (const id of users.slice(1))
    await client.query(
      "INSERT INTO qa.project_members(project_id,organization_id,user_id,role) VALUES($1,$2,$3,'QA')",
      [project, organization, id],
    );
  for (const owner of ["Único", "Duplicado", "No registrado"])
    await client.query("INSERT INTO qa.test_runs(project_id,title,owner) VALUES($1,$2,$3)", [
      project,
      `Anterior ${owner}`,
      owner,
    ]);
  await applyMigrations(client, false);
  await applyMigrations(client, false);
  const result = await client.query<{ owner: string; owner_user_id: string | null; title: string }>(
    "SELECT owner,owner_user_id::text,title FROM qa.test_runs WHERE project_id=$1 ORDER BY id",
    [project],
  );
  assert.equal(result.rows.length, 3);
  assert.equal(result.rows[0].owner_user_id, users[0]);
  assert.equal(result.rows[1].owner_user_id, null);
  assert.equal(result.rows[2].owner_user_id, null);
  assert.equal(result.rows[1].title, "Anterior Duplicado");
  assert.equal(
    (
      await client.query(
        "SELECT count(*)::int AS n FROM qa.schema_migrations WHERE version='018_run_assignments'",
      )
    ).rows[0].n,
    1,
  );
  console.info(
    "Actualización 017→018 repetida: conserva registros y no atribuye responsables con nombres ambiguos o sin cuenta.",
  );
} finally {
  client.release();
  await pool.end();
}
