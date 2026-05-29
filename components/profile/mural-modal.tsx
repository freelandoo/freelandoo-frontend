"use client"

import React, { useState, useEffect, useCallback } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ServiceChatModal } from "@/components/profile/service-chat-modal"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, MessageCircle, Clock, Megaphone, Package, X, Sparkles, MapPin, GraduationCap } from "lucide-react"

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

interface EligibleSellerProduct {
  id_profile_product: number
  name: string
  price_amount: number
  stock_quantity: number
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

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export function MuralModal({ open, onOpenChange, profileId }: Props) {
  const [tab, setTab] = useState<"services" | "products" | "courses">("services")
  const [muralItems, setMuralItems] = useState<MuralRequest[]>([])
  const [productItems, setProductItems] = useState<ProductRequestMuralItem[]>([])
  const [courseItems, setCourseItems] = useState<CourseRequestMuralItem[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [loadingCourses, setLoadingCourses] = useState(false)
  const [respondTo, setRespondTo] = useState<ProductRequestMuralItem | null>(null)
  const [respondCourseTo, setRespondCourseTo] = useState<CourseRequestMuralItem | null>(null)

  // chat preview
  const [chatOpen, setChatOpen] = useState(false)
  const [chatIdResponse, setChatIdResponse] = useState("")
  const [chatPeerName, setChatPeerName] = useState("")
  const [chatPeerAvatar, setChatPeerAvatar] = useState<string | undefined>()
  const [chatPreview, setChatPreview] = useState<{
    idRequest: string
    idProfile: string
    description: string
    machineName?: string
    categoryName?: string
    estado?: string
    municipio?: string
  } | undefined>(undefined)

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

  const openPreviewChat = (req: MuralRequest) => {
    setChatIdResponse("")
    setChatPeerName(req.user_name || "Usuário")
    setChatPeerAvatar(req.user_avatar)
    setChatPreview({
      idRequest: req.id_request,
      idProfile: profileId,
      description: req.description,
      machineName: req.machine_name,
      categoryName: req.category_name,
      estado: req.estado,
      municipio: req.municipio,
    })
    setChatOpen(true)
  }

  return (
    <>
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
                  Solicitações compatíveis com seu perfil. As conversas ficam em <span className="font-bold text-[#E0A500]">Mensagens</span>.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Segmented tabs */}
          <div className="px-6 pt-4">
            <div className="inline-flex rounded-xl border-2 border-[#0B0B0D]/15 bg-[#0B0B0D]/[0.03] p-1">
              <SegmentButton
                active={tab === "services"}
                onClick={() => setTab("services")}
                icon={<Sparkles className="h-3.5 w-3.5" />}
                label="Serviços"
                count={muralItems.length}
              />
              <SegmentButton
                active={tab === "products"}
                onClick={() => setTab("products")}
                icon={<Package className="h-3.5 w-3.5" />}
                label="Produtos"
                count={productItems.length || undefined}
              />
              <SegmentButton
                active={tab === "courses"}
                onClick={() => setTab("courses")}
                icon={<GraduationCap className="h-3.5 w-3.5" />}
                label="Cursos"
                count={courseItems.length || undefined}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 [scrollbar-width:thin]">
            <AnimatePresence mode="wait" initial={false}>
              {tab === "services" && (
                <motion.div
                  key="services"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ type: "spring", stiffness: 220, damping: 26 }}
                  className="space-y-2.5"
                >
                  {loading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="h-6 w-6 animate-spin text-[#E0A500]" />
                    </div>
                  ) : muralItems.length === 0 ? (
                    <EmptyState
                      icon={<Megaphone className="h-8 w-8" />}
                      title="Nenhuma solicitação nova"
                      hint="Quando alguém pedir um serviço compatível, ela aparece aqui em tempo real."
                    />
                  ) : (
                    muralItems.map((req) => (
                      <motion.button
                        key={req.id_request}
                        type="button"
                        onClick={() => openPreviewChat(req)}
                        whileHover={{ y: -1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 28 }}
                        className="group flex w-full items-start gap-3 rounded-2xl border-2 border-[#0B0B0D]/15 bg-[#0B0B0D]/[0.03] p-3.5 text-left transition-all hover:border-[#0B0B0D] hover:bg-[#F2B705]/10"
                      >
                        <Avatar className="h-10 w-10 shrink-0 border-2 border-[#0B0B0D]">
                          {req.user_avatar && <AvatarImage src={req.user_avatar} alt={req.user_name || ""} />}
                          <AvatarFallback className="text-xs bg-[#F2B705]/20 text-[#0B0B0D]">
                            {initials(req.user_name || "?")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-[#0B0B0D]">{req.user_name || "Usuário"}</span>
                            <span className="text-[10px] text-[#8a8275]">
                              {new Date(req.created_at).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            {req.machine_name && (
                              <Badge className="border-2 border-[#0B0B0D]/15 bg-[#F1EDE2] text-[10px] text-[#0B0B0D] h-5 py-0">
                                {req.machine_name}
                              </Badge>
                            )}
                            {req.category_name && (
                              <Badge className="border-2 border-[#0B0B0D] bg-[#F2B705] text-[10px] text-[#1A1505] h-5 py-0">
                                {req.category_name}
                              </Badge>
                            )}
                            {req.municipio && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-[#8a8275]">
                                <MapPin className="h-2.5 w-2.5" />
                                {req.municipio}{req.estado ? `, ${req.estado}` : ""}
                              </span>
                            )}
                          </div>
                          {req.description && (
                            <p className="mt-1.5 text-xs text-[#5b554b] line-clamp-2">{req.description}</p>
                          )}
                        </div>
                        <MessageCircle className="h-4 w-4 text-[#0B0B0D]/35 group-hover:text-[#E0A500] transition-colors shrink-0 mt-1" />
                      </motion.button>
                    ))
                  )}
                </motion.div>
              )}

              {tab === "courses" && (
                <motion.div
                  key="courses"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ type: "spring", stiffness: 220, damping: 26 }}
                  className="space-y-2.5"
                >
                  {loadingCourses ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="h-6 w-6 animate-spin text-[#E0A500]" />
                    </div>
                  ) : courseItems.length === 0 ? (
                    <EmptyState
                      icon={<GraduationCap className="h-8 w-8" />}
                      title="Nenhum pedido de curso"
                      hint="Pedidos chegam quando alguém busca aula na sua profissão — e você precisa ter ao menos um curso publicado."
                    />
                  ) : (
                    courseItems.map((item) => (
                      <motion.div
                        key={item.id_course_request}
                        whileHover={{ y: -1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 28 }}
                        className="rounded-2xl border-2 border-[#0B0B0D]/15 bg-[#0B0B0D]/[0.03] p-3.5 transition-all hover:border-[#0B0B0D] hover:bg-[#F2B705]/10"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[#0B0B0D]/15 bg-[#0B0B0D]/[0.04]">
                            <GraduationCap className="h-5 w-5 text-[#E0A500]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-bold text-[#0B0B0D]">{item.user_name || "Usuário"}</span>
                              <span className="text-[10px] text-[#8a8275]">
                                {new Date(item.created_at).toLocaleDateString("pt-BR")}
                              </span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              {item.machine_name && (
                                <Badge className="border-2 border-[#0B0B0D]/15 bg-[#F1EDE2] text-[10px] text-[#0B0B0D] h-5 py-0">
                                  {item.machine_name}
                                </Badge>
                              )}
                              {item.category_name && (
                                <Badge className="border-2 border-[#0B0B0D] bg-[#F2B705] text-[10px] text-[#1A1505] h-5 py-0">
                                  {item.category_name}
                                </Badge>
                              )}
                            </div>
                            {item.description && (
                              <p className="mt-1.5 text-xs text-[#5b554b] line-clamp-2">{item.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setRespondCourseTo(item)}
                            className="fl-btn-gold inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold"
                          >
                            <Sparkles className="h-3 w-3" />
                            Responder
                          </button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </motion.div>
              )}

              {tab === "products" && (
                <motion.div
                  key="products"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ type: "spring", stiffness: 220, damping: 26 }}
                  className="space-y-2.5"
                >
                  {loadingProducts ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="h-6 w-6 animate-spin text-[#E0A500]" />
                    </div>
                  ) : productItems.length === 0 ? (
                    <EmptyState
                      icon={<Package className="h-8 w-8" />}
                      title="Nenhum pedido de produto"
                      hint="Pedidos aparecem se sua loja tem produto ativo na categoria e cidade do comprador."
                    />
                  ) : (
                    productItems.map((item) => (
                      <motion.div
                        key={item.id_product_request}
                        whileHover={{ y: -1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 28 }}
                        className="rounded-2xl border-2 border-[#0B0B0D]/15 bg-[#0B0B0D]/[0.03] p-3.5 transition-all hover:border-[#0B0B0D] hover:bg-[#F2B705]/10"
                      >
                        <div className="flex items-start gap-3">
                          {item.reference_image_url ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={item.reference_image_url} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-[#0B0B0D]/15" />
                          ) : (
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-[#0B0B0D]/15 bg-[#0B0B0D]/[0.04]">
                              <Package className="h-5 w-5 text-[#0B0B0D]/40" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <h3 className="text-sm font-bold text-[#0B0B0D]">{item.title}</h3>
                              <Badge className="border-2 border-[#0B0B0D] bg-[#F2B705] text-[10px] text-[#1A1505] h-5 py-0">
                                {item.category_name}
                              </Badge>
                            </div>
                            <p className="mt-1 text-[11px] text-[#5b554b]">
                              <MapPin className="h-2.5 w-2.5 inline mr-0.5" />
                              {item.city}/{item.state}
                              {(item.min_price_cents != null || item.max_price_cents != null) && (
                                <> · <span className="tabular-nums font-bold text-[#0B0B0D]">{formatPrice(item.min_price_cents)} — {formatPrice(item.max_price_cents)}</span></>
                              )}
                              {" · "}
                              <Clock className="h-2.5 w-2.5 inline" /> {new Date(item.created_at).toLocaleDateString("pt-BR")}
                            </p>
                            <p className="mt-1.5 text-xs text-[#5b554b] line-clamp-2">{item.description}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setRespondTo(item)}
                            className="fl-btn-gold inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold"
                          >
                            <Sparkles className="h-3 w-3" />
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

      {respondTo && (
        <ProductRequestResponseModal
          item={respondTo}
          profileId={profileId}
          onClose={() => setRespondTo(null)}
          onSent={() => { setRespondTo(null); void fetchProductMural() }}
        />
      )}

      {respondCourseTo && (
        <CourseRequestResponseModal
          item={respondCourseTo}
          profileId={profileId}
          onClose={() => setRespondCourseTo(null)}
          onSent={() => { setRespondCourseTo(null); void fetchCourseMural() }}
        />
      )}

      <ServiceChatModal
        open={chatOpen}
        onOpenChange={(v) => {
          setChatOpen(v)
          if (!v) {
            setChatPreview(undefined)
            fetchData()
          }
        }}
        idResponse={chatIdResponse}
        peerName={chatPeerName}
        peerAvatar={chatPeerAvatar}
        viewerSide="PRO"
        previewRequest={chatPreview}
        onPreviewAccepted={(newId) => { setChatIdResponse(newId) }}
        onReject={() => fetchData()}
        onFinalize={() => fetchData()}
      />
    </>
  )
}

function SegmentButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  count?: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
        active
          ? "border-2 border-[#0B0B0D] bg-[#F2B705] text-[#1A1505]"
          : "border-2 border-transparent text-[#5b554b] hover:text-[#0B0B0D]"
      }`}
    >
      {icon}
      {label}
      {typeof count === "number" && count > 0 && (
        <span className={`tabular-nums text-[10px] rounded-full px-1.5 ${active ? "bg-[#1A1505]/20 text-[#1A1505]" : "bg-[#0B0B0D]/[0.08] text-[#5b554b]"}`}>
          {count}
        </span>
      )}
    </button>
  )
}

function EmptyState({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-[#0B0B0D]/15 bg-[#0B0B0D]/[0.04] text-[#E0A500]"
      >
        {icon}
      </motion.div>
      <p className="text-sm font-bold text-[#0B0B0D]">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-[#5b554b]">{hint}</p>
    </div>
  )
}

// ─── Modal: resposta do vendedor a um Pedido de Produto ────────────────────
function ProductRequestResponseModal({
  item,
  profileId,
  onClose,
  onSent,
}: {
  item: ProductRequestMuralItem
  profileId: string
  onClose: () => void
  onSent: () => void
}) {
  const [products, setProducts] = useState<EligibleSellerProduct[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [selectedProductId, setSelectedProductId] = useState<string>("")
  const [message, setMessage] = useState("")
  const [priceReais, setPriceReais] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = getToken()
    if (!token) return
    setLoadingProducts(true)
    fetch(`/api/product-requests/${item.id_product_request}/eligible-products?id_profile=${encodeURIComponent(profileId)}`, {
      headers: headers(token),
    })
      .then((r) => r.json())
      .then((d) => setProducts(Array.isArray(d?.products) ? d.products : []))
      .catch(() => setProducts([]))
      .finally(() => setLoadingProducts(false))
  }, [item.id_product_request, profileId])

  async function submit() {
    setError(null)
    const trimmed = message.trim()
    if (trimmed.length < 3) { setError("Mensagem obrigatória (mín. 3 caracteres)"); return }
    let proposed: number | null = null
    if (priceReais.trim()) {
      const cleaned = priceReais.replace(/\./g, "").replace(",", ".").trim()
      const n = Number(cleaned)
      if (!Number.isFinite(n) || n < 0) { setError("Preço proposto inválido"); return }
      proposed = Math.round(n * 100)
    }
    const token = getToken()
    if (!token) return
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        id_profile: profileId,
        message: trimmed,
      }
      if (proposed != null) body.proposed_price_cents = proposed
      if (selectedProductId) body.id_profile_product = Number(selectedProductId)

      const r = await fetch(`/api/product-requests/${item.id_product_request}/responses`, {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(body),
      })
      const d = await r.json()
      if (!r.ok) { setError(d?.error || "Erro ao enviar resposta"); return }
      onSent()
    } catch {
      setError("Erro de conexão")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="presentation"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 26 }}
        className="w-full max-w-md overflow-hidden rounded-2xl border-2 border-[#0B0B0D] bg-[#F1EDE2] text-[#0B0B0D] shadow-[8px_8px_0_0_#0B0B0D]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-center justify-between border-b-2 border-[#0B0B0D]/15 px-5 py-4">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">Responder pedido</h3>
            <p className="text-xs text-[#5b554b] line-clamp-1">{item.title}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-[#0B0B0D]/60 transition hover:bg-[#0B0B0D]/10 hover:text-[#0B0B0D]" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 px-5 py-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#0B0B0D]/60">
              Produto da sua loja (opcional)
            </label>
            {loadingProducts ? (
              <div className="flex items-center gap-2 text-xs text-[#5b554b]">
                <Loader2 className="h-3 w-3 animate-spin" /> Carregando produtos…
              </div>
            ) : products.length === 0 ? (
              <p className="text-xs text-[#5b554b]">Sem produtos ativos nesta categoria. Você pode enviar proposta livre.</p>
            ) : (
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="fl-input [&>option]:bg-[#F1EDE2] [&>option]:text-[#0B0B0D]"
              >
                <option value="">— Proposta livre —</option>
                {products.map((p) => (
                  <option key={p.id_profile_product} value={p.id_profile_product}>
                    {p.name} · {formatPrice(p.price_amount)} · estoque {p.stock_quantity}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#0B0B0D]/60">
              Mensagem ao comprador <span className="text-[#b91c1c]">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={4000}
              placeholder="Tenho um produto que combina. Posso enviar mais fotos…"
              className="fl-input resize-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#0B0B0D]/60">
              Preço proposto (R$, opcional)
            </label>
            <input
              type="text"
              value={priceReais}
              onChange={(e) => setPriceReais(e.target.value)}
              placeholder="0,00"
              className="fl-input font-mono"
            />
          </div>
          {error && (
            <p className="rounded-xl border-2 border-[#dc2626]/40 bg-[#dc2626]/10 px-3 py-2 text-xs font-medium text-[#b91c1c]">{error}</p>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t-2 border-[#0B0B0D]/15 bg-[#e8e2d4] px-5 py-3">
          <button
            onClick={onClose}
            className="fl-btn-card rounded-full px-3 py-1.5 text-xs font-bold"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="fl-btn-gold flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
            Enviar resposta
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function CourseRequestResponseModal({
  item,
  profileId,
  onClose,
  onSent,
}: {
  item: CourseRequestMuralItem
  profileId: string
  onClose: () => void
  onSent: () => void
}) {
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function submit() {
    setError(null)
    const trimmed = message.trim()
    if (trimmed.length < 3) { setError("Mensagem obrigatória (mín. 3 caracteres)"); return }
    const token = getToken()
    if (!token) return
    setSubmitting(true)
    try {
      const respRes = await fetch(`/api/course-requests/${item.id_course_request}/respond`, {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify({ id_profile: profileId, action: "accept" }),
      })
      const respData = await respRes.json()
      if (!respRes.ok) { setError(respData?.error || "Erro ao responder"); return }
      const idResponse = respData?.response?.id_response
      if (idResponse) {
        await fetch(`/api/course-requests/responses/${idResponse}/messages`, {
          method: "POST",
          headers: headers(token),
          body: JSON.stringify({ content: trimmed }),
        })
      }
      setDone(true)
      window.setTimeout(onSent, 1400)
    } catch {
      setError("Erro de conexão")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="presentation"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 26 }}
        className="w-full max-w-md overflow-hidden rounded-2xl border-2 border-[#0B0B0D] bg-[#F1EDE2] text-[#0B0B0D] shadow-[8px_8px_0_0_#0B0B0D]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-center justify-between border-b-2 border-[#0B0B0D]/15 px-5 py-4">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">Responder pedido de curso</h3>
            <p className="text-xs text-[#5b554b] line-clamp-1">{item.category_name || item.machine_name || "Curso"}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-[#0B0B0D]/60 transition hover:bg-[#0B0B0D]/10 hover:text-[#0B0B0D]" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>
        {done ? (
          <div className="px-5 py-8 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#0B0B0D] bg-[#F2B705]">
              <Sparkles className="h-5 w-5 text-[#1A1505]" />
            </div>
            <p className="mt-3 text-sm font-bold text-[#0B0B0D]">Resposta enviada!</p>
            <p className="mt-1 text-xs text-[#5b554b]">
              A conversa continua em Mensagens &rarr; O.S.
            </p>
          </div>
        ) : (
          <div className="space-y-4 px-5 py-4">
            <div className="rounded-xl border-2 border-[#0B0B0D]/15 bg-[#0B0B0D]/[0.03] p-3">
              <p className="text-xs text-[#5b554b] line-clamp-3">{item.description}</p>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#0B0B0D]/60">
                Mensagem ao aluno <span className="text-[#b91c1c]">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                maxLength={4000}
                placeholder="Apresente seu curso, valor e como funciona…"
                className="fl-input resize-none"
              />
            </div>
            {error && (
              <p className="rounded-lg border-2 border-[#dc2626]/40 bg-[#dc2626]/10 px-3 py-2 text-xs font-medium text-[#b91c1c]">{error}</p>
            )}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-full px-3 py-1.5 text-xs font-bold text-[#5b554b] transition hover:text-[#0B0B0D]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="fl-btn-gold inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                Enviar resposta
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
