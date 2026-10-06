(function () {
  "use strict";
  var $ = function (i) { return document.getElementById(i); }, tok = null, data = { users: [], stats: {} }, loaded = false;
  try { tok = sessionStorage.getItem("wc_tok"); } catch (e) {}

  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function show(id, on) { $(id).classList.toggle("hide", !on); }
  function toast(t, bad) { var e = $("tt"); e.textContent = t; e.className = "toast" + (bad ? " bad" : ""); clearTimeout(e._t); e._t = setTimeout(function () { e.className = "toast hide"; }, 3200); }
  function fmt(ms) { return ms ? new Date(ms).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"; }
  function ago(ms) { if (!ms) return "belum pernah"; var s = (Date.now() - ms) / 1000; if (s < 60) return "baru saja"; if (s < 3600) return Math.floor(s / 60) + " menit lalu"; if (s < 86400) return Math.floor(s / 3600) + " jam lalu"; return Math.floor(s / 86400) + " hari lalu"; }

  async function api(p, body, method) {
    var h = { "Content-Type": "application/json" }; if (tok) h.Authorization = "Bearer " + tok;
    try {
      var r = await fetch(p, { method: method || "POST", headers: h, body: method === "GET" ? undefined : JSON.stringify(body || {}) }), d = {};
      try { d = await r.json(); } catch (e) {}
      if (r.status === 401 && p !== "/api/admin/login") logout(true);
      return { ok: r.ok, status: r.status, data: d };
    } catch (e) { return { ok: false, status: 0, data: { error: "Tidak bisa terhubung ke server." } }; }
  }

  function enter() { show("login", false); show("dash", true); show("out", true); $("who").textContent = "Admin"; load(); }
  function logout(expired) {
    tok = null; loaded = false; try { sessionStorage.removeItem("wc_tok"); } catch (e) {}
    show("dash", false); show("out", false); show("login", true); $("who").textContent = "Web Controller"; closeM();
    $("le").textContent = expired ? "Sesi admin berakhir, silakan masuk lagi." : "";
  }
  async function login() {
    $("le").textContent = ""; var r = await api("/api/admin/login", { user: $("au").value, pass: $("ap").value });
    if (!r.ok) { $("le").textContent = r.data.error || "Gagal masuk."; return; }
    tok = r.data.token; try { sessionStorage.setItem("wc_tok", tok); } catch (e) {} $("ap").value = ""; enter();
  }

  async function load() {
    var r = await api("/api/admin/users", null, "GET");
    if (!r.ok) { if (r.status !== 401) toast(r.data.error || "Gagal memuat data.", true); return; }
    data = r.data; loaded = true; render();
  }

  function render() {
    var s = data.stats, st = $("st"); st.innerHTML = "";
    [["Total akun", s.total, ""], ["Dibanned", s.banned, "r"], ["Baru hari ini", s.newToday, ""], ["Chat AI hari ini", s.aiToday, "g"]].forEach(function (x) {
      var d = el("div"); d.appendChild(el("span", "cap", x[0])); d.appendChild(el("b", x[2], String(x[1] || 0))); st.appendChild(d);
    });
    var q = $("q").value.trim().toLowerCase(), f = $("f").value, L = $("list"); L.innerHTML = "";
    var rows = data.users.filter(function (u) {
      if (f === "aktif" && u.status !== "aktif") return false;
      if (f === "banned" && u.status === "aktif") return false;
      return !q || u.name.toLowerCase().indexOf(q) > -1 || u.mail.indexOf(q) > -1;
    });
    if (!rows.length) { L.appendChild(el("div", "empty", data.users.length ? "Tidak ada akun yang cocok." : "Belum ada akun terdaftar.")); return; }
    rows.forEach(function (u) { L.appendChild(row(u)); });
  }

  function row(u) {
    var banned = u.status !== "aktif", w = el("div", "u" + (banned ? " b" : ""));
    w.appendChild(el("div", "av", u.name.charAt(0).toUpperCase()));
    var i = el("div", "info"), n = el("div", "nm", u.name);
    n.appendChild(el("span", "badge " + (u.status === "aktif" ? "ok" : u.status === "banned" ? "bn" : "tmp"), u.status === "aktif" ? "aktif" : u.status === "banned" ? "banned" : "banned sementara"));
    i.appendChild(n); i.appendChild(el("div", "mail", u.mail));
    i.appendChild(el("div", "meta", "Bergabung " + fmt(u.created) + " · login terakhir " + ago(u.lastLogin) + " · " + u.logins + "× login · AI hari ini " + u.aiToday + " (total " + u.aiTotal + ")"));
    if (banned) i.appendChild(el("div", "why", "Alasan: " + (u.banReason || "(tanpa alasan)") + " · " + (u.bannedUntil ? "sampai " + fmt(u.bannedUntil) : "permanen")));
    w.appendChild(i);
    var a = el("div", "acts");
    var b1 = el("button", "bt sm" + (banned ? "" : " danger"), banned ? "Buka ban" : "Ban");
    b1.onclick = function () { banned ? unban(u) : openBan(u); };
    var b2 = el("button", "bt sm", "Reset password"); b2.onclick = function () { askReset(u); };
    var b3 = el("button", "bt sm danger", "Hapus"); b3.onclick = function () { askDelete(u); };
    a.appendChild(b1); a.appendChild(b2); a.appendChild(b3); w.appendChild(a);
    return w;
  }

  function modal(nodes) { var b = $("mb"); b.innerHTML = ""; nodes.forEach(function (n) { b.appendChild(n); }); show("md", true); }
  function closeM() { show("md", false); }
  function btns(okLabel, danger, onOk, hideCancel) {
    var a = el("div", "acts");
    if (!hideCancel) { var c = el("button", "bt sm", "Batal"); c.onclick = closeM; a.appendChild(c); }
    var o = el("button", "bt sm" + (danger ? " danger" : ""), okLabel); o.onclick = onOk; a.appendChild(o); return a;
  }
  async function act(body, okMsg) {
    var r = await api("/api/admin/action", body);
    if (!r.ok) { toast(r.data.error || "Gagal.", true); return null; }
    toast(okMsg); await load(); return r.data;
  }

  function openBan(u) {
    var why = el("textarea"); why.maxLength = 200; why.placeholder = "Alasan (akan terlihat oleh pengguna)";
    var dur = el("select");
    [["0", "Permanen"], ["1", "1 jam"], ["24", "24 jam"], ["72", "3 hari"], ["168", "7 hari"], ["720", "30 hari"]].forEach(function (o) { var x = el("option", null, o[1]); x.value = o[0]; dur.appendChild(x); });
    var f1 = el("div", "fld"); f1.appendChild(el("label", null, "Alasan")); f1.appendChild(why);
    var f2 = el("div", "fld"); f2.appendChild(el("label", null, "Durasi")); f2.appendChild(dur);
    modal([el("h3", null, "Ban akun"), el("p", null, u.name + " · " + u.mail), f1, f2,
      btns("Ban akun", true, async function () { closeM(); await act({ action: "ban", user: u.name, reason: why.value, hours: +dur.value }, u.name + " dibanned."); })]);
    why.focus();
  }
  function unban(u) { act({ action: "unban", user: u.name }, "Ban " + u.name + " dibuka."); }
  function askDelete(u) {
    modal([el("h3", null, "Hapus akun?"), el("p", null, "Akun " + u.name + " (" + u.mail + ") akan dihapus permanen dan tidak bisa dikembalikan."),
      btns("Hapus", true, async function () { closeM(); await act({ action: "delete", user: u.name }, u.name + " dihapus."); })]);
  }
  function askReset(u) {
    modal([el("h3", null, "Reset password?"), el("p", null, "Password baru sementara dibuat untuk " + u.name + ". Password lama tidak berlaku lagi."),
      btns("Reset", false, async function () {
        var d = await act({ action: "reset", user: u.name }, "Password direset."); if (!d) { closeM(); return; }
        var t = el("div", "temp", d.temp);
        modal([el("h3", null, "Password sementara"), el("p", null, "Berikan ke " + u.name + ". Password ini hanya tampil sekali, jadi salin sekarang."), t, btns("Selesai", false, closeM, true)]);
      })]);
  }

  $("lg").onclick = login;
  $("ap").addEventListener("keydown", function (e) { if (e.key === "Enter") login(); });
  $("out").onclick = function () { logout(false); };
  $("rf").onclick = load; $("q").oninput = render; $("f").onchange = render;
  $("md").addEventListener("click", function (e) { if (e.target === $("md")) closeM(); });
  setInterval(function () { if (tok && loaded && $("md").classList.contains("hide") && !document.hidden) load(); }, 30000);
  if (tok) enter();
})();
