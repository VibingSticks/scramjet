// Build: obfuscate src/index.js and inline it into src/index.html, producing
// public/index.html. No separate /index.js is served — the page is a single
// HTML document, like a real Cloudflare error page.
// Edit src/index.js or src/index.html, then run: npm run obfuscate
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Obfuscator from "javascript-obfuscator";

const here = dirname(fileURLToPath(import.meta.url));
const js = readFileSync(join(here, "src/index.js"), "utf8");
const html = readFileSync(join(here, "src/index.html"), "utf8");

const obf = Obfuscator.obfuscate(js, {
  target: "browser",
  renameGlobals: true,
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  identifierNamesGenerator: "hexadecimal",
  numbersToExpressions: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 6,
  stringArray: true,
  stringArrayEncoding: ["rc4"],
  stringArrayThreshold: 1,
  stringArrayWrappersCount: 3,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersType: "function",
  transformObjectKeys: true,
  selfDefending: true,
  debugProtection: true,
  debugProtectionInterval: 4000,
}).getObfuscatedCode()
  // never let a literal </script> break out of the inline tag
  .replace(/<\/script>/gi, "<\\/script>");

if (!html.includes("/*__GATE__*/")) throw new Error("marker /*__GATE__*/ not found in src/index.html");
const out = html.replace("/*__GATE__*/", () => obf);

writeFileSync(join(here, "public/index.html"), out);
// remove any previously-served separate script so it can't be requested
try { rmSync(join(here, "public/index.js")); } catch {}
console.log("built public/index.html (inline obfuscated gate)");
