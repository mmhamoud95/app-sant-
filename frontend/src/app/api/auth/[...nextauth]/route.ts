import NextAuth from 'next-auth'
import { JWT } from 'next-auth/jwt'
import Credentials from 'next-auth/providers/credentials'
import axios from 'axios'
import { API_BASE } from '@/lib/env'
import { AuthOptions } from 'next-auth'

// Types pour une meilleure sécurité du type
interface User {
  id: string
  email: string
  role: string
  firstName?: string
  lastName?: string
  accessToken?: string
}

interface ApiError {
  detail?: string
  message?: string
  errors?: Record<string, string[]>
}

// Configuration de NextAuth avec typing strict
const authOptions: AuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || 'dev-secret',
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 }, // 8 heures
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // Authentification avec l'API
          const resp = await axios.post(
            `${API_BASE}/auth/login`, 
            {
              email: credentials.email,
              password: credentials.password,
            },
            { 
              withCredentials: true,
              timeout: 10000, // 10 secondes de timeout
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              }
            }
          )

          const accessToken = resp.data?.access_token as string
          if (!accessToken) return null

          // Récupération des données utilisateur
          const me = await axios.get(`${API_BASE}/auth/me`, {
            headers: { 
              Authorization: `Bearer ${accessToken}`,
              'Accept': 'application/json',
            },
            timeout: 10000,
          })

          // Retourner l'utilisateur avec toutes les informations nécessaires
          return { 
            id: String(me.data.id), 
            email: me.data.email, 
            role: me.data.role,
            firstName: me.data.first_name,
            lastName: me.data.last_name,
            accessToken 
          } as User
        } catch (error) {
          // Gestion d'erreur améliorée
          if (axios.isAxiosError(error)) {
            const status = error.response?.status
            const data = error.response?.data as ApiError | undefined
            const detail = data?.detail || data?.message || ''

            // Log pour le debugging en dev
            if (process.env.NODE_ENV === 'development') {
              console.error('Auth error:', { status, data, url: error.config?.url })
            }

            // Gestion spécifique selon le code d'erreur
            switch (status) {
              case 401:
                throw new Error('Email ou mot de passe incorrect')
              case 403:
                throw new Error(detail || 'Accès interdit')
              case 404:
                throw new Error('Service d\'authentification indisponible')
              case 422:
                // Validation error handling
                if (data?.errors) {
                  const messages = Object.values(data.errors).flat()
                  throw new Error(messages[0] || 'Données invalides')
                }
                throw new Error(detail || 'Données invalides')
              case 429:
                throw new Error(detail || 'Trop de tentatives. Veuillez patienter avant de réessayer.')
              case 500:
              case 502:
              case 503:
                throw new Error('Le service d\'authentification est temporairement indisponible. Veuillez réessayer plus tard.')
              default:
                if (detail) throw new Error(detail)
            }
          }

          // Erreur générique
          throw new Error('Impossible de se connecter. Veuillez réessayer.')
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }): Promise<JWT> {
      // Initialisation avec les données utilisateur lors de la connexion
      if (user) {
        return {
          ...token,
          accessToken: (user as User).accessToken,
          user: {
            id: (user as User).id,
            email: (user as User).email,
            role: (user as User).role,
            firstName: (user as User).firstName,
            lastName: (user as User).lastName,
          },
        }
      }

      // Support de la mise à jour du token lors d'un changement de session
      if (trigger === 'update' && session?.user) {
        return {
          ...token,
          user: {
            ...(token.user as object || {}),
            ...session.user,
          }
        }
      }

      return token
    },
    async session({ session, token }) {
      // Transférer les données du token à la session
      return {
        ...session,
        accessToken: token.accessToken as string | undefined,
        user: token.user as User,
        expires: session.expires,
      }
    },
  },
  debug: process.env.NODE_ENV === 'development',
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }