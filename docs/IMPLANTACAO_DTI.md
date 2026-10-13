# Implantação pela DTI

1. Baixe o artefato `painel-rede-plan-assiste` da execução aprovada ou a release correspondente.
2. Publique todo o conteúdo de `dist/` no diretório escolhido.
3. Ajuste somente `assets/config.js` se o catálogo for hospedado em outra origem.
4. Mantenha HTTPS e configure `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` e `Permissions-Policy: geolocation=(), camera=(), microphone=()`.
5. Valide a abertura do manifesto, dos recursos e dos fragmentos de prestadores.
6. Execute um teste por nome, código TUSS, especialidade, rede, UF e atendimento remoto.

## Rollback

Restaure o artefato da última release aprovada. O frontend e o catálogo são independentes; um catálogo em quarentena não substitui a versão publicada.

## Base URL

Os recursos visuais usam caminhos relativos. Para publicação em subdiretório, mantenha a estrutura de `dist/`. A URL do catálogo pode ser absoluta ou relativa à página.
