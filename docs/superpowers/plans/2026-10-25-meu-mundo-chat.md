# Meu Mundo 3D mm3d-32 — Chat (Global + conversa com outro jogador) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dentro do Meu Mundo, um chat **Global** (todos os jogadores, qualquer cena) e a **conversa 1:1** com outro jogador. Todo o histórico fica nas tabelas da Freelandoo: o 1:1 aparece também em `/mensagens` do site.

**Architecture:**
- **Nenhuma tabela nova de mensagem.**
- **Global:**
  - Uma sala do chat ao vivo que já existe (`tb_chat_room`, tipo novo `meu_mundo`, mig 303), com a moderação, a denúncia e o painel admin de hoje (`ChatModerationService`, `/admin/chat-moderation`).
  - A entrega ao vivo é pela **sala Colyseus** em que cada um está (`presence.send`), filtrada por bloqueio no servidor. Quem bloqueou não recebe, e nada vaza para o cliente.
  - Quem estiver na mesma sala vê um **balão** sobre a cabeça de quem falou.
- **1:1:** a conversa entre os **perfis-conta** em `/conversations`, que já tem bloqueio, idempotência, não-lidas, notificação e socket. O jogo só abre a thread e conversa por ela. O tempo real é o socket.io `/realtime` que o site já usa (`conversation:subscribe`, `conversation:message`, `nav-counts:changed`).

**Tech Stack:** Express 5 + `pg` (back), Colyseus 0.18 (`src/realtime/meuMundo.js`), socket.io (`lib/realtime.ts`), Next.js 16 + React (front), Babylon (balão), `node --test` (unit), Playwright harness (`MEU MUNDO 3D/pipeline/centro/harness-c`).

---

## Decisões (tomadas pela recomendação; o Alex pode trocar antes da execução)

| # | Decisão | Por quê |
|---|---|---|
| D1 | O Global é **um canal só do jogo**, separado do chat global do site | O site e o jogo têm públicos e ritmos diferentes; misturar quebra a moderação por `room_type`. |
| D2 | A mensagem global é gravada em `tb_chat_message`, sem tabela própria | Reaproveita moderação, denúncia, ocultar e mute/ban que já existem, com painel. |
| D3 | A entrega do Global é pelo Colyseus, nunca pelo socket `chat:subscribe` | O chat global do site **não checa bloqueio**. Aqui o servidor filtra por destinatário (regra "bloqueio = indisponível" do mm3d-31). O mesmo caminho alimenta o balão. `canSubscribe` recusa `meu_mundo` no socket. |
| D4 | O 1:1 usa as conversas da Freelandoo entre **perfis-conta** | O histórico fica na Freelandoo e a conversa aparece em `/mensagens`. `MeuMundoInboxService.js:8-9` já declara essa intenção. |
| D5 | O tempo real do 1:1 é pelo socket.io `/realtime`, sem push pelo Colyseus | Já existe e confere permissão no banco (regra 14). Zero código novo de entrega. |
| D6 | Na rede do jogo não trafega id de usuário (REDE.md) | A linha do Global leva `sessionId` (se a pessoa está na mesma sala) e `profileId` do perfil-conta, que é público (o card já expõe). |
| D7 | Com o painel do chat aberto o boneco para (`overlayOpen` → `setBlocked`) | É o padrão de todo painel do jogo e evita digitar e andar ao mesmo tempo. |
| D8 | Um botão de chat no grupo do canto superior direito (sino/caixa), a entrada "Chat" na gaveta e a tecla **T** no desktop | O Alex quer o mínimo de botões. T está livre em `engine/input.ts`. |
| D9 | O "Mensagem" do card de perfil abre a thread **dentro do jogo** | É o "conversar com outro personagem". "Abrir na Freelandoo" fica no cabeçalho da thread. |
| D10 | Limites: Global 500 caracteres (`ChatService`), 1:1 4000 (`ConversationService`), balão 90 caracteres com "…" | São os limites que já existem; o balão tem que caber em 2 linhas. |

## Mapa de arquivos

**Back** (`freelandoo-backend/`)
- Create `src/databases/migrations/303_meu_mundo_chat.sql`: CHECK superset em `tb_chat_room.type` e `tb_chat_moderation_settings.room_type`, índice único da sala `meu_mundo` e linha de settings.
- Modify `src/services/ChatService.js`:
  - `scopeForRoom`, `assertRoomReadable` e `canSubscribe` passam a conhecer `meu_mundo`;
  - `sendMessage(user, params, body, opts)` ganha `opts.id_profile` e `opts.silent`.
- Create `src/utils/meuMundoChat.js`: regra pura (projeção da linha, texto do balão, quem recebe).
- Create `src/storages/MeuMundoChatStorage.js`: sala singleton, blocos de uma conta e perfil-conta por `id_profile`.
- Create `src/services/MeuMundoChatService.js`: `history`, `send`, `report` e `openDirect`.
- Modify `src/realtime/meuMundo.js`: `pushChat(userId, line)`, `sayInRoom(userId, text, canSee)` e `sessionOf(userId)`.
- Modify `src/controllers/MeuMundoController.js` e `src/routes/meuMundoAdmin.routes.js`: 4 rotas novas.
- Create `test/unit/meuMundoChat.test.js` (regra pura), `test/unit/meuMundoChatService.test.js` (serviço com dublês) e `test/unit/meuMundoChatLogic.test.js` (lógica do front).
- Create `test/meu-mundo-chat.e2e.js` e o script `test:meu-mundo-chat` no `package.json`.

**Front** (`freelandoo frontend/freelandoo-website-main/`)
- Modify `features/meu-mundo/data.ts`: tipos `ChatLine`/`DmMessage` e chamadas.
- Create `features/meu-mundo/ui/chat/chat-logic.ts`: lógica pura (merge, ordem, teto, id do cliente, balão).
- Create `features/meu-mundo/ui/chat/chat-panel.tsx`: `EvoDialog` com abas Global e Conversas, mais a thread.
- Create `features/meu-mundo/ui/chat/use-direct-thread.ts`: thread 1:1 com socket.
- Modify `features/meu-mundo/ui/inbox/hud-inbox.tsx`: 3º botão (chat) com contador.
- Modify `features/meu-mundo/ui/meu-mundo-shell.tsx`: estado do chat, `overlayOpen`, gaveta, tecla T, mensagens `chat`/`say`.
- Modify `features/meu-mundo/ui/player-card/player-card.tsx`: "Mensagem" abre a thread no jogo.
- Modify `features/meu-mundo/ui/inbox/inbox-panel.tsx`: a linha da conversa abre a thread no jogo.
- Modify `features/meu-mundo/engine/net.ts`: `"chat"` e `"say"` na lista de tipos.
- Create `features/meu-mundo/engine/speech-bubble.ts`, e modify `engine/player.ts` e `engine/game.ts`: balão 3D.
- Create `scripts/i18n-meu-mundo-chat-merge.js`: chaves `ch*` nos 3 idiomas.

**Harness:** create `MEU MUNDO 3D/pipeline/centro/harness-c/chat32.js` (2 jogadores; Global, bloqueio, 1:1 e celular).

---

## Slice 1 — Back: sala `meu_mundo` no chat ao vivo

### Task 1: Migration 303

**Files:**
- Create: `freelandoo-backend/src/databases/migrations/303_meu_mundo_chat.sql`

- [ ] **Step 1: Conferir os nomes reais das constraints** (CHECK inline ganha nome automático; a regra é reescrever com o MESMO nome)

Run (Postgres local 55432, ver memória `reference_freelandoo_local_postgres`):
```bash
psql "$TEST_DATABASE_URL" -Atc "SELECT conrelid::regclass, conname FROM pg_constraint WHERE contype='c' AND conrelid IN ('public.tb_chat_room'::regclass,'public.tb_chat_moderation_settings'::regclass)"
```
Expected: inclui `tb_chat_room|tb_chat_room_type_check` e `tb_chat_moderation_settings|tb_chat_moderation_settings_room_type_check`. **Se o nome for outro, use o nome impresso nos dois lugares da migration abaixo.**

- [ ] **Step 2: Escrever a migration**

```sql
-- 303_meu_mundo_chat.sql — MEU MUNDO 3D mm3d-32: chat Global do jogo.
--
-- O Global do jogo é UMA sala do chat ao vivo (tb_chat_room) de tipo próprio:
-- as mensagens ficam em tb_chat_message, com a moderação, a denúncia e o painel
-- de hoje. A conversa 1:1 do jogo usa /conversations (perfis-conta) e não
-- precisa de nada aqui. CHECK reescrito como SUPERSET com o mesmo nome.

ALTER TABLE public.tb_chat_room DROP CONSTRAINT IF EXISTS tb_chat_room_type_check;
ALTER TABLE public.tb_chat_room
  ADD CONSTRAINT tb_chat_room_type_check CHECK (type IN ('global','machine','meu_mundo'));

ALTER TABLE public.tb_chat_moderation_settings DROP CONSTRAINT IF EXISTS tb_chat_moderation_settings_room_type_check;
ALTER TABLE public.tb_chat_moderation_settings
  ADD CONSTRAINT tb_chat_moderation_settings_room_type_check CHECK (room_type IN ('global','machine','meu_mundo'));

-- Uma sala ativa do jogo, sem instâncias (o Global do jogo não divide em 100).
CREATE UNIQUE INDEX IF NOT EXISTS uq_chat_room_meu_mundo_active
  ON public.tb_chat_room (type)
  WHERE type = 'meu_mundo' AND status = 'active';

INSERT INTO public.tb_chat_moderation_settings (room_type, max_message_length)
VALUES ('meu_mundo', 500)
ON CONFLICT (room_type) DO NOTHING;
```

- [ ] **Step 3: Rodar as migrations no Postgres local e conferir a idempotência**

Run: `cd freelandoo-backend && DATABASE_URL="$TEST_DATABASE_URL" node scripts/run-migrations.js && DATABASE_URL="$TEST_DATABASE_URL" node scripts/run-migrations.js`
Expected: a 1ª execução aplica a `303_meu_mundo_chat.sql`; a 2ª não aplica nada e não dá erro. Se o script tiver outro caminho, `grep -n prestart package.json` mostra qual é.

- [ ] **Step 4: Conferir que `tb_chat_room` aceita as colunas usadas na Task 3**

Run: `psql "$TEST_DATABASE_URL" -Atc "\d public.tb_chat_room"`
Expected: há `instance_number`, `max_users`, `display_name`, `internal_name`, `id_machine` (nulo) e `status`. Anote se `instance_number` é NOT NULL. A Task 3 grava 1.

### Task 2: `ChatService` conhece `meu_mundo`

