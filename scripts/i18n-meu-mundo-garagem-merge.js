// Meu Mundo 3D — mm3d-49: garagem da Corrida (Antigravidade) com as naves novas.
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-meu-mundo-garagem-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  corridaGarageKicker: ["Antigravidade · Garagem", "Antigravity · Garage", "Antigravedad · Garaje"],
  corridaGarageTitle: ["Escolha sua nave", "Choose your ship", "Elige tu nave"],
  corridaGarageCanvas: ["Nave em 3D: arraste para girar", "3D ship: drag to rotate", "Nave en 3D: arrastra para girar"],
  corridaGaragePrev: ["Nave anterior", "Previous ship", "Nave anterior"],
  corridaGarageNext: ["Próxima nave", "Next ship", "Siguiente nave"],
  corridaGarageYours: ["Sua nave", "Your ship", "Tu nave"],
  corridaGarageChoose: ["Escolher {n}", "Choose {n}", "Elegir {n}"],
  corridaMenuShip: ["Sua nave", "Your ship", "Tu nave"],
  corridaMenuGarage: ["Trocar na garagem", "Change in the garage", "Cambiar en el garaje"],
  corridaStatSpeed: ["Velocidade", "Speed", "Velocidad"],
  corridaStatAccel: ["Aceleração", "Acceleration", "Aceleración"],
  corridaStatTurn: ["Curva", "Handling", "Curvas"],
  corridaStatTurbo: ["Turbo", "Boost", "Turbo"],
  corridaShipBrasa: ["Brasa", "Ember", "Brasa"],
  corridaShipBrasaLine: ["A nave da casa. Equilibrada em tudo.", "The house ship. Balanced in everything.", "La nave de la casa. Equilibrada en todo."],
  corridaShipCorisco: ["Corisco", "Bolt", "Centella"],
  corridaShipCoriscoLine: ["A mais rápida na reta. Pede braço nas curvas.", "Fastest on the straights. Needs a firm hand in the turns.", "La más rápida en la recta. Exige mano firme en las curvas."],
  corridaShipRubi: ["Rubi", "Ruby", "Rubí"],
  corridaShipRubiLine: ["Arrancada forte. O turbo acaba antes.", "Strong launch. The boost runs out sooner.", "Arranque fuerte. El turbo se acaba antes."],
  corridaShipAurora: ["Aurora", "Aurora", "Aurora"],
  corridaShipAuroraLine: ["Faz qualquer curva. Um pouco menos de reta.", "Takes any turn. A little less on the straights.", "Toma cualquier curva. Un poco menos en la recta."],
  corridaShipTita: ["Titã", "Titan", "Titán"],
  corridaShipTitaLine: ["Pesada e de turbo longo. Curva aberta.", "Heavy, with a long boost. Wide turns.", "Pesada y de turbo largo. Curva abierta."],
  corridaShipVespa: ["Vespa", "Wasp", "Avispa"],
  corridaShipVespaLine: ["Nervosa: rápida e esperta. Turbo curto.", "Twitchy: quick and sharp. Short boost.", "Nerviosa: rápida y ágil. Turbo corto."],
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
console.log(`i18n mm3d-49 garagem da corrida: ${added} chaves adicionadas`)
