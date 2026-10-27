# Esportes — repaginada: sistema de movimento (coreografia)

Data: 2026-10-27 · Escopo: `app/(header-only)/esportes/**` e `app/(header-only)/academias/**`
Dono deste documento: a COREOGRAFIA (o que anima, por quê, propriedade, curva, duração, stagger, gatilho, interrupção, saída, reduced-motion, custo). Layout, cores e tipografia são do spec visual paralelo; onde este texto cita uma peça ("calendário-objeto", "faixa de cabeçalho"), ele assume o desenho de lá e só diz como ela se move.

Pedido do Alex: "os indicadores estão sem efeitos, feios, quadrados, eu quero uma nova repaginada na comunidade toda, quero algo incrível, bonito, mas mantendo a cara das comunidades freelandoo, com efeitos, animações, motion". Decisão já tomada: **sem WebGPU**; paralaxe só por inclinação (mouse/giroscópio, só `transform`); cascata e efeitos com framer-motion (e GSAP só onde já é o idioma da rota).

---

## 0. O que existe hoje (lido no código)

| Item | Estado |
|---|---|
| Libs | `framer-motion` **12.38.0**, `gsap` **3.15.0**, `@gsap/react` **2.1.2**, `three` 0.186, `@babylonjs/core` 9.29. **Sem Lenis** (e não vamos pôr: rolagem suavizada briga com o scroll nativo do celular e com o `overflow-x-clip` da casca). |
| framer-motion já está em TODA página de Esportes | `components/profile/headcard-pills.tsx` (`PillStack`) importa `motion`/`useReducedMotion` e é montado pelo `FitnessHeadcard` e pelo headcard da academia. Ou seja: o chunk do framer **já é pago** em todas as rotas do escopo. Usar framer aqui custa ~0 KB a mais. |
| GSAP | Só em rotas fora do escopo: `/ranking` (`ranking-podium.tsx`, `useGSAP` + ScrollTrigger, `back.out(1.4)`, stagger 0.16), `/comofunciona`, `/funcoes`, temas de site. **Nenhuma página de Esportes importa GSAP.** Trazer GSAP para cá = +~25 KB gz (core) +~12 KB (ScrollTrigger) no chunk da rota, sem nada que o framer não faça. |
| Reduced motion | Padrão do projeto: `useReducedMotion()` do framer por componente (`ActionConsentModal`, `HeroSection`, `earn-cta`, `PillStack`: `reduceMotion ? { duration: 0 } : spring`). Reveal por IO + CSS em `lib/scroll-reveal.ts` (`.sr-init/.sr-in` em `globals.css`, com bloco `@media (prefers-reduced-motion)`). Loop CSS com reduced-motion: `.fl-heat-spin`. |
| Fundo | `TechBackdrop variant="fitness"` = textura estática pintada uma vez. **Fica parado. Não ressuscitar movimento nele** (a nota do arquivo explica o incidente do Games). |
| Headcard | `FitnessHeadcard` / headcard da academia: banner desenhado (`BANNER_LAYERS`), chip `-rotate-2`, selo, foto 2/3 com `PillStack` atrás (spring `stiffness 320, damping 24`, `x: open ? 10 : 0`, hover `x: 7`). A pilha fica atrás da foto **só por ordem do DOM** dentro do mesmo contexto de empilhamento. |
| Indicadores | `indicators-tab.tsx`: 8 `Tile` estáticos, `DailyBars` (barras por `height` em %), `WeightLine` (polyline SVG), macros (3 divs por `width`). Zero movimento; `Loader2 animate-spin` no carregamento. |
| Academia (aluno) | `esportes/academia/page.tsx`: `MonthDots` (grade de quadradinhos 1..N), lista de mensalidades com chip de status, contador `frequency_days_30d`. |
| Histórico | lista de dias com duas barrinhas (`width` em %), medições, modal de medição. |
| Página da academia / ranking / membros / vitrine / grade | sem animação própria (o ranking da academia é a cópia editorial do `/ranking` mas sem o GSAP de lá). |
| Painel do dono: recebimentos/repasses | **não existe ainda** — peça nova do redesign. |

---

## (a) Princípios e assinatura de movimento

### Princípios

1. **Papel impresso, não vidro.** Tudo se move como objeto de papel/placar sobre mesa: entra batendo, assenta, tem peso. Nada flutua, nada desfoca, nada brilha pulsando. Sem `blur`, sem `backdrop-filter` animado, sem glow pulsante.
2. **A sombra dura é um objeto.** A sombra `8px 8px 0` deixa de ser `box-shadow` animável (paint) e, nas peças que se mexem, vira um **bloco irmão atrás** (`<span aria-hidden>` absoluto, mesma caixa, `translate(8px,8px)`). Mover sombra = mover esse bloco com `transform`. Isso dá o gesto-marca da casa (§ assinatura 1) a custo de composição.
3. **Movimento conta uma coisa que é verdade.** Carimbo = presença real; contagem = número que chegou do servidor; folha virando = mudou de mês. Nada anima "porque sim" em loop.
4. **Rápido na entrada, firme no fim.** Entradas 180–420 ms; cascatas inteiras ≤ 700 ms no celular. Curvas de saída curtas (120–180 ms). O usuário nunca espera animação para agir: todo controle é clicável desde o primeiro quadro.
5. **Uma vez por visita.** Cascata de montagem roda na primeira vez que o bloco aparece; voltar a ele rolando não repete (IO com `once`). Recarregar dados não repete a cascata — só os números trocados recontam.
6. **Celular de entrada é o alvo.** Orçamento pensado para um Galaxy A/Moto G (CPU 4× mais lenta que o notebook). Paralaxe por mouse só com ponteiro fino; giroscópio só onde não pede permissão.

### Assinatura de movimento (5 movimentos-marca)

| # | Nome | O que é | Onde aparece |
|---|---|---|---|
| 1 | **PRENSA** (press) | O cartão desce sobre a própria sombra: corpo `translate(+3px,+3px)` e bloco-sombra `translate(-3px,-3px)` relativo → a sombra "encolhe" como papel apertado na mesa. Volta com mola seca. | Todo botão de ação (`BTN_GOLD`), toque em tile, "Pagar", ‹ ›, pills de aba. |
| 2 | **CARIMBO** (stamp) | Marca cai de cima maior e torta, bate (`scale 1.6→0.92→1`, `rotate` aleatório determinístico), e o papel embaixo dá um tranco de 1–2 px. | ✓/✗ do calendário, chip "PAGO", selo "NOVO RECORDE", chip de status do repasse. |
| 3 | **PLACAR** (scoreboard) | Número conta do zero (ou do valor anterior) com `tabular-nums`, desacelerando no fim; o último dígito dá um "clique" (`y: -2px → 0`). | Contador do mês, sequência, todos os KPIs, totais do dono, frequência 30d. |
| 4 | **RECORTE** (cut-in) | Bloco entra deslizando de baixo com máscara reta (o pai tem `overflow:hidden` só durante a entrada) e uma leve rotação de -1,5° que zera — como recorte de jornal colado. | Cascata de tiles, faixas de cabeçalho, linhas de lista, título do headcard. |
| 5 | **FOLHA** (sheet flip) | A folha do calendário vira em torno das argolas (`rotateX` com `transform-origin: top`), direcionada: avançar = a folha atual sobe e passa por trás das argolas; voltar = a anterior cai das argolas. | Troca de mês ‹ ›; reaproveitada na troca de métrica do ranking. |

E um **sexto, opcional e contido: INCLINAÇÃO** (tilt) — o cartão-objeto (calendário, card de academia, KPI herói) inclina até 6° seguindo o cursor/giroscópio, com a sombra-bloco deslizando ao contrário (paralaxe de 2 planos). Só em ≤ 2 cartões por tela.

---

## (b) Tokens de motion — `app/(header-only)/esportes/_components/ui/motion.ts`

> As academias (`app/(header-only)/academias/**`) importam do mesmo arquivo — é a mesma casca (`FitnessShell`). Nada de valor solto em componente: curva, duração e stagger saem daqui.

