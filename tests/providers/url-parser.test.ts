/** 中文说明：验证 URL parser 的最小语义提取与降级诊断。 */
import { describe, expect, it } from "vitest";

import { parseUrlSignal } from "../../src/providers/parser/url-parser.js";

describe("url parser", () => {
  it("derives a weak intent signal from URL metadata", () => {
    const signal = parseUrlSignal("https://example.com/marketing/product-page");

    expect(signal).toMatchObject({
      normalizedUrl: "https://example.com/marketing/product-page",
      hostname: "example.com",
      path: "/marketing/product-page",
      summaryText: "example.com marketing product page",
      sourceType: "url_metadata"
    });
    expect(signal.fallbackReason).toContain("URL content was not fetched");
  });

  it("preserves invalid raw URL input as a weak signal", () => {
    const signal = parseUrlSignal("not a url");

    expect(signal).toMatchObject({
      normalizedUrl: "not a url",
      hostname: "",
      path: "",
      sourceType: "unparsed_url"
    });
    expect(signal.fallbackReason).toContain("could not be parsed");
  });
});
