import { Buffer } from "node:buffer";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/** 中文说明：URL 输入在本地规则解析后的最小语义结果。 */
export interface ParsedUrlSignal {
  normalizedUrl: string;
  hostname: string;
  path: string;
  summaryText: string;
  sourceType: "url_metadata" | "url_fetched_metadata" | "external_url_parser" | "unparsed_url";
  fallbackReason: string | null;
}

export const urlParserEnvVars = {
  parserMode: "SPEC_DESIGN_MCP_URL_PARSER",
  externalEndpoint: "SPEC_DESIGN_MCP_URL_PARSER_ENDPOINT",
  externalApiKey: "SPEC_DESIGN_MCP_URL_PARSER_API_KEY",
  externalTimeoutMs: "SPEC_DESIGN_MCP_URL_PARSER_TIMEOUT_MS",
  fetchMode: "SPEC_DESIGN_MCP_URL_FETCH",
  fetchTimeoutMs: "SPEC_DESIGN_MCP_URL_FETCH_TIMEOUT_MS",
  fetchMaxBytes: "SPEC_DESIGN_MCP_URL_FETCH_MAX_BYTES"
} as const;

export type UrlParserMode = "local" | "external";
export type UrlFetchMode = "off" | "metadata";

export interface UrlFetchPolicy {
  mode: UrlFetchMode;
  timeoutMs: number;
  maxBytes: number;
}

export interface ExternalUrlParserConfig {
  parserMode: UrlParserMode;
  endpoint?: string;
  apiKey?: string;
  timeoutMs: number;
}

export interface ResolveUrlSignalOptions
  extends Partial<UrlFetchPolicy>,
    Partial<ExternalUrlParserConfig> {
  fetchFn?: typeof fetch;
}

const defaultUrlFetchPolicy: UrlFetchPolicy = {
  mode: "off",
  timeoutMs: 2_000,
  maxBytes: 64_000
};

const defaultExternalParserConfig: ExternalUrlParserConfig = {
  parserMode: "local",
  timeoutMs: 2_000
};

/**
 * 中文说明：
 * 默认只做最小标准化和可读文本化；远端 metadata 抓取必须显式启用。
 */
export function parseUrlSignal(input: string): ParsedUrlSignal {
  try {
    const parsed = new URL(input);
    const path = parsed.pathname === "/" ? "" : parsed.pathname;
    const summaryText = `${parsed.hostname}${path}`.replace(/[/-]+/g, " ").trim();

    return {
      normalizedUrl: parsed.toString(),
      hostname: parsed.hostname,
      path,
      summaryText,
      sourceType: "url_metadata",
      fallbackReason: "URL content was not fetched; intent signal is derived from hostname and path only."
    };
  } catch {
    return {
      normalizedUrl: input,
      hostname: "",
      path: "",
      summaryText: input.replace(/[/:.-]+/g, " ").trim(),
      sourceType: "unparsed_url",
      fallbackReason: "URL could not be parsed; preserving raw input as a weak intent signal."
    };
  }
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function readUrlFetchPolicyFromEnv(env: NodeJS.ProcessEnv = process.env): UrlFetchPolicy {
  return {
    mode: env[urlParserEnvVars.fetchMode] === "metadata" ? "metadata" : "off",
    timeoutMs: parsePositiveInteger(env[urlParserEnvVars.fetchTimeoutMs], defaultUrlFetchPolicy.timeoutMs),
    maxBytes: parsePositiveInteger(env[urlParserEnvVars.fetchMaxBytes], defaultUrlFetchPolicy.maxBytes)
  };
}

export function readExternalUrlParserConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env
): ExternalUrlParserConfig {
  return {
    parserMode: env[urlParserEnvVars.parserMode] === "external" ? "external" : "local",
    endpoint: env[urlParserEnvVars.externalEndpoint],
    apiKey: env[urlParserEnvVars.externalApiKey],
    timeoutMs: parsePositiveInteger(
      env[urlParserEnvVars.externalTimeoutMs],
      defaultExternalParserConfig.timeoutMs
    )
  };
}

export function createConfiguredUrlSignalResolver(
  env: NodeJS.ProcessEnv = process.env,
  fetchFn: typeof fetch = fetch
): (input: string) => Promise<ParsedUrlSignal> {
  const policy = readUrlFetchPolicyFromEnv(env);
  const externalParserConfig = readExternalUrlParserConfigFromEnv(env);

  return (input) =>
    resolveUrlSignal(input, {
      ...policy,
      ...externalParserConfig,
      fetchFn
    });
}

const externalParserMaxResponseBytes = 64_000;

function isPrivateOrLoopbackIPv4(first: number, second: number): boolean {
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    first >= 224
  );
}

