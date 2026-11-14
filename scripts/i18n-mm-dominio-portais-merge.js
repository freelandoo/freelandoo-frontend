// Domínios: o chefe explica a passagem (balões) e o botão diz o que falta. Idempotente (fill-if-absent).
// node scripts/i18n-mm-dominio-portais-merge.js [pasta dos dicionários]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")
const KEYS = {
  domPassNeedBoss: ["Vença o chefe do setor {n}", "Defeat the sector {n} boss", "Vence al jefe del sector {n}"],
  domSealedNeedPrev: ["Vença os setores antes deste", "Defeat the sectors before this one", "Vence los sectores anteriores"],
  talkBossOpen1: ["Alto! Esta passagem leva à parte {n} do Domínio.", "Halt! This passage leads to part {n} of the Domain.", "¡Alto! Este paso lleva a la parte {n} del Dominio."],
  talkBossOpen1b: ["Alto! Ninguém passa daqui.", "Halt! No one gets past here.", "¡Alto! Nadie pasa de aquí."],
  talkBossOpen2: ["O portal só se abre se você me vencer.", "The portal only opens if you defeat me.", "El portal solo se abre si me vences."],
  talkBossOpen3: ["Chegue perto e lute, se tiver coragem.", "Come closer and fight, if you dare.", "Acércate y pelea, si te atreves."],
  talkBossSealed1: ["Ainda não, viajante. Você não está pronto.", "Not yet, traveler. You are not ready.", "Todavía no, viajero. No estás listo."],
  talkBossNeedOne: ["Vença primeiro o setor {a}.", "First defeat sector {a}.", "Primero vence el sector {a}."],
  talkBossNeedMany: ["Vença primeiro os setores {a} a {b}.", "First defeat sectors {a} to {b}.", "Primero vence los sectores {a} a {b}."],
  talkBossSealed3: ["Depois volte e lute comigo para abrir o portal.", "Then come back and fight me to open the portal.", "Luego vuelve y pelea conmigo para abrir el portal."],
  talkGuard1: ["Ninguém entra no castelo de {god} sem passar por mim.", "No one enters {god}'s castle without getting past me.", "Nadie entra al castillo de {god} sin pasar por mí."],
  talkGuard2: ["Vença-me e a porta se abre.", "Defeat me and the door opens.", "Vénceme y la puerta se abre."],
  talkGod1: ["Então você chegou até mim.", "So you have made it to me.", "Así que llegaste hasta mí."],
  talkGod2: ["Vença-me e o caminho para o próximo Domínio se abre.", "Defeat me and the way to the next Domain opens.", "Vénceme y se abre el camino al próximo Dominio."],
}
const LANGS = ["pt-BR", "en", "es"]
LANGS.forEach((lang, i) => {
  const f = path.join(DIR, `${lang}.json`)
  const j = JSON.parse(fs.readFileSync(f, "utf8"))
  j.MeuMundo = j.MeuMundo || {}
  let n = 0
  for (const [k, v] of Object.entries(KEYS)) if (!(k in j.MeuMundo)) ((j.MeuMundo[k] = v[i]), n++)
  fs.writeFileSync(f, JSON.stringify(j, null, 2) + "\n")
  console.log(lang, "+", n)
})
