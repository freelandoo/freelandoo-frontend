"use client"

// features/meu-mundo/ui/place/seller-dialog.tsx — a conversa com o vendedor
// do centro (mm3d-37e), sentado na sala "Imóveis e Veículos" do supermercado.
// Casas: o nível da sua casa (subir paga o nível novo, descer é de graça).
// Carros: a cor do seu superesportivo (cada cor se compra uma vez e depois
// troca à vontade). Tudo em moedas do jogo; quem decide é o servidor.

import { useCallback, useEffect, useState, type ReactNode } from "react"
import { Car, Check, Home } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"
import { getShop, postShopHouse, postShopPaint } from "../../data"
import type { ShopCatalog } from "../../types"
import { EvoButton, EvoDialog } from "../hud/hud-kit"
import { MM } from "../hud/tokens"

type Tr = (key: string, fallback: string) => string

/** Nome de cada cor (o id é do servidor). */
function paintName(id: string, t: Tr) {
  return (
    {
      vermelho: t("paintRed", "Vermelho"),
      preto: t("paintBlack", "Preto"),
      branco: t("paintWhite", "Branco"),
      prata: t("paintSilver", "Prata"),
      azul: t("paintBlue", "Azul"),
      amarelo: t("paintYellow", "Amarelo"),
      verde: t("paintGreen", "Verde"),
      laranja: t("paintOrange", "Laranja"),
      roxo: t("paintPurple", "Roxo"),
      rosa: t("paintPink", "Rosa"),
    } as Record<string, string>
  )[id] ?? id
}

export interface SellerDialogProps {
  placeName: string
  onClose: () => void
  /** Aviso curto de quem chamou (deu certo / deu errado). */
  onToast: (text: string, tone: "ouro" | "magenta") => void
}

export function SellerDialog({ placeName, onClose, onToast }: SellerDialogProps) {
  const t = useTranslations("MeuMundo") as Tr
  const [tab, setTab] = useState<"house" | "car">("house")
  const [cat, setCat] = useState<ShopCatalog | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const token = getToken()
    if (!token) return
    const r = await getShop(token)
    if (r.ok) setCat(r.data)
    else onToast(r.error || t("pvFail", "Não deu certo agora. Tente de novo."), "magenta")
  }, [onToast, t])

  useEffect(() => {
    void load()
  }, [load])

  const run = async (fn: (token: string) => Promise<{ ok: boolean; error?: string }>, done: string) => {
    const token = getToken()
    if (!token || busy) return
    setBusy(true)
    const r = await fn(token)
    setBusy(false)
    if (!r.ok) onToast(r.error || t("pvFail", "Não deu certo agora. Tente de novo."), "magenta")
    else onToast(done, "ouro")
    await load()
  }

  const coins = cat?.coins != null ? Math.floor(cat.coins) : null
  const tabBtn = (id: "house" | "car", label: string, icon: ReactNode) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className="flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-[14px] font-semibold"
      style={{ background: tab === id ? MM.rubyBorder : "transparent", color: tab === id ? MM.text : MM.muted, boxShadow: `inset 0 0 0 1px ${MM.border}` }}
    >
      {icon}
      {label}
    </button>
  )

  return (
    <EvoDialog labelId="mm-seller" eyebrow={placeName} title={t("sellerTitle", "Vendedor")} onClose={onClose} width="max-w-lg">
      <p>{t("sellerHello", "Olá! Quer uma casa maior, ou uma cor nova para o seu carro? É só escolher.")}</p>
      <p className="mt-1 text-[13px]" style={{ color: MM.muted }}>
        {coins != null ? t("sellerCoins", "Suas moedas: {n}").replace("{n}", String(coins)) : t("pvMenuLoading", "Abrindo o cardápio…")}
      </p>
      <div className="mt-3 flex gap-2">
        {tabBtn("house", t("sellerHouses", "Casas"), <Home className="h-4 w-4" />)}
        {tabBtn("car", t("sellerCars", "Carros"), <Car className="h-4 w-4" />)}
      </div>

      {cat && tab === "house" && (
        <div className="mt-3 flex flex-col">
          {!cat.house ? (
            <p>{t("sellerNoHouse", "Você ainda não tem casa no bairro.")}</p>
          ) : (
            cat.houses.map((h) => (
              <div key={h.level} className="flex items-center gap-3 border-b py-2" style={{ borderColor: MM.border }}>
                <Home className="h-5 w-5 shrink-0" style={{ color: h.current ? MM.gold : MM.muted }} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{t("sellerLevel", "Casa nível {n}").replace("{n}", String(h.level))}</div>
                  <div className="text-[12px]" style={{ color: MM.muted }}>
                    {h.current
                      ? t("sellerYours", "A sua casa hoje")
                      : h.price > 0
                        ? t("sellerPrice", "{n} moedas").replace("{n}", String(h.price))
                        : t("sellerFree", "De graça (menor que a sua)")}
                  </div>
                </div>
                {h.current ? (
                  <Check className="h-5 w-5" style={{ color: MM.gold }} />
                ) : (
                  <EvoButton
                    size="sm"
                    variant={coins != null && coins < h.price ? "ghost" : "gold"}
                    loading={busy}
                    onClick={() => void run((tk) => postShopHouse(tk, h.level), t("sellerHouseDone", "Casa trocada: nível {n}").replace("{n}", String(h.level)))}
                  >
                    {h.price > 0 ? t("sellerBuy", "Comprar") : t("sellerSwap", "Trocar")}
                  </EvoButton>
                )}
              </div>
            ))
          )}
          <p className="mt-2 text-[12px]" style={{ color: MM.muted }}>
            {t("sellerHouseNote", "A casa troca na hora no seu lote. Ninguém pode estar dentro dela na troca.")}
          </p>
        </div>
      )}

      {cat && tab === "car" && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {cat.paints.map((p) => {
            const current = cat.house?.paint === p.id
            return (
              <div key={p.id} className="flex flex-col items-center gap-1.5 rounded-xl p-2" style={{ boxShadow: `inset 0 0 0 1px ${current ? MM.gold : MM.border}` }}>
                <span className="h-9 w-9 rounded-full" style={{ background: p.hex, boxShadow: "inset 0 -6px 10px rgba(0,0,0,0.25)" }} />
                <span className="text-[13px] font-semibold">{paintName(p.id, t)}</span>
                {current ? (
                  <span className="text-[12px]" style={{ color: MM.gold }}>
                    {t("sellerInUse", "No seu carro")}
                  </span>
                ) : (
                  <EvoButton
                    size="sm"
                    variant={!p.owned && coins != null && coins < p.price ? "ghost" : "gold"}
                    loading={busy}
                    onClick={() => void run((tk) => postShopPaint(tk, p.id), t("sellerPaintDone", "Carro pintado: {c}").replace("{c}", paintName(p.id, t)))}
                  >
                    {p.owned ? t("sellerUse", "Usar") : t("sellerPrice", "{n} moedas").replace("{n}", String(p.price))}
                  </EvoButton>
                )}
              </div>
            )
          })}
        </div>
      )}
    </EvoDialog>
  )
}
