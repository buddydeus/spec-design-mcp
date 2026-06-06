/** 中文说明：验证 URL parser 的最小语义提取与降级诊断。 */
import { describe, expect, it } from "vitest";

import {
  createConfiguredUrlSignalResolver,
  parseUrlSignal,
  readExternalUrlParserConfigFromEnv,
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

  it("uses an external URL parser when configured", async () => {
    const signal = await resolveUrlSignal("https://example.com/product", {
      parserMode: "external",
      endpoint: "https://parser.example.test/parse",
      apiKey: "parser-key",
      fetchFn: async (input, init) => {
        expect(init).toBeDefined();

        const requestInit = init!;
        const body = JSON.parse(requestInit.body as string) as {
          url: string;
          fallbackSignal: { summaryText: string };
        };

        expect(input).toBe("https://parser.example.test/parse");
        expect(requestInit.method).toBe("POST");
        expect(requestInit.headers).toMatchObject({
          Authorization: "Bearer parser-key"
        });
        expect(body).toMatchObject({
          url: "https://example.com/product",
          fallbackSignal: {
            summaryText: "example.com product"
          }
        });

        return new Response(
          JSON.stringify({
            title: "External Product Page",
            description: "Developer workflow with hero features pricing",
            h1: "Start Free Trial"
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json"
            }
          }
        );
      }
    });

    expect(signal).toMatchObject({
      normalizedUrl: "https://example.com/product",
      sourceType: "external_url_parser",
      fallbackReason: null
    });
    expect(signal.summaryText).toContain("External Product Page");
    expect(signal.summaryText).toContain("hero features pricing");
    expect(signal.summaryText).toContain("Start Free Trial");
  });

  it("falls back when the external URL parser fails", async () => {
    const signal = await resolveUrlSignal("https://example.com/product", {
      parserMode: "external",
      endpoint: "https://parser.example.test/parse",
      fetchFn: async () =>
        new Response("upstream unavailable", {
          status: 503
        })
    });

    expect(signal).toMatchObject({
      normalizedUrl: "https://example.com/product",
      summaryText: "example.com product",
      sourceType: "url_metadata"
    });
    expect(signal.fallbackReason).toContain("External URL parser failed with status 503");
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

  it("rejects IPv4-mapped loopback targets before fetching", async () => {
    const signal = await resolveUrlSignal("http://[::ffff:127.0.0.1]/product", {
      mode: "metadata",
      fetchFn: async () => {
        throw new Error("fetch should not be called");
      }
    });

    expect(signal.sourceType).toBe("url_metadata");
    expect(signal.fallbackReason).toContain("private or loopback IPv4");
  });

  it("rejects CGNAT IPv4 targets before fetching", async () => {
    const signal = await resolveUrlSignal("http://100.64.0.1/product", {
      mode: "metadata",
      fetchFn: async () => {
        throw new Error("fetch should not be called");
      }
    });

    expect(signal).toMatchObject({
      normalizedUrl: "http://100.64.0.1/product",
      sourceType: "url_metadata"
    });
    expect(signal.fallbackReason).toContain("private or loopback IPv4");
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

  it("reads external URL parser config from environment", () => {
    expect(
      readExternalUrlParserConfigFromEnv({
        [urlParserEnvVars.parserMode]: "external",
        [urlParserEnvVars.externalEndpoint]: "https://parser.example.test/parse",
        [urlParserEnvVars.externalApiKey]: "parser-key",
        [urlParserEnvVars.externalTimeoutMs]: "750"
      })
    ).toEqual({
      parserMode: "external",
      endpoint: "https://parser.example.test/parse",
      apiKey: "parser-key",
      timeoutMs: 750
    });
  });

  it("creates a configured resolver with the external URL parser", async () => {
    const resolver = createConfiguredUrlSignalResolver(
      {
        [urlParserEnvVars.parserMode]: "external",
        [urlParserEnvVars.externalEndpoint]: "https://parser.example.test/parse"
      },
      async () =>
        new Response(
          JSON.stringify({
            summaryText: "External summary with developers hero features pricing"
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json"
            }
          }
        )
    );
    const signal = await resolver("https://example.com/product");

    expect(signal).toMatchObject({
      sourceType: "external_url_parser",
      fallbackReason: null
    });
    expect(signal.summaryText).toContain("External summary");
  });
});
