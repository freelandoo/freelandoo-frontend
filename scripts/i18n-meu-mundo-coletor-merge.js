// Meu Mundo 3D — o coletor de néctar na tela de equipar (19/11): chaves novas.
// Idempotente: chave nova entra; valor que mudou é ATUALIZADO (OVERRIDE).
// Rodar: node scripts/i18n-meu-mundo-coletor-merge.js
const fs = require("fs")
const path = require("path")

const KEYS = {
  ncCollector: ["Coletor de néctar", "Nectar collector", "Colector de néctar"],
  ncCollectorTotal: ["{n} L", "{n} L", "{n} L"],
  ncCollectorHint: ["Todo o néctar que você já coletou. Não tem limite.", "All the nectar you have ever collected. There is no limit.", "Todo el néctar que ya recolectaste. No tiene límite."],
  ncCollectorRings: ["{n} anéis completos (10 L cada)", "{n} full rings (10 L each)", "{n} anillos completos (10 L cada uno)"],
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
console.log(`i18n meu-mundo coletor: ${changed} chaves gravadas`)
