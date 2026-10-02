import { readFile, access } from "node:fs/promises";
import { constants } from "node:fs";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const [html, config, app] = await Promise.all([
  read("index.html"),
  read("assets/config.js"),
  read("assets/app.js")
]);

assert(config.includes('applicationMode: "demo"'), "O painel deve permanecer no modo demo.");
assert(config.includes("https://calebemedeiros.github.io/catalogo-demo-rede-plan-assiste/api/v1/manifest.json"), "Manifesto externo não configurado.");
assert(html.includes("connect-src 'self' https://calebemedeiros.github.io"), "CSP não permite a fonte externa aprovada.");
assert(html.includes('id="fonte"'), "Filtro de origem não encontrado.");
assert(app.includes("checksum_sha256"), "Verificação de integridade ausente.");
assert(app.includes("authorization"), "Bloqueio de autorização ausente.");
assert(app.includes("source_id"), "Integração multifonte ausente.");

for (const file of ["data/manifest.json", "data/catalogo-demo-v1.json"]) {
  try {
    await access(new URL(`../${file}`, import.meta.url), constants.F_OK);
    throw new Error(`Base incorporada indevidamente ao painel: ${file}.`);
  } catch (error) {
    if (error.message.startsWith("Base incorporada")) throw error;
  }
}

console.log("Aplicação válida: catálogo externo configurado, multifonte habilitada e nenhuma base incorporada ao painel.");
