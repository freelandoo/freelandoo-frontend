// Meu Mundo 3D — Gincana (2026-11-20): Tanque de Óleo, a 3ª fase da Fábrica (óleo que sobe, rampas em zigue-zague, barris, prensas, pistões, ganchos).
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-mm-gincana-tanque-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  "gincanaOutOil": [
    "O óleo te pegou! Fora da prova",
    "The oil got you! Out of the race",
    "¡El aceite te alcanzó! Fuera de la prueba"
  ],
  "gincanaRiseNearOil": [
    "O óleo está chegando: suba!",
    "The oil is coming: climb!",
    "El aceite está llegando: ¡sube!"
  ],
  "gincanaRiseGapOil": [
    "Óleo a {m} m",
    "Oil {m} m below",
    "Aceite a {m} m"
  ],
  "gincanaHitHook": [
    "Pancada do gancho!",
    "Hit by the hook!",
    "¡Golpe del gancho!"
  ],
  "gincanaHitPiston": [
    "Socado pelo pistão!",
    "Punched by the piston!",
    "¡Golpeado por el pistón!"
  ],
  "gincanaHitBarrel": [
    "Atropelado pelo barril!",
    "Run over by a barrel!",
    "¡Atropellado por el barril!"
  ],
  "gincanaPhTanque": [
    "Tanque de Óleo",
    "Oil Tank",
    "Tanque de Aceite"
  ],
  "gincanaEvTanque": [
    "Óleo que Sobe",
    "Rising Oil",
    "Aceite que Sube"
  ],
  "gincanaPhTanquePitch": [
    "A terceira corrida da Fábrica, dentro do tanque: o óleo sobe e quem ele alcança está fora. Suba as rampas em zigue-zague entre barris, prensas, ganchos e pistões.",
    "The Factory's third race, inside the tank: the oil rises and whoever it reaches is out. Climb the zigzag ramps past barrels, presses, hooks and pistons.",
    "La tercera carrera de la Fábrica, dentro del tanque: el aceite sube y a quien alcanza queda fuera. Sube las rampas en zigzag entre barriles, prensas, ganchos y pistones."
  ],
  "gincanaSecTq1": [
    "Barris",
    "Barrels",
    "Barriles"
  ],
  "gincanaSecTq2": [
    "Prensas",
    "Presses",
    "Prensas"
  ],
  "gincanaSecTq3": [
    "Pistões",
    "Pistons",
    "Pistones"
  ],
  "gincanaSecTq4": [
    "Ganchos",
    "Hooks",
    "Ganchos"
  ],
  "gincanaSecTq5": [
    "Saída do tanque",
    "Tank exit",
    "Salida del tanque"
  ],
  "gincanaHowTq1": [
    "Barris descem a primeira rampa em duas faixas: troque de faixa e não pare, o óleo já está subindo.",
    "Barrels roll down the first ramp in two lanes: switch lanes and don't stop, the oil is already rising.",
    "Los barriles bajan la primera rampa en dos carriles: cambia de carril y no pares, el aceite ya está subiendo."
  ],
  "gincanaHowTq2": [
    "As prensas vão e voltam de lado na rampa: passe quando a sua estiver na outra ponta.",
    "The presses slide back and forth across the ramp: go when yours is at the other end.",
    "Las prensas van y vienen de lado en la rampa: pasa cuando la tuya esté en el otro extremo."
  ],
  "gincanaHowTq3": [
    "Os pistões socam da parede e jogam no óleo: suba pelo lado de dentro da rampa.",
    "The pistons punch out of the wall and knock you into the oil: climb on the inner side of the ramp.",
    "Los pistones golpean desde la pared y te tiran al aceite: sube por el lado de dentro de la rampa."
  ],
  "gincanaHowTq4": [
    "Os ganchos do guindaste balançam sobre os patamares: passe quando o seu voltar.",
    "The crane hooks swing over the landings: go when yours swings back.",
    "Los ganchos de la grúa se balancean sobre los rellanos: pasa cuando el tuyo vuelva."
  ],
  "gincanaHowTq5": [
    "A última rampa sai pelo alto do tanque. O óleo não para: quem ficar para trás está fora.",
    "The last ramp climbs out over the top of the tank. The oil doesn't stop: whoever falls behind is out.",
    "La última rampa sale por lo alto del tanque. El aceite no para: quien se quede atrás queda fuera."
  ]
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
console.log(`i18n gincana tanque: ${added} chaves adicionadas`)
