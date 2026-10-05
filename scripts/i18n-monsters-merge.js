/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente — o jogo Freelandoo Monsters volta (2026-10-04) com uma
// porta só, o botão "Jogo" do headcard, visível só para o administrador.
//
// Namespace NOVO `Monsters` (a página /monsters) + 2 chaves em `Profile` (o
// botão). Fill-if-absent. Uso: node scripts/i18n-monsters-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

const ADD = {
  Monsters: {
    waitTitle: ["Um instante", "One moment", "Un momento"],
    waitText: ["Conferindo sua sessão…", "Checking your session…", "Verificando tu sesión…"],
    loginTitle: ["Entre para jogar", "Sign in to play", "Inicia sesión para jugar"],
    loginText: [
      "Seu monstro nasce do seu perfil da Freelandoo — sem conta não há de quem nascer.",
      "Your monster is born from your Freelandoo profile — without an account there's no one to be born from.",
      "Tu monstruo nace de tu perfil de Freelandoo — sin cuenta no hay de quién nacer.",
    ],
    loginCta: ["Entrar", "Sign in", "Entrar"],
    lockedTitle: ["Ainda não", "Not yet", "Todavía no"],
    lockedText: [
      "O jogo está em teste fechado e por enquanto só abre para a administração.",
      "The game is in closed testing and for now only opens for the administration.",
      "El juego está en prueba cerrada y por ahora solo abre para la administración.",
    ],
    back: ["Voltar", "Back", "Volver"],
    noBuildTitle: ["A build ainda não foi publicada", "The build hasn't been published yet", "La build aún no fue publicada"],
    noBuildText: [
      "Falta apontar NEXT_PUBLIC_MONSTERS_JOGO_URL para o endereço da build Godot.",
      "NEXT_PUBLIC_MONSTERS_JOGO_URL still needs to point to the Godot build address.",
      "Falta apuntar NEXT_PUBLIC_MONSTERS_JOGO_URL a la dirección de la build de Godot.",
    ],
    frameTitle: ["Freelandoo Monsters", "Freelandoo Monsters", "Freelandoo Monsters"],
    loading: ["carregando o mundo…", "loading the world…", "cargando el mundo…"],
    landscapeTitle: ["O jogo é deitado", "The game is played sideways", "El juego es en horizontal"],
    landscapeText: [
      "Vire o celular na horizontal. Em pé, a arena fica do tamanho de um selo e os botões viram grãos de arroz.",
      "Turn your phone sideways. Upright, the arena shrinks to a stamp and the buttons become grains of rice.",
      "Gira el celular en horizontal. De pie, la arena queda del tamaño de un sello y los botones se vuelven granos de arroz.",
    ],
    rotateFull: ["Girar e entrar em tela cheia", "Rotate and go fullscreen", "Girar y entrar en pantalla completa"],
    enterFull: ["Entrar em tela cheia", "Go fullscreen", "Entrar en pantalla completa"],
    iphoneHint: [
      "no iPhone o giro é na mão — o Safari não deixa a página girar sozinha",
      "on iPhone you rotate by hand — Safari won't let the page rotate itself",
      "en el iPhone el giro es a mano — Safari no deja que la página gire sola",
    ],
    downloadingHint: [
      "o mundo já está baixando enquanto você lê",
      "the world is already downloading while you read",
      "el mundo ya se está descargando mientras lees",
    ],
    portraitTitle: ["Deite o telefone", "Turn your phone sideways", "Acuesta el teléfono"],
    portraitText: [
      "Em pé, a arena fica do tamanho de um selo e os botões somem. Girando, tudo volta ao tamanho certo.",
      "Upright, the arena shrinks to a stamp and the buttons vanish. Rotate it and everything returns to the right size.",
      "De pie, la arena queda del tamaño de un sello y los botones desaparecen. Al girarlo, todo vuelve al tamaño correcto.",
    ],
  },
  Profile: {
    game: ["Jogo", "Game", "Juego"],
    gameAria: [
      "Abrir o jogo Freelandoo Monsters",
      "Open the Freelandoo Monsters game",
      "Abrir el juego Freelandoo Monsters",
    ],
  },
};

let total = 0;
LOCALES.forEach((locale, idx) => {
  const file = path.join(DIR, `${locale}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));
  let added = 0;
  for (const [ns, keys] of Object.entries(ADD)) {
    dict[ns] = dict[ns] || {};
    for (const [k, vals] of Object.entries(keys)) {
      if (dict[ns][k] === undefined) {
        dict[ns][k] = vals[idx];
        added++;
      }
    }
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n");
  total += added;
  console.log(`${locale}: +${added}`);
});
console.log(`total: ${total}`);
