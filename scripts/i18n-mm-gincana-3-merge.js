// Meu Mundo 3D — Gincana 3 (2026-11-18): cada fase é um TIPO de prova
// (corrida, sobrevivência, coleta, rei do pedaço). G3-1: Maré do Pântano (Floresta); G3-2: Pedras que Caem (Cânion).
// Namespace "MeuMundo". Idempotente, fill-if-absent (as fatias seguintes acrescentam aqui).
// Rodar: node scripts/i18n-mm-gincana-3-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  // nomes das provas
  gincanaEvCidade: ["Corrida do Canal", "Canal Race", "Carrera del Canal"],
  gincanaEvFloresta: ["Maré do Pântano", "Swamp Tide", "Marea del Pantano"],
  gincanaEvRace: ["Corrida de obstáculos", "Obstacle race", "Carrera de obstáculos"],
  // Floresta: Maré do Pântano
  gincanaPhFlorestaPitch3: [
    "Suba a árvore gigante antes que o pântano pegue você: quem ele alcança está fora.",
    "Climb the giant tree before the swamp catches you: whoever it reaches is out.",
    "Sube el árbol gigante antes de que el pantano te alcance: a quien alcanza, queda fuera.",
  ],
  gincanaSecFm1: ["Troncos", "Logs", "Troncos"],
  gincanaSecFm2: ["Raízes", "Roots", "Raíces"],
  gincanaSecFm3: ["Vitórias-régias", "Lily pads", "Nenúfares"],
  gincanaSecFm4: ["Cocos", "Coconuts", "Cocos"],
  gincanaSecFm5: ["Ponte de folhas", "Leaf bridge", "Puente de hojas"],
  gincanaHowFm1: [
    "Troncos rolam ladeira abaixo: desvie e não pare, o pântano já está subindo.",
    "Logs roll down the slope: dodge and keep moving, the swamp is already rising.",
    "Los troncos ruedan cuesta abajo: esquívalos y no te detengas, el pantano ya está subiendo.",
  ],
  gincanaHowFm2: ["Raízes giram rente ao chão: pule na hora certa.", "Roots spin close to the ground: jump at the right time.", "Las raíces giran a ras del suelo: salta en el momento justo."],
  gincanaHowFm3: [
    "As vitórias-régias andam de lado: pule quando a próxima chegar.",
    "The lily pads drift sideways: jump when the next one comes close.",
    "Los nenúfares se mueven de lado: salta cuando llegue el siguiente.",
  ],
  gincanaHowFm4: [
    "Cocos balançam sobre a rampa: passe quando o da sua faixa voltar.",
    "Coconuts swing over the ramp: go when the one in your lane swings back.",
    "Los cocos se balancean sobre la rampa: pasa cuando el de tu carril regrese.",
  ],
  gincanaHowFm5: [
    "As folhas caem logo depois que alguém pisa. O topo é a chegada.",
    "The leaves fall right after someone steps on them. The top is the finish.",
    "Las hojas caen justo después de que alguien las pisa. La cima es la meta.",
  ],
  // avisos e placar dos tipos de prova
  gincanaOutSwamp: ["O pântano te pegou! Fora da prova", "The swamp got you! You're out", "¡El pantano te atrapó! Fuera de la prueba"],
  gincanaOutFall: ["Caiu! Fora da prova", "You fell! You're out", "¡Caíste! Fuera de la prueba"],
  gincanaRiseNear: ["O pântano está chegando: suba!", "The swamp is coming: climb!", "¡El pantano está llegando: sube!"],
  gincanaRiseGap: ["Pântano a {m} m", "Swamp {m} m below", "Pantano a {m} m"],
  gincanaGem: ["+{n} engrenagem", "+{n} gear", "+{n} engranaje"],
  gincanaAlive: ["Em pé {n} · vaga {q}", "Standing {n} · spots {q}", "En pie {n} · cupos {q}"],
  gincanaPts: ["{n} pontos", "{n} points", "{n} puntos"],
  gincanaZonePts: ["{n} s no topo", "{n} s on top", "{n} s en la cima"],
  gincanaOutSwampTitle: ["O pântano te pegou!", "The swamp got you!", "¡El pantano te atrapó!"],
  gincanaOutTitle: ["Fora da prova!", "You're out!", "¡Fuera de la prueba!"],
  gincanaPlaceScore: ["{n}º lugar", "Place {n}", "{n}º lugar"],
  gincanaSurvived: ["Você ficou em pé!", "You stayed standing!", "¡Quedaste en pie!"],
  gincanaOutTag: ["fora", "out", "fuera"],
  // menu
  gincanaKicker3: ["Party game · 7 provas diferentes", "Party game · 7 different events", "Party game · 7 pruebas distintas"],
  gincanaPitch3: [
    "Oito jogadores e uma prova diferente em cada fase: corrida, sobrevivência, coleta e rei do topo. Só a vaga classifica.",
    "Eight players and a different event in every stage: race, survival, collecting and king of the hill. Only the top spots qualify.",
    "Ocho jugadores y una prueba distinta en cada fase: carrera, supervivencia, recolección y rey de la cima. Solo los cupos clasifican.",
  ],
  // G3-2 Cânion: Pedras que Caem
  gincanaEvCanion: ["Pedras que Caem", "Falling Stones", "Piedras que Caen"],
  gincanaPhCanionPitch3: [
    "Quatro andares de pedras sobre o abismo: cada pedra pisada cai. Fique em pé até sobrar só a vaga.",
    "Four floors of stones over the abyss: every stone you step on falls. Stay standing until only the spots are left.",
    "Cuatro pisos de piedras sobre el abismo: cada piedra pisada cae. Quédate en pie hasta que solo queden los cupos.",
  ],
  gincanaSecCs1: ["Pedra pisada", "Stepped stone", "Piedra pisada"],
  gincanaSecCs2: ["Pular", "Jump", "Saltar"],
  gincanaSecCs3: ["Andares", "Floors", "Pisos"],
  gincanaSecCs4: ["Empurrão", "Shove", "Empujón"],
  gincanaSecCs5: ["Vaga", "Spots", "Cupos"],
  gincanaHowCs1: [
    "A pedra que você pisa treme e cai em 1 segundo: não fique parado.",
    "The stone you step on shakes and falls in 1 second: don't stand still.",
    "La piedra que pisas tiembla y cae en 1 segundo: no te quedes quieto.",
  ],
  gincanaHowCs2: ["No ar você não derruba pedra: pular poupa o chão.", "In the air you don't drop stones: jumping saves the floor.", "En el aire no tiras piedras: saltar ahorra suelo."],
  gincanaHowCs3: ["Caiu num buraco? Há mais três andares embaixo.", "Fell through a hole? There are three more floors below.", "¿Caíste por un hueco? Hay tres pisos más abajo."],
  gincanaHowCs4: [
    "Agarre e mergulhe nos outros para derrubá-los num buraco.",
    "Grab and dive into others to knock them into a hole.",
    "Agarra y lánzate contra los demás para tirarlos a un hueco.",
  ],
  gincanaHowCs5: [
    "Quem cai do último andar está fora. Sobrando só a vaga, acabou.",
    "Whoever falls from the bottom floor is out. When only the spots are left, it's over.",
    "Quien cae del último piso queda fuera. Cuando solo quedan los cupos, se acabó.",
  ],
  // G3-3 Orbital: Varredura
  gincanaEvOrbital: ["Varredura", "Sweeper", "Barrido"],
  gincanaPhOrbitalPitch3: [
    "Um disco no vazio e duas barras que giram cada vez mais rápido: pule a baixa, mergulhe por baixo da alta.",
    "A disc over the void and two bars spinning faster and faster: jump the low one, dive under the high one.",
    "Un disco sobre el vacío y dos barras que giran cada vez más rápido: salta la baja, lánzate por debajo de la alta.",
  ],
  gincanaSecOv1: ["Barra baixa", "Low bar", "Barra baja"],
  gincanaSecOv2: ["Barra alta", "High bar", "Barra alta"],
  gincanaSecOv3: ["Disco", "Disc", "Disco"],
  gincanaSecOv4: ["Empurrão", "Shove", "Empujón"],
  gincanaSecOv5: ["Vaga", "Spots", "Cupos"],
  gincanaHowOv1: ["A barra rente ao chão: pule na hora certa.", "The bar at floor level: jump at the right time.", "La barra a ras del suelo: salta en el momento justo."],
  gincanaHowOv2: [
    "A barra na altura do peito: mergulhe para passar por baixo.",
    "The bar at chest height: dive to slide under it.",
    "La barra a la altura del pecho: lánzate para pasar por debajo.",
  ],
  gincanaHowOv3: [
    "O disco gira devagar e leva você junto. A beira é o vazio.",
    "The disc spins slowly and carries you. The edge is the void.",
    "El disco gira despacio y te lleva. El borde es el vacío.",
  ],
  gincanaHowOv4: [
    "Agarre e mergulhe nos outros para jogá-los na barra.",
    "Grab and dive into others to throw them into the bar.",
    "Agarra y lánzate contra los demás para tirarlos a la barra.",
  ],
  // G3-4 Forja: Paredes de Brasa
  gincanaEvForja: ["Paredes de Brasa", "Ember Walls", "Muros de Brasa"],
  gincanaPhForjaPitch3: [
    "Paredes de brasa atravessam a arena sobre a lava: ache o vão ou pule a mureta, ou a parede joga você na lava.",
    "Ember walls sweep across the arena over the lava: find the gap or jump the low wall, or the wall pushes you into the lava.",
    "Muros de brasa cruzan la arena sobre la lava: encuentra el hueco o salta el muro bajo, o el muro te empuja a la lava.",
  ],
  gincanaSecFw1: ["O vão", "The gap", "El hueco"],
  gincanaSecFw2: ["Dois vãos", "Two gaps", "Dos huecos"],
  gincanaSecFw3: ["Mureta", "Low wall", "Muro bajo"],
  gincanaSecFw4: ["Em pares", "In pairs", "En pares"],
  gincanaSecFw5: ["Vaga", "Spots", "Cupos"],
  gincanaHowFw1: [
    "Cada parede tem um buraco: fique na frente dele antes de ela chegar.",
    "Every wall has a hole: stand in front of it before the wall arrives.",
    "Cada muro tiene un hueco: ponte frente a él antes de que llegue.",
  ],
  gincanaHowFw2: ["Às vezes são dois vãos: vá ao mais perto.", "Sometimes there are two gaps: go to the nearest one.", "A veces hay dos huecos: ve al más cercano."],
  gincanaHowFw3: ["A mureta baixa não tem vão: pule na hora.", "The low wall has no gap: jump at the right time.", "El muro bajo no tiene hueco: salta en el momento justo."],
  gincanaHowFw4: [
    "Depois de 40 s as paredes vêm em pares e mais rápidas.",
    "After 40 s the walls come in pairs and faster.",
    "Después de 40 s los muros vienen en pares y más rápido.",
  ],
  gincanaHowFw5: [
    "Quem a parede empurra para fora cai na lava. Sobrando só a vaga, acabou.",
    "Whoever the wall pushes off falls into the lava. When only the spots are left, it's over.",
    "A quien el muro empuja fuera cae a la lava. Cuando solo quedan los cupos, se acabó.",
  ],
  gincanaHowOv5: [
    "As barras aceleram até o fim. Sobrando só a vaga, acabou.",
    "The bars speed up until the end. When only the spots are left, it's over.",
    "Las barras aceleran hasta el final. Cuando solo quedan los cupos, se acabó.",
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
console.log(`i18n gincana 3: ${added} chaves adicionadas`)
