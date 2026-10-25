// Meu Mundo 3D — STATUS compacto no celular (sem rolagem): resumos das
// páginas e a regra nova das refeições (geladeira, 2 h antes / 2 h depois).
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-meu-mundo-status-compacto-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  // refeições
  stMealsRuleFridge: [
    "Coma de 2 h antes até 2 h depois de cada horário, pela geladeira da sua casa. Depois disso, ele vai perdendo saciedade, energia e saúde por 2 h.",
    "Eat from 2 h before to 2 h after each mealtime, from your home fridge. After that, he keeps losing satiety, energy and health for 2 h.",
    "Come desde 2 h antes hasta 2 h después de cada horario, de la nevera de tu casa. Después de eso, va perdiendo saciedad, energía y salud durante 2 h.",
  ],
  mealPartial: ["Parcial", "Partial", "Parcial"],
  mealLate: ["Atrasada", "Late", "Atrasada"],
  // visão geral
  stMood: ["Humor", "Mood", "Ánimo"],
  // atributos (resumos do celular)
  atIntelligenceShort: [
    "Sobe estudando (até 5 h/dia). Nunca cai abaixo de 90% do pico.",
    "Rises by studying (up to 5 h/day). Never drops below 90% of the peak.",
    "Sube estudiando (hasta 5 h/día). Nunca baja del 90% del pico.",
  ],
  atStrengthShort: [
    "Sobe treinando (até 4 h/dia); suplementos aceleram. Sem treino cai até 60% do pico.",
    "Rises by training (up to 4 h/day); supplements speed it up. Without training it drops to 60% of the peak.",
    "Sube entrenando (hasta 4 h/día); los suplementos aceleran. Sin entrenar baja hasta el 60% del pico.",
  ],
  atSpeedShort: [
    "Sobe treinando. Sem treino cai até 60% do pico; voltar é mais rápido.",
    "Rises by training. Without training it drops to 60% of the peak; getting back is faster.",
    "Sube entrenando. Sin entrenar baja hasta el 60% del pico; volver es más rápido.",
  ],
  stMoreEffects: ["+{n} efeitos", "+{n} effects", "+{n} efectos"],
  // rotina
  stNoHoursYet: ["Nada contado hoje ainda.", "Nothing counted today yet.", "Nada contado hoy todavía."],
  stForHours: ["Por", "For", "Por"],
  actDoStudy: ["Estudar", "Study", "Estudiar"],
  actDoTrain: ["Treinar", "Train", "Entrenar"],
  actDoWork: ["Trabalhar", "Work", "Trabajar"],
  stRoutineShort: [
    "É uma rotina: rende nas primeiras horas do dia (estudo 5 h, treino 4 h), descansa, dorme às 23 h e volta às 7 h. Constância rende mais que maratona.",
    "It's a routine: the first hours of the day pay off (study 5 h, training 4 h), then he rests, sleeps at 23:00 and is back at 7:00. Consistency beats marathons.",
    "Es una rutina: rinde en las primeras horas del día (estudio 5 h, entrenamiento 4 h), descansa, duerme a las 23 h y vuelve a las 7 h. La constancia rinde más que el maratón.",
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
console.log(`i18n STATUS compacto: ${added} chaves adicionadas`)
