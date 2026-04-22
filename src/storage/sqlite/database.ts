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

const createDesignVersionsTableSql = `
  CREATE TABLE IF NOT EXISTS design_versions (
    session_id TEXT NOT NULL,
    design_version TEXT NOT NULL,
    base_version TEXT,
    source_type TEXT NOT NULL,
    design_ast_json TEXT NOT NULL,
    section_summary_json TEXT NOT NULL,
    diff_summary_json TEXT NOT NULL,
    node_diffs_json TEXT NOT NULL,
    preview_ref TEXT,
    created_at TEXT NOT NULL,
    PRIMARY KEY (session_id, design_version)
  )
`;

/**
 * 中文说明：
 * 当前阶段只初始化最小 SQLite 元数据存储，不在这里夹带业务逻辑。
 */
export async function createRuntimeDatabase(rootDir = process.cwd()): Promise<RuntimeDatabase> {
  const paths = await ensureRuntimeDirectories(rootDir);
  const db = new DatabaseSync(paths.sqliteDbPath);

  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA busy_timeout = 5000");
  db.exec(createSessionsTableSql);
  db.exec(createDesignVersionsTableSql);

  return { db, paths };
}
