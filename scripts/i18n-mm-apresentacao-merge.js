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
    // 02 — gaveta em 5 portões
    menuBack: "Voltar",
    menuCharacter: "Personagem",
    menuCharacterHint: "Ficha, alma, rotina e registro",
    menuSettings: "Ajustes",
    menuSettingsHint: "Idioma, gráficos, convidar e sair",
    menuBag: "Mochila",
    menuBagHint: "Armas, comida, roupas e casa",
    menuBagArms: "Armas e armadura",
    menuBagThings: "Comida, roupas e casa",
  },
  en: {
    tbBack: "Back",
    tbHome: "Back to the game",
    tbCoins: "Emeralds",
    tbPolens: "Gold",
    tbAdd: "Get more",
    menuBack: "Back",
    menuCharacter: "Character",
    menuCharacterHint: "Sheet, soul, routine and record",
    menuSettings: "Settings",
    menuSettingsHint: "Language, graphics, invite and exit",
    menuBag: "Backpack",
    menuBagHint: "Weapons, food, clothes and house",
    menuBagArms: "Weapons and armor",
    menuBagThings: "Food, clothes and house",
  },
  es: {
    tbBack: "Volver",
    tbHome: "Volver al juego",
    tbCoins: "Esmeraldas",
    tbPolens: "Gold",
    tbAdd: "Conseguir más",
    menuBack: "Volver",
    menuCharacter: "Personaje",
    menuCharacterHint: "Ficha, alma, rutina y registro",
    menuSettings: "Ajustes",
    menuSettingsHint: "Idioma, gráficos, invitar y salir",
    menuBag: "Mochila",
    menuBagHint: "Armas, comida, ropa y casa",
    menuBagArms: "Armas y armadura",
    menuBagThings: "Comida, ropa y casa",
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
