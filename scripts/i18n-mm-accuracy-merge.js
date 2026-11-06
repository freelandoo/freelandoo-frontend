// Força vira Acuracidade; textos de acerto, esquiva e dano (2026-11-06).
// OVERRIDE: troca o valor de chaves que já existem. Idempotente. node <script> [pasta]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")
const RENAME = ["atStrength", "attrStrength", "boxeLifeStrength", "stHeirInherit", "pvTrainText", "evAdult", "quest_treinar_why", "quest_jogos_why", "levelUpGainAttr", "sgFoot"]
const WORD = {
  "pt-BR": [[/força/g, "acuracidade"], [/Força/g, "Acuracidade"]],
  en: [[/strength/g, "accuracy"], [/Strength/g, "Accuracy"]],
  es: [[/fuerza/g, "precisión"], [/Fuerza/g, "Precisión"]],
}
const TEXT = {
  "pt-BR": {
    sgStrWhere: "Chance de acertar: disputa com a velocidade de quem apanha. 100 contra 1000 acerta 10%. Conta para virar adulto.",
    sgDefWhere: "Amortece o dano: disputa com o ataque de quem bate. Ataque 100 contra defesa 1000 passa só 10%.",
    sgAtkWhere: "A força do golpe: multiplica o dano e fura a defesa de quem apanha.",
    sgSpdWhere: "Esquiva, até sem apertar: disputa com a acuracidade de quem bate. Também dá ritmo aos golpes e ao passo; no Jetpack, a velocidade do voo.",
    laminasEvade: "ESQUIVOU!",
    laminasMiss: "ERROU!",
  },
  en: {
    sgStrWhere: "Chance to hit: it contends with the target's speed. 100 against 1000 hits 10% of the time. Counts toward becoming an adult.",
    sgDefWhere: "Absorbs damage: it contends with the attacker's attack. Attack 100 against defense 1000 lets only 10% through.",
    sgAtkWhere: "The power of the blow: it multiplies damage and breaks through the target's defense.",
    sgSpdWhere: "Dodging, even without pressing: it contends with the attacker's accuracy. It also sets the pace of blows and steps; in the Jetpack, the flight speed.",
    laminasEvade: "DODGED!",
    laminasMiss: "MISS!",
  },
  es: {
    sgStrWhere: "Probabilidad de acertar: compite con la velocidad del objetivo. 100 contra 1000 acierta el 10%. Cuenta para hacerse adulto.",
    sgDefWhere: "Amortigua el daño: compite con el ataque de quien golpea. Ataque 100 contra defensa 1000 deja pasar solo el 10%.",
    sgAtkWhere: "La potencia del golpe: multiplica el daño y atraviesa la defensa del objetivo.",
    sgSpdWhere: "Esquiva, incluso sin pulsar: compite con la precisión de quien golpea. También marca el ritmo de los golpes y del paso; en el Jetpack, la velocidad de vuelo.",
    laminasEvade: "¡ESQUIVÓ!",
    laminasMiss: "¡FALLÓ!",
  },
}
for (const [loc, words] of Object.entries(WORD)) {
  const file = path.join(DIR, `${loc}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  const mm = dict.MeuMundo
  for (const k of RENAME) {
    if (typeof mm[k] !== "string") continue
    for (const [from, to] of words) mm[k] = mm[k].replace(from, to)
  }
  Object.assign(mm, TEXT[loc])
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
}

// Fichas dos personagens (2026-11-06)
const SHEET = {
  "pt-BR": { sgDefHow2: "Começa no valor do personagem e sobe a cada nível de aventura. O equipamento do Armeiro e da Forja soma por cima.", sgAtkHow2: "Começa no valor do personagem e sobe a cada nível de aventura. A arma e o refino na Forja somam por cima.", stDefShort2: "DEF {n}", stAtkShort2: "ATQ {n}", laminasSubStone: "Pedra: muita defesa, pouca velocidade" },
  en: { sgDefHow2: "Starts at the character's value and rises with each adventure level. Gear from the Armorer and the Forge adds on top.", sgAtkHow2: "Starts at the character's value and rises with each adventure level. The weapon and Forge refining add on top.", stDefShort2: "DEF {n}", stAtkShort2: "ATK {n}", laminasSubStone: "Stone: high defense, low speed" },
  es: { sgDefHow2: "Empieza en el valor del personaje y sube con cada nivel de aventura. El equipo del Armero y de la Forja suma encima.", sgAtkHow2: "Empieza en el valor del personaje y sube con cada nivel de aventura. El arma y el refinado en la Forja suman encima.", stDefShort2: "DEF {n}", stAtkShort2: "ATQ {n}", laminasSubStone: "Piedra: mucha defensa, poca velocidad" },
}
for (const [loc, keys] of Object.entries(SHEET)) {
  const file = path.join(DIR, `${loc}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  Object.assign(dict.MeuMundo, keys)
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
}
