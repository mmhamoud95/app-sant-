import { ReactNode } from 'react'
import { MedicalHeader } from './medical-header'
import { MedicalFooter } from './medical-footer'

interface PageLayoutProps {
  children: ReactNode
}

export function PageLayout({ children }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex flex-col">
      <MedicalHeader />
      <main className="flex-1">
        {children}
      </main>
      <MedicalFooter />
    </div>
  )
}