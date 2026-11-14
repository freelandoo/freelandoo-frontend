// Meu Mundo 3D — personalidades só de voz (2026-11-15): os nomes e as descrições das
// treze (as cinco de antes + preguiçoso, vaidoso, rabugento, palhaço, carente,
// pão-duro, fofoqueiro e narcisista). As descrições das cinco antigas falavam de
// regra (luta, monstro, fome) que saiu: valor trocado = OVERRIDE. Namespace "MeuMundo".
// Idempotente. Rodar: node scripts/i18n-mm-personalidades-merge.js
const fs = require("fs")
const path = require("path")

const DIR = path.join(__dirname, "..", "messages")
const KEYS = {
  soulLazy: ["Preguiçoso", "Lazy", "Perezoso"],
  soulVain: ["Vaidoso", "Vain", "Vanidoso"],
  soulGrumpy: ["Rabugento", "Grumpy", "Gruñón"],
  soulClown: ["Palhaço", "Clown", "Payaso"],
  soulNeedy: ["Carente", "Needy", "Necesitado"],
  soulCheap: ["Pão-duro", "Cheapskate", "Tacaño"],
  soulGossip: ["Fofoqueiro", "Gossip", "Chismoso"],
  soulNarcissist: ["Narcisista", "Narcissist", "Narcisista"],
  soulPsychoLine: [
    "Xinga, ameaça e acha graça quando dá errado para os outros. Humor ácido, sem filtro.",
    "Swears, threatens and laughs when things go wrong for others. Acid humor, no filter.",
    "Insulta, amenaza y se ríe cuando a otros les sale mal. Humor ácido, sin filtro.",
  ],
  soulCowardLine: ["Tem medo de tudo e narra o próprio pânico em tempo real.", "Afraid of everything and narrates his own panic live.", "Le teme a todo y narra su propio pánico en directo."],
  soulGluttonLine: ["Tudo no mundo vira comida na cabeça dele.", "Everything in the world turns into food in his head.", "Todo en el mundo se convierte en comida en su cabeza."],
  soulKindLine: ["Formal e gentil até com monstro. A ironia é a educação dele.", "Formal and kind even to monsters. His irony is his manners.", "Formal y amable hasta con los monstruos. Su ironía es su educación."],
  soulCompetitiveLine: ["Transforma tudo em placar, recorde e revanche.", "Turns everything into a score, a record and a rematch.", "Convierte todo en marcador, récord y revancha."],
  soulLazyLine: ["Reclama de tudo que dá trabalho e só pensa em sentar.", "Complains about anything that takes effort and only wants to sit.", "Se queja de todo lo que da trabajo y solo piensa en sentarse."],
  soulVainLine: ["Só pensa no cabelo, na roupa e no próprio reflexo.", "Only thinks about hair, clothes and his own reflection.", "Solo piensa en el pelo, la ropa y su propio reflejo."],
  soulGrumpyLine: ["Reclama de tudo e de todos. No tempo dele era melhor.", "Complains about everything and everyone. It was better in his day.", "Se queja de todo y de todos. En sus tiempos era mejor."],
  soulClownLine: ["Faz piada de tudo, principalmente da própria desgraça.", "Jokes about everything, especially his own misfortune.", "Bromea con todo, sobre todo con su propia desgracia."],
  soulNeedyLine: ["Quer a atenção e o carinho do treinador o tempo todo.", "Wants the trainer's attention and affection all the time.", "Quiere la atención y el cariño del entrenador todo el tiempo."],
  soulCheapLine: ["Sofre com cada moeda gasta e acha tudo caro.", "Suffers over every coin spent and finds everything expensive.", "Sufre con cada moneda gastada y todo le parece caro."],
  soulGossipLine: ["Sabe da vida de todo mundo e conta tudo.", "Knows everyone's business and tells it all.", "Sabe la vida de todo el mundo y lo cuenta todo."],
  soulNarcissistLine: [
    "Só fala de si mesmo e passa cantada em todo adulto que vê.",
    "Only talks about himself and flirts with every adult he sees.",
    "Solo habla de sí mismo y le tira los tejos a todo adulto que ve.",
  ],
}

// frases da casa das personalidades novas ({ chave: [pt, en, es] }); o pt também está em chatter.ts
const CHATTER = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "features", "meu-mundo", "ui", "inbox", "chatter-extra.json"), "utf8"))
Object.assign(KEYS, CHATTER)

let changed = 0
for (const [i, loc] of ["pt-BR", "en", "es"].entries()) {
  const file = path.join(DIR, `${loc}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  json.MeuMundo = json.MeuMundo || {}
  for (const [k, vals] of Object.entries(KEYS)) {
    if (json.MeuMundo[k] !== vals[i]) {
      json.MeuMundo[k] = vals[i]
      changed++
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
}
console.log(`i18n meu-mundo personalidades: ${changed} chaves gravadas`)
