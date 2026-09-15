"use client";
import { useState } from "react";
export default function Login() {
  const [mode, setMode] = useState("login"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, action: mode }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      window.location.assign("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível entrar");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="access-page">
      <div className="access-brand">
        <span>v.</span>via delivery
      </div>
      <article className="access-card">
        <h1>{mode === "login" ? "Bem-vindo de volta." : "Vamos começar."}</h1>
        <p>
          {mode === "login"
            ? "Acesse seu painel com e-mail e senha."
            : "Crie sua conta e complete seu cadastro para aprovação."}
        </p>
        <form className="form" onSubmit={submit}>
          {mode === "register" && (
            <label>
              Nome
              <input
                name="name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={100}
              />
            </label>
          )}
          <label>
            E-mail
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
            />
          </label>
          <label>
            Senha
            <input
              name="password"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              required
              minLength={mode === "register" ? 12 : 1}
              maxLength={128}
            />
          </label>
          {mode === "register" && (
            <p className="form-note">
              Use pelo menos 12 caracteres. Seu cadastro será conferido pela
              central.
            </p>
          )}
          {error && (
            <p className="error-banner" role="alert">
              {error}
            </p>
          )}
          <button className="primary" disabled={busy}>
            {busy ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>
        <button
          className="secondary section-space"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError("");
          }}
        >
          {mode === "login" ? "Ainda não tenho conta" : "Já tenho uma conta"}
        </button>
        <p className="form-note section-space">
          Esqueceu a senha? Solicite a recuperação à administração da central.
        </p>
      </article>
    </main>
  );
}
