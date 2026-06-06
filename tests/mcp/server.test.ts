/** 中文说明：验证 MCP server 工厂会注册当前 v0 的全部工具。 */
import { rm } from "node:fs/promises";

import type { RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";
import { afterEach, describe, expect, it } from "vitest";

import {
  createSpecDesignMcpServer,
  specDesignToolNames
} from "../../src/mcp/server.js";

type ToolHandler = (
  input: unknown,
  extra: never
) => Promise<{
  content: Array<{ type: string; text?: string }>;
  structuredContent?: Record<string, unknown>;
}>;

const runtimeRoot = new URL("../../.runtime/", import.meta.url);

function getRegisteredTools(server: unknown): Record<string, RegisteredTool> {
  return (server as { _registeredTools: Record<string, RegisteredTool> })._registeredTools;
}

afterEach(async () => {
  await rm(runtimeRoot, { recursive: true, force: true });
});

describe("Spec Design MCP server", () => {
  it("registers the v0 tool surface", () => {
    const server = createSpecDesignMcpServer();
    const registeredTools = getRegisteredTools(server);

    expect(Object.keys(registeredTools)).toEqual([...specDesignToolNames]);

    for (const toolName of specDesignToolNames) {
      expect(registeredTools[toolName]?.inputSchema).toBeDefined();
      expect(registeredTools[toolName]?.outputSchema).toBeDefined();
      expect(registeredTools[toolName]?.enabled).toBe(true);
    }
  });

  it("returns structured MCP content from registered tools", async () => {
    const server = createSpecDesignMcpServer();
    const registeredTools = getRegisteredTools(server);
    const createSession = registeredTools["design.session.create"];

    const handler = createSession!.handler as ToolHandler;
    const result = await handler(
      {
        projectName: "Acme",
        goal: "Build landing page"
      },
      {} as never
    );

    expect(result.structuredContent).toMatchObject({
      status: "created"
    });
    expect(result.content[0]).toMatchObject({
      type: "text"
    });
  });
});
