export const dynamic = 'force-dynamic'

export default function DoctorDashboardPage() {
  return (
    <main className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Dashboard praticien</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="lg:col-span-2 border rounded p-4">
          <h2 className="font-medium mb-2">Calendrier (à intégrer FullCalendar)</h2>
          <div className="h-96 bg-gray-50 rounded" />
        </section>
        <section className="border rounded p-4">
          <h2 className="font-medium mb-2">Statistiques</h2>
          <p>Nombre de rendez-vous, taux d’annulation… (Recharts)</p>
        </section>
      </div>
    </main>
  )
}
