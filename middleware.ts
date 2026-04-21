import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PROTECTED_ROUTES = ['/preferences', '/stores']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only run on protected routes
  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route))
  if (!isProtected) return NextResponse.next()

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/preferences/:path*', '/stores/:path*'],
}
