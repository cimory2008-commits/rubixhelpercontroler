import { route } from "../lib/util.js";

// Halaman cek: buka https://alamatmu.vercel.app/api/status di browser.
// Hanya menampilkan ya/tidak, tidak pernah menampilkan isi kunci atau password.
export default route(["GET"], async () => {
  const hasDb = !!(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL);
  return {
    versi: "v3-multi-ai",
    ai: {
      provider: (process.env.AI_PROVIDER || "(kosong, dianggap anthropic)").toLowerCase(),
      kunciTerbaca: !!(process.env.AI_API_KEY || process.env.ANTHROPIC_API_KEY),
      model: process.env.AI_MODEL || "(bawaan provider)",
      batasHarian: +process.env.AI_DAILY_LIMIT || 30,
    },
    authSecretOk: (process.env.AUTH_SECRET || "").length >= 16,
    adminTerpasang: !!(process.env.ADMIN_USER && process.env.ADMIN_PASSWORD),
    database: hasDb ? "upstash terpasang" : "BELUM TERPASANG",
  };
});
