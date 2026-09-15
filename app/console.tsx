"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  LayoutDashboard,
  Package,
  Building2,
  Bike,
  Wallet,
  CalendarDays,
  ChartNoAxesCombined,
  Settings,
  ArrowUpRight,
  Plus,
  Bell,
  Search,
  ChevronRight,
  Zap,
  ShieldCheck,
  Download,
  Check,
  Clock,
  ArrowRight,
  RefreshCw,
  CreditCard,
  Layers,
  LogOut,
  MapPin,
  FileText,
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetHeader,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Toaster } from "@/components/ui/sonner";
import Access, { Documents } from "./access";
import LogoutButton from "./logout-button";
import PasswordForm from "./password-form";
import { toast } from "sonner";
import {
  money,
  today,
  dateKey,
  quote,
  eligible,
  type Operation,
  type Order,
} from "@/lib/operation";
const nav = [
  ["Visão geral", LayoutDashboard],
  ["Entregas", Package],
  ["Empresas", Building2],
  ["Entregadores", Bike],
  ["Financeiro", Wallet],
  ["Escalas", CalendarDays],
  ["Planos", Layers],
  ["Relatórios", ChartNoAxesCombined],
  ["Configurações", Settings],
] as const;
const time = (s: string) =>
  new Date(s).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
const stamp = (s: string) =>
  new Date(s).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });
