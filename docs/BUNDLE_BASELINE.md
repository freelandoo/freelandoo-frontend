# Bundle baseline — First Load JS por rota

Origem: plano-mestre F3.S1 (`PLANO_MELHORIAS_2026-06.md` na raiz do workspace).
Medição: `npm run bundle:report` (ver `scripts/bundle-baseline.mjs`) — soma dos
`<script src>` + `<link rel="preload" as="script">` do HTML real servido por
`next start`. Chunks lazy (`next/dynamic`) **não** contam, então a régua captura
o ganho dos slices F3.S2–S4.

> O build usa **Turbopack** (Next 16): `@next/bundle-analyzer` (webpack-only)
> não funciona e o `next build` não imprime mais tamanhos — por isso o script.

**Teto acordado: 250KB raw por rota.** O baseline está ~5–7× acima; o teto é a
direção, não a meta do próximo commit. A leitura útil hoje:

- O **shell compartilhado** (layout raiz: I18n/Tour/Consent providers, sidebar,
  modais globais, AdSense bootstrap) já custa ≈1.170KB raw — é o piso de todas
  as rotas. Reduzi-lo beneficia o site inteiro.
- O **delta por rota** (rota − piso ≈1.170KB) é o alvo dos slices F3.S2–S4:
  `/freelancer/[id]` +652KB, `/bees` +568KB, `/feed` +385KB, `/account` +326KB,
  `/mensagens` +249KB.

## Baseline 2026-06-10 (commit do F3.S1, antes de F3.S2)

Next 16.2.9 · build de produção local · valores em KB.

| Rota | HTTP | First Load JS raw (KB) | gzip (KB) |
|------|------|----------------------:|----------:|
| `/freelancer/1` | 200 | 1822 ⚠️ | 559 |
| `/bees` | 200 | 1738 ⚠️ | 518 |
| `/feed` | 200 | 1555 ⚠️ | 484 |
| `/account` | 200 | 1496 ⚠️ | 458 |
| `/mensagens` | 200 | 1419 ⚠️ | 437 |
| `/search` | 200 | 1403 ⚠️ | 436 |
| `/enxame/1` | 200 | 1403 ⚠️ | 436 |
| `/ranking` | 200 | 1278 ⚠️ | 405 |
| `/` | 200 | 1226 ⚠️ | 388 |
| `/wallet` | 200 | 1207 ⚠️ | 377 |
| `/loja-polens` | 200 | 1201 ⚠️ | 376 |
| `/blog` | 200 | 1174 ⚠️ | 368 |
| `/cursos` | 200 | 1171 ⚠️ | 367 |

Teto: 250KB raw · rotas acima: 13/13

## Como atualizar

```bash
npm run build
npx next start -p 3300   # noutro terminal
npm run bundle:report    # ou: node scripts/bundle-baseline.mjs /rota-especifica
```

Colar a tabela nova abaixo da anterior com data + commit, mantendo o histórico.
