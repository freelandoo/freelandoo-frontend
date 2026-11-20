// Meu Mundo 3D — Gincana (2026-11-20): Comportas (só uma abre por vez, sorteada, 2 s) e Hélices (placas que
// acendem e caem no corredor; cubo que gira rápido ao contrário) — pedidos do Alex.
// Namespace "MeuMundo". Idempotente, fill-if-absent (chaves novas; as antigas ficam para trás).
// Rodar: node scripts/i18n-mm-gincana-comportas-helices-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const MEU_MUNDO = {
  gincanaPhComportasPitch2: [
    "A segunda corrida da Fábrica: fileiras de comportas de aço fechadas, e em cada uma só uma abre por vez, sorteada, por dois segundos. Corra até a aberta, pule as baixas e atravesse a graxa.",
    "The Factory's second race: rows of closed steel gates, and in each row only one opens at a time, at random, for two seconds. Run to the open one, jump the low ones and cross the grease.",
    "La segunda carrera de la Fábrica: filas de compuertas de acero cerradas, y en cada una solo se abre una a la vez, al azar, durante dos segundos. Corre hacia la abierta, salta las bajas y cruza la grasa."
  ],
  gincanaSecCp1b: ["Uma por vez", "One at a time", "Una a la vez"],
  gincanaHowCp1b: [
    "Em cada fileira só UMA comporta abre por vez, sorteada: a luz verde mostra qual. Ela fica 2 s aberta e fecha de repente.",
    "In each row only ONE gate opens at a time, at random: the green light shows which. It stays open for 2 s and slams shut.",
    "En cada fila solo UNA compuerta se abre a la vez, al azar: la luz verde muestra cuál. Queda abierta 2 s y se cierra de golpe."
  ],
  gincanaHowCp4b: [
    "A graxa deixa a corrida na metade: a comporta aberta pode ficar longe demais. Escolha cedo.",
    "The grease halves your speed: the open gate may be too far. Pick early.",
    "La grasa reduce tu carrera a la mitad: la compuerta abierta puede quedar demasiado lejos. Elige pronto."
  ],
  gincanaHowCp5b: [
    "Ficou dentro quando ela fechou? Ela cospe você para fora: espere a próxima abrir.",
    "Caught inside when it shut? It spits you out: wait for the next one to open.",
    "¿Te quedaste dentro cuando se cerró? Te escupe afuera: espera a que se abra la siguiente."
  ],
  gincanaHowHe2b: [
    "No corredor das barras as placas acendem quando você pisa e caem logo depois: pule as barras sem parar.",
    "In the bar corridor the plates light up when you step on them and drop soon after: jump the bars without stopping.",
    "En el pasillo de las barras las placas se encienden al pisarlas y caen poco después: salta las barras sin parar."
  ],
  gincanaHowHe3b: [
    "O cubo gira rápido ao contrário das pás: não fique parado nele, corra para a pá que aponta para a saída.",
    "The hub spins fast against the blades: don't stand still on it, run to the blade pointing at the exit.",
    "El cubo gira rápido al revés de las aspas: no te quedes quieto en él, corre hacia el aspa que apunta a la salida."
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
console.log(`i18n-mm-gincana-comportas-helices: ${added} chaves novas`)