```ts
// app/(header-only)/esportes/_components/ui/motion.ts
//
// O RELÓGIO DO AMBIENTE ESPORTES — fonte ÚNICA de durações, curvas, molas e
// cascatas. Componente novo de /esportes ou /academias importa daqui.
// ⚠️ Só transform e opacity (e pathLength em SVG pequeno, ver spec §f).

import type { Transition } from "framer-motion"

/** Durações em SEGUNDOS (framer). Espelho em ms para CSS/IO: DUR_MS. */
export const DUR = {
  instant: 0.08, // troca de rótulo, feedback de hover
  quick: 0.14,   // saída, prensa (descida)
  base: 0.22,    // entrada de item de lista
  enter: 0.32,   // recorte de bloco
  sheet: 0.38,   // folha do calendário
  count: 0.9,    // placar (KPI)
  countLong: 1.2,// placar de dinheiro (dono)
  draw: 0.7,     // linha/anel desenhando
} as const
export const DUR_MS = Object.fromEntries(
  Object.entries(DUR).map(([k, v]) => [k, Math.round(v * 1000)])
) as Record<keyof typeof DUR, number>

/** Curvas cubic-bezier nomeadas. */
export const EASE = {
  /** Entrada de papel: sai rápido, assenta firme (expo-out suave). */
  paper: [0.16, 1, 0.3, 1],
  /** Saída: acelera para fora, sem cauda. */
  exit: [0.4, 0, 1, 1],
  /** Placar: desacelera longo no fim (quart-out) — o número "freia". */
  score: [0.25, 1, 0.5, 1],
  /** Traço/anel desenhando. */
  ink: [0.65, 0, 0.35, 1],
  /** Folha: começa pesada, termina solta. */
  sheet: [0.55, 0, 0.1, 1],
} as const

/** Molas nomeadas (framer). */
export const SPRING = {
  /** O MESMO dos pills do headcard (headcard-pills.tsx) — não divergir. */
  pill: { type: "spring", stiffness: 320, damping: 24 },
  /** Prensa: volta seca, 1 quique quase imperceptível. */
  press: { type: "spring", stiffness: 900, damping: 38, mass: 0.6 },
  /** Carimbo: bate e acomoda (overshoot ~8%). */
  stamp: { type: "spring", stiffness: 700, damping: 22, mass: 0.7 },
  /** Inclinação: segue o cursor com atraso de mão. */
  tilt: { stiffness: 180, damping: 22, mass: 0.6 },
} as const satisfies Record<string, Transition | { stiffness: number; damping: number; mass: number }>

/** Cascatas (s entre irmãos) e TETOS (s totais) — o teto vence o passo. */
export const STAGGER = {
  tiles: 0.05,       // KPIs
  rows: 0.035,       // linhas de lista (mensalidades, dias, repasses)
  stamps: 0.022,     // dias do calendário
  bars: 0.02,        // barras de 14 dias
  maxTotal: 0.6,     // nenhuma cascata passa disso: passo = min(passo, maxTotal / n)
} as const

/** Distâncias (px) e ângulos (deg). */
export const DIST = {
  cutY: 18,          // recorte sobe 18px
  cutRotate: -1.5,   // recorte começa torto
  press: 3,          // prensa: corpo +3, sombra -3
  shadow: 8,         // sombra dura padrão (8px 8px)
  tiltMax: 6,        // inclinação máxima
  tiltShadow: 4,     // quanto a sombra-bloco desliza no tilt
  stampFrom: 1.6,    // escala inicial do carimbo
} as const

/** Passo de cascata com teto: `stepFor(n, STAGGER.stamps)`. */
export const stepFor = (n: number, step: number) =>
  n <= 1 ? 0 : Math.min(step, STAGGER.maxTotal / (n - 1))

/** Rotação "aleatória" ESTÁVEL por chave (o carimbo do dia 12 cai sempre igual). */
export function stampAngle(key: string, range = 14): number {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0
  return ((Math.abs(h) % 1000) / 1000 - 0.5) * range
}

/** Variants prontos (framer). */
export const cutIn = {
  hidden: { opacity: 0, y: DIST.cutY, rotate: DIST.cutRotate },
  show: { opacity: 1, y: 0, rotate: 0, transition: { duration: DUR.enter, ease: EASE.paper } },
}
export const fadeOnly = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DUR.base } },
}
```

Regra de uso: `<MotionConfig reducedMotion="user">` envolve o conteúdo dentro da `FitnessShell` (ver §d). Com isso o framer zera **transform** para quem pediu menos movimento e mantém **opacity** — exatamente o comportamento que queremos como base; os primitivos abaixo ainda fazem o próprio desvio (placar mostra o valor final na hora, folha vira corte seco).

> ⚠️ O `PillStack` já trata reduced-motion sozinho (`duration: 0`); o `MotionConfig` por cima é coerente com ele (ambos zeram transform). Não mudar o spring `SPRING.pill` sem mudar `headcard-pills.tsx` junto — é a mesma peça em todas as superfícies.

---

## (c) Coreografia por página/componente

Legenda de gatilho: **M** = montagem (com dados prontos), **V** = entra na tela (IO, `once`, `rootMargin: 0px 0px -10% 0px`), **H** = hover (só `(hover:hover) and (pointer:fine)`), **T** = toque/clique, **D** = dado mudou, **R** = retorno de fluxo (querystring).
Lib: **FM** = framer-motion, **CSS** = transição/keyframe CSS, **—** = estático.

### c.1 Casca e headcard (todas as páginas)

| Gatilho | Elemento | Propriedades | Valores | Lib |
|---|---|---|---|---|
| — | `TechBackdrop` (fundo) | nenhuma | estático, sempre | — |
| M (1×/sessão, `sessionStorage` `esp:hc`) | Chip "Esportes" (`-rotate-2`) | CARIMBO: `scale`, `rotate`, `opacity` | `1.6→1`, `-10°→-2°`, `0→1`, `SPRING.stamp`, delay 0.12 s | FM |
| M (1×/sessão) | Selo do canto (Plataforma/Dumbbell) | RECORTE curto: `y`, `opacity` | `-10→0`, `0→1`, `DUR.base`, delay 0.18 s | FM |
| M (toda navegação entre salas) | Título `h1` (nome da sala) | máscara reta: filho `y: 100%→0` dentro de `span` com `overflow:hidden` **só no h1** | `DUR.enter`, `EASE.paper` | FM |
| M | Foto 2/3 | **nada** | estática | — |
| T / H | `PillStack` | **intocado** (spring `x` existente) | — | FM (existente) |
| — | Banner, ícone gigante Dumbbell, gradiente | nenhuma | estáticos (camada do tamanho do card, não da janela, mas é a maior do topo; paralaxe nela custaria composição contínua sem ganho) | — |
| — | Bolinha `animate-pulse` do `@username` | **trocar por estática** | o pulso infinito é um loop sem significado; o spec visual decide a cor | — |

⚠️ **Não quebrar os pills atrás da foto:**
- Nada de `overflow:hidden`, `opacity`, `transform`, `filter` ou `will-change` no **contêiner da coluna da foto** (`div.relative.shrink-0`) nem na linha `relative z-20 -mt-24`. Um `transform` ali cria contexto de empilhamento novo; hoje ele não inverteria a ordem (foto continua depois no DOM), mas um `overflow:hidden` de máscara cortaria os pills, e um `opacity` animado num pai faz a pilha piscar junto. A máscara do RECORTE fica **só no `h1`**.
- Nada de TiltCard no headcard: `rotateX/Y` com `perspective` faz a foto e os pills (que estão em `x` próprio) se intersectarem em 3D no Safari.
- A sombra do headcard (`HEADCARD_SHADOW`) é `box-shadow` estático — fica.

### c.2 `/esportes` (início: abas + feed)

| Gatilho | Elemento | Propriedades | Valores | Lib |
|---|---|---|---|---|
| T | Aba (Geral / Meu esporte / academia) | PRENSA no toque; o marcador laranja ativo **desliza** entre abas (`layoutId="esp-tab"` num `span` absoluto atrás do texto) | `SPRING.pill`; o marcador anima só `transform` (layoutId usa transform) | FM |
| D (troca de aba) | Lista de posts | crossfade curto do contêiner (`opacity 1→0` em `DUR.quick`, novo `0→1` em `DUR.base`); **sem cascata** nos cards | `AnimatePresence mode="wait"` só no wrapper | FM |
| V | `PortfolioPostCard` | **nada** (é memoizado, é o feed da casa inteira; animação por card em lista longa custa e briga com o player de vídeo) | — | — |
| M | Esqueleto (3 blocos `animate-pulse`) | manter o pulso CSS existente, mas **só opacity** e parar ao carregar | — | CSS |
| T | "Publicar" (`PublishMenuButton`) | não mexer na peça compartilhada (regra 12) — se ganhar PRENSA, ganha em todas as superfícies, no arquivo dela | — | — |
| T | Trocar aba via pill/painel | `startTransition` no `setTab` (regra do projeto: abrir painel por pill = transição) | — | React |

### c.3 `/esportes/academia` — calendário de frequência + mensalidades

**Calendário-objeto** (topo laranja com argolas, grade de dias, ✓ verdes e ✗ vermelhos):

| Gatilho | Elemento | Propriedades | Valores | Lib |
|---|---|---|---|---|
| V (1×) | Cartão do calendário | RECORTE | `cutIn` | FM |
| V (após o recorte, +0.12 s) | Marcas ✓/✗ dos dias **passados** | CARIMBO em cascata na ordem do dia (1→hoje) | `scale DIST.stampFrom→1`, `rotate stampAngle(dia)±0→ângulo final (±7°)`, `opacity 0→1`; `SPRING.stamp`; passo `stepFor(n, 0.022)` → 30 dias ≈ 0,6 s | FM |
| V (fim da cascata) | Marca de **hoje** | último carimbo, maior (`1.9→1`) + o cartão inteiro dá o tranco: corpo `y: 0→2→0` em 0.16 s | sem mexer na sombra-bloco (ela fica, o papel desce) | FM |
| — | Dias futuros | estáticos, sem marca | — | — |
| V/D | Contador "X dias no mês" e "sequência N" | PLACAR do 0 ao valor, começa junto com a cascata e termina junto (duração = tempo da cascata, mín. `DUR.count`) | `EASE.score` | FM (`animate()` imperativo) |
| T | Botões ‹ › | PRENSA | `SPRING.press` | FM |
| T (‹ ou ›) | Folha do mês | FOLHA direcional: **›** a folha atual `rotateX 0→-95°` (sobe por cima das argolas) e some (`opacity` 1→0 nos últimos 30%); a nova está embaixo, parada. **‹** a folha anterior entra `rotateX 95°→0` (cai das argolas). `transform-origin: 50% 0`, `perspective: 900px` no pai (o cartão, não a página). | `DUR.sheet`, `EASE.sheet` | FM (`AnimatePresence mode="popLayout"`, `custom={dir}`) |
| D (mês novo pronto) | Marcas do mês novo | cascata de carimbo **mais curta** (`maxTotal 0.35 s`) | — | FM |
| D (‹ › rápido: < 300 ms desde o último) | Marcas | **sem cascata**: aparecem já carimbadas (`initial={false}`) — quem está folheando quer ver, não assistir | — | FM |
| H / giroscópio | Cartão | INCLINAÇÃO ≤ 6°, sombra-bloco desliza ao contrário até 4 px; argolas ficam no plano do cartão | `SPRING.tilt` via `useSpring` | FM |
| fora da tela / aba oculta | Tilt | desliga listeners (IO + `visibilitychange`) e volta a 0 | — | — |

