"use client";
import LogoutButton from "./logout-button";
import PasswordForm from "./password-form";
import { useState, useEffect } from "react";
import {
  Package,
  ArrowRight,
  Upload,
  FileText,
  LogOut,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
export function Documents({
  entity,
  readOnly = false,
}: {
  entity?: string;
  readOnly?: boolean;
}) {
  const [docs, setDocs] = useState<any[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [purpose, setPurpose] = useState("documento");
  const url =
    "/api/documents" + (entity ? "?entity=" + encodeURIComponent(entity) : "");
  async function load() {
    try {
      const r = await fetch(url),
        j: any = await r.json();
      if (!r.ok) throw Error(j.error);
      setDocs(j.documents);
      setError("");
    } catch (e: any) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, [entity]);
  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const input = e.target;
    setBusy(true);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("purpose", purpose);
      const r = await fetch("/api/documents", { method: "POST", body: form }),
        j: any = await r.json();
      if (!r.ok) throw Error(j.error);
      await load();
      input.value = "";
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="document-manager">
      <h3>Fotos e documentos</h3>
      <p className="form-note">
        Arquivos privados. Apenas você e a administração podem acessá-los.
      </p>
      {error && <p className="error-banner">{error}</p>}
      {docs.map((doc) => (
        <a
          className="document-row"
          href={"/api/documents?id=" + encodeURIComponent(doc.id)}
          key={doc.id}
        >
          <FileText size={18} />
          <span>
            {doc.name}
            <small>
              {doc.purpose} · {Math.round(doc.bytes / 1024)} KB
            </small>
          </span>
        </a>
      ))}
      {!readOnly && docs.length < 6 && (
        <div className="upload-box">
          <Select value={purpose} onValueChange={setPurpose}>
            <SelectTrigger aria-label="Tipo do documento">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="documento">
                Documento de identificação
              </SelectItem>
              <SelectItem value="cnh">CNH</SelectItem>
              <SelectItem value="foto">Foto de perfil</SelectItem>
            </SelectContent>
          </Select>
          <label className="secondary">
            <Upload size={18} />
            {busy ? "Enviando…" : "Selecionar arquivo"}
            <input
              type="file"
              accept="image/png,image/jpeg,application/pdf"
              disabled={busy}
              onChange={upload}
              className="sr-only"
            />
          </label>
          <p className="form-note">
            PDF, JPG ou PNG · até 5 MB · máximo 6 arquivos.
          </p>
        </div>
      )}
    </section>
  );
}
export default function Access({
  account,
  profile,
  error,
  signin,
  busy,
  onRegister,
  onRetry,
}: {
  account: any;
  profile: any;
  error: string;
  signin: boolean;
  busy: boolean;
  onRegister: (b: any) => Promise<boolean>;
  onRetry: () => void;
}) {
  const [role, setRole] = useState("empresa"),
    [form, setForm] = useState<Record<string, string>>({});
  function input(name: string, label: string, type = "text", required = true) {
    return (
      <label key={name}>
        {label}
        <input
          value={form[name] || ""}
          onChange={(e) => setForm({ ...form, [name]: e.target.value })}
          type={type}
          required={required}
          maxLength={300}
        />
      </label>
    );
  }
  return (
    <main className="access-page">
      <div className="access-brand">
        <span>v.</span>via delivery
      </div>
      <article className="access-card">
        {signin ? (
          <>
            <Package size={36} />
            <h1>Suas entregas começam aqui.</h1>
            <p>
              Entre com sua conta para acessar seu painel de empresa ou
              entregador.
            </p>
            <a className="primary" href="/login" target="_top">
              Entrar ou criar conta <ArrowRight size={18} />
            </a>
            <p className="form-note">
              Use seu e-mail e senha. Cada conta possui suas próprias
              permissões.
            </p>
          </>
        ) : !profile ? (
          <>
            <h1>Conectando…</h1>
            <p>Carregando seu acesso à Via Delivery.</p>
            {error && <p className="error-banner">{error}</p>}
            <button onClick={onRetry} className="secondary">
              <RefreshCw size={16} /> Tentar novamente
            </button>
          </>
        ) : account ? (
          <>
            <ShieldCheck size={32} />
            <h1>
              {account.disabled ? "Acesso suspenso" : "Cadastro recebido."}
            </h1>
            <p>
              {account.disabled
                ? "Entre em contato com a administração."
                : "A central precisa aprovar seu cadastro antes de você operar."}
            </p>
            <div className="summary-line">
              <span>Conta</span>
              <strong>{profile.email}</strong>
            </div>
            <Documents />
            <button onClick={onRetry} className="secondary section-space">
              <RefreshCw size={16} /> Verificar aprovação
            </button>
            <PasswordForm />
            <LogoutButton />
          </>
        ) : (
          <>
            <h1>Crie seu cadastro.</h1>
            <p>
              Você está conectado como <strong>{profile.email}</strong>.
            </p>
            <Tabs value={role} onValueChange={setRole}>
              <TabsList>
                <TabsTrigger value="empresa">Sou empresa</TabsTrigger>
                <TabsTrigger value="entregador">Sou entregador</TabsTrigger>
              </TabsList>
            </Tabs>
            <form
              className="form"
              onSubmit={async (e) => {
                e.preventDefault();
                await onRegister({ ...form, role });
              }}
            >
              {input(
                "name",
                role === "empresa" ? "Nome da empresa" : "Nome completo",
              )}
              {role === "empresa" && input("contact", "Responsável")}
              {input("document", role === "empresa" ? "CNPJ" : "CPF")}
              {input("phone", "WhatsApp", "tel")}
              {input("address", "Endereço completo")}
              {role === "empresa" ? (
                input("hours", "Horário de funcionamento")
              ) : (
                <>
                  {input("vehicle", "Veículo")}
                  {input("plate", "Placa", "text", false)}
                  {input("pix", "Chave PIX")}
                  {input("point", "Ponto principal")}
                </>
              )}
              {error && <p className="error-banner">{error}</p>}
              <p className="form-note">
                O cadastro passará por aprovação. Entregadores poderão enviar
                documentos na próxima etapa.
              </p>
              <button className="primary" disabled={busy}>
                {busy ? "Salvando…" : "Enviar cadastro"}
                <ArrowRight size={18} />
              </button>
            </form>
          </>
        )}
      </article>
    </main>
  );
}
