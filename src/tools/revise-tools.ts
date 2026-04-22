import {
  reviseDesignParamsSchema,
  reviseDesignResultSchema
} from "../schemas/tools.js";
import { createReviseService } from "../services/conversation/revise-service.js";

/** 中文说明：design.design.revise 的本地 handler。 */
export async function reviseDesignTool(input: unknown) {
  const params = reviseDesignParamsSchema.parse(input);
  const service = await createReviseService();

  try {
    const result = await service.revise(params);

    return reviseDesignResultSchema.parse(result);
  } finally {
    service.close();
  }
}
