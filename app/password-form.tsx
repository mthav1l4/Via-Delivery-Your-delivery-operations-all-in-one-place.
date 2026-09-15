"use client";
import { useState } from "react";
export default function PasswordForm() {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <details className="section-space">
      <summary>Alterar minha senha</summary>
      <form
        className="form section-space"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          setBusy(true);
          setMessage("");
          try {
            const values = Object.fromEntries(new FormData(form));
            const r = await fetch("/api/auth", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...values, action: "password" }),
            });
            const j = await r.json();
            if (!r.ok) throw Error(j.error);
            setMessage("Senha alterada. As outras sessões foram encerradas.");
            form.reset();
          } catch (e) {
            setMessage(
              e instanceof Error ? e.message : "Não foi possível alterar",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Senha atual
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={128}
          />
        </label>
        <label>
          Nova senha
          <input
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
          />
        </label>
        <button className="secondary" disabled={busy}>
          {busy ? "Salvando…" : "Salvar nova senha"}
        </button>
        {message && <p role="status">{message}</p>}
      </form>
    </details>
  );
}
