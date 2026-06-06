# Release Checklist

Use this checklist before publishing, tagging, or handing the server to an MCP client integration.

## Required Checks

- `npm ci`
- `npm run typecheck`
- `npm test`
- `npm run build`
- stdio smoke lists all 7 tools from `dist/src/server.js`

## Runtime

- Default runtime root is `.runtime/`.
- Set `SPEC_DESIGN_MCP_RUNTIME_DIR=/absolute/path` when runtime files must live outside the repository.
- Confirm the configured runtime directory is writable.
- Confirm `.runtime/` or the configured runtime directory is not committed.

## Manual Smoke

```bash
npm run build
node dist/src/server.js
```

Then connect with an MCP client and verify these tools are listed:

- `design.session.create`
- `design.session.append_input`
- `design.intent.clarify`
- `design.design.generate`
- `design.design.revise`
- `design.design.confirm`
- `design.export.package`

## Known Warnings

- Node.js may print `ExperimentalWarning` for `node:sqlite`.
- This is expected for the current v0 runtime and is not a release blocker.
