import {
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
import { database } from "./database.mjs";
const scrypt = promisify(scryptCallback);
const options = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
export function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}
export function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}
export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt, 64, options);
  return salt + ":" + hash.toString("hex");
}
export async function checkPassword(password, encoded) {
  const [salt, hash] = encoded.split(":");
  const actual = await scrypt(password, salt, 64, options);
  const expected = Buffer.from(hash, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export async function createUser({ email, name, password, admin = false }) {
  email = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
    throw Error("E-mail inválido");
  if (
    typeof password !== "string" ||
    password.length < 12 ||
    password.length > 128
  )
    throw Error("A senha deve ter entre 12 e 128 caracteres");
  if (typeof name !== "string" || name.trim().length < 2 || name.length > 100)
    throw Error("Nome inválido");
  const passwordHash = await hashPassword(password);
  const user = {
    id: randomUUID(),
    email,
    name: name.trim(),
    is_admin: admin ? 1 : 0,
  };
  database()
    .prepare(
      "INSERT INTO users(id,email,name,password_hash,is_admin,created) VALUES (?,?,?,?,?,?)",
    )
    .run(
      user.id,
      user.email,
      user.name,
      passwordHash,
      user.is_admin,
      Date.now(),
    );
  return user;
}
export function createSession(userId) {
  const token = randomBytes(32).toString("hex");
  const expires = Date.now() + 7 * 86400000;
  const db = database();
  db.prepare("DELETE FROM sessions WHERE expires < ?").run(Date.now());
  db.prepare(
    "INSERT INTO sessions(token_hash,user_id,expires) VALUES (?,?,?)",
  ).run(digest(token), userId, expires);
  return token;
}
export function sessionUser(token) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  return (
    database()
      .prepare(
        "SELECT u.id,u.email,u.name,u.is_admin FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>?",
      )
      .get(digest(token), Date.now()) || null
  );
}
export function revokeSession(token) {
  if (token)
    database()
      .prepare("DELETE FROM sessions WHERE token_hash=?")
      .run(digest(token));
}
export function consumeAttempt(key, maximum = 10) {
  const db = database(),
    now = Date.now();
  db.prepare("DELETE FROM auth_attempts WHERE reset_at < ?").run(now);
  const row = db
    .prepare(
      "INSERT INTO auth_attempts(key,attempts,reset_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1 RETURNING attempts",
    )
    .get(digest(key), now + 15 * 60000);
  return row.attempts <= maximum;
}
