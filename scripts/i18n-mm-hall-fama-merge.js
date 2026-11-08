// Hall da Fama na Arena das Lâminas (2026-11-08, pedido do Alex): pódio do 1º ao 3º, lista do
// 4º ao 10º, desafiar até o 1º; o prédio das Lâminas passa a se chamar Hall da Fama.
// Fill-if-absent no namespace MeuMundo; OVERRIDE muda o nome do prédio. Idempotente.
// node <script> [pasta]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")

// [chave, pt-BR, en, es]
const KEYS = [
  ["hfKicker", "Arena das Lâminas · Os Jogos Eternos de Lúmen", "Arena of Blades · The Eternal Games of Lúmen", "Arena de las Espadas · Los Juegos Eternos de Lúmen"],
  ["hfTitle", "Hall da Fama", "Hall of Fame", "Salón de la Fama"],
  ["hfTrain", "Treinar", "Train", "Entrenar"],
  ["hfPrev", "Lugar anterior", "Previous place", "Puesto anterior"],
  ["hfNext", "Próximo lugar", "Next place", "Puesto siguiente"],
  ["hfEmpty", "Vaga", "Open spot", "Puesto libre"],
  ["hfEmptyHint", "Ninguém aqui ainda", "Nobody here yet", "Nadie aquí todavía"],
  ["hfFromPower", "pelo Poder · vença e a cadeira é sua", "by Power · win and the seat is yours", "por Poder · gana y el puesto es tuyo"],
  ["hfTop", "Top 10", "Top 10", "Top 10"],
  ["hfMyPos", "Você está em {n}º", "You are #{n}", "Estás en el puesto {n}"],
  ["hfAnyone", "Desafie qualquer um, até o 1º. A ficha dele luta por ele; vencendo, você fica com o lugar.", "Challenge anyone, even #1. Their record fights for them; win and the place is yours.", "Desafía a cualquiera, incluso al 1.º. Su ficha pelea por él; si ganas, el puesto es tuyo."],
  ["hfOpenProfile", "Ver o perfil de {name}", "View {name}'s profile", "Ver el perfil de {name}"],
  ["hfBack", "Voltar ao Hall da Fama", "Back to the Hall of Fame", "Volver al Salón de la Fama"],
]
// o prédio das Lâminas virou o Hall da Fama (vence o valor antigo)
const OVERRIDE = [["centerPlace_laminas", "Hall da Fama", "Hall of Fame", "Salón de la Fama"]]
const COL = { "pt-BR": 1, en: 2, es: 3 }

for (const [loc, col] of Object.entries(COL)) {
  const file = path.join(DIR, `${loc}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  dict.MeuMundo = dict.MeuMundo || {}
  let n = 0
  for (const row of KEYS) if (dict.MeuMundo[row[0]] === undefined) (dict.MeuMundo[row[0]] = row[col]), n++
  for (const row of OVERRIDE) if (dict.MeuMundo[row[0]] !== row[col]) (dict.MeuMundo[row[0]] = row[col]), n++
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
  console.log(loc, "+", n)
}
