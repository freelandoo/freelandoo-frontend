// Meu Mundo 3D — mm3d-47: Gincana (corrida de obstáculos sobre o mar, sozinho ou em grupo).
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-meu-mundo-gincana-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  centerPlace_gincana: ["Gincana", "Party Dash", "Gincana"],
  gincanaAria: ["Gincana", "Party Dash", "Gincana"],
  gincanaKicker: ["Corrida de obstáculos sobre o mar", "Obstacle race over the sea", "Carrera de obstáculos sobre el mar"],
  gincanaPitch: [
    "Oito na largada, cinco trechos malucos e uma linha de chegada. Caiu na água? Volta ao último posto e segue.",
    "Eight at the start, five wild stretches and one finish line. Fell in the water? Back to the last checkpoint and keep going.",
    "Ocho en la salida, cinco tramos locos y una línea de meta. ¿Caíste al agua? Vuelves al último puesto y sigues.",
  ],
  gincanaLeave: ["Voltar ao centro", "Back to downtown", "Volver al centro"],
  gincanaSec0: ["Largada", "Start", "Salida"],
  gincanaSec1: ["Carrossel", "Carousel", "Carrusel"],
  gincanaSec2: ["Passarelas", "Catwalks", "Pasarelas"],
  gincanaSec3: ["Luvas", "Gloves", "Guantes"],
  gincanaSec4: ["Xadrez", "Checkers", "Ajedrez"],
  gincanaSec5: ["Subida", "Climb", "Subida"],
  gincanaSec6: ["Chegada", "Finish", "Meta"],
  gincanaHow1: ["A barra gira rente ao chão: pule na hora certa.", "The bar spins close to the floor: jump at the right time.", "La barra gira a ras del suelo: salta en el momento justo."],
  gincanaHow2: [
    "Vigas estreitas e bolas de pêndulo: espere a bola passar.",
    "Narrow beams and swinging balls: wait for the ball to pass.",
    "Vigas estrechas y bolas de péndulo: espera a que pase la bola.",
  ],
  gincanaHow3: ["Luvas socam dos lados: passe quando elas voltarem.", "Gloves punch from the sides: go when they pull back.", "Los guantes golpean de los lados: pasa cuando vuelvan."],
  gincanaHow4: ["O piso treme e cai logo depois que alguém pisa.", "The floor shakes and drops right after someone steps on it.", "El piso tiembla y cae justo después de que alguien lo pisa."],
  gincanaHow5: ["Bolas gigantes descem a rampa: desvie até o topo.", "Giant balls roll down the ramp: dodge your way to the top.", "Bolas gigantes bajan la rampa: esquívalas hasta la cima."],
  gincanaRecord: ["Seu recorde: {t}", "Your record: {t}", "Tu récord: {t}"],
  gincanaNoRecord: ["Ainda sem recorde neste aparelho.", "No record on this device yet.", "Aún sin récord en este dispositivo."],
  gincanaJoinFail: [
    "A gincana em grupo não abriu agora. Tente de novo ou jogue sozinho.",
    "The group race didn't open right now. Try again or play solo.",
    "La gincana en grupo no abrió ahora. Inténtalo de nuevo o juega solo.",
  ],
  gincanaModeSolo: ["Sozinho", "Solo", "Solo"],
  gincanaModeSoloSub: ["Contra 7 do computador", "Against 7 computer players", "Contra 7 de la computadora"],
  gincanaModeMulti: ["Multiplayer", "Multiplayer", "Multijugador"],
  gincanaModeMultiSub: ["Espera até 1 minuto · até 8", "Waits up to 1 minute · up to 8", "Espera hasta 1 minuto · hasta 8"],
  gincanaKeys: [
    "WASD ou setas andam · Espaço pula · Shift ou E mergulha · arraste para girar a câmera",
    "WASD or arrows move · Space jumps · Shift or E dives · drag to turn the camera",
    "WASD o flechas para moverte · Espacio salta · Shift o E se lanza · arrastra para girar la cámara",
  ],
  gincanaTouchHelp: [
    "Joystick anda · PULAR e MERGULHAR na direita · arraste a tela para girar a câmera",
    "Joystick moves · JUMP and DIVE on the right · drag the screen to turn the camera",
    "Joystick para moverte · SALTAR y LANZARSE a la derecha · arrastra la pantalla para girar la cámara",
  ],
  gincanaLobbyTitle: ["Esperando a galera…", "Waiting for the crew…", "Esperando a la banda…"],
  gincanaLobbyHow: [
    "Quem entrar até o fim do tempo corre junto. As vagas que sobrarem ficam com o computador.",
    "Everyone who joins before time runs out races together. Empty spots go to the computer.",
    "Quien entre antes de que acabe el tiempo corre junto. Los lugares libres son para la computadora.",
  ],
  gincanaLobbyFree: ["vaga livre", "open spot", "lugar libre"],
  gincanaLobbyCount: ["{n} de 8 na gincana", "{n} of 8 in the race", "{n} de 8 en la gincana"],
  gincanaLobbyCancel: ["Sair da espera", "Leave the wait", "Salir de la espera"],
  gincanaGo: ["VAI!", "GO!", "¡YA!"],
  gincanaHitBar: ["Barrada!", "Swept!", "¡Barrazo!"],
  gincanaHitSwing: ["Bolada do pêndulo!", "Smacked by the pendulum!", "¡Pelotazo del péndulo!"],
  gincanaHitGlove: ["Luvada!", "Punched!", "¡Guantazo!"],
  gincanaHitBall: ["Atropelado pela bola!", "Run over by the ball!", "¡Atropellado por la bola!"],
  gincanaSplash: ["Tchibum! Voltando ao último posto", "Splash! Back to the last checkpoint", "¡Chapuzón! Volviendo al último puesto"],
  gincanaCheckpoint: ["Posto {n} garantido", "Checkpoint {n} saved", "Puesto {n} asegurado"],
  gincanaFinishToast: ["Chegou em {n}º!", "Finished #{n}!", "¡Llegaste {n}º!"],
  gincanaTimeout: ["Tempo esgotado!", "Time's up!", "¡Se acabó el tiempo!"],
  gincanaOrd: ["{n}º", "#{n}", "{n}º"],
  gincanaOffline: ["Sem conexão com o grupo", "Lost connection to the group", "Sin conexión con el grupo"],
  gincanaTimeLeft: ["Faltam {s} s", "{s} s left", "Faltan {s} s"],
  gincanaBackMenu: ["Voltar ao menu", "Back to menu", "Volver al menú"],
  gincanaSoundOn: ["Ligar som", "Sound on", "Activar sonido"],
  gincanaSoundOff: ["Desligar som", "Sound off", "Silenciar"],
  gincanaHintTouch: ["Joystick anda · PULAR e MERGULHAR à direita", "Joystick moves · JUMP and DIVE on the right", "Joystick para moverte · SALTAR y LANZARSE a la derecha"],
  gincanaHintKeys: ["WASD anda · Espaço pula · Shift mergulha", "WASD moves · Space jumps · Shift dives", "WASD para moverte · Espacio salta · Shift se lanza"],
  gincanaDive: ["Mergulhar", "Dive", "Lanzarse"],
  gincanaJump: ["Pular", "Jump", "Saltar"],
  gincanaLoading: ["Enchendo os infláveis…", "Inflating the course…", "Inflando los inflables…"],
  gincanaErrorTitle: ["A gincana não abriu", "The race didn't open", "La gincana no abrió"],
  gincanaNoTime: ["O tempo acabou!", "Time's up!", "¡Se acabó el tiempo!"],
  gincanaWin: ["1º lugar! Você venceu!", "1st place! You won!", "¡1er lugar! ¡Ganaste!"],
  gincanaPlaceTitle: ["Você chegou em {n}º", "You finished #{n}", "Llegaste {n}º"],
  gincanaNewRecord: ["Novo recorde!", "New record!", "¡Nuevo récord!"],
  gincanaStandings: ["Classificação", "Standings", "Clasificación"],
  gincanaStillRunning: ["{n} ainda correndo", "{n} still running", "{n} siguen corriendo"],
  gincanaGone: ["saiu", "left", "salió"],
  gincanaCpu: ["computador", "computer", "computadora"],
  gincanaAgain: ["De novo", "Again", "Otra vez"],
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
console.log(`i18n mm3d-47 gincana: ${added} chaves adicionadas`)
