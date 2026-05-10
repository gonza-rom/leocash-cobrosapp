'use client'

import { useState } from 'react'

const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

const ESTADO_CONFIG = {
  vencido:     { label: 'Vencido',       color: 'var(--red)',    bg: 'rgba(186,26,26,0.08)',  border: 'rgba(186,26,26,0.2)' },
  hoy:         { label: 'Cobrar hoy',    color: 'var(--accent)', bg: 'var(--accent-dim)',      border: 'rgba(0,107,50,0.2)' },
  manana:      { label: 'Mañana',        color: 'var(--amber)',  bg: 'var(--amber-dim)',        border: 'rgba(245,158,11,0.2)' },
  esta_semana: { label: 'Esta semana',   color: '#0ea5e9',       bg: 'rgba(14,165,233,0.08)',  border: 'rgba(14,165,233,0.2)' },
  este_mes:    { label: 'Este mes',      color: '#8b5cf6',       bg: 'rgba(139,92,246,0.08)',  border: 'rgba(139,92,246,0.2)' },
  futuro:      { label: 'Futuro',        color: 'var(--text-2)', bg: 'var(--bg-2)',            border: 'var(--border)' },
  sin_fecha:   { label: 'Sin fecha',     color: 'var(--text-3)', bg: 'var(--bg-3)',            border: 'var(--border)' },
}

type EstadoCobranza = keyof typeof ESTADO_CONFIG

interface Prestamo {
  id: string
  clienteId: string
  clienteNombre: string
  clienteTelefono: string
  descripcion: string
  montoCuota: number
  montoTotal: number
  montoPagado: number
  cuotasPagadas: number
  cantidadCuotas: number
  fechaVencimiento: string | null
  diasRestantes: number | null
  estadoCobranza: EstadoCobranza
  notas: string
}

