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
  dias_semana: number[] | null

}

const FRECUENCIAS = [
  { value: 'diario',         label: 'Diario',                 dias: 1 },
  { value: 'semanal',        label: 'Semanal',                dias: 7 },
  { value: 'quincenal',      label: 'Quincenal',              dias: 15 },
  { value: 'mensual',        label: 'Mensual',                dias: 30 },
  { value: 'dia_especifico', label: 'Día específico del mes', dias: 30 },
  { value: 'manual',         label: 'Ingreso manual',         dias: 0 },
]

function calcularVencimiento(fechaInicio: string, frecuencia: string, cuotas: number, diaEspecifico?: string): string {
  if (!fechaInicio || !cuotas || frecuencia === 'manual') return ''
  const fecha = new Date(fechaInicio)
  if (frecuencia === 'dia_especifico' && diaEspecifico) {
    fecha.setMonth(fecha.getMonth() + cuotas)
    fecha.setDate(Number(diaEspecifico))
    return fecha.toISOString().split('T')[0]
  }
  const frec = FRECUENCIAS.find(f => f.value === frecuencia)
  if (!frec || frec.dias === 0) return ''
  if (frecuencia === 'mensual') fecha.setMonth(fecha.getMonth() + cuotas)
  else fecha.setDate(fecha.getDate() + (frec.dias * cuotas))
  return fecha.toISOString().split('T')[0]
}

const FORM_VACIO = {
  cliente_id: '', descripcion: '', monto_total: '',
  cantidad_cuotas: '1', porcentaje_interes: '0',
  modo_cuota: 'automatico' as 'automatico' | 'manual',
  monto_cuota_manual: '',
  frecuencia_pago: 'mensual', dia_especifico: '',
  dias_semana: [1,2,3,4,5,6] as number[],
  fecha_inicio: new Date().toISOString().split('T')[0],
  fecha_vencimiento: '', notas: '',
}

