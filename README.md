# Auraly IT

Quiz de 16 etapas para o funil italiano da Auraly, construido com Next.js,
React e TypeScript. Este repositorio contem somente o aplicativo e os arquivos
necessarios para executar o site e gerar o build de producao na Vercel.

## Desenvolvimento

```bash
npm ci
npm run dev
```

Verificacoes locais:

```bash
npm run lint
npm run typecheck
npm run build
```

## Vercel

1. Importe `elchapo007rbn/quiz-it-v1` na Vercel.
2. Selecione Next.js como framework.
3. Use `npm run build` como comando de build.
4. Nao configure uma pasta de saida personalizada.

O codigo do funil esta em `src/` e os arquivos de imagem, audio e video usados
pelo site estao em `public/`. O fluxo de checkout e a atribuicao de campanhas
sao mantidos no codigo existente.

## Dados locais

Os arquivos gerados por testes locais em `data/results/` sao ignorados e nao
fazem parte do repositorio. Nao inclua nomes, e-mails ou outros dados reais em
commits, issues ou logs.