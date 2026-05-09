import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import AdminSidebar from './AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (perfil?.rol !== 'admin') redirect('/cliente')

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <AdminSidebar perfil={perfil} />
      <main style={{
        flex: 1,
        marginLeft: 0,
        minHeight: '100vh',
        background: 'var(--bg)',
        overflow: 'auto',
      }}>
        <div style={{ padding: '1.5rem', maxWidth: 1200, margin: '0 auto' }}>
          {children}
        </div>
      </main>
    </div>
  )
}
