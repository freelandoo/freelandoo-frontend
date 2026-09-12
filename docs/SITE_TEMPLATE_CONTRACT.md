# Como escrever um site pronto (tema autoral)

Este é o contrato entre um site desenhado por fora e a hospedagem da Freelandoo.
A plataforma dá endereço, hospedagem, indicadores e o botão que o cliente aperta
para aceitar. **O desenho é livre** — o tema é um componente React e pode ser o
que você quiser, inclusive nada parecido com o construtor.

O que não é livre são as **costuras**: por onde o endereço entra, onde a
sub-página mora, e o que não pode ir para o HTML. Cada regra abaixo existe
porque quebrá-la produz um defeito **silencioso** — o site abre, parece certo, e
erra num endereço que ninguém testa.

Referência viva: `components/site-templates/oficina-local/`.

---

## 1. O que a pasta precisa entregar

Crie `components/site-templates/<slug>/` e exporte três coisas, que é o que a
rota consome (`registry.ts`):

```ts
{
  Site:        (props: TemplateProps) => React.ReactElement  // o site inteiro
  resolvePage: (data, slug) => page | null                   // endereço → página
  metadata:    (props: TemplateProps) => Metadata            // <title>, canônico, preview
}
```

`TemplateProps` é `{ data: unknown, links: TemplateLinks, page: unknown }`.

`data` e `page` são `unknown` **de propósito**: quem resolve a página é o tema e
quem a desenha é o mesmo tema. A rota só carrega o valor de um para o outro sem
nunca abrir — é isso que permite ao seu site ter o formato de dados que quiser
sem mudar uma linha de rota nenhuma.

**Registre nos DOIS lados:**

| onde | arquivo | o que |
|---|---|---|
| front | `components/site-templates/registry.ts` | a entrada com as três funções |
| back | `src/utils/siteTemplates.js` | `normalize`, `summarize` e o `label` |

⚠️ **Faltando no front, a página dá 404.** Faltando no backend, o save é recusado
e o tema nunca recebe dados. Nunca é o ramo de baixo que reclama — lá a tela diz
"comunidade fechada", que manda procurar o problema no lugar errado.

---

## 2. Endereços: tudo vem de `links`, nada é escrito à mão

O **mesmo site responde em três origens**: `freelandoo.com.br/c/<slug>`, o
subdomínio, e o domínio próprio do cliente. Um `/servicos` escrito no código
acerta em uma e dá 404 nas outras duas.

```ts
type TemplateLinks = {
  origin: string        // absoluta, e é a DO CLIENTE no domínio dele
  communityId: string
  home: string          // "/c/<slug>" ou "/"
  pageBase: string      // "/c/<slug>/pagina" ou "/pagina"
  booking: string | null
}
```

- **`origin` é a do cliente.** É ela que o canônico e o `@id` do JSON-LD declaram
  ao buscador. Fixar a nossa faria o site dele dizer que mora em freelandoo.com.br.
- **`booking` pode ser `null`** — ele só existe quando há serviço cadastrado. Sem
  nenhum, "Agendar online" levaria a um passo 1 vazio, e muito negócio local
  trabalha **sob orçamento**. Sem botão é melhor que botão quebrado.
- **`pageBase` vazio é valor legítimo** (no domínio próprio a página é
  `/pagina/x`). Compare com `null`, nunca com `!pageBase` — um falsy trataria a
  raiz como ausência e apagaria todo link interno justamente no endereço do cliente.

### O prefixo `/pagina/<slug>` não é negociável

Toda página interna de todo tema vive sob ele. O `proxy.ts` roda em **toda**
requisição e tem **ZERO I/O** como regra: ele não pode consultar o banco para
descobrir se `/servicos` é uma página sua ou uma rota da plataforma. `/pagina` é
o único prefixo que ele reescreve nos três endereços sem perguntar nada.

E **não use `/p`** — já é a página pública de post.

---

## 3. A porta do tema é componente de SERVIDOR

Fontes, CSS e JSON-LD precisam estar no HTML que o buscador lê; um componente de
cliente os entregaria tarde demais. As peças com gesto (barra, botão flutuante,
fundo, animação) é que são `"use client"`, por dentro.

**Importe a folha e as fontes DENTRO do tema**, nunca no layout: assim elas só
entram nas rotas que desenham um site pronto. Peça nova do tema entra por dentro
da porta — solta numa rota, ela não recebe nem a pele nem as variáveis de fonte,
e o site sai sem tipografia **sem um único erro aparecer**.

⚠️ Se você reusar uma fonte que a plataforma já carrega, confira os **eixos
variáveis**. O layout carrega Archivo sem o eixo `wdth`; reusar aquele faz todo
lettering condensado sair na largura normal, sem erro.

---

## 4. CSS: escopado, sempre

Tudo dentro de uma classe do tema (`.tpl-<slug>`). Uma regra solta atravessa a
Freelandoo inteira, e o sintoma aparece numa tela que ninguém vai relacionar ao
site de um cliente.

### `overflow-x: clip` vai no CONTEÚDO, não no invólucro

