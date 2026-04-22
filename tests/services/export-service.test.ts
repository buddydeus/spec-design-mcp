/** 中文说明：验证 export service 的最小交付包输出。 */
import { access, readFile, rm } from "node:fs/promises";

import { afterEach, describe, expect, it } from "vitest";

import { createConfirmService } from "../../src/services/conversation/confirm-service.js";
import { createExportService } from "../../src/services/export/export-service.js";
import { createGenerateService } from "../../src/services/conversation/generate-service.js";
import { createSessionService } from "../../src/services/conversation/session-service.js";
import { createSessionRepository } from "../../src/storage/session-repository.js";

const runtimeRoot = new URL("../../.runtime/", import.meta.url);

afterEach(async () => {
  await rm(runtimeRoot, { recursive: true, force: true });
});

describe("export service", () => {
  it("exports a confirmed design version into a minimal delivery package", async () => {
    const sessionService = await createSessionService();
    const generateService = await createGenerateService();
    const confirmService = await createConfirmService();
    const exportService = await createExportService();
    const session = await sessionService.createSession({
      projectName: "Acme",
      goal: "Landing page"
    });

    await sessionService.appendInput({
      sessionId: session.sessionId,
      inputs: [
        {
          type: "text",
          text: "Create a SaaS landing page for developers with a hero, features, pricing and primary CTA Start Free Trial"
        }
      ]
    });

    await generateService.generate({
      sessionId: session.sessionId
    });
    await confirmService.confirm({
      sessionId: session.sessionId,
      designVersion: "v1"
    });

    const result = await exportService.exportPackage({
      sessionId: session.sessionId,
      designVersion: "v1"
    });
    const sessionRepository = await createSessionRepository();
    const manifestPath = new URL(`../../${result.deliveryPackageRef}`, import.meta.url);
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
      artifacts: Array<{ artifactType: string }>;
    };
    const storedSession = await sessionRepository.getSession(session.sessionId);

    expect(result.deliveryPackageRef).toContain("artifact-manifest.json");
    expect(result.artifacts).toEqual([
      "artifact-manifest.json",
      "design-ast.json",
      "compiled.html",
      "compiled.css",
      "annotation-manifest.json",
      "binding.schema.json"
    ]);
    expect(manifest.artifacts).toHaveLength(6);
    expect(storedSession?.status).toBe("exported");
    await access(
      new URL(
        `../../.runtime/artifacts/${session.sessionId}/v1/export/compiled.html`,
        import.meta.url
      )
    );

    sessionRepository.close();
    sessionService.close();
    generateService.close();
    confirmService.close();
    exportService.close();
  });

  it("throws VERSION_NOT_CONFIRMED when exporting an unconfirmed version", async () => {
    const sessionService = await createSessionService();
    const generateService = await createGenerateService();
    const exportService = await createExportService();
    const session = await sessionService.createSession({
      projectName: "Acme",
      goal: "Landing page"
    });

    await sessionService.appendInput({
      sessionId: session.sessionId,
      inputs: [
        {
          type: "text",
          text: "Create a SaaS landing page for developers with a hero, features, pricing and primary CTA Start Free Trial"
        }
      ]
    });

    await generateService.generate({
      sessionId: session.sessionId
    });

    await expect(
      exportService.exportPackage({
        sessionId: session.sessionId,
        designVersion: "v1"
      })
    ).rejects.toThrow("VERSION_NOT_CONFIRMED");

    sessionService.close();
    generateService.close();
    exportService.close();
  });
});
