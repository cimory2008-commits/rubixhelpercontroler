/* Penyimpanan data: Upstash Redis (REST) di Vercel, atau memori (hanya untuk uji lokal). */
import { HttpError } from "./err.js";
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
export const dbMode = URL_ ? "upstash" : "memori";
const mem = new Map(), exp = new Map();
const alive = (k) => { const e = exp.get(k); if (e && Date.now() > e) { mem.delete(k); exp.delete(k); return false; } return true; };

function memCmd(c, ...a) {
  const k = a[0];
  switch (c) {
    case "GET": return alive(k) && typeof mem.get(k) === "string" ? mem.get(k) : null;
    case "SET": {
      if (a.includes("NX") && alive(k) && mem.has(k)) return null;
      mem.set(k, String(a[1])); const i = a.indexOf("EX");
      if (i > 0) exp.set(k, Date.now() + a[i + 1] * 1000); else exp.delete(k);
      return "OK";
    }
    case "DEL": { let n = 0; for (const x of a) { if (mem.delete(x)) n++; exp.delete(x); } return n; }
    case "SADD": { const s = mem.get(k) instanceof Set ? mem.get(k) : new Set(); let n = 0; for (const x of a.slice(1)) if (!s.has(x)) { s.add(x); n++; } mem.set(k, s); return n; }
    case "SREM": { const s = mem.get(k); let n = 0; if (s instanceof Set) for (const x of a.slice(1)) if (s.delete(x)) n++; return n; }
    case "SMEMBERS": { const s = mem.get(k); return s instanceof Set ? [...s] : []; }
    case "INCR": { alive(k); const v = (+mem.get(k) || 0) + 1; mem.set(k, String(v)); return v; }
    case "DECR": { alive(k); const v = (+mem.get(k) || 0) - 1; mem.set(k, String(v)); return v; }
    case "EXPIRE": { if (mem.has(k)) { exp.set(k, Date.now() + a[1] * 1000); return 1; } return 0; }
    case "MGET": return a.map((x) => (alive(x) && typeof mem.get(x) === "string" ? mem.get(x) : null));
  }
  throw new Error("Perintah tidak didukung: " + c);
}

async function cmd(...a) {
  if (!URL_) {
    if (process.env.VERCEL) throw new HttpError(500, "Database belum dipasang. Lihat README bagian Upstash Redis.");
    return memCmd(...a);
  }
  const r = await fetch(URL_, { method: "POST", headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" }, body: JSON.stringify(a) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.error) throw new Error("DB: " + (d.error || r.status));
  return d.result;
}

export const db = {
  get: (k) => cmd("GET", k),
  set: (k, v, ex) => (ex ? cmd("SET", k, v, "EX", ex) : cmd("SET", k, v)),
  setnx: async (k, v) => (await cmd("SET", k, v, "NX")) === "OK",
  del: (...k) => cmd("DEL", ...k),
  sadd: (k, v) => cmd("SADD", k, v),
  srem: (k, v) => cmd("SREM", k, v),
  smembers: (k) => cmd("SMEMBERS", k),
  incr: (k) => cmd("INCR", k),
  decr: (k) => cmd("DECR", k),
  expire: (k, s) => cmd("EXPIRE", k, s),
  mget: (...k) => (k.length ? cmd("MGET", ...k) : Promise.resolve([])),
};
