'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'

const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

export default function PagosClient({ pagos: inicial }: { pagos: any[] }) {
  const [pagos, setPagos] = useState(inicial)
  const [modal, setModal] = useState(false)
  const [clientes, setClientes] = useState<any[]>([])
  const [prestamosCliente, setPrestamosCliente] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    cliente_id: '', prestamo_id: '', monto: '', numero_cuota: '',
    metodo_pago: 'efectivo', fecha_pago: new Date().toISOString().split('T')[0], notas: '',
  })

  useEffect(() => {
    if (modal) {
      createClient().from('clientes').select('id, nombre, apellido').eq('activo', true).order('nombre')
        .then(({ data }) => setClientes(data ?? []))
    }
  }, [modal])

  useEffect(() => {
    if (form.cliente_id) {
      createClient().from('prestamos').select('id, descripcion, monto_cuota, cuotas_pagadas, cantidad_cuotas')
        .eq('cliente_id', form.cliente_id).eq('estado', 'activo')
        .then(({ data }) => {
          setPrestamosCliente(data ?? [])
          setForm(p => ({ ...p, prestamo_id: '', monto: '' }))
        })
    }
  }, [form.cliente_id])

  useEffect(() => {
    if (form.prestamo_id) {
      const p = prestamosCliente.find(p => p.id === form.prestamo_id)
      if (p) {
        setForm(prev => ({
          ...prev,
          monto: String(p.monto_cuota),
          numero_cuota: String(p.cuotas_pagadas + 1),
        }))
      }
    }
  }, [form.prestamo_id])

  async function guardar() {
    if (!form.cliente_id || !form.prestamo_id || !form.monto) {
      setError('Cliente, préstamo y monto son obligatorios')
      return
    }
    setSaving(true)
    const supabase = createClient()
    const { data, error: e } = await supabase
      .from('pagos')
      .insert({
        cliente_id: form.cliente_id,
        prestamo_id: form.prestamo_id,
        monto: Number(form.monto),
        fecha_pago: form.fecha_pago,
        numero_cuota: form.numero_cuota ? Number(form.numero_cuota) : null,
        metodo_pago: form.metodo_pago,
        notas: form.notas,
      })
      .select('*, clientes(nombre, apellido), prestamos(descripcion, monto_cuota)')
      .single()

    if (e) { setError(e.message); setSaving(false); return }
    setPagos(prev => [data, ...prev])
    setSaving(false)
    setModal(false)
    setForm({ cliente_id: '', prestamo_id: '', monto: '', numero_cuota: '', metodo_pago: 'efectivo', fecha_pago: new Date().toISOString().split('T')[0], notas: '' })
  }

  const inputStyle = { width: '100%', padding: '0.625rem 0.875rem', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-body)', outline: 'none' } as const

  const totalHoy = pagos.filter(p => p.fecha_pago === new Date().toISOString().split('T')[0]).reduce((s, p) => s + Number(p.monto), 0)

  return (
    <div style={{ animation: 'fadeUp 0.4s ease' }}>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 4 }}>Pagos</h1>
        <p style={{ color: 'var(--text-2)', fontSize: 14 }}>
          Hoy: <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{fmt(totalHoy)}</span>
          <span style={{ color: 'var(--text-3)', marginLeft: 6 }}>· {pagos.filter(p => p.fecha_pago === new Date().toISOString().split('T')[0]).length} pagos</span>
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'Total pagos', value: String(pagos.length), color: 'var(--text)' },
          { label: 'Hoy', value: fmt(totalHoy), color: 'var(--accent)' },
          { label: 'Efectivo', value: String(pagos.filter(p => p.metodo_pago === 'efectivo').length), color: 'var(--text-2)' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.875rem', boxShadow: 'var(--shadow-sm)', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: s.label === 'Hoy' ? 16 : 24, color: s.color, fontWeight: 700 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Botón */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button onClick={() => { setModal(true); setError('') }} style={{ padding: '0.625rem 1.25rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-body)', boxShadow: '0 4px 12px var(--accent-dim)' }}>
          + Registrar pago
        </button>
      </div>

      {/* Cards mobile */}
      <div className="pagos-cards">
        {pagos.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-3)', background: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>Sin pagos registrados</div>
        )}
        {pagos.map((p: any) => (
          <div key={p.id} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1rem', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" fill="var(--accent)" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 2 }}>{p.clientes?.nombre} {p.clientes?.apellido}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.prestamos?.descripcion}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{new Date(p.fecha_pago).toLocaleDateString('es-AR')}</span>
                {p.numero_cuota && <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 10, background: 'var(--bg-2)', color: 'var(--text-3)', fontWeight: 700 }}>Cuota {p.numero_cuota}</span>}
                <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 10, background: 'var(--bg-2)', color: 'var(--text-3)' }}>{p.metodo_pago}</span>
              </div>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>{fmt(p.monto)}</span>
          </div>
        ))}
      </div>

      {/* Tabla PC */}
      <div className="pagos-tabla" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>
                {['Fecha', 'Cliente', 'Préstamo', 'Cuota #', 'Método', 'Monto'].map(h => (
                  <th key={h} style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagos.length === 0 && <tr><td colSpan={6} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-3)' }}>Sin pagos</td></tr>}
              {pagos.map((p: any) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-2)')}
                  onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '0.875rem 1rem', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-2)' }}>
                    {new Date(p.fecha_pago).toLocaleDateString('es-AR')}
                  </td>
                  <td style={{ padding: '0.875rem 1rem', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                    {p.clientes?.nombre} {p.clientes?.apellido}
                  </td>
                  <td style={{ padding: '0.875rem 1rem', fontSize: 13, color: 'var(--text-2)' }}>{p.prestamos?.descripcion}</td>
                  <td style={{ padding: '0.875rem 1rem', textAlign: 'center', fontSize: 13, color: 'var(--text-2)' }}>{p.numero_cuota ?? '—'}</td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <span style={{ padding: '0.2rem 0.625rem', borderRadius: 20, fontSize: 11, background: 'var(--bg-3)', color: 'var(--text-2)', fontWeight: 600 }}>
                      {p.metodo_pago}
                    </span>
                  </td>
                  <td style={{ padding: '0.875rem 1rem', fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--accent)', fontWeight: 700 }}>
                    {fmt(p.monto)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .pagos-cards { display: flex; flex-direction: column; gap: 0.75rem; }
        .pagos-tabla  { display: none; }
        @media (min-width: 900px) {
          .pagos-cards { display: none; }
          .pagos-tabla  { display: block; }
        }
      `}</style>

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem', animation: 'fadeIn 0.2s ease' }}
          onClick={e => { if (e.target === e.currentTarget) setModal(false) }}>
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '2rem', width: '100%', maxWidth: 480, boxShadow: 'var(--shadow)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: '1.5rem' }}>Registrar pago</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', marginBottom: 5 }}>Cliente *</label>
                <select value={form.cliente_id} onChange={e => setForm(p => ({ ...p, cliente_id: e.target.value }))} style={inputStyle}>
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}
                </select>
              </div>
              {form.cliente_id && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', marginBottom: 5 }}>Préstamo *</label>
                  <select value={form.prestamo_id} onChange={e => setForm(p => ({ ...p, prestamo_id: e.target.value }))} style={inputStyle}>
                    <option value="">Seleccionar préstamo...</option>
                    {prestamosCliente.map(p => (
                      <option key={p.id} value={p.id}>{p.descripcion} — cuota {fmt(p.monto_cuota)}</option>
                    ))}
                  </select>
                  {prestamosCliente.length === 0 && <div style={{ fontSize: 12, color: 'var(--amber)', marginTop: 4 }}>Este cliente no tiene préstamos activos</div>}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', marginBottom: 5 }}>Monto *</label>
                  <input type="number" value={form.monto} onChange={e => setForm(p => ({ ...p, monto: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', marginBottom: 5 }}>Cuota #</label>
                  <input type="number" value={form.numero_cuota} onChange={e => setForm(p => ({ ...p, numero_cuota: e.target.value }))} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', marginBottom: 5 }}>Fecha de pago</label>
                  <input type="date" value={form.fecha_pago} onChange={e => setForm(p => ({ ...p, fecha_pago: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', marginBottom: 5 }}>Método</label>
                  <select value={form.metodo_pago} onChange={e => setForm(p => ({ ...p, metodo_pago: e.target.value }))} style={inputStyle}>
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', marginBottom: 5 }}>Notas</label>
                <input value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} placeholder="Opcional..." style={inputStyle} />
              </div>
            </div>
            {error && <div style={{ marginTop: 12, padding: '0.5rem 0.875rem', background: 'var(--red-dim)', borderRadius: 'var(--radius-sm)', color: 'var(--red)', fontSize: 13 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(false)} style={{ padding: '0.6rem 1.25rem', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 14 }}>Cancelar</button>
              <button onClick={guardar} disabled={saving} style={{ padding: '0.6rem 1.5rem', background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Guardando...' : 'Registrar pago'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
