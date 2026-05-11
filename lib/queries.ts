import { unstable_cache } from 'next/cache'
import { prisma } from './prisma'

export const getDashboardData = unstable_cache(
  async () => {
    const [totalClientes, prestamosData, ultimosPagos] = await Promise.all([
      prisma.cliente.count({ where: { activo: true } }),
      prisma.prestamo.findMany({
        select: {
          montoTotal:      true,
          montoPagado:     true,
          capitalOriginal: true,
          estado:          true,
          clienteId:       true,
          cliente: { select: { nombre: true, apellido: true } },
        },
      }),
      prisma.pago.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          cliente:  { select: { nombre: true, apellido: true } },
          prestamo: { select: { descripcion: true } },
        },
      }),
    ])

    return {
      totalClientes,
      prestamosData: prestamosData.map(p => ({
        montoTotal:      Number(p.montoTotal),
        montoPagado:     Number(p.montoPagado),
        capitalOriginal: Number(p.capitalOriginal ?? p.montoTotal),
        estado:          p.estado,
        clienteId:       p.clienteId,
        cliente:         p.cliente,
      })),
      ultimosPagos: ultimosPagos.map(p => ({
        id:        p.id,
        monto:     Number(p.monto),
        fechaPago: p.fechaPago.toISOString(),
        cliente:   p.cliente,
        prestamo:  p.prestamo,
      })),
    }
  },
  ['dashboard-data'],
  { revalidate: 60, tags: ['dashboard-data'] }
)

export const getClientes = unstable_cache(
  async () => {
    const clientes = await prisma.cliente.findMany({
      where: { activo: true },
      orderBy: { createdAt: 'desc' },
      include: {
        prestamos: {
          select: { montoTotal: true, montoPagado: true, estado: true },
        },
      },
    })

    return clientes.map(c => ({
      id:         c.id,
      userId:     c.userId,
      nombre:     c.nombre,
      apellido:   c.apellido,
      telefono:   c.telefono,
      email:      c.email,
      dni:        c.dni,
      direccion:  c.direccion,
      notas:      c.notas,
      fotoDniUrl: c.fotoDniUrl,
      activo:     c.activo,
      createdAt:  c.createdAt.toISOString(),
      updatedAt:  c.updatedAt.toISOString(),
      prestamos:  c.prestamos.map(p => ({
        montoTotal:  Number(p.montoTotal),
        montoPagado: Number(p.montoPagado),
        estado:      p.estado,
      })),
    }))
  },
  ['clientes-list'],
  { revalidate: 30, tags: ['clientes-list'] }
)

export const getPrestamos = unstable_cache(
  async () => {
    const prestamos = await prisma.prestamo.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        cliente: { select: { nombre: true, apellido: true, telefono: true } },
      },
    })

    return prestamos.map(p => ({
      id:               p.id,
      clienteId:        p.clienteId,
      descripcion:      p.descripcion,
      montoTotal:       Number(p.montoTotal),
      montoPagado:      Number(p.montoPagado),
      montoCuota:       Number(p.montoCuota),
      cantidadCuotas:   p.cantidadCuotas,
      cuotasPagadas:    p.cuotasPagadas,
      fechaInicio:      p.fechaInicio.toISOString(),
      fechaVencimiento: p.fechaVencimiento?.toISOString() ?? null,
      estado:           p.estado,
      notas:            p.notas ?? '',
      diasSemana:       p.diasSemana ?? null,
      createdAt:        p.createdAt.toISOString(),
      updatedAt:        p.updatedAt.toISOString(),
      cliente: {
        nombre:   p.cliente.nombre,
        apellido: p.cliente.apellido,
        telefono: p.cliente.telefono ?? '',
      },
    }))
  },
  ['prestamos-list'],
  { revalidate: 30, tags: ['prestamos-list'] }
)

