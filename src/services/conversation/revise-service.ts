import { z } from "zod";

import { reviseDesignParamsSchema, reviseDesignResultSchema } from "../../schemas/tools.js";
import { createAstDiff } from "../ast/ast-diff.js";
import { reviseDesignAst } from "../ast/ast-reviser.js";
import { createSectionSummary } from "../ast/section-summary.js";
import {
  createDesignVersionRepository,
  type DesignVersionRepository
} from "../../storage/design-version-repository.js";
import { createPreviewService } from "../preview/preview-service.js";

type ReviseDesignParams = z.infer<typeof reviseDesignParamsSchema>;
type ReviseDesignResult = z.infer<typeof reviseDesignResultSchema>;

export interface ReviseService {
  revise(params: ReviseDesignParams): Promise<ReviseDesignResult>;
  close(): void;
}

function getNextDesignVersion(currentVersion: string): string {
  const currentNumber = Number.parseInt(currentVersion.replace(/^v/, ""), 10);

  return `v${currentNumber + 1}`;
}

/**
 * 中文说明：
 * revise service 在最新草稿上执行受限修订，负责版本冲突校验和新版本持久化。
 */
export async function createReviseService(
  designVersionRepository?: DesignVersionRepository
): Promise<ReviseService> {
  const runtimeVersionRepository =
    designVersionRepository ?? (await createDesignVersionRepository());
  const previewService = await createPreviewService();

  return {
    async revise(params) {
      const validatedParams = reviseDesignParamsSchema.parse(params);
      const baseVersion = await runtimeVersionRepository.getVersion(
        validatedParams.sessionId,
        validatedParams.baseVersion
      );

      if (!baseVersion) {
        throw new Error("VERSION_NOT_FOUND");
      }

      const latestVersion = await runtimeVersionRepository.getLatestVersion(validatedParams.sessionId);

      if (!latestVersion || latestVersion.designVersion !== validatedParams.baseVersion) {
        throw new Error("VERSION_CONFLICT");
      }

      const revisedAstResult = reviseDesignAst(
        baseVersion.designAst,
        validatedParams.revisionInstruction
      );
      const nextVersion = getNextDesignVersion(latestVersion.designVersion);
      const sectionSummary = createSectionSummary(revisedAstResult.designAst);
      const diffResult = createAstDiff(revisedAstResult.operations);
      const previewResult = await previewService.generatePreview({
        sessionId: validatedParams.sessionId,
        designVersion: nextVersion,
        designAst: revisedAstResult.designAst,
        sectionSummary
      });

      await runtimeVersionRepository.saveVersion({
        sessionId: validatedParams.sessionId,
        designVersion: nextVersion,
        baseVersion: validatedParams.baseVersion,
        sourceType: "revise",
        designAst: revisedAstResult.designAst,
        sectionSummary,
        diffSummary: diffResult.diffSummary,
        nodeDiffs: diffResult.nodeDiffs,
        previewRef: previewResult.previewRef
      });

      return reviseDesignResultSchema.parse({
        baseVersion: validatedParams.baseVersion,
        newVersion: nextVersion,
        designAst: revisedAstResult.designAst,
        diffSummary: diffResult.diffSummary,
        nodeDiffs: diffResult.nodeDiffs,
        previewRef: previewResult.previewRef,
        previewArtifacts: previewResult.previewArtifacts
      });
    },
    close() {
      previewService.close();
      runtimeVersionRepository.close();
    }
  };
}
