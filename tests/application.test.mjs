import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";

test(
  "Contas, permissões, entregas, saldo e documentos pelo servidor HTTP",
  { timeout: 180000 },
  async (t) => {
    process.env.DATA_DIR = mkdtempSync(
      path.join(tmpdir(), "via-delivery-test-"),
    );
    const { createUser, createSession, sessionUser } =
      await import("../server/security.mjs");
    const { database } = await import("../server/database.mjs");
    const tokens = {};
    for (const name of [
      "admin",
      "outsider",
      "empresa1",
      "empresa2",
      "driver1",
      "driver2",
    ]) {
      const user = await createUser({
        email: name + "@example.invalid",
        name,
        password: "Teste-local-987654321",
        admin: name === "admin",
      });
      tokens[name] = createSession(user.id);
    }
    const base = "http://127.0.0.1:" + String(process.env.TEST_PORT || 3198);
    const child = spawn(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "start",
        "--hostname",
        "127.0.0.1",
        "--port",
        new URL(base).port,
      ],
      {
        cwd: process.cwd(),
        env: { ...process.env, APP_URL: base, NEXT_TELEMETRY_DISABLED: "1" },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let output = "";
    child.stdout.on("data", (b) => (output += b));
    child.stderr.on("data", (b) => (output += b));
    t.after(async () => {
      if (child.exitCode === null) {
        child.kill();
        await once(child, "exit");
      }
      database().close();
    });
    await new Promise((resolve, reject) => {
      const timer = setInterval(() => {
        if (output.includes("Ready in")) {
          clearInterval(timer);
          resolve();
        } else if (child.exitCode !== null) {
          clearInterval(timer);
          reject(Error(output));
        }
      }, 100);
      setTimeout(() => {
        clearInterval(timer);
        reject(Error("Servidor não iniciou: " + output));
      }, 60000).unref();
    });
    let current = null;
    function as(name) {
      current = name;
    }
    function request(url, options = {}) {
      return fetch(url, {
        ...options,
        headers: {
          ...(current ? { cookie: "via_session=" + tokens[current] } : {}),
          ...options.headers,
        },
      });
    }
    async function GET() {
      return request(base + "/api/operation");
    }
    async function POST(req) {
      return request(base + "/api/operation", {
        method: "POST",
        headers: Object.fromEntries(req.headers),
        body: await req.text(),
      });
    }
    async function get(ok = true) {
      const r = await GET();
      assert.equal(r.ok, ok);
      return await r.json();
    }
    async function post(action, data = {}, ok = true) {
      const r = await request(base + "/api/operation", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: base },
        body: JSON.stringify({ action, data }),
      });
      const j = await r.json();
      assert.equal(r.ok, ok, j.error || action);
      return j;
    }
    await get(false);
    as("outsider");
    let j = await get();
    assert.equal(j.registrationRequired, true);
    assert.equal(j.state, null);
    as("admin");
    j = await get();
    assert.equal(j.account.role, "admin");
    assert.equal(j.state.companies.length, 0);
    assert.equal(j.state.entries.length, 0);
    await post("settings", {
      regionName: "Região QA",
      base: 700,
      km: 100,
      commission: 15,
      prioritySeconds: 20,
      alertMinutes: 60,
      zones: [{ name: "Centro", price: 0 }],
    });
    as("empresa1");
    j = await post("register", {
      role: "empresa",
      name: "Empresa QA",
      contact: "Responsável QA",
      document: "00000000000001",
      phone: "11999990000",
      address: "Rua QA, 1",
      hours: "08:00–18:00",
    });
    assert.equal(j.account.active, false);
    assert.equal(j.state, null);
    const c1 = j.account.entityId;
    await post(
      "credit",
      { company: c1, amount: 10000, reference: "QA-PIX-1", confirmed: true },
      false,
    );
    as("empresa2");
    j = await post("register", {
      role: "empresa",
      name: "Empresa Dois QA",
      contact: "Responsável QA",
      document: "00000000000002",
      phone: "11999990001",
      address: "Rua QA, 2",
      hours: "08:00–18:00",
    });
    const c2 = j.account.entityId;
    as("driver1");
    j = await post("register", {
      role: "entregador",
      name: "Entregador QA",
      document: "00000000001",
      phone: "11999990002",
      address: "Rua QA, 3",
      vehicle: "Moto",
      plate: "ABC1D23",
      pix: "driver1@example.invalid",
      point: "Centro",
    });
    const d1 = j.account.entityId;
    as("driver2");
    j = await post("register", {
      role: "entregador",
      name: "Entregador Dois QA",
      document: "00000000002",
      phone: "11999990003",
      address: "Rua QA, 4",
      vehicle: "Moto",
      plate: "ABC1D24",
      pix: "driver2@example.invalid",
      point: "Centro",
    });
    const d2 = j.account.entityId;
    as("admin");
    j = await get();
    for (const c of j.state.companies)
      await post("saveCompany", {
        ...c,
        active: true,
        fixed: d1 === c.fixed ? d1 : "",
      });
    j = await get();
    for (const d of j.state.drivers)
      await post("saveDriver", { ...d, active: true });
    j = await get();
    await post("saveCompany", {
      ...j.state.companies.find((c) => c.id === c1),
      fixed: d1,
    });
    await post(
      "credit",
      {
        company: c1,
        amount: 10000,
        reference: "QA-PIX-0001",
        confirmed: false,
      },
      false,
    );
    await post("credit", {
      company: c1,
      amount: 10000,
      reference: "QA-PIX-0001",
      confirmed: true,
    });
    await post(
      "credit",
      { company: c1, amount: 10000, reference: "QA-PIX-0001", confirmed: true },
      false,
    );
    as("empresa1");
    j = await get();
    assert.equal(j.state.companies.length, 1);
    assert.equal(j.state.companies[0].id, c1);
    assert.equal(j.state.accounts, undefined);
    assert.equal(j.state.audit, undefined);
    const payload = {
      company: c1,
      client: "Cliente QA",
      phone: "11999990004",
      address: "Rua QA, 5",
      notes: "",
      zone: "Centro",
      distance: 2,
    };
    await post("createOrder", { ...payload, company: c2 }, false);
    await post("savePlan", { name: "Ataque" }, false);
    await post(
      "credit",
      { company: c1, amount: 10000, reference: "QA-PIX-0002", confirmed: true },
      false,
    );
    j = await post("createOrder", payload);
    const order = j.state.orders[0];
    assert.equal(order.price, 900);
    assert.equal(j.state.companies[0].balance, 9100);
    as("empresa2");
    j = await get();
    assert.equal(j.state.orders.length, 0);
    assert.equal(j.state.entries.length, 0);
    await post("orderStatus", { id: order.id, status: "Cancelada" }, false);
    await post("createOrder", { ...payload, company: c2 }, false);
    as("driver2");
    await post("online", { id: d1, online: true });
    j = await get();
    assert.equal(j.state.drivers[0].id, d2);
    assert.equal(j.state.orders.length, 0);
    await post(
      "orderStatus",
      { id: order.id, status: "Aceita", driver: d1 },
      false,
    );
    as("driver1");
    await post("online", { online: true });
    j = await get();
    assert.equal(j.state.orders.length, 1);
    assert.equal(j.state.orders[0].phone, "");
    assert.equal(j.state.companies.find((c) => c.id === c1).balance, 0);
    await post("orderStatus", { id: order.id, status: "Entregue" }, false);
    await post("orderStatus", { id: order.id, status: "Aceita" });
    as("driver2");
    await post(
      "orderStatus",
      { id: order.id, status: "Retirada", driver: d1 },
      false,
    );
    as("driver1");
    await post("orderStatus", { id: order.id, status: "Retirada" });
    j = await post("orderStatus", { id: order.id, status: "Entregue" });
    assert.equal(
      j.state.entries.find((e) => e.type === "Ganho de entrega").amount,
      765,
    );
    assert.equal(j.state.entries.length, 1);
    await post("orderStatus", { id: order.id, status: "Entregue" }, false);
    as("admin");
    j = await get();
    const gain = j.state.entries.find((e) => e.type === "Ganho de entrega");
    assert.equal(
      j.state.entries.find((e) => e.type === "Comissão").amount,
      135,
    );
    await post(
      "settle",
      {
        driver: d1,
        reference: "QA-PAYOUT-1",
        entries: [gain.id],
        confirmed: true,
      },
      false,
    );
    as("empresa1");
    j = await post("createOrder", payload);
    const cancelled = j.state.orders[0].id;
    j = await post("orderStatus", { id: cancelled, status: "Cancelada" });
    assert.equal(j.state.companies[0].balance, 9100);
    await post("orderStatus", { id: cancelled, status: "Cancelada" }, false);
    as("admin");
    await post("saveSlot", {
      company: c1,
      date: "2099-01-01",
      start: "08:00",
      end: "12:00",
    });
    await post("saveSlot", {
      company: c2,
      date: "2099-01-01",
      start: "10:00",
      end: "14:00",
    });
    j = await get();
    const slots = j.state.slots;
    as("driver1");
    await post("bookSlot", { id: slots[0].id });
    await post("bookSlot", { id: slots[1].id }, false);
    as("driver2");
    await post("bookSlot", { id: slots[0].id, release: true }, false);
    as("driver1");
    await post("bookSlot", { id: slots[0].id, release: true });
    as("empresa1");
    const concurrent = await Promise.all([
      POST(
        new Request(base + "/api/operation", {
          method: "POST",
          body: JSON.stringify({ action: "createOrder", data: payload }),
        }),
      ),
      POST(
        new Request(base + "/api/operation", {
          method: "POST",
          body: JSON.stringify({ action: "createOrder", data: payload }),
        }),
      ),
    ]);
    assert.ok(concurrent.every((r) => [200, 409].includes(r.status)));
    assert.ok(concurrent.some((r) => r.status === 200));
    as("admin");
    j = await get();
    await post("saveCompany", {
      ...j.state.companies.find((c) => c.id === c1),
      active: false,
    });
    as("empresa1");
    j = await get();
    assert.equal(j.state, null);
    await post("createOrder", payload, false);
    const bad = await POST(
      new Request(base + "/api/operation", {
        method: "POST",
        headers: { Origin: "https://evil.invalid" },
        body: "{}",
      }),
    );
    assert.equal(bad.status, 403);
    console.log(
      "PASS: login obrigatório, bootstrap admin, cadastro e aprovação, saldo zero, isolamento entre empresas, dados privados, impersonação bloqueada, crédito conciliado idempotente, preços, fluxo completo, lançamento único, D+1, estorno, escalas, concorrência, suspensão e origem.",
    );

    as(null);
    const forged = await fetch(base + "/api/operation", {
      headers: {
        "x-user-id": "admin",
        "x-user-email": "admin@example.invalid",
      },
    });
    assert.equal(forged.status, 401);
    async function auth(data, cookie = "") {
      return fetch(base + "/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: base,
          ...(cookie ? { cookie } : {}),
        },
        body: JSON.stringify(data),
      });
    }
    assert.equal(
      (
        await auth({
          action: "login",
          email: "admin@example.invalid",
          password: "wrong-password",
        })
      ).status,
      401,
    );
    const login = await auth({
      action: "login",
      email: "admin@example.invalid",
      password: "Teste-local-987654321",
    });
    assert.equal(login.status, 200);
    const cookie = login.headers.get("set-cookie").split(";")[0];
    assert.match(login.headers.get("set-cookie"), /httponly/i);
    const loginToken = cookie.slice("via_session=".length);
    assert.ok(sessionUser(loginToken));
    assert.equal((await auth({ action: "logout" }, cookie)).status, 200);
    assert.equal(sessionUser(loginToken), null);
    assert.equal(
      (
        await auth({
          action: "register",
          name: "Nova pessoa",
          email: "nova@example.invalid",
          password: "Minha-senha-nova-98765",
        })
      ).status,
      200,
    );
    as("driver1");
    const data = new FormData();
    data.set("purpose", "documento");
    data.set(
      "file",
      new File(["%PDF-1.4 fixture"], "teste.pdf", { type: "application/pdf" }),
    );
    const uploaded = await request(base + "/api/documents", {
      method: "POST",
      headers: { Origin: base },
      body: data,
    });
    assert.equal(uploaded.status, 200, await uploaded.clone().text());
    const doc = await uploaded.json();
    let result = await request(base + "/api/documents?id=" + doc.id);
    assert.equal(await result.text(), "%PDF-1.4 fixture");
    as("driver2");
    assert.equal(
      (await request(base + "/api/documents?id=" + doc.id)).status,
      404,
    );
    as("admin");
    assert.equal(
      (await request(base + "/api/documents?id=" + doc.id)).status,
      200,
    );
  },
);
