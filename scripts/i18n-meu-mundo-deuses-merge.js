// Meu Mundo 3D — mm3d-50: os deuses de Lúmen como skins (nome próprio + frase).
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-meu-mundo-deuses-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  skinGod_aurion: ["Aurion", "Aurion", "Aurion"],
  skinGod_morkhan: ["Morkhan", "Morkhan", "Morkhan"],
  skinGod_kragor: ["Kragor", "Kragor", "Kragor"],
  skinGod_zephyra: ["Zéphyra", "Zéphyra", "Zéphyra"],
  skinGod_maru: ["Marú", "Marú", "Marú"],
  skinGod_iris: ["Íris", "Íris", "Íris"],
  skinGod_noctis: ["Noctis", "Noctis", "Noctis"],
  skinGod_aeryn: ["Aeryn", "Aeryn", "Aeryn"],
  skinGodLine_aurion: ["O Titã Solar. Nunca perdeu uma prova.", "The Solar Titan. Never lost a trial.", "El Titán Solar. Nunca perdió una prueba."],
  skinGodLine_morkhan: [
    "O Sem-Nome. Trapaceou na final e foi riscado da pedra.",
    "The Nameless. He cheated in the final and was scratched off the stone.",
    "El Sin Nombre. Hizo trampa en la final y fue borrado de la piedra.",
  ],
  skinGodLine_kragor: ["O Minotauro de Basalto. Força que não cede.", "The Basalt Minotaur. Strength that never yields.", "El Minotauro de Basalto. Fuerza que no cede."],
  skinGodLine_zephyra: ["A Deusa das Tempestades. Ninguém a alcança.", "The Storm Goddess. No one can catch her.", "La Diosa de las Tormentas. Nadie la alcanza."],
  skinGodLine_maru: ["O Tritão das águas fundas.", "The Triton of the deep waters.", "El Tritón de las aguas profundas."],
  skinGodLine_iris: ["A Deusa das Cores. Cada golpe, um tom.", "The Goddess of Colors. Every strike, a new hue.", "La Diosa de los Colores. Cada golpe, un tono."],
  skinGodLine_noctis: ["A Onça da Lua. Caça no escuro.", "The Moon Jaguar. Hunts in the dark.", "El Jaguar de la Luna. Caza en la oscuridad."],
  skinGodLine_aeryn: ["A Águia de Bronze. Senhora dos céus.", "The Bronze Eagle. Ruler of the skies.", "El Águila de Bronce. Señora de los cielos."],
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
console.log(`i18n meu-mundo deuses: ${added} chaves adicionadas`)
