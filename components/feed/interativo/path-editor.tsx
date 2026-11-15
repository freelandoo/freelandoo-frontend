"use client"

// EDITOR DOS PATHS (Feed Interativo F5) — montar a história como um mapa.
//
// Em cima, o MAPA: cada passo é uma caixa, as setas são os botões (com o
// rótulo). O layout é automático pela distância ao começo (colunas), então o
// autor só pensa em "de onde vai para onde". Embaixo, o PAINEL do passo
// escolhido: título, texto, mídia (um post seu), final ou não, e os botões
// (até 4) com o destino — "novo passo" cria e já liga.
// Barra: Salvar · Testar (o player com o grafo local, nada é contado) ·
// Publicar (prende a um post seu) · números (quantos começaram, quantos
// escolheram cada botão, quantos chegaram em cada passo).

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { Eye, Flag, GitBranch, Loader2, Plus, Save, Send, Trash2, Undo2, X } from "lucide-react"
import { toast } from "sonner"
import { fx, installFeedFx } from "@/lib/feed-fx"
import { pathsApi, type PathGraph, type PathNode } from "@/lib/feed-fx/paths"
import { getToken } from "@/lib/auth"
import { useTranslations } from "@/components/i18n/I18nProvider"
import type { FeedMedia } from "@/lib/types/portfolio-feed"
import { PathPlayer } from "./path-player"

const BOX_W = 150
const BOX_H = 66
const COL_GAP = 70
const ROW_GAP = 26
const MAX_CHOICES = 4
const MAX_NODES = 40

interface MyPost {
  id_portfolio_item: string
  title: string | null
  feed_kind?: string
  media: { media_url: string; media_type: "image" | "video"; thumbnail_url?: string | null }[]
}

let tmpSeq = 0
const tmpId = (p: "n" | "c") => `${p}:${Date.now().toString(36)}${(tmpSeq++).toString(36)}`

/** Colunas pela distância ao começo; quem não é alcançável vai para a última. */
function layout(g: PathGraph) {
  const depth = new Map<string, number>()
  const byId = new Map(g.nodes.map((n) => [n.id, n]))
  const start = g.root && byId.has(g.root) ? g.root : g.nodes[0]?.id
  if (start) {
    depth.set(start, 0)
    const q = [start]
    while (q.length) {
      const id = q.shift()!
      const d = depth.get(id)!
      for (const c of byId.get(id)?.choices || []) {
        if (c.target && byId.has(c.target) && !depth.has(c.target)) {
          depth.set(c.target, d + 1)
          q.push(c.target)
        }
      }
    }
  }
  const maxD = Math.max(0, ...depth.values())
  const cols = new Map<number, string[]>()
  for (const n of g.nodes) {
    const d = depth.has(n.id) ? depth.get(n.id)! : maxD + 1
    if (!cols.has(d)) cols.set(d, [])
    cols.get(d)!.push(n.id)
  }
  const pos = new Map<string, { x: number; y: number; orphan: boolean }>()
  for (const [d, ids] of cols) {
    ids.forEach((id, i) => pos.set(id, { x: d * (BOX_W + COL_GAP), y: i * (BOX_H + ROW_GAP), orphan: !depth.has(id) }))
  }
  const w = (Math.max(0, ...[...cols.keys()]) + 1) * (BOX_W + COL_GAP)
  const h = Math.max(1, ...[...cols.values()].map((v) => v.length)) * (BOX_H + ROW_GAP)
  return { pos, w, h }
}

