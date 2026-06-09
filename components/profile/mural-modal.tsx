"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, MessageCircle, Clock, Megaphone, Package, Sparkles, MapPin, GraduationCap } from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */
interface MuralRequest {
  id_request: string
  description: string
  machine_name?: string
  category_name?: string
  estado?: string
  municipio?: string
  user_name?: string
  user_avatar?: string
  created_at: string
  responses_count?: number
}

interface ProductRequestMuralItem {
  id_product_request: string
  title: string
  description: string
  city: string
  state: string
  min_price_cents: number | null
  max_price_cents: number | null
  reference_image_url: string | null
  status: string
  created_at: string
  id_product_category: number
  category_name: string
  buyer_username?: string
  responses_count?: number
}

interface CourseRequestMuralItem {
  id_course_request: string
  description: string
  machine_name?: string
  category_name?: string
  user_name?: string
  created_at: string
  responses_count?: number
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  profileId: string
}

function formatPrice(cents: number | null) {
  if (cents == null) return "—"
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */
function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null
}
function headers(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
}
function initials(name: string) {
  if (!name) return "?"
  const p = name.split(" ")
  return p[0][0] + (p[1]?.[0] || "")
}

type ReqKind = "service" | "product" | "course"

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export function MuralModal({ open, onOpenChange, profileId }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<"services" | "products" | "courses">("services")
  const [muralItems, setMuralItems] = useState<MuralRequest[]>([])
  const [productItems, setProductItems] = useState<ProductRequestMuralItem[]>([])
  const [courseItems, setCourseItems] = useState<CourseRequestMuralItem[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [loadingCourses, setLoadingCourses] = useState(false)
  const [opening, setOpening] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Mark mural as seen when opening
  useEffect(() => {
    if (!open) return
    const token = getToken()
    if (!token) return
    fetch("/api/service-requests/mural/mark-seen", {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify({ id_profile: profileId }),
    }).catch(() => {})
  }, [open, profileId])

  // ── Responder → cria/abre a conversa e leva pra Mensagens (aba O.S.) ───────
  const respond = useCallback(
    async (kind: ReqKind, id_request: string) => {
      const token = getToken()
      if (!token) return
      setError(null)
      setOpening(id_request)
      try {
        let url = ""
        let body: Record<string, unknown> = {}
        if (kind === "service") {
          url = `/api/service-requests/${id_request}/respond`
          body = { id_profile: profileId, action: "open" }
        } else if (kind === "course") {
          url = `/api/course-requests/${id_request}/respond`
          body = { id_profile: profileId, action: "accept" }
        } else {
          url = `/api/product-requests/${id_request}/conversation`
          body = { id_profile: profileId }
        }
        const res = await fetch(url, { method: "POST", headers: headers(token), body: JSON.stringify(body) })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(data?.error || "Não foi possível abrir a conversa")
          return
        }
        const idResponse = data?.response?.id_response || data?.id_response || null
        onOpenChange(false)
        router.push(idResponse ? `/mensagens?tab=os&response=${encodeURIComponent(idResponse)}` : `/mensagens?tab=os`)
      } catch {
        setError("Erro de conexão")
      } finally {
        setOpening(null)
      }
    },
    [profileId, onOpenChange, router],
  )

  // Fetch services mural
  const fetchData = useCallback(async () => {
    const token = getToken()
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(`/api/service-requests/mural?id_profile=${encodeURIComponent(profileId)}`, {
        headers: headers(token),
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.requests)) setMuralItems(data.requests)
        else if (Array.isArray(data.items)) setMuralItems(data.items)
        else if (Array.isArray(data)) setMuralItems(data)
        else setMuralItems([])
      }
    } catch { /* silent */ }
    setLoading(false)
  }, [profileId])

  useEffect(() => {
    if (!open) return
    const timeout = window.setTimeout(() => { void fetchData() }, 0)
    return () => window.clearTimeout(timeout)
  }, [open, fetchData])

  const fetchCourseMural = useCallback(async () => {
    const token = getToken()
    if (!token) return
    setLoadingCourses(true)
    try {
      const res = await fetch(`/api/course-requests/mural?id_profile=${encodeURIComponent(profileId)}`, {
        headers: headers(token),
      })
      if (res.ok) {
        const data = await res.json()
        setCourseItems(Array.isArray(data?.items) ? data.items : [])
      } else {
        setCourseItems([])
      }
    } catch { setCourseItems([]) }
    setLoadingCourses(false)
  }, [profileId])

  useEffect(() => {
    if (!open || tab !== "courses") return
    void fetchCourseMural()
  }, [open, tab, fetchCourseMural])

  const fetchProductMural = useCallback(async () => {
    const token = getToken()
    if (!token) return
    setLoadingProducts(true)
    try {
      const res = await fetch(`/api/product-requests/mural?id_profile=${encodeURIComponent(profileId)}`, {
        headers: headers(token),
      })
      if (res.ok) {
        const data = await res.json()
        setProductItems(Array.isArray(data?.items) ? data.items : [])
      } else {
        setProductItems([])
      }
    } catch { setProductItems([]) }
    setLoadingProducts(false)
  }, [profileId])

  useEffect(() => {
    if (!open || tab !== "products") return
    void fetchProductMural()
  }, [open, tab, fetchProductMural])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[88vh] flex flex-col overflow-hidden p-0 gap-0 border-2 border-[#0B0B0D] bg-[#F1EDE2] text-[#0B0B0D]">
        <DialogHeader className="px-6 pt-6 pb-4 border-b-2 border-[#0B0B0D]/15">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#0B0B0D] bg-[#F2B705] text-[#1A1505]">
              <Megaphone className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="fl-display text-2xl text-[#0B0B0D]">Mural</DialogTitle>
              <DialogDescription className="text-xs text-[#5b554b]">
                Solicitações compatíveis com seu perfil. Ao responder, a conversa abre em <span className="font-bold text-[#E0A500]">Mensagens → O.S.</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Segmented tabs */}
        <div className="px-6 pt-4">
          <div className="inline-flex rounded-xl border-2 border-[#0B0B0D]/15 bg-[#0B0B0D]/[0.03] p-1">
            <SegmentButton active={tab === "services"} onClick={() => setTab("services")} icon={<Sparkles className="h-3.5 w-3.5" />} label="Serviços" count={muralItems.length} />
            <SegmentButton active={tab === "products"} onClick={() => setTab("products")} icon={<Package className="h-3.5 w-3.5" />} label="Produtos" count={productItems.length || undefined} />
            <SegmentButton active={tab === "courses"} onClick={() => setTab("courses")} icon={<GraduationCap className="h-3.5 w-3.5" />} label="Cursos" count={courseItems.length || undefined} />
          </div>
        </div>

        {error && (
          <p className="mx-6 mt-3 rounded-xl border-2 border-[#dc2626]/40 bg-[#dc2626]/10 px-3 py-2 text-xs font-medium text-[#b91c1c]">{error}</p>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-4 [scrollbar-width:thin]">
          <AnimatePresence mode="wait" initial={false}>
            {tab === "services" && (
              <motion.div key="services" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ type: "spring", stiffness: 220, damping: 26 }} className="space-y-2.5">
                {loading ? (
                  <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[#E0A500]" /></div>
                ) : muralItems.length === 0 ? (
                  <EmptyState icon={<Megaphone className="h-8 w-8" />} title="Nenhuma solicitação nova" hint="Quando alguém pedir um serviço compatível, ela aparece aqui em tempo real." />
                ) : (
                  muralItems.map((req) => (
                    <motion.button
                      key={req.id_request}
                      type="button"
                      onClick={() => respond("service", req.id_request)}
                      disabled={opening === req.id_request}
                      whileHover={{ y: -1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 28 }}
                      className="group flex w-full items-start gap-3 rounded-2xl border-2 border-[#0B0B0D]/15 bg-[#0B0B0D]/[0.03] p-3.5 text-left transition-all hover:border-[#0B0B0D] hover:bg-[#F2B705]/10 disabled:opacity-60"
                    >
                      <Avatar className="h-10 w-10 shrink-0 border-2 border-[#0B0B0D]">
                        {req.user_avatar && <AvatarImage src={req.user_avatar} alt={req.user_name || ""} />}
                        <AvatarFallback className="text-xs bg-[#F2B705]/20 text-[#0B0B0D]">{initials(req.user_name || "?")}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-[#0B0B0D]">{req.user_name || "Usuário"}</span>
                          <span className="text-[10px] text-[#8a8275]">{new Date(req.created_at).toLocaleDateString("pt-BR")}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          {req.machine_name && <Badge className="border-2 border-[#0B0B0D]/15 bg-[#F1EDE2] text-[10px] text-[#0B0B0D] h-5 py-0">{req.machine_name}</Badge>}
                          {req.category_name && <Badge className="border-2 border-[#0B0B0D] bg-[#F2B705] text-[10px] text-[#1A1505] h-5 py-0">{req.category_name}</Badge>}
                          {req.municipio && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-[#8a8275]"><MapPin className="h-2.5 w-2.5" />{req.municipio}{req.estado ? `, ${req.estado}` : ""}</span>
                          )}
                        </div>
                        {req.description && <p className="mt-1.5 text-xs text-[#5b554b] line-clamp-2">{req.description}</p>}
                      </div>
                      {opening === req.id_request ? <Loader2 className="h-4 w-4 animate-spin text-[#E0A500] shrink-0 mt-1" /> : <MessageCircle className="h-4 w-4 text-[#0B0B0D]/35 group-hover:text-[#E0A500] transition-colors shrink-0 mt-1" />}
                    </motion.button>
                  ))
                )}
              </motion.div>
            )}

            {tab === "courses" && (
              <motion.div key="courses" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ type: "spring", stiffness: 220, damping: 26 }} className="space-y-2.5">
                {loadingCourses ? (
                  <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[#E0A500]" /></div>
                ) : courseItems.length === 0 ? (
                  <EmptyState icon={<GraduationCap className="h-8 w-8" />} title="Nenhum pedido de curso" hint="Pedidos chegam quando alguém busca aula na sua profissão — e você precisa ter ao menos um curso publicado." />
                ) : (
                  courseItems.map((item) => (
                    <motion.div key={item.id_course_request} whileHover={{ y: -1 }} transition={{ type: "spring", stiffness: 400, damping: 28 }} className="rounded-2xl border-2 border-[#0B0B0D]/15 bg-[#0B0B0D]/[0.03] p-3.5 transition-all hover:border-[#0B0B0D] hover:bg-[#F2B705]/10">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[#0B0B0D]/15 bg-[#0B0B0D]/[0.04]"><GraduationCap className="h-5 w-5 text-[#E0A500]" /></div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-[#0B0B0D]">{item.user_name || "Usuário"}</span>
                            <span className="text-[10px] text-[#8a8275]">{new Date(item.created_at).toLocaleDateString("pt-BR")}</span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            {item.machine_name && <Badge className="border-2 border-[#0B0B0D]/15 bg-[#F1EDE2] text-[10px] text-[#0B0B0D] h-5 py-0">{item.machine_name}</Badge>}
                            {item.category_name && <Badge className="border-2 border-[#0B0B0D] bg-[#F2B705] text-[10px] text-[#1A1505] h-5 py-0">{item.category_name}</Badge>}
                          </div>
                          {item.description && <p className="mt-1.5 text-xs text-[#5b554b] line-clamp-2">{item.description}</p>}
                        </div>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <button type="button" onClick={() => respond("course", item.id_course_request)} disabled={opening === item.id_course_request} className="fl-btn-gold inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold disabled:opacity-60">
                          {opening === item.id_course_request ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                          Responder
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}

            {tab === "products" && (
              <motion.div key="products" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ type: "spring", stiffness: 220, damping: 26 }} className="space-y-2.5">
                {loadingProducts ? (
                  <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[#E0A500]" /></div>
                ) : productItems.length === 0 ? (
                  <EmptyState icon={<Package className="h-8 w-8" />} title="Nenhum pedido de produto" hint="Pedidos aparecem se sua loja tem produto ativo na categoria e cidade do comprador." />
                ) : (
                  productItems.map((item) => (
                    <motion.div key={item.id_product_request} whileHover={{ y: -1 }} transition={{ type: "spring", stiffness: 400, damping: 28 }} className="rounded-2xl border-2 border-[#0B0B0D]/15 bg-[#0B0B0D]/[0.03] p-3.5 transition-all hover:border-[#0B0B0D] hover:bg-[#F2B705]/10">
                      <div className="flex items-start gap-3">
                        {item.reference_image_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={item.reference_image_url} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-[#0B0B0D]/15" />
                        ) : (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-[#0B0B0D]/15 bg-[#0B0B0D]/[0.04]"><Package className="h-5 w-5 text-[#0B0B0D]/40" /></div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h3 className="text-sm font-bold text-[#0B0B0D]">{item.title}</h3>
                            <Badge className="border-2 border-[#0B0B0D] bg-[#F2B705] text-[10px] text-[#1A1505] h-5 py-0">{item.category_name}</Badge>
                          </div>
                          <p className="mt-1 text-[11px] text-[#5b554b]">
                            <MapPin className="h-2.5 w-2.5 inline mr-0.5" />{item.city}/{item.state}
                            {(item.min_price_cents != null || item.max_price_cents != null) && (
                              <> · <span className="tabular-nums font-bold text-[#0B0B0D]">{formatPrice(item.min_price_cents)} — {formatPrice(item.max_price_cents)}</span></>
                            )}
                            {" · "}<Clock className="h-2.5 w-2.5 inline" /> {new Date(item.created_at).toLocaleDateString("pt-BR")}
                          </p>
                          <p className="mt-1.5 text-xs text-[#5b554b] line-clamp-2">{item.description}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <button type="button" onClick={() => respond("product", item.id_product_request)} disabled={opening === item.id_product_request} className="fl-btn-gold inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold disabled:opacity-60">
                          {opening === item.id_product_request ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                          Responder
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SegmentButton({ active, onClick, icon, label, count }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${active ? "border-2 border-[#0B0B0D] bg-[#F2B705] text-[#1A1505]" : "border-2 border-transparent text-[#5b554b] hover:text-[#0B0B0D]"}`}
    >
      {icon}
      {label}
      {typeof count === "number" && count > 0 && (
        <span className={`tabular-nums text-[10px] rounded-full px-1.5 ${active ? "bg-[#1A1505]/20 text-[#1A1505]" : "bg-[#0B0B0D]/[0.08] text-[#5b554b]"}`}>{count}</span>
      )}
    </button>
  )
}

function EmptyState({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }} className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-[#0B0B0D]/15 bg-[#0B0B0D]/[0.04] text-[#E0A500]">
        {icon}
      </motion.div>
      <p className="text-sm font-bold text-[#0B0B0D]">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-[#5b554b]">{hint}</p>
    </div>
  )
}
