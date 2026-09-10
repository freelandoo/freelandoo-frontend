// scripts/i18n-site-move-merge.js
// Construtor de site: a caixa de texto passou a ser ARRASTÁVEL (um clique
// seleciona e arrasta o lugar; dois cliques — ou a pizca de dois dedos —
// abrem as bolinhas dos cantos, que mudam o tamanho).
//
// Duas metades:
//   MERGE (fill-if-absent) — as chaves novas do painel de posição;
//   OVERRIDE — `resizeHint`, que JÁ EXISTE nos três dicionários descrevendo o
//   gesto ANTIGO ("clique num texto para ver as bolinhas"). Como dicionário
//   VENCE fallback inline, trocar só o texto no componente não mudaria nada na
//   tela — a dica seguiria ensinando um gesto que não é mais o que acontece.
//
// Idempotente: rodar de novo não muda mais nada.
const fs = require("fs")
const path = require("path")

const DIR = path.join(__dirname, "..", "messages")
const LOCALES = ["pt-BR", "en", "es"]

/** ns → chave → [pt, en, es] — só entram se a chave AINDA NÃO existir. */
const MERGE = {
  CommunitySite: {
    posX: ["Horizontal", "Horizontal", "Horizontal"],
    posY: ["Vertical", "Vertical", "Vertical"],
    sizeTitleMove: ["Posição da caixa", "Box position", "Posición de la caja"],
    modeMove: [
      "Mover (arraste a caixa)",
      "Move (drag the box)",
      "Mover (arrastra la caja)",
    ],
    modeSize: [
      "Dimensionar (ou dois cliques na caixa)",
      "Resize (or double-click the box)",
      "Redimensionar (o doble clic en la caja)",
    ],
  },
}

/** ns → chave → [pt, en, es] — sobrescreve o que estiver lá. */
const OVERRIDE = {
  CommunitySite: {
    resizeHint: [
      "Clique num texto para selecionar e arraste para mudar o lugar. Dois cliques (ou dois dedos, no celular) abrem as bolinhas dos cantos, que mudam o tamanho.",
      "Click a text to select it, then drag to move it. Double-click (or pinch with two fingers on mobile) to bring up the corner handles, which change the size.",
      "Haz clic en un texto para seleccionarlo y arrástralo para moverlo. Doble clic (o dos dedos, en el móvil) abre los tiradores de las esquinas, que cambian el tamaño.",
    ],
  },
}

let added = 0
let changed = 0

LOCALES.forEach((loc, i) => {
  const file = path.join(DIR, `${loc}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))

  for (const [ns, keys] of Object.entries(MERGE)) {
    dict[ns] = dict[ns] || {}
    for (const [key, values] of Object.entries(keys)) {
      if (dict[ns][key] === undefined) {
        dict[ns][key] = values[i]
        added++
      }
    }
  }

  for (const [ns, keys] of Object.entries(OVERRIDE)) {
    dict[ns] = dict[ns] || {}
    for (const [key, values] of Object.entries(keys)) {
      if (dict[ns][key] !== values[i]) {
        dict[ns][key] = values[i]
        changed++
      }
    }
  }

  fs.writeFileSync(file, `${JSON.stringify(dict, null, 2)}\n`, "utf8")
})

console.log(`i18n-site-move-merge: ${added} chaves adicionadas, ${changed} sobrescritas`)
