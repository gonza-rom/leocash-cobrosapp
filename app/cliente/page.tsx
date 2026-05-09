import { createClient } from '@/lib/supabase-server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import ClienteDashboardClient from './ClienteDashboardClient'

const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

export default async function ClienteDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const cliente = await prisma.cliente.findFirst({ where: { userId: user.id } })
  if (!cliente) redirect('/auth/login')

  const prestamos = await prisma.prestamo.findMany({
    where: { clienteId: cliente.id },
    orderBy: { createdAt: 'desc' },
  })

  const pagos = await prisma.pago.findMany({
    where: { clienteId: cliente.id },
    orderBy: { fechaPago: 'desc' },
    take: 5,
    include: { prestamo: { select: { descripcion: true } } },
  })

  // Puntaje del cliente
  const { data: puntaje } = await supabase
    .from('puntajes')
    .select('puntos_actual, estado')
    .eq('cliente_id', cliente.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  const activos       = prestamos.filter(p => p.estado === 'activo')
  const deudaTotal    = activos.reduce((s, p) => s + (Number(p.montoTotal) - Number(p.montoPagado)), 0)
  const totalPrestado = prestamos.reduce((s, p) => s + Number(p.montoTotal), 0)
  const totalPagado   = prestamos.reduce((s, p) => s + Number(p.montoPagado), 0)
  const pct           = totalPrestado > 0 ? Math.round((totalPagado / totalPrestado) * 100) : 0
  const cuotasTotales = activos.reduce((s, p) => s + p.cantidadCuotas, 0)
  const cuotasPagadas = activos.reduce((s, p) => s + p.cuotasPagadas, 0)

  const conVencimiento = activos
    .filter(p => p.fechaVencimiento)
    .sort((a, b) => new Date(a.fechaVencimiento!).getTime() - new Date(b.fechaVencimiento!).getTime())
  const proximo = conVencimiento[0]

  const data = {
    cliente: { nombre: cliente.nombre, apellido: cliente.apellido },
    deudaTotal,
    totalPrestado,
    totalPagado,
    pct,
    cuotasTotales,
    cuotasPagadas,
    proximoVencimiento: proximo?.fechaVencimiento?.toISOString() ?? null,
    proximoDescripcion: proximo?.descripcion ?? null,
    pagos: pagos.map(p => ({
      id: p.id,
      monto: Number(p.monto),
      fechaPago: p.fechaPago.toISOString(),
      descripcion: p.prestamo.descripcion,
    })),
    prestamosActivos: activos.length,
    puntaje: puntaje ?? null,
  }

  return <ClienteDashboardClient data={data} />
}