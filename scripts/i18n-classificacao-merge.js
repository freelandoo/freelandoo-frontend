// A6 CLASSIFICAÇÃO: página /classificacao, link público, selo no perfil e as
// 50 afirmações do IPIP-50 (fonte: features/classificacao/ipip50.ts, lida
// direto pelo Node). Fill-if-absent nos namespaces Classificacao e Account.
//   node scripts/i18n-classificacao-merge.js [pasta dos dicionários]
const fs = require("fs")
const path = require("path")
const { pathToFileURL } = require("url")
const DIR = process.argv[2] || path.join(__dirname, "..", "messages")

// [chave, pt, en, es]
const ROWS = [
  ["answer", "Responder", "Answer", "Responder"],
  ["areaEconomia", "Economia", "Economics", "Economía"],
  ["areaFinancas", "Finanças", "Finance", "Finanzas"],
  ["areaGeografia", "Geografia", "Geography", "Geografía"],
  ["areaGerais", "Conhecimentos gerais", "General knowledge", "Cultura general"],
  ["areaHistoria", "História", "History", "Historia"],
  ["badge", "Classificação", "Ranking test", "Clasificación"],
  ["badgeHint", "Nota na prova de Classificação da Freelandoo (0 a 100; 50 é a média)", "Score on the Freelandoo ranking test (0 to 100; 50 is average)", "Nota en la prueba de Clasificación de Freelandoo (0 a 100; 50 es el promedio)"],
  ["closing", "Fechando a prova…", "Closing the test…", "Cerrando la prueba…"],
  ["copyLink", "Copiar link", "Copy link", "Copiar enlace"],
  ["doneAt", "Feita em {d}.", "Taken on {d}.", "Hecha el {d}."],
  ["intro", "São {n} perguntas, uma de cada vez, escolhidas pelo seu nível. Você tem {m} minutos. Dá para refazer a cada {d} dias.", "There are {n} questions, one at a time, picked for your level. You have {m} minutes. You can retake it every {d} days.", "Son {n} preguntas, una a la vez, elegidas según tu nivel. Tienes {m} minutos. Puedes repetirla cada {d} días."],
  ["lk1", "Discordo totalmente", "Strongly disagree", "Totalmente en desacuerdo"],
  ["lk2", "Discordo", "Disagree", "En desacuerdo"],
  ["lk3", "Neutro", "Neutral", "Neutral"],
  ["lk4", "Concordo", "Agree", "De acuerdo"],
  ["lk5", "Concordo totalmente", "Strongly agree", "Totalmente de acuerdo"],
  ["nextAt", "Você pode refazer a partir de {d}.", "You can retake it from {d}.", "Puedes repetirla a partir del {d}."],
  ["pAgree", "Li e autorizo.", "I have read and I authorize.", "Leí y autorizo."],
  ["pConsentText", "Autorizo a Freelandoo a guardar minhas respostas e o resultado deste perfil de personalidade, que é dado pessoal sensível (LGPD, art. 11), só para eu mesmo(a) ver. Ele não é mostrado a ninguém, não é usado para anúncios nem decisões sobre mim, e posso apagar tudo e retirar esta autorização a qualquer momento.", "I authorize Freelandoo to store my answers and the result of this personality profile, which is sensitive personal data (Brazil's LGPD, art. 11), for my eyes only. It is not shown to anyone, not used for ads or decisions about me, and I can delete everything and withdraw this authorization at any time.", "Autorizo a Freelandoo a guardar mis respuestas y el resultado de este perfil de personalidad, que es un dato personal sensible (LGPD de Brasil, art. 11), solo para que yo lo vea. No se muestra a nadie, no se usa para anuncios ni para decisiones sobre mí, y puedo borrar todo y retirar esta autorización en cualquier momento."],
  ["pDelete", "Apagar e retirar autorização", "Delete and withdraw authorization", "Borrar y retirar la autorización"],
  ["pDeleted", "Apagado. A autorização também foi retirada.", "Deleted. The authorization was also withdrawn.", "Borrado. La autorización también fue retirada."],
  ["pGrant", "Autorizar e responder", "Authorize and answer", "Autorizar y responder"],
  ["pIntro", "50 afirmações do Big Five (IPIP, domínio público). É um perfil para você se conhecer, não um diagnóstico. Fica guardado criptografado, ninguém mais vê, e você apaga quando quiser.", "50 Big Five statements (IPIP, public domain). It is a profile to know yourself, not a diagnosis. It is stored encrypted, no one else sees it, and you can delete it whenever you want.", "50 afirmaciones del Big Five (IPIP, dominio público). Es un perfil para conocerte, no un diagnóstico. Se guarda cifrado, nadie más lo ve y lo borras cuando quieras."],
  ["pRedo", "Responder de novo", "Answer again", "Responder de nuevo"],
  ["pSave", "Ver meu perfil", "See my profile", "Ver mi perfil"],
  ["pStart", "Responder", "Answer", "Responder"],
  ["pTitle", "Perfil de personalidade (só você vê)", "Personality profile (only you see it)", "Perfil de personalidad (solo tú lo ves)"],
  ["progress", "Pergunta {i} de {n}", "Question {i} of {n}", "Pregunta {i} de {n}"],
  ["pubLabel", "Nota na Classificação Freelandoo", "Freelandoo ranking test score", "Nota en la Clasificación Freelandoo"],
  ["pubMissing", "Esta nota não está disponível.", "This score is not available.", "Esta nota no está disponible."],
  ["retake", "Refazer a prova", "Retake the test", "Repetir la prueba"],
  ["rightOf", "{ok} de {n}", "{ok} of {n}", "{ok} de {n}"],
  ["scoreScale", "De 0 a 100; 50 é a média.", "From 0 to 100; 50 is average.", "De 0 a 100; 50 es el promedio."],
  ["start", "Começar a prova", "Start the test", "Empezar la prueba"],
  ["subtitle", "Uma prova de economia, finanças, história, geografia e conhecimentos gerais. A nota vai de 0 a 100 e só aparece para quem você quiser.", "A test on economics, finance, history, geography and general knowledge. The score goes from 0 to 100 and is only shown to whoever you choose.", "Una prueba de economía, finanzas, historia, geografía y cultura general. La nota va de 0 a 100 y solo la ve quien tú quieras."],
  ["title", "Classificação", "Ranking test", "Clasificación"],
  ["trAgreeableness", "Amabilidade", "Agreeableness", "Amabilidad"],
  ["trConscientiousness", "Conscienciosidade", "Conscientiousness", "Responsabilidad"],
  ["trExtraversion", "Extroversão", "Extraversion", "Extraversión"],
  ["trOpenness", "Abertura", "Openness", "Apertura"],
  ["trStability", "Estabilidade emocional", "Emotional stability", "Estabilidad emocional"],
  ["visLink", "Quem tiver o link", "Anyone with the link", "Quien tenga el enlace"],
  ["visPrivate", "Só eu", "Only me", "Solo yo"],
  ["visProfile", "No meu perfil", "On my profile", "En mi perfil"],
  ["whoSees", "Quem vê a sua nota", "Who sees your score", "Quién ve tu nota"],
  ["yourScore", "Sua nota", "Your score", "Tu nota"],
]

