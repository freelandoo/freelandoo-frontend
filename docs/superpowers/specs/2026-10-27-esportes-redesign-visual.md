# Esportes — repaginada visual completa ("PLACAR BRASA")

> Spec de **direção de arte e interface** (2026-10-27). Só planejamento: nenhum código foi alterado.
> Dono do VISUAL: este documento. Dono da COREOGRAFIA (curvas, durações, sequências): o plano do motion designer, feito em paralelo. Aqui cada peça marca com **⟳ MOTION** onde ela "pede" movimento e o que o movimento significa — nunca o como.
>
> Pedido do Alex (literal): "dentro da comunidade esportes, eu quero uma nova fachada, os indicadores estão sem efeitos, feios, quadrados, eu quero uma nova repaginada na comunidade toda, quero algo incrível, bonito, mas mantendo a cara das comunidades freelandoo, mas com efeitos, animações, motion".

Escopo: `app/(header-only)/esportes/**` (início, academia, treino, histórico, indicadores + modais) e `app/(header-only)/academias/**` (vitrine, academia `[slug]`, membros, ranking).

---

## 0. Restrições que este design respeita (não negociáveis)

| Regra | Como o design cumpre |
|---|---|
| Sem cantos arredondados (`.fl-sharp`) | Toda caixa é reta. A "curva" que o Alex sente falta entra como **forma de dado** (anel, arco, agulha em SVG) e como **corte diagonal** (paralelogramo por `clip-path: polygon`), nunca `border-radius`. Só avatar circular e `[data-dot]` escapam (regra existente). |
| Cara das comunidades | Headcard com foto 2:3, pilha de 4 pills atrás da foto (conta 4×36+3×6 = 162 px < 192/216 px da foto, intacta), título Anton caixa-alta, sombra dura, chip do ambiente, selo no canto, gaveta `RetractableColumn`, `PublishMenuButton`, `PageBackLink`. Nada disso é trocado — é **vestido**. |
| Pele `.fl-fitness` (games em laranja) | Os tokens novos são derivados da pele atual (`fitness-ui.ts` + `globals.css` linhas 836–918). Superfície continua quase preta pouco saturada; o laranja forte fica em luz, linha, número e botão. "Laranja escurecido vira marrom" continua valendo. |
| `.fl-fitness .-rotate-2 { transform:none }` | Nada de tarja inclinada por `rotate`. A energia diagonal vem de **paralelogramos** e **listras** (forma, não transformação). Exceção pontual: o carimbo ✕ do calendário gira poucos graus **dentro do SVG** (atributo `transform` do path), não por classe. |
| Fundo estático | O `TechBackdrop variant="fitness"` não muda e não ganha movimento. Todo brilho e textura nova mora **dentro de cards** (camadas pequenas). Nada animado do tamanho da janela; sem `backdrop-filter` em camada grande. |
| Animação só GSAP + framer-motion | O design não depende de nenhuma lib nova de gráfico: gráficos em SVG/HTML à mão, como hoje (`indicators-tab.tsx`). |
| i18n pt/en/es | Seção 9 lista todos os textos novos com chave proposta e namespace. |
| `PageBackLink` | Toda página mantém o "Voltar" do topo; o do headcard do Esportes passa a ser o `PageBackLink` (hoje é um `Link` manual com `ArrowLeft`). |
| Celular primeiro, sem rolagem horizontal | Wireframes começam em 375 px. A barra de abas da raiz, que hoje **rola na horizontal** (`overflow-x-auto`), é redesenhada para não rolar (seção 4.1). Tabelas largas (membros, grade de treinos) viram cartões no celular. |

---

## (a) Diagnóstico — o que está feio/quadrado hoje

**Problema transversal.** Tudo é o mesmo bloco: `PANEL` (borda 2 px + fundo) com rótulo minúsculo cinza-laranja em cima e um número em baixo. Não há hierarquia de tamanho (o IMC pesa o mesmo que "água média"), não há forma de dado (só barra reta e número), não há luz (a brasa do banner morre no headcard; os cards são chapados), e cada página reescreve a mesma faixa de data e o mesmo `Tile`. O "quadrado" que o Alex sente não é o canto — é a **grade uniforme de caixas iguais**. A cura é ritmo (tamanhos diferentes, bento), forma (anéis, arcos, calor, carimbo), luz (número que brilha, borda que acende) e momento (o que muda pede movimento).

| Página | O que está ruim |
|---|---|
| **/esportes (início)** | Headcard bom de silhueta mas banner vazio (grade + haltere fantasma) — não diz "esporte". As abas são botões soltos que **rolam na horizontal** com nome de academia comprido. A faixa "Seu esporte: X · Trocar" é texto cinza solto. O feed chega sem moldura de seção. |
| **/esportes/academia** | O pior caso do pedido. Calendário é uma fileira de 31 quadradinhos 24 px que quebra como texto (sem dias da semana, sem início no dia certo, sem diferença entre faltou/futuro/antes do vínculo). "12 dias / 30d" num `INNER` minúsculo. Mensalidades em `<li>` de 12 px com selo de status espremido; `membership_status` aparece **cru** ("active"). Sem pagar, sem forma de pagamento. |
| **/esportes/treino** | A faixa de data e o card são corretos e úteis (o check grande é bom — manter), mas o card é uma lista sem cabeça: progresso só existe no modal ("3/9 exercícios"), o nome da ficha é texto de 16 px, "Treino concluído!" é uma tirinha verde. Não há sensação de sessão. |
| **/esportes/historico** | Duas caixas de "Calorias/Água" com barra de 12 px; diário de refeições com faixa marrom igual em 4 cards; peso & altura como número solto + lista; "Os seus dias" é uma tabela comprida sem leitura de padrão (não dá pra ver de relance quais semanas foram boas). |
| **/esportes/indicadores** | 8 `Tile` idênticos em grade 4×2, todos com o mesmo número 30 px; IMC sem escala visual (só a palavra colorida); proteína sem faixa de referência; macros como barra + lista; barras de 14 dias finas, sem tampa, sem destaque de hoje; linha de peso sem área, sem eixos legíveis. Nada se mexe, nada brilha. |
| **Modais** | Cada modal é uma caixa `PANEL` com `h2` de 18 px e botões no rodapé — sem cabeçalho de ambiente, sem foco visual. Desvincular e excluir ficha usam `window.confirm` (cinza do sistema, quebra a pele). Propostas do professor não mostram **antes → depois**. |
| **/academias (vitrine)** | O masthead e os mini-headcards estão no caminho certo; falta escala (cards todos iguais, sem estado "vinculado" forte), a busca é um formulário cru, o modal de CPF é genérico. |
| **/academias/[slug]** | Headcard ok. "Meu vínculo" é um painel de texto. O **painel do dono** é um `<dl>` de URL de API + botões — parece tela de admin. Chave de parceiro e WhatsApp são cards soltos empilhados sem agrupamento. Não existe lugar para Recebimentos/Repasses. |
| **membros** | Duas tabelas largas (até 9 colunas) que no celular rolam de lado dentro do card; status cru; badge "Prof" e "Ficha vencida" competem. |
| **ranking** | Já tem pódio editorial (papel off-white) — é a página mais "desenhada". Falta conversar com o resto: números de placar, barra até a meta. |

---

## (b) Conceito — "PLACAR BRASA"

**Ideia em uma frase:** o caderno de esportes de um tabloide impresso **por cima** de um placar de estádio aceso à noite. O tabloide dá a cara Freelandoo (caixa alta condensada, sombra dura, papel, carimbo, recorte); o placar dá o efeito (números enormes que acendem, luz de refletor laranja, listras de velocidade, linhas de quadra).

Três camadas de linguagem, sempre nesta ordem de força:

1. **NÚMERO É HERÓI.** Todo indicador tem um número protagonista em Anton gigante (40–88 px) com brilho de brasa. Rótulo pequeno em cima, unidade em mono ao lado. Em toda tela há **um** número maior que todos (hierarquia).
2. **FORMA DE DADO.** Cada dado ganha a forma certa: meta → anel; faixa saudável → arco com agulha; série → barras com tampa/sparkline; presença → calendário/calor; dinheiro → talão com cálculo. É aqui que sai o "quadrado".
3. **OBJETO IMPRESSO.** Peças que são "coisas" (calendário, talão de mensalidade, recibo de repasse, ficha de treino) são desenhadas como objetos de papel (off-white tabloide) colados no placar escuro — contraste e tato. É o mesmo papel do pódio do ranking e do `TabloidDialog`.

### Como converge e diverge das comunidades

| Converge (fica igual às comunidades) | Diverge (é só do Esportes) |
|---|---|
| Headcard: banner largo, chip do ambiente, selo no canto, foto 2:3 mordendo o banner, pills atrás da foto, título Anton embaixo da foto no celular | Banner ganha **linhas de quadra** + **refletores** e um **placar-ticker** sob o título (3 números do dia) |
| Sombra dura deslocada (6/8 px) e borda 2 px | Sombra dura **na cor da sala** (laranja/rosa/turquesa/ciano — a cor do pill) + brilho estático de brasa só nos cards herói |
| Papel off-white nos modais (`TabloidDialog`) e no pódio | Papel também no **calendário**, nos **talões** e na **súmula de treino** |
| `RetractableColumn`, `PublishMenuButton`, `PageBackLink`, `StateBox` | `StateBox` ganha a variante do placar (seção e) |
| Cantos retos | Paralelogramos (`SpeedBand`) e listras diagonais como assinatura de velocidade |

### Tokens

Arquivo novo `esportes/_components/ui/sp-tokens.ts`, que **reexporta** o que já existe em `fitness-ui.ts` (nunca copia) e acrescenta o que falta. Nomes semânticos:

**Cor — superfície (existentes, pela pele)**

| Token | Valor | Papel |
|---|---|---|
| `SP.canvas` | `#0c0503` | fundo (pele) |
| `SP.panel` | `rgba(28,10,6,.80)` (classe `bg-[#15120E]`) | card |
| `SP.inner` | `rgba(52,17,8,.72)` (classe `bg-[#1D1810]`) | poço dentro do card |
| `SP.raise` | `rgba(84,26,10,.90)` (classe `bg-[#241d12]`) | hover / linha selecionada |
| `SP.line` | `#9A3412` (classe `border-[#0B0B0D]` reescrita) | borda 2 px |
| `SP.band` | `#7C2D12` (`HEADER_BG`) | faixa de cabeçalho |

**Cor — tinta e luz**

| Token | Valor | Papel |
|---|---|---|
| `SP.ink` | `#FFF1E6` | texto principal |
| `SP.mute` | `#F4A574` | rótulo/apagado (pele) |
| `SP.ember` | `#FF8C2B` | botão/ação/fundo (`EMBER`) |
| `SP.emberDeep` | `#C2410C` | hover, topo do calendário |
| `SP.glow` | `#FB923C` | traço, ícone, linha de gráfico (`EMBER_GLOW`) |
| `SP.hot` | `#FFD2A6` | **novo** — topo do degradê do número herói (o "branco quente" do LED) |
| `SP.flare` | `#E11D48` | **contraluz** rosa-vermelho (já é a do banner); usado só em brilho, nunca em texto |

**Cor — significado (não seguem a pele)**

