/* eslint-disable @typescript-eslint/no-require-imports */
// Merge idempotente das chaves da aba WhatsApp (mig 223).
//
// A aba O.S. de /mensagens passou a ter duas fontes — Freelandoo e WhatsApp —
// e a segunda é uma superfície nova: conectar o número por QR, ler a caixa e
// responder. Namespace próprio `Whatsapp`; as duas chaves das SUB-ABAS nascem
// em `Messages`, que é o vocabulário da tela onde elas aparecem.
//
// Nomes próprios não traduzem: "WhatsApp" e "Freelandoo" são iguais nos três
// idiomas de propósito — o texto que muda é o que explica, não o que nomeia.
//
// Padrão da casa: fill-if-absent — nunca sobrescreve o que já está no dicionário.
//
// Uso: node scripts/i18n-whatsapp-merge.js

const fs = require("fs");
const path = require("path");

const LOCALES = ["pt-BR", "en", "es"];
const DIR = path.join(__dirname, "..", "messages");

/** chave → [pt, en, es] */
const MESSAGES = {
  osSourceFreelandoo: ["Freelandoo", "Freelandoo", "Freelandoo"],
  osSourceWhatsapp: ["WhatsApp", "WhatsApp", "WhatsApp"],
  osWhatsappSubtitle: [
    "Suas conversas do WhatsApp",
    "Your WhatsApp chats",
    "Tus conversaciones de WhatsApp",
  ],
};

