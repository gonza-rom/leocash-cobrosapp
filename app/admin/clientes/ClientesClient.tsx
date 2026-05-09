'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import type { Cliente } from '@/types'

const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

interface ClienteConDeuda extends Cliente {
  deuda_total: number
  prestamos_activos: number
  foto_dni_url?: string
}

export default function ClientesClient({ clientes: inicial }: { clientes: ClienteConDeuda[] }) {
  const [clientes, setClientes] = useState(inicial)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<'todos' | 'al_dia' | 'con_deuda'>('todos')
  const [modal, setModal] = useState<'nuevo' | 'editar' | 'acceso' | 'ver_dni' | null>(null)
  const [clienteActual, setClienteActual] = useState<Partial<ClienteConDeuda> | null>(null)
  const [crearAccesoInline, setCrearAccesoInline] = useState(false)
  const [acceso, setAcceso] = useState({ email: '', password: '' })
  const [resetPassword, setResetPassword] = useState('')
  const [resetting, setResetting] = useState(false)
  const [verPassword, setVerPassword] = useState({ nuevo: false, acceso: false, reset: false })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [fotosDni, setFotosDni] = useState<File[]>([])
  const [fotosPreview, setFotosPreview] = useState<string[]>([])
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [fotoUrl, setFotoUrl] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filtrados = clientes.filter(c => {
    const q = busqueda.toLowerCase()
    const matchQ = !q || `${c.nombre} ${c.apellido} ${c.telefono ?? ''}`.toLowerCase().includes(q)
    const matchF = filtro === 'todos' || (filtro === 'al_dia' ? c.deuda_total === 0 : c.deuda_total > 0)
    return matchQ && matchF
  })

  function abrirNuevo() {
    setClienteActual({ nombre: '', apellido: '', telefono: '', email: '', dni: '', direccion: '', notas: '' })
    setAcceso({ email: '', password: '' })
    setCrearAccesoInline(false)
    setFotosDni([])
    setFotosPreview([])
    setModal('nuevo')
    setError('')
    setSuccess('')
  }

  function abrirEditar(c: ClienteConDeuda) {
    setClienteActual(c)
    setFotosDni([])
    // Parsear fotos existentes
    try {
      const paths: string[] = c.foto_dni_url ? JSON.parse(c.foto_dni_url) : []
      setFotosPreview(paths.map(p => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/documentos-clientes/${p}`))
    } catch {
      setFotosPreview(c.foto_dni_url ? [`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/documentos-clientes/${c.foto_dni_url}`] : [])
    }
    setModal('editar')
    setError('')
    setSuccess('')
  }

  function abrirAcceso(c: ClienteConDeuda) {
    setClienteActual(c)
    setAcceso({ email: c.email ?? '', password: '' })
    setResetPassword('')
    setModal('acceso')
    setError('')
    setSuccess('')
  }

  async function verDni(c: ClienteConDeuda) {
    if (!c.foto_dni_url) return
    setClienteActual(c)
    setModal('ver_dni')
    try {
      const paths: string[] = JSON.parse(c.foto_dni_url)
      setFotoUrl(paths.map(p => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/documentos-clientes/${p}`))
    } catch {
      setFotoUrl([`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/documentos-clientes/${c.foto_dni_url}`])
    }
  }

  function onFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    const totalActual = fotosDni.length + fotosPreview.filter(p => p.startsWith('http') || p.startsWith('blob')).length
    const disponibles = 3 - fotosDni.length - (clienteActual?.foto_dni_url ? JSON.parse(clienteActual.foto_dni_url).length : 0)

    if (files.length > disponibles) {
      setError(`Solo podés subir hasta 3 fotos en total`)
      return
    }

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) { setError('Cada imagen no puede superar 5MB'); return }
    }

    setFotosDni(prev => [...prev, ...files].slice(0, 3))
    setFotosPreview(prev => [...prev, ...files.map(f => URL.createObjectURL(f))].slice(0, 3))
    setError('')
    // Resetear input para permitir seleccionar de nuevo
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function subirFoto(clienteId: string, fotosExistentes: string[] = []): Promise<string | null> {
    if (!fotosDni.length) return fotosExistentes.length ? JSON.stringify(fotosExistentes) : null
    setUploadingFoto(true)
    const supabase = createClient()
    const paths: string[] = [...fotosExistentes]

    for (let i = 0; i < fotosDni.length; i++) {
      const file = fotosDni[i]
      const ext = file.name.split('.').pop()
      const path = `dni/${clienteId}_${Date.now()}_${i}.${ext}`
      const { error: upError } = await supabase.storage
        .from('documentos-clientes')
        .upload(path, file, { upsert: false })
      if (upError) { setError('Error al subir foto: ' + upError.message); setUploadingFoto(false); return null }
      paths.push(path)
    }

    setUploadingFoto(false)
    return JSON.stringify(paths.slice(0, 3))
  }

  async function guardar() {
    if (!clienteActual?.nombre || !clienteActual?.apellido) {
      setError('Nombre y apellido son obligatorios')
      return
    }
    if (crearAccesoInline && (!acceso.email || !acceso.password)) {
      setError('Si vas a crear acceso, email y contraseña son obligatorios')
      return
    }
    if (crearAccesoInline && acceso.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setSaving(true)
    setError('')
    const supabase = createClient()

    if (modal === 'nuevo') {
      const { data, error: e } = await supabase
        .from('clientes')
        .insert({
          nombre: clienteActual.nombre,
          apellido: clienteActual.apellido,
          telefono: clienteActual.telefono,
          email: crearAccesoInline ? acceso.email : clienteActual.email,
          dni: clienteActual.dni,
          direccion: clienteActual.direccion,
          notas: clienteActual.notas,
          activo: true,
        })
        .select('*')
        .single()

      if (e) { setError(e.message); setSaving(false); return }

      // Subir foto si hay
      let fotoDniPath = null
      if (fotosDni.length) {
        fotoDniPath = await subirFoto(data.id, [])
        if (fotoDniPath) {
          await supabase.from('clientes').update({ foto_dni_url: fotoDniPath }).eq('id', data.id)
        }
      }

      // Crear acceso si eligió
      if (crearAccesoInline) {
        const res = await fetch('/api/admin/crear-acceso', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clienteId: data.id, email: acceso.email, password: acceso.password, nombre: data.nombre }),
        })
        const json = await res.json()
        if (!res.ok) { setError(json.error ?? 'Cliente creado pero error al crear acceso'); setSaving(false); return }
        setClientes(prev => [{ ...data, foto_dni_url: fotoDniPath ?? undefined, user_id: json.userId, deuda_total: 0, prestamos_activos: 0 }, ...prev])
      } else {
        setClientes(prev => [{ ...data, foto_dni_url: fotoDniPath ?? undefined, deuda_total: 0, prestamos_activos: 0 }, ...prev])
      }

    } else {
      // Editar
      let fotoDniPath: string | null = clienteActual.foto_dni_url ?? null
      let existentes: string[] = []
      try {
        existentes = fotoDniPath ? JSON.parse(fotoDniPath) : []
      } catch {
        existentes = fotoDniPath ? [fotoDniPath] : []
      }

      if (fotosDni.length) {
        fotoDniPath = await subirFoto(clienteActual.id!, existentes)
      }

      const { error: e } = await supabase
        .from('clientes')
        .update({
          nombre: clienteActual.nombre,
          apellido: clienteActual.apellido,
          telefono: clienteActual.telefono,
          email: clienteActual.email,
          dni: clienteActual.dni,
          direccion: clienteActual.direccion,
          notas: clienteActual.notas,
          foto_dni_url: fotoDniPath,
          updated_at: new Date().toISOString(),
        })
        .eq('id', clienteActual!.id!)

      if (e) { setError(e.message); setSaving(false); return }
      setClientes(prev => prev.map(c =>
        c.id === clienteActual!.id
          ? { ...c, ...clienteActual, foto_dni_url: fotoDniPath ?? undefined }
          : c
      ))
    }

    setSaving(false)
    setModal(null)
  }

  async function crearAccesoModal() {
    if (!acceso.email || !acceso.password) { setError('Email y contraseña son obligatorios'); return }
    if (acceso.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    setSaving(true)
    setError('')
    const res = await fetch('/api/admin/crear-acceso', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clienteId: clienteActual!.id, email: acceso.email, password: acceso.password, nombre: clienteActual!.nombre }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Error al crear acceso'); setSaving(false); return }
    setClientes(prev => prev.map(c => c.id === clienteActual!.id ? { ...c, user_id: json.userId } : c))
    setSuccess(`Acceso creado. El cliente puede entrar con ${acceso.email}`)
    setSaving(false)
  }

  async function resetearPassword() {
    if (!resetPassword || resetPassword.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    setResetting(true)
    setError('')
    const res = await fetch('/api/admin/resetear-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: clienteActual?.user_id, password: resetPassword }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Error al resetear contraseña'); setResetting(false); return }
    setSuccess('Contraseña actualizada correctamente')
    setResetPassword('')
    setResetting(false)
  }

  async function eliminar(id: string, userId?: string) {
    if (!confirm('¿Eliminar este cliente?')) return
    const supabase = createClient()
    if (userId) {
      await fetch('/api/admin/eliminar-usuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
    }
    await supabase.from('clientes').update({ activo: false }).eq('id', id)
    setClientes(prev => prev.filter(c => c.id !== id))
  }

  const inputStyle = {
    width: '100%', padding: '0.625rem 0.875rem',
    background: 'var(--bg-3)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', color: 'var(--text)',
    fontSize: 14, fontFamily: 'var(--font-body)', outline: 'none',
  } as const
  const labelStyle = { display: 'block', fontSize: 12, color: 'var(--text-2)', marginBottom: 5 } as const

  return (
    <div style={{ animation: 'fadeUp 0.4s ease' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 4 }}>
          Clientes
        </h1>
        <p style={{ color: 'var(--text-2)', fontSize: 14 }}>{clientes.length} clientes activos</p>
      </div>

      {/* Stats rápidas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'Total',     value: String(clientes.length),                                                          color: 'var(--text)' },
          { label: 'Al día',    value: String(clientes.filter(c => c.deuda_total === 0).length),                         color: 'var(--accent)' },
          { label: 'Con deuda', value: String(clientes.filter(c => c.deuda_total > 0).length),                           color: 'var(--red)' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.875rem', boxShadow: 'var(--shadow-sm)', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, color: s.color, fontWeight: 700 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Barra acciones */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o teléfono..."
          style={{ flex: 1, minWidth: 200, padding: '0.75rem 1rem', background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-body)', outline: 'none', boxShadow: 'var(--shadow-sm)' }}
          onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-dim)' }}
          onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'var(--shadow-sm)' }}
        />
        <div style={{ display: 'flex', gap: 4 }}>
          {([['todos', 'Todos'], ['al_dia', 'Al día'], ['con_deuda', 'Con deuda']] as const).map(([v, l]) => (
            <button key={v} onClick={() => setFiltro(v)} style={{ padding: '0.625rem 1rem', borderRadius: 'var(--radius-sm)', border: `1px solid ${filtro === v ? 'var(--accent)' : 'var(--border)'}`, background: filtro === v ? 'var(--accent-dim)' : '#fff', color: filtro === v ? 'var(--accent)' : 'var(--text-2)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-body)', fontWeight: filtro === v ? 700 : 500 }}>{l}</button>
          ))}
        </div>
        <button onClick={abrirNuevo} style={{ padding: '0.625rem 1.25rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-body)', boxShadow: '0 4px 12px var(--accent-dim)', whiteSpace: 'nowrap' }}>
          + Nuevo
        </button>
      </div>
      
      {/* Lista de clientes — cards en mobile, tabla en PC */}
      <div className="clientes-lista">

        {/* Vista cards — mobile */}
        <div className="clientes-cards">
          {filtrados.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-3)', background: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
              Sin clientes
            </div>
          )}
          {filtrados.map(c => (
            <div key={c.id} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1rem', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '0.875rem' }}>
                {/* Avatar */}
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: c.deuda_total > 0 ? 'rgba(186,26,26,0.1)' : 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, color: c.deuda_total > 0 ? 'var(--red)' : 'var(--accent)', flexShrink: 0, position: 'relative' }}>
                  {c.nombre.charAt(0).toUpperCase()}
                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: '50%', background: c.deuda_total > 0 ? 'var(--red)' : 'var(--accent)', border: '2px solid #fff' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 2 }}>{c.nombre} {c.apellido}</div>
                  {c.email && <div style={{ fontSize: 12, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, color: c.deuda_total > 0 ? 'var(--red)' : 'var(--accent)', fontWeight: 700 }}>{fmt(c.deuda_total)}</div>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: c.deuda_total > 0 ? 'rgba(186,26,26,0.08)' : 'var(--accent-dim)', color: c.deuda_total > 0 ? 'var(--red)' : 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {c.deuda_total > 0 ? 'Con deuda' : 'Al día'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                {c.telefono && <span style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>{c.telefono}</span>}
                <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 'auto' }}>{c.prestamos_activos} préstamo{c.prestamos_activos !== 1 ? 's' : ''}</span>
                {c.user_id && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'var(--accent-dim)', color: 'var(--accent)', fontWeight: 700 }}>✓ Acceso</span>}
                {c.foto_dni_url && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'var(--bg-3)', color: 'var(--text-3)', fontWeight: 700 }}>📷 DNI</span>}
              </div>

              <div style={{ display: 'flex', gap: 6, marginTop: '0.75rem' }}>
                <a href={`/admin/clientes/${c.id}`} style={{ flex: 1, padding: '0.5rem', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-2)', textDecoration: 'none', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>Ver</a>
                <button onClick={() => abrirEditar(c)} style={{ flex: 1, padding: '0.5rem', background: 'var(--accent-dim)', border: '1px solid rgba(0,107,50,0.2)', borderRadius: 'var(--radius-sm)', color: 'var(--accent)', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)' }}>Editar</button>
                <button onClick={() => abrirAcceso(c)} style={{ flex: 1, padding: '0.5rem', background: c.user_id ? 'var(--bg-2)' : 'var(--accent-dim)', border: `1px solid ${c.user_id ? 'var(--border)' : 'rgba(0,107,50,0.2)'}`, borderRadius: 'var(--radius-sm)', color: c.user_id ? 'var(--text-3)' : 'var(--accent)', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)' }}>
                  {c.user_id ? 'Acceso' : '+ Acceso'}
                </button>
                <button onClick={() => eliminar(c.id, c.user_id ?? undefined)} style={{ padding: '0.5rem 0.75rem', background: 'rgba(186,26,26,0.08)', border: '1px solid rgba(186,26,26,0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--red)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-body)' }}>✕</button>
              </div>
            </div>
          ))}
        </div>

        {/* Vista tabla — PC */}
        <div className="clientes-tabla" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>
                  {['Cliente', 'Teléfono', 'Préstamos', 'Deuda total', 'Estado', 'DNI', 'Acceso', 'Acciones'].map(h => (
                    <th key={h} style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 && (
                  <tr><td colSpan={8} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-3)' }}>Sin clientes</td></tr>
                )}
                {filtrados.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                    onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-2)')}
                    onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: c.deuda_total > 0 ? 'rgba(186,26,26,0.08)' : 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: c.deuda_total > 0 ? 'var(--red)' : 'var(--accent)', flexShrink: 0 }}>
                          {c.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{c.nombre} {c.apellido}</div>
                          {c.email && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{c.email}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--text-2)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>{c.telefono || '—'}</td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'center', fontSize: 13, color: 'var(--text-2)' }}>{c.prestamos_activos}</td>
                    <td style={{ padding: '0.875rem 1rem', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                      <span style={{ color: c.deuda_total > 0 ? 'var(--red)' : 'var(--accent)', fontWeight: 700 }}>{fmt(c.deuda_total)}</span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span style={{ padding: '0.25rem 0.75rem', borderRadius: 20, fontSize: 11, fontWeight: 700, background: c.deuda_total > 0 ? 'rgba(186,26,26,0.08)' : 'var(--accent-dim)', color: c.deuda_total > 0 ? 'var(--red)' : 'var(--accent)' }}>
                        {c.deuda_total > 0 ? 'Con deuda' : 'Al día'}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      {c.foto_dni_url ? (
                        <button onClick={() => verDni(c)} style={{ padding: '0.25rem 0.625rem', borderRadius: 20, fontSize: 11, fontWeight: 700, background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(0,107,50,0.2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                          📷 Ver
                        </button>
                      ) : <span style={{ fontSize: 11, color: 'var(--text-3)' }}>—</span>}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span style={{ padding: '0.25rem 0.625rem', borderRadius: 20, fontSize: 11, fontWeight: 700, background: c.user_id ? 'var(--accent-dim)' : 'var(--bg-3)', color: c.user_id ? 'var(--accent)' : 'var(--text-3)' }}>
                        {c.user_id ? '✓ Activo' : 'Sin acceso'}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <a href={`/admin/clientes/${c.id}`} style={{ padding: '0.3rem 0.75rem', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-2)', textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>Ver</a>
                        <button onClick={() => abrirEditar(c)} style={{ padding: '0.3rem 0.75rem', background: 'var(--accent-dim)', border: '1px solid rgba(0,107,50,0.2)', borderRadius: 'var(--radius-sm)', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-body)' }}>Editar</button>
                        <button onClick={() => abrirAcceso(c)} style={{ padding: '0.3rem 0.75rem', background: c.user_id ? 'var(--bg-2)' : 'var(--accent-dim)', border: `1px solid ${c.user_id ? 'var(--border)' : 'rgba(0,107,50,0.2)'}`, borderRadius: 'var(--radius-sm)', color: c.user_id ? 'var(--text-3)' : 'var(--accent)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                          {c.user_id ? 'Acceso' : '+ Acceso'}
                        </button>
                        <button onClick={() => eliminar(c.id, c.user_id ?? undefined)} style={{ padding: '0.3rem 0.625rem', background: 'rgba(186,26,26,0.08)', border: '1px solid rgba(186,26,26,0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--red)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-body)' }}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{`
        .clientes-cards  { display: flex; flex-direction: column; gap: 0.875rem; }
        .clientes-tabla  { display: none; }

        @media (min-width: 900px) {
          .clientes-cards { display: none; }
          .clientes-tabla { display: block; }
        }
      `}</style>

      {/* Modal nuevo/editar */}
      {(modal === 'nuevo' || modal === 'editar') && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem', animation: 'fadeIn 0.2s ease' }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '2rem', width: '100%', maxWidth: 540, maxHeight: '90vh', overflow: 'auto', boxShadow: 'var(--shadow)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: '1.5rem' }}>
              {modal === 'nuevo' ? 'Nuevo cliente' : 'Editar cliente'}
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
              {[
                { key: 'nombre', label: 'Nombre *' },
                { key: 'apellido', label: 'Apellido *' },
                { key: 'telefono', label: 'Teléfono' },
                { key: 'dni', label: 'Número de DNI' },
              ].map(f => (
                <div key={f.key}>
                  <label style={labelStyle}>{f.label}</label>
                  <input value={(clienteActual as any)?.[f.key] ?? ''} onChange={e => setClienteActual(prev => ({ ...prev, [f.key]: e.target.value }))} style={inputStyle} />
                </div>
              ))}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Dirección</label>
                <input value={clienteActual?.direccion ?? ''} onChange={e => setClienteActual(p => ({ ...p, direccion: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Notas</label>
                <textarea value={clienteActual?.notas ?? ''} onChange={e => setClienteActual(p => ({ ...p, notas: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
            </div>

            {/* Foto DNI */}
            <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <label style={labelStyle}>Fotos del DNI</label>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{fotosPreview.length}/3 fotos</span>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={onFotoChange} style={{ display: 'none' }} />

              {/* Grid de fotos */}
              {fotosPreview.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 8 }}>
                  {fotosPreview.map((preview, i) => (
                    <div key={i} style={{ position: 'relative', aspectRatio: '4/3' }}>
                      <img
                        src={preview}
                        alt={`DNI ${i + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                      />
                      <button
                        onClick={() => {
                          const esExistente = preview.startsWith('http')
                          if (esExistente) {
                            // Quitar de las existentes
                            setFotosPreview(prev => prev.filter((_, idx) => idx !== i))
                            try {
                              const paths: string[] = JSON.parse(clienteActual?.foto_dni_url ?? '[]')
                              const nuevasPaths = paths.filter((_, idx) => idx !== i)
                              setClienteActual(p => ({ ...p, foto_dni_url: JSON.stringify(nuevasPaths) }))
                            } catch {}
                          } else {
                            // Quitar de las nuevas
                            const indexNueva = fotosPreview.slice(0, i).filter(p => !p.startsWith('http')).length
                            setFotosDni(prev => prev.filter((_, idx) => idx !== indexNueva))
                            setFotosPreview(prev => prev.filter((_, idx) => idx !== i))
                          }
                        }}
                        style={{
                          position: 'absolute', top: 4, right: 4,
                          width: 22, height: 22, borderRadius: '50%',
                          background: 'rgba(0,0,0,0.7)', border: 'none',
                          color: '#fff', cursor: 'pointer', fontSize: 12,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >✕</button>
                      <div style={{ position: 'absolute', bottom: 4, left: 4, background: 'rgba(0,0,0,0.6)', borderRadius: 4, padding: '1px 6px', fontSize: 10, color: '#fff' }}>
                        {i + 1}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {fotosPreview.length < 3 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '100%', padding: '1.25rem',
                    background: 'var(--bg-3)', border: '2px dashed var(--border)',
                    borderRadius: 'var(--radius-sm)', color: 'var(--text-3)',
                    cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-body)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  <span style={{ fontSize: 20 }}>📷</span>
                  {fotosPreview.length === 0 ? 'Subir fotos del DNI (máx. 3)' : `Agregar más fotos (${3 - fotosPreview.length} disponibles)`}
                </button>
              )}
            </div>

            {/* Acceso inline — solo en nuevo */}
            {modal === 'nuevo' && (
              <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: crearAccesoInline ? '1rem' : 0 }}>
                  <div>
                    <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>Crear acceso al panel</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Opcional — para que el cliente vea su deuda</div>
                  </div>
                  <button type="button" onClick={() => setCrearAccesoInline(!crearAccesoInline)} style={{ width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', background: crearAccesoInline ? 'var(--accent)' : 'var(--bg-4)', transition: 'background 0.2s', position: 'relative', flexShrink: 0 }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: crearAccesoInline ? 21 : 3, transition: 'left 0.2s' }} />
                  </button>
                </div>
                {crearAccesoInline && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                    <div>
                      <label style={labelStyle}>Email *</label>
                      <input type="email" value={acceso.email} onChange={e => setAcceso(p => ({ ...p, email: e.target.value }))} placeholder="email@cliente.com" style={inputStyle} />
                    </div>
                    <div style={{ position: 'relative' }}>
                      <label style={labelStyle}>Contraseña *</label>
                      <input type={verPassword.nuevo ? 'text' : 'password'} value={acceso.password} onChange={e => setAcceso(p => ({ ...p, password: e.target.value }))} placeholder="Mínimo 6 caracteres" style={{ ...inputStyle, paddingRight: '2.5rem' }} />
                      <button type="button" onClick={() => setVerPassword(p => ({ ...p, nuevo: !p.nuevo }))} style={{ position: 'absolute', right: 10, top: 30, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 16 }}>
                        {verPassword.nuevo ? '🙈' : '👁'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && <div style={{ marginTop: 12, padding: '0.5rem 0.875rem', background: 'var(--red-dim)', borderRadius: 'var(--radius-sm)', color: 'var(--red)', fontSize: 13 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 8, marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(null)} style={{ padding: '0.6rem 1.25rem', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 14 }}>Cancelar</button>
              <button onClick={guardar} disabled={saving || uploadingFoto} style={{ padding: '0.6rem 1.5rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
                {uploadingFoto ? 'Subiendo foto...' : saving ? 'Guardando...' : modal === 'nuevo' ? 'Crear cliente' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ver DNI */}
      {modal === 'ver_dni' && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem', animation: 'fadeIn 0.2s ease' }}
        onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
        <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', width: '100%', maxWidth: 640, boxShadow: 'var(--shadow)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}>
              DNI — {clienteActual?.nombre} {clienteActual?.apellido}
            </h2>
            <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 20 }}>✕</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: fotoUrl.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
            {fotoUrl.map((url, i) => (
              <div key={i}>
                <img
                  src={url}
                  alt={`DNI ${i + 1}`}
                  style={{ width: '100%', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', cursor: 'pointer' }}
                  onClick={() => window.open(url, '_blank')}
                />
                <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                  Foto {i + 1} — clic para abrir en pantalla completa
                </div>
              </div>
            ))}
          </div>

          {clienteActual?.dni && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--bg-3)', borderRadius: 'var(--radius-sm)', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Número DNI</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: 'var(--text)', marginTop: 2 }}>{clienteActual.dni}</div>
              </div>
              {clienteActual.direccion && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Dirección</div>
                  <div style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 2 }}>{clienteActual.direccion}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )}

      {/* Modal acceso */}
      {modal === 'acceso' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem', animation: 'fadeIn 0.2s ease' }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '2rem', width: '100%', maxWidth: 420, boxShadow: 'var(--shadow)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 6 }}>Acceso del cliente</h2>
            <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: '1.5rem' }}>{clienteActual?.nombre} {clienteActual?.apellido}</p>

            {clienteActual?.user_id && !success && (
              <div style={{ padding: '0.75rem', background: 'var(--amber-dim)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: 13, color: 'var(--amber)' }}>
                Este cliente ya tiene acceso. Podés crear uno nuevo para cambiar las credenciales.
              </div>
            )}

            {!success && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                <div>
                  <label style={labelStyle}>Email *</label>
                  <input type="email" value={acceso.email} onChange={e => setAcceso(p => ({ ...p, email: e.target.value }))} placeholder="email@cliente.com" style={inputStyle} />
                </div>
                <div style={{ position: 'relative' }}>
                  <label style={labelStyle}>Contraseña *</label>
                  <input type={verPassword.acceso ? 'text' : 'password'} value={acceso.password} onChange={e => setAcceso(p => ({ ...p, password: e.target.value }))} placeholder="Mínimo 6 caracteres" style={{ ...inputStyle, paddingRight: '2.5rem' }} />
                  <button type="button" onClick={() => setVerPassword(p => ({ ...p, acceso: !p.acceso }))} style={{ position: 'absolute', right: 10, top: 30, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 16 }}>
                    {verPassword.acceso ? '🙈' : '👁'}
                  </button>
                </div>
              </div>
            )}

            {/* Resetear password */}
            {clienteActual?.user_id && !success && (
              <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: '0.875rem', fontWeight: 500 }}>Cambiar contraseña</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input type={verPassword.reset ? 'text' : 'password'} value={resetPassword} onChange={e => setResetPassword(e.target.value)} placeholder="Nueva contraseña..." style={{ ...inputStyle, paddingRight: '2.5rem' }} />
                    <button type="button" onClick={() => setVerPassword(p => ({ ...p, reset: !p.reset }))} style={{ position: 'absolute', right: 10, top: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 16 }}>
                      {verPassword.reset ? '🙈' : '👁'}
                    </button>
                  </div>
                  <button onClick={resetearPassword} disabled={resetting} style={{ padding: '0.625rem 1rem', background: 'var(--amber-dim)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--radius-sm)', color: 'var(--amber)', cursor: resetting ? 'not-allowed' : 'pointer', fontSize: 13, fontFamily: 'var(--font-body)', whiteSpace: 'nowrap', opacity: resetting ? 0.7 : 1 }}>
                    {resetting ? 'Actualizando...' : 'Cambiar'}
                  </button>
                </div>
              </div>
            )}

            {error && <div style={{ marginTop: 12, padding: '0.5rem 0.875rem', background: 'var(--red-dim)', borderRadius: 'var(--radius-sm)', color: 'var(--red)', fontSize: 13 }}>{error}</div>}
            {success && <div style={{ padding: '0.75rem', background: 'var(--green-dim)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 'var(--radius-sm)', color: 'var(--green)', fontSize: 13 }}>{success}</div>}

            <div style={{ display: 'flex', gap: 8, marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(null)} style={{ padding: '0.6rem 1.25rem', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 14 }}>Cerrar</button>
              {!success && (
                <button onClick={crearAccesoModal} disabled={saving} style={{ padding: '0.6rem 1.5rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Creando...' : clienteActual?.user_id ? 'Actualizar acceso' : 'Crear acceso'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}