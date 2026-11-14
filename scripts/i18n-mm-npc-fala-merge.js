// Domínios: o chefe/monstro fala no card das notificações (retrato + texto). Idempotente (fill-if-absent).
// node scripts/i18n-mm-npc-fala-merge.js [pasta dos dicionários]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")
const KEYS = {
  talkMobSealed: ["Ainda não é a sua vez. Vença o setor {n} primeiro.", "It's not your turn yet. Defeat sector {n} first.", "Todavía no es tu turno. Vence primero el sector {n}."],
}
const LANGS = ["pt-BR", "en", "es"]
LANGS.forEach((lang, i) => {
  const f = path.join(DIR, `${lang}.json`)
  const j = JSON.parse(fs.readFileSync(f, "utf8"))
  j.MeuMundo = j.MeuMundo || {}
  let n = 0
  for (const [k, v] of Object.entries(KEYS)) if (!(k in j.MeuMundo)) ((j.MeuMundo[k] = v[i]), n++)
  fs.writeFileSync(f, JSON.stringify(j, null, 2) + "\n")
  console.log(lang, "+", n)
})
