"use client"

// features/meu-mundo/ui/share/share-modal.tsx — A8: "Compartilhar" do menu do
// jogo. Explica a regra (10% do dinheiro de verdade que o convidado gastar no
// Meu Mundo cai na área de afiliados) e entrega o link com o MESMO código de
// afiliado da Carteira — o servidor cria o cadastro e o cupom se faltarem.

import { useEffect, useState } from "react"
import { Check, Copy, Gift, Loader2, Share2 } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getInvite, getShareLink, postInviteReward, type InviteState, type ShareLink } from "../../data"
import { speciesBody } from "../../characters/rules"
import { speciesName } from "../../characters/names"
import type { BodyId } from "../../types"
import { PORTRAIT } from "../portraits"
import { MM } from "../hud/tokens"
import { EvoButton, EvoDialog } from "../hud/hud-kit"

export function shareUrlOf(code: string, origin: string): string {
  return `${origin.replace(/\/$/, "")}/meu-mundo/admin?cupom=${encodeURIComponent(code)}`
}

export default function ShareModal({ onClose }: { onClose: () => void }) {
  const t = useTranslations("MeuMundo")
  const [link, setLink] = useState<ShareLink | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let alive = true
    const token = getToken()
    if (!token) {
      setError(t("shareError", "Não foi possível gerar seu link agora."))
      return
    }
    void getShareLink(token).then((r) => {
      if (!alive) return
      if (r.ok) setLink(r.data)
      else setError(r.error && r.error !== "network" ? r.error : t("shareError", "Não foi possível gerar seu link agora."))
    })
    return () => {
      alive = false
    }
  }, [t])

  const url = link && typeof window !== "undefined" ? shareUrlOf(link.code, window.location.origin) : ""
  const percent = link ? `${link.percent.toLocaleString()}%` : "10%"

  const copy = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* sem permissão de área de transferência: o campo segue selecionável */
    }
  }
  const nativeShare = async () => {
    if (!url || typeof navigator.share !== "function") return copy()
    try {
      await navigator.share({ title: "Meu Mundo", text: t("shareText", "Vem jogar o Meu Mundo comigo!"), url })
    } catch {
      /* cancelou */
    }
  }

  return (
    <EvoDialog
      fixed
      z="z-[86]"
      labelId="mm-share"
      eyebrow={t("shareEyebrow", "Convide e ganhe")}
      title={t("shareTitle", "Compartilhar o Meu Mundo")}
      onClose={onClose}
      footer={
        <div className="flex w-full flex-wrap justify-end gap-2">
          <EvoButton variant="ghost" onClick={onClose}>
            {t("shareClose", "Fechar")}
          </EvoButton>
          <EvoButton variant="primary" icon={<Share2 className="h-4 w-4" />} disabled={!url} onClick={nativeShare}>
            {t("shareSend", "Enviar link")}
          </EvoButton>
        </div>
      }
    >
      <div className="space-y-3 text-[14px] leading-relaxed" style={{ color: MM.text }}>
        <p>
          {t(
            "shareRule",
            "Quem entrar pelo seu link e gastar dinheiro de verdade no Meu Mundo rende {p} para você, na área de afiliados da Carteira.",
          ).replace("{p}", percent)}
        </p>
        <ul className="list-disc space-y-1 pl-5 text-[13px]" style={{ color: MM.muted }}>
          <li>{t("shareRuleCounts", "Conta: Gold comprado dentro do jogo e, em breve, personagens e itens pagos em reais.")}</li>
          <li>{t("shareRuleNot", "Não conta: Esmeralda ganha jogando ou engajando.")}</li>
          <li>{t("shareRuleBond", "A primeira compra pelo seu link liga a pessoa a você; as próximas também rendem.")}</li>
          <li>{t("shareRuleTerms", "Compra estornada não rende. Prazo e saque seguem a regra do programa de afiliados.")}</li>
        </ul>

        <InviteGame t={t} />

        {error ? (
          <p className="rounded-none p-2.5 text-[13px]" style={{ background: MM.card, border: `1px solid ${MM.border}`, color: MM.text }}>
            {error}
          </p>
        ) : !link ? (
          <p className="flex items-center gap-2 text-[13px]" style={{ color: MM.muted }}>
            <Loader2 className="h-4 w-4 animate-spin" /> {t("shareLoading", "Gerando seu link…")}
          </p>
        ) : (
          <div>
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: MM.muted }}>
              {t("shareLinkLabel", "Seu link")} · {link.code}
            </span>
            <div className="flex items-stretch gap-2">
              <input
                readOnly
                value={url}
                onFocus={(e) => e.currentTarget.select()}
                aria-label={t("shareLinkLabel", "Seu link")}
                className="min-w-0 flex-1 rounded-none px-2.5 py-2 text-[13px] outline-none"
                style={{ background: MM.card, border: `1px solid ${MM.goldBorder}`, color: MM.text }}
              />
              <EvoButton variant="gold" size="sm" icon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} onClick={copy}>
                {copied ? t("shareCopied", "Copiado") : t("shareCopy", "Copiar")}
              </EvoButton>
            </div>
            {!link.enabled && (
              <p className="mt-2 text-[12px]" style={{ color: MM.muted }}>
                {t("sharePaused", "O programa está pausado agora: o link funciona, mas as compras não rendem até ele voltar.")}
              </p>
            )}
          </div>
        )}
      </div>
    </EvoDialog>
  )
}

