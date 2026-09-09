/**
 * i18n — A RECONSTRUÇÃO DOS TRÊS PILLS DA PLATAFORMA DE GAMES.
 *
 * Os pills voltaram (Jogo atual laranja, Posts de games verde, Ranking roxo) e
 * quase todo o texto deles JÁ ESTAVA nos três dicionários: `gamePill`,
 * `gamePillOfAria`, `myGamePillAria`, `gamePostsPill`, `gamePostsPillOfAria`,
 * `myGamePostsPillAria` e `rankingPill` sobreviveram à limpeza de 2026-09-09 —
 * pela convenção da casa (chave órfã fica) e porque eram exatamente os textos
 * que a reconstrução ia pedir de volta. Este merge acrescenta a ÚNICA que
 * faltava.
 *
 *   • `rankingPlatformPillAria` — o aria do pill roxo DENTRO DA PLATAFORMA.
 *     A `rankingPillAria` que já existe diz "o ranking completo da
 *     COMUNIDADE", e games não é uma: ninguém entra, não há membros, não há
 *     líder (mig 232). Reusá-la ali faria o leitor de tela desfazer, em voz
 *     alta, a distinção que a migration inteira existe para estabelecer — e
 *     sobrescrever a chave antiga quebraria o pill das seis modalidades que
 *     de fato são comunidades. Daí uma chave a mais, e não um valor trocado.
 *
 * FILL-IF-ABSENT, como todo merge da casa: rodar duas vezes não sobrescreve
 * nada e a segunda passada tem que somar 0.
 *
 *   node scripts/i18n-games-pills-rebuild-merge.js
 */
const fs = require("fs")
const path = require("path")

const DIR = path.join(__dirname, "..", "messages")
const LOCALES = ["pt-BR", "en", "es"]

/** chave: [pt, en, es] */
const COMMUNITY = {
  rankingPlatformPillAria: [
    "Abrir o ranking da plataforma de games",
    "Open the games platform ranking",
    "Abrir el ranking de la plataforma de games",
  ],
}

let added = 0
LOCALES.forEach((locale, i) => {
  const file = path.join(DIR, `${locale}.json`)
  const dict = JSON.parse(fs.readFileSync(file, "utf8"))
  for (const [ns, table] of [["Community", COMMUNITY]]) {
    dict[ns] = dict[ns] || {}
    for (const [key, values] of Object.entries(table)) {
      if (dict[ns][key] === undefined) {
        dict[ns][key] = values[i]
        added += 1
      }
    }
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n")
})

console.log(`i18n games pills rebuild: ${added} chave(s) adicionada(s).`)
