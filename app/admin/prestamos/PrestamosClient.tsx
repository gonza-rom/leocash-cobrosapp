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

const FRECUENCIAS = [
  { value: 'diario',     label: 'Diario' },
  { value: 'semanal',    label: 'Semanal' },
  { value: 'quincenal',  label: 'Quincenal' },
  { value: 'mensual',    label: 'Mensual' },
  { value: 'dia_especifico', label: 'Día específico del mes' },
  { value: 'manual',     label: 'Ingreso manual' },
]

export default function PrestamosClient({ prestamos: inicial }: { prestamos: Prestamo[] }) {
  const [prestamos, setPrestamos] = useState(inicial)
  const [modal, setModal] = useState(false)
  const [clientes, setClientes] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filtro, setFiltro] = useState<'todos' | 'activo' | 'pagado'>('todos')
  const [form, setForm] = useState({
    cliente_id: '', descripcion: '', monto_total: '',
    cantidad_cuotas: '1', porcentaje_interes: '0',
    frecuencia_pago: 'mensual', dia_especifico: '',
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_vencimiento: '', notas: '',
  })

  // Calcular monto con interés
  const montoBase = Number(form.monto_total) || 0
  const interes = Number(form.porcentaje_interes) || 0
  const montoConInteres = montoBase + (montoBase * interes / 100)
  const montoCuota = form.cantidad_cuotas && montoConInteres
    ? montoConInteres / Number(form.cantidad_cuotas)
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
    if (form.frecuencia_pago === 'dia_especifico' && !form.dia_especifico) {
      setError('Ingresá el día del mes para el cobro')
      return
    }
    setSaving(true)
    const supabase = createClient()

    const notas_completas = [
      form.notas,
      `Frecuencia: ${FRECUENCIAS.find(f => f.value === form.frecuencia_pago)?.label}`,
      form.frecuencia_pago === 'dia_especifico' ? `Día de cobro: ${form.dia_especifico}` : '',
      interes > 0 ? `Interés: ${interes}%` : '',
    ].filter(Boolean).join(' | ')

    const { data, error: e } = await supabase
      .from('prestamos')
      .insert({
        cliente_id: form.cliente_id,
        descripcion: form.descripcion,
        monto_total: montoConInteres,
        cantidad_cuotas: Number(form.cantidad_cuotas),
        monto_cuota: montoCuota,
        fecha_inicio: form.fecha_inicio,
        fecha_vencimiento: form.fecha_vencimiento || null,
        notas: notas_completas,
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
    setForm({ cliente_id: '', descripcion: '', monto_total: '', cantidad_cuotas: '1', porcentaje_interes: '0', frecuencia_pago: 'mensual', dia_especifico: '', fecha_inicio: new Date().toISOString().split('T')[0], fecha_vencimiento: '', notas: '' })
  }

  const filtrados = prestamos.filter(p => filtro === 'todos' || p.estado === filtro)

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
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 4 }}>Préstamos</h1>
        <p style={{ color: 'var(--text-2)', fontSize: 14 }}>{prestamos.length} préstamos en total</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'Activos',  value: String(prestamos.filter(p => p.estado === 'activo').length),  color: 'var(--accent)' },
          { label: 'Pagados',  value: String(prestamos.filter(p => p.estado === 'pagado').length),  color: 'var(--text-2)' },
          { label: 'Vencidos', value: String(prestamos.filter(p => p.estado === 'vencido').length), color: 'var(--red)' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.875rem', boxShadow: 'var(--shadow-sm)', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, color: s.color, fontWeight: 700 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Barra acciones */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4, flex: 1 }}>
          {([['todos', 'Todos'], ['activo', 'Activos'], ['pagado', 'Pagados']] as const).map(([v, l]) => (
            <button key={v} onClick={() => setFiltro(v)} style={{ padding: '0.625rem 1rem', borderRadius: 'var(--radius-sm)', border: `1px solid ${filtro === v ? 'var(--accent)' : 'var(--border)'}`, background: filtro === v ? 'var(--accent-dim)' : '#fff', color: filtro === v ? 'var(--accent)' : 'var(--text-2)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-body)', fontWeight: filtro === v ? 700 : 500 }}>{l}</button>
          ))}
        </div>
        <button onClick={() => { setModal(true); setError('') }} style={{ padding: '0.625rem 1.25rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-body)', boxShadow: '0 4px 12px var(--accent-dim)', whiteSpace: 'nowrap' }}>
          + Nuevo
        </button>
      </div>

      {/* Cards mobile */}
      <div className="prestamos-cards">
        {filtrados.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-3)', background: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>Sin préstamos</div>
        )}
        {filtrados.map(p => {
          const pendiente = p.monto_total - p.monto_pagado
          const pct = p.monto_total > 0 ? Math.round((p.monto_pagado / p.monto_total) * 100) : 0
          return (
            <div key={p.id} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1rem', boxShadow: 'var(--shadow-sm)', borderLeft: `4px solid ${p.estado === 'pagado' ? 'var(--accent)' : p.estado === 'activo' ? 'var(--accent)' : 'var(--red)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 2 }}>{p.clientes.nombre} {p.clientes.apellido}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{p.descripcion}</div>
                </div>
                <span style={{ padding: '0.25rem 0.625rem', borderRadius: 20, fontSize: 10, fontWeight: 700, background: p.estado === 'pagado' ? 'var(--accent-dim)' : p.estado === 'activo' ? 'var(--accent-dim)' : 'rgba(186,26,26,0.08)', color: p.estado === 'pagado' ? 'var(--accent)' : p.estado === 'activo' ? 'var(--accent)' : 'var(--red)' }}>
                  {p.estado}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: '0.75rem' }}>
                {[
                  { label: 'Cuota', value: fmt(p.monto_cuota) },
                  { label: 'Pagado', value: fmt(p.monto_pagado), color: 'var(--accent)' },
                  { label: 'Pendiente', value: fmt(pendiente), color: pendiente > 0 ? 'var(--red)' : 'var(--accent)' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'var(--bg-2)', borderRadius: 'var(--radius-sm)', padding: '0.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 3 }}>{s.label}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: s.color ?? 'var(--text)', fontWeight: 700 }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ height: 6, background: 'var(--bg-3)', borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', borderRadius: 3 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)', marginBottom: '0.75rem' }}>
                <span>{p.cuotas_pagadas}/{p.cantidad_cuotas} cuotas</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 700 }}>{pct}%</span>
              </div>
              {p.estado === 'activo' && (
                <a href={`/admin/pagos?prestamo=${p.id}&cliente=${p.cliente_id}`} style={{ display: 'block', textAlign: 'center', padding: '0.5rem', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-sm)', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>
                  Registrar pago
                </a>
              )}
            </div>
          )
        })}
      </div>

      {/* Tabla PC */}
      <div className="prestamos-tabla" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-2)' }}>
                {['Cliente', 'Descripción', 'Cuota', 'Pagado', 'Pendiente', 'Cuotas', 'Estado', ''].map(h => (
                  <th key={h} style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 && <tr><td colSpan={8} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-3)' }}>Sin préstamos</td></tr>}
              {filtrados.map(p => {
                const pendiente = p.monto_total - p.monto_pagado
                const pct = p.monto_total > 0 ? Math.round((p.monto_pagado / p.monto_total) * 100) : 0
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-2)')}
                    onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{p.clientes.nombre} {p.clientes.apellido}</div>
                      {p.clientes.telefono && <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{p.clientes.telefono}</div>}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontSize: 13, color: 'var(--text-2)' }}>
                      <div>{p.descripcion}</div>
                      {p.notas && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{p.notas}</div>}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-2)' }}>{fmt(p.monto_cuota)}</td>
                    <td style={{ padding: '0.875rem 1rem', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)', fontWeight: 700 }}>{fmt(p.monto_pagado)}</td>
                    <td style={{ padding: '0.875rem 1rem', fontFamily: 'var(--font-mono)', fontSize: 13, color: pendiente > 0 ? 'var(--red)' : 'var(--accent)', fontWeight: 700 }}>{fmt(pendiente)}</td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>{p.cuotas_pagadas}/{p.cantidad_cuotas}</div>
                      <div style={{ height: 4, background: 'var(--bg-3)', borderRadius: 2, width: 60 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', borderRadius: 2 }} />
                      </div>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span style={{ padding: '0.25rem 0.625rem', borderRadius: 20, fontSize: 11, fontWeight: 700, background: p.estado === 'pagado' ? 'var(--accent-dim)' : p.estado === 'activo' ? 'var(--accent-dim)' : 'rgba(186,26,26,0.08)', color: p.estado === 'pagado' ? 'var(--accent)' : p.estado === 'activo' ? 'var(--accent)' : 'var(--red)' }}>
                        {p.estado}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      {p.estado === 'activo' && (
                        <a href={`/admin/pagos?prestamo=${p.id}&cliente=${p.cliente_id}`} style={{ padding: '0.3rem 0.75rem', background: 'var(--accent-dim)', border: '1px solid rgba(0,107,50,0.2)', borderRadius: 'var(--radius-sm)', color: 'var(--accent)', textDecoration: 'none', fontSize: 12, fontWeight: 700 }}>Pagar</a>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .prestamos-cards { display: flex; flex-direction: column; gap: 0.875rem; }
        .prestamos-tabla { display: none; }
        @media (min-width: 900px) {
          .prestamos-cards { display: none; }
          .prestamos-tabla { display: block; }
        }
      `}</style>

      {/* Modal nuevo préstamo */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem', animation: 'fadeIn 0.2s ease' }}
          onClick={e => { if (e.target === e.currentTarget) setModal(false) }}>
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '2rem', width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto', boxShadow: 'var(--shadow)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: '1.5rem' }}>Nuevo préstamo</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

              {/* Cliente */}
              <div>
                <label style={labelStyle}>Cliente *</label>
                <select value={form.cliente_id} onChange={e => setForm(p => ({ ...p, cliente_id: e.target.value }))} style={inputStyle}>
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}
                </select>
              </div>

              {/* Descripción */}
              <div>
                <label style={labelStyle}>Descripción *</label>
                <input value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Ej: Préstamo para electrodoméstico" style={inputStyle} />
              </div>

              {/* Monto + Interés */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                <div>
                  <label style={labelStyle}>Monto capital *</label>
                  <input type="number" value={form.monto_total} onChange={e => setForm(p => ({ ...p, monto_total: e.target.value }))} placeholder="0" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Interés (%)</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number" min="0" max="100" step="0.5"
                      value={form.porcentaje_interes}
                      onChange={e => setForm(p => ({ ...p, porcentaje_interes: e.target.value }))}
                      placeholder="0"
                      style={{ ...inputStyle, paddingRight: '2rem' }}
                    />
                    <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', fontSize: 13 }}>%</span>
                  </div>
                </div>
              </div>

              {/* Preview monto con interés */}
              {montoBase > 0 && (
                <div style={{ padding: '0.875rem', background: 'var(--bg-3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Capital</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text)' }}>{fmt(montoBase)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Interés</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--amber)' }}>+{fmt(montoBase * interes / 100)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Total</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent-light)', fontWeight: 600 }}>{fmt(montoConInteres)}</div>
                  </div>
                </div>
              )}

              {/* Cuotas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                <div>
                  <label style={labelStyle}>Cantidad de cuotas</label>
                  <input type="number" min="1" value={form.cantidad_cuotas} onChange={e => setForm(p => ({ ...p, cantidad_cuotas: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Valor por cuota</label>
                  <div style={{ padding: '0.625rem 0.875rem', background: 'var(--bg-4)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', fontSize: 14, color: montoCuota > 0 ? 'var(--accent-light)' : 'var(--text-3)' }}>
                    {montoCuota > 0 ? fmt(montoCuota) : '—'}
                  </div>
                </div>
              </div>

              {/* Frecuencia de pago */}
              <div>
                <label style={labelStyle}>Frecuencia de pago</label>
                <select value={form.frecuencia_pago} onChange={e => setForm(p => ({ ...p, frecuencia_pago: e.target.value, dia_especifico: '' }))} style={inputStyle}>
                  {FRECUENCIAS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>

              {/* Día específico */}
              {form.frecuencia_pago === 'dia_especifico' && (
                <div>
                  <label style={labelStyle}>Día del mes para el cobro (1-31) *</label>
                  <input
                    type="number" min="1" max="31"
                    value={form.dia_especifico}
                    onChange={e => setForm(p => ({ ...p, dia_especifico: e.target.value }))}
                    placeholder="Ej: 15"
                    style={inputStyle}
                  />
                </div>
              )}

              {/* Fechas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                <div>
                  <label style={labelStyle}>Fecha inicio</label>
                  <input type="date" value={form.fecha_inicio} onChange={e => setForm(p => ({ ...p, fecha_inicio: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Vencimiento (opcional)</label>
                  <input type="date" value={form.fecha_vencimiento} onChange={e => setForm(p => ({ ...p, fecha_vencimiento: e.target.value }))} style={inputStyle} />
                </div>
              </div>

              {/* Notas */}
              <div>
                <label style={labelStyle}>Notas</label>
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