// Meu Mundo 3D — Jetpack no túnel (mm3d-63): o jogo novo (voo sem parar por um
// túnel steampunk, prensas que se mexem, galões de combustível, grupo de até 6).
// Namespace "MeuMundo". Idempotente: FILL preenche o que falta. As chaves "jp*"
// do jetpack antigo ficam no dicionário (não são mais usadas).
// Rodar: node scripts/i18n-meu-mundo-jetpack-tunel-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const FILL = {
  jetAgain: ["De novo", "Again", "Otra vez"],
  jetAria: ["Jetpack", "Jetpack", "Jetpack"],
  jetBackMenu: ["Voltar ao menu", "Back to menu", "Volver al menú"],
  jetBest: ["Seu recorde: {n} m", "Your record: {n} m", "Tu récord: {n} m"],
  jetByCeiling: ["Bateu no teto!", "Hit the ceiling!", "¡Chocaste con el techo!"],
  jetByCrusher: ["O pilão te pegou!", "The pile driver got you!", "¡El martinete te atrapó!"],
  jetByFloor: ["Encostou no chão!", "Touched the floor!", "¡Tocaste el suelo!"],
  jetByFuel: ["O tanque secou!", "The tank ran dry!", "¡El tanque se secó!"],
  jetByGears: ["Pego pela engrenagem!", "Caught by the gear!", "¡Atrapado por el engranaje!"],
  jetByPipes: ["Bateu no cano!", "Hit the pipe!", "¡Chocaste con el tubo!"],
  jetByPiston: ["Bateu no pistão!", "Hit the piston!", "¡Chocaste con el pistón!"],
  jetByPress: ["Esmagado pela prensa!", "Crushed by the press!", "¡Aplastado por la prensa!"],
  jetByWall: ["Raspou na parede!", "Scraped the wall!", "¡Rozaste la pared!"],
  jetCans: ["Galões", "Fuel cans", "Bidones"],
  jetDistance: ["Distância", "Distance", "Distancia"],
  jetErrorTitle: ["O túnel não abriu", "The tunnel didn't open", "El túnel no se abrió"],
  jetField: ["Placar do grupo", "Group scoreboard", "Marcador del grupo"],
  jetFlying: ["voando", "flying", "volando"],
  jetGo: ["VOA!", "FLY!", "¡VUELA!"],
  jetGone: ["saiu", "left", "salió"],
  jetHintKeys: ["Segure Espaço para subir · ← → para os lados", "Hold Space to rise · ← → to steer", "Mantén Espacio para subir · ← → para los lados"],
  jetHintTouch: ["Segure PROPULSOR para subir · ◀ ▶ para os lados", "Hold THRUST to rise · ◀ ▶ to steer", "Mantén PROPULSOR para subir · ◀ ▶ para los lados"],
  jetHowFuel: [
    "Os galões verdes enchem o tanque. Tanque seco = o fogo apaga e você cai.",
    "Green fuel cans refill the tank. Empty tank = the flame dies and you fall.",
    "Los bidones verdes llenan el tanque. Tanque seco = el fuego se apaga y caes.",
  ],
  jetHowFuelTitle: ["Galões", "Fuel cans", "Bidones"],
  jetHowPress: [
    "Prensas, pilões, pistões e engrenagens se mexem. Encostou em qualquer coisa, acabou.",
    "Presses, pile drivers, pistons and gears move. Touch anything and it's over.",
    "Prensas, martinetes, pistones y engranajes se mueven. Si tocas cualquier cosa, se acabó.",
  ],
  jetHowPressTitle: ["Prensas", "Presses", "Prensas"],
  jetHowThrust: ["Segure para subir, solte para cair. Gasta combustível.", "Hold to rise, release to drop. Burns fuel.", "Mantén para subir, suelta para caer. Gasta combustible."],
  jetHowThrustTitle: ["Propulsor", "Thruster", "Propulsor"],
  jetJoinFail: [
    "O voo em grupo não abriu agora. Tente de novo ou voe sozinho.",
    "The group flight didn't open right now. Try again or fly solo.",
    "El vuelo en grupo no se abrió ahora. Inténtalo de nuevo o vuela solo.",
  ],
  jetKeys: [
    "← → ou A D para os lados · Espaço, ↑, W ou o botão do mouse seguram o propulsor",
    "← → or A D to steer · Space, ↑, W or the mouse button hold the thruster",
    "← → o A D para los lados · Espacio, ↑, W o el botón del ratón mantienen el propulsor",
  ],
  jetKicker: ["Túneis de Lúmen", "Tunnels of Lúmen", "Túneles de Lúmen"],
  jetLeave: ["Voltar ao centro", "Back to downtown", "Volver al centro"],
  jetLoading: ["Acendendo as caldeiras…", "Firing up the boilers…", "Encendiendo las calderas…"],
  jetLobbyCancel: ["Sair da espera", "Leave the queue", "Salir de la espera"],
  jetLobbyCount: ["{n} de 6 no túnel", "{n} of 6 in the tunnel", "{n} de 6 en el túnel"],
  jetLobbyFree: ["vaga livre", "open slot", "lugar libre"],
  jetLobbyHow: [
    "Quem entrar até o fim do tempo voa junto, no mesmo túnel. Ganha quem for mais longe.",
    "Everyone who joins before time runs out flies together, in the same tunnel. Farthest wins.",
    "Quien entre antes de que acabe el tiempo vuela junto, en el mismo túnel. Gana quien llegue más lejos.",
  ],
  jetLobbyTitle: ["Esperando os pilotos…", "Waiting for pilots…", "Esperando a los pilotos…"],
  jetModeMulti: ["Multiplayer", "Multiplayer", "Multijugador"],
  jetModeMultiSub: ["Espera até 1 minuto · mesmo túnel", "Waits up to 1 minute · same tunnel", "Espera hasta 1 minuto · mismo túnel"],
  jetModeSolo: ["Sozinho", "Solo", "Solo"],
  jetNewRecord: ["Novo recorde!", "New record!", "¡Nuevo récord!"],
  jetOffline: ["Sem conexão com o grupo", "No connection to the group", "Sin conexión con el grupo"],
  jetPitch: [
    "Voe sem parar pelas galerias de vapor debaixo da cidade. Não encoste em nada e não deixe o tanque secar.",
    "Fly nonstop through the steam galleries under the city. Don't touch anything and don't let the tank run dry.",
    "Vuela sin parar por las galerías de vapor bajo la ciudad. No toques nada y no dejes que el tanque se seque.",
  ],
  jetPlace: ["Você ficou em {n}º de {t}", "You finished {n} of {t}", "Quedaste {n}º de {t}"],
  jetPlay: ["Voar", "Fly", "Volar"],
  jetScore: ["Pontos", "Score", "Puntos"],
  jetSoundOff: ["Desligar som", "Mute", "Silenciar"],
  jetSoundOn: ["Ligar som", "Unmute", "Activar sonido"],
  jetSpeedK: ["Velocidade do personagem ×{k}", "Character speed ×{k}", "Velocidad del personaje ×{k}"],
  jetStillFlying: ["{n} ainda voando", "{n} still flying", "{n} todavía volando"],
  jetThrust: ["Propulsor", "Thrust", "Propulsor"],
  jetTime: ["Tempo", "Time", "Tiempo"],
  jetToastCan: ["+COMBUSTÍVEL", "+FUEL", "+COMBUSTIBLE"],
  jetToastEmpty: ["Tanque seco! O fogo apagou", "Tank empty! The flame died", "¡Tanque seco! El fuego se apagó"],
  jetToastLow: ["Pouco combustível! Pegue os galões", "Low fuel! Grab the cans", "¡Poco combustible! Toma los bidones"],
  jetTouch: [
    "◀ ▶ embaixo à esquerda para os lados · segure PROPULSOR embaixo à direita para subir",
    "◀ ▶ bottom left to steer · hold THRUST bottom right to rise",
    "◀ ▶ abajo a la izquierda para los lados · mantén PROPULSOR abajo a la derecha para subir",
  ],
}

const LOCALES = ["pt-BR", "en", "es"]
let added = 0
for (const [i, locale] of LOCALES.entries()) {
  const file = path.join(dir, `${locale}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  json.MeuMundo = json.MeuMundo || {}
  for (const [key, vals] of Object.entries(FILL)) {
    if (json.MeuMundo[key] === undefined) {
      json.MeuMundo[key] = vals[i]
      added++
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
}
console.log(`i18n meu-mundo jetpack túnel: ${added} chaves adicionadas`)
