// Meu Mundo 3D — mm3d-21: jetpack em grupo (até 4 na mesma partida).
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-meu-mundo-jetpack-party-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  jpPartyKicker: ["JETPACK EM GRUPO · ATÉ 4", "GROUP JETPACK · UP TO 4", "JETPACK EN GRUPO · HASTA 4"],
  jpPartyJoining: ["Entrando na sala…", "Joining the room…", "Entrando en la sala…"],
  jpPartyLobby: ["ESPERA", "LOBBY", "ESPERA"],
  jpPartyWaiting: ["Esperando jogadores · {n}", "Waiting for players · {n}", "Esperando jugadores · {n}"],
  jpPartyAlone: ["Esperando mais alguém chegar…", "Waiting for someone else to join…", "Esperando a que llegue alguien más…"],
  jpPartyStartsIn: ["Começa em {n} s", "Starts in {n} s", "Empieza en {n} s"],
  jpPartyReadyTag: ["PRONTO", "READY", "LISTO"],
  jpPartyEmptySlot: ["vaga livre", "open slot", "lugar libre"],
  jpPartyYou: ["VOCÊ", "YOU", "TÚ"],
  jpPartyReady: ["COMEÇAR", "START", "EMPEZAR"],
  jpPartyUnready: ["CANCELAR", "CANCEL", "CANCELAR"],
  jpPartySolo: ["ENTRAR SOZINHO", "PLAY SOLO", "JUGAR SOLO"],
  jpPartyHold: ["SEGURE NO VAI!", "HOLD ON GO!", "¡MANTÉN AL SALIR!"],
  jpPartyOut: ["Você saiu · {n} m", "You're out · {n} m", "Quedaste fuera · {n} m"],
  jpPartyLeave: ["SAIR", "LEAVE", "SALIR"],
  jpPartyResults: ["RESULTADO", "RESULTS", "RESULTADO"],
  jpPartyPlace: ["{n}º", "#{n}", "{n}º"],
  jpPartyCaps: ["{n} cápsulas", "{n} capsules", "{n} cápsulas"],
  jpPartySoloFallback: ["JOGANDO SOZINHO", "PLAYING SOLO", "JUGANDO SOLO"],
  jpPartyReconnecting: ["RECONECTANDO…", "RECONNECTING…", "RECONECTANDO…"],
  jpPartyReplaced: ["ABERTO EM OUTRA JANELA", "OPENED IN ANOTHER WINDOW", "ABIERTO EN OTRA VENTANA"],
}

const LOCALES = ["pt-BR", "en", "es"]
let added = 0
for (const [i, locale] of LOCALES.entries()) {
  const file = path.join(dir, `${locale}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  json.MeuMundo = json.MeuMundo || {}
  for (const [key, vals] of Object.entries(MEU_MUNDO)) {
    if (json.MeuMundo[key] === undefined) {
      json.MeuMundo[key] = vals[i]
      added++
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
}
console.log(`i18n mm3d-21 jetpack em grupo: ${added} chaves adicionadas`)
