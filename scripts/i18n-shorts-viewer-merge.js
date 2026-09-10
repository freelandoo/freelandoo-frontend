// scripts/i18n-shorts-viewer-merge.js
// Timeline de Curtos (components/portfolio/shorts-viewer.tsx) + o rótulo do
// toque no tile da vitrine. Fill-if-absent e idempotente: rodar de novo não
// muda nada, e valor já existente nunca é sobrescrito.
const fs = require("fs")
const path = require("path")

const DIR = path.join(__dirname, "..", "messages")
const LOCALES = ["pt-BR", "en", "es"]

/** ns → chave → [pt, en, es] */
const KEYS = {
  Shorts: {
    close: ["Fechar", "Close", "Cerrar"],
    mute: ["Desligar o som", "Mute", "Silenciar"],
    unmute: ["Ligar o som", "Unmute", "Activar sonido"],
  },
  Account: {
    openShort: ["Assistir este Curto", "Watch this Short", "Ver este Corto"],
    itemActions: ["Ações do item", "Item actions", "Acciones del elemento"],
  },
  Profile: {
    itemActions: ["Ações do item", "Item actions", "Acciones del elemento"],
  },
}

let added = 0
LOCALES.forEach((loc, i) => {
  const file = path.join(DIR, `${loc}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  for (const [ns, keys] of Object.entries(KEYS)) {
    dict[ns] = dict[ns] || {}
    for (const [key, values] of Object.entries(keys)) {
      if (dict[ns][key] === undefined) {
        dict[ns][key] = values[i]
        added++
      }
    }
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8")
})

console.log(`i18n shorts viewer: ${added} chave(s) adicionada(s).`)
