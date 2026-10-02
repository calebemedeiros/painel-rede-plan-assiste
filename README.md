# Painel da rede Plan-Assiste — demonstração

Protótipo acadêmico para validar uma consulta nacional e multifonte a profissionais e estabelecimentos relacionados à rede de atendimento do Plan-Assiste MPU.

## Situação

**Fase D1.3 — consulta nacional multifonte concluída para demonstração.**

- não é uma fonte oficial;
- não contém dados de prestadores reais;
- consome uma API estática externa com dados sintéticos;
- não contém dados de beneficiários;
- não deve ser apresentado como serviço em produção.

## Funcionalidades

- pesquisa por nome, especialidade, estabelecimento e localidade;
- filtros por especialidade, estado, município, tipo, origem e forma de acesso;
- ordenação e paginação;
- detalhes de locais e registros profissionais demonstrativos;
- URLs compartilháveis com os filtros da consulta;
- layout responsivo e navegação por teclado;
- catálogo externo com 600 profissionais e estabelecimentos sintéticos em seis fontes;
- diferenciação entre credenciamento direto, rede parceira, rede conveniada, intercâmbio regional e rede hospitalar;
- aviso explícito de que a presença no catálogo não garante elegibilidade, autorização ou disponibilidade;
- integridade do catálogo verificada por SHA-256;
- bloqueio de bases incompatíveis com o ambiente.

## Estrutura

```text
assets/                  interface, configuração e identidade visual
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

- ausência de dados incorporados ao repositório da interface;
- configuração do catálogo externo por HTTPS;
- ambiente demonstrativo;
- Política de Segurança de Conteúdo compatível com a fonte;
- presença dos bloqueios de autorização e integridade no cliente.

## API demonstrativa

O painel consome o manifesto publicado pelo repositório [catalogo-demo-rede-plan-assiste](https://github.com/calebemedeiros/catalogo-demo-rede-plan-assiste). A separação demonstra como o Plan-Assiste poderá incorporar novas bases sem reconstruir a interface.

## GitHub Pages

O fluxo `pages.yml` valida os dados e publica o conteúdo estático quando houver envio para a branch `main`. No repositório do GitHub, a origem do Pages deverá ser configurada como **GitHub Actions**.

## Evolução

A troca para o catálogo autorizado exigirá aprovação específica da fase D2. Consulte [docs/INTEGRACAO_FUTURA.md](docs/INTEGRACAO_FUTURA.md) e [SECURITY.md](SECURITY.md).

## Identidade e direitos

A marca Plan-Assiste é utilizada somente para composição do protótipo acadêmico e permanece sujeita à validação institucional. A eventual publicação institucional dependerá da autorização de uso da marca e da aprovação das áreas responsáveis.
