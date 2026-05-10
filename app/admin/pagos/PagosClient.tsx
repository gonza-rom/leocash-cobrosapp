'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'

async function revalidar(tags: string[]) {
  await fetch('/api/admin/revalidar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tags }),
  })
}


const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

const FORM_VACIO = {
  cliente_id: '', prestamo_id: '', monto: '', numero_cuota: '',
  metodo_pago: 'efectivo', fecha_pago: new Date().toISOString().split('T')[0], notas: '',
}

export default function PagosClient({ pagos: inicial }: { pagos: any[] }) {
  const [pagos, setPagos] = useState(inicial)
  const [modal, setModal] = useState<'nuevo' | 'editar' | null>(null)
  const [pagoActual, setPagoActual] = useState<any>(null)
  const [clientes, setClientes] = useState<any[]>([])
  const [prestamosCliente, setPrestamosCliente] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(FORM_VACIO)
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (modal) {
      createClient().from('clientes').select('id, nombre, apellido').eq('activo', true).order('nombre')
        .then(({ data }) => setClientes(data ?? []))
    }
  }, [modal])

  useEffect(() => {
    if (form.cliente_id) {
      createClient().from('prestamos')
        .select('id, descripcion, monto_cuota, cuotas_pagadas, cantidad_cuotas, fecha_vencimiento')
        .eq('cliente_id', form.cliente_id).eq('estado', 'activo')
        .then(({ data }) => {
          setPrestamosCliente(data ?? [])
          if (modal === 'nuevo') setForm(p => ({ ...p, prestamo_id: '', monto: '' }))
        })
    }
  }, [form.cliente_id])

  useEffect(() => {
    if (form.prestamo_id && modal === 'nuevo') {
      const p = prestamosCliente.find(p => p.id === form.prestamo_id)
      if (p) setForm(prev => ({ ...prev, monto: String(p.monto_cuota), numero_cuota: String(p.cuotas_pagadas + 1) }))
    }
  }, [form.prestamo_id])

  function abrirNuevo() {
    setForm(FORM_VACIO)
    setPagoActual(null)
    setError('')
    setModal('nuevo')
  }

  function abrirEditar(p: any) {
    setForm({
      cliente_id:   p.cliente_id,
      prestamo_id:  p.prestamo_id,
      monto:        String(p.monto),
      numero_cuota: p.numero_cuota ? String(p.numero_cuota) : '',
      metodo_pago:  p.metodo_pago,
      fecha_pago:   p.fecha_pago,
      notas:        p.notas ?? '',
    })
    setPagoActual(p)
    setError('')
    setModal('editar')
  }

  async function guardar() {
    if (!form.cliente_id || !form.prestamo_id || !form.monto) {
      setError('Cliente, préstamo y monto son obligatorios')
      return
    }
    setSaving(true)
    const supabase = createClient()

    if (modal === 'nuevo') {
      const { data, error: e } = await supabase
        .from('pagos')
        .insert({
          cliente_id:   form.cliente_id,
          prestamo_id:  form.prestamo_id,
          monto:        Number(form.monto),
          fecha_pago:   form.fecha_pago,
          numero_cuota: form.numero_cuota ? Number(form.numero_cuota) : null,
          metodo_pago:  form.metodo_pago,
          notas:        form.notas,
        })
        .select('*, clientes(nombre, apellido), prestamos(descripcion, monto_cuota, fecha_vencimiento)')
        .single()

      if (e) { setError(e.message); setSaving(false); return }

      const fechaPago = new Date(form.fecha_pago)
      const fechaVenc = data.prestamos?.fecha_vencimiento ? new Date(data.prestamos.fecha_vencimiento) : null
      let tipoPunto = 'pago_puntual'
      if (fechaVenc) {
        fechaPago.setHours(0,0,0,0); fechaVenc.setHours(0,0,0,0)
        const dias = Math.floor((fechaPago.getTime() - fechaVenc.getTime()) / 86400000)
        if (dias < 0) tipoPunto = 'pago_adelantado'
        else if (dias === 0) tipoPunto = 'pago_puntual'
        else if (dias <= 3) tipoPunto = 'mora_1_3'
        else if (dias <= 10) tipoPunto = 'mora_4_10'
        else tipoPunto = 'mora_mas_10'
      }

      await fetch('/api/admin/registrar-puntos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clienteId: form.cliente_id, prestamoId: form.prestamo_id, pagoId: data.id, tipo: tipoPunto }),
      })

      setPagos(prev => [{
        id: data.id, prestamo_id: data.prestamo_id, cliente_id: data.cliente_id,
        monto: Number(data.monto), fecha_pago: data.fecha_pago,
        numero_cuota: data.numero_cuota, metodo_pago: data.metodo_pago,
        notas: data.notas, created_at: data.created_at,
        clientes: data.clientes, prestamos: data.prestamos,
      }, ...prev])

      await revalidar(['pagos-list', 'dashboard-data', 'reportes-data', 'cliente-detalle'])


    } else {
      const { error: e } = await supabase
        .from('pagos').update({
          monto:        Number(form.monto),
          fecha_pago:   form.fecha_pago,
          numero_cuota: form.numero_cuota ? Number(form.numero_cuota) : null,
          metodo_pago:  form.metodo_pago,
          notas:        form.notas,
        }).eq('id', pagoActual.id)

      if (e) { setError(e.message); setSaving(false); return }

      setPagos(prev => prev.map(p => p.id === pagoActual.id ? {
        ...p, monto: Number(form.monto), fecha_pago: form.fecha_pago,
        numero_cuota: form.numero_cuota ? Number(form.numero_cuota) : null,
        metodo_pago: form.metodo_pago, notas: form.notas,
      } : p))

      await revalidar(['pagos-list', 'dashboard-data', 'reportes-data'])
    }

    setSaving(false)
    setModal(null)
    setForm(FORM_VACIO)
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar este pago? Esto revertirá el saldo del préstamo.')) return
    const { error: e } = await createClient().from('pagos').delete().eq('id', id)
    if (e) { alert('Error: ' + e.message); return }
    setPagos(prev => prev.filter(p => p.id !== id))
    await revalidar(['pagos-list', 'dashboard-data', 'reportes-data', 'cliente-detalle'])

  }

  // Agrupar pagos por préstamo
  const grupos = pagos.reduce((acc: Record<string, any>, p: any) => {
    const key = p.prestamo_id
    if (!acc[key]) {
      acc[key] = {
        prestamo_id:  p.prestamo_id,
        descripcion:  p.prestamos?.descripcion ?? 'Préstamo',
        cliente:      `${p.clientes?.nombre ?? ''} ${p.clientes?.apellido ?? ''}`.trim(),
        cliente_id:   p.cliente_id,
        pagos:        [],
        total:        0,
      }
    }
    acc[key].pagos.push(p)
    acc[key].total += Number(p.monto)
    return acc
  }, {})

  const gruposArray = Object.values(grupos).sort((a: any, b: any) =>
    new Date(b.pagos[0].created_at).getTime() - new Date(a.pagos[0].created_at).getTime()
  )

  const hoy = new Date().toISOString().split('T')[0]
  const totalHoy = pagos.filter(p => p.fecha_pago === hoy).reduce((s, p) => s + Number(p.monto), 0)
  const totalGeneral = pagos.reduce((s, p) => s + Number(p.monto), 0)

  const inputStyle = {
    width: '100%', padding: '0.625rem 0.875rem',
    background: 'var(--bg-3)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', color: 'var(--text)',
    fontSize: 14, fontFamily: 'var(--font-body)', outline: 'none',
  } as const

  return (
    <div style={{ animation: 'fadeUp 0.4s ease' }}>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 4 }}>Pagos</h1>
        <p style={{ color: 'var(--text-2)', fontSize: 14 }}>
          Hoy: <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{fmt(totalHoy)}</span>
          <span style={{ color: 'var(--text-3)', marginLeft: 6 }}>· {pagos.filter(p => p.fecha_pago === hoy).length} pagos</span>
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'Total cobrado', value: fmt(totalGeneral), color: 'var(--accent)' },
          { label: 'Hoy',          value: fmt(totalHoy),     color: 'var(--amber)' },
          { label: 'Préstamos',    value: String(gruposArray.length), color: 'var(--text)' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.875rem', boxShadow: 'var(--shadow-sm)', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: s.label === 'Préstamos' ? 24 : 15, color: s.color, fontWeight: 700 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Botón */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
        <button onClick={abrirNuevo} style={{ padding: '0.625rem 1.25rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-body)', boxShadow: '0 4px 12px var(--accent-dim)' }}>
          + Registrar pago
        </button>
      </div>

      {/* Grupos por préstamo */}
      {gruposArray.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-3)', background: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          Sin pagos registrados
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {gruposArray.map((grupo: any) => {
          const abierto = expandidos[grupo.prestamo_id] !== false // abierto por defecto
          const pagosOrdenados = [...grupo.pagos].sort((a: any, b: any) =>
            new Date(b.fecha_pago).getTime() - new Date(a.fecha_pago).getTime()
          )

          return (
            <div key={grupo.prestamo_id} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>

              {/* Header del grupo */}
              <button
                onClick={() => setExpandidos(prev => ({ ...prev, [grupo.prestamo_id]: !abierto }))}
                style={{ width: '100%', padding: '1rem 1.25rem', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', borderBottom: abierto ? '1px solid var(--border)' : 'none', transition: 'background 0.15s', fontFamily: 'var(--font-body)' }}
                onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-2)')}
                onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Avatar cliente */}
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, color: 'var(--accent)', flexShrink: 0 }}>
                  {grupo.cliente.charAt(0).toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 2 }}>{grupo.cliente}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{grupo.descripcion}</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: 'var(--accent)', fontWeight: 700 }}>{fmt(grupo.total)}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>{grupo.pagos.length} pago{grupo.pagos.length !== 1 ? 's' : ''}</div>
                  </div>
                  <svg width="16" height="16" fill="none" stroke="var(--text-3)" strokeWidth={2} viewBox="0 0 24 24" style={{ transform: abierto ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Pagos del grupo */}
              {abierto && (
                <div>
                  {pagosOrdenados.map((p: any, i: number) => (
                    <div key={p.id} style={{
                      padding: '0.875rem 1.25rem',
                      borderBottom: i < pagosOrdenados.length - 1 ? '1px solid var(--border)' : 'none',
                      display: 'flex', alignItems: 'center', gap: 12,
                      background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.01)',
                    }}>

                      {/* Número de cuota */}
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: p.numero_cuota ? 'var(--accent)' : 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: p.numero_cuota ? '#fff' : 'var(--text-3)', flexShrink: 0 }}>
                        {p.numero_cuota ?? '?'}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                            {new Date(p.fecha_pago).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'var(--bg-2)', color: 'var(--text-3)', fontWeight: 600 }}>
                            {p.metodo_pago}
                          </span>
                          {p.notas && (
                            <span style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>{p.notas}</span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, color: 'var(--accent)', fontWeight: 700 }}>
                          {fmt(p.monto)}
                        </span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => abrirEditar(p)} style={{ padding: '0.25rem 0.5rem', background: 'var(--accent-dim)', border: '1px solid rgba(0,107,50,0.2)', borderRadius: 'var(--radius-sm)', color: 'var(--accent)', cursor: 'pointer', fontSize: 10, fontFamily: 'var(--font-body)', fontWeight: 700 }}>✏</button>
                          <button onClick={() => eliminar(p.id)} style={{ padding: '0.25rem 0.5rem', background: 'rgba(186,26,26,0.08)', border: '1px solid rgba(186,26,26,0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--red)', cursor: 'pointer', fontSize: 10, fontFamily: 'var(--font-body)' }}>✕</button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Footer del grupo */}
                  <div style={{ padding: '0.75rem 1.25rem', background: 'var(--bg-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <a href={`/admin/clientes/${grupo.cliente_id}`} style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 700 }}>
                      Ver ficha del cliente →
                    </a>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Total cobrado:</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--accent)', fontWeight: 700 }}>{fmt(grupo.total)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal nuevo/editar */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem', animation: 'fadeIn 0.2s ease' }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '2rem', width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto', boxShadow: 'var(--shadow)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: '1.5rem' }}>
              {modal === 'nuevo' ? 'Registrar pago' : 'Editar pago'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

              {modal === 'nuevo' && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', marginBottom: 5 }}>Cliente *</label>
                  <select value={form.cliente_id} onChange={e => setForm(p => ({ ...p, cliente_id: e.target.value }))} style={inputStyle}>
                    <option value="">Seleccionar cliente...</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}
                  </select>
                </div>
              )}

              {modal === 'editar' && pagoActual && (
                <div style={{ padding: '0.75rem', background: 'var(--bg-3)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--text-2)' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text)' }}>{pagoActual.clientes?.nombre} {pagoActual.clientes?.apellido}</span>
                  <span style={{ color: 'var(--text-3)' }}> · {pagoActual.prestamos?.descripcion}</span>
                </div>
              )}

              {modal === 'nuevo' && form.cliente_id && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', marginBottom: 5 }}>Préstamo *</label>
                  <select value={form.prestamo_id} onChange={e => setForm(p => ({ ...p, prestamo_id: e.target.value }))} style={inputStyle}>
                    <option value="">Seleccionar préstamo...</option>
                    {prestamosCliente.map(p => (
                      <option key={p.id} value={p.id}>{p.descripcion} — cuota {fmt(p.monto_cuota)}</option>
                    ))}
                  </select>
                  {prestamosCliente.length === 0 && <div style={{ fontSize: 12, color: 'var(--amber)', marginTop: 4 }}>Sin préstamos activos</div>}
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
              <button onClick={() => setModal(null)} style={{ padding: '0.6rem 1.25rem', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 14 }}>Cancelar</button>
              <button onClick={guardar} disabled={saving} style={{ padding: '0.6rem 1.5rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Guardando...' : modal === 'nuevo' ? 'Registrar pago' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}