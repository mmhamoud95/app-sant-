import type { Metadata } from 'next'
import './globals.css'
import Providers from '@/components/Providers'

export const metadata: Metadata = {
  title: 'App Santé',
  description: 'Gestion de rendez-vous médicaux',
}

export const dynamic = 'force-dynamic'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
