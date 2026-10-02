# Segurança do painel

## Escopo da fase D1.3

Este repositório aceita somente dados sintéticos. Não envie extrações da AMHP, dados de prestadores reais, credenciais, dados de beneficiários ou informações assistenciais.

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

## Produção

A alteração de `applicationMode` para `production` não é suficiente para colocar o projeto em produção. A fase D2 depende de:

- autorização escrita da AMHP;
- anuência do Plan-Assiste;
- armazenamento externo aprovado;
- referência documental no manifesto;
- revisão de CORS e da Política de Segurança de Conteúdo;
- validação institucional de conteúdo, marca e segurança.