/**
 * gacha-v1 (24/11/2026): CONVITES DO JOGO (registro próprio do servidor, fora da comissão acima). Quem entra pela
 * 1ª vez com o seu link e joga 15 minutos em até 14 dias rende 10 fragmentos de um personagem que VOCÊ escolhe;
 * não repete na rodada e, depois dos 12, a lista recomeça. Só totais: nenhum dado dos convidados aparece.
 */
function InviteGame({ t }: { t: (k: string, f: string) => string }) {
  const [st, setSt] = useState<InviteState | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    const token = getToken()
    if (!token) return
    let alive = true
    void getInvite(token).then((r) => alive && r.ok && setSt(r.data))
    return () => {
      alive = false
    }
  }, [])
  if (!st) return null
  const pick = async (character: string) => {
    const token = getToken()
    if (!token || busy) return
    setBusy(true)
    const r = await postInviteReward(token, character)
    setBusy(false)
    if (!r.ok) return setMsg(r.error)
    setSt({ ...st, counts: r.data.counts, round: r.data.round })
    setMsg(t("invGot", "+{n} fragmentos de {c} na mochila.").replace("{n}", String(r.data.reward.qty)).replace("{c}", speciesName(r.data.reward.character, t)))
  }
  const c = st.counts
  return (
    <div className="p-2.5" style={{ background: MM.card, border: `1px solid ${MM.goldBorder}` }}>
      <div className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.1em]" style={{ color: MM.text }}>
        <Gift className="h-4 w-4" /> {t("invTitle", "Convites do jogo")}
      </div>
      <p className="mt-1 text-[13px]" style={{ color: MM.muted }}>
        {t("invRule", "Quem entra no Meu Mundo pela primeira vez com o seu link e joga {m} minutos em até {d} dias rende {n} fragmentos de um personagem que você escolhe. Não repete até passar pelos 12; depois a lista recomeça.")
          .replace("{m}", String(Math.round(st.rules.activationMs / 60000)))
          .replace("{d}", String(st.rules.activationDays))
          .replace("{n}", String(st.rules.qty))}
      </p>
      <p className="mt-1 text-[12px]" style={{ color: MM.muted }}>
        {t("invCounts", "Esperando jogar: {w} · prêmios para escolher: {p} · entregues: {e}")
          .replace("{w}", String(c.waiting))
          .replace("{p}", String(c.pending))
          .replace("{e}", String(c.delivered))}
        {c.capped > 0 && ` · ${t("invCapped", "acima do limite de {n} em {d} dias: {x}").replace("{n}", String(st.rules.cap)).replace("{d}", String(st.rules.capDays)).replace("{x}", String(c.capped))}`}
      </p>
      {c.pending > 0 && (
        <div className="mt-2">
          <span className="text-[12px]" style={{ color: MM.text }}>{t("invPick", "Escolha o personagem (rodada {r}):").replace("{r}", String(st.round.round))}</span>
          <div className="mt-1 grid grid-cols-4 gap-1.5 sm:grid-cols-6">
            {st.round.available.map((id) => {
              const body = speciesBody(id, "m", "young") as BodyId | null
              return (
                <button key={id} type="button" disabled={busy} onClick={() => void pick(id)} className="flex flex-col items-center p-1" style={{ background: MM.card, border: `1px solid ${MM.border}` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={(body && PORTRAIT[body]) || PORTRAIT.sergio} alt="" loading="lazy" className="aspect-square w-full object-cover" />
                  <span className="line-clamp-1 text-[10px]" style={{ color: MM.text }}>{speciesName(id, t)}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
      {msg && <p className="mt-1.5 text-[12px]" style={{ color: MM.text }} role="status">{msg}</p>}
    </div>
  )
}
