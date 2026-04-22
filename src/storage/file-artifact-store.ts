import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

/** 中文说明：写入单个本地产物文件时需要的参数。 */
export interface ArtifactWriteInput {
  relativePath: string;
  contents: string;
}

/**
 * 中文说明：
 * 统一负责把本地产物写入 `.runtime/artifacts`，避免服务层直接散落写文件。
 */
export async function writeArtifactFile(
  input: ArtifactWriteInput,
  rootDir = process.cwd()
): Promise<string> {
  const filePath = resolve(rootDir, ".runtime", "artifacts", input.relativePath);

  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, input.contents, "utf8");

  return filePath;
}
