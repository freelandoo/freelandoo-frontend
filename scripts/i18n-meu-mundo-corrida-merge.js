// Meu Mundo 3D — mm3d-39: Corrida antigravidade (naves, turbo, penhascos).
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-meu-mundo-corrida-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  centerPlace_corrida: ["Antigravidade", "Antigravity", "Antigravedad"],
  corridaAgain: ["Correr de novo", "Race again", "Correr de nuevo"],
  corridaAria: ["Corrida antigravidade", "Antigravity race", "Carrera antigravedad"],
  corridaBackMenu: ["Voltar ao menu", "Back to menu", "Volver al menú"],
  corridaBest: ["Melhor volta", "Best lap", "Mejor vuelta"],
  corridaCharges: ["Turbos guardados", "Stored boosts", "Turbos guardados"],
  corridaDnf: ["não terminou", "did not finish", "no terminó"],
  corridaErrorTitle: ["A corrida não abriu", "The race didn't open", "La carrera no abrió"],
  corridaFinishTime: ["Chegada!", "Finish!", "¡Llegada!"],
  corridaGo: ["VAI!", "GO!", "¡YA!"],
  corridaHowJump: [
    "Chegue rápido na rampa e segure acelerar no ar para planar.",
    "Hit the ramp fast and hold accelerate in the air to glide.",
    "Llega rápido a la rampa y mantén acelerar en el aire para planear.",
  ],
  corridaHowJumpTitle: ["Penhascos", "Cliffs", "Acantilados"],
  corridaHowOrb: ["Guarda até 3 turbos. Use quando quiser.", "Stores up to 3 boosts. Use them whenever you want.", "Guarda hasta 3 turbos. Úsalos cuando quieras."],
  corridaHowOrbTitle: ["Cápsula de fogo", "Fire capsule", "Cápsula de fuego"],
  corridaHowPad: ["Passe por cima das setas azuis: arrancada na hora.", "Drive over the blue arrows: instant burst.", "Pasa sobre las flechas azules: arrancada al instante."],
  corridaHowPadTitle: ["Faixa de turbo", "Boost pad", "Franja de turbo"],
  corridaKeys: ["Setas ou WASD dirigem · Espaço ou Shift = turbo", "Arrows or WASD steer · Space or Shift = boost", "Flechas o WASD conducen · Espacio o Shift = turbo"],
  corridaKicker: ["Baía Suspensa", "Floating Bay", "Bahía Suspendida"],
  corridaLap: ["Volta", "Lap", "Vuelta"],
  corridaLeave: ["Voltar ao centro", "Back to downtown", "Volver al centro"],
  corridaLoading: ["Ligando os motores…", "Starting the engines…", "Encendiendo los motores…"],
  corridaModeRace: ["Corrida", "Race", "Carrera"],
  corridaModeRaceSub: ["Você contra 5 rivais · 3 voltas", "You against 5 rivals · 3 laps", "Tú contra 5 rivales · 3 vueltas"],
  corridaModeTime: ["Contra o relógio", "Time trial", "Contrarreloj"],
  corridaModeTimeSub: ["Sozinho na pista · 3 voltas", "Alone on the track · 3 laps", "Solo en la pista · 3 vueltas"],
  corridaNewRecord: ["Recorde!", "Record!", "¡Récord!"],
  corridaPitch: [
    "Naves que flutuam sobre a pista. Pegue o turbo, salte dos penhascos e voe até a chegada.",
    "Ships that float over the track. Grab the boost, jump off the cliffs and fly to the finish.",
    "Naves que flotan sobre la pista. Toma el turbo, salta de los acantilados y vuela hasta la meta.",
  ],
  corridaPlaceTitle: ["{n}º lugar", "Place {n}", "{n}º lugar"],
  corridaPosition: ["Posição", "Position", "Posición"],
  corridaRecLap: ["Volta {t}", "Lap {t}", "Vuelta {t}"],
  corridaRecRace: ["Corrida {t}", "Race {t}", "Carrera {t}"],
  corridaRecTime: ["Relógio {t}", "Time trial {t}", "Contrarreloj {t}"],
  corridaRecords: ["Seus recordes", "Your records", "Tus récords"],
  corridaSoundOff: ["Desligar som", "Sound off", "Silenciar"],
  corridaSoundOn: ["Ligar som", "Sound on", "Activar sonido"],
  corridaToastFell: ["Caiu do penhasco! Voltando à pista…", "Fell off the cliff! Back to the track…", "¡Cayó del acantilado! Volviendo a la pista…"],
  corridaToastFire: ["FOGO!", "FIRE!", "¡FUEGO!"],
  corridaToastLap: ["Volta {n}: {t}", "Lap {n}: {t}", "Vuelta {n}: {t}"],
  corridaToastLapBest: ["Volta {n}: {t} — melhor volta!", "Lap {n}: {t} — best lap!", "Vuelta {n}: {t} — ¡mejor vuelta!"],
  corridaToastOrb: ["+1 turbo ({n}/{max})", "+1 boost ({n}/{max})", "+1 turbo ({n}/{max})"],
  corridaToastPad: ["TURBO!", "BOOST!", "¡TURBO!"],
  corridaTurbo: ["Turbo", "Boost", "Turbo"],
  corridaWin: ["Vitória!", "Victory!", "¡Victoria!"],
  corridaYou: ["Você", "You", "Tú"],
  corridaYourTime: ["Seu tempo: {t}", "Your time: {t}", "Tu tiempo: {t}"],
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
console.log(`i18n mm3d-39 corrida: ${added} chaves adicionadas`)
