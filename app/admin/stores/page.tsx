import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Nav } from '@/components/Nav'
import { Footer } from '@/components/Footer'
import { StoresAdmin } from '@/components/StoresAdmin'

export const dynamic = 'force-dynamic'

// Admin-only brand directory management — list, search, add, edit,
// soft-delete. The page itself is a thin server wrapper that handles
// the auth redirect; all interactivity lives in StoresAdmin (client).
export default async function StoresAdminPage() {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  const adminEmail = process.env.ADMIN_EMAIL
  if (!user || !adminEmail || user.email !== adminEmail) {
    redirect('/')
  }

  return (
    <>
      <Nav />
      <section
        style={{
          padding: 'clamp(56px, 8vw, 96px) 0 clamp(64px, 8vw, 96px)',
        }}
      >
        <div className="wrap" style={{ maxWidth: 1200 }}>
          <div className="t-eyebrow">Admin · Brand Directory</div>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontWeight: 300,
              fontSize: 'clamp(40px, 6vw, 64px)',
              marginTop: 16,
              lineHeight: 1,
              letterSpacing: '-0.03em',
            }}
          >
            Stores
          </h1>
          <p
            style={{
              marginTop: 16,
              color: 'var(--ink-70)',
              fontSize: 15,
              maxWidth: '60ch',
            }}
          >
            The source of truth for every brand we track. Edits here go live
            within five minutes on the public surface.
          </p>

          <StoresAdmin />
        </div>
      </section>
      <Footer />
    </>
  )
}
