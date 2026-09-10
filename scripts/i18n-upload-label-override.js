// scripts/i18n-upload-label-override.js
// OVERRIDE (não é fill-if-absent): a chave já existe nos 3 dicionários dizendo
// "R2", que é o nome do nosso bucket — vocabulário interno vazando na barra de
// progresso de quem publica. Como dicionário VENCE fallback inline, trocar só o
// fallback no componente não mudaria nada na tela.
// Idempotente: rodar de novo não muda mais nada.
const fs = require("fs")
const path = require("path")

const DIR = path.join(__dirname, "..", "messages")
const LOCALES = ["pt-BR", "en", "es"]

/** ns → chave → [pt, en, es] */
const OVERRIDES = {
  Composer: {
    "publish.uploading": ["Enviando para a Freelandoo", "Uploading to Freelandoo", "Subiendo a Freelandoo"],
  },
}

let changed = 0
LOCALES.forEach((loc, i) => {
  const file = path.join(DIR, `${loc}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  for (const [ns, keys] of Object.entries(OVERRIDES)) {
    dict[ns] = dict[ns] || {}
    for (const [key, values] of Object.entries(keys)) {
      if (dict[ns][key] !== values[i]) {
        dict[ns][key] = values[i]
        changed++
      }
    }
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8")
})

console.log(`i18n upload label override: ${changed} chave(s) atualizada(s).`)