Interrupção: a folha é chaveada pelo mês (`key="2026-10"`); `popLayout` tira a folha que sai do fluxo, então um segundo clique no meio da virada **começa a próxima virada imediatamente** e a anterior termina sozinha por cima (no máximo 2 folhas no DOM; a 3ª força `mode` a cortar a mais velha). Os botões nunca ficam desabilitados por animação.

**Mensalidades (lista) e botão "Pagar":**

| Gatilho | Elemento | Propriedades | Valores | Lib |
|---|---|---|---|---|
| V (1×) | Faixa de cabeçalho "Mensalidades" | RECORTE | `cutIn` | FM |
| V (1×) | Linhas | RECORTE em cascata, `y: 10` (menor), sem rotação | passo `stepFor(n, 0.035)`; teto 6 linhas animam, o resto aparece junto com a 6ª | FM |
| H | Linha | sombra-bloco aparece (`opacity 0→1`, `x/y 0→4`) | `DUR.instant` | FM |
| T | "Pagar" | PRENSA (`whileTap`) | `SPRING.press` | FM |
| T → carregando | "Pagar" | o rótulo troca por "Abrindo…" em **crossfade** (`opacity` + `y: 6→0`, `DUR.instant`), largura **travada** (`min-width` medido na montagem, sem pular layout); dentro do botão, uma **faixa listrada** (div absoluto 200% de largura com `repeating-linear-gradient`) desliza com `translateX` em loop linear 0.6 s — listra de fita de obra, composta, não `background-position` | loop só enquanto `loading === true` | FM / CSS `@keyframes` só com transform |
| redireciona | página | **nenhuma animação de saída** — `window.location.assign(url)` assim que o checkout responde; animar a saída atrasaria o pagamento | — | — |
| erro | "Pagar" | volta ao rótulo; o botão faz um "não" de 2 batidas (`x: 0,-4,4,-2,0`, 0.28 s) + toast existente (sonner) | — | FM |
| R (volta do checkout com o pagamento confirmado) | Chip de status da linha | de "Pendente/Atrasado" para **"PAGO"** com CARIMBO verde (`scale 1.6→1`, `rotate -8°→-3°`); a linha dá o tranco de 2 px; 1× por pagamento (`sessionStorage` `esp:paid:<external_id>`) | `SPRING.stamp` | FM |
| R (ainda pendente/processando) | Chip | "Processando" com a mesma faixa listrada em loop, só enquanto a linha está na tela (IO) e por no máx. 60 s; ao mudar para pago → carimbo | — | FM |

### c.4 `/esportes/indicadores`

| Gatilho | Elemento | Propriedades | Valores | Lib |
|---|---|---|---|---|
| carregando | lugar dos tiles | **esqueleto com a forma final** (8 caixas no grid) em vez do `Loader2` central — evita o salto de layout quando os dados chegam; esqueleto estático (sem shimmer) ou pulso de opacity | — | CSS |
| M/V (1×) | 8 tiles KPI | RECORTE em cascata pela ordem de leitura (linha a linha) | `cutIn`, passo `stepFor(8, 0.05)` | FM |
| M/V | Número de cada tile | PLACAR (0→valor), começa 0.08 s após o tile entrar; decimal respeita a casa (`toFixed(1)`, vírgula pelo `useLocale`); unidades (`kg`, `L`, `dias`) **não contam**, ficam paradas ao lado | `DUR.count`, `EASE.score` | FM |
| M/V | Chip da classe do IMC | CARIMBO depois que o número chega | `SPRING.stamp` | FM |
| M/V | Escala do IMC (se o visual criar a régua semáforo) | marcador desliza de 0 até a posição com `x` (em px medidos, não `left`) | `DUR.draw`, `EASE.paper` | FM |
| M/V | Seta de tendência do peso | entra girando do neutro (`rotate 0→±35°`) | `SPRING.stamp` | FM |
| V (1×) | Barras de 14 dias (kcal e água) | cada barra tem altura final no CSS e anima **`scaleY 0→1`** com `transform-origin: bottom`; cascata da esquerda para a direita | passo `stepFor(14, 0.02)`, cada `DUR.enter`, `EASE.paper` | FM |
| V | Linha de meta tracejada | `scaleX 0→1` (origem à esquerda) **antes** das barras | `DUR.enter` | FM |
| V | Barra de hoje (última) | depois de crescer, um carimbo "HOJE" pequeno no topo | `SPRING.stamp` | FM |
| V (1×) | Linha do peso (SVG) | `pathLength 0→1` na `polyline` (vira `path`), marcadores quadrados carimbam em sequência atrás da ponta do traço; rótulo final (`72,4 kg`) entra com PLACAR | `DUR.draw`, `EASE.ink` | FM |
| V (1×) | Barra de macros (3 segmentos) | cada segmento `scaleX 0→1` em sequência (proteína → carbo → gordura), origem à esquerda | passo 0.12 s | FM |
| V (1×) | Anéis (`RingMeter`, se o visual adotar: aderência de kcal/água na meta, frequência) | traço com `strokeLinecap="butt"` (canto reto, regra 2) e **segmentado** (marcas a cada 10%) anima `pathLength 0→pct`; número no centro em PLACAR | `DUR.draw`, `EASE.ink` | FM |
| H | Barra individual | `opacity 0.8` (já existe via `group-hover`) + tooltip existente | — | CSS |
| T | Tile | PRENSA (só se o tile for clicável; tile só-leitura não reage) | — | FM |
| D (recarga) | números | recontam **do valor anterior ao novo**, sem refazer cascata | — | FM |

### c.5 `/esportes/historico`

| Gatilho | Elemento | Propriedades | Valores | Lib |
|---|---|---|---|---|
| V (1×) | Card "Peso & altura" | RECORTE + PLACAR no peso | `cutIn`, `DUR.count` | FM |
| V (1×) | Lista "Os seus dias" | RECORTE nas 8 primeiras linhas | `stepFor(8, 0.035)` | FM |
| V (1×) | Barrinhas kcal/água de cada linha | `scaleX 0→pct` (largura final 100% + `scaleX`), origem à esquerda, junto com a linha | `DUR.enter` | FM |
| T | Linha do dia | PRENSA leve (1,5 px) e o dia abre no topo: o bloco do "Meu dia" faz crossfade curto (`DUR.base`) e a página rola até ele com `scrollIntoView({behavior: reduce ? "auto" : "smooth"})` | — | FM |
| T | Modal de medição | entrada: fundo `opacity 0→0.8` (`DUR.base`); caixa RECORTE (`y 24→0`, `rotate -1.5→0`); saída: `opacity→0`, `y→8`, `DUR.quick`, `EASE.exit` | `AnimatePresence` | FM |
| D (medição salva) | Primeira linha da lista de medições | entra de cima (`y -10→0`) e o peso grande reconta do anterior ao novo | — | FM |
| — | Lista com `max-h-64 overflow-y-auto` | itens além do topo **não animam** | — | — |

### c.6 `/esportes/treino` (ficha do dia)

> **Substituído pela seção (g) — Checklist do treino**, que detalha o toque do check, o placar e o grand finale. A linha abaixo fica só como resumo.

| Gatilho | Elemento | Propriedades | Valores | Lib |
|---|---|---|---|---|
| T | Check de exercício | ver §g (`<CheckButton>`) | — | FM |
| D (todos marcados) | Card da ficha | grand finale "TREINO CONCLUÍDO" (§g.7), 1×/ficha/dia | — | FM |
| T | Modal grande da ficha | mesmo par entrada/saída do modal de medição; o modal usa o MESMO `<CheckButton>` e o MESMO placar | — | FM |

### c.7 Vitrine `/academias`

| Gatilho | Elemento | Propriedades | Valores | Lib |
|---|---|---|---|---|
| M | Masthead | igual ao headcard (chip carimba 1×/sessão, título com máscara) | — | FM |
| V (1×) | Mini-headcards de academia | RECORTE em cascata por linha do grid (no celular, 1 por vez ao entrar) | `stepFor(n, 0.05)`, teto 6 | FM |
| H | Mini-headcard | INCLINAÇÃO (≤ 4°) **só ponteiro fino**, e só o card sob o mouse; sombra-bloco desliza | `SPRING.tilt` | FM |
| T | Mini-headcard (link) | PRENSA no `pointerdown` | — | FM |
| D (busca) | Resultados | crossfade do contêiner, **sem** cascata a cada tecla (debounce já existe) | `DUR.quick` | FM |

### c.8 Página da academia `/academias/[slug]` (academy-view, feed, training-grid)

| Gatilho | Elemento | Propriedades | Valores | Lib |
|---|---|---|---|---|
| M | Headcard da academia | regras de c.1 (pills intocados; selo "vinculados" com PLACAR) | — | FM |
| V (1×) | "Meu vínculo", Professores, Destaque do mês | RECORTE em cascata | `stepFor(3, 0.05)` | FM |
| V (1×) | Destaque do mês | foto com CARIMBO de "#1" | `SPRING.stamp` | FM |
| — | Mural (`AcademyFeed` → `PortfolioPostCard`) | **nada** (mesma razão do feed) | — | — |
| — | `training-grid` (ferramenta do professor: tabela de 9 colunas, editor, biblioteca) | **nada** além de PRENSA nos botões e entrada/saída dos modais — tela de trabalho, quem usa quer velocidade | — | FM |
| — | `partner-key-card`, `whatsapp-forward-card` | revelar chave: crossfade do valor; copiar: o ícone vira ✓ com carimbo pequeno | `DUR.instant` | FM |

