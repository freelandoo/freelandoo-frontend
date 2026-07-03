// i18n da API de Dados: ns novo "DataConnections" (modal) + 2 chaves no ns
// "Account" (botão da toolbar). Idempotente e não-destrutivo: só ADICIONA
// chaves ausentes. Rodar com: node scripts/i18n-data-connections-merge.js
const fs = require("fs")
const path = require("path")

const dir = path.join(__dirname, "..", "messages")

const DATA_CONNECTIONS = {
  title: ["Conexões de Dados", "Data connections", "Conexiones de datos"],
  close: ["Fechar", "Close", "Cerrar"],
  intro: [
    "Gere um token e cole num software externo (ERP, BI, planilha) para ele LER os dados da sua conta: perfis, serviços, cursos, produtos, redes sociais, nível e métricas. Somente leitura — nunca altera nada e não expõe dados financeiros.",
    "Generate a token and paste it into an external tool (ERP, BI, spreadsheet) so it can READ your account data: profiles, services, courses, products, social links, level and metrics. Read-only — it never changes anything and does not expose financial data.",
    "Genera un token y pégalo en un software externo (ERP, BI, planilla) para que LEA los datos de tu cuenta: perfiles, servicios, cursos, productos, redes sociales, nivel y métricas. Solo lectura: nunca modifica nada ni expone datos financieros.",
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
  namePlaceholder: ["Ex.: Meu painel de BI", "E.g.: My BI dashboard", "Ej.: Mi panel de BI"],
  createSubmit: ["Gerar token", "Generate token", "Generar token"],
  cancel: ["Cancelar", "Cancel", "Cancelar"],
  tokenOnceTitle: ["Guarde este token agora", "Save this token now", "Guarda este token ahora"],
  tokenOnceHint: [
    "Ele não será mostrado de novo. Cole no seu ERP/BI ou painel externo.",
    "It will not be shown again. Paste it into your ERP/BI or external dashboard.",
    "No se mostrará de nuevo. Pégalo en tu ERP/BI o panel externo.",
  ],
  copy: ["Copiar", "Copy", "Copiar"],
  copied: ["Copiado", "Copied", "Copiado"],
  tokenDone: ["Já guardei, voltar à lista", "Saved it, back to the list", "Ya lo guardé, volver a la lista"],
  lastUsed: ["último uso:", "last used:", "último uso:"],
  never: ["nunca", "never", "nunca"],
}

const ACCOUNT_EXTRA = {
  dataApi: ["Conexões de Dados", "Data connections", "Conexiones de datos"],
  dataApiAria: [
    "Conexões de Dados: gerar token de API para ler os dados da conta",
    "Data connections: generate an API token to read your account data",
    "Conexiones de datos: generar token de API para leer los datos de la cuenta",
  ],
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
  added += mergeNamespace(json, "DataConnections", DATA_CONNECTIONS, i)
  added += mergeNamespace(json, "Account", ACCOUNT_EXTRA, i)
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n", "utf8")
  console.log(`${LOCALES[i]}: +${added} chaves`)
}
