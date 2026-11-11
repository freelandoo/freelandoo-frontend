// Meu Mundo 3D — fim de luta que o servidor não conferiu (2026-11-11): antes sumia em
// silêncio; agora a tela avisa e oferece "Tentar de novo". Namespace "MeuMundo".
// Idempotente: chave nova entra; valor que mudou aqui é ATUALIZADO (OVERRIDE).
// Rodar: node scripts/i18n-meu-mundo-luta-conferida-merge.js
const fs = require("fs")
const path = require("path")

const TEXT = {
  fightNotCounted: [
    "O servidor não conferiu esta luta — o resultado ainda não valeu.",
    "The server didn't confirm this fight — the result hasn't counted yet.",
    "El servidor no confirmó esta pelea — el resultado aún no cuenta.",
  ],
  fightRetry: ["Tentar de novo", "Try again", "Intentar de nuevo"],
}

const dir = path.join(__dirname, "..", "messages")
let changed = 0
for (const [i, locale] of ["pt-BR", "en", "es"].entries()) {
  const file = path.join(dir, `${locale}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  json.MeuMundo = json.MeuMundo || {}
  for (const [key, vals] of Object.entries(TEXT)) {
    if (json.MeuMundo[key] !== vals[i]) {
      json.MeuMundo[key] = vals[i]
      changed++
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
}
console.log(`i18n meu-mundo luta conferida: ${changed} chaves gravadas`)
