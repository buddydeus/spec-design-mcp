/** 中文说明：URL 输入在本地规则解析后的最小语义结果。 */
export interface ParsedUrlSignal {
  normalizedUrl: string;
  hostname: string;
  path: string;
  summaryText: string;
  sourceType: "url_metadata" | "unparsed_url";
  fallbackReason: string | null;
}

/**
 * 中文说明：
 * v0 对 URL 只做最小标准化和可读文本化，不发起网络请求。
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
