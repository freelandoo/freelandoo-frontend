// Meu Mundo — apresentação (plano 2026-11-11, MEU MUNDO 3D/apresentacao/PROGRESSO.md).
// Um arquivo para o trabalho inteiro: cada etapa acrescenta o seu bloco.
// Idempotente. Chaves novas = fill-if-absent; valor trocado = OVERRIDE.
// node <script> [pasta dos dicionários]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")
const KEYS = {
  "pt-BR": {
    // 01 — barra de cima única
    tbBack: "Voltar",
    tbHome: "Voltar ao jogo",
    tbCoins: "Esmeraldas",
    tbPolens: "Gold",
    tbAdd: "Conseguir mais",
  },
  en: {
    tbBack: "Back",
    tbHome: "Back to the game",
    tbCoins: "Emeralds",
    tbPolens: "Gold",
    tbAdd: "Get more",
  },
  es: {
    tbBack: "Volver",
    tbHome: "Volver al juego",
    tbCoins: "Esmeraldas",
    tbPolens: "Gold",
    tbAdd: "Conseguir más",
  },
}
const OVERRIDE = { "pt-BR": {}, en: {}, es: {} }
for (const loc of Object.keys(KEYS)) {
  const file = path.join(DIR, `${loc}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  for (const [k, v] of Object.entries(KEYS[loc])) if (!(k in dict.MeuMundo)) dict.MeuMundo[k] = v
  for (const [k, v] of Object.entries(OVERRIDE[loc])) dict.MeuMundo[k] = v
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
}