### c.9 Ranking da academia `/academias/[slug]/ranking`

| Gatilho | Elemento | Propriedades | Valores | Lib |
|---|---|---|---|---|
| V (1×) | Pódio (3 colunas) | pedestais crescem `scaleY 0→1` (origem embaixo) na ordem 2º → 3º → 1º; foto rasgada cai por cima com CARIMBO; coroa do #1 por último | passo 0.12 s; `SPRING.stamp` | FM |
| V (1×) | Valores do pódio | PLACAR | `DUR.count` | FM |
| V (1×) | Lista inteira | RECORTE nas 10 primeiras linhas | `stepFor(10, 0.035)` | FM |
| T (troca de métrica) | Pódio e lista | FOLHA curta (`rotateX` 0→-60° + fade, `DUR.base`) no contêiner e recontagem; sem refazer a cascata | — | FM |

> O `/ranking` global faz o mesmo com GSAP (`back.out(1.4)`, stagger 0.16). Aqui fica **em framer** para não puxar GSAP + ScrollTrigger para o chunk da rota; o desenho do movimento é o mesmo (ordem 2-3-1, overshoot ~8%) — o `SPRING.stamp` equivale ao `back.out(1.4)` de lá.

### c.10 Membros `/academias/[slug]/membros`

Tela de trabalho (duas tabelas largas). Só: RECORTE do bloco inteiro na montagem (1 elemento, não por linha), PRENSA em botões, bolinha de "ficha vencida" **estática**. Sem cascata por linha (lista pode ter centenas).

### c.11 Painel do dono — recebimentos e repasses (peça nova)

| Gatilho | Elemento | Propriedades | Valores | Lib |
|---|---|---|---|---|
| V (1×) | Card-herói "Recebido no mês" | RECORTE + PLACAR em moeda (`Intl.NumberFormat(locale, {style:"currency", currency:"BRL"})` aplicado a cada quadro no `textContent`) | `DUR.countLong`, `EASE.score` | FM |
| V (1×) | 3 mini-totais (A receber / Em retenção / Repassado) | RECORTE em cascata + PLACAR cada | `stepFor(3, 0.05)` | FM |
| V (1×) | Barra de composição (bruto → tarifa → líquido) | segmentos `scaleX` em sequência; o segmento da tarifa entra **depois** e "come" a barra (o líquido encolhe com `scaleX` 1→fração) — mostra de onde sai a tarifa | passo 0.15 s | FM |
| V (1×) | Linha do tempo do repasse (pendente → em retenção → liberado → pago) | o fio entre etapas `scaleX 0→1` até a etapa atual; a etapa atual CARIMBA; etapas futuras paradas | `DUR.draw` | FM |
| V (1×) | Lista de lançamentos | RECORTE nas 8 primeiras linhas | `stepFor(8, 0.035)` | FM |
| D (repasse mudou de status por evento socket) | Chip da linha | CARIMBO no novo status; total reconta do anterior ao novo | — | FM |
| T | "Sacar"/"Solicitar repasse" | PRENSA + estado de carregamento igual ao "Pagar" | — | FM |

> Valores de dinheiro: **nunca** animar quando o número for usado para decisão em tempo real (ex.: campo de valor do saque). Placar só nos totais de leitura.

---

## (d) Primitivos reutilizáveis (esqueleto)

Pasta sugerida: `app/(header-only)/esportes/_components/ui/`. Todos `"use client"`, só `transform`/`opacity` (exceto `RingMeter`, ver §f), limpam o que abrem, respeitam reduced-motion.

### d.0 Contexto: `MotionConfig` na casca e hook `useInViewOnce`

```tsx
// fitness-shell.tsx (alteração mínima)
import { MotionConfig } from "framer-motion"
// ...
<div className="relative z-10">
  <MotionConfig reducedMotion="user">{enabled ? children : /* aviso */}</MotionConfig>
</div>
```

```ts
// ui/use-in-view-once.ts — IO uma vez, sem cache de posição (mesma razão de lib/scroll-reveal.ts)
import { useInView } from "framer-motion"
import type { RefObject } from "react"
export function useInViewOnce(ref: RefObject<Element | null>, margin = "0px 0px -10% 0px") {
  return useInView(ref, { once: true, margin: margin as `${number}px ${number}px ${number}px ${number}px` })
}
```

### d.1 `<Reveal>` — RECORTE e cascata

```tsx
// ui/reveal.tsx
"use client"
import { motion, useReducedMotion } from "framer-motion"
import { Children, useRef, type ReactNode } from "react"
import { useInViewOnce } from "./use-in-view-once"
import { DUR, DIST, EASE, stepFor, STAGGER } from "./motion"

export function Reveal({
  children,
  step = STAGGER.tiles,
  max = 8,            // a partir do 9º, aparece junto com o 8º
  as = "div",
  className,
}: { children: ReactNode; step?: number; max?: number; as?: "div" | "ul"; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInViewOnce(ref)
  const reduce = useReducedMotion()
  const items = Children.toArray(children)
  const s = stepFor(Math.min(items.length, max), step)
  const Tag = as === "ul" ? motion.ul : motion.div

  return (
    <Tag ref={ref} className={className} initial="hidden" animate={inView ? "show" : "hidden"}>
      {items.map((child, i) => (
        <motion.div
          key={(child as { key?: string }).key ?? i}
          variants={{
            hidden: reduce ? { opacity: 0 } : { opacity: 0, y: DIST.cutY, rotate: DIST.cutRotate },
            show: {
              opacity: 1, y: 0, rotate: 0,
              transition: { duration: reduce ? DUR.base : DUR.enter, ease: EASE.paper, delay: Math.min(i, max - 1) * s },
            },
          }}
        >
          {child}
        </motion.div>
      ))}
    </Tag>
  )
}
```
Notas: o `motion.div` filho não leva classes de layout (o grid fica no pai via `className`; se o filho precisa ser a célula do grid, passar `display: contents` não serve para transform — então o `Reveal` **é** o grid e cada filho vira a célula). Sem SSR: `initial="hidden"` só no cliente — as páginas do escopo já são client-only e montam após o fetch, então não há "flash" de conteúdo do servidor.

### d.2 `<TiltCard>` — INCLINAÇÃO com sombra-bloco

```tsx
// ui/tilt-card.tsx
"use client"
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion"
import { useEffect, useRef, type ReactNode } from "react"
import { DIST, SPRING } from "./motion"

const canHover = () => typeof window !== "undefined" && matchMedia("(hover: hover) and (pointer: fine)").matches
// iOS exige DeviceOrientationEvent.requestPermission() num gesto: NÃO pedimos (prompt invasivo por enfeite).
const gyroFree = () =>
  typeof window !== "undefined" && "DeviceOrientationEvent" in window &&
  typeof (DeviceOrientationEvent as unknown as { requestPermission?: unknown }).requestPermission !== "function"

export function TiltCard({ children, shadow = "#0B0B0D", max = DIST.tiltMax, className }: {
  children: ReactNode; shadow?: string; max?: number; className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const nx = useMotionValue(0) // -1..1
  const ny = useMotionValue(0)
  const sx = useSpring(nx, SPRING.tilt)
  const sy = useSpring(ny, SPRING.tilt)
  const rotateY = useTransform(sx, (v) => v * max)
  const rotateX = useTransform(sy, (v) => -v * max)
  const shX = useTransform(sx, (v) => DIST.shadow - v * DIST.tiltShadow)
  const shY = useTransform(sy, (v) => DIST.shadow - v * DIST.tiltShadow)

  useEffect(() => {
    const el = ref.current
    if (!el || reduce) return
    let visible = false
    let rect: DOMRect | null = null
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; rect = null; if (!visible) { nx.set(0); ny.set(0) } })
    io.observe(el)
    const onMove = (e: PointerEvent) => {
      if (!visible) return
      rect ??= el.getBoundingClientRect() // lê layout 1× por entrada, não por quadro
      nx.set(((e.clientX - rect.left) / rect.width) * 2 - 1)
      ny.set(((e.clientY - rect.top) / rect.height) * 2 - 1)
    }
    const onLeave = () => { rect = null; nx.set(0); ny.set(0) }
    const onOrient = (e: DeviceOrientationEvent) => {
      if (!visible || document.hidden || e.gamma == null || e.beta == null) return
      nx.set(Math.max(-1, Math.min(1, e.gamma / 25)))
      ny.set(Math.max(-1, Math.min(1, (e.beta - 45) / 25)))
    }
    const onScroll = () => { rect = null }
    if (canHover()) {
      el.addEventListener("pointermove", onMove)
      el.addEventListener("pointerleave", onLeave)
      window.addEventListener("scroll", onScroll, { passive: true })
    } else if (gyroFree()) {
      window.addEventListener("deviceorientation", onOrient)
    }
    return () => {
      io.disconnect()
      el.removeEventListener("pointermove", onMove)
      el.removeEventListener("pointerleave", onLeave)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("deviceorientation", onOrient)
    }
  }, [reduce, nx, ny])

  return (
    <div ref={ref} className={`relative ${className ?? ""}`} style={{ perspective: 900 }}>
      {/* A SOMBRA DURA É UM OBJETO: bloco atrás, movido por transform. */}
      <motion.span aria-hidden className="absolute inset-0" style={{ background: shadow, x: shX, y: shY }} />
      <motion.div className="relative" style={{ rotateX, rotateY, transformStyle: "flat" }}>
        {children}
      </motion.div>
    </div>
  )
}
```
Regras: no máximo **2 TiltCard por tela**; nunca em headcard, lista ou feed. Sem `preserve-3d` (filhos não precisam de profundidade; flat é mais barato e evita bug de Safari).

