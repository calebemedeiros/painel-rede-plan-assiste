# Integração futura com fonte autorizada

## Estado atual

O painel usa o manifesto definido em `assets/config.js`:

```js
window.APP_CONFIG = Object.freeze({
  applicationMode: "demo",
  manifestUrl: "https://calebemedeiros.github.io/catalogo-demo-rede-plan-assiste/api/v1/manifest.json"
});
```

O navegador não recebe credenciais. Ele consulta uma API estática externa, verifica o manifesto e o SHA-256 e então abre o catálogo consolidado. A demonstração reúne seis fontes sintéticas de abrangência nacional e regional e separa origem, vínculo, abrangência e modalidade de acesso.

## Adaptadores previstos na fase D3

Uma API pública verificada ou um catálogo institucional poderá alimentar um adaptador executado fora do navegador. O painel deverá continuar recebendo apenas o contrato normalizado e validado:

```js
window.APP_CONFIG = Object.freeze({
  applicationMode: "production",
  manifestUrl: "https://dados.exemplo.br/rede-plan-assiste/producao/manifest.json"
});
```

O domínio é apenas ilustrativo. APIs públicas estão autorizadas para integração técnica, mas somente serão ativadas após a identificação da origem, revisão de termos, validação de campos e registro da atualização. Fontes internas exigem serviço e governança definidos pelo Plan-Assiste.

## Processo de atualização

```text
API ou exportação oficial
        ↓
coleta autenticada no servidor
        ↓
lista positiva de campos
        ↓
normalização e validação
        ↓
catálogo versionado + SHA-256
        ↓
armazenamento externo
        ↓
manifesto atualizado por último
```

## Requisitos do armazenamento

- HTTPS obrigatório;
- CORS limitado à origem da página;
- leitura pública apenas do catálogo minimizado;
- escrita restrita à conta técnica;
- versionamento e rollback;
- criptografia em repouso;
- sem listagem pública do contêiner;
- logs sem registros completos;
- retenção definida pelo responsável institucional.

## Bloqueios mantidos

O código recusa uma base de produção quando:

- o estado não é `authorized`;
- a referência da autorização está vazia;
- o catálogo não usa HTTPS;
- ambiente, contagem ou autorização divergem;
- o SHA-256 não corresponde ao arquivo recebido.

Antes da produção, deverão ser acrescentados limites de variação entre versões, processo institucional de rollback e revisão dos cabeçalhos de segurança. Os contratos JSON Schema da versão 3 já acompanham o catálogo demonstrativo.
