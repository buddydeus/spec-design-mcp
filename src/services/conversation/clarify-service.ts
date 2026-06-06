import { z } from "zod";

import type { IntentProvider } from "../../providers/llm/intent-provider.js";
import { createConfiguredIntentProvider } from "../../providers/llm/provider-config.js";
import { parseUrlSignal } from "../../providers/parser/url-parser.js";
import { createSessionRepository, type SessionRepository } from "../../storage/session-repository.js";
import {
  clarifyIntentParamsSchema,
  clarifyIntentResultSchema
} from "../../schemas/tools.js";

type ClarifyIntentParams = z.infer<typeof clarifyIntentParamsSchema>;
type ClarifyIntentResult = z.infer<typeof clarifyIntentResultSchema>;

/** 中文说明：clarify service 的最小调用接口。 */
export interface ClarifyService {
  clarify(params: ClarifyIntentParams): Promise<ClarifyIntentResult>;
  close(): void;
}

/**
 * 中文说明：
 * clarify service 编排会话输入和 intent provider，默认使用本地 rule-based fallback。
 */
export async function createClarifyService(
  repository?: SessionRepository,
  intentProvider: IntentProvider = createConfiguredIntentProvider()
): Promise<ClarifyService> {
  const sessionRepository = repository ?? (await createSessionRepository());

  return {
    async clarify(params) {
      const validatedParams = clarifyIntentParamsSchema.parse(params);
      const session = await sessionRepository.getSession(validatedParams.sessionId);

      if (!session) {
        throw new Error(`Session not found: ${validatedParams.sessionId}`);
      }

      const textInputs = session.inputs
        .filter((input): input is Extract<(typeof session.inputs)[number], { type: "text" }> => input.type === "text")
        .map((input) => input.text);
      const urlInputs = session.inputs
        .filter((input): input is Extract<(typeof session.inputs)[number], { type: "url" }> => input.type === "url")
        .map((input) => parseUrlSignal(input.url));
      const intentResult = await intentProvider.extractIntent({
        goal: session.goal,
        textInputs,
        urlSignals: urlInputs
      });

      return clarifyIntentResultSchema.parse({
        isReady: intentResult.missingFields.length === 0,
        missingFields: intentResult.missingFields,
        questions: intentResult.questions,
        interimIntentModel: intentResult.intentModel
      });
    },
    close() {
      sessionRepository.close();
    }
  };
}
