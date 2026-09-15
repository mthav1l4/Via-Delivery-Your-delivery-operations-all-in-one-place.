import { storage } from "@/server/storage.mjs";
const env = { BUCKET: storage };
import {
  context,
  save,
  isActive,
  errorResponse,
  requireValue as need,
} from "@/lib/server/live";
export async function GET(req: Request) {
  try {
    const ctx = await context();
    if (ctx.changed) await save(ctx);
    need(ctx.account, "Complete o cadastro.", 403);
    const admin =
      ctx.account.role === "admin" && isActive(ctx.state, ctx.account);
    need(admin || !ctx.account.disabled, "Acesso suspenso", 403);
    const url = new URL(req.url),
      id = url.searchParams.get("id");
    if (id) {
      const doc = await ctx.db
        .prepare("SELECT * FROM documents WHERE id=?")
        .bind(id)
        .first<any>();
      need(
        doc && (admin || doc.owner === ctx.user.userId),
        "Documento não encontrado",
        404,
      );
      need(env.BUCKET, "Armazenamento não configurado", 503);
      const file = await env.BUCKET.get("documents/" + id);
      need(file, "Arquivo indisponível", 404);
      return new Response(file.body, {
        headers: {
          "Content-Type": doc.mime,
          "Content-Disposition": `attachment; filename="${doc.name.replace(/[^a-zA-Z0-9._-]/g, "_")}"`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    const entity = url.searchParams.get("entity");
    const result =
      admin && entity
        ? await ctx.db
            .prepare(
              "SELECT id,name,mime,bytes,purpose,created FROM documents WHERE entity_id=? ORDER BY created DESC",
            )
            .bind(entity)
            .all()
        : await ctx.db
            .prepare(
              "SELECT id,name,mime,bytes,purpose,created FROM documents WHERE owner=? ORDER BY created DESC",
            )
            .bind(ctx.user.userId)
            .all();
    return Response.json(
      { documents: result.results },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(req: Request) {
  let uploaded: string | undefined;
  try {
    need(
      !req.headers.get("origin") ||
        req.headers.get("origin") ===
          new URL(process.env.APP_URL || req.url).origin,
      "Origem inválida",
      403,
    );
    const ctx = await context();
    if (ctx.changed) await save(ctx);
    need(
      ctx.account && !ctx.account.disabled,
      "Complete o cadastro antes de enviar documentos.",
      403,
    );
    need(env.BUCKET, "Armazenamento de documentos ainda não configurado.", 503);
    const count = await ctx.db
      .prepare("SELECT count(*) AS n FROM documents WHERE owner=?")
      .bind(ctx.user.userId)
      .first<{ n: number }>();
    need(
      (count?.n || 0) < 6,
      "Limite de 6 documentos atingido. Solicite revisão à central.",
    );
    const reader = req.body?.getReader();
    need(reader, "Arquivo ausente");
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 6 * 1024 * 1024) {
        await reader.cancel();
        throw Error("Arquivo acima do limite.");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const data = await new Response(bytes, {
      headers: { "Content-Type": req.headers.get("content-type") || "" },
    }).formData();
    const file = data.get("file");
    need(file instanceof File, "Selecione um arquivo");
    need(
      file.size > 0 && file.size <= 5 * 1024 * 1024,
      "O arquivo deve ter até 5 MB",
    );
    const purpose = String(data.get("purpose") || "documento");
    need(
      ["foto", "documento", "cnh"].includes(purpose),
      "Tipo de documento inválido",
    );
    const buffer = await file.arrayBuffer();
    const h = new Uint8Array(buffer);
    const mime =
      h[0] === 0x25 && h[1] === 0x50 && h[2] === 0x44 && h[3] === 0x46
        ? "application/pdf"
        : h[0] === 0xff && h[1] === 0xd8 && h[2] === 0xff
          ? "image/jpeg"
          : h[0] === 0x89 && h[1] === 0x50 && h[2] === 0x4e && h[3] === 0x47
            ? "image/png"
            : "";
    need(mime, "Use PDF, JPG ou PNG válido");
    need(
      purpose !== "foto" || mime !== "application/pdf",
      "A foto deve ser JPG ou PNG",
    );
    uploaded = crypto.randomUUID();
    await env.BUCKET.put("documents/" + uploaded, buffer, {
      httpMetadata: { contentType: mime },
    });
    await ctx.db
      .prepare(
        "INSERT INTO documents (id,owner,entity_id,name,mime,bytes,purpose,created) VALUES (?,?,?,?,?,?,?,?)",
      )
      .bind(
        uploaded,
        ctx.user.userId,
        ctx.account.entityId,
        file.name.slice(0, 100),
        mime,
        file.size,
        purpose,
        new Date().toISOString(),
      )
      .run();
    return Response.json({ id: uploaded, uploaded: true });
  } catch (e) {
    if (uploaded && env.BUCKET)
      await env.BUCKET.delete("documents/" + uploaded).catch(() => {});
    return errorResponse(e);
  }
}
