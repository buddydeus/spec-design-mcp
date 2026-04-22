import {
  clarifyIntentParamsSchema,
  clarifyIntentResultSchema
} from "../schemas/tools.js";
import { createClarifyService } from "../services/conversation/clarify-service.js";

/** 中文说明：design.intent.clarify 的本地 handler。 */
export async function clarifyIntentTool(input: unknown) {
  const params = clarifyIntentParamsSchema.parse(input);
  const service = await createClarifyService();

  try {
    const result = await service.clarify(params);

    return clarifyIntentResultSchema.parse(result);
  } finally {
    service.close();
  }
}
