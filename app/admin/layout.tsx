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
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <AdminSidebar perfil={perfil} />

      {/* Wrapper que empuja el contenido */}
      <div style={{ marginLeft: 0, paddingTop: 56 }} className="admin-wrapper">
        <main style={{ padding: '1.5rem', paddingBottom: 90 }}>
          {children}
        </main>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .admin-wrapper {
            margin-left: 240px !important;
            padding-top: 0 !important;
          }
          .admin-wrapper main {
            padding-bottom: 1.5rem !important;
          }
        }
      `}</style>
    </div>
  )
}