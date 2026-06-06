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
        SPEC_DESIGN_MCP_HTTP_PATH: "api/mcp",
        SPEC_DESIGN_MCP_HTTP_AUTH_TOKEN: "mvp-token",
        SPEC_DESIGN_MCP_HTTP_ALLOWED_ORIGINS: "https://app.example.test, https://admin.example.test",
        SPEC_DESIGN_MCP_HTTP_RATE_LIMIT_WINDOW_MS: "90000",
        SPEC_DESIGN_MCP_HTTP_RATE_LIMIT_MAX_REQUESTS: "30"
      })
    ).toEqual({
      host: "0.0.0.0",
      port: 4321,
      mcpPath: "/api/mcp",
      authToken: "mvp-token",
      allowedOrigins: ["https://app.example.test", "https://admin.example.test"],
      rateLimitWindowMs: 90_000,
      rateLimitMaxRequests: 30
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

  it("requires bearer auth when an HTTP auth token is configured", async () => {
    const server = createSpecDesignHttpServer({
      authToken: "mvp-token"
    });
    const port = await listenOnRandomPort(server);
    const mcpUrl = `http://127.0.0.1:${port}/mcp`;

    try {
      const unauthorizedResponse = await fetch(mcpUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: "{}"
      });

      expect(unauthorizedResponse.status).toBe(401);
      expect(unauthorizedResponse.headers.get("www-authenticate")).toBe("Bearer");

      const client = new Client({
        name: "spec-design-mcp-http-auth-test",
        version: "0.0.0"
      });
      const transport = new StreamableHTTPClientTransport(new URL(mcpUrl), {
        requestInit: {
          headers: {
            Authorization: "Bearer mvp-token"
          }
        }
      });

      try {
        await client.connect(transport);
        const tools = await client.listTools();

        expect(tools.tools.map((tool) => tool.name)).toEqual([...specDesignToolNames]);
      } finally {
        await client.close();
      }
    } finally {
      await closeServer(server);
    }
  });

  it("returns CORS headers only for configured browser origins", async () => {
    const server = createSpecDesignHttpServer({
      allowedOrigins: ["https://app.example.test"]
    });
    const port = await listenOnRandomPort(server);
    const mcpUrl = `http://127.0.0.1:${port}/mcp`;

    try {
      const allowedPreflight = await fetch(mcpUrl, {
        method: "OPTIONS",
        headers: {
          origin: "https://app.example.test"
        }
      });

      expect(allowedPreflight.status).toBe(204);
      expect(allowedPreflight.headers.get("access-control-allow-origin")).toBe(
        "https://app.example.test"
      );

      const blockedResponse = await fetch(mcpUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://blocked.example.test"
        },
        body: "{}"
      });

      expect(blockedResponse.status).toBe(403);
    } finally {
      await closeServer(server);
    }
  });

  it("rate limits MCP requests by remote address", async () => {
    const server = createSpecDesignHttpServer({
      rateLimitWindowMs: 60_000,
      rateLimitMaxRequests: 1
    });
    const port = await listenOnRandomPort(server);
    const mcpUrl = `http://127.0.0.1:${port}/mcp`;

    try {
      const firstResponse = await fetch(mcpUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: "{}"
      });
      const secondResponse = await fetch(mcpUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: "{}"
      });

      expect(firstResponse.status).not.toBe(429);
      expect(secondResponse.status).toBe(429);
    } finally {
      await closeServer(server);
    }
  });
});
