# Painel da rede Plan-Assiste — demonstração

Protótipo acadêmico para validar uma consulta simplificada a profissionais e estabelecimentos relacionados à rede AMHPDF utilizada pelo Plan-Assiste MPU.

## Situação

**Fase D1 — demonstração com dados sintéticos.**

- não é uma fonte oficial;
- não contém dados de prestadores reais;
- não consulta a API da AMHP;
- não contém dados de beneficiários;
- não deve ser apresentado como serviço em produção.

## Funcionalidades

- pesquisa por nome, especialidade, estabelecimento e localidade;
- filtros por especialidade, região e tipo de prestador;
- ordenação e paginação;
- detalhes de locais e registros profissionais demonstrativos;
- URLs compartilháveis com os filtros da consulta;
- layout responsivo e navegação por teclado;
- integridade do catálogo verificada por SHA-256;
- bloqueio de bases incompatíveis com o ambiente.

## Estrutura

```text
assets/                  interface, configuração e identidade visual
data/                    manifesto e catálogo exclusivamente sintético
docs/                    documentação da integração futura
schemas/                 contratos de dados da fase C
tests/                   validação automática da base demonstrativa
.github/workflows/       validação e publicação no GitHub Pages
index.html               entrada da aplicação
```

## Executar localmente

Use um servidor HTTP; navegadores bloqueiam `fetch` quando a página é aberta diretamente como arquivo.

```powershell
npx --yes http-server . -p 4173 -c-1
```

Depois acesse `http://localhost:4173`.

## Validar

```powershell
npm test
```

O teste confirma:

- ambiente demonstrativo;
- quantidade de registros;
- checksum SHA-256;
- identificadores únicos;
- ausência de campos internos proibidos;
- identificação sintética de todos os registros.

## GitHub Pages

O fluxo `pages.yml` valida os dados e publica o conteúdo estático quando houver envio para a branch `main`. No repositório do GitHub, a origem do Pages deverá ser configurada como **GitHub Actions**.

## Evolução

A troca para o catálogo autorizado exigirá aprovação específica da fase D2. Consulte [docs/INTEGRACAO_FUTURA.md](docs/INTEGRACAO_FUTURA.md) e [SECURITY.md](SECURITY.md).

## Identidade e direitos

A marca Plan-Assiste é utilizada somente para composição do protótipo acadêmico e permanece sujeita à validação institucional. A eventual publicação institucional dependerá da autorização de uso da marca e da aprovação das áreas responsáveis.
