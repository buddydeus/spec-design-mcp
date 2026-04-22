import { z } from "zod";

import {
  confirmDesignParamsSchema,
  confirmDesignResultSchema
} from "../../schemas/tools.js";
import {
  createDesignVersionRepository,
  type DesignVersionRepository
} from "../../storage/design-version-repository.js";
import {
  createSessionRepository,
  type SessionRepository
} from "../../storage/session-repository.js";

type ConfirmDesignParams = z.infer<typeof confirmDesignParamsSchema>;
type ConfirmDesignResult = z.infer<typeof confirmDesignResultSchema>;

export interface ConfirmService {
  confirm(params: ConfirmDesignParams): Promise<ConfirmDesignResult>;
  close(): void;
}

/**
 * 中文说明：
 * confirm service 只负责确认某个已存在版本，并把会话状态推进到 confirmed。
 */
export async function createConfirmService(
  sessionRepository?: SessionRepository,
  designVersionRepository?: DesignVersionRepository
): Promise<ConfirmService> {
  const runtimeSessionRepository = sessionRepository ?? (await createSessionRepository());
  const runtimeVersionRepository =
    designVersionRepository ?? (await createDesignVersionRepository());

  return {
    async confirm(params) {
      const validatedParams = confirmDesignParamsSchema.parse(params);
      const designVersion = await runtimeVersionRepository.getVersion(
        validatedParams.sessionId,
        validatedParams.designVersion
      );

      if (!designVersion) {
        throw new Error("VERSION_NOT_FOUND");
      }

      const confirmedSession = await runtimeSessionRepository.confirmVersion(
        validatedParams.sessionId,
        validatedParams.designVersion
      );

      return confirmDesignResultSchema.parse({
        confirmedVersion: validatedParams.designVersion,
        status: confirmedSession.status
      });
    },
    close() {
      runtimeSessionRepository.close();
      runtimeVersionRepository.close();
    }
  };
}