const WHATSAPP = {
  // ─── conexão ───────────────────────────────────────────────────────────
  connectCta: ["Conectar meu WhatsApp", "Connect my WhatsApp", "Conectar mi WhatsApp"],
  connectedChip: ["WhatsApp conectado", "WhatsApp connected", "WhatsApp conectado"],
  connectTitle: [
    "Traga o seu WhatsApp para cá",
    "Bring your WhatsApp here",
    "Trae tu WhatsApp aquí",
  ],
  connectHint: [
    "Conecte o seu número por QR Code e atenda as conversas do WhatsApp sem sair da Freelandoo.",
    "Connect your number with a QR code and handle your WhatsApp chats without leaving Freelandoo.",
    "Conecta tu número con un código QR y atiende tus conversaciones de WhatsApp sin salir de Freelandoo.",
  ],
  reconnectCta: ["Reconectar meu WhatsApp", "Reconnect my WhatsApp", "Reconectar mi WhatsApp"],
  idleDisconnected: [
    "Desconectamos o seu WhatsApp porque a caixa ficou {days} dias sem uso. Nada foi perdido: reconecte para voltar a receber por aqui.",
    "We unlinked your WhatsApp because this inbox went {days} days unused. Nothing was lost — reconnect to start receiving here again.",
    "Desvinculamos tu WhatsApp porque esta bandeja pasó {days} días sin uso. No se perdió nada: reconecta para volver a recibir aquí.",
  ],
  notConfigured: [
    "A integração com o WhatsApp ainda não está disponível nesta instalação.",
    "The WhatsApp integration is not available in this installation yet.",
    "La integración con WhatsApp aún no está disponible en esta instalación.",
  ],

  // ─── modal do QR ───────────────────────────────────────────────────────
  modalEyebrow: ["WhatsApp", "WhatsApp", "WhatsApp"],
  modalTitle: ["Conectar WhatsApp", "Connect WhatsApp", "Conectar WhatsApp"],
  modalTitleConnected: ["WhatsApp conectado", "WhatsApp connected", "WhatsApp conectado"],
  scanHint: [
    "Aponte a câmera do seu celular para o código",
    "Point your phone camera at the code",
    "Apunta la cámara de tu celular al código",
  ],
  step1: [
    "1. Abra o WhatsApp no celular",
    "1. Open WhatsApp on your phone",
    "1. Abre WhatsApp en el celular",
  ],
  step2: [
    "2. Toque em ⋮ → Aparelhos conectados",
    "2. Tap ⋮ → Linked devices",
    "2. Toca en ⋮ → Dispositivos vinculados",
  ],
  step3: [
    "3. Toque em Conectar um aparelho",
    "3. Tap Link a device",
    "3. Toca en Vincular un dispositivo",
  ],
  step4: [
    "4. Aponte a câmera para este código",
    "4. Point the camera at this code",
    "4. Apunta la cámara a este código",
  ],
  qrLoading: ["Gerando QR Code…", "Generating QR code…", "Generando código QR…"],
  qrUnavailable: ["QR indisponível", "QR unavailable", "QR no disponible"],
  qrError: [
    "Não foi possível gerar o QR Code.",
    "The QR code could not be generated.",
    "No fue posible generar el código QR.",
  ],
  qrAlt: [
    "QR Code para conectar o WhatsApp",
    "QR code to connect WhatsApp",
    "Código QR para conectar WhatsApp",
  ],
  qrRenew: [
    "O código se renova sozinho a cada 20 segundos.",
    "The code refreshes itself every 20 seconds.",
    "El código se renueva solo cada 20 segundos.",
  ],
  refreshQr: ["Atualizar código", "Refresh code", "Actualizar código"],
  pairingCode: ["Código de pareamento", "Pairing code", "Código de vinculación"],
  connectedHelp: [
    "As conversas recebidas entram sozinhas nesta aba.",
    "Incoming chats show up in this tab on their own.",
    "Las conversaciones recibidas aparecen solas en esta pestaña.",
  ],
  connectedNumber: ["Número", "Number", "Número"],
  noAutoReply: [
    "Ninguém é respondido automaticamente — toda resposta sai daqui, escrita por você.",
    "Nobody gets an automatic reply — every answer is written by you, right here.",
    "Nadie recibe respuesta automática — cada respuesta la escribes tú, aquí mismo.",
  ],
  done: ["Concluir", "Done", "Concluir"],
  disconnect: ["Desconectar aparelho", "Unlink device", "Desvincular dispositivo"],
  close: ["Fechar", "Close", "Cerrar"],

  // ─── a caixa ───────────────────────────────────────────────────────────
  searchPlaceholder: [
    "Buscar contato ou número",
    "Search contact or number",
    "Buscar contacto o número",
  ],
  clearSearch: ["Limpar busca", "Clear search", "Limpiar búsqueda"],
  updating: ["Atualizando…", "Updating…", "Actualizando…"],
  unknownContact: ["Contato sem nome", "Unnamed contact", "Contacto sin nombre"],
  groupLabel: ["Grupo", "Group", "Grupo"],
  emptyConnectedTitle: [
    "Nenhuma conversa ainda",
    "No conversations yet",
    "Ninguna conversación todavía",
  ],
  emptyConnectedHint: [
    "Quando alguém te escrever no WhatsApp, a conversa aparece aqui.",
    "When someone messages you on WhatsApp, the chat shows up here.",
    "Cuando alguien te escriba por WhatsApp, la conversación aparece aquí.",
  ],
  emptyDisconnectedTitle: [
    "Conecte o seu WhatsApp",
    "Connect your WhatsApp",
    "Conecta tu WhatsApp",
  ],
  emptyDisconnectedHint: [
    "Leia o QR Code com o seu celular e atenda as suas conversas aqui dentro.",
    "Scan the QR code with your phone and handle your chats in here.",
    "Escanea el código QR con tu celular y atiende tus conversaciones aquí.",
  ],
  pickConversation: ["Escolha uma conversa", "Pick a conversation", "Elige una conversación"],
  pickConversationHint: [
    "As mensagens que chegarem no seu número aparecem aqui.",
    "Messages sent to your number show up here.",
    "Los mensajes enviados a tu número aparecen aquí.",
  ],
  loadingThread: ["Carregando conversa…", "Loading conversation…", "Cargando conversación…"],
  back: ["Voltar", "Back", "Volver"],
  statusConnected: ["conectado", "connected", "conectado"],
  statusDisconnected: ["desconectado", "disconnected", "desconectado"],

  // ─── resposta ──────────────────────────────────────────────────────────
  composerPlaceholder: ["Escreva a resposta", "Write your reply", "Escribe tu respuesta"],
  send: ["Enviar", "Send", "Enviar"],
  reconnectToReply: [
    "Reconecte o WhatsApp para responder",
    "Reconnect WhatsApp to reply",
    "Reconecta WhatsApp para responder",
  ],

  // ─── mídia ─────────────────────────────────────────────────────────────
  openMedia: ["abrir", "open", "abrir"],
  downloadFile: ["Baixar arquivo", "Download file", "Descargar archivo"],
};

const NAMESPACES = { Messages: MESSAGES, Whatsapp: WHATSAPP };

let added = 0;

for (const locale of LOCALES) {
  const file = path.join(DIR, `${locale}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));
  const i = LOCALES.indexOf(locale);

  for (const [ns, keys] of Object.entries(NAMESPACES)) {
    if (!dict[ns]) dict[ns] = {};
    for (const [key, values] of Object.entries(keys)) {
      if (dict[ns][key] === undefined) {
        dict[ns][key] = values[i];
        added++;
      }
    }
  }

  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + "\n", "utf8");
}

console.log(`[i18n] ${added} chave(s) adicionada(s).`);
