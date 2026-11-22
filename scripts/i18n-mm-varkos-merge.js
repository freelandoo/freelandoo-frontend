// Varkos, o Leão da Guerra, skin de deus jogável (22/11/2026). Idempotente (fill-if-absent).
// node scripts/i18n-mm-varkos-merge.js [pasta dos dicionários]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")
const ADD = {
  "pt-BR": {
    skinGod_varkos: "Varkos",
    skinGodLine_varkos: "O Leão da Guerra. Nasceu de quinze anos de batalha.",
    abilityVarkosUlt: "Rugido da Guerra",
    abilityVarkosSlash: "Garra de Aço",
    abilityVarkosDash: "Investida do Leão",
    abilityVarkosShield: "Juba de Escudos",
  },
  en: {
    skinGod_varkos: "Varkos",
    skinGodLine_varkos: "The Lion of War. Born from fifteen years of battle.",
    abilityVarkosUlt: "War Roar",
    abilityVarkosSlash: "Steel Claw",
    abilityVarkosDash: "Lion's Charge",
    abilityVarkosShield: "Mane of Shields",
  },
  es: {
    skinGod_varkos: "Varkos",
    skinGodLine_varkos: "El León de la Guerra. Nació de quince años de batalla.",
    abilityVarkosUlt: "Rugido de la Guerra",
    abilityVarkosSlash: "Garra de Acero",
    abilityVarkosDash: "Embestida del León",
    abilityVarkosShield: "Melena de Escudos",
  },
}
for (const [lang, add] of Object.entries(ADD)) {
  const file = path.join(DIR, lang + ".json")
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  const mm = dict.MeuMundo
  if (!mm) throw new Error("sem MeuMundo em " + lang)
  let n = 0
  for (const [k, v] of Object.entries(add)) if (!(k in mm)) { mm[k] = v; n++ }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
  console.log(lang, "+" + n)
}
