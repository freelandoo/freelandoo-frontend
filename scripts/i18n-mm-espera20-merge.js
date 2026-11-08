// Espera de 20 s em todos os minijogos em grupo, sem falar em computador, e a tela de
// espera única (ui/kit/waiting-room) — 2026-11-08. OVERRIDE no namespace MeuMundo
// (os textos antigos diziam "1 minuto" e "vira computador"). Idempotente. node <script> [pasta]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")
const TEXT = {
  "pt-BR": {
    mmWaitMulti: "Multiplayer",
    mmWaitFree: "vaga livre",
    mmWaitCancel: "Sair da espera",
    jetLobbyHow20: "Quem entrar até o fim do tempo voa junto, no mesmo túnel. Ganha quem for mais longe.",
    noturnoLobbyHow20: "Quem entrar até o fim do tempo corre junto, na mesma rua. Ganha quem fizer mais pontos antes de cair.",
    corridaLobbyHow20: "Quem entrar até o fim do tempo corre junto.",
    corridaLobbyCount20: "{n} de 6 pilotos",
    gincanaLobbyHow20: "Quem entrar até o fim do tempo corre junto.",
    paintLobbyTitle: "Esperando jogadores…",
    paintLobbyHow: "Vote no mapa enquanto espera: o mais votado é o da partida.",
    paintLobbyYou: "Você",
    paintLobbyPlayer: "Jogador {k}",
    jetModeMultiSub: "Espera até 20 segundos · mesmo túnel",
    jetModeFour: "Sempre 4 no túnel · espera até 20 segundos",
    noturnoModeMultiSub: "Espera até 20 segundos · mesma rua",
    noturnoModeBotsSub: "Espera até 20 segundos",
    corridaModeMultiSub: "Espera até 20 segundos",
    gincanaModeMultiSub: "Espera até 20 segundos · até 8",
  },
  en: {
    mmWaitMulti: "Multiplayer",
    mmWaitFree: "open spot",
    mmWaitCancel: "Leave the wait",
    jetLobbyHow20: "Whoever joins before time runs out flies together, in the same tunnel. The one who goes farthest wins.",
    noturnoLobbyHow20: "Whoever joins before time runs out rides together, on the same street. Most points before falling wins.",
    corridaLobbyHow20: "Whoever joins before time runs out races together.",
    corridaLobbyCount20: "{n} of 6 pilots",
    gincanaLobbyHow20: "Whoever joins before time runs out races together.",
    paintLobbyTitle: "Waiting for players…",
    paintLobbyHow: "Vote for the map while you wait: the most voted one is played.",
    paintLobbyYou: "You",
    paintLobbyPlayer: "Player {k}",
    jetModeMultiSub: "Waits up to 20 seconds · same tunnel",
    jetModeFour: "Always 4 in the tunnel · waits up to 20 seconds",
    noturnoModeMultiSub: "Waits up to 20 seconds · same street",
    noturnoModeBotsSub: "Waits up to 20 seconds",
    corridaModeMultiSub: "Waits up to 20 seconds",
    gincanaModeMultiSub: "Waits up to 20 seconds · up to 8",
  },
  es: {
    mmWaitMulti: "Multijugador",
    mmWaitFree: "lugar libre",
    mmWaitCancel: "Salir de la espera",
    jetLobbyHow20: "Quien entre antes de que acabe el tiempo vuela junto, en el mismo túnel. Gana quien llegue más lejos.",
    noturnoLobbyHow20: "Quien entre antes de que acabe el tiempo corre junto, en la misma calle. Gana quien haga más puntos antes de caer.",
    corridaLobbyHow20: "Quien entre antes de que acabe el tiempo corre junto.",
    corridaLobbyCount20: "{n} de 6 pilotos",
    gincanaLobbyHow20: "Quien entre antes de que acabe el tiempo corre junto.",
    paintLobbyTitle: "Esperando jugadores…",
    paintLobbyHow: "Vota el mapa mientras esperas: el más votado es el de la partida.",
    paintLobbyYou: "Tú",
    paintLobbyPlayer: "Jugador {k}",
    jetModeMultiSub: "Espera hasta 20 segundos · mismo túnel",
    jetModeFour: "Siempre 4 en el túnel · espera hasta 20 segundos",
    noturnoModeMultiSub: "Espera hasta 20 segundos · misma calle",
    noturnoModeBotsSub: "Espera hasta 20 segundos",
    corridaModeMultiSub: "Espera hasta 20 segundos",
    gincanaModeMultiSub: "Espera hasta 20 segundos · hasta 8",
  },
}
for (const [loc, set] of Object.entries(TEXT)) {
  const file = path.join(DIR, loc + ".json")
  const raw = fs.readFileSync(file, "utf8")
  const json = JSON.parse(raw)
  const ns = (json.MeuMundo = json.MeuMundo || {})
  let n = 0
  for (const [k, v] of Object.entries(set)) if (ns[k] !== v) { ns[k] = v; n++ }
  const crlf = raw.includes("\r\n")
  let out = JSON.stringify(json, null, 2) + "\n"
  if (crlf) out = out.replace(/\n/g, "\r\n")
  fs.writeFileSync(file, out)
  console.log(loc, "~" + n)
}
