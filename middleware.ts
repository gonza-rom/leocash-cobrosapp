import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  if (path.startsWith('/auth')) return supabaseResponse

  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Obtener rol una sola vez
  const { data: perfil, error } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  console.log('USER ID:', user.id)
  console.log('PERFIL:', perfil)
  console.log('ERROR:', error)

  const rol = perfil?.rol ?? 'cliente'

  // Redirigir raíz según rol
  if (path === '/') {
    return NextResponse.redirect(new URL(rol === 'admin' ? '/admin' : '/cliente', request.url))
  }

  // Proteger rutas admin
  if (path.startsWith('/admin') && rol !== 'admin') {
    return NextResponse.redirect(new URL('/cliente', request.url))
  }

  // Proteger rutas cliente
  if (path.startsWith('/cliente') && rol !== 'cliente') {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}