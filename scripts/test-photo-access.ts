/* Testes de acesso às fotos e da semente do catálogo (regras, políticas e validação no servidor).
   Executar: node scripts/run-ts.mjs scripts/test-photo-access.ts */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { canUsePhotos } from "../src/lib/data/photo-store";
import { applySeed, buildExerciseSeedSql } from "../src/lib/domain/catalog-seed";
import type { Actor } from "../src/lib/domain/types";

let n = 0;
const ok = (msg: string) => {
  n++;
  console.log(`✓ ${msg}`);
};

// ---- Quem pode usar as fotos de um aluno
const owner: Actor = { id: "prof_a", name: "A", role: "teacher" };
const other: Actor = { id: "prof_b", name: "B", role: "teacher" };
const student: Actor = { id: "est_1", name: "E", role: "pe_student", supervisorId: "prof_a" };
const aluno: Actor = { id: "aluno_142", name: "Aluno", role: "practitioner", traineeId: "tr_0142" };
const admin: Actor = { id: "adm", name: "Adm", role: "admin" };
assert.equal(canUsePhotos(owner, "prof_a"), true);
assert.equal(canUsePhotos(other, "prof_a"), false, "outro profissional não acessa por ID adivinhado");
assert.equal(canUsePhotos(student, "prof_a"), true, "estudante supervisionado acessa os casos do supervisor");
assert.equal(canUsePhotos(aluno, "prof_a"), false, "o aluno não acessa as fotos por esta via");
assert.equal(canUsePhotos(admin, "prof_a"), false, "administração não lê fotos de saúde por conveniência");
ok("Só o profissional dono do aluno (e o estudante supervisionado) usa as fotos");

// A validação de parâmetros das rotas é testada no repositório do backend (shared_test.ts).
// As checagens abaixo leem arquivos do backend e só rodam quando a pasta backend/ está ao lado do site.
const backendDir = path.join(process.cwd(), "backend");
if (!fs.existsSync(path.join(backendDir, "supabase"))) {
  console.log("- backend/ ausente: checagens de políticas e funções puladas (rode no repositório do backend)");
} else {
// ---- Políticas no banco e no armazenamento
const sql = fs.readFileSync(path.join(process.cwd(), "backend/supabase/migrations/20261110000000_catalogo_exercicios_e_fotos.sql"), "utf8");
for (const t of ["photo_sets", "posture_photos", "posture_annotations", "posture_comparison_notes", "posture_access_log", "evidence_claims"]) {
  assert.match(sql, new RegExp(`ALTER TABLE public\\.${t} ENABLE ROW LEVEL SECURITY`), `${t} sem RLS`);
}
assert.match(sql, /'posture-photos', 'posture-photos', false/, "bucket deve ser privado");
assert.doesNotMatch(sql, /FOR SELECT USING \(true\)[^;]*posture/i, "nenhuma leitura pública de fotos");
assert.match(sql, /posture-photos: dono do aluno lê" ON storage\.objects FOR SELECT\s+USING \(bucket_id = 'posture-photos' AND public\.owns_trainee/);
assert.doesNotMatch(sql, /posture_annotations[^;]*FOR UPDATE/, "marcações não podem ser sobrescritas");
assert.match(sql, /UNIQUE \(photo_id, version\)/, "versões únicas por foto impedem sobrescrita concorrente");
assert.match(sql, /\(view = 'perfil'\) = \(profile_side IS NOT NULL\)/, "perfil exige lado");
ok("RLS em todas as tabelas novas, bucket privado, leitura só pelo dono do aluno e marcações sem UPDATE");

// ---- Funções do backend não usam a chave de serviço
const fnDir = path.join(process.cwd(), "backend/supabase/functions");
const fnFiles = ["posture/index.ts", "admin-access/index.ts", "_shared/auth.ts", "_shared/http.ts", "_shared/image.ts", "_shared/cors.ts"];
for (const f of fnFiles) {
  const src = fs.readFileSync(path.join(fnDir, f), "utf8");
  assert.doesNotMatch(src, /SERVICE_ROLE|service_role/, `${f} não pode usar a chave de serviço`);
  assert.doesNotMatch(src, /console\.(log|info|warn)/, `${f} não deve registrar dados das fotos em log`);
}
ok("Funções de fotos e de administração usam só a sessão do usuário (RLS vale) e não registram dados em log");
}

// ---- O site não tem rotas de servidor próprias: todo acesso a dados passa pelo backend
for (const gone of ["src/app/api", "src/lib/server", "src/app/actions"]) {
  assert.equal(fs.existsSync(path.join(process.cwd(), gone)), false, `${gone} não deve existir (backend fica em backend/)`);
}
ok("Sem rotas de API, ações de servidor ou código de servidor no site");

// ---- Semente repetível
const seedSql = buildExerciseSeedSql();
assert.equal(seedSql, buildExerciseSeedSql(), "a semente é determinística");
assert.match(seedSql, /WHERE public\.exercises\.is_custom = false;/);
assert.doesNotMatch(seedSql, /\bDELETE\b|\bTRUNCATE\b/i, "a semente nunca apaga");
const existing = [
  { id: "goblet-squat", is_custom: false, name: "Agachamento goblet (antigo)" },
  { id: "meu-exercicio", is_custom: true, name: "Exercício próprio" },
  { id: "hip-thrust", is_custom: true, name: "Versão personalizada com o mesmo ID" },
];
const seed = [
  { id: "goblet-squat", is_custom: false, name: "Agachamento goblet" },
  { id: "hip-thrust", is_custom: false, name: "Elevação pélvica com carga" },
  { id: "clamshell", is_custom: false, name: "Clamshell" },
];
const once = applySeed(existing, seed);
const twice = applySeed(once, seed);
assert.deepEqual(twice, once, "rodar duas vezes dá o mesmo resultado");
assert.equal(once.find((r) => r.id === "meu-exercicio")!.name, "Exercício próprio");
assert.equal(once.find((r) => r.id === "hip-thrust")!.name, "Versão personalizada com o mesmo ID", "personalizado com ID igual não é sobrescrito");
assert.equal(once.find((r) => r.id === "goblet-squat")!.name, "Agachamento goblet");
assert.ok(once.find((r) => r.id === "clamshell"));
ok("Semente repetível: atualiza o catálogo, preserva exercícios personalizados e nunca apaga");

console.log(`\n${n} testes de acesso e semente passaram.`);
