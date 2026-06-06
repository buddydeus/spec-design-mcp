# MVP Walkthrough

This walkthrough verifies the current MVP surface through a real Streamable HTTP MCP client.

## 1. Choose MVP defaults

For local smoke testing, the default `rule_based` provider is enough and requires no network access.

For a realistic MVP demo, configure an OpenAI-compatible chat completion endpoint:

```bash
export SPEC_DESIGN_MCP_INTENT_PROVIDER=openai_compatible
export SPEC_DESIGN_MCP_LLM_ENDPOINT=https://api.example.com/v1/chat/completions
export SPEC_DESIGN_MCP_LLM_MODEL=your-model
export SPEC_DESIGN_MCP_LLM_API_KEY=your-api-key
```

URL enrichment is optional. Keep it off for deterministic local demos; enable metadata or an external parser only when the endpoint contract is ready.

## 2. Configure HTTP exposure

Copy the sample file and export only the values you need:

```bash
cp .env.example .env
```

The project does not auto-load `.env`; either export values in your shell or use your process manager to inject them.

For localhost-only MVP runs:

```bash
export SPEC_DESIGN_MCP_HTTP_HOST=127.0.0.1
export SPEC_DESIGN_MCP_HTTP_PORT=3010
export SPEC_DESIGN_MCP_HTTP_PATH=/mcp
```

Before exposing HTTP outside localhost, set at least:

```bash
export SPEC_DESIGN_MCP_HTTP_AUTH_TOKEN=replace-with-a-long-random-token
export SPEC_DESIGN_MCP_HTTP_ALLOWED_ORIGINS=https://your-client.example
export SPEC_DESIGN_MCP_HTTP_RATE_LIMIT_WINDOW_MS=60000
export SPEC_DESIGN_MCP_HTTP_RATE_LIMIT_MAX_REQUESTS=120
```

`SPEC_DESIGN_MCP_HTTP_ALLOWED_ORIGINS` is comma-separated. Empty values do not emit CORS headers.

## 3. Build and start

```bash
npm install
npm run build
npm run start:http
```

The server exposes:

- health check: `GET /healthz`
- MCP endpoint: `POST /mcp`

## 4. Run the client walkthrough

In another shell:

```bash
node examples/mvp-http-client.mjs
```

If HTTP auth is enabled, export the same token before running the client:

```bash
export SPEC_DESIGN_MCP_HTTP_AUTH_TOKEN=replace-with-a-long-random-token
node examples/mvp-http-client.mjs
```

The script calls all seven MCP tools in order:

1. `design.session.create`
2. `design.session.append_input`
3. `design.intent.clarify`
4. `design.design.generate`
5. `design.design.revise`
6. `design.design.confirm`
7. `design.export.package`

Expected output includes a `sessionId`, `ready: true`, generated/revised versions, `deliveryPackageRef`, and export artifacts.

## 5. MVP decision

The project is ready for an internal MVP when:

- `npm test`, `npm run typecheck`, and `npm run build` pass.
- The HTTP client walkthrough completes against `dist/src/http-server.js`.
- The deployment target either stays on localhost/private network or sets auth token, allowed origins, and rate limits.

Remaining non-blocking polish includes real browser screenshot capture and stateful HTTP transport sessions.
