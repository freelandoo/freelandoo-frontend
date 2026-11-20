// Meu Mundo 3D â€” HUD principal (20/11): "Nv." pequeno na frente do nÃ­vel.
// Idempotente: chave nova entra; valor que mudou Ã© ATUALIZADO (OVERRIDE).
// Rodar: node scripts/i18n-meu-mundo-hud-nivel-merge.js
const fs = require("fs")
const path = require("path")

const KEYS = {
  hudLevelShort: ["Nv.", "Lv.", "Nv."],
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
console.log(`i18n meu-mundo hud nÃ­vel: ${changed} chaves gravadas`)
