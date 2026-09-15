import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";

export const dataDirectory = path.resolve(process.env.DATA_DIR || "./data");
let connection;
export function database() {
  if (connection) return connection;
  mkdirSync(dataDirectory, { recursive: true, mode: 0o700 });
  connection = new DatabaseSync(
    path.join(dataDirectory, "via-delivery.sqlite"),
  );
  connection.exec(`
    PRAGMA journal_mode=WAL;
    PRAGMA foreign_keys=ON;
    PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS operations (
      owner TEXT PRIMARY KEY, revision INTEGER NOT NULL DEFAULT 0, payload TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY, owner TEXT NOT NULL, entity_id TEXT NOT NULL,
      name TEXT NOT NULL, mime TEXT NOT NULL, bytes INTEGER NOT NULL,
      purpose TEXT NOT NULL, created TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS documents_owner_idx ON documents(owner);
    CREATE INDEX IF NOT EXISTS documents_entity_idx ON documents(entity_id);
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      name TEXT NOT NULL, password_hash TEXT NOT NULL,
      is_admin INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS auth_attempts (
      key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, reset_at INTEGER NOT NULL
    );
  `);
  return connection;
}

// API de consultas parametrizadas usada pelo domínio de entregas.
export function queryDatabase() {
  const db = database();
  return {
    prepare(sql) {
      let values = [];
      return {
        bind(...params) {
          values = params;
          return this;
        },
        async first() {
          return db.prepare(sql).get(...values) || null;
        },
        async all() {
          return { results: db.prepare(sql).all(...values) };
        },
        async run() {
          const result = db.prepare(sql).run(...values);
          return { meta: { changes: Number(result.changes) } };
        },
      };
    },
  };
}
