export type Company = {
  id: string;
  name: string;
  contact: string;
  email: string;
  document: string;
  phone: string;
  address: string;
  hours: string;
  plan: string;
  balance: number;
  active: boolean;
  customPrice: number | null;
  fixed: string;
  favorites: string[];
};
export type Driver = {
  id: string;
  name: string;
  phone: string;
  email: string;
  document: string;
  vehicle: string;
  plate: string;
  pix: string;
  address: string;
  online: boolean;
  active: boolean;
  favorites: string[];
  point: string;
};
export type Order = {
  id: string;
  company: string;
  driver: string;
  client: string;
  phone: string;
  address: string;
  notes: string;
  zone: string;
  distance: number;
  price: number;
  fee: number;
  status: string;
  created: string;
  completed?: string;
  history: { status: string; at: string }[];
};
export type Plan = {
  id: string;
  name: string;
  price: number;
  discount: number;
  priority: number;
  description: string;
};
export type Slot = {
  id: string;
  company: string;
  date: string;
  start: string;
  end: string;
  driver: string;
  alerted?: boolean;
};
export type Entry = {
  id: string;
  at: string;
  type: string;
  company?: string;
  driver?: string;
  order?: string;
  amount: number;
  due?: string;
  paid?: boolean;
  reference?: string;
  recordedBy?: string;
  paidAt?: string;
};
export type Operation = {
  companies: Company[];
  drivers: Driver[];
  orders: Order[];
  slots: Slot[];
  plans: Plan[];
  entries: Entry[];
  notifications: {
    id: string;
    at: string;
    text: string;
    read: boolean;
    company?: string;
    driver?: string;
    readBy?: string[];
  }[];
  settings: {
    configured?: boolean;
    regionName?: string;
    base: number;
    km: number;
    commission: number;
    prioritySeconds: number;
    alertMinutes: number;
    zones: { name: string; price: number }[];
  };
};
export const money = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    n / 100,
  );
export const today = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(
    new Date(),
  );
export const dateKey = (s: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(
    new Date(s),
  );
export function quote(
  s: Operation,
  company: string,
  zone: string,
  distance: number,
) {
  const c = s.companies.find((x) => x.id === company);
  if (!c) throw Error("Empresa não encontrada");
  const p = s.plans.find((x) => x.id === c.plan);
  const z = s.settings.zones.find((x) => x.name === zone);
  if (!z) throw Error("Setor não encontrado");
  return Math.max(
    100,
    Math.round(
      (c.customPrice ??
        s.settings.base + z.price + Math.round(distance * s.settings.km)) *
        (1 - (p?.discount ?? 0) / 100),
    ),
  );
}
export function eligible(
  s: Operation,
  o: Order,
  driver: string,
  now = Date.now(),
) {
  const d = s.drivers.find((x) => x.id === driver),
    c = s.companies.find((x) => x.id === o.company);
  if (!d?.active || !d.online || !c?.active || o.status !== "Pendente")
    return false;
  const tier =
    c.fixed === driver
      ? 0
      : c.favorites.includes(driver)
        ? 1
        : d.favorites.includes(c.id)
          ? 2
          : 3;
  return (
    now - new Date(o.created).getTime() >=
    tier * s.settings.prioritySeconds * 1000
  );
}
export function initial(): Operation {
  return {
    companies: [],
    drivers: [],
    orders: [],
    slots: [],
    plans: [
      {
        id: "standard",
        name: "Padrão",
        price: 0,
        discount: 0,
        priority: 1,
        description: "Tabela definida pela central.",
      },
    ],
    entries: [],
    notifications: [],
    settings: {
      base: 0,
      km: 0,
      commission: 0,
      prioritySeconds: 20,
      alertMinutes: 60,
      zones: [{ name: "Principal", price: 0 }],
    },
  };
}
