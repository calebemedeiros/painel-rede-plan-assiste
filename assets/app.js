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
    region: "",
    type: "",
    sort: "name"
  };

  const elements = {
    form: document.querySelector("#form-busca"),
    query: document.querySelector("#consulta"),
    specialty: document.querySelector("#especialidade"),
    region: document.querySelector("#regiao"),
    type: document.querySelector("#tipo"),
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
    totalSpecialties: document.querySelector("#total-especialidades"),
    totalRegions: document.querySelector("#total-regioes"),
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
    if (!window.crypto?.subtle) {
      throw new Error("O navegador não oferece verificação criptográfica da base.");
    }
    const bytes = new TextEncoder().encode(text);
    const hash = await window.crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function validateManifest(manifest) {
    const required = ["schema_version", "environment", "generated_at", "catalog_url", "record_count", "checksum_sha256", "authorization"];
    if (!manifest || required.some((key) => !(key in manifest))) {
      throw new Error("Manifesto de dados incompleto.");
    }
    if (manifest.schema_version !== "1.0.0") {
      throw new Error("Versão do manifesto não suportada.");
    }
    if (manifest.environment !== config.applicationMode) {
      throw new Error("O ambiente do manifesto não corresponde ao ambiente da aplicação.");
    }
    if (config.applicationMode === "demo" && manifest.authorization?.status !== "synthetic-demo") {
      throw new Error("A demonstração recusou uma base sem identificação sintética.");
    }
    if (config.applicationMode === "production") {
      if (manifest.authorization?.status !== "authorized" || !manifest.authorization?.reference) {
        throw new Error("A publicação de produção não possui autorização registrada.");
      }
      if (!String(manifest.catalog_url).startsWith("https://")) {
        throw new Error("A base de produção deve ser obtida por HTTPS.");
      }
    }
    if (!/^[a-f0-9]{64}$/.test(manifest.checksum_sha256)) {
      throw new Error("Resumo criptográfico do catálogo inválido.");
    }
  }

  function validateCatalog(catalog, manifest) {
    if (!catalog || catalog.schema_version !== "1.0.0" || !Array.isArray(catalog.records)) {
      throw new Error("Catálogo incompatível com o contrato esperado.");
    }
    if (catalog.environment !== manifest.environment) {
      throw new Error("O ambiente do catálogo não corresponde ao manifesto.");
    }
    if (catalog.authorization?.status !== manifest.authorization.status) {
      throw new Error("A autorização do catálogo não corresponde ao manifesto.");
    }
    if (catalog.records.length !== manifest.record_count || catalog.record_count !== manifest.record_count) {
      throw new Error("A quantidade de registros não corresponde ao manifesto.");
    }

    const identifiers = new Set();
    for (const record of catalog.records) {
      if (!record.public_id || !record.display_name || !["professional", "facility"].includes(record.type)) {
        throw new Error("Há um registro obrigatório inválido no catálogo.");
      }
      if (identifiers.has(record.public_id)) {
        throw new Error("Há identificadores públicos duplicados no catálogo.");
      }
      identifiers.add(record.public_id);
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
      const calculatedChecksum = await sha256(catalogText);
      if (calculatedChecksum !== manifest.checksum_sha256) {
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
    state.region = params.get("regiao") ?? "";
    state.type = params.get("tipo") ?? "";
    state.sort = params.get("ordem") ?? "name";

    elements.query.value = state.query;
    elements.type.value = ["professional", "facility"].includes(state.type) ? state.type : "";
    elements.sort.value = ["name", "specialty", "region"].includes(state.sort) ? state.sort : "name";
  }

  function populateFilters() {
    const specialties = uniqueSorted(state.records.flatMap((record) => record.specialties.map((item) => item.name)));
    const regions = uniqueSorted(state.records.flatMap((record) => record.service_locations.map((location) => location.address.district)));

    appendOptions(elements.specialty, specialties);
    appendOptions(elements.region, regions);

    if (specialties.includes(state.specialty)) elements.specialty.value = state.specialty;
    else state.specialty = "";

    if (regions.includes(state.region)) elements.region.value = state.region;
    else state.region = "";

    const commonSpecialties = ["Cardiologia", "Clínica médica", "Ginecologia", "Ortopedia", "Pediatria"]
      .filter((item) => specialties.includes(item));

    elements.quickSearch.replaceChildren(...commonSpecialties.map((specialty) => {
      const button = create("button", "chip", specialty);
      button.type = "button";
      button.dataset.specialty = specialty;
      button.setAttribute("aria-pressed", String(state.specialty === specialty));
      return button;
    }));
  }

  function appendOptions(select, values) {
    for (const value of values) {
      const option = create("option", "", value);
      option.value = value;
      select.append(option);
    }
  }

  function updateMetrics() {
    const professionals = state.records.filter((record) => record.type === "professional").length;
    const facilities = state.records.length - professionals;
    const specialties = uniqueSorted(state.records.flatMap((record) => record.specialties.map((item) => item.name))).length;
    const regions = uniqueSorted(state.records.flatMap((record) => record.service_locations.map((location) => location.address.district))).length;

    elements.totalRecords.textContent = state.records.length.toLocaleString("pt-BR");
    elements.totalProfessionals.textContent = professionals.toLocaleString("pt-BR");
    elements.totalFacilities.textContent = facilities.toLocaleString("pt-BR");
    elements.totalSpecialties.textContent = specialties.toLocaleString("pt-BR");
    elements.totalRegions.textContent = regions.toLocaleString("pt-BR");
  }

  function updateDataStatus(manifest) {
    elements.dataStatus.textContent = `${manifest.record_count} registros sintéticos`;
    elements.updatedStatus.textContent = `Atualizada em ${formatDate(manifest.generated_at)}`;

    const ageInDays = (Date.now() - new Date(manifest.generated_at).getTime()) / 86_400_000;
    if (ageInDays > config.staleAfterDays) {
      elements.updatedStatus.textContent += " • revisão recomendada";
    }
  }

  function recordSearchText(record) {
    return normalize([
      record.display_name,
      record.professional_registry?.council,
      record.professional_registry?.number,
      ...record.specialties.map((item) => item.name),
      ...record.service_locations.flatMap((location) => [
        location.facility_name,
        location.address.street,
        location.address.district,
        location.address.city,
        location.address.state
      ])
    ].join(" "));
  }

  function applyFilters(resetPage = true) {
    state.query = elements.query.value.trim();
    state.specialty = elements.specialty.value;
    state.region = elements.region.value;
    state.type = elements.type.value;
    state.sort = elements.sort.value;
    if (resetPage) state.page = 1;

    const query = normalize(state.query);
    state.filtered = state.records.filter((record) => {
      const matchesQuery = !query || recordSearchText(record).includes(query);
      const matchesSpecialty = !state.specialty || record.specialties.some((item) => item.name === state.specialty);
      const matchesRegion = !state.region || record.service_locations.some((location) => location.address.district === state.region);
      const matchesType = !state.type || record.type === state.type;
      return matchesQuery && matchesSpecialty && matchesRegion && matchesType;
    });

    state.filtered.sort(compareRecords);
    updateUrl();
    updateQuickSearchState();
    renderResults();
  }

  function compareRecords(a, b) {
    const firstValue = state.sort === "specialty"
      ? a.specialties[0]?.name
      : state.sort === "region"
        ? a.service_locations[0]?.address.district
        : a.display_name;
    const secondValue = state.sort === "specialty"
      ? b.specialties[0]?.name
      : state.sort === "region"
        ? b.service_locations[0]?.address.district
        : b.display_name;
    return String(firstValue ?? "").localeCompare(String(secondValue ?? ""), "pt-BR");
  }

  function updateUrl() {
    const params = new URLSearchParams();
    if (state.query) params.set("q", state.query);
    if (state.specialty) params.set("especialidade", state.specialty);
    if (state.region) params.set("regiao", state.region);
    if (state.type) params.set("tipo", state.type);
    if (state.sort !== "name") params.set("ordem", state.sort);
    const suffix = params.toString() ? `?${params}` : window.location.pathname;
    window.history.replaceState(null, "", suffix);
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
    elements.resultSummary.textContent = `${state.filtered.length.toLocaleString("pt-BR")} ${plural} na base demonstrativa.`;
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

    const meta = create("div", "provider-meta");
    meta.append(
      createMetaBlock("Especialidade", record.specialties.map((item) => item.name).join(" • ")),
      createMetaBlock("Região", uniqueSorted(record.service_locations.map((location) => location.address.district)).join(" • "))
    );

    const action = create("div", "provider-card__action");
    action.append(create("span", "network-status", "Rede demonstrativa"));
    const detailsButton = create("button", "details-button", "Ver detalhes");
    detailsButton.type = "button";
    detailsButton.dataset.recordId = record.public_id;
    detailsButton.setAttribute("aria-label", `Ver detalhes de ${record.display_name}`);
    action.append(detailsButton);

    const footer = create("div", "provider-card__footer");
    const primaryLocation = record.service_locations[0];
    footer.append(
      labeledIcon("M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z", formatAddress(primaryLocation.address)),
      labeledIcon("M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92Z", primaryLocation.phones[0] ?? "Telefone não informado")
    );

    main.append(identity, meta, action);
    article.append(main, footer);
    return article;
  }

  function registryText(record) {
    const registry = record.professional_registry;
    if (!registry) return "";
    return `${registry.council}-${registry.state} ${registry.number}`;
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

    const previous = create("button", "page-button", "Anterior");
    previous.type = "button";
    previous.disabled = state.page === 1;
    previous.dataset.page = String(state.page - 1);
    elements.pagination.append(previous);

    for (let page = 1; page <= pageCount; page += 1) {
      const button = create("button", "page-button", String(page));
      button.type = "button";
      button.dataset.page = String(page);
      button.setAttribute("aria-label", `Ir para a página ${page}`);
      if (page === state.page) button.setAttribute("aria-current", "page");
      elements.pagination.append(button);
    }

    const next = create("button", "page-button", "Próxima");
    next.type = "button";
    next.disabled = state.page === pageCount;
    next.dataset.page = String(state.page + 1);
    elements.pagination.append(next);
  }

  function showDetails(recordId) {
    const record = state.records.find((item) => item.public_id === recordId);
    if (!record) return;

    elements.modalType.textContent = record.type === "professional" ? "Profissional" : "Estabelecimento";
    elements.modalTitle.textContent = record.display_name;
    elements.modalContent.replaceChildren();

    const overview = create("section", "details-section");
    overview.append(create("h3", "", "Informações profissionais"));
    const registry = registryText(record);
    if (registry) overview.append(create("p", "", registry));
    for (const specialty of record.specialties) {
      const rqe = specialty.rqe ? ` • RQE ${specialty.rqe}` : " • RQE não informado";
      overview.append(create("p", "", `${specialty.name}${record.type === "professional" ? rqe : ""}`));
    }
    elements.modalContent.append(overview);

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
      create("h3", "", "Orientação"),
      create("p", "", "Registro sintético utilizado apenas para validar a interface. Em uma base autorizada, confirme agenda, vínculo e condições de atendimento diretamente com o prestador ou pelos canais oficiais.")
    );
    elements.modalContent.append(notice);
    elements.modal.showModal();
  }

  function clearFilters() {
    elements.form.reset();
    elements.sort.value = "name";
    state.page = 1;
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
