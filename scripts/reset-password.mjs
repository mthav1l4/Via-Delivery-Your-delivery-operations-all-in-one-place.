import { randomBytes } from "node:crypto";
import { database } from "../server/database.mjs";
import { hashPassword, normalizeEmail } from "../server/security.mjs";
const email = normalizeEmail(process.argv[2] || "");
const db = database();
const user = db.prepare("SELECT id FROM users WHERE email=?").get(email);
if (!user) {
  console.error(
    "Conta não encontrada. Uso: node --env-file-if-exists=.env.local scripts/reset-password.mjs email",
  );
  process.exit(1);
}
const password = randomBytes(18).toString("base64url");
const hash = await hashPassword(password);
db.exec("BEGIN IMMEDIATE");
try {
  db.prepare("UPDATE users SET password_hash=? WHERE id=?").run(hash, user.id);
  db.prepare("DELETE FROM sessions WHERE user_id=?").run(user.id);
  db.exec("COMMIT");
} catch (e) {
  db.exec("ROLLBACK");
  throw e;
}
console.log(
  "Sessões anteriores encerradas. Entregue esta senha somente ao titular após conferir sua identidade.",
);
console.log("Nova senha: " + password);
