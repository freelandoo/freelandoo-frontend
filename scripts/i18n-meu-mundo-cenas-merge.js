// Meu Mundo 3D — ilustrações da história no modal do capítulo (18/11): só as chaves
// novas da faixa de cenas (as outras chaves do chapters-text.json têm valores
// trocados por outras entregas nas messages; este merge não mexe nelas).
// Idempotente: chave nova entra; valor que mudou é ATUALIZADO (OVERRIDE).
// Rodar: node scripts/i18n-meu-mundo-cenas-merge.js
const fs = require("fs")
const path = require("path")

const KEYS = {
  questScenes: ["Cenas da história", "Story scenes", "Escenas de la historia"],
  questSceneN: ["Cena {i} de {n}", "Scene {i} of {n}", "Escena {i} de {n}"],
}
const dir = path.join(__dirname, "..", "messages")
let changed = 0
for (const [i, locale] of ["pt-BR", "en", "es"].entries()) {
  const file = path.join(dir, `${locale}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  json.MeuMundo = json.MeuMundo || {}
  for (const [key, vals] of Object.entries(KEYS)) {
    if (json.MeuMundo[key] !== vals[i]) {
      json.MeuMundo[key] = vals[i]
      changed++
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
}
console.log(`i18n meu-mundo cenas: ${changed} chaves gravadas`)
