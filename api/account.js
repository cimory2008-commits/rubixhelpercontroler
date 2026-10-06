import { route, getBody, checkPw, hashPw, HttpError } from "../lib/util.js";
import { db } from "../lib/db.js";
import { RE_MAIL, key, requireUser, putUser, publicUser } from "../lib/users.js";

export default route(["POST"], async (req) => {
  const u = await requireUser(req), b = getBody(req), k = key(u.name);
  if (b.action === "mail") {
    const m = String(b.mail || "").trim().toLowerCase();
    if (!RE_MAIL.test(m)) throw new HttpError(400, "Gunakan alamat Gmail yang valid (@gmail.com).");
    if (m !== u.mail) {
      if (!(await db.setnx("mail:" + m, k))) throw new HttpError(409, "Gmail ini sudah dipakai akun lain.");
      await db.del("mail:" + u.mail); u.mail = m; await putUser(u);
    }
    return { user: publicUser(u) };
  }
  if (b.action === "password") {
    const np = String(b.pass || "");
    if (!(await checkPw(String(b.old || ""), u.salt, u.hash))) throw new HttpError(400, "Password lama salah.");
    if (np.length < 6 || np.length > 100) throw new HttpError(400, "Password baru minimal 6 karakter.");
    Object.assign(u, await hashPw(np)); await putUser(u);
    return { ok: true };
  }
  if (b.action === "delete") {
    if (!(await checkPw(String(b.pass || ""), u.salt, u.hash))) throw new HttpError(400, "Password salah.");
    await db.del("user:" + k, "mail:" + u.mail); await db.srem("users", k);
    return { ok: true };
  }
  throw new HttpError(400, "Aksi tidak dikenal.");
});
