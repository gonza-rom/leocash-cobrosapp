'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'

const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

interface Prestamo {
  id: string
  cliente_id: string
  descripcion: string
  monto_total: number
  monto_pagado: number
  monto_cuota: number
  cantidad_cuotas: number
  cuotas_pagadas: number
  fecha_inicio: string
  fecha_vencimiento: string | null
  estado: string
  notas: string
  created_at: string
  updated_at: string
  clientes: { nombre: string; apellido: string; telefono: string }
}

export default function PrestamosClient({ prestamos: inicial }: { prestamos: Prestamo[] }) {
  const [prestamos, setPrestamos] = useState(inicial)
  const [modal, setModal] = useState(false)
  const [clientes, setClientes] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filtro, setFiltro] = useState<'todos' | 'activo' | 'pagado'>('todos')
  const [form, setForm] = useState({
    cliente_id: '', descripcion: '', monto_total: '',
    cantidad_cuotas: '1', fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_vencimiento: '', notas: '',
  })

  const montoCuota = form.monto_total && form.cantidad_cuotas
    ? Number(form.monto_total) / Number(form.cantidad_cuotas)
    : 0

  useEffect(() => {
    if (modal) {
      createClient().from('clientes').select('id, nombre, apellido').eq('activo', true).order('nombre')
        .then(({ data }) => setClientes(data ?? []))
    }
  }, [modal])

  async function guardar() {
    if (!form.cliente_id || !form.descripcion || !form.monto_total) {
      setError('Cliente, descripción y monto son obligatorios')
      return
    }
    setSaving(true)
    const supabase = createClient()
    const { data, error: e } = await supabase
      .from('prestamos')
      .insert({
        cliente_id: form.cliente_id,
        descripcion: form.descripcion,
        monto_total: Number(form.monto_total),
        cantidad_cuotas: Number(form.cantidad_cuotas),
        monto_cuota: montoCuota,
        fecha_inicio: form.fecha_inicio,
        fecha_vencimiento: form.fecha_vencimiento || null,
        notas: form.notas,
        estado: 'activo',
      })
      .select('*, clientes(nombre, apellido, telefono)')
      .single()

    if (e) { setError(e.message); setSaving(false); return }

    setPrestamos(prev => [{
      id: data.id,
      cliente_id: data.cliente_id,
      descripcion: data.descripcion,
      monto_total: Number(data.monto_total),
      monto_pagado: Number(data.monto_pagado),
      monto_cuota: Number(data.monto_cuota),
      cantidad_cuotas: data.cantidad_cuotas,
      cuotas_pagadas: data.cuotas_pagadas,
      fecha_inicio: data.fecha_inicio,
      fecha_vencimiento: data.fecha_vencimiento,
      estado: data.estado,
      notas: data.notas ?? '',
      created_at: data.created_at,
      updated_at: data.updated_at,
      clientes: data.clientes,
    }, ...prev])

    setSaving(false)
    setModal(false)
    setForm({ cliente_id: '', descripcion: '', monto_total: '', cantidad_cuotas: '1', fecha_inicio: new Date().toISOString().split('T')[0], fecha_vencimiento: '', notas: '' })
  }

  const filtrados = prestamos.filter(p => filtro === 'todos' || p.estado === filtro)

  const inputStyle = {
    width: '100%', padding: '0.625rem 0.875rem',
    background: 'var(--bg-3)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', color: 'var(--text)',
    fontSize: 14, fontFamily: 'var(--font-body)', outline: 'none',
  } as const

  return (
    <div style={{ animation: 'fadeUp 0.4s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, letterSpacing: '-0.02em', marginBottom: 4 }}>Préstamos</h1>
          <p style={{ color: 'var(--text-2)', fontSize: 14 }}>{prestamos.length} préstamos en total</p>
        </div>
        <button onClick={() => { setModal(true); setError('') }} style={{ padding: '0.625rem 1.25rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-body)' }}>
          + Nuevo préstamo
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 4, marginBottom: '1rem' }}>
        {([['todos', 'Todos'], ['activo', 'Activos'], ['pagado', 'Pagados']] as const).map(([v, l]) => (
          <button key={v} onClick={() => setFiltro(v)} style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', border: `1px solid ${filtro === v ? 'var(--accent)' : 'var(--border)'}`, background: filtro === v ? 'var(--accent-dim)' : 'var(--bg-2)', color: filtro === v ? 'var(--accent-light)' : 'var(--text-2)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-body)' }}>{l}</button>
        ))}
      </div>

      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Cliente', 'Descripción', 'Cuota', 'Pagado', 'Pendiente', 'Cuotas', 'Estado', ''].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 && (
                <tr><td colSpan={8} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-3)' }}>Sin préstamos</td></tr>
              )}
              {filtrados.map(p => {
                const pendiente = p.monto_total - p.monto_pagado
                const pct = p.monto_total > 0 ? Math.round((p.monto_pagado / p.monto_total) * 100) : 0
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-3)')}
                    onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{p.clientes.nombre} {p.clientes.apellido}</div>
                      {p.clientes.telefono && <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{p.clientes.telefono}</div>}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontSize: 13, color: 'var(--text-2)' }}>{p.descripcion}</td>
                    <td style={{ padding: '0.875rem 1rem', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-2)' }}>{fmt(p.monto_cuota)}</td>
                    <td style={{ padding: '0.875rem 1rem', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--green)' }}>{fmt(p.monto_pagado)}</td>
                    <td style={{ padding: '0.875rem 1rem', fontFamily: 'var(--font-mono)', fontSize: 13, color: pendiente > 0 ? 'var(--red)' : 'var(--green)' }}>{fmt(pendiente)}</td>
                    <td style={{ padding: '0.875rem 1rem', fontSize: 12, color: 'var(--text-2)', textAlign: 'center' }}>
                      {p.cuotas_pagadas}/{p.cantidad_cuotas}
                      <div style={{ marginTop: 4, height: 3, background: 'var(--bg-4)', borderRadius: 2 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', borderRadius: 2 }} />
                      </div>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span style={{ padding: '0.2rem 0.625rem', borderRadius: 20, fontSize: 11, fontWeight: 600, background: p.estado === 'pagado' ? 'var(--green-dim)' : p.estado === 'activo' ? 'var(--accent-dim)' : 'var(--red-dim)', color: p.estado === 'pagado' ? 'var(--green)' : p.estado === 'activo' ? 'var(--accent-light)' : 'var(--red)' }}>
                        {p.estado}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      {p.estado === 'activo' && (
                        <a href={`/admin/pagos?prestamo=${p.id}&cliente=${p.cliente_id}`} style={{ padding: '0.3rem 0.75rem', background: 'var(--green-dim)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 'var(--radius-sm)', color: 'var(--green)', textDecoration: 'none', fontSize: 12 }}>Pagar</a>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal nuevo préstamo */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem', animation: 'fadeIn 0.2s ease' }}
          onClick={e => { if (e.target === e.currentTarget) setModal(false) }}>
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '2rem', width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto', boxShadow: 'var(--shadow)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: '1.5rem' }}>Nuevo préstamo</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', marginBottom: 5 }}>Cliente *</label>
                <select value={form.cliente_id} onChange={e => setForm(p => ({ ...p, cliente_id: e.target.value }))} style={inputStyle}>
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', marginBottom: 5 }}>Descripción *</label>
                <input value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Ej: Préstamo para electrodoméstico" style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', marginBottom: 5 }}>Monto total *</label>
                  <input type="number" value={form.monto_total} onChange={e => setForm(p => ({ ...p, monto_total: e.target.value }))} placeholder="0" style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', marginBottom: 5 }}>Cantidad de cuotas</label>
                  <input type="number" min="1" value={form.cantidad_cuotas} onChange={e => setForm(p => ({ ...p, cantidad_cuotas: e.target.value }))} style={inputStyle} />
                </div>
              </div>
              {montoCuota > 0 && (
                <div style={{ padding: '0.75rem', background: 'var(--accent-dim)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <span style={{ fontSize: 13, color: 'var(--accent-light)' }}>
                    Cuota: <strong style={{ fontFamily: 'var(--font-mono)' }}>{fmt(montoCuota)}</strong>
                  </span>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', marginBottom: 5 }}>Fecha inicio</label>
                  <input type="date" value={form.fecha_inicio} onChange={e => setForm(p => ({ ...p, fecha_inicio: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', marginBottom: 5 }}>Vencimiento (opcional)</label>
                  <input type="date" value={form.fecha_vencimiento} onChange={e => setForm(p => ({ ...p, fecha_vencimiento: e.target.value }))} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', marginBottom: 5 }}>Notas</label>
                <textarea value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
            </div>
            {error && <div style={{ marginTop: 12, padding: '0.5rem 0.875rem', background: 'var(--red-dim)', borderRadius: 'var(--radius-sm)', color: 'var(--red)', fontSize: 13 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(false)} style={{ padding: '0.6rem 1.25rem', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 14 }}>Cancelar</button>
              <button onClick={guardar} disabled={saving} style={{ padding: '0.6rem 1.5rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Guardando...' : 'Crear préstamo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}