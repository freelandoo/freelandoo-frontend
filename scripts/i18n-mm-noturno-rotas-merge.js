// Meu Mundo 3D — Rolê Noturno 2.0 (2026-11-09): ESCOLHA SUA ROTA, as cinco rotas e o que derruba em cada uma.
// Namespace "MeuMundo". Idempotente, fill-if-absent.
// Rodar: node scripts/i18n-mm-noturno-rotas-merge.js
const fs = require("fs")
const path = require("path")

const DIR = path.join(__dirname, "..", "messages")

// [pt, en, es]
const K = {
  rnChooseRoute: ["Escolha sua rota", "Choose your route", "Elige tu ruta"],
  rnPlay: ["JOGAR", "PLAY", "JUGAR"],
  rnRouteBest: ["Recorde de {ride}: {s} pontos · {d} m", "{ride} record: {s} points · {d} m", "Récord en {ride}: {s} puntos · {d} m"],
  rnRouteNoRecord: ["Sem recorde nesta rota ainda", "No record on this route yet", "Aún sin récord en esta ruta"],
  rnLoading: ["Montando a rota…", "Building the route…", "Armando la ruta…"],
  rnChange: ["Trocar rota ou veículo", "Change route or ride", "Cambiar ruta o vehículo"],
  rnRouteForest: ["Floresta Bioluminescente", "Bioluminescent Forest", "Bosque Bioluminiscente"],
  rnRouteCanyon: ["Cânion Flutuante", "Floating Canyon", "Cañón Flotante"],
  rnRouteOrbital: ["Cidade Orbital", "Orbital City", "Ciudad Orbital"],
  rnRouteForge: ["Forja Vulcânica", "Volcanic Forge", "Forja Volcánica"],
  rnRouteFactory: ["Fábrica Industrial", "Industrial Factory", "Fábrica Industrial"],
  rnRouteClassic: ["Cidade Noturna — Clássica", "Night City — Classic", "Ciudad Nocturna — Clásica"],
  rnEnvForest: ["Passarelas entre árvores colossais", "Walkways between colossal trees", "Pasarelas entre árboles colosales"],
  rnEnvCanyon: ["Pista suspensa sobre o mar de nuvens", "A track hanging over a sea of clouds", "Pista suspendida sobre un mar de nubes"],
  rnEnvOrbital: ["Vidro estrutural sobre a megacidade espacial", "Structural glass over the space megacity", "Vidrio estructural sobre la megaciudad espacial"],
  rnEnvForge: ["Forja colossal sobre rios de lava", "A colossal forge over rivers of lava", "Forja colosal sobre ríos de lava"],
  rnEnvFactory: ["Megafábrica noturna em operação", "A night megafactory at full tilt", "Megafábrica nocturna en operación"],
  rnEnvClassic: ["A avenida da madrugada, reta, de sempre", "The late-night avenue, straight, as always", "La avenida de la madrugada, recta, de siempre"],
  rnHeroForest: [
    "Curva em volta da árvore gigante, arco de raízes e a cascata acesa.",
    "A curve around the giant tree, an arch of roots and the glowing waterfall.",
    "Curva alrededor del árbol gigante, arco de raíces y la cascada encendida.",
  ],
  rnHeroCanyon: [
    "Loop ancorado na rocha sobre as nuvens, ilhas e cachoeiras no horizonte.",
    "A loop anchored in the rock above the clouds, islands and waterfalls on the horizon.",
    "Loop anclado en la roca sobre las nubes, islas y cascadas en el horizonte.",
  ],
  rnHeroOrbital: [
    "Curva em volta da torre e o grande loop com o planeta ao fundo.",
    "A curve around the tower and the big loop with the planet behind it.",
    "Curva alrededor de la torre y el gran loop con el planeta de fondo.",
  ],
  rnHeroForge: [
    "A boca da fornalha, a cachoeira de lava e o loop com o vulcão ao fundo.",
    "The furnace mouth, the lava fall and the loop with the volcano behind it.",
    "La boca del horno, la cascada de lava y el loop con el volcán de fondo.",
  ],
  rnHeroFactory: [
    "O corredor dos robôs e o loop monumental sobre as linhas de produção.",
    "The robot corridor and the giant loop above the production lines.",
    "El pasillo de los robots y el loop monumental sobre las líneas de producción.",
  ],
  rnHeroClassic: ["Trânsito, rampas e caminhões — sem curvas nem loops.", "Traffic, ramps and trucks — no curves, no loops.", "Tráfico, rampas y camiones — sin curvas ni loops."],
  rnTagLoop: ["Loop 360°", "360° loop", "Loop 360°"],
  rnTagSpiral: ["Descida em espiral", "Spiral descent", "Bajada en espiral"],
  rnTagBridges: ["Pontes", "Bridges", "Puentes"],
  rnTagBanked: ["Curvas inclinadas", "Banked curves", "Curvas peraltadas"],
  rnTagPortal: ["Portais de descida", "Descent portals", "Portales de bajada"],
  rnTagGlass: ["Pistas de vidro", "Glass tracks", "Pistas de vidrio"],
  rnTagLava: ["Sobre a lava", "Over the lava", "Sobre la lava"],
  rnTagMachines: ["Máquinas", "Machines", "Máquinas"],
  rnTagClimb: ["Subidas", "Climbs", "Subidas"],
  rnTagClassic: ["Clássica", "Classic", "Clásica"],
  rnByForestCar: ["Bateu na carroça!", "Hit the cart!", "¡Chocaste con la carreta!"],
  rnByForestAmb: ["Bateu nos cogumelos gigantes!", "Hit the giant mushrooms!", "¡Chocaste con los hongos gigantes!"],
  rnByForestTruck: ["Bateu no tronco caído!", "Hit the fallen trunk!", "¡Chocaste con el tronco caído!"],
  rnByForestBarrier: ["Tropeçou nos troncos!", "Tripped on the logs!", "¡Tropezaste con los troncos!"],
  rnByForestRamp: ["Caiu da rampa de raízes!", "Fell off the root ramp!", "¡Caíste de la rampa de raíces!"],
  rnByCanyonCar: ["Bateu no vagonete!", "Hit the mine cart!", "¡Chocaste con la vagoneta!"],
  rnByCanyonAmb: ["Bateu na ruína!", "Hit the ruin!", "¡Chocaste con la ruina!"],
  rnByCanyonTruck: ["Bateu no vagão de carga!", "Hit the cargo wagon!", "¡Chocaste con el vagón de carga!"],
  rnByCanyonBarrier: ["Tropeçou na barricada!", "Tripped on the barricade!", "¡Tropezaste con la barricada!"],
  rnByCanyonRamp: ["Caiu da rampa!", "Fell off the ramp!", "¡Caíste de la rampa!"],
  rnByOrbitalCar: ["Bateu na cápsula!", "Hit the pod!", "¡Chocaste con la cápsula!"],
  rnByOrbitalAmb: ["Bateu na comporta!", "Hit the gate!", "¡Chocaste con la compuerta!"],
  rnByOrbitalTruck: ["Bateu no contêiner maglev!", "Hit the maglev container!", "¡Chocaste con el contenedor maglev!"],
  rnByOrbitalBarrier: ["Bateu na barreira de energia!", "Hit the energy barrier!", "¡Chocaste con la barrera de energía!"],
  rnByOrbitalRamp: ["Caiu da rampa de vidro!", "Fell off the glass ramp!", "¡Caíste de la rampa de vidrio!"],
  rnByForgeCar: ["Bateu no vagonete de escória!", "Hit the slag cart!", "¡Chocaste con la vagoneta de escoria!"],
  rnByForgeAmb: ["Bateu na prensa!", "Hit the press!", "¡Chocaste con la prensa!"],
  rnByForgeTruck: ["Bateu nos lingotes!", "Hit the ingots!", "¡Chocaste con los lingotes!"],
  rnByForgeBarrier: ["Bateu na barra em brasa!", "Hit the red-hot bar!", "¡Chocaste con la barra al rojo!"],
  rnByForgeRamp: ["Caiu da rampa!", "Fell off the ramp!", "¡Caíste de la rampa!"],
  rnByFactoryCar: ["Bateu no carrinho automático!", "Hit the automated cart!", "¡Chocaste con el carrito automático!"],
  rnByFactoryAmb: ["Bateu na coluna deslizante!", "Hit the sliding column!", "¡Chocaste con la columna deslizante!"],
  rnByFactoryTruck: ["Bateu na esteira!", "Hit the conveyor!", "¡Chocaste con la cinta transportadora!"],
  rnByFactoryBarrier: ["Bateu na barra deslizante!", "Hit the sliding bar!", "¡Chocaste con la barra deslizante!"],
  rnByFactoryRamp: ["Caiu da rampa!", "Fell off the ramp!", "¡Caíste de la rampa!"],
}

const LOCS = ["pt-BR", "en", "es"]
for (let i = 0; i < LOCS.length; i++) {
  const file = path.join(DIR, `${LOCS[i]}.json`)
  if (!fs.existsSync(file)) continue
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  dict.MeuMundo = dict.MeuMundo || {}
  let n = 0
  for (const [k, v] of Object.entries(K)) {
    if (dict.MeuMundo[k] === undefined) {
      dict.MeuMundo[k] = v[i]
      n++
    }
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
  console.log(LOCS[i], "+", n)
}
