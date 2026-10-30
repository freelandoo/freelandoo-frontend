// Meu Mundo 3D — mm3d-57: o ringue do prédio do Boxe (luvas, adversários humanos).
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-meu-mundo-ringue-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  ringMobSoldier: ["Boxeador da casa", "House Boxer", "Boxeador de la casa"],
  ringMobWolf: ["Trio da Rua", "Street Trio", "Trío de la Calle"],
  ringMobGolem: ["O Pesadão", "The Heavyweight", "El Pesado"],
  ringMobHarpy: ["A Ligeira", "The Quick One", "La Ligera"],
  ringMobBrute: ["O Campeão", "The Champion", "El Campeón"],
  ringSubWolf: ["Três de uma vez, rápidos", "Three at once, fast", "Tres a la vez, rápidos"],
  ringPitch: [
    "Calce as luvas e encare os lutadores. Quando o chão acender vermelho, o golpe vem ali: esquive e bata na brecha.",
    "Lace up the gloves and face the fighters. When the floor glows red, the hit lands there: dodge and strike the opening.",
    "Ponte los guantes y enfrenta a los luchadores. Cuando el suelo se ilumine en rojo, el golpe cae ahí: esquiva y golpea en el hueco.",
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
console.log(`i18n mm3d-57 ringue: ${added} chaves adicionadas`)
