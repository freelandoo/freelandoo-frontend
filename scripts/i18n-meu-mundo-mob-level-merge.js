// mm3d-60m: nível do monstro da rua na placa da luta. Idempotente (fill-if-absent).
const fs = require("fs")
const path = require("path")
const ADD = {
  "pt-BR": { laminasFoeLevel: "Nv. {n}" },
  en: { laminasFoeLevel: "Lv. {n}" },
  es: { laminasFoeLevel: "Nv. {n}" },
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
