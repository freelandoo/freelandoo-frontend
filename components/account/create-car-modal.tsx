"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Car } from "lucide-react"
import { TabloidDialog } from "@/components/tabloide"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"

type Option = { code: string; label: string }

export function CreateCarModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated?: () => void
}) {
  const t = useTranslations("Spaces")
  const router = useRouter()

  const [brands, setBrands] = useState<Option[]>([])
  const [models, setModels] = useState<Option[]>([])
  const [brandCode, setBrandCode] = useState("")
  const [modelCode, setModelCode] = useState("")
  // Cadastro manual: a FIPE fora do ar não pode impedir alguém de abrir a
  // comunidade do carro dele (mesma degradação do ViaCEP no endereço).
  const [manual, setManual] = useState(false)
  const [brandFree, setBrandFree] = useState("")
  const [modelFree, setModelFree] = useState("")
  const [loadingBrands, setLoadingBrands] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const loadBrands = useCallback(async () => {
    const token = getToken()
    if (!token) return
    setLoadingBrands(true)
    try {
      const res = await fetch("/api/cars/brands", { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      const list: Option[] = Array.isArray(data.brands) ? data.brands : []
      setBrands(list)
      setManual(list.length === 0)
    } catch {
      setBrands([])
      setManual(true)
    } finally {
      setLoadingBrands(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setBrandCode("")
    setModelCode("")
    setModels([])
    setMsg(null)
    loadBrands()
  }, [open, loadBrands])

  useEffect(() => {
    if (!brandCode) {
      setModels([])
      return
    }
    const token = getToken()
    if (!token) return
    setLoadingModels(true)
    setModelCode("")
    fetch(`/api/cars/brands/${encodeURIComponent(brandCode)}/models`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setModels(Array.isArray(d.models) ? d.models : []))
      .catch(() => setModels([]))
      .finally(() => setLoadingModels(false))
  }, [brandCode])

  const submit = async () => {
    const token = getToken()
    if (!token) return
    const brand = brands.find((b) => b.code === brandCode)
    const model = models.find((m) => m.code === modelCode)

    const payload = manual
      ? {
          brand_code: `m-${brandFree.trim().toLowerCase().slice(0, 12)}`,
          brand_label: brandFree.trim(),
          model_code: `m-${modelFree.trim().toLowerCase().slice(0, 28)}`,
          model_label: modelFree.trim(),
        }
      : {
          brand_code: brandCode,
          brand_label: brand?.label || "",
          model_code: modelCode,
          model_label: model?.label || "",
        }

    if (!payload.brand_label || !payload.model_label) {
      setMsg(t("carPickBoth", "Escolha a marca e o modelo."))
      return
    }

    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch("/api/cars", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("createError", "Não foi possível criar."))
      onCreated?.()
      onClose()
      router.push(`/comunidades/${data.community.id_profile}`)
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t("createError", "Não foi possível criar."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <TabloidDialog
      open={open}
      onOpenChange={(v) => { if (!v) onClose() }}
      title={<span className="flex items-center gap-2"><Car className="h-5 w-5" /> {t("newCarTitle", "Meu carro")}</span>}
      description={t("newCarDesc", "Existe uma única comunidade por modelo. Se alguém já tiver criado a do seu carro, você entra na dela.")}
      className="fl-root fl-sharp"
    >
      <div className="space-y-4">
        {manual ? (
          <>
            <p className="border-2 border-[#0B0B0D]/15 bg-[#F2B705]/15 px-3 py-2 text-xs text-[#0B0B0D]">
              {t("carFipeOffline", "A tabela FIPE não respondeu agora. Você pode digitar marca e modelo.")}
            </p>
            <div>
              <label htmlFor="car-brand-free" className="fl-label">{t("carBrandLabel", "Marca")}</label>
              <input
                id="car-brand-free"
                className="fl-input"
                value={brandFree}
                onChange={(e) => setBrandFree(e.target.value)}
                maxLength={80}
              />
            </div>
            <div>
              <label htmlFor="car-model-free" className="fl-label">{t("carModelLabel", "Modelo")}</label>
              <input
                id="car-model-free"
                className="fl-input"
                value={modelFree}
                onChange={(e) => setModelFree(e.target.value)}
                maxLength={120}
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <label htmlFor="car-brand" className="fl-label">{t("carBrandLabel", "Marca")}</label>
              <select
                id="car-brand"
                className="fl-input"
                value={brandCode}
                disabled={loadingBrands}
                onChange={(e) => setBrandCode(e.target.value)}
              >
                <option value="">{loadingBrands ? t("loading", "Carregando...") : "—"}</option>
                {brands.map((b) => (
                  <option key={b.code} value={b.code}>{b.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="car-model" className="fl-label">{t("carModelLabel", "Modelo")}</label>
              <select
                id="car-model"
                className="fl-input"
                value={modelCode}
                disabled={!brandCode || loadingModels}
                onChange={(e) => setModelCode(e.target.value)}
              >
                <option value="">
                  {!brandCode
                    ? t("carPickBrandFirst", "Escolha a marca")
                    : loadingModels
                      ? t("loading", "Carregando...")
                      : "—"}
                </option>
                {models.map((m) => (
                  <option key={m.code} value={m.code}>{m.label}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {msg && <p className="text-sm font-medium text-[#b91c1c]">{msg}</p>}

        <button
          type="button"
          disabled={saving}
          onClick={submit}
          className="fl-btn-gold inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold disabled:opacity-60"
        >
          <Car className="h-4 w-4" />
          {saving ? t("opening", "Abrindo...") : t("createCarCta", "Abrir comunidade do carro")}
        </button>
      </div>
    </TabloidDialog>
  )
}
