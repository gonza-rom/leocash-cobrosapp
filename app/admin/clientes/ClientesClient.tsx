'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import type { Cliente } from '@/types'

const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

interface ClienteConDeuda extends Cliente {
  deuda_total: number
  prestamos_activos: number
}

export default function ClientesClient({ clientes: inicial }: { clientes: ClienteConDeuda[] }) {
  const [clientes, setClientes] = useState(inicial)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<'todos' | 'al_dia' | 'con_deuda'>('todos')
  const [modal, setModal] = useState<'nuevo' | 'editar' | 'acceso' | null>(null)
  const [clienteActual, setClienteActual] = useState<Partial<ClienteConDeuda> | null>(null)
  const [crearAccesoInline, setCrearAccesoInline] = useState(false)
  const [acceso, setAcceso] = useState({ email: '', password: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [resetPassword, setResetPassword] = useState('')
  const [resetting, setResetting] = useState(false)
  const [verPassword, setVerPassword] = useState({ nuevo: false, acceso: false, reset: false })

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
    setModal('nuevo')
    setError('')
    setSuccess('')
  }

  function abrirEditar(c: ClienteConDeuda) {
    setClienteActual(c)
    setModal('editar')
    setError('')
    setSuccess('')
  }

  function abrirAcceso(c: ClienteConDeuda) {
    setClienteActual(c)
    setAcceso({ email: c.email ?? '', password: '' })
    setModal('acceso')
    setError('')
    setSuccess('')
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

      // Si eligió crear acceso, llamar al API
      if (crearAccesoInline) {
        const res = await fetch('/api/admin/crear-acceso', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clienteId: data.id,
            email: acceso.email,
            password: acceso.password,
            nombre: data.nombre,
          }),
        })
        const json = await res.json()
        if (!res.ok) { setError(json.error ?? 'Cliente creado pero error al crear acceso'); setSaving(false); return }
        setClientes(prev => [{ ...data, user_id: json.userId, deuda_total: 0, prestamos_activos: 0 }, ...prev])
      } else {
        setClientes(prev => [{ ...data, deuda_total: 0, prestamos_activos: 0 }, ...prev])
      }
    } else {
      const { error: e } = await supabase
        .from('clientes')
        .update({ ...clienteActual, updated_at: new Date().toISOString() })
        .eq('id', clienteActual!.id!)
      if (e) { setError(e.message); setSaving(false); return }
      setClientes(prev => prev.map(c => c.id === clienteActual!.id ? { ...c, ...clienteActual } : c))
    }

    setSaving(false)
    setModal(null)
  }

  async function crearAccesoModal() {
    if (!acceso.email || !acceso.password) {
      setError('Email y contraseña son obligatorios')
      return
    }
    if (acceso.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setSaving(true)
    setError('')

    const res = await fetch('/api/admin/crear-acceso', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clienteId: clienteActual!.id,
        email: acceso.email,
        password: acceso.password,
        nombre: clienteActual!.nombre,
      }),
    })

    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Error al crear acceso'); setSaving(false); return }

    setClientes(prev => prev.map(c => c.id === clienteActual!.id ? { ...c, user_id: json.userId } : c))
    setSuccess(`Acceso creado. El cliente puede entrar con ${acceso.email}`)
    setSaving(false)
  }

  async function eliminar(id: string, userId?: string) {
    if (!confirm('¿Eliminar este cliente? Esta acción no se puede deshacer.')) return
    const supabase = createClient()

    // Si tiene usuario en Auth, eliminarlo también
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

  async function resetearPassword() {
    if (!resetPassword || resetPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setResetting(true)
    setError('')

    const res = await fetch('/api/admin/resetear-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: clienteActual?.user_id,
        password: resetPassword,
      }),
    })

    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Error al resetear contraseña')
      setResetting(false)
      return
    }

    setSuccess('Contraseña actualizada correctamente')
    setResetPassword('')
    setResetting(false)
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, letterSpacing: '-0.02em', marginBottom: 4 }}>Clientes</h1>
          <p style={{ color: 'var(--text-2)', fontSize: 14 }}>{clientes.length} clientes activos</p>
        </div>
        <button onClick={abrirNuevo} style={{ padding: '0.625rem 1.25rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-body)' }}>
          + Nuevo cliente
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por nombre o teléfono..." style={{ ...inputStyle, flex: 1, minWidth: 200 }} />
        <div style={{ display: 'flex', gap: 4 }}>
          {([['todos', 'Todos'], ['al_dia', 'Al día'], ['con_deuda', 'Con deuda']] as const).map(([v, l]) => (
            <button key={v} onClick={() => setFiltro(v)} style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', border: `1px solid ${filtro === v ? 'var(--accent)' : 'var(--border)'}`, background: filtro === v ? 'var(--accent-dim)' : 'var(--bg-2)', color: filtro === v ? 'var(--accent-light)' : 'var(--text-2)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-body)' }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Cliente', 'Teléfono', 'Préstamos', 'Deuda total', 'Estado', 'Acceso', 'Acciones'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 && (
                <tr><td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-3)' }}>Sin clientes</td></tr>
              )}
              {filtrados.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-3)')}
                  onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <div style={{ fontWeight: 500 }}>{c.nombre} {c.apellido}</div>
                    {c.email && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{c.email}</div>}
                  </td>
                  <td style={{ padding: '0.875rem 1rem', color: 'var(--text-2)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>{c.telefono || '—'}</td>
                  <td style={{ padding: '0.875rem 1rem', color: 'var(--text-2)', textAlign: 'center' }}>{c.prestamos_activos}</td>
                  <td style={{ padding: '0.875rem 1rem', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                    <span style={{ color: c.deuda_total > 0 ? 'var(--red)' : 'var(--green)' }}>{fmt(c.deuda_total)}</span>
                  </td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <span style={{ padding: '0.25rem 0.625rem', borderRadius: 20, fontSize: 11, fontWeight: 600, background: c.deuda_total > 0 ? 'var(--red-dim)' : 'var(--green-dim)', color: c.deuda_total > 0 ? 'var(--red)' : 'var(--green)' }}>
                      {c.deuda_total > 0 ? 'Con deuda' : 'Al día'}
                    </span>
                  </td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <span style={{ padding: '0.25rem 0.625rem', borderRadius: 20, fontSize: 11, fontWeight: 600, background: c.user_id ? 'var(--green-dim)' : 'var(--bg-4)', color: c.user_id ? 'var(--green)' : 'var(--text-3)' }}>
                      {c.user_id ? '✓ Con acceso' : 'Sin acceso'}
                    </span>
                  </td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <a href={`/admin/clientes/${c.id}`} style={{ padding: '0.3rem 0.75rem', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-2)', textDecoration: 'none', fontSize: 12 }}>Ver</a>
                      <button onClick={() => abrirEditar(c)} style={{ padding: '0.3rem 0.75rem', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-light)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-body)' }}>Editar</button>
                      <button onClick={() => abrirAcceso(c)} style={{ padding: '0.3rem 0.75rem', background: c.user_id ? 'var(--bg-3)' : 'var(--accent-dim)', border: `1px solid ${c.user_id ? 'var(--border)' : 'rgba(99,102,241,0.3)'}`, borderRadius: 'var(--radius-sm)', color: c.user_id ? 'var(--text-3)' : 'var(--accent-light)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-body)' }}>
                        {c.user_id ? 'Acceso' : '+ Acceso'}
                      </button>
                      <button onClick={() => eliminar(c.id, c.user_id ?? undefined)} style={{ padding: '0.3rem 0.75rem', background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-sm)', color: 'var(--red)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-body)' }}>✕</button>                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal nuevo/editar */}
      {(modal === 'nuevo' || modal === 'editar') && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem', animation: 'fadeIn 0.2s ease' }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '2rem', width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto', boxShadow: 'var(--shadow)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: '1.5rem' }}>
              {modal === 'nuevo' ? 'Nuevo cliente' : 'Editar cliente'}
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
              {[
                { key: 'nombre', label: 'Nombre *' },
                { key: 'apellido', label: 'Apellido *' },
                { key: 'telefono', label: 'Teléfono' },
                { key: 'dni', label: 'DNI' },
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

            {/* Sección acceso — solo en nuevo */}
            {modal === 'nuevo' && (
              <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: crearAccesoInline ? '1rem' : 0 }}>
                  <div>
                    <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>Crear acceso al panel</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Opcional — para que el cliente vea su deuda</div>
                  </div>
                  <button
                    onClick={() => setCrearAccesoInline(!crearAccesoInline)}
                    style={{
                      width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
                      background: crearAccesoInline ? 'var(--accent)' : 'var(--bg-4)',
                      transition: 'background 0.2s', position: 'relative', flexShrink: 0,
                    }}
                  >
                    <div style={{
                      width: 16, height: 16, borderRadius: '50%', background: '#fff',
                      position: 'absolute', top: 3,
                      left: crearAccesoInline ? 21 : 3,
                      transition: 'left 0.2s',
                    }} />
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
                      <input
                        type={verPassword.nuevo ? 'text' : 'password'}
                        value={acceso.password}
                        onChange={e => setAcceso(p => ({ ...p, password: e.target.value }))}
                        placeholder="Mínimo 6 caracteres"
                        style={{ ...inputStyle, paddingRight: '2.5rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => setVerPassword(p => ({ ...p, nuevo: !p.nuevo }))}
                        style={{ position: 'absolute', right: 10, top: 30, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 16 }}
                      >
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
              <button onClick={guardar} disabled={saving} style={{ padding: '0.6rem 1.5rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Guardando...' : modal === 'nuevo' ? 'Crear cliente' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal acceso existente */}
      {modal === 'acceso' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem', animation: 'fadeIn 0.2s ease' }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '2rem', width: '100%', maxWidth: 420, boxShadow: 'var(--shadow)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 6 }}>Acceso del cliente</h2>
            <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: '1.5rem' }}>
              {clienteActual?.nombre} {clienteActual?.apellido}
            </p>
{clienteActual?.user_id && !success && (
  <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
    <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: '0.875rem', fontWeight: 500 }}>
      Cambiar contraseña
    </div>
    <div style={{ display: 'flex', gap: 8 }}>
      <input
        type="password"
        value={resetPassword}
        onChange={e => setResetPassword(e.target.value)}
        placeholder="Nueva contraseña..."
        style={{ ...inputStyle, flex: 1 }}
      />
      <button
        onClick={resetearPassword}
        disabled={resetting}
        style={{
          padding: '0.625rem 1rem',
          background: 'var(--amber-dim)',
          border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--amber)',
          cursor: resetting ? 'not-allowed' : 'pointer',
          fontSize: 13, fontFamily: 'var(--font-body)',
          whiteSpace: 'nowrap',
          opacity: resetting ? 0.7 : 1,
        }}
      >
        {resetting ? 'Actualizando...' : 'Cambiar'}
      </button>
    </div>
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
                  <input
                    type={verPassword.acceso ? 'text' : 'password'}
                    value={acceso.password}
                    onChange={e => setAcceso(p => ({ ...p, password: e.target.value }))}
                    placeholder="Mínimo 6 caracteres"
                    style={{ ...inputStyle, paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setVerPassword(p => ({ ...p, acceso: !p.acceso }))}
                    style={{ position: 'absolute', right: 10, top: 30, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 16 }}
                  >
                    {verPassword.acceso ? '🙈' : '👁'}
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