| Token | Valor | Uso |
|---|---|---|
| `SP.ok` | `#22C55E` (escuro) / `#16A34A` (sobre papel) | ✓ catraca, paga, check da ficha |
| `SP.bad` | `#FF5A44` (escuro) / `#D7261E` (carimbo sobre papel) | ✕ faltou, vencida |
| `SP.warn` | `#F2B705` | pendente, sobrepeso no IMC |
| `SP.water` | `#16C8E8` | água (intocado) |
| `SP.macroP / C / F` | `#FB923C` / `#16C8E8` / `#FF1F8E` | macros (intocado) |
| `SP.room.*` | `PILL.academy #F97316`, `workout #DB2777`, `history #0D9488`, `indicators #0891B2` | **cor da sala**: sombra dura do card herói e o acento da página |

**Papel (objetos impressos)**

| Token | Valor |
|---|---|
| `SP.paper` | `#F6EEE3` |
| `SP.paperInk` | `#1A0A05` |
| `SP.paperMute` | `#8A6A55` |
| `SP.paperLine` | `#1A0A05` (borda 2 px, como o `TabloidDialog`) |

**Tipografia** (fontes já carregadas no layout: Anton, Archivo, Geist Mono)

| Papel | Fonte | Tamanho celular → computador | Detalhe |
|---|---|---|---|
| Título da sala (headcard) | Anton `.fl-display` | 40 → 64 px | já existe |
| Número herói | Anton | 64 → 88 px | `font-variant-numeric: tabular-nums`; preenchimento degradê vertical `SP.hot → SP.glow` (`background-clip:text`) + `text-shadow 0 0 24px rgba(249,115,22,.55)` (o da pele) |
| Número de card | Anton | 36 → 48 px | tinta `SP.ink`, mesmo brilho |
| Título de seção | Anton | 22 → 28 px | dentro do `SpeedBand` |
| Kicker/rótulo | Archivo 800 | 10–11 px | caixa alta, `tracking .18em` |
| Unidade e números miúdos | Geist Mono 600 | 11–13 px | "kcal", "12/26", "R$ 129,90", eixos — mono deixa as colunas de dinheiro alinhadas |
| Corpo | Archivo 500 | 13–14 px | |

**Espessuras e sombras**

- Borda padrão 2 px; borda de **destaque** (card herói, hoje no calendário) 3 px.
- Sombra dura: `6px 6px 0 0 <cor da sala>` (cards) e `8px 8px 0 0 <cor>` (herói). No celular, como hoje, a casca recorta com `overflow-x-clip`.
- Brilho de brasa (estático): `0 0 28px rgba(249,115,22,.22)` só em card herói e no número herói. Nunca em lista.
- Linha interna de luz: `inset 0 1px 0 rgba(255,210,166,.12)` no topo dos cards — dá o "chanfro de luz" sem arredondar.

**Texturas (todas estáticas, todas dentro de card)**

- `tx-halftone`: retícula de impressão — `radial-gradient(rgba(251,146,60,.10) 1px, transparent 1.5px) 0 0/6px 6px`, só no canto do card herói (máscara linear para sumir).
- `tx-court`: linhas de quadra — SVG inline 1 px `rgba(251,146,60,.10)` (círculo central + área), usado no banner do headcard e no fundo do card de sequência.
- `tx-speed`: listras diagonais 45° 6 px / 10 px `rgba(255,140,43,.14)` — dentro do `SpeedBand` e da barra "a pagar".
- `tx-hatch`: hachura fina 45° `rgba(26,10,5,.18)` sobre papel — dias **antes do vínculo** no calendário.
- `tx-grain-paper`: ruído leve do papel — PNG/WebP 128 px repetido (opacidade .06) só nos objetos de papel.

**Efeitos "vivos" permitidos (para o motion designer coreografar)**

Contagem de número, preenchimento de anel/barra, carimbo batendo, virar mês do calendário, varredura de luz **dentro** do card herói (camada do tamanho do card), pulso do "hoje", agulha do IMC assentando, tampa de barra pousando. Tudo em `transform`/`opacity`/`stroke-dashoffset`; respeitar `prefers-reduced-motion` (estado final direto).

---

## (c) Página por página

Convenções dos wireframes: `▓` = laranja de ação, `░` = textura, `[■]` = sombra dura, `( )` = foto. Celular = 375 px; computador = `max-w-5xl` (o container atual das cascas).

### 4.0 O headcard compartilhado (todas as salas de /esportes)

`FitnessHeadcard` continua sendo a peça única. Muda o banner e entra o **ticker**.

```
CELULAR                                         COMPUTADOR
‹ VOLTAR                       ● @alex          ‹ VOLTAR                                     ● @alex
┌─────────────────────────────────────┐        ┌──────────────────────────────────────────────────────┐
│[ESPORTES]  ·· linhas de quadra ··  [⚑]│      │[ESPORTES]   ·· quadra ··   refletor ✶        [⚑ JIU]│
│  ✶ refletor              ✶ refletor  │      │                                                       │
│ ░░░░░░░ listras de velocidade ░░░░░ │      │░░░░░░░░░░░░░░░░ listras ░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
└─┬──────┬────────────────────────────┘        └──┬───────┬───────────────────────────────────────────┘
  │(foto)│▐pills               [+]                 │(foto) │▐pills   INDICADORES             [+]
  │ 2:3  │▐                                        │ 2:3   │▐        ┌─ 🔥 6 DIAS ─┬─ 3 TREINOS ─┬─ 12 CATRACA ─┐
  └──────┘                                         └───────┘         └─────────────┴──────────────┴──────────────┘
INDICADORES
┌─🔥 6 DIAS ─┬─ 3 TREINOS ─┬─ 12 CATRACA ┐
└────────────┴─────────────┴─────────────┘
```

- **Banner**: mantém `BANNER_LAYERS`; troca o haltere fantasma por **linhas de quadra** (`tx-court`) e dois "refletores" (radiais `SP.hot` 18% no alto) + uma faixa de listras de velocidade de 24 px rente à base, atrás do degradê escuro. Tudo estático.
- **Chip**: "ESPORTES" (hoje diz "Fitness" via `platformTitle` — corrigir a chave/fallback).
- **Selo do canto**: em vez de "Plataforma + haltere", mostra o **esporte da pessoa** (ícone + nome curto, ex.: "JIU-JITSU"), tocável → abre o seletor de esporte. Sem esporte: "ESCOLHA SEU ESPORTE" em ember. ⟳ MOTION: o selo "acende" quando o esporte muda.
- **Ticker** (`HeadcardTicker`): faixa de 3 células mono+Anton embaixo do título — sequência do diário, treinos nos 7 dias, dias de catraca nos 30. Só aparece quando a página **já tem** esses números (indicadores, academia); nas outras salas o espaço não existe (sem I/O extra). Células retas separadas por filete; a primeira com chama. ⟳ MOTION: números contam ao entrar; a chama tremula só se sequência ≥ 3.
- **Foto**: outline de 2 px `SP.glow` vira **na cor da sala ativa** (a do pill aceso) — a foto "diz" em que sala você está.
- **Voltar**: `PageBackLink` (regra 3).

Estados: perfil carregando → foto com bloco `SP.inner` + iniciais apagadas (já existe); ticker carregando → três células com traço "—" (nunca esqueleto piscando no headcard).

### 4.1 /esportes — início (feed)

```
CELULAR                                   COMPUTADOR
[headcard ESPORTES]                       [headcard ESPORTES]
┌────────┬─────────────┬─────────────┐    ┌──────────┬───────────────┬──────────────────┬───────────┐
│ GERAL ▓│ MEU ESPORTE │ ACADEMIAS ▾ │    │ GERAL  ▓ │ MEU ESPORTE   │ IRON GYM CENTRO  │ +ACADEMIA │
└────────┴─────────────┴─────────────┘    └──────────┴───────────────┴──────────────────┴───────────┘
                                          (até 2 academias viram abas; 3+ → "ACADEMIAS ▾")
(aba MEU ESPORTE)
┌▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓┐
│ ⚑ SEU ESPORTE   JIU-JITSU   [TROCAR]│   ← faixa SpeedBand, não texto cinza
└───────────────────────────────────┘
┌ PUBLICAR EM ESPORTES ─────── [+] ┐      (barra fina do PublishMenuButton, igual hoje)
│ post │ post │ post …              │
```

- **Barra de abas sem rolagem horizontal** (`SportTabs`): grade de colunas iguais que ocupa a largura. Geral e Meu esporte sempre; academias: 1 → terceira aba com o nome truncado (`truncate`, nome inteiro no `title`); 2+ → a terceira vira "ACADEMIAS ▾" que abre um menu reto ancorado listando as academias (com avatar circular) + "Adicionar academia". Aba ativa: fundo `SP.ember`, tinta `#0B0B0D`, sombra dura 3 px; inativa: `SP.inner`. ⟳ MOTION: indicador da aba ativa desliza entre abas (um bloco único que se move, não três fundos que piscam).
- **Faixa "Seu esporte"**: `SpeedBand` em ember com listras, ícone do esporte, nome em Anton 20 px, botão "Trocar" preto. Sem esporte: "VOCÊ AINDA NÃO ESCOLHEU SEU ESPORTE · [ESCOLHER]".
- **Feed**: `PortfolioPostCard` intacto (memoizado — não mexer nas props). Só a moldura: borda `SP.line` e um kicker "O QUE A GALERA POSTOU" acima no computador.
- **Aba da academia** (`AcademyTab`): os três botões viram uma **barra de ação** única (3 colunas iguais, o "Postar" em ember), acima um mini-cabeçalho da academia (avatar circular 32 px + nome Anton + "Vinculado desde…" + link "Minha frequência →" para `/esportes/academia`). "Desconectar academia" sai do rodapé solto e vai para um menu "⋯" desse mini-cabeçalho, com confirmação em `TabloidDialog` (não `window.confirm`).

Estados: carregando → 3 cartões-esqueleto na altura do post (blocos estáticos `SP.inner` com uma faixa de brilho que passa **dentro** de cada esqueleto — ⟳ MOTION); vazio → `PublishMenuButton variant="block"` (como hoje) com ilustração de quadra; erro → `SpState` tipo erro.

### 4.2 /esportes/academia — Minha academia (a página que mais muda)

