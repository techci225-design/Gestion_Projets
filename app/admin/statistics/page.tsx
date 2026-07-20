import { BarChart3 } from 'lucide-react'

export default function AdminStatisticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Statistiques (En construction)</h1>
        <p className="text-gray-500 mt-1">Suivez l'activité et l'usage global de la plateforme.</p>
      </div>
      <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
          <BarChart3 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Bientôt disponible</h2>
        <p className="text-gray-500 max-w-md">
          Le tableau de bord statistique complet est en cours d'élaboration. Il vous permettra de suivre l'évolution des projets, des budgets et de l'adoption globale.
        </p>
      </div>
    </div>
  )
}
