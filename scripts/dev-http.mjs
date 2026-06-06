#!/usr/bin/env node
import { spawn } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { watch } from "node:fs";

const rootDir = process.cwd();
const watchRoots = ["src", "tsconfig.json"];
const debounceMs = 250;

let serverProcess = null;
let buildProcess = null;
let rebuildTimer = null;
let isShuttingDown = false;

function spawnCommand(command, args, options = {}) {
  return spawn(command, args, {
    cwd: rootDir,
    env: process.env,
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options
  });
}

function stopServer() {
  if (!serverProcess || serverProcess.killed) {
    return;
  }

  serverProcess.kill("SIGTERM");
  serverProcess = null;
}

function build() {
  return new Promise((resolve) => {
    buildProcess = spawnCommand("tsc", ["-p", "tsconfig.json"]);
    buildProcess.once("exit", (code) => {
      buildProcess = null;
      resolve(code === 0);
    });
  });
}

function startServer() {
  const host = process.env.SPEC_DESIGN_MCP_HTTP_HOST ?? "127.0.0.1";
  const port = process.env.SPEC_DESIGN_MCP_HTTP_PORT ?? "3010";
  const path = process.env.SPEC_DESIGN_MCP_HTTP_PATH ?? "/mcp";

  console.error(`[dev] starting HTTP MCP server at http://${host}:${port}${path}`);
  serverProcess = spawnCommand("node", ["dist/src/http-server.js"], {
    env: {
      ...process.env,
      SPEC_DESIGN_MCP_HTTP_HOST: host,
      SPEC_DESIGN_MCP_HTTP_PORT: port,
      SPEC_DESIGN_MCP_HTTP_PATH: path
    }
  });
}

async function rebuildAndRestart(reason) {
  if (isShuttingDown || buildProcess) {
    return;
  }

  console.error(`[dev] rebuilding${reason ? ` after ${reason}` : ""}`);
  stopServer();

  const ok = await build();

  if (!ok || isShuttingDown) {
    console.error("[dev] build failed; server not restarted");
    return;
  }

  startServer();
}

function scheduleRebuild(reason) {
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => {
    rebuildAndRestart(reason).catch((error) => {
      console.error("[dev] rebuild failed:", error);
    });
  }, debounceMs);
}

async function listWatchDirs(path) {
  const itemStat = await stat(path);

  if (!itemStat.isDirectory()) {
    return [];
  }

  const entries = await readdir(path, { withFileTypes: true });
  const nested = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => listWatchDirs(join(path, entry.name)))
  );

  return [path, ...nested.flat()];
}

async function watchProject() {
  for (const target of watchRoots) {
    const absoluteTarget = join(rootDir, target);
    const targetStat = await stat(absoluteTarget);
    const targets = targetStat.isDirectory() ? await listWatchDirs(absoluteTarget) : [absoluteTarget];

    for (const watchTarget of targets) {
      watch(watchTarget, { persistent: true }, (_event, filename) => {
        const changedPath = filename ? join(watchTarget, filename.toString()) : watchTarget;
        scheduleRebuild(relative(rootDir, changedPath));
      });
    }
  }
}

function shutdown() {
  isShuttingDown = true;
  clearTimeout(rebuildTimer);
  stopServer();

  if (buildProcess && !buildProcess.killed) {
    buildProcess.kill("SIGTERM");
  }
}

process.once("SIGINT", () => {
  shutdown();
  process.exit(130);
});

process.once("SIGTERM", () => {
  shutdown();
  process.exit(143);
});

await watchProject();
await rebuildAndRestart();
