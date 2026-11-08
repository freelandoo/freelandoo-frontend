// B8 (2026-11-08): Hall das Lâminas — cadeiras, desafio, histórico, avisos do sino e os
// erros novos do servidor. Fill-if-absent (MeuMundo e MeuMundoServer). Idempotente.
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")

const KEYS = [
  ["hlTitle", "Hall das Lâminas", "Blades Hall", "Salón de las Láminas"],
  ["hlEyebrow", "Arena das Lâminas", "Blades Arena", "Arena de las Láminas"],
  ["menuHallHint", "Desafie pela cadeira", "Challenge for a seat", "Desafía por la silla"],
  ["hlIntro", "Desafie quem está numa cadeira do Hall ou no top do Poder. A ficha dele luta por ele, mesmo fora do jogo. Venceu quem está sentado: vocês trocam de cadeira.", "Challenge someone sitting in the Hall or in the Power top. Their sheet fights for them, even offline. Beat someone seated and you swap seats.", "Desafía a quien está en una silla del Salón o en el top del Poder. Su ficha pelea por él, incluso fuera del juego. Si vences a quien está sentado, cambian de silla."],
  ["hlMySeat", "Sua cadeira: {n}", "Your seat: {n}", "Tu silla: {n}"],
  ["hlNoSeat", "Você está fora do Hall", "You're outside the Hall", "Estás fuera del Salón"],
  ["hlLeft", "Desafios hoje: {n} de {max}", "Challenges today: {n} of {max}", "Desafíos hoy: {n} de {max}"],
  ["hlSeats", "As cadeiras", "The seats", "Las sillas"],
  ["hlEmptySeat", "Vaga: vença alguém do top do Poder para sentar", "Open: beat someone from the Power top to sit here", "Libre: vence a alguien del top del Poder para sentarte"],
  ["hlContenders", "Top do Poder fora do Hall", "Power top outside the Hall", "Top del Poder fuera del Salón"],
  ["hlHistory", "Histórico", "History", "Historial"],
  ["hlPower", "Poder {n}", "Power {n}", "Poder {n}"],
  ["hlDefenses", "{n} defesas", "{n} defenses", "{n} defensas"],
  ["hlDefense1", "1 defesa", "1 defense", "1 defensa"],
  ["hlChallenge", "Desafiar", "Challenge", "Desafiar"],
  ["hlCooldown", "Amanhã", "Tomorrow", "Mañana"],
  ["hlLoadFail", "Não carregou o Hall.", "The Hall didn't load.", "No cargó el Salón."],
  ["hlOpen", "Luta aberta contra {name}", "Open fight against {name}", "Pelea abierta contra {name}"],
  ["hlTook", "Você venceu {name} e ficou com a cadeira {n}", "You beat {name} and took seat {n}", "Venciste a {name} y te quedaste con la silla {n}"],
  ["hlWonKept", "Você venceu {name}", "You beat {name}", "Venciste a {name}"],
  ["hlLostTo", "Você perdeu para {name}", "You lost to {name}", "Perdiste contra {name}"],
  ["hlBeatenBy", "{name} venceu a sua ficha", "{name} beat your sheet", "{name} venció tu ficha"],
  ["hlDefended", "Sua ficha defendeu contra {name}", "Your sheet held off {name}", "Tu ficha resistió a {name}"],
  ["ntHallLost", "{name} tomou a sua cadeira {seat} no Hall.", "{name} took your seat {seat} in the Hall.", "{name} tomó tu silla {seat} en el Salón."],
  ["ntHallLostLine", "Desafie de volta no Hall das Lâminas.", "Challenge back in the Blades Hall.", "Desafía de vuelta en el Salón de las Láminas."],
  ["ntHallBeaten", "{name} venceu você num desafio do Hall.", "{name} beat you in a Hall challenge.", "{name} te venció en un desafío del Salón."],
  ["ntHallBeatenLine", "Desafie de volta no Hall das Lâminas.", "Challenge back in the Blades Hall.", "Desafía de vuelta en el Salón de las Láminas."],
  ["ntHallDefended", "Você defendeu sua vaga contra {name}!", "You defended your seat against {name}!", "¡Defendiste tu lugar contra {name}!"],
  ["ntHallDefendedLine", "Sua ficha lutou por você no Hall das Lâminas.", "Your sheet fought for you in the Blades Hall.", "Tu ficha peleó por ti en el Salón de las Láminas."],
]
const SERVER = [
  ["Escolha alguém do Hall ou do top do Poder", "Pick someone from the Hall or the Power top", "Elige a alguien del Salón o del top del Poder"],
  ["Você não pode desafiar a si mesmo", "You can't challenge yourself", "No puedes desafiarte a ti mismo"],
  ["Só dá para desafiar quem está no Hall ou no top 100 do Poder", "You can only challenge someone in the Hall or the Power top 100", "Solo puedes desafiar a quien está en el Salón o en el top 100 del Poder"],
  ["Você já fez os 3 desafios de hoje", "You've already made today's 3 challenges", "Ya hiciste los 3 desafíos de hoy"],
  ["Você já desafiou essa pessoa nas últimas 24 horas", "You already challenged this person in the last 24 hours", "Ya desafiaste a esta persona en las últimas 24 horas"],
  ["Seu personagem ainda não tem Poder", "Your character has no Power yet", "Tu personaje aún no tiene Poder"],
]
const LOCS = { "pt-BR": 1, en: 2, es: 3 }

for (const [loc, col] of Object.entries(LOCS)) {
  const file = path.join(DIR, `${loc}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  dict.MeuMundo = dict.MeuMundo || {}
  dict.MeuMundoServer = dict.MeuMundoServer || {}
  let n = 0
  for (const row of KEYS) if (dict.MeuMundo[row[0]] === undefined) (dict.MeuMundo[row[0]] = row[col]), n++
  for (const row of SERVER) if (dict.MeuMundoServer[row[0]] === undefined) (dict.MeuMundoServer[row[0]] = row[col - 1]), n++
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
  console.log(loc, "+", n)
}
