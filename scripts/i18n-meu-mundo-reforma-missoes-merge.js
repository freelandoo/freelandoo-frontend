// Meu Mundo 3D — mm3d-59 REFORMA, parte 2: missões (o prólogo "O Despertar de Lúmen"),
// celebração de ganhos e o SUBIU DE NÍVEL. Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-meu-mundo-reforma-missoes-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  // STATUS (destreza e orçamento do dia)
  atDexterityText: [
    "Sobe nos minijogos e nas lutas. Economiza fôlego, recupera a arma mais rápido e melhora a chance de golpe forte.",
    "Grows in minigames and fights. Saves stamina, recovers your weapon faster and improves the odds of strong hits.",
    "Sube en los minijuegos y las peleas. Ahorra aliento, recupera el arma más rápido y mejora la chance de golpe fuerte.",
  ],
  atDexterityShort: ["Sobe nos minijogos e lutas; poupa fôlego e melhora golpes.", "Grows in minigames and fights; saves stamina, improves hits.", "Sube en minijuegos y peleas; ahorra aliento y mejora golpes."],
  atBudgetToday: ["{attr}: {used}/{cap} de prática hoje", "{attr}: {used}/{cap} practice today", "{attr}: {used}/{cap} de práctica hoy"],
  // recompensas e nível
  rewardXpShort: ["XP", "XP", "XP"],
  rewardMore: ["mais", "more", "más"],
  levelUpTitle: ["SUBIU DE NÍVEL!", "LEVEL UP!", "¡SUBISTE DE NIVEL!"],
  levelUpAria: ["Subiu para o nível {n}", "Reached level {n}", "Subiste al nivel {n}"],
  levelUpSub: ["Nível de aventura", "Adventure level", "Nivel de aventura"],
  levelUpMany: ["Nível {from} → {to}", "Level {from} → {to}", "Nivel {from} → {to}"],
  levelUpUnlocked: ["Liberado: {u}", "Unlocked: {u}", "Desbloqueado: {u}"],
  levelUpContinue: ["Continuar", "Continue", "Continuar"],
  unlock_armeiro: ["Armeiro", "Armorer", "Armero"],
  unlock_forja: ["Forja", "Forge", "Forja"],
  unlock_acessorio_2: ["2º acessório", "2nd accessory", "2.º accesorio"],
  unlock_receitas_raras: ["Receitas raras", "Rare recipes", "Recetas raras"],
  // missões
  questPrologue: ["O Despertar de Lúmen", "The Awakening of Lúmen", "El Despertar de Lúmen"],
  questMain: ["Missão principal", "Main quest", "Misión principal"],
  questSteps: ["Passos", "Steps", "Pasos"],
  questStepN: ["Passo {i} de {n}", "Step {i} of {n}", "Paso {i} de {n}"],
  questDone: ["Feito", "Done", "Hecho"],
  questNow: ["Agora", "Now", "Ahora"],
  questLocked: ["Depois", "Later", "Después"],
  questHidden: ["???", "???", "???"],
  questReady: ["Pronto para entregar", "Ready to hand in", "Listo para entregar"],
  questPending: ["Ainda falta cumprir o objetivo.", "The objective is not done yet.", "Todavía falta cumplir el objetivo."],
  questOpen: ["Abrir a missão", "Open the quest", "Abrir la misión"],
  questFight: ["Lutar no treino", "Training fight", "Pelea de entrenamiento"],
  questOpenArmory: ["Abrir o Armeiro", "Open the Armorer", "Abrir el Armero"],
  questOpenBag: ["Abrir a mochila", "Open the bag", "Abrir la mochila"],
  questUnderstood: ["Entendi", "Got it", "Entendido"],
  questDeliver: ["Entregar", "Hand in", "Entregar"],
  quest_chegada_what: ["Conheça seu bairro e sua casa", "Explore your neighborhood and home", "Conoce tu barrio y tu casa"],
  quest_chegada_where: ["No seu bairro", "In your neighborhood", "En tu barrio"],
  quest_chegada_why: [
    "Aurion te chamou para Lúmen: as máquinas da cidade andam estranhas e alguém precisa ver de perto.",
    "Aurion called you to Lúmen: the city's machines are acting strange and someone has to take a close look.",
    "Aurion te llamó a Lúmen: las máquinas de la ciudad andan raras y alguien tiene que verlo de cerca.",
  ],
  quest_recuperar_what: ["Coma alguma coisa", "Eat something", "Come algo"],
  quest_recuperar_where: ["Geladeira de casa ou um restaurante do centro", "Your fridge at home or a downtown restaurant", "La heladera de casa o un restaurante del centro"],
  quest_recuperar_why: [
    "Energia, fome e estresse decidem o quanto você rende. Cuidar do corpo vem antes da luta.",
    "Energy, hunger and stress decide how well you perform. Taking care of your body comes before fighting.",
    "La energía, el hambre y el estrés deciden cuánto rindes. Cuidar el cuerpo va antes de la pelea.",
  ],
  quest_treinar_what: ["Comece um treino ou um estudo", "Start training or studying", "Empieza a entrenar o a estudiar"],
  quest_treinar_where: ["Academia, universidade, escola ou biblioteca do centro", "The downtown gym, university, school or library", "Gimnasio, universidad, escuela o biblioteca del centro"],
  quest_treinar_why: [
    "Força e inteligência crescem praticando — com um teto por dia, então volte amanhã.",
    "Strength and intelligence grow with practice, with a daily cap, so come back tomorrow.",
    "La fuerza y la inteligencia crecen practicando, con un tope diario: vuelve mañana.",
  ],
  quest_arma_what: ["Receba a arma da sua classe", "Receive your class weapon", "Recibe el arma de tu clase"],
  quest_arma_where: ["Mochila", "Bag", "Mochila"],
  quest_arma_why: [
    "Aurion entrega a espada aos vampiros e o cajado às raposas. A skin muda a aparência; a classe decide como você luta.",
    "Aurion gives the sword to vampires and the staff to foxes. Your skin changes how you look; your class decides how you fight.",
    "Aurion entrega la espada a los vampiros y el bastón a los zorros. La skin cambia tu aspecto; la clase decide cómo peleas.",
  ],
  quest_aprender_what: ["Faça a luta de treino", "Do the training fight", "Haz la pelea de entrenamiento"],
  quest_aprender_where: ["Treino da Arena (sem custo)", "Arena training (free)", "Entrenamiento de la Arena (sin costo)"],
  quest_aprender_why: [
    "Ataque no tempo, leia o aviso vermelho no chão e esquive. Aqui errar não custa nada.",
    "Attack on time, read the red warning on the ground and dodge. Mistakes cost nothing here.",
    "Ataca a tiempo, lee el aviso rojo en el suelo y esquiva. Aquí equivocarse no cuesta nada.",
  ],
  quest_vitoria_what: ["Vença uma luta", "Win a fight", "Gana una pelea"],
  quest_vitoria_where: ["Treino da Arena, Lâminas ou um monstro da noite", "Arena training, the Blades or a night monster", "Entrenamiento de la Arena, las Hojas o un monstruo nocturno"],
  quest_vitoria_why: [
    "As criaturas que aparecem à noite vieram das máquinas que Morkhan tocou. Mostre que Lúmen resiste.",
    "The creatures that appear at night came from the machines Morkhan touched. Show that Lúmen stands firm.",
    "Las criaturas que aparecen de noche salieron de las máquinas que tocó Morkhan. Demuestra que Lúmen resiste.",
  ],
  quest_espolio_what: ["Veja o que você ganhou", "Check what you earned", "Mira lo que ganaste"],
  quest_espolio_where: ["Mochila", "Bag", "Mochila"],
  quest_espolio_why: [
    "Toda luta deixa material. É com ele que a Forja melhora seu equipamento.",
    "Every fight leaves material behind. The Forge uses it to improve your equipment.",
    "Cada pelea deja material. Con él la Forja mejora tu equipamiento.",
  ],
  quest_armeiro_what: ["Visite o Armeiro e equipe sua arma", "Visit the Armorer and equip your weapon", "Visita al Armero y equipa tu arma"],
  quest_armeiro_where: ["Equipamento → Armeiro", "Equipment → Armorer", "Equipamiento → Armero"],
  quest_armeiro_why: [
    "O Armeiro vende equipamento; a Forja transforma material em peças melhores.",
    "The Armorer sells equipment; the Forge turns material into better gear.",
    "El Armero vende equipamiento; la Forja convierte el material en piezas mejores.",
  ],
  quest_jogos_what: ["Conheça os minijogos do centro", "Discover the downtown minigames", "Conoce los minijuegos del centro"],
  quest_jogos_where: [
    "Paint, Gincana, Corrida, Rolê Noturno, Jetpack, Lâminas e Boxe",
    "Paint, Gincana, Race, Night Ride, Jetpack, Blades and Boxing",
    "Paint, Gincana, Carrera, Paseo Nocturno, Jetpack, Hojas y Boxeo",
  ],
  quest_jogos_why: [
    "Cada jogo treina um atributo (destreza, força, velocidade, inteligência) e deixa um tipo de material.",
    "Each game trains an attribute (dexterity, strength, speed, intelligence) and leaves a kind of material.",
    "Cada juego entrena un atributo (destreza, fuerza, velocidad, inteligencia) y deja un tipo de material.",
  ],
  quest_pista_what: ["Leve o cristal à estátua de Morkhan", "Take the crystal to Morkhan's statue", "Lleva el cristal a la estatua de Morkhan"],
  quest_pista_where: ["Praça do centro", "Downtown square", "Plaza del centro"],
  quest_pista_why: [
    "O cristal rachado pulsa perto das máquinas. Morkhan, o Sem-Nome, está acordando — e Aurion quer você na próxima missão.",
    "The cracked crystal pulses near the machines. Morkhan, the Nameless, is waking up, and Aurion wants you on the next mission.",
    "El cristal agrietado late cerca de las máquinas. Morkhan, el Sin Nombre, está despertando, y Aurion te quiere en la próxima misión.",
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
console.log(`i18n meu-mundo reforma (missões): ${added} chaves adicionadas`)
