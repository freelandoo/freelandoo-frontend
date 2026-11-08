# Jetpack 3.0 — resultado da auditoria visual (P0)

Escopo: só o minigame Jetpack (`features/meu-mundo/jetpack/`). Regra, física, rede e
colisão **não mudaram** neste lote (o Gate C mexe no gerador e diz isso).

## Mapa real

| área | arquivo |
|---|---|
| regra (autoritativa no aparelho, determinística pela semente) | `sim/flight.ts` (`TUNNEL` W 10 × H 8, `TUNING`, `Course`, `Flight.step`, `hits`) |
| fases (o que cada uma gera) | `sim/phases.ts` (`PHASE_RULES`) |
| cena, câmera, HUD | `engine/jetpack-game.ts` (`JetHud`, câmera ~l.715) |
| cenário por fase | `engine/{canyon,factory,orbital,floresta,forge,ice}-env.ts`, `phase-env.ts`, `env-pool.ts` |
| obstáculos (desenho = colisão) | `engine/obstacles-view.ts` |
| limites da caixa (novo) | `engine/boundary-view.ts` |
| GLB das fases | `public/meu-mundo/jetpack/<fase>/` ← `MEU MUNDO 3D/pipeline/jetpack/build_*_tripo.py` |
| tela | `ui/jetpack-view.tsx` (HUD, `AltGauge`) |
| sala (só repassa pose, por fase) | back `src/realtime/meuMundoJetpack.js` |

Eixos e medidas (conferidos no código): x lateral (±5), **y para cima (0 = chão, 8 = teto)**,
z para a frente. Corpo = caixa de meia largura 0,34, meia altura 0,68, meia profundidade 0,3
em volta do meio. Bate quando `|x|+0,34 > 5`, `y−0,68 < 0` ou `y+0,68 > 8`. Velocidade 16 → 46 m/s
× fator do atributo (0,85–1,35); propulsor 28, gravidade 16 m/s², vy entre −12,5 e 9.

## Defeitos, causa demonstrada e correção

| ID | defeito | causa (código) | correção |
|---|---|---|---|
| P0-A/B | placas e vigas com forma e textura esticadas | `slabAt` (obstacles-view) escala um cubo 1×1×1 — e, desde a 77, o paredão/ponte esculpidos encaixados por `useModel(..., { fitBox })` — até cada retângulo da regra (de 0,3 × 13 m a 13 × 9,5 m): escala não uniforme de malha com detalhe e textura | parede de janela/anel = **vidro da fase** (cor lisa, sem textura: escalar não deforma nada); moldura do vão com **perfil de seção fixa** (`frame`, só o comprimento escala); viga = `girder` de cor lisa; `fitBox` não é mais usado; `floresta/paredao.glb` saiu |
| P0-C | teto sem leitura | nenhuma peça em y = 8 em 6 de 6 fases (fotos "antes") **e** a câmera chegava a 10,5–11 m (`PhaseLook.cam.maxY`), acima do limite | `boundary-view.ts`: vidro fino + nervuras (seção fixa) + longarinas + filetes acesos logo acima de y = 8, pórticos laterais a cada 12 m; câmera nunca acima de `H − 0,85` |
| P0-D | chão confundível com vazio (Cânion: nuvens; Floresta: rio a 7 m) | o limite y = 0 não tinha peça nessas fases | vidro + nervuras no chão nessas fases; filetes acesos nas beiradas do chão em todas |
| P0-F | parede retangular opaca em volta do anel | anel = `hole` + 4 placas cobrindo o corte (a regra exige o corpo inteiro dentro do círculo, então o resto do corte É colisão) | o resto do corte continua desenhado (a regra pede), mas como vidro; aro com dois braços de fixação até as laterais (dentro da área de colisão) |
| P1-H | HUD sem altitude | — | `AltGauge`: posição entre chão e teto com as faixas do último 0,8 m, aviso "Limite superior/inferior" com folga < 0,6 m, seta da próxima passagem bem mais baixa/alta (até 70 m); filetes do limite acendem perto |

Hipóteses **não** confirmadas e por isso não tratadas como causa: normal invertida, color space,
UV dos GLB do Tripo (as peças do cenário não são escaladas de forma não uniforme — conferido em
`prop()`/`PropSpot` de cada env, giro só em y).

## Evidência

Harness `MEU MUNDO 3D/pipeline/jetpack/harness/shots78.js` (683×1024, mesma posição antes/depois:
z 30 no trecho de abertura, que não depende da semente; y 4 / 7,2 / 0,9; e cada obstáculo de perto).
Fotos: `antes78/` × `depois78a`/`depois78b/` no scratchpad da sessão (6 fases × meio, teto, chão +
obstáculos).

## Pendências (próximos gates)

- Gate B: trilho/motor da barra e da coluna móvel (slider, pressH, piston, viga que sobe e desce).
- Gate C: sequências de DESCIDA no gerador das fases, com prova de alcance pelo robô.
- Medir no celular real (FPS, chamadas) — o harness é SwiftShader.
