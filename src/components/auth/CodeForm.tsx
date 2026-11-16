"use client";

import React, { useState } from "react";
import { Button, Field, inputClass } from "@/components/ui/primitives";

/** Campo do código de 6 números; onSubmit devolve a mensagem de erro, ou null quando deu certo. */
export default function CodeForm({ submitLabel, onSubmit }: { submitLabel: string; onSubmit: (code: string) => Promise<string | null> }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const err = await onSubmit(code);
          if (err) {
            setError(err);
            setCode("");
          }
        } catch {
          setError("Sem conexão com o servidor. Verifique a internet e tente de novo.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field label="Código do autenticador" htmlFor="mfa-code" error={error ?? undefined}>
        <input
          id="mfa-code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,7}"
          maxLength={7}
          required
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? "mfa-code-error" : undefined}
          className={`${inputClass} max-w-[12rem] text-center font-semibold tracking-[0.3em]`}
        />
      </Field>
      <Button type="submit" disabled={busy}>{busy ? "Confirmando…" : submitLabel}</Button>
    </form>
  );
}
