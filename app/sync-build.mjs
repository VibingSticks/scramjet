// Copies the Scramjet build outputs from the workspace into ./vendor so the
// server can serve them. Re-run after every `pnpm build` at the repo root:
//   npm run sync
import { cpSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..");
const vendor = join(here, "vendor");
mkdirSync(vendor, { recursive: true });

const files = [
  // scramjet core (this is where YOUR source edits + Rust wasm land)
  ["packages/core/dist/scramjet.js", "scramjet.js"],
  ["packages/core/dist/scramjet.wasm", "scramjet.wasm"],
  // controller
  ["packages/controller/dist/controller.api.js", "controller.api.js"],
  ["packages/controller/dist/controller.inject.js", "controller.inject.js"],
  ["packages/controller/dist/controller.sw.js", "controller.sw.js"],
  // utils
  ["packages/utils/dist/scramjet-utils.js", "scramjet-utils.js"],
  // bootstrap client glue (init())
  ["packages/bootstrap/dist/bootstrap-client.js", "bootstrap-client.js"],
  // libcurl transport client (from this app's node_modules, not part of scramjet)
  ["app/node_modules/@mercuryworkshop/libcurl-transport/dist/index.js", "libcurl-client.js"],
];

for (const [src, dst] of files) {
  cpSync(join(repo, src), join(vendor, dst));
  console.log("synced", dst);
}
console.log("vendor/ updated.");