function parseIpv4MappedAddress(address: string): [number, number, number, number] | null {
  const dotted = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);

  if (dotted) {
    const parts = dotted[1]!.split(".").map((part) => Number.parseInt(part, 10));

    if (parts.length === 4) {
      return parts as [number, number, number, number];
    }
  }

  const hex = address.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);

  if (hex) {
    const high = Number.parseInt(hex[1]!, 16);
    const low = Number.parseInt(hex[2]!, 16);
    const combined = (high << 16) | low;

    return [
      (combined >>> 24) & 0xff,
      (combined >>> 16) & 0xff,
      (combined >>> 8) & 0xff,
      combined & 0xff
    ];
  }

  return null;
}

function rejectResolvedAddress(address: string): string | null {
  const ipv4Mapped = parseIpv4MappedAddress(address);

  if (ipv4Mapped) {
    const [first, second] = ipv4Mapped;

    return isPrivateOrLoopbackIPv4(first, second)
      ? "URL fetch rejected private or loopback IPv4 target; using hostname and path only."
      : null;
  }

  const ipVersion = isIP(address);

  if (ipVersion === 4) {
    const [first = 0, second = 0] = address.split(".").map((part) => Number.parseInt(part, 10));

    return isPrivateOrLoopbackIPv4(first, second)
      ? "URL fetch rejected private or loopback IPv4 target; using hostname and path only."
      : null;
  }

  if (ipVersion === 6) {
    const normalized = address.toLowerCase();
    const isPrivate =
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80:");

    return isPrivate ? "URL fetch rejected private or loopback IPv6 target; using hostname and path only." : null;
  }

  return null;
}

async function rejectUnsafeFetchTarget(parsed: URL): Promise<string | null> {
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "URL fetch supports only http and https targets; using hostname and path only.";
  }

  const hostname = parsed.hostname.toLowerCase();
  const hostAddress = hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;

  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    return "URL fetch rejected localhost target; using hostname and path only.";
  }

  const literalRejection = rejectResolvedAddress(hostAddress);

  if (literalRejection) {
    return literalRejection;
  }

  if (isIP(hostAddress) !== 0) {
    return null;
  }

  try {
    const { address } = await lookup(hostAddress, { verbatim: true });

    return rejectResolvedAddress(address);
  } catch {
    return "URL fetch rejected unresolvable hostname; using hostname and path only.";
  }
}

function isSupportedHtmlContentType(contentType: string | null): boolean {
  if (!contentType) {
    return true;
  }

  const mediaType = contentType.split(";")[0]?.trim().toLowerCase();

  return mediaType === "text/html" || mediaType === "application/xhtml+xml";
}

async function readLimitedResponseText(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) {
    const text = await response.text();

    return Buffer.from(text).subarray(0, maxBytes).toString("utf8");
  }

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let bytesRead = 0;

  while (bytesRead < maxBytes) {
    const result = await reader.read();

    if (result.done) {
      break;
    }

    const chunk = Buffer.from(result.value);
    const remaining = maxBytes - bytesRead;
    chunks.push(chunk.subarray(0, remaining));
    bytesRead += Math.min(chunk.length, remaining);

    if (chunk.length > remaining) {
      await reader.cancel();
      break;
    }

    if (bytesRead >= maxBytes) {
      await reader.cancel();
      break;
    }
  }

  return Buffer.concat(chunks).toString("utf8");
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripHtml(value: string): string {
  return decodeHtmlEntities(value.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function extractTagText(html: string, tagName: string): string | null {
  const match = html.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, "i"));

  return match ? stripHtml(match[1]) : null;
}

function extractMetaContent(html: string, names: string[]): string | null {
  const nameAlternation = names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const metaPattern = new RegExp(
    `<meta\\b(?=[^>]*(?:name|property)=["'](?:${nameAlternation})["'])(?=[^>]*content=["']([^"']+)["'])[^>]*>`,
    "i"
  );
  const match = html.match(metaPattern);

  return match ? stripHtml(match[1]) : null;
}

function uniqueTextParts(parts: Array<string | null>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const part of parts) {
    if (!part) {
      continue;
    }

    const normalized = part.replace(/\s+/g, " ").trim();
    const key = normalized.toLowerCase();

    if (!normalized || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(normalized);
  }

  return result;
}

function normalizeString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizeExternalSummaryParts(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const record = payload as Record<string, unknown>;
  const summary = normalizeString(record.summaryText) ?? normalizeString(record.summary);
  const title = normalizeString(record.title);
  const description = normalizeString(record.description);
  const heading = normalizeString(record.heading) ?? normalizeString(record.h1);
  const keywords = Array.isArray(record.keywords)
    ? record.keywords
        .map((keyword) => normalizeString(keyword))
        .filter((keyword): keyword is string => Boolean(keyword))
    : [];

  return uniqueTextParts([summary, title, description, heading, keywords.join(" ")]);
}

