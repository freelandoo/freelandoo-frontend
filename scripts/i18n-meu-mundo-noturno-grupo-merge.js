// Meu Mundo 3D — mm3d-42: Rolê Noturno em grupo (multiplayer na mesma rua) e o poder do logo da Freelandoo.
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-meu-mundo-noturno-grupo-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  noturnoModeSolo: ["Sozinho", "Solo", "Solo"],
  noturnoModeMulti: ["Multiplayer", "Multiplayer", "Multijugador"],
  noturnoModeMultiSub: ["Espera até 1 minuto · mesma rua", "Waits up to 1 minute · same street", "Espera hasta 1 minuto · misma calle"],
  noturnoJoinFail: [
    "O rolê em grupo não abriu agora. Tente de novo ou ande sozinho.",
    "The group ride didn't open right now. Try again or ride solo.",
    "El paseo en grupo no abrió ahora. Intenta de nuevo o ve solo.",
  ],
  noturnoLobbyTitle: ["Esperando a galera…", "Waiting for the crew…", "Esperando a la banda…"],
  noturnoLobbyHow: [
    "Quem entrar até o fim do tempo corre junto, na mesma rua. Ganha quem fizer mais pontos antes de cair.",
    "Whoever joins before time runs out rides with you, on the same street. Most points before falling wins.",
    "Quien entre antes de que acabe el tiempo corre contigo, en la misma calle. Gana quien haga más puntos antes de caer.",
  ],
  noturnoLobbyFree: ["vaga livre", "open spot", "lugar libre"],
  noturnoLobbyCount: ["{n} de 6 no rolê", "{n} of 6 riding", "{n} de 6 en el paseo"],
  noturnoLobbyCancel: ["Sair da espera", "Leave the wait", "Salir de la espera"],
  noturnoHowPowerTitle: ["Logo da Freelandoo", "Freelandoo logo", "Logo de Freelandoo"],
  noturnoHowPower: [
    "A cada 700 m. Pegou: 5 s de poder — o que você bater explode e você acelera.",
    "Every 700 m. Grab it: 5 s of power — whatever you hit explodes and you speed up.",
    "Cada 700 m. Tómalo: 5 s de poder — lo que choques explota y aceleras.",
  ],
  noturnoPower: ["Poder", "Power", "Poder"],
  noturnoToastPower: ["PODER DA FREELANDOO! Exploda tudo!", "FREELANDOO POWER! Blow it all up!", "¡PODER FREELANDOO! ¡Explota todo!"],
  noturnoToastSmash: ["BOOM! +{n}", "BOOM! +{n}", "¡BUM! +{n}"],
  noturnoOffline: ["Sem conexão com o grupo", "Lost connection to the group", "Sin conexión con el grupo"],
  noturnoField: ["Placar do grupo", "Group scoreboard", "Marcador del grupo"],
  noturnoStillRunning: ["{n} ainda no rolê", "{n} still riding", "{n} siguen en el paseo"],
  noturnoPlace: ["Você ficou em {n}º de {t}", "You finished {n} of {t}", "Quedaste {n}º de {t}"],
  noturnoRiding: ["correndo", "riding", "corriendo"],
  noturnoGone: ["saiu", "left", "salió"],
  noturnoSmashed: ["Explodidos", "Smashed", "Explotados"],
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
console.log(`i18n mm3d-42 noturno em grupo: ${added} chaves adicionadas`)