```
CELULAR (375)                                   COMPUTADOR (max-w-5xl, 2 colunas 7/5)
[headcard MINHA ACADEMIA + ticker]              [headcard MINHA ACADEMIA + ticker]
                                                 ┌── coluna larga ───────────────┬─ coluna estreita ─────┐
┌[IRON GYM ▾]──────────────────────┐ ← só com 2+ │ CARTÃO DA MATRÍCULA            │ CALENDÁRIO-OBJETO     │
┌──────────────────────────────────┐            │                                │                        │
│(●) IRON GYM CENTRO      [ATIVA ✓]│            │ MÉTRICAS (3)                   │                        │
│ Plano Black · desde 12/03/2026   │            │                                │                        │
│ Próx. vencimento 05/11 · R$129,90│            ├────────────────────────────────┴───────────────────────┤
└──────────────────────────────────┘[■]         │ HISTÓRICO DE MENSALIDADES (largura toda)                │
┌──────────┬──────────┬────────────┐            └─────────────────────────────────────────────────────────┘
│ ◯ 12/26  │ 🔥 5     │ ★ 18       │
│ no mês   │ seguidos │ melhor seq.│
└──────────┴──────────┴────────────┘
┌──────────── CALENDÁRIO ──────────┐
│ ▐▌      ▐▌   (presilhas)          │
│ ‹   OUTUBRO 2026            ›    │  ← topo brasa
├──────────────────────────────────┤
│  D   S   T   Q   Q   S   S       │  ← papel
│              1✓  2✕  3✓  4       │
│  5   6✓  7✓  8✕  9✓ 10✓ 11       │
│ 12  13✓ 14✓ 15✕ 16✓ 17✓ 18       │
│ 19  20✓ 21✓ 22✕ 23✓ 24✓ 25       │
│ 26 [27] 28  29  30  31           │
├──────────────────────────────────┤
│ 12 DE 26 DIAS    🔥 5 SEGUIDOS   │
│ ✓ entrou  ✕ faltou  ▢ hoje        │
└──────────────────────────────────┘
┌▓ HISTÓRICO DE MENSALIDADES ▓▓▓▓▓▓┐
│ ⚠ 1 VENCIDA · R$ 129,90  [PAGAR] │
│┌OUT┐ venc. 05/10 · PIX           │
││ 26│ R$ 129,90   [VENCIDA]  PAGAR│
│└───┘                             │
│┌SET┐ venc. 05/09 · Freelandoo    │
││ 26│ R$ 129,90 [PAGO VIA FREEL.] │
│ …                                 │
└──────────────────────────────────┘
```

**Cartão da matrícula (`MembershipCard`)** — mini-headcard horizontal: avatar da academia circular 56 px, nome Anton 28 px (link para `/academias/[slug]`), plano, "Vinculado desde" (data), próximo vencimento + valor (se houver pendente). Selo de situação traduzido (`STATUS_KEYS` do `academy-ui.ts` — hoje aparece "active" cru): ativa = verde, atrasada = vermelho, pendente = amarelo, vencida/cancelada = cinza. Sombra dura `PILL.academy`. Com 2+ academias: seletor segmentado acima ("IRON GYM ▾"), uma academia por vez na tela (hoje são cards lado a lado — fica confuso com calendário grande).

**Três métricas (`StatCard` compacto)**: dias no mês (anel pequeno — `RingGauge` 48 px com `12/26`), sequência atual (chama), melhor sequência (estrela). Números Anton 36 px. ⟳ MOTION: anel preenche e números contam ao entrar.

**Calendário-objeto (`CalendarObject`)** — o item decidido nº 1:

- **Corpo**: papel `SP.paper`, borda 2 px `SP.paperInk`, sombra dura `8px 8px 0 0 #7C2D12` + brilho de brasa estático atrás (o objeto "flutua" no placar). Grão de papel.
- **Topo**: faixa `SP.emberDeep` → base `SP.band` (dois blocos chapados, sem degradê suave: tabloide), 56 px. Mês e ano em Anton 26 px tinta `SP.ink`, centralizado. Setas ‹ › em quadrados pretos 36 px (alvo de toque ≥ 44 px com padding), nas pontas da faixa.
- **"Argolas"**: duas **presilhas retangulares** (8×22 px, `#0B0B0D` com filete de luz `SP.hot` 1 px) que atravessam a borda superior do topo, a 1/4 e 3/4 da largura — a leitura do ícone de calendário 3D sem arredondar. (Se o Alex quiser a argola redonda literal, é um SVG de anel de 2 px — forma de dado, como o avatar; ficar com a presilha reta como padrão.)
- **Linha dos dias da semana**: faixa `SP.paperInk` com letras `SP.paper` Archivo 800 11 px, "D S T Q Q S S" (localizadas: en "S M T W T F S", es "D L M M J V S"); semana começa no domingo nos três idiomas (decisão: simplicidade; manter igual ao modelo).
- **Grade**: 7 colunas iguais; o dia 1 começa na coluna certa; células vazias antes/depois **sem** número (papel liso). Células quadradas (`aspect-square`), 44–48 px no celular, 56 px no computador. Número **Anton 22 px** (computador 26) tinta `SP.paperInk`.
- **Estados da célula** (`CalendarDayCell`):
  | estado | desenho |
  |---|---|
  | **entrou** (giro de catraca) | ✓ verde `#16A34A` grosso (traço 4 px, ponta reta) ocupando ~70% da célula; o número encolhe para o canto superior esquerdo (Archivo 10 px) |
  | **faltou** (passado, desde o vínculo, sem giro) | ✕ **carimbado** vermelho `#D7261E`, traço irregular (3 variantes de path com borda "tinta gasta", escolhidas por `dia % 3`), girado −8° a +8° dentro do SVG, opacidade .9, `mix-blend-mode: multiply` sobre o papel; número no canto como no ✓ |
  | **hoje** | "anel" **quadrado** de 3 px `SP.ember` por dentro da célula + brilho estático; se já entrou hoje, ✓ dentro do anel |
  | **futuro** | só o número, tinta `SP.paperMute` |
  | **antes do vínculo** | número `SP.paperMute` 50% sobre `tx-hatch` (dia que "não conta") |
  | **domingo** | número em `SP.emberDeep` (detalhe de calendário impresso) — só quando não há marca |
- **Rodapé**: "**12** DE 26 DIAS" (o 12 em Anton 32 px; denominador = dias contáveis do mês: de `max(1º do mês, vínculo)` até `min(hoje, fim do mês)`), à direita "🔥 **5** DIAS SEGUIDOS" (chama `lucide Flame` em ember; sequência de dias com entrada terminando hoje ou ontem). Embaixo, legenda mínima com os três símbolos. Mês passado: o rodapé diz "**18** DE 31 DIAS" e a sequência some (mostra "MELHOR SEQUÊNCIA NO MÊS: 7").
- **Navegação**: ‹ desabilitado (opacidade .35, `aria-disabled`) no mês do vínculo; › desabilitado no mês atual.
- ⟳ MOTION: trocar de mês = folha virando (a grade sai e entra na direção da seta); ao abrir a página, os carimbos ✕ e os ✓ entram em sequência pela data ("o mês sendo carimbado"); o anel do hoje pulsa devagar enquanto a página está aberta (elemento de 48 px, ok). Com `prefers-reduced-motion`: tudo já marcado.
- Acessibilidade: cada célula é `role="gridcell"` com `aria-label` "27 de outubro, hoje, entrada registrada" / "15 de outubro, sem entrada"; o símbolo nunca é a única informação (forma ✓/✕ + texto). Grade com `role="grid"` e `aria-labelledby` no título do mês.
- **Dados esperados** (contrato para o back — hoje o `/fitness/summary` só traz `month_days` do mês corrente e não traz `linked_at`): `linked_at` da matrícula e uma leitura por mês (`?month=YYYY-MM`) com os dias de giro. Carregar o mês sob demanda ao trocar.

Estados do calendário: carregando mês → a grade mantém números (o mês é calculável no cliente) e as marcas aparecem quando chegam (sem esqueleto); erro → faixa vermelha fina dentro do papel "Não deu pra carregar este mês · Tentar de novo"; sem vínculo → a página inteira cai no estado vazio (abaixo).

**Histórico de mensalidades (`DuesList` + `DueTicket`)** — o item decidido nº 2:

- Cabeçalho `SpeedBand` "HISTÓRICO DE MENSALIDADES".
- **Callout "a pagar"** (só se houver pendente/vencida e a academia habilitou pagamento): barra listrada (`tx-speed`) em `SP.bad` (vencida) ou `SP.warn` (pendente) com "1 MENSALIDADE VENCIDA · R$ 129,90" e botão **PAGAR** grande. ⟳ MOTION: entra depois do calendário, chamando atenção uma vez (não em loop).
- **Talão** (cada mensalidade): objeto de papel em linha. À esquerda um **canhoto** 56 px separado por picote (linha tracejada vertical + dois entalhes **quadrados** 6×6 px nas bordas — o "picote" sem curva) com mês abreviado Anton 18 px ("OUT") e ano mono ("26"). Ao centro: "Vencimento 05/10/2026" e a **forma** (PIX, cartão, boleto, dinheiro, "Freelandoo"), em mono 12 px. À direita: **valor** em Anton 22 px e o **selo de situação**:
  | situação | selo |
  |---|---|
  | paga | chip verde chapado "PAGA" + data de pagamento mono embaixo |
  | **Pago via Freelandoo** | chip ember com o "F" da marca + "PAGO VIA FREELANDOO" (é a que a Freelandoo processou — destaque positivo) |
  | pendente | chip amarelo "PENDENTE" |
  | vencida | **carimbo** vermelho "VENCIDA" inclinado sobre a borda direita do talão (mesmo desenho do ✕ do calendário: tinta gasta, multiply) |
  | cancelada / estornada | chip cinza; valor riscado |
- **PAGAR**: botão `BTN_GOLD` só em pendente/vencida **e** quando a academia habilitou o pagamento pela Freelandoo; sem habilitação, no lugar aparece "Pague na recepção" em mono apagado (não esconder a dívida).
- Ordem: cronológica decrescente; lista mostra 6 e "Ver todas (14)" expande na própria página.
- Computador: talões ocupam a largura e as colunas alinham (vencimento | forma | valor | situação | ação) — mono alinhado à direita nos valores.
- ⟳ MOTION: talões entram empilhando; ao pagar com sucesso, o carimbo "VENCIDA" sai e o chip "PAGO VIA FREELANDOO" bate no lugar.
- Estados: vazio → talão fantasma tracejado "Nenhuma mensalidade registrada ainda"; carregando → 3 talões-esqueleto; erro → `SpState` erro compacto.

**Estado vazio da página (sem academia)**: cena de vitrine — um calendário-objeto **fantasma** (papel 40% com contorno tracejado, sem marcas) inclinado por `clip-path`/posição, ao lado o texto "CONECTE SUA ACADEMIA" Anton 32 px, o parágrafo atual (`connectText`) e o CTA "Conecte-se a uma academia". Mostra o que a pessoa ganha em vez de dizer.

### 4.3 /esportes/treino

```
CELULAR                                     COMPUTADOR (2 colunas: súmula 8/12 · lateral 4/12)
[headcard TREINO]                           [headcard TREINO]
┌‹  TERÇA, 27 DE OUTUBRO  ›┐  DayStrip      ┌‹ seg 26 │ TER 27 ▓ │ qua 28 ›┐ (strip com 5 dias)
└──────────────────────────┘                ┌─ SÚMULA ──────────────────────┐ ┌─ FICHAS ─────┐
┌[TREINO A ▓][TREINO B][C]─┐ fichas         │ TREINO A      ◯ 3/9  [⤢][✎]   │ │ A ▓ ativa     │
┌──────────────────────────┐ [■ rosa]       │ do professor · 23 dias · vence│ │ B             │
│ TREINO A          ◯ 3/9  │                │ 01 ■✓ Supino reto   4×10 40kg │ │ + NOVA FICHA  │
│ Do professor · 23 dias   │                │ 02 ■✓ Crucifixo     3×12      │ ├──────────────┤
│ Vence em 12/11 (16 dias) │                │ 03 □  Tríceps corda 3×15      │ │ ESTA SEMANA   │
├──────────────────────────┤                │ …                             │ │ ▮▮▯▮▯▯▯ 3/7  │
│01 [✓] SUPINO RETO  4×10  │                └───────────────────────────────┘ └──────────────┘
│   PEITO · 40 kg          │
│02 [✓] CRUCIFIXO    3×12  │
│03 [ ] TRÍCEPS CORDA 3×15 │
│ …                        │
└──────────────────────────┘
```

