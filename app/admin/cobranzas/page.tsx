import { prisma } from '@/lib/prisma'
import CobranzasClient from './CobranzasClient'

function calcularProximaCuota(
  fechaInicio: Date,
  cuotasPagadas: number,
  frecuenciaPago: string,
  diaEspecifico: number | null,
  diasSemana: number[] | null,   // ← AGREGAR ESTE PARÁMETRO
  notas: string | null
): Date {
  const base = new Date(fechaInicio)
  base.setHours(0, 0, 0, 0)
  const n = cuotasPagadas + 1

  let frecuencia = frecuenciaPago

  if (!frecuencia || frecuencia === 'mensual') {
    if (notas?.includes('Diario'))          frecuencia = 'diario'
    else if (notas?.includes('Semanal'))    frecuencia = 'semanal'
    else if (notas?.includes('Quincenal'))  frecuencia = 'quincenal'
    else if (notas?.includes('específico')) frecuencia = 'dia_especifico'
  }

  if (frecuencia === 'diario') {
    const diasValidos = diasSemana && diasSemana.length > 0 ? diasSemana : [0,1,2,3,4,5,6]
    let cuotasContadas = 0
    const fecha = new Date(base)
    fecha.setDate(fecha.getDate() + 1)
    while (cuotasContadas < n) {
      if (diasValidos.includes(fecha.getDay())) cuotasContadas++
      if (cuotasContadas < n) fecha.setDate(fecha.getDate() + 1)
    }
    return fecha
  }

  let dia = diaEspecifico
  if (!dia && notas) {
    const match = notas.match(/Día de cobro: (\d+)/)
    if (match) dia = Number(match[1])
  }

  if (frecuencia === 'dia_especifico' && dia) {
    const fecha = new Date(base)
    fecha.setMonth(fecha.getMonth() + n)
    fecha.setDate(dia)
    return fecha
  }

  if (frecuencia === 'mensual') {
    const fecha = new Date(base)
    fecha.setMonth(fecha.getMonth() + n)
    return fecha
  }

  const diasPorFrecuencia: Record<string, number> = {
    semanal:   7,
    quincenal: 15,
  }
  const dias = diasPorFrecuencia[frecuencia] ?? 30
  const fecha = new Date(base)
  fecha.setDate(fecha.getDate() + dias * n)
  return fecha
}

export default async function CobranzasPage() {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
  finMes.setHours(23, 59, 59, 999)

  const prestamos = await prisma.prestamo.findMany({
    where: { estado: 'activo' },
    include: { cliente: { select: { id: true, nombre: true, apellido: true, telefono: true } } },
    orderBy: { fechaVencimiento: 'asc' },
  })

  const data = prestamos.map(p => {
    const esFrecuenciaManual = p.frecuenciaPago === 'manual' && !p.notas?.includes('Frecuencia:')

    let fechaReferencia: Date
    let diasRestantes: number

    if (esFrecuenciaManual) {
      fechaReferencia = p.fechaVencimiento ? new Date(p.fechaVencimiento) : new Date()
      diasRestantes = p.fechaVencimiento
        ? Math.floor((fechaReferencia.getTime() - hoy.getTime()) / 86400000)
        : 999
    } else {
      fechaReferencia = calcularProximaCuota(
        p.fechaInicio,
        p.cuotasPagadas,
        p.frecuenciaPago,
        p.diaEspecifico,
        p.diasSemana,   // ← AGREGAR ESTE ARGUMENTO
        p.notas
      )
      diasRestantes = Math.floor(
        (fechaReferencia.getTime() - hoy.getTime()) / 86400000
      )
    }

    let estado: 'vencido' | 'hoy' | 'manana' | 'esta_semana' | 'este_mes' | 'futuro' | 'sin_fecha' = 'sin_fecha'

    if      (diasRestantes < 0)         estado = 'vencido'
    else if (diasRestantes === 0)       estado = 'hoy'
    else if (diasRestantes === 1)       estado = 'manana'
    else if (diasRestantes <= 7)        estado = 'esta_semana'
    else if (fechaReferencia <= finMes) estado = 'este_mes'
    else                                estado = 'futuro'

    return {
      id:               p.id,
      clienteId:        p.clienteId,
      clienteNombre:    `${p.cliente.nombre} ${p.cliente.apellido}`,
      clienteTelefono:  p.cliente.telefono ?? '',
      descripcion:      p.descripcion,
      montoCuota:       Number(p.montoCuota),
      montoTotal:       Number(p.montoTotal),
      montoPagado:      Number(p.montoPagado),
      cuotasPagadas:    p.cuotasPagadas,
      cantidadCuotas:   p.cantidadCuotas,
      fechaVencimiento: fechaReferencia.toISOString(),
      diasRestantes,
      estadoCobranza:   estado,
      notas:            p.notas ?? '',
    }
  })

  return <CobranzasClient data={data} />
}