'use client'

/**
 * Form de edição do perfil (briefing 4.7).
 */
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { updatePerfil } from '@/lib/actions/configuracoes'
import { formatPhoneBR } from '@/lib/utils/phone'
import type { Setor } from '@/types/database'

interface PerfilFormProps {
  initial: {
    nome_negocio: string
    setor: Setor
    whatsapp: string
  }
}

const SETORES: Array<{ value: Setor; label: string }> = [
  { value: 'alimentacao', label: 'Alimentação' },
  { value: 'servicos',    label: 'Serviços' },
  { value: 'comercio',    label: 'Comércio' },
  { value: 'construcao',  label: 'Construção' },
  { value: 'saude',       label: 'Saúde' },
  { value: 'educacao',    label: 'Educação' },
  { value: 'outros',      label: 'Outros' },
]

export function PerfilForm({ initial }: PerfilFormProps) {
  const router = useRouter()
  const [nome, setNome] = useState(initial.nome_negocio)
  const [setor, setSetor] = useState<Setor>(initial.setor)
  const [whatsapp, setWhatsapp] = useState(formatPhoneBR(initial.whatsapp))
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; text: string } | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setMsg(null)

    const res = await updatePerfil({
      nome_negocio: nome,
      setor,
      whatsapp: whatsapp.trim() || null,
    })
    setSubmitting(false)
    if (!res.ok) {
      setMsg({ tipo: 'erro', text: res.error })
      return
    }
    setMsg({ tipo: 'ok', text: 'Salvo.' })
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="text-caption text-sobra-ink/70 mb-1.5 block">Nome do negócio</span>
        <input
          type="text"
          required
          maxLength={120}
          className="sobra-input"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
      </label>

      <label className="block">
        <span className="text-caption text-sobra-ink/70 mb-1.5 block">Setor</span>
        <select
          className="sobra-input"
          value={setor}
          onChange={(e) => setSetor(e.target.value as Setor)}
        >
          {SETORES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-caption text-sobra-ink/70 mb-1.5 block">WhatsApp</span>
        <input
          type="tel"
          maxLength={16}
          placeholder="(11) 99999-9999"
          className="sobra-input"
          value={whatsapp}
          onChange={(e) => setWhatsapp(formatPhoneBR(e.target.value))}
        />
      </label>

      <div className="flex items-center gap-3">
        <button type="submit" className="sobra-btn-primary" disabled={submitting}>
          {submitting ? 'Salvando...' : 'Salvar perfil'}
        </button>
        {msg && (
          <span className={`text-caption ${msg.tipo === 'ok' ? 'text-sobra-green' : 'text-sobra-danger-text'}`}>
            {msg.text}
          </span>
        )}
      </div>
    </form>
  )
}
