import { cookies } from "next/headers";
import { z } from "zod";
import { database } from "@/server/database.mjs";
import {
  createUser,
  createSession,
  checkPassword,
  consumeAttempt,
  normalizeEmail,
  revokeSession,
  sessionUser,
  hashPassword,
} from "@/server/security.mjs";
export const runtime = "nodejs";
const credentials = z.object({
  action: z.enum(["login", "register", "logout", "password"]),
  email: z.string().email().max(254).optional(),
  password: z.string().min(1).max(128).optional(),
  name: z.string().min(2).max(100).optional(),
  newPassword: z.string().min(12).max(128).optional(),
});
export async function POST(req: Request) {
  try {
    const origin = req.headers.get("origin");
    const expected = new URL(process.env.APP_URL || req.url).origin;
    if (origin !== expected)
      return Response.json({ error: "Origem inválida" }, { status: 403 });
    const text = await req.text();
    if (text.length > 4096)
      return Response.json(
        { error: "Solicitação muito grande" },
        { status: 413 },
      );
    const data = credentials.parse(JSON.parse(text));
    const jar = await cookies();
    const token = jar.get("via_session")?.value;
    const cookieOptions = {
      httpOnly: true,
      secure: expected.startsWith("https://"),
      sameSite: "lax" as const,
      path: "/",
      maxAge: 7 * 86400,
    };
    if (data.action === "logout") {
      revokeSession(token);
      jar.set("via_session", "", { ...cookieOptions, maxAge: 0 });
      return Response.json({ ok: true });
    }
    if (!consumeAttempt("auth:global", 100))
      return Response.json(
        { error: "Muitas tentativas. Aguarde 15 minutos." },
        { status: 429 },
      );
    const email = normalizeEmail(data.email || "");
    if (!consumeAttempt("auth:" + email, 10))
      return Response.json(
        { error: "Muitas tentativas. Aguarde 15 minutos." },
        { status: 429 },
      );
    if (data.action === "password") {
      const user = sessionUser(token);
      if (!user)
        return Response.json({ error: "Entre novamente" }, { status: 401 });
      const stored = database()
        .prepare("SELECT password_hash FROM users WHERE id=?")
        .get(user.id) as { password_hash: string };
      if (
        !data.password ||
        !data.newPassword ||
        !(await checkPassword(data.password, stored.password_hash))
      )
        return Response.json(
          { error: "Senha atual inválida" },
          { status: 400 },
        );
      const passwordHash = await hashPassword(data.newPassword);
      database()
        .prepare("UPDATE users SET password_hash=? WHERE id=?")
        .run(passwordHash, user.id);
      database().prepare("DELETE FROM sessions WHERE user_id=?").run(user.id);
      jar.set("via_session", createSession(user.id), cookieOptions);
      return Response.json({ ok: true });
    }
    if (!data.email || !data.password)
      return Response.json(
        { error: "Informe e-mail e senha" },
        { status: 400 },
      );
    let user: any;
    if (data.action === "register") {
      if (
        !database()
          .prepare("SELECT id FROM users WHERE is_admin=1 LIMIT 1")
          .get()
      )
        return Response.json(
          {
            error: "A central ainda precisa ser configurada pelo responsável.",
          },
          { status: 503 },
        );
      if (!data.name || data.password.length < 12)
        return Response.json(
          { error: "Informe nome e senha com pelo menos 12 caracteres" },
          { status: 400 },
        );
      try {
        user = await createUser({
          email,
          name: data.name,
          password: data.password,
        });
      } catch {
        return Response.json(
          {
            error:
              "Não foi possível criar a conta. Confira os dados ou entre com uma conta existente.",
          },
          { status: 400 },
        );
      }
    } else {
      user = database().prepare("SELECT * FROM users WHERE email=?").get(email);
      const hash =
        user?.password_hash ||
        "00000000000000000000000000000000:" + "00".repeat(64);
      if (!(await checkPassword(data.password, hash)) || !user)
        return Response.json(
          { error: "E-mail ou senha inválidos" },
          { status: 401 },
        );
    }
    jar.set("via_session", createSession(user.id), cookieOptions);
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      {
        error: "Não foi possível concluir. Confira os dados e tente novamente.",
      },
      { status: 400 },
    );
  }
}
