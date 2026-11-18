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
  // G3-13 Coroa da Torre (a final)
  gincanaKicker10: ["Party game · 10 provas diferentes", "Party game · 10 different events", "Party game · 10 pruebas diferentes"],
  gincanaPitch10: [
    "Oito jogadores e uma prova diferente em cada fase: corrida, sobrevivência, coleta, memória e a final da coroa. Só a vaga classifica.",
    "Eight players and a different event in each stage: race, survival, collecting, memory and the crown final. Only the open spots qualify.",
    "Ocho jugadores y una prueba diferente en cada fase: carrera, supervivencia, recolección, memoria y la final de la corona. Solo los cupos clasifican.",
  ],
  gincanaShow: ["Programa completo", "Full show", "Programa completo"],
  gincanaShowSub: ["4 rodadas sorteadas até a final da coroa · contra o computador", "4 random rounds up to the crown final · against the computer", "4 rondas sorteadas hasta la final de la corona · contra la computadora"],
  gincanaShowRound: ["Rodada {n} de {m}", "Round {n} of {m}", "Ronda {n} de {m}"],
  gincanaShowNext: ["Próxima rodada", "Next round", "Siguiente ronda"],
  gincanaShowChampion: ["Campeão da Gincana! A coroa é sua.", "Gincana champion! The crown is yours.", "¡Campeón de la Gincana! La corona es tuya."],
  gincanaShowOver: [
    "Fim do programa na rodada {n}. Tente de novo: as provas são sorteadas outra vez.",
    "The show ends in round {n}. Try again: the events are drawn again.",
    "Fin del programa en la ronda {n}. Inténtalo de nuevo: las pruebas se sortean otra vez.",
  ],
  gincanaPhCoroa: ["Torre da Coroa", "Crown Tower", "Torre de la Corona"],
  gincanaEvCoroa: ["Coroa da Torre", "Tower Crown", "Corona de la Torre"],
  gincanaPhCoroaPitch: [
    "A final: só um vence. Suba a rampa das bolas, passe os martelos e os portões que giram, cruze os ladrilhos e pule para pegar a coroa no alto da torre.",
    "The final: only one wins. Climb the ball ramp, get past the hammers and the spinning gates, cross the tiles and jump to grab the crown at the top of the tower.",
    "La final: solo uno gana. Sube la rampa de las bolas, pasa los martillos y los portones que giran, cruza las baldosas y salta para tomar la corona en lo alto de la torre.",
  ],
  gincanaSecCr1: ["Rampa das bolas", "Ball ramp", "Rampa de las bolas"],
  gincanaSecCr2: ["Martelos", "Hammers", "Martillos"],
  gincanaSecCr3: ["Portões", "Gates", "Portones"],
  gincanaSecCr4: ["Ladrilhos", "Tiles", "Baldosas"],
  gincanaSecCr5: ["A coroa", "The crown", "La corona"],
  gincanaHowCr1: ["Bolas descem a rampa pelas cinco faixas: troque de faixa e não pare.", "Balls roll down the ramp in five lanes: switch lanes and keep moving.", "Las bolas bajan la rampa por cinco carriles: cambia de carril y no te detengas."],
  gincanaHowCr2: ["Martelos balançam dos dois lados: passe quando o seu voltar.", "Hammers swing on both sides: go when yours swings back.", "Los martillos se balancean a ambos lados: pasa cuando el tuyo vuelva."],
  gincanaHowCr3: ["Os portões giram com duas barras rente ao chão: pule na hora certa.", "The gates spin with two bars low to the floor: jump at the right moment.", "Los portones giran con dos barras al ras del suelo: salta en el momento justo."],
  gincanaHowCr4: ["Os ladrilhos caem depois que alguém pisa: não pare em cima.", "The tiles drop after someone steps on them: don't stop on top.", "Las baldosas caen después de que alguien las pisa: no te detengas encima."],
  gincanaHowCr5: ["A coroa fica no alto: só ganha quem PULA e pega. Uma vaga só.", "The crown sits up high: only whoever JUMPS and grabs it wins. One spot only.", "La corona está en lo alto: solo gana quien SALTA y la toma. Un solo lugar."],
  // G3-12 Feira Rolante
  gincanaPhFeira: ["Feira do Centro", "Downtown Market", "Mercado del Centro"],
  gincanaEvFeira: ["Feira Rolante", "Rolling Market", "Mercado Rodante"],
  gincanaPhFeiraPitch: [
    "Esteiras fortes na feira: a rampa desce contra você e as barracas soltam melancias. Depois, mão dupla, martelos e esteiras de lado.",
    "Strong conveyors at the market: the ramp runs down against you and the stalls drop watermelons. Then two-way belts, hammers and sideways belts.",
    "Cintas fuertes en el mercado: la rampa baja contra ti y los puestos sueltan sandías. Después, doble sentido, martillos y cintas de lado.",
  ],
  gincanaSecFr1: ["Rampa rolante", "Rolling ramp", "Rampa rodante"],
  gincanaSecFr2: ["Mão dupla", "Two-way", "Doble sentido"],
  gincanaSecFr3: ["Martelos", "Hammers", "Martillos"],
  gincanaSecFr4: ["Esteiras de lado", "Sideways belts", "Cintas de lado"],
  gincanaSecFr5: ["Subida", "Climb", "Subida"],
  gincanaHowFr1: ["A rampa é uma esteira que desce: não pare. Melancias rolam pelas faixas.", "The ramp is a conveyor running down: don't stop. Watermelons roll down the lanes.", "La rampa es una cinta que baja: no te detengas. Las sandías ruedan por los carriles."],
  gincanaHowFr2: [
    "Uma esteira leva para a frente, a outra para trás. As prensas empurram para a de trás.",
    "One belt carries you forward, the other back. The presses push you onto the back one.",
    "Una cinta te lleva hacia adelante, la otra hacia atrás. Las prensas te empujan a la de atrás.",
  ],
  gincanaHowFr3: ["Martelos balançam no caminho: passe quando o seu voltar.", "Hammers swing across the path: go when yours swings back.", "Los martillos se balancean en el camino: pasa cuando el tuyo vuelva."],
  gincanaHowFr4: ["Cada faixa puxa para um lado: corra reto e corrija.", "Each strip pulls you to one side: run straight and correct.", "Cada franja tira hacia un lado: corre recto y corrige."],
  gincanaHowFr5: ["A última subida leva à chegada.", "The last climb leads to the finish.", "La última subida lleva a la meta."],
  // G3-11 Cidade: Portas da Prefeitura (o nome muda pelo OVERRIDE)
  gincanaPhCidadePitch3: [
    "A corrida de abertura: fileiras de portas da Prefeitura (só algumas abrem), o carrossel, pêndulos e a subida com barris.",
    "The opening race: rows of City Hall doors (only some open), the carousel, pendulums and the climb with barrels.",
    "La carrera de apertura: filas de puertas del Ayuntamiento (solo algunas abren), el carrusel, péndulos y la subida con barriles.",
  ],
  gincanaSecPp1: ["Portas", "Doors", "Puertas"],
  gincanaSecPp2: ["Carrossel", "Carousel", "Carrusel"],
  gincanaSecPp3: ["Mais portas", "More doors", "Más puertas"],
  gincanaSecPp4: ["Pêndulos", "Pendulums", "Péndulos"],
  gincanaSecPp5: ["Subida", "Climb", "Subida"],
  gincanaHowPp1: [
    "Só algumas portas abrem: as falsas são parede. Quem passa primeiro mostra o caminho.",
    "Only some doors open: the fake ones are walls. Whoever gets through first shows the way.",
    "Solo algunas puertas abren: las falsas son pared. Quien pasa primero muestra el camino.",
  ],
  gincanaHowPp2: ["O carrossel tem duas barras rente ao chão: pule na hora certa.", "The carousel has two bars low to the ground: jump at the right time.", "El carrusel tiene dos barras a ras del suelo: salta en el momento justo."],
  gincanaHowPp3: ["Nas últimas fileiras abrem menos portas. Bateu? Tente a vizinha.", "Fewer doors open in the last rows. Bumped? Try the next one.", "En las últimas filas abren menos puertas. ¿Chocaste? Prueba la de al lado."],
  gincanaHowPp4: ["Vigas estreitas e bolas de pêndulo: espere a bola passar.", "Narrow beams and pendulum balls: wait for the ball to pass.", "Vigas estrechas y bolas de péndulo: espera a que pase la bola."],
  gincanaHowPp5: ["Barris descem a rampa: desvie até o topo.", "Barrels roll down the ramp: dodge your way to the top.", "Los barriles bajan por la rampa: esquívalos hasta la cima."],
  // G3-10 Relógio da Praça (memória)
  gincanaPhRelogio: ["Praça do Relógio", "Clock Square", "Plaza del Reloj"],
  gincanaEvRelogio: ["Relógio da Praça", "Square Clock", "Reloj de la Plaza"],
  gincanaPhRelogioPitch: [
    "Decore os símbolos dos ladrilhos: o relógio da torre chama um e todos os outros caem. Quem cai está fora.",
    "Memorize the symbols on the tiles: the tower clock calls one and all the others drop. Whoever falls is out.",
    "Memoriza los símbolos de las baldosas: el reloj de la torre llama uno y todas las demás caen. Quien cae queda fuera.",
  ],
  gincanaSecRl1: ["Decore", "Memorize", "Memoriza"],
  gincanaSecRl2: ["O relógio", "The clock", "El reloj"],
  gincanaSecRl3: ["Corra", "Run", "Corre"],
  gincanaSecRl4: ["Rodadas", "Rounds", "Rondas"],
  gincanaSecRl5: ["O canal", "The canal", "El canal"],
  gincanaHowRl1: ["Os ladrilhos mostram seis símbolos por alguns segundos e apagam.", "The tiles show six symbols for a few seconds and then go dark.", "Las baldosas muestran seis símbolos unos segundos y se apagan."],
  gincanaHowRl2: ["O relógio da torre (e a tela) chama um símbolo.", "The tower clock (and the screen) calls one symbol.", "El reloj de la torre (y la pantalla) llama un símbolo."],
  gincanaHowRl3: ["Corra para um ladrilho daquele símbolo: os outros caem.", "Run to a tile with that symbol: the others drop.", "Corre a una baldosa con ese símbolo: las demás caen."],
  gincanaHowRl4: ["A cada rodada os símbolos trocam de lugar e o tempo encurta.", "Every round the symbols move around and the time gets shorter.", "En cada ronda los símbolos cambian de lugar y el tiempo se acorta."],
  gincanaHowRl5: ["Caiu no canal? Está fora. Sobrando só a vaga, acabou.", "Fell into the canal? You are out. When only the spots are left, it is over.", "¿Caíste al canal? Quedas fuera. Cuando solo quedan los cupos, se acabó."],
  gincanaMemShow: ["Decore os símbolos!", "Memorize the symbols!", "¡Memoriza los símbolos!"],
  gincanaMemHide: ["Atenção…", "Get ready…", "Atención…"],
  gincanaMemCall: ["O relógio chama:", "The clock calls:", "El reloj llama:"],
  gincanaMemRound: ["Rodada {n}", "Round {n}", "Ronda {n}"],
  // G3-9 Gelo: Rolo de Gelo (troca o Rei do Iceberg da G3-6; o nome muda pelo OVERRIDE)
  gincanaPhGeloPitch4: [
    "Seis anéis de gelo giram sob os seus pés, cada um para um lado e cada vez mais rápido. Os buracos passam: quem cai no mar está fora.",
    "Six rings of ice spin under your feet, each one a different way and faster and faster. The holes come around: whoever falls into the sea is out.",
    "Seis anillos de hielo giran bajo tus pies, cada uno hacia un lado y cada vez más rápido. Los agujeros pasan: quien cae al mar queda fuera.",
  ],
  gincanaSecGr1: ["Anéis", "Rings", "Anillos"],
  gincanaSecGr2: ["Buracos", "Holes", "Agujeros"],
  gincanaSecGr3: ["Giro", "Spin", "Giro"],
  gincanaSecGr4: ["Vizinhos", "Neighbors", "Vecinos"],
  gincanaSecGr5: ["Mar gelado", "Icy sea", "Mar helado"],
  gincanaHowGr1: ["O rolo é feito de seis anéis; cada um gira para um lado.", "The roller is made of six rings; each one spins a different way.", "El rodillo tiene seis anillos; cada uno gira hacia un lado."],
  gincanaHowGr2: ["Os buracos dão a volta e passam por cima: pule ou mude de anel antes.", "The holes come around over the top: jump or switch rings first.", "Los agujeros dan la vuelta y pasan por arriba: salta o cambia de anillo antes."],
  gincanaHowGr3: ["O giro arrasta você de lado e fica mais rápido com o tempo.", "The spin drags you sideways and gets faster over time.", "El giro te arrastra de lado y se acelera con el tiempo."],
  gincanaHowGr4: ["Mergulhe em quem está perto para jogá-lo num buraco.", "Dive into whoever is close to knock them into a hole.", "Lánzate contra quien esté cerca para tirarlo a un agujero."],
  gincanaHowGr5: ["Caiu no mar gelado? Está fora. Sobrando só a vaga, acabou.", "Fell into the icy sea? You are out. When only the spots are left, it is over.", "¿Caíste al mar helado? Quedas fuera. Cuando solo quedan los cupos, se acabó."],
  // G3-5 Fábrica: Caça às Engrenagens
  gincanaEvFabrica: ["Caça às Engrenagens", "Gear Hunt", "Caza de Engranajes"],
  gincanaPhFabricaPitch3: [
    "Engrenagens aparecem pela fábrica entre esteiras e prensas: pegue mais que os outros em 75 segundos.",
    "Gears pop up around the factory between conveyors and presses: grab more than everyone else in 75 seconds.",
    "Aparecen engranajes por la fábrica entre cintas y prensas: atrapa más que los demás en 75 segundos.",
  ],
  gincanaSecFg1: ["Engrenagem", "Gear", "Engranaje"],
  gincanaSecFg2: ["Dourada", "Golden", "Dorado"],
  gincanaSecFg3: ["Esteiras", "Conveyors", "Cintas"],
  gincanaSecFg4: ["Prensas", "Presses", "Prensas"],
  gincanaSecFg5: ["Óleo", "Oil", "Aceite"],
  gincanaHowFg1: ["Cada engrenagem vale 1 e volta 7 segundos depois de pega.", "Each gear is worth 1 and comes back 7 seconds after it's taken.", "Cada engranaje vale 1 y vuelve 7 segundos después de tomarlo."],
  gincanaHowFg2: ["A dourada, no alto do meio, vale 3: pule para pegar.", "The golden one, up in the middle, is worth 3: jump to grab it.", "El dorado, arriba en el centro, vale 3: salta para tomarlo."],
  gincanaHowFg3: ["As esteiras levam você junto, cada uma para um lado.", "The conveyors carry you along, each one a different way.", "Las cintas te llevan, cada una hacia un lado."],
  gincanaHowFg4: [
    "As prensas deslizam de lado e derrubam quem está no caminho.",
    "The presses slide sideways and knock down whoever is in the way.",
    "Las prensas se deslizan de lado y derriban a quien esté en el camino.",
  ],
  gincanaHowFg5: [
    "Caiu no óleo? Volta ao meio, só perdeu tempo. Classifica a metade de cima.",
    "Fell into the oil? Back to the middle, you only lost time. The top half qualifies.",
    "¿Caíste al aceite? Vuelves al centro, solo perdiste tiempo. Clasifica la mitad de arriba.",
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

// valor que mudou (fatia nova sobre fatia velha): sobrescreve
const OVERRIDE = {
  gincanaEvGelo: ["Rolo de Gelo", "Ice Roller", "Rodillo de Hielo"],
  gincanaEvCidade: ["Portas da Prefeitura", "City Hall Doors", "Puertas del Ayuntamiento"],
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
  for (const [key, vals] of Object.entries(OVERRIDE)) {
    if (json.MeuMundo[key] !== vals[i]) {
      json.MeuMundo[key] = vals[i]
      added++
    }
  }
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n")
}
console.log(`i18n gincana 3: ${added} chaves adicionadas`)
