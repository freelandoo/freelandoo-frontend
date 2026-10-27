# Esportes — repaginada + frequência + mensalidades pela Freelandoo (2026-10-27)

Pedido do Alex (sessão de 2026-10-27, decisões fechadas no grill): calendário de
frequência com ✓/✕, histórico de mensalidades com "Pagar" pela Freelandoo
(Mercado Pago, Freelandoo fica com tarifa MP + R$ 2,50, repasse por PIX manual
à chave cadastrada — pode ser Asaas), repaginada visual + motion da comunidade
Esportes inteira, checklist do treino "que dá prazer de apertar".

Specs (fonte do visual e do movimento — ler antes de cada slice de front):
- `docs/superpowers/specs/2026-10-27-esportes-redesign-visual.md` ("PLACAR BRASA")
- `docs/superpowers/specs/2026-10-27-esportes-redesign-motion.md` (só framer-motion)

Decisões do Alex (todas pela recomendação):
- Dinheiro = opção A: MP da Freelandoo recebe → `tb_academy_payout` aguardando
  → aprovado em 8 dias (PIX e cartão) → admin faz o PIX e marca pago. Estorno
  antes do PIX = repasse revertido + `reopened` na academia; depois = "devido
  pela academia", admin resolve.
- "Pagar" só aparece com chave PIX cadastrada + API da academia com
  `supports_paid_callback` + cobrança pendente/vencida. Valor reconferido na API
  na hora; aluno paga o valor exato; tarifa real do MP e R$ 2,50 saem da academia.
- Recebimentos: chave PIX + titular + CPF/CNPJ do titular (dono ou academia),
  selados (`secretBox`, entram em `ALVOS` do reseal).
- Calendário: ✓ dia com catraca; ✕ dia passado sem catraca desde o vínculo
  (domingo incluído); hoje neutro com anel quadrado; futuro só número; ‹ › até o
  vínculo; total do mês + sequência. Sem WebGPU. Presilha reta, papel off-white,
  semana começa no domingo nos 3 idiomas, herói dos Indicadores = Consistência.
- Coliseu: implementar o lado dele; baixa = `receiveInCash` no Asaas (não
  cancela), reabrir = `undoReceivedInCash`. Deploy do Coliseu é pendência do Alex.
- Termos (intermediação) ficam na pendência jurídica existente.

## Slices

### Backend (freelandoo-backend)
- **B1 — dados do calendário e do histórico.** Mig 310: `tb_academy_payment`
  ganha `method`, `paid_via` ('academy'|'freelandoo'); `tb_academy` ganha
  `pay_callback` (capacidade lida da API). `GET /fitness/academies/:id_member/month?ym=`
  → `{ linked_at, ym, days[], present, elapsed, streak }`;
  `GET /fitness/academies/:id_member/payments` → histórico completo + `pay_enabled`.
  `summary` passa a trazer `linked_at`.
- **B2 — Recebimentos.** `tb_academy_payout_account` selada; dono:
  `GET/PUT /academies/:id/payout-account` (resposta mascarada).
- **B3 — pagar e repassar.** Fluxo `academy_fee` em `paymentFlows.js`;
  `tb_academy_fee_settings` (R$ 2,50, 8 dias), `tb_academy_fee_order`,
  `tb_academy_payout`. `POST /fitness/academies/:id_member/payments/:external_id/pay`
  (reconfere `GET payments/:id` na API) → checkout MP. Webhook: confirma
  idempotente → tarifa real → repasse → `POST payments/:id/paid` na academia
  (sem resposta = varredor tenta de novo). Estorno/expiração juntos; entra em
  `PaymentOpsStorage.SOURCES`; varredor libera repasses; admin lista e marca
  pago; dono vê repasses (`GET /academies/:id/payouts`); notificação ao dono.
  Contrato `docs/API_GYM_PROVIDER.md` atualizado.
- **C1 — Coliseu** (`Coliseu/coliseu-backend`): `GET capabilities`,
  `GET payments/:id`, `POST payments/:id/paid`, `POST payments/:id/reopened`,
  `method` na lista; coluna `freelandooRef` (idempotência). vitest.

### Frontend (specs mandam; ordem do designer)
- **F1 — fundação**: tokens `sp-tokens`, texturas, `motion.ts` + primitivos
  (Reveal, TiltCard, CountUp, StampMark, RingMeter, MonthSheet, PressButton,
  CheckButton, FlipCounter), `MotionConfig reducedMotion="user"` na casca.
- **F2 — Indicadores** (bento + gráficos).
- **F3 — headcard + raiz**.
- **F4 — Minha academia**: `CalendarObject` + mensalidades em talão + Pagar.
- **F5 — Treino** com o checklist (seção 8 da spec visual + seção de check do motion).
- **F6 — Histórico**. **F7 — Modais**.
- **F8 — academia [slug] + Central do dono** (Recebimentos/Repasses) + admin de repasses.
- **F9 — vitrine, membros, ranking**. **F10 — qualidade** (reduced-motion, contraste,
  i18n coverage, 375 px).

Cada slice: lint + build (worktree quando houver WIP alheio), i18n 3 idiomas,
commit + push só dos caminhos da entrega.
