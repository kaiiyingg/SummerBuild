import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const rootDir = process.cwd();
const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "npm.cmd" : "npm";
const nodeCommand = process.execPath;

const requiredPaths = [
  {
    label: "frontend/node_modules",
    path: path.join(rootDir, "frontend", "node_modules"),
    hint: "Run `npm run setup:frontend`.",
  },
  {
    label: ".venv",
    path: path.join(rootDir, ".venv"),
    hint: "Run `npm run setup:backend`.",
  },
  {
    label: "backend/.env",
    path: path.join(rootDir, "backend", ".env"),
    hint: "Copy `backend/.env.example` to `backend/.env` and add your Reka API key.",
  },
];

const missing = requiredPaths.filter((entry) => !fs.existsSync(entry.path));
if (missing.length) {
  console.error("Cannot start both apps until setup is complete.\n");
  for (const entry of missing) {
    console.error(`- Missing ${entry.label}: ${entry.hint}`);
  }
  process.exit(1);
}

const children = [];
let shuttingDown = false;

function stopChildren() {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGINT");
    }
  }
}

function start(name, command, args, cwd, useShell = false) {
  const child = spawn(command, args, {
    cwd,
    stdio: "inherit",
    env: process.env,
    shell: useShell,
  });

  child.on("exit", (code) => {
    if (!shuttingDown) {
      console.error(`${name} exited with code ${code ?? 0}. Stopping the other process.`);
      stopChildren();
      process.exit(code ?? 0);
    }
  });

  children.push(child);
}

process.on("SIGINT", () => {
  stopChildren();
  process.exit(0);
});

process.on("SIGTERM", () => {
  stopChildren();
  process.exit(0);
});

start(
  "frontend",
  npmCommand,
  ["run", "dev", "--", "--host", "127.0.0.1"],
  path.join(rootDir, "frontend"),
  isWindows
);
start("backend", nodeCommand, [path.join(rootDir, "scripts", "run-backend.mjs")], rootDir);
