
"use client";

import { useState } from "react";
import { callFunction } from "@/lib/supabase/functions";

interface EmailResult {
  success: boolean;
  message: string;
  emailId: string;
}

export default function TestEmailPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function sendTestEmail() {
    setLoading(true);
    setMessage("");

    try {
      const result = await callFunction<EmailResult>(
        "send-email",
        "",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ type: "test" }),
        }
      );

      setMessage(`Sucesso! E-mail enviado. ID: ${result.emailId}`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Erro inesperado."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="mb-4 text-2xl font-bold">
        Teste de e-mail — Método LR
      </h1>

      <p className="mb-6">
        O e-mail será enviado para sua conta autenticada.
      </p>

      <button
        onClick={sendTestEmail}
        disabled={loading}
        className="rounded-lg bg-black px-6 py-3 text-white disabled:opacity-50"
      >
        {loading ? "Enviando..." : "Enviar e-mail de teste"}
      </button>

      {message && (
        <p className="mt-6 break-words">{message}</p>
      )}
    </main>
  );
}