**Files:**
- Modify: `freelandoo-backend/src/services/ChatService.js:31-34` (scopeForRoom), `:104-115` (assertRoomReadable), `:217-221` (canSubscribe), `:345-458` (sendMessage)

- [ ] **Step 1: `scopeForRoom`**, trocando o corpo inteiro:

```js
function scopeForRoom(room) {
  if (!room) return null;
  if (room.type === "global") return "global";
  if (room.type === "meu_mundo") return "meu_mundo";
  return `machine:${room.id_machine}`;
}
```

- [ ] **Step 2: `assertRoomReadable`**. O jogo usa a permissão do chat global, não a do enxame:

```js
  const permKey = room.type === "machine" ? "can_use_machine_chat" : "can_use_global_chat";
```

- [ ] **Step 3: `canSubscribe`**. O Global do jogo nunca chega por socket (D3):

```js
  static async canSubscribe(id_user, id_chat_room) {
    if (!id_user || !id_chat_room || !UUID_RE.test(id_chat_room)) return false;
    const room = await ChatStorage.getRoomById(pool, id_chat_room);
    // mm3d-32: o Global do jogo é entregue pela sala do Meu Mundo, filtrado
    // por bloqueio; pelo socket ele chegaria sem esse filtro.
    if (room && room.type === "meu_mundo") return false;
    return !(await assertRoomReadable({ id_user }, room));
  }
```
Leia as linhas 217-221 antes. Mantenha as guardas que já existem e acrescente só a linha do `meu_mundo` antes do `return`.

- [ ] **Step 4: `sendMessage(user, params, body, opts = {})`**
  - Na assinatura, troque `static async sendMessage(user, params, body) {` por `static async sendMessage(user, params, body, opts = {}) {`.
  - No bloco "resolve perfil", troque `let id_profile = null;` por:
```js
        // mm3d-32: o jogo assina com o perfil-conta (é a pessoa), não com um perfil qualquer.
        let id_profile = opts.id_profile || null;
        if (!id_profile && room.type === "machine" && room.id_machine) {
```
    Aqui o `if (room.type === "machine"` que vem logo abaixo perde o `if` original, porque a linha acima já é o `if`. Feche as chaves exatamente como estavam.
  - Antes do `realtime.emitToChatRoom(...)`, envolva o emit:
```js
        if (!opts.silent) {
          realtime.emitToChatRoom(id_chat_room, "chat:message", {
            id_chat_room,
            message: finalMessage,
          });
        }
```

- [ ] **Step 5: Rodar a suíte unit inteira** (nada de fora pode quebrar)

Run: `cd freelandoo-backend && npm run test:unit`
Expected: PASS em todos (os mesmos números de antes da mudança).

- [ ] **Step 6: Commit**

```bash
cd freelandoo-backend
git add src/databases/migrations/303_meu_mundo_chat.sql src/services/ChatService.js
git commit -m "feat(meu-mundo): slice 1 — sala meu_mundo no chat ao vivo (mig 303)

O Global do jogo grava em tb_chat_message para herdar moderação, denúncia e
painel. Socket recusa a sala: a entrega é pela sala do jogo, filtrada por
bloqueio. sendMessage aceita o perfil-conta e silent.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
(Sem push ainda: a migration sobe junto com o código que a usa, no fim do Slice 2.)

---

## Slice 2 — Back: serviço do chat do jogo

### Task 3: Regra pura `meuMundoChat.js`

**Files:**
- Create: `freelandoo-backend/src/utils/meuMundoChat.js`
- Test: `freelandoo-backend/test/unit/meuMundoChat.test.js`

- [ ] **Step 1: Escrever o teste que falha**

```js
// test/unit/meuMundoChat.test.js — MEU MUNDO 3D mm3d-32: regra pura do chat.
const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../../src/utils/meuMundoChat");

// Entrada = a mensagem JÁ MAPEADA pelo ChatService (mapMessage, ChatService.js:65):
// { id_chat_message, content, hidden, created_at, sender: { id_user, username }, profile: { id_profile, display_name, avatar_url } | null }
const msg = (o = {}) => ({ id_chat_message: "m", content: "a", hidden: false, created_at: null, sender: { id_user: 1, username: null }, profile: null, ...o });

test("linha do Global: projeção campo a campo, sem id de usuário", () => {
  const line = C.toLine(
    msg({ id_chat_message: "m1", content: "oi", created_at: "2026-10-25T10:00:00Z", sender: { id_user: 7, username: "ana", nome: "Ana S" }, profile: { id_profile: "p7", display_name: "Ana", avatar_url: "a.png", xp_level: 3 } }),
    { viewerId: 9, sessionOf: () => "sessA" },
  );
  assert.deepEqual(line, { id: "m1", text: "oi", at: "2026-10-25T10:00:00Z", name: "Ana", avatar: "a.png", profileId: "p7", session: "sessA", mine: false });
  assert.equal(JSON.stringify(line).includes("\"7\""), false);
});

test("linha oculta pela moderação não sai", () => {
  assert.equal(C.toLine(msg({ hidden: true }), { viewerId: 2 }), null);
});

test("nome cai para @ e depois para 'Jogador'", () => {
  assert.equal(C.toLine(msg({ sender: { id_user: 1, username: "zé" } }), { viewerId: 2 }).name, "@zé");
  assert.equal(C.toLine(msg(), { viewerId: 2 }).name, "Jogador");
});

test("authorOf lê o id do remetente da mensagem mapeada", () => {
  assert.equal(C.authorOf(msg({ sender: { id_user: 42 } })), 42);
});

test("minha linha vem com mine=true e sem sessão", () => {
  const l = C.toLine(msg({ sender: { id_user: 5 } }), { viewerId: 5, sessionOf: () => "s" });
  assert.equal(l.mine, true);
  assert.equal(l.session, null);
});

test("quem recebe: online menos bloqueios nos dois sentidos, com o remetente", () => {
  const pairs = [{ blocker_user_id: 3, blocked_user_id: 1 }, { blocker_user_id: 1, blocked_user_id: 4 }];
  assert.deepEqual(C.recipients([1, 2, 3, 4, 5], 1, pairs).sort(), [1, 2, 5]);
});

