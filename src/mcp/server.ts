import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AnySchema } from "@modelcontextprotocol/sdk/server/zod-compat.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import {
  appendInputParamsSchema,
  appendInputResultSchema,
  clarifyIntentParamsSchema,
  clarifyIntentResultSchema,
  confirmDesignParamsSchema,
  confirmDesignResultSchema,
  createSessionParamsSchema,
  createSessionResultSchema,
  exportPackageParamsSchema,
  exportPackageResultSchema,
  generateDesignParamsSchema,
  generateDesignResultSchema,
  reviseDesignParamsSchema,
  reviseDesignResultSchema
} from "../schemas/tools.js";
import {
  appendInputTool,
  createSessionTool
} from "../tools/session-tools.js";
import { clarifyIntentTool } from "../tools/clarify-tools.js";
import { confirmDesignTool } from "../tools/confirm-tools.js";
import { exportPackageTool } from "../tools/export-tools.js";
import { generateDesignTool } from "../tools/generate-tools.js";
import { reviseDesignTool } from "../tools/revise-tools.js";

interface SpecDesignToolDefinition {
  name: string;
  title: string;
  description: string;
  inputSchema: AnySchema;
  outputSchema: AnySchema;
  handler: (input: unknown) => Promise<unknown>;
}

/** 中文说明：当前 v0 对外暴露的 MCP tool 名称，测试与文档共用。 */
export const specDesignToolNames = [
  "design.session.create",
  "design.session.append_input",
  "design.intent.clarify",
  "design.design.generate",
  "design.design.revise",
  "design.design.confirm",
  "design.export.package"
] as const;

const specDesignToolDefinitions: SpecDesignToolDefinition[] = [
  {
    name: "design.session.create",
    title: "Create design session",
    description: "Create a new design session for a single-page v0 design flow.",
    inputSchema: createSessionParamsSchema,
    outputSchema: createSessionResultSchema,
    handler: createSessionTool
  },
  {
    name: "design.session.append_input",
    title: "Append design input",
    description: "Append text or URL inputs to an existing design session.",
    inputSchema: appendInputParamsSchema,
    outputSchema: appendInputResultSchema,
    handler: appendInputTool
  },
  {
    name: "design.intent.clarify",
    title: "Clarify design intent",
    description: "Inspect accumulated inputs and return readiness plus missing intent fields.",
    inputSchema: clarifyIntentParamsSchema,
    outputSchema: clarifyIntentResultSchema,
    handler: clarifyIntentTool
  },
  {
    name: "design.design.generate",
    title: "Generate design",
    description: "Generate the first DesignDOMAST draft and local preview artifacts.",
    inputSchema: generateDesignParamsSchema,
    outputSchema: generateDesignResultSchema,
    handler: generateDesignTool
  },
  {
    name: "design.design.revise",
    title: "Revise design",
    description: "Create a new immutable design version from a natural-language revision.",
    inputSchema: reviseDesignParamsSchema,
    outputSchema: reviseDesignResultSchema,
    handler: reviseDesignTool
  },
  {
    name: "design.design.confirm",
    title: "Confirm design",
    description: "Mark an existing design version as the confirmed export baseline.",
    inputSchema: confirmDesignParamsSchema,
    outputSchema: confirmDesignResultSchema,
    handler: confirmDesignTool
  },
  {
    name: "design.export.package",
    title: "Export package",
    description: "Export a confirmed design version as the v0 static delivery package.",
    inputSchema: exportPackageParamsSchema,
    outputSchema: exportPackageResultSchema,
    handler: exportPackageTool
  }
];

function toMcpToolResult(result: unknown): CallToolResult {
  const structuredContent =
    result !== null && typeof result === "object" && !Array.isArray(result)
      ? (result as Record<string, unknown>)
      : { value: result };

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(structuredContent, null, 2)
      }
    ],
    structuredContent
  };
}

/** 中文说明：向 MCP server 注册当前 v0 的全部设计工具。 */
export function registerSpecDesignTools(server: McpServer): void {
  for (const toolDefinition of specDesignToolDefinitions) {
    server.registerTool(
      toolDefinition.name,
      {
        title: toolDefinition.title,
        description: toolDefinition.description,
        inputSchema: toolDefinition.inputSchema,
        outputSchema: toolDefinition.outputSchema
      },
      async (input: unknown) => toMcpToolResult(await toolDefinition.handler(input))
    );
  }
}

/** 中文说明：创建可连接任意 MCP transport 的 Spec Design MCP server。 */
export function createSpecDesignMcpServer(): McpServer {
  const server = new McpServer({
    name: "spec-design-mcp",
    version: "0.1.0"
  });

  registerSpecDesignTools(server);

  return server;
}