function Pick({
  value,
  onChange,
  items,
  label = "Selecionar",
}: {
  value: string;
  onChange: (v: string) => void;
  items: { id: string; name: string }[];
  label?: string;
}) {
  return (
    <Select
      value={value || "none"}
      onValueChange={(v) => onChange(v === "none" ? "" : v)}
    >
      <SelectTrigger className="w-full" aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">{label}</SelectItem>
        {items.map((i) => (
          <SelectItem value={i.id} key={i.id}>
            {i.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
function Empty({
  text = "Nenhum registro por aqui.",
  hint = "Os próximos registros aparecerão nesta lista.",
}) {
  return (
    <div className="empty">
      <Package size={30} />
      <h3>{text}</h3>
      <p>{hint}</p>
    </div>
  );
}
function Field({ name, label, type = "text", form, setForm, ...props }: any) {
  return (
    <label>
      {label}
      <input
        name={name}
        type={type}
        value={form[name] ?? ""}
        onChange={(e) =>
          setForm((f: any) => ({ ...f, [name]: e.target.value }))
        }
        {...props}
      />
    </label>
  );
}
export default function Console() {
  const [s, setS] = useState<Operation | null>(null),
    [page, setPage] = useState("Visão geral"),
    [role, setRole] = useState(""),
    [company, setCompany] = useState(""),
    [driver, setDriver] = useState(""),
    [error, setError] = useState(""),
    [signin, setSignin] = useState(false),
    [busy, setBusy] = useState(false),
    [modal, setModal] = useState(""),
    [form, setForm] = useState<any>({}),
    [detail, setDetail] = useState(""),
    [filter, setFilter] = useState("Todas"),
    [search, setSearch] = useState(""),
    [confirm, setConfirm] = useState<Order | null>(null),
    [day, setDay] = useState(today()),
    [now, setNow] = useState(Date.now());
  const [account, setAccount] = useState<any>(null),
    [profile, setProfile] = useState<any>(null);
  const revision = useRef(-1);
  const accept = (j: any) => {
    if (j.revision >= revision.current) {
      revision.current = j.revision;
      setS(j.state);
      setAccount(j.account);
      setProfile(j.profile);
      setSignin(false);
      if (j.account) {
        setRole(j.account.role);
        setCompany(j.account.role === "empresa" ? j.account.entityId : "");
        setDriver(j.account.role === "entregador" ? j.account.entityId : "");
      }
    }
  };
  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/operation");
      const j: any = await r.json();
      if (!r.ok) {
        setSignin(!!j.signin);
        if (j.signin) {
          setS(null);
          setAccount(null);
          setProfile(null);
          revision.current = -1;
        }
        throw Error(j.error);
      }
      accept(j);
      setError("");
    } catch (e: any) {
      setError(e.message || "Não foi possível conectar.");
    }
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(() => {
      load();
      setNow(Date.now());
    }, 12000);
    return () => clearInterval(t);
  }, [load]);
  const act = useCallback(async (action: string, data: any = {}) => {
    setBusy(true);
    try {
      const r = await fetch("/api/operation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, data }),
      });
      const j: any = await r.json();
      if (!r.ok) throw Error(j.error);
      accept(j);
      setError("");
      toast.success("Tudo certo. Alterações salvas.");
      return true;
    } catch (e: any) {
      setError(e.message);
      toast.error(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }, []);
  const go = (p: string) => {
    setPage(p);
    setSearch("");
    setFilter("Todas");
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const edit = (kind: string, data: any) => {
    setForm({ ...data });
    setModal(kind);
  };
  const field = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const c = s?.companies.find((x) => x.id === company),
    d = s?.drivers.find((x) => x.id === driver),
    current = s?.orders.find((x) => x.id === detail);
  const cn = (id: string) =>
    s?.companies.find((c) => c.id === id)?.name || "Empresa";
  const dn = (id: string) =>
    s?.drivers.find((d) => d.id === id)?.name || "Aguardando aceite";
  const orders = [...(s?.orders || [])].sort((a, b) => {
    if (a.status === "Pendente" && b.status === "Pendente") {
      const priority = (o: Order) =>
        s!.plans.find(
          (p) => p.id === s!.companies.find((c) => c.id === o.company)?.plan,
        )?.priority || 0;
      return priority(b) - priority(a);
    }
    return b.created.localeCompare(a.created);
  });
  const filtered = orders.filter(
    (o) =>
      (filter === "Todas" ||
        (filter === "Em andamento"
          ? ["Aceita", "Retirada"].includes(o.status)
          : o.status === filter)) &&
      `${o.client} ${cn(o.company)} ${o.address} ${o.id}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const todays = orders.filter((o) => dateKey(o.created) === today()),
    running = orders.filter((o) => ["Aceita", "Retirada"].includes(o.status));
  const earnings = (s?.entries || []).filter(
    (e) =>
      e.type === "Ganho de entrega" &&
      (role !== "entregador" || e.driver === driver),
  );
  const sum = (es: { amount: number }[]) =>
    es.reduce((a, e) => a + e.amount, 0);
  const pending = sum(earnings.filter((e) => !e.paid));
  const newOrder = () =>
    edit("order", {
      company: role === "empresa" ? company : s?.companies[0]?.id || "",
      client: "",
      phone: "",
      address: "",
      notes: "",
      zone: s?.settings.zones[0]?.name || "",
      distance: 2,
    });
  function exportCsv() {
    const rows = [
      [
        "Entrega",
        "Empresa",
        "Cliente",
        "Destino",
        "Entregador",
        "Status",
        "Valor",
        "Comissão",
        "Criada em",
      ],
      ...filtered.map((o) => [
        o.id,
        cn(o.company),
        o.client,
        o.address,
        dn(o.driver),
        o.status,
        (o.price / 100).toFixed(2),
        (o.fee / 100).toFixed(2),
        stamp(o.created),
      ]),
    ];
    const csv =
      "\ufeff" +
      rows
        .map((r) =>
          r
            .map(
              (v) =>
                '"' +
                String(v)
                  .replace(/^[=+@-]/, "'")
                  .replaceAll('"', '""') +
                '"',
            )
            .join(";"),
        )
        .join("\r\n");
    const u = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = u;
    a.download = `via-entregas-${today()}.csv`;
    a.click();
    URL.revokeObjectURL(u);
    toast.success("Relatório exportado.");
  }
  function orderActions(o: Order) {
    return (
      <>
        <button className="secondary" onClick={() => setDetail(o.id)}>
          Detalhes <ChevronRight size={15} />
        </button>
        {role === "entregador" && o.status === "Pendente" && (
          <button
            className="primary"
            disabled={busy}
            onClick={() =>
              act("orderStatus", { id: o.id, status: "Aceita", driver })
            }
          >
            Aceitar entrega
          </button>
        )}
        {role === "entregador" &&
          o.driver === driver &&
          ["Aceita", "Retirada"].includes(o.status) && (
            <button
              className="primary"
              disabled={busy}
              onClick={() =>
                act("orderStatus", {
                  id: o.id,
                  status: o.status === "Aceita" ? "Retirada" : "Entregue",
                  driver,
                })
              }
            >
              {o.status === "Aceita"
                ? "Retirada realizada"
                : "Confirmar entrega"}
            </button>
          )}
      </>
    );
  }
  function orderTable(list: Order[]) {
    return !list.length ? (
      <Empty
        text={
          search
            ? "Nenhuma entrega encontrada."
            : "Pronto para a próxima entrega."
        }
        hint={
          search
            ? "Tente outro nome, endereço ou filtro."
            : role === "entregador"
              ? "Fique online para receber as entregas disponíveis."
              : "Toque em Nova entrega para criar seu primeiro pedido."
        }
      />
    ) : (
      <>
        <div className="desktop-orders">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entrega / cliente</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Entregador</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <button
                      onClick={() => setDetail(o.id)}
                      className="text-left"
                    >
                      <div className="row-name">{o.client}</div>
                      <div className="row-sub">
                        #{o.id.slice(0, 6).toUpperCase()} · {time(o.created)}
                      </div>
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="row-name">{cn(o.company)}</div>
                    <div className="row-sub">
                      {o.zone} · {o.distance} km
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="row-name">
                      {o.driver ? dn(o.driver) : "Buscando entregador"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={"badge " + o.status}>{o.status}</span>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {money(role === "entregador" ? o.price - o.fee : o.price)}
                  </TableCell>
                  <TableCell>
                    <div className="table-actions">{orderActions(o)}</div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="mobile-orders">
          {list.map((o) => (
            <article className="delivery-card" key={o.id}>
              <div className="delivery-card-top">
                <span className={"badge " + o.status}>{o.status}</span>
                <small>
                  #{o.id.slice(0, 6).toUpperCase()} · {time(o.created)}
                </small>
              </div>
              <div className="delivery-card-title">
                <h3>{o.client}</h3>
                <strong>
                  {money(role === "entregador" ? o.price - o.fee : o.price)}
                </strong>
              </div>
              <p className="delivery-company">{cn(o.company)}</p>
              <div className="destination">
                <MapPin size={18} />
                <p>
                  {o.address}
                  <small>
                    {o.zone} · {o.distance} km
                  </small>
                </p>
              </div>
              <div className="delivery-driver">
                <Bike size={17} />
                {o.driver ? dn(o.driver) : "Buscando entregador"}
              </div>
              <div className="delivery-actions">{orderActions(o)}</div>
            </article>
          ))}
        </div>
      </>
    );
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    let a = "",
      data = { ...form };
    if (modal === "order") {
      a = "createOrder";
      data.distance = Number(data.distance);
    }
    if (modal === "credit") {
      a = "credit";
      data.amount = Math.round(Number(data.amount) * 100);
    }
    if (modal === "settle") {
      a = "settle";
      data.entries =
        s?.entries
          .filter(
            (e) =>
              e.type === "Ganho de entrega" &&
              e.driver === data.driver &&
              !e.paid &&
              e.due &&
              e.due <= today(),
          )
          .map((e) => e.id) || [];
    }
    if (modal === "company") {
      a = "saveCompany";
      data.customPrice =
        data.customPrice === "" || data.customPrice === null
          ? null
          : Math.round(Number(data.customPrice) * 100);
    }
    if (modal === "driver") a = "saveDriver";
    if (modal === "slot") a = "saveSlot";
    if (modal === "plan") {
      a = "savePlan";
      data.price = Math.round(Number(data.price) * 100);
      data.discount = Number(data.discount);
      data.priority = Number(data.priority);
    }
    if (modal === "settings") {
      a = "settings";
      data.base = Math.round(Number(data.base) * 100);
      data.km = Math.round(Number(data.km) * 100);
      data.commission = Number(data.commission);
      data.prioritySeconds = Number(data.prioritySeconds);
      data.alertMinutes = Number(data.alertMinutes);
      data.zones = data.zones.map((z: any) => ({
        ...z,
        price: Math.round(Number(z.price) * 100),
      }));
    }
    if (await act(a, data)) setModal("");
  }
  const input = (name: string, label: string, props: any = {}) => (
    <Field
      key={name}
      name={name}
      label={label}
      form={form}
      setForm={setForm}
      {...props}
    />
  );
  const statCards =
    role === "empresa"
      ? [
          [
            "Saldo disponível",
            money(c?.balance || 0),
            Wallet,
            "Recargas conciliadas",
          ],
          ["Entregas do dia", todays.length, Package, "Pedidos de hoje"],
          [
            "Em atendimento",
            new Set(running.map((o) => o.driver)).size,
            Bike,
            "Entregadores",
          ],
          [
            "Plano atual",
            s?.plans.find((p) => p.id === c?.plan)?.name || "—",
            Layers,
            "Seu plano",
          ],
        ]
      : role === "entregador"
        ? [
            [
              "Ganhos do dia",
              money(sum(earnings.filter((e) => dateKey(e.at) === today()))),
              Wallet,
              "Após a comissão",
            ],
            [
              "Concluídas",
              orders.filter(
                (o) =>
                  o.status === "Entregue" &&
                  o.completed &&
                  dateKey(o.completed) === today(),
              ).length,
              Package,
              "Entregas hoje",
            ],
            ["Em andamento", running.length, Bike, "Suas entregas"],
            ["A receber", money(pending), Clock, "Repasse conciliado D+1"],
          ]
        : [
            ["Entregas do dia", todays.length, Package, "Todas as empresas"],
            [
              "Em andamento",
              running.length,
              Bike,
              `${s?.drivers.filter((d) => d.online && d.active).length || 0} online`,
            ],
            [
              "Empresas ativas",
              s?.companies.filter((c) => c.active).length || 0,
              Building2,
              "Na sua central",
            ],
            [
              "Saldos disponíveis",
              money(
                sum((s?.companies || []).map((c) => ({ amount: c.balance }))),
              ),
              Wallet,
              "Saldos disponíveis",
            ],
          ];
  if (!s)
    return (
      <>
        <Access
          account={account}
          profile={profile}
          error={error}
          signin={signin}
          busy={busy}
          onRegister={(b) => act("register", b)}
          onRetry={load}
        />
        <Toaster position="top-right" />
      </>
    );
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="brand">
            <span>v.</span>via<span className="brand-small">DELIVERY</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <div className="nav-label">CENTRAL DE OPERAÇÕES</div>
          <SidebarMenu>
            {nav
              .filter(
                ([label]) =>
                  role === "admin" ||
                  (role === "empresa"
                    ? [
                        "Visão geral",
                        "Entregas",
                        "Financeiro",
                        "Escalas",
                        "Planos",
                        "Configurações",
                      ]
                    : [
                        "Visão geral",
                        "Entregas",
                        "Financeiro",
                        "Escalas",
                        "Configurações",
                      ]
                  ).includes(label),
              )
              .map(([label, Icon]) => (
                <SidebarMenuItem key={label}>
                  <SidebarMenuButton
                    isActive={page === label}
                    onClick={() => go(label)}
                  >
                    <Icon />
                    <span>{label}</span>
                    {label === "Entregas" &&
                      orders.filter((o) => o.status === "Pendente").length >
                        0 && (
                        <b className="nav-count">
                          {orders.filter((o) => o.status === "Pendente").length}
                        </b>
                      )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <div className="sidebar-help">
            <ShieldCheck size={23} />
            <strong>Sua operação, conectada.</strong>
            <p>Do primeiro pedido à última entrega.</p>
          </div>
          <div className="user">
            <span className="avatar">
              {role === "admin" ? "AD" : role === "empresa" ? "EM" : "EN"}
            </span>
            <div>
              <b>
                {role === "admin"
                  ? "Administrador"
                  : role === "empresa"
                    ? c?.name
                    : d?.name}
              </b>
              <small>Conta autenticada</small>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <main className="workspace">
        <header className="topbar">
          <div>
            <SidebarTrigger />
            <span className="desktop-breadcrumb">
              Operação <ChevronRight size={14} /> {page}
            </span>
            <b className="mobile-brand">
              via<span>.</span>
            </b>
          </div>
          <div className="top-right">
            <span className="live-user-label">
              {role === "admin"
                ? "Administrador"
                : role === "empresa"
                  ? "Empresa"
                  : "Entregador"}
            </span>
            <button
              className="icon-button"
              aria-label="Notificações"
              onClick={() => {
                setModal("notifications");
                act("readNotifications");
              }}
            >
              <Bell size={19} />
              {s?.notifications.some((n) => !n.read) && (
                <span className="unread" />
              )}
            </button>
          </div>
        </header>
        <div className="page">
          {error && (
            <div className="error-banner">
              {error}{" "}
              {signin ? (
                <a href="/login" target="_top" className="secondary">
                  Entrar na central
                </a>
              ) : (
                <button onClick={load} className="secondary">
                  Tentar novamente
                </button>
              )}
            </div>
          )}
          <div className="heading">
            <div>
              <div className="eyebrow">
                {role === "admin"
                  ? "CENTRAL DE OPERAÇÕES"
                  : role === "empresa"
                    ? "BOM TER VOCÊ POR AQUI"
                    : "PRONTO PARA RODAR?"}
              </div>
              <h1>
                {page === "Visão geral"
                  ? role === "empresa"
                    ? "Bora entregar"
                    : role === "entregador"
                      ? "Seu próximo destino"
                      : "Operação em movimento"
                  : page}
                <span>.</span>
              </h1>
              <p>
                {page === "Visão geral"
                  ? "Seu dia, suas entregas. Tudo aqui."
                  : (
                      {
                        Entregas: "Do aceite à chegada, acompanhe por aqui.",
                        Empresas: "Negócios que movimentam a sua região.",
                        Entregadores: "Quem faz a operação acontecer.",
                        Financeiro: "Cada entrega. Cada valor. Tudo no lugar.",
                        Escalas: "Reserve seu próximo turno.",
                        Planos: "Condições para cada negócio.",
                        Relatórios: "Os números da sua operação.",
                        Configurações: "Sua operação, do seu jeito.",
                      } as any
                    )[page]}
              </p>
            </div>
            {role !== "entregador" && (
              <button
                className="primary new-order"
                onClick={newOrder}
                disabled={!s}
              >
                <Plus size={20} /> Nova entrega
              </button>
            )}
            {role === "entregador" && d && (
              <div className="online-control">
                <Switch
                  checked={d.online}
                  onCheckedChange={(online) =>
                    act("online", { id: driver, online })
                  }
                  aria-label="Ficar online"
                />
                <b>{d.online ? "Você está online" : "Você está offline"}</b>
              </div>
            )}
          </div>
          {role === "admin" && !s.settings.configured && (
            <div className="notice">
              <ShieldCheck size={16} />
              <span>
                Antes de operar, defina região e preços em Configurações.
              </span>
            </div>
          )}
          {role !== "admin" && (
            <div className="toolbar profile-picker">
              <strong>{role === "empresa" ? c?.name : d?.name}</strong>
              <span className="form-note">
                {role === "empresa" ? c?.address : d?.point}
              </span>
            </div>
          )}
          {!s && !error && (
            <Empty
              text="Conectando sua central…"
              hint="Carregando os dados da operação."
            />
          )}
          {s && (
            <>
              {page === "Visão geral" && (
                <>
                  <section className="welcome">
                    <div>
                      <span className="pill">
                        <Zap size={13} /> CENTRAL VIA
                      </span>
                      <h2>
                        Menos espera.
                        <br />
                        Mais entregas.
                      </h2>
                      <p>Seu negócio não para. A gente acompanha.</p>
                    </div>
                    <div className="welcome-stat">
                      <span>OPERAÇÃO INTEGRADA</span>
                      <strong>
                        De ponta
                        <br />a ponta <ArrowUpRight />
                      </strong>
                      <small>Solicitar → Retirar → Entregar</small>
                    </div>
                  </section>
                  <div className="metrics">
                    {statCards.map(([t, n, I, h]: any) => (
                      <article className="metric" key={t}>
                        <div>
                          {t}
                          <I size={19} />
                        </div>
                        <strong>{n}</strong>
                        <small>{h}</small>
                      </article>
                    ))}
                  </div>
                  <section className="panel orders-panel">
                    <div className="panel-title">
                      <h2>
                        Suas entregas{" "}
                        <span className="badge">{orders.length}</span>
                      </h2>
                      <button onClick={() => go("Entregas")}>
                        Ver todas <ArrowUpRight size={16} />
                      </button>
                    </div>
                    {orderTable(orders.slice(0, 5))}
                  </section>
                  <div className="split-layout">
                    <section className="panel">
                      <div className="panel-title">
                        <h2>Sua semana</h2>
                        <span className="badge">Entregas</span>
                      </div>
                      <div className="bar-chart">
                        {Array.from({ length: 7 }, (_, i) => {
                          const dt = new Date();
                          dt.setDate(dt.getDate() - 6 + i);
                          const key = dateKey(dt.toISOString());
                          const count = orders.filter(
                            (o) => dateKey(o.created) === key,
                          ).length;
                          const max = Math.max(
                            1,
                            ...Array.from({ length: 7 }, (_, j) => {
                              const dd = new Date();
                              dd.setDate(dd.getDate() - j);
                              return orders.filter(
                                (o) =>
                                  dateKey(o.created) ===
                                  dateKey(dd.toISOString()),
                              ).length;
                            }),
                          );
                          return (
                            <div key={i} title={`${count} entregas`}>
                              <small>{count}</small>
                              <span
                                style={{
                                  height: Math.max(3, (count / max) * 105),
                                }}
                              />
                              <small>
                                {dt.toLocaleDateString("pt-BR", {
                                  weekday: "short",
                                })}
                              </small>
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ height: 20 }} />
                    </section>
                    <section className="panel">
                      <div className="panel-title">
                        <h2>Acontecendo agora</h2>
                        <Clock size={16} />
                      </div>
                      {s.notifications.slice(0, 3).map((n) => (
                        <div className="activity" key={n.id}>
                          <span className="activity-icon">
                            <Check size={16} />
                          </span>
                          <div>
                            <strong>{n.text}</strong>
                            <p>{stamp(n.at)}</p>
                          </div>
                        </div>
                      ))}
                    </section>
                  </div>
                </>
              )}
              {page === "Entregas" && (
                <>
                  <div className="toolbar delivery-toolbar">
                    <Tabs value={filter} onValueChange={setFilter}>
                      <TabsList className="status-tabs">
                        <TabsTrigger value="Todas">Todas</TabsTrigger>
                        <TabsTrigger value="Pendente">Pendentes</TabsTrigger>
                        <TabsTrigger value="Em andamento">
                          Em andamento
                        </TabsTrigger>
                        <TabsTrigger value="Entregue">Finalizadas</TabsTrigger>
                        <TabsTrigger value="Cancelada">Canceladas</TabsTrigger>
                      </TabsList>
                    </Tabs>
                    <div className="search">
                      <Search size={17} />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar uma entrega"
                        aria-label="Buscar entrega"
                      />
                    </div>
                  </div>
                  <section className="panel orders-panel">
                    {orderTable(filtered)}
                  </section>
                </>
              )}
              {page === "Empresas" && (
                <>
                  <div className="toolbar">
                    <div className="search">
                      <Search size={17} />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar empresa"
                        aria-label="Buscar empresa"
                      />
                    </div>
                    <button
                      className="secondary"
                      onClick={() =>
                        edit("company", {
                          name: "",
                          contact: "",
                          email: "",
                          document: "",
                          phone: "",
                          address: "",
                          hours: "08:00–18:00",
                          plan: s.plans[0].id,
                          customPrice: "",
                          fixed: "",
                          favorites: [],
                          active: false,
                        })
                      }
                    >
                      <Plus size={17} /> Cadastrar empresa
                    </button>
                  </div>
                  <div className="cards">
                    {s.companies
                      .filter((c) =>
                        c.name.toLowerCase().includes(search.toLowerCase()),
                      )
                      .map((c) => (
                        <article className="entity" key={c.id}>
                          <div className="entity-top">
                            <span className="entity-icon">
                              <Building2 size={22} />
                            </span>
                            <span
                              className={
                                "badge " + (c.active ? "Ativo" : "Pendente")
                              }
                            >
                              {c.active ? "Ativa" : "Aguardando aprovação"}
                            </span>
                          </div>
                          <h3>{c.name}</h3>
                          <p>
                            {c.address}
                            <br />
                            {c.hours}
                          </p>
                          <div className="summary-line">
                            <span>Plano</span>
                            <b>{s.plans.find((p) => p.id === c.plan)?.name}</b>
                          </div>
                          <div className="summary-line">
                            <span>Saldo disponível</span>
                            <b>{money(c.balance)}</b>
                          </div>
                          <div className="actions">
                            <button
                              className="secondary"
                              onClick={() =>
                                edit("company", {
                                  ...c,
                                  customPrice:
                                    c.customPrice === null
                                      ? ""
                                      : c.customPrice / 100,
                                })
                              }
                            >
                              Gerenciar
                            </button>
                            <button
                              className="secondary"
                              onClick={() =>
                                edit("credit", { company: c.id, amount: 100 })
                              }
                            >
                              Adicionar crédito
                            </button>
                          </div>
                        </article>
                      ))}
                  </div>
                </>
              )}
              {page === "Entregadores" && (
                <>
                  <div className="toolbar">
                    <div className="search">
                      <Search size={17} />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar entregador"
                        aria-label="Buscar entregador"
                      />
                    </div>
                    <button
                      className="secondary"
                      onClick={() =>
                        edit("driver", {
                          name: "",
                          phone: "",
                          email: "",
                          document: "",
                          vehicle: "Moto",
                          plate: "",
                          pix: "",
                          address: "",
                          online: false,
                          active: false,
                          favorites: [],
                          point: "Centro",
                        })
                      }
                    >
                      <Plus size={17} /> Cadastrar entregador
                    </button>
                  </div>
                  <div className="cards">
                    {s.drivers
                      .filter((d) =>
                        d.name.toLowerCase().includes(search.toLowerCase()),
                      )
                      .map((d) => (
                        <article className="entity" key={d.id}>
                          <div className="entity-top">
                            <span className="entity-icon">
                              <Bike size={23} />
                            </span>
                            <span
                              className={
                                "badge " + (d.active ? "Ativo" : "Pendente")
                              }
                            >
                              {!d.active
                                ? "Aguardando aprovação"
                                : d.online
                                  ? "Online"
                                  : "Offline"}
                            </span>
                          </div>
                          <h3>{d.name}</h3>
                          <p>
                            {d.vehicle} · {d.point}
                            <br />
                            {d.phone || "Telefone não cadastrado"}
                          </p>
                          <div className="summary-line">
                            <span>Concluídas</span>
                            <b>
                              {
                                s.orders.filter(
                                  (o) =>
                                    o.driver === d.id &&
                                    o.status === "Entregue",
                                ).length
                              }
                            </b>
                          </div>
                          <div className="summary-line">
                            <span>Ganhos acumulados</span>
                            <b>
                              {money(
                                sum(
                                  s.entries.filter(
                                    (e) =>
                                      e.driver === d.id &&
                                      e.type === "Ganho de entrega",
                                  ),
                                ),
                              )}
                            </b>
                          </div>
                          <div className="actions">
                            <button
                              className="secondary"
                              onClick={() => edit("driver", d)}
                            >
                              Gerenciar
                            </button>
                            <button
                              className="secondary"
                              onClick={() =>
                                edit("documents", { entity: d.id })
                              }
                            >
                              Documentos <FileText size={15} />
                            </button>
                          </div>
                        </article>
                      ))}
                  </div>
                </>
              )}
              {page === "Financeiro" && (
                <>
                  <div className="metrics">
                    {(role === "empresa"
                      ? [
                          ["Saldo disponível", money(c?.balance || 0)],
                          [
                            "Consumo hoje",
                            money(
                              todays
                                .filter((o) => o.status !== "Cancelada")
                                .reduce((a, o) => a + o.price, 0),
                            ),
                          ],
                          [
                            "Consumo do mês",
                            money(
                              orders
                                .filter(
                                  (o) =>
                                    o.status !== "Cancelada" &&
                                    dateKey(o.created).slice(0, 7) ===
                                      today().slice(0, 7),
                                )
                                .reduce((a, o) => a + o.price, 0),
                            ),
                          ],
                          [
                            "Plano atual",
                            s.plans.find((p) => p.id === c?.plan)?.name,
                          ],
                        ]
                      : role === "entregador"
                        ? [
                            [
                              "Ganhos hoje",
                              money(
                                sum(
                                  earnings.filter(
                                    (e) => dateKey(e.at) === today(),
                                  ),
                                ),
                              ),
                            ],
                            [
                              "Últimos 7 dias",
                              money(
                                sum(
                                  earnings.filter(
                                    (e) =>
                                      Date.now() - new Date(e.at).getTime() <
                                      7 * 86400000,
                                  ),
                                ),
                              ),
                            ],
                            [
                              "Ganhos do mês",
                              money(
                                sum(
                                  earnings.filter(
                                    (e) =>
                                      dateKey(e.at).slice(0, 7) ===
                                      today().slice(0, 7),
                                  ),
                                ),
                              ),
                            ],
                            ["A receber", money(pending)],
                          ]
                        : [
                            [
                              "Recargas conciliadas",
                              money(
                                sum(
                                  s.entries.filter(
                                    (e) => e.type === "Recarga conciliada",
                                  ),
                                ),
                              ),
                            ],
                            [
                              "Comissões",
                              money(
                                sum(
                                  s.entries.filter(
                                    (e) => e.type === "Comissão",
                                  ),
                                ),
                              ),
                            ],
                            ["Repasses pendentes", money(pending)],
                            [
                              "Repasses realizados",
                              money(
                                sum(
                                  s.entries.filter(
                                    (e) => e.type === "Repasse conciliado",
                                  ),
                                ),
                              ),
                            ],
                          ]
                    ).map(([label, value]) => (
                      <article className="metric" key={label}>
                        <div>
                          {label}
                          <Wallet size={18} />
                        </div>
                        <strong>{value}</strong>
                        <small>Valores registrados</small>
                      </article>
                    ))}
                  </div>
                  <div className="toolbar">
                    <p className="form-note">
                      Ganhos elegíveis no dia seguinte, em um lote diário.
                    </p>
                    {role === "admin" && (
                      <button
                        className="primary"
                        onClick={() =>
                          edit("credit", {
                            company: s.companies[0]?.id,
                            amount: 100,
                          })
                        }
                      >
                        <Plus size={17} /> Adicionar créditos
                      </button>
                    )}
                  </div>
                  <div className="split-layout">
                    <section className="panel">
                      <div className="panel-title">
                        <h2>Extrato financeiro</h2>
                        <Wallet size={17} />
                      </div>
                      {s.entries
                        .filter((e) =>
                          role === "empresa"
                            ? e.company === company && e.type !== "Comissão"
                            : role === "entregador"
                              ? e.driver === driver
                              : true,
                        )
                        .map((e) => (
                          <div className="statement-row" key={e.id}>
                            <div>
                              <strong>{e.type}</strong>
                              <p>
                                {e.company ? cn(e.company) : dn(e.driver || "")}
                              </p>
                              <small>
                                {stamp(e.at)}
                                {e.due
                                  ? ` · ${e.paid ? "Liquidado" : "D+1: " + e.due.split("-").reverse().join("/")}`
                                  : ""}
                              </small>
                            </div>
                            <b>{money(e.amount)}</b>
                          </div>
                        ))}
                    </section>
                    <div>
                      <section className="panel">
                        <div className="panel-title">
                          <h2>Recebimentos e repasses</h2>
                          <CreditCard size={18} />
                        </div>
                        <div className="integration">
                          <span className="badge">Conferência bancária</span>
                          <h3>Recebimentos e repasses</h3>
                          <p>
                            Recargas são liberadas pelo administrador somente
                            após conferir o recebimento. Repasses são
                            registrados após a transferência bancária, com
                            referência e responsável.
                          </p>
                          <div className="summary-line">
                            <span>PIX / cartão automático</span>
                            <span className="badge Pendente">
                              Não conectado
                            </span>
                          </div>
                          <div className="summary-line">
                            <span>Transferência automática</span>
                            <span className="badge Pendente">
                              Não conectada
                            </span>
                          </div>
                          {role === "admin" ? (
                            <button
                              className="secondary section-space"
                              onClick={() =>
                                edit("settle", {
                                  driver: s.drivers[0]?.id || "",
                                  reference: "",
                                  confirmed: false,
                                })
                              }
                            >
                              Registrar repasse realizado
                            </button>
                          ) : (
                            <p className="form-note section-space">
                              Solicite as instruções de pagamento à central.
                              Nenhum saldo é liberado apenas por declarar uma
                              transferência.
                            </p>
                          )}
                        </div>
                      </section>
                    </div>
                  </div>
                </>
              )}
              {page === "Escalas" && (
                <>
                  <div className="toolbar">
                    <label className="date-pick">
                      Data{" "}
                      <input
                        type="date"
                        value={day}
                        onChange={(e) => setDay(e.target.value)}
                      />
                    </label>
                    {role === "admin" && (
                      <button
                        className="secondary"
                        onClick={() =>
                          edit("slot", {
                            company: s.companies[0]?.id,
                            date: day,
                            start: "08:00",
                            end: "12:00",
                          })
                        }
                      >
                        <Plus size={17} /> Abrir horário
                      </button>
                    )}
                  </div>
                  <div className="cards">
                    {s.slots
                      .filter(
                        (t) =>
                          t.date === day &&
                          (role !== "empresa" || t.company === company),
                      )
                      .sort((a, b) => a.start.localeCompare(b.start))
                      .map((t) => (
                        <article className="entity" key={t.id}>
                          <div className="entity-top">
                            <CalendarDays size={23} />
                            <span
                              className={
                                "badge " + (t.driver ? "Ativo" : "Pendente")
                              }
                            >
                              {t.driver ? "Reservado" : "Vaga aberta"}
                            </span>
                          </div>
                          <h3>
                            {t.start}{" "}
                            <span className="text-muted-foreground">—</span>{" "}
                            {t.end}
                          </h3>
                          <p>
                            {cn(t.company)}
                            <br />
                            {t.driver
                              ? dn(t.driver)
                              : "Aguardando um entregador"}
                          </p>
                          <div className="actions">
                            {!t.driver && role === "entregador" && (
                              <button
                                className="primary"
                                disabled={busy}
                                onClick={() =>
                                  act("bookSlot", { id: t.id, driver })
                                }
                              >
                                Reservar horário
                              </button>
                            )}
                            {t.driver &&
                              (role === "admin" ||
                                (role === "entregador" &&
                                  t.driver === driver)) && (
                                <button
                                  className="secondary"
                                  disabled={busy}
                                  onClick={() =>
                                    act("bookSlot", { id: t.id, release: true })
                                  }
                                >
                                  Liberar horário
                                </button>
                              )}
                          </div>
                        </article>
                      ))}
                  </div>
                  {!s.slots.some(
                    (t) =>
                      t.date === day &&
                      (role !== "empresa" || t.company === company),
                  ) && (
                    <Empty
                      text="Nenhuma escala nesta data."
                      hint="Selecione outra data ou abra um novo horário."
                    />
                  )}
                  <p className="form-note section-space">
                    Vagas são verificadas com a central aberta,{" "}
                    {s.settings.alertMinutes} minutos antes do turno. Avisos
                    externos automáticos ainda não estão conectados.
                  </p>
                </>
              )}
              {page === "Planos" && (
                <>
                  <div className="toolbar">
                    <p className="form-note">
                      Descontos aplicados às próximas entregas.
                    </p>
                    {role === "admin" && (
                      <button
                        className="secondary"
                        onClick={() =>
                          edit("plan", {
                            name: "",
                            price: 0,
                            discount: 0,
                            priority: 1,
                            description: "",
                          })
                        }
                      >
                        <Plus size={17} /> Criar plano
                      </button>
                    )}
                  </div>
                  <div className="cards">
                    {s.plans.map((p, i) => (
                      <article
                        className={"entity plan " + (i === 1 ? "featured" : "")}
                        key={p.id}
                      >
                        {i === 1 && (
                          <span className="badge Ativo">PARA CRESCER</span>
                        )}
                        <h3>{p.name}</h3>
                        <p>{p.description}</p>
                        <div className="plan-price">
                          {money(p.price)}
                          <small>/ mês · valor configurado</small>
                        </div>
                        <div className="summary-line">
                          <span>Desconto por entrega</span>
                          <b>{p.discount}%</b>
                        </div>
                        <div className="summary-line">
                          <span>Prioridade na lista</span>
                          <b>Nível {p.priority}</b>
                        </div>
                        <p className="form-note section-space">
                          Condições atribuídas pela administração. Cobrança
                          recorrente depende do provedor de pagamentos.
                        </p>
                        {role === "admin" && (
                          <button
                            className="secondary section-space"
                            onClick={() =>
                              edit("plan", { ...p, price: p.price / 100 })
                            }
                          >
                            Editar condições
                          </button>
                        )}
                      </article>
                    ))}
                  </div>
                </>
              )}
              {page === "Relatórios" && (
                <>
                  <div className="toolbar">
                    <div className="search">
                      <Search size={17} />
                      <input
                        placeholder="Empresa ou cliente"
                        aria-label="Filtrar relatório"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <button className="secondary" onClick={exportCsv}>
                      <Download size={17} /> Exportar CSV
                    </button>
                  </div>
                  <section className="panel orders-panel">
                    <div className="panel-title">
                      <h2>Entregas e comissões</h2>
                      <span className="badge">{filtered.length} registros</span>
                    </div>
                    {orderTable(filtered)}
                  </section>
                </>
              )}
              {page === "Configurações" && (
                <>
                  <div className="mobile-more">
                    {nav
                      .filter(
                        ([n]) =>
                          role === "admin" ||
                          (role === "empresa" && n === "Planos"),
                      )
                      .filter(([n]) =>
                        [
                          "Empresas",
                          "Entregadores",
                          "Planos",
                          "Relatórios",
                        ].includes(n),
                      )
                      .map(([n, I]) => (
                        <button
                          key={n}
                          className="secondary"
                          onClick={() => go(n)}
                        >
                          <I size={18} />
                          {n}
                          <ChevronRight size={17} />
                        </button>
                      ))}
                  </div>
                  <div className="cards">
                    {role === "admin" ? (
                      <>
                        <article className="entity">
                          <Settings size={25} />
                          <h3>Preços e distribuição</h3>
                          <p>
                            Tarifas, quilômetros, setores, comissão e
                            prioridades.
                          </p>
                          <div className="summary-line">
                            <span>Tarifa base</span>
                            <b>{money(s.settings.base)}</b>
                          </div>
                          <div className="summary-line">
                            <span>Por quilômetro</span>
                            <b>{money(s.settings.km)}</b>
                          </div>
                          <div className="summary-line">
                            <span>Comissão</span>
                            <b>{s.settings.commission}%</b>
                          </div>
                          <button
                            className="secondary section-space"
                            onClick={() =>
                              edit("settings", {
                                ...s.settings,
                                base: s.settings.base / 100,
                                km: s.settings.km / 100,
                                zones: s.settings.zones.map((z) => ({
                                  ...z,
                                  price: z.price / 100,
                                })),
                              })
                            }
                          >
                            Editar regras
                          </button>
                        </article>
                        <article className="entity">
                          <Bell size={25} />
                          <h3>Notificações</h3>
                          <p>
                            Pedidos, mudanças de status e vagas na escala são
                            registrados na central.
                          </p>
                          <div className="summary-line">
                            <span>Avisos internos</span>
                            <span className="badge Ativo">Ativos</span>
                          </div>
                          <div className="summary-line">
                            <span>WhatsApp e push</span>
                            <span className="badge Pendente">
                              Não conectados
                            </span>
                          </div>
                        </article>
                        <article className="entity">
                          <ShieldCheck size={25} />
                          <h3>Acesso à central</h3>
                          <p>
                            Contas individuais com autenticação e permissões
                            verificadas no servidor.
                          </p>
                          <p className="section-space">
                            Cada pessoa cria sua conta com e-mail e senha e
                            aguarda aprovação da central. Confira a identidade
                            antes de aprovar o cadastro.
                          </p>
                          <PasswordForm />
                          <LogoutButton />
                        </article>
                      </>
                    ) : (
                      <article className="entity">
                        <h3>{role === "empresa" ? c?.name : d?.name}</h3>
                        <p>{role === "empresa" ? c?.address : d?.vehicle}</p>
                        <p className="section-space">
                          Dados cadastrais e condições comerciais são
                          administrados pela central.
                        </p>
                        <Documents />
                        {role === "entregador" && (
                          <div className="summary-line">
                            <span>Chave PIX</span>
                            <b>{d?.pix || "Não cadastrada"}</b>
                          </div>
                        )}
                        <PasswordForm />
                        <LogoutButton />
                      </article>
                    )}
                  </div>
                </>
              )}
            </>
          )}
          <footer className="page-footer">
            <span>via delivery</span>
            <span>Uma operação. Todos conectados.</span>
            <button onClick={load}>
              <RefreshCw size={13} /> Atualizar
            </button>
          </footer>
        </div>
      </main>
      <nav className="bottom-nav" aria-label="Navegação principal">
        {[
          ["Visão geral", "Início", LayoutDashboard],
          ["Entregas", "Entregas", Package],
          ["Escalas", "Escalas", CalendarDays],
          ["Financeiro", "Carteira", Wallet],
          ["Configurações", "Mais", Settings],
        ].map(([key, label, I]: any) => (
          <button
            key={key}
            className={page === key ? "active" : ""}
            onClick={() => go(key)}
          >
            <I size={21} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <Dialog
        open={!!modal}
        onOpenChange={(v) => {
          if (!v) setModal("");
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {
                (
                  {
                    order: "Nova entrega",
                    credit: "Registrar recebimento",
                    company: "Cadastro da empresa",
                    driver: "Cadastro do entregador",
                    slot: "Abrir horário",
                    plan: "Condições do plano",
                    settings: "Regras da operação",
                    notifications: "Notificações",
                    settle: "Registrar repasse",
                    documents: "Documentos do entregador",
                  } as any
                )[modal]
              }
            </DialogTitle>
            <DialogDescription>
              {modal === "order"
                ? "Informe o destino e confira o valor."
                : modal === "credit"
                  ? "Registre apenas valores efetivamente recebidos e conferidos."
                  : modal === "notifications"
                    ? "Atualizações da sua central."
                    : "As alterações serão salvas na sua central."}
            </DialogDescription>
          </DialogHeader>
          {modal === "documents" ? (
            <Documents entity={form.entity} readOnly />
          ) : modal === "notifications" ? (
            <div>
              {s?.notifications.map((n) => (
                <div className="activity" key={n.id}>
                  <Bell size={17} />
                  <div>
                    <strong>{n.text}</strong>
                    <p>{stamp(n.at)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <form className="form" onSubmit={submit}>
              {modal === "order" && s && (
                <>
                  <label>
                    Empresa
                    <Pick
                      value={form.company}
                      onChange={(v) => field("company", v)}
                      items={
                        role === "empresa"
                          ? s.companies.filter((c) => c.id === company)
                          : s.companies.filter((c) => c.active)
                      }
                      label="Selecione a empresa"
                    />
                  </label>
                  {input("client", "Nome do cliente", {
                    required: true,
                    minLength: 2,
                  })}
                  {input("phone", "Telefone do cliente", {
                    type: "tel",
                    required: true,
                    placeholder: "(11) 99999-9999",
                  })}
                  {input("address", "Endereço completo", {
                    required: true,
                    minLength: 5,
                    placeholder: "Rua, número, bairro e complemento",
                  })}
                  <div className="pair">
                    <label>
                      Setor
                      <Pick
                        value={form.zone}
                        onChange={(v) => field("zone", v)}
                        items={s.settings.zones.map((z) => ({
                          id: z.name,
                          name: z.name,
                        }))}
                        label="Setor"
                      />
                    </label>
                    {input("distance", "Distância estimada (km)", {
                      type: "number",
                      min: 0,
                      max: 200,
                      step: 0.1,
                      required: true,
                    })}
                  </div>
                  <label>
                    Observações
                    <textarea
                      value={form.notes}
                      onChange={(e) => field("notes", e.target.value)}
                      maxLength={300}
                      placeholder="Referência, portaria, cuidados com o pedido…"
                    />
                  </label>
                  <div className="quote">
                    <span>Valor da entrega</span>
                    <strong>
                      {(() => {
                        try {
                          return money(
                            quote(
                              s,
                              form.company,
                              form.zone,
                              Number(form.distance) || 0,
                            ),
                          );
                        } catch {
                          return "—";
                        }
                      })()}
                    </strong>
                  </div>
                  <p className="form-note">
                    Valor reservado no saldo. A distância é informada
                    manualmente, sem cálculo por mapa.
                  </p>
                </>
              )}
              {modal === "credit" && s && (
                <>
                  <label>
                    Empresa
                    <Pick
                      value={form.company}
                      onChange={(v) => field("company", v)}
                      items={s.companies}
                      label="Empresa"
                    />
                  </label>
                  {input("amount", "Valor recebido (R$)", {
                    type: "number",
                    min: 1,
                    max: 100000,
                    step: 0.01,
                    required: true,
                  })}
                  {input(
                    "reference",
                    "Identificador único da transação bancária",
                    { required: true, minLength: 6 },
                  )}
                  <label className="confirm-money">
                    <input
                      type="checkbox"
                      required
                      checked={!!form.confirmed}
                      onChange={(e) => field("confirmed", e.target.checked)}
                    />
                    Conferi no banco que este valor foi recebido pela operação.
                  </label>
                </>
              )}
              {modal === "settle" && s && (
                <>
                  <label>
                    Entregador
                    <Pick
                      value={form.driver}
                      onChange={(v) => field("driver", v)}
                      items={s.drivers}
                      label="Entregador"
                    />
                  </label>
                  <div className="quote">
                    <span>Total elegível D+1</span>
                    <strong>
                      {money(
                        sum(
                          s.entries.filter(
                            (e) =>
                              e.driver === form.driver &&
                              e.type === "Ganho de entrega" &&
                              !e.paid &&
                              e.due &&
                              e.due <= today(),
                          ),
                        ),
                      )}
                    </strong>
                  </div>
                  {input(
                    "reference",
                    "Identificador único do pagamento bancário",
                    { required: true, minLength: 6 },
                  )}
                  <label className="confirm-money">
                    <input
                      type="checkbox"
                      required
                      checked={!!form.confirmed}
                      onChange={(e) => field("confirmed", e.target.checked)}
                    />
                    A transferência desse valor já foi realizada e conferida.
                  </label>
                  <p className="form-note">
                    Este registro concilia o pagamento; não transfere dinheiro.
                    Um lote por entregador por dia.
                  </p>
                </>
              )}
              {modal === "company" && s && (
                <>
                  {input("name", "Nome da empresa", { required: true })}
                  {input("contact", "Responsável", { required: true })}
                  <div className="pair">
                    {input("document", "CNPJ")}
                    {input("phone", "WhatsApp", { type: "tel" })}
                  </div>
                  {input("email", "E-mail", { type: "email" })}
                  {input("address", "Endereço", { required: true })}
                  {input("hours", "Horário de funcionamento")}
                  <label>
                    Plano
                    <Pick
                      value={form.plan}
                      onChange={(v) => field("plan", v)}
                      items={s.plans}
                      label="Plano"
                    />
                  </label>
                  {input(
                    "customPrice",
                    "Tarifa personalizada (R$) · vazio usa tabela",
                    { type: "number", min: 0, step: 0.01 },
                  )}
                  <p className="form-note">
                    A tarifa personalizada substitui base, setor e quilômetros.
                    O desconto do plano continua sendo aplicado.
                  </p>
                  <label>
                    Entregador fixo
                    <Pick
                      value={form.fixed}
                      onChange={(v) => field("fixed", v)}
                      items={s.drivers.filter((d) => d.active)}
                      label="Sem entregador fixo"
                    />
                  </label>
                  <label>
                    Entregador favorito
                    <Pick
                      value={form.favorites?.[0] || ""}
                      onChange={(v) => field("favorites", v ? [v] : [])}
                      items={s.drivers.filter((d) => d.active)}
                      label="Sem favorito"
                    />
                  </label>
                  <div className="summary-line">
                    <label htmlFor="approved">Aprovar e ativar</label>
                    <Switch
                      id="approved"
                      checked={form.active}
                      onCheckedChange={(v) => field("active", v)}
                    />
                  </div>
                </>
              )}
              {modal === "driver" && s && (
                <>
                  {input("name", "Nome completo", { required: true })}
                  <div className="pair">
                    {input("document", "CPF")}
                    {input("phone", "WhatsApp", { type: "tel" })}
                  </div>
                  {input("email", "E-mail", { type: "email" })}
                  {input("address", "Endereço")}
                  <div className="pair">
                    {input("vehicle", "Veículo", { required: true })}
                    {input("plate", "Placa")}
                  </div>
                  {input("pix", "Chave PIX")}
                  {input("point", "Ponto principal")}
                  <label>
                    Empresa favorita
                    <Pick
                      value={form.favorites?.[0] || ""}
                      onChange={(v) => field("favorites", v ? [v] : [])}
                      items={s.companies}
                      label="Sem favorita"
                    />
                  </label>
                  <p className="form-note">
                    Confira os documentos enviados pelo entregador antes de
                    aprovar.
                  </p>
                  <div className="summary-line">
                    <label htmlFor="driver-approved">Aprovar e ativar</label>
                    <Switch
                      id="driver-approved"
                      checked={form.active}
                      onCheckedChange={(v) => field("active", v)}
                    />
                  </div>
                </>
              )}
              {modal === "slot" && s && (
                <>
                  <label>
                    Empresa
                    <Pick
                      value={form.company}
                      onChange={(v) => field("company", v)}
                      items={s.companies.filter((c) => c.active)}
                      label="Empresa"
                    />
                  </label>
                  {input("date", "Data", {
                    type: "date",
                    min: today(),
                    required: true,
                  })}
                  <div className="pair">
                    {input("start", "Início", { type: "time", required: true })}
                    {input("end", "Fim", { type: "time", required: true })}
                  </div>
                </>
              )}
              {modal === "plan" && (
                <>
                  {input("name", "Nome do plano", { required: true })}
                  {input("description", "Descrição")}
                  {input("price", "Mensalidade (R$)", {
                    type: "number",
                    min: 0,
                    step: 0.01,
                    required: true,
                  })}
                  <div className="pair">
                    {input("discount", "Desconto por entrega (%)", {
                      type: "number",
                      min: 0,
                      max: 80,
                      required: true,
                    })}
                    {input("priority", "Prioridade (1 a 10)", {
                      type: "number",
                      min: 1,
                      max: 10,
                      required: true,
                    })}
                  </div>
                </>
              )}
              {modal === "settings" && (
                <>
                  {input("regionName", "Cidade / região da operação", {
                    required: true,
                  })}
                  <div className="pair">
                    {input("base", "Tarifa base (R$)", {
                      type: "number",
                      min: 0,
                      step: 0.01,
                      required: true,
                    })}
                    {input("km", "Por quilômetro (R$)", {
                      type: "number",
                      min: 0,
                      step: 0.01,
                      required: true,
                    })}
                  </div>
                  {input("commission", "Comissão da central (%)", {
                    type: "number",
                    min: 0,
                    max: 50,
                    required: true,
                  })}
                  {input(
                    "prioritySeconds",
                    "Intervalo entre prioridades (segundos)",
                    { type: "number", min: 0, max: 300, required: true },
                  )}
                  <p className="form-note">
                    Fixo → favorito da empresa → empresa favorita do entregador
                    → todos.
                  </p>
                  {input(
                    "alertMinutes",
                    "Avisar vaga antes do turno (minutos)",
                    { type: "number", min: 0, max: 1440, required: true },
                  )}
                  <h3>Setores e adicionais</h3>
                  {form.zones?.map((z: any, i: number) => (
                    <div className="pair" key={i}>
                      <label>
                        Setor
                        <input
                          value={z.name}
                          required
                          onChange={(e) =>
                            field(
                              "zones",
                              form.zones.map((v: any, j: number) =>
                                i === j ? { ...v, name: e.target.value } : v,
                              ),
                            )
                          }
                        />
                      </label>
                      <label>
                        Adicional (R$)
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          value={z.price}
                          onChange={(e) =>
                            field(
                              "zones",
                              form.zones.map((v: any, j: number) =>
                                i === j ? { ...v, price: e.target.value } : v,
                              ),
                            )
                          }
                        />
                      </label>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="secondary"
                    onClick={() =>
                      field("zones", [...form.zones, { name: "", price: 0 }])
                    }
                  >
                    <Plus size={15} /> Adicionar setor
                  </button>
                </>
              )}
              <button
                className="primary form-submit"
                disabled={busy}
                type="submit"
              >
                {busy
                  ? "Salvando…"
                  : modal === "order"
                    ? "Confirmar entrega"
                    : modal === "credit"
                      ? "Adicionar crédito"
                      : "Salvar alterações"}
                <ArrowRight size={16} />
              </button>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <Sheet
        open={!!current}
        onOpenChange={(v) => {
          if (!v) setDetail("");
        }}
      >
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalhes da entrega</SheetTitle>
            <SheetDescription>
              #{current?.id.slice(0, 6).toUpperCase()} ·{" "}
              {current && stamp(current.created)}
            </SheetDescription>
          </SheetHeader>
          {current && (
            <div className="detail p-6">
              <span className={"badge " + current.status}>
                {current.status}
              </span>
              <h2>{current.client}</h2>
              <p>{current.address}</p>
              <p>{current.phone}</p>
              <div className="summary-line">
                <span>Empresa</span>
                <strong>{cn(current.company)}</strong>
              </div>
              <div className="summary-line">
                <span>Entregador</span>
                <strong>{dn(current.driver)}</strong>
              </div>
              <div className="summary-line">
                <span>Valor da entrega</span>
                <strong>{money(current.price)}</strong>
              </div>
              <div className="summary-line">
                <span>Comissão</span>
                <strong>{money(current.fee)}</strong>
              </div>
              <div className="summary-line">
                <span>Ganho do entregador</span>
                <strong>{money(current.price - current.fee)}</strong>
              </div>
              {current.notes && (
                <p>
                  <strong>Observações</strong>
                  <br />
                  {current.notes}
                </p>
              )}
              <h3 className="section-space">Histórico</h3>
              <div className="timeline">
                {current.history.map((h, i) => (
                  <p key={i}>
                    <strong>{h.status}</strong>
                    <small>{stamp(h.at)}</small>
                  </p>
                ))}
              </div>
              {current.status === "Retirada" && (
                <p className="form-note">
                  Aviso por WhatsApp não enviado: integração pendente.
                </p>
              )}
              {role === "entregador" && (
                <div className="delivery-actions">{orderActions(current)}</div>
              )}
              {role !== "entregador" &&
                ["Pendente", "Aceita"].includes(current.status) && (
                  <button
                    className="secondary"
                    onClick={() => setConfirm(current)}
                  >
                    Cancelar e estornar
                  </button>
                )}
            </div>
          )}
        </SheetContent>
      </Sheet>
      <AlertDialog
        open={!!confirm}
        onOpenChange={(v) => {
          if (!v) setConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar esta entrega?</AlertDialogTitle>
            <AlertDialogDescription>
              {money(confirm?.price || 0)} voltará ao saldo disponível da
              empresa. A entrega continuará no histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter entrega</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                act("orderStatus", { id: confirm?.id, status: "Cancelada" });
                setConfirm(null);
              }}
            >
              Cancelar e estornar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Toaster position="top-right" />
    </SidebarProvider>
  );
}
