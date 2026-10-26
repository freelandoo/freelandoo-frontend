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
  // mm3d-37b: treino e estudo no prédio
  pvFail: ["Não deu certo agora. Tente de novo.", "That didn't work. Try again.", "No funcionó. Inténtalo de nuevo."],
  pvTrainingFor: ["Treinando por {h} h", "Working out for {h} h", "Entrenando por {h} h"],
  pvStudyingFor: ["Estudando por {h} h", "Studying for {h} h", "Estudiando por {h} h"],
  pvTrainTitle: ["Treinar quanto tempo?", "Work out for how long?", "¿Entrenar cuánto tiempo?"],
  pvStudyTitle: ["Estudar quanto tempo?", "Study for how long?", "¿Estudiar cuánto tiempo?"],
  pvTrainText: [
    "Força e velocidade sobem nas primeiras 4 h do dia. Ele continua mesmo com o jogo fechado; sair do aparelho para.",
    "Strength and speed grow in the first 4 h of the day. He keeps going even with the game closed; stepping off the machine stops it.",
    "La fuerza y la velocidad suben en las primeras 4 h del día. Sigue aunque cierres el juego; salir del aparato lo detiene.",
  ],
  pvStudyText: [
    "A inteligência sobe nas primeiras 5 h do dia. Ele continua mesmo com o jogo fechado; levantar para.",
    "Intelligence grows in the first 5 h of the day. He keeps going even with the game closed; standing up stops it.",
    "La inteligencia sube en las primeras 5 h del día. Sigue aunque cierres el juego; levantarse lo detiene.",
  ],
  pvUniText: [
    "Na universidade rende 1,5× — a hora de aula custa {c} moedas.",
    "At the university it yields 1.5× — each class hour costs {c} coins.",
    "En la universidad rinde 1,5× — la hora de clase cuesta {c} monedas.",
  ],
  actPraying: ["Rezando", "Praying", "Rezando"],
  actJail: ["Preso", "In jail", "Preso"],
  stWhereShort: [
    "Treinar: na academia do centro. Estudar: na biblioteca, na escola ou na universidade.",
    "Work out: at the downtown gym. Study: at the library, the school or the university.",
    "Entrenar: en el gimnasio del centro. Estudiar: en la biblioteca, la escuela o la universidad.",
  ],
  stWhere: [
    "Treinar é na academia do centro; estudar, na biblioteca, na escola ou na universidade (rende mais, mas cobra a hora de aula). Entre no prédio e use um aparelho ou uma carteira.",
    "Working out is at the downtown gym; studying, at the library, the school or the university (yields more, but charges per class hour). Go into the building and use a machine or a desk.",
    "Entrenar es en el gimnasio del centro; estudiar, en la biblioteca, la escuela o la universidad (rinde más, pero cobra la hora de clase). Entra en el edificio y usa un aparato o un pupitre.",
  ],
  // mm3d-37c: balcão dos restaurantes e caixa do supermercado
  pvMenuTitle: ["Cardápio", "Menu", "Menú"],
  pvMenuLoading: ["Abrindo o cardápio…", "Opening the menu…", "Abriendo el menú…"],
  pvMenuCoins: [
    "Suas moedas: {n}. Ele come aqui mesmo — vale a refeição.",
    "Your coins: {n}. He eats right here — it counts as the meal.",
    "Tus monedas: {n}. Come aquí mismo — cuenta como comida.",
  ],
  pvOrderPrice: ["Pedir · {n}", "Order · {n}", "Pedir · {n}"],
  pvAte: ["Comeu: {item}", "Ate: {item}", "Comió: {item}"],
  mkAtMarket: ["No supermercado · {n}", "At the supermarket · {n}", "En el supermercado · {n}"],
  mkHintGoMarket: [
    "Para comprar, vá ao supermercado do centro e passe no caixa. Tudo vai para a geladeira da sua casa.",
    "To buy, go to the downtown supermarket and use the checkout. Everything goes to your home fridge.",
    "Para comprar, ve al supermercado del centro y pasa por la caja. Todo va a la nevera de tu casa.",
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
console.log(`i18n mm3d-37 prédios: ${added} chaves adicionadas`)
