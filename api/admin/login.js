import { route, getBody, sameStr, sign, ip, HttpError } from "../../lib/util.js";
import { db } from "../../lib/db.js";

export default route(["POST"], async (req) => {
  const U = process.env.ADMIN_USER, P = process.env.ADMIN_PASSWORD;
  if (!U || !P) throw new HttpError(500, "Server belum diatur: ADMIN_USER dan ADMIN_PASSWORD kosong.");
  const lk = "lf:admin:" + ip(req);
  if (+((await db.get(lk)) || 0) >= 5) throw new HttpError(429, "Terlalu banyak percobaan. Coba lagi dalam 15 menit.");
  const b = getBody(req), okU = sameStr(b.user || "", U), okP = sameStr(b.pass || "", P);
  if (!(okU && okP)) {
    if ((await db.incr(lk)) === 1) await db.expire(lk, 900);
    throw new HttpError(401, "Username atau password admin salah.");
  }
  await db.del(lk);
  return { token: sign({ role: "admin" }, 8 * 3600) };
}, { cors: false });
