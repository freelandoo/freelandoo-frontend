// Meu Mundo 3D — mm3d-36: cores do personagem (camiseta, calça, pele, cabelo).
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-meu-mundo-cores-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  skinColors: ["Cores", "Colors", "Colores"],
  skinColorsClose: ["Fechar cores", "Close colors", "Cerrar colores"],
  skinShirt: ["Camiseta", "Shirt", "Camiseta"],
  skinPants: ["Calça", "Pants", "Pantalón"],
  skinSkinTone: ["Pele", "Skin", "Piel"],
  skinHair: ["Cabelo", "Hair", "Pelo"],
  skinSaveColors: ["Salvar cores", "Save colors", "Guardar colores"],
  skinColorsSaved: ["Cores salvas", "Colors saved", "Colores guardados"],
  ntColorsTitle: ["Você pode mudar as cores do seu personagem", "You can change your character's colors", "Puedes cambiar los colores de tu personaje"],
  ntColorsLine: [
    "No STATUS → SKIN → Cores: camiseta, calça, pele e cabelo.",
    "In STATUS → SKIN → Colors: shirt, pants, skin and hair.",
    "En STATUS → SKIN → Colores: camiseta, pantalón, piel y pelo.",
  ],
  clr_red: ["Vermelho", "Red", "Rojo"],
  clr_white: ["Branco", "White", "Blanco"],
  clr_black: ["Preto", "Black", "Negro"],
  clr_gray: ["Cinza", "Gray", "Gris"],
  clr_navy: ["Azul-marinho", "Navy blue", "Azul marino"],
  clr_sky: ["Azul-céu", "Sky blue", "Azul cielo"],
  clr_green: ["Verde", "Green", "Verde"],
  clr_mint: ["Verde-menta", "Mint green", "Verde menta"],
  clr_yellow: ["Amarelo", "Yellow", "Amarillo"],
  clr_orange: ["Laranja", "Orange", "Naranja"],
  clr_pink: ["Rosa", "Pink", "Rosa"],
  clr_purple: ["Roxo", "Purple", "Morado"],
  clr_jeans: ["Jeans", "Denim", "Vaquero"],
  clr_lightJeans: ["Jeans claro", "Light denim", "Vaquero claro"],
  clr_beige: ["Bege", "Beige", "Beige"],
  clr_brown: ["Marrom", "Brown", "Marrón"],
  clr_olive: ["Verde-oliva", "Olive green", "Verde oliva"],
  clr_wine: ["Vinho", "Burgundy", "Vino"],
  clr_royal: ["Azul-royal", "Royal blue", "Azul real"],
  clr_s0: ["Pele 1 (mais clara)", "Skin 1 (lightest)", "Piel 1 (más clara)"],
  clr_s1: ["Pele 2", "Skin 2", "Piel 2"],
  clr_s2: ["Pele 3", "Skin 3", "Piel 3"],
  clr_s3: ["Pele 4", "Skin 4", "Piel 4"],
  clr_s4: ["Pele 5", "Skin 5", "Piel 5"],
  clr_s5: ["Pele 6", "Skin 6", "Piel 6"],
  clr_s6: ["Pele 7", "Skin 7", "Piel 7"],
  clr_s7: ["Pele 8 (mais escura)", "Skin 8 (darkest)", "Piel 8 (más oscura)"],
  clr_darkBrown: ["Castanho-escuro", "Dark brown", "Castaño oscuro"],
  clr_copper: ["Acobreado", "Copper", "Cobrizo"],
  clr_darkBlonde: ["Loiro-escuro", "Dark blonde", "Rubio oscuro"],
  clr_blonde: ["Loiro", "Blonde", "Rubio"],
  clr_blue: ["Azul", "Blue", "Azul"],
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
console.log(`i18n mm3d-36 cores: ${added} chaves adicionadas`)
