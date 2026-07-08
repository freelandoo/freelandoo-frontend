// i18n do botão de ferramentas (toolbar retrátil do headcard do /account).
// Idempotente e não-destrutivo: só ADICIONA chaves ausentes.
// Rodar com: node scripts/i18n-headcard-tools-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const ACCOUNT = {
  toolsButton: ["Ferramentas", "Tools", "Herramientas"],
  toolsClose: ["Fechar ferramentas", "Close tools", "Cerrar herramientas"],
}

const LOCALES = ["pt-BR", "en", "es"]

function mergeNamespace(json, ns, keys, localeIndex) {
  if (!json[ns]) json[ns] = {}
  let added = 0
  for (const [key, values] of Object.entries(keys)) {
    if (json[ns][key] === undefined) {
      json[ns][key] = values[localeIndex]
      added++
    }
  }
  return added
}

for (let i = 0; i < LOCALES.length; i++) {
  const file = path.join(dir, `${LOCALES[i]}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  const added = mergeNamespace(json, "Account", ACCOUNT, i)
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n", "utf8")
  console.log(`${LOCALES[i]}: +${added} chaves`)
}
