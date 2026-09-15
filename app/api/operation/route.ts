import { z } from "zod";
import { quote, eligible, today, dateKey } from "@/lib/operation";
import {
  context,
  save,
  response,
  errorResponse,
  requireValue as need,
  isActive,
  type Context,
  type Account,
  visibleState,
} from "@/lib/server/live";
const txt = z.string().trim().max(300),
  email = z.string().trim().email().max(254),
  phone = z
    .string()
    .trim()
    .regex(/^[+\d ()-]{8,22}$/, "Informe um telefone válido");
const amount = z.number().int().min(0).max(10000000),
  id = () => crypto.randomUUID();
const companySchema = z.object({
  id: txt.optional(),
  name: txt.min(2),
  contact: txt.min(2),
  email,
  document: txt.min(11),
  phone,
  address: txt.min(5),
  hours: txt.min(3),
  plan: txt.min(1),
  customPrice: amount.nullable(),
  fixed: txt,
  favorites: z.array(txt).max(30),
  active: z.boolean(),
});
const driverSchema = z.object({
  id: txt.optional(),
  name: txt.min(2),
  phone,
  email,
  document: txt.min(11),
  vehicle: txt.min(2),
  plate: txt,
  pix: txt.min(3),
  address: txt.min(5),
  online: z.boolean(),
  active: z.boolean(),
  favorites: z.array(txt).max(30),
  point: txt.min(2),
});
function nextDay(at: string) {
  const d = new Date(dateKey(at) + "T12:00:00-03:00");
  d.setDate(d.getDate() + 1);
  return dateKey(d.toISOString());
}
export async function GET() {
  try {
    const ctx = await context();
    if (ctx.account && isActive(ctx.state, ctx.account)) {
      for (const slot of ctx.state.slots) {
        const until =
          new Date(slot.date + "T" + slot.start + ":00-03:00").getTime() -
          Date.now();
        if (
          !slot.driver &&
          !slot.alerted &&
          until >= 0 &&
          until <= ctx.state.settings.alertMinutes * 60000
        ) {
          slot.alerted = true;
          ctx.changed = true;
          ctx.state.notifications.unshift({
            id: id(),
            at: new Date().toISOString(),
            text: `Horário disponível: ${ctx.state.companies.find((c) => c.id === slot.company)?.name || "Empresa"} às ${slot.start}.`,
            company: slot.company,
            driver: "all",
            read: false,
            readBy: [],
          });
        }
      }
    }
    if (ctx.changed) await save(ctx);
    return response(ctx);
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(req: Request) {
  try {
    need(
      !req.headers.get("origin") ||
        req.headers.get("origin") ===
          new URL(process.env.APP_URL || req.url).origin,
      "Origem inválida",
      403,
    );
    need(
      Number(req.headers.get("content-length") || 0) < 50000,
      "Solicitação grande demais",
    );
    const { action: a, data: b } = z
      .object({ action: txt, data: z.record(z.any()).default({}) })
      .parse(await req.json());
    const ctx = await context();
    const s = ctx.state;
    const at = new Date().toISOString();
    let account = ctx.account;
    const admin = () =>
      need(
        account?.role === "admin" && isActive(s, account),
        "Somente o administrador pode realizar esta operação.",
        403,
      );
    const notify = (text: string, company?: string, driver?: string) =>
      s.notifications.unshift({
        id: id(),
        at,
        text,
        company,
        driver,
        read: false,
        readBy: [],
      });
    if (a === "register") {
      need(!account, "Você já possui um cadastro");
      const role = z.enum(["empresa", "entregador"]).parse(b.role);
      const entityId = id();
      need(
        !s.accounts.some(
          (x) => x.email.toLowerCase() === ctx.user.email.toLowerCase(),
        ),
        "E-mail já cadastrado",
      );
      if (role === "empresa") {
        const x = companySchema.parse({
          ...b,
          email: ctx.user.email,
          plan: s.plans[0].id,
          fixed: "",
          favorites: [],
          customPrice: null,
          active: false,
        });
        need(
          !s.companies.some(
            (c) =>
              c.document.replace(/\D/g, "") === x.document.replace(/\D/g, ""),
          ),
          "Documento já cadastrado",
        );
        s.companies.push({ ...x, id: entityId, balance: 0 });
      } else {
        const x = driverSchema.parse({
          ...b,
          email: ctx.user.email,
          active: false,
          online: false,
          favorites: [],
        });
        need(
          !s.drivers.some(
            (d) =>
              d.document.replace(/\D/g, "") === x.document.replace(/\D/g, ""),
          ),
          "Documento já cadastrado",
        );
        s.drivers.push({ ...x, id: entityId });
      }
      account = {
        userId: ctx.user.userId,
        email: ctx.user.email,
        name: String(b.name),
        role,
        entityId,
        created: at,
      };
      s.accounts.push(account);
      ctx.account = account;
      notify(`Novo cadastro aguardando aprovação: ${account.name}.`);
    } else {
      need(account, "Complete seu cadastro primeiro", 403);
      need(
        isActive(s, account),
        "Cadastro aguardando aprovação ou suspenso.",
        403,
      );
      if (a === "createOrder") {
        need(
          account.role === "admin" || account.role === "empresa",
          "Perfil sem permissão para solicitar entregas.",
          403,
        );
        need(
          s.settings.configured,
          "O administrador precisa configurar e confirmar a tabela de preços.",
        );
        const x = z
          .object({
            company: txt.min(1),
            client: txt.min(2),
            phone,
            address: txt.min(5),
            notes: txt.default(""),
            zone: txt.min(1),
            distance: z.number().min(0).max(200),
          })
          .parse(b);
        need(
          account.role === "admin" || account.entityId === x.company,
          "Empresa não autorizada",
          403,
        );
        const c = s.companies.find((c) => c.id === x.company);
        need(c?.active, "Empresa deve estar aprovada e ativa");
        const price = quote(s, x.company, x.zone, x.distance);
        need(
          c.balance >= price,
          "Saldo insuficiente. Aguarde a confirmação da sua recarga.",
        );
        c.balance -= price;
        const order = {
          ...x,
          id: id(),
          driver: "",
          price,
          fee: Math.round((price * s.settings.commission) / 100),
          status: "Pendente",
          created: at,
          history: [{ status: "Solicitada · valor reservado", at }],
        };
        s.orders.unshift(order);
        s.entries.unshift({
          id: id(),
          at,
          type: "Reserva da entrega",
          company: c.id,
          order: order.id,
          amount: -price,
          recordedBy: account.userId,
        });
        notify(`Nova entrega de ${c.name}.`, c.id, "all");
      } else if (a === "orderStatus") {
        const x = z
            .object({
              id: txt,
              status: z.enum(["Aceita", "Retirada", "Entregue", "Cancelada"]),
            })
            .parse(b),
          o = s.orders.find((o) => o.id === x.id);
        need(o, "Entrega não encontrada");
        if (x.status === "Cancelada") {
          need(
            account.role === "admin" ||
              (account.role === "empresa" && account.entityId === o.company),
            "Você não pode cancelar esta entrega.",
            403,
          );
          need(
            ["Pendente", "Aceita"].includes(o.status),
            "Entrega retirada não pode ser cancelada",
          );
          s.companies.find((c) => c.id === o.company)!.balance += o.price;
          s.entries.unshift({
            id: id(),
            at,
            type: "Estorno",
            company: o.company,
            order: o.id,
            amount: o.price,
            recordedBy: account.userId,
          });
        } else {
          need(
            account.role === "entregador",
            "Somente o entregador pode atualizar a execução.",
            403,
          );
          const driver = account.entityId;
          if (x.status === "Aceita") {
            need(
              eligible(s, o, driver),
              "Entrega indisponível para você. Confira sua conexão e prioridade.",
            );
            o.driver = driver;
          } else {
            need(
              o.driver === driver,
              "Entrega atribuída a outro entregador.",
              403,
            );
            if (x.status === "Retirada")
              need(o.status === "Aceita", "A entrega precisa estar aceita");
            else {
              need(
                o.status === "Retirada",
                "Confirme a retirada antes de concluir",
              );
              o.completed = at;
              s.entries.unshift(
                {
                  id: id(),
                  at,
                  type: "Ganho de entrega",
                  driver,
                  order: o.id,
                  amount: o.price - o.fee,
                  due: nextDay(at),
                  paid: false,
                  recordedBy: account.userId,
                },
                {
                  id: id(),
                  at,
                  type: "Comissão",
                  company: o.company,
                  order: o.id,
                  amount: o.fee,
                  recordedBy: account.userId,
                },
              );
            }
          }
        }
        o.status = x.status;
        o.history.push({ status: x.status, at });
        notify(
          `Entrega #${o.id.slice(0, 6)}: ${x.status.toLowerCase()}.`,
          o.company,
          o.driver || undefined,
        );
      } else if (a === "credit") {
        admin();
        const x = z
          .object({
            company: txt,
            amount: amount.min(100),
            reference: txt.min(6),
            confirmed: z.literal(true),
          })
          .parse(b);
        const c = s.companies.find((c) => c.id === x.company);
        need(c, "Empresa não encontrada");
        need(
          !s.entries.some((e) => e.reference === x.reference),
          "Esta referência bancária já foi registrada",
        );
        c.balance += x.amount;
        s.entries.unshift({
          id: id(),
          at,
          type: "Recarga conciliada",
          company: c.id,
          amount: x.amount,
          reference: x.reference,
          recordedBy: account.userId,
        });
        notify("Sua recarga foi confirmada pela central.", c.id);
      } else if (a === "saveCompany") {
        admin();
        const x = companySchema.parse(b);
        need(
          s.plans.some((p) => p.id === x.plan),
          "Plano inválido",
        );
        need(
          !x.fixed || s.drivers.some((d) => d.id === x.fixed && d.active),
          "Entregador fixo inválido",
        );
        need(
          x.favorites.every((v) =>
            s.drivers.some((d) => d.id === v && d.active),
          ),
          "Favorito inválido",
        );
        need(
          !s.companies.some(
            (c) =>
              c.id !== x.id &&
              (c.email.toLowerCase() === x.email.toLowerCase() ||
                c.document.replace(/\D/g, "") ===
                  x.document.replace(/\D/g, "")),
          ),
          "E-mail ou documento já cadastrado",
        );
        const c = s.companies.find((c) => c.id === x.id);
        if (x.id) need(c, "Empresa não encontrada");
        if (c) Object.assign(c, x);
        else s.companies.push({ ...x, id: id(), balance: 0 });
        notify(`Cadastro de ${x.name} atualizado.`, x.id);
      } else if (a === "saveDriver") {
        admin();
        const x = driverSchema.parse(b);
        need(
          x.favorites.every((v) =>
            s.companies.some((c) => c.id === v && c.active),
          ),
          "Empresa favorita inválida",
        );
        need(
          !s.drivers.some(
            (d) =>
              d.id !== x.id &&
              (d.email.toLowerCase() === x.email.toLowerCase() ||
                d.document.replace(/\D/g, "") ===
                  x.document.replace(/\D/g, "")),
          ),
          "E-mail ou documento já cadastrado",
        );
        const d = s.drivers.find((d) => d.id === x.id);
        if (x.id) need(d, "Entregador não encontrado");
        if (d) Object.assign(d, { ...x, online: x.active && x.online });
        else s.drivers.push({ ...x, id: id(), online: false });
        notify(`Cadastro de ${x.name} atualizado.`, undefined, x.id);
      } else if (a === "online") {
        need(account.role === "entregador", "Perfil não autorizado", 403);
        const d = s.drivers.find((d) => d.id === account!.entityId)!;
        d.online = z.boolean().parse(b.online);
      } else if (a === "saveSlot") {
        admin();
        const x = z
          .object({
            company: txt,
            date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
            end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
          })
          .parse(b);
        need(x.start < x.end, "Fim deve ser posterior ao início");
        need(
          Number.isFinite(new Date(x.date + "T12:00:00Z").getTime()) &&
            x.date >= today(),
          "Data inválida ou passada",
        );
        need(
          s.companies.some((c) => c.id === x.company && c.active),
          "Empresa inválida",
        );
        need(
          !s.slots.some(
            (t) =>
              t.company === x.company &&
              t.date === x.date &&
              t.start < x.end &&
              t.end > x.start,
          ),
          "Horário sobreposto",
        );
        s.slots.push({ ...x, id: id(), driver: "" });
        notify("Novo horário disponível na escala.", x.company, "all");
      } else if (a === "bookSlot") {
        const slot = s.slots.find((t) => t.id === b.id);
        need(slot, "Escala não encontrada");
        need(
          new Date(slot.date + "T" + slot.end + ":00-03:00").getTime() >
            Date.now(),
          "Este horário terminou",
        );
        if (b.release === true) {
          need(
            account.role === "admin" ||
              (account.role === "entregador" &&
                slot.driver === account!.entityId),
            "Você não pode liberar esta reserva.",
            403,
          );
          slot.driver = "";
        } else {
          need(
            account.role === "entregador",
            "A reserva deve ser feita pelo entregador.",
            403,
          );
          need(!slot.driver, "Horário reservado");
          need(
            !s.slots.some(
              (t) =>
                t.driver === account!.entityId &&
                t.date === slot.date &&
                t.start < slot.end &&
                t.end > slot.start,
            ),
            "Você já possui uma reserva neste horário",
          );
          slot.driver = account.entityId;
        }
        notify("Escala atualizada.", slot.company, slot.driver || "all");
      } else if (a === "savePlan") {
        admin();
        const x = z
          .object({
            id: txt.optional(),
            name: txt.min(2),
            price: amount,
            discount: z.number().min(0).max(80),
            priority: z.number().int().min(1).max(10),
            description: txt,
          })
          .parse(b);
        const p = s.plans.find((p) => p.id === x.id);
        if (x.id) need(p, "Plano não encontrado");
        if (p) Object.assign(p, x);
        else s.plans.push({ ...x, id: id() });
      } else if (a === "settings") {
        admin();
        const settings = z
          .object({
            regionName: txt.min(2),
            base: amount.min(100),
            km: amount,
            commission: z.number().min(0).max(50),
            prioritySeconds: z.number().int().min(0).max(300),
            alertMinutes: z.number().int().min(0).max(1440),
            zones: z
              .array(z.object({ name: txt.min(1), price: amount }))
              .min(1)
              .max(30),
          })
          .parse(b);
        need(
          new Set(settings.zones.map((z) => z.name)).size ===
            settings.zones.length,
          "Setores duplicados",
        );
        s.settings = { ...settings, configured: true };
        notify("Tabela de preços atualizada.");
      } else if (a === "settle") {
        admin();
        const x = z
          .object({
            driver: txt,
            reference: txt.min(6),
            confirmed: z.literal(true),
            entries: z.array(txt).min(1).max(1000),
          })
          .parse(b);
        need(
          !s.entries.some((e) => e.reference === x.reference),
          "Referência bancária já registrada",
        );
        need(
          !s.entries.some(
            (e) =>
              e.type === "Repasse conciliado" &&
              e.driver === x.driver &&
              dateKey(e.at) === today(),
          ),
          "O lote deste entregador já foi registrado hoje",
        );
        const due = s.entries.filter(
          (e) =>
            x.entries.includes(e.id) &&
            e.driver === x.driver &&
            e.type === "Ganho de entrega" &&
            !e.paid &&
            !!e.due &&
            e.due <= today(),
        );
        need(
          due.length === new Set(x.entries).size,
          "O lote mudou ou contém ganhos ainda não vencidos. Atualize a página.",
        );
        const total = due.reduce((v, e) => v + e.amount, 0);
        for (const e of due) {
          e.paid = true;
          e.paidAt = at;
        }
        s.entries.unshift({
          id: id(),
          at,
          type: "Repasse conciliado",
          driver: x.driver,
          amount: total,
          reference: x.reference,
          recordedBy: account.userId,
        });
        notify("Seu repasse foi registrado pela central.", undefined, x.driver);
      } else if (a === "readNotifications") {
        const allowed = new Set(
          visibleState(s, account).notifications.map((n) => n.id),
        );
        for (const n of s.notifications)
          if (allowed.has(n.id)) {
            n.readBy = [...new Set([...(n.readBy || []), account.userId])];
            if (account.role === "admin") n.read = true;
          }
      } else throw Error("Operação não suportada");
    }
    s.audit.unshift({
      at,
      actor: ctx.user.userId,
      action: a,
      entity: String(b.id || b.company || ""),
    });
    await save(ctx);
    return response(ctx);
  } catch (e) {
    if (e instanceof z.ZodError)
      return Response.json(
        {
          error: e.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; "),
        },
        { status: 400 },
      );
    return errorResponse(e);
  }
}
