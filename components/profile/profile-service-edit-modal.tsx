"use client"

import { useEffect, useMemo, useState } from "react"
import { Save, Users, X } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { ProfileService } from "@/components/calendar/types"
import {
  clientTotalCentsFromFreelancerNet,
  freelancerNetForEditForm,
} from "@/lib/service-booking-price"

export interface ProfileServiceEditClanMember {
  id_member_profile: string
  display_name: string
  avatar_url: string | null
  username: string
  role: "owner" | "member"
}

function getToken() {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

function headers(): HeadersInit {
  const token = getToken()
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function centsToReais(cents: number) {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function parsePriceReais(input: string): number {
  const cleaned = input.replace(/\./g, "").replace(",", ".").trim()
  const n = Number(cleaned)
  if (!Number.isFinite(n) || n < 0) return -1
  return Math.round(n * 100)
}

interface ProfileServiceEditModalProps {
  open: boolean
  onClose: () => void
  profileId: string
  /** Em edição: serviço existente. `null` com `open`: novo serviço (POST). */
  service: ProfileService | null
  isClan?: boolean
  clanMembers?: ProfileServiceEditClanMember[]
  onSaved: (service: ProfileService) => void
  onError?: (message: string) => void
}

export function ProfileServiceEditModal({
  open,
  onClose,
  profileId,
  service,
  isClan = false,
  clanMembers = [],
  onSaved,
  onError,
}: ProfileServiceEditModalProps) {
  const [serviceForm, setServiceForm] = useState({
    name: "",
    description: "",
    duration_minutes: 60,
    price_reais: "0,00",
    is_active: true,
    member_profile_ids: [] as string[],
  })
  const [saving, setSaving] = useState(false)
  const [bookingFees, setBookingFees] = useState({ stripe_fee_percent: 0, service_fee_cents: 0 })
  const [bookingFeesReady, setBookingFeesReady] = useState(false)

  useEffect(() => {
    fetch("/api/public/booking-fees")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d)
          setBookingFees({
            stripe_fee_percent: d.stripe_fee_percent ?? 0,
            service_fee_cents: d.service_fee_cents ?? 0,
          })
      })
      .catch(() => {})
      .finally(() => setBookingFeesReady(true))
  }, [])

  useEffect(() => {
    if (!open || service !== null) return
    setServiceForm({
      name: "",
      description: "",
      duration_minutes: 60,
      price_reais: "0,00",
      is_active: true,
      member_profile_ids: [],
    })
  }, [open, service])

  useEffect(() => {
    if (!open || !service) return
    setServiceForm({
      name: service.name,
      description: service.description || "",
      duration_minutes: service.duration_minutes,
      price_reais: (service.price_amount / 100).toFixed(2).replace(".", ","),
      is_active: service.is_active !== false,
      member_profile_ids: service.member_profile_ids || [],
    })
  }, [open, service])

  useEffect(() => {
    if (!open || !service || !bookingFeesReady) return
    const net = freelancerNetForEditForm(
      service.price_amount,
      bookingFees.stripe_fee_percent,
      bookingFees.service_fee_cents,
    )
    setServiceForm((f) => ({ ...f, price_reais: (net / 100).toFixed(2).replace(".", ",") }))
  }, [
    open,
    service?.id_profile_service,
    service?.price_amount,
    bookingFeesReady,
    bookingFees.stripe_fee_percent,
    bookingFees.service_fee_cents,
  ])

  const selectedCount = serviceForm.member_profile_ids.length
  const effectiveCount = selectedCount === 0 ? clanMembers.length : selectedCount
  const pricePerMember = useMemo(() => {
    const total = parsePriceReais(serviceForm.price_reais)
    if (total < 0 || effectiveCount === 0) return null
    return total / effectiveCount
  }, [serviceForm.price_reais, effectiveCount])

  function toggleMember(id: string) {
    setServiceForm((f) => ({
      ...f,
      member_profile_ids: f.member_profile_ids.includes(id)
        ? f.member_profile_ids.filter((m) => m !== id)
        : [...f.member_profile_ids, id],
    }))
  }

  async function saveService() {
    const price = parsePriceReais(serviceForm.price_reais)
    if (!serviceForm.name.trim()) {
      onError?.("Informe o nome do serviço")
      return
    }
    if (!serviceForm.duration_minutes || serviceForm.duration_minutes <= 0) {
      onError?.("Duração inválida")
      return
    }
    if (price < 0) {
      onError?.("Valor inválido")
      return
    }
    if (!bookingFeesReady) {
      onError?.("Carregando taxas de agendamento. Tente novamente em instantes.")
      return
    }
    const price_amount = clientTotalCentsFromFreelancerNet(
      price,
      bookingFees.stripe_fee_percent,
      bookingFees.service_fee_cents,
    )
    setSaving(true)
    const body: Record<string, unknown> = {
      name: serviceForm.name.trim(),
      description: serviceForm.description.trim() || null,
      duration_minutes: serviceForm.duration_minutes,
      price_amount,
      is_active: serviceForm.is_active,
    }
    if (isClan) body.member_profile_ids = serviceForm.member_profile_ids
    try {
      const url = service
        ? `/api/profile/${profileId}/services/${service.id_profile_service}`
        : `/api/profile/${profileId}/services`
      const res = await fetch(url, {
        method: service ? "PATCH" : "POST",
        headers: headers(),
        body: JSON.stringify(body),
      })
      const d = await res.json()
      if (res.ok && d.service) {
        onSaved(d.service as ProfileService)
        onClose()
      } else {
        onError?.(d.error || "Erro ao salvar")
      }
    } catch {
      onError?.("Erro de conexão")
    }
    setSaving(false)
  }

  if (!open) return null

  const isEdit = service !== null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-service-edit-title"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 p-6">
          <h2 id="profile-service-edit-title" className="text-lg font-semibold text-zinc-100">
            {isEdit ? "Editar serviço" : "Novo serviço"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Nome</label>
            <input
              type="text"
              value={serviceForm.name}
              onChange={(e) => setServiceForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Sessão de fotos"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Descrição (opcional)</label>
            <textarea
              value={serviceForm.description}
              onChange={(e) => setServiceForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Duração</label>
              <select
                value={serviceForm.duration_minutes}
                onChange={(e) =>
                  setServiceForm((f) => ({ ...f, duration_minutes: Number(e.target.value) }))
                }
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
              >
                {[15, 30, 45, 60, 90, 120, 180, 240].map((m) => (
                  <option key={m} value={m}>
                    {m} min
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Valor que você quer receber (R$)</label>
              <input
                type="text"
                value={serviceForm.price_reais}
                onChange={(e) => setServiceForm((f) => ({ ...f, price_reais: e.target.value }))}
                placeholder="0,00"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm text-zinc-100"
              />
            </div>
          </div>

          {(() => {
            const baseCents = parsePriceReais(serviceForm.price_reais)
            if (baseCents <= 0) return null
            const stripeFee = Math.round((baseCents * bookingFees.stripe_fee_percent) / 100)
            const serviceFee = bookingFees.service_fee_cents
            const clientTotal = baseCents + stripeFee + serviceFee
            return (
              <div className="space-y-2 rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 text-xs">
                <p className="mb-3 font-medium text-zinc-400">Resumo do valor</p>
                <div className="flex justify-between text-zinc-300">
                  <span>Você recebe</span>
                  <span className="font-mono">{centsToReais(baseCents)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Taxa da maquininha ({bookingFees.stripe_fee_percent}%)</span>
                  <span className="font-mono text-yellow-500/80">+ {centsToReais(stripeFee)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Taxa de serviço (fixo)</span>
                  <span className="font-mono text-yellow-500/80">+ {centsToReais(serviceFee)}</span>
                </div>
                <div className="flex justify-between border-t border-zinc-700 pt-2 text-sm font-semibold">
                  <span className="text-zinc-200">Cliente pagará</span>
                  <span className="font-mono text-yellow-400">{centsToReais(clientTotal)}</span>
                </div>
              </div>
            )
          })()}

          {isClan && clanMembers.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="flex items-center gap-1 text-xs text-zinc-400">
                  <Users className="h-3.5 w-3.5" />
                  Membros participantes
                </label>
                <span className="text-xs text-zinc-500">
                  {selectedCount === 0 ? "Todos" : `${selectedCount} selecionado${selectedCount !== 1 ? "s" : ""}`}
                </span>
              </div>
              <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
                {clanMembers.map((m) => {
                  const checked = serviceForm.member_profile_ids.includes(m.id_member_profile)
                  return (
                    <label
                      key={m.id_member_profile}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-2.5 transition-colors ${
                        checked
                          ? "border-yellow-400/30 bg-yellow-400/10"
                          : "border-zinc-700/50 bg-zinc-800/50 hover:bg-zinc-800"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleMember(m.id_member_profile)}
                        className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-yellow-400"
                      />
                      <Avatar className="size-7 border border-zinc-600">
                        {m.avatar_url && (
                          <AvatarImage src={m.avatar_url} alt={m.display_name} className="object-cover" />
                        )}
                        <AvatarFallback className="text-xs">{getInitials(m.display_name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-zinc-100">{m.display_name}</div>
                        <div className="text-xs text-zinc-500">@{m.username}</div>
                      </div>
                      {m.role === "owner" && (
                        <span className="shrink-0 text-xs text-zinc-500">dono</span>
                      )}
                    </label>
                  )
                })}
              </div>
              {pricePerMember !== null && effectiveCount > 0 && (
                <p className="mt-2 text-xs text-zinc-400">
                  {centsToReais(pricePerMember)}/membro
                  {selectedCount === 0 && (
                    <span className="text-zinc-600">
                      {" "}
                      (dividido entre todos os {clanMembers.length} membros)
                    </span>
                  )}
                </p>
              )}
            </div>
          )}

          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={serviceForm.is_active}
              onChange={(e) => setServiceForm((f) => ({ ...f, is_active: e.target.checked }))}
              className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-yellow-400"
            />
            <span className="text-sm text-zinc-200">Ativo (visível para clientes)</span>
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-800 p-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={saveService}
            disabled={saving || !bookingFeesReady}
            className="flex items-center gap-2 rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-yellow-300 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  )
}
