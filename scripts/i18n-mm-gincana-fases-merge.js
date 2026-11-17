// Meu Mundo 3D — Gincana 2.0 (2026-11-16): 7 fases (a de sempre + uma por Domínio),
// agarrar, subir na beira, portas falsas e classificação (6 de 8).
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-mm-gincana-fases-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  gincanaKicker2: ["Corrida de obstáculos · 7 fases", "Obstacle race · 7 stages", "Carrera de obstáculos · 7 fases"],
  gincanaPitch2: [
    "Oito na largada e só seis classificam: quando a vaga enche, a prova fecha. Caiu? Volta ao último posto e segue.",
    "Eight at the start and only six qualify: once the spots fill up, the race closes. Fell? Back to the last checkpoint and keep going.",
    "Ocho en la salida y solo seis clasifican: cuando se llenan los cupos, la carrera se cierra. ¿Caíste? Vuelves al último puesto y sigues.",
  ],
  gincanaPhases: ["Fases", "Stages", "Fases"],
  gincanaKeys2: [
    "WASD ou setas andam · Espaço pula · Shift ou E mergulha · segure F ou Ctrl para agarrar · arraste para girar a câmera",
    "WASD or arrows move · Space jumps · Shift or E dives · hold F or Ctrl to grab · drag to turn the camera",
    "WASD o flechas para moverse · Espacio salta · Shift o E se lanza · mantén F o Ctrl para agarrar · arrastra para girar la cámara",
  ],
  gincanaTouchHelp2: [
    "Joystick anda · PULAR, MERGULHAR e AGARRAR (segure) na direita · arraste a tela para girar a câmera",
    "Joystick moves · JUMP, DIVE and GRAB (hold) on the right · drag the screen to turn the camera",
    "Joystick para moverse · SALTAR, LANZARSE y AGARRAR (mantén) a la derecha · arrastra la pantalla para girar la cámara",
  ],
  gincanaHintTouch2: ["Joystick anda · PULAR, MERGULHAR e AGARRAR à direita", "Joystick moves · JUMP, DIVE and GRAB on the right", "Joystick para moverse · SALTAR, LANZARSE y AGARRAR a la derecha"],
  gincanaHintKeys2: ["WASD anda · Espaço pula · Shift mergulha · F agarra", "WASD moves · Space jumps · Shift dives · F grabs", "WASD para moverse · Espacio salta · Shift se lanza · F agarra"],
  gincanaGrabBtn: ["Agarrar", "Grab", "Agarrar"],
  gincanaHitPush: ["Empurrado!", "Pushed!", "¡Empujado!"],
  gincanaHitTackle: ["Derrubado por um mergulho!", "Knocked down by a dive!", "¡Derribado por un salto!"],
  gincanaDoorOpen: ["Porta aberta!", "Door open!", "¡Puerta abierta!"],
  gincanaDoorFake: ["Porta falsa!", "Fake door!", "¡Puerta falsa!"],
  gincanaGrab: ["Agarrou!", "Grabbed!", "¡Agarrado!"],
  gincanaHeld: ["Te agarraram!", "Someone grabbed you!", "¡Te agarraron!"],
  gincanaClimb: ["Subiu na beira!", "Climbed the ledge!", "¡Subiste al borde!"],
  gincanaEliminated: ["Eliminado: a vaga encheu!", "Eliminated: the spots filled up!", "Eliminado: ¡se llenaron los cupos!"],
  gincanaQualified: ["Classificados {n}/{q}", "Qualified {n}/{q}", "Clasificados {n}/{q}"],
  gincanaHeldNow: ["Segurado!", "Held!", "¡Sujetado!"],
  gincanaGrabbingNow: ["Agarrando", "Grabbing", "Agarrando"],
  gincanaOut: ["Eliminado! A vaga encheu antes", "Eliminated! The spots filled up first", "¡Eliminado! Los cupos se llenaron antes"],
  gincanaQualifiedTag: ["Classificado", "Qualified", "Clasificado"],
  gincanaEliminatedTag: ["Eliminado", "Eliminated", "Eliminado"],

  // fases
  gincanaPhCidade: ["Canal da Cidade", "City Canal", "Canal de la Ciudad"],
  gincanaDomCidade: ["A cidade", "The city", "La ciudad"],
  gincanaPhCidadePitch: [
    "A prova de sempre sobre o canal: carrossel, passarelas, luvas, xadrez e a subida.",
    "The classic race over the canal: carousel, catwalks, gloves, checkers and the climb.",
    "La carrera de siempre sobre el canal: carrusel, pasarelas, guantes, ajedrez y la subida.",
  ],
  gincanaPhFloresta: ["Floresta da Lua", "Moon Forest", "Bosque de la Luna"],
  gincanaDomFloresta: ["Domínio da Floresta", "Forest Domain", "Dominio del Bosque"],
  gincanaPhFlorestaPitch: [
    "Cogumelos que lançam, raízes que giram e portas de cipó: só algumas abrem.",
    "Launching mushrooms, spinning roots and vine doors: only some of them open.",
    "Hongos que lanzan, raíces que giran y puertas de lianas: solo algunas abren.",
  ],
  gincanaSecFl1: ["Cogumelos", "Mushrooms", "Hongos"],
  gincanaSecFl2: ["Raízes", "Roots", "Raíces"],
  gincanaSecFl3: ["Portas de cipó", "Vine doors", "Puertas de lianas"],
  gincanaSecFl4: ["Ponte de folhas", "Leaf bridge", "Puente de hojas"],
  gincanaSecFl5: ["Troncos", "Logs", "Troncos"],
  gincanaHowFl1: ["Pule no primeiro cogumelo: eles lançam você para o próximo.", "Jump onto the first mushroom: they launch you to the next one.", "Salta al primer hongo: te lanzan al siguiente."],
  gincanaHowFl2: ["Raízes giram rente ao chão: pule na hora certa.", "Roots spin close to the floor: jump at the right time.", "Las raíces giran a ras del suelo: salta en el momento justo."],
  gincanaHowFl3: ["Só algumas portas abrem: siga quem já passou.", "Only some doors open: follow whoever got through.", "Solo algunas puertas abren: sigue a quien ya pasó."],
  gincanaHowFl4: ["As folhas caem logo depois que alguém pisa.", "The leaves drop right after someone steps on them.", "Las hojas caen justo después de que alguien las pisa."],
  gincanaHowFl5: ["Troncos rolam ladeira abaixo: desvie até o topo.", "Logs roll downhill: dodge your way to the top.", "Los troncos ruedan cuesta abajo: esquívalos hasta la cima."],
  gincanaPhCanion: ["Cânion Flutuante", "Floating Canyon", "Cañón Flotante"],
  gincanaDomCanion: ["Domínio do Cânion", "Canyon Domain", "Dominio del Cañón"],
  gincanaPhCanionPitch: [
    "Pedras que flutuam de um lado para o outro sobre o abismo, pêndulos e portões que empurram.",
    "Rocks floating side to side over the abyss, pendulums and pushing gates.",
    "Rocas que flotan de un lado a otro sobre el abismo, péndulos y portones que empujan.",
  ],
  gincanaSecCa1: ["Pedras flutuantes", "Floating rocks", "Rocas flotantes"],
  gincanaSecCa2: ["Pêndulos de pedra", "Stone pendulums", "Péndulos de piedra"],
  gincanaSecCa3: ["Portões", "Gates", "Portones"],
  gincanaSecCa4: ["Desfiladeiro", "Gorge", "Desfiladero"],
  gincanaSecCa5: ["Avalanche", "Avalanche", "Avalancha"],
  gincanaHowCa1: ["As pedras andam de lado: espere a próxima chegar e pule.", "The rocks slide sideways: wait for the next one and jump.", "Las rocas se mueven de lado: espera a la siguiente y salta."],
  gincanaHowCa2: ["Duas pontes, pêndulos de pedra: espere passar.", "Two bridges, stone pendulums: wait for them to pass.", "Dos puentes, péndulos de piedra: espera a que pasen."],
  gincanaHowCa3: ["Os portões deslizam e empurram para o abismo.", "The gates slide and push you into the abyss.", "Los portones se deslizan y empujan al abismo."],
  gincanaHowCa4: ["Vigas em zigue-zague e pistões de rocha dos lados.", "Zigzag beams and rock pistons from the sides.", "Vigas en zigzag y pistones de roca a los lados."],
  gincanaHowCa5: ["Pedras rolam ladeira abaixo: desvie até o topo.", "Boulders roll downhill: dodge your way to the top.", "Las rocas ruedan cuesta abajo: esquívalas hasta la cima."],
  gincanaPhOrbital: ["Cidade Orbital", "Orbital City", "Ciudad Orbital"],
  gincanaDomOrbital: ["Domínio Orbital", "Orbital Domain", "Dominio Orbital"],
  gincanaPhOrbitalPitch: [
    "Esteiras para trás, anéis que giram e hexágonos que somem debaixo dos pés.",
    "Backward conveyors, spinning rings and hexagons that vanish under your feet.",
    "Cintas hacia atrás, anillos que giran y hexágonos que desaparecen bajo tus pies.",
  ],
  gincanaSecOr1: ["Esteiras", "Conveyors", "Cintas"],
  gincanaSecOr2: ["Anéis giratórios", "Spinning rings", "Anillos giratorios"],
  gincanaSecOr3: ["Hexágonos", "Hexagons", "Hexágonos"],
  gincanaSecOr4: ["Barreiras de energia", "Energy barriers", "Barreras de energía"],
  gincanaSecOr5: ["Esferas", "Spheres", "Esferas"],
  gincanaHowOr1: ["A esteira puxa para trás: corra e desvie das caixas.", "The conveyor pulls you back: run and dodge the crates.", "La cinta te tira hacia atrás: corre y esquiva las cajas."],
  gincanaHowOr2: ["Os anéis giram e levam você junto: mire no meio.", "The rings spin and carry you along: aim for the middle.", "Los anillos giran y te llevan: apunta al centro."],
  gincanaHowOr3: ["O hexágono some logo depois que alguém pisa.", "The hexagon vanishes right after someone steps on it.", "El hexágono desaparece justo después de que alguien lo pisa."],
  gincanaHowOr4: ["Barras de energia giram e blocos deslizam: pule e espere.", "Energy bars spin and blocks slide: jump and wait.", "Barras de energía giran y bloques se deslizan: salta y espera."],
  gincanaHowOr5: ["Esferas descem a rampa: desvie até o topo.", "Spheres roll down the ramp: dodge your way to the top.", "Las esferas bajan la rampa: esquívalas hasta la cima."],
  gincanaPhForja: ["Forja de Kragor", "Kragor's Forge", "Forja de Kragor"],
  gincanaDomForja: ["Domínio da Forja", "Forge Domain", "Dominio de la Forja"],
  gincanaPhForjaPitch: [
    "Martelos, pistões dos dois lados e esteiras de lado sobre a lava.",
    "Hammers, pistons on both sides and sideways conveyors over the lava.",
    "Martillos, pistones a ambos lados y cintas laterales sobre la lava.",
  ],
  gincanaSecFo1: ["Martelos", "Hammers", "Martillos"],
  gincanaSecFo2: ["Pistões", "Pistons", "Pistones"],
  gincanaSecFo3: ["Esteiras de lava", "Lava conveyors", "Cintas de lava"],
  gincanaSecFo4: ["Grade que cai", "Falling grate", "Rejilla que cae"],
  gincanaSecFo5: ["Rochas derretidas", "Molten rocks", "Rocas fundidas"],
  gincanaHowFo1: ["Martelos balançam de lado: espere passar.", "Hammers swing sideways: wait for them to pass.", "Los martillos se balancean de lado: espera a que pasen."],
  gincanaHowFo2: ["Pistões socam dos dois lados ao mesmo tempo.", "Pistons punch from both sides at once.", "Los pistones golpean de ambos lados a la vez."],
  gincanaHowFo3: ["As esteiras empurram para a lava: corra contra.", "The conveyors push you toward the lava: run against them.", "Las cintas empujan hacia la lava: corre en contra."],
  gincanaHowFo4: ["A grade cai logo depois que alguém pisa.", "The grate drops right after someone steps on it.", "La rejilla cae justo después de que alguien la pisa."],
  gincanaHowFo5: ["Rochas derretidas descem a rampa: desvie até o topo.", "Molten rocks roll down the ramp: dodge your way to the top.", "Las rocas fundidas bajan la rampa: esquívalas hasta la cima."],
  gincanaPhFabrica: ["Fábrica de Engrenagens", "Gear Factory", "Fábrica de Engranajes"],
  gincanaDomFabrica: ["Domínio da Fábrica", "Factory Domain", "Dominio de la Fábrica"],
  gincanaPhFabricaPitch: [
    "Esteira das prensas, engrenagens que giram, portas de aço e prensas deslizantes.",
    "The press conveyor, spinning gears, steel doors and sliding presses.",
    "La cinta de las prensas, engranajes que giran, puertas de acero y prensas deslizantes.",
  ],
  gincanaSecFa1: ["Esteira das prensas", "Press conveyor", "Cinta de prensas"],
  gincanaSecFa2: ["Engrenagens", "Gears", "Engranajes"],
  gincanaSecFa3: ["Portas de aço", "Steel doors", "Puertas de acero"],
  gincanaSecFa4: ["Prensas deslizantes", "Sliding presses", "Prensas deslizantes"],
  gincanaSecFa5: ["Barris", "Barrels", "Barriles"],
  gincanaHowFa1: ["A esteira puxa para trás e as prensas socam dos lados.", "The conveyor pulls you back and the presses punch from the sides.", "La cinta tira hacia atrás y las prensas golpean de los lados."],
  gincanaHowFa2: ["As engrenagens giram e levam você junto.", "The gears spin and carry you along.", "Los engranajes giran y te llevan."],
  gincanaHowFa3: ["Só algumas portas abrem: siga quem já passou.", "Only some doors open: follow whoever got through.", "Solo algunas puertas abren: sigue a quien ya pasó."],
  gincanaHowFa4: ["As prensas deslizam de lado: passe na brecha.", "The presses slide sideways: slip through the gap.", "Las prensas se deslizan de lado: pasa por el hueco."],
  gincanaHowFa5: ["Barris descem a rampa: desvie até o topo.", "Barrels roll down the ramp: dodge your way to the top.", "Los barriles bajan la rampa: esquívalos hasta la cima."],
  gincanaPhGelo: ["Mar de Gelo", "Ice Sea", "Mar de Hielo"],
  gincanaDomGelo: ["Domínio do Mar de Gelo", "Ice Sea Domain", "Dominio del Mar de Hielo"],
  gincanaPhGeloPitch: [
    "Lago que escorrega, estalactites, placas de gelo que andam e gelo fino.",
    "A slippery lake, icicles, drifting ice floes and thin ice.",
    "Un lago resbaladizo, estalactitas, placas de hielo que se mueven y hielo fino.",
  ],
  gincanaSecGe1: ["Lago escorregadio", "Slippery lake", "Lago resbaladizo"],
  gincanaSecGe2: ["Estalactites", "Icicles", "Estalactitas"],
  gincanaSecGe3: ["Placas de gelo", "Ice floes", "Placas de hielo"],
  gincanaSecGe4: ["Gelo fino", "Thin ice", "Hielo fino"],
  gincanaSecGe5: ["Bolas de neve", "Snowballs", "Bolas de nieve"],
  gincanaHowGe1: ["No gelo você escorrega: solte cedo para parar.", "You slide on the ice: let go early to stop.", "En el hielo resbalas: suelta antes para frenar."],
  gincanaHowGe2: ["Estalactites balançam sobre as pontes: espere passar.", "Icicles swing over the bridges: wait for them to pass.", "Las estalactitas se balancean sobre los puentes: espera a que pasen."],
  gincanaHowGe3: ["As placas andam de lado: espere a próxima chegar.", "The floes slide sideways: wait for the next one.", "Las placas se mueven de lado: espera a la siguiente."],
  gincanaHowGe4: ["O gelo fino quebra logo depois que alguém pisa.", "Thin ice breaks right after someone steps on it.", "El hielo fino se rompe justo después de que alguien lo pisa."],
  gincanaHowGe5: ["Bolas de neve descem a rampa: desvie até o topo.", "Snowballs roll down the ramp: dodge your way to the top.", "Las bolas de nieve bajan la rampa: esquívalas hasta la cima."],
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
console.log(`i18n gincana 2.0 (fases): ${added} chaves adicionadas`)
