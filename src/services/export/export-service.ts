import { z } from "zod";

import { artifactManifestSchema } from "../../schemas/artifacts.js";
import { exportPackageParamsSchema, exportPackageResultSchema } from "../../schemas/tools.js";
import {
  createDesignVersionRepository,
  type DesignVersionRepository
} from "../../storage/design-version-repository.js";
import { writeArtifactFile } from "../../storage/file-artifact-store.js";
import {
  createSessionRepository,
  type SessionRepository
} from "../../storage/session-repository.js";
import { getNowIsoString } from "../../lib/runtime/ids.js";
import { buildAnnotationManifest } from "./annotation-builder.js";
import { buildBindingSchema } from "./binding-builder.js";
import { emitCompiledCss } from "./css-emitter.js";
import { renderCompiledHtml } from "./html-exporter.js";

type ExportPackageParams = z.infer<typeof exportPackageParamsSchema>;
type ExportPackageResult = z.infer<typeof exportPackageResultSchema>;

/** 中文说明：export service 的最小调用接口。 */
export interface ExportService {
  exportPackage(params: ExportPackageParams): Promise<ExportPackageResult>;
  close(): void;
}

/**
 * 中文说明：
 * export service 只允许导出已确认版本，并生成 v0 最小静态交付包。
 */
export async function createExportService(
  sessionRepository?: SessionRepository,
  designVersionRepository?: DesignVersionRepository
): Promise<ExportService> {
  const runtimeSessionRepository = sessionRepository ?? (await createSessionRepository());
  const runtimeVersionRepository =
    designVersionRepository ?? (await createDesignVersionRepository());

  return {
    async exportPackage(params) {
      const validatedParams = exportPackageParamsSchema.parse(params);
      const session = await runtimeSessionRepository.getSession(validatedParams.sessionId);

      if (!session) {
        throw new Error(`Session not found: ${validatedParams.sessionId}`);
      }

      const designVersion = await runtimeVersionRepository.getVersion(
        validatedParams.sessionId,
        validatedParams.designVersion
      );

      if (!designVersion) {
        throw new Error("VERSION_NOT_FOUND");
      }

      if (session.confirmedVersion !== validatedParams.designVersion) {
        throw new Error("VERSION_NOT_CONFIRMED");
      }

      // v0 导出包固定落在版本目录下的 export 子目录，便于人工检查与自动消费。
      const basePath = `${validatedParams.sessionId}/${validatedParams.designVersion}/export`;
      const compiledHtml = renderCompiledHtml(designVersion.designAst);
      const compiledCss = emitCompiledCss();
      const annotationManifest = buildAnnotationManifest(designVersion.designAst);
      const bindingSchema = buildBindingSchema(designVersion.designAst);
      const designAstJson = JSON.stringify(designVersion.designAst, null, 2);

      const artifactItems = [
        {
          artifactType: "artifact-manifest.json" as const,
          filePath: `.runtime/artifacts/${basePath}/artifact-manifest.json`
        },
        {
          artifactType: "design-ast.json" as const,
          filePath: `.runtime/artifacts/${basePath}/design-ast.json`
        },
        {
          artifactType: "compiled.html" as const,
          filePath: `.runtime/artifacts/${basePath}/compiled.html`
        },
        {
          artifactType: "compiled.css" as const,
          filePath: `.runtime/artifacts/${basePath}/compiled.css`
        },
        {
          artifactType: "annotation-manifest.json" as const,
          filePath: `.runtime/artifacts/${basePath}/annotation-manifest.json`
        },
        {
          artifactType: "binding.schema.json" as const,
          filePath: `.runtime/artifacts/${basePath}/binding.schema.json`
        }
      ];
      const artifactManifest = artifactManifestSchema.parse({
        sessionId: validatedParams.sessionId,
        designVersion: validatedParams.designVersion,
        generatedAt: getNowIsoString(),
        artifacts: artifactItems
      });

      await writeArtifactFile({
        relativePath: `${basePath}/design-ast.json`,
        contents: designAstJson
      });
      await writeArtifactFile({
        relativePath: `${basePath}/compiled.html`,
        contents: compiledHtml
      });
      await writeArtifactFile({
        relativePath: `${basePath}/compiled.css`,
        contents: compiledCss
      });
      await writeArtifactFile({
        relativePath: `${basePath}/annotation-manifest.json`,
        contents: JSON.stringify(annotationManifest, null, 2)
      });
      await writeArtifactFile({
        relativePath: `${basePath}/binding.schema.json`,
        contents: JSON.stringify(bindingSchema, null, 2)
      });
      await writeArtifactFile({
        relativePath: `${basePath}/artifact-manifest.json`,
        contents: JSON.stringify(artifactManifest, null, 2)
      });
      await runtimeSessionRepository.markExported(validatedParams.sessionId);

      return exportPackageResultSchema.parse({
        deliveryPackageRef: `.runtime/artifacts/${basePath}/artifact-manifest.json`,
        artifactManifest,
        artifacts: artifactItems.map((item) => item.artifactType)
      });
    },
    close() {
      runtimeSessionRepository.close();
      runtimeVersionRepository.close();
    }
  };
}
