// Compila um script TS (CommonJS) numa pasta temporária e executa, resolvendo "@/..." para src/.
// Uso: node scripts/run-ts.mjs scripts/test-redesign.ts
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const root = process.cwd();
const entry = process.argv[2];
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "lr-ts-"));
const cfg = JSON.parse(fs.readFileSync(path.join(root, "tsconfig.scripts.json"), "utf8"));
cfg.compilerOptions.outDir = outDir;
cfg.files = [entry];
const cfgPath = path.join(root, `.tsconfig.run.${process.pid}.json`);
fs.writeFileSync(cfgPath, JSON.stringify(cfg));
try {
  execFileSync(process.execPath, [path.join(root, "node_modules", "typescript", "bin", "tsc"), "-p", cfgPath], { stdio: "inherit" });
} finally {
  fs.rmSync(cfgPath, { force: true });
}
const require = createRequire(import.meta.url);
const Module = require("node:module");
const orig = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  if (request.startsWith("@/")) request = path.join(outDir, "src", request.slice(2));
  try {
    return orig.call(this, request, parent, ...rest);
  } catch (e) {
    // Pacotes do node_modules do projeto (o código compilado está numa pasta temporária).
    if (/^[@a-z]/i.test(request) && !request.startsWith("@/")) return orig.call(this, request, { ...parent, paths: Module._nodeModulePaths(root) }, ...rest);
    throw e;
  }
};
require(path.join(outDir, entry.replace(/\.ts$/, ".js")));
