import { route, getBody, hashPw, sign, ip, limit, HttpError } from "../lib/util.js";
import { db } from "../lib/db.js";
import { RE_USER, RE_MAIL, key, putUser, publicUser } from "../lib/users.js";

export default route(["POST"], async (req) => {
  const b = getBody(req), mail = String(b.mail || "").trim().toLowerCase(), name = String(b.user || "").trim(), pass = String(b.pass || "");
  if (!RE_MAIL.test(mail)) throw new HttpError(400, "Gunakan alamat Gmail yang valid (@gmail.com).");
  if (!RE_USER.test(name)) throw new HttpError(400, "Username 3-20 karakter: huruf, angka, _ atau titik.");
  if (pass.length < 6 || pass.length > 100) throw new HttpError(400, "Password minimal 6 karakter.");
  await limit("reg:" + ip(req), 8, 3600);
  const k = key(name);
  if (await db.get("mail:" + mail)) throw new HttpError(409, "Gmail ini sudah terdaftar.");
  const { salt, hash } = await hashPw(pass);
  const now = Date.now(), rec = { name, mail, salt, hash, created: now, lastLogin: now, logins: 1, banned: false };
  if (!(await db.setnx("user:" + k, JSON.stringify(rec)))) throw new HttpError(409, "Username sudah dipakai.");
  if (!(await db.setnx("mail:" + mail, k))) { await db.del("user:" + k); throw new HttpError(409, "Gmail ini sudah terdaftar."); }
  await db.sadd("users", k);
  return { token: sign({ u: k, role: "user" }, 30 * 86400), user: publicUser(rec) };
});
