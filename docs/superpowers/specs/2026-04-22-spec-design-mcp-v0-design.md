# Spec Design MCP V0 Design

## 1. Scope

This document defines the implementation design for `Spec Design MCP` `v0`.

`v0` is intentionally narrow:

- Single-page `Landing Page` only
- Input supports `text` and `url`
- Output is a constrained `DesignDOMAST`
- Preview and export are both derived from the same AST
- Revisions are natural-language driven and explicitly versioned
- Delivery artifacts are local filesystem outputs indexed by `artifact-manifest.json`

Out of scope for `v0`:

- Image-first input
- Multi-page site composition
- Platform-level resource governance
- Signed URLs, TTL cleanup, object storage
- Human-first visual editor

## 2. Goals

`v0` must provide a stable end-to-end loop for external AI agents:

1. Create a design session
2. Append requirement inputs
3. Ask structured clarification questions when needed
4. Generate a first AST version
5. Produce a human-reviewable preview
6. Revise from natural language feedback
7. Confirm a version
8. Export a development-facing delivery package

The design priority is stability of contracts, not breadth of capability.

## 3. Chosen Approach

The selected approach is a contract-first layered monolith in a single TypeScript codebase.

Why this approach:

- It matches the repo's current zero-code starting point
- It keeps `v0` locally runnable without early over-abstraction
- It preserves clean service boundaries without paying multi-package complexity
- It supports milestone-based delivery from schemas to generation to export

Alternatives considered but not chosen:

- Strongly separated domain packages: cleaner long-term, but too heavy for `v0`
- Script-first prototype: faster initially, but likely to cause contract drift and refactor churn

## 4. Architecture

Suggested project structure:

```text
src/
  index.ts
  schemas/
  tools/
  services/
    conversation/
    ast/
    preview/
    export/
  storage/
    sqlite/
    files/
  providers/
    llm/
    parser/
  lib/
  types/
.runtime/
  sessions/
  artifacts/
  exports/
```

Module boundaries:

- `schemas`: single source of truth for tool I/O, AST, manifest, and error schemas
- `tools`: MCP tool handlers only; validate input, call services, return structured output
- `services/conversation`: orchestrates clarify, generate, revise, confirm, export flows
- `services/ast`: validates AST, versions drafts, generates diffs
- `services/preview`: compiles AST into local preview artifacts
- `services/export`: compiles AST into delivery package artifacts
- `storage/sqlite`: persists structured metadata for sessions, versions, artifacts
- `storage/files`: writes previews and export files to local disk
- `providers/llm`: provider interface plus default mock or rule-based implementation
- `providers/parser`: parses `text` and basic `url` input into intent-ready data

Design constraints:

- Do not duplicate contract types outside `schemas`
- Do not let preview or export read hidden mutable state; they work from explicit inputs
- Keep business rules out of storage and tool handlers
- Keep `v0` on a single process and synchronous-first flow

## 5. Core Data Model

### 5.1 Session

Minimum fields:

- `sessionId`
- `projectName`
- `goal`
- `status`
- `createdAt`
- `updatedAt`
- `confirmedVersion`

Allowed statuses:

- `created`
- `collecting_inputs`
- `clarifying`
- `draft_ready`
- `confirmed`
- `exported`
- `failed`

### 5.2 InputItem

`append_input` uses a discriminated union:

- `type: "text"` with `text`
- `type: "url"` with `url`

`url` is part of the formal `v0` contract now, but the first implementation may degrade gracefully when extraction is limited or unavailable.

### 5.3 DesignVersion

Minimum fields:

- `sessionId`
- `designVersion`
- `baseVersion`
- `sourceType`
- `designAst`
- `sectionSummary`
- `diffSummary`
- `nodeDiffs`
- `previewRef`
- `createdAt`

Rules:

- First generated draft starts at `v1`
- Every generate or revise creates a new immutable version record
- Old versions are never overwritten

### 5.4 ArtifactRecord

Minimum fields:

- `artifactId`
- `sessionId`
- `designVersion`
- `artifactType`
- `filePath`
- `createdAt`

## 6. MCP Tool Contract

`v0` exposes exactly seven tools:

1. `design.session.create`
2. `design.session.append_input`
3. `design.intent.clarify`
4. `design.design.generate`
5. `design.design.revise`
6. `design.design.confirm`
7. `design.export.package`

Contract rules:

- `design.design.revise` requires `baseVersion`
- `design.design.confirm` must reference an existing `designVersion`
- `design.export.package` only works for a confirmed version

## 7. Generation and Revision Flow

### 7.1 Clarify

`design.intent.clarify` reads all session inputs and produces:

- `isReady`
- `missingFields[]`
- `questions[]`
- `interimIntentModel`

The default provider is a local mock or rule-based implementation behind an `LLM adapter` interface. This lets the system stabilize tool contracts and artifact flow before integrating a real model provider.

### 7.2 Generate

