import { DatabaseSync } from "node:sqlite";

import {
  ensureRuntimeDirectories,
  type RuntimePaths
} from "../../lib/runtime/paths.js";

export interface RuntimeDatabase {
  db: DatabaseSync;
  paths: RuntimePaths;
}

const createSessionsTableSql = `
  CREATE TABLE IF NOT EXISTS sessions (
    session_id TEXT PRIMARY KEY,
    project_name TEXT NOT NULL,
    goal TEXT NOT NULL,
    status TEXT NOT NULL,
    confirmed_version TEXT,
    inputs_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`;

/**
 * 中文说明：
 * 当前阶段只初始化最小 SQLite 元数据存储，不在这里夹带业务逻辑。
 */
export async function createRuntimeDatabase(rootDir = process.cwd()): Promise<RuntimeDatabase> {
  const paths = await ensureRuntimeDirectories(rootDir);
  const db = new DatabaseSync(paths.sqliteDbPath);

  db.exec(createSessionsTableSql);

  return { db, paths };
}
