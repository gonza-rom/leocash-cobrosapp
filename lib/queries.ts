import { unstable_cache } from 'next/cache'
import { prisma } from './prisma'

export const getDashboardData = unstable_cache(
  async () => {
    const [totalClientes, prestamosData, ultimosPagos] = await Promise.all([
      prisma.cliente.count({ where: { activo: true } }),
      prisma.prestamo.findMany({
        select: {
          montoTotal: true,
          montoPagado: true,
          estado: true,
          clienteId: true,
          cliente: { select: { nombre: true, apellido: true } },
        },
      }),
      prisma.pago.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          cliente: { select: { nombre: true, apellido: true } },
          prestamo: { select: { descripcion: true } },
        },
      }),
    ])
    return { totalClientes, prestamosData, ultimosPagos }
  },
  ['dashboard-data'],
  { revalidate: 60 }
)

export const getClientes = unstable_cache(
  async () => {
    return prisma.cliente.findMany({
      where: { activo: true },
      orderBy: { createdAt: 'desc' },
      include: {
        prestamos: {
          select: { montoTotal: true, montoPagado: true, estado: true },
        },
      },
    })
  },
  ['clientes-list'],
  { revalidate: 30 }
)