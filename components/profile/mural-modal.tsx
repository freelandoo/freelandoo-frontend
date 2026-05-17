"use client"

import React, { useState, useEffect, useCallback } from "react"
import { ServiceChatModal } from "@/components/profile/service-chat-modal"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, MessageCircle, Clock, Megaphone, Package, X } from "lucide-react"

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

interface ActiveConversation {
  id_response: string
  id_request: string
  status?: string
  user_name?: string
  user_avatar?: string
  description?: string
  estado?: string
  municipio?: string
  last_message?: string
  last_message_at?: string
  unread_count?: number
  created_at?: string
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
  const [tab, setTab] = useState<"new" | "products" | "active">("new")
  const [muralItems, setMuralItems] = useState<MuralRequest[]>([])
  const [productItems, setProductItems] = useState<ProductRequestMuralItem[]>([])
  const [conversations, setConversations] = useState<ActiveConversation[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [respondTo, setRespondTo] = useState<ProductRequestMuralItem | null>(null)

  // --- chat ---
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

  // Fetch mural data
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
        // Backend may return { requests: [...] }, { items: [...] }, or an array.
        if (Array.isArray(data.requests)) {
          setMuralItems(data.requests)
        } else if (Array.isArray(data.items)) {
          setMuralItems(data.items)
        } else if (Array.isArray(data)) {
          setMuralItems(data)
        } else {
          setMuralItems([])
        }
        if (data.conversations) {
          setConversations(Array.isArray(data.conversations) ? data.conversations : [])
        }
      }
    } catch { /* silent */ }
    setLoading(false)
  }, [profileId])

  useEffect(() => {
    if (!open) return
    const timeout = window.setTimeout(() => {
      void fetchData()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [open, fetchData])

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
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Mural
          </DialogTitle>
          <DialogDescription>Serviços e pedidos de produto compatíveis com seu perfil.</DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 border-b pb-0">
          <button
            onClick={() => setTab("new")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "new" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Serviços
          </button>
          <button
            onClick={() => setTab("products")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 ${tab === "products" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <Package className="h-3.5 w-3.5" />
            Produtos
          </button>
          <button
            onClick={() => setTab("active")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors relative ${tab === "active" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Conversas ativas
            {conversations.some(c => (c.unread_count ?? 0) > 0) && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500" />
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* ========== TAB: SOLICITAÇÕES NOVAS ========== */}
          {!loading && tab === "new" && (
            <div className="space-y-3 py-2">
              {muralItems.length === 0 && (
                <div className="text-center py-12">
                  <Megaphone className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-1">Nenhuma solicitação nova</p>
                  <p className="text-sm text-muted-foreground">Quando alguém pedir um serviço compatível, aparecerá aqui.</p>
                </div>
              )}

              {muralItems.map(req => (
                <button
                  key={req.id_request}
                  type="button"
                  className="w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors text-left"
                  onClick={() => openPreviewChat(req)}
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    {req.user_avatar && <AvatarImage src={req.user_avatar} alt={req.user_name || ""} />}
                    <AvatarFallback className="text-xs">{initials(req.user_name || "?")}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{req.user_name || "Usuário"}</span>
                      <span className="text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 inline mr-0.5" />
                        {new Date(req.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {req.machine_name && <Badge variant="outline" className="text-[10px] py-0 h-5">{req.machine_name}</Badge>}
                      {req.category_name && <Badge variant="secondary" className="text-[10px] py-0 h-5">{req.category_name}</Badge>}
                      {req.municipio && <span className="text-[10px] text-muted-foreground">📍 {req.municipio}{req.estado ? `, ${req.estado}` : ""}</span>}
                      {typeof req.responses_count === "number" && req.responses_count > 0 && (
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 h-5 border-primary/40 bg-primary/10 text-primary gap-1"
                          title={`${req.responses_count} ${req.responses_count === 1 ? "subperfil já respondeu" : "subperfis já responderam"}`}
                        >
                          <MessageCircle className="h-2.5 w-2.5" />
                          {req.responses_count} {req.responses_count === 1 ? "conversa aberta" : "conversas abertas"}
                        </Badge>
                      )}
                    </div>
                    {req.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{req.description}</p>
                    )}
                  </div>
                  <MessageCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* ========== TAB: PRODUTOS (Pedido de Produto) ========== */}
          {tab === "products" && (
            <div className="space-y-3 py-2">
              {loadingProducts && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
              {!loadingProducts && productItems.length === 0 && (
                <div className="text-center py-12">
                  <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-1">Nenhum pedido de produto compatível</p>
                  <p className="text-sm text-muted-foreground">
                    Pedidos só aparecem se sua loja tem produto ativo na categoria e cidade do comprador.
                  </p>
                </div>
              )}
              {!loadingProducts && productItems.map((item) => (
                <div key={item.id_product_request} className="border rounded-lg p-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start gap-3">
                    {item.reference_image_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={item.reference_image_url} alt="" className="h-14 w-14 shrink-0 rounded-md object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-muted">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="text-sm font-medium">{item.title}</h3>
                        <Badge variant="outline" className="text-[10px] py-0 h-5">{item.category_name}</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        📍 {item.city}/{item.state}
                        {(item.min_price_cents != null || item.max_price_cents != null) && (
                          <> · <span className="tabular-nums">{formatPrice(item.min_price_cents)} — {formatPrice(item.max_price_cents)}</span></>
                        )}
                        {" · "}
                        <Clock className="h-2.5 w-2.5 inline" /> {new Date(item.created_at).toLocaleDateString("pt-BR")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setRespondTo(item)}
                      className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                      Responder
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ========== TAB: CONVERSAS ATIVAS ========== */}
          {!loading && tab === "active" && (
            <div className="space-y-2 py-2">
              {conversations.length === 0 && (
                <div className="text-center py-12">
                  <MessageCircle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-1">Nenhuma conversa ativa</p>
                  <p className="text-sm text-muted-foreground">Aceite solicitações para iniciar conversas.</p>
                </div>
              )}

              {conversations.map(conv => (
                <button
                  key={conv.id_response}
                  type="button"
                  className="w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors text-left"
                  onClick={() => {
                    setChatIdResponse(conv.id_response)
                    setChatPeerName(conv.user_name || "Usuário")
                    setChatPeerAvatar(conv.user_avatar)
                    setChatPreview({
                      idRequest: conv.id_request,
                      idProfile: profileId,
                      description: conv.description || "",
                      estado: conv.estado,
                      municipio: conv.municipio,
                    })
                    setChatOpen(true)
                  }}
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      {conv.user_avatar && <AvatarImage src={conv.user_avatar} alt={conv.user_name || ""} />}
                      <AvatarFallback className="text-xs">{initials(conv.user_name || "?")}</AvatarFallback>
                    </Avatar>
                    {(conv.unread_count ?? 0) > 0 && (
                      <span className="absolute -top-1 -right-1 inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium">{conv.user_name || "Usuário"}</span>
                    {conv.last_message && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{conv.last_message}</p>
                    )}
                  </div>
                  <MessageCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Modal de resposta a Pedido de Produto */}
    {respondTo && (
      <ProductRequestResponseModal
        item={respondTo}
        profileId={profileId}
        onClose={() => setRespondTo(null)}
        onSent={() => { setRespondTo(null); void fetchProductMural() }}
      />
    )}

    {/* Chat modal — pro side (preview ao clicar em Solicitação nova) */}
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
      onPreviewAccepted={(newId) => {
        // 'open' criou PENDING — só registra o id pra continuar a conversa
        setChatIdResponse(newId)
      }}
      onReject={() => fetchData()}
      onFinalize={() => fetchData()}
    />
    </>
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
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4" onClick={onClose} role="presentation">
      <div className="w-full max-w-md rounded-xl border border-border bg-card text-foreground" onClick={(e) => e.stopPropagation()} role="dialog">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h3 className="text-sm font-semibold">Responder pedido</h3>
            <p className="text-xs text-muted-foreground line-clamp-1">{item.title}</p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 p-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Sugerir produto da sua loja (opcional)</label>
            {loadingProducts ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Carregando produtos…</div>
            ) : products.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem produtos ativos nesta categoria. Você pode enviar proposta livre.</p>
            ) : (
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
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
            <label className="mb-1 block text-xs text-muted-foreground">Mensagem ao comprador <span className="text-destructive">*</span></label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={4000}
              placeholder="Tenho um produto que combina. Posso enviar mais fotos…"
              className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Preço proposto (R$, opcional)</label>
            <input
              type="text"
              value={priceReais}
              onChange={(e) => setPriceReais(e.target.value)}
              placeholder="0,00"
              className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-border p-4">
          <button onClick={onClose} className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
          <button onClick={submit} disabled={submitting} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
            Enviar resposta
          </button>
        </div>
      </div>
    </div>
  )
}
