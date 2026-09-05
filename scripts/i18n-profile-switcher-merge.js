/**
 * Chaves do troca-perfil do headcard (components/profile/profile-switcher.tsx).
 *
 * Fill-if-absent, como todo merge da casa: roda quantas vezes quiser sem
 * sobrescrever tradução já revisada.
 *
 *   node scripts/i18n-profile-switcher-merge.js
 */
const fs = require("fs")
const path = require("path")

const DIR = path.join(__dirname, "..", "messages")
const LOCALES = ["pt-BR", "en", "es"]

const ACCOUNT = {
  switchProfile: ["Meus perfis", "My profiles", "Mis perfiles"],
  switchProfileEyebrow: ["Sua conta", "Your account", "Tu cuenta"],
  switchProfileHint: [
    "Toque num perfil para abrir. Todos valem o mesmo.",
    "Tap a profile to open it. They all count the same.",
    "Toca un perfil para abrirlo. Todos valen lo mismo.",
  ],
  switchProfileError: [
    "Não deu para carregar seus perfis.",
    "Couldn't load your profiles.",
    "No fue posible cargar tus perfiles.",
  ],
  switchProfileRetry: ["Tentar de novo", "Try again", "Intentar de nuevo"],
  buyProfile: ["Comprar perfil", "Buy profile", "Comprar perfil"],
  mgmtBadgeAccount: ["Sua conta", "Your account", "Tu cuenta"],
}

let total = 0
LOCALES.forEach((locale, index) => {
  const filePath = path.join(DIR, `${locale}.json`)
  const dict = JSON.parse(fs.readFileSync(filePath, "utf8"))
  dict.Account = dict.Account || {}
  let added = 0

  for (const [key, values] of Object.entries(ACCOUNT)) {
    if (dict.Account[key] === undefined) {
      dict.Account[key] = values[index]
      added += 1
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(dict, null, 2) + "\n", "utf8")
  console.log(`${locale}: +${added}`)
  total += added
})

console.log(`total: ${total}`)
