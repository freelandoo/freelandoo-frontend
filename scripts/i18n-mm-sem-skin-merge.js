// Meu Mundo (25/11/2026): NÃO EXISTE SKIN — cada personagem é um ser com certidão, vida e
// personalidade próprias (pedido do Alex). Este script, idempotente:
//   • ADICIONA as chaves novas (cdOriginFounder, ibGiftCapsule);
//   • SOBRESCREVE (OVERRIDE) os textos que ainda falavam em skin/vestuário;
//   • APAGA as chaves do antigo vestuário de skins (nenhum código usa mais).
// Rodar: node scripts/i18n-mm-sem-skin-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")
const IDX = { "pt-BR.json": 0, "en.json": 1, "es.json": 2 }

const ADD = {
  cdOriginFounder: ["Personagem fundador", "Founding character", "Personaje fundador"],
  ibGiftCapsule: [
    "Recebido · personagem novo na sua cápsula (STATUS → Personagens).",
    "Received · a new character in your capsule (STATUS → Characters).",
    "Recibido · personaje nuevo en tu cápsula (STATUS → Personajes).",
  ],
}

const OVERRIDE = {
  quest_arma_why: [
    "Aurion entrega a espada aos vampiros e o cajado às raposas. Cada personagem nasce com o corpo e os golpes dele; a classe decide a arma.",
    "Aurion gives the sword to vampires and the staff to foxes. Each character is born with its own body and moves; your class decides the weapon.",
    "Aurion entrega la espada a los vampiros y el bastón a los zorros. Cada personaje nace con su cuerpo y sus golpes; la clase decide el arma.",
  ],
  ibGiftOwned: ["Você já tinha.", "You already had it.", "Ya lo tenías."],
}

// chaves do vestuário (mm3d-16/36) e do histórico de compra de skin — sem uso no código
const DROP_RE = /^(skin[A-Z_].*|stSkin|evSkinAcquired|evSkinAcquiredFree|itSkinGift|itSkinOwned|itSkinsMoved|itWear|itWearing|itWearingNow|itGroupWardrobe|ibGiftWardrobe|ntColorsTitle|ntColorsLine|cdOriginSkin)$/
const DROP_SERVER = ["Skin não encontrada", "Você ainda não tem essa skin"]

for (const [file, i] of Object.entries(IDX)) {
  const p = path.join(dir, file)
  const d = JSON.parse(fs.readFileSync(p, "utf8"))
  const mm = d.MeuMundo || (d.MeuMundo = {})
  let added = 0, changed = 0, dropped = 0
  for (const [k, v] of Object.entries(ADD)) if (!(k in mm)) (mm[k] = v[i]), added++
  for (const [k, v] of Object.entries(OVERRIDE)) if (mm[k] !== v[i]) (mm[k] = v[i]), changed++
  for (const k of Object.keys(mm)) if (DROP_RE.test(k)) delete mm[k], dropped++
  const srv = d.MeuMundoServer || {}
  for (const k of DROP_SERVER) if (k in srv) delete srv[k], dropped++
  fs.writeFileSync(p, JSON.stringify(d, null, 2) + "\n", "utf8")
  console.log(`${file}: +${added} ~${changed} -${dropped}`)
}
