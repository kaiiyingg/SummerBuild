import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

const checks = [
  {
    label: "Frontend dependencies",
    path: path.join(rootDir, "frontend", "node_modules"),
    hint: "Run `npm run setup:frontend`.",
  },
  {
    label: "Backend virtual environment",
    path: path.join(rootDir, ".venv"),
    hint: "Run `npm run setup:backend`.",
  },
  {
    label: "Backend env file",
    path: path.join(rootDir, "backend", ".env"),
    hint: "Copy `backend/.env.example` to `backend/.env` and add your Reka API key.",
  },
];

const missing = [];

console.log("SummerBuild setup check\n");

for (const check of checks) {
  const exists = fs.existsSync(check.path);
  const status = exists ? "[ok]" : "[missing]";
  console.log(`${status} ${check.label}`);
  if (!exists) {
    missing.push(check);
    console.log(`      ${check.hint}`);
  }
}

if (missing.length) {
  console.log("\nSetup is incomplete.");
  process.exitCode = 1;
} else {
  console.log("\nEverything is ready. Start both apps with `npm run dev`.");
}
