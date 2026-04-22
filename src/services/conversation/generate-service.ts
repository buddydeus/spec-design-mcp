import { z } from "zod";

import { clarifyIntentResultSchema, generateDesignResultSchema } from "../../schemas/tools.js";
import { createDesignVersionRepository, type DesignVersionRepository } from "../../storage/design-version-repository.js";
import { createSessionRepository, type SessionRepository } from "../../storage/session-repository.js";
import { createClarifyService } from "./clarify-service.js";
import { buildDesignAst } from "../ast/ast-builder.js";
import { createSectionSummary } from "../ast/section-summary.js";
import { createPreviewService } from "../preview/preview-service.js";

const generateDesignParamsSchema = z.object({
  sessionId: z.string().min(1)
});

type GenerateDesignParams = z.infer<typeof generateDesignParamsSchema>;
type GenerateDesignResult = z.infer<typeof generateDesignResultSchema>;

export interface GenerateService {
  generate(params: GenerateDesignParams): Promise<GenerateDesignResult>;
  close(): void;
}

/**
 * 中文说明：
 * generate service 负责把 ready intent 转成首版 AST，并持久化为 v1 版本。
 */
export async function createGenerateService(
  sessionRepository?: SessionRepository,
  designVersionRepository?: DesignVersionRepository
): Promise<GenerateService> {
  const runtimeSessionRepository = sessionRepository ?? (await createSessionRepository());
  const runtimeVersionRepository =
    designVersionRepository ?? (await createDesignVersionRepository());
  const clarifyService = await createClarifyService(runtimeSessionRepository);
  const previewService = await createPreviewService();

  return {
    async generate(params) {
      const validatedParams = generateDesignParamsSchema.parse(params);
      const clarifyResult = clarifyIntentResultSchema.parse(
        await clarifyService.clarify({ sessionId: validatedParams.sessionId })
      );

      if (!clarifyResult.isReady) {
        throw new Error("CLARIFICATION_REQUIRED");
      }

      const designAst = buildDesignAst(clarifyResult.interimIntentModel);
      const sectionSummary = createSectionSummary(designAst);
      const previewResult = await previewService.generatePreview({
        sessionId: validatedParams.sessionId,
        designVersion: "v1",
        designAst,
        sectionSummary
      });

      await runtimeVersionRepository.saveVersion({
        sessionId: validatedParams.sessionId,
        designVersion: "v1",
        baseVersion: null,
        sourceType: "generate",
        designAst,
        sectionSummary,
        diffSummary: [],
        nodeDiffs: [],
        previewRef: previewResult.previewRef
      });

      return generateDesignResultSchema.parse({
        designVersion: "v1",
        designAst,
        sectionSummary,
        previewRef: previewResult.previewRef,
        previewArtifacts: previewResult.previewArtifacts
      });
    },
    close() {
      clarifyService.close();
      previewService.close();
      runtimeVersionRepository.close();
    }
  };
}
