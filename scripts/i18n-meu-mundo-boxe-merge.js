// Meu Mundo 3D — mm3d-43: Arena de Boxe (luta calculada pela vida, sozinho ou multiplayer).
// Namespace "MeuMundo". Idempotente, fill-if-absent (OVERRIDE regrava).
// Rodar: node scripts/i18n-meu-mundo-boxe-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  centerPlace_boxe: ["Arena de Boxe", "Boxing Arena", "Arena de Boxeo"],
  boxeAgain: ["Outra luta", "Another fight", "Otra pelea"],
  boxeBreakTag: ["Intervalo", "Break", "Descanso"],
  boxeCancel: ["Desistir", "Give up", "Desistir"],
  boxeCardFail: ["Não deu para ler a ficha agora.", "Couldn't load the fighter card right now.", "No se pudo leer la ficha ahora."],
  boxeCardLoading: ["Pesando o lutador…", "Weighing the fighter…", "Pesando al boxeador…"],
  boxeCondExhausted: ["Exausto", "Exhausted", "Agotado"],
  boxeCondFed: ["Alimentado", "Well fed", "Alimentado"],
  boxeCondHeavy: ["Pesado", "Heavy", "Pesado"],
  boxeCondHungry: ["Com fome", "Hungry", "Con hambre"],
  boxeCondHurt: ["Machucado", "Hurt", "Lastimado"],
  boxeCondPeckish: ["Com um pouco de fome", "A bit hungry", "Con algo de hambre"],
  boxeCondRested: ["Descansado", "Rested", "Descansado"],
  boxeCondSleepy: ["Com sono", "Sleepy", "Con sueño"],
  boxeCondStressed: ["Estressado", "Stressed", "Estresado"],
  boxeCondStuffed: ["Cheio demais", "Too full", "Demasiado lleno"],
  boxeCondTired: ["Cansado", "Tired", "Cansado"],
  boxeCpu: ["computador", "computer", "computadora"],
  boxeDraw: ["EMPATE", "DRAW", "EMPATE"],
  boxeFar: ["Chegue perto da porta da arena.", "Get close to the arena door.", "Acércate a la puerta de la arena."],
  boxeFight: ["Subir no ringue", "Step into the ring", "Subir al ring"],
  boxeGoingUp: ["Subindo no ringue…", "Stepping into the ring…", "Subiendo al ring…"],
  boxeHowDraw: ["Empate nos pontos ({a} × {b})", "Draw on points ({a} × {b})", "Empate a los puntos ({a} × {b})"],
  boxeHowKoLoss: ["Nocauteado por {name} no {r}", "Knocked out by {name} in {r}", "Noqueado por {name} en el {r}"],
  boxeHowKoWin: ["Nocaute em {name} no {r}", "Knocked out {name} in {r}", "Nocaut a {name} en el {r}"],
  boxeHowPoints: ["Nos pontos: {a} × {b}", "On points: {a} × {b}", "A los puntos: {a} × {b}"],
  boxeHowTkoLoss: ["Nocaute técnico no {r} (3 quedas)", "Technical knockout in {r} (3 knockdowns)", "Nocaut técnico en el {r} (3 caídas)"],
  boxeHowTkoWin: ["Nocaute técnico no {r} (3 quedas)", "Technical knockout in {r} (3 knockdowns)", "Nocaut técnico en el {r} (3 caídas)"],
  boxeHowTowelMine: ["Você jogou a toalha no {r}", "You threw in the towel in {r}", "Tiraste la toalla en el {r}"],
  boxeHowTowelTheirs: ["{name} jogou a toalha", "{name} threw in the towel", "{name} tiró la toalla"],
  boxeJoinFail: ["A arena não abriu agora. Tente de novo.", "The arena didn't open now. Try again.", "La arena no abrió ahora. Intenta de nuevo."],
  boxeKicker: ["Arena de Boxe", "Boxing Arena", "Arena de Boxeo"],
  boxeLeave: ["Voltar ao centro", "Back to downtown", "Volver al centro"],
  boxeLeaveHint: ["Sair não para a luta: ela continua e vale na vida.", "Leaving doesn't stop the fight: it goes on and counts in your life.", "Salir no detiene la pelea: sigue y cuenta en tu vida."],
  boxeLeaveShort: ["Sair", "Leave", "Salir"],
  boxeLifeCoins: ["Bolsa: +{n} moedas", "Purse: +{n} coins", "Bolsa: +{n} monedas"],
  boxeLifeEnergy: ["Energia", "Energy", "Energía"],
  boxeLifeHealth: ["Saúde", "Health", "Salud"],
  boxeLifeHospital: [
    "Ele saiu da arena de ambulância: está internado no hospital.",
    "He left the arena in an ambulance: he's in the hospital.",
    "Salió de la arena en ambulancia: está internado en el hospital.",
  ],
  boxeLifeInjury: [
    "Lesionado por {h} h: sem lutar e a saúde volta pela metade.",
    "Injured for {h} h: no fighting and health recovers at half speed.",
    "Lesionado por {h} h: sin pelear y la salud se recupera a la mitad.",
  ],
  boxeLifeMood: ["Humor", "Mood", "Ánimo"],
  boxeLifeNone: ["Nada mudou (a vida não estava disponível).", "Nothing changed (life wasn't available).", "Nada cambió (la vida no estaba disponible)."],
  boxeLifeSatiety: ["Saciedade", "Fullness", "Saciedad"],
  boxeLifeSpeed: ["Velocidade", "Speed", "Velocidad"],
  boxeLifeStrength: ["Força", "Strength", "Fuerza"],
  boxeLifeStress: ["Estresse", "Stress", "Estrés"],
  boxeLifeTitle: ["Na vida do seu hóspede", "In your guest's life", "En la vida de tu huésped"],
  boxeLobbyFree: ["vaga livre", "open spot", "lugar libre"],
  boxeLobbyHow: [
    "Se ninguém aparecer até o fim do tempo, você luta contra o computador (parelho).",
    "If nobody shows up before time runs out, you fight the computer (even match).",
    "Si nadie aparece antes de que acabe el tiempo, peleas contra la computadora (pareja).",
  ],
  boxeLobbyTitle: ["Esperando um adversário…", "Waiting for an opponent…", "Esperando un rival…"],
  boxeLoss: ["DERROTA", "DEFEAT", "DERROTA"],
  boxeMode: ["Modo", "Mode", "Modo"],
  boxeModeMulti: ["Multiplayer", "Multiplayer", "Multijugador"],
  boxeModeSolo: ["Sozinho", "Solo", "Solo"],
  boxeMultiHow: [
    "Você entra na fila da arena e luta com quem estiver no centro agora, cada um com os números da própria vida. Se ninguém aparecer em 1 minuto, você luta contra o computador. Bolsa da vitória: 60 moedas.",
    "You join the arena queue and fight whoever is downtown now, each with their own life's numbers. If nobody shows up in 1 minute, you fight the computer. Winner's purse: 60 coins.",
    "Entras en la fila de la arena y peleas con quien esté en el centro ahora, cada uno con los números de su propia vida. Si nadie aparece en 1 minuto, peleas contra la computadora. Bolsa de la victoria: 60 monedas.",
  ],
  boxeNoDead: ["Seu hóspede morreu.", "Your guest has died.", "Tu huésped murió."],
  boxeNoGeneric: ["Ele não pode lutar agora.", "He can't fight right now.", "No puede pelear ahora."],
  boxeNoHospital: ["Ele está internado no hospital.", "He's in the hospital.", "Está internado en el hospital."],
  boxeNoInjured: ["Ele está lesionado: sem lutar por mais {h} h.", "He's injured: no fighting for another {h} h.", "Está lesionado: sin pelear por {h} h más."],
  boxeNoJail: ["Ele está preso na delegacia.", "He's locked up at the police station.", "Está preso en la comisaría."],
  boxeNoSleeping: ["Ele está dormindo.", "He's sleeping.", "Está durmiendo."],
  boxeNoTired: [
    "Ele está cansado demais para lutar. Durma ou descanse um pouco.",
    "He's too tired to fight. Sleep or rest for a while.",
    "Está demasiado cansado para pelear. Duerme o descansa un poco.",
  ],
  boxeNoUnfit: [
    "Com a saúde assim o médico não libera a luta. Cuide-se antes.",
    "With his health like this the doctor won't clear the fight. Take care of yourself first.",
    "Con la salud así el médico no autoriza la pelea. Cuídate antes.",
  ],
  boxeNobody: ["Ninguém apareceu: você vai lutar contra o computador.", "Nobody showed up: you'll fight the computer.", "Nadie apareció: vas a pelear contra la computadora."],
  boxeOffline: [
    "Sem conexão com a arena. A luta continua e vale na vida.",
    "No connection to the arena. The fight goes on and counts in your life.",
    "Sin conexión con la arena. La pelea sigue y cuenta en tu vida.",
  ],
  boxeOpponent: ["Adversário", "Opponent", "Rival"],
  boxePitch: [
    "Você não controla a luta: valem o treino, a comida e o descanso do seu hóspede. Escolha a estratégia, suba no ringue e assista. Apanhar demais machuca de verdade — pode até ir para o hospital.",
    "You don't control the fight: your guest's training, food and rest are what count. Pick a strategy, step into the ring and watch. Taking too many punches really hurts — you may even end up in the hospital.",
    "No controlas la pelea: cuentan el entrenamiento, la comida y el descanso de tu huésped. Elige la estrategia, sube al ring y mira. Recibir demasiados golpes lastima de verdad — hasta puedes terminar en el hospital.",
  ],
  boxePurse: ["Bolsa: {n} moedas", "Purse: {n} coins", "Bolsa: {n} monedas"],
  boxeQueue: ["Entrar na fila", "Join the queue", "Entrar en la fila"],
  boxeRecord: ["Cartel: {w}V · {l}D · {d}E · {ko} nocautes", "Record: {w}W · {l}L · {d}D · {ko} knockouts", "Récord: {w}G · {l}P · {d}E · {ko} nocauts"],
  boxeRoundN: ["{n}º round", "round {n}", "{n}º asalto"],
  boxeRoundTag: ["Round {n}", "Round {n}", "Asalto {n}"],
  boxeSceneFail: [
    "A arena não abriu neste aparelho. A luta continua e vale na vida.",
    "The arena didn't open on this device. The fight goes on and counts in your life.",
    "La arena no abrió en este dispositivo. La pelea sigue y cuenta en tu vida.",
  ],
  boxeSoundOff: ["Desligar o som", "Mute sound", "Silenciar"],
  boxeSoundOn: ["Ligar o som", "Turn sound on", "Activar sonido"],
  boxeStatChin: ["Queixo", "Chin", "Mentón"],
  boxeStatDefense: ["Defesa", "Defense", "Defensa"],
  boxeStatKd: ["vezes no chão", "times down", "veces en la lona"],
  boxeStatLanded: ["golpes certos", "punches landed", "golpes acertados"],
  boxeStatPower: ["Força", "Power", "Fuerza"],
  boxeStatSpeed: ["Velocidade", "Speed", "Velocidad"],
  boxeStatStamina: ["Fôlego", "Stamina", "Aguante"],
  boxeStatTaken: ["dano levado", "damage taken", "daño recibido"],
  boxeStratAggressive: ["Agressivo", "Aggressive", "Agresivo"],
  boxeStratAggressiveSub: [
    "Ataca mais e bate mais forte, mas abre a guarda e cansa.",
    "Attacks more and hits harder, but drops the guard and tires.",
    "Ataca más y pega más fuerte, pero abre la guardia y se cansa.",
  ],
  boxeStratBalanced: ["Equilibrado", "Balanced", "Equilibrado"],
  boxeStratBalancedSub: ["Ataca e defende na medida.", "Attacks and defends in balance.", "Ataca y defiende en su justa medida."],
  boxeStratDefensive: ["Defensivo", "Defensive", "Defensivo"],
  boxeStratDefensiveSub: ["Guarda alta e contra-ataque; bate menos.", "High guard and counters; hits less.", "Guardia alta y contragolpe; pega menos."],
  boxeStrategy: ["Estratégia", "Strategy", "Estrategia"],
  boxeTallyKd: ["quedas provocadas", "knockdowns scored", "caídas provocadas"],
  boxeTallyPunches: ["golpes certos", "punches landed", "golpes acertados"],
  boxeTierEasy: ["Mais fraco", "Weaker", "Más débil"],
  boxeTierEven: ["Parelho", "Even", "Parejo"],
  boxeTierHard: ["Mais forte", "Stronger", "Más fuerte"],
  boxeTitle: ["NO RINGUE", "IN THE RING", "EN EL RING"],
  boxeToastBreak: ["Fim do {n}º round", "End of round {n}", "Fin del {n}º asalto"],
  boxeToastClean: ["Golpe limpo de {name}!", "Clean shot by {name}!", "¡Golpe limpio de {name}!"],
  boxeToastDown: ["KNOCKDOWN! {name} no chão", "KNOCKDOWN! {name} is down", "¡CAÍDA! {name} en la lona"],
  boxeToastEnd: ["Fim da luta! Decisão dos juízes…", "Fight over! Judges' decision…", "¡Fin de la pelea! Decisión de los jueces…"],
  boxeToastKo: ["NOCAUTE!", "KNOCKOUT!", "¡NOCAUT!"],
  boxeToastRound: ["ROUND {n}", "ROUND {n}", "ASALTO {n}"],
  boxeToastTko: ["NOCAUTE TÉCNICO!", "TECHNICAL KNOCKOUT!", "¡NOCAUT TÉCNICO!"],
  boxeToastTowel: ["{name} jogou a toalha", "{name} threw in the towel", "{name} tiró la toalla"],
  boxeToastUp: ["{name} levantou!", "{name} is back up!", "¡{name} se levantó!"],
  boxeTowel: ["Jogar a toalha", "Throw in the towel", "Tirar la toalla"],
  boxeTowelConfirm: ["Confirmar: perder agora", "Confirm: lose now", "Confirmar: perder ahora"],
  boxeWin: ["VITÓRIA", "VICTORY", "VICTORIA"],
  boxeYou: ["Seu lutador", "Your fighter", "Tu boxeador"],
  boxeYouTag: ["você", "you", "tú"],
  effInjury: ["Lesão do boxe", "Boxing injury", "Lesión de boxeo"],
  evBoxeCoins: ["+{n} moedas.", "+{n} coins.", "+{n} monedas."],
  evBoxeDraw: ["Empatou uma luta de boxe.", "Drew a boxing match.", "Empató una pelea de boxeo."],
  evBoxeKo: ["nocaute", "knockout", "nocaut"],
  evBoxeLoss: ["Perdeu uma luta de boxe ({how}).", "Lost a boxing match ({how}).", "Perdió una pelea de boxeo ({how})."],
  evBoxePoints: ["pontos", "points", "puntos"],
  evBoxeTko: ["nocaute técnico", "technical knockout", "nocaut técnico"],
  evBoxeTowel: ["toalha", "towel", "toalla"],
  evBoxeWin: ["Venceu uma luta de boxe ({how}).", "Won a boxing match ({how}).", "Ganó una pelea de boxeo ({how})."],
  evHospitalInBoxe: ["Saiu da arena de boxe direto para o hospital.", "Went straight from the boxing arena to the hospital.", "Salió de la arena de boxeo directo al hospital."],
}

const OVERRIDE = new Set([])

const LOCALES = ["pt-BR", "en", "es"]
let added = 0
for (const [i, locale] of LOCALES.entries()) {
  const file = path.join(dir, `${locale}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  json.MeuMundo = json.MeuMundo || {}
  for (const [key, vals] of Object.entries(MEU_MUNDO)) {
    if (json.MeuMundo[key] === undefined || (OVERRIDE.has(key) && json.MeuMundo[key] !== vals[i])) {
      json.MeuMundo[key] = vals[i]
      added++
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
}
console.log(`i18n mm3d-43 boxe: ${added} chaves adicionadas`)