- **`DayStrip`** (peça única para treino, histórico e grade do professor — hoje são três cópias da faixa): no celular, a faixa `BAR_SOLID` atual com data em Anton 18 px; no computador, 5 dias visíveis (o ativo em ember), setas nas pontas. "HOJE →" vira chip. ⟳ MOTION: troca de dia desliza na direção da seta.
- ⚠️ **O miolo da súmula foi detalhado na seção 8 (Checklist do treino)**, que prevalece sobre este item onde divergirem (placar no topo, check quadrado ≥ 56 px, estados e animação do clique).
- **Súmula de treino (`WorkoutSheet`)**: o card vira "súmula" — cabeçalho com nome da ficha Anton 28 px, anel de progresso `RingGauge` 56 px "3/9" à direita (cor rosa da sala), linha de meta (autor · dias com a ficha · `ValidityLine`), botões ⤢ ✎ 🗑 em quadrados. Exercícios: **número de ordem** Anton 20 px (01, 02…), o `BigCheck` atual (manter — Alex pediu grande e verde), nome Archivo 800 16 px caixa alta, grupo muscular como chip miúdo, séries×reps e carga em mono à direita. Linha marcada: fundo `SP.raise`, nome riscado, número de ordem vira verde.
- **Fichas múltiplas**: segmentado reto (como as abas da raiz) em vez de chips de 10 px.
- **Concluído**: quando 100%, o cabeçalho ganha o carimbo "TREINO CONCLUÍDO" (verde, mesmo desenho dos carimbos) e o anel fecha. ⟳ MOTION: momento de celebração contido **dentro do card** (o anel fecha, o carimbo bate, faíscas pequenas saindo do anel — nada na tela inteira).
- **Lateral (computador) / abaixo (celular)**: "ESTA SEMANA" = 7 pips (dias com sessão concluída) + total. Usa dado já existente (`workouts.sessions_7d`) quando disponível; senão some.
- Vazio: súmula fantasma tracejada "NENHUMA FICHA ATIVA" + dois CTAs ("Montar minha ficha", texto "ou peça ao professor na academia").
- Modal tela cheia da ficha: ver 4.6.

### 4.4 /esportes/historico

```
CELULAR                                     COMPUTADOR
[headcard HISTÓRICO  [METAS]]               [headcard HISTÓRICO  [METAS]]
[DayStrip]                                  [DayStrip]
┌─ CALORIAS ──────┬─ ÁGUA ─────────┐        ┌─ CALORIAS ────────┬─ ÁGUA ──────────┬─ MACROS DO DIA ─┐
│   ◯◯◯◯◯         │ ┌──┐ 1,5 L     │        │  anel 140 px       │ tanque 1,5/2,5L │ P ▮▮▮▮▯ 92g     │
│  ◯ 1.420 ◯      │ │▒▒│ / 2,5 L   │        │                    │ [−] [+ COPO]    │ C ▮▮▮▯▯ 160g    │
│   ◯◯◯◯◯ /2.000  │ │▒▒│ [−][+COPO]│        └────────────────────┴─────────────────┴─────────────────┘
│ P 92 C 160 G 40 │ └──┘           │        DIÁRIO (4 colunas: café · almoço · lanche · jantar)
└─────────────────┴────────────────┘        PESO & ALTURA (número + sparkline) │ MEDIÇÕES (lista)
DIÁRIO DE REFEIÇÕES (cards empilhados)      OS SEUS DIAS: mapa de calor 13 semanas + lista
PESO & ALTURA · MEDIÇÕES
OS SEUS DIAS
┌ mapa de calor 13 sem × 7 ┐
│ ▪▪▫▪▪▪▫ …                │
└──────────────────────────┘
┌ lista de dias ───────────┐
```

- **Calorias**: `RingGauge` 120 px (computador 140) com o número Anton no centro e "/ 2.000 kcal" mono; passou da meta → o excedente desenha um **segundo arco** em `SP.bad` por cima (não fica "cheio" mentindo). Macros do dia como três mini-barras retas embaixo.
- **Água**: **tanque** vertical (retângulo reto 40×96 px) que enche de `SP.water` com marcas de 250 ml; botões − e "+ COPO 250 ML" como hoje. ⟳ MOTION: o nível sobe/desce ao tocar no copo (e uma "onda" plana na superfície do líquido — dentro do tanque).
- Mantém **duas colunas no celular** (pedido anterior do Alex).
- **Diário de refeições (`MealCard`)**: cabeçalho `SpeedBand` curto com nome da refeição, kcal da refeição em mono e o "+" preto; itens com nome, gramas mono e kcal ember. Refeição vazia: linha tracejada "Nada registrado · + adicionar" (o texto todo é alvo).
- **Peso & altura**: número herói (Anton 56 px) + **sparkline** das últimas medições (até 12) + delta 30 d em chip (verde se caiu, laranja se subiu — mantém a lógica atual). Botão "Registrar". Medições ao lado/abaixo como lista mono.
- **Os seus dias**: novo **mapa de calor** (`HeatCalendar`) de 90 dias (13 colunas-semana × 7, células quadradas 18 px no celular, 22 no computador), intensidade = % da meta de calorias atingida (4 degraus de laranja sobre `SP.inner`); a água aparece como um ponto ciano `[data-dot]` no canto da célula quando bateu a meta. Tocar numa célula abre o dia (mesmo `openDay`). Abaixo, a **lista** atual repaginada: data Anton, duas mini-barras (kcal/água) com tampa, macros mono no computador.
- Estados: carregando → anéis vazios com "—" e o tanque vazio (formas visíveis, sem pular layout); erro → `SpState`; sem dias → mapa de calor fantasma + CTA "Registrar o dia de hoje".

### 4.5 /esportes/indicadores (seção d detalha os gráficos)

```
CELULAR (1 coluna, ordem por importância)         COMPUTADOR (bento 12 colunas)
[headcard INDICADORES + ticker]                   [headcard INDICADORES + ticker]
┌ HERÓI: CONSISTÊNCIA ─────────────┐[■ ciano]     ┌ HERÓI CONSISTÊNCIA (8) ───────────────┬ IMC (4) ─────────┐
│ 🔥 6 DIAS SEGUIDOS                │              │ 🔥 6  ·  waffle 30 dias  · treinos 12 │  arco + agulha   │
│ ▪▪▫▪▪▪▪▫▪▪ (waffle 30 d)          │              ├ PESO (6) ───────────────┬ PROTEÍNA (6) ─────────────────┤
│ 12 TREINOS · 18 CATRACA (30 d)    │              │ área + delta             │ bullet 1,2–2,0 g/kg           │
└──────────────────────────────────┘              ├ CALORIAS (6) ──────────┬ ÁGUA (6) ───────────────────────┤
┌ IMC ──────────┬ PESO 30 D ────────┐             │ anel média 7d + barras 14d│ anel média 7d + barras 14d    │
│ arco semáforo │ −1,2 kg ↓  sparkl │             ├ MACROS (12) ─────────────────────────────────────────────┤
└───────────────┴───────────────────┘             │ barra 100% rotulada + mini-legenda                         │
┌ CALORIAS ── anel + 14 barras ────┐             └───────────────────────────────────────────────────────────┘
┌ ÁGUA ────── anel + 14 barras ────┐
┌ PROTEÍNA ── bullet ───────────────┐
┌ MACROS ──── barra 100% ───────────┐
┌ PESO ────── linha com área ───────┐
```

- Layout **bento** (tamanhos diferentes = fim do "quadrado"). Um card herói por tela, na cor da sala (ciano `PILL.indicators`) e com brilho/halftone; os demais com sombra dura discreta.
- Cada card: kicker com ícone, número protagonista, um gráfico, uma linha de contexto (mono). Card sem dado mostra o gráfico **fantasma** (forma tracejada) + o texto vazio atual — a forma fica, o dado falta.
- ⟳ MOTION: cards entram em cascata conforme aparecem na rolagem; cada gráfico "desenha" ao entrar (ver d).

### 4.6 Modais (todos)

Base comum: **`TabloidDialog`** (papel, já existe) ou, para modais de trabalho escuros, um `SpSheet` novo — no celular **folha de baixo** de altura total menos 24 px (reta, encostada na base, alça retangular 32×4 px no topo), no computador **modal central** `max-w-lg`. Cabeçalho = `SpeedBand` na cor da sala com kicker + título Anton 24 px + ✕ quadrado. Rodapé fixo com ações (primária ember à direita). ⟳ MOTION: entrada de baixo (celular) / escala curta (computador); o fundo escurece (camada de overlay de opacidade — é a única camada de tela cheia, e só anima opacidade).

| Modal | Visual |
|---|---|
| **Seletor de esporte** (`sport-picker-modal`) | Grade 2/3 colunas de **"camisas"**: tile reto alto (aspect 4:5) com ícone grande do esporte em traço `SP.glow`, nome Anton 18 px embaixo; selecionado = fundo ember + check no canto + sombra dura. Primeiro acesso: título "QUAL É O SEU ESPORTE?" em 32 px e o fundo do modal com linhas de quadra. ⟳ MOTION: tiles entram em cascata; escolhido "pula". |
| **Propostas do professor** | Cabeçalho com avatar circular do professor + "ALTERAÇÃO DO PROFESSOR". Corpo como **diff**: cada item numa linha "ANTES → DEPOIS" (peso 82,0 → **80,5 kg**; meta 2.200 → **2.000 kcal**; ficha com lista de exercícios adicionados em verde/removidos riscados em vermelho). Rodapé: Chat (escuro), Recusar (escuro), Confirmar (ember). |
| **Metas** (kcal/água) | Dois campos grandes com o valor em Anton 32 px e "kcal"/"ml" mono; abaixo de cada um, uma prévia do anel/tanque na meta nova. |
| **Registrar medição** | Dois campos grandes (peso, altura) com teclado decimal; prévia do IMC resultante num arco mini. |
| **Busca de alimento** | Folha alta; campo de busca grudado no topo; resultados com nome, chip de fonte (local/OFF) e kcal/100 g mono; escolhido → painel de gramas com stepper (−/+ 10 g) e kcal calculada em Anton. Scanner: viewport da câmera com a mira retangular ember já existente + cantos em L. |
| **Ficha tela cheia** | Súmula de papel (objeto impresso) com o mesmo layout da 4.3 em tipos maiores — boa para ler no aparelho apoiado no banco da academia. |
| **Editor de ficha** (`workout-plan-editor`) | Duas zonas: "EXERCÍCIOS DA FICHA" (lista ordenável com número de ordem, séries/reps/descanso em campos mono) e "BIBLIOTECA" (busca + grupos musculares como segmentado). `ValidityPicker` como segmentado 30/60/90. No computador lado a lado. |
| **Confirmações** (desvincular, excluir ficha) | Substituem `window.confirm`: `TabloidDialog` pequeno, ícone de alerta, texto, "Cancelar" + ação destrutiva em `SP.bad`. |
| **Vincular CPF** (vitrine e academia) | Cabeçalho com o avatar da academia; campo de CPF grande com máscara e dígitos em mono; nota de privacidade curta. |
| **Fichas vencidas** (professor) | Lista de alunos em cartões com chip "VENCIDA HÁ X DIAS" e validade; CTA "Ver treinos por data". |
| **Pagar mensalidade** | Resumo em talão de papel (mês, valor, academia) + o checkout existente do Mercado Pago (não redesenhar o checkout). |
| **Recebimentos (editar PIX)** | Ver 4.8. |

