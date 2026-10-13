import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const types = { ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".css":"text/css; charset=utf-8", ".json":"application/json; charset=utf-8", ".png":"image/png", ".svg":"image/svg+xml" };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
    let target = path.join(root, pathname);
    const info = await stat(target);
    if (info.isDirectory()) target = path.join(target, "index.html");
    response.setHeader("Content-Type", types[path.extname(target)] || "application/octet-stream");
    createReadStream(target).pipe(response);
  } catch { response.statusCode = 404; response.end("Not found"); }
});
await new Promise((resolve) => server.listen(4174, "127.0.0.1", resolve));
const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [];
try {
  for (const [name, viewport] of [["desktop", { width: 1440, height: 1000 }], ["mobile", { width: 390, height: 844 }]]) {
    const page = await browser.newPage({ viewport });
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("http://127.0.0.1:4174/painel-rede-plan-assiste/", { waitUntil: "networkidle", timeout: 120000 });
    await page.waitForFunction(() => document.querySelector("#total-registros")?.textContent !== "—", null, { timeout: 120000 });
    if (name === "desktop") {
      await page.fill("#consulta", "10101012");
      await page.click("button[type=submit]");
      await page.waitForSelector("#contexto-procedimento:not([hidden])");
    }
    await page.locator("button[data-record-id]").first().click();
    const modalFits = await page.evaluate(() => {
      const modal = document.querySelector("#detalhes-modal");
      const body = document.querySelector("#detalhes-conteudo");
      return modal.open && modal.getBoundingClientRect().height <= innerHeight && body.scrollHeight <= body.clientHeight;
    });
    if (!modalFits) throw new Error(`${name}: modal exige barra de rolagem`);
    await page.click("#concluir-modal");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    if (overflow) throw new Error(`${name}: rolagem horizontal detectada`);
    await page.screenshot({ path: path.join(root, `qa-${name}.png`), fullPage: true });
    await page.close();
  }
  if (errors.length) throw new Error(`Erros do navegador: ${errors.join(" | ")}`);
  console.log("QA visual concluído em desktop e celular, sem rolagem horizontal ou erro de console.");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
