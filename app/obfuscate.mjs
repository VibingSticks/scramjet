// Build step: obfuscate src/index.js -> public/index.js (the served file).
// Edit src/index.js, then run: npm run obfuscate
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Obfuscator from "javascript-obfuscator";

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, "src/index.js"), "utf8");

const result = Obfuscator.obfuscate(src, {
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
});

writeFileSync(join(here, "public/index.js"), result.getObfuscatedCode());
console.log("obfuscated -> public/index.js");
