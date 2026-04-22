import { generateDesignParamsSchema, generateDesignResultSchema } from "../schemas/tools.js";
import { createGenerateService } from "../services/conversation/generate-service.js";

/** 中文说明：design.design.generate 的本地 handler。 */
export async function generateDesignTool(input: unknown) {
  const params = generateDesignParamsSchema.parse(input);
  const service = await createGenerateService();

  try {
    const result = await service.generate(params);

    return generateDesignResultSchema.parse(result);
  } finally {
    service.close();
  }
}
