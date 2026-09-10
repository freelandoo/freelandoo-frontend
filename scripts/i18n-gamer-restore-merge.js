/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente do namespace `Gamer` — as chaves da ESTANTE da Steam (mig 220).
//
// O namespace saiu dos três dicionários na demolição da comunidade de games
// (2026-09-09) e volta aqui, com os MESMOS textos, para a aba Estante da
// plataforma nova em /games (2026-09-10). Só as chaves que a estante usa.
//
// Padrão da casa: fill-if-absent — nunca sobrescreve o que já está no dicionário.
//
// Uso: node scripts/i18n-gamer-restore-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] — só entra se ainda não existir. */
const NEW = {
  "connectFail": [
    "Não deu para começar a conexão.",
    "Could not start the connection.",
    "No se pudo iniciar la conexión."
  ],
  "actionFail": [
    "Não deu certo.",
    "That did not work.",
    "No funcionó."
  ],
  "compareFail": [
    "Não achei esse perfil.",
    "I could not find that profile.",
    "No encontré ese perfil."
  ],
  "connectHint": [
    "Traz seus jogos, horas e conquistas automaticamente",
    "Brings your games, hours and achievements automatically",
    "Trae tus juegos, horas y logros automáticamente"
  ],
  "steamUnconfigured": [
    "Ainda não ligada nesta instalação",
    "Not switched on in this install yet",
    "Todavía no activada en esta instalación"
  ],
  "xboxReason": [
    "A API aberta é paga e não informa horas jogadas",
    "The open API is paid and does not report played hours",
    "La API abierta es de pago y no informa horas jugadas"
  ],
  "playstationReason": [
    "A Sony não abre uma API pública",
    "Sony does not open a public API",
    "Sony no abre una API pública"
  ],
  "nintendoReason": [
    "A Nintendo não abre uma API pública",
    "Nintendo does not open a public API",
    "Nintendo no abre una API pública"
  ],
  "noHandle": [
    "conta conectada",
    "connected account",
    "cuenta conectada"
  ],
  "statusPrivate": [
    "Sua conta está fechada na plataforma",
    "Your account is private on the platform",
    "Tu cuenta está cerrada en la plataforma"
  ],
  "statusError": [
    "A última leitura falhou",
    "The last read failed",
    "La última lectura falló"
  ],
  "statusOk": [
    "Sincronizada",
    "Synced",
    "Sincronizada"
  ],
  "syncNow": [
    "Atualizar",
    "Refresh",
    "Actualizar"
  ],
  "visPublic": [
    "Visível",
    "Visible",
    "Visible"
  ],
  "visPrivate": [
    "Só eu",
    "Only me",
    "Solo yo"
  ],
  "disconnectConfirm": [
    "Desconectar apaga os jogos que vieram desta plataforma. Continuar?",
    "Disconnecting deletes the games that came from this platform. Continue?",
    "Desconectar borra los juegos que vinieron de esta plataforma. ¿Continuar?"
  ],
  "disconnect": [
    "Desconectar",
    "Disconnect",
    "Desconectar"
  ],
  "privateHelp": [
    "Na Steam, abra Perfil → Editar perfil → Configurações de privacidade e deixe \"Detalhes do jogo\" como Público. Depois toque em Atualizar aqui.",
    "On Steam, open Profile → Edit profile → Privacy settings and set \"Game details\" to Public. Then tap Refresh here.",
    "En Steam, abre Perfil → Editar perfil → Configuración de privacidad y deja \"Detalles del juego\" como Público. Luego toca Actualizar aquí."
  ],
  "introTitle": [
    "Sua estante",
    "Your shelf",
    "Tu estante"
  ],
  "intro": [
    "Conecte uma plataforma e seus jogos, horas e conquistas entram aqui sozinhos, sem cadastrar nada na mão. Depois é só digitar o @ de alguém para ver o que vocês jogam em comum.",
    "Connect a platform and your games, hours and achievements land here on their own, with nothing to fill in by hand. Then just type someone's @ to see what you both play.",
    "Conecta una plataforma y tus juegos, horas y logros entran aquí solos, sin cargar nada a mano. Después solo escribe el @ de alguien para ver qué juegan en común."
  ],
  "connectCta": [
    "Conectar {platform}",
    "Connect {platform}",
    "Conectar {platform}"
  ],
  "statusPlanned": [
    "Em breve",
    "Coming soon",
    "Pronto"
  ],
  "statusUnconfigured": [
    "Desligada",
    "Off",
    "Apagada"
  ],
  "statusUnavailable": [
    "Não dá",
    "Not possible",
    "No se puede"
  ],
  "shelfLocked": [
    "Esta pessoa não deixa a estante à mostra.",
    "This person keeps their shelf private.",
    "Esta persona no muestra su estante."
  ],
  "shelfEmptyOther": [
    "{who} ainda não tem jogos para mostrar aqui.",
    "{who} has no games to show here yet.",
    "{who} todavía no tiene juegos para mostrar aquí."
  ],
  "thisPerson": [
    "Esta pessoa",
    "This person",
    "Esta persona"
  ],
  "shelfSignedOut": [
    "Entre na sua conta para ver e conectar a sua estante.",
    "Sign in to see and connect your shelf.",
    "Inicia sesión para ver y conectar tu estantería."
  ],
  "gameOne": [
    "jogo",
    "game",
    "juego"
  ],
  "gameMany": [
    "jogos",
    "games",
    "juegos"
  ],
  "searchGames": [
    "Procurar jogo",
    "Search game",
    "Buscar juego"
  ],
  "achievements": [
    "conquistas",
    "achievements",
    "logros"
  ],
  "compareTitle": [
    "Frente a frente",
    "Head to head",
    "Frente a frente"
  ],
  "compareHint": [
    "Digite o @ de alguém e veja o que vocês jogam em comum.",
    "Type someone's @ and see what you both play.",
    "Escribe el @ de alguien y mira qué juegan en común."
  ],
  "compareCta": [
    "Comparar",
    "Compare",
    "Comparar"
  ],
  "compareLocked": [
    "Esta pessoa não deixa a estante à mostra.",
    "This person keeps their shelf private.",
    "Esta persona no muestra su estante."
  ],
  "compareNone": [
    "Vocês não têm nenhum jogo em comum ainda.",
    "You two do not share any game yet.",
    "Ustedes no tienen ningún juego en común todavía."
  ],
  "compareSummary": [
    "{n} em comum · você jogou mais em {mine}, {who} em {theirs}",
    "{n} in common · you played more in {mine}, {who} in {theirs}",
    "{n} en común · jugaste más en {mine}, {who} en {theirs}"
  ],
  "compareYou": [
    "Você",
    "You",
    "Tú"
  ]
};

let touched = 0;

LOCALES.forEach((locale, idx) => {
  const file = path.join(DIR, `${locale}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));
  dict.Gamer = dict.Gamer || {};

  for (const [key, values] of Object.entries(NEW)) {
    if (dict.Gamer[key] === undefined) {
      dict.Gamer[key] = values[idx];
      touched++;
      console.log(`[${locale}] + Gamer.${key}`);
    }
  }

  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8");
});

console.log(touched === 0 ? "nada a fazer (idempotente)" : `${touched} chave(s) gravada(s)`);
