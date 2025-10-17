"use client"
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SearchRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/')
  }, [router])
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-600">Redirection vers la page d&apos;accueil...</p>
    </div>
  )
}
