// i18n da tela comum de escolha de fase dos minijogos (18/11, ui/kit/stage-select.tsx: layout da
// Antigravidade em Jetpack, Rolê Noturno, Paint e Gincana). Namespace MeuMundo.
// Idempotente e não-destrutivo (fill-if-absent). Rodar: node scripts/i18n-mm-minijogos-layout-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MM = {
  stageBack: ["Voltar", "Back", "Volver"],
  stageHelp: ["Como jogar", "How to play", "Cómo jugar"],
  stageClose: ["Fechar", "Close", "Cerrar"],
  stageSoon: ["Em breve", "Coming soon", "Próximamente"],
  jetGoals: ["Metas {a} / {b} / {c} m", "Goals {a} / {b} / {c} m", "Metas {a} / {b} / {c} m"],
  gincanaSelectTitle: ["Selecionar fase", "Select stage", "Seleccionar fase"],
  gincanaKeysShort: [
    "WASD ou setas andam · Espaço pula · Shift mergulha · F agarra",
    "WASD or arrows move · Space jumps · Shift dives · F grabs",
    "WASD o flechas para moverte · Espacio salta · Shift se lanza · F agarra",
  ],
  gincanaShow: ["Programa completo", "Full show", "Programa completo"],
  gincanaShowSub: [
    "4 rodadas sorteadas até a final da coroa · contra o computador",
    "4 random rounds up to the crown final · against the computer",
    "4 rondas sorteadas hasta la final de la corona · contra la computadora",
  ],
}

const LOCALES = ["pt-BR", "en", "es"]

for (let i = 0; i < LOCALES.length; i++) {
  const file = path.join(dir, `${LOCALES[i]}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  if (!json.MeuMundo) json.MeuMundo = {}
  let added = 0
  for (const [key, values] of Object.entries(MM)) {
    if (json.MeuMundo[key] === undefined) {
      json.MeuMundo[key] = values[i]
      added++
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n", "utf8")
  console.log(`${LOCALES[i]}: +${added} chaves`)
}
