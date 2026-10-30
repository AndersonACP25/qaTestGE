import pg from "pg";

export function databaseFailureHint(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  if (["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT"].includes(code) || code.startsWith("08"))
    return "PostgreSQL no está disponible; verifica que el servicio esté iniciado y DATABASE_URL.";
  if (["28P01", "28000"].includes(code))
    return "PostgreSQL rechazó la autenticación; revisa las credenciales locales de DATABASE_URL.";
  if (code === "3F000")
    return "No existe el esquema qa; en una base nueva, ejecuta pnpm db:setup una sola vez para instalar el esquema y las migraciones.";
  if (["42P01", "42703"].includes(code))
    return "Falta una tabla o columna requerida; verifica el esquema existente y ejecuta pnpm db:migrate. No reimportes 001_schema.sql sobre una base inicializada.";
  if (/^\w{5}$/.test(code))
    return `Error de PostgreSQL (código ${code}); revisa la configuración local.`;
  return "Revisa que PostgreSQL esté iniciado, DATABASE_URL sea válida y el esquema qa esté actualizado.";
}

export function createPool(connectionString: string): pg.Pool {
  const pool = new pg.Pool({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    statement_timeout: 10000,
  });
  // Never log a connection string, SQL parameters or raw database errors.
  pool.on("error", () => {
    console.error("Se perdió una conexión PostgreSQL inactiva.");
  });
  return pool;
}

export async function checkDatabase(pool: pg.Pool): Promise<void> {
  await pool.query(`SELECT p.id, o.id, b.id, c.id, s.id, r.id, rr.id, bc.bug_id, e.id, el.id
    FROM qa.projects p JOIN qa.organizations o ON o.id = p.organization_id
    LEFT JOIN qa.bugs b ON b.project_id = p.id
    LEFT JOIN qa.test_cases c ON c.project_id = p.id
    LEFT JOIN qa.test_case_steps s ON s.test_case_id = c.id
    LEFT JOIN qa.test_runs r ON r.project_id = p.id
    LEFT JOIN qa.test_run_results rr ON rr.test_run_id = r.id
    LEFT JOIN qa.bug_test_cases bc ON bc.bug_id = b.id
    LEFT JOIN qa.evidence e ON e.project_id = p.id
    LEFT JOIN qa.evidence_links el ON el.evidence_id = e.id LIMIT 0`);
  await pool.query("SELECT user_id,project_id,request_key FROM qa.creation_requests LIMIT 0");
  await pool.query("SELECT test_type,lifecycle,version FROM qa.test_cases LIMIT 0");
  await pool.query(
    "SELECT source_result_id,severity,environment,affected_version FROM qa.bugs LIMIT 0",
  );
  await pool.query("SELECT plan_id,source_run_id FROM qa.test_runs LIMIT 0");
  await pool.query("SELECT title_snapshot,case_version FROM qa.test_run_results LIMIT 0");
  await pool.query(
    "SELECT project_id,revision,states,transitions,closed_states FROM qa.project_bug_workflows LIMIT 0",
  );
  await pool.query("SELECT project_id,id,revision FROM qa.test_plans LIMIT 0");
  await pool.query("SELECT project_id,plan_id,test_case_id FROM qa.test_plan_cases LIMIT 0");
  await pool.query(
    "SELECT project_id,test_case_id,version,snapshot FROM qa.test_case_versions LIMIT 0",
  );
  await pool.query("SELECT 1");
  await pool.query(
    "SELECT u.id,s.token_hash,m.user_id FROM qa.users u LEFT JOIN qa.auth_sessions s ON s.user_id=u.id LEFT JOIN qa.organization_members m ON m.user_id=u.id LIMIT 0",
  );
  await pool.query("SELECT id,user_id FROM qa.bug_templates LIMIT 0");
  await pool.query(
    "SELECT id,project_id,test_case_id,kind,image_bytes FROM qa.test_case_attachments LIMIT 0",
  );
  await pool.query("SELECT id,media_type,file_bytes FROM qa.evidence LIMIT 0");
  await pool.query("SELECT id,project_id,name,color FROM qa.tags LIMIT 0");
  await pool.query("SELECT project_id,bug_id,tag_id FROM qa.bug_tags LIMIT 0");
  await pool.query("SELECT project_id,test_case_id,tag_id FROM qa.test_case_tags LIMIT 0");
  await pool.query("SELECT project_id,test_run_id,tag_id FROM qa.test_run_tags LIMIT 0");
  await pool.query("SELECT token_hash,organization_id,expires_at FROM qa.team_invitations LIMIT 0");
  await pool.query("SELECT assignee_user_id,assignee_organization_id FROM qa.bugs LIMIT 0");
  await pool.query("SELECT assignee_user_id,assignee_organization_id FROM qa.test_cases LIMIT 0");
}
