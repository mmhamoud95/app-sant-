export const dynamic = 'force-dynamic'

export default function AdminDashboardPage() {
  return (
    <main className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Administration</h1>
      <div className="border rounded p-4">
        <h2 className="font-medium">Praticiens</h2>
        <p>Listing, vérification… (à implémenter, endpoint /admin/doctors)</p>
      </div>
    </main>
  )
}
