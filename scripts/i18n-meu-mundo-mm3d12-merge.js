// Meu Mundo 3D — mm3d-12 (superesportivo + direção arcade).
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-meu-mundo-mm3d12-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  steerLeft: ["Virar à esquerda", "Steer left", "Girar a la izquierda"],
  steerRight: ["Virar à direita", "Steer right", "Girar a la derecha"],
  gas: ["Acelerar", "Accelerate", "Acelerar"],
  gasShort: ["Acelera", "Gas", "Acelera"],
  brakeReverse: ["Frear e dar ré", "Brake and reverse", "Frenar y dar marcha atrás"],
  brakeShort: ["Freio/Ré", "Brake/Rev", "Freno/Atrás"],
  handbrake: ["Freio de mão", "Handbrake", "Freno de mano"],
  handbrakeShort: ["Freio de mão", "Handbrake", "Freno de mano"],
  helpDriveTouch: [
    "◀ ▶: volante · Acelera · Freio/Ré (parado, engata a ré) · Freio de mão: derrapar",
    "◀ ▶: steering · Gas · Brake/Rev (stopped, goes in reverse) · Handbrake: drift",
    "◀ ▶: volante · Acelera · Freno/Atrás (detenido, marcha atrás) · Freno de mano: derrapar",
  ],
  helpDriveDesktop: [
    "W/↑ acelerar · S/↓ frear (parado, ré) · A/D ou ←/→ direção · Espaço: freio de mão · E: sair",
    "W/↑ accelerate · S/↓ brake (stopped, reverse) · A/D or ←/→ steer · Space: handbrake · E: get out",
    "W/↑ acelerar · S/↓ frenar (detenido, atrás) · A/D o ←/→ dirección · Espacio: freno de mano · E: bajar",
  ],
  recoverCar: ["Recuperar", "Recover", "Recuperar"],
  recoverHint: [
    "Carro preso? Volta para a vaga da casa (parado, a cada 15 s).",
    "Car stuck? Sends it back to the house's parking spot (stopped, every 15 s).",
    "¿Coche atascado? Vuelve al lugar de la casa (detenido, cada 15 s).",
  ],
  carMoving: ["Pare o carro primeiro.", "Stop the car first.", "Detén el coche primero."],
  carCooldown: ["Espere alguns segundos para recuperar de novo.", "Wait a few seconds to recover again.", "Espera unos segundos para recuperar de nuevo."],
  carSpotBusy: ["A vaga da casa está ocupada agora.", "The house's parking spot is taken right now.", "El lugar de la casa está ocupado ahora."],
  carTelemetry: ["Carro", "Car", "Coche"],
  gear: ["marcha", "gear", "marcha"],
  steerShort: ["esterço", "steer", "giro"],
  contacts: ["Rodas no chão", "Wheels on ground", "Ruedas en el suelo"],
  slip: ["traseira", "rear", "trasera"],
  drifting: ["DERRAPANDO", "DRIFTING", "DERRAPANDO"],
  serverErr: ["Diferença p/ servidor", "Gap to server", "Diferencia con el servidor"],
  tuning: ["Ajustar dirigibilidade", "Tune handling", "Ajustar manejo"],
  tuneEngine: ["Força do motor (N)", "Engine force (N)", "Fuerza del motor (N)"],
  tuneMaxSpeed: ["Velocidade máxima (m/s)", "Top speed (m/s)", "Velocidad máxima (m/s)"],
  tuneReverse: ["Ré máxima (m/s)", "Max reverse (m/s)", "Marcha atrás máxima (m/s)"],
  tuneBrake: ["Freio (N)", "Brake (N)", "Freno (N)"],
  tuneGripFront: ["Aderência dianteira", "Front grip", "Agarre delantero"],
  tuneGripRear: ["Aderência traseira", "Rear grip", "Agarre trasero"],
  tuneHbGrip: ["Aderência com freio de mão", "Grip with handbrake", "Agarre con freno de mano"],
  tuneSteerMax: ["Esterço máximo (rad)", "Max steering (rad)", "Giro máximo (rad)"],
  tuneSteerFall: ["Queda do esterço com velocidade", "Steering falloff with speed", "Caída del giro con la velocidad"],
  tuneSteerRate: ["Rapidez do volante", "Steering speed", "Rapidez del volante"],
  tuneAssist: ["Assistência de drift", "Drift assist", "Asistencia de derrape"],
  tuneStiff: ["Rigidez lateral do pneu", "Tire lateral stiffness", "Rigidez lateral del neumático"],
  tuneReset: ["Voltar ao padrão", "Reset to default", "Volver al estándar"],
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
console.log(`i18n mm3d-12: ${added} chaves adicionadas`)
