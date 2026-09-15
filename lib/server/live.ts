import { getCurrentUser } from "@/lib/server/auth";
import { operationDb } from "@/db/operation";
import { initial, eligible, type Operation } from "@/lib/operation";
export type Account = {
  userId: string;
  email: string;
  name: string;
  role: "admin" | "empresa" | "entregador";
  entityId: string;
  created: string;
  disabled?: boolean;
};
export type Live = Operation & {
  accounts: Account[];
  audit: { at: string; actor: string; action: string; entity: string }[];
};
export const LIVE_KEY = "via-delivery";
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function requireValue(
  v: unknown,
  message: string,
  status = 400,
): asserts v {
  if (!v) throw new AppError(message, status);
}
export function isActive(s: Live, a: Account) {
  return (
    !a.disabled &&
    (a.role === "admin" ||
      (a.role === "empresa" ? s.companies : s.drivers).some(
        (x) => x.id === a.entityId && x.active,
      ))
  );
}
export async function context() {
  const user = await getCurrentUser();
  requireValue(user, "Entre com sua conta para continuar.", 401);
  const db = operationDb();
  const seed: Live = { ...initial(), accounts: [], audit: [] };
  await db
    .prepare(
      "INSERT OR IGNORE INTO operations (owner,revision,payload) VALUES (?,0,?)",
    )
    .bind(LIVE_KEY, JSON.stringify(seed))
    .run();
  const row = await db
    .prepare("SELECT revision,payload FROM operations WHERE owner=?")
    .bind(LIVE_KEY)
    .first<{ revision: number; payload: string }>();
  requireValue(row, "Central indisponível", 503);
  const state = JSON.parse(row.payload) as Live;
  let account = state.accounts.find((a) => a.userId === user.userId);
  let changed = false;
  if (!account && user.isAdmin) {
    account = {
      userId: user.userId,
      email: user.email,
      name: user.displayName,
      role: "admin",
      entityId: "",
      created: new Date().toISOString(),
    };
    state.accounts.push(account);
    changed = true;
  }
  return { user, db, state, account, revision: row.revision, changed };
}
export type Context = Awaited<ReturnType<typeof context>>;
export async function save(ctx: Context) {
  const data = JSON.stringify(ctx.state);
  requireValue(
    data.length < 15000000,
    "A central atingiu o limite de armazenamento operacional. Contate o suporte.",
    503,
  );
  const r = await ctx.db
    .prepare(
      "UPDATE operations SET payload=?,revision=revision+1 WHERE owner=? AND revision=?",
    )
    .bind(data, LIVE_KEY, ctx.revision)
    .run();
  requireValue(
    r.meta.changes,
    "Outra atualização ocorreu. Atualize a tela e tente novamente.",
    409,
  );
  ctx.revision++;
}
export function visibleState(s: Live, a: Account): Operation {
  if (a.role === "admin") return s;
  const own = a.entityId;
  const orders = s.orders.filter((o) =>
    a.role === "empresa"
      ? o.company === own
      : o.driver === own || eligible(s, o, own),
  );
  const companyIds = new Set(orders.map((o) => o.company));
  const driverIds = new Set(orders.map((o) => o.driver));
  const companies =
    a.role === "empresa"
      ? s.companies.filter((c) => c.id === own)
      : s.companies
          .filter((c) => c.active || companyIds.has(c.id))
          .map((c) => ({
            ...c,
            balance: 0,
            document: "",
            email: "",
            contact: "",
            phone: "",
            customPrice: null,
            fixed: "",
            favorites: [],
          }));
  const drivers =
    a.role === "entregador"
      ? s.drivers.filter((d) => d.id === own)
      : s.drivers
          .filter((d) => driverIds.has(d.id))
          .map((d) => ({
            ...d,
            email: "",
            document: "",
            address: "",
            pix: "",
            favorites: [],
          }));
  return {
    ...s,
    accounts: undefined,
    audit: undefined,
    companies,
    drivers,
    orders: orders.map((o) =>
      a.role === "entregador" && o.driver !== own
        ? { ...o, phone: "", notes: "" }
        : o,
    ),
    entries: s.entries.filter((e) =>
      a.role === "empresa"
        ? e.company === own && e.type !== "Comissão"
        : e.driver === own,
    ),
    slots: s.slots.filter((t) => a.role !== "empresa" || t.company === own),
    notifications: s.notifications
      .filter((n) =>
        a.role === "empresa"
          ? n.company === own
          : n.driver === own || n.driver === "all",
      )
      .map((n) => ({ ...n, read: !!n.readBy?.includes(a.userId) })),
  } as Operation;
}
export function response(ctx: Context) {
  const a = ctx.account;
  return Response.json(
    {
      state: a && isActive(ctx.state, a) ? visibleState(ctx.state, a) : null,
      account: a ? { ...a, active: isActive(ctx.state, a) } : null,
      registrationRequired: !a,
      profile: { email: ctx.user.email, name: ctx.user.displayName },
      revision: ctx.revision,
      integrations: { payments: false, whatsapp: false, documents: true },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export function errorResponse(e: unknown) {
  if (e instanceof AppError)
    return Response.json(
      { error: e.message, signin: e.status === 401 },
      { status: e.status, headers: { "Cache-Control": "no-store" } },
    );
  console.error("Via operation failed", e);
  return Response.json(
    {
      error:
        "Não foi possível concluir. Seus dados não foram confirmados; tente novamente.",
    },
    { status: 500 },
  );
}
