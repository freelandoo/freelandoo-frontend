// Meu Mundo (25/11/2026): NÃO EXISTE SKIN, 2ª passada — todos ficam adultos (deuses, Ciborgue e Dama
// das Garras ganharam o corpo jovem, como a raposa e o vampiro). Este script, idempotente:
//   • RENOMEIA o tópico das falas "see_monster_skin" → "see_monster_char" (o personagem que viu alguém
//     jogando com um monstro): as chaves bt_see_monster_skin_* viram bt_see_monster_char_*, no mesmo
//     lugar e com o mesmo texto (troca de texto, preserva CRLF e a ordem). Nenhum texto novo para traduzir.
// Rodar: node scripts/i18n-mm-jovens-merge.js
const fs = require("fs")
const path = require("path")

const root = path.join(__dirname, "..")
const FILES = ["messages/pt-BR.json", "messages/en.json", "messages/es.json", "features/meu-mundo/ui/inbox/banter-text.json"]
const FROM = /"bt_see_monster_skin_/g
const TO = '"bt_see_monster_char_'

for (const rel of FILES) {
  const p = path.join(root, rel)
  const src = fs.readFileSync(p, "utf8")
  const n = (src.match(FROM) || []).length
  if (!n) {
    console.log(`${rel}: já renomeado`)
    continue
  }
  const out = src.replace(FROM, TO)
  JSON.parse(out) // asserção: continua JSON válido
  if (out.includes('"bt_see_monster_skin_')) throw new Error(`${rel}: sobrou chave velha`)
  fs.writeFileSync(p, out, "utf8")
  console.log(`${rel}: ${n} renomeadas`)
}
