# Meu Mundo 3D — regras do jogo (front)

Carrega só quando se abre arquivo desta pasta. **Teto 8 KB.** Histórico de cada entrega: `freelandoo/docs/historico-claude/meu-mundo-3d.md` (o fim tem as entregas recentes) e `freelandoo/MEU MUNDO 3D/REGISTRO.md`. Rede: `REDE.md` nesta pasta. **Histórico (250 KB) e REGISTRO: só por Grep, nunca inteiros.** Só admin joga; só abre ao público quando muito bem testado.

## Invariantes (quebram em silêncio)

- **O servidor decide, o cliente desenha.** Regras espelhadas têm teste de espelho; medidas em `meuMundoLayout.js` (back).
- **Regra em TS aqui, cópia GERADA no back.** Mudou o arquivo → rodar o script no back e commitar os DOIS repos (o unit confere):
  `<pasta>/sim/` → `node scripts/build-<pasta>-sim.js` no back, para laminas (= `build-fight-sim`), paint, corrida, gincana, jetpack, noturno; `power/` → `build-power-sim`; `characters/` → `build-characters-sim`. Paint com mapa novo: subir `v` + `meuMundoPaintMaps.test.js`. Jetpack com fase nova: `PHASE_RULES` + `PHASE_ART` + SEGMENTS + SKINS + `JETPACK_PHASES` no back.
- **Todo prêmio** (XP, atributo, moedas, itens) passa por recibo (`tb_mm_receipt`) dentro do `withLife`. Luta é re-simulada pelo servidor; o "venci" do aparelho não vale.
- Tipo novo de mensagem da sala entra na lista de `engine/net.ts` (senão é descartado em silêncio).
- **Um ambiente 3D por vez** (bairro, centro, prédio, minijogo, luta): entrou em um, o outro sai da memória (`ui/offstage.ts`). Fundo da luta é cenário próprio (`street-view.ts`).
- Centro: planta só em `meuMundoCenter.js` (back); local novo = registro de destinos; prédio girado = `at`+`facing`; chão/props por `GROUNDS`/`PROPS`. Mudou a planta → subir `CENTER_VERSION`.
- Corpo novo = `ASSETS` + `BodyId` + CHECK `chk_mm_avatar_body`. Tipo físico não se escolhe (sai de `bodyHint`). Skin ≠ condição (`skins.ts` ↔ `meuMundoSkins.js`).
- GLB com KTX2/meshopt: `configureCodecs()` (`engine/codecs.ts`) antes de todo `LoadAssetContainerAsync` (o `ensureLoaders` já chama); decodificadores em `public/meu-mundo/_codecs/v1/` (trocar = pasta nova). **Nunca `import "@babylonjs/loaders/glTF"`**: o build de produção do Turbopack (Next 16.4.5) deixa `__TURBOPACK__imported__module__N__` sem resolver e a tela inteira cai ("This page couldn't load"; no dev funciona) — sempre `ensureLoaders()`. Textura só UASTC: ETC1S precisa de `'unsafe-eval'`. Medir cena: `window.__mmScene()` (`engine/scene-meter.ts`).
- Desempenho: qualidade só por `engine/quality.ts`; props do bairro em blocos `QUALITY.propCell` com corte por tamanho `propCut` (`ChunkedGeo`); casas GLB = `InstancedMesh` por lote (thin instance não recorta casa a casa) e `refreshBoundingInfo()` depois de assar a dequantização; cena com câmera usa `tallness` (`engine/portrait.ts`); malha esquelética quantizada: `refreshBoundingInfo({ applySkeleton: true })`; instância fina sem instância: desligar a base.
- **Som:** um AudioContext só, o de `engine/audio` (`audioContext()`/`audioBus("sfx"|"ui"|"music"|"ambience")`); nunca `new AudioContext` nem `ctx.close()` (fonte em laço para no `dispose`). Arquivo pelo NOME do asset (`cues.ts` → `public/meu-mundo/audio/manifest.json`, gerado por `C:\Users\Alex\ComfyUI-Audio\importar.bat`, só aprovados); sem arquivo = sintetizador de antes. Impacto toca no `hit` do FightEvent, não no botão. Música (~75 MB) vai para o R2, não para `public/`.
- Céu: UM `SkyDome` por cena (`engine/sky/`; região em `sky-registry.ts`). As artes são 2:1 pintadas, não equiretangulares: nada de PhotoDome/HDRI/environmentTexture com elas. Artes = faixa 19:7 só céu, dia e noite por área; arte nova = `pipeline/ceu/preparar.py` → pasta `v3`. Cor/neblina/sombra da rua por região e hora: `LOOKS` + `applyGrade` (`steampunk/atmosphere.ts`), no shader do material (sem passe de tela); a cúpula imita por `setGrade`.
- Superfície de card/modal: material da notificação (`SteamFrame`), mesma opacidade do menu (~0,6). Ganho de status = só o número colorido acima da cabeça.
- Erro novo em `MeuMundo*Service` = linha em `scripts/i18n-mm-server-errors-merge.js` + `node scripts/check-mm-server-errors.js` (chave = texto em pt).
- Controles no celular: UM joystick anda e dirige (`driveAxis`); não recriar pedal/volante/freio na tela.
- Cenário em código (Domínios v2): kit e cenas aprovadas em `engine/cena-codigo/` (`montarCena`), fonte única com a vitrine `MEU MUNDO 3D/pipeline/pecas-codigo` (que só reexporta). Mudou o kit = a geometria das cenas aprovadas muda junto: conferir as folhas.
- Harness de cada área em `MEU MUNDO 3D/pipeline/**/harness*` (ver o CLAUDE.md de lá). Ícones/miniaturas provisórios: troca por arquivo, não refazer render.

