/** 中文说明：验证 Streamable HTTP MCP transport 入口。 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { describe, expect, it } from "vitest";

import {
  createSpecDesignHttpServer,
  readHttpServerOptionsFromEnv,
  specDesignToolNames
} from "../../src/index.js";

function listenOnRandomPort(server: ReturnType<typeof createSpecDesignHttpServer>): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      const address = server.address();

      if (!address || typeof address === "string") {
        reject(new Error("Expected TCP server address"));
        return;
      }

      resolve(address.port);
    });
  });
}

function closeServer(server: ReturnType<typeof createSpecDesignHttpServer>): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

describe("Spec Design HTTP MCP server", () => {
  it("reads HTTP transport options from environment", () => {
    expect(
      readHttpServerOptionsFromEnv({
        SPEC_DESIGN_MCP_HTTP_HOST: "0.0.0.0",
        SPEC_DESIGN_MCP_HTTP_PORT: "4321",
        SPEC_DESIGN_MCP_HTTP_PATH: "api/mcp"
      })
    ).toEqual({
      host: "0.0.0.0",
      port: 4321,
      mcpPath: "/api/mcp"
    });
  });

  it("serves health checks and MCP tools over stateless Streamable HTTP", async () => {
    const server = createSpecDesignHttpServer();
    const port = await listenOnRandomPort(server);
    const healthResponse = await fetch(`http://127.0.0.1:${port}/healthz`);

    expect(healthResponse.status).toBe(200);
    await expect(healthResponse.json()).resolves.toMatchObject({
      status: "ok",
      transport: "streamable-http",
      mcpPath: "/mcp"
    });

    const client = new Client({ name: "spec-design-mcp-http-test", version: "0.0.0" });
    const transport = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`));

    try {
      await client.connect(transport);
      const tools = await client.listTools();

      expect(tools.tools.map((tool) => tool.name)).toEqual([...specDesignToolNames]);
    } finally {
      await client.close();
      await closeServer(server);
    }
  });
});
