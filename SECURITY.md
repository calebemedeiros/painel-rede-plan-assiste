# Segurança do painel

O frontend não contém prestadores reais, credenciais, CPF, carteirinha, informações clínicas ou histórico de pesquisa.

## Controles

- CSP restritiva;
- contrato `4.1.0` e estado de autorização explícito;
- checksums SHA-256 dos recursos;
- `fetch` sem credenciais;
- renderização com `textContent`;
- nenhuma gravação em `localStorage` ou IndexedDB;
- estado seguro de configuração pendente quando nenhuma API foi autorizada.

As fontes são configuradas e tratadas no repositório do catálogo. O navegador recebe somente o JSON minimizado publicado pelo GitHub Pages.