Ponha em `> main` e `> footer`. **Não ponha no invólucro**: barra fixa, botão
flutuante e fundo são filhos dele, e alguns navegadores tratam `clip` como
recorte de descendente `fixed` — o preço de perder essa aposta é **a barra do
site do cliente sumir**. Sem recorte nenhum, reveals laterais abrem rolagem
horizontal no celular antes de a animação rodar.

---

## 5. Imagens: `<img>`, não `next/image`

Para qualquer URL que venha dos dados. O otimizador **recusa host fora de
`remotePatterns` com erro de runtime** — derrubaria a página do cliente por causa
de onde a imagem está hospedada. Arte que você embarca na pasta do tema pode usar
`next/image` à vontade.

---

## 6. Peso: nada de animação numa camada do tamanho da janela

A plataforma pagou essa conta em 2026-09-09. O custo de um shader (ou de um
`background-position` animado) em tela cheia é **por pixel**, e ele **divide a
GPU com o compositor** — quem engasga é a rolagem inteira, e a causa parece estar
em qualquer outro lugar: custou três investigações antes de alguém olhar para o
papel de parede.

Num site de cliente isso pesa menos que dentro da plataforma (não há feed nem
dock competindo), mas no celular o custo continua real. Se o efeito for o ponto
do site, ele precisa de freios explícitos, e os quatro são conhecidos:
`prefers-reduced-motion` desenhando **um quadro** e encerrando o laço, aba
escondida suspendendo, teto de pixels por quadro (não de DPR — o custo é por
pixel, e quem paga é o monitor grande, não o celular retina) e queda automática
do teto quando o FPS não acompanha, **só para baixo**.

O caminho barato continua sendo gradiente em CSS, pintado uma vez.

---

## 7. Indicadores: use o contador que já existe

Monte `SiteAnalytics` (`components/site/site-analytics.tsx`) — **o mesmo do
construtor**. Um segundo contador daria duas contagens da mesma visita, e o
painel de Indicadores do cliente passaria a mentir.

O clique de WhatsApp é reconhecido pelo host **`wa.me`** — é por ele que o painel
conta. Outro host e o lead some da conta sem erro nenhum.

---

## 8. JSON-LD é o produto, não enfeite

É ele que faz o par pergunta-e-resposta, o horário e a área atendida serem lidos
em busca local.

- **Nunca** `aggregateRating`, `review` fabricada ou `priceRange` chutado. Nota
  inventada é a única coisa ali que seria mentira sobre a empresa, e é o que
  rende **penalização manual**.
- **Campo vazio não vira campo.** Afirmação em branco é pior que omissão — pode
  gerar um `prune` antes de serializar.
- **`openingHours` sai do texto legível como está.** Converter para
  `openingHoursSpecification` exige adivinhar dia e hora a partir de texto livre,
  e publica horário que ninguém escreveu.
- **`FAQPage` sem `mainEntity` não é desenhado** — marcação inválida registra
  erro na ficha, em vez de ser ignorada.

---

## 9. Dados: você escolhe se existem

Um tema autoral de um cliente só pode ter o conteúdo **no próprio código** — e aí
`normalize` devolve `{}` e nada precisa ser gravado. Um tema feito para servir
vários clientes separa conteúdo em `template_data`, validado campo a campo no
backend (a saída é **montada**, nunca a entrada com um remendo: esses valores são
interpolados em HTML e em `href` no site de um cliente).

⚠️ **Declare `summarize` de qualquer forma.** É ele que enche o modal que o
cliente lê antes de aceitar a troca (negócio, quantas páginas, quais endereços).
Sem ele o modal mostra "Seu negócio · 1 página" e a pessoa aceita no escuro. Num
tema com conteúdo no código, `summarize` ignora `data` e devolve o resumo fixo.

⚠️ E **dedupe de endereço é global**: serviços e cidades (ou o que o seu site
tiver) dividem **um** namespace, porque `/pagina` é um prefixo só. Duas páginas
com o mesmo slug fazem o endereço abrir uma delas por ordem de array — invisível
para quem escreveu.

---

## 10. Como o site chega ao cliente

1. Você escreve o tema e registra nos dois lados.
2. **Reserve** para a comunidade dele:
   ```
   PUT /admin/managed-sites/<id_profile>/offer
   { "template": "<slug>", "data": { ... }, "note": "recado que ele lê no modal" }
   ```
   (Bearer de um Administrator. `data` pode ser `{}` num tema com conteúdo no código.)
3. O líder vê a **bolinha** no botão "Site pronto", abre, confere o resumo e
   aceita. O site dele no construtor **não é tocado** em momento nenhum.
4. Publicar continua sendo nosso: `POST /admin/managed-sites/<id>/publish`.

Aceitar **não publica**, de propósito: publicar cunha o endereço permanente e tem
gate próprio. Se ele devolver o site ao construtor, a oferta **volta a esperar**
com o conteúdo intacto — ele não perde o que pagou.

---

## Quando houver muitos temas

`registry.ts` importa os temas **estaticamente** hoje. Com um tema isso é
irrelevante; com vinte sites autorais — um deles pesado — o chunk de cliente das
rotas `/c/[slug]` carrega todos. A saída é `next/dynamic` com **`ssr: true`** no
registro (com `ssr: false` o site perde a renderização no servidor, que é o ponto
inteiro do JSON-LD). Decida isso quando o segundo tema entrar, medindo — não antes.