test("balão: uma linha, 90 caracteres com reticências", () => {
  assert.equal(C.bubbleText("  oi\n\ntudo   bem  "), "oi tudo bem");
  const long = C.bubbleText("a".repeat(200));
  assert.equal(long.length, 90);
  assert.equal(long.endsWith("…"), true);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd freelandoo-backend && node --test test/unit/meuMundoChat.test.js`
Expected: FAIL `Cannot find module '../../src/utils/meuMundoChat'`

- [ ] **Step 3: Implementar**

```js
// src/utils/meuMundoChat.js — MEU MUNDO 3D mm3d-32: regra pura do chat.
//
// O Global do jogo é uma sala do chat ao vivo (mig 303). Aqui fica só o que
// não toca banco nem rede: o que uma linha mostra (projeção campo a campo,
// sem id de usuário — REDE.md), quem recebe (bloqueio em qualquer sentido
// some dos dois lados) e o texto do balão sobre a cabeça.

const BUBBLE_MAX = 90;

// Entrada = mensagem já mapeada pelo ChatService (mapMessage): o conteúdo
// gravado já é o mascarado quando a moderação mascarou.
function authorOf(m) {
  return m && m.sender ? m.sender.id_user : null;
}

function toLine(m, { viewerId, sessionOf } = {}) {
  if (!m || m.hidden) return null;
  const author = authorOf(m);
  const mine = String(author) === String(viewerId);
  const p = m.profile || {};
  const username = m.sender && m.sender.username;
  const name = (p.display_name || "").trim() || (username ? `@${username}` : "Jogador");
  return {
    id: m.id_chat_message,
    text: m.content || "",
    at: m.created_at || null,
    name,
    avatar: p.avatar_url || null,
    profileId: p.id_profile || null,
    // Só quem está na MESMA sala de quem lê ganha sessão (balão e card).
    session: !mine && sessionOf ? sessionOf(author) || null : null,
    mine,
  };
}

function recipients(online, senderId, blockPairs) {
  const out = new Set();
  const cut = new Set();
  for (const p of blockPairs || []) {
    const a = String(p.blocker_user_id);
    const b = String(p.blocked_user_id);
    if (a === String(senderId)) cut.add(b);
    if (b === String(senderId)) cut.add(a);
  }
  for (const u of online) if (!cut.has(String(u))) out.add(u);
  return [...out];
}

function bubbleText(raw) {
  const s = String(raw || "").replace(/\s+/g, " ").trim();
  return s.length > BUBBLE_MAX ? `${s.slice(0, BUBBLE_MAX - 1)}…` : s;
}

module.exports = { toLine, authorOf, recipients, bubbleText, BUBBLE_MAX };
```

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test test/unit/meuMundoChat.test.js`
Expected: PASS 7/7

### Task 4: Storage

**Files:**
- Create: `freelandoo-backend/src/storages/MeuMundoChatStorage.js`

- [ ] **Step 1: Implementar**. Teste pela e2e da Task 8. Ajuste as colunas do INSERT ao que a Task 1 Step 4 mostrou.

```js
// src/storages/MeuMundoChatStorage.js — MEU MUNDO 3D mm3d-32. SQL parametrizado.

class MeuMundoChatStorage {
  /** A sala do Global do jogo (uma só, índice único da mig 303). */
  static async ensureRoom(conn) {
    const found = await conn.query(
      `SELECT * FROM public.tb_chat_room WHERE type = 'meu_mundo' AND status = 'active' LIMIT 1`
    );
    if (found.rows[0]) return found.rows[0];
    await conn.query(
      `INSERT INTO public.tb_chat_room (type, instance_number, max_users, display_name, internal_name, status)
       VALUES ('meu_mundo', 1, 100000, 'Meu Mundo', 'meu_mundo_global', 'active')
       ON CONFLICT DO NOTHING`
    );
    const again = await conn.query(
      `SELECT * FROM public.tb_chat_room WHERE type = 'meu_mundo' AND status = 'active' LIMIT 1`
    );
    return again.rows[0] || null;
  }

  /** Todos os bloqueios em que a conta aparece (nos dois sentidos). */
  static async blockPairs(conn, userId) {
    const r = await conn.query(
      `SELECT blocker_user_id, blocked_user_id FROM public.tb_user_block
        WHERE blocker_user_id = $1 OR blocked_user_id = $1`,
      [userId]
    );
    return r.rows;
  }

  /** Perfil-conta a partir de um id de perfil (só perfil-conta vivo). */
  static async accountProfileById(conn, profileId) {
    const r = await conn.query(
      `SELECT id_profile, id_user FROM public.tb_profile
        WHERE id_profile = $1 AND is_user_account = TRUE AND deleted_at IS NULL`,
      [profileId]
    );
    return r.rows[0] || null;
  }
}

module.exports = MeuMundoChatStorage;
```

### Task 5: Push pela sala (`meuMundo.js`)

**Files:**
- Modify: `freelandoo-backend/src/realtime/meuMundo.js`, logo depois de `pushNotice` (~:1869), mais o `module.exports` do fim do arquivo.

- [ ] **Step 1: Acrescentar as 3 funções**

```js
/**
 * Chat Global do jogo (mm3d-32): uma linha para quem está numa sala agora.
 * O MeuMundoChatService já filtrou quem bloqueou/foi bloqueado.
 */
function pushChat(userId, line) {
  return presence.send(userId, "chat", line);
}

/** sessionId de `userId` na sala em que `viewerId` está (null = outra sala). */
function sessionOf(viewerId, userId) {
  const p = presence.get(viewerId);
  const q = presence.get(userId);
  if (!p || !q || p.room !== q.room) return null;
  return q.sessionId;
}

/**
 * Balão sobre a cabeça: só para quem está na MESMA sala de quem falou e passa
 * em `canSee(userId)` (bloqueio). Vai com sessionId, nunca com id de conta.
 */
function sayInRoom(userId, text, canSee) {
  const p = presence.get(userId);
  if (!p || !p.room || !p.room.sim) return 0;
  let n = 0;
  for (const c of p.room.clients) {
    const s = p.room.sim.get(c.sessionId);
    if (!s || !s.userId || s.userId === userId || !canSee(s.userId)) continue;
    c.send("say", { s: p.sessionId, t: text });
    n++;
  }
  return n;
}
```
Junte `pushChat, sessionOf, sayInRoom` ao `module.exports`.

- [ ] **Step 2: Conferir que `room.sim` existe nas 3 salas** (bairro, casa e centro)

Run: `grep -n "this.sim = \|this.sim=" src/realtime/meuMundo.js`
Expected: ao menos uma linha em `BairroRoom` (o `CentroRoom` herda) e uma em `CasaRoom`. Se a casa usar outro nome, adapte `sayInRoom` com `(p.room.sim || p.room.<nome>)`.

### Task 6: `MeuMundoChatService`

**Files:**
- Create: `freelandoo-backend/src/services/MeuMundoChatService.js`
- Test: `freelandoo-backend/test/unit/meuMundoChatService.test.js`

- [ ] **Step 1: Escrever o teste que falha**, com dublês por `require.cache` como em `meuMundoPlayer.test.js`

```js
// test/unit/meuMundoChatService.test.js — mm3d-32: o serviço do chat do jogo.
// Sala, banco, ChatService e ConversationService são dublês: o que se prova é
// a regra — bloqueio não recebe, não ganha balão e some do histórico; o 1:1
// sai do perfil-conta dos dois lados e nunca é consigo mesmo.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const SRC = path.join(__dirname, "..", "..", "src");
const stub = (rel, exports) => {
  const file = require.resolve(path.join(SRC, rel));
  require.cache[file] = { id: file, filename: file, loaded: true, exports };
};

const w = { online: [1, 2, 3], blocks: [], pushed: [], said: [], sent: [], opened: [], history: [], rooms: new Map() };

stub("databases", { query: async () => ({ rows: [] }) });
stub("realtime/meuMundo.js", {
  pushChat: (u, line) => w.pushed.push([u, line]),
  sayInRoom: (u, text, canSee) => { w.said.push([u, text, [1, 2, 3].filter(canSee)]); return 1; },
  sessionOf: () => null,
  playerInMyRoom: (viewer, sid) => w.rooms.get(`${viewer}:${sid}`) || null,
});
stub("realtime/meuMundoPresence.js", { onlineUsers: () => w.online });
stub("storages/MeuMundoChatStorage.js", {
  ensureRoom: async () => ({ id_chat_room: "00000000-0000-4000-8000-000000000001", type: "meu_mundo" }),
  blockPairs: async (_c, u) => w.blocks.filter((p) => p.blocker_user_id === u || p.blocked_user_id === u),
  accountProfileById: async (_c, pid) => (pid === "p2" ? { id_profile: "p2", id_user: 2 } : pid === "p1" ? { id_profile: "p1", id_user: 1 } : null),
});
stub("storages/ProfileStorage.js", { getUserAccountProfileId: async (_c, u) => `p${u}` });
stub("services/ChatService.js", {
  sendMessage: async (user, params, body, opts) => {
    w.sent.push({ user, params, body, opts });
    return { message: { id_chat_message: "m1", content: body.content, hidden: false, created_at: "t", sender: { id_user: user.id_user, username: "eu" }, profile: { id_profile: "p1", display_name: "Eu", avatar_url: null } } };
  },
  listMessages: async () => ({ items: w.history, next_before: null, has_more: false }),
  reportMessage: async () => ({ ok: true }),
});
stub("services/ConversationService.js", {
  openOrCreate: async (user, payload) => { w.opened.push({ user, payload }); return { conversation: { id_conversation: "c1" } }; },
});

const S = require("../../src/services/MeuMundoChatService");
const reset = () => Object.assign(w, { blocks: [], pushed: [], said: [], sent: [], opened: [], history: [] });

test("enviar: grava com o perfil-conta, silencioso, e entrega a todos online", async () => {
  reset();
  const r = await S.send(1, { text: "oi" });
  assert.equal(r.line.text, "oi");
  assert.equal(w.sent[0].opts.id_profile, "p1");
  assert.equal(w.sent[0].opts.silent, true);
  assert.equal(w.sent[0].opts.game, true);
  assert.deepEqual(w.pushed.map((p) => p[0]).sort(), [1, 2, 3]);
  assert.equal(w.pushed.find((p) => p[0] === 1)[1].mine, true);
});

test("bloqueio nos dois sentidos: não recebe a linha nem o balão", async () => {
  reset();
  w.blocks = [{ blocker_user_id: 3, blocked_user_id: 1 }];
  await S.send(1, { text: "oi" });
  assert.deepEqual(w.pushed.map((p) => p[0]).sort(), [1, 2]);
  assert.deepEqual(w.said[0][2], [1, 2]);
});

test("moderação recusou: devolve o erro e não entrega nada", async () => {
  reset();
  const orig = require(path.join(SRC, "services/ChatService.js")).sendMessage;
  require(path.join(SRC, "services/ChatService.js")).sendMessage = async () => ({ error: "Mensagem bloqueada.", moderation_action: "block" });
  const r = await S.send(1, { text: "xxx" });
  require(path.join(SRC, "services/ChatService.js")).sendMessage = orig;
  assert.equal(r.error, "Mensagem bloqueada.");
  assert.equal(w.pushed.length, 0);
  assert.equal(w.said.length, 0);
});

test("histórico some com quem tem bloqueio comigo", async () => {
  reset();
  w.blocks = [{ blocker_user_id: 1, blocked_user_id: 2 }];
  w.history = [
    { id_chat_message: "a", content: "x", hidden: false, sender: { id_user: 2 }, profile: null },
    { id_chat_message: "b", content: "y", hidden: false, sender: { id_user: 3 }, profile: null },
  ];
  const r = await S.history(1, {});
  assert.deepEqual(r.items.map((l) => l.id), ["b"]);
});

test("abrir 1:1 pela sessão: perfil-conta dos dois lados", async () => {
  reset();
  w.rooms.set("1:sessB", { userId: 2, name: "Bia" });
  const r = await S.openDirect(1, { session: "sessB" });
  assert.equal(r.conversation.id_conversation, "c1");
  assert.deepEqual(w.opened[0].payload, { actor_id: "p1", actor_type: "profile", target_id: "p2", target_type: "profile" });
});

test("abrir 1:1 pelo profileId da linha do Global; consigo mesmo não", async () => {
  reset();
  assert.equal((await S.openDirect(1, { profileId: "p2" })).conversation.id_conversation, "c1");
  assert.equal((await S.openDirect(1, { profileId: "p1" })).code, "self");
  assert.equal((await S.openDirect(1, { profileId: "px" })).statusCode, 404);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test test/unit/meuMundoChatService.test.js`
Expected: FAIL `Cannot find module '../../src/services/MeuMundoChatService'`

- [ ] **Step 3: Implementar**

```js
// src/services/MeuMundoChatService.js — MEU MUNDO 3D mm3d-32: chat do jogo.
//
// Global: uma sala do chat ao vivo (tipo meu_mundo, mig 303) — gravar,
// moderar e denunciar são do ChatService; aqui só se decide QUEM recebe
// (online no jogo, menos bloqueio em qualquer sentido) e o balão na sala.
// A entrega é pela sala do Meu Mundo; o socket recusa essa sala (D3).
//
// 1:1: a conversa da Freelandoo entre os PERFIS-CONTA (aparece em /mensagens).
// O jogo só abre/acha a conversa; enviar, ler e tempo real são o /conversations
// e o socket que o site já usa.

const pool = require("../databases");
const ChatService = require("./ChatService");
const ConversationService = require("./ConversationService");
const MeuMundoChatStorage = require("../storages/MeuMundoChatStorage");
const ProfileStorage = require("../storages/ProfileStorage");
const presence = require("../realtime/meuMundoPresence");
const { toLine, authorOf, recipients, bubbleText } = require("../utils/meuMundoChat");

const fail = (error, code, statusCode) => ({ error, code, statusCode });
const SID = /^[A-Za-z0-9_-]{4,64}$/;
const UUID = /^[0-9a-f-]{36}$/i;

function blockedWith(pairs, userId) {
  const out = new Set();
  for (const p of pairs) {
    if (String(p.blocker_user_id) === String(userId)) out.add(String(p.blocked_user_id));
    if (String(p.blocked_user_id) === String(userId)) out.add(String(p.blocker_user_id));
  }
  return out;
}

class MeuMundoChatService {
  static async history(userId, query = {}) {
    const room = await MeuMundoChatStorage.ensureRoom(pool);
    if (!room) return fail("Chat indisponível", "unavailable", 503);
    // game: true — a sala meu_mundo só abre por aqui (rotas públicas do /chat devolvem 404).
    const r = await ChatService.listMessages({ id_user: userId }, { id_chat_room: room.id_chat_room }, { before: query.before, limit: query.limit || 50 }, { game: true });
    if (r.error) return r;
    const cut = blockedWith(await MeuMundoChatStorage.blockPairs(pool, userId), userId);
    const mm = require("../realtime/meuMundo");
    const items = (r.items || [])
      .filter((m) => !cut.has(String(authorOf(m))))
      .map((m) => toLine(m, { viewerId: userId, sessionOf: (u) => mm.sessionOf(userId, u) }))
      .filter(Boolean);
    return { items, next_before: r.next_before || null, has_more: !!r.has_more };
  }

  static async send(userId, body = {}) {
    const room = await MeuMundoChatStorage.ensureRoom(pool);
    if (!room) return fail("Chat indisponível", "unavailable", 503);
    const id_profile = await ProfileStorage.getUserAccountProfileId(pool, userId);
    const r = await ChatService.sendMessage({ id_user: userId }, { id_chat_room: room.id_chat_room }, { content: body.text }, { id_profile, silent: true, game: true });
    if (r.error || !r.message) return r.error ? r : fail("Mensagem não enviada", "failed", 500);

    const pairs = await MeuMundoChatStorage.blockPairs(pool, userId);
    const cut = blockedWith(pairs, userId);
    const mm = require("../realtime/meuMundo");
    for (const u of recipients(presence.onlineUsers(), userId, pairs)) {
      const line = toLine(r.message, { viewerId: u, sessionOf: (a) => mm.sessionOf(u, a) });
      if (line) mm.pushChat(u, line);
    }
    mm.sayInRoom(userId, bubbleText(r.message.content), (u) => !cut.has(String(u)));
    return { line: toLine(r.message, { viewerId: userId }) };
  }

  static async report(userId, messageId, body = {}) {
    if (!UUID.test(String(messageId || ""))) return fail("Mensagem não encontrada", "gone", 404);
    return ChatService.reportMessage({ id_user: userId }, { id_chat_message: messageId }, body);
  }

  /** Acha/cria a conversa 1:1 com o jogador (sessão na minha sala OU perfil-conta da linha). */
  static async openDirect(userId, body = {}) {
    let targetUserId = null;
    let targetProfileId = null;
    if (body.session) {
      const sid = String(body.session);
      if (!SID.test(sid)) return fail("Jogador não encontrado", "gone", 404);
      const found = require("../realtime/meuMundo").playerInMyRoom(userId, sid);
      if (!found) return fail("Esse jogador não está mais aqui", "gone", 404);
      targetUserId = found.userId;
    } else if (body.profileId) {
      const acc = await MeuMundoChatStorage.accountProfileById(pool, String(body.profileId));
      if (!acc) return fail("Jogador não encontrado", "gone", 404);
      targetUserId = acc.id_user;
      targetProfileId = acc.id_profile;
    } else {
      return fail("Jogador não encontrado", "gone", 404);
    }
    if (String(targetUserId) === String(userId)) return fail("Esse é você", "self", 404);
    const actor = await ProfileStorage.getUserAccountProfileId(pool, userId);
    const target = targetProfileId || (await ProfileStorage.getUserAccountProfileId(pool, targetUserId));
    // Bloqueio, conta inativa e menor: a régua é a do /conversations (assertDirectAllowed).
    return ConversationService.openOrCreate({ id_user: userId }, { actor_id: actor, actor_type: "profile", target_id: target, target_type: "profile" });
  }
}

module.exports = MeuMundoChatService;
```
**Confira antes** dois pontos.
- `ProfileStorage.getUserAccountProfileId(conn, id_user)` (`src/storages/ProfileStorage.js:60`): ele aceita `pool` como `conn`? Se exigir um client de transação, use `const c = await pool.connect()` com `try/finally c.release()`.
- `ConversationService.openOrCreate` (`:249`): a chave do tipo do alvo é mesmo `target_type`? Abra `resolveTarget` (`:159`) e use o nome que ele lê. Corrija também o teste, se for o caso.

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test test/unit/meuMundoChatService.test.js test/unit/meuMundoChat.test.js`
Expected: PASS 13/13

### Task 7: Rotas e controller

**Files:**
- Modify: `freelandoo-backend/src/controllers/MeuMundoController.js` (perto de `playerProfile`, :139, e no `module.exports`)
- Modify: `freelandoo-backend/src/routes/meuMundoAdmin.routes.js:76` (logo abaixo de `/players/:session`)

- [ ] **Step 1: Controller**

```js
// Chat do jogo (mm3d-32): Global (sala meu_mundo) e abrir a conversa 1:1.
const chat = () => require("../services/MeuMundoChatService");
async function chatHistory(req, res) {
  return reply(res, await chat().history(req.user.id_user, req.query || {}));
}
async function chatSend(req, res) {
  return reply(res, await chat().send(req.user.id_user, req.body || {}));
}
async function chatReport(req, res) {
  return reply(res, await chat().report(req.user.id_user, req.params.id, req.body || {}));
}
async function chatDirect(req, res) {
  return reply(res, await chat().openDirect(req.user.id_user, req.body || {}));
}
```
Junte `chatHistory, chatSend, chatReport, chatDirect` ao `module.exports`.

- [ ] **Step 2: Rotas**

```js
// Chat (mm3d-32): Global do jogo e abrir a conversa 1:1 (histórico na Freelandoo).
router.get("/chat/global", ...admin, asyncHandler(MeuMundoController.chatHistory));
router.post("/chat/global", ...admin, rateLimit.chat, asyncHandler(MeuMundoController.chatSend));
router.post("/chat/global/:id/report", ...admin, asyncHandler(MeuMundoController.chatReport));
router.post("/chat/direct", ...admin, asyncHandler(MeuMundoController.chatDirect));
```
No topo do arquivo: `const rateLimit = require("../middlewares/rateLimit");`. Confira que o export é um objeto com `.chat` (`src/middlewares/rateLimit.js:77`).

- [ ] **Step 3: Suíte unit inteira**

Run: `npm run test:unit`
Expected: PASS em todos.

### Task 8: E2E no Postgres local

**Files:**
- Create: `freelandoo-backend/test/meu-mundo-chat.e2e.js`
- Modify: `freelandoo-backend/package.json` (scripts, ao lado de `test:meu-mundo-inbox`)

- [ ] **Step 1: Copiar o cabeçalho de `test/meu-mundo-inbox.e2e.js:1-40`** (guarda do `TEST_DATABASE_URL` local, criação de 2 usuários admin e limpeza). Depois escrever os casos abaixo com os helpers desse arquivo:

```js
test("Global: grava na sala meu_mundo com o perfil-conta", async () => {
  const r = await MeuMundoChatService.send(alice.id_user, { text: "olá centro" });
  assert.equal(r.line.text, "olá centro");
  const row = await pool.query(
    `SELECT m.id_profile, p.is_user_account, r.type FROM tb_chat_message m
       JOIN tb_chat_room r USING (id_chat_room) JOIN tb_profile p ON p.id_profile = m.id_profile
      WHERE m.id_chat_message = $1`, [r.line.id]);
  assert.equal(row.rows[0].type, "meu_mundo");
  assert.equal(row.rows[0].is_user_account, true);
});

test("Global: histórico de quem bloqueou não mostra a linha", async () => {
  await pool.query(`INSERT INTO tb_user_block (blocker_user_id, blocked_user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [bob.id_user, alice.id_user]);
  const h = await MeuMundoChatService.history(bob.id_user, {});
  assert.equal(h.items.some((l) => l.text === "olá centro"), false);
  await pool.query(`DELETE FROM tb_user_block WHERE blocker_user_id=$1 AND blocked_user_id=$2`, [bob.id_user, alice.id_user]);
});

test("1:1: abrir pelo profileId cria UMA conversa entre perfis-conta (aparece em /conversations)", async () => {
  const bobAcc = await ProfileStorage.getUserAccountProfileId(pool, bob.id_user);
  const a = await MeuMundoChatService.openDirect(alice.id_user, { profileId: bobAcc });
  const b = await MeuMundoChatService.openDirect(alice.id_user, { profileId: bobAcc });
  assert.equal(a.conversation.id_conversation, b.conversation.id_conversation);
  const list = await ConversationService.listMine({ id_user: bob.id_user }, {});
  assert.ok((list.items || []).some((c) => c.id_conversation === a.conversation.id_conversation));
});

test("1:1: bloqueado não abre", async () => {
  await pool.query(`INSERT INTO tb_user_block (blocker_user_id, blocked_user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [bob.id_user, alice.id_user]);
  const bobAcc = await ProfileStorage.getUserAccountProfileId(pool, bob.id_user);
  const r = await MeuMundoChatService.openDirect(alice.id_user, { profileId: bobAcc });
  assert.ok(r.error);
});
```
Antes de fixar a asserção de `listMine`, confira sua assinatura (`ConversationService.js:198`): ela pode exigir `actor_id`.

- [ ] **Step 2: Script**: `"test:meu-mundo-chat": "node --test test/meu-mundo-chat.e2e.js"`

- [ ] **Step 3: Rodar**

Run: `TEST_DATABASE_URL=postgres://postgres@127.0.0.1:55432/fl_test npm run test:meu-mundo-chat`
Expected: PASS 4/4

- [ ] **Step 4: Validar o deploy num worktree e fazer commit + push** (há WIP alheio, então nada de `git add -A`)

```bash
git add src/utils/meuMundoChat.js src/storages/MeuMundoChatStorage.js src/services/MeuMundoChatService.js \
  src/realtime/meuMundo.js src/controllers/MeuMundoController.js src/routes/meuMundoAdmin.routes.js \
  test/unit/meuMundoChat.test.js test/unit/meuMundoChatService.test.js test/meu-mundo-chat.e2e.js package.json
git commit -m "feat(meu-mundo): slice 2 — chat do jogo (Global pela sala, 1:1 pelas conversas)

Global grava na sala meu_mundo e é entregue pela sala do Meu Mundo só a quem
não tem bloqueio com o remetente (o socket não filtra bloqueio); balão vai
para a mesma sala com sessionId. 1:1 = conversa da Freelandoo entre os
perfis-conta, aparece em /mensagens.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```
Depois do push, confira o deploy pela API do Railway (memória `reference_freelandoo_creds`). Se o push não disparar deploy, use `serviceInstanceDeployV2`. Confira também que a mig 303 consta como aplicada.

---

## Slice 3 — Front: dados e lógica pura

### Task 9: `chat-logic.ts` + teste

**Files:**
- Create: `features/meu-mundo/ui/chat/chat-logic.ts`
- Test: `freelandoo-backend/test/unit/meuMundoChatLogic.test.js`. O front não tem runner unit; o Node 24 do back carrega o `.ts` sem imports relativos, como o `_frontTs.js`.

- [ ] **Step 1: Teste que falha**

```js
// test/unit/meuMundoChatLogic.test.js — mm3d-32: lógica pura do chat no front.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const { pathToFileURL } = require("node:url");

process.removeAllListeners("warning");
const FILE = path.resolve(__dirname, "../../../freelandoo frontend/freelandoo-website-main/features/meu-mundo/ui/chat/chat-logic.ts");
const load = () => import(pathToFileURL(FILE).href);
const skip = !fs.existsSync(FILE);

test("merge: sem duplicar, mais velha primeiro, teto", { skip }, async () => {
  const L = await load();
  const a = [{ id: "1", at: "2026-10-25T10:00:00Z" }, { id: "2", at: "2026-10-25T10:01:00Z" }];
  const b = [{ id: "2", at: "2026-10-25T10:01:00Z" }, { id: "3", at: "2026-10-25T10:02:00Z" }];
  assert.deepEqual(L.mergeLines(a, b).map((l) => l.id), ["1", "2", "3"]);
  const many = Array.from({ length: 300 }, (_, i) => ({ id: String(i), at: new Date(1e12 + i * 1000).toISOString() }));
  const m = L.mergeLines([], many);
  assert.equal(m.length, L.LINES_MAX);
  assert.equal(m[m.length - 1].id, "299");
});

test("pendente vira a confirmada pelo id do cliente", { skip }, async () => {
  const L = await load();
  const pend = L.pendingLine("c-1", "oi");
  const merged = L.confirmLine([pend], "c-1", { id: "m9", at: "2026-10-25T10:00:00Z", text: "oi" });
  assert.deepEqual(merged.map((l) => [l.id, !!l.pending]), [["m9", false]]);
});

test("texto: corta espaços, recusa vazio e respeita o limite", { skip }, async () => {
  const L = await load();
  assert.equal(L.cleanDraft("  oi  ", 500), "oi");
  assert.equal(L.cleanDraft("   ", 500), null);
  assert.equal(L.cleanDraft("a".repeat(600), 500).length, 500);
});

test("não lidas do Global: conta só as dos outros com o painel fechado", { skip }, async () => {
  const L = await load();
  assert.equal(L.bumpUnread(0, { mine: false }, false), 1);
  assert.equal(L.bumpUnread(3, { mine: true }, false), 3);
  assert.equal(L.bumpUnread(3, { mine: false }, true), 0);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd freelandoo-backend && node --test test/unit/meuMundoChatLogic.test.js`
Expected: FAIL (`ERR_MODULE_NOT_FOUND` do `chat-logic.ts`)

- [ ] **Step 3: Implementar** (sem imports, para carregar direto no Node)

```ts
// features/meu-mundo/ui/chat/chat-logic.ts — mm3d-32: regra pura do chat (sem React).
//
// O Global chega pela sala do jogo (mensagem "chat") e pelo histórico
// (GET /chat/global); a mesma linha pode vir pelos dois — o id decide. A
// mensagem que eu envio aparece na hora como "pendente" e vira a confirmada
// pelo id do cliente quando o servidor responde.

export type Line = { id: string; at: string | null; text?: string; name?: string; avatar?: string | null; profileId?: string | null; session?: string | null; mine?: boolean; pending?: boolean; clientId?: string }

export const LINES_MAX = 200
export const GLOBAL_MAX = 500
export const DIRECT_MAX = 4000

const time = (l: Line) => (l.at ? Date.parse(l.at) : Number.MAX_SAFE_INTEGER)

export function mergeLines(cur: Line[], incoming: Line[]): Line[] {
  const byId = new Map<string, Line>()
  for (const l of cur) byId.set(l.id, l)
  for (const l of incoming) byId.set(l.id, { ...byId.get(l.id), ...l })
  const all = [...byId.values()].sort((a, b) => time(a) - time(b))
  return all.length > LINES_MAX ? all.slice(all.length - LINES_MAX) : all
}

export function pendingLine(clientId: string, text: string): Line {
  return { id: `pending:${clientId}`, clientId, text, at: null, mine: true, pending: true }
}

export function confirmLine(cur: Line[], clientId: string, real: Line): Line[] {
  return mergeLines(cur.filter((l) => l.clientId !== clientId), [{ ...real, mine: true, pending: false }])
}

export function dropPending(cur: Line[], clientId: string): Line[] {
  return cur.filter((l) => l.clientId !== clientId)
}

export function cleanDraft(raw: string, max: number): string | null {
  const s = raw.trim()
  if (!s) return null
  return s.length > max ? s.slice(0, max) : s
}

export function bumpUnread(n: number, line: { mine?: boolean }, open: boolean): number {
  if (open) return 0
  return line.mine ? n : n + 1
}

export function newClientId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (Number(c) ^ (Math.random() * 16) >> (Number(c) / 4)).toString(16))
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test test/unit/meuMundoChatLogic.test.js`
Expected: PASS 4/4

### Task 10: `data.ts`

**Files:**
- Modify: `features/meu-mundo/data.ts`, no fim, depois do bloco mm3d-31

- [ ] **Step 1: Acrescentar**

```ts
// ═══ mm3d-32: chat (Global do jogo + conversa 1:1 da Freelandoo) ═══════════
export type ChatLine = { id: string; text: string; at: string | null; name: string; avatar: string | null; profileId: string | null; session: string | null; mine: boolean }
export type DmMessage = { id: string; text: string; at: string; mine: boolean }

export const getChatGlobal = (token: string, before?: string | null) =>
  call<{ items: ChatLine[]; next_before: string | null; has_more: boolean }>(token, "GET", `/chat/global${before ? `?before=${encodeURIComponent(before)}` : ""}`)
export const postChatGlobal = (token: string, text: string) => call<{ line: ChatLine }>(token, "POST", "/chat/global", { text })
export const postChatReport = (token: string, id: string, reason_category = "other") =>
  call<{ ok?: boolean }>(token, "POST", `/chat/global/${encodeURIComponent(id)}/report`, { reason_category })
/** Acha/cria a conversa 1:1 (pela sessão do boneco na minha sala ou pelo perfil-conta). */
export const postChatDirect = (token: string, who: { session?: string; profileId?: string }) =>
  call<{ conversation: { id_conversation: string } }>(token, "POST", "/chat/direct", who)

/** Thread 1:1: as mesmas rotas do /mensagens (o histórico é um só). */
export async function getDirectMessages(token: string, id: string, actorId: string): Promise<ApiResult<{ items: DmMessage[] }>> {
  const res = await fetch(`/api/conversations/${encodeURIComponent(id)}/messages?limit=50&actor_id=${encodeURIComponent(actorId)}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }).catch(() => null)
  if (!res) return { ok: false, status: 0, error: "network" }
  type Raw = { id_message: string; body: string; created_at: string; sender_entity_id: string }
  const data = (await res.json().catch(() => null)) as { items?: Raw[]; error?: string } | null
  if (!res.ok || !data) return { ok: false, status: res.status, error: data?.error || `http ${res.status}` }
  return { ok: true, data: { items: (data.items || []).map((m) => ({ id: m.id_message, text: m.body, at: m.created_at, mine: m.sender_entity_id === actorId })).reverse() } }
}
export async function postDirectMessage(token: string, id: string, actorId: string, body: string, clientId: string): Promise<ApiResult<{ message: DmMessage }>> {
  const res = await fetch(`/api/conversations/${encodeURIComponent(id)}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ body, actor_id: actorId, actor_type: "profile", client_message_id: clientId }),
  }).catch(() => null)
  if (!res) return { ok: false, status: 0, error: "network" }
  const data = (await res.json().catch(() => null)) as { message?: { id_message: string; body: string; created_at: string }; error?: string } | null
  if (!res.ok || !data?.message) return { ok: false, status: res.status, error: data?.error || `http ${res.status}` }
  return { ok: true, data: { message: { id: data.message.id_message, text: data.message.body, at: data.message.created_at, mine: true } } }
}
export const postDirectRead = (token: string, id: string, actorId: string) =>
  fetch(`/api/conversations/${encodeURIComponent(id)}/read`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ actor_id: actorId }) }).catch(() => null)
```
**Confira antes** os nomes dos campos com `MensagensClient.tsx:689-701` e `:1191`: `id_message`, `body`, `sender_entity_id`, se a lista vem DESC (o `.reverse()` supõe que sim) e como o `actor_id` vai (query ou body). Ajuste aqui e não invente.

- [ ] **Step 2: Lint**

Run: `npm run lint -- features/meu-mundo/data.ts features/meu-mundo/ui/chat/chat-logic.ts`
Expected: 0 problemas.

---

## Slice 4 — Front: painel do chat e casca

### Task 11: `use-direct-thread.ts` (thread 1:1 com socket)

**Files:**
- Create: `features/meu-mundo/ui/chat/use-direct-thread.ts`

- [ ] **Step 1: Implementar**

```ts
// features/meu-mundo/ui/chat/use-direct-thread.ts — mm3d-32: thread 1:1 dentro do jogo.
//
// É a MESMA conversa do /mensagens (histórico na Freelandoo). Tempo real pelo
// socket do site: inscrição conferida no banco (conversation:subscribe) e
// "conversation:message" recarrega a thread — sem poll curto (regra 6).
"use client"

import { useCallback, useEffect, useState } from "react"
import { emitRealtime, onRealtime } from "@/lib/realtime"
import { getDirectMessages, postDirectMessage, postDirectRead, type DmMessage } from "../../data"
import { cleanDraft, DIRECT_MAX, newClientId } from "./chat-logic"

export function useDirectThread(token: string | null, conversationId: string | null, actorId: string | null) {
  const [items, setItems] = useState<DmMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token || !conversationId || !actorId) return
    const r = await getDirectMessages(token, conversationId, actorId)
    if (r.ok) {
      setItems(r.data.items)
      void postDirectRead(token, conversationId, actorId)
    } else setError(r.error)
  }, [token, conversationId, actorId])

  useEffect(() => {
    if (!conversationId) return
    setLoading(true)
    void load().finally(() => setLoading(false))
    emitRealtime("conversation:subscribe", { id_conversation: conversationId })
    const off = onRealtime("conversation:message", (p) => {
      const msg = p as { id_conversation?: string } | null
      if (msg?.id_conversation === conversationId) void load()
    })
    return () => {
      off()
      emitRealtime("conversation:unsubscribe", { id_conversation: conversationId })
    }
  }, [conversationId, load])

  const send = useCallback(
    async (raw: string) => {
      const text = cleanDraft(raw, DIRECT_MAX)
      if (!text || !token || !conversationId || !actorId) return false
      const clientId = newClientId()
      const tmp: DmMessage = { id: `pending:${clientId}`, text, at: new Date().toISOString(), mine: true }
      setItems((l) => [...l, tmp])
      const r = await postDirectMessage(token, conversationId, actorId, text, clientId)
      setItems((l) => (r.ok ? l.map((m) => (m.id === tmp.id ? r.data.message : m)) : l.filter((m) => m.id !== tmp.id)))
      if (!r.ok) setError(r.error)
      return r.ok
    },
    [token, conversationId, actorId],
  )

  return { items, loading, error, send }
}
```
Confira se `conversation:unsubscribe` existe no `socket.js` do back. Se não existir, apague a linha: as inscrições são reemitidas a cada `connect`, e sair da sala sem unsubscribe só deixa o socket recebendo eventos inofensivos.

### Task 12: `chat-panel.tsx`

**Files:**
- Create: `features/meu-mundo/ui/chat/chat-panel.tsx`

- [ ] **Step 1: Implementar** com só as peças do `hud-kit` (`EvoDialog`, `EvoButton`) e os tokens `MM`. Leia `ui/inbox/inbox-panel.tsx` inteiro antes e copie o jeito de abas e de lista de conversas de lá.

```tsx
// features/meu-mundo/ui/chat/chat-panel.tsx — mm3d-32: chat do jogo.
//
// Duas abas: Global (todos os jogadores, sala meu_mundo) e Conversas (as da
// Freelandoo, perfil-conta). Tocar numa conversa — ou "Mensagem" no card do
// jogador — abre a thread aqui dentro; "Abrir na Freelandoo" leva ao /mensagens.
// O histórico é um só: nada é guardado no jogo.
"use client"

import { useEffect, useRef, useState } from "react"
import { ExternalLink, Flag, Send } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { EvoButton, EvoDialog } from "../hud/hud-kit"
import { MM } from "../hud/tokens"
import { getConversations, type ChatLine, type ConversationRow } from "../../data"
import { cleanDraft, GLOBAL_MAX, type Line } from "./chat-logic"
import { useDirectThread } from "./use-direct-thread"

export type ChatView = { tab: "global" } | { tab: "dms" } | { tab: "thread"; conversationId: string; title: string }

export default function ChatPanel({
  token, view, setView, lines, onSendGlobal, onReport, onDirectTo, actorId, onClose,
}: {
  token: string | null
  view: ChatView
  setView: (v: ChatView) => void
  lines: Line[]
  onSendGlobal: (text: string) => void
  onReport: (id: string) => void
  onDirectTo: (line: ChatLine) => void
  actorId: string | null
  onClose: () => void
}) {
  const t = useTranslations("MeuMundo")
  return (
    <EvoDialog fixed z="z-[78]" width="max-w-lg" labelId="mm-chat-title" title={t("chTitle", "Chat")} onClose={onClose}>
      <div data-mm-panel className="flex flex-col" style={{ height: "min(70vh, 560px)" }}>
        <div className="mb-2 flex gap-2" role="tablist">
          <Tab on={view.tab === "global"} onClick={() => setView({ tab: "global" })}>{t("chGlobal", "Global")}</Tab>
          <Tab on={view.tab !== "global"} onClick={() => setView({ tab: "dms" })}>{t("chDms", "Conversas")}</Tab>
        </div>
        {view.tab === "global" && <GlobalTab lines={lines} onSend={onSendGlobal} onReport={onReport} onDirectTo={onDirectTo} />}
        {view.tab === "dms" && <DmList token={token} onOpen={(c) => setView({ tab: "thread", conversationId: c.id, title: c.title })} />}
        {view.tab === "thread" && <Thread token={token} actorId={actorId} conversationId={view.conversationId} title={view.title} onBack={() => setView({ tab: "dms" })} />}
      </div>
    </EvoDialog>
  )
}

function Tab({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button role="tab" aria-selected={on} onClick={onClick} className="flex-1 px-3 py-2 text-sm font-bold"
      style={{ borderRadius: MM.radius.card, background: on ? MM.rubyFill : MM.card, color: "#fff" }}>
      {children}
    </button>
  )
}

/** Lista que rola sozinha para o fim quando chega linha nova (se já estava no fim). */
function useStickBottom(dep: unknown) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) el.scrollTop = el.scrollHeight
  }, [dep])
  return ref
}

function Composer({ max, onSend, placeholder }: { max: number; onSend: (text: string) => void; placeholder: string }) {
  const t = useTranslations("MeuMundo")
  const [draft, setDraft] = useState("")
  const submit = () => {
    const text = cleanDraft(draft, max)
    if (!text) return
    onSend(text)
    setDraft("")
  }
  return (
    <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); submit() }}>
      <input autoFocus value={draft} maxLength={max} onChange={(e) => setDraft(e.target.value)} placeholder={placeholder}
        aria-label={placeholder} className="min-w-0 flex-1 px-3 py-2 text-sm text-white outline-none"
        style={{ borderRadius: MM.radius.card, background: MM.card }} />
      <EvoButton onClick={submit} aria-label={t("chSend", "Enviar")}><Send className="h-4 w-4" /></EvoButton>
    </form>
  )
}

function GlobalTab({ lines, onSend, onReport, onDirectTo }: { lines: Line[]; onSend: (t: string) => void; onReport: (id: string) => void; onDirectTo: (l: ChatLine) => void }) {
  const t = useTranslations("MeuMundo")
  const ref = useStickBottom(lines.length)
  return (
    <>
      <div ref={ref} className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1" data-mm-scroll>
        {lines.length === 0 && <p className="py-6 text-center text-sm text-white/60">{t("chEmpty", "Ninguém falou ainda. Diga oi!")}</p>}
        {lines.map((l) => (
          <div key={l.id} className="flex items-start gap-2" style={{ opacity: l.pending ? 0.6 : 1 }}>
            {l.avatar ? <img src={l.avatar} alt="" loading="lazy" className="h-7 w-7 rounded-full object-cover" /> : <div className="h-7 w-7 rounded-full bg-white/10" />}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs">
                {l.mine || !l.profileId
                  ? <span className="font-bold" style={{ color: l.mine ? MM.gold : "#fff" }}>{l.mine ? t("chYou", "Você") : l.name}</span>
                  : <button className="font-bold text-white underline-offset-2 hover:underline" onClick={() => onDirectTo(l as ChatLine)}>{l.name}</button>}
                {l.at && <time className="text-white/50">{new Date(l.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>}
                {!l.mine && !l.pending && (
                  <button aria-label={t("chReport", "Denunciar")} className="ml-auto text-white/40 hover:text-white" onClick={() => onReport(l.id)}><Flag className="h-3.5 w-3.5" /></button>
                )}
              </div>
              <p className="break-words text-sm text-white">{l.text}</p>
            </div>
          </div>
        ))}
      </div>
      <Composer max={GLOBAL_MAX} onSend={onSend} placeholder={t("chGlobalPh", "Fale com todos do Meu Mundo")} />
    </>
  )
}

function DmList({ token, onOpen }: { token: string | null; onOpen: (c: { id: string; title: string }) => void }) {
  const t = useTranslations("MeuMundo")
  const [rows, setRows] = useState<ConversationRow[] | null>(null)
  useEffect(() => {
    if (!token) return
    void getConversations(token).then((r) => setRows(r.ok ? r.data.items : []))
  }, [token])
  if (!rows) return <p className="py-6 text-center text-sm text-white/60">{t("chLoading", "Carregando…")}</p>
  if (!rows.length) return <p className="py-6 text-center text-sm text-white/60">{t("chNoDms", "Nenhuma conversa ainda. Toque num jogador e escolha Mensagem.")}</p>
  return (
    <div className="min-h-0 flex-1 space-y-1 overflow-y-auto" data-mm-scroll>
      {rows.map((c) => (
        <button key={c.id} onClick={() => onOpen({ id: c.id, title: c.title })} className="flex w-full items-center gap-2 px-2 py-2 text-left"
          style={{ borderRadius: MM.radius.card, background: MM.card }}>
          {c.avatar ? <img src={c.avatar} alt="" loading="lazy" className="h-8 w-8 rounded-full object-cover" /> : <div className="h-8 w-8 rounded-full bg-white/10" />}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-white">{c.title}</span>
            <span className="block truncate text-xs text-white/60">{c.preview}</span>
          </span>
          {c.unread > 0 && <span className="px-1.5 text-xs font-bold text-white" style={{ borderRadius: 999, background: MM.ruby }}>{c.unread > 99 ? "99+" : c.unread}</span>}
        </button>
      ))}
    </div>
  )
}

function Thread({ token, actorId, conversationId, title, onBack }: { token: string | null; actorId: string | null; conversationId: string; title: string; onBack: () => void }) {
  const t = useTranslations("MeuMundo")
  const { items, loading, error, send } = useDirectThread(token, conversationId, actorId)
  const ref = useStickBottom(items.length)
  return (
    <>
      <div className="mb-2 flex items-center gap-2">
        <button onClick={onBack} className="text-sm text-white/70 hover:text-white">‹ {t("chBack", "Conversas")}</button>
        <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">{title}</span>
        <a href={`/mensagens?c=${encodeURIComponent(conversationId)}`} target="_blank" rel="noopener" className="flex items-center gap-1 text-xs text-white/60 hover:text-white">
          {t("chOpenSite", "Abrir na Freelandoo")} <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <div ref={ref} className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1" data-mm-scroll>
        {loading && !items.length && <p className="py-6 text-center text-sm text-white/60">{t("chLoading", "Carregando…")}</p>}
        {items.map((m) => (
          <div key={m.id} className={m.mine ? "flex justify-end" : "flex"}>
            <p className="max-w-[80%] break-words px-3 py-2 text-sm text-white" style={{ borderRadius: MM.radius.card, background: m.mine ? MM.rubyFill : MM.card, opacity: m.id.startsWith("pending:") ? 0.6 : 1 }}>{m.text}</p>
          </div>
        ))}
        {error && <p className="text-center text-xs text-red-300">{error}</p>}
      </div>
      <Composer max={4000} onSend={(text) => void send(text)} placeholder={t("chDmPh", "Escreva uma mensagem")} />
    </>
  )
}
```
**Confira antes**:
- os campos reais de `ConversationRow` (`data.ts` ~:290; `id`, `title`, `avatar`, `preview`, `unread` foram vistos no tipo) e ajuste os nomes;
- se `EvoButton` aceita `aria-label` (ou use `title`);
- o caminho do import de `useTranslations`, copiado do `inbox-panel.tsx`;
- `<img>` em lista segue a regra 4; `rounded-full` só em avatar segue a regra 2. O jogo usa cantos arredondados pela exceção do mm3d-29.

### Task 13: Casca + HUD + rede

**Files:**
- Modify: `features/meu-mundo/engine/net.ts:178`
- Modify: `features/meu-mundo/ui/inbox/hud-inbox.tsx:12`
- Modify: `features/meu-mundo/ui/meu-mundo-shell.tsx` (estado ~:205, `onServerMessage` :216, `panelOpen` :357, `menuExtras` :362, render do `HudInbox` :471)

- [ ] **Step 1: `net.ts`**. Acrescente `"chat", "say"` ao fim da lista da linha 178 e atualize o comentário:
```ts
    // silêncio): "ride" (mm3d-15) e "fridge" (mm3d-28) ficaram de fora até 2026-10-25; "chat"/"say" = mm3d-32.
    for (const type of ["visits", "visit_ended", "seat", "stood", "bed", "life", "car_denied", "tuned", "ride", "fridge", "notice", "chat", "say"]) {
```

- [ ] **Step 2: `hud-inbox.tsx`**. Adicione as props `chat: number` e `onChat: () => void` e um terceiro `HudButton` ANTES do sino:
```tsx
export default function HudInbox({ counts, onBell, onMail, chat, onChat }: { counts: InboxCounts | null; onBell: () => void; onMail: () => void; chat: number; onChat: () => void }) {
```
```tsx
      <HudButton onClick={onChat} count={chat} label={t("chTitle", "Chat")} icon={<MessageCircle className="h-5 w-5" />} />
```
(import `MessageCircle` de `lucide-react`; use o `t` que o arquivo já tem).

- [ ] **Step 3: casca, estado e mensagens**

```tsx
  // ═══ mm3d-32: chat ═══
  const [chatView, setChatView] = useState<ChatView | null>(null)
  const [chatLines, setChatLines] = useState<Line[]>([])
  const [chatUnread, setChatUnread] = useState(0)
  const [dmUnread, setDmUnread] = useState(0)
  const [actorId, setActorId] = useState<string | null>(null)
  const chatOpenRef = useRef(false)
  chatOpenRef.current = !!chatView
  const bubbleRef = useRef<((session: string, text: string) => void) | null>(null)
```
Dentro de `onServerMessage`, antes do `if (type === "notice")`:
```tsx
      if (type === "chat") {
        const l = payload as ChatLine | null
        if (!l || typeof l.id !== "string") return
        setChatLines((cur) => mergeLines(cur, [l]))
        setChatUnread((n) => bumpUnread(n, l, chatOpenRef.current))
        return
      }
      if (type === "say") {
        const p = payload as { s?: string; t?: string } | null
        if (p && typeof p.s === "string" && typeof p.t === "string") bubbleRef.current?.(p.s, p.t)
        return
      }
```
O `bubbleRef` é preenchido na Task 15. Até lá, fica `null` e o balão é ignorado.

- [ ] **Step 4: casca, ações**

```tsx
  const openChat = useCallback((v: ChatView = { tab: "global" }) => {
    setChatView(v)
    if (v.tab === "global") setChatUnread(0)
    const token = getToken()
    if (!token) return
    void getChatGlobal(token).then((r) => r.ok && setChatLines((cur) => mergeLines(cur, r.data.items)))
  }, [])
  const sendGlobal = useCallback(async (text: string) => {
    const token = getToken()
    if (!token) return
    const clientId = newClientId()
    setChatLines((cur) => mergeLines(cur, [pendingLine(clientId, text)]))
    const r = await postChatGlobal(token, text)
    if (r.ok) setChatLines((cur) => confirmLine(cur, clientId, r.data.line))
    else {
      setChatLines((cur) => dropPending(cur, clientId))
      say(r.error) // o mesmo aviso de erro que a casca já usa (moderação: "Mensagem bloqueada.")
    }
  }, [say])
  const openDirect = useCallback(async (who: { session?: string; profileId?: string }, title: string) => {
    const token = getToken()
    if (!token) return
    const r = await postChatDirect(token, who)
    if (r.ok) setChatView({ tab: "thread", conversationId: r.data.conversation.id_conversation, title })
    else say(r.code === "self" ? t("chSelf", "Esse é você") : r.error)
  }, [say, t])
```
Ao abrir pela primeira vez, `actorId` vem do perfil-conta: use o `viewerProfileId` do card de perfil se já houver. Se não houver, busque `/api/users/me` (regra: a foto e o perfil vêm de `/users/me`) e procure o campo do perfil-conta (grep `is_user_account` em `components/mensagens/MensagensClient.tsx` mostra como o site escolhe o ator). Grave com `setActorId`.

O `say` e o `t` acima são os nomes que a casca já usa (`[run, say, t, errText]` em :352). Confira.

- [ ] **Step 5: casca, overlay, gaveta, tecla T e não-lidas do 1:1**

```tsx
  const panelOpen = !!inbox || itemsOpen || polensOpen || !!chatView
```
Em `menuExtras`, como primeiro item:
```tsx
      { id: "chat", label: t("chTitle", "Chat"), hint: t("menuChatHint", "Global e conversas"), icon: <MessageCircle className="h-5 w-5" />, kind: "nav",
        badge: chatUnread + dmUnread ? String(Math.min(99, chatUnread + dmUnread)) : undefined, onSelect: () => openChat() },
```
(acrescente `chatUnread, dmUnread, openChat` às deps).

Tecla T, com o mesmo cuidado do `Drawer` (ignora campo editável e painel aberto):
```tsx
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyT" || e.repeat || overlayOpen) return
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable || el.closest?.("[data-mm-panel]"))) return
      e.preventDefault()
      openChat()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [overlayOpen, openChat])
```
Não-lidas do 1:1: o socket já manda `nav-counts:changed`.
```tsx
  useEffect(() => {
    const refresh = () => { const tk = getToken(); if (tk) void getConversations(tk).then((r) => r.ok && setDmUnread(r.data.items.reduce((n, c) => n + (c.unread || 0), 0))) }
    refresh()
    return onRealtime("nav-counts:changed", refresh)
  }, [])
```

- [ ] **Step 6: casca, render**

```tsx
      {chatView && (
        <ChatPanel token={getToken()} view={chatView} setView={setChatView} lines={chatLines} actorId={actorId}
          onSendGlobal={(text) => void sendGlobal(text)}
          onReport={(id) => { const tk = getToken(); if (tk) void postChatReport(tk, id).then(() => say(t("chReported", "Denúncia enviada. Obrigado."))) }}
          onDirectTo={(l) => void openDirect(l.session ? { session: l.session } : { profileId: l.profileId || undefined }, l.name)}
          onClose={() => setChatView(null)} />
      )}
```
No `HudInbox` (:471): `chat={chatUnread + dmUnread} onChat={() => openChat()}`.

- [ ] **Step 7: Lint e build no worktree** (há WIP alheio no front)

Run: `npm run lint` e depois o build num worktree do commit (CLAUDE.md, Workflow).
Expected: 0 warnings e build OK.

### Task 14: Card de perfil e caixa de entrada abrem a thread no jogo

**Files:**
- Modify: `features/meu-mundo/ui/player-card/player-card.tsx:282-287` e `:382`
- Modify: `features/meu-mundo/ui/inbox/inbox-panel.tsx:624`
- Modify: `features/meu-mundo/ui/meu-mundo-shell.tsx` (onde o `PlayerCard` e o `InboxPanel` são renderizados)

- [ ] **Step 1: `PlayerCard` recebe a prop `onMessage?: (p: PlayerProfile) => void`.** Nos dois pontos onde hoje há `<a href="/mensagens?with=…" target="_blank">`, troque por um `<button>` com o mesmo visual:
```tsx
  <button type="button" onClick={() => onMessage?.(player)} className={/* as mesmas classes do <a> */}>
    {t("pcMessage", "Mensagem")}
  </button>
```
Se `onMessage` não vier, mantenha o `<a>` antigo, para não quebrar nenhum outro uso.

- [ ] **Step 2: Na casca**:
```tsx
  onMessage={(p) => { setActorId(p.viewerProfileId || actorId); setPlayerCard(null); void openDirect({ session: p.sessionId }, p.displayName || p.name) }}
```
O nome do setter do card (`setPlayerCard` aqui) é o que a casca já usa para fechá-lo. Confira com `grep -n "PlayerCard" features/meu-mundo/ui/meu-mundo-shell.tsx`.

- [ ] **Step 3: `InboxPanel`**. Na aba Mensagens, a linha da conversa (:624) ganha `onOpenConversation?: (id: string, title: string) => void`. Com ela, `<button>` fecha a caixa e chama `setChatView({ tab: "thread", conversationId: id, title })`. Sem ela, o `<a>` antigo continua.

- [ ] **Step 4: Lint**. Run: `npm run lint`. Expected: 0.

---

## Slice 5 — Front: balão 3D sobre a cabeça

### Task 15: `speech-bubble.ts`

**Files:**
- Create: `features/meu-mundo/engine/speech-bubble.ts`
- Modify: `features/meu-mundo/engine/player.ts` (o `Character` ganha `say(text)`, ao lado da etiqueta de nome :78-81 e do corte por distância :144-153)
- Modify: `features/meu-mundo/engine/game.ts` (método `sayFrom(session, text)` que acha o remoto pela sessão), e os equivalentes em `house-game.ts`/`hospital-game.ts` se tiverem remotos
- Modify: `features/meu-mundo/ui/meu-mundo-view.tsx` (expor `sayFrom` no `gameRef`, como `setBlocked` :260) e a casca (`bubbleRef.current = (s, t) => gameRef.current?.sayFrom(s, t)`)

- [ ] **Step 1: Leia `makeNameTag` (`engine/avatars.ts:634-667`) e copie o padrão** (DynamicTexture, plano com `billboardMode = 7`, material sem luz). Implemente:

```ts
// features/meu-mundo/engine/speech-bubble.ts — mm3d-32: balão de fala sobre a cabeça.
//
// Mesmo padrão da etiqueta de nome (avatars.ts makeNameTag): textura dinâmica
// num plano que sempre olha para a câmera. Um balão por boneco; fala nova
// substitui a anterior. Some sozinho em BUBBLE_MS e respeita o corte por
// distância da etiqueta (quality.ts tagCut). Tudo é solto no dispose().
import { DynamicTexture, Mesh, MeshBuilder, StandardMaterial, type Scene, type TransformNode } from "@babylonjs/core"

export const BUBBLE_MS = 6000
const W = 512
const H = 128

export class SpeechBubble {
  private mesh: Mesh
  private tex: DynamicTexture
  private until = 0

  constructor(scene: Scene, parent: TransformNode, y = 2.55) {
    this.tex = new DynamicTexture("mm-bubble", { width: W, height: H }, scene, true)
    this.tex.hasAlpha = true
    const mat = new StandardMaterial("mm-bubble-m", scene)
    mat.diffuseTexture = this.tex
    mat.emissiveTexture = this.tex
    mat.useAlphaFromDiffuseTexture = true
    mat.disableLighting = true
    mat.backFaceCulling = false
    this.mesh = MeshBuilder.CreatePlane("mm-bubble-p", { width: 2.4, height: 0.6 }, scene)
    this.mesh.material = mat
    this.mesh.billboardMode = 7
    this.mesh.parent = parent
    this.mesh.position.y = y
    this.mesh.isPickable = false
    this.mesh.setEnabled(false)
  }

  say(text: string, now = performance.now()) {
    const ctx = this.tex.getContext() as CanvasRenderingContext2D
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = "rgba(20,20,24,0.86)"
    ctx.beginPath()
    ctx.roundRect(4, 4, W - 8, H - 28, 22)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(W / 2 - 14, H - 24); ctx.lineTo(W / 2, H - 4); ctx.lineTo(W / 2 + 14, H - 24)
    ctx.fill()
    ctx.fillStyle = "#fff"
    ctx.font = "600 30px Archivo, system-ui, sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    const lines = wrap(ctx, text, W - 48).slice(0, 2)
    lines.forEach((l, i) => ctx.fillText(l, W / 2, lines.length === 1 ? (H - 24) / 2 : 34 + i * 36))
    this.tex.update()
    this.until = now + BUBBLE_MS
    this.mesh.setEnabled(true)
  }

  /** Chamar no laço do boneco: some no tempo ou fora do corte. */
  tick(visible: boolean, now = performance.now()) {
    this.mesh.setEnabled(visible && now < this.until)
  }

  dispose() {
    this.mesh.material?.dispose()
    this.tex.dispose()
    this.mesh.dispose()
  }
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const out: string[] = []
  let cur = ""
  for (const w of text.split(" ")) {
    const next = cur ? `${cur} ${w}` : w
    if (ctx.measureText(next).width <= max) cur = next
    else { if (cur) out.push(cur); cur = w }
  }
  if (cur) out.push(cur)
  if (out.length > 2) out[1] = `${out[1].slice(0, Math.max(0, out[1].length - 1))}…`
  return out
}
```

- [ ] **Step 2: `Character`**
  - Crie o balão preguiçosamente no primeiro `say` (`this.bubble ??= new SpeechBubble(scene, this.root)`).
  - No mesmo ponto em que a etiqueta liga e desliga pelo `tagCut`, chame `this.bubble?.tick(tagVisible)`.
  - No `dispose()` do `Character`, chame `this.bubble?.dispose()`.
  - Use os nomes reais de `root`/`scene` do `Character`.

- [ ] **Step 3: `game.ts`**: `sayFrom(session: string, text: string) { this.remotes.get(session)?.character.say(text) }`. Use o mapa real dos remotos (o mesmo de `game.ts:412-424`).

- [ ] **Step 4: Lint**. Run: `npm run lint`. Expected: 0.

---

## Slice 6 — i18n, harness, deploy e registro

### Task 16: i18n

**Files:**
- Create: `scripts/i18n-meu-mundo-chat-merge.js`

- [ ] **Step 1: Copie `scripts/i18n-meu-mundo-player-card-merge.js` e troque o objeto** por:

```js
const MEU_MUNDO = {
  chTitle: ["Chat", "Chat", "Chat"],
  chGlobal: ["Global", "Global", "Global"],
  chDms: ["Conversas", "Conversations", "Conversaciones"],
  chEmpty: ["Ninguém falou ainda. Diga oi!", "Nobody has spoken yet. Say hi!", "Nadie ha hablado todavía. ¡Saluda!"],
  chGlobalPh: ["Fale com todos do Meu Mundo", "Talk to everyone in Meu Mundo", "Habla con todos en Meu Mundo"],
  chDmPh: ["Escreva uma mensagem", "Write a message", "Escribe un mensaje"],
  chSend: ["Enviar", "Send", "Enviar"],
  chYou: ["Você", "You", "Tú"],
  chReport: ["Denunciar", "Report", "Denunciar"],
  chReported: ["Denúncia enviada. Obrigado.", "Report sent. Thank you.", "Denuncia enviada. Gracias."],
  chLoading: ["Carregando…", "Loading…", "Cargando…"],
  chNoDms: ["Nenhuma conversa ainda. Toque num jogador e escolha Mensagem.", "No conversations yet. Tap a player and choose Message.", "Aún no hay conversaciones. Toca a un jugador y elige Mensaje."],
  chBack: ["Conversas", "Conversations", "Conversaciones"],
  chOpenSite: ["Abrir na Freelandoo", "Open in Freelandoo", "Abrir en Freelandoo"],
  chSelf: ["Esse é você", "That's you", "Ese eres tú"],
  menuChatHint: ["Global e conversas", "Global and conversations", "Global y conversaciones"],
}
```

- [ ] **Step 2: Rodar 2× (idempotente) e conferir a cobertura**

Run: `node scripts/i18n-meu-mundo-chat-merge.js && node scripts/i18n-meu-mundo-chat-merge.js && node scripts/i18n-coverage.js features/meu-mundo/ui/chat/chat-panel.tsx`
Expected: a 2ª execução não muda nada (`git diff --stat messages/` é igual) e a cobertura dá 100% no painel. Rode o coverage também na casca, no `hud-inbox.tsx` e no `player-card.tsx` (regra do escoteiro).

### Task 17: Harness `chat32.js`

**Files:**
- Create: `MEU MUNDO 3D/pipeline/centro/harness-c/chat32.js` (copie a estrutura de `card31.js`: 2 contextos u0/u1, `__mmStreet()`, `/h/tp`)
- `srv31.js` precisa aplicar a mig 303 (confira a lista de migrations que ele aplica; se for por prefixo do Meu Mundo, acrescente `303_meu_mundo_chat.sql`).

- [ ] **Step 1: Casos** (cada um imprime `ok`/`FALHA` e conta no total, como o `card31.js`):
  1. u0 aperta T. O painel abre (`[data-mm-panel][role=dialog]`) e o boneco não anda com WASD enquanto o campo tem foco.
  2. u0 envia "oi centro". A linha aparece no u0 (sem "pendente" depois da resposta) e no u1. O contador do chat no u1 sobe com o painel fechado.
  3. u1 vê o balão sobre o boneco de u0. Leia isso de um gancho de teste `window.__mmBubbles()`, que devolve as sessões com balão ativo e é exposto só quando há `?u=` (o mesmo padrão do `__mmStreet`).
  4. Bloqueio: o harness insere `tb_user_block (u1 → u0)` por `/h/sql`, ou pela rota de bloqueio do back. u0 envia de novo e nada chega no u1, nem linha nem balão.
  5. 1:1: u1 toca no boneco de u0, aperta "Mensagem" e a thread abre dentro do jogo. u1 envia e u0 recebe pelo socket (com o socket do harness apontando para o back local). A conversa existe em `tb_conversation` entre os perfis-conta.
  6. Celular 412×780: o painel cabe sem rolagem da página; só a lista rola (`data-mm-scroll`). O `mobile28.js` mede isso; marque `data-mm-scroll` como exceção permitida no relatório.
- [ ] **Step 2: Rodar**

Run: `cd "MEU MUNDO 3D/pipeline/centro/harness-c" && ./rodar.sh build && node srv31.js & node chat32.js`
Expected: `chat32: N/N ok`. Guarde os PNGs do celular em `harness-c/out/chat32/`.

### Task 18: Commit, push e deploy

- [ ] **Step 1: Front**. Stage só os caminhos da entrega:
```bash
git add features/meu-mundo/ui/chat/ features/meu-mundo/data.ts features/meu-mundo/engine/net.ts \
  features/meu-mundo/engine/speech-bubble.ts features/meu-mundo/engine/player.ts features/meu-mundo/engine/game.ts \
  features/meu-mundo/ui/meu-mundo-view.tsx features/meu-mundo/ui/meu-mundo-shell.tsx features/meu-mundo/ui/inbox/hud-inbox.tsx \
  features/meu-mundo/ui/inbox/inbox-panel.tsx features/meu-mundo/ui/player-card/player-card.tsx \
  scripts/i18n-meu-mundo-chat-merge.js messages/pt-BR.json messages/en.json messages/es.json \
  docs/superpowers/plans/2026-10-25-meu-mundo-chat.md
git commit -m "feat(meu-mundo): mm3d-32 — chat Global e conversa com outro jogador

Global pela sala do jogo (filtrado por bloqueio no servidor) com balão sobre
a cabeça; 1:1 é a conversa da Freelandoo entre perfis-conta — o card de
perfil abre a thread dentro do jogo e ela aparece em /mensagens.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```
- [ ] **Step 2: Back**: commit do `meuMundoChatLogic.test.js` e push.
- [ ] **Step 3: Conferir os deploys**: Railway SUCCESS com a mig 303 aplicada e Vercel READY, pelas APIs.
- [ ] **Step 4: Registro**
  - Gatilho ativo do `CLAUDE.md`: mm3d-32, no máximo 10 linhas.
  - Detalhe em `docs/historico-claude/meu-mundo-3d.md` e `MEU MUNDO 3D/REGISTRO.md`.
  - Invariante novo em "Meu Mundo 3D" no `CLAUDE.md`: "Chat (mm3d-32): Global = sala `meu_mundo` do chat ao vivo, entregue SÓ pela sala do jogo (socket recusa) filtrada por bloqueio; 1:1 = `/conversations` entre perfis-conta; tipo novo da sala entra na lista de `net.ts`".
  - Memória `project_freelandoo_meu_mundo_chat.md` mais a linha no `MEMORY.md`.

---

## Fora do escopo (anotado para depois)

- Canal por **sala/proximidade** ("perto de você"): o Global e o balão cobrem a primeira versão.
- Moderação do 1:1: as DMs do site também não filtram palavrão hoje. Se for preciso, vale para o site inteiro, numa entrega própria.
- Silenciar o Global por jogador sem bloquear (só bloqueio por enquanto, pelo card).
- Voz.
- Abrir o chat para não-admin: segue a abertura do jogo.

## Self-review

- **Cobertura do pedido:**
  - Global: Tasks 1-7, 12, 13 e 15.
  - Conversa com outro personagem: Tasks 6, 10, 11, 12 e 14.
  - Histórico na Freelandoo: D2 e D4. Não há tabela nova de mensagem, e o e2e da Task 8 prova que a conversa aparece em `/conversations`.
- **Pontos que o executor TEM de conferir no código antes de digitar:**
  - nomes das constraints (Task 1);
  - `target_type` em `resolveTarget` (Task 6);
  - `getUserAccountProfileId` com `pool` (Task 6);
  - campos da API de mensagens (Task 10);
  - `ConversationRow` (Task 12);
  - `conversation:unsubscribe` (Task 11);
  - nomes de setters da casca (Tasks 13/14).

  Cada um está marcado com "Confira antes" no passo.
- **Tipos:** `ChatLine` (back `toLine` ↔ front `data.ts`) tem os mesmos campos (`id, text, at, name, avatar, profileId, session, mine`). `Line` do `chat-logic` é o superconjunto com `pending`/`clientId`. `ChatView` é usado igual no painel e na casca.
