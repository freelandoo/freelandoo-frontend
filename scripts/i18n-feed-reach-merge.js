/**
 * Merge idempotente (fill-if-absent) das chaves do alcance regional do feed
 * (A1): botão "não gostei" e o selo "até onde o seu post chegou" (só o dono).
 *
 * Uso: node scripts/i18n-feed-reach-merge.js
 */
const fs = require("fs")
const path = require("path")

const LOCALES = ["pt-BR", "en", "es"]
const DIR = path.join(__dirname, "..", "messages")

const POST = {
  dislikeButton: ["Não gostei", "Not for me", "No me gustó"],
  undoDislikeButton: ["Desfazer não gostei", "Undo not for me", "Deshacer no me gustó"],
  reachCity: ["Seu post está na sua cidade · {place}", "Your post is live in your city · {place}", "Tu post está en tu ciudad · {place}"],
  reachCityNoPlace: [
    "Seu post está começando: cadastre sua cidade no perfil para ele subir",
    "Your post is just starting: add your city to your profile so it can grow",
    "Tu post está empezando: agrega tu ciudad al perfil para que crezca",
  ],
  reachArea: ["Seu post chegou à sua área · {place}", "Your post reached your area · {place}", "Tu post llegó a tu zona · {place}"],
  reachRegion: ["Seu post chegou à sua região · {place}", "Your post reached your region · {place}", "Tu post llegó a tu región · {place}"],
  reachState: ["Seu post chegou ao seu estado · {place}", "Your post reached your state · {place}", "Tu post llegó a tu estado · {place}"],
  reachCountry: ["Seu post chegou ao Brasil todo", "Your post reached all of Brazil", "Tu post llegó a todo Brasil"],
  reachHint: [
    "Só você vê. O post sobe de cidade para área, região, estado e Brasil conforme as pessoas interagem.",
    "Only you can see this. Your post climbs from city to area, region, state and all of Brazil as people engage.",
    "Solo tú lo ves. El post sube de ciudad a zona, región, estado y todo Brasil a medida que la gente interactúa.",
  ],
}

let touched = 0
LOCALES.forEach((locale, idx) => {
  const file = path.join(DIR, `${locale}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  dict.Post = dict.Post || {}
  for (const [key, values] of Object.entries(POST)) {
    if (dict.Post[key] === undefined) {
      dict.Post[key] = values[idx]
      touched += 1
    }
  }
  fs.writeFileSync(file, `${JSON.stringify(dict, null, 2)}\n`)
})

console.log(`i18n feed reach: ${touched} chave(s) adicionada(s).`)
