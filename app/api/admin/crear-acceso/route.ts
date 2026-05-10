import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
  if (perfil?.rol !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { clienteId, dni, password, nombre } = await request.json()

  if (!dni || !password) return NextResponse.json({ error: 'DNI y contraseña son obligatorios' }, { status: 400 })

  // Generar email ficticio con el DNI
  const emailFicticio = `${dni.trim()}@leocash.com`

  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: newUser, error: authError } = await adminSupabase.auth.admin.createUser({
    email: emailFicticio,
    password,
    email_confirm: true,
    user_metadata: { nombre, rol: 'cliente' },
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

  const { error: updateError } = await adminSupabase
    .from('clientes')
    .update({ user_id: newUser.user.id })
    .eq('id', clienteId)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 })

  await adminSupabase.from('perfiles').upsert({
    id:     newUser.user.id,
    nombre,
    email:  emailFicticio,
    rol:    'cliente',
  })

  return NextResponse.json({ userId: newUser.user.id })
}