export const getPagos = unstable_cache(
  async () => {
    const pagos = await prisma.pago.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        cliente:  { select: { nombre: true, apellido: true } },
        prestamo: { select: { descripcion: true, montoCuota: true } },
      },
    })

    return pagos.map(p => ({
      id:          p.id,
      prestamoId:  p.prestamoId,
      clienteId:   p.clienteId,
      monto:       Number(p.monto),
      fechaPago:   p.fechaPago.toISOString().split('T')[0],
      numeroCuota: p.numeroCuota,
      metodoPago:  p.metodoPago,
      notas:       p.notas,
      createdAt:   p.createdAt.toISOString(),
      cliente:     { nombre: p.cliente.nombre, apellido: p.cliente.apellido },
      prestamo:    { descripcion: p.prestamo.descripcion, montoCuota: Number(p.prestamo.montoCuota) },
    }))
  },
  ['pagos-list'],
  { revalidate: 20, tags: ['pagos-list'] }
)

export const getReportesData = unstable_cache(
  async () => {
    const [prestamos, pagos, totalClientes] = await Promise.all([
      prisma.prestamo.findMany({
        include: { cliente: { select: { id: true, nombre: true, apellido: true } } },
      }),
      prisma.pago.findMany({
        orderBy: { fechaPago: 'desc' },
        include: { cliente: { select: { nombre: true, apellido: true } } },
      }),
      prisma.cliente.count({ where: { activo: true } }),
    ])

    return {
      totalClientes,
      prestamos: prestamos.map(p => ({
        id:          p.id,
        clienteId:   p.clienteId,
        montoTotal:  Number(p.montoTotal),
        montoPagado: Number(p.montoPagado),
        estado:      p.estado,
        cliente:     p.cliente,
      })),
      pagos: pagos.map(p => ({
        id:        p.id,
        monto:     Number(p.monto),
        fechaPago: p.fechaPago.toISOString(),
        cliente:   p.cliente,
      })),
    }
  },
  ['reportes-data'],
  { revalidate: 300, tags: ['reportes-data'] }
)

export const getClienteDetalle = unstable_cache(
  async (id: string) => {
    const [cliente, prestamos, pagos] = await Promise.all([
      prisma.cliente.findUnique({ where: { id } }),
      prisma.prestamo.findMany({ where: { clienteId: id }, orderBy: { createdAt: 'desc' } }),
      prisma.pago.findMany({
        where: { clienteId: id },
        orderBy: { fechaPago: 'desc' },
        include: { prestamo: { select: { descripcion: true } } },
      }),
    ])

    if (!cliente) return { cliente: null, prestamos: [], pagos: [] }

    return {
      cliente: {
        id:         cliente.id,
        userId:     cliente.userId,
        nombre:     cliente.nombre,
        apellido:   cliente.apellido,
        telefono:   cliente.telefono,
        email:      cliente.email,
        dni:        cliente.dni,
        direccion:  cliente.direccion,
        notas:      cliente.notas,
        fotoDniUrl: cliente.fotoDniUrl,
        activo:     cliente.activo,
        createdAt:  cliente.createdAt.toISOString(),
        updatedAt:  cliente.updatedAt.toISOString(),
      },
      prestamos: prestamos.map(p => ({
        id:               p.id,
        clienteId:        p.clienteId,
        descripcion:      p.descripcion,
        montoTotal:       Number(p.montoTotal),
        montoPagado:      Number(p.montoPagado),
        montoCuota:       Number(p.montoCuota),
        cantidadCuotas:   p.cantidadCuotas,
        cuotasPagadas:    p.cuotasPagadas,
        fechaInicio:      p.fechaInicio.toISOString(),
        fechaVencimiento: p.fechaVencimiento?.toISOString() ?? null,
        estado:           p.estado,
        notas:            p.notas,
        createdAt:        p.createdAt.toISOString(),
        updatedAt:        p.updatedAt.toISOString(),
      })),
      pagos: pagos.map(p => ({
        id:          p.id,
        monto:       Number(p.monto),
        fechaPago:   p.fechaPago.toISOString(),
        numeroCuota: p.numeroCuota,
        metodoPago:  p.metodoPago,
        prestamo:    p.prestamo,
        createdAt:   p.createdAt.toISOString(),
      })),
    }
  },
  ['cliente-detalle'],
  { revalidate: 30, tags: ['cliente-detalle'] }
)