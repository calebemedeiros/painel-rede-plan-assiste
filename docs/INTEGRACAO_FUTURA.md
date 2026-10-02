# Integração futura com fonte autorizada

## Estado atual

O painel usa o manifesto definido em `assets/config.js`:

```js
window.APP_CONFIG = Object.freeze({
  applicationMode: "demo",
  manifestUrl: "./data/manifest.json"
});
```

O navegador não conhece a API da AMHP e não recebe credenciais. Ele consulta apenas um catálogo público previamente validado.

## Mudança prevista na fase D2

Após autorização, a configuração poderá apontar para um armazenamento externo:

```js
window.APP_CONFIG = Object.freeze({
  applicationMode: "production",
  manifestUrl: "https://dados.exemplo.br/amhp-plan-assiste/producao/manifest.json"
});
```

O domínio é apenas ilustrativo. Nenhum endereço deve ser ativado antes da definição do serviço institucional ou aprovado.

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

Na fase D2, deverão ser acrescentadas validação completa por JSON Schema, limites de variação entre versões, processo de rollback e revisão dos cabeçalhos de segurança.
