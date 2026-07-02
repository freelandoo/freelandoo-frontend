// i18n da API de Atendimento: ns novo "ApiConnections" + 2 chaves no ns
// "Messages" (botão + selo). Idempotente e não-destrutivo: só ADICIONA chaves
// ausentes. Rodar com: node scripts/i18n-atendimento-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const API_CONNECTIONS = {
  title: ["Conectar atendimento", "Connect support tool", "Conectar atención"],
  close: ["Fechar", "Close", "Cerrar"],
  intro: [
    "Gere um token e cole no seu software de atendimento para ele ler e responder suas conversas comerciais. Só responde — nunca inicia conversa.",
    "Generate a token and paste it into your support software so it can read and reply to your business conversations. Reply-only — it never starts a conversation.",
    "Genera un token y pégalo en tu software de atención para que lea y responda tus conversaciones comerciales. Solo responde: nunca inicia una conversación.",
  ],
  loadError: ["Erro ao carregar conexões", "Error loading connections", "Error al cargar conexiones"],
  createError: ["Erro ao criar conexão", "Error creating connection", "Error al crear la conexión"],
  revokeError: ["Erro ao revogar", "Error revoking", "Error al revocar"],
  revokeConfirm: [
    "Revogar esta conexão? O software conectado perde o acesso na hora.",
    "Revoke this connection? The connected software loses access immediately.",
    "¿Revocar esta conexión? El software conectado pierde el acceso al instante.",
  ],
  revoke: ["Revogar", "Revoke", "Revocar"],
  empty: ["Nenhuma conexão ativa.", "No active connections.", "Ninguna conexión activa."],
  newConnection: ["Nova conexão", "New connection", "Nueva conexión"],
  limitHint: [
    "Limite de 3 conexões ativas. Revogue uma para criar outra.",
    "Limit of 3 active connections. Revoke one to create another.",
    "Límite de 3 conexiones activas. Revoca una para crear otra.",
  ],
  nameLabel: ["Nome da conexão", "Connection name", "Nombre de la conexión"],
  namePlaceholder: ["Ex.: AtendeBot da loja", "E.g.: Store support bot", "Ej.: Bot de atención de la tienda"],
  scopeLabel: ["Incluir minhas mensagens pessoais", "Include my personal messages", "Incluir mis mensajes personales"],
  scopeHint: [
    "Sem isso, o software só vê O.S. e conversas novas que chegarem depois de conectar.",
    "Without this, the software only sees work orders and new conversations that arrive after connecting.",
    "Sin esto, el software solo ve órdenes de servicio y conversaciones nuevas que lleguen después de conectar.",
  ],
  createSubmit: ["Gerar token", "Generate token", "Generar token"],
  cancel: ["Cancelar", "Cancel", "Cancelar"],
  tokenOnceTitle: ["Guarde este token agora", "Save this token now", "Guarda este token ahora"],
  tokenOnceHint: [
    "Ele não será mostrado de novo. Cole no seu software de atendimento.",
    "It will not be shown again. Paste it into your support software.",
    "No se mostrará de nuevo. Pégalo en tu software de atención.",
  ],
  copy: ["Copiar", "Copy", "Copiar"],
  copied: ["Copiado", "Copied", "Copiado"],
  tokenDone: ["Já guardei, voltar à lista", "Saved it, back to the list", "Ya lo guardé, volver a la lista"],
  scopeFull: ["O.S. + novas + pessoais", "Work orders + new + personal", "Órdenes + nuevas + personales"],
  scopeCommercial: ["O.S. + conversas novas", "Work orders + new conversations", "Órdenes + conversaciones nuevas"],
  lastUsed: ["último uso:", "last used:", "último uso:"],
  never: ["nunca", "never", "nunca"],
  webhookOn: ["Webhook configurado", "Webhook configured", "Webhook configurado"],
  webhookOff: [
    "Aguardando o software configurar o webhook",
    "Waiting for the software to configure the webhook",
    "Esperando que el software configure el webhook",
  ],
}

const MESSAGES_EXTRA = {
  apiConnectionsButton: ["Conectar atendimento", "Connect support tool", "Conectar atención"],
  viaApiBadge: ["via atendimento", "via support tool", "vía atención"],
}

const LOCALES = ["pt-BR", "en", "es"]

function mergeNamespace(json, ns, keys, localeIndex) {
  if (!json[ns]) json[ns] = {}
  let added = 0
  for (const [key, values] of Object.entries(keys)) {
    if (json[ns][key] === undefined) {
      json[ns][key] = values[localeIndex]
      added++
    }
  }
  return added
}

for (let i = 0; i < LOCALES.length; i++) {
  const file = path.join(dir, `${LOCALES[i]}.json`)
  const json = JSON.parse(fs.readFileSync(file, "utf8"))
  let added = 0
  added += mergeNamespace(json, "ApiConnections", API_CONNECTIONS, i)
  added += mergeNamespace(json, "Messages", MESSAGES_EXTRA, i)
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n", "utf8")
  console.log(`${LOCALES[i]}: +${added} chaves`)
}
