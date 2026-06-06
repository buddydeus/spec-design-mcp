#!/usr/bin/env node
import { pathToFileURL } from "node:url";

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createSpecDesignMcpServer } from "./mcp/server.js";

/** 中文说明：以 stdio transport 启动本地 MCP server，供 MCP 客户端按进程方式拉起。 */
export async function main(): Promise<void> {
  const server = createSpecDesignMcpServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);
  console.error("Spec Design MCP server running on stdio");
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";

if (import.meta.url === invokedPath) {
  main().catch((error: unknown) => {
    console.error("Spec Design MCP server failed:", error);
    process.exit(1);
  });
}