## Regras do Alex (decisões de produto — valem até ele mudar)

- Mexeu num personagem = muda em todo lugar onde aparece, inclusive como monstro (altura, rig, arma, poderes).
- Alturas (`heights.ts` ↔ `meuMundoHeights.js`): jovem 1,70/1,65, adulto 2,70, deuses 3,20, Ciborgue 2,7, Golem de Pedra/Brutamontes 4, lobos 2,5, Cavaleiro/Garras 2. Iguais na luta e na rua.
- Status e nível sem teto. Poder = soma dos atributos + HP do nível + equipamento (só o permanente).
- Força se chama ACURACIDADE na tela (chave `strength`); acurácia é outro atributo. Ataque = força do golpe, defesa amortece, dano por razão pura sem piso.
- Brutamontes nv. 15 = 506/575/503/431/323; todas as raças nessa dificuldade. Quem aparece como monstro é igual à skin.
- Toda luta abre na tela de versus e só começa no botão. Todo personagem tem as mesmas 4 habilidades na regra; identidade é só apresentação.
- Golpes vêm da SKIN, nunca da arma; a arma muda modelo, rastro e bônus. Ciborgue/Noctis = armas de fogo; Íris/Aeryn = arqueiras com flechas de luz; escudo para quem usa espada.
- Todo tiro é reto. Ciborgue carrega a arma na cintura, cotovelo em L; anda com braços a 20° do corpo.
- Golem: duas pedras atrás dos ombros com raio verde. Dama das Garras não voa e não fecha a guarda. Lobos: raio roxo pela boca.
- Pose de descanso de todos: braço aberto 22° do corpo.
- Só 6 emoções (feliz/triste/amando/raiva/cansado/doente; fome = triste). Notificação logo abaixo dos pés, um card por vez.
- Falas sempre pela personalidade (`banter.ts`): humanas e informais, só o bondoso é formal; o psicopata xinga, é sarcástico e irônico. Fala nova de personagem, resposta a NPC ou comentário de capítulo = as 5 personalidades. O sino guarda só o importante (médico, energia no chão); o resto é interação. Toda fala é o card de notificação (`EmotionFrame`, retrato pela emoção), também dentro dos minijogos (`minigame-banter.tsx`, assuntos `mg_`); o psicopata tem cara de raiva quase sempre (só ri quando ganha).
- Celular: câmera mais afastada (como no Jetpack).
- Minijogos: sala espera até 1 min e vagas vazias viram computadores. Rolê Noturno até 4. Jetpack sempre 4. Paint 1×1/2×2/3×3.
- Jetpack: o voo não muda entre fases; a velocidade depende do atributo VELOCIDADE. Desenho nunca entra na caixa do voo nem é menor que a colisão.
- Paint: perdeu para o Guardião = fora da partida; arma = Lançador rosa. Cor que é regra de jogo fica (tintas, mar turquesa nunca no tampo).
- Gincana e Paint seguem a estética da cidade com dia/noite pelo relógio de Brasília.
- Monstros da rua só de noite (18h–6h); o primeiro jogador que vê define o nível, igual para todos daquele lugar.
- Nível de aventura é POR personagem; trocou, o novo começa no 1.
- Mistura (criogenia) com resultado fixo: o primeiro passa a personalidade e 20% dos atributos; nunca zero personagem andando.
- Sem personalidade a luta é idêntica; sorteio novo só para quem tem personalidade.
- Feed/bees infinitos; alcance só ordena.
- Robôs `MM_TEST_BOTS` são a carga real: medir com eles ligados.
- Peças 3D: o Alex gera no GPT (fundo branco) → Tripo → eu reduzo e encaixo; nada de geometria de código "zoada".