### d.3 `<CountUp>` — PLACAR

```tsx
// ui/count-up.tsx
"use client"
import { animate, useReducedMotion } from "framer-motion"
import { useEffect, useRef } from "react"
import { useInViewOnce } from "./use-in-view-once"
import { DUR, EASE } from "./motion"

export function CountUp({ value, format, duration = DUR.count, delay = 0, className }: {
  value: number
  /** Formata cada quadro (casas, vírgula pelo locale, moeda). Estável (useCallback/useMemo). */
  format: (n: number) => string
  duration?: number; delay?: number; className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInViewOnce(ref)
  const reduce = useReducedMotion()
  const shown = useRef(0) // de onde a próxima contagem parte (recarga reconta do anterior)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!inView) { el.textContent = format(shown.current); return }
    if (reduce) { el.textContent = format(value); shown.current = value; return }
    const ctrl = animate(shown.current, value, {
      duration, delay, ease: EASE.score,
      onUpdate: (n) => { el.textContent = format(n); shown.current = n }, // DOM direto: zero re-render React por quadro
      onComplete: () => {
        el.textContent = format(value)
        el.animate([{ transform: "translateY(-2px)" }, { transform: "none" }], { duration: 140, easing: "ease-out" }) // o "clique" final
      },
    })
    return () => ctrl.stop()
  }, [inView, value, reduce, duration, delay, format])

  // tabular-nums + largura mínima do valor final = o número não empurra o layout enquanto conta
  return (
    <span ref={ref} className={`tabular-nums ${className ?? ""}`} style={{ minWidth: `${format(value).length}ch`, display: "inline-block" }}
      aria-label={format(value)} aria-live="off">
      {format(value)}
    </span>
  )
}
```
Notas: o texto inicial no SSR/primeiro render é o **valor final** (leitor de tela e quem rola rápido veem o número certo); ao montar fora da tela, o efeito troca para o valor de partida só quando o IO confirma que vai contar. `aria-label` fixo no valor final para não narrar a contagem.

### d.4 `<StampMark>` — CARIMBO

```tsx
// ui/stamp-mark.tsx
"use client"
import { motion, useReducedMotion } from "framer-motion"
import type { ReactNode } from "react"
import { DIST, DUR, SPRING, stampAngle } from "./motion"

export function StampMark({ id, play, delay = 0, from = DIST.stampFrom, children, className }: {
  /** Chave estável: dá o ângulo e a identidade do carimbo. */
  id: string
  /** false = já carimbado, sem animação (folheando rápido, reduced, revisita). */
  play: boolean
  delay?: number; from?: number; children: ReactNode; className?: string
}) {
  const reduce = useReducedMotion()
  const angle = stampAngle(id)
  const animated = play && !reduce
  return (
    <motion.span
      className={`inline-grid place-items-center ${className ?? ""}`}
      initial={animated ? { opacity: 0, scale: from, rotate: angle * 2 } : false}
      animate={{ opacity: 1, scale: 1, rotate: angle }}
      transition={animated ? { ...SPRING.stamp, delay, opacity: { duration: DUR.instant, delay } } : { duration: 0 }}
    >
      {children}
    </motion.span>
  )
}
```
O "tranco" do papel embaixo é responsabilidade do pai (ex.: o calendário escuta o `onAnimationComplete` do carimbo de hoje e anima o próprio `y`), para não ter 31 pais tremendo.

### d.5 `<RingMeter>` — anel segmentado de canto reto

```tsx
// ui/ring-meter.tsx
"use client"
import { motion, useReducedMotion } from "framer-motion"
import { useRef } from "react"
import { useInViewOnce } from "./use-in-view-once"
import { DUR, EASE } from "./motion"

export function RingMeter({ pct, color, size = 96, stroke = 10, label }: {
  pct: number; color: string; size?: number; stroke?: number; label: React.ReactNode
}) {
  const ref = useRef<SVGSVGElement>(null)
  const inView = useInViewOnce(ref)
  const reduce = useReducedMotion()
  const r = (size - stroke) / 2
  const p = Math.max(0, Math.min(1, pct / 100))
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg ref={ref} viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="-rotate-90" aria-hidden>
        {/* trilho segmentado: 10 marcas = régua de placar, não donut liso */}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1D1810" strokeWidth={stroke}
          strokeDasharray={`${(2 * Math.PI * r) / 10 - 2} 2`} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="butt" /* canto reto (regra 2) */
          initial={{ pathLength: reduce ? p : 0 }}
          animate={{ pathLength: inView ? p : reduce ? p : 0 }}
          transition={{ duration: reduce ? 0 : DUR.draw, ease: EASE.ink }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{label /* normalmente um <CountUp> */}</div>
    </div>
  )
}
```
`pathLength` anima `stroke-dashoffset` (paint, não composição). É aceito **só** aqui e na linha de peso porque: SVG ≤ 120×120 px, animação única (não loop), ≤ 4 anéis por tela. Ver §f.

### d.6 `<MonthSheet>` — FOLHA (troca de mês)

```tsx
// ui/month-sheet.tsx
"use client"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { useRef, type ReactNode } from "react"
import { DUR, EASE } from "./motion"

/** dir: +1 avançou (›), -1 voltou (‹). `monthKey` = "2026-10". */
export function MonthSheet({ monthKey, dir, children }: { monthKey: string; dir: 1 | -1; children: (fast: boolean) => ReactNode }) {
  const reduce = useReducedMotion()
  const last = useRef(0)
  const now = typeof performance !== "undefined" ? performance.now() : 0
  const fast = now - last.current < 300 // folheando: carimbos sem cascata
  last.current = now

  const variants = {
    enter: (d: number) => (reduce ? { opacity: 0 } : d > 0 ? { opacity: 1, rotateX: 0 } : { opacity: 0, rotateX: 95 }),
    center: { opacity: 1, rotateX: 0, transition: { duration: reduce ? DUR.quick : DUR.sheet, ease: EASE.sheet } },
    exit: (d: number) =>
      reduce ? { opacity: 0, transition: { duration: DUR.quick } }
      : d > 0 ? { rotateX: -95, opacity: [1, 1, 0], transition: { duration: DUR.sheet, ease: EASE.sheet, times: [0, 0.7, 1] } }
      : { opacity: 0, transition: { duration: DUR.quick } },
  }

  return (
    <div className="relative" style={{ perspective: 900 }}>
      <AnimatePresence mode="popLayout" initial={false} custom={dir}>
        <motion.div key={monthKey} custom={dir} variants={variants} initial="enter" animate="center" exit="exit"
          style={{ transformOrigin: "50% 0%", backfaceVisibility: "hidden" }}
          className="relative">
          {children(fast)}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
```
Uso: as argolas e o topo laranja ficam **fora** do `MonthSheet` (não viram; a folha passa por baixo delas — o topo tem `z-index` acima da folha). A folha que sai fica por cima da que entra no avanço (a nova "estava embaixo"); no retorno a nova cai por cima. `fast` é repassado ao grid para `StampMark play={!fast}`.

### d.7 `<Press>` — PRENSA (botões)

```tsx
// ui/press.tsx
"use client"
import { motion } from "framer-motion"
import type { ComponentProps } from "react"
import { DIST, SPRING } from "./motion"

/** Botão com sombra-bloco: o corpo desce, a sombra recua. Substitui a sombra em box-shadow nos botões de ação. */
export function PressButton({ shadow = "#0B0B0D", className, children, ...rest }: ComponentProps<typeof motion.button> & { shadow?: string }) {
  return (
    <span className="relative inline-flex">
      <motion.span aria-hidden className="absolute inset-0" style={{ background: shadow }}
        initial={false} animate={{ x: 3, y: 3 }} whileTap={{ x: 3 - DIST.press, y: 3 - DIST.press }} transition={SPRING.press} />
      <motion.button whileTap={{ x: DIST.press, y: DIST.press }} transition={SPRING.press} className={`relative ${className ?? ""}`} {...rest}>
        {children}
      </motion.button>
    </span>
  )
}
```
(O `whileTap` do pai não propaga ao irmão; na implementação real o estado `pressed` vem de `onTapStart/onTap/onTapCancel` do botão e dirige os dois `animate`. Esqueleto mostra a intenção.)

---

## (e) Orçamento de desempenho e como medir

### Orçamento

| Item | Limite |
|---|---|
| JS novo | **0 lib nova.** framer-motion já está no chunk (headcard-pills). Primitivos ≈ 3–4 KB gz no total. GSAP **não entra** nas rotas do escopo. |
| Elementos animando ao mesmo tempo | ≤ 40 (calendário: 31 carimbos + contador; indicadores: 8 tiles + 28 barras é o pior caso — as barras só começam quando o gráfico entra na tela, não junto com os tiles). |
| Duração de cascata | ≤ 0,6 s (`STAGGER.maxTotal`) + duração do último item ≤ 0,95 s do primeiro ao último quadro. |
| Loops infinitos | Só: faixa listrada do "Pagar"/"Processando" (enquanto o estado durar e o elemento estiver na tela; máx. 60 s) e esqueleto de carregamento (some ao carregar). Nenhum outro. |
| Listeners contínuos | Tilt: `pointermove` só no próprio cartão; `deviceorientation` só com o cartão na tela e a aba visível; ≤ 2 por página. |
| Leituras de layout por quadro | 0 (`getBoundingClientRect` 1× por entrada do ponteiro / rolagem). |
| Re-render React por quadro | 0 (CountUp escreve `textContent`; tilt e springs via MotionValue). |
| Camadas compostas extras | só durante a animação (o framer remove o `will-change` ao terminar; **não** pôr `will-change` fixo em CSS). |
| CLS causado por motion | 0 (CountUp com `tabular-nums` + `min-width`; esqueleto com a forma final; barras com altura final no layout e `scaleY`). |
| INP em ‹ ›, "Pagar", abas | < 200 ms no Moto G/Galaxy A (a animação nunca bloqueia o handler; `startTransition` nas trocas de painel). |
| Quadros | 60 fps no notebook; ≥ 50 fps sustentado com CPU 4× no DevTools durante a cascata do calendário. |

