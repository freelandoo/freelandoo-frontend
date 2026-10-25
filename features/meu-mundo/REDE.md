# Meu Mundo — rede, autoridade e ciclo de vida (mm3d-27)

Leia antes de mexer em `engine/net.ts`, `engine/car-sync.ts`, `engine/remote-*.ts`,
`jetpack/net/*` ou nas salas do backend (`src/realtime/meuMundo*.js`).

## Transporte

Colyseus 0.18 (`@colyseus/core` 0.18.19, `@colyseus/sdk` 0.18.5) sobre WebSocket (TCP): ordem garantida na mesma conexão, perda vira
atraso (não é UDP). Estado da sala por patch a 10 Hz (`PATCH_MS`); mensagens
avulsas (`drive`, `in`, `h`, `ping`) chegam na ordem enviada.

## Quem manda em quê

| Entidade | Envia comando | Decide / simula | Só desenha |
|---|---|---|---|
| Pessoa a pé (rua, centro, casa) | dono: `in` (intenção, repetida a cada 1 s andando) | sala (`step`/`stepInterior`, 20 Hz) | cliente prevê o próprio; os outros por `remote-walker.ts` |
| Veículo dirigido | só o motorista (`c.driver === sessionId`): `drive` com passo `k` e época `e` | sala (`advanceDriven`, passos de 1/60 s) | motorista prevê e reconcilia (`car-sync.ts`); os outros por `remote-vehicle.ts` |
| Veículo parado | ninguém (entrar = pedido `car`, a sala confere dono e distância) | sala | todos |
| Jetpack em grupo | cada um o próprio botão: `h` com passo `k` | sala (`JetpackRoom`, 120 Hz, sim gerada do TS) | cliente prevê todos (`predict.ts`); os outros são fantasmas com erro suavizado |

O servidor nunca aceita posição do cliente; só intenção/volante/botão. A
interpolação desenha em variáveis próprias (pose desenhada), nunca no estado
simulado.

## Passos e épocas

- Volante: o cliente muda o volante só a cada `DRIVE_EVERY` passos e manda o passo
  `k`; a sala aplica no mesmo passo + folga fixa (`meuMundoDriveSync.js`).
- **Época (`e`)**: todo recomeço do passo (montar, recuperar, voltar do segundo
  plano) abre época nova. Sem ela, o passo 1 parecia "atrasado" e a sala voltava
  2 s no tempo com o volante errado.
- Jetpack: passo da partida (`tick`), relógio em `jetpack/net/clock.ts`.

## Aba em segundo plano (o bug do mm3d-27)

O navegador para `requestAnimationFrame`; a sala continua. Regras:

1. Ao esconder: dirigindo, manda `drive` com `z:1` (a sala freia e estaciona sem
   ré); a pé, manda intenção zero; no jetpack, `PartySim.release()` solta o botão.
2. A sala não confia no silêncio: volante sem notícia por 1,5 s → freia
   (`expireDrive`); intenção andando sem notícia por 2,5 s → para.
3. Ao voltar: o veículo previsto assume o estado da sala (com velocidade) e abre
   época nova. As linhas do tempo dos outros (`remote-walker.ts`,
   `remote-vehicle.ts`) recomeçam depois de 0,6 s sem estado, sem "percorrer" o
   intervalo vazio.

## Jogadores remotos

Desenhados 150 ms no passado, entre dois estados da sala, sem extrapolar além do
último (parado, a sala não manda estado novo). Teleporte (> 8 m a pé, > 12 m de
veículo) não interpola.

## Jetpack: pose pelo estado, não por evento

Eventos da re-simulação são descartados (sem som/efeito repetido). Por isso a pose
(`idle` em pé, `fly` deitado, `impact` caindo) vem do estado do jogador a cada
quadro (`syncClip` em `party.ts`); evento serve só para efeito.

## Ao sair de uma cena

Cada cena (`game.ts`, `house-game.ts`, `hospital-game.ts`, `jetpack/game.ts`) tem
`dispose()` que solta a sala, o laço de render, os listeners de documento
(`visibilitychange`), os remotos e os observers. Listener novo em `document`/`window`
entra no `dispose()` no mesmo commit.

## Testes que guardam isto (backend `test/unit/`)

`meuMundoDriveSync.test.js` (volante, época, aba escondida, pessoa remota) e
`meuMundoJetpackClient.test.js` (predição, fantasma sem salto, release).
