export interface ParsedUrlSignal {
  normalizedUrl: string;
  hostname: string;
  path: string;
  summaryText: string;
}

/**
 * 中文说明：
 * v0 对 URL 只做最小标准化和可读文本化，不发起网络请求。
 */
export function parseUrlSignal(input: string): ParsedUrlSignal {
  const parsed = new URL(input);
  const path = parsed.pathname === "/" ? "" : parsed.pathname;
  const summaryText = `${parsed.hostname}${path}`.replace(/[/-]+/g, " ").trim();

  return {
    normalizedUrl: parsed.toString(),
    hostname: parsed.hostname,
    path,
    summaryText
  };
}
