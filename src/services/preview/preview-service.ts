import { designAstSchema } from "../../schemas/ast.js";
import { writeArtifactFile } from "../../storage/file-artifact-store.js";
import { renderPreviewHtml } from "./html-renderer.js";

export interface GeneratePreviewInput {
  sessionId: string;
  designVersion: string;
  designAst: ReturnType<typeof designAstSchema.parse>;
  sectionSummary: string[];
}

export interface GeneratePreviewResult {
  previewRef: string;
  previewArtifacts: string[];
}

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

      await writeArtifactFile({
        relativePath: `${basePath}/preview.html`,
        contents: previewHtml
      });
      await writeArtifactFile({
        relativePath: `${basePath}/section-summary.json`,
        contents: JSON.stringify(input.sectionSummary, null, 2)
      });

      return {
        previewRef: `.runtime/artifacts/${basePath}/preview.html`,
        previewArtifacts: ["preview.html", "section-summary.json"]
      };
    },
    close() {
      return;
    }
  };
}