### Como medir

1. **DevTools › Performance**, perfil "Mid-tier mobile" (CPU 4×, rede 4G rápida), gravar: abrir `/esportes/academia` → cascata → ‹ › 5× rápido → "Pagar" (interromper antes do redirect). Critério: nenhuma *long task* > 50 ms atribuída a script de animação; faixa "Frames" sem quadros vermelhos durante a cascata.
2. **Rendering › Paint flashing + Layer borders**: em repouso (nada animando), **nenhum flash verde** na página; durante a cascata, flash só nos carimbos/anéis (nunca no fundo, no banner nem no feed). Com a rolagem, zero flash no `TechBackdrop`.
3. **Long Animation Frames** (Chrome 123+), em dev: `new PerformanceObserver(l => l.getEntries().forEach(e => e.duration > 50 && console.warn("LoAF", e))).observe({ type: "long-animation-frame", buffered: true })` — colar no console durante o QA, não deixar no código (regra: `console.*` não vai para produção).
4. **Web Vitals reais**: conferir INP e CLS das rotas `/esportes/*` no painel Speed Insights da Vercel antes e 7 dias depois do deploy.
5. **Reduced motion**: DevTools › Rendering › "Emulate CSS prefers-reduced-motion: reduce" — refazer o roteiro: números aparecem prontos, folha vira em corte seco/fade, nenhum `rotate`/`scale`/`y`, tilt desligado, faixa listrada parada (só o texto "Abrindo…").
6. **Celular real**: Android de entrada com o giroscópio (tilt) e iPhone (sem tilt, confirmar que nenhum prompt de permissão aparece).
7. **Harness**: ao implementar, um script de Playwright no padrão das harnesses do projeto que abre cada rota com `reducedMotion: "reduce"` e `"no-preference"` e tira print no fim da cascata (o estado final tem que ser idêntico nos dois).

---

## (f) O que NÃO animar

- **O fundo** (`TechBackdrop`) e qualquer camada do tamanho da janela — nem paralaxe, nem gradiente, nem partícula, nem canvas. Regra do projeto, com incidente documentado.
- **`box-shadow`, `width`, `height`, `left/top`, `background-position`, `filter: blur`, `backdrop-filter`** — tudo isso é layout ou paint. Sombra mexe via bloco irmão; largura/altura via `scaleX/scaleY`; posição via `x/y`. Exceção única e documentada: `pathLength` (stroke-dashoffset) em SVG pequeno, 1×, no `RingMeter` e na linha de peso.
- **Os pills do headcard** — já animam; não envolver, não mascarar, não mudar a mola, não pôr transform/opacity/overflow no contêiner da foto.
- **A foto do headcard e o banner** — sem tilt, sem zoom, sem Ken Burns.
- **O feed** (`PortfolioPostCard`, mural da academia, Curtos) — memoizado, com vídeo montado a 600 px; animação por card em lista longa contraria a regra 7 e acorda timers.
- **Tabelas de trabalho** (membros, grade de treinos do professor, editor de ficha, biblioteca de exercícios): nada além de PRENSA e modal. Quem trabalha nelas quer velocidade.
- **Campos de formulário e valores editáveis** (peso no modal, valor de saque): nunca contar/animar um número que a pessoa está digitando ou conferindo para decidir.
- **Navegação para o checkout** — sem animação de saída; o redirect sai assim que a URL chega.
- **Loops sem significado**: a bolinha `animate-pulse` do `@username`, shimmer de esqueleto, ícones girando de enfeite, "respiração" de cards. O único `animate-spin` que fica é o `Loader2` em botão ocupado (pequeno, enquanto durar).
- **Revisita**: voltar a rolar até um bloco já revelado não repete a entrada; recarga de dados não refaz cascata (só reconta números).
- **Carimbo em dia futuro**, carimbo em massa ao folhear rápido (`fast`), carimbo "PAGO" repetido a cada visita (`sessionStorage`).
- **Hover em toque**: nada de efeito que dependa de hover em dispositivo sem ponteiro fino (o tilt por mouse e a sombra de hover de linha só existem com `(hover:hover) and (pointer:fine)`).
- **GSAP/ScrollTrigger e Lenis** nestas rotas — custo de bundle sem ganho; ScrollTrigger ainda tem o problema de posição cacheada já registrado em `lib/scroll-reveal.ts`.

---

## Ordem sugerida de implementação (para quem pegar o plano)

1. `ui/motion.ts` + `use-in-view-once.ts` + `MotionConfig` na `FitnessShell`.
2. `CountUp`, `Reveal`, `StampMark` → aplicar em **Indicadores** (o pedido explícito do Alex) com barras `scaleY`, macros `scaleX`, linha de peso `pathLength`.
3. Calendário-objeto: `MonthSheet` + carimbos + `TiltCard` + contadores; lista de mensalidades e "Pagar" (carregando → redirect → carimbo "PAGO" no retorno).
4. Headcard: carimbo do chip 1×/sessão + máscara do título (sem tocar no `PillStack`).
5. Histórico, treino, vitrine, página da academia, ranking (pódio 2-3-1), painel do dono.
6. Medição (§e) com CPU 4× e reduced-motion; i18n dos rótulos novos ("Abrindo…", "Processando", "HOJE", "TREINO FEITO", "PAGO") nos 3 idiomas (regra 1).


---

## (g) Checklist do treino — o toque que dá prazer

Pedido do Alex: lista estilo to-do moderno, **botão de check GRANDE** em cada linha, no topo o **placar em números enormes** "1/6", "2/6"…, **barra de progresso** até concluir, e "quando clicar em check quero animação, quero que a pessoa sinta prazer em apertar".

### g.0 Como funciona hoje (lido em `workout-today-card.tsx`)

- O check é **por exercício** (não por série): `PlanExercise.checked`. A LINHA inteira é o `<button aria-pressed>` (`min-h-12`); o quadrado `BigCheck` (32/40 px, verde `#22C55E`) é só desenho.
- `toggle()` é **otimista** (inverte `checked` no estado) e, depois do `POST /api/workouts/checks/toggle`, chama `load()` — que **substitui a lista inteira** pelo que veio do servidor. `plan.completed_at` vem do servidor e hoje vira uma faixa verde "Treino concluído!".
- `doneCount/totalCount` já são calculados no card; o mesmo card serve a página e o modal grande (`expanded`).

Consequências para a coreografia (o implementador precisa respeitar):
1. **A animação dispara pelo GESTO, não pelo dado.** O `<CheckButton>` anima na transição local `false→true` provocada pelo toque. Quando o `load()` devolve a lista, linhas que já estão no estado certo **não reanimam** (o componente compara com o valor anterior em ref).
2. **Toques rápidos geram `load()` concorrentes**: uma resposta velha pode desfazer visualmente o toque mais novo (o ✓ some e volta — a "piscada" mata o prazer). Pré-requisito: descartar respostas de `load()` mais antigas que o último toque (contador de geração em ref); se o servidor discordar no fim, aplicar a reversão discreta (§g.6).
3. O grand finale dispara pela **transição local** `feitos === total` (otimista), não pelo `completed_at` — esperar a rede tiraria o "agora". Se o servidor recusar, o carimbo sai pela reversão discreta.

### g.1 Anatomia (o que se move)

```
┌─ CARD DA FICHA ─────────────────────────────────────────────┐
│  PLACAR   3 /6               ← FlipCounter, 64–88 px, fl-display
│  ████████████░░░░░░░░░░      ← barra: preenchimento scaleX (origem esq.)
│                                                             │
│  [■] Supino reto        4×10 · 40kg   ← linha (botão inteiro)
│  [✓] Crucifixo  ─────── 3×12          ← concluída: riscada, assentada
└─────────────────────────────────────────────────────────────┘
```
- **CheckButton**: quadrado 48×48 (56 no modal) com sombra-bloco (`#0B0B0D`, 3 px). O alvo de toque continua a linha inteira.
- **Risco**: `span` absoluto de 2 px sobre o nome, `scaleX 0→1` com origem à esquerda (substitui o `line-through`, que não anima).
- **Partículas**: 8 retângulos SVG (não bolinhas — tabloide) num SVG 2× o quadrado, centrado, `overflow: visible`, `pointer-events: none`.

### g.2 A linha do tempo do toque (marcar)

Tempos a partir do `pointerdown`. Tudo framer-motion; só `transform`/`opacity` + `pathLength` no ✓ (SVG de ~28 px).

