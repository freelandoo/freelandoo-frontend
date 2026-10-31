// Meu Mundo 3D — mm3d-58: escolha da classe (raposas × vampiros). Namespace
// "MeuMundo". Idempotente, fill-if-absent. Rodar: node scripts/i18n-meu-mundo-clans-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  clanTitle: ["Escolha sua classe", "Choose your class", "Elige tu clase"],
  clanIntro: [
    "Raposas moram com raposas e vampiros com vampiros. No centro todos se encontram — e de noite as classes se enfrentam.",
    "Foxes live with foxes and vampires with vampires. Everyone meets downtown — and at night the classes fight.",
    "Los zorros viven con zorros y los vampiros con vampiros. En el centro todos se encuentran — y de noche las clases se enfrentan.",
  ],
  clanSexLabel: ["Personagem", "Character", "Personaje"],
  clanBoy: ["Menino", "Boy", "Chico"],
  clanGirl: ["Menina", "Girl", "Chica"],
  clanFoxes: ["Raposas", "Foxes", "Zorros"],
  clanVampires: ["Vampiros", "Vampires", "Vampiros"],
  clanFoxLine: ["Magia com o cajado: golpes de longe e em área.", "Staff magic: ranged and area attacks.", "Magia con el bastón: golpes a distancia y en área."],
  clanVampireLine: ["Espada na mão: golpes rápidos de perto.", "Sword in hand: fast close-range strikes.", "Espada en mano: golpes rápidos de cerca."],
  clanConfirm: ["Entrar como {c}", "Enter as {c}", "Entrar como {c}"],
  clanPick: ["Escolha uma classe", "Pick a class", "Elige una clase"],
  clanBusy: ["Preparando sua casa…", "Getting your house ready…", "Preparando tu casa…"],
  clanForever: [
    "A classe é para sempre — só um artefato raro troca.",
    "Your class is for good — only a rare artifact changes it.",
    "La clase es para siempre — solo un artefacto raro la cambia.",
  ],
  clanFox: ["Raposa", "Fox", "Zorra"],
  clanVampire: ["Vampiro", "Vampire", "Vampiro"],
  clanVampireF: ["Vampira", "Vampire", "Vampira"],
  // vestuário: o "Padrão" é o personagem da classe
  skinClan: ["Classe: {c}", "Class: {c}", "Clase: {c}"],
  skinClanLine: [
    "O personagem da sua classe. Vira adulto com a vida.",
    "Your class character. Grows up as life goes on.",
    "El personaje de tu clase. Se hace adulto con la vida.",
  ],
}

const LOCALES = ["pt-BR", "en", "es"]
let added = 0
for (const [i, locale] of LOCALES.entries()) {
  const file = path.join(dir, `${locale}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  json.MeuMundo = json.MeuMundo || {}
  for (const [key, vals] of Object.entries(MEU_MUNDO)) {
    if (json.MeuMundo[key] === undefined) {
      json.MeuMundo[key] = vals[i]
      added++
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
}
console.log(`i18n meu-mundo clans: ${added} chaves adicionadas`)
