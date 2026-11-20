// Meu Mundo 3D — Gincana (2026-11-20): Tanque de Óleo mais longo, com o trecho do vazamento (poças de óleo).
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-mm-gincana-tanque-oleo-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  "gincanaSecTqOleo": [
    "Vazamento",
    "Leak",
    "Fuga"
  ],
  "gincanaHowTqOleo": [
    "Daqui para cima o óleo vazou: na poça a corrida fica lenta, o pé escorrega e a pancada joga longe. Desvie das poças ou passe correndo.",
    "From here up the oil has leaked: in a puddle you run slower, your feet slip and a hit throws you far. Dodge the puddles or rush through.",
    "De aquí para arriba el aceite se ha derramado: en el charco corres más lento, el pie resbala y el golpe te lanza lejos. Esquiva los charcos o pasa corriendo."
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
console.log(`i18n gincana tanque óleo: ${added} chaves adicionadas`)