| t (ms) | Fase | Elemento | Propriedades → valores | Curva |
|---|---|---|---|---|
| 0 | **Pressão / antecipação** | quadrado | squash `scaleX 0.9`, `scaleY 0.82`, `x/y +2px` (desce sobre a sombra = PRENSA); segurar mantém amassado | `SPRING.press` |
| 0 | | sombra-bloco | `x/y 3→1` | `SPRING.press` |
| 0 | | linha inteira | `x +2` | `SPRING.press` |
| 0 | | vibração | `navigator.vibrate?.(8)` — tique curto no APERTO (Android; iOS Safari não tem → silêncio) | — |
| soltar (≈80–150) | **Soltura com overshoot** | quadrado | stretch `scale 1.18→1`, `x/y → 0`; o verde entra por **camada interna** `scale 0→1` do centro (não `background-color`) | mola `POP` `stiffness 520, damping 14, mass 0.8` (~18% overshoot) |
| +0 | | sombra-bloco | `x/y → 3`, 1 quique | `SPRING.press` |
| +40 | **✓ se desenhando** | `path` do ✓ (preto, traço 3.5, `strokeLinecap="square"`) | `pathLength 0→1` em 0.22 s; `opacity 0→1` em 40 ms | `EASE.ink` |
| +60 | **Explosão** | 8 retângulos 3×9 px em raio (ângulos fixos + jitter estável por id) | `x/y 0→cos/sin·(raio+22…30 px)`, `rotate` alinhado ao raio, `scaleY 1→0.3`, `opacity 1→0` | 0.42 s, `EASE.paper` |
| +60 | **Anel** | quadrado de contorno 2 px verde (não círculo) | `scale 1→1.9`, `opacity 0.9→0` | 0.36 s, `EASE.paper` |
| +80 | **Risco do texto** | barra de 2 px sobre o nome | `scaleX 0→1`, origem à esquerda | 0.26 s, `EASE.ink` |
| +80 | | nome; carga/séries | `opacity 1→0.55` (cinza por opacity, não por troca de `color`) | 0.26 s |
| +120 | **Placar vira** | dígito | `FlipCounter` (§g.4) do anterior ao novo, para cima | ~0.34 s |
| +120 | **Barra avança** | preenchimento | `scaleX (n-1)/N → n/N`, mola com leve overshoot **clamped em 1** | `stiffness 260, damping 26` |
| +120 | | ponta da barra | lampejo de 6 px (`opacity 0→1→0`, `x` acompanha a ponta) | 0.3 s |
| +200 | **Assentar** | linha inteira | `y 0→2→0`, `x 2→0` (o papel cai na mesa) | `SPRING.stamp` |

Sensação-alvo: aperto que cede (squash), estalo na soltura (stretch + pop), recompensa em três lugares ao mesmo tempo (✓, placar, barra) e um assentar que encerra — tudo em ≈ 450 ms. Nada bloqueia o próximo toque.

**Acessibilidade**: Enter/Espaço rodam a mesma sequência (sem vibração). `aria-pressed` fica no botão; o placar tem um `aria-live="polite"` com "3 de 6 exercícios" (i18n), 1× por toque.

### g.3 Som?

**Opinião: padrão DESLIGADO, e não implementar agora.** O treino acontece na academia (fone com música ou celular no silencioso) — um clique não pedido é intrusivo; áudio no iOS exige `AudioContext` desbloqueado por gesto (código e casos de borda); e não há interruptor de som em nenhum lugar da plataforma (este seria o primeiro). Se o Alex quiser depois: `AudioContext` criado no 1º toque, um "tic" sintetizado (oscilador ~1,8 kHz, 30 ms, envelope exponencial — zero arquivo baixado), ligado por um toggle na faixa do card e gravado em `localStorage` `esp:sound`. A vibração cobre a sensação física sem incomodar ninguém.

**Vibração** (só onde `navigator.vibrate` existir): aperto `8 ms`; finale `[12, 40, 18]`; nunca no desmarcar; intervalo mínimo de 60 ms entre vibrações.

### g.4 Placar do topo — `FlipCounter`

- Números enormes (`fl-display`, `clamp(64px, 14vw, 88px)`), `tabular-nums`, formato `{feitos}/{total}`; o `/total` é estático e menor (40%); só `feitos` vira.
- **Flip de placar de estádio** (rolo vertical, não flip 3D de aeroporto — mais barato e mais legível): cada dígito mora numa janela `overflow:hidden` de 1 linha; o velho sai `y 0→-100%`, o novo entra `y 100%→0` com tranco final (~6% de overshoot). Avançar = sobe; desmarcar = desce.
- Dígitos independentes (9→10: a dezena entra, a unidade vira 9→0).
- Durante a virada, um risco de 2 px no meio da janela (a "dobra" da placa) some em 0.3 s — o detalhe que vende "placar".
- Toques rápidos: `AnimatePresence mode="popLayout"` por dígito, chave = valor; 2→4 rápido passa pelo 3 sem fila.

### g.5 Barra de progresso

- Trilho `#1D1810` com borda 2 px e `overflow:hidden`; preenchimento = `div` de largura 100% com `scaleX = feitos/total`, origem à esquerda, na cor do pill de treino (`PILL.workout.bg`) — o spec visual pode trocar a cor; o movimento é este.
- **Marcas**: `total − 1` traços verticais fixos dividindo o trilho (régua de placar), estáticos.
- Mola via `useSpring` sobre um MotionValue alvo; `useTransform` faz o clamp em `[0,1]` para o overshoot nunca vazar.
- Em 100% a barra entra no finale (§g.7).

### g.6 Desmarcar — reversão discreta

Desmarcar não comemora: sem partículas, sem anel, sem vibração.

| Elemento | Propriedades → valores | Tempo |
|---|---|---|
| quadrado | pressão igual; soltura **sem** overshoot (`SPRING.press`) | — |
| ✓ | `pathLength 1→0`, `opacity →0` | 0.16 s, `EASE.exit` |
| camada verde | `scale 1→0` | 0.16 s |
| risco | `scaleX 1→0` com **origem à direita** (o risco "volta") | 0.18 s |
| nome e carga | `opacity →1` | 0.18 s |
| placar | flip **para baixo** | ~0.28 s |
| barra | `scaleX` recua, sem overshoot | mola `stiffness 300, damping 34` |
| finale (se estava completo) | carimbo "TREINO CONCLUÍDO" sai: `opacity →0`, `scale →0.9` | 0.2 s |

O mesmo caminho serve à **reversão por erro do servidor**, mais um "não" de 2 batidas na linha (`x: 0,-3,3,0`, 0.24 s) e o toast existente.

### g.7 Grand finale — N/N (uma vez)

Dispara quando a transição local leva `feitos` a `total` (≥ 1), **1× por ficha por dia** (`localStorage` `esp:done:<id_plan>:<data>`, em try/catch). Desmarcar e remarcar no mesmo dia repete só placar e barra, sem confete.

| t desde o último check (ms) | Elemento | Movimento |
|---|---|---|
| 0–450 | último check | sequência normal (§g.2) |
| 380 | barra | ao chegar em 1: **pulso** `scaleY 1→1.6→1` (0.3 s) + brilho que corre dentro do trilho (faixa de 30% da largura, `x -100%→350%`, `opacity`) |
| 420 | placar | "6/6" dá um **soco**: `scale 1→1.12→1` (`SPRING.stamp`) |
| 520 | card | CARIMBO atravessado "TREINO CONCLUÍDO" (verde `#22C55E`, borda preta, `fl-display`) sobre a lista: `scale 2.2→1`, `rotate -14°→-6°`, `opacity 0→1`, `SPRING.stamp`; o card dá o tranco (`y 0→3→0`) |
| 520 | vibração | `[12, 40, 18]` |
| 560 | **confete contido** | 24 retângulos 4×10 px (verde, rosa do pill, laranja `#FF8C2B`, creme) num `div` absoluto **do tamanho do card** com `overflow:hidden` — nunca camada de janela. Cada peça sai do carimbo: `x ±(40–160 px)`, `y` em keyframes `[0, −(60–140), +(120–260)]` com `times [0, .35, 1]`, `rotate ±(180–540°)`, `opacity` 1 até 70% → 0; 1,1–1,5 s (estável por índice). Desmonta ao fim. |
| ~2000 | carimbo | fica (é o novo estado da faixa "Treino concluído!"); o confete já sumiu |

Custo: 25 elementos transform/opacity por ~1,5 s, 1×/dia — dentro do orçamento (§e).

### g.8 Toques rápidos e interrupção

- **Nada trava o botão.** Cada toque inverte o estado na hora; a animação em curso é **redirecionada** (o framer anima do valor atual ao novo alvo) — marcar e desmarcar em 150 ms faz o ✓ desenhar até a metade e voltar, sem salto.
- **Partículas e anel** são "dispara e esquece": cada marcação monta um burst com `key` nova; no máximo **2 vivos por linha** (o 3º desmonta o mais velho) e 4 no card.
- **Vibração** com intervalo mínimo de 60 ms (toques metralhados não viram zumbido).
- **Placar e barra** seguem só o valor mais recente.
- **Finale** só com estado estável: dispara 250 ms depois de chegar a total; se nesse intervalo algo for desmarcado, cancela (sem confete de "toque de passagem").
- Respostas antigas do `load()` ignoradas (geração em ref — §g.0, item 2).

### g.9 Reduced-motion

- Sem squash/stretch, partículas, anel, confete, tranco ou flip (número troca por crossfade de 0.12 s).
- ✓ aparece inteiro (sem `pathLength`); camada verde `opacity 0→1` em 0.12 s; risco aparece inteiro por opacity.
- Barra: troca direta de `scaleX`, sem mola.
- Finale: carimbo aparece com fade de 0.2 s, sem rotação; `aria-live` anuncia "Treino concluído".
- **A vibração continua** (é tátil, não visual), com o mesmo intervalo mínimo.

### g.10 Primitivo `<CheckButton>` (esqueleto)

