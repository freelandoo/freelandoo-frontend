// Computadores nos minijogos (regra do Alex, 2026-11-08): espera de 1 minuto e as vagas vazias
// viram computadores — Rolê Noturno, Jetpack (sempre 4) e Paint (1×1, 2×2, 3×3).
// Fill-if-absent no namespace MeuMundo. Idempotente. node <script> [pasta]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")

// [chave, pt-BR, en, es]
const KEYS = [
  ["noturnoModeBotsSub", "Espera até 1 minuto · vaga vazia vira computador", "Waits up to 1 minute · empty spots become computers", "Espera hasta 1 minuto · los lugares vacíos son de la computadora"],
  ["noturnoLobbyHowBots", "Quem entrar até o fim do tempo corre junto, na mesma rua. As vagas que sobrarem viram computadores. Ganha quem fizer mais pontos antes de cair.", "Whoever joins before time runs out rides together on the same street. Empty spots become computers. Most points before crashing wins.", "Quien entre antes de que acabe el tiempo corre junto, en la misma calle. Los lugares vacíos son de la computadora. Gana quien haga más puntos antes de caer."],
  ["noturnoLobbyBot", "computador, se ninguém entrar", "computer, if nobody joins", "computadora, si nadie entra"],
  ["jetModeFour", "Sempre 4 no túnel · espera até 1 minuto · vaga vazia vira computador", "Always 4 in the tunnel · waits up to 1 minute · empty spots become computers", "Siempre 4 en el túnel · espera hasta 1 minuto · los lugares vacíos son de la computadora"],
  ["jetModeOffline", "Sem conexão: voo de treino no aparelho", "Offline: practice flight on this device", "Sin conexión: vuelo de práctica en el dispositivo"],
  ["jetJoinFail2", "O voo não abriu agora. Tente de novo.", "The flight didn't open right now. Try again.", "El vuelo no abrió ahora. Inténtalo de nuevo."],
  ["jetLobbyHowBots", "Quem entrar até o fim do tempo voa junto, no mesmo túnel. As vagas que sobrarem viram computadores. Ganha quem for mais longe.", "Whoever joins before time runs out flies together in the same tunnel. Empty spots become computers. Whoever goes farthest wins.", "Quien entre antes de que acabe el tiempo vuela junto, en el mismo túnel. Los lugares vacíos son de la computadora. Gana quien llegue más lejos."],
  ["jetLobbyBot", "computador, se ninguém entrar", "computer, if nobody joins", "computadora, si nadie entra"],
  ["jetLobbyCount4", "{n} de 4 no túnel", "{n} of 4 in the tunnel", "{n} de 4 en el túnel"],
  ["noturnoJoinFail2", "O rolê não abriu agora. Tente de novo.", "The ride didn't open right now. Try again.", "El paseo no abrió ahora. Inténtalo de nuevo."],
]
const COL = { "pt-BR": 1, en: 2, es: 3 }

for (const [loc, col] of Object.entries(COL)) {
  const file = path.join(DIR, `${loc}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  dict.MeuMundo = dict.MeuMundo || {}
  let n = 0
  for (const row of KEYS) if (dict.MeuMundo[row[0]] === undefined) (dict.MeuMundo[row[0]] = row[col]), n++
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
  console.log(loc, "+", n)
}
