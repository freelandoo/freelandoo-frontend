# Business — repaginada completa ("BALCÃO ACESO") — 2026-10-31

Pedido do Alex (literal): "vamos nós mesmos editar a página business, fazer o
mesmo trabalho que fizemos no esporte, todo o front, com webgl, webgpu, efeitos,
animações, facilitar, deixar todo reestruturado para business, bonito e
funcional, e no celular a toolbar fica inacessível, vamos corrigir isso também".

Modelo: a repaginada do Esportes ("PLACAR BRASA",
`docs/superpowers/specs/2026-10-27-esportes-redesign-{visual,motion}.md`).
Escopo: a comunidade de NEGÓCIO (`kind = 'common'`) — `/comunidades/[id]`
quando `isBusinessPlatform`, abas Feed/Produtos/Agenda, painéis Perfil/Mural,
`/indicadores`, `/leads`. O construtor do site (`/site`) e as outras
modalidades (pet, carro, condomínio, bairro) ficam FORA.

## Conceito — "BALCÃO ACESO"

A fachada de um comércio à noite, impressa num tabloide. O tabloide dá a cara
Freelandoo (caixa alta Anton, cantos retos, sombra dura, papel off-white,
carimbo); a loja acesa dá o efeito (letreiro que brilha na cor que o dono
escolheu, vitrine iluminada, visor de caixa registradora contando).

1. **O NÚMERO DO DONO É HERÓI.** Faturamento do mês, horários de hoje, leads
   novos: um número grande por tela, contando (CountUp) e com brilho.
2. **CADA COISA TEM A FORMA DELA.** Agenda = talão de horários (papel);
   produto = vitrine (cartão que inclina e acende); lead = ficha; indicador =
   anel/arco/barras (os gráficos do Esportes, reaproveitados).
3. **A COR É DO DONO.** Tudo deriva do `accent`/`background` que o líder escolhe
   (`platformSkinVars`) — a repaginada não fixa cor de marca.

## Regras que não mudam

| Regra | Como fica |
|---|---|
| WebGPU já foi RETIRADO do fundo (Alex, 2026-09-09: "está tudo travando") | WebGL/WebGPU **só dentro do banner do topo** (uma área de ~360 px de altura), nunca no fundo da página. Teto de resolução 1,5×, 30 FPS no celular, **para** fora da tela (IntersectionObserver), com a aba escondida e com "reduzir movimento" (vira quadro parado). WebGPU onde o aparelho tem, WebGL2 onde não, imagem estática se nenhum. |
| Cantos retos (`.fl-sharp`) | Mantidos; o "redondo" entra como forma de dado (anel, arco), nunca `border-radius`. |
| Animação | framer-motion + GSAP; só `transform`/`opacity`; o relógio único (`motion.ts`) do Esportes vira compartilhado. |
| Peças únicas | `PillStack`, `PublishMenuButton`, `InviteShareButton`, `PageBackLink` continuam as mesmas — vestidas, não reescritas. |
| i18n | Tudo em `t()` nos 3 idiomas, script de merge por etapa. |
| Celular primeiro | Desenho a 375 px; nada rola de lado; a barra de navegação nunca fica coberta. |

## "Facilitar" — o que muda no uso

- **Sem botão Salvar**: o modo de edição salva sozinho (feito na N0).
- **O dono entra no que importa**: com serviço agendável, abre na Agenda (já
  feito); a barra de ações do topo fica com 3 coisas: Plano, Ver como público,
  status de salvamento.
- **Uma porta por coisa**: Agenda, Produtos, Site, Indicadores, Leads — cada
  uma com UM lugar no headcard; nada repetido em dois lugares.
- **Edição no lugar**: nome, bio e cores editados no próprio headcard/painel,
  sem formulário separado.

## Reestruturação do código

`app/(header-only)/comunidades/[id]/page.tsx` tem ~3.100 linhas servindo todas
as modalidades. O negócio sai para `app/(header-only)/comunidades/[id]/_business/`
(peças próprias: `business-hero.tsx`, `business-tabs.tsx`, `agenda/`,
`storefront-shader.tsx`, `bz-tokens.ts`), e a página só as monta quando
`isBusinessPlatform`. As outras modalidades não são tocadas.

O kit de movimento do Esportes (`esportes/_components/ui/motion.ts` +
`motion-kit.tsx` + `charts.tsx`) sobe para `components/motion/` e o Esportes
passa a importar de lá (reexport, sem mudar comportamento).

## Etapas

**Status (2026-10-31): TODAS EXECUTADAS e publicadas** — N0 `714b6155` · N1–N4/N6 `702c9501` · N5/N7/N8/N9 `0e986ada`. N10: produção conferida a 375 e 1280 px como visitante (sem rolagem lateral, sem erro de console, letreiro aceso em WebGPU; shaders WGSL e GLSL compilados e desenhados num Chrome real). Pendente do Alex: FPS no celular real e o que só o dono vê (agenda, painéis, salvamento automático, barra do celular).

O que ficou de fora de propósito: os cartões de produto (são os mesmos do perfil — só vestidos); a "edição no lugar" da N7 virou só a moldura e a entrada animada (os campos já editavam no lugar); o construtor do site.

- **N0 — feita (front `714b6155`).** Sem barra "Salvar" (salvamento automático
  com selo Salvando…/Salvo); barra de navegação do celular com fundo, rolagem
  lateral e acima das barras fixas; espaço reservado embaixo.
- **N1 — fundação.** Kit de movimento compartilhado; `bz-tokens.ts` (cores
  derivadas do accent do dono, sombra/brilho, texturas); `MotionConfig
  reducedMotion="user"` na casca do negócio.
- **N2 — o letreiro (GPU).** `storefront-shader.tsx`: luz de letreiro + poeira
  de luz na cor do dono, só no banner; WebGPU → WebGL2 → estático; medição de
  FPS no celular antes de publicar.
- **N3 — headcard + barra de ações.** Fachada nova (banner com o letreiro,
  foto com moldura acesa, nome em néon impresso), pills, ações enxutas;
  celular sem nada cortado.
- **N4 — Agenda.** Próximo horário como cartão herói (contagem até o horário),
  talão do dia, valores do mês com CountUp, calendário com a pele nova.
- **N5 — Produtos.** Vitrine em grade com cartões que inclinam e acendem;
  dono gerencia no mesmo lugar.
- **N6 — Feed e abas.** Barra de abas com indicador deslizante; moldura do
  feed.
- **N7 — Painéis Perfil/Mural.** Edição no lugar, temporada/privacidade
  agrupadas, sem formulário cru.
- **N8 — Indicadores.** Bento com o número herói (faturamento), gráficos do
  kit.
- **N9 — Leads.** Fichas, funil, ações a um toque.
- **N10 — qualidade.** Reduzir movimento, contraste, 375 px, FPS no celular
  real, cobertura de i18n.

Cada etapa: lint + tipos + build no worktree do commit (há WIP alheio no
front), i18n nos 3 idiomas, commit + push só dos caminhos da entrega, deploy
conferido na Vercel.
