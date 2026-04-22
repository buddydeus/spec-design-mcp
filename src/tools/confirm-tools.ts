import {
  confirmDesignParamsSchema,
  confirmDesignResultSchema
} from "../schemas/tools.js";
import { createConfirmService } from "../services/conversation/confirm-service.js";

/** 中文说明：design.design.confirm 的本地 handler。 */
export async function confirmDesignTool(input: unknown) {
  const params = confirmDesignParamsSchema.parse(input);
  const service = await createConfirmService();

  try {
    const result = await service.confirm(params);

    return confirmDesignResultSchema.parse(result);
  } finally {
    service.close();
  }
}
