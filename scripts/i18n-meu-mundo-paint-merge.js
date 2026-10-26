// Meu Mundo 3D — mm3d-35: Paint (ilhas, tinta, gatinhos, portal do chefão).
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-meu-mundo-paint-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  centerPlace_paint: ["Paint", "Paint", "Paint"],
  paintAria: ["Jogo Paint", "Paint game", "Juego Paint"],
  paintBackMenu: ["Voltar ao menu", "Back to menu", "Volver al menú"],
  paintClickToAim: [
    "Clique no jogo para mirar · WASD anda · Espaço pula · F soco · 1/2/3 cor · Esc solta o mouse",
    "Click the game to aim · WASD move · Space jump · F punch · 1/2/3 color · Esc frees the mouse",
    "Haz clic en el juego para apuntar · WASD mueve · Espacio salta · F golpe · 1/2/3 color · Esc suelta el ratón",
  ],
  paintColorBridge: ["Ponte", "Bridge", "Puente"],
  paintColorHarm: ["Dano", "Damage", "Daño"],
  paintColorStep: ["Degrau", "Step", "Escalón"],
  paintDamageShort: ["{n} de dano", "{n} damage", "{n} de daño"],
  paintDraw: ["Empate", "Draw", "Empate"],
  paintErrorTitle: ["O Paint não abriu", "Paint didn't open", "Paint no abrió"],
  paintGo: ["VAI!", "GO!", "¡YA!"],
  paintHowBridge: ["Segure mirando o vão: a ponte cresce.", "Hold aiming at the gap: the bridge grows.", "Mantén apuntando al vacío: el puente crece."],
  paintHowGoal: [
    "20 gatinhos do seu time abrem o portal no topo. Na ilha do chefão, vence quem der mais dano.",
    "20 kittens for your team open the portal at the top. On the boss island, whoever deals the most damage wins.",
    "20 gatitos de tu equipo abren el portal en la cima. En la isla del jefe gana quien haga más daño.",
  ],
  paintHowHarm: ["Tira coração do outro time e apaga a tinta dele.", "Takes hearts from the other team and erases their paint.", "Quita corazones al otro equipo y borra su pintura."],
  paintHowStep: ["Pule e atire no pé: degrau embaixo de você.", "Jump and shoot your feet: a step under you.", "Salta y dispara a tus pies: un escalón debajo de ti."],
  paintJoinFail: [
    "A sala não abriu agora. Tente de novo ou treine sozinho.",
    "The room didn't open right now. Try again or practice alone.",
    "La sala no abrió ahora. Intenta de nuevo o entrena solo.",
  ],
  paintJoining: ["Procurando sala…", "Finding a room…", "Buscando sala…"],
  paintJump: ["Pular", "Jump", "Saltar"],
  paintKo: ["Nocaute · {n}", "Knocked out · {n}", "Nocaut · {n}"],
  paintLeave: ["Voltar ao centro", "Back to downtown", "Volver al centro"],
  paintLoading: ["Preparando as ilhas…", "Preparing the islands…", "Preparando las islas…"],
  paintLose: ["Não foi desta vez", "Not this time", "Esta vez no"],
  paintMode1Sub: ["Um contra um", "One on one", "Uno contra uno"],
  paintMode2Sub: ["Duplas", "Pairs", "Dúos"],
  paintMode3Sub: ["Times de três", "Teams of three", "Equipos de tres"],
  paintModeSolo: ["Treinar", "Practice", "Entrenar"],
  paintModeSoloSub: ["Sozinho, no seu ritmo", "Alone, at your own pace", "Solo, a tu ritmo"],
  paintOtherTeam: ["Outro time", "Other team", "Otro equipo"],
  paintPitch: [
    "Suba pelas ilhas pintando o caminho, ache os gatinhos e abra o portal do chefão.",
    "Climb the islands by painting your path, find the kittens and open the boss portal.",
    "Sube por las islas pintando el camino, encuentra los gatitos y abre el portal del jefe.",
  ],
  paintPlayer: ["Jogador", "Player", "Jugador"],
  paintPortalOpen: ["Portal aberto no topo", "Portal open at the top", "Portal abierto en la cima"],
  paintPunch: ["Soco", "Punch", "Golpe"],
  paintResults: ["Resultado", "Result", "Resultado"],
  paintSoloBossDown: ["Chefão derrotado!", "Boss defeated!", "¡Jefe derrotado!"],
  paintSoloTime: ["Tempo esgotado", "Time's up", "Se acabó el tiempo"],
  paintSoon: ["Em breve", "Coming soon", "Pronto"],
  paintToastBoss: ["Ilha do chefão: dano com vermelho e soco!", "Boss island: damage with red and punches!", "Isla del jefe: ¡daño con rojo y golpes!"],
  paintToastCapsule: ["+{n} {cor}", "+{n} {cor}", "+{n} {cor}"],
  paintToastCat: ["Gatinho! {n}/{k}", "Kitten! {n}/{k}", "¡Gatito! {n}/{k}"],
  paintToastEmpty: ["Sem tinta de {cor} — pegue uma cápsula", "Out of {cor} paint — grab a capsule", "Sin pintura de {cor} — toma una cápsula"],
  paintToastFell: ["Caiu nas nuvens — de volta à base", "Fell into the clouds — back to base", "Caíste en las nubes — de vuelta a la base"],
  paintToastKo: ["Nocaute! Voltando à base…", "Knocked out! Back to base…", "¡Nocaut! Volviendo a la base…"],
  paintToastPortalMine: ["Portal aberto! Suba ao topo da sua torre", "Portal open! Climb to the top of your tower", "¡Portal abierto! Sube a la cima de tu torre"],
  paintToastPortalOther: ["O outro time abriu o portal!", "The other team opened their portal!", "¡El otro equipo abrió el portal!"],
  paintWin: ["Vitória!", "Victory!", "¡Victoria!"],
  paintYou: ["Você", "You", "Tú"],
  paintYourDamage: ["Seu dano: {n}", "Your damage: {n}", "Tu daño: {n}"],
  paintYourTeam: ["Seu time", "Your team", "Tu equipo"],
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
console.log(`i18n mm3d-35 paint: ${added} chaves adicionadas`)
