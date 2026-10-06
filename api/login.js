import { route, getBody, checkPw, sign, ip, limit, HttpError } from "../lib/util.js";
import { db } from "../lib/db.js";
import { key, getUser, putUser, publicUser, banInfo } from "../lib/users.js";

export default route(["POST"], async (req) => {
  const b = getBody(req), id = String(b.id || "").trim().toLowerCase(), pass = String(b.pass || "");
  if (!id || !pass) throw new HttpError(400, "Isi username/Gmail dan password.");
  await limit("login:" + ip(req), 40, 900);
  const lk = "lf:" + id;
  if (+((await db.get(lk)) || 0) >= 8) throw new HttpError(429, "Terlalu banyak percobaan gagal. Coba lagi dalam 15 menit.");
  const name = id.includes("@") ? await db.get("mail:" + id) : id;
  const u = name ? await getUser(name) : null;
  if (!u || !(await checkPw(pass, u.salt, u.hash))) {
    if ((await db.incr(lk)) === 1) await db.expire(lk, 900);
    throw new HttpError(401, "Username/Gmail atau password salah.");
  }
  await db.del(lk);
  const ban = banInfo(u);
  if (ban) throw new HttpError(403, "Akun Anda telah dibanned.", { banned: true, ban });
  u.lastLogin = Date.now(); u.logins = (u.logins || 0) + 1; await putUser(u);
  return { token: sign({ u: key(u.name), role: "user" }, 30 * 86400), user: publicUser(u) };
});