`design.design.generate` is allowed only when intent is ready.

Flow:

1. Parse accumulated inputs into an intent model
2. Produce a constrained `DesignDOMAST v0`
3. Validate AST against schema
4. Generate `sectionSummary[]`
5. Produce preview artifacts
6. Persist a new `DesignVersion`

### 7.3 Revise

`design.design.revise` accepts:

- `sessionId`
- `baseVersion`
- `revisionInstruction`

Flow:

1. Validate `baseVersion` is the latest draft
2. Apply constrained AST modifications from the revision instruction
3. Revalidate AST
4. Produce `diffSummary[]` and `nodeDiffs[]`
5. Regenerate preview artifacts
6. Persist a new immutable version

Initial supported revision categories should stay narrow:

- Copy changes
- Section add or remove
- Section reorder
- CTA changes
- Basic style and palette changes

## 8. Version Control Rules

Write operations with explicit version preconditions:

- `design.design.revise`
- `design.design.confirm`
- `design.export.package`

Conflict rules:

- Non-latest `baseVersion` on revise returns `VERSION_CONFLICT`
- Unknown version returns `VERSION_NOT_FOUND`
- Exporting an unconfirmed version returns `VERSION_NOT_CONFIRMED`

Confirmed versions are frozen as export baselines. Later changes must create a new draft version, not mutate the confirmed one in place.

## 9. AST and Artifact Rules

### 9.1 AST

`v0` AST remains intentionally constrained:

- Limited node kinds
- Limited layout modes
- Limited style keys
- No arbitrary style injection
- No absolute positioning

This is required to keep generator behavior and compiler behavior aligned.

### 9.2 Preview

Preview outputs:

- `preview.html`
- `section-summary.json`
- optional `preview.png`

Preview generation strategy:

1. Compile AST into simplified HTML
2. Inject baseline CSS
3. Write local preview artifacts
4. Optionally render a screenshot via Playwright

Human review requirement:

- `v0` must always return a local file path or static directory path that a human can open directly

### 9.3 Export

Delivery package must include:

- `artifact-manifest.json`
- `design-ast.json`
- `compiled.html`
- `compiled.css`
- `annotation-manifest.json`
- `binding.schema.json`

`artifact-manifest.json` is the single delivery entrypoint.

Manifest minimum fields:

- `sessionId`
- `designVersion`
- `generatedAt`
- `artifacts[]`

Alignment rule:

- Every annotatable node in HTML must preserve `data-node-id`
- `annotation-manifest.json` must use the same `nodeId` set
- Downstream agents must not infer structure from DOM order alone

## 10. Persistence Strategy

Chosen persistence model:

- `SQLite` for metadata
- Local filesystem for generated artifacts

SQLite stores:

- `sessions`
- `design_versions`
- `artifacts`

Filesystem stores:

- previews
- exports
- related generated files

Recommended runtime directories:

```text
.runtime/
  sessions/
  artifacts/
  exports/
```

This provides low setup cost, structured querying, and reliable version checks without requiring platform infrastructure.

## 11. Error Model

All tool failures should return a uniform error structure with:

- `code`
- `message`
- `details`
- `retryable`

Minimum `v0` error codes:

- `INPUT_INVALID`
- `CLARIFICATION_REQUIRED`
- `GENERATION_FAILED`
- `AST_INVALID`
- `VERSION_CONFLICT`
- `VERSION_NOT_FOUND`
- `VERSION_NOT_CONFIRMED`
- `PREVIEW_FAILED`
- `EXPORT_FAILED`

Rules:

- Missing business preconditions should be explicit contract errors, not generic internal failures
- Tool consumers must be able to distinguish retryable system failures from workflow guidance

## 12. Testing Strategy

Testing layers:

- Schema tests for all contracts and manifest formats
- Service tests for session, clarify, generate, revise, confirm, export rules
- Artifact tests for preview and export consistency
- Smoke tests for end-to-end session-to-package flow

Suggested sample set categories:

- Minimal landing page
- Standard SaaS landing page
- Content-heavy marketing page

Minimum validation focus:

- AST schema validity
- AST to preview consistency
- AST to export consistency
- Immutable version chain behavior
- Confirm and export guards
- Manifest completeness and readability

## 13. Delivery Plan

Implementation should follow these milestones in order:

1. Contracts: schemas, tool types, error codes
2. Session and storage
3. Clarify and interim intent model
4. Initial AST generation
5. Preview generation
6. Natural-language revision
7. Confirm and export
8. Regression samples and smoke checks

Do not move to the next milestone until:

- current schema is stable
- main path is runnable
- at least one sample passes validation

## 14. Immediate Next Step

The first implementation round should only cover `Milestone 1`:

- Zod schemas
- tool input and output contracts
- AST `v0` schema
- artifact and manifest schemas
- error code definitions

No session workflow or generation logic should be implemented in the same round.

This keeps the first delivery focused on the one thing every later milestone depends on: stable contracts.
