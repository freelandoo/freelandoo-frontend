// 2026-11-21: Paint no PC — a mira fica fixa no meio da tela e o mouse (travado no 1º clique) gira a câmera.
// OVERRIDE de MeuMundo.paintHelpPc (o texto antigo dizia "o mouse mira"). Idempotente. node <script> [pasta]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")

const OVERRIDE = {
  "pt-BR": { paintHelpPc: "Clique no jogo para travar o mouse · o mouse gira a câmera e a mira fica no meio · botão esquerdo atira · E troca a cor · Espaço pula · F soco · Esc solta o mouse" },
  en: { paintHelpPc: "Click the game to lock the mouse · the mouse turns the camera and the crosshair stays centered · left button shoots · E changes color · Space jumps · F punches · Esc releases the mouse" },
  es: { paintHelpPc: "Haz clic en el juego para fijar el ratón · el ratón gira la cámara y la mira queda en el centro · botón izquierdo dispara · E cambia el color · Espacio salta · F golpea · Esc suelta el ratón" },
}

for (const [loc, keys] of Object.entries(OVERRIDE)) {
  const file = path.join(DIR, `${loc}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  dict.MeuMundo = dict.MeuMundo || {}
  let n = 0
  for (const [k, v] of Object.entries(keys)) {
    if (dict.MeuMundo[k] !== v) {
      dict.MeuMundo[k] = v
      n++
    }
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
  console.log(loc, "paint mira fixa ~", n)
}
