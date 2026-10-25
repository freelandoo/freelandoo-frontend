// Meu Mundo 3D — mm3d-28: geladeira, avisos com retrato e fôlego de corrida.
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-meu-mundo-geladeira-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  // geladeira
  frOpen: ["Abrir geladeira", "Open fridge", "Abrir nevera"],
  frEyebrow: ["Geladeira", "Fridge", "Nevera"],
  frChooseCategory: ["Escolha a categoria", "Pick a category", "Elige la categoría"],
  frBack: ["Voltar", "Back", "Volver"],
  frClose: ["Fechar a geladeira", "Close the fridge", "Cerrar la nevera"],
  frUnits: ["{n} na geladeira", "{n} in the fridge", "{n} en la nevera"],
  frCatEmpty: ["Nada aqui — compre no Mercado", "Nothing here — buy at the Market", "Nada aquí — compra en el Mercado"],
  frOut: ["Acabou", "Out", "Agotado"],
  frHintMove: ["Girar", "Turn", "Girar"],
  frHintPick: ["Escolher", "Pick", "Elegir"],
  frHintBack: ["Voltar", "Back", "Volver"],
  frPrev: ["Anterior", "Previous", "Anterior"],
  frNext: ["Próximo", "Next", "Siguiente"],
  frEat: ["Comer", "Eat", "Comer"],
  frDrink: ["Beber", "Drink", "Beber"],
  frTake: ["Tomar", "Take", "Tomar"],
  frPortion: ["Porção: 1 unidade", "Portion: 1 unit", "Porción: 1 unidad"],
  frNoEffect: ["Sem efeito imediato.", "No immediate effect.", "Sin efecto inmediato."],
  frEffSatiety: ["{n} saciedade", "{n} satiety", "{n} saciedad"],
  frEffEnergy: ["{n} energia", "{n} energy", "{n} energía"],
  frEffMood: ["{n} humor", "{n} mood", "{n} ánimo"],
  frEffStress: ["{n} estresse", "{n} stress", "{n} estrés"],
  frFitFull: ["Atende à refeição das {h} h.", "Covers the {h}:00 meal.", "Cubre la comida de las {h} h."],
  frFitFullLate: [
    "Atende à refeição das {h} h (atrasada) e para a penalidade.",
    "Covers the late {h}:00 meal and stops the penalty.",
    "Cubre la comida atrasada de las {h} h y detiene la penalización.",
  ],
  frFitPart: ["Conta parte da refeição das {h} h ({p}%).", "Counts as part of the {h}:00 meal ({p}%).", "Cuenta como parte de la comida de las {h} h ({p}%)."],
  frFitNone: ["Não conta como refeição.", "Doesn't count as a meal.", "No cuenta como comida."],
  frFitNoMeal: [
    "Nenhuma refeição aberta agora — vale como lanche.",
    "No meal open right now — it counts as a snack.",
    "Ninguna comida abierta ahora — cuenta como merienda.",
  ],
  frCatMeals: ["Refeições", "Meals", "Comidas"],
  frCatSnacks: ["Lanches", "Snacks", "Meriendas"],
  frCatDrinks: ["Bebidas", "Drinks", "Bebidas"],
  frCatSupplements: ["Suplementos", "Supplements", "Suplementos"],
  frCatMedicine: ["Remédios", "Medicine", "Medicamentos"],
  frCatStimulants: ["Estimulantes", "Stimulants", "Estimulantes"],
  frCatAnabolic: ["Anabolizantes", "Anabolic steroids", "Anabolizantes"],
  frEmpty: ["Acabou na geladeira.", "That ran out in the fridge.", "Se acabó en la nevera."],
  frFar: ["Chegue mais perto da geladeira.", "Get closer to the fridge.", "Acércate más a la nevera."],
  frNotOwner: ["Só o morador abre a geladeira.", "Only the resident opens the fridge.", "Solo el residente abre la nevera."],
  frFull: ["Ele está satisfeito — não cabe mais nada agora.", "He's full — nothing more fits right now.", "Está lleno — ahora no le cabe nada más."],
  frSleeping: ["Ele está dormindo.", "He's asleep.", "Está durmiendo."],
  frRiding: ["Desça do veículo primeiro.", "Get off the vehicle first.", "Bájate del vehículo primero."],
  frTimeout: ["A geladeira não respondeu. Tente de novo.", "The fridge didn't respond. Try again.", "La nevera no respondió. Inténtalo de nuevo."],
  frDenied: ["Não deu agora. Tente de novo.", "Not possible right now. Try again.", "No se pudo ahora. Inténtalo de nuevo."],
  frAteMeal: ["{item}: refeição das {h} h feita.", "{item}: the {h}:00 meal is done.", "{item}: comida de las {h} h hecha."],
  frAtePart: ["{item}: parte da refeição das {h} h.", "{item}: part of the {h}:00 meal.", "{item}: parte de la comida de las {h} h."],
  frAte: ["{item}: pronto.", "{item}: done.", "{item}: listo."],
  // fôlego
  winded: ["Sem fôlego — andando até recuperar", "Out of breath — walking until recovered", "Sin aliento — caminando hasta recuperarse"],
  // avisos com retrato
  needHospital: ["Estou internado. Preciso me recuperar.", "I'm in the hospital. I need to recover.", "Estoy internado. Necesito recuperarme."],
  needUnwell: [
    "Não estou me sentindo bem. Preciso de atendimento.",
    "I'm not feeling well. I need care.",
    "No me siento bien. Necesito atención.",
  ],
  needExhausted: ["Estou exausto. Preciso descansar.", "I'm exhausted. I need to rest.", "Estoy agotado. Necesito descansar."],
  needStarving: ["Nossa, estou com muita fome!", "Wow, I'm starving!", "¡Uf, tengo muchísima hambre!"],
  needHungry: ["Estou ficando com fome.", "I'm getting hungry.", "Me está dando hambre."],
  needSleep: [
    "Já estou há {h} horas acordado. Preciso dormir.",
    "I've been awake for {h} hours. I need to sleep.",
    "Llevo {h} horas despierto. Necesito dormir.",
  ],
  needTired: ["Estou cansado.", "I'm tired.", "Estoy cansado."],
  needStressed: ["Estou muito estressado. Preciso de uma pausa.", "I'm really stressed. I need a break.", "Estoy muy estresado. Necesito una pausa."],
  needAging: ["Sinto o peso da idade.", "I feel my age.", "Siento el peso de la edad."],
  needStarvingSleep: [
    "Estou com muita fome e já estou há {h} horas acordado.",
    "I'm starving and I've been awake for {h} hours.",
    "Tengo muchísima hambre y llevo {h} horas despierto.",
  ],
  needHungrySleep: [
    "Estou ficando com fome e já estou há {h} horas acordado.",
    "I'm getting hungry and I've been awake for {h} hours.",
    "Me está dando hambre y llevo {h} horas despierto.",
  ],
  needAlsoSleep: ["E já estou há {h} horas acordado.", "And I've been awake for {h} hours.", "Y llevo {h} horas despierto."],
  needOpenStatus: ["Ver status", "See status", "Ver estado"],
  // STATUS: mercado → geladeira e histórico
  mkHintFridge: [
    "Tudo vai para a geladeira da sua casa — é lá que ele come. Saudável é caro, porcaria é barata.",
    "Everything goes to your home fridge — that's where he eats. Healthy is pricey, junk is cheap.",
    "Todo va a la nevera de tu casa — ahí es donde come. Lo sano es caro, la comida chatarra es barata.",
  ],
  mkInFridge: ["{n} na geladeira", "{n} in the fridge", "{n} en la nevera"],
  mkStored: ["Guardado na geladeira", "Stored in the fridge", "Guardado en la nevera"],
  evMealPart: ["Parte da refeição das {h} h: {item}.", "Part of the {h}:00 meal: {item}.", "Parte de la comida de las {h} h: {item}."],
  evMealLost: [
    "A refeição das {h} h ficou para trás (a penalidade terminou).",
    "The {h}:00 meal was left behind (the penalty ended).",
    "La comida de las {h} h quedó atrás (la penalización terminó).",
  ],
  evBuy: ["Comprou {n}× {item} para a geladeira ({p} moedas).", "Bought {n}× {item} for the fridge ({p} coins).", "Compró {n}× {item} para la nevera ({p} monedas)."],
  evRoutineFridge: ["Rotina: comeu {item} da geladeira.", "Routine: ate {item} from the fridge.", "Rutina: comió {item} de la nevera."],
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
console.log(`i18n mm3d-28 geladeira: ${added} chaves adicionadas`)
