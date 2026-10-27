// Meu Mundo 3D — mm3d-40: Rolê Noturno (corrida sem fim de bike, skate ou patins numa rua de noite).
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-meu-mundo-noturno-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  centerPlace_noturno: ["Rolê Noturno", "Night Ride", "Paseo Nocturno"],
  noturnoAgain: ["De novo", "Again", "Otra vez"],
  noturnoAria: ["Rolê Noturno", "Night Ride", "Paseo Nocturno"],
  noturnoBackMenu: ["Voltar ao menu", "Back to menu", "Volver al menú"],
  noturnoBest: ["Seu recorde de {ride}: {n}", "Your {ride} record: {n}", "Tu récord en {ride}: {n}"],
  noturnoBikeSub: ["A mais rápida. Pulo mais baixo.", "The fastest. Lower jump.", "La más rápida. Salto más bajo."],
  noturnoByAmb: ["Bateu na ambulância!", "Hit the ambulance!", "¡Chocaste con la ambulancia!"],
  noturnoByBarrier: ["Tropeçou no cavalete!", "Tripped on the barrier!", "¡Tropezaste con la valla!"],
  noturnoByCar: ["Bateu no carro!", "Hit a car!", "¡Chocaste con un auto!"],
  noturnoByRamp: ["Caiu da rampa!", "Fell off the ramp!", "¡Te caíste de la rampa!"],
  noturnoByStumble: ["Dois esbarrões: caiu!", "Two bumps: you fell!", "Dos golpes: ¡te caíste!"],
  noturnoByTruck: ["Bateu no caminhão!", "Hit the truck!", "¡Chocaste con el camión!"],
  noturnoChange: ["Trocar veículo", "Change ride", "Cambiar vehículo"],
  noturnoChoose: ["Escolha o seu veículo", "Choose your ride", "Elige tu vehículo"],
  noturnoCoins: ["Moedas", "Coins", "Monedas"],
  noturnoDistance: ["Distância", "Distance", "Distancia"],
  noturnoErrorTitle: ["O rolê não abriu", "The ride didn't open", "El paseo no abrió"],
  noturnoGo: ["VAI!", "GO!", "¡VAMOS!"],
  noturnoHintKeys: ["← → trocam de faixa · ↑ ou Espaço pulam · ↓ desce", "← → change lanes · ↑ or Space jump · ↓ drops", "← → cambian de carril · ↑ o Espacio saltan · ↓ baja"],
  noturnoHintTouch: ["Deslize ← → para trocar de faixa · ↑ ou toque para pular", "Swipe ← → to change lanes · ↑ or tap to jump", "Desliza ← → para cambiar de carril · ↑ o toca para saltar"],
  noturnoHowCars: [
    "De frente derruba. Pule o cavalete e suba no teto dos carros.",
    "Head-on knocks you down. Jump the barriers and ride on car roofs.",
    "De frente te derriba. Salta la valla y sube al techo de los autos.",
  ],
  noturnoHowCarsTitle: ["Trânsito", "Traffic", "Tráfico"],
  noturnoHowCoins: [
    "Cada uma vale 10 pontos. Em fila, no ar e em cima dos caminhões.",
    "Each one is worth 10 points. In lines, in the air and on top of trucks.",
    "Cada una vale 10 puntos. En fila, en el aire y encima de los camiones.",
  ],
  noturnoHowCoinsTitle: ["Moedas", "Coins", "Monedas"],
  noturnoHowRamp: ["Te jogam para o alto com um 360°. Caia em cima do caminhão!", "They launch you up with a 360°. Land on top of the truck!", "Te lanzan al aire con un 360°. ¡Cae encima del camión!"],
  noturnoHowRampTitle: ["Rampas", "Ramps", "Rampas"],
  noturnoKeys: [
    "← → ou A D trocam de faixa · ↑, W ou Espaço pulam · ↓ ou S descem rápido",
    "← → or A D change lanes · ↑, W or Space jump · ↓ or S drop fast",
    "← → o A D cambian de carril · ↑, W o Espacio saltan · ↓ o S bajan rápido",
  ],
  noturnoKicker: ["Avenida da madrugada", "Late-night avenue", "Avenida de madrugada"],
  noturnoLeave: ["Voltar ao centro", "Back to downtown", "Volver al centro"],
  noturnoLoading: ["Acendendo os postes…", "Turning on the streetlights…", "Encendiendo las farolas…"],
  noturnoNewRecord: ["Novo recorde!", "New record!", "¡Nuevo récord!"],
  noturnoPitch: [
    "A rua é sua de noite. Desvie dos carros e caminhões, salte das rampas e pegue as moedas — cada vez mais rápido.",
    "The street is yours at night. Dodge cars and trucks, launch off ramps and grab the coins — faster and faster.",
    "La calle es tuya de noche. Esquiva autos y camiones, salta de las rampas y agarra las monedas — cada vez más rápido.",
  ],
  noturnoPlay: ["Andar de {ride}", "Ride the {ride}", "Andar en {ride}"],
  noturnoRideBike: ["Bicicleta", "Bike", "Bicicleta"],
  noturnoRideSkate: ["Skate", "Skateboard", "Skate"],
  noturnoRideSkates: ["Patins", "Roller skates", "Patines"],
  noturnoScore: ["Pontos", "Score", "Puntos"],
  noturnoSkateSub: ["O pulo mais alto. Manobra nas rampas.", "The highest jump. Tricks on the ramps.", "El salto más alto. Trucos en las rampas."],
  noturnoSkatesSub: ["A mais ágil para trocar de faixa.", "The quickest at changing lanes.", "La más ágil para cambiar de carril."],
  noturnoSoundOff: ["Desligar som", "Mute", "Silenciar"],
  noturnoSoundOn: ["Ligar som", "Unmute", "Activar sonido"],
  noturnoStatAgile: ["Agilidade", "Agility", "Agilidad"],
  noturnoStatJump: ["Pulo", "Jump", "Salto"],
  noturnoStatSpeed: ["Velocidade", "Speed", "Velocidad"],
  noturnoSwipe: [
    "Deslize para os lados para trocar de faixa, para cima (ou toque) para pular e para baixo para descer rápido.",
    "Swipe sideways to change lanes, up (or tap) to jump and down to drop fast.",
    "Desliza a los lados para cambiar de carril, hacia arriba (o toca) para saltar y hacia abajo para bajar rápido.",
  ],
  noturnoToastCoins: ["{n} moedas!", "{n} coins!", "¡{n} monedas!"],
  noturnoToastStumble: ["Quase! Mais um esbarrão e você cai", "Close one! One more bump and you fall", "¡Casi! Un golpe más y te caes"],
  noturnoToastTrick: ["360°! +50", "360°! +50", "¡360°! +50"],
  noturnoTricks: ["Manobras", "Tricks", "Trucos"],
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
console.log(`i18n mm3d-40 noturno: ${added} chaves adicionadas`)