const ACCOUNT = [
  ["classTitle", "Classificação", "Ranking test", "Clasificación"],
  ["classSubtitle", "Prova de economia, finanças e conhecimentos gerais com nota de 0 a 100, e um perfil de personalidade só seu.", "A test on economics, finance and general knowledge scored 0 to 100, plus a personality profile just for you.", "Prueba de economía, finanzas y cultura general con nota de 0 a 100, y un perfil de personalidad solo tuyo."],
]

;(async () => {
  const { IPIP50 } = await import(pathToFileURL(path.join(__dirname, "..", "features", "classificacao", "ipip50.ts")).href)
  const LOCALES = ["pt-BR", "en", "es"]
  for (const [i, loc] of LOCALES.entries()) {
    const file = path.join(DIR, `${loc}.json`)
    const dict = JSON.parse(fs.readFileSync(file, "utf8"))
    let n = 0
    const fill = (ns, key, val) => {
      const d = (dict[ns] = dict[ns] || {})
      if (typeof d[key] !== "string") {
        d[key] = val
        n++
      }
    }
    for (const r of ROWS) fill("Classificacao", r[0], r[1 + i])
    IPIP50[loc].forEach((txt, k) => fill("Classificacao", `ipip${k + 1}`, txt))
    for (const r of ACCOUNT) fill("Account", r[0], r[1 + i])
    fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
    console.log(loc, "+", n)
  }
})()
