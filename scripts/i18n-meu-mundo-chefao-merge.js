// Meu Mundo 3D — Paint mm3d-38: barra de sangue, gatinhos que voltam ao mapa
// e os avisos do chefão. Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-meu-mundo-chefao-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  paintBlood: ["Sangue", "Health", "Sangre"],
  paintToastDrop: [
    "Caiu nas nuvens: {n} gatinhos voltaram para o mapa",
    "Fell into the clouds: {n} kittens went back to the map",
    "Caíste a las nubes: {n} gatitos volvieron al mapa",
  ],
  paintToastBossSlam: ["Tapa no chão — pule!", "Ground slam — jump!", "Golpe al suelo — ¡salta!"],
  paintToastBossRoar: ["O chefão rugiu!", "The boss roared!", "¡El jefe rugió!"],
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
console.log(`i18n meu-mundo chefão: ${added} chaves adicionadas`)
