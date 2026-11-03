// mm3d-60j: SUBIU DE NÍVEL sem tela cheia (LEVEL UP + modal pequeno do que foi liberado). Idempotente (fill-if-absent).
const fs = require("fs")
const path = require("path")
const ADD = {
  "pt-BR": { levelUpBig: "LEVEL UP", levelUpNoteEyebrow: "Nível {n}", levelUpNoteTitle: "Novo acesso liberado" },
  en: { levelUpBig: "LEVEL UP", levelUpNoteEyebrow: "Level {n}", levelUpNoteTitle: "New access unlocked" },
  es: { levelUpBig: "LEVEL UP", levelUpNoteEyebrow: "Nivel {n}", levelUpNoteTitle: "Nuevo acceso desbloqueado" },
}
for (const [lang, keys] of Object.entries(ADD)) {
  const f = path.join(__dirname, "..", "messages", `${lang}.json`)
  const j = JSON.parse(fs.readFileSync(f, "utf8"))
  j.MeuMundo = j.MeuMundo || {}
  let n = 0
  for (const [k, v] of Object.entries(keys)) if (!(k in j.MeuMundo)) ((j.MeuMundo[k] = v), n++)
  fs.writeFileSync(f, JSON.stringify(j, null, 2) + "\n")
  console.log(lang, "+", n)
}
