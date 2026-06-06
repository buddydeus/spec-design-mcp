#!/usr/bin/env node
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { pathToFileURL } from "node:url";

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { createSpecDesignMcpServer } from "./mcp/server.js";

export const httpServerEnvVars = {
  host: "SPEC_DESIGN_MCP_HTTP_HOST",
  port: "SPEC_DESIGN_MCP_HTTP_PORT",
  path: "SPEC_DESIGN_MCP_HTTP_PATH",
  authToken: "SPEC_DESIGN_MCP_HTTP_AUTH_TOKEN",
  allowedOrigins: "SPEC_DESIGN_MCP_HTTP_ALLOWED_ORIGINS",
  rateLimitWindowMs: "SPEC_DESIGN_MCP_HTTP_RATE_LIMIT_WINDOW_MS",
  rateLimitMaxRequests: "SPEC_DESIGN_MCP_HTTP_RATE_LIMIT_MAX_REQUESTS"
} as const;

export interface SpecDesignHttpServerOptions {
  host?: string;
  port?: number;
  mcpPath?: string;
  authToken?: string;
  allowedOrigins?: string[];
  rateLimitWindowMs?: number;
  rateLimitMaxRequests?: number;
}

export interface StartedSpecDesignHttpServer {
  server: Server;
  host: string;
  port: number;
  mcpPath: string;
  url: string;
  close(): Promise<void>;
}

const defaultHttpServerOptions = {
  host: "127.0.0.1",
  port: 3010,
  mcpPath: "/mcp",
  allowedOrigins: [] as string[],
  rateLimitWindowMs: 60_000,
  rateLimitMaxRequests: 120
} as const;

interface RateLimitEntry {
  windowStartedAt: number;
  requestCount: number;
}

function parsePort(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 65_535 ? parsed : fallback;
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function normalizeMcpPath(path: string | undefined): string {
  if (!path || path.trim().length === 0) {
    return defaultHttpServerOptions.mcpPath;
  }

  return path.startsWith("/") ? path : `/${path}`;
}

export function readHttpServerOptionsFromEnv(
  env: NodeJS.ProcessEnv = process.env
): Required<SpecDesignHttpServerOptions> {
  return {
    host: env[httpServerEnvVars.host] ?? defaultHttpServerOptions.host,
    port: parsePort(env[httpServerEnvVars.port], defaultHttpServerOptions.port),
    mcpPath: normalizeMcpPath(env[httpServerEnvVars.path]),
    authToken: env[httpServerEnvVars.authToken] ?? "",
    allowedOrigins: parseAllowedOrigins(env[httpServerEnvVars.allowedOrigins]),
    rateLimitWindowMs: parsePositiveInteger(
      env[httpServerEnvVars.rateLimitWindowMs],
      defaultHttpServerOptions.rateLimitWindowMs
    ),
    rateLimitMaxRequests: parsePositiveInteger(
      env[httpServerEnvVars.rateLimitMaxRequests],
      defaultHttpServerOptions.rateLimitMaxRequests
    )
  };
}

function parseAllowedOrigins(value: string | undefined): string[] {
  if (!value) {
    return defaultHttpServerOptions.allowedOrigins;
  }

  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function writeJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  if (res.headersSent) {
    return;
  }

  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8"
  });
  res.end(JSON.stringify(payload));
}

function writeJsonRpcError(res: ServerResponse, statusCode: number, message: string): void {
  writeJson(res, statusCode, {
    jsonrpc: "2.0",
    error: {
      code: -32_000,
      message
    },
    id: null
  });
}

function getRequestOrigin(req: IncomingMessage): string | null {
  const origin = req.headers.origin;

  return typeof origin === "string" && origin.length > 0 ? origin : null;
}

function isOriginAllowed(origin: string | null, allowedOrigins: string[]): boolean {
  if (!origin || allowedOrigins.length === 0) {
    return true;
  }

  return allowedOrigins.includes("*") || allowedOrigins.includes(origin);
}

function applyCorsHeaders(
  req: IncomingMessage,
  res: ServerResponse,
  allowedOrigins: string[]
): void {
  const origin = getRequestOrigin(req);

  if (!origin || allowedOrigins.length === 0 || !isOriginAllowed(origin, allowedOrigins)) {
    return;
  }

  res.setHeader("access-control-allow-origin", allowedOrigins.includes("*") ? "*" : origin);
  res.setHeader("access-control-allow-methods", "POST, OPTIONS");
  res.setHeader(
    "access-control-allow-headers",
    "authorization, content-type, last-event-id, mcp-protocol-version, mcp-session-id"
  );
  res.setHeader("vary", "origin");
}

function isAuthorized(req: IncomingMessage, authToken: string): boolean {
  if (!authToken) {
    return true;
  }

  return req.headers.authorization === `Bearer ${authToken}`;
}

function getRateLimitKey(req: IncomingMessage): string {
  return req.socket.remoteAddress ?? "unknown";
}

