'use client'

import { useState } from 'react'

const ESTADO_CONFIG = {
  vip:         { label: 'VIP',           color: 'var(--accent)',  bg: 'var(--accent-dim)',           accion: 'Aumento de crédito 30%-50%' },
  cumplidor:   { label: 'Cumplidor',     color: '#0ea5e9',        bg: 'rgba(14,165,233,0.1)',         accion: 'Renovación mismo monto' },
  observacion: { label: 'En Observación',color: 'var(--amber)',   bg: 'var(--amber-dim)',             accion: 'Mantener monto sin aumento' },
  moroso:      { label: 'Moroso',        color: 'var(--red)',     bg: 'var(--red-dim)',               accion: 'Denegado' },
  bloqueado:   { label: 'Bloqueado',     color: '#7c3aed',        bg: 'rgba(124,58,237,0.1)',         accion: 'Bloqueado — Sin crédito' },
}

export default function PuntosConfigClient({ config: inicial, puntajes }: { config: any; puntajes: any[] }) {
  const [config, setConfig] = useState(inicial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function guardarConfig() {
    setSaving(true)
    setError('')
    const res = await fetch('/api/admin/config-puntos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error); setSaving(false); return }
    setConfig(json)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const inputStyle = {
    width: '100%', padding: '0.625rem 0.875rem',
    background: 'var(--bg-3)', border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-sm)', color: 'var(--text)',
    fontSize: 15, fontFamily: 'var(--font-mono)', outline: 'none',
    fontWeight: 700, textAlign: 'center' as const,
  }

  return (
    <div style={{ animation: 'fadeUp 0.4s ease' }}>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 4 }}>
          Sistema de Puntos
        </h1>
        <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Configurá los puntos y revisá el estado de cada cliente</p>
      </div>

      <div className="puntos-grid">

        {/* Configuración */}
        <div>
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: '1.25rem' }}>⚙️ Configuración de puntos</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* Puntos base */}
              <div style={{ padding: '0.875rem', background: 'var(--bg-2)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>Puntos base</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Puntaje inicial de cada cliente</div>
                </div>
                <input type="number" value={config?.puntos_base ?? 100} onChange={e => setConfig((p: any) => ({ ...p, puntos_base: Number(e.target.value) }))} style={{ ...inputStyle, width: 80 }} />
              </div>

              {/* Positivos */}
              <div style={{ borderRadius: 'var(--radius-sm)', border: '1px solid rgba(0,107,50,0.15)', overflow: 'hidden' }}>
                <div style={{ padding: '0.625rem 0.875rem', background: 'var(--accent-dim)', fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Puntos positivos
                </div>
                {[
                  { key: 'pago_puntual',    label: 'Pago puntual',    desc: 'Pagó en fecha o antes', sign: '+' },
                  { key: 'pago_adelantado', label: 'Pago adelantado', desc: 'Pagó antes del vencimiento', sign: '+' },
                ].map(item => (
                  <div key={item.key} style={{ padding: '0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', borderTop: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{item.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{item.desc}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 16, color: 'var(--accent)', fontWeight: 700 }}>{item.sign}</span>
                      <input type="number" value={config?.[item.key] ?? 0} onChange={e => setConfig((p: any) => ({ ...p, [item.key]: Number(e.target.value) }))} style={{ ...inputStyle, width: 72, color: 'var(--accent)' }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Negativos */}
              <div style={{ borderRadius: 'var(--radius-sm)', border: '1px solid rgba(186,26,26,0.15)', overflow: 'hidden' }}>
                <div style={{ padding: '0.625rem 0.875rem', background: 'var(--red-dim)', fontSize: 11, fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Puntos negativos (mora)
                </div>
                {[
                  { key: 'mora_1_3',    label: 'Mora 1-3 días',  desc: 'Atraso leve' },
                  { key: 'mora_4_10',   label: 'Mora 4-10 días', desc: 'Atraso moderado' },
                  { key: 'mora_mas_10', label: 'Mora +10 días',  desc: 'Bloqueo automático' },
                ].map(item => (
                  <div key={item.key} style={{ padding: '0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', borderTop: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{item.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{item.desc}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 16, color: 'var(--red)', fontWeight: 700 }}>-</span>
                      <input type="number" value={Math.abs(config?.[item.key] ?? 0)} onChange={e => setConfig((p: any) => ({ ...p, [item.key]: -Math.abs(Number(e.target.value)) }))} style={{ ...inputStyle, width: 72, color: 'var(--red)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {error && <div style={{ marginTop: 12, padding: '0.5rem 0.875rem', background: 'var(--red-dim)', borderRadius: 'var(--radius-sm)', color: 'var(--red)', fontSize: 13 }}>{error}</div>}
            {saved && <div style={{ marginTop: 12, padding: '0.5rem 0.875rem', background: 'var(--accent-dim)', borderRadius: 'var(--radius-sm)', color: 'var(--accent)', fontSize: 13 }}>✓ Configuración guardada</div>}

            <button onClick={guardarConfig} disabled={saving} style={{ width: '100%', marginTop: '1.25rem', padding: '0.875rem', background: saving ? 'var(--bg-3)' : 'var(--accent)', color: saving ? 'var(--text-3)' : '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-body)', boxShadow: saving ? 'none' : '0 4px 16px var(--accent-dim)' }}>
              {saving ? 'Guardando...' : 'Guardar configuración'}
            </button>
          </div>

          {/* Tabla de estados */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: '1rem' }}>📊 Tabla de estados</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { rango: '150+ puntos',    estado: 'vip',         accion: 'Aumento de crédito 30%-50%' },
                { rango: '110-149 puntos', estado: 'cumplidor',   accion: 'Renovación mismo monto' },
                { rango: '80-109 puntos',  estado: 'observacion', accion: 'Sin aumento hasta mejorar' },
                { rango: 'Menos de 80',    estado: 'moroso',      accion: 'Denegado' },
                { rango: 'Mora +10 días',  estado: 'bloqueado',   accion: 'Sin crédito' },
              ].map(row => {
                const cfg = ESTADO_CONFIG[row.estado as keyof typeof ESTADO_CONFIG]
                return (
                  <div key={row.estado} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.75rem', background: 'var(--bg-2)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ padding: '0.25rem 0.75rem', borderRadius: 20, fontSize: 11, fontWeight: 700, background: cfg.bg, color: cfg.color, flexShrink: 0, minWidth: 90, textAlign: 'center' }}>
                      {cfg.label}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{row.rango}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{row.accion}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Puntajes de clientes */}
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: '1rem' }}>🏆 Puntaje por cliente</h2>

          {puntajes.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-3)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⭐</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Sin puntajes registrados</div>
              <div style={{ fontSize: 12 }}>Los puntajes se generan al registrar pagos</div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {puntajes.map((p: any) => {
              const cfg = ESTADO_CONFIG[p.estado as keyof typeof ESTADO_CONFIG] ?? ESTADO_CONFIG.cumplidor
              const pct = Math.min(100, Math.round((p.puntos_actual / 200) * 100))
              return (
                <div key={p.id} style={{ padding: '1rem', background: 'var(--bg-2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, color: cfg.color, flexShrink: 0 }}>
                        {p.clientes?.nombre?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{p.clientes?.nombre} {p.clientes?.apellido}</div>
                        <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, color: cfg.color, fontWeight: 700, lineHeight: 1 }}>{p.puntos_actual}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>puntos</div>
                    </div>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-3)', borderRadius: 3, overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: cfg.color, borderRadius: 3, transition: 'width 0.5s ease' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--text-3)' }}>
                    <span>Base: {p.puntos_base}</span>
                    <span style={{ color: cfg.color, fontWeight: 700 }}>{cfg.accion}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <style>{`
        .puntos-grid {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        @media (min-width: 900px) {
          .puntos-grid {
            display: grid;
            grid-template-columns: 420px 1fr;
            gap: 1.5rem;
            align-items: start;
          }
        }
      `}</style>
    </div>
  )
}