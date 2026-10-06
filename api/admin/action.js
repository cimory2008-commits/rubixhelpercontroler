import crypto from "node:crypto";
import { route, getBody, hashPw, HttpError } from "../../lib/util.js";
import { db } from "../../lib/db.js";
import { requireAdmin, getUser, putUser, key } from "../../lib/users.js";

export default route(["POST"], async (req) => {
  requireAdmin(req);
  const b = getBody(req), u = await getUser(String(b.user || ""));
  if (!u) throw new HttpError(404, "Akun tidak ditemukan.");
  if (b.action === "ban") {
    const hours = Math.max(0, Math.min(24 * 365, +b.hours || 0));
    u.banned = true; u.banReason = String(b.reason || "").trim().slice(0, 200); u.bannedAt = Date.now();
    u.bannedUntil = hours ? Date.now() + hours * 3600e3 : 0;
    await putUser(u); return { ok: true };
  }
  if (b.action === "unban") { u.banned = false; u.banReason = ""; u.bannedUntil = 0; await putUser(u); return { ok: true }; }
  if (b.action === "delete") { await db.del("user:" + key(u.name), "mail:" + u.mail); await db.srem("users", key(u.name)); return { ok: true }; }
  if (b.action === "reset") {
    const A = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const temp = Array.from(crypto.randomBytes(10), (x) => A[x % A.length]).join("");
    Object.assign(u, await hashPw(temp)); await putUser(u); return { ok: true, temp };
  }
  throw new HttpError(400, "Aksi tidak dikenal.");
}, { cors: false });