### 4.7 /academias — vitrine

```
CELULAR                                   COMPUTADOR
‹ VOLTAR PARA ESPORTES                    ‹ VOLTAR PARA ESPORTES
┌ masthead ACADEMIAS ──────────────┐      ┌ masthead ACADEMIAS  ─ quadra ─ refletor ───────────────┐
│ [ESPORTES · FREELANDOO]          │      └────────────────────────────────────────────────────────┘
│ ACADEMIAS (Anton 56)             │      ┌ busca: [🔍 nome............] [cidade....] [BUSCAR ▓] ┐
└──────────────────────────────────┘      ┌──────────────┬──────────────┬──────────────┐
┌[🔍 nome ........ ][cidade ▾]▓┐           │ card academia │ card academia │ card academia │
┌ card academia ───────────────┐          │ (mini headcard)│              │              │
│ ░ capa ░░░░░░░░░░░░░░░░░░░░░ │          └──────────────┴──────────────┴──────────────┘
│ (2:3)  IRON GYM CENTRO       │
│        Campinas · SP         │
│ 👥 214 vinculados  [CONECTAR]│
└──────────────────────────────┘
```

- Mantém o mini-headcard (foto 2:3 mordendo o banner) — é a cara das comunidades. Ganha: faixa de stats mono (vinculados, cidade), CTA à direita; **vinculada** = borda ember 3 px + selo "SUA ACADEMIA ✓" no canto do banner e CTA "ABRIR". Computador em grade de 3.
- Busca: uma barra única reta com os dois campos e o botão colados (sem vão), ícone dentro do campo.
- Masthead: o chip deve dizer "Esportes · Freelandoo" (hoje "Fitness · Freelandoo").
- ⟳ MOTION: cards entram em cascata; hover (computador) faz o banner do card "acender" (camada de brilho dentro do card).
- Vazio: quadra fantasma + "Nenhuma academia encontrada" + "Cadastrar minha academia". Carregando: 3 cards-esqueleto com a silhueta do mini-headcard.

### 4.8 /academias/[slug] — academia (aluno, visitante e dono)

```
CELULAR                                       COMPUTADOR
‹ VOLTAR          VER ACADEMIAS ›             ‹ VOLTAR                               VER ACADEMIAS ›
[headcard da academia: capa + camadas,        [headcard da academia]
 foto 2:3, pills Membros/Ranking]
┌ MEU VÍNCULO ─────────────────────┐          ┌ MEU VÍNCULO (largura toda, horizontal) ────────────────┐
│ ✓ MATRÍCULA ATIVA · Plano Black  │          │ ✓ ATIVA · Black · desde 12/03 · [MINHA FREQUÊNCIA →]  │
│ desde 12/03/2026                 │          └────────────────────────────────────────────────────────┘
│ [MINHA FREQUÊNCIA →]       [⋯]  │          ┌ CENTRAL DO DONO ──────────────────────────────────────┐
└──────────────────────────────────┘          │ [CONEXÃO][RECEBIMENTOS ▓][REPASSES][INTEGRAÇÕES]       │
┌▓ CENTRAL DO DONO ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓┐          │  conteúdo da aba                                       │
│[CONEXÃO][RECEB.▓][REPASSES][INTEG]│         └────────────────────────────────────────────────────────┘
│  (aba Recebimentos)              │          MURAL DA ACADEMIA
│  ┌ CHAVE PIX ─────────────────┐  │
│  │ CPF  ***.456.789-**        │  │
│  │ Titular  Iron Gym Ltda     │  │
│  │ CPF/CNPJ 12.***.***/0001-** │  │
│  │ [EDITAR]                   │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
MURAL DA ACADEMIA
```

- **Meu vínculo** (`MembershipCard` reaproveitado da 4.2, variante compacta): situação traduzida, plano, "desde", CTA "MINHA FREQUÊNCIA →" (leva a `/esportes/academia`; hoje leva a `/esportes` com o rótulo "Meu painel fitness"), desvincular no menu ⋯ com `TabloidDialog`. Sem vínculo: o botão grande "VINCULAR MATRÍCULA (CPF)" vira um card-convite com o calendário fantasma pequeno.
- **Central do dono** (`OwnerConsole`) — substitui o `<dl>` "Gestão — conexão com o software" + os dois cards soltos. Um painel com cabeçalho `SpeedBand` e abas segmentadas (sem rolagem: 4 colunas iguais no celular com rótulos curtos):
  1. **CONEXÃO** — status do sync como "semáforo" (quadrado grande verde/amarelo/vermelho + palavra), última sincronização, URL da API em mono quebrando, botões Testar (com o ponto ok/falha atual) e Sincronizar, Trocar avatar/capa.
  2. **RECEBIMENTOS** (item decidido nº 3a) — `PayoutSettingsCard`: cartão de papel com **tipo de chave** (CPF, CNPJ, e-mail, telefone, aleatória) como chip, **chave** mascarada em mono 16 px (olho para revelar), **titular**, **CPF/CNPJ** mascarado; "EDITAR" abre `SpSheet` com o formulário (tipo segmentado, chave, titular, documento) e a nota "As mensalidades pagas pela Freelandoo caem nesta chave". Não configurado → callout ember listrado "CONFIGURE SEU PIX PARA RECEBER AS MENSALIDADES PELA FREELANDOO" + CTA. Salvo → ⟳ MOTION: carimbo "CHAVE CONFIRMADA".
  3. **REPASSES** (item decidido nº 3b) — topo com três números (`StatCard` compacto): **A RECEBER**, **DISPONÍVEL**, **REPASSADO NO MÊS** (Anton, mono para centavos). Lista `PayoutRow`:
     ```
     CELULAR (cartão-recibo)                COMPUTADOR (tabela, números mono à direita)
     ┌ OUT/26 · Maria S. ──── [DISPONÍVEL]┐  COMPET. │ ALUNO    │ BRUTO   │ TAXA MP │ FREELANDOO │ LÍQUIDO │ DISP. EM │ SITUAÇÃO
     │ Bruto               R$ 129,90     │  OUT/26  │ Maria S. │ 129,90  │ −4,02   │ −2,50      │ 123,38  │ 03/11    │ DISPONÍVEL
     │ − Taxa Mercado Pago   R$ 4,02     │
     │ − Taxa Freelandoo     R$ 2,50     │
     │ ═════════════════════════════════ │
     │ = Líquido          R$ 123,38      │  ← Anton
     │ Disponível em 03/11/2026          │
     └───────────────────────────────────┘
     ```
     Situação: aguardando (amarelo), disponível (verde), repassado (ember chapado), retido/em disputa (vermelho), estornado (cinza, valores riscados). A conta é exibida **exatamente** como vem do servidor (a regra de pagamentos: tarifa sai de quem recebe, partes somam o pago, estimativa ≠ dinheiro — se a taxa MP ainda for estimativa, mostrar "≈" e "estimada" em mono apagado). Filtro por mês (segmentado ‹ OUT/26 ›). Vazio: recibo fantasma "Nenhum repasse ainda". ⟳ MOTION: as linhas do recibo "imprimem" de cima para baixo ao expandir.
  4. **INTEGRAÇÕES** — `PartnerKeyCard` e `WhatsappForwardCard` atuais, re-vestidos como dois blocos lado a lado (computador) com o mesmo cabeçalho; chave crua mostrada uma vez num campo de papel com "COPIE AGORA" carimbado.
- **Gaveta dos números** (`RetractableColumn`): conteúdo re-vestido com `StatCard` compacto, destaque do mês com moldura dourada do pódio, top 5 com barras até a meta.
- **Mural**: `AcademyFeed` intacto; título em `SpeedBand`.
- Visitante: headcard + mural + card-convite de vínculo. Professor: + pill Membros com ponto de ficha vencida (já existe).

### 4.9 /academias/[slug]/membros

- Topo: `PageBackLink` "Voltar pra academia" (já existe) + título Anton "MEMBROS" + abas segmentadas MEMBROS | TREINOS POR DATA (com o ponto de vencida).
- **Membros** — computador: tabela com cabeçalho grudado (`sticky`) em `SP.band`, linhas zebradas por `SP.inner`, status como chip traduzido, "Prof" como chip ember, "Ficha vencida" como carimbo pequeno. Celular: **cartões** (avatar circular, nome, chips, plano, vínculo, botão Promover/Remover) — nada de tabela rolando de lado.
- **Treinos por data** (`training-grid`): `DayStrip` compartilhado; computador mantém a grade de 9 colunas com números mono alinhados e mini-barras nas colunas kcal/água; celular vira cartão por aluno com 4 "mini-placares" (kcal, água, freq 30 d, treinos 7 d) e a ficha ativa num chip; tocar abre o aluno (sheet existente).
- Estados: negado → `Blocked` atual re-vestido em `SpState`; vazio → "Ninguém vinculou ainda. Divulgue a página!" + botão de convite.

### 4.10 /academias/[slug]/ranking

Já tem pódio editorial (papel, pedestais, coroa). Ajustes para conversar com o Placar: números do pódio em Anton com degradê `SP.hot → SP.glow`; seletor de métrica (Frequência / Posts / Compartilhamentos) como segmentado reto; a lista inteira ganha barra de progresso até a meta (`MeterBar`) e o "eu" destacado com borda ember. Temporada ativa: chip listrado com dias restantes. Modal de metas → `SpSheet`. ⟳ MOTION: pedestais sobem em ordem 3-2-1; a coroa assenta por último.

---

## (d) Os indicadores repensados

Princípio: **um número, uma forma, um contexto.** Cada dado ganha o gráfico que responde à pergunta que a pessoa faz.

