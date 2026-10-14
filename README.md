# Painel Nacional da Rede Assistencial do Plan-Assiste

Interface estática preparada para consumir o catálogo configurável da rede assistencial. A versão `1.1.0-rc.1` é publicada sem prestadores, redes, especialidades ou procedimentos reais.

Enquanto nenhuma API estiver configurada, o painel apresenta um estado institucional de configuração pendente e mantém os controles de consulta desabilitados.

## Contrato

- manifesto `4.1.0`;
- situação inicial `configuration_required`;
- verificação SHA-256 de todos os recursos;
- chamadas sem credenciais;
- nenhum dado de beneficiário ou histórico de pesquisa;
- conteúdo externo renderizado com `textContent`.

## Desenvolvimento

Gere primeiro o catálogo vazio no repositório irmão e depois execute:

```powershell
npm test
npm run build
```

No GitHub Pages, o painel consulta o manifesto publicado pelo repositório do catálogo. O frontend não chama diretamente as APIs de origem.
