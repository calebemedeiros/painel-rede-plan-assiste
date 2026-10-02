# Integração futura com fonte autorizada

## Estado atual

O painel usa o manifesto definido em `assets/config.js`:

```js
window.APP_CONFIG = Object.freeze({
  applicationMode: "demo",
  manifestUrl: "https://calebemedeiros.github.io/catalogo-demo-rede-plan-assiste/api/v1/manifest.json"
});
```

O navegador não conhece a API da AMHP e não recebe credenciais. Ele consulta uma API estática externa, verifica o manifesto e o SHA-256 e então abre o catálogo consolidado. A demonstração reúne uma fonte AMHPDF sintética e uma fonte direta sintética do Plan-Assiste.

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

Na fase D2, deverão ser acrescentados limites de variação entre versões, processo institucional de rollback e revisão dos cabeçalhos de segurança. Os contratos JSON Schema da versão 2 já acompanham o catálogo demonstrativo.