| Dado (`/fitness/indicators`) | Pergunta da pessoa | Forma | Detalhe visual |
|---|---|---|---|
| `streak_days` | "Estou mantendo?" | **Herói**: número gigante + chama + **waffle de 30 dias** (30 quadrados 10 px; dias registrados acesos em ember, o de hoje com contorno) | O waffle precisa da lista de dias registrados (o `chart_14d` cobre 14; para 30 o back precisa expor os dias — fallback: waffle de 14) |
| `workouts.sessions_7d/30d` | "Quanto treinei?" | Dentro do herói: 7 **pips** retos (semana) + "12 no mês" | |
| `academy.frequency_30d` | "Fui à academia?" | Dentro do herói: número + link "ver calendário →" (`/esportes/academia`) | Só aparece com academia |
| `bmi` | "Estou numa faixa saudável?" | **Arco semáforo** de 180° (5 segmentos retos de arco com as cores atuais: ciano, verde, amarelo, laranja, vermelho) + **agulha** + valor Anton no centro + classe | Os limites 18,5 / 25 / 30 / 35 / 40 marcados em mono embaixo. ⟳ MOTION: agulha varre do zero e assenta |
| `weight.series`, `delta_30d` | "Estou perdendo/ganhando?" | **Linha com área** (área em degradê ember 20%→0) + marcadores quadrados + rótulo direto no último ponto + chip de delta | Eixo Y só com mín/máx em mono; no celular, toque num marcador mostra a data. ⟳ MOTION: a linha se desenha da esquerda para a direita |
| `kcal.avg_7d` vs `goal` | "Estou na meta?" | **Anel** (média 7 d / meta) com número no centro | Acima de 100% → arco de excesso em vermelho (mesma regra do Histórico) |
| `kcal.days_on_target_30d / days_logged_30d` | "Quantas vezes acertei?" | Fração mono "18/24 dias na meta" ao lado do anel | |
| `chart_14d.kcal` | "Como foi a semana?" | **Barras com tampa**: barra `SP.glow` 70% + tampa sólida 3 px; **hoje** destacado (barra cheia + rótulo); **linha de meta** tracejada com rótulo à direita; barras acima da meta ganham tampa vermelha | Dias da semana em letra única embaixo (D S T…); sem dado = traço no chão |
| `water.avg_7d`, `days_on_target_30d`, `ml_per_kg`, `chart_14d.water_ml` | idem | **Anel ciano** + **barras ciano** iguais às de calorias | Mesma gramática → leitura instantânea |
| `macros.protein_g_per_kg` | "Comi proteína suficiente?" | **Bullet chart** horizontal: régua 0–3 g/kg, faixa de referência 1,2–2,0 sombreada, barra do valor, marcador | Rótulo "REFERÊNCIA 1,2–2,0" em mono |
| `macros.pct` | "Como está minha dieta?" | **Barra 100% empilhada** alta (24 px) com rótulos **dentro** de cada segmento (% Anton) + g/dia embaixo de cada | Não usar donut (pedaços pequenos ficam ilegíveis); a barra é reta e combina com o tabloide |
| `sparkline` (genérico) | — | Em todos os `StatCard` que têm série: 48×16 px no canto, último ponto em quadrado | |

**`StatCard`** (o substituto do `Tile`) — três tamanhos:

```
HERÓI (2 col)                         REGULAR                     COMPACTO
┌▓ kicker ───────────── [ícone]┐      ┌ kicker ────── ⌁spark┐     ┌ kicker ─┐
│ 🔥                           │      │ 1.840               │     │ 12      │
│  6  DIAS SEGUIDOS            │      │ kcal · média 7d     │     │ no mês  │
│ ▪▪▫▪▪▪▪▫▪▪▪▪▪▫▪▪▪▪▪▪▫▪▪▪▪▪▪▪ │      │ [▲ +4% vs 30d]      │     └─────────┘
│ 12 treinos · 18 catraca      │      │ ▁▃▅▂▆█▅ (gráfico)   │
└──────────────────────────────┘      └─────────────────────┘
```
- Herói: borda 3 px, sombra dura da sala 8 px, brilho de brasa, `tx-halftone` no canto, número 64–88 px com degradê.
- Regular: borda 2 px, sombra 6 px `SP.band`, número 36–48 px.
- Compacto: sem sombra, número 28–36 px (para ticker, gaveta, métricas da academia).
- **Chip de delta** (`DeltaChip`): ▲/▼ + valor mono; verde/vermelho conforme o "bom" daquele dado (peso caindo é verde; água caindo é vermelho) — o card declara a direção boa.
- Estado vazio do card: número "—", gráfico fantasma tracejado, frase de vazio atual (as chaves `indBmiEmpty`, `indProteinEmpty` etc. continuam).
- Estado carregando: o card com a forma do seu gráfico em `SP.inner` (anel cinza, barras em altura fixa) + varredura de brilho dentro do card (⟳ MOTION). Nunca o spinner central atual.
- Estado erro: um card largo `SpState` com "Tentar de novo" (hoje é só um parágrafo).

---

## (e) Catálogo de componentes novos — `app/(header-only)/esportes/_components/ui/`

A academia (`/academias/**`) importa daqui via `academy-ui.ts` (como já faz com `fitness-ui`), nunca copia.

| Arquivo | Componente | O que é | Usado em |
|---|---|---|---|
| `sp-tokens.ts` | `SP`, classes `SP_CARD`, `SP_HERO`, texturas | Tokens da seção (b); reexporta `fitness-ui` | todos |
| `sp-textures.tsx` | `CourtLines`, `Halftone`, `SpeedStripes`, `Hatch` | Texturas estáticas como SVG/CSS pequenos | headcard, cards, faixas |
| `speed-band.tsx` | `SpeedBand` | Faixa de seção em paralelogramo (`clip-path`) com kicker/título/ação | todas as seções |
| `score-number.tsx` | `ScoreNumber` | Número Anton tabular com unidade mono e degradê opcional; ponto de entrada da contagem | todos os números |
| `stat-card.tsx` | `StatCard` (hero/regular/compact), `DeltaChip` | Substitui o `Tile` | indicadores, academia, ticker, gaveta, repasses |
| `ring-gauge.tsx` | `RingGauge` | Anel de meta (SVG, traço reto `stroke-linecap="butt"`), com arco de excesso | calorias, água, mês da academia, súmula |
| `arc-gauge.tsx` | `ArcGauge` | Arco semáforo 180° + agulha | IMC, prévia na medição |
| `sparkline.tsx` | `Sparkline` | Mini-linha 48×16 | cards, peso |
| `bar-strip.tsx` | `BarStrip` | Barras diárias com tampa, meta, hoje | kcal/água 14 d |
| `area-line.tsx` | `AreaLine` | Linha com área e marcadores | peso |
| `bullet-meter.tsx` | `BulletMeter`, `MeterBar` | Bullet com faixa de referência; barra até meta | proteína, ranking, gaveta |
| `stack-bar.tsx` | `StackBar` | Barra 100% rotulada | macros |
| `waffle.tsx` | `Waffle`, `Pips` | Grade de dias / pips da semana | herói de consistência, treino |
| `heat-calendar.tsx` | `HeatCalendar` | Mapa de calor 13 semanas | histórico |
| `calendar-object.tsx` | `CalendarObject`, `CalendarDayCell` | O calendário de papel (item 1) | academia, estados vazios |
| `stamp.tsx` | `Stamp` (`x`, `check`, texto) | Carimbo com tinta gasta (3 variantes de path) | calendário, talão, treino concluído, chave confirmada |
| `due-ticket.tsx` | `DuesList`, `DueTicket`, `PayCallout` | Talões de mensalidade (item 2) | academia |
| `membership-card.tsx` | `MembershipCard` (full/compact) | Cartão da matrícula | academia (aluno), academia `[slug]` |
| `day-strip.tsx` | `DayStrip` | Navegador de data único | treino, histórico, grade do professor |
| `sport-tabs.tsx` | `SportTabs`, `Segmented` | Abas sem rolagem + segmentado reto genérico | raiz, fichas, métricas do ranking, central do dono, membros |
| `headcard-ticker.tsx` | `HeadcardTicker` | Faixa de 3 números sob o título | `FitnessHeadcard` |
| `water-tank.tsx` | `WaterTank` | Tanque vertical de água | histórico, metas |
| `workout-sheet.tsx` | `WorkoutSheet` | Moldura da súmula (cabeçalho, fichas, lateral) | treino, modal tela cheia |
| `workout-checklist.tsx` | `WorkoutChecklist`, `ChecklistRow`, `CheckButton`, `ChecklistScore`, `ChecklistProgress` | O checklist do treino da **seção 8** (substitui o `BigCheck`) | treino, modal tela cheia |
| `sp-sheet.tsx` | `SpSheet` | Folha de baixo (celular) / modal (computador), escura, com `SpeedBand` | modais de trabalho |
| `sp-confirm.tsx` | `SpConfirm` | Confirmação em `TabloidDialog` | desvincular, excluir |
| `sp-state.tsx` | `SpState` (empty/error/denied), `SpSkeleton` | Estados com forma fantasma | todas |
| `owner-console.tsx` | `OwnerConsole` | Painel do dono com abas | academia `[slug]` |
| `payout-settings-card.tsx` | `PayoutSettingsCard`, `PayoutSettingsForm` | Recebimentos PIX (item 3a) | academia `[slug]` |
| `payout-list.tsx` | `PayoutSummary`, `PayoutRow` | Repasses com cálculo (item 3b) | academia `[slug]` |
| `member-card.tsx` | `MemberCard` | Versão cartão das linhas de membros/grade | membros |

Regras dos componentes: todos aceitam `accent` (cor da sala); nenhum faz I/O; números entram já formatados pelo `useLocale()`; nenhum usa `rounded-*`; gráficos expõem texto acessível (`<title>`/`aria-label` + resumo `sr-only`); componentes animáveis expõem um `ref`/prop para o motion designer (ex.: `ScoreNumber value` e `RingGauge progress` declarativos — a animação entra por fora).

---

## (f) Ordem de implementação em slices

Cada slice é publicável sozinho (front `npm run lint` + `npm run build` num worktree; QA no celular de 375 px).

1. **S1 — Fundação**: `sp-tokens`, `sp-textures`, `speed-band`, `score-number`, `stat-card`, `sp-state`/`SpSkeleton`, `segmented`. Script i18n do lote. Nenhuma tela muda ainda (ou só uma vitrine interna de conferência fora de rota pública).
2. **S2 — Indicadores** (o maior incômodo do Alex): `ring-gauge`, `arc-gauge`, `bar-strip`, `area-line`, `bullet-meter`, `stack-bar`, `waffle`, `sparkline`; reescrever `indicators-tab.tsx` no bento. Primeira entrega visível do "uau".
3. **S3 — Headcard + raiz**: banner com quadra/refletores, selo do esporte, `HeadcardTicker`, `PageBackLink`, outline na cor da sala, `SportTabs` sem rolagem, faixa "Seu esporte", `AcademyTab` com mini-cabeçalho e `SpConfirm`. Corrigir os textos "Fitness" → "Esportes" no chip/masthead.
4. **S4 — Minha academia (front)**: `MembershipCard`, `CalendarObject` + `Stamp`, `DuesList`/`DueTicket`/`PayCallout`, estado vazio. **Depende do back**: `linked_at`, leitura por mês, forma de pagamento, `paid_via_freelandoo`, flag de pagamento habilitado e o fluxo de pagar. Se o back não estiver pronto: entregar o calendário com o mês corrente e as mensalidades sem "Pagar" (botão nasce quando a flag chegar).
5. **S5 — Treino**: `DayStrip` (troca as três cópias), `WorkoutSheet`, fichas em segmentado, carimbo de concluído, pips da semana, modal tela cheia em papel.
6. **S6 — Histórico**: anel de calorias, `WaterTank`, `MealCard`, peso com sparkline, `HeatCalendar` + lista.
7. **S7 — Modais**: `SpSheet`, seletor de esporte em "camisas", propostas em diff, metas/medição com prévia, busca de alimento, editor de ficha, CPF.
8. **S8 — Academia `[slug]` + Central do dono**: `MembershipCard` compacto, `OwnerConsole` (Conexão/Integrações re-vestidos), **Recebimentos** e **Repasses** (dependem dos endpoints do back de PIX/repasses), gaveta re-vestida.
9. **S9 — Vitrine, membros e ranking**: cards da vitrine, busca colada, `MemberCard` no celular, grade com `DayStrip`, ranking com números de placar e `MeterBar`.
10. **S10 — Passe de qualidade**: celular real (FPS ao rolar indicadores e calendário), `prefers-reduced-motion`, contraste (rótulos `SP.mute` sobre `SP.panel` ≥ 4.5:1 nos tamanhos pequenos — conferir), leitores de tela no calendário, cobertura i18n (`node scripts/i18n-coverage.js` em cada arquivo tocado).