export function PathEditor({ id }: { id: string }) {
  const t = useTranslations("FeedFx")
  const router = useRouter()
  const [g, setG] = useState<PathGraph | null>(null)
  const [sel, setSel] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [posts, setPosts] = useState<MyPost[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    installFeedFx()
    pathsApi<{ story: PathGraph }>(`/${id}`)
      .then((r) => {
        setG(r.story)
        setSel(r.story.root || r.story.nodes[0]?.id || null)
      })
      .catch((e) => setError(e instanceof Error ? e.message : "erro"))
    const token = getToken()
    if (token) {
      fetch("/api/me/portfolio", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          const items: MyPost[] = Array.isArray(d) ? d : d?.items || []
          setPosts(items.filter((p) => p.feed_kind !== "bees"))
        })
        .catch(() => {})
    }
  }, [id])

  const mediaOf = useCallback(
    (postId?: string | null): FeedMedia | null => {
      const p = posts.find((x) => x.id_portfolio_item === postId)
      const m = p?.media?.[0]
      return m ? { url: m.media_url, type: m.media_type, thumbnail_url: m.thumbnail_url ?? null } : null
    },
    [posts]
  )

  const mutate = useCallback((fn: (g: PathGraph) => PathGraph) => {
    setG((cur) => (cur ? fn(cur) : cur))
    setDirty(true)
  }, [])
  const patchNode = (nid: string, patch: Partial<PathNode>) =>
    mutate((cur) => ({ ...cur, nodes: cur.nodes.map((n) => (n.id === nid ? { ...n, ...patch } : n)) }))

  const addNode = (linkFrom?: { node: string; choice: string }) => {
    if (!g || g.nodes.length >= MAX_NODES) {
      fx("erro", "erro")
      return null
    }
    const nid = tmpId("n")
    const fresh: PathNode = { id: nid, title: t("pathNewStep", "Novo passo"), body: "", is_ending: false, media_post_id: null, choices: [] }
    mutate((cur) => ({
      ...cur,
      nodes: [
        ...cur.nodes.map((n) =>
          linkFrom && n.id === linkFrom.node
            ? { ...n, choices: n.choices.map((c) => (c.id === linkFrom.choice ? { ...c, target: nid } : c)) }
            : n
        ),
        fresh,
      ],
    }))
    fx("caminho-botoes")
    return nid
  }

  const removeNode = (nid: string) => {
    if (!g || nid === g.root) return
    mutate((cur) => ({
      ...cur,
      nodes: cur.nodes
        .filter((n) => n.id !== nid)
        .map((n) => ({ ...n, choices: n.choices.map((c) => (c.target === nid ? { ...c, target: null } : c)) })),
    }))
    setSel(g.root)
    fx("cancelar", "cancelar")
  }

  const save = async (): Promise<PathGraph | null> => {
    if (!g) return null
    setBusy("save")
    const { pos } = layout(g)
    try {
      const r = await pathsApi<{ story: PathGraph }>(`/${id}`, {
        method: "PUT",
        body: { title: g.title, root: g.root, nodes: g.nodes.map((n) => ({ ...n, x: pos.get(n.id)?.x || 0, y: pos.get(n.id)?.y || 0 })) },
      })
      // ids temporários viraram uuid: reencontra o selecionado pela posição na lista
      const idx = g.nodes.findIndex((n) => n.id === sel)
      setG(r.story)
      setSel(r.story.nodes[idx]?.id || r.story.root)
      setDirty(false)
      fx("carimbo", "chegar")
      toast.success(t("pathSaved", "História salva"))
      return r.story
    } catch (e) {
      fx("erro", "erro")
      toast.error(e instanceof Error ? e.message : t("genericError", "Não deu certo"))
      return null
    } finally {
      setBusy(null)
    }
  }

  const publish = async (postId: string) => {
    const saved = dirty ? await save() : g
    if (!saved) return
    setBusy("publish")
    try {
      const r = await pathsApi<{ story: PathGraph }>(`/${id}/publish`, { method: "POST", body: { post_id: postId } })
      setG(r.story)
      setPublishing(false)
      fx("lancar", "lancar")
      toast.success(t("pathPublished", "Publicada! O post agora tem o botão Começar no feed."))
    } catch (e) {
      fx("erro", "erro")
      toast.error(e instanceof Error ? e.message : t("genericError", "Não deu certo"))
    } finally {
      setBusy(null)
    }
  }

  const unpublish = async () => {
    setBusy("publish")
    try {
      const r = await pathsApi<{ story: PathGraph }>(`/${id}/unpublish`, { method: "POST" })
      setG(r.story)
      fx("cancelar", "cancelar")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("genericError", "Não deu certo"))
    } finally {
      setBusy(null)
    }
  }

  const remove = async () => {
    if (!window.confirm(t("pathDeleteConfirm", "Apagar esta história de vez?"))) return
    try {
      await pathsApi(`/${id}`, { method: "DELETE" })
      router.push("/feed/caminhos")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("genericError", "Não deu certo"))
    }
  }

  const lay = useMemo(() => (g ? layout(g) : null), [g])
  const testGraph = useMemo<PathGraph | null>(
    () => (g ? { ...g, nodes: g.nodes.map((n) => ({ ...n, media: mediaOf(n.media_post_id) })) } : null),
    [g, mediaOf]
  )

  if (error) return <p className="mt-10 font-bold text-red-300">{error}</p>
  if (!g || !lay) return <Loader2 className="mt-10 h-6 w-6 animate-spin text-[#9A938A]" />
  const node = g.nodes.find((n) => n.id === sel) || null
  const byId = new Map(g.nodes.map((n) => [n.id, n]))
  const btn =
    "inline-flex h-10 items-center gap-1.5 border-2 border-black px-3 text-xs font-black uppercase tracking-wider shadow-[3px_3px_0_#000] transition active:translate-x-px active:translate-y-px disabled:opacity-50"

  return (
    <div className="fl-sharp">
      {/* barra */}
      <div className="sticky top-14 z-20 -mx-4 mb-4 flex flex-wrap items-center gap-2 border-b-2 border-[#F2B705] bg-[#0b0804]/95 px-4 py-2 backdrop-blur">
        <input
          value={g.title}
          onChange={(e) => mutate((cur) => ({ ...cur, title: e.target.value.slice(0, 80) }))}
          className="h-10 min-w-0 flex-1 border-2 border-[#F5F1E8]/15 bg-[#1D1810] px-3 font-black text-[#F5F1E8] outline-none focus:border-[#F2B705]"
          aria-label={t("pathTitleLabel", "Título da história")}
        />
        <button onClick={save} disabled={!!busy || !dirty} className={`${btn} ${dirty ? "bg-[#F2B705] text-black" : "bg-[#15120E] text-[#F5F1E8]"}`}>
          {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {dirty ? t("pathSave", "Salvar") : t("pathSavedShort", "Salvo")}
        </button>
        <button onClick={() => { setTesting(true); fx("caminho-botoes") }} className={`${btn} bg-[#15120E] text-[#F5F1E8]`}>
          <Eye className="h-4 w-4" />
          {t("pathTest", "Testar")}
        </button>
        {g.status === "published" ? (
          <button onClick={unpublish} disabled={!!busy} className={`${btn} bg-[#15120E] text-[#F5F1E8]`}>
            <Undo2 className="h-4 w-4" />
            {t("pathUnpublish", "Despublicar")}
          </button>
        ) : (
          <button onClick={() => setPublishing(true)} disabled={!!busy} className={`${btn} bg-[#F2B705] text-black`}>
            <Send className="h-4 w-4" />
            {t("pathPublish", "Publicar")}
          </button>
        )}
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-3 text-xs text-[#9A938A]">
        <span className={g.status === "published" ? "font-black text-[#F2B705]" : ""}>
          {g.status === "published" ? t("pathStatusPublished", "Publicada") : t("pathStatusDraft", "Rascunho")}
        </span>
        <span>{t("pathPlays", "{n} começaram").replace("{n}", String(g.plays ?? 0))}</span>
        <span>{t("pathSteps", "{n}/{max} passos").replace("{n}", String(g.nodes.length)).replace("{max}", String(MAX_NODES))}</span>
      </div>

      {/* mapa */}
      <div className="relative overflow-auto border-2 border-[#F5F1E8]/12 bg-[repeating-linear-gradient(0deg,#15120E_0_23px,#1a160f_23px_24px)] p-4" style={{ maxHeight: 360 }}>
        <div className="relative" style={{ width: lay.w, height: lay.h }}>
          <svg className="pointer-events-none absolute inset-0" width={lay.w} height={lay.h} aria-hidden>
            <defs>
              <marker id="fx-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill="#F2B705" />
              </marker>
            </defs>
            {g.nodes.flatMap((n) =>
              n.choices.map((c) => {
                const a = lay.pos.get(n.id)
                const b = c.target ? lay.pos.get(c.target) : null
                if (!a || !b) return null
                const x1 = a.x + BOX_W
                const y1 = a.y + BOX_H / 2
                const x2 = b.x
                const y2 = b.y + BOX_H / 2
                const back = x2 <= x1
                const d = back
                  ? `M${x1},${y1} C${x1 + 60},${y1 - 80} ${x2 - 60},${y2 - 80} ${x2},${y2}`
                  : `M${x1},${y1} C${x1 + 35},${y1} ${x2 - 35},${y2} ${x2},${y2}`
                return (
                  <g key={c.id}>
                    <motion.path
                      d={d}
                      fill="none"
                      stroke={n.id === sel ? "#F2B705" : "#F2B70588"}
                      strokeWidth={n.id === sel ? 3 : 2}
                      markerEnd="url(#fx-arrow)"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.5 }}
                    />
                  </g>
                )
              })
            )}
          </svg>
          {g.nodes.map((n) => {
            const p = lay.pos.get(n.id)!
            const active = n.id === sel
            return (
              <motion.button
                key={n.id}
                type="button"
                onClick={() => {
                  setSel(n.id)
                  fx("mirar", "mirar")
                }}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ x: p.x, y: p.y, scale: active ? 1.05 : 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 30 }}
                className={
                  "absolute left-0 top-0 flex flex-col justify-between border-[3px] p-2 text-left shadow-[4px_4px_0_#000] " +
                  (active ? "border-black bg-[#F2B705] text-black" : n.is_ending ? "border-[#F2B705] bg-[#0B0B0D] text-[#F2B705]" : "border-black bg-[#F5F1E8] text-black") +
                  (p.orphan ? " opacity-60" : "")
                }
                style={{ width: BOX_W, height: BOX_H }}
              >
                <span className="line-clamp-2 text-xs font-black leading-tight">{n.title || t("pathUntitled", "Sem título")}</span>
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase">
                  {n.id === g.root && <Flag className="h-3 w-3" />}
                  {n.is_ending ? t("pathEnding", "Final") : t("pathButtonsN", "{n} botões").replace("{n}", String(n.choices.length))}
                  {typeof n.reach === "number" && n.reach > 0 && <span className="ml-auto">· {n.reach}</span>}
                </span>
              </motion.button>
            )
          })}
        </div>
      </div>
      <button onClick={() => { const nid = addNode(); if (nid) setSel(nid) }} className={`${btn} mt-3 bg-[#15120E] text-[#F5F1E8]`}>
        <Plus className="h-4 w-4" />
        {t("pathAddStep", "Novo passo")}
      </button>

      {/* painel do passo */}
      <AnimatePresence mode="wait">
        {node && (
          <motion.section
            key={node.id}
            initial={{ opacity: 0, y: 14, rotate: -0.6 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="mt-6 border-[3px] border-black bg-[#1D1810] p-4 shadow-[6px_6px_0_#000]"
          >
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={node.title}
                onChange={(e) => patchNode(node.id, { title: e.target.value.slice(0, 80) })}
                placeholder={t("pathStepTitle", "Título do passo")}
                className="h-11 min-w-0 flex-1 border-2 border-[#F5F1E8]/15 bg-[#15120E] px-3 font-black text-[#F5F1E8] outline-none focus:border-[#F2B705]"
              />
              {node.id !== g.root && (
                <>
                  <button onClick={() => { mutate((cur) => ({ ...cur, root: node.id })); fx("carimbo") }} className={`${btn} bg-[#15120E] text-[#F5F1E8]`}>
                    <Flag className="h-4 w-4" />
                    {t("pathMakeStart", "Virar começo")}
                  </button>
                  <button onClick={() => removeNode(node.id)} className={`${btn} bg-[#15120E] text-red-300`} aria-label={t("pathDeleteStep", "Apagar passo")}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
            <textarea
              value={node.body}
              onChange={(e) => patchNode(node.id, { body: e.target.value.slice(0, 600) })}
              rows={4}
              placeholder={t("pathStepBody", "O que acontece aqui?")}
              className="mt-3 w-full border-2 border-[#F5F1E8]/15 bg-[#15120E] p-3 text-[#F5F1E8] outline-none focus:border-[#F2B705]"
            />

            {posts.length > 0 && (
              <>
                <div className="mt-3 text-[11px] font-black uppercase tracking-[0.2em] text-[#9A938A]">{t("pathStepMedia", "Mídia (um post seu)")}</div>
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                  <button
                    onClick={() => patchNode(node.id, { media_post_id: null })}
                    className={"flex h-16 w-14 shrink-0 items-center justify-center border-[3px] text-[10px] font-black uppercase " + (!node.media_post_id ? "border-[#F2B705] text-[#F2B705]" : "border-black text-[#9A938A]")}
                  >
                    {t("none", "Nenhuma")}
                  </button>
                  {posts.filter((p) => p.media?.length).slice(0, 30).map((p) => {
                    const m = p.media[0]
                    const src = m.media_type === "video" ? m.thumbnail_url : m.media_url
                    const on = node.media_post_id === p.id_portfolio_item
                    return (
                      <button
                        key={p.id_portfolio_item}
                        onClick={() => patchNode(node.id, { media_post_id: p.id_portfolio_item })}
                        className={"h-16 w-14 shrink-0 overflow-hidden border-[3px] " + (on ? "border-[#F2B705]" : "border-black opacity-70")}
                      >
                        {src ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <span className="block h-full w-full bg-zinc-800" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm font-black text-[#F5F1E8]">
              <input
                type="checkbox"
                checked={node.is_ending}
                onChange={(e) => patchNode(node.id, { is_ending: e.target.checked })}
                className="h-5 w-5 accent-[#F2B705]"
              />
              {t("pathIsEnding", "Este passo é um final")}
            </label>

            {!node.is_ending && (
              <>
                <div className="mt-4 text-[11px] font-black uppercase tracking-[0.2em] text-[#9A938A]">
                  {t("pathButtons", "Botões")} · {node.choices.length}/{MAX_CHOICES}
                </div>
                <ul className="mt-2 space-y-2">
                  <AnimatePresence initial={false}>
                    {node.choices.map((c) => (
                      <motion.li
                        key={c.id}
                        layout
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 24 }}
                        className="flex flex-wrap items-center gap-2 border-2 border-[#F5F1E8]/12 bg-[#15120E] p-2"
                      >
                        <input
                          value={c.label}
                          onChange={(e) =>
                            patchNode(node.id, { choices: node.choices.map((x) => (x.id === c.id ? { ...x, label: e.target.value.slice(0, 40) } : x)) })
                          }
                          placeholder={t("pathButtonLabel", "Texto do botão")}
                          className="h-10 min-w-[140px] flex-1 border-2 border-[#F5F1E8]/15 bg-[#1D1810] px-2 font-bold text-[#F5F1E8] outline-none focus:border-[#F2B705]"
                        />
                        <span className="text-[#F2B705]">→</span>
                        <select
                          value={c.target || ""}
                          onChange={(e) => {
                            if (e.target.value === "__new") {
                              const nid = addNode({ node: node.id, choice: c.id })
                              if (nid) setSel(node.id)
                              return
                            }
                            patchNode(node.id, { choices: node.choices.map((x) => (x.id === c.id ? { ...x, target: e.target.value || null } : x)) })
                          }}
                          className="h-10 max-w-[180px] border-2 border-[#F5F1E8]/15 bg-[#1D1810] px-2 text-sm font-bold text-[#F5F1E8] outline-none focus:border-[#F2B705]"
                        >
                          <option value="">{t("pathNoTarget", "— escolha o destino —")}</option>
                          {g.nodes.map((n) => (
                            <option key={n.id} value={n.id}>
                              {n.title || t("pathUntitled", "Sem título")}
                            </option>
                          ))}
                          <option value="__new">{t("pathNewTarget", "+ novo passo")}</option>
                        </select>
                        {typeof c.picks === "number" && <span className="text-[11px] text-[#9A938A]">{c.picks}×</span>}
                        {c.target && byId.has(c.target) && (
                          <button onClick={() => setSel(c.target)} className="text-[11px] font-black uppercase text-[#F2B705] underline">
                            {t("pathGo", "ir")}
                          </button>
                        )}
                        <button
                          onClick={() => patchNode(node.id, { choices: node.choices.filter((x) => x.id !== c.id) })}
                          aria-label={t("pathRemoveButton", "Tirar botão")}
                          className="p-1 text-[#9A938A]"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
                {node.choices.length < MAX_CHOICES && (
                  <button
                    onClick={() => {
                      patchNode(node.id, { choices: [...node.choices, { id: tmpId("c"), label: "", target: null }] })
                      fx("caminho-botoes")
                    }}
                    className={`${btn} mt-2 bg-[#F2B705] text-black`}
                  >
                    <Plus className="h-4 w-4" />
                    {t("pathAddButton", "Adicionar botão")}
                  </button>
                )}
              </>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      <button onClick={remove} className="mt-10 text-xs font-bold uppercase tracking-widest text-red-300/80 underline">
        {t("pathDelete", "Apagar história")}
      </button>

      {/* testar */}
      <AnimatePresence>
        {testing && testGraph && (
          <motion.div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setTesting(false)}
          >
            <motion.div
              className="max-h-[92vh] w-full max-w-[470px] overflow-auto"
              initial={{ y: 60 }}
              animate={{ y: 0 }}
              exit={{ y: 60 }}
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
              onClick={(e) => e.stopPropagation()}
            >
              <PathPlayer graph={testGraph} onClose={() => setTesting(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* publicar: escolher o post */}
      <AnimatePresence>
        {publishing && (
          <motion.div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 sm:items-center sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPublishing(false)}
          >
            <motion.div
              className="fl-sharp w-full max-w-[470px] border-[3px] border-black bg-[#1D1810] p-4 shadow-[8px_8px_0_#000]"
              initial={{ y: 60 }}
              animate={{ y: 0 }}
              exit={{ y: 60 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-1 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-[#F2B705]">
                <GitBranch className="h-4 w-4" />
                {t("pathPickPost", "Qual post vai carregar a história?")}
              </div>
              <p className="mb-3 text-xs text-[#9A938A]">{t("pathPickPostHint", "No feed, esse post ganha o botão Começar.")}</p>
              <div className="grid max-h-[50vh] grid-cols-3 gap-2 overflow-auto">
                {posts.filter((p) => p.media?.length || p.feed_kind === "recado").map((p) => {
                  const m = p.media?.[0]
                  const src = m ? (m.media_type === "video" ? m.thumbnail_url : m.media_url) : null
                  return (
                    <button
                      key={p.id_portfolio_item}
                      disabled={busy === "publish"}
                      onClick={() => publish(p.id_portfolio_item)}
                      className="relative aspect-[4/5] overflow-hidden border-[3px] border-black bg-zinc-800 text-left"
                    >
                      {src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <span className="block p-2 text-[11px] font-bold text-[#F5F1E8]">{p.title}</span>
                      )}
                    </button>
                  )
                })}
              </div>
              {posts.length === 0 && <p className="text-sm text-[#9A938A]">{t("pathNoPosts", "Publique um post no feed primeiro.")}</p>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
