/* Gera supabase/seed/exercicios_v2.sql a partir do catálogo em código.
   Executar: node scripts/run-ts.mjs scripts/build-exercise-seed.ts */
import fs from "node:fs";
import path from "node:path";
import { buildExerciseSeedSql } from "../src/lib/domain/catalog-seed";

const out = path.join(process.cwd(), "backend", "supabase", "seed", "exercicios_v2.sql");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, buildExerciseSeedSql(), "utf8");
console.log(`Semente gravada em ${path.relative(process.cwd(), out)}`);
