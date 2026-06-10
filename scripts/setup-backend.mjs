import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const rootDir = process.cwd();
const isWindows = process.platform === "win32";
const venvDir = path.join(rootDir, ".venv");
const venvPython = isWindows
  ? path.join(venvDir, "Scripts", "python.exe")
  : path.join(venvDir, "bin", "python");
const requirementsPath = path.join(rootDir, "backend", "requirements.txt");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    ...options,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function resolvePythonCommand() {
  const candidates = isWindows ? ["python"] : ["python3", "python"];

  for (const command of candidates) {
    const probe = spawnSync(command, ["--version"], { stdio: "ignore" });
    if (probe.status === 0) {
      return command;
    }
  }

  console.error("Python was not found. Install Python 3.10+ before running backend setup.");
  process.exit(1);
}

if (!fs.existsSync(venvDir)) {
  const pythonCommand = resolvePythonCommand();
  console.log("Creating backend virtual environment in .venv...");
  run(pythonCommand, ["-m", "venv", ".venv"], { cwd: rootDir });
}

console.log("Installing backend requirements...");
run(venvPython, ["-m", "pip", "install", "-r", requirementsPath], { cwd: rootDir });

const envExamplePath = path.join(rootDir, "backend", ".env.example");
const envPath = path.join(rootDir, "backend", ".env");
if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  console.log("\nNext step: copy backend/.env.example to backend/.env and add your Reka API key.");
}
