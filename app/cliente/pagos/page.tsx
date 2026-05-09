import { createClient } from '@/lib/supabase-server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

export default async function ClientePagosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const cliente = await prisma.cliente.findFirst({ where: { userId: user.id } })
  if (!cliente) redirect('/auth/login')

  const pagos = await prisma.pago.findMany({
    where: { clienteId: cliente.id },
    orderBy: { fechaPago: 'desc' },
    include: { prestamo: { select: { descripcion: true, cantidadCuotas: true } } },
  })

  const total = pagos.reduce((s, p) => s + Number(p.monto), 0)

  return (
    <div style={{ animation: 'fadeUp 0.4s ease' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, letterSpacing: '-0.02em', marginBottom: 4 }}>Historial de Pagos</h1>
          <p style={{ color: 'var(--text-2)', fontSize: 14 }}>{pagos.length} pagos registrados</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total abonado</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, color: 'var(--green)' }}>{fmt(total)}</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {pagos.length === 0 && <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-3)' }}>Sin pagos registrados</div>}
        {pagos.map(p => (
          <div key={p.id} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--green-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>✓</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{p.prestamo.descripcion}</div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: 2 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{new Date(p.fechaPago).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  {p.numeroCuota && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Cuota {p.numeroCuota}</span>}
                  <span style={{ fontSize: 11, color: 'var(--text-3)', padding: '0 6px', background: 'var(--bg-3)', borderRadius: 10 }}>{p.metodoPago}</span>
                </div>
              </div>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: 'var(--green)', fontWeight: 600, flexShrink: 0 }}>{fmt(Number(p.monto))}</span>
          </div>
        ))}
      </div>
    </div>
  )
}