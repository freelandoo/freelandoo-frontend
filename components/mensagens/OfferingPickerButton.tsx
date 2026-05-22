"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Package, ShoppingBag, BookOpen, Plus, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslations } from "@/components/i18n/I18nProvider"

type OfferingKind = "product" | "service" | "course"

interface Offering {
  id: string
  kind: OfferingKind
  name: string
  description?: string | null
  price_cents?: number | null
  image_url?: string | null
  duration_minutes?: number | null
  profile_display_name?: string | null
  username?: string | null
  public_url: string
}

interface OfferingsResponse {
  products?: Offering[]
  services?: Offering[]
  courses?: Offering[]
}

interface OfferingPickerButtonProps {
  /** Origem absoluta do site (sem barra final). Usada pra montar links absolutos. */
  origin?: string
  /** Chamado quando o usuário escolhe um item — recebe o markdown pronto pra inserir. */
  onPick: (markdown: string, item: Offering) => void
  disabled?: boolean
}

function formatBRL(cents: number | null | undefined): string | null {
  if (cents == null) return null
  if (cents === 0) return "Gratuito"
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  })
}

function kindLabel(kind: OfferingKind, t: ReturnType<typeof useTranslations>): string {
  if (kind === "product") return t("offeringProduct", "Produto")
  if (kind === "service") return t("offeringService", "Serviço")
  return t("offeringCourse", "Curso")
}

function kindIcon(kind: OfferingKind) {
  if (kind === "product") return ShoppingBag
  if (kind === "service") return Package
  return BookOpen
}

export function OfferingPickerButton({ origin, onPick, disabled }: OfferingPickerButtonProps) {
  const t = useTranslations("Conversation")
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<"menu" | OfferingKind>("menu")
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<Offering[]>([])
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  const close = useCallback(() => {
    setOpen(false)
    setView("menu")
    setItems([])
  }, [])

  const fetchType = useCallback(async (kind: OfferingKind) => {
    setView(kind)
    setLoading(true)
    setItems([])
    try {
      const type = kind === "product" ? "products" : kind === "service" ? "services" : "courses"
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
      const res = await fetch(`/api/me/offerings?type=${type}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as OfferingsResponse
      const list =
        kind === "product" ? data.products :
        kind === "service" ? data.services :
        data.courses
      setItems(Array.isArray(list) ? list : [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  const pick = useCallback(
    (item: Offering) => {
      const base = origin?.replace(/\/$/, "") || (typeof window !== "undefined" ? window.location.origin : "")
      const url = item.public_url.startsWith("http") ? item.public_url : `${base}${item.public_url}`
      const md = `[${item.name || kindLabel(item.kind, t)}](${url})`
      onPick(md, item)
      close()
    },
    [origin, onPick, close, t],
  )

  // Fecha no ESC
  useEffect(() => {
    if (!open) return
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") close()
    }
    window.addEventListener("keydown", onEsc)
    return () => window.removeEventListener("keydown", onEsc)
  }, [open, close])

  const ProductIcon = kindIcon("product")
  const ServiceIcon = kindIcon("service")
  const CourseIcon = kindIcon("course")

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        title={t("attachOfferingTitle", "Anexar produto, serviço ou curso")}
        aria-label={t("attachOfferingTitle", "Anexar produto, serviço ou curso")}
        className={cn(
          "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/65 transition-colors hover:bg-white/[0.08] hover:text-yellow-300",
          disabled && "cursor-not-allowed opacity-40",
        )}
      >
        <Plus className="h-4 w-4" />
      </button>

      {open && typeof window !== "undefined"
        ? createPortal(
            <div
              style={{ position: "fixed", inset: 0, zIndex: 80, pointerEvents: "auto" }}
              onClick={close}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-md rounded-t-2xl border border-white/10 bg-zinc-950/95 p-3 shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl sm:bottom-1/2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:translate-y-1/2 sm:rounded-2xl"
              >
                <div className="flex items-center justify-between gap-2 pb-2">
                  <h3 className="text-sm font-semibold text-white">
                    {view === "menu"
                      ? t("attachOfferingTitle", "Anexar produto, serviço ou curso")
                      : view === "product"
                      ? t("offeringPickProduct", "Escolha um produto")
                      : view === "service"
                      ? t("offeringPickService", "Escolha um serviço")
                      : t("offeringPickCourse", "Escolha um curso")}
                  </h3>
                  <button
                    type="button"
                    onClick={close}
                    aria-label={t("closeAriaLabel", "Fechar")}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-white/55 hover:bg-white/5 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {view === "menu" ? (
                  <ul className="grid gap-1.5 pt-1">
                    <li>
                      <button
                        type="button"
                        onClick={() => fetchType("product")}
                        className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left transition hover:border-yellow-400/40 hover:bg-white/[0.06]"
                      >
                        <ProductIcon className="h-4 w-4 text-emerald-300" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-white">{t("offeringProduct", "Produto")}</div>
                          <div className="text-[11px] text-white/45">{t("offeringProductHint", "Da loja dos seus subperfis")}</div>
                        </div>
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        onClick={() => fetchType("service")}
                        className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left transition hover:border-yellow-400/40 hover:bg-white/[0.06]"
                      >
                        <ServiceIcon className="h-4 w-4 text-sky-300" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-white">{t("offeringService", "Serviço")}</div>
                          <div className="text-[11px] text-white/45">{t("offeringServiceHint", "Pacote de serviço pra agendar")}</div>
                        </div>
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        onClick={() => fetchType("course")}
                        className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left transition hover:border-yellow-400/40 hover:bg-white/[0.06]"
                      >
                        <CourseIcon className="h-4 w-4 text-amber-300" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-white">{t("offeringCourse", "Curso")}</div>
                          <div className="text-[11px] text-white/45">{t("offeringCourseHint", "Seus cursos publicados")}</div>
                        </div>
                      </button>
                    </li>
                  </ul>
                ) : loading ? (
                  <div className="flex items-center justify-center px-6 py-10 text-white/55">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : items.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-white/50">
                    {t("offeringEmpty", "Você ainda não tem itens deste tipo.")}
                  </div>
                ) : (
                  <ul className="max-h-72 overflow-y-auto pt-1">
                    {items.map((it) => (
                      <li key={it.id}>
                        <button
                          type="button"
                          onClick={() => pick(it)}
                          className="flex w-full items-start gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-white/[0.05]"
                        >
                          {it.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={it.image_url}
                              alt=""
                              className="h-10 w-10 shrink-0 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-white/45">
                              {(() => {
                                const Icon = kindIcon(it.kind)
                                return <Icon className="h-4 w-4" />
                              })()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-white">{it.name}</div>
                            <div className="truncate text-[11px] text-white/45">
                              {it.profile_display_name ? `${it.profile_display_name} · ` : ""}
                              {formatBRL(it.price_cents) || ""}
                              {it.duration_minutes ? ` · ${it.duration_minutes}min` : ""}
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
