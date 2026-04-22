import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

/** 中文说明：运行时目录与 SQLite 文件的统一路径集合。 */
export interface RuntimePaths {
  runtimeRoot: string;
  sqliteDir: string;
  sessionsDir: string;
  artifactsDir: string;
  exportsDir: string;
  sqliteDbPath: string;
}

/**
 * 中文说明：
 * 所有运行时路径都从当前项目根目录统一派生，避免后续模块各自拼接路径。
 */
export function getRuntimePaths(rootDir = process.cwd()): RuntimePaths {
  const runtimeRoot = resolve(rootDir, ".runtime");
  const sqliteDir = resolve(runtimeRoot, "sqlite");
  const sessionsDir = resolve(runtimeRoot, "sessions");
  const artifactsDir = resolve(runtimeRoot, "artifacts");
  const exportsDir = resolve(runtimeRoot, "exports");

  return {
    runtimeRoot,
    sqliteDir,
    sessionsDir,
    artifactsDir,
    exportsDir,
    sqliteDbPath: resolve(sqliteDir, "spec-design-mcp.db")
  };
}

/**
 * 中文说明：
 * 运行前统一确保本地目录存在，并返回后续模块可复用的路径集合。
 */
export async function ensureRuntimeDirectories(rootDir = process.cwd()): Promise<RuntimePaths> {
  const paths = getRuntimePaths(rootDir);

  await Promise.all([
    mkdir(paths.sqliteDir, { recursive: true }),
    mkdir(paths.sessionsDir, { recursive: true }),
    mkdir(paths.artifactsDir, { recursive: true }),
    mkdir(paths.exportsDir, { recursive: true })
  ]);

  return paths;
}
