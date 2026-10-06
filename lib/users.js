import crypto from "node:crypto";
import { db } from "./db.js";
import { HttpError, verify } from "./util.js";

export const RE_USER = /^[A-Za-z0-9_.]{3,20}$/;
export const RE_MAIL = /^[a-z0-9._%+-]+@gmail\.com$/;
export const key = (u) => String(u).toLowerCase();

export async function getUser(name) { const r = await db.get("user:" + key(name)); return r ? JSON.parse(r) : null; }
export const putUser = (u) => db.set("user:" + key(u.name), JSON.stringify(u));
export const publicUser = (u) => ({ name: u.name, mail: u.mail, joined: u.created });

// info ban yang masih berlaku (null kalau tidak dibanned atau sudah lewat)
export function banInfo(u) {
  if (!u.banned) return null;
  if (u.bannedUntil && Date.now() >= u.bannedUntil) return null;
  return {
    reason: u.banReason || "", until: u.bannedUntil || 0, at: u.bannedAt || 0,
    id: "BN-" + crypto.createHash("sha256").update(key(u.name) + (u.bannedAt || 0)).digest("hex").slice(0, 8).toUpperCase(),
  };
}

const bearer = (req) => (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
export async function requireUser(req) {
  const p = verify(bearer(req));
  if (!p || p.role !== "user") throw new HttpError(401, "Sesi tidak valid. Silakan masuk lagi.");
  const u = await getUser(p.u);
  if (!u) throw new HttpError(401, "Akun tidak ditemukan.");
  const b = banInfo(u);
  if (b) throw new HttpError(403, "Akun Anda telah dibanned.", { banned: true, ban: b });
  return u;
}
export function requireAdmin(req) {
  const p = verify(bearer(req));
  if (!p || p.role !== "admin") throw new HttpError(401, "Sesi admin tidak valid.");
}
