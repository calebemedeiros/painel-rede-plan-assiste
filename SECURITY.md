# Segurança do painel

O frontend não recebe dados de beneficiários, CPF, carteirinha completa, informação clínica ou credencial. O navegador baixa apenas recursos públicos processados, aprovados e acompanhados de SHA-256.

## Controles

- CSP restritiva no documento e recomendação de cabeçalhos no servidor;
- nenhuma dependência JavaScript em tempo de execução;
- validação do contrato 4.0.0, ambiente e estado de publicação;
- verificação de integridade de todos os recursos e fragmentos;
- chamadas `fetch` sem credenciais;
- conteúdo externo renderizado por `textContent`;
- links externos definidos no catálogo validado;
- separação entre interface e pipeline de dados;
- nenhuma gravação do histórico de pesquisa.

`frame-ancestors 'none'` deve ser enviado como cabeçalho HTTP, pois navegadores ignoram essa diretiva em meta CSP.

Não publique vulnerabilidades, bases ou dados pessoais em issues públicas. Encaminhe o relato ao responsável institucional pelo repositório.
