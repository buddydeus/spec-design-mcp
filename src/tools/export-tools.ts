import {
  exportPackageParamsSchema,
  exportPackageResultSchema
} from "../schemas/tools.js";
import { createExportService } from "../services/export/export-service.js";

/** 中文说明：design.export.package 的本地 handler。 */
export async function exportPackageTool(input: unknown) {
  const params = exportPackageParamsSchema.parse(input);
  const service = await createExportService();

  try {
    const result = await service.exportPackage(params);

    return exportPackageResultSchema.parse(result);
  } finally {
    service.close();
  }
}
