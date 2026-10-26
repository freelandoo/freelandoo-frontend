// Meu Mundo 3D — mm3d-37: o centro por dentro (interiores dos prédios).
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-meu-mundo-predios-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  pvTrain: ["Treinar", "Work out", "Entrenar"],
  pvStudy: ["Estudar", "Study", "Estudiar"],
  pvPray: ["Rezar", "Pray", "Rezar"],
  pvOrder: ["Fazer pedido", "Order", "Pedir"],
  pvMarket: ["Comprar", "Shop", "Comprar"],
  pvSeller: ["Conversar", "Talk", "Conversar"],
  pvPolice: ["Falar com o delegado", "Talk to the chief", "Hablar con el comisario"],
  pvGoTo: ["Usar", "Use", "Usar"],
  pvLeaveSpot: ["Sair daqui", "Step away", "Salir de aquí"],
  pvSoon: ["Em breve", "Coming soon", "Próximamente"],
  pvLoading: ["Entrando: {place}…", "Entering: {place}…", "Entrando: {place}…"],
  pvErrorTitle: ["O lugar não abriu", "The place didn't open", "El lugar no abrió"],
  pvErrorText: ["Não deu para carregar o lugar. Tente de novo.", "Couldn't load the place. Try again.", "No se pudo cargar el lugar. Inténtalo de nuevo."],
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
console.log(`i18n mm3d-37 prédios: ${added} chaves adicionadas`)