```tsx
// app/(header-only)/esportes/_components/ui/check-button.tsx
"use client"
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "framer-motion"
import { useEffect, useRef, useState } from "react"
import { DUR, EASE, SPRING, stampAngle } from "./motion"

const POP = { type: "spring", stiffness: 520, damping: 14, mass: 0.8 } as const
const PARTS = 8

let lastBuzz = 0
export function buzz(pattern: number | number[]) {
  const now = performance.now()
  if (now - lastBuzz < 60) return
  lastBuzz = now
  try { navigator.vibrate?.(pattern) } catch { /* sem suporte: silêncio */ }
}

/**
 * O quadrado do check. Quem recebe o toque é a LINHA (o <button> pai, ver
 * useCheckRow); ela repassa `pressed` e `checked`. `id` dá o jitter estável.
 */
export function CheckButton({ id, checked, pressed, size = 48 }: {
  id: string; checked: boolean; pressed: boolean; size?: number
}) {
  const reduce = useReducedMotion()
  const box = useAnimationControls()
  const prev = useRef(checked)
  const [bursts, setBursts] = useState<number[]>([])

  // PRESSÃO: segue o dedo
  useEffect(() => {
    if (reduce) return
    void box.start(
      pressed
        ? { scaleX: 0.9, scaleY: 0.82, x: 2, y: 2, transition: SPRING.press }
        : { scaleX: 1, scaleY: 1, x: 0, y: 0, transition: SPRING.press }
    )
  }, [pressed, reduce, box])

  // SOLTURA que MARCOU: stretch + burst — só na transição local false→true
  // (uma recarga do servidor que confirma o mesmo valor não reanima).
  useEffect(() => {
    const was = prev.current
    prev.current = checked
    if (!checked || was || reduce) return
    void box.start({ scaleX: [1.18, 1], scaleY: [1.18, 1], transition: POP })
    setBursts((b) => [...b.slice(-1), performance.now()]) // máx. 2 vivos
  }, [checked, reduce, box])

  const half = size / 2
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }} aria-hidden>
      {/* sombra-bloco: a sombra dura é um objeto */}
      <motion.span className="absolute inset-0 bg-[#0B0B0D]" initial={false}
        animate={{ x: pressed ? 1 : 3, y: pressed ? 1 : 3 }} transition={SPRING.press} />
      <motion.span animate={box}
        className="relative grid h-full w-full place-items-center overflow-hidden border-2 border-[#0B0B0D] bg-[#0b0804]">
        {/* camada verde: escala do centro, não troca de cor */}
        <motion.span className="absolute inset-0 bg-[#22C55E]" initial={false}
          animate={reduce ? { opacity: checked ? 1 : 0 } : { scale: checked ? 1 : 0 }}
          transition={reduce ? { duration: 0.12 } : checked ? POP : { duration: DUR.quick, ease: EASE.exit }} />
        <svg viewBox="0 0 24 24" className="relative" style={{ width: size * 0.6, height: size * 0.6 }}>
          <motion.path d="M4 12.5l5 5L20 6.5" fill="none" stroke="#0B0B0D" strokeWidth={3.5}
            strokeLinecap="square" strokeLinejoin="miter" initial={false}
            animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
            transition={
              reduce ? { duration: 0 }
              : checked ? { pathLength: { duration: 0.22, ease: EASE.ink, delay: 0.04 }, opacity: { duration: 0.04, delay: 0.04 } }
              : { duration: 0.16, ease: EASE.exit }
            } />
        </svg>
      </motion.span>

      {/* anel + partículas: FORA do overflow do quadrado */}
      <AnimatePresence>
        {bursts.map((k) => (
          <motion.svg key={k} className="pointer-events-none absolute" width={size * 2} height={size * 2}
            viewBox={`${-size} ${-size} ${size * 2} ${size * 2}`}
            style={{ left: -half, top: -half, overflow: "visible" }}
            initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.rect x={-half} y={-half} width={size} height={size} fill="none" stroke="#22C55E" strokeWidth={2}
              initial={{ scale: 1, opacity: 0.9 }} animate={{ scale: 1.9, opacity: 0 }}
              transition={{ duration: 0.36, ease: EASE.paper, delay: 0.06 }} />
            {Array.from({ length: PARTS }, (_, i) => {
              const a = (i / PARTS) * Math.PI * 2 + stampAngle(`${id}:${i}`, 0.6)
              const d = half + 22 + (i % 3) * 4
              return (
                <motion.rect key={i} x={-1.5} y={-4.5} width={3} height={9} fill={i % 2 ? "#22C55E" : "#F5F1E8"}
                  initial={{ x: 0, y: 0, rotate: (a * 180) / Math.PI + 90, opacity: 1, scaleY: 1 }}
                  animate={{ x: Math.cos(a) * d, y: Math.sin(a) * d, opacity: 0, scaleY: 0.3 }}
                  transition={{ duration: 0.42, ease: EASE.paper, delay: 0.06 }}
                  onAnimationComplete={i === PARTS - 1 ? () => setBursts((b) => b.filter((x) => x !== k)) : undefined} />
              )
            })}
          </motion.svg>
        ))}
      </AnimatePresence>
    </span>
  )
}

/** Hook da LINHA: pressão e vibração. A linha inteira é o alvo do toque. */
export function useCheckRow(checked: boolean, onToggle: () => void) {
  const [pressed, setPressed] = useState(false)
  const release = () => setPressed(false)
  return {
    pressed,
    handlers: {
      onPointerDown: () => { setPressed(true); if (!checked) buzz(8) },
      onPointerUp: release,
      onPointerLeave: release,
      onPointerCancel: release,
      onClick: onToggle, // teclado (Enter/Espaço) também chega aqui
    },
  }
}
```

Risco do texto (na linha, no lugar do `line-through`):

```tsx
<span className="relative min-w-0 flex-1">
  <motion.span className="block truncate" initial={false}
    animate={{ opacity: checked ? 0.55 : 1 }}
    transition={{ duration: 0.26, delay: checked ? 0.08 : 0 }}>{nome}</motion.span>
  <motion.span aria-hidden className="absolute inset-x-0 top-1/2 h-[2px] bg-[#F5F1E8]"
    initial={false} style={{ originX: checked ? 0 : 1 }}
    animate={{ scaleX: checked ? 1 : 0 }}
    transition={{ duration: checked ? 0.26 : 0.18, ease: EASE.ink, delay: checked ? 0.08 : 0 }} />
</span>
```

### g.11 Primitivo `<FlipCounter>` (esqueleto)

```tsx
// app/(header-only)/esportes/_components/ui/flip-counter.tsx
"use client"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { useEffect, useRef, useState } from "react"

const FLIP = { type: "spring", stiffness: 420, damping: 26, mass: 0.7 } as const // tranco ~6%

function Digit({ d, dir }: { d: string; dir: 1 | -1 }) {
  const reduce = useReducedMotion()
  return (
    <span className="relative inline-block overflow-hidden align-bottom" style={{ height: "1em", width: "0.62em" }}>
      <AnimatePresence mode="popLayout" initial={false} custom={dir}>
        <motion.span key={d} custom={dir} className="absolute inset-0 grid place-items-center leading-none"
          variants={{
            enter: (s: number) => (reduce ? { opacity: 0 } : { y: `${100 * s}%` }),
            center: { y: "0%", opacity: 1, transition: reduce ? { duration: 0.12 } : FLIP },
            exit: (s: number) =>
              reduce ? { opacity: 0, transition: { duration: 0.12 } }
              : { y: `${-100 * s}%`, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } },
          }}
          initial="enter" animate="center" exit="exit">
          {d}
        </motion.span>
      </AnimatePresence>
      {/* a "dobra" da placa, só durante a virada */}
      {!reduce && (
        <motion.span key={`fold-${d}`} aria-hidden className="absolute inset-x-0 top-1/2 h-[2px] bg-[#0B0B0D]"
          initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.3 }} />
      )}
    </span>
  )
}

/** Placar "feitos/total". Só `value` vira; `total` é estático. `label` = texto i18n do aria-live. */
export function FlipCounter({ value, total, label }: { value: number; total: number; label: string }) {
  const prev = useRef(value)
  const [dir, setDir] = useState<1 | -1>(1)
  useEffect(() => {
    if (value !== prev.current) setDir(value > prev.current ? 1 : -1)
    prev.current = value
  }, [value])
  // ⚠️ dir é atualizado 1 render depois; se a direção sair trocada no 1º quadro,
  // derivar no pai (onde o toque sabe se marcou ou desmarcou) e passar por prop.
  const width = String(total).length
  const digits = String(value).padStart(width, " ").split("")
  return (
    <p className="fl-display flex items-baseline tabular-nums leading-none text-[#F5F1E8]"
      style={{ fontSize: "clamp(64px, 14vw, 88px)" }}>
      <span aria-hidden className="inline-flex">
        {digits.map((d, i) => <Digit key={i} d={d} dir={dir} />)}
      </span>
      <span aria-hidden className="ml-1 text-[0.4em] text-[#9A938A]">/{total}</span>
      <span className="sr-only" aria-live="polite">{label}</span>
    </p>
  )
}
```
Recomendação ao implementar: passar `dir` pelo pai (o handler do toque sabe se marcou ou desmarcou) em vez do `useEffect` acima — é exato no primeiro quadro.

### g.12 Orçamento e conferência específicos

- Por toque: ≤ 16 elementos animando (quadrado, camada, ✓, sombra, 8 partículas, anel, risco, dígito ×2, barra). Finale: +25 por ~1,5 s, 1×/dia.
- `setState` por toque: só `pressed` (2×) e `bursts` (2×) na linha, além do estado do pai. Nenhum por quadro.
- Medir com CPU 4×: 6 toques em 1 s sem quadro > 32 ms; o ✓ nunca "pisca" (respostas velhas do `load()` descartadas).
- QA no celular real: a linha inteira continua o alvo (≥ 56 px de altura com o check de 48); vibração no Android; iPhone sem vibração e sem erro.
- i18n novo: "{n} de {t} exercícios" e "TREINO CONCLUÍDO" (o `sessionDone` "Treino concluído!" já existe e pode ser reaproveitado) nos 3 idiomas.
