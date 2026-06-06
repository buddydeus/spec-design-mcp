#!/usr/bin/env node
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const mcpUrl = process.env.SPEC_DESIGN_MCP_MVP_URL ?? "http://127.0.0.1:3010/mcp";
const authToken = process.env.SPEC_DESIGN_MCP_HTTP_AUTH_TOKEN;

function readStructuredContent(result) {
  if (result.structuredContent && typeof result.structuredContent === "object") {
    return result.structuredContent;
  }

  const firstText = result.content?.find((item) => item.type === "text")?.text;

  return firstText ? JSON.parse(firstText) : {};
}

async function callTool(client, name, args) {
  const result = await client.callTool({
    name,
    arguments: args
  });

  return readStructuredContent(result);
}

const client = new Client({
  name: "spec-design-mcp-mvp-client",
  version: "0.1.0"
});

const transport = new StreamableHTTPClientTransport(new URL(mcpUrl), {
  requestInit: authToken
    ? {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      }
    : undefined
});

try {
  await client.connect(transport);

  const tools = await client.listTools();
  const session = await callTool(client, "design.session.create", {
    projectName: "MVP Demo",
    goal: "Build landing page"
  });

  await callTool(client, "design.session.append_input", {
    sessionId: session.sessionId,
    inputs: [
      {
        type: "text",
        text:
          "Create a SaaS landing page for developers with a hero, features, pricing and primary CTA Start Free Trial. Use a minimal, confident product tone."
      }
    ]
  });

  const clarify = await callTool(client, "design.intent.clarify", {
    sessionId: session.sessionId
  });
  const generated = await callTool(client, "design.design.generate", {
    sessionId: session.sessionId
  });
  const revised = await callTool(client, "design.design.revise", {
    sessionId: session.sessionId,
    baseVersion: generated.designVersion,
    revisionInstruction: "change cta to Book Demo; add section faq"
  });

  await callTool(client, "design.design.confirm", {
    sessionId: session.sessionId,
    designVersion: revised.newVersion
  });

  const exported = await callTool(client, "design.export.package", {
    sessionId: session.sessionId,
    designVersion: revised.newVersion
  });

  console.log(
    JSON.stringify(
      {
        mcpUrl,
        tools: tools.tools.map((tool) => tool.name),
        sessionId: session.sessionId,
        ready: clarify.isReady,
        generatedVersion: generated.designVersion,
        revisedVersion: revised.newVersion,
        deliveryPackageRef: exported.deliveryPackageRef,
        artifacts: exported.artifacts
      },
      null,
      2
    )
  );
} finally {
  await client.close();
}
