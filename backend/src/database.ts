import pg from "pg";

export function createPool(connectionString: string): pg.Pool {
  const pool = new pg.Pool({ connectionString, max: 10, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000, statement_timeout: 10000 });
  // Never log a connection string, SQL parameters or raw database errors.
  pool.on("error", () => { console.error("Se perdió una conexión PostgreSQL inactiva."); });
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
  await pool.query("SELECT 1");
  await pool.query("SELECT u.id,s.token_hash,m.user_id FROM qa.users u LEFT JOIN qa.auth_sessions s ON s.user_id=u.id LEFT JOIN qa.organization_members m ON m.user_id=u.id LIMIT 0");
}
