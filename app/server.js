import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { server as wisp } from "@mercuryworkshop/wisp-js/server";

const here = path.dirname(fileURLToPath(import.meta.url));
const vendor = path.join(here, "vendor");

// Client config (mirrors proxy-bootstrap's defaults). init() in
// bootstrap-client.js reads these paths; we serve each from ./vendor.
const config = {
  transport: "libcurl",
  swPath: "/sw.js",
  wispPath: "/wisp/",
  bootstrapInitPath: "/bootstrap-init.js",
  libcurlClientPath: "/clients/libcurl-client.js",
  scramjetControllerApiPath: "/controller/controller.api.js",
  scramjetControllerInjectPath: "/controller/controller.inject.js",
  scramjetControllerSwPath: "/controller/controller.sw.js",
  scramjetBundlePath: "/scram/scramjet.js",
  scramjetWasmPath: "/scram/scramjet.wasm",
  scramjetUtilsBundlePath: "/scram/scramjet-utils.js",
};

// static asset routes -> local vendor files (your build)
const assetRoutes = {
  [config.scramjetControllerApiPath]: "controller.api.js",
  [config.scramjetControllerInjectPath]: "controller.inject.js",
  [config.scramjetControllerSwPath]: "controller.sw.js",
  [config.scramjetBundlePath]: "scramjet.js",
  [config.scramjetWasmPath]: "scramjet.wasm",
  [config.scramjetUtilsBundlePath]: "scramjet-utils.js",
  [config.libcurlClientPath]: "libcurl-client.js",
};

const clientData = fs.readFileSync(path.join(vendor, "bootstrap-client.js"));

const app = express();

app.get(config.swPath, (_req, res) => {
  res.type("application/javascript").send(
`importScripts("${config.scramjetControllerSwPath}");
addEventListener("fetch", (e) => {
  if ($scramjetController.shouldRoute(e)) {
    e.respondWith($scramjetController.route(e));
  }
});
`);
});

app.get(config.bootstrapInitPath, (_req, res) => {
  res.type("application/javascript").send(
`async function initBootstrap() {
  const { init } = await import("data:text/javascript;base64,${clientData.toString("base64")}");
  return init(${JSON.stringify(config)});
}`);
});

app.get(Object.keys(assetRoutes), (req, res) => {
  const file = path.join(vendor, assetRoutes[req.path]);
  res.type(req.path.endsWith(".wasm") ? "application/wasm" : "application/javascript");
  fs.createReadStream(file).on("error", () => res.sendStatus(404)).pipe(res);
});

// our frontend
app.use(express.static(path.join(here, "public")));

const server = http.createServer(app);

// Wisp backend on the same port
server.on("upgrade", (req, socket, head) => {
  if (req.url && req.url.startsWith(config.wispPath)) {
    wisp.routeRequest(req, socket, head);
  } else {
    socket.destroy();
  }
});

const port = process.env.PORT || 3030;
server.listen(port, () =>
  console.log(`Scramjet proxy (local build) listening on ${port}`)
);
