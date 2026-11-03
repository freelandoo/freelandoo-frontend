// Meu Mundo 3D — barras de status da Visão Geral (2026-11-03): defesa, ataque,
// força, inteligência, destreza e velocidade de 0 a 1000. Namespace "MeuMundo".
// Idempotente (FILL preenche o que falta).
// Rodar: node scripts/i18n-meu-mundo-status-bars-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const FILL = {
  // 2026-11-03: atributos caem por dia depois de 1 dia sem praticar
  atIntelligenceText3: [
    "Sobe estudando (rende até 5 h por dia). Depois de 1 dia sem estudar cai 1 ponto por dia, nunca abaixo de 90% do maior valor.",
    "Grows by studying (up to 5 useful hours a day). After 1 day without studying it drops 1 point a day, never below 90% of the peak.",
    "Sube estudiando (rinde hasta 5 h al día). Tras 1 día sin estudiar baja 1 punto por día, nunca por debajo del 90% del máximo.",
  ],
  atStrengthText3: [
    "Sobe treinando (rende até 4 h por dia); whey, creatina, pré-treino e anabolizante aceleram. Depois de 1 dia sem treino cai 5 pontos por dia, até 60% do maior valor.",
    "Grows by training (up to 4 useful hours a day); whey, creatine, pre-workout and steroids speed it up. After 1 day without training it drops 5 points a day, down to 60% of the peak.",
    "Sube entrenando (rinde hasta 4 h al día); whey, creatina, pre-entreno y anabolizante aceleran. Tras 1 día sin entrenar baja 5 puntos por día, hasta el 60% del máximo.",
  ],
  atSpeedText3: [
    "Sobe treinando. Depois de 1 dia sem treino cai 5 pontos por dia, até 60% do maior valor; voltar ao topo é mais rápido.",
    "Grows by training. After 1 day without training it drops 5 points a day, down to 60% of the peak; getting back is faster.",
    "Sube entrenando. Tras 1 día sin entrenar baja 5 puntos por día, hasta el 60% del máximo; volver arriba es más rápido.",
  ],
  atDexterityText2: [
    "Sobe nos minijogos e nas lutas; depois de 1 dia sem jogar cai 5 pontos por dia, até 60% do maior valor. Economiza fôlego, recupera a arma mais rápido e melhora a chance de golpe forte.",
    "Grows in minigames and fights; after 1 day without playing it drops 5 points a day, down to 60% of the peak. Saves stamina, recovers the weapon faster and improves the chance of a strong hit.",
    "Sube en los minijuegos y las peleas; tras 1 día sin jugar baja 5 puntos por día, hasta el 60% del máximo. Ahorra aliento, recupera el arma más rápido y mejora la probabilidad de golpe fuerte.",
  ],
  sgStrHow2: [
    "Treinando na academia (rende até 4 h por dia); whey, creatina, pré-treino e anabolizante aceleram. Depois de 1 dia sem treino cai 5 pontos por dia, até 60% do maior valor.",
    "Training at the gym (up to 4 useful hours a day); whey, creatine, pre-workout and steroids speed it up. After 1 day without training it drops 5 points a day, down to 60% of the peak.",
    "Entrenando en el gimnasio (rinde hasta 4 h al día); whey, creatina, pre-entreno y anabolizante aceleran. Tras 1 día sin entrenar baja 5 puntos por día, hasta el 60% del máximo.",
  ],
  sgIntHow2: [
    "Estudando na escola ou na universidade (rende até 5 h por dia). Depois de 1 dia sem estudar cai 1 ponto por dia, nunca abaixo de 90% do maior valor.",
    "Studying at the school or university (up to 5 useful hours a day). After 1 day without studying it drops 1 point a day, never below 90% of the peak.",
    "Estudiando en la escuela o la universidad (rinde hasta 5 h al día). Tras 1 día sin estudiar baja 1 punto por día, nunca por debajo del 90% del máximo.",
  ],
  sgDexHow2: [
    "Jogando os minijogos e lutando. Depois de 1 dia sem jogar cai 5 pontos por dia, até 60% do maior valor.",
    "Playing the minigames and fighting. After 1 day without playing it drops 5 points a day, down to 60% of the peak.",
    "Jugando los minijuegos y peleando. Tras 1 día sin jugar baja 5 puntos por día, hasta el 60% del máximo.",
  ],
  sgSpdHow2: [
    "Treinando na academia. Depois de 1 dia sem treino cai 5 pontos por dia, até 60% do maior valor; voltar ao topo é mais rápido.",
    "Training at the gym. After 1 day without training it drops 5 points a day, down to 60% of the peak; getting back is faster.",
    "Entrenando en el gimnasio. Tras 1 día sin entrenar baja 5 puntos por día, hasta el 60% del máximo; volver arriba es más rápido.",
  ],
  stCombatAttrs: ["Combate e atributos", "Combat and attributes", "Combate y atributos"],
  stStatScale: ["De 0 a {max}", "From 0 to {max}", "De 0 a {max}"],
  stLvShort: ["NV.", "LV.", "NV."],
  sgTitle: ["Como funcionam os status", "How stats work", "Cómo funcionan las estadísticas"],
  sgWhere: ["Onde vale:", "Where it counts:", "Dónde cuenta:"],
  sgHow: ["Como sobe:", "How it grows:", "Cómo sube:"],
  sgDefWhere: ["Reduz o dano que você leva nas lutas.", "Reduces the damage you take in fights.", "Reduce el daño que recibes en las peleas."],
  sgDefHow: [
    "Sobe {d}% a cada nível de aventura (até {lv}%) e com o equipamento do Armeiro e da Forja. O total nunca passa de {max}%.",
    "Grows {d}% every adventure level (up to {lv}%) and with gear from the Armory and the Forge. The total never exceeds {max}%.",
    "Sube {d}% con cada nivel de aventura (hasta {lv}%) y con el equipo del Armero y la Forja. El total nunca pasa de {max}%.",
  ],
  sgAtkWhere: ["Multiplica o dano de cada golpe seu nas lutas.", "Multiplies the damage of each of your hits in fights.", "Multiplica el daño de cada golpe tuyo en las peleas."],
  sgAtkHow: [
    "Sobe +{d}% a cada nível de aventura. A arma e o refino na Forja somam por cima.",
    "Grows +{d}% every adventure level. Your weapon and Forge refining add on top.",
    "Sube +{d}% con cada nivel de aventura. El arma y el refinado en la Forja suman encima.",
  ],
  sgStrWhere: ["Dano dos golpes (até +50% com 1000). Conta para virar adulto.", "Hit damage (up to +50% at 1000). Counts toward becoming an adult.", "Daño de los golpes (hasta +50% con 1000). Cuenta para volverse adulto."],
  sgStrHow: [
    "Treinando na academia (rende até 4 h por dia); whey, creatina, pré-treino e anabolizante aceleram. Sem treino cai até 60% do maior valor.",
    "Training at the gym (up to 4 useful hours a day); whey, creatine, pre-workout and steroids speed it up. Without training it drops to 60% of the peak.",
    "Entrenando en el gimnasio (rinde hasta 4 h al día); whey, creatina, pre-entreno y anabolizante aceleran. Sin entrenar baja hasta el 60% del máximo.",
  ],
  sgIntWhere: [
    "Mostra o aviso do golpe do inimigo mais cedo (até +35%) e é o que mais pesa na chance de golpe forte.",
    "Shows the enemy attack warning earlier (up to +35%) and weighs most in the chance of a strong hit.",
    "Muestra el aviso del golpe enemigo antes (hasta +35%) y es lo que más pesa en la probabilidad de golpe fuerte.",
  ],
  sgIntHow: [
    "Estudando na escola ou na universidade (rende até 5 h por dia). Nunca cai abaixo de 90% do maior valor.",
    "Studying at the school or university (up to 5 useful hours a day). Never drops below 90% of the peak.",
    "Estudiando en la escuela o la universidad (rinde hasta 5 h al día). Nunca baja del 90% del máximo.",
  ],
  sgDexWhere: [
    "Gasta menos fôlego no ataque e na esquiva (até −15%), recupera a arma mais rápido e ajuda no golpe forte.",
    "Uses less stamina when attacking and dodging (up to −15%), recovers the weapon faster and helps strong hits.",
    "Gasta menos aliento al atacar y esquivar (hasta −15%), recupera el arma más rápido y ayuda al golpe fuerte.",
  ],
  sgDexHow: ["Jogando os minijogos e lutando.", "Playing the minigames and fighting.", "Jugando los minijuegos y peleando."],
  sgSpdWhere: [
    "Ritmo dos golpes (até +30%) e passo na luta (até +20%); no Jetpack, a velocidade do voo.",
    "Attack rhythm (up to +30%) and footwork in fights (up to +20%); in the Jetpack, flight speed.",
    "Ritmo de los golpes (hasta +30%) y paso en la pelea (hasta +20%); en el Jetpack, la velocidad de vuelo.",
  ],
  sgSpdHow: [
    "Treinando na academia. Sem treino cai até 60% do maior valor; voltar ao topo é mais rápido.",
    "Training at the gym. Without training it drops to 60% of the peak; getting back is faster.",
    "Entrenando en el gimnasio. Sin entrenar baja hasta el 60% del máximo; volver arriba es más rápido.",
  ],
  sgFoot: [
    "Cada nível de aventura também soma +{n} em força, inteligência, destreza e velocidade (vale na luta). A prática de cada dia tem limite; vencer rende mais que perder, e com energia alta e estresse baixo rende mais.",
    "Each adventure level also adds +{n} to strength, intelligence, dexterity and speed (in fights). Daily practice has a limit; winning pays more than losing, and high energy with low stress pays more.",
    "Cada nivel de aventura también suma +{n} en fuerza, inteligencia, destreza y velocidad (vale en la pelea). La práctica de cada día tiene límite; ganar rinde más que perder, y con energía alta y estrés bajo rinde más.",
  ],
}

const LOCALES = ["pt-BR", "en", "es"]
let added = 0
for (const [i, locale] of LOCALES.entries()) {
  const file = path.join(dir, `${locale}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  json.MeuMundo = json.MeuMundo || {}
  for (const [key, vals] of Object.entries(FILL)) {
    if (json.MeuMundo[key] === undefined) {
      json.MeuMundo[key] = vals[i]
      added++
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
}
console.log(`i18n status bars: ${added} chaves adicionadas`)
