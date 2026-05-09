import { prisma } from '@/lib/prisma'
import PagosClient from './PagosClient'

export default async function PagosPage() {
  const pagos = await prisma.pago.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      cliente:  { select: { nombre: true, apellido: true } },
      prestamo: { select: { descripcion: true, montoCuota: true } },
    },
  })

  const data = pagos.map(p => ({
    id: p.id,
    prestamo_id: p.prestamoId,
    cliente_id: p.clienteId,
    monto: Number(p.monto),
    fecha_pago: p.fechaPago.toISOString().split('T')[0],
    numero_cuota: p.numeroCuota,
    metodo_pago: p.metodoPago,
    notas: p.notas,
    created_at: p.createdAt.toISOString(),
    clientes:  { nombre: p.cliente.nombre, apellido: p.cliente.apellido },
    prestamos: { descripcion: p.prestamo.descripcion, monto_cuota: Number(p.prestamo.montoCuota) },
  }))

  return <PagosClient pagos={data} />
}