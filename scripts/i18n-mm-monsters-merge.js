// Monstros iguais às skins (2026-11-06): o Ciborgue atira, a Dama não voa.
// OVERRIDE: troca o valor de chaves que já existem. Idempotente. node <script> [pasta]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")
const TEXT = {
  "pt-BR": { laminasSubGolem: "Lento, atira de longe", ringSubGolem: "Lento e pesado", laminasSubHarpy: "Rápida, ataca com as garras" },
  en: { laminasSubGolem: "Slow, shoots from afar", ringSubGolem: "Slow and heavy", laminasSubHarpy: "Fast, strikes with her claws" },
  es: { laminasSubGolem: "Lento, dispara de lejos", ringSubGolem: "Lento y pesado", laminasSubHarpy: "Rápida, ataca con sus garras" },
}
for (const [loc, text] of Object.entries(TEXT)) {
  const file = path.join(DIR, `${loc}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  Object.assign(dict.MeuMundo, text)
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
}
