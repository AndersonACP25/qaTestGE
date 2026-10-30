import type { QueryResult, QueryResultRow } from "pg";
export interface DatabaseClient {
  query<R extends QueryResultRow = QueryResultRow>(
    sql: string,
    values?: unknown[],
  ): Promise<QueryResult<R>>;
  release(): void;
}
export interface DatabasePool {
  query<R extends QueryResultRow = QueryResultRow>(
    sql: string,
    values?: unknown[],
  ): Promise<QueryResult<R>>;
  connect(): Promise<DatabaseClient>;
}
/** Context belongs to the transaction, never to a pooled session or a global variable. */
export function actorDatabase(
  pool: DatabasePool,
  actorId: string,
  requestId: string,
): DatabasePool {
  const context = (client: DatabaseClient) =>
    client.query("SELECT set_config('qa.actor_id',$1,true),set_config('qa.request_id',$2,true)", [
      actorId,
      requestId,
    ]);
  return {
    async query<R extends QueryResultRow>(
      sql: string,
      values?: unknown[],
    ): Promise<QueryResult<R>> {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await context(client);
        const result = await client.query<R>(sql, values);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
    async connect() {
      const client = await pool.connect();
      return {
        async query<R extends QueryResultRow>(
          sql: string,
          values?: unknown[],
        ): Promise<QueryResult<R>> {
          const result = await client.query<R>(sql, values);
          if (sql.trim().toUpperCase() === "BEGIN") await context(client);
          return result;
        },
        release: () => client.release(),
      };
    },
  };
}
