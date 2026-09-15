import { randomBytes } from "node:crypto";
import { createUser } from "../server/security.mjs";
const [email, name = "Administrador"] = process.argv.slice(2);
if (!email) {
  console.error('Uso: npm run admin:create -- seu@email.com "Seu nome"');
  process.exit(1);
}
const password = randomBytes(18).toString("base64url");
try {
  await createUser({ email, name, password, admin: true });
  console.log("Administrador criado. Guarde a senha em local seguro.");
  console.log("Senha inicial: " + password);
} catch (e) {
  console.error("Não foi possível criar o administrador: " + e.message);
  process.exitCode = 1;
}
