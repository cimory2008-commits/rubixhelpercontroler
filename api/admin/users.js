import { route, wibDay } from "../../lib/util.js";
import { db } from "../../lib/db.js";
import { requireAdmin, banInfo } from "../../lib/users.js";

export default route(["GET"], async (req) => {
  requireAdmin(req);
  const names = (await db.smembers("users")).sort(), day = wibDay();
  const recs = (await db.mget(...names.map((n) => "user:" + n))).map((r) => (r ? JSON.parse(r) : null));
  const today = await db.mget(...names.map((n) => `aiq:${n}:${day}`));
  const total = await db.mget(...names.map((n) => "ai:total:" + n));
  const startOfDay = new Date(day + "T00:00:00+07:00").getTime();
  const users = recs.map((u, i) => {
    if (!u) return null;
    const b = banInfo(u);
    return { name: u.name, mail: u.mail, created: u.created, lastLogin: u.lastLogin || 0, logins: u.logins || 0,
      status: b ? (b.until ? "banned-sementara" : "banned") : "aktif", banReason: u.banReason || "", bannedUntil: u.bannedUntil || 0, bannedAt: u.bannedAt || 0,
      aiToday: +today[i] || 0, aiTotal: +total[i] || 0 };
  }).filter(Boolean).sort((a, b) => b.created - a.created);
  return { users, stats: {
    total: users.length, banned: users.filter((u) => u.status !== "aktif").length,
    newToday: users.filter((u) => u.created >= startOfDay).length, aiToday: users.reduce((s, u) => s + u.aiToday, 0) } };
}, { cors: false });
