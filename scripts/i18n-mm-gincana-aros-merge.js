// Meu Mundo 3D — Gincana (2026-11-20): Descida dos Aros, a 4ª fase do Mar de Gelo (aros de cristal dão turbo).
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-mm-gincana-aros-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  gincanaPhAros: ["Descida dos Aros", "Hoop Descent", "Descenso de los Aros"],
  gincanaEvAros: ["Descida dos Aros", "Hoop Descent", "Descenso de los Aros"],
  gincanaPhArosPitch: [
    "A quarta corrida do Mar de Gelo: duas descidas de gelo liso cheias de aros de cristal. Pule por dentro de um aro e ganhe turbo. No fim, três paredões: só se passa pelas janelas.",
    "The fourth race of the Sea of Ice: two slick ice slopes full of crystal hoops. Jump through a hoop for a turbo boost. At the end, three walls: the only way through is the windows.",
    "La cuarta carrera del Mar de Hielo: dos bajadas de hielo liso llenas de aros de cristal. Salta por dentro de un aro y gana turbo. Al final, tres murallas: solo se pasa por las ventanas.",
  ],
  gincanaSecAr1: ["Primeira descida", "First slope", "Primera bajada"],
  gincanaSecAr2: ["Patamar", "Landing", "Rellano"],
  gincanaSecAr3: ["Segunda descida", "Second slope", "Segunda bajada"],
  gincanaSecAr4: ["Paredões", "Walls", "Murallas"],
  gincanaSecAr5: ["Reta final", "Home stretch", "Recta final"],
  gincanaHowAr1: [
    "Pule por DENTRO do aro de cristal: turbo na hora. O gelo escorrega e puxa para baixo: mire antes.",
    "Jump THROUGH the crystal hoop: instant turbo. The ice is slippery and pulls you down: line up early.",
    "Salta por DENTRO del aro de cristal: turbo al instante. El hielo resbala y tira hacia abajo: apunta antes.",
  ],
  gincanaHowAr2: [
    "No patamar um bloco de gelo desliza de lado: passe atrás dele.",
    "On the landing an ice block slides sideways: pass behind it.",
    "En el rellano un bloque de hielo se desliza de lado: pasa detrás de él.",
  ],
  gincanaHowAr3: [
    "O cogumelo de neve joga você até o aro alto; um aro vai e volta: espere ele chegar.",
    "The snow mushroom launches you to the high hoop; one hoop moves back and forth: wait for it.",
    "El hongo de nieve te lanza hasta el aro alto; un aro va y viene: espera a que llegue.",
  ],
  gincanaHowAr4: [
    "Os paredões só têm janelas, cada uma com um aro: pule por elas.",
    "The walls only have windows, each with a hoop: jump through them.",
    "Las murallas solo tienen ventanas, cada una con un aro: salta por ellas.",
  ],
  gincanaHowAr5: [
    "Depois do último paredão é só correr: o turbo do aro ajuda na reta.",
    "After the last wall just run: the hoop turbo helps on the straight.",
    "Después de la última muralla solo corre: el turbo del aro ayuda en la recta.",
  ],
  gincanaHoop: ["Pelo aro! Turbo!", "Through the hoop! Turbo!", "¡Por el aro! ¡Turbo!"],
}

const LOCALES = ["pt-BR", "en", "es"]
for (let li = 0; li < LOCALES.length; li++) {
  const file = path.join(dir, `${LOCALES[li]}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  json.MeuMundo = json.MeuMundo || {}
  let added = 0
  for (const [k, v] of Object.entries(MEU_MUNDO)) {
    if (json.MeuMundo[k] === undefined) {
      json.MeuMundo[k] = v[li]
      added++
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
  console.log(`${LOCALES[li]}: +${added}`)
}
