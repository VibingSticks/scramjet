// ============================================================================
//  ACCESS GATE  (obscurity, not real security — the check runs in the browser)
//  The page pretends to be a dead "server not found" error. Type the secret
//  code anywhere and it flips to "Access accepted" and reveals the proxy.
//
//  The code is stored as a SHA-256 hash so it isn't visible in plain text.
//  Default code: "opensesame".  To change it, run:
//      printf '%s' 'yourcode' | sha256sum
//  then set SECRET_HASH to the result and CODE_LEN to the code's length.
// ============================================================================
const SECRET_HASH = "d9fb92e3bbe65be1f1aad4a82eef4567f7a1ebe2cd110c8049b9698be7a70c88";
const CODE_LEN = 10;

const errorEl = document.getElementById("error");
const acceptedEl = document.getElementById("accepted");
const proxyEl = document.getElementById("proxy");
// Populate the Cloudflare error facade with live-looking values.
(function fillCloudflare() {
  const host = location.hostname || "example.com";
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

  // Timestamp in Cloudflare's "YYYY-MM-DD HH:MM:SS UTC" format.
  const d = new Date(), p = (n) => String(n).padStart(2, "0");
  const ts = `${d.getUTCFullYear()}-${p(d.getUTCMonth()+1)}-${p(d.getUTCDate())} ` +
             `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} UTC`;

  // Random Cloudflare datacenter city for the middle column.
  const cities = ["Dallas","Phoenix","Ashburn","Chicago","San Jose",
    "Los Angeles","Atlanta","Seattle","Miami","Denver"];
  const city = cities[Math.floor(Math.random() * cities.length)];

  // A plausible public IP, revealed on "Click to reveal".
  const ip = [Math.floor(Math.random()*223)+1, Math.floor(Math.random()*256),
    Math.floor(Math.random()*256), Math.floor(Math.random()*254)+1].join(".");

  set("cf-host", host);
  set("cf-city", city);
  set("cf-time", ts);
  const ipEl = document.getElementById("cf-ip");
  if (ipEl) ipEl.dataset.ip = ip;
  try { document.title = host + " | 521: Web server is down"; } catch {}

  // Position the white down-caret centered under the Host column (caret is
  // absolutely positioned relative to .band; bottom:-11px comes from CSS).
  const placeCaret = () => {
    const caret = document.getElementById("cf-caret");
    const col = caret && caret.closest(".col");
    const band = document.querySelector("#error .band");
    if (!caret || !col || !band) return;
    const cRect = col.getBoundingClientRect(), bRect = band.getBoundingClientRect();
    caret.style.left = (cRect.left - bRect.left + cRect.width / 2 - 12) + "px";
  };
  placeCaret();
  addEventListener("resize", placeCaret);
})();

async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Capture typed characters while the facade is showing. When the last CODE_LEN
// characters hash to SECRET_HASH, unlock.
let buffer = "";
async function onKey(e) {
  if (e.key === "Backspace") buffer = buffer.slice(0, -1);
  else if (e.key.length === 1) buffer += e.key.toLowerCase();
  else return;
  if (buffer.length > 64) buffer = buffer.slice(-64);
  const tail = buffer.slice(-CODE_LEN);
  if (tail.length === CODE_LEN && (await sha256(tail)) === SECRET_HASH) {
    document.removeEventListener("keydown", onKey);
    unlock();
  }
}
document.addEventListener("keydown", onKey);

async function unlock() {
  errorEl.hidden = true;
  acceptedEl.hidden = false;
  try {
    await initProxy();
    setTimeout(() => {
      acceptedEl.hidden = true;
      proxyEl.hidden = false;
      document.getElementById("addr").focus();
    }, 900);
  } catch (err) {
    acceptedEl.querySelector(".msg").textContent = "Access error: " + err.message;
    console.error(err);
  }
}

let controller, frame;
async function initProxy() {
  controller = await initBootstrap();

  const plugins = [];
  if (window.$scramjetUtils) {
    const U = window.$scramjetUtils;
    if (U.HttpCachePlugin) plugins.push(new U.HttpCachePlugin());
    if (U.UrlWatcherPlugin)
      plugins.push(new U.UrlWatcherPlugin((url) => {
        document.getElementById("frameurl").textContent = url;
        const a = document.getElementById("addr");
        if (document.activeElement !== a) a.value = url;
      }));
    if (U.CatchEscapedLinksPlugin)
      plugins.push(new U.CatchEscapedLinksPlugin(
        (url) => new URL(`/?goto=${encodeURIComponent(url.href)}`, location.origin)
      ));
  }

  frame = controller.createFrame(document.getElementById("frame"), { plugins });

  document.getElementById("nav").addEventListener("submit", (e) => {
    e.preventDefault();
    let u = document.getElementById("addr").value.trim();
    if (!u) return;
    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
    frame.go(u);
  });
}

// If a proxied page escaped back to us via ?goto=, unlock is required first;
// stash it and navigate once the proxy is up.
const goto = new URL(location.href).searchParams.get("goto");
if (goto) {
  history.replaceState(null, "", location.pathname);
  const orig = initProxy;
  initProxy = async function () { await orig(); frame.go(goto); };
}
