"use client";
import { useState } from "react";
export default function LogoutButton() {
  const [error, setError] = useState("");
  return (
    <>
      <button
        className="secondary section-space"
        onClick={async () => {
          try {
            const r = await fetch("/api/auth", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "logout" }),
            });
            if (!r.ok) throw Error();
            window.location.assign("/login");
          } catch {
            setError("Não foi possível sair. Tente novamente.");
          }
        }}
      >
        Sair da conta
      </button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
