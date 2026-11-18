// Grava a senha pelo servidor (função account-password), que aplica a regra do Método LR.
import { callFunction, FunctionError } from "@/lib/supabase/functions";
import { PASSWORD_MESSAGES, passwordProblems, type PasswordProblem } from "./password-rule";

export type SavePasswordResult = { ok: true } | { ok: false; message: string; expired?: boolean };

export async function savePassword(mode: "activate" | "reset", password: string, fullName: string): Promise<SavePasswordResult> {
  const local = passwordProblems(password, fullName);
  if (local.length) return { ok: false, message: PASSWORD_MESSAGES[local[0]] };
  try {
    await callFunction("account-password", "", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, password }) });
    return { ok: true };
  } catch (e) {
    if (e instanceof FunctionError) {
      if (e.status === 422) {
        const problems = Array.isArray(e.body.problems) ? (e.body.problems as string[]) : [];
        const first = problems.find((p): p is PasswordProblem => p in PASSWORD_MESSAGES);
        return { ok: false, message: first ? PASSWORD_MESSAGES[first] : e.message };
      }
      if (e.status === 401) return { ok: false, message: "O link expirou. Peça um novo.", expired: true };
      if (e.status === 429) return { ok: false, message: "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo." };
      return { ok: false, message: e.message, expired: e.status === 403 && /link|convite/i.test(e.message) };
    }
    return { ok: false, message: "Sem conexão com o servidor. Verifique a internet e tente de novo." };
  }
}
