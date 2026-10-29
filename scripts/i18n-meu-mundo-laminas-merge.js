// Meu Mundo 3D — mm3d-48: Arena das Lâminas (espada contra a máquina), monstros
// na cidade com portal e o Salão do Hall da Fama.
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-meu-mundo-laminas-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  centerPlace_laminas: ["Arena das Lâminas", "Arena of Blades", "Arena de las Espadas"],
  centerPlace_hall: ["Salão do Hall da Fama", "Hall of Fame", "Salón de la Fama"],
  laminasAria: ["Arena das Lâminas", "Arena of Blades", "Arena de las Espadas"],
  laminasKicker: ["Os Jogos Eternos de Lúmen", "The Eternal Games of Lumen", "Los Juegos Eternos de Lumen"],
  laminasTitle: ["Arena das Lâminas", "Arena of Blades", "Arena de las Espadas"],
  laminasPitch: [
    "Treine a espada contra a máquina. Quando o chão acender vermelho, o golpe vem ali: esquive e corte na brecha.",
    "Train your sword against the machine. When the floor glows red, the blow lands there: dodge and strike in the opening.",
    "Entrena la espada contra la máquina. Cuando el suelo se enciende en rojo, el golpe cae ahí: esquiva y corta en la brecha.",
  ],
  laminasLeave: ["Voltar ao centro", "Back to downtown", "Volver al centro"],
  laminasLevel: ["Nível {n}", "Level {n}", "Nivel {n}"],
  laminasMobSoldier: ["Soldado de Pedra", "Stone Soldier", "Soldado de Piedra"],
  laminasMobWolf: ["Lobos de Ferrugem", "Rust Wolves", "Lobos de Óxido"],
  laminasMobGolem: ["Golem de Sucata", "Scrap Golem", "Gólem de Chatarra"],
  laminasMobHarpy: ["Harpia", "Harpy", "Arpía"],
  laminasMobBrute: ["Brutamontes", "Brute", "Bruto"],
  laminasSubWolf: ["Bando de 3, rápidos", "Pack of 3, fast", "Manada de 3, rápidos"],
  laminasSubGolem: ["Lento, bate em área", "Slow, hits an area", "Lento, golpea en área"],
  laminasSubHarpy: ["Voa e mergulha", "Flies and dives", "Vuela y se lanza en picada"],
  laminasSubBrute: ["Elite: investida e pancada", "Elite: charge and smash", "Élite: embestida y golpe"],
  laminasKeys: [
    "WASD anda · J, Espaço ou clique ataca (aperte de novo para o combo) · K, Shift ou botão direito esquiva",
    "WASD moves · J, Space or click attacks (press again to combo) · K, Shift or right click dodges",
    "WASD mueve · J, Espacio o clic ataca (presiona de nuevo para el combo) · K, Shift o clic derecho esquiva",
  ],
  laminasTouchHelp: ["Joystick anda · ATACAR e ESQUIVAR na direita", "Joystick moves · ATTACK and DODGE on the right", "Joystick mueve · ATACAR y ESQUIVAR a la derecha"],
  laminasDodge: ["ESQUIVE!", "DODGE!", "¡ESQUIVA!"],
  laminasSoundOn: ["Ligar som", "Sound on", "Activar sonido"],
  laminasSoundOff: ["Desligar som", "Sound off", "Silenciar"],
  laminasQuit: ["Sair da luta", "Leave the fight", "Salir de la pelea"],
  laminasBtnDodge: ["ESQUIVAR", "DODGE", "ESQUIVAR"],
  laminasBtnAttack: ["ATACAR", "ATTACK", "ATACAR"],
  laminasError: ["A arena não abriu neste aparelho.", "The arena didn't open on this device.", "La arena no abrió en este dispositivo."],
  laminasBack: ["Voltar", "Back", "Volver"],
  laminasPortal: ["Atravessando o portal…", "Crossing the portal…", "Atravesando el portal…"],
  laminasLoading: ["Entrando na arena…", "Entering the arena…", "Entrando a la arena…"],
  laminasWin: ["VITÓRIA!", "VICTORY!", "¡VICTORIA!"],
  laminasLose: ["Você caiu", "You fell", "Caíste"],
  laminasWinPortal: ["O monstro foi derrotado e sumiu da cidade.", "The monster was defeated and left the city.", "El monstruo fue derrotado y desapareció de la ciudad."],
  laminasWinTrain: ["Mais um treino vencido. Os Sete estão de olho.", "Another training won. The Seven are watching.", "Otro entrenamiento ganado. Los Siete te observan."],
  laminasLosePortal: [
    "O monstro continua na cidade. Volte quando estiver pronto.",
    "The monster is still in the city. Come back when you're ready.",
    "El monstruo sigue en la ciudad. Vuelve cuando estés listo.",
  ],
  laminasLoseTrain: ["Leia o chão vermelho, esquive e corte na brecha.", "Read the red floor, dodge and strike in the opening.", "Lee el suelo rojo, esquiva y corta en la brecha."],
  laminasAgain: ["Lutar de novo", "Fight again", "Pelear de nuevo"],
  laminasBackCity: ["Voltar à cidade", "Back to the city", "Volver a la ciudad"],
  laminasBackMenu: ["Escolher outro", "Pick another", "Elegir otro"],
  mobAlert: ["Monstros na cidade! Procure o portal violeta.", "Monsters in the city! Look for the violet portal.", "¡Monstruos en la ciudad! Busca el portal violeta."],
  mobWin: ["{name} derrotou: {mob}!", "{name} defeated: {mob}!", "¡{name} derrotó: {mob}!"],
  mobFight: ["Lutar", "Fight", "Pelear"],
  hallEyebrow: ["Os Jogos Eternos de Lúmen", "The Eternal Games of Lumen", "Los Juegos Eternos de Lumen"],
  hallClosed: [
    "O Salão é de quem ficou em 1º lugar no ranking por três meses seguidos. Treine, vença e volte com o seu nome.",
    "The Hall belongs to those who held 1st place in the ranking for three months in a row. Train, win and come back with your name.",
    "El Salón es de quien quedó en 1.er lugar del ranking tres meses seguidos. Entrena, gana y vuelve con tu nombre.",
  ],
  hallWall: ["Muro dos Herdeiros: {names}", "Wall of Heirs: {names}", "Muro de los Herederos: {names}"],
  hallAdmin: [
    "Você entrou como administrador. O Muro ainda não tem nomes.",
    "You entered as an administrator. The Wall has no names yet.",
    "Entraste como administrador. El Muro aún no tiene nombres.",
  ],
  hallEmpty: ["O Muro ainda não tem nomes. O seu pode ser o primeiro.", "The Wall has no names yet. Yours could be the first.", "El Muro aún no tiene nombres. El tuyo puede ser el primero."],
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
console.log(`i18n mm3d-48 lâminas/monstros/salão: ${added} chaves adicionadas`)
