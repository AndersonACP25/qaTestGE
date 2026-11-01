import { readFile } from "node:fs/promises";
import type { PoolClient } from "pg";

export const migrationFiles = [
  "004_authentication.sql",
  "005_bug_templates.sql",
  "006_optional_test_suite.sql",
  "007_test_case_attachments.sql",
  "008_evidence_files.sql",
  "009_tags.sql",
  "010_team_invitations.sql",
  "011_qa_assignments.sql",
  "012_creation_requests.sql",
  "013_quality_workflows.sql",
  "014_collaboration_permissions.sql",
  "015_analytics_coverage.sql",
  "016_self_mentions.sql",
] as const;

/** Initial install and upgrades share one ordered source; no seed or deletion. */
export async function applyMigrations(
  client: Pick<PoolClient, "query">,
  initialize: boolean,
  log: (message: string) => void = () => {},
): Promise<void> {
  await client.query("SELECT pg_advisory_lock(hashtext('qaTestGE:install'))");
  try {
    if (initialize) {
      const schema = await client.query<{ present: boolean }>(
        "SELECT to_regnamespace('qa') IS NOT NULL AS present",
      );
      if (!schema.rows[0]?.present) {
        await client.query(
          await readFile(new URL("../sql/001_schema.sql", import.meta.url), "utf8"),
        );
        log("Esquema inicial instalado.");
      }
    }
    // Refuse an unrelated/partial qa schema before attempting any upgrade.
    await client.query(
      "SELECT p.id, o.id FROM qa.projects p JOIN qa.organizations o ON o.id = p.organization_id LIMIT 0",
    );
    for (const filename of migrationFiles) {
      if (
        filename.startsWith("013") ||
        filename.startsWith("014") ||
        filename.startsWith("015") ||
        filename.startsWith("016")
      ) {
        const existing = await client.query<{ present: boolean }>(
          "SELECT EXISTS(SELECT 1 FROM qa.schema_migrations WHERE version=$1) AS present",
          [filename.replace(".sql", "")],
        );
        if (existing.rows[0]?.present) {
          log(`Migración ${filename} aplicada/verificada.`);
          continue;
        }
      }
      await client.query(await readFile(new URL(`../sql/${filename}`, import.meta.url), "utf8"));
      log(`Migración ${filename} aplicada/verificada.`);
    }
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.query("SELECT pg_advisory_unlock(hashtext('qaTestGE:install'))");
  }
}