function pruneExpiredRateLimits(
  rateLimits: Map<string, RateLimitEntry>,
  now: number,
  windowMs: number
): void {
  for (const [key, entry] of rateLimits) {
    if (now - entry.windowStartedAt >= windowMs) {
      rateLimits.delete(key);
    }
  }
}

function isRateLimited(
  req: IncomingMessage,
  rateLimits: Map<string, RateLimitEntry>,
  options: Required<Pick<SpecDesignHttpServerOptions, "rateLimitMaxRequests" | "rateLimitWindowMs">>
): boolean {
  if (options.rateLimitMaxRequests <= 0 || options.rateLimitWindowMs <= 0) {
    return false;
  }

  const now = Date.now();
  const key = getRateLimitKey(req);
  const existing = rateLimits.get(key);

  if (!existing || now - existing.windowStartedAt >= options.rateLimitWindowMs) {
    pruneExpiredRateLimits(rateLimits, now, options.rateLimitWindowMs);
    rateLimits.set(key, {
      windowStartedAt: now,
      requestCount: 1
    });
    return false;
  }

  existing.requestCount += 1;

  return existing.requestCount > options.rateLimitMaxRequests;
}

function getRequestPath(req: IncomingMessage): string {
  const host = req.headers.host ?? "127.0.0.1";
  const url = new URL(req.url ?? "/", `http://${host}`);

  return url.pathname;
}

async function handleMcpRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== "POST") {
    writeJsonRpcError(res, 405, "Method not allowed. Use POST for stateless Streamable HTTP MCP requests.");
    return;
  }

  const server = createSpecDesignMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res);
  } catch (error) {
    console.error("Spec Design MCP HTTP request failed:", error);
    writeJsonRpcError(res, 500, "Internal server error");
  } finally {
    await transport.close();
    await server.close();
  }
}

/** 中文说明：创建 stateless Streamable HTTP MCP server，默认只暴露 /mcp 与 /healthz。 */
export function createSpecDesignHttpServer(options: SpecDesignHttpServerOptions = {}): Server {
  const mcpPath = normalizeMcpPath(options.mcpPath ?? defaultHttpServerOptions.mcpPath);
  const authToken = options.authToken ?? "";
  const allowedOrigins = options.allowedOrigins ?? defaultHttpServerOptions.allowedOrigins;
  const rateLimitWindowMs =
    options.rateLimitWindowMs ?? defaultHttpServerOptions.rateLimitWindowMs;
  const rateLimitMaxRequests =
    options.rateLimitMaxRequests ?? defaultHttpServerOptions.rateLimitMaxRequests;
  const rateLimits = new Map<string, RateLimitEntry>();

  return createServer((req, res) => {
    const requestPath = getRequestPath(req);
    applyCorsHeaders(req, res, allowedOrigins);

    if (requestPath === "/healthz") {
      writeJson(res, 200, {
        status: "ok",
        transport: "streamable-http",
        mcpPath
      });
      return;
    }

    if (requestPath !== mcpPath) {
      writeJson(res, 404, {
        error: "Not Found"
      });
      return;
    }

    if (!isOriginAllowed(getRequestOrigin(req), allowedOrigins)) {
      writeJson(res, 403, {
        error: "Origin not allowed"
      });
      return;
    }

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (!isAuthorized(req, authToken)) {
      res.setHeader("www-authenticate", "Bearer");
      writeJsonRpcError(res, 401, "Unauthorized");
      return;
    }

    if (
      isRateLimited(req, rateLimits, {
        rateLimitMaxRequests,
        rateLimitWindowMs
      })
    ) {
      writeJsonRpcError(res, 429, "Too many requests");
      return;
    }

    handleMcpRequest(req, res).catch((error: unknown) => {
      console.error("Spec Design MCP HTTP handler failed:", error);
      writeJsonRpcError(res, 500, "Internal server error");
    });
  });
}

export async function startSpecDesignHttpServer(
  options: SpecDesignHttpServerOptions = {}
): Promise<StartedSpecDesignHttpServer> {
  const envOptions = readHttpServerOptionsFromEnv();
  const resolvedOptions = {
    ...envOptions,
    ...options,
    mcpPath: normalizeMcpPath(options.mcpPath ?? envOptions.mcpPath)
  };
  const server = createSpecDesignHttpServer(resolvedOptions);

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(resolvedOptions.port, resolvedOptions.host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address();
  const port = typeof address === "object" && address ? address.port : resolvedOptions.port;
  const url = `http://${resolvedOptions.host}:${port}${resolvedOptions.mcpPath}`;

  return {
    server,
    host: resolvedOptions.host,
    port,
    mcpPath: resolvedOptions.mcpPath,
    url,
    close() {
      return new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }
  };
}

/** 中文说明：以 Streamable HTTP transport 启动 MCP server，供远程或本地 HTTP 客户端联调。 */
export async function main(): Promise<void> {
  const started = await startSpecDesignHttpServer();

  console.error(`Spec Design MCP HTTP server running at ${started.url}`);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";

if (import.meta.url === invokedPath) {
  main().catch((error: unknown) => {
    console.error("Spec Design MCP HTTP server failed:", error);
    process.exit(1);
  });
}
