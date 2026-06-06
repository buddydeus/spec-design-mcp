import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

export const runtimeDirEnvVar = "SPEC_DESIGN_MCP_RUNTIME_DIR";

/** 中文说明：运行时目录与 SQLite 文件的统一路径集合。 */
export interface RuntimePaths {
  runtimeRoot: string;
  sqliteDir: string;
  sessionsDir: string;
  artifactsDir: string;
  exportsDir: string;
  sqliteDbPath: string;
}

function getRuntimeRoot(rootDir: string): string {
  const configuredRuntimeDir = process.env[runtimeDirEnvVar];

  return configuredRuntimeDir && configuredRuntimeDir.trim().length > 0
    ? resolve(configuredRuntimeDir)
    : resolve(rootDir, ".runtime");
}

/**
 * 中文说明：
 * 所有运行时路径都从统一 runtime root 派生；可通过 SPEC_DESIGN_MCP_RUNTIME_DIR 覆盖默认 `.runtime`。
 */
export function getRuntimePaths(rootDir = process.cwd()): RuntimePaths {
  const runtimeRoot = getRuntimeRoot(rootDir);
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
 * 默认 runtime 下返回现有 `.runtime/artifacts/...` 引用；自定义 runtime 下返回真实绝对路径。
 */
export function getArtifactRef(relativePath: string, rootDir = process.cwd()): string {
  const paths = getRuntimePaths(rootDir);

  if (process.env[runtimeDirEnvVar]) {
    return resolve(paths.artifactsDir, relativePath);
  }

  return `.runtime/artifacts/${relativePath}`;
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
