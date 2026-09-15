import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { dataDirectory } from "./database.mjs";
const directory = path.join(dataDirectory, "documents");
function filename(key) {
  if (!/^documents\/[0-9a-f-]{36}$/.test(key))
    throw new Error("Identificador inválido");
  return path.join(directory, key.slice("documents/".length));
}
export const storage = {
  async put(key, bytes, metadata = {}) {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await writeFile(filename(key), Buffer.from(bytes), {
      flag: "wx",
      mode: 0o600,
    });
  },
  async get(key) {
    try {
      return { body: new Uint8Array(await readFile(filename(key))) };
    } catch (e) {
      if (e.code === "ENOENT") return null;
      throw e;
    }
  },
  async delete(key) {
    try {
      await unlink(filename(key));
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
  },
};
