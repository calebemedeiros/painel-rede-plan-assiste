import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
await rm(dist, { recursive: true, force: true });
await mkdir(path.join(dist, "config"), { recursive: true });
await cp(path.join(root, "index.html"), path.join(dist, "index.html"));
await cp(path.join(root, "assets"), path.join(dist, "assets"), { recursive: true });
const catalogRoot = path.resolve(root, "..", "catalogo-demo-rede-plan-assiste", "dist", "api", "v2");
const bundledCatalog = process.env.CATALOG_MANIFEST_URL ? false : true;
if (bundledCatalog) await cp(catalogRoot, path.join(dist, "api", "v2"), { recursive: true });
const manifestUrl = process.env.CATALOG_MANIFEST_URL || "./api/v2/manifest.json";
await writeFile(path.join(dist, "assets", "config.js"), `window.APP_CONFIG = Object.freeze({\n  applicationMode: "production",\n  manifestUrl: "${manifestUrl}",\n  recordsPerPage: 10,\n  staleAfterDays: 2\n});\n`);
await writeFile(path.join(dist, "config", "runtime.json"), JSON.stringify({ schema_version: "4.1.0", base_url: "./", environment: "production" }, null, 2) + "\n");
console.log(`Build gerado em ${dist}`);