async function resolveWithExternalParser(
  baseSignal: ParsedUrlSignal,
  options: ResolveUrlSignalOptions
): Promise<ParsedUrlSignal> {
  if (!options.endpoint) {
    return {
      ...baseSignal,
      fallbackReason: "External URL parser is selected but endpoint is missing; using local URL signal."
    };
  }

  const abortController = new AbortController();
  const timeout = setTimeout(
    () => abortController.abort(),
    options.timeoutMs ?? defaultExternalParserConfig.timeoutMs
  );

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    if (options.apiKey) {
      headers.Authorization = `Bearer ${options.apiKey}`;
    }

    const response = await (options.fetchFn ?? fetch)(options.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        url: baseSignal.normalizedUrl,
        fallbackSignal: {
          hostname: baseSignal.hostname,
          path: baseSignal.path,
          summaryText: baseSignal.summaryText
        }
      }),
      signal: abortController.signal
    });
    if (!response.ok) {
      await readLimitedResponseText(response, externalParserMaxResponseBytes);

      return {
        ...baseSignal,
        fallbackReason: `External URL parser failed with status ${response.status}; using local URL signal.`
      };
    }

    const responseText = await readLimitedResponseText(response, externalParserMaxResponseBytes);
    const payload = JSON.parse(responseText) as unknown;
    const summaryParts = uniqueTextParts([
      baseSignal.summaryText,
      ...normalizeExternalSummaryParts(payload)
    ]);

    if (summaryParts.length <= 1) {
      return {
        ...baseSignal,
        fallbackReason: "External URL parser returned no usable summary fields; using local URL signal."
      };
    }

    return {
      ...baseSignal,
      summaryText: summaryParts.join(" "),
      sourceType: "external_url_parser",
      fallbackReason: null
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);

    return {
      ...baseSignal,
      fallbackReason: `External URL parser failed: ${reason}; using local URL signal.`
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function resolveUrlSignal(
  input: string,
  options: ResolveUrlSignalOptions = {}
): Promise<ParsedUrlSignal> {
  const baseSignal = parseUrlSignal(input);
  const policy: UrlFetchPolicy = {
    ...defaultUrlFetchPolicy,
    ...options
  };
  const externalParserConfig: ExternalUrlParserConfig = {
    ...defaultExternalParserConfig,
    ...options
  };

  if (externalParserConfig.parserMode === "external" && baseSignal.sourceType === "url_metadata") {
    return resolveWithExternalParser(baseSignal, {
      ...externalParserConfig,
      fetchFn: options.fetchFn
    });
  }

  if (policy.mode !== "metadata" || baseSignal.sourceType !== "url_metadata") {
    return baseSignal;
  }

  const parsed = new URL(baseSignal.normalizedUrl);
  const rejectedReason = await rejectUnsafeFetchTarget(parsed);

  if (rejectedReason) {
    return {
      ...baseSignal,
      fallbackReason: rejectedReason
    };
  }

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), policy.timeoutMs);

  try {
    const response = await (options.fetchFn ?? fetch)(baseSignal.normalizedUrl, {
      method: "GET",
      headers: {
        Accept: "text/html,application/xhtml+xml"
      },
      redirect: "manual",
      signal: abortController.signal
    });

    if (!response.ok) {
      return {
        ...baseSignal,
        fallbackReason: `URL fetch failed with status ${response.status}; using hostname and path only.`
      };
    }

    const contentType = response.headers.get("content-type");

    if (!isSupportedHtmlContentType(contentType)) {
      return {
        ...baseSignal,
        fallbackReason: `URL fetch skipped unsupported content type ${contentType}; using hostname and path only.`
      };
    }

    const html = await readLimitedResponseText(response, policy.maxBytes);
    const title = extractTagText(html, "title");
    const description = extractMetaContent(html, ["description", "og:description"]);
    const heading = extractTagText(html, "h1");
    const summaryParts = uniqueTextParts([
      baseSignal.summaryText,
      title,
      description,
      heading
    ]);

    if (summaryParts.length <= 1) {
      return {
        ...baseSignal,
        fallbackReason: "URL fetch completed but no title, description, or h1 metadata was found; using hostname and path only."
      };
    }

    return {
      ...baseSignal,
      summaryText: summaryParts.join(" "),
      sourceType: "url_fetched_metadata",
      fallbackReason: null
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);

    return {
      ...baseSignal,
      fallbackReason: `URL fetch failed: ${reason}; using hostname and path only.`
    };
  } finally {
    clearTimeout(timeout);
  }
}
