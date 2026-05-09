import { prisma } from '@/lib/prisma'
import PrestamosClient from './PrestamosClient'

export default async function PrestamosPage() {
  const prestamos = await prisma.prestamo.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      cliente: { select: { nombre: true, apellido: true, telefono: true } },
    },
  })

  const data = prestamos.map(p => ({
    id: p.id,
    cliente_id: p.clienteId,
    descripcion: p.descripcion,
    monto_total: Number(p.montoTotal),
    monto_pagado: Number(p.montoPagado),
    monto_cuota: Number(p.montoCuota),
    cantidad_cuotas: p.cantidadCuotas,
    cuotas_pagadas: p.cuotasPagadas,
    fecha_inicio: p.fechaInicio.toISOString(),
    fecha_vencimiento: p.fechaVencimiento?.toISOString() ?? null,
    estado: p.estado,
    notas: p.notas ?? '',
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
    clientes: {
      nombre: p.cliente.nombre,
      apellido: p.cliente.apellido,
      telefono: p.cliente.telefono ?? '',
    },
  }))

  return <PrestamosClient prestamos={data} />
}