# Segurança do painel

## Escopo da fase D3

Este repositório de interface não recebe bases incorporadas. Não envie extrações, credenciais, dados de beneficiários ou informações assistenciais. Fontes públicas e institucionais devem ser normalizadas e publicadas por um processo externo controlado.

## Controles ativos

- política de segurança de conteúdo no HTML;
- nenhuma dependência JavaScript em tempo de execução;
- checksum SHA-256 do catálogo;
- verificação de ambiente e estado da autorização;
- catálogo armazenado em repositório separado;
- lista de campos proibidos e identificação sintética validadas no repositório da API;
- teste que impede reincorporar a base ao repositório da interface;
- dados renderizados com `textContent`, sem interpretar HTML da fonte;
- parâmetros de busca gravados na URL sem executar conteúdo;
- credenciais e pastas de dados reais ignoradas pelo Git.

## Comunicação de problema

Durante a fase acadêmica, registre o problema diretamente com o responsável pelo projeto. Antes de eventual uso institucional, este documento deverá indicar o canal oficial definido pelo Plan-Assiste.

Não inclua dados pessoais, credenciais ou cópias da base em uma issue pública.

## Fontes públicas e produção

 A alteração de `applicationMode` para `production` não é suficiente para colocar o projeto em produção. Uma fonte pública deve ter origem, termos, finalidade, campos e atualização verificados. A produção também depende de:

- autorização ou caráter público verificável da fonte;
- validação do Plan-Assiste;
- armazenamento externo aprovado;
- referência documental no manifesto;
- revisão de CORS e da Política de Segurança de Conteúdo;
- validação institucional de conteúdo, marca e segurança.
