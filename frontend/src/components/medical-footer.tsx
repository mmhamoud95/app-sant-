import { HeartIcon } from '@heroicons/react/24/solid'
import Link from 'next/link'

export function MedicalFooter() {
  return (
    <footer className="bg-gradient-to-br from-gray-50 to-gray-100 py-12 mt-16 border-t border-gray-200">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="flex justify-center items-center gap-2 mb-4">
            <div className="bg-gradient-to-r from-blue-600 to-green-600 p-2 rounded-xl">
              <HeartIcon className="h-6 w-6 text-white" />
            </div>
            <span className="text-gray-800 font-bold text-xl">App Santé</span>
          </div>
          <p className="text-gray-600 text-sm mb-2">
            &copy; {new Date().getFullYear()} App Santé. Tous droits réservés.
          </p>
          <p className="text-gray-500 text-xs mb-6">
            Votre santé, notre engagement quotidien
          </p>
          <div className="flex justify-center gap-6 text-sm text-gray-600">
            <Link href="/about" className="hover:text-blue-600 transition-colors">
              À propos
            </Link>
            <span className="text-gray-300">|</span>
            <Link href="/privacy" className="hover:text-blue-600 transition-colors">
              Confidentialité
            </Link>
            <span className="text-gray-300">|</span>
            <Link href="/terms" className="hover:text-blue-600 transition-colors">
              CGU
            </Link>
            <span className="text-gray-300">|</span>
            <Link href="/contact" className="hover:text-blue-600 transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}