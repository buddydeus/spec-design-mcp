import {
  appendInputParamsSchema,
  appendInputResultSchema,
  createSessionParamsSchema,
  createSessionResultSchema
} from "../schemas/tools.js";
import { createSessionService } from "../services/conversation/session-service.js";

/** 中文说明：design.session.create 的本地 handler。 */
export async function createSessionTool(input: unknown) {
  const params = createSessionParamsSchema.parse(input);
  const service = await createSessionService();

  try {
    const result = await service.createSession(params);

    return createSessionResultSchema.parse(result);
  } finally {
    service.close();
  }
}

/** 中文说明：design.session.append_input 的本地 handler。 */
export async function appendInputTool(input: unknown) {
  const params = appendInputParamsSchema.parse(input);
  const service = await createSessionService();

  try {
    const result = await service.appendInput(params);

    return appendInputResultSchema.parse(result);
  } finally {
    service.close();
  }
}
