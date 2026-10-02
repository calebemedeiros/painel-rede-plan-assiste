(() => {
  "use strict";

  const config = window.APP_CONFIG;
  const state = {
    catalog: null,
    records: [],
    filtered: [],
    page: 1,
    query: "",
    specialty: "",
    stateCode: "",
    city: "",
    type: "",
    source: "",
    relationship: "",
    sort: "name"
  };

  const elements = {
    form: document.querySelector("#form-busca"),
    query: document.querySelector("#consulta"),
    specialty: document.querySelector("#especialidade"),
    state: document.querySelector("#estado"),
    city: document.querySelector("#municipio"),
    type: document.querySelector("#tipo"),
    source: document.querySelector("#fonte"),
    relationship: document.querySelector("#vinculo"),
    sort: document.querySelector("#ordenacao"),
    clear: document.querySelector("#limpar-busca"),
    clearEmpty: document.querySelector("#limpar-vazio"),
    quickSearch: document.querySelector("#atalhos-especialidades"),
    list: document.querySelector("#lista-resultados"),
    pagination: document.querySelector("#paginacao"),
    empty: document.querySelector("#sem-resultados"),
    resultSummary: document.querySelector("#resumo-resultados"),
    resultTitle: document.querySelector("#titulo-resultados"),
    error: document.querySelector("#aviso-erro"),
    errorMessage: document.querySelector("#mensagem-erro"),
    dataStatus: document.querySelector("#status-base"),
    updatedStatus: document.querySelector("#status-atualizacao"),
    totalRecords: document.querySelector("#total-registros"),
    totalProfessionals: document.querySelector("#total-profissionais"),
    totalFacilities: document.querySelector("#total-estabelecimentos"),
    totalStates: document.querySelector("#total-estados"),
    totalSources: document.querySelector("#total-fontes"),
    modal: document.querySelector("#detalhes-modal"),
    modalTitle: document.querySelector("#detalhes-titulo"),
    modalType: document.querySelector("#detalhes-tipo"),
    modalContent: document.querySelector("#detalhes-conteudo"),
    closeModal: document.querySelector("#fechar-modal")
  };

  const normalize = (value) => String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();

  const uniqueSorted = (values) => [...new Set(values.filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  const formatDate = (value) => new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));

  const create = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const icon = (path) => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("viewBox", "0 0 24 24");
    const pathNode = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pathNode.setAttribute("d", path);
    svg.append(pathNode);
    return svg;
  };

  async function sha256(text) {
    if (!window.crypto?.subtle) throw new Error("O navegador não oferece verificação criptográfica da base.");
    const bytes = new TextEncoder().encode(text);
    const hash = await window.crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function validateManifest(manifest) {
    const required = ["schema_version", "environment", "generated_at", "catalog_url", "record_count", "source_count", "checksum_sha256", "authorization"];
    if (!manifest || required.some((key) => !(key in manifest))) throw new Error("Manifesto de dados incompleto.");
    if (manifest.schema_version !== "3.0.0") throw new Error("Versão do manifesto não suportada.");
    if (manifest.environment !== config.applicationMode) throw new Error("O ambiente do manifesto não corresponde à aplicação.");
    if (config.applicationMode === "demo" && manifest.authorization?.status !== "synthetic-demo") {
      throw new Error("A demonstração recusou uma base sem identificação sintética.");
    }
    if (config.applicationMode === "production") {
      if (manifest.authorization?.status !== "authorized" || !manifest.authorization?.reference) {
        throw new Error("A publicação de produção não possui autorização registrada.");
      }
      if (!String(manifest.catalog_url).startsWith("https://")) throw new Error("A base de produção deve usar HTTPS.");
    }
    if (!/^[a-f0-9]{64}$/.test(manifest.checksum_sha256)) throw new Error("Resumo criptográfico inválido.");
  }

  function validateCatalog(catalog, manifest) {
    if (!catalog || catalog.schema_version !== "3.0.0" || !Array.isArray(catalog.records) || !Array.isArray(catalog.sources)) {
      throw new Error("Catálogo incompatível com o contrato esperado.");
    }
    if (catalog.environment !== manifest.environment || catalog.authorization?.status !== manifest.authorization.status) {
      throw new Error("Catálogo e manifesto possuem ambientes ou autorizações diferentes.");
    }
    if (catalog.records.length !== manifest.record_count || catalog.record_count !== manifest.record_count) {
      throw new Error("A quantidade de registros não corresponde ao manifesto.");
    }
    if (catalog.sources.length !== manifest.source_count || catalog.notices?.synthetic_data !== true) {
      throw new Error("Fontes ou avisos obrigatórios estão ausentes.");
    }

    const sourceIds = new Set(catalog.sources.map((source) => source.id));
    const recordIds = new Set();
    for (const record of catalog.records) {
      if (!record.public_id || !record.display_name || !["professional", "facility"].includes(record.type)) {
        throw new Error("Há um registro obrigatório inválido.");
      }
      if (!sourceIds.has(record.source_id) || recordIds.has(record.public_id)) {
        throw new Error("Há uma fonte desconhecida ou identificador duplicado.");
      }
      if (!Array.isArray(record.network_links) || !record.network_links.length ||
          record.network_links.some((link) => !sourceIds.has(link.source_id) || link.verification_required !== true)) {
        throw new Error("Há um vínculo de rede inválido.");
      }
      recordIds.add(record.public_id);
    }
  }

  async function loadData() {
    try {
      const manifestUrl = new URL(config.manifestUrl, window.location.href);
      const manifestResponse = await fetch(manifestUrl, { cache: "no-store", credentials: "omit" });
      if (!manifestResponse.ok) throw new Error(`Manifesto indisponível (${manifestResponse.status}).`);
      const manifest = await manifestResponse.json();
      validateManifest(manifest);

      const catalogUrl = new URL(manifest.catalog_url, manifestUrl);
      const catalogResponse = await fetch(catalogUrl, { cache: "no-store", credentials: "omit" });
      if (!catalogResponse.ok) throw new Error(`Catálogo indisponível (${catalogResponse.status}).`);
      const catalogText = await catalogResponse.text();
      if (await sha256(catalogText) !== manifest.checksum_sha256) {
        throw new Error("A integridade do catálogo não pôde ser confirmada.");
      }

      const catalog = JSON.parse(catalogText);
      validateCatalog(catalog, manifest);
      state.catalog = catalog;
      state.records = catalog.records;
      loadInitialFilters();
      populateFilters();
      updateMetrics();
      updateDataStatus(manifest);
      applyFilters(false);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Erro desconhecido ao carregar a base.");
    }
  }

  function loadInitialFilters() {
    const params = new URLSearchParams(window.location.search);
    state.query = params.get("q") ?? "";
    state.specialty = params.get("especialidade") ?? "";
    state.stateCode = params.get("estado") ?? "";
    state.city = params.get("municipio") ?? "";
    state.type = params.get("tipo") ?? "";
    state.source = params.get("fonte") ?? "";
    state.relationship = params.get("vinculo") ?? "";
    state.sort = params.get("ordem") ?? "name";
    elements.query.value = state.query;
    elements.type.value = ["professional", "facility"].includes(state.type) ? state.type : "";
    elements.sort.value = ["name", "specialty", "location"].includes(state.sort) ? state.sort : "name";
  }

  function populateFilters() {
    const specialties = uniqueSorted(state.records.flatMap((record) => record.specialties.map((item) => item.name)));
    const states = uniqueSorted(state.records.flatMap((record) => record.service_locations.map((location) => location.address.state)));
    const sources = state.catalog.sources.map((source) => ({ value: source.id, label: source.name }));
    const relationships = uniqueSorted(state.records.flatMap((record) => record.network_links.map((link) => link.access_mode)));

    appendOptions(elements.specialty, specialties);
    appendOptions(elements.state, states);
    appendOptions(elements.source, sources);
    appendOptions(elements.relationship, relationships);

    if (specialties.includes(state.specialty)) elements.specialty.value = state.specialty;
    else state.specialty = "";
    if (states.includes(state.stateCode)) elements.state.value = state.stateCode;
    else state.stateCode = "";
    updateCityOptions(state.stateCode, state.city);
    if (sources.some((source) => source.value === state.source)) elements.source.value = state.source;
    else state.source = "";
    if (relationships.includes(state.relationship)) elements.relationship.value = state.relationship;
    else state.relationship = "";

    const common = ["Cardiologia", "Clínica médica", "Ginecologia", "Ortopedia", "Pediatria"]
      .filter((item) => specialties.includes(item));
    elements.quickSearch.replaceChildren(...common.map((specialty) => {
      const button = create("button", "chip", specialty);
      button.type = "button";
      button.dataset.specialty = specialty;
      button.setAttribute("aria-pressed", String(state.specialty === specialty));
      return button;
    }));
  }

  function appendOptions(select, values) {
    for (const item of values) {
      const option = create("option", "", typeof item === "string" ? item : item.label);
      option.value = typeof item === "string" ? item : item.value;
      select.append(option);
    }
  }

  function updateCityOptions(stateCode, selectedCity = "") {
    const firstOption = create("option", "", "Todos os municípios");
    firstOption.value = "";
    elements.city.replaceChildren(firstOption);
    const cities = uniqueSorted(state.records.flatMap((record) =>
      record.service_locations
        .filter((location) => !stateCode || location.address.state === stateCode)
        .map((location) => location.address.city)
    ));
    appendOptions(elements.city, cities);
    if (cities.includes(selectedCity)) elements.city.value = selectedCity;
    else state.city = "";
  }

  function sourceName(sourceId) {
    return state.catalog?.sources.find((source) => source.id === sourceId)?.name ?? "Fonte não identificada";
  }

  function updateMetrics() {
    const professionals = state.records.filter((record) => record.type === "professional").length;
    const states = uniqueSorted(state.records.flatMap((record) => record.service_locations.map((location) => location.address.state)));
    elements.totalRecords.textContent = state.records.length.toLocaleString("pt-BR");
    elements.totalProfessionals.textContent = professionals.toLocaleString("pt-BR");
    elements.totalFacilities.textContent = (state.records.length - professionals).toLocaleString("pt-BR");
    elements.totalStates.textContent = states.length.toLocaleString("pt-BR");
    elements.totalSources.textContent = state.catalog.sources.length.toLocaleString("pt-BR");
  }

  function updateDataStatus(manifest) {
    const sourceLabel = manifest.source_count === 1 ? "fonte" : "fontes";
    elements.dataStatus.textContent = `${manifest.record_count.toLocaleString("pt-BR")} registros • ${manifest.source_count} ${sourceLabel}`;
    elements.updatedStatus.textContent = `Atualizada em ${formatDate(manifest.generated_at)}`;
    const ageInDays = (Date.now() - new Date(manifest.generated_at).getTime()) / 86_400_000;
    if (ageInDays > config.staleAfterDays) elements.updatedStatus.textContent += " • revisão recomendada";
  }

  function recordSearchText(record) {
    return normalize([
      record.display_name,
      record.professional_registry?.council,
      record.professional_registry?.number,
      sourceName(record.source_id),
      ...record.specialties.map((item) => item.name),
      ...record.network_links.flatMap((link) => [link.relationship_label, link.access_mode, link.coverage_scope]),
      ...record.service_locations.flatMap((location) => [
        location.facility_name, location.address.street, location.address.district,
        location.address.city, location.address.state
      ])
    ].join(" "));
  }

  function applyFilters(resetPage = true) {
    state.query = elements.query.value.trim();
    state.specialty = elements.specialty.value;
    state.stateCode = elements.state.value;
    state.city = elements.city.value;
    state.type = elements.type.value;
    state.source = elements.source.value;
    state.relationship = elements.relationship.value;
    state.sort = elements.sort.value;
    if (resetPage) state.page = 1;

    const query = normalize(state.query);
    state.filtered = state.records.filter((record) => {
      const locations = record.service_locations;
      return (
        (!query || recordSearchText(record).includes(query)) &&
        (!state.specialty || record.specialties.some((item) => item.name === state.specialty)) &&
        (!state.stateCode || locations.some((location) => location.address.state === state.stateCode)) &&
        (!state.city || locations.some((location) => location.address.city === state.city)) &&
        (!state.type || record.type === state.type) &&
        (!state.source || record.source_id === state.source) &&
        (!state.relationship || record.network_links.some((link) => link.access_mode === state.relationship))
      );
    });
    state.filtered.sort(compareRecords);
    updateUrl();
    updateQuickSearchState();
    renderResults();
  }

  function compareRecords(a, b) {
    const value = (record) => state.sort === "specialty"
      ? record.specialties[0]?.name
      : state.sort === "location"
        ? `${record.service_locations[0]?.address.state} ${record.service_locations[0]?.address.city}`
        : record.display_name;
    return String(value(a) ?? "").localeCompare(String(value(b) ?? ""), "pt-BR");
  }

  function updateUrl() {
    const params = new URLSearchParams();
    if (state.query) params.set("q", state.query);
    if (state.specialty) params.set("especialidade", state.specialty);
    if (state.stateCode) params.set("estado", state.stateCode);
    if (state.city) params.set("municipio", state.city);
    if (state.type) params.set("tipo", state.type);
    if (state.source) params.set("fonte", state.source);
    if (state.relationship) params.set("vinculo", state.relationship);
    if (state.sort !== "name") params.set("ordem", state.sort);
    window.history.replaceState(null, "", params.toString() ? `?${params}` : window.location.pathname);
  }

  function updateQuickSearchState() {
    elements.quickSearch.querySelectorAll("button").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.specialty === state.specialty));
    });
  }

  function renderResults() {
    const pageCount = Math.max(1, Math.ceil(state.filtered.length / config.recordsPerPage));
    state.page = Math.min(state.page, pageCount);
    const start = (state.page - 1) * config.recordsPerPage;
    const pageRecords = state.filtered.slice(start, start + config.recordsPerPage);
    elements.list.replaceChildren(...pageRecords.map(createProviderCard));
    elements.list.setAttribute("aria-busy", "false");
    elements.empty.hidden = state.filtered.length !== 0;
    elements.list.hidden = state.filtered.length === 0;
    elements.pagination.hidden = state.filtered.length === 0;
    const plural = state.filtered.length === 1 ? "registro encontrado" : "registros encontrados";
    elements.resultSummary.textContent = `${state.filtered.length.toLocaleString("pt-BR")} ${plural} na base nacional demonstrativa.`;
    renderPagination(pageCount);
  }

  function initials(name) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  }

  function createProviderCard(record) {
    const article = create("article", "provider-card");
    const main = create("div", "provider-card__main");
    const identity = create("div", "provider-identity");
    const avatar = create("div", "provider-avatar", initials(record.display_name));
    avatar.setAttribute("aria-hidden", "true");
    const identityText = create("div");
    identityText.append(
      create("span", "provider-type", record.type === "professional" ? "Profissional" : "Estabelecimento"),
      create("h3", "", record.display_name)
    );
    const registry = registryText(record);
    if (registry) identityText.append(create("p", "registry", registry));
    identity.append(avatar, identityText);

    const localities = uniqueSorted(record.service_locations.map((location) => `${location.address.city}/${location.address.state}`));
    const meta = create("div", "provider-meta");
    meta.append(
      createMetaBlock("Especialidade", record.specialties.map((item) => item.name).join(" • ")),
      createMetaBlock("Localidade", localities.join(" • "))
    );

    const primaryLink = record.network_links[0];
    const action = create("div", "provider-card__action");
    action.append(
      create("span", "network-status", sourceName(record.source_id)),
      create("span", "access-status", primaryLink.relationship_label)
    );
    const detailsButton = create("button", "details-button", "Ver detalhes");
    detailsButton.type = "button";
    detailsButton.dataset.recordId = record.public_id;
    detailsButton.setAttribute("aria-label", `Ver detalhes de ${record.display_name}`);
    action.append(detailsButton);

    const footer = create("div", "provider-card__footer");
    const primaryLocation = record.service_locations[0];
    footer.append(
      labeledIcon("M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z", formatAddress(primaryLocation.address)),
      labeledIcon("M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-14v4m0 4h.01", "Confirme elegibilidade e disponibilidade")
    );
    main.append(identity, meta, action);
    article.append(main, footer);
    return article;
  }

  function registryText(record) {
    const registry = record.professional_registry;
    return registry ? `${registry.council}-${registry.state} ${registry.number}` : "";
  }

  function createMetaBlock(label, value) {
    const block = create("div", "meta-block");
    block.append(create("span", "", label), create("p", "", value || "Não informado"));
    return block;
  }

  function labeledIcon(path, label) {
    const wrapper = create("span");
    wrapper.append(icon(path), document.createTextNode(label));
    return wrapper;
  }

  function formatAddress(address) {
    return [address.street, address.district, address.city, address.state].filter(Boolean).join(" • ");
  }

  function renderPagination(pageCount) {
    elements.pagination.replaceChildren();
    if (pageCount <= 1) return;
    const addButton = (label, page, disabled = false, current = false) => {
      const button = create("button", "page-button", label);
      button.type = "button";
      button.dataset.page = String(page);
      button.disabled = disabled;
      if (current) button.setAttribute("aria-current", "page");
      elements.pagination.append(button);
    };
    addButton("Anterior", state.page - 1, state.page === 1);
    const pages = uniqueSorted([1, state.page - 2, state.page - 1, state.page, state.page + 1, state.page + 2, pageCount]
      .filter((page) => page >= 1 && page <= pageCount).map(String)).map(Number).sort((a, b) => a - b);
    let previous = 0;
    for (const page of pages) {
      if (page - previous > 1) elements.pagination.append(create("span", "pagination__ellipsis", "…"));
      addButton(String(page), page, false, page === state.page);
      previous = page;
    }
    addButton("Próxima", state.page + 1, state.page === pageCount);
  }

  function showDetails(recordId) {
    const record = state.records.find((item) => item.public_id === recordId);
    if (!record) return;
    elements.modalType.textContent = record.type === "professional" ? "Profissional" : "Estabelecimento";
    elements.modalTitle.textContent = record.display_name;
    elements.modalContent.replaceChildren();

    const overview = create("section", "details-section");
    overview.append(create("h3", "", "Informações do prestador"));
    const registry = registryText(record);
    if (registry) overview.append(create("p", "", registry));
    overview.append(create("p", "", `Especialidades: ${record.specialties.map((item) => item.name).join(" • ")}`));
    elements.modalContent.append(overview);

    const network = create("section", "details-section");
    network.append(create("h3", "", "Origem e forma de acesso"));
    for (const link of record.network_links) {
      network.append(
        create("p", "", `Origem: ${sourceName(link.source_id)}`),
        create("p", "", `Vínculo: ${link.relationship_label} • ${link.access_mode}`),
        create("p", "", `Abrangência: ${link.coverage_scope === "national" ? "Nacional" : "Regional"}`)
      );
    }
    network.append(create("p", "", `Informação atualizada em ${formatDate(record.source_updated_at)}.`));
    elements.modalContent.append(network);

    const locations = create("section", "details-section");
    locations.append(create("h3", "", record.service_locations.length === 1 ? "Local de atendimento" : "Locais de atendimento"));
    for (const location of record.service_locations) {
      const card = create("div", "location-card");
      card.append(
        create("strong", "", location.facility_name || record.display_name),
        create("p", "", formatAddress(location.address)),
        create("p", "", location.phones.length ? location.phones.join(" • ") : "Telefone não informado")
      );
      locations.append(card);
    }
    elements.modalContent.append(locations);

    const notice = create("section", "details-section");
    notice.append(
      create("h3", "", "Confirmação necessária"),
      create("p", "", record.network_links[0].availability_notice),
      create("p", "", "Registro inteiramente sintético. Esta demonstração não representa a rede oficial nem garantia de cobertura.")
    );
    elements.modalContent.append(notice);
    elements.modal.showModal();
  }

  function clearFilters() {
    elements.form.reset();
    elements.sort.value = "name";
    state.page = 1;
    updateCityOptions("");
    applyFilters();
  }

  function showError(message) {
    elements.error.hidden = false;
    elements.errorMessage.textContent = message;
    elements.list.setAttribute("aria-busy", "false");
    elements.list.replaceChildren();
    elements.resultSummary.textContent = "A base não foi disponibilizada.";
    elements.dataStatus.textContent = "Falha na verificação";
    elements.updatedStatus.textContent = "Nenhum dado foi exibido";
  }

  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    applyFilters();
    elements.resultTitle.focus({ preventScroll: true });
    elements.resultTitle.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  elements.state.addEventListener("change", () => updateCityOptions(elements.state.value));
  elements.sort.addEventListener("change", () => applyFilters(false));
  elements.clear.addEventListener("click", clearFilters);
  elements.clearEmpty.addEventListener("click", clearFilters);
  elements.quickSearch.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-specialty]");
    if (!button) return;
    elements.specialty.value = elements.specialty.value === button.dataset.specialty ? "" : button.dataset.specialty;
    applyFilters();
  });
  elements.list.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-record-id]");
    if (button) showDetails(button.dataset.recordId);
  });
  elements.pagination.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-page]");
    if (!button || button.disabled) return;
    state.page = Number(button.dataset.page);
    renderResults();
    elements.resultTitle.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  elements.closeModal.addEventListener("click", () => elements.modal.close());
  elements.modal.addEventListener("click", (event) => {
    if (event.target === elements.modal) elements.modal.close();
  });

  loadData();
})();
