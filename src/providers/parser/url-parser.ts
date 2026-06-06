import { Buffer } from "node:buffer";
import { isIP } from "node:net";

/** 中文说明：URL 输入在本地规则解析后的最小语义结果。 */
export interface ParsedUrlSignal {
  normalizedUrl: string;
  hostname: string;
  path: string;
  summaryText: string;
  sourceType: "url_metadata" | "url_fetched_metadata" | "unparsed_url";
  fallbackReason: string | null;
}

export const urlParserEnvVars = {
  fetchMode: "SPEC_DESIGN_MCP_URL_FETCH",
  fetchTimeoutMs: "SPEC_DESIGN_MCP_URL_FETCH_TIMEOUT_MS",
  fetchMaxBytes: "SPEC_DESIGN_MCP_URL_FETCH_MAX_BYTES"
} as const;

export type UrlFetchMode = "off" | "metadata";

export interface UrlFetchPolicy {
  mode: UrlFetchMode;
  timeoutMs: number;
  maxBytes: number;
}

export interface ResolveUrlSignalOptions extends Partial<UrlFetchPolicy> {
  fetchFn?: typeof fetch;
}

const defaultUrlFetchPolicy: UrlFetchPolicy = {
  mode: "off",
  timeoutMs: 2_000,
  maxBytes: 64_000
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

export function createConfiguredUrlSignalResolver(
  env: NodeJS.ProcessEnv = process.env,
  fetchFn: typeof fetch = fetch
): (input: string) => Promise<ParsedUrlSignal> {
  const policy = readUrlFetchPolicyFromEnv(env);

  return (input) =>
    resolveUrlSignal(input, {
      ...policy,
      fetchFn
    });
}

function rejectUnsafeFetchTarget(parsed: URL): string | null {
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "URL fetch supports only http and https targets; using hostname and path only.";
  }

  const hostname = parsed.hostname.toLowerCase();
  const hostAddress = hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;

  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    return "URL fetch rejected localhost target; using hostname and path only.";
  }

  const ipVersion = isIP(hostAddress);

  if (ipVersion === 4) {
    const [first = 0, second = 0] = hostAddress.split(".").map((part) => Number.parseInt(part, 10));
    const isPrivate =
      first === 0 ||
      first === 10 ||
      first === 127 ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) ||
      first >= 224;

    return isPrivate ? "URL fetch rejected private or loopback IPv4 target; using hostname and path only." : null;
  }

  if (ipVersion === 6) {
    const isPrivate =
      hostAddress === "::1" ||
      hostAddress.startsWith("fc") ||
      hostAddress.startsWith("fd") ||
      hostAddress.startsWith("fe80:");

    return isPrivate ? "URL fetch rejected private or loopback IPv6 target; using hostname and path only." : null;
  }

  return null;
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

export async function resolveUrlSignal(
  input: string,
  options: ResolveUrlSignalOptions = {}
): Promise<ParsedUrlSignal> {
  const baseSignal = parseUrlSignal(input);
  const policy: UrlFetchPolicy = {
    ...defaultUrlFetchPolicy,
    ...options
  };

  if (policy.mode !== "metadata" || baseSignal.sourceType !== "url_metadata") {
    return baseSignal;
  }

  const parsed = new URL(baseSignal.normalizedUrl);
  const rejectedReason = rejectUnsafeFetchTarget(parsed);

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