export default function CobranzasClient({ data }: { data: Prestamo[] }) {
  const [filtro, setFiltro] = useState<EstadoCobranza | 'todos'>('todos')
  const [busqueda, setBusqueda] = useState('')

  const vencidos   = data.filter(p => p.estadoCobranza === 'vencido')
  const hoy        = data.filter(p => p.estadoCobranza === 'hoy')
  const manana     = data.filter(p => p.estadoCobranza === 'manana')
  const estaSemana = data.filter(p => p.estadoCobranza === 'esta_semana')
  const esteMes    = data.filter(p => p.estadoCobranza === 'este_mes')

  const totalHoy     = hoy.reduce((s, p) => s + p.montoCuota, 0)
  const totalVencido = vencidos.reduce((s, p) => s + (p.montoTotal - p.montoPagado), 0)
  const totalSemana  = estaSemana.reduce((s, p) => s + p.montoCuota, 0)
  const totalMes     = esteMes.reduce((s, p) => s + p.montoCuota, 0)

  const filtrados = data.filter(p => {
    const matchFiltro   = filtro === 'todos' || p.estadoCobranza === filtro
    const matchBusqueda = !busqueda || p.clienteNombre.toLowerCase().includes(busqueda.toLowerCase())
    return matchFiltro && matchBusqueda
  })

  function mensajeWsp(p: Prestamo) {
    if (p.estadoCobranza === 'vencido') {
      return encodeURIComponent(`Hola ${p.clienteNombre.split(' ')[0]}, te informamos que tenés un pago vencido de ${fmt(p.montoTotal - p.montoPagado)}. Por favor comunicate a la brevedad. - Leo Cash`)
    }
    return encodeURIComponent(`Hola ${p.clienteNombre.split(' ')[0]}! 👋 Te recordamos que tu cuota de ${fmt(p.montoCuota)} vence${p.estadoCobranza === 'hoy' ? ' hoy' : p.estadoCobranza === 'manana' ? ' mañana' : ' pronto'}. Por favor coordinar el pago. ¡Gracias! - Leo Cash`)
  }

  return (
    <div style={{ animation: 'fadeUp 0.4s ease' }}>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 4 }}>
          Cobranzas
        </h1>
        <p style={{ color: 'var(--text-2)', fontSize: 14 }}>
          {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* KPIs — 2x2 mobile, 4 columnas PC */}
      <div className="cobranzas-kpi-grid" style={{ marginBottom: '1.25rem' }}>

        {/* Cobrar hoy */}
        <div style={{ background: 'var(--accent)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', boxShadow: '0 4px 20px var(--accent-dim)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 6 }}>Cobrar hoy</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, color: '#fff', fontWeight: 700, lineHeight: 1, marginBottom: 4 }}>{fmt(totalHoy)}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{hoy.length} clientes</div>
          </div>
        </div>

        {/* Vencidos */}
        <div style={{ background: 'rgba(186,26,26,0.06)', border: '1.5px solid rgba(186,26,26,0.15)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
          <div style={{ fontSize: 10, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 6 }}>Vencidos</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, color: 'var(--red)', fontWeight: 700, lineHeight: 1, marginBottom: 4 }}>{fmt(totalVencido)}</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{vencidos.length} préstamos</div>
        </div>

        {/* Esta semana */}
        <div style={{ background: 'rgba(14,165,233,0.06)', border: '1.5px solid rgba(14,165,233,0.15)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
          <div style={{ fontSize: 10, color: '#0ea5e9', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 6 }}>Esta semana</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, color: '#0ea5e9', fontWeight: 700, lineHeight: 1, marginBottom: 4 }}>{fmt(totalSemana)}</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{estaSemana.length} clientes</div>
        </div>

        {/* Este mes */}
        <div style={{ background: 'rgba(139,92,246,0.06)', border: '1.5px solid rgba(139,92,246,0.15)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
          <div style={{ fontSize: 10, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 6 }}>Este mes</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, color: '#8b5cf6', fontWeight: 700, lineHeight: 1, marginBottom: 4 }}>{fmt(totalMes)}</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{esteMes.length} clientes</div>
        </div>
      </div>

      {/* Filtros + búsqueda */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar cliente..."
          style={{ flex: 1, minWidth: 160, padding: '0.625rem 1rem', background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none' }}
          onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-dim)' }}
          onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
        />
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {([
            ['todos',       `Todos (${data.length})`],
            ['vencido',     `Vencidos (${vencidos.length})`],
            ['hoy',         `Hoy (${hoy.length})`],
            ['manana',      `Mañana (${manana.length})`],
            ['esta_semana', `Semana (${estaSemana.length})`],
            ['este_mes',    `Mes (${esteMes.length})`],
          ] as const).map(([v, l]) => (
            <button key={v} onClick={() => setFiltro(v)} style={{
              padding: '0.5rem 0.875rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              fontSize: 12, fontFamily: 'var(--font-body)', fontWeight: filtro === v ? 700 : 500,
              border: `1px solid ${filtro === v ? 'var(--accent)' : 'var(--border)'}`,
              background: filtro === v ? 'var(--accent-dim)' : '#fff',
              color: filtro === v ? 'var(--accent)' : 'var(--text-2)',
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {filtrados.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', background: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', color: 'var(--text-3)' }}>
          Sin cobros en este período
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filtrados.map(p => {
          const cfg = ESTADO_CONFIG[p.estadoCobranza]
          const pendiente = p.montoTotal - p.montoPagado
          const pct = p.montoTotal > 0 ? Math.round((p.montoPagado / p.montoTotal) * 100) : 0
          const telefono = p.clienteTelefono.replace(/\D/g, '')

          return (
            <div key={p.id} style={{
              background: '#fff', borderRadius: 'var(--radius-lg)',
              border: `1px solid var(--border)`,
              borderLeft: `4px solid ${cfg.color}`,
              padding: '1rem', boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: '0.875rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{p.clienteNombre}</span>
                    <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                      {cfg.label}
                      {p.diasRestantes !== null && p.diasRestantes < 0 && ` · ${Math.abs(p.diasRestantes)}d atraso`}
                      {p.diasRestantes !== null && p.diasRestantes > 1 && ` · en ${p.diasRestantes}d`}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 2 }}>{p.descripcion}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {p.clienteTelefono && (
                      <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{p.clienteTelefono}</span>
                    )}
                    {p.fechaVencimiento && (
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                        Vence: {new Date(p.fechaVencimiento).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, color: cfg.color, fontWeight: 700 }}>{fmt(p.montoCuota)}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>cuota</div>
                  {pendiente !== p.montoCuota && (
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                      {fmt(pendiente)} total
                    </div>
                  )}
                </div>
              </div>

              {/* Progreso */}
              <div style={{ marginBottom: '0.875rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)', marginBottom: 5 }}>
                  <span>{p.cuotasPagadas}/{p.cantidadCuotas} cuotas pagadas</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 700 }}>{pct}%</span>
                </div>
                <div style={{ height: 5, background: 'var(--bg-3)', borderRadius: 3, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: cfg.color, borderRadius: 3 }} />
                </div>
              </div>

              {/* Acciones */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <a
                  href={`/admin/pagos?prestamo=${p.id}&cliente=${p.clienteId}`}
                  style={{ flex: 1, minWidth: 120, padding: '0.5rem', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-sm)', textDecoration: 'none', fontSize: 12, fontWeight: 700, textAlign: 'center' }}
                >
                  ✓ Registrar pago
                </a>

                {telefono && (
                  <>
                    <a
                      href={`https://wa.me/${telefono}?text=${mensajeWsp(p)}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ padding: '0.5rem 0.875rem', background: '#25d366', color: '#fff', borderRadius: 'var(--radius-sm)', textDecoration: 'none', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}
                    >
                      <svg width="13" height="13" fill="white" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      WhatsApp
                    </a>

                    <a
                      href={`tel:${telefono}`}
                      style={{ padding: '0.5rem 0.875rem', background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text-2)', borderRadius: 'var(--radius-sm)', textDecoration: 'none', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}
                    >
                      <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      Llamar
                    </a>
                  </>
                )}

                <a
                  href={`/admin/clientes/${p.clienteId}`}
                  style={{ padding: '0.5rem 0.875rem', background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text-2)', borderRadius: 'var(--radius-sm)', textDecoration: 'none', fontSize: 12, fontWeight: 600 }}
                >
                  Ver ficha
                </a>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ textAlign: 'center', paddingTop: '1.5rem' }}>
        <p style={{ fontSize: 11, color: 'var(--text-3)' }}>
          Desarrollado por <a href="https://www.devhub.com.ar/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>DevHub</a>
        </p>
      </div>

      <style>{`
        .cobranzas-kpi-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }
        @media (min-width: 900px) {
          .cobranzas-kpi-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
      `}</style>
    </div>
  )
}