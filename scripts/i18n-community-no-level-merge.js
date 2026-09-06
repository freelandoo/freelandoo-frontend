// Fim do gate de nível 5 para criar comunidade (2026-09-06).
//
// OVERRIDE, não fill-if-absent: o que muda é um valor que JÁ EXISTE no
// dicionário — a descrição do Booster prometia "desbloqueia criar comunidade",
// e o dicionário vence o fallback inline, então trocar só o texto do componente
// não mudaria a tela. Idempotente. Rodar: node scripts/i18n-community-no-level-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

// ns -> chave -> [pt, en, es]
const OVERRIDES = {
  Polens: {
    boosterDesc: [
      "Leve um perfil direto ao nível 5 — mais alcance nos filtros por nível da vitrine e do feed.",
      "Take a profile straight to level 5 — more reach in the level filters of the showcase and the feed.",
      "Lleva un perfil directo al nivel 5 — más alcance en los filtros por nivel de la vitrina y del feed.",
    ],
  },
}

for (const [file, idx] of [["pt-BR.json", 0], ["en.json", 1], ["es.json", 2]]) {
  const p = path.join(dir, file)
  const d = JSON.parse(fs.readFileSync(p, "utf8"))
  let changed = 0
  for (const [ns, group] of Object.entries(OVERRIDES)) {
    if (!d[ns]) d[ns] = {}
    for (const [k, vals] of Object.entries(group)) {
      if (d[ns][k] !== vals[idx]) {
        d[ns][k] = vals[idx]
        changed++
      }
    }
  }
  fs.writeFileSync(p, JSON.stringify(d, null, 2) + "\n", "utf8")
  console.log(`${file}: ${changed} chave(s) sobrescrita(s)`)
}