export default function PrestamosClient({ prestamos: inicial }: { prestamos: Prestamo[] }) {
  const [prestamos, setPrestamos] = useState(inicial)
  const [modal, setModal] = useState<'nuevo' | 'editar' | null>(null)
  const [prestamoActual, setPrestamoActual] = useState<Prestamo | null>(null)
  const [clientes, setClientes] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filtro, setFiltro] = useState<'todos' | 'activo' | 'pagado'>('todos')
  const [form, setForm] = useState(FORM_VACIO)

  const montoBase = Number(form.monto_total) || 0
  const interes = Number(form.porcentaje_interes) || 0
  const montoConInteres = montoBase + (montoBase * interes / 100)
  const cuotas = Number(form.cantidad_cuotas) || 1

  const montoCuota = form.modo_cuota === 'manual'
    ? Number(form.monto_cuota_manual) || 0
    : (montoConInteres > 0 ? montoConInteres / cuotas : 0)

  const montoTotalFinal = form.modo_cuota === 'manual'
    ? montoCuota * cuotas
    : montoConInteres

  useEffect(() => {
    if (modal) {
      createClient().from('clientes').select('id, nombre, apellido').eq('activo', true).order('nombre')
        .then(({ data }) => setClientes(data ?? []))
    }
  }, [modal])

    // Auto-calcular vencimiento
  useEffect(() => {
    if (form.frecuencia_pago !== 'manual') {
      const venc = calcularVencimiento(form.fecha_inicio, form.frecuencia_pago, cuotas, form.dia_especifico)
      setForm(p => ({ ...p, fecha_vencimiento: venc }))
    }
  }, [form.fecha_inicio, form.frecuencia_pago, form.cantidad_cuotas, form.dia_especifico])

  function abrirNuevo() {
    setForm(FORM_VACIO)
    setPrestamoActual(null)
    setError('')
    setModal('nuevo')
  }

  function abrirEditar(p: Prestamo) {
    setPrestamoActual(p)
    setForm({
      cliente_id:         p.cliente_id,
      descripcion:        p.descripcion,
      monto_total:        String(p.monto_total),
      cantidad_cuotas:    String(p.cantidad_cuotas),
      porcentaje_interes: '0',
      modo_cuota:         'automatico',
      monto_cuota_manual: String(p.monto_cuota),
      frecuencia_pago:    'manual',
      dia_especifico:     '',
      dias_semana:        p.dias_semana ?? [1,2,3,4,5,6], // ← AGREGAR
      fecha_inicio:       p.fecha_inicio.split('T')[0],
      fecha_vencimiento:  p.fecha_vencimiento?.split('T')[0] ?? '',
      notas:              p.notas ?? '',
    })
    setError('')
    setModal('editar')
  }

  async function guardar() {
    if (!form.cliente_id || !form.descripcion) {
      setError('Cliente y descripción son obligatorios')
      return
    }
    if (form.modo_cuota === 'automatico' && !form.monto_total) {
      setError('El monto capital es obligatorio')
      return
    }
    if (form.modo_cuota === 'manual' && !form.monto_cuota_manual) {
      setError('El monto por cuota es obligatorio')
      return
    }
    setSaving(true)
    const supabase = createClient()

    if (modal === 'nuevo') {
      const notas_completas = [
        form.notas,
        `Frecuencia: ${FRECUENCIAS.find(f => f.value === form.frecuencia_pago)?.label}`,
        form.frecuencia_pago === 'diario' && form.dias_semana.length < 7
        ? `Días: ${form.dias_semana.map(d => ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][d]).join(', ')}`
        : '',
        interes > 0 ? `Interés: ${interes}%` : '',
        form.modo_cuota === 'manual' ? 'Cuota manual' : '',
      ].filter(Boolean).join(' | ')

      const { data, error: e } = await supabase
        .from('prestamos')
        .insert({
          cliente_id:        form.cliente_id,
          descripcion:       form.descripcion,
          monto_total:       montoTotalFinal,
          capital_original:  montoBase,
          cantidad_cuotas:   cuotas,
          monto_cuota:       montoCuota,
          fecha_inicio:      form.fecha_inicio,
          fecha_vencimiento: form.fecha_vencimiento || null,
          notas:             notas_completas,
          estado:            'activo',
          frecuencia_pago:   form.frecuencia_pago,
          dia_especifico:    form.frecuencia_pago === 'dia_especifico' ? Number(form.dia_especifico) || null : null,
          dias_semana: form.frecuencia_pago === 'diario' ? form.dias_semana : null,
        })
        .select('*, clientes(nombre, apellido, telefono)')
        .single()

      if (e) { setError(e.message); setSaving(false); return }

      setPrestamos(prev => [{
        id: data.id, cliente_id: data.cliente_id,
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
        dias_semana: data.dias_semana ?? null,  // ← AGREGAR
        created_at: data.created_at,
        updated_at: data.updated_at,
        clientes: data.clientes,
      }, ...prev])

    } else {
      // Editar
      const montoCuotaEdit = Number(form.monto_cuota_manual) || (Number(form.monto_total) / cuotas)

      const { error: e } = await supabase
        .from('prestamos')
        .update({
          descripcion:       form.descripcion,
          monto_total:       Number(form.monto_total),
          cantidad_cuotas:   cuotas,
          monto_cuota:       montoCuotaEdit,
          fecha_inicio:      form.fecha_inicio,
          fecha_vencimiento: form.fecha_vencimiento || null,
          notas:             form.notas,
          updated_at:        new Date().toISOString(),
        })
        .eq('id', prestamoActual!.id)

      if (e) { setError(e.message); setSaving(false); return }

      setPrestamos(prev => prev.map(p => p.id === prestamoActual!.id ? {
        ...p,
        descripcion:       form.descripcion,
        monto_total:       Number(form.monto_total),
        cantidad_cuotas:   cuotas,
        monto_cuota:       montoCuotaEdit,
        fecha_inicio:      form.fecha_inicio,
        fecha_vencimiento: form.fecha_vencimiento || null,
        notas:             form.notas,
      } : p))
    }

    await revalidar(['prestamos-list', 'dashboard-data', 'reportes-data', 'clientes-list'])
    setSaving(false)
    setModal(null)
    setForm(FORM_VACIO)
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar este préstamo? Se eliminarán también todos sus pagos.')) return
    const { error: e } = await createClient().from('prestamos').delete().eq('id', id)
    if (e) { alert('Error: ' + e.message); return }
    setPrestamos(prev => prev.filter(p => p.id !== id))
    await revalidar(['prestamos-list', 'dashboard-data', 'reportes-data', 'clientes-list'])
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

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 4 }}>Préstamos</h1>
        <p style={{ color: 'var(--text-2)', fontSize: 14 }}>{prestamos.length} préstamos en total</p>
      </div>

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

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4, flex: 1 }}>
          {([['todos', 'Todos'], ['activo', 'Activos'], ['pagado', 'Pagados']] as const).map(([v, l]) => (
            <button key={v} onClick={() => setFiltro(v)} style={{ padding: '0.625rem 1rem', borderRadius: 'var(--radius-sm)', border: `1px solid ${filtro === v ? 'var(--accent)' : 'var(--border)'}`, background: filtro === v ? 'var(--accent-dim)' : '#fff', color: filtro === v ? 'var(--accent)' : 'var(--text-2)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-body)', fontWeight: filtro === v ? 700 : 500 }}>{l}</button>
          ))}
        </div>
        <button onClick={abrirNuevo} style={{ padding: '0.625rem 1.25rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-body)', boxShadow: '0 4px 12px var(--accent-dim)', whiteSpace: 'nowrap' }}>
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
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 2 }}>{p.clientes.nombre} {p.clientes.apellido}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{p.descripcion}</div>
                  {p.fecha_vencimiento && (
                    <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 2 }}>
                      Vence: {new Date(p.fecha_vencimiento).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <span style={{ padding: '0.25rem 0.625rem', borderRadius: 20, fontSize: 10, fontWeight: 700, background: p.estado === 'pagado' ? 'var(--accent-dim)' : p.estado === 'activo' ? 'var(--accent-dim)' : 'rgba(186,26,26,0.08)', color: p.estado === 'pagado' ? 'var(--accent)' : p.estado === 'activo' ? 'var(--accent)' : 'var(--red)' }}>
                    {p.estado}
                  </span>
                  <button onClick={() => abrirEditar(p)} style={{ padding: '0.25rem 0.5rem', background: 'var(--accent-dim)', border: '1px solid rgba(0,107,50,0.2)', borderRadius: 'var(--radius-sm)', color: 'var(--accent)', cursor: 'pointer', fontSize: 10, fontFamily: 'var(--font-body)', fontWeight: 700 }}>✏</button>
                  <button onClick={() => eliminar(p.id)} style={{ padding: '0.25rem 0.5rem', background: 'rgba(186,26,26,0.08)', border: '1px solid rgba(186,26,26,0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--red)', cursor: 'pointer', fontSize: 10, fontFamily: 'var(--font-body)' }}>✕</button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: '0.75rem' }}>
                {[
                  { label: 'Cuota',     value: fmt(p.monto_cuota) },
                  { label: 'Pagado',    value: fmt(p.monto_pagado),  color: 'var(--accent)' },
                  { label: 'Pendiente', value: fmt(pendiente),        color: pendiente > 0 ? 'var(--red)' : 'var(--accent)' },
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
                {['Cliente', 'Descripción', 'Cuota', 'Pagado', 'Pendiente', 'Cuotas', 'Vencimiento', 'Estado', ''].map(h => (
                  <th key={h} style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 && <tr><td colSpan={9} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-3)' }}>Sin préstamos</td></tr>}
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
                    <td style={{ padding: '0.875rem 1rem', fontSize: 12, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                      {p.fecha_vencimiento
                        ? new Date(p.fecha_vencimiento).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span style={{ padding: '0.25rem 0.625rem', borderRadius: 20, fontSize: 11, fontWeight: 700, background: p.estado === 'pagado' ? 'var(--accent-dim)' : p.estado === 'activo' ? 'var(--accent-dim)' : 'rgba(186,26,26,0.08)', color: p.estado === 'pagado' ? 'var(--accent)' : p.estado === 'activo' ? 'var(--accent)' : 'var(--red)' }}>
                        {p.estado}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {p.estado === 'activo' && (
                          <a href={`/admin/pagos?prestamo=${p.id}&cliente=${p.cliente_id}`} style={{ padding: '0.3rem 0.75rem', background: 'var(--accent-dim)', border: '1px solid rgba(0,107,50,0.2)', borderRadius: 'var(--radius-sm)', color: 'var(--accent)', textDecoration: 'none', fontSize: 12, fontWeight: 700 }}>Pagar</a>
                        )}
                        <button onClick={() => abrirEditar(p)} style={{ padding: '0.3rem 0.625rem', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-2)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-body)', fontWeight: 600 }}>✏</button>
                        <button onClick={() => eliminar(p.id)} style={{ padding: '0.3rem 0.625rem', background: 'rgba(186,26,26,0.08)', border: '1px solid rgba(186,26,26,0.15)', borderRadius: 'var(--radius-sm)', color: 'var(--red)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-body)' }}>✕</button>
                      </div>
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

      {/* Modal nuevo/editar */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem', animation: 'fadeIn 0.2s ease' }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '2rem', width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto', boxShadow: 'var(--shadow)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: '1.5rem' }}>
              {modal === 'nuevo' ? 'Nuevo préstamo' : 'Editar préstamo'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

              {/* Cliente — solo en nuevo */}
              {modal === 'nuevo' ? (
                <div>
                  <label style={labelStyle}>Cliente *</label>
                  <select value={form.cliente_id} onChange={e => setForm(p => ({ ...p, cliente_id: e.target.value }))} style={inputStyle}>
                    <option value="">Seleccionar cliente...</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}
                  </select>
                </div>
              ) : (
                <div style={{ padding: '0.75rem', background: 'var(--bg-3)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--text-2)' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text)' }}>{prestamoActual?.clientes.nombre} {prestamoActual?.clientes.apellido}</span>
                </div>
              )}

              <div>
                <label style={labelStyle}>Descripción *</label>
                <input value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Ej: Préstamo para electrodoméstico" style={inputStyle} />
              </div>

              {/* En editar — campos simples */}
              {/* En editar — recálculo automático según cuotas pagadas */}
              {modal === 'editar' ? (() => {
                const cuotasPagadas   = prestamoActual?.cuotas_pagadas ?? 0
                const montoPagado     = prestamoActual?.monto_pagado   ?? 0
                const totalActual     = Number(form.monto_total)        || 0
                const cuotasTotales   = Number(form.cantidad_cuotas)    || 1
                const cuotasRestantes = Math.max(cuotasTotales - cuotasPagadas, 1)
                const saldoPendiente  = Math.max(totalActual - montoPagado, 0)
                const cuotaAuto       = saldoPendiente / cuotasRestantes

                return (
                  <>
                    {/* Resumen de estado actual */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, padding: '0.875rem', background: 'var(--bg-3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', textAlign: 'center' }}>
                      {[
                        { label: 'Ya pagadas', value: String(cuotasPagadas),   color: 'var(--accent)' },
                        { label: 'Restantes',  value: String(cuotasRestantes), color: 'var(--amber)' },
                        { label: 'Total',      value: String(cuotasTotales),   color: 'var(--text)' },
                      ].map(s => (
                        <div key={s.label}>
                          <div style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 3 }}>{s.label}</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: s.color, fontWeight: 700 }}>{s.value}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                      <div>
                        <label style={labelStyle}>Monto total del préstamo</label>
                        <input
                          type="number"
                          value={form.monto_total}
                          onChange={e => {
                            const nuevoTotal    = e.target.value
                            const nuevoSaldo    = Math.max(Number(nuevoTotal) - montoPagado, 0)
                            const nuevaCuota    = Math.round(nuevoSaldo / cuotasRestantes)
                            setForm(p => ({ ...p, monto_total: nuevoTotal, monto_cuota_manual: String(nuevaCuota) }))
                          }}
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Cantidad de cuotas totales</label>
                        <input
                          type="number"
                          min={Math.max(cuotasPagadas, 1)}
                          value={form.cantidad_cuotas}
                          onChange={e => {
                            const nuevasCuotas    = Math.max(Number(e.target.value), cuotasPagadas, 1)
                            const nuevasRestantes = Math.max(nuevasCuotas - cuotasPagadas, 1)
                            const nuevaCuota      = Math.round(saldoPendiente / nuevasRestantes)
                            setForm(p => ({ ...p, cantidad_cuotas: String(nuevasCuotas), monto_cuota_manual: String(nuevaCuota) }))
                          }}
                          style={inputStyle}
                        />
                        {cuotasPagadas > 0 && (
                          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>
                            Mínimo: {cuotasPagadas} (ya cobradas)
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Desglose de montos */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, padding: '0.875rem', background: 'var(--accent-dim)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(0,107,50,0.15)', textAlign: 'center' }}>
                      {[
                        { label: 'Ya cobrado',  value: fmt(montoPagado),    color: 'var(--text-2)' },
                        { label: 'Pendiente',   value: fmt(saldoPendiente), color: 'var(--red)'    },
                        { label: 'Cuota nueva', value: fmt(cuotaAuto),      color: 'var(--accent)' },
                      ].map(s => (
                        <div key={s.label}>
                          <div style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 3 }}>{s.label}</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: s.color, fontWeight: 700 }}>{s.value}</div>
                        </div>
                      ))}
                    </div>

                    <div>
                      <label style={labelStyle}>Monto por cuota (editable)</label>
                      <input
                        type="number"
                        value={form.monto_cuota_manual}
                        onChange={e => setForm(p => ({ ...p, monto_cuota_manual: e.target.value }))}
                        style={inputStyle}
                      />
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>
                        Calculado automáticamente · podés ajustarlo
                      </div>
                    </div>

                    <div>
                      <label style={labelStyle}>Estado</label>
                      <select value={prestamoActual?.estado ?? 'activo'} onChange={async e => {
                        const nuevoEstado = e.target.value
                        const { error: err } = await createClient().from('prestamos').update({ estado: nuevoEstado }).eq('id', prestamoActual!.id)
                        if (!err) {
                          setPrestamos(prev => prev.map(p => p.id === prestamoActual!.id ? { ...p, estado: nuevoEstado } : p))
                          setPrestamoActual(prev => prev ? { ...prev, estado: nuevoEstado } : prev)
                        }
                      }} style={inputStyle}>
                        <option value="activo">Activo</option>
                        <option value="pagado">Pagado</option>
                        <option value="vencido">Vencido</option>
                      </select>
                    </div>
                  </>
                )
              })() : (
                <>
                  {/* Modo cuota — solo en nuevo */}
                  <div style={{ display: 'flex', gap: 4, padding: '4px', background: 'var(--bg-3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    {[
                      { value: 'automatico', label: '📊 Calcular automático' },
                      { value: 'manual',     label: '✏️ Cuota manual' },
                    ].map(m => (
                      <button key={m.value} type="button" onClick={() => setForm(p => ({ ...p, modo_cuota: m.value as any }))}
                        style={{ flex: 1, padding: '0.5rem', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-body)', background: form.modo_cuota === m.value ? 'var(--accent)' : 'transparent', color: form.modo_cuota === m.value ? '#fff' : 'var(--text-2)', transition: 'all 0.15s' }}
                      >{m.label}</button>
                    ))}
                  </div>

                  {form.modo_cuota === 'automatico' ? (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                        <div>
                          <label style={labelStyle}>Monto capital *</label>
                          <input type="number" value={form.monto_total} onChange={e => setForm(p => ({ ...p, monto_total: e.target.value }))} placeholder="0" style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Interés (%)</label>
                          <div style={{ position: 'relative' }}>
                            <input type="number" min="0" max="200" step="0.5" value={form.porcentaje_interes} onChange={e => setForm(p => ({ ...p, porcentaje_interes: e.target.value }))} placeholder="0" style={{ ...inputStyle, paddingRight: '2rem' }} />
                            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', fontSize: 13 }}>%</span>
                          </div>
                        </div>
                      </div>
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
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>{fmt(montoConInteres)}</div>
                          </div>
                        </div>
                      )}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                        <div>
                          <label style={labelStyle}>Cantidad de cuotas</label>
                          <input type="number" min="1" value={form.cantidad_cuotas} onChange={e => setForm(p => ({ ...p, cantidad_cuotas: e.target.value }))} style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Valor por cuota</label>
                          <div style={{ padding: '0.625rem 0.875rem', background: 'var(--bg-4)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', fontSize: 14, color: montoCuota > 0 ? 'var(--accent)' : 'var(--text-3)' }}>
                            {montoCuota > 0 ? fmt(montoCuota) : '—'}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                        <div>
                          <label style={labelStyle}>Monto por cuota *</label>
                          <input type="number" value={form.monto_cuota_manual} onChange={e => setForm(p => ({ ...p, monto_cuota_manual: e.target.value }))} placeholder="0" style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Cantidad de cuotas</label>
                          <input type="number" min="1" value={form.cantidad_cuotas} onChange={e => setForm(p => ({ ...p, cantidad_cuotas: e.target.value }))} style={inputStyle} />
                        </div>
                      </div>
                      {montoCuota > 0 && (
                        <div style={{ padding: '0.875rem', background: 'var(--accent-dim)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(0,107,50,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 600 }}>Total a cobrar:</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: 'var(--accent)', fontWeight: 700 }}>{fmt(montoTotalFinal)}</span>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {/* Frecuencia — solo en nuevo */}
              {modal === 'nuevo' && (
                <>
                  <div>
                    <label style={labelStyle}>Frecuencia de pago</label>
                    <select value={form.frecuencia_pago} onChange={e => setForm(p => ({ ...p, frecuencia_pago: e.target.value, dia_especifico: '' }))} style={inputStyle}>
                      {FRECUENCIAS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>
                  {form.frecuencia_pago === 'diario' && (
                    <div>
                      <label style={labelStyle}>Días de cobro</label>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {[
                          { value: 1, label: 'Lun' },
                          { value: 2, label: 'Mar' },
                          { value: 3, label: 'Mié' },
                          { value: 4, label: 'Jue' },
                          { value: 5, label: 'Vie' },
                          { value: 6, label: 'Sáb' },
                          { value: 0, label: 'Dom' },
                        ].map(d => {
                          const activo = form.dias_semana.includes(d.value)
                          return (
                            <button
                              key={d.value}
                              type="button"
                              onClick={() => setForm(p => ({
                                ...p,
                                dias_semana: activo
                                  ? p.dias_semana.filter(x => x !== d.value)
                                  : [...p.dias_semana, d.value],
                              }))}
                              style={{
                                padding: '0.4rem 0.75rem',
                                borderRadius: 'var(--radius-sm)',
                                border: `1px solid ${activo ? 'var(--accent)' : 'var(--border)'}`,
                                background: activo ? 'var(--accent)' : 'var(--bg-3)',
                                color: activo ? '#fff' : 'var(--text-2)',
                                cursor: 'pointer', fontSize: 12, fontWeight: 700,
                                fontFamily: 'var(--font-body)',
                              }}
                            >{d.label}</button>
                          )
                        })}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                        {form.dias_semana.length} días por semana seleccionados
                      </div>
                    </div>
                  )}

                  {form.frecuencia_pago === 'dia_especifico' && (
                    <div>
                      <label style={labelStyle}>Día del mes (1-31) *</label>
                      <input type="number" min="1" max="31" value={form.dia_especifico} onChange={e => setForm(p => ({ ...p, dia_especifico: e.target.value }))} placeholder="Ej: 15" style={inputStyle} />
                    </div>
                  )}
                </>
              )}
              {/* Fechas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                <div>
                  <label style={labelStyle}>Fecha inicio</label>
                  <input type="date" value={form.fecha_inicio} onChange={e => setForm(p => ({ ...p, fecha_inicio: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Vencimiento</label>
                  <input type="date" value={form.fecha_vencimiento} onChange={e => setForm(p => ({ ...p, fecha_vencimiento: e.target.value }))} style={inputStyle} />
                  {form.frecuencia_pago !== 'manual' && form.fecha_vencimiento && (
                    <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 3 }}>
                      Calculado automáticamente · podés editarlo
                    </div>
                  )}
                </div>

              </div>

              <div>
                <label style={labelStyle}>Notas</label>
                <textarea value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
            </div>

            {error && <div style={{ marginTop: 12, padding: '0.5rem 0.875rem', background: 'var(--red-dim)', borderRadius: 'var(--radius-sm)', color: 'var(--red)', fontSize: 13 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 8, marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(null)} style={{ padding: '0.6rem 1.25rem', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 14 }}>Cancelar</button>
              <button onClick={guardar} disabled={saving} style={{ padding: '0.6rem 1.5rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Guardando...' : modal === 'nuevo' ? 'Crear préstamo' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}