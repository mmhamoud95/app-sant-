import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protect admin routes
  if (pathname.startsWith('/dashboard/admin')) {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    })

    // Check if user is authenticated and has admin role
    if (!token) {
      // Redirect to admin login if not authenticated
      const url = new URL('/auth/admin/login', request.url)
      url.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(url)
    }

    // Check if user has admin role
    if (token.user && typeof token.user === 'object' && 'role' in token.user) {
      const userRole = (token.user as { role?: string }).role
      if (userRole !== 'admin') {
        // Redirect to appropriate dashboard based on role
        if (userRole === 'patient') {
          return NextResponse.redirect(new URL('/dashboard/patient', request.url))
        } else if (userRole === 'doctor') {
          return NextResponse.redirect(new URL('/dashboard/doctor', request.url))
        }
        // Redirect to home if role is unknown
        return NextResponse.redirect(new URL('/', request.url))
      }
    } else {
      // If role is not in token, redirect to home
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Protect doctor routes
  if (pathname.startsWith('/dashboard/doctor')) {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    })

    if (!token) {
      const url = new URL('/auth/login', request.url)
      url.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(url)
    }

    if (token.user && typeof token.user === 'object' && 'role' in token.user) {
      const userRole = (token.user as { role?: string }).role
      if (userRole !== 'doctor') {
        // Redirect to appropriate dashboard
        if (userRole === 'admin') {
          return NextResponse.redirect(new URL('/dashboard/admin', request.url))
        } else if (userRole === 'patient') {
          return NextResponse.redirect(new URL('/dashboard/patient', request.url))
        }
        return NextResponse.redirect(new URL('/', request.url))
      }
    }
  }

  // Protect patient routes
  if (pathname.startsWith('/dashboard/patient')) {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    })

    if (!token) {
      const url = new URL('/auth/login', request.url)
      url.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(url)
    }

    if (token.user && typeof token.user === 'object' && 'role' in token.user) {
      const userRole = (token.user as { role?: string }).role
      if (userRole !== 'patient') {
        // Redirect to appropriate dashboard
        if (userRole === 'admin') {
          return NextResponse.redirect(new URL('/dashboard/admin', request.url))
        } else if (userRole === 'doctor') {
          return NextResponse.redirect(new URL('/dashboard/doctor', request.url))
        }
        return NextResponse.redirect(new URL('/', request.url))
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
  ]
}
