import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const manifestPath = new URL("../data/manifest.json", import.meta.url);
const catalogPath = new URL("../data/catalogo-demo-v1.json", import.meta.url);
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const catalogBuffer = await readFile(catalogPath);
const catalog = JSON.parse(catalogBuffer.toString("utf8"));

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(manifest.schema_version === "1.0.0", "Versão inesperada do manifesto.");
assert(manifest.environment === "demo", "A fase D1 aceita somente ambiente demo.");
assert(manifest.authorization?.status === "synthetic-demo", "A base D1 deve ser declarada como sintética.");
assert(manifest.authorization?.reference === null, "A demonstração não deve simular referência de autorização.");
assert(catalog.environment === "demo", "O catálogo deve permanecer no ambiente demo.");
assert(catalog.authorization?.status === "synthetic-demo", "O catálogo deve ser identificado como sintético.");
assert(Array.isArray(catalog.records), "O catálogo deve conter uma lista de registros.");
assert(catalog.record_count === catalog.records.length, "record_count difere da lista do catálogo.");
assert(manifest.record_count === catalog.records.length, "record_count do manifesto difere do catálogo.");

const calculatedHash = createHash("sha256").update(catalogBuffer).digest("hex");
assert(calculatedHash === manifest.checksum_sha256, "Checksum SHA-256 divergente.");

const forbiddenKeys = new Set([
  "associadoId",
  "matricula",
  "pessoaFJ",
  "sexo",
  "marqueAqui",
  "atendimento",
  "tea",
  "observacao",
  "imagem1",
  "imagem2",
  "imagem3",
  "imagem4",
  "imagem5"
]);

const walk = (value, path = "catalog") => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, item] of Object.entries(value)) {
    assert(!forbiddenKeys.has(key), `Campo proibido encontrado em ${path}.${key}.`);
    walk(item, `${path}.${key}`);
  }
};

walk(catalog);

const identifiers = new Set();
for (const record of catalog.records) {
  assert(["professional", "facility"].includes(record.type), `Tipo inválido em ${record.public_id}.`);
  assert(typeof record.public_id === "string" && record.public_id.length >= 8, "Identificador público inválido.");
  assert(!identifiers.has(record.public_id), `Identificador duplicado: ${record.public_id}.`);
  identifiers.add(record.public_id);
  assert(/demonstrativo|modelo/i.test(record.display_name), `Registro sem identificação sintética: ${record.public_id}.`);
  assert(Array.isArray(record.specialties) && record.specialties.length > 0, `Registro sem especialidade: ${record.public_id}.`);
  assert(Array.isArray(record.service_locations) && record.service_locations.length > 0, `Registro sem local: ${record.public_id}.`);
}

console.log(`Validação concluída: ${catalog.records.length} registros sintéticos, checksum confirmado e nenhum campo proibido.`);
