# Painel Nacional da Rede Assistencial do Plan-Assiste

Interface estática para consulta pública de prestadores, estabelecimentos, redes, especialidades e procedimentos relacionados à rede assistencial do Plan-Assiste MPU.

## Estado da versão

Versão `1.0.0-rc.1`, candidata à produção. O navegador consome somente o catálogo público processado e aprovado. Não consulta as APIs de origem, não usa credenciais e não registra dados de beneficiários.

## Funcionalidades

- pesquisa sem diferenciação de acentos por prestador, estabelecimento, especialidade, procedimento ou código TUSS;
- indicação de prestadores de especialidades relacionadas ao procedimento, sem afirmar execução ou cobertura;
- filtros por UF, município, rede, vínculo, modalidade, tipo e prefixo predefinido de intercâmbio Unimed;
- filtros persistidos na URL;
- origem, atualização e link do guia oficial em cada detalhe;
- verificação SHA-256 do manifesto, recursos e fragmentos de prestadores;
- navegação por teclado, modal nativo, layout responsivo e CSP restritiva.

## Desenvolvimento

Sirva a pasta `03_Projeto_em_Desenvolvimento` para que o painel e o catálogo irmão fiquem sob a mesma origem:

```powershell
npx --yes http-server .. -p 4173 -c-1
```

Validação e build:

```powershell
npm test
npm run build
```

O conteúdo de `dist/` pode ser publicado no GitHub Pages ou copiado pela DTI para um subdiretório institucional. Os caminhos de interface são relativos; a URL do manifesto fica isolada em `assets/config.js`.

## Governança

Alterações de código e fontes devem passar por pull request. O catálogo aplica lista positiva de campos, checksums e quarentena. Redes sem API estável continuam representadas por seu guia oficial. A presença no painel não confirma elegibilidade, autorização, cobertura, execução do procedimento ou disponibilidade.

Consulte [documentação de implantação](docs/IMPLANTACAO_DTI.md) e [política de segurança](SECURITY.md).
