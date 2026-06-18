// Namespace "Composer" — strings novas do carrossel (mode "post", só imagens):
// bandeja de slides, dicas e badge. Idempotente, fill-if-absent. Rodar:
//   node scripts/i18n-carousel-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const COMPOSER = {
  "carousel.badge": ["Carrossel", "Carousel", "Carrusel"],
  "carousel.slide": ["Foto {n}", "Photo {n}", "Foto {n}"],
  "carousel.add": ["Adicionar fotos", "Add photos", "Agregar fotos"],
  "carousel.remove": ["Remover foto", "Remove photo", "Quitar foto"],
  "carousel.moveLeft": ["Mover para a esquerda", "Move left", "Mover a la izquierda"],
  "carousel.moveRight": ["Mover para a direita", "Move right", "Mover a la derecha"],
  "carousel.hintMulti": [
    "Cada foto tem seu próprio corte, filtro e texto.",
    "Each photo has its own crop, filter and text.",
    "Cada foto tiene su propio recorte, filtro y texto.",
  ],
  "carousel.hintAdd": [
    "Toque em + para montar um carrossel (até {max} fotos).",
    "Tap + to build a carousel (up to {max} photos).",
    "Toca + para crear un carrusel (hasta {max} fotos).",
  ],
  "pick.carouselHint": [
    "Dica: escolha várias fotos para montar um carrossel.",
    "Tip: pick several photos to build a carousel.",
    "Consejo: elige varias fotos para crear un carrusel.",
  ],
}

const GROUPS = { Composer: COMPOSER }

function load(file) {
  return JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"))
}
function save(file, obj) {
  fs.writeFileSync(path.join(dir, file), JSON.stringify(obj, null, 2) + "\n", "utf8")
}
function fill(target, ns, key, val) {
  if (!target[ns]) target[ns] = {}
  if (!(key in target[ns])) {
    target[ns][key] = val
    return 1
  }
  return 0
}

for (const [file, idx] of [["pt-BR.json", 0], ["en.json", 1], ["es.json", 2]]) {
  const d = load(file)
  let added = 0
  for (const [ns, group] of Object.entries(GROUPS)) {
    for (const [k, vals] of Object.entries(group)) added += fill(d, ns, k, vals[idx])
  }
  save(file, d)
  console.log(`${file}: +${added} chaves`)
}
