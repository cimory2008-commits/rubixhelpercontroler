/* Server uji lokal: menjalankan folder api/ dan public/ seperti di Vercel.  Jalankan: node dev-server.js
   Tanpa Upstash, data disimpan di memori (hilang saat dimatikan). Hanya untuk mencoba di komputer sendiri. */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
const root = path.dirname(fileURLToPath(import.meta.url));
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml" };
http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x"), p = decodeURIComponent(u.pathname);
  if (p.startsWith("/api/")) {
    const file = path.join(root, p.replace(/\/+$/, "") + ".js");
    if (!file.startsWith(path.join(root, "api")) || !fs.existsSync(file)) { res.statusCode = 404; res.end("{}"); return; }
    let body = ""; for await (const c of req) body += c;
    try { req.body = body ? JSON.parse(body) : {}; } catch { req.body = {}; }
    res.status = (n) => { res.statusCode = n; return res; };
    res.json = (o) => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(o)); };
    try { await (await import(pathToFileURL(file).href)).default(req, res); }
    catch (e) { console.error(e); res.statusCode = 500; res.end("{}"); }
    return;
  }
  const f = path.join(root, "public", p === "/" ? "index.html" : p);
  if (!f.startsWith(path.join(root, "public")) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.statusCode = 404; res.end("Tidak ditemukan"); return; }
  res.setHeader("Content-Type", types[path.extname(f)] || "application/octet-stream"); res.end(fs.readFileSync(f));
}).listen(+process.env.PORT || 3000, () => console.log("Web Controller lokal: http://localhost:" + (+process.env.PORT || 3000)));
