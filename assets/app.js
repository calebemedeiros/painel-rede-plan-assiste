(() => {
  "use strict";
  const config = window.APP_CONFIG;
  const state = { records: [], procedures: [], specialties: [], networks: [], sources: [], filtered: [], page: 1, procedureMatches: [] };
  const $ = (selector) => document.querySelector(selector);
  const el = {
    form: $("#form-busca"), query: $("#consulta"), suggestions: $("#sugestoes-busca"), specialty: $("#especialidade"), state: $("#estado"), city: $("#municipio"), type: $("#tipo"), network: $("#fonte"), relationship: $("#vinculo"), modality: $("#modalidade"), prefix: $("#prefixo"), sort: $("#ordenacao"), clear: $("#limpar-busca"), clearEmpty: $("#limpar-vazio"), quick: $("#atalhos-especialidades"), list: $("#lista-resultados"), pagination: $("#paginacao"), empty: $("#sem-resultados"), summary: $("#resumo-resultados"), title: $("#titulo-resultados"), error: $("#aviso-erro"), errorMessage: $("#mensagem-erro"), status: $("#status-base"), updated: $("#status-atualizacao"), procedureContext: $("#contexto-procedimento"), total: $("#total-registros"), professionals: $("#total-profissionais"), facilities: $("#total-estabelecimentos"), states: $("#total-estados"), sourceCount: $("#total-fontes"), modal: $("#detalhes-modal"), modalTitle: $("#detalhes-titulo"), modalType: $("#detalhes-tipo"), modalContent: $("#detalhes-conteudo"), closeModal: $("#fechar-modal"), concludeModal: $("#concluir-modal")
  };
  let modalTrigger = null;
  const normalize = (value) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
  const unique = (values) => [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), "pt-BR"));
  const create = (tag, className, value) => { const node = document.createElement(tag); if (className) node.className = className; if (value !== undefined) node.textContent = value; return node; };
  const formatDate = (value) => new Intl.DateTimeFormat("pt-BR").format(new Date(value));
  const networkById = (id) => state.networks.find((item) => item.network_id === id);
  const sourceById = (id) => state.sources.find((item) => item.source_id === id);
  const specialtyById = (id) => state.specialties.find((item) => item.specialty_id === id);

  async function sha256(value) {
    if (!crypto?.subtle) throw new Error("Este navegador não permite verificar a integridade da base.");
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
    return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  async function fetchVerified(resource, baseUrl) {
    const url = new URL(resource.url, baseUrl);
    const response = await fetch(url, { cache: "no-store", credentials: "omit" });
    if (!response.ok) throw new Error(`Recurso indisponível (${response.status}).`);
    const payload = await response.text();
    if (resource.checksum_sha256 && await sha256(payload) !== resource.checksum_sha256) throw new Error("A integridade de um recurso não pôde ser confirmada.");
    return { data: JSON.parse(payload), url };
  }
  function validateManifest(manifest) {
    if (manifest?.schema_version !== "4.0.0" || manifest.environment !== "production") throw new Error("Contrato de dados incompatível.");
    if (manifest.publication_status !== "approved" || manifest.authorization?.status !== "authorized") throw new Error("A versão disponível não está aprovada para publicação.");
    for (const name of ["providers", "procedures", "networks", "specialties", "sources"]) {
      if (!manifest.resources?.[name]?.url || !/^[a-f0-9]{64}$/.test(manifest.resources[name].checksum_sha256)) throw new Error(`Recurso obrigatório inválido: ${name}.`);
    }
  }
  async function loadData() {
    try {
      const manifestUrl = new URL(config.manifestUrl, location.href);
      const response = await fetch(manifestUrl, { cache: "no-store", credentials: "omit" });
      if (!response.ok) throw new Error(`Manifesto indisponível (${response.status}).`);
      const manifest = await response.json(); validateManifest(manifest);
      const [providerIndex, procedures, networks, specialties, sources] = await Promise.all([
        fetchVerified(manifest.resources.providers, manifestUrl), fetchVerified(manifest.resources.procedures, manifestUrl), fetchVerified(manifest.resources.networks, manifestUrl), fetchVerified(manifest.resources.specialties, manifestUrl), fetchVerified(manifest.resources.sources, manifestUrl)
      ]);
      const shards = await Promise.all(providerIndex.data.shards.map((shard) => fetchVerified(shard, providerIndex.url)));
      state.records = shards.flatMap((item) => item.data.records);
      if (state.records.length !== providerIndex.data.record_count) throw new Error("A contagem dos prestadores não corresponde ao índice.");
      state.procedures = procedures.data.records; state.networks = networks.data.records; state.specialties = specialties.data.records; state.sources = sources.data.records;
      loadUrl(); populateFilters(); updateMetrics(manifest); applyFilters(false);
    } catch (error) { showError(error instanceof Error ? error.message : "Falha ao carregar a base."); }
  }
  function addOptions(select, values) { for (const item of values) { const option = create("option", "", typeof item === "string" ? item : item.label); option.value = typeof item === "string" ? item : item.value; select.append(option); } }
  function populateFilters() {
    addOptions(el.specialty, state.specialties.map((item) => ({ value: item.specialty_id, label: item.name })));
    addOptions(el.state, unique(state.records.flatMap((record) => record.service_locations.map((loc) => loc.address.state))));
    addOptions(el.network, state.networks.map((item) => ({ value: item.network_id, label: item.name })));
    addOptions(el.relationship, [{ value: "direct_agreement", label: "Credenciamento direto" }, { value: "indirect_agreement", label: "Rede conveniada / intercâmbio" }]);
    addOptions(el.prefix, state.networks.filter((item) => item.card_prefix).map((item) => ({ value: item.card_prefix, label: `${item.card_prefix} — ${item.name}` })));
    const procedures = state.procedures.slice(0, 1500).map((item) => { const option = document.createElement("option"); option.value = `${item.code} — ${item.name}`; return option; });
    const specialties = state.specialties.map((item) => { const option = document.createElement("option"); option.value = item.name; return option; });
    el.suggestions.replaceChildren(...procedures, ...specialties); restoreSelectValues(); updateCities(el.state.value, new URLSearchParams(location.search).get("municipio") || "");
    const common = ["cardiologia", "clinica-medica", "ginecologia-e-obstetricia", "ortopedia-e-traumatologia", "pediatria"];
    el.quick.replaceChildren(...common.map((id) => { const item = specialtyById(id); if (!item) return null; const button = create("button", "chip", item.name); button.type = "button"; button.dataset.specialty = id; return button; }).filter(Boolean));
  }
  function loadUrl() {
    const params = new URLSearchParams(location.search); el.query.value = params.get("q") || ""; el.specialty.dataset.initial = params.get("especialidade") || ""; el.state.dataset.initial = params.get("estado") || ""; el.type.value = params.get("tipo") || ""; el.network.dataset.initial = params.get("rede") || ""; el.relationship.dataset.initial = params.get("vinculo") || ""; el.modality.value = params.get("modalidade") || ""; el.prefix.dataset.initial = params.get("prefixo") || ""; el.sort.value = params.get("ordem") || "name";
  }
  function restoreSelectValues() { for (const select of [el.specialty, el.state, el.network, el.relationship, el.prefix]) if ([...select.options].some((option) => option.value === select.dataset.initial)) select.value = select.dataset.initial; }
  function updateCities(stateCode, selected = "") { const first = create("option", "", "Todos os municípios"); first.value = ""; el.city.replaceChildren(first); const cities = unique(state.records.flatMap((record) => record.service_locations.filter((loc) => !stateCode || loc.address.state === stateCode).map((loc) => loc.address.city))); addOptions(el.city, cities); if (cities.includes(selected)) el.city.value = selected; }
  function updateMetrics(manifest) {
    const professionals = state.records.filter((item) => item.type === "professional").length; const states = unique(state.records.flatMap((item) => item.service_locations.map((loc) => loc.address.state)));
    el.total.textContent = state.records.length.toLocaleString("pt-BR"); el.professionals.textContent = professionals.toLocaleString("pt-BR"); el.facilities.textContent = (state.records.length - professionals).toLocaleString("pt-BR"); el.states.textContent = states.length.toLocaleString("pt-BR"); el.sourceCount.textContent = state.sources.length.toLocaleString("pt-BR"); el.status.textContent = `${state.records.length.toLocaleString("pt-BR")} prestadores • ${state.networks.length} redes`;
    const age = (Date.now() - new Date(manifest.generated_at).getTime()) / 86400000; el.updated.textContent = `Atualizada em ${formatDate(manifest.generated_at)}${age > config.staleAfterDays ? " • atualização atrasada" : " • fonte atualizada"}`;
  }
  function findProcedures(query) {
    const cleaned = normalize(query).replace(/^tuss\s*/, ""); if (cleaned.length < 3) return [];
    const exactCode = cleaned.match(/^\d{8,10}/)?.[0]; const term = cleaned.replace(/^\d+\s*[-—]?\s*/, "");
    return state.procedures.filter((item) => item.code === exactCode || (term.length >= 3 && normalize(item.name).includes(term))).sort((a, b) => Number(b.code === exactCode) - Number(a.code === exactCode)).slice(0, 25);
  }
  function recordText(record) { return normalize([record.display_name, record.professional_registry?.council, record.professional_registry?.number, ...record.specialties.map((item) => item.name), ...record.service_locations.flatMap((loc) => [loc.facility_name, loc.address.street, loc.address.district, loc.address.city, loc.address.state]), ...record.network_links.flatMap((link) => [networkById(link.network_id)?.name, link.relationship])].join(" ")); }
  function applyFilters(resetPage = true) {
    if (resetPage) state.page = 1; const query = el.query.value.trim(); state.procedureMatches = findProcedures(query);
    const procedureSpecialties = new Set(state.procedureMatches.flatMap((item) => item.related_specialty_ids));
    const procedureMode = state.procedureMatches.length > 0 && (/\d{8}/.test(query) || !state.records.some((record) => recordText(record).includes(normalize(query))));
    const selectedNetwork = el.prefix.value ? state.networks.find((item) => item.card_prefix === el.prefix.value)?.network_id : el.network.value;
    state.filtered = state.records.filter((record) => { const locations = record.service_locations; const directMatch = !query || recordText(record).includes(normalize(query)); const procedureMatch = procedureMode && record.specialty_ids.some((id) => procedureSpecialties.has(id)); return (directMatch || procedureMatch) && (!el.specialty.value || record.specialty_ids.includes(el.specialty.value)) && (!el.state.value || locations.some((loc) => loc.address.state === el.state.value)) && (!el.city.value || locations.some((loc) => loc.address.city === el.city.value)) && (!el.type.value || record.type === el.type.value) && (!selectedNetwork || record.network_links.some((link) => link.network_id === selectedNetwork)) && (!el.relationship.value || record.network_links.some((link) => link.relationship === el.relationship.value)) && (!el.modality.value || locations.some((loc) => loc.modality === el.modality.value)); });
    state.filtered.sort(compareRecords); updateUrl(); renderProcedureContext(procedureMode); renderResults();
  }
  function compareRecords(a, b) { const value = (record) => el.sort.value === "specialty" ? record.specialties[0]?.name : el.sort.value === "location" ? `${record.service_locations[0]?.address.state || ""} ${record.service_locations[0]?.address.city || ""}` : record.display_name; return String(value(a) || "").localeCompare(String(value(b) || ""), "pt-BR"); }
  function renderProcedureContext(active) {
    if (!active || !state.procedureMatches.length) { el.procedureContext.hidden = true; el.procedureContext.replaceChildren(); return; }
    const primary = state.procedureMatches[0]; const title = create("strong", "", "Prestadores de especialidades relacionadas ao procedimento"); const description = create("p", "", `${primary.code} — ${primary.name}`); const specialties = create("p", "", primary.related_specialty_ids.length ? `Especialidades relacionadas: ${primary.related_specialty_ids.map((id) => specialtyById(id)?.name || id).join(", ")}.` : "Não há associação oficial suficiente para indicar especialidades."); const note = create("small", "", "A relação não confirma execução, cobertura, autorização ou disponibilidade. Confirme com o prestador e o Plan-Assiste."); el.procedureContext.replaceChildren(title, description, specialties, note); el.procedureContext.hidden = false;
  }
  function updateUrl() { const params = new URLSearchParams(); const fields = [["q",el.query.value],["especialidade",el.specialty.value],["estado",el.state.value],["municipio",el.city.value],["tipo",el.type.value],["rede",el.network.value],["vinculo",el.relationship.value],["modalidade",el.modality.value],["prefixo",el.prefix.value],["ordem",el.sort.value === "name" ? "" : el.sort.value]]; for (const [key, value] of fields) if (value) params.set(key, value); history.replaceState(null, "", params.size ? `?${params}` : location.pathname); }
  function renderResults() {
    const pages = Math.max(1, Math.ceil(state.filtered.length / config.recordsPerPage)); state.page = Math.min(state.page, pages); const start = (state.page - 1) * config.recordsPerPage;
    el.list.replaceChildren(...state.filtered.slice(start, start + config.recordsPerPage).map(providerCard)); el.list.hidden = !state.filtered.length; el.empty.hidden = Boolean(state.filtered.length); el.pagination.hidden = !state.filtered.length;
    el.summary.textContent = `${state.filtered.length.toLocaleString("pt-BR")} ${state.filtered.length === 1 ? "resultado" : "resultados"} na base publicada.`;
    if (!state.filtered.length) {
      const networkId = el.prefix.value ? state.networks.find((item) => item.card_prefix === el.prefix.value)?.network_id : el.network.value;
      const network = networkById(networkId);
      if (network?.guide_url) {
        const icon = create("div", "empty-state__icon", "↗"), title = create("h3", "", `${network.name}: consulta no guia oficial`), message = create("p", "", "Esta rede está vinculada ao Plan-Assiste, mas sua lista completa não está incorporada ao catálogo. Use o canal oficial para consultar prestadores."), link = create("a", "secondary-button", "Consultar guia oficial");
        link.href = network.guide_url; link.target = "_blank"; link.rel = "noopener noreferrer"; el.empty.replaceChildren(icon, title, message, link);
      } else {
        const icon = create("div", "empty-state__icon", "⌕"), title = create("h3", "", "Nenhum resultado encontrado"), message = create("p", "", "Revise os termos ou remova algum filtro para ampliar a consulta."), button = create("button", "secondary-button", "Mostrar todos");
        button.type = "button"; button.addEventListener("click", clearFilters); el.empty.replaceChildren(icon, title, message, button);
      }
    }
    renderPagination(pages); el.list.setAttribute("aria-busy", "false");
  }
  function providerCard(record) {
    const article = create("article", "provider-card"), main = create("div", "provider-card__main"), identity = create("div", "provider-identity"); const avatar = create("div", "provider-avatar", record.display_name.split(/\s+/).slice(0,2).map((part) => part[0]).join("").toUpperCase()); avatar.setAttribute("aria-hidden", "true"); const identityText = create("div"); identityText.append(create("span", "provider-type", record.type === "professional" ? "Profissional" : "Estabelecimento"), create("h3", "", record.display_name)); const registry = record.professional_registry; if (registry) identityText.append(create("p", "registry", [registry.council, registry.number, registry.state].filter(Boolean).join(" "))); identity.append(avatar, identityText);
    const meta = create("div", "provider-meta"), specialty = create("div", "meta-block"), local = create("div", "meta-block"); specialty.append(create("span", "", "Especialidade"), create("strong", "", record.specialties.map((item) => item.name).join(" • ") || "Não informada")); local.append(create("span", "", "Localidade"), create("strong", "", unique(record.service_locations.map((loc) => [loc.address.city, loc.address.state].filter(Boolean).join("/"))).join(" • ") || "Atendimento remoto")); meta.append(specialty, local); main.append(identity, meta);
    const action = create("div", "provider-card__action"), network = networkById(record.network_links[0]?.network_id); action.append(create("span", "network-status", network?.name || "Rede informada"), create("span", "access-status", record.service_locations.some((loc) => loc.modality === "remote") ? "Atendimento remoto" : "Atendimento presencial")); const button = create("button", "details-button", "Ver detalhes"); button.type = "button"; button.dataset.recordId = record.public_id; action.append(button); article.append(main, action); return article;
  }
  function renderPagination(pageCount) { const nodes = [], make = (label, page, disabled=false, current=false) => { const item=create("button","",label); item.type="button"; item.dataset.page=page; item.disabled=disabled; if(current)item.setAttribute("aria-current","page"); return item; }; nodes.push(make("Anterior",state.page-1,state.page===1)); for(let page=Math.max(1,state.page-2);page<=Math.min(pageCount,state.page+2);page++)nodes.push(make(String(page),page,false,page===state.page)); nodes.push(make("Próxima",state.page+1,state.page===pageCount)); el.pagination.replaceChildren(...nodes); }
  function showDetails(id) {
    const record = state.records.find((item) => item.public_id === id); if (!record) return; modalTrigger = document.activeElement; el.modalType.textContent = record.type === "professional" ? "Profissional" : "Estabelecimento"; el.modalTitle.textContent = record.display_name; const content = document.createDocumentFragment(); const add = (title,value) => { if(!value)return; const section=create("section","details-section"); section.append(create("h3","",title),create("p","",value)); content.append(section); }; add("Especialidades",record.specialties.map((item)=>`${item.name}${item.rqe?` (RQE ${item.rqe})`:""}`).join(" • ")); const locations=record.service_locations.slice(0,3).map((loc)=>[loc.facility_name,loc.address.street,loc.address.district,loc.address.city,loc.address.state,...loc.phones].filter(Boolean).join(" • ")||"Remoto"); if(record.service_locations.length>3)locations.push(`Mais ${record.service_locations.length-3} local(is) na fonte oficial`); add("Atendimento",locations.join("\n")); const network=networkById(record.network_links[0]?.network_id), source=sourceById(record.source_id); add("Rede e vínculo",`${network?.name||"Rede informada"} • ${record.network_links[0]?.relationship==="direct_agreement"?"Credenciamento direto":"Rede conveniada"}`); add("Fonte",`${source?.name||record.source_id} • verificada em ${formatDate(record.verified_at)}`); const link=record.network_links[0]?.guide_url||network?.guide_url; if(link){const anchor=create("a","official-link","Confirmar no guia oficial ↗");anchor.href=link;anchor.target="_blank";anchor.rel="noopener noreferrer";content.append(anchor);} el.modalContent.replaceChildren(content); document.body.classList.add("modal-open"); el.modal.showModal(); el.closeModal.focus();
  }
  function clearFilters(){el.form.reset();el.sort.value="name";updateCities("");applyFilters();}
  function showError(message){el.error.hidden=false;el.errorMessage.textContent=message;el.list.setAttribute("aria-busy","false");el.summary.textContent="A última versão aprovada não pôde ser carregada.";el.status.textContent="Fonte temporariamente indisponível";el.updated.textContent="Nenhum dado foi exibido";}
  el.form.addEventListener("submit",(event)=>{event.preventDefault();applyFilters();el.title.focus({preventScroll:true});el.title.scrollIntoView({behavior:"smooth",block:"start"});}); el.state.addEventListener("change",()=>updateCities(el.state.value)); el.prefix.addEventListener("change",()=>{if(el.prefix.value)el.network.value="";}); el.network.addEventListener("change",()=>{if(el.network.value)el.prefix.value="";}); el.sort.addEventListener("change",()=>applyFilters(false)); el.clear.addEventListener("click",clearFilters); el.clearEmpty.addEventListener("click",clearFilters); el.quick.addEventListener("click",(event)=>{const button=event.target.closest("button[data-specialty]");if(!button)return;el.specialty.value=el.specialty.value===button.dataset.specialty?"":button.dataset.specialty;applyFilters();}); el.list.addEventListener("click",(event)=>{const button=event.target.closest("button[data-record-id]");if(button)showDetails(button.dataset.recordId);}); el.pagination.addEventListener("click",(event)=>{const button=event.target.closest("button[data-page]");if(!button||button.disabled)return;state.page=Number(button.dataset.page);renderResults();el.title.scrollIntoView({behavior:"smooth",block:"start"});}); const close=()=>el.modal.close(); el.closeModal.addEventListener("click",close);el.concludeModal.addEventListener("click",close);el.modal.addEventListener("click",(event)=>{if(event.target===el.modal)close();});el.modal.addEventListener("close",()=>{document.body.classList.remove("modal-open");if(modalTrigger instanceof HTMLElement)modalTrigger.focus();modalTrigger=null;});
  loadData();
})();
