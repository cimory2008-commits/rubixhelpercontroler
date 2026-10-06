import crypto from "node:crypto";
import { HttpError } from "./err.js";
import { db } from "./db.js";
export { HttpError };

const secret = () => {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new HttpError(500, "Server belum diatur: AUTH_SECRET minimal 16 karakter.");
  return s;
};
const b64 = (s) => Buffer.from(s).toString("base64url");

// token bertanda tangan (HMAC-SHA256), tanpa library
export function sign(payload, ttlSec) {
  const p = b64(JSON.stringify({ ...payload, exp: Date.now() + ttlSec * 1000 }));
  return "v1." + p + "." + crypto.createHmac("sha256", secret()).update(p).digest("base64url");
}
export function verify(tok) {
  if (typeof tok !== "string") return null;
  const a = tok.split("."); if (a.length !== 3 || a[0] !== "v1") return null;
  const want = crypto.createHmac("sha256", secret()).update(a[1]).digest();
  let got; try { got = Buffer.from(a[2], "base64url"); } catch { return null; }
  if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) return null;
  try { const p = JSON.parse(Buffer.from(a[1], "base64url").toString()); return p.exp > Date.now() ? p : null; } catch { return null; }
}

export function hashPw(pw, salt = crypto.randomBytes(16).toString("hex")) {
  return new Promise((res, rej) => crypto.scrypt(pw, salt, 64, (e, k) => (e ? rej(e) : res({ salt, hash: k.toString("hex") }))));
}
export async function checkPw(pw, salt, hash) {
  const { hash: h } = await hashPw(pw, salt);
  const a = Buffer.from(h, "hex"), b = Buffer.from(hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
export const sameStr = (a, b) => crypto.timingSafeEqual(
  crypto.createHash("sha256").update(String(a)).digest(), crypto.createHash("sha256").update(String(b)).digest());

export const ip = (req) => (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket?.remoteAddress || "x";
export const wibDay = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
export function getBody(req) {
  let b = req.body; if (typeof b === "string") { try { b = JSON.parse(b); } catch { b = {}; } }
  return b && typeof b === "object" ? b : {};
}
export async function limit(name, max, sec) {
  const k = "rl:" + name, n = await db.incr(k);
  if (n === 1) await db.expire(k, sec);
  if (n > max) throw new HttpError(429, "Terlalu banyak percobaan. Coba lagi nanti.");
}

// pembungkus semua endpoint: CORS, metode, error rapi
export const route = (methods, fn, { cors = true } = {}) => async (req, res) => {
  if (cors) {
    res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
    res.setHeader("Access-Control-Allow-Methods", methods.join(", ") + ", OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (!methods.includes(req.method)) { res.status(405).json({ error: "Metode tidak didukung." }); return; }
  try {
    const out = await fn(req, res);
    if (out !== undefined && !res.writableEnded) res.status(200).json(out);
  } catch (e) {
    if (e instanceof HttpError) res.status(e.status).json({ error: e.message, ...(e.extra || {}) });
    else { console.error(e); res.status(500).json({ error: "Terjadi kesalahan di server." }); }
  }
};
