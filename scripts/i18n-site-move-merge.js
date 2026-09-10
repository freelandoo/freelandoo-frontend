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
    sizePad: ["Respiro", "Padding", "Respiro"],
    resizeSectionHeight: [
      "Arraste para apertar ou soltar a seção",
      "Drag to tighten or loosen the section",
      "Arrastra para apretar o soltar la sección",
    ],
  },
}

/** ns → chave → [pt, en, es] — sobrescreve o que estiver lá. */
const OVERRIDE = {
  CommunitySite: {
    resizeHint: [
      "Um clique seleciona a caixa (ou o botão) e trava o texto — arraste para mudar o lugar. Dois cliques abrem o cursor de digitação e as bolinhas dos cantos. Na linha que divide duas seções, arraste para apertar ou soltar a seção.",
      "One click selects the box (or button) and locks its text — drag to move it. Double-click for the typing cursor and the corner handles. On the line dividing two sections, drag to tighten or loosen the section.",
      "Un clic selecciona la caja (o el botón) y bloquea el texto — arrástrala para moverla. Doble clic abre el cursor de escritura y los tiradores de las esquinas. En la línea que divide dos secciones, arrastra para apretar o soltar la sección.",
    ],
    // Estes dois nasceram nesta mesma feature descrevendo o gesto de antes (o
    // texto era editável o tempo todo). Ficam em OVERRIDE porque já entraram
    // nos dicionários no commit anterior, e fill-if-absent não os corrigiria.
    modeMove: [
      "Mover (o texto fica travado)",
      "Move (text stays locked)",
      "Mover (el texto queda bloqueado)",
    ],
    modeSize: [
      "Editar o texto e dimensionar",
      "Edit text and resize",
      "Editar el texto y redimensionar",
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
