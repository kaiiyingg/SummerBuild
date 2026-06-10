import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const rootDir = process.cwd();
const isWindows = process.platform === "win32";
const backendDir = path.join(rootDir, "backend");
const venvPython = isWindows
  ? path.join(rootDir, ".venv", "Scripts", "python.exe")
  : path.join(rootDir, ".venv", "bin", "python");
const envPath = path.join(backendDir, ".env");

if (!fs.existsSync(venvPython)) {
  console.error("Missing .venv. Run `npm run setup:backend` first.");
  process.exit(1);
}

if (!fs.existsSync(envPath)) {
  console.error("Missing backend/.env. Copy `backend/.env.example` to `backend/.env` and add your Reka API key.");
  process.exit(1);
}

const child = spawn(
  venvPython,
  ["-m", "uvicorn", "app.main:app", "--reload", "--host", "127.0.0.1", "--port", "8000"],
  {
    cwd: backendDir,
    stdio: "inherit",
    env: process.env,
  }
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
