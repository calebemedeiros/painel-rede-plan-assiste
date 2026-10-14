# Integração de fontes pela equipe responsável

O painel lê apenas o catálogo estático indicado em `assets/config.js`. A configuração das APIs ocorre no repositório do catálogo, por meio do modelo comentado `sources/catalog-sources.toml`.

Cada fonte deve informar vínculo direto ou indireto, URL pública HTTPS, documentação, caminho dos registros no JSON e mapeamento dos campos autorizados. O catálogo valida e minimiza a resposta antes de publicá-la.

Enquanto nenhuma fonte estiver autorizada, o manifesto permanece com `publication_status: configuration_required` e todos os recursos de dados ficam vazios.
