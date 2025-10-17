import { HeartIcon } from '@heroicons/react/24/solid'
import Link from 'next/link'

export function MedicalHeader() {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-green-600 text-white py-8 px-6 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <div className="bg-white/20 backdrop-blur-sm p-2 rounded-xl">
            <HeartIcon className="h-8 w-8" />
          </div>
          <span className="text-2xl font-bold">App Santé</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/search" className="hover:text-blue-100 transition-colors font-medium">
            Trouver un praticien
          </Link>
          <Link href="/auth/login" className="hover:text-blue-100 transition-colors font-medium">
            Connexion
          </Link>
          <Link 
            href="/auth/register" 
            className="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
          >
            S&apos;inscrire
          </Link>
        </nav>
      </div>
    </div>
  )
}