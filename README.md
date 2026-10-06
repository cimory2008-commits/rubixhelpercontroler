# Web Controller Rubik Companion (Vercel)

Fungsi:
- Menyimpan **akun** pengguna aplikasi (daftar dan masuk lewat server ini).
- Panel admin: lihat semua akun, **ban** (permanen atau sementara, dengan alasan), buka ban, reset password, hapus akun.
- Menyimpan **kunci API AI** dan melayani chat "Tanya AI" untuk aplikasi (hanya untuk akun yang login dan tidak dibanned, dengan batas harian).

## Cara pasang di Vercel
1. Buat akun di vercel.com dan github.com. Upload folder ini ke repo GitHub **privat** (atau pakai `npx vercel` dari folder ini).
2. Di Vercel: **Add New > Project**, pilih repo itu, Framework Preset: **Other**, lalu Deploy.
3. **Database:** di project, buka tab **Storage > Create Database > Upstash (Redis)**, pilih paket gratis, lalu sambungkan ke project. Variabel `KV_REST_API_URL` dan `KV_REST_API_TOKEN` terisi otomatis. Tanpa ini server menolak bekerja (supaya data tidak hilang diam-diam).
4. **Settings > Environment Variables**, isi:
   | Nama | Isi |
   |---|---|
   | `AUTH_SECRET` | teks acak panjang (minimal 32 karakter), rahasia |
   | `ADMIN_USER` | username admin pilihanmu |
   | `ADMIN_PASSWORD` | password admin yang kuat |
   | `ANTHROPIC_API_KEY` | kunci API AI-mu (hanya disimpan di sini) |
   | `AI_DAILY_LIMIT` | (opsional) batas pertanyaan AI per akun per hari, bawaan 30 |
   | `AI_MODEL` | (opsional) bawaan `claude-haiku-4-5-20251001` |
   | `ALLOWED_ORIGIN` | (opsional) bawaan `*` |
5. **Deployments > Redeploy** supaya variabel terbaca.
6. Buka `https://nama-projekmu.vercel.app`, masuk dengan `ADMIN_USER` dan `ADMIN_PASSWORD`.
7. Di aplikasi, buka `js/config.js` dan isi: `var API_BASE = "https://nama-projekmu.vercel.app";`

## Keamanan
- Password pengguna disimpan dalam bentuk hash (scrypt) di server, tidak pernah polos.
- Kunci AI dan rahasia admin hanya ada di variabel lingkungan Vercel, tidak di aplikasi.
- Login dibatasi percobaannya (per akun dan per IP), begitu juga login admin.
- Jaga `ADMIN_PASSWORD` dan `AUTH_SECRET`. Kalau bocor, ganti di Vercel lalu redeploy.
- Atur **batas pengeluaran bulanan** di akun AI-mu.

## Uji di komputer sendiri (opsional)
`AUTH_SECRET=rahasiapanjang123456 ADMIN_USER=admin ADMIN_PASSWORD=admin123 node dev-server.js`
lalu buka http://localhost:3000. Data tersimpan di memori saja, hilang saat dimatikan.
