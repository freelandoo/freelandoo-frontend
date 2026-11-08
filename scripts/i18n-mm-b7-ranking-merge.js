// B7 (2026-11-08): aba Ranking (Poder, Nível, Freelandoo) e o atributo Acurácia.
// Idempotente (fill-if-absent). node <script> [pasta dos dicionários]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")
const TEXT = {
  "pt-BR": {
    rkTitle: "Ranking",
    rkEyebrow: "Brasil · top 100",
    menuRankingHint: "Poder, nível e Freelandoo",
    rkTabPoder: "Poder",
    rkTabNivel: "Nível",
    rkTabFreelandoo: "Freelandoo",
    rkUnitPoder: "de poder",
    rkUnitNivel: "nível",
    rkUnitPts: "pts",
    rkHintPoder: "Soma do que é permanente: atributos, HP máx do nível e equipamento. Entra o seu melhor personagem.",
    rkHintNivel: "Nível de aventura: sobe com as lutas, os minijogos e as missões.",
    rkHintFreelandoo: "Pontos do seu perfil na Freelandoo: posts, visitas, curtidas e avaliações.",
    rkLoadFail: "Não carregou o ranking.",
    rkEmpty: "Ninguém no ranking ainda.",
    rkMeNone: "Você ainda não está no ranking.",
    rkMeNoneSite: "Seu perfil ainda não entrou no ranking da Freelandoo.",
    rkYou: "Você",
    rkNoName: "Jogador",
    rkBreakdown: "Como o seu Poder se forma",
    rkPartHp: "HP máx",
    rkPartGear: "Equipamento",
    attrAccuracy: "Acurácia",
    atAccuracyText: "Atributo novo: começa em 0 e conta no Poder. O saco de pancada da academia vai treiná-la; depois de 1 dia sem praticar cai 5 pontos por dia, até 60% do maior valor.",
    atAccuracyShort: "Nova: começa em 0 e conta no Poder; o saco de pancada vai treiná-la.",
  },
  en: {
    rkTitle: "Ranking",
    rkEyebrow: "Brazil · top 100",
    menuRankingHint: "Power, level and Freelandoo",
    rkTabPoder: "Power",
    rkTabNivel: "Level",
    rkTabFreelandoo: "Freelandoo",
    rkUnitPoder: "power",
    rkUnitNivel: "level",
    rkUnitPts: "pts",
    rkHintPoder: "The sum of what is permanent: attributes, max HP from your level and equipment. Your best character counts.",
    rkHintNivel: "Adventure level: it goes up with fights, minigames and quests.",
    rkHintFreelandoo: "Your profile points on Freelandoo: posts, visits, likes and ratings.",
    rkLoadFail: "The ranking didn't load.",
    rkEmpty: "No one in the ranking yet.",
    rkMeNone: "You're not in the ranking yet.",
    rkMeNoneSite: "Your profile hasn't entered the Freelandoo ranking yet.",
    rkYou: "You",
    rkNoName: "Player",
    rkBreakdown: "How your Power adds up",
    rkPartHp: "Max HP",
    rkPartGear: "Equipment",
    attrAccuracy: "Precision",
    atAccuracyText: "New attribute: it starts at 0 and counts toward Power. The gym's punching bag will train it; after 1 day without practice it drops 5 points a day, down to 60% of the highest value.",
    atAccuracyShort: "New: starts at 0 and counts toward Power; the punching bag will train it.",
  },
  es: {
    rkTitle: "Ranking",
    rkEyebrow: "Brasil · top 100",
    menuRankingHint: "Poder, nivel y Freelandoo",
    rkTabPoder: "Poder",
    rkTabNivel: "Nivel",
    rkTabFreelandoo: "Freelandoo",
    rkUnitPoder: "de poder",
    rkUnitNivel: "nivel",
    rkUnitPts: "pts",
    rkHintPoder: "La suma de lo permanente: atributos, PV máx del nivel y equipo. Cuenta tu mejor personaje.",
    rkHintNivel: "Nivel de aventura: sube con las peleas, los minijuegos y las misiones.",
    rkHintFreelandoo: "Puntos de tu perfil en Freelandoo: publicaciones, visitas, me gusta y valoraciones.",
    rkLoadFail: "No se cargó el ranking.",
    rkEmpty: "Nadie en el ranking todavía.",
    rkMeNone: "Todavía no estás en el ranking.",
    rkMeNoneSite: "Tu perfil todavía no entró en el ranking de Freelandoo.",
    rkYou: "Tú",
    rkNoName: "Jugador",
    rkBreakdown: "Cómo se forma tu Poder",
    rkPartHp: "PV máx",
    rkPartGear: "Equipo",
    attrAccuracy: "Puntería",
    atAccuracyText: "Atributo nuevo: empieza en 0 y cuenta para el Poder. El saco de boxeo del gimnasio la va a entrenar; tras 1 día sin practicar baja 5 puntos por día, hasta el 60% del valor más alto.",
    atAccuracyShort: "Nueva: empieza en 0 y cuenta para el Poder; el saco de boxeo la va a entrenar.",
  },
}
// OVERRIDE: a dica da placa PODER (T3, i18n-mm-power-merge.js) trazia a fórmula antiga;
// a decisão do Alex é a do B7 (soma simples do permanente).
const OVERRIDE = {
  "pt-BR": { stPowerHint: "Força + velocidade + destreza + inteligência + acurácia + HP máx do nível + equipamento (1% de bônus = 10)" },
  en: { stPowerHint: "Strength + speed + dexterity + intelligence + accuracy + level max HP + equipment (1% bonus = 10)" },
  es: { stPowerHint: "Fuerza + velocidad + destreza + inteligencia + puntería + PV máx del nivel + equipo (1% de bono = 10)" },
}
for (const [loc, rows] of Object.entries(TEXT)) {
  const file = path.join(DIR, `${loc}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  const mm = (dict.MeuMundo = dict.MeuMundo || {})
  for (const [k, v] of Object.entries(rows)) if (typeof mm[k] !== "string") mm[k] = v
  for (const [k, v] of Object.entries(OVERRIDE[loc] || {})) mm[k] = v
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
}
console.log("ok")
