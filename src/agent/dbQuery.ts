import { logger } from "../middleware/logger.js";
// @ts-ignore
import Database from "better-sqlite3";
import path from "node:path";

const BLOCKED = ["DROP", "DELETE", "TRUNCATE", "ALTER", "CREATE", "INSERT", "UPDATE"];
const MAX_ROWS = 100;

export interface QueryResult { columns: string[]; rows: any[][]; rowCount: number; truncated: boolean; }

export function executeQuery(sql: string, dbPath?: string): QueryResult {
  const upper = sql.trim().toUpperCase();
  for (const kw of BLOCKED) { if (upper.startsWith(kw)) throw new Error(`Blocked: ${kw} not allowed. Only SELECT permitted.`); }
  if (!upper.startsWith("SELECT") && !upper.startsWith("PRAGMA") && !upper.startsWith("EXPLAIN")) throw new Error("Only SELECT/PRAGMA/EXPLAIN allowed.");
  const resolved = dbPath || path.join(process.cwd(), ".bibsclaw", "bibsclaw.db");
  logger.info(`DB query: ${sql.slice(0, 80)}`);
  const db = new Database(resolved, { readonly: true });
  try {
    const allRows = db.prepare(sql).all() as Record<string, any>[];
    const columns = allRows.length > 0 ? Object.keys(allRows[0]) : [];
    const truncated = allRows.length > MAX_ROWS;
    const rows = allRows.slice(0, MAX_ROWS).map((r) => columns.map((c) => r[c]));
    return { columns, rows, rowCount: allRows.length, truncated };
  } finally { db.close(); }
}

export function listTables(dbPath?: string): string[] {
  return executeQuery("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", dbPath).rows.map((r) => String(r[0]));
}

export function describeTable(name: string, dbPath?: string): QueryResult {
  return executeQuery(`PRAGMA table_info(${name.replace(/[^a-zA-Z0-9_]/g, "")})`, dbPath);
}
