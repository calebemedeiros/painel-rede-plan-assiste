const localCatalog = "../catalogo-demo-rede-plan-assiste/api/v2/manifest.json";
window.APP_CONFIG = Object.freeze({
  applicationMode: "production",
  manifestUrl: location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? localCatalog
    : "https://calebemedeiros.github.io/catalogo-demo-rede-plan-assiste/api/v2/manifest.json",
  recordsPerPage: 10,
  staleAfterDays: 2
});
