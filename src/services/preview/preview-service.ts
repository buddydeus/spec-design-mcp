import { designAstSchema } from "../../schemas/ast.js";
import { getArtifactRef } from "../../lib/runtime/paths.js";
import { writeArtifactFile } from "../../storage/file-artifact-store.js";
import { createVisualDiff, createVisualSnapshot } from "../compiler/visual-snapshot.js";
import { renderPreviewHtml } from "./html-renderer.js";

/** 中文说明：生成 preview 所需的最小输入结构。 */
export interface GeneratePreviewInput {
  sessionId: string;
  designVersion: string;
  designAst: ReturnType<typeof designAstSchema.parse>;
  baseDesignAst?: unknown;
  sectionSummary: string[];
}

/** 中文说明：preview 产物引用及文件名列表。 */
export interface GeneratePreviewResult {
  previewRef: string;
  previewArtifacts: string[];
}

/** 中文说明：preview service 的最小调用接口。 */
export interface PreviewService {
  generatePreview(input: GeneratePreviewInput): Promise<GeneratePreviewResult>;
  close(): void;
}

/**
 * 中文说明：
 * preview service 只负责从 AST 派生本地预览产物，不承担版本编排职责。
 */
export async function createPreviewService(): Promise<PreviewService> {
  return {
    async generatePreview(input) {
      const validatedAst = designAstSchema.parse(input.designAst);
      const basePath = `${input.sessionId}/${input.designVersion}`;
      const previewHtml = renderPreviewHtml(validatedAst);
      const visualSnapshot = createVisualSnapshot(validatedAst);
      const previewArtifacts = ["preview.html", "section-summary.json", "visual-snapshot.json"];

      await writeArtifactFile({
        relativePath: `${basePath}/preview.html`,
        contents: previewHtml
      });
      await writeArtifactFile({
        relativePath: `${basePath}/section-summary.json`,
        contents: JSON.stringify(input.sectionSummary, null, 2)
      });
      await writeArtifactFile({
        relativePath: `${basePath}/visual-snapshot.json`,
        contents: JSON.stringify(visualSnapshot, null, 2)
      });

      if (input.baseDesignAst) {
        const baseSnapshot = createVisualSnapshot(input.baseDesignAst);
        const visualDiff = createVisualDiff(baseSnapshot, visualSnapshot);
        previewArtifacts.push("visual-diff.json");
        await writeArtifactFile({
          relativePath: `${basePath}/visual-diff.json`,
          contents: JSON.stringify(visualDiff, null, 2)
        });
      }

      return {
        previewRef: getArtifactRef(`${basePath}/preview.html`),
        previewArtifacts
      };
    },
    close() {
      return;
    }
  };
}
