import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    accessToken?: string
    user?: {
      id: number
      email: string
      role: 'patient' | 'doctor' | 'admin'
    }
  }
}
