// Access gate. Until the correct code is typed, NO proxy assets load, no service
// worker registers, and no proxy markup exists — the page is only a Cloudflare
// error. The code is checked as a SHA-256 hash (obscurity, not security).
const H = "82e2316835165f33f99e0d7583c3e8ac2d2ed3d5b550a19712d44b83308d6e0e";
const L = 13;

// Populate the Cloudflare facade with live-looking values.
(function () {
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const host = location.hostname || "example.com";
  const d = new Date(), p = (n) => String(n).padStart(2, "0");
  const ts = `${d.getUTCFullYear()}-${p(d.getUTCMonth()+1)}-${p(d.getUTCDate())} ` +
             `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} UTC`;
  const cities = ["Dallas","Phoenix","Ashburn","Chicago","San Jose",
    "Los Angeles","Atlanta","Seattle","Miami","Denver"];
  const ip = [Math.floor(Math.random()*223)+1, Math.floor(Math.random()*256),
    Math.floor(Math.random()*256), Math.floor(Math.random()*254)+1].join(".");
  set("cf-host", host);
  set("cf-city", cities[Math.floor(Math.random() * cities.length)]);
  set("cf-time", ts);
  const ipEl = document.getElementById("cf-ip"); if (ipEl) ipEl.dataset.ip = ip;
  try { document.title = host + " | 521: Web server is down"; } catch {}
  const caret = document.getElementById("cf-caret"), col = caret && caret.closest(".col"),
        band = document.querySelector("#error .band");
  const place = () => {
    if (!caret || !col || !band) return;
    const c = col.getBoundingClientRect(), b = band.getBoundingClientRect();
    caret.style.left = (c.left - b.left + c.width / 2 - 12) + "px";
  };
  place(); addEventListener("resize", place);
})();

async function digest(str) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

let buf = "";
async function onKey(e) {
  if (e.key === "Backspace") buf = buf.slice(0, -1);
  else if (e.key.length === 1) buf += e.key.toLowerCase();
  else return;
  if (buf.length > 128) buf = buf.slice(-128);
  const tail = buf.slice(-L);
  if (tail.length === L && (await digest(tail)) === H) {
    document.removeEventListener("keydown", onKey);
    reveal();
  }
}
document.addEventListener("keydown", onKey);

function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}

let started = false;
async function reveal() {
  if (started) return; started = true;
  try { sessionStorage.setItem("__cf_rl", "1"); } catch {}

  const err = document.getElementById("error"); if (err) err.remove();

  const style = document.createElement("style");
  style.textContent =
    "html,body{margin:0;height:100%;background:#0d1017}" +
    "#v{position:fixed;inset:0;display:flex;flex-direction:column;background:#0d1017;color:#e6e9ef;font:14px system-ui,sans-serif}" +
    "#v .b{display:flex;gap:8px;padding:10px 12px;background:#151a23;border-bottom:1px solid #232a36}" +
    "#v form{flex:1;display:flex}" +
    "#v input{flex:1;padding:9px 12px;border-radius:7px;border:1px solid #2a323f;background:#0d1017;color:#e6e9ef;font-size:14px}" +
    "#v input:focus{outline:none;border-color:#6ea8fe}" +
    "#v .u{padding:4px 14px;font-size:12px;color:#7d8797;background:#10141c;border-bottom:1px solid #232a36;min-height:18px}" +
    "#v iframe{border:0;flex:1;width:100%;background:#fff}";
  document.head.appendChild(style);

  const v = document.createElement("div"); v.id = "v";
  v.innerHTML =
    '<div class="b"><form id="vn"><input id="va" placeholder="Search or enter address" autocomplete="off" spellcheck="false"></form></div>' +
    '<div class="u" id="vu"></div><iframe id="vf" allowfullscreen></iframe>';
  document.body.appendChild(v);

  // Proxy runtime is fetched only now.
  await loadScript("/bootstrap-init.js");
  const controller = await window["initBootstrap"]();

  const plugins = [], U = window.$scramjetUtils;
  if (U) {
    if (U.HttpCachePlugin) plugins.push(new U.HttpCachePlugin());
    if (U.UrlWatcherPlugin) plugins.push(new U.UrlWatcherPlugin((u) => {
      document.getElementById("vu").textContent = u;
      const a = document.getElementById("va");
      if (document.activeElement !== a) a.value = u;
    }));
    if (U.CatchEscapedLinksPlugin) plugins.push(new U.CatchEscapedLinksPlugin(
      (u) => new URL(`/?goto=${encodeURIComponent(u.href)}`, location.origin)));
  }

  const frame = controller.createFrame(document.getElementById("vf"), { plugins });
  const a = document.getElementById("va");
  document.getElementById("vn").addEventListener("submit", (e) => {
    e.preventDefault();
    let u = a.value.trim(); if (!u) return;
    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
    frame.go(u);
  });
  a.focus();

  const g = new URL(location.href).searchParams.get("goto");
  if (g) { history.replaceState(null, "", location.pathname); a.value = g; frame.go(g); }
}

// Resume within the same browser session (reloads and the ?goto bounce).
try { if (sessionStorage.getItem("__cf_rl") === "1") reveal(); } catch {}
