import { Users } from 'lucide-react'

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Utilisateurs (En construction)</h1>
        <p className="text-gray-500 mt-1">Gérez tous les utilisateurs de la plateforme TSBC.</p>
      </div>
      <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
          <Users className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Bientôt disponible</h2>
        <p className="text-gray-500 max-w-md">
          L'interface de gestion globale des utilisateurs est en cours de développement. Vous pourrez bientôt voir, ajouter et gérer tous les utilisateurs du système ici.
        </p>
      </div>
    </div>
  )
}
