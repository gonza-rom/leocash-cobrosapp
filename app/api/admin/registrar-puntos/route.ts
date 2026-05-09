import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
  if (perfil?.rol !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { clienteId, prestamoId, pagoId, tipo, diasMora } = await request.json()

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Obtener configuración
  const { data: config } = await admin.from('config_puntos').select('*').single()
  if (!config) return NextResponse.json({ error: 'Sin configuración de puntos' }, { status: 400 })

  // Calcular puntos según tipo
  let puntos = 0
  let descripcion = ''

  if (tipo === 'pago_puntual') {
    puntos = config.pago_puntual
    descripcion = `Pago puntual (+${puntos} puntos)`
  } else if (tipo === 'pago_adelantado') {
    puntos = config.pago_adelantado
    descripcion = `Pago adelantado (+${puntos} puntos)`
  } else if (tipo === 'mora_1_3') {
    puntos = config.mora_1_3
    descripcion = `Mora 1-3 días (${puntos} puntos)`
  } else if (tipo === 'mora_4_10') {
    puntos = config.mora_4_10
    descripcion = `Mora 4-10 días (${puntos} puntos)`
  } else if (tipo === 'mora_mas_10') {
    puntos = config.mora_mas_10
    descripcion = `Mora +10 días (${puntos} puntos) — Bloqueado`
  }

  // Obtener o crear puntaje actual
  const { data: puntajeExistente } = await admin
    .from('puntajes')
    .select('*')
    .eq('cliente_id', clienteId)
    .eq('prestamo_id', prestamoId)
    .single()

  let puntosActual = puntajeExistente?.puntos_actual ?? config.puntos_base
  puntosActual = Math.max(0, puntosActual + puntos)

  // Calcular estado
  const estado =
    tipo === 'mora_mas_10' ? 'bloqueado' :
    puntosActual >= 150 ? 'vip' :
    puntosActual >= 110 ? 'cumplidor' :
    puntosActual >= 80  ? 'observacion' : 'moroso'

  // Upsert puntaje
  await admin.from('puntajes').upsert({
    cliente_id:    clienteId,
    prestamo_id:   prestamoId,
    puntos_actual: puntosActual,
    puntos_base:   config.puntos_base,
    estado,
    updated_at:    new Date().toISOString(),
  }, { onConflict: 'cliente_id,prestamo_id' })

  // Insertar historial
  await admin.from('historial_puntos').insert({
    cliente_id:  clienteId,
    prestamo_id: prestamoId,
    pago_id:     pagoId ?? null,
    tipo,
    puntos,
    descripcion,
  })

  return NextResponse.json({ ok: true, puntosActual, estado, descripcion })
}