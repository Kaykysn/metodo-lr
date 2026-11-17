// Rascunhos guardados só nesta aba (sessionStorage). Cobrem o caso em que o navegador descarta a aba
// em segundo plano (comum no celular) e recarrega a página quando a pessoa volta: o que estava em edição
// e ainda não foi salvo no servidor reaparece. Fechar a aba ou sair da conta apaga tudo.
// Nada aqui substitui o salvamento no servidor; é só a rede de segurança enquanto a aba existe.

const PREFIX = "lr_rascunho:";

interface Stored<T> {
  /** Impressão do estado de origem: se o servidor mudou desde então, o rascunho é descartado. */
  base: string;
  value: T;
  at: number;
}

function store(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null; // armazenamento bloqueado: segue sem rede de segurança
  }
}

/** Impressão estável de um valor (para comparar com a origem). */
export function fingerprint(value: unknown): string {
  try {
    return JSON.stringify(value) ?? "";
  } catch {
    return "";
  }
}

/** Lê o rascunho se ele foi feito a partir da mesma origem; senão apaga e devolve null. */
export function readTabDraft<T>(key: string, base: string): T | null {
  const s = store();
  if (!s) return null;
  try {
    const raw = s.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored<T>;
    if (parsed.base !== base) {
      s.removeItem(PREFIX + key);
      return null;
    }
    return parsed.value;
  } catch {
    return null;
  }
}

export function writeTabDraft<T>(key: string, base: string, value: T) {
  const s = store();
  if (!s) return;
  try {
    s.setItem(PREFIX + key, JSON.stringify({ base, value, at: Date.now() } satisfies Stored<T>));
  } catch {
    /* cota cheia ou bloqueado: ignora */
  }
}

export function clearTabDraft(key: string) {
  try {
    store()?.removeItem(PREFIX + key);
  } catch {
    /* ignora */
  }
}

export function clearAllTabDrafts() {
  const s = store();
  if (!s) return;
  try {
    for (let i = s.length - 1; i >= 0; i--) {
      const k = s.key(i);
      if (k?.startsWith(PREFIX)) s.removeItem(k);
    }
  } catch {
    /* ignora */
  }
}
