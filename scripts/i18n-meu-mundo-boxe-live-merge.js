// Meu Mundo 3D — mm3d-44: Arena de Boxe controlada (anda, ATACAR solta um combo sorteado, ESQUIVAR).
// Namespace "MeuMundo". Idempotente, fill-if-absent (OVERRIDE regrava).
// Rodar: node scripts/i18n-meu-mundo-boxe-live-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  boxePitch2: [
    "Agora é você quem luta: ande pelo ringue e aperte ATACAR para soltar um combo — cada toque é uma sequência diferente — e ESQUIVAR para escapar. O treino, a comida e o descanso do seu hóspede decidem a força, a velocidade e o fôlego. Apanhar demais machuca de verdade — pode até ir para o hospital.",
    "Now you do the fighting: move around the ring and press ATTACK to throw a combo — every tap is a different sequence — and DODGE to slip away. Your guest's training, food and rest decide power, speed and stamina. Taking too many punches really hurts — you may even end up in the hospital.",
    "Ahora peleas tú: muévete por el ring y pulsa ATACAR para lanzar un combo — cada toque es una secuencia distinta — y ESQUIVAR para escapar. El entrenamiento, la comida y el descanso de tu huésped deciden la fuerza, la velocidad y el aliento. Recibir demasiados golpes duele de verdad — puedes terminar en el hospital.",
  ],
  boxeControls: [
    "Celular: joystick anda, ATACAR solta o combo, ESQUIVAR abaixa. Computador: WASD ou setas, J/espaço/clique ataca, K/Shift esquiva. No chão, aperte ATACAR para levantar.",
    "Phone: joystick moves, ATTACK throws the combo, DODGE ducks. Computer: WASD or arrows, J/space/click attacks, K/Shift dodges. When you're down, press ATTACK to get up.",
    "Celular: el joystick mueve, ATACAR lanza el combo, ESQUIVAR agacha. Computadora: WASD o flechas, J/espacio/clic ataca, K/Shift esquiva. En la lona, pulsa ATACAR para levantarte.",
  ],
  boxeKeys: [
    "WASD ou setas: andar · J, espaço ou clique: atacar · K ou Shift: esquivar",
    "WASD or arrows: move · J, space or click: attack · K or Shift: dodge",
    "WASD o flechas: moverse · J, espacio o clic: atacar · K o Shift: esquivar",
  ],
  // mm3d-45: o andar é pela linha entre os dois
  boxeKeys2: [
    "D/→ avança · A/← recua · W/S de lado · J, espaço ou clique: atacar · K ou Shift: esquivar",
    "D/→ step in · A/← step back · W/S sideways · J, space or click: attack · K or Shift: dodge",
    "D/→ avanza · A/← retrocede · W/S de lado · J, espacio o clic: atacar · K o Shift: esquivar",
  ],
  boxeAttack: ["Atacar", "Attack", "Atacar"],
  boxeDodge: ["Esquivar", "Dodge", "Esquivar"],
  boxeRise: ["Levantar", "Get up", "Levantarse"],
  boxeRiseTap: ["Toque em LEVANTAR sem parar!", "Keep tapping GET UP!", "¡Toca LEVANTARSE sin parar!"],
  boxeRiseKey: ["Aperte J ou espaço sem parar para levantar!", "Keep pressing J or space to get up!", "¡Pulsa J o espacio sin parar para levantarte!"],
  boxeHuman: ["jogador", "player", "jugador"],
}

const OVERRIDE = new Set([])

const LOCALES = ["pt-BR", "en", "es"]
let added = 0
for (const [i, locale] of LOCALES.entries()) {
  const file = path.join(dir, `${locale}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  json.MeuMundo = json.MeuMundo || {}
  for (const [key, vals] of Object.entries(MEU_MUNDO)) {
    if (json.MeuMundo[key] === undefined || (OVERRIDE.has(key) && json.MeuMundo[key] !== vals[i])) {
      json.MeuMundo[key] = vals[i]
      added++
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
}
console.log(`i18n mm3d-44 boxe ao vivo: ${added} chaves adicionadas`)
