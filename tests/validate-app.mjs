import { readFile, access } from "node:fs/promises";
import { constants } from "node:fs";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const [html, config, app] = await Promise.all([read("index.html"), read("assets/config.js"), read("assets/app.js")]);
assert(config.includes('applicationMode: "production"'), "Modo de produção ausente.");
assert(config.includes("/api/v2/manifest.json"), "Manifesto v2 externo não configurado.");
assert(html.includes("connect-src 'self' https://calebemedeiros.github.io"), "CSP não permite a origem do catálogo.");
for (const id of ["consulta","especialidade","estado","municipio","tipo","fonte","vinculo","modalidade","prefixo","detalhes-modal"]) assert(html.includes(`id="${id}"`), `Controle ausente: ${id}.`);
assert(!html.includes("Base sintética") && !html.includes("Ambiente demonstrativo"), "Texto de demonstração presente na interface.");
assert(app.includes('schema_version !== "4.0.0"'), "Contrato 4.0.0 não validado.");
assert(app.includes("checksum_sha256") && app.includes("publication_status"), "Integridade ou aprovação não verificadas.");
assert(app.includes("related_specialty_ids") && app.includes("Prestadores de especialidades relacionadas"), "Pesquisa por procedimento incompleta.");
assert(app.includes('credentials: "omit"') && app.includes('textContent = value'), "Controles de segurança do cliente ausentes.");
assert(app.includes('addEventListener("close"'), "Restauração de foco do modal ausente.");
for (const file of ["data/manifest.json", "data/catalogo-demo-v1.json"]) {
  try { await access(new URL(`../${file}`, import.meta.url), constants.F_OK); throw new Error(`Base incorporada indevidamente: ${file}.`); }
  catch (error) { if (error.message.startsWith("Base incorporada")) throw error; }
}
console.log("Aplicação válida: contrato 4.0.0, catálogo externo, pesquisa por procedimento e controles de segurança presentes.");
