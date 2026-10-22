// Meu Mundo 3D — mm3d-16: vestuário (skins) no STATUS.
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-meu-mundo-skins-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  stSkin: ["Skin", "Skin", "Skin"],
  skinTitle: ["Vestuário", "Wardrobe", "Vestuario"],
  skinStandard: ["Personagem padrão", "Standard character", "Personaje estándar"],
  skinStandardLine: [
    "Muda com a vida: magro, normal, gordo ou forte.",
    "Changes with life: slim, normal, fat or strong.",
    "Cambia con la vida: delgado, normal, gordo o fuerte.",
  ],
  skinSergio: ["Sergio", "Sergio", "Sergio"],
  skinSergioLine: ["O lutador do Coliseu da Casa Views.", "The fighter from the Casa Views Coliseum.", "El luchador del Coliseo de Casa Views."],
  skinKindStandard: ["Padrão", "Standard", "Estándar"],
  skinKindSkin: ["Skin", "Skin", "Skin"],
  skinCondition: ["Condição: {c}", "Condition: {c}", "Condición: {c}"],
  skinHologram: ["Holograma · ainda não é seu", "Hologram · not yours yet", "Holograma · aún no es tuyo"],
  skinAcquire: ["Adquirir", "Get", "Adquirir"],
  skinAcquirePrice: ["Adquirir · {price}", "Get · {price}", "Adquirir · {price}"],
  skinAcquireAdmin: ["Adquirir · grátis (admin)", "Get · free (admin)", "Adquirir · gratis (admin)"],
  skinUse: ["Usar", "Use", "Usar"],
  skinInUse: ["Em uso", "In use", "En uso"],
  skinAcquired: ["Adquirido! Agora é só usar.", "Got it! Now just use it.", "¡Adquirido! Ahora solo úsalo."],
  skinInUseNow: ["Skin em uso", "Skin in use", "Skin en uso"],
  skinBackStandard: ["De volta ao personagem padrão", "Back to the standard character", "De vuelta al personaje estándar"],
  skinNoCoins: ["Moedas insuficientes", "Not enough coins", "Monedas insuficientes"],
  skinLoadFail: ["O personagem não carregou", "The character didn't load", "El personaje no cargó"],
  skinListFail: ["Não carregou o vestuário", "The wardrobe didn't load", "No cargó el vestuario"],
  skinPrev: ["Personagem anterior", "Previous character", "Personaje anterior"],
  skinNext: ["Próximo personagem", "Next character", "Siguiente personaje"],
  evSkinAcquired: ["Adquiriu a skin {skin} ({n} moedas).", "Got the {skin} skin ({n} coins).", "Adquirió la skin {skin} ({n} monedas)."],
  evSkinAcquiredFree: ["Adquiriu a skin {skin}.", "Got the {skin} skin.", "Adquirió la skin {skin}."],
}

// Rótulos da 1ª versão (Comprar/Vestir) trocados por Adquirir/Usar a pedido do Alex.
const REMOVED = ["skinBuy", "skinWear", "skinWearStandard", "skinWearing", "skinBought", "skinEquipped", "evSkinBought"]

const LOCALES = ["pt-BR", "en", "es"]
let added = 0
for (const [i, locale] of LOCALES.entries()) {
  const file = path.join(dir, `${locale}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  json.MeuMundo = json.MeuMundo || {}
  for (const key of REMOVED) delete json.MeuMundo[key]
  for (const [key, vals] of Object.entries(MEU_MUNDO)) {
    if (json.MeuMundo[key] === undefined) {
      json.MeuMundo[key] = vals[i]
      added++
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
}
console.log(`i18n mm3d-16 vestuário: ${added} chaves adicionadas`)