O motion designer pluga a coreografia a partir do S2 em cada slice (os pontos ⟳ MOTION são os ganchos).

---

## 8. Checklist do treino (peça própria — pedido do Alex, 2026-10-27)

Substitui o miolo do `WorkoutSheet` da 4.3 (a súmula vira este checklist). Mora em `esportes/_components/ui/workout-checklist.tsx` (`WorkoutChecklist`, `ChecklistRow`, `CheckButton`, `ChecklistScore`, `ChecklistProgress`) e é usado no card de `/esportes/treino` **e** no modal tela cheia (`workout-today-card.tsx`) — uma peça só, para os dois não divergirem (mesma razão do `BigCheck` atual, que este `CheckButton` substitui).

**Referência e o que muda:** a referência é um to-do list moderno (card escuro, cabeçalho com ícone + título + contadores + voltar, linhas em cartões, círculo de check vazio / em andamento / concluído com texto riscado, rodapé "2 OF 6 COMPLETED" + barra fina). Daqui fica a **estrutura**. Muda: cantos retos (o círculo vira **quadrado** de check — regra 2), paleta Esportes (rosa da sala do Treino `#DB2777` como acento da peça, verde `#22C55E` só para "feito", ember para ação), o check passa a ser o **protagonista** da linha (≥ 56 px), e o progresso sobe para o **topo** como placar gigante.

### 8.1 Anatomia

```
CELULAR (375)                                    COMPUTADOR (card 8/12 + lateral 4/12, como a 4.3)
┌──────────────────────────────────────┐ [■ rosa] ┌──────────────────────────────────────────────┐ ┌─ FICHAS ─┐
│ ☰ TREINO A          [⤢] [✎] [⋯]      │          │ ☰ TREINO A · do professor · vence 12/11  [⤢][✎][⋯]│ │ A ▓      │
│ do professor · 23 dias · vence 12/11 │          ├──────────────────────────────────────────────┤ │ B        │
├──────────────────────────────────────┤          │        2 / 6           ▸ FALTAM 4             │ │ + NOVA   │
│                                      │          │      EXERCÍCIOS        3 de peito · 1 tríceps │ └──────────┘
│          2 / 6      ← placar Anton   │          │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░ 33%      │
│        EXERCÍCIOS     88/48 px       │          ├──────────────────────────────────────────────┤
│ ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░  33%     │          │ ┌────┐ 01  SUPINO RETO       4×10   40 kg   │
├──────────────────────────────────────┤          │ │ ✓  │     PEITO · desc. 90s                  │
│┌────┐ 01 SUPINO RETO           ✓     │          │ └────┘                                          │
││ ✓  │    4×10 · 40 kg · PEITO       │          │ ┌────┐ 02  CRUCIFIXO          3×12   14 kg   │
│└────┘    (riscado, 60%)              │          │ │ ✓  │                                          │
│┌────┐ 02 CRUCIFIXO                   │          │ ┌────┐ 03  TRÍCEPS CORDA ◂ AGORA 3×15  25 kg │
││ ✓  │    3×12 · 14 kg · PEITO       │          │ │ ▪  │                                          │
│└────┘                                │          │ ┌────┐ 04  …                                    │
│┌────┐ 03 TRÍCEPS CORDA   ◂ AGORA     │          ├──────────────────────────────────────────────┤
││ ▪  │    3×15 · 25 kg · TRÍCEPS     │          │ 2 DE 6 CONCLUÍDOS  ▓▓▓▓▓░░░░░░░░░░░░░░░░░░    │
│└────┘                                │          └──────────────────────────────────────────────┘
│┌────┐ 04 ELEVAÇÃO LATERAL           │
││    │    3×12 · 8 kg · OMBROS       │
│└────┘                                │
├──────────────────────────────────────┤
│ 2 DE 6 CONCLUÍDOS   ▓▓▓▓▓░░░░░░░░░░ │ ← rodapé grudado na base do card
└──────────────────────────────────────┘
```

**Cabeçalho** (faixa `SP.panel` com filete inferior rosa 2 px): ícone de prancheta em quadrado ember 32 px, nome da ficha Anton 24 px (computador 28), linha de meta mono 11 px (autor · dias com a ficha · `ValidityLine`), à direita ⤢ (tela cheia), ✎ (editar, só ficha própria), ⋯ (excluir → `SpConfirm`). No modal tela cheia o ⤢ vira "‹ Voltar" (o "botão voltar" da referência). Com várias fichas, o segmentado de fichas fica **acima** do card (celular) ou na lateral (computador), como na 4.3.

**Placar (`ChecklistScore`)** — protagonista do topo: "**2** / 6" em Anton 88 px no celular (computador 96), o feito com degradê `SP.hot → SP.glow` e brilho de brasa, a barra "/ 6" em `SP.mute`; abaixo, kicker "EXERCÍCIOS". No computador, à direita do placar, "▸ FALTAM 4" + resumo por grupo muscular do que falta (mono). Tabular-nums: o número não "dança" de largura ao mudar.

**Barra de progresso (`ChecklistProgress`)** — logo abaixo do placar: reta, 10 px (celular) / 12 px, fundo `SP.inner`, enchimento rosa→ember em **segmentos** (um por exercício, separados por filete de 2 px do fundo — dá para contar quantos faltam) e `%` em mono à direita. A mesma barra repete **fina (4 px)** no rodapé com "2 DE 6 CONCLUÍDOS" (a leitura da referência), grudada na base do card enquanto a lista rola (`sticky bottom-0` dentro do card, não da janela).

**Linha (`ChecklistRow`)** — um cartão reto por exercício, borda 2 px `SP.line`, fundo `SP.inner`, altura mínima 72 px (celular) / 64 px:
| posição | conteúdo |
|---|---|
| esquerda | **`CheckButton`** 56×56 px (computador 48×48, mas a área clicável é a linha inteira — ver acessibilidade) |
| centro, linha 1 | número de ordem Anton 18 px (`01`) + **nome do exercício** Archivo 800 16 px caixa alta, até 2 linhas (sem `truncate` — nome de exercício longo é comum: "Desenvolvimento com halteres sentado") |
| centro, linha 2 | **séries×reps** e **carga** em Geist Mono 13 px (`4×10 · 40 kg`; sem carga → só `4×10`; reps texto livre como "até a falha" entra inteiro), grupo muscular como chip miúdo, descanso `desc. 90s` em mono apagado |
| direita (computador) | séries×reps e carga alinhados em coluna mono à direita, para leitura em tabela |
| tag | "◂ AGORA" (chip rosa) na **primeira linha não feita** — é o "em andamento" da referência |

**`CheckButton` — três estados visuais** (quadrado, nunca círculo):
| estado | desenho |
|---|---|
| **a fazer** | quadrado vazio, borda 3 px `SP.mute` 60%, fundo `SP.panel` |
| **agora** (próxima da fila, derivado no cliente: 1º não marcado — não precisa de dado novo) | borda 3 px rosa `#DB2777` + **quadradinho verde** 12 px no centro (o "ponto verde" da referência, reto) + brilho rosa estático; a linha toda ganha borda esquerda rosa 4 px |
| **feito** | quadrado **cheio** verde `#22C55E`, ✓ em `#0B0B0D` traço 4 px de ponta reta, sombra dura 3 px `#15803D`; a linha fica `SP.raise` 60%, nome **riscado** (risco 2 px `SP.mute`) e tinta a 60%, número de ordem em verde |
| enviando | igual ao estado alvo (otimista) com o ✓ a 70% até a resposta; erro → volta ao estado anterior + toast "Não deu pra salvar o check" |
| desabilitado (dia futuro / ficha vencida) | borda tracejada, sem cursor, `aria-disabled` + motivo em mono ("Dia futuro") |

### 8.2 Estados da peça

| estado | o que aparece |
|---|---|
| **carregando** | cabeçalho com nome em bloco `SP.inner`, placar "— / —", barra vazia, 4 linhas-esqueleto com o quadrado do check desenhado (forma visível, sem spinner) |
| **vazio — sem ficha** | o card inteiro como **checklist fantasma**: 3 linhas tracejadas com quadrados vazios, placar "0 / 0" apagado, texto "NENHUMA FICHA ATIVA" Anton 24 px + "Monte a sua ou peça ao professor na academia" + CTAs "Montar minha ficha" (ember) e "Ver academias" (escuro) |
| **ficha sem nenhum exercício** | cabeçalho normal, placar "0 / 0" apagado, barra tracejada, uma linha tracejada "Esta ficha está sem exercícios" + "Adicionar exercícios" (abre o editor; ficha do professor → "Peça ao professor para completar a ficha", sem botão) |
| **em andamento** | como o wireframe |
| **concluído (6/6)** | ver 8.3 |
| **desmarcar** | tocar num feito volta para "a fazer": o placar desce (6→5), a barra recua um segmento, a tag "◂ AGORA" volta para a primeira não feita; se estava concluído, o carimbo e o estado celebrado **saem** (sem confirmação — é reversível e o dedo erra; o contrário pediria um modal a cada engano) |
| **dia passado** | checks funcionam (a regra atual deixa marcar o dia escolhido), cabeçalho mostra a data em chip "TER 21/10" para não confundir com hoje |
| **erro de carga** | `SpState` erro dentro do card com "Tentar de novo" |

### 8.3 TREINO CONCLUÍDO

Ao chegar em N/N:
- O placar vira "**6 / 6**" inteiro em **verde** com o brilho trocado para verde; a barra fecha e os segmentos se fundem numa barra só verde.
- Sobre o cabeçalho bate o **carimbo** "TREINO CONCLUÍDO" (componente `Stamp`, tinta verde gasta, inclinação dentro do SVG, multiply) e, abaixo do placar, uma faixa `SpeedBand` verde: "TREINO CONCLUÍDO · {hora}" + atalho "Compartilhar no feed" (abre o `MediaComposer` já existente; opcional — se não couber no slice, fica só a faixa).
- As linhas feitas ficam como estão (riscadas); o rodapé diz "6 DE 6 CONCLUÍDOS ✓".
- Ticker do headcard (`tickerWorkouts7`) soma 1 quando a página o mostra.

### 8.4 Onde a animação dá PRAZER (ganchos para o motion designer — sem curvas aqui)

