// B12 (mig 410): LABORATÓRIO DE CRIOGENIA — o prédio, os pontos do interior, a criogenista,
// o tanque de embriões, o acelerador e as cápsulas congeladas. Fill-if-absent no namespace MeuMundo.
//   node scripts/i18n-mm-b12-criolab-merge.js [pasta dos dicionários]
const fs = require("fs")
const path = require("path")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")

// [chave, pt, en, es]
const ROWS = [
  ["centerPlace_criolab", "Laboratório de Criogenia", "Cryogenics Lab", "Laboratorio de Criogenia"],
  ["pvCryo", "Ver as cápsulas", "See the capsules", "Ver las cápsulas"],
  ["pvLab", "Falar com a criogenista", "Talk to the cryogenicist", "Hablar con la criogenista"],
  ["pvEmbryo", "Comprar embrião", "Buy an embryo", "Comprar embrión"],
  ["pvAccelerate", "Usar o acelerador", "Use the accelerator", "Usar el acelerador"],
  ["chCryoTitle", "Cápsulas criogênicas", "Cryogenic capsules", "Cápsulas criogénicas"],
  ["labTitle", "Laboratório de Criogenia", "Cryogenics Lab", "Laboratorio de Criogenia"],
  ["labEmbryoTitle", "Tanque de embriões", "Embryo tank", "Tanque de embriones"],
  ["labAccelTitle", "Acelerador", "Accelerator", "Acelerador"],
  ["labNpcName", "Dra. Nívea, a criogenista", "Dr. Nívea, the cryogenicist", "Dra. Nívea, la criogenista"],
  ["labLine1", "Bem-vindo ao Laboratório de Criogenia. Aqui ninguém envelhece: quem entra na cápsula para no tempo.", "Welcome to the Cryogenics Lab. Nobody ages here: whoever goes into the capsule stops in time.", "Bienvenido al Laboratorio de Criogenia. Aquí nadie envejece: quien entra en la cápsula se detiene en el tiempo."],
  ["labLine2", "Seus personagens descansam congelados. Não sentem fome, não perdem força — só esperam você voltar.", "Your characters rest frozen. They don't get hungry or lose strength — they just wait for you to come back.", "Tus personajes descansan congelados. No tienen hambre ni pierden fuerza: solo esperan que vuelvas."],
  ["labLine3", "Um embrião nasce com um metro. Descongelado, leva trinta dias de vida para chegar aos 15 anos… a não ser que você use o acelerador.", "An embryo is born one meter tall. Thawed, it takes thirty days of life to reach 15… unless you use the accelerator.", "Un embrión nace con un metro. Descongelado, tarda treinta días de vida en llegar a los 15 años… a menos que uses el acelerador."],
  ["labLine4", "O acelerador é seguro. Quase sempre. Brincadeira — é seguro sempre.", "The accelerator is safe. Almost always. Just kidding — it's always safe.", "El acelerador es seguro. Casi siempre. Es broma: siempre es seguro."],
  ["labLine5", "Cuidado com a geada no chão. O último estagiário ainda está na cápsula três.", "Watch out for the frost on the floor. The last intern is still in capsule three.", "Cuidado con la escarcha del suelo. El último becario sigue en la cápsula tres."],
  ["labLine6", "Cada embrião tem certificado, número de série e genética própria. Nenhum é igual ao outro.", "Every embryo has a certificate, a serial number and its own genetics. No two are alike.", "Cada embrión tiene certificado, número de serie y genética propia. Ninguno es igual a otro."],
  ["labFree", "Grátis", "Free", "Gratis"],
  ["labPrice", "{n} Esmeralda", "{n} Emerald", "{n} Esmeralda"],
  ["labBalance", "Seu saldo: {n} Esmeralda", "Your balance: {n} Emerald", "Tu saldo: {n} Esmeralda"],
  ["labEmbryoIntro", "O embrião vai para a cápsula, congelado, com 1 m. Descongelado, cresce até os 15 anos em 30 dias de vida — ou na hora, com o acelerador.", "The embryo goes into the capsule, frozen, at 1 m. Thawed, it grows to 15 in 30 days of life — or instantly, with the accelerator.", "El embrión va a la cápsula, congelado, con 1 m. Descongelado, crece hasta los 15 años en 30 días de vida, o al instante con el acelerador."],
  ["labFull", "A cápsula está cheia: libere uma vaga antes de comprar.", "The capsule is full: free a slot before buying.", "La cápsula está llena: libera un espacio antes de comprar."],
  ["labSexFor", "Sexo (raposas e vampiros):", "Sex (foxes and vampires):", "Sexo (zorros y vampiros):"],
  ["labBuy", "Comprar", "Buy", "Comprar"],
  ["labBought", "Embrião na cápsula. Ele nasce com 1 m.", "Embryo in the capsule. It is born 1 m tall.", "Embrión en la cápsula. Nace con 1 m."],
  ["labAccelIntro", "O acelerador leva o personagem aos {n} anos na hora: ele pula a fase de crescer e fica jovem completo.", "The accelerator takes the character to age {n} instantly: it skips growing up and becomes a full young adult.", "El acelerador lleva al personaje a los {n} años al instante: salta la fase de crecer y queda joven completo."],
  ["labAccelNone", "Nenhum personagem precisa do acelerador: todos já têm 15 anos ou mais.", "No character needs the accelerator: they are all 15 or older.", "Ningún personaje necesita el acelerador: todos tienen 15 años o más."],
  ["labAccelGo", "Acelerar", "Accelerate", "Acelerar"],
  ["labAccelerated", "Pronto: agora ele tem 15 anos.", "Done: they are 15 now.", "Listo: ahora tiene 15 años."],
  ["labBack", "Falar com a criogenista", "Talk to the cryogenicist", "Hablar con la criogenista"],
]

const LOCALES = ["pt-BR", "en", "es"]
for (const [i, loc] of LOCALES.entries()) {
  const file = path.join(DIR, `${loc}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  const mm = (dict.MeuMundo = dict.MeuMundo || {})
  let n = 0
  for (const r of ROWS) {
    if (typeof mm[r[0]] !== "string") {
      mm[r[0]] = r[1 + i]
      n++
    }
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
  console.log(loc, "+", n)
}
