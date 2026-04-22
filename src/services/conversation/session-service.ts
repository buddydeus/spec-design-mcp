import { z } from "zod";

import { createSessionId } from "../../lib/runtime/ids.js";
import { createSessionRepository, type SessionRepository } from "../../storage/session-repository.js";
import {
  appendInputParamsSchema,
  appendInputResultSchema,
  createSessionParamsSchema,
  createSessionResultSchema
} from "../../schemas/tools.js";

type CreateSessionParams = z.infer<typeof createSessionParamsSchema>;
type CreateSessionResult = z.infer<typeof createSessionResultSchema>;
type AppendInputParams = z.infer<typeof appendInputParamsSchema>;
type AppendInputResult = z.infer<typeof appendInputResultSchema>;

export interface SessionService {
  createSession(params: CreateSessionParams): Promise<CreateSessionResult>;
  appendInput(params: AppendInputParams): Promise<AppendInputResult>;
  close(): void;
}

/**
 * 中文说明：
 * session service 负责 create / append_input 的最小业务编排。
 * 它不关心 MCP 协议细节，只负责驱动 repository 和返回稳定结构。
 */
export async function createSessionService(
  repository?: SessionRepository
): Promise<SessionService> {
  const sessionRepository = repository ?? (await createSessionRepository());

  return {
    /**
     * 中文说明：
     * 创建新的会话并持久化初始状态。
     */
    async createSession(params) {
      const validatedParams = createSessionParamsSchema.parse(params);
      const sessionId = createSessionId();

      await sessionRepository.createSession({
        sessionId,
        projectName: validatedParams.projectName,
        goal: validatedParams.goal,
        status: "created"
      });

      return createSessionResultSchema.parse({
        sessionId,
        status: "created"
      });
    },
    /**
     * 中文说明：
     * 追加输入时只做最小状态推进：成功写入后进入 collecting_inputs。
     */
    async appendInput(params) {
      const validatedParams = appendInputParamsSchema.parse(params);
      const existingSession = await sessionRepository.getSession(validatedParams.sessionId);

      if (!existingSession) {
        throw new Error(`Session not found: ${validatedParams.sessionId}`);
      }

      const updatedSession = await sessionRepository.appendInputs(
        validatedParams.sessionId,
        validatedParams.inputs
      );

      return appendInputResultSchema.parse({
        acceptedInputs: updatedSession.inputs.slice(existingSession.inputs.length),
        updatedStatus: updatedSession.status
      });
    },
    close() {
      sessionRepository.close();
    }
  };
}
