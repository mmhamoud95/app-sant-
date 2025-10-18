export default function NotFound() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 bg-gray-50 text-center">
      <div className="max-w-md">
        {/* Illustration */}
        <div className="text-8xl font-extrabold text-blue-600 mb-4">404</div>

        {/* Titre */}
        <h1 className="text-2xl md:text-3xl font-semibold mb-3 text-gray-800">
          Page introuvable
        </h1>

        {/* Description */}
        <p className="text-gray-600 mb-8">
          Désolé, la page que vous recherchez n’existe pas ou a été déplacée.
        </p>

        {/* Bouton retour */}
        <a
          href="/"
          className="inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
        >
          Retour à l’accueil
        </a>
      </div>
    </main>
  )
}
