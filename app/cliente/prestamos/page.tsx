import { createClient } from '@/lib/supabase-server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

export default async function ClientePrestamosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const cliente = await prisma.cliente.findFirst({ where: { userId: user.id } })
  if (!cliente) redirect('/auth/login')

  const prestamos = await prisma.prestamo.findMany({
    where: { clienteId: cliente.id },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div style={{ animation: 'fadeUp 0.4s ease' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, letterSpacing: '-0.02em', marginBottom: '1.5rem' }}>Mis Préstamos</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {prestamos.length === 0 && <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-3)' }}>Sin préstamos registrados</div>}
        {prestamos.map(p => {
          const pendiente = Number(p.montoTotal) - Number(p.montoPagado)
          const pct = Math.round((Number(p.montoPagado) / Number(p.montoTotal)) * 100)
          return (
            <div key={p.id} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem', borderLeft: `3px solid ${p.estado === 'pagado' ? 'var(--green)' : 'var(--accent)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.875rem', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 2 }}>{p.descripcion}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Desde {new Date(p.fechaInicio).toLocaleDateString('es-AR')}</div>
                </div>
                <span style={{ padding: '0.25rem 0.75rem', borderRadius: 20, fontSize: 12, fontWeight: 600, background: p.estado === 'pagado' ? 'var(--green-dim)' : 'var(--accent-dim)', color: p.estado === 'pagado' ? 'var(--green)' : 'var(--accent-light)' }}>{p.estado}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                {[
                  { label: 'Monto total', value: fmt(Number(p.montoTotal)) },
                  { label: 'Pagado',      value: fmt(Number(p.montoPagado)), color: 'var(--green)' },
                  { label: 'Pendiente',   value: fmt(pendiente), color: pendiente > 0 ? 'var(--red)' : 'var(--green)' },
                  { label: 'Cuota',       value: `${fmt(Number(p.montoCuota))} × ${p.cantidadCuotas}` },
                ].map(item => (
                  <div key={item.label}>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{item.label}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: item.color ?? 'var(--text)' }}>{item.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: 'var(--text-2)' }}>
                <span>Cuotas: {p.cuotasPagadas} de {p.cantidadCuotas} pagadas</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{pct}%</span>
              </div>
              <div style={{ height: 6, background: 'var(--bg-4)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: p.estado === 'pagado' ? 'var(--green)' : 'var(--accent)', borderRadius: 3 }} />
              </div>
              <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                {Array.from({ length: p.cantidadCuotas }, (_, i) => (
                  <div key={i} style={{ width: 20, height: 20, borderRadius: 5, background: i < p.cuotasPagadas ? 'var(--green)' : 'var(--bg-4)', border: `1px solid ${i < p.cuotasPagadas ? 'transparent' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: i < p.cuotasPagadas ? '#fff' : 'var(--text-3)' }}>
                    {i + 1}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}