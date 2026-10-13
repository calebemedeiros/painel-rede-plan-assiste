# Relatório de implementação — 1.0.0-rc.1

Data da geração: 13/10/2026  
Projeto: Painel Nacional da Rede Assistencial do Plan-Assiste

## Resultado

A versão candidata reúne interface e catálogo em um pacote estático implantável. A DTI pode publicar o conteúdo de `dist/` sem executar os coletores.

| Item | Resultado |
|---|---:|
| Prestadores publicados | 10.554 |
| Procedimentos TUSS | 5.765 |
| Procedimentos com relação completa a especialidades | 2.763 |
| Redes cadastradas | 15 |
| Especialidades normalizadas | 121 |

## Implementado

- coleta da AMHPDF restrita ao convênio 639;
- lista positiva e descarte de campos administrativos;
- cadastro mestre de redes e telemedicina;
- TUSS 22, compatibilização TUSS×SIGTAP e SIGTAP×CBO;
- busca por procedimento com redação que não afirma execução ou cobertura;
- fragmentação do catálogo, manifesto e checksums SHA-256;
- validação de campos, identificadores, vínculos, URLs e competências;
- quarentena por fonte vazia, remoção superior a 5% e variação superior a 10%;
- filtros nacionais, atendimento remoto, rede, vínculo e prefixo Unimed;
- encaminhamento ao guia oficial para redes sem lista incorporada;
- build portátil, ZIP, checksums, SBOM e instruções de rollback.

## Verificações executadas

- testes automatizados do frontend;
- validação integral do contrato 4.0.0 e de todos os fragmentos;
- confirmação dos checksums;
- teste em Chrome nas larguras 1440×1000 e 390×844;
- ausência de rolagem horizontal;
- modal sem barra de rolagem nas duas larguras;
- pesquisa pelo código TUSS 10101012;
- ausência de erros de JavaScript no navegador.

## Limites conhecidos

- a compatibilização oficial TUSS×SIGTAP disponível na página da ANS tem competência 201704; o pipeline só mantém relações cujos códigos continuam presentes nas tabelas 202609;
- redes sem API estável permanecem acessíveis pelo guia oficial;
- o painel não declara cobertura nacional completa enquanto parte das redes depende de consulta externa;
- a implantação no domínio institucional e a configuração dos cabeçalhos HTTP ficam sob responsabilidade da DTI.
