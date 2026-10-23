// Meu Mundo 3D — mm3d-20: jetpack do centro (o jogo da TENKA com o avatar do jogador).
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-meu-mundo-jetpack-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  centerPlay: ["Jogar", "Play", "Jugar"],
  jpTitleAria: ["Jetpack", "Jetpack", "Jetpack"],
  jpDistance: ["DISTÂNCIA", "DISTANCE", "DISTANCIA"],
  jpFuel: ["COMBUSTÍVEL", "FUEL", "COMBUSTIBLE"],
  jpTurbo: ["TURBO", "TURBO", "TURBO"],
  jpPause: ["Pausar", "Pause", "Pausar"],
  jpSound: ["Som", "Sound", "Sonido"],
  jpHintHold: ["SEGURE", "HOLD", "MANTÉN"],
  jpHintHoldRest: ["para ligar o jetpack", "to fire the jetpack", "para encender el jetpack"],
  jpHintRelease: ["SOLTE", "RELEASE", "SUELTA"],
  jpHintReleaseRest: ["para cair", "to drop", "para caer"],
  jpKicker: ["MEU MUNDO · CENTRO", "MEU MUNDO · DOWNTOWN", "MEU MUNDO · CENTRO"],
  jpTitleA: ["JETPACK", "JETPACK", "JETPACK"],
  jpTitleB: ["DO CENTRO", "DOWNTOWN", "DEL CENTRO"],
  jpLoading: ["Preparando o jetpack…", "Getting the jetpack ready…", "Preparando el jetpack…"],
  jpRuleObstacles: [
    "Desvie das estruturas e não encoste no chão nem no teto.",
    "Dodge the structures and don't touch the floor or the ceiling.",
    "Esquiva las estructuras y no toques el suelo ni el techo.",
  ],
  jpRuleFuel: ["Pegue cápsulas: o combustível do jetpack acaba.", "Grab capsules: the jetpack runs out of fuel.", "Recoge cápsulas: el combustible del jetpack se acaba."],
  jpRuleTurbo: [
    "Turbo vermelho: por 5 s você voa 2x mais rápido e quebra as pilastras.",
    "Red turbo: for 5 s you fly 2x faster and smash the pillars.",
    "Turbo rojo: durante 5 s vuelas 2x más rápido y rompes los pilares.",
  ],
  jpPlay: ["JOGAR", "PLAY", "JUGAR"],
  jpBack: ["VOLTAR AO CENTRO", "BACK DOWNTOWN", "VOLVER AL CENTRO"],
  jpSoundOn: ["SOM: LIGADO", "SOUND: ON", "SONIDO: ACTIVADO"],
  jpSoundOff: ["SOM: DESLIGADO", "SOUND: OFF", "SONIDO: DESACTIVADO"],
  jpSoundOnTitle: ["Ligar som", "Turn sound on", "Activar sonido"],
  jpSoundOffTitle: ["Desligar som", "Turn sound off", "Desactivar sonido"],
  jpMission: ["MISSÃO", "MISSION", "MISIÓN"],
  jpPaused: ["PAUSADO", "PAUSED", "EN PAUSA"],
  jpResume: ["CONTINUAR", "RESUME", "CONTINUAR"],
  jpRestart: ["REINICIAR", "RESTART", "REINICIAR"],
  jpQuit: ["SAIR", "QUIT", "SALIR"],
  jpOver: ["FIM DA MISSÃO", "MISSION OVER", "FIN DE LA MISIÓN"],
  jpNewRecord: ["NOVO RECORDE", "NEW RECORD", "NUEVO RÉCORD"],
  jpBest: ["MELHOR RECORDE", "BEST RECORD", "MEJOR RÉCORD"],
  jpFuelCollected: ["COMBUSTÍVEL COLETADO", "FUEL COLLECTED", "COMBUSTIBLE RECOGIDO"],
  jpAgain: ["JOGAR DE NOVO", "PLAY AGAIN", "JUGAR DE NUEVO"],
  jpErrorKicker: ["FALHA NA DECOLAGEM", "LAUNCH FAILED", "FALLO EN EL DESPEGUE"],
  jpErrorDefault: ["Não foi possível iniciar o jogo.", "The game couldn't start.", "No se pudo iniciar el juego."],
  jpRetry: ["TENTAR DE NOVO", "TRY AGAIN", "INTENTAR DE NUEVO"],
  jpRotate: ["Gire o celular para a vertical", "Turn your phone upright", "Gira el celular a vertical"],
  jpToastTurbo: ["TURBO · 2X · QUEBRE AS PILASTRAS", "TURBO · 2X · SMASH THE PILLARS", "TURBO · 2X · ROMPE LOS PILARES"],
  jpToastFuel: ["+{n} COMBUSTÍVEL", "+{n} FUEL", "+{n} COMBUSTIBLE"],
  jpToastEmpty: ["SEM COMBUSTÍVEL", "OUT OF FUEL", "SIN COMBUSTIBLE"],
  jpToastPhase: ["FASE {n}", "STAGE {n}", "FASE {n}"],
  jpMenuBest: ["Seu recorde: {n} m", "Your record: {n} m", "Tu récord: {n} m"],
  jpMenuHint: ["Segure para subir. Solte para cair.", "Hold to rise. Release to drop.", "Mantén para subir. Suelta para caer."],
  jpHudBest: ["RECORDE {n} m", "RECORD {n} m", "RÉCORD {n} m"],
  jpOverFuel: ["{n} ({k} cápsulas)", "{n} ({k} capsules)", "{n} ({k} cápsulas)"],
  jpSavedLocal: ["Recorde salvo neste aparelho.", "Record saved on this device.", "Récord guardado en este dispositivo."],
  jpNoWebgl: [
    "Este aparelho ou navegador não tem suporte a gráficos 3D (WebGL 2).",
    "This device or browser doesn't support 3D graphics (WebGL 2).",
    "Este dispositivo o navegador no admite gráficos 3D (WebGL 2).",
  ],
  jpLoadFailed: [
    "Não foi possível carregar o seu avatar. Confira a conexão e tente de novo.",
    "Couldn't load your avatar. Check your connection and try again.",
    "No se pudo cargar tu avatar. Revisa la conexión e inténtalo de nuevo.",
  ],
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
console.log(`i18n mm3d-20 jetpack: ${added} chaves adicionadas`)