O clique é o momento central da peça; a resposta tem que ser **imediata** (otimista, antes do servidor) e acontecer **onde o dedo está**, depois propagar para o placar:
1. **No `CheckButton`** ⟳ MOTION: o quadrado "afunda" sob o dedo (press), o verde **enche** de dentro para fora, o ✓ **se desenha** (traço), e uma pequena explosão de faíscas/estilhaços retos sai das bordas do quadrado (confinada à linha). Vibração curta no celular (`navigator.vibrate`, se existir) — ponto de decisão do motion designer.
2. **No nome** ⟳ MOTION: o risco **corre** da esquerda para a direita sobre o texto; a tinta apaga para 60% depois.
3. **Na linha** ⟳ MOTION: um lampejo de luz verde atravessa o cartão (camada do tamanho da linha). A tag "◂ AGORA" **salta** para a próxima linha não feita.
4. **No placar** ⟳ MOTION: o número de cima **rola** como placar mecânico (o 2 sobe, entra o 3), com um pulso de brilho; tabular-nums garante que nada ao redor se mova.
5. **Na barra** ⟳ MOTION: o próximo segmento **acende** (enche) — no topo e no rodapé juntos.
6. **Em N/N** ⟳ MOTION: sequência curta dentro do card: segmentos se fundem, placar fica verde, carimbo **bate** (com um tremor do card), faíscas sobem do placar. Uma vez por conclusão; nada na tela inteira; nada em loop.
7. **Desmarcar** ⟳ MOTION: o inverso, mais discreto (sem faíscas): ✓ se apaga, risco recua, placar rola para baixo, segmento apaga; se desfez a conclusão, o carimbo sai.
8. Com `prefers-reduced-motion`: troca direta de estado + só a mudança de cor (sem faísca, sem tremor, sem vibração).

Desempenho: tudo em `transform`/`opacity`/`stroke-dashoffset` em elementos do tamanho do quadrado, da linha ou do placar; as faíscas são poucos elementos absolutos (ou um canvas pequeno do tamanho do card, criado só no N/N e solto depois).

### 8.5 Acessibilidade

- A **linha inteira** é o `<button type="button" aria-pressed={feito}>` (alvo ≥ 72 px de altura × largura toda); o `CheckButton` é visual dentro dela. Os botões ⤢/✎/⋯ ficam no cabeçalho, nunca dentro da linha (botão dentro de botão não existe — mesma nota do código atual).
- `aria-label` da linha: "Supino reto, 4 séries de 10, 40 kg — marcar como feito" / "… — feito, toque para desmarcar"; a tag "agora" vai no rótulo ("próximo exercício").
- O placar é `role="status"` + `aria-live="polite"` anunciando "3 de 6 exercícios concluídos"; ao concluir, "Treino concluído".
- Barra de progresso: `role="progressbar"` com `aria-valuenow/min/max` e `aria-valuetext` "3 de 6".
- Estado nunca só por cor: feito = verde **+ ✓ + risco**; agora = rosa **+ quadradinho + tag escrita**.
- Foco visível: contorno 3 px `SP.hot` com offset 2 px na linha. Teclado: Tab entre linhas, Espaço/Enter marca.
- Contraste do texto riscado a 60% sobre `SP.raise`: conferir ≥ 4.5:1 (subir para 70% se não passar).

### 8.6 Textos novos (ns `Fitness`)

| chave | pt |
|---|---|
| `chkExercises` | exercícios |
| `chkLeft` | Faltam {n} |
| `chkNow` | Agora |
| `chkFooter` | {done} de {total} concluídos |
| `chkRowTodo` | {name}, {sets} séries de {reps}{load} — marcar como feito |
| `chkRowDone` | {name} — feito, toque para desmarcar |
| `chkRowNext` | próximo exercício |
| `chkLive` | {done} de {total} exercícios concluídos |
| `chkDoneStamp` | Treino concluído |
| `chkDoneAt` | Treino concluído · {time} |
| `chkShare` | Compartilhar no feed |
| `chkEmptyPlan` | Esta ficha está sem exercícios |
| `chkAddExercises` | Adicionar exercícios |
| `chkAskProfFill` | Peça ao professor para completar a ficha |
| `chkFutureDay` | Dia futuro |
| `chkSaveError` | Não deu pra salvar o check |
| `chkRest` | desc. {s}s |
| `chkBack` | Voltar |

**Slice:** entra no **S5 (Treino)** da seção (f), antes do resto da súmula — é a peça que o Alex pediu por nome.

---

## 9. Textos novos (i18n pt/en/es)

Fallback pt abaixo; en/es vão no script `scripts/i18n-esportes-redesign-merge.js` (fill-if-absent). Os textos que **mudam valor** existente (chip "Fitness" → "Esportes") entram como OVERRIDE.

**Namespace `Fitness`**
| chave | pt |
|---|---|
| `platformTitle` (OVERRIDE) | Esportes |
| `chipSports` | Esportes |
| `tickerStreak` | {n} dias seguidos |
| `tickerWorkouts7` | {n} treinos na semana |
| `tickerGate30` | {n} na catraca |
| `calWeekdays` | D,S,T,Q,Q,S,S (en: S,M,T,W,T,F,S · es: D,L,M,M,J,V,S) |
| `calPrevMonth` / `calNextMonth` | Mês anterior / Próximo mês |
| `calDaysOf` | {n} de {d} dias |
| `calStreak` | {n} dias seguidos |
| `calBestStreakMonth` | Melhor sequência no mês: {n} |
| `calLegendIn` / `calLegendOut` / `calLegendToday` | entrou / faltou / hoje |
| `calCellIn` | {date}, entrada registrada |
| `calCellOut` | {date}, sem entrada |
| `calCellToday` | {date}, hoje |
| `calCellBefore` | {date}, antes do vínculo |
| `calLoadError` | Não deu pra carregar este mês. |
| `retry` | Tentar de novo |
| `gymMetricMonth` / `gymMetricStreak` / `gymMetricBest` | no mês / seguidos / melhor sequência |
| `gymLinkedSince` | Vinculado desde {date} |
| `gymNextDue` | Próximo vencimento {date} · {amount} |
| `gymPickAcademy` | Escolher academia |
| `duesTitle` | Histórico de mensalidades |
| `duesDue` | Vencimento {date} |
| `duesMethod` | Forma |
| `duesMethodPix` / `duesMethodCard` / `duesMethodBoleto` / `duesMethodCash` / `duesMethodFreelandoo` | PIX / Cartão / Boleto / Dinheiro / Freelandoo |
| `payPaidVia` | Pago via Freelandoo |
| `payPaidOn` | Paga em {date} |
| `duesPay` | Pagar |
| `duesPayAtDesk` | Pague na recepção |
| `duesCalloutOverdue` | {n} mensalidade(s) vencida(s) · {amount} |
| `duesCalloutPending` | {n} mensalidade(s) a pagar · {amount} |
| `duesSeeAll` | Ver todas ({n}) |
| `duesEmpty` | Nenhuma mensalidade registrada ainda. |
| `gymEmptyHeadline` | Conecte sua academia |
| `workoutWeek` | Esta semana |
| `workoutDoneStamp` | Treino concluído |
| `workoutEmptyHeadline` | Nenhuma ficha ativa |
| `workoutBuildOwn` | Montar minha ficha |
| `workoutAskProf` | ou peça ao professor na academia |
| `kcalOver` | {n} kcal acima da meta |
| `waterTankAria` | {v} de {g} litros de água |
| `heatTitle` | Os últimos 90 dias |
| `heatLegendLess` / `heatLegendMore` | menos / mais |
| `heatWaterHit` | meta de água batida |
| `indHeroTitle` | Consistência |
| `indHeroWorkouts` | {n} treinos no mês |
| `indSeeCalendar` | ver calendário |
| `indBmiScale` | Escala do IMC |
| `indProteinRefBand` | Referência 1,2–2,0 g/kg |
| `indDeltaVs30` | vs. 30 dias |
| `indTodayLabel` | hoje |
| `propBefore` / `propAfter` | Antes / Depois |
| `propAdded` / `propRemoved` | Adicionado / Removido |
| `confirmTitle` | Tem certeza? |
| `measureBmiPreview` | IMC com estes dados |
| `goalsPreview` | Prévia da meta |
| `stepperLess` / `stepperMore` | Menos 10 g / Mais 10 g |

**Namespace `Sports`**
| chave | pt |
|---|---|
| `tabAcademies` | Academias |
| `tabAddAcademy` | + Academia |
| `mySportKicker` | Seu esporte |
| `noSportBand` | Você ainda não escolheu seu esporte |
| `academyMenu` | Opções da academia |
| `myFrequency` | Minha frequência |
| `feedKicker` | O que a galera postou |
| `pickSportSeal` | Escolha seu esporte |

**Namespace `Academies`**
| chave | pt |
|---|---|
| `eyebrow` (OVERRIDE) | Esportes · Freelandoo |
| `yourAcademy` | Sua academia |
| `myFrequencyCta` | Minha frequência |
| `ownerConsole` | Central do dono |
| `ownerTabConnection` / `ownerTabPayouts` / `ownerTabTransfers` / `ownerTabIntegrations` | Conexão / Recebimentos / Repasses / Integrações |
| `payoutTitle` | Recebimentos |
| `payoutKeyType` | Tipo de chave |
| `payoutKeyCpf` / `payoutKeyCnpj` / `payoutKeyEmail` / `payoutKeyPhone` / `payoutKeyRandom` | CPF / CNPJ / E-mail / Telefone / Aleatória |
| `payoutKey` | Chave PIX |
| `payoutHolder` | Titular |
| `payoutDocument` | CPF/CNPJ |
| `payoutReveal` / `payoutHide` | Mostrar / Esconder |
| `payoutEdit` | Editar |
| `payoutSave` | Salvar chave |
| `payoutHint` | As mensalidades pagas pela Freelandoo caem nesta chave. |
| `payoutEmpty` | Configure seu PIX para receber as mensalidades pela Freelandoo |
| `payoutConfirmed` | Chave confirmada |
| `transfersTitle` | Repasses |
| `transfersToReceive` / `transfersAvailable` / `transfersPaidMonth` | A receber / Disponível / Repassado no mês |
| `transferCompetence` | Competência |
| `transferStudent` | Aluno |
| `transferGross` | Bruto |
| `transferFeeMp` | Taxa Mercado Pago |
| `transferFeeFreelandoo` | Taxa Freelandoo |
| `transferNet` | Líquido |
| `transferAvailableOn` | Disponível em {date} |
| `transferEstimated` | estimada |
| `transferStatusWaiting` / `transferStatusAvailable` / `transferStatusPaid` / `transferStatusHeld` / `transferStatusRefunded` | Aguardando / Disponível / Repassado / Retido / Estornado |
| `transfersEmpty` | Nenhum repasse ainda. |
| `syncStatusOk` / `syncStatusWarn` / `syncStatusFail` | Sincronizado / Atenção / Falhou |
| `copyNowStamp` | Copie agora |
| `memberCardPlan` | Plano |
| `expiredAgo` | Vencida há {n} dias |
| `rankMetric` | Métrica |

(Os textos que já existem — `connectText`, `gymNoPayments`, `ind*`, `prop*`, `partnerKey*`, `waForward*` etc. — continuam com as mesmas chaves.)

---

## 10. Pontos para o Alex decidir (com a minha recomendação)

1. **Argola do calendário**: presilha **reta** (recomendado, respeita a regra) × argola redonda em SVG (mais fiel à referência).
2. **"Hoje" no calendário**: anel **quadrado** (recomendado) × anel circular (seria a única forma redonda fora de avatar/gráfico).
3. **Corpo do calendário e talões em papel off-white** (recomendado: é o que faz o "objeto" saltar e já existe no ranking/modais) × papel escuro da pele.
4. **Semana começando no domingo nos 3 idiomas** (recomendado, como a referência) × segunda no es/en.
5. **Herói dos Indicadores = Consistência** (sequência + waffle + treinos) — recomendado, porque é o número que motiva; alternativa: IMC no herói.
