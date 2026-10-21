// Meu Mundo 3D — mm3d-13 slice 5: a HUD na pele EVO (gaveta do menu, modais)
// e os atributos 0–1000 com rotina na tela de STATUS.
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-meu-mundo-hud-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  // gaveta do menu
  menu: ["Menu", "Menu", "Menú"],
  menuOpen: ["Abrir o menu (M)", "Open the menu (M)", "Abrir el menú (M)"],
  menuClose: ["Fechar o menu", "Close the menu", "Cerrar el menú"],
  menuStreet: ["O bairro", "The neighborhood", "El barrio"],
  menuHouse: ["A casa", "The house", "La casa"],
  menuStatusHint: ["Vida, mercado e rotina", "Life, market and routine", "Vida, mercado y rutina"],
  menuInviteHint: ["Chamar alguém para a sua casa", "Invite someone to your house", "Invitar a alguien a tu casa"],
  menuBody: ["Tipo físico", "Body type", "Tipo físico"],
  menuBodyHint: ["Teste · {body}", "Test · {body}", "Prueba · {body}"],
  menuRecenter: ["Câmera", "Camera", "Cámara"],
  menuControls: ["Controles", "Controls", "Controles"],
  menuTech: ["Técnico", "Technical", "Técnico"],
  menuExitGame: ["Sair do jogo", "Leave the game", "Salir del juego"],
  helpTouch3: [
    "Joystick: andar · Correr: corrida lenta · Arraste a tela: girar a câmera · Botão: interagir · Puxe a aba da direita: menu",
    "Joystick: walk · Run: slow jog · Drag the screen: turn the camera · Button: interact · Pull the right tab: menu",
    "Joystick: caminar · Correr: trote lento · Arrastra la pantalla: girar la cámara · Botón: interactuar · Tira de la pestaña derecha: menú",
  ],
  helpDesktop3: [
    "WASD ou setas: andar · Shift: corrida lenta · Arraste: girar a câmera · Roda: zoom · E: interagir · M: menu",
    "WASD or arrows: walk · Shift: slow jog · Drag: turn the camera · Wheel: zoom · E: interact · M: menu",
    "WASD o flechas: caminar · Shift: trote lento · Arrastra: girar la cámara · Rueda: zoom · E: interactuar · M: menú",
  ],
  // atributos 0–1000 e rotina (STATUS)
  stAttrScale2: ["De 0 a {max} · traço = piso", "From 0 to {max} · mark = floor", "De 0 a {max} · marca = piso"],
  atIntelligenceText2: [
    "Sobe estudando (rende até 5 h por dia). O que ele aprende fica: nunca cai abaixo de 90% do maior valor.",
    "Rises by studying (up to 5 useful hours a day). What he learns stays: never below 90% of his best.",
    "Sube estudiando (rinde hasta 5 h al día). Lo que aprende se queda: nunca baja del 90% de su máximo.",
  ],
  atStrengthText2: [
    "Sobe treinando (rende até 4 h por dia); whey, creatina, pré-treino e anabolizante aceleram. Sem treino cai até 60% do maior valor.",
    "Rises by training (up to 4 useful hours a day); whey, creatine, pre-workout and steroids speed it up. Without training it drops to 60% of his best.",
    "Sube entrenando (rinde hasta 4 h al día); whey, creatina, pre-entreno y anabolizante aceleran. Sin entrenar baja hasta el 60% de su máximo.",
  ],
  atSpeedText2: [
    "Sobe treinando. Sem treino cai até 60% do maior valor; voltar ao topo é mais rápido.",
    "Rises by training. Without training it drops to 60% of his best; getting back to the top is faster.",
    "Sube entrenando. Sin entrenar baja hasta el 60% de su máximo; volver a la cima es más rápido.",
  ],
  atUsefulToday: ["{act} hoje: {done}/{cap} h úteis", "{act} today: {done}/{cap} useful h", "{act} hoy: {done}/{cap} h útiles"],
  stRoutinePause: ["Pausa da rotina: em {h} volta a {act}.", "Routine break: back to {act} in {h}.", "Pausa de la rutina: en {h} vuelve a {act}."],
  stRoutineText2: [
    "É uma rotina: ele rende as primeiras horas do dia (estudo 5 h, treino 4 h), descansa, dorme às 23 h e volta às 7 h. Na hora da refeição compra comida com as moedas. Constância de dias rende mais que maratona.",
    "It is a routine: the first hours of the day pay off (study 5 h, training 4 h), then he rests, sleeps at 11 pm and is back at 7 am. At meal time he buys food with his coins. Steady days beat marathons.",
    "Es una rutina: rinden las primeras horas del día (estudio 5 h, entreno 4 h), descansa, duerme a las 23 h y vuelve a las 7 h. A la hora de comer compra comida con las monedas. La constancia rinde más que el maratón.",
  ],
  evRoutineMeal: ["Rotina: comprou e comeu {item} ({n} moedas).", "Routine: bought and ate {item} ({n} coins).", "Rutina: compró y comió {item} ({n} monedas)."],
  evPauseEnergy: [
    "Rotina: sem energia, foi dormir {h} e depois volta a {act}.",
    "Routine: out of energy, slept {h} and will go back to {act}.",
    "Rutina: sin energía, durmió {h} y luego vuelve a {act}.",
  ],
  evPauseStress: [
    "Rotina: estressado, deitou {h} e depois volta a {act}.",
    "Routine: stressed, lay down for {h} and will go back to {act}.",
    "Rutina: estresado, se acostó {h} y luego vuelve a {act}.",
  ],
  evPauseNight: [
    "Rotina: hora de dormir ({h}); amanhã volta a {act}.",
    "Routine: bedtime ({h}); back to {act} tomorrow.",
    "Rutina: hora de dormir ({h}); mañana vuelve a {act}.",
  ],
  evPauseCap: [
    "Rotina: já rendeu o máximo de {act} hoje; descansa {h}.",
    "Routine: {act} already paid off all it could today; resting {h}.",
    "Rutina: ya rindió lo máximo de {act} hoy; descansa {h}.",
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
console.log(`i18n mm3d-13 HUD: ${added} chaves adicionadas`)
