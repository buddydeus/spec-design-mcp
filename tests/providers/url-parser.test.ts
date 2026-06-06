/** 中文说明：验证 URL parser 的最小语义提取与降级诊断。 */
import { describe, expect, it } from "vitest";

import {
  parseUrlSignal,
  readUrlFetchPolicyFromEnv,
  resolveUrlSignal,
  urlParserEnvVars
} from "../../src/providers/parser/url-parser.js";

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

  it("keeps URL fetching disabled by default", async () => {
    const signal = await resolveUrlSignal("https://example.com/product", {
      fetchFn: async () => {
        throw new Error("fetch should not be called");
      }
    });

    expect(signal).toMatchObject({
      normalizedUrl: "https://example.com/product",
      sourceType: "url_metadata"
    });
    expect(signal.fallbackReason).toContain("URL content was not fetched");
  });

  it("extracts bounded HTML metadata when URL fetching is enabled", async () => {
    const signal = await resolveUrlSignal("https://example.com/product", {
      mode: "metadata",
      fetchFn: async () =>
        new Response(
          `
            <html>
              <head>
                <title>Developer Platform</title>
                <meta name="description" content="Build product pages with hero, features, and pricing." />
              </head>
              <body><h1>Start Free Trial</h1></body>
            </html>
          `,
          {
            status: 200,
            headers: {
              "content-type": "text/html; charset=utf-8"
            }
          }
        )
    });

    expect(signal).toMatchObject({
      normalizedUrl: "https://example.com/product",
      sourceType: "url_fetched_metadata",
      fallbackReason: null
    });
    expect(signal.summaryText).toContain("Developer Platform");
    expect(signal.summaryText).toContain("hero, features, and pricing");
    expect(signal.summaryText).toContain("Start Free Trial");
  });

  it("rejects localhost targets before fetching", async () => {
    const signal = await resolveUrlSignal("https://localhost/product", {
      mode: "metadata",
      fetchFn: async () => {
        throw new Error("fetch should not be called");
      }
    });

    expect(signal).toMatchObject({
      normalizedUrl: "https://localhost/product",
      sourceType: "url_metadata"
    });
    expect(signal.fallbackReason).toContain("rejected localhost");
  });

  it("rejects private IP targets before fetching", async () => {
    const signal = await resolveUrlSignal("http://192.168.1.10/product", {
      mode: "metadata",
      fetchFn: async () => {
        throw new Error("fetch should not be called");
      }
    });

    expect(signal).toMatchObject({
      normalizedUrl: "http://192.168.1.10/product",
      sourceType: "url_metadata"
    });
    expect(signal.fallbackReason).toContain("private or loopback IPv4");
  });

  it("rejects IPv6 loopback targets before fetching", async () => {
    const signal = await resolveUrlSignal("http://[::1]/product", {
      mode: "metadata",
      fetchFn: async () => {
        throw new Error("fetch should not be called");
      }
    });

    expect(signal).toMatchObject({
      normalizedUrl: "http://[::1]/product",
      sourceType: "url_metadata"
    });
    expect(signal.fallbackReason).toContain("private or loopback IPv6");
  });

  it("falls back when fetched content is not HTML", async () => {
    const signal = await resolveUrlSignal("https://example.com/feed.json", {
      mode: "metadata",
      fetchFn: async () =>
        new Response(JSON.stringify({ title: "Not HTML" }), {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        })
    });

    expect(signal).toMatchObject({
      normalizedUrl: "https://example.com/feed.json",
      sourceType: "url_metadata"
    });
    expect(signal.fallbackReason).toContain("unsupported content type application/json");
  });

  it("reads URL fetch policy from environment", () => {
    expect(
      readUrlFetchPolicyFromEnv({
        [urlParserEnvVars.fetchMode]: "metadata",
        [urlParserEnvVars.fetchTimeoutMs]: "500",
        [urlParserEnvVars.fetchMaxBytes]: "1024"
      })
    ).toEqual({
      mode: "metadata",
      timeoutMs: 500,
      maxBytes: 1024
    });
  });
});
