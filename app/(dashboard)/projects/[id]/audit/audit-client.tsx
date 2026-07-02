'use client'

import { useState } from 'react'
import { Eye, X } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

function getActionBadge(action: string) {
  switch (action) {
    case 'INSERT':
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-success-green/10 text-success-green">Créé</span>
    case 'UPDATE':
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-opex-blue/10 text-opex-blue">Modifié</span>
    case 'DELETE':
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-error-red/10 text-error-red">Supprimé</span>
    default:
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-surface-variant text-on-surface-variant">{action}</span>
  }
}

function getModuleName(table: string) {
  const map: Record<string, string> = {
    'operations_journal': 'Journal des opérations',
    'ptba_activities': 'PTBA',
    'logframe_items': 'Cadre Logique',
    'budget_lines': 'Lignes Budgétaires',
    'procurement_plan': 'Plan de Passation des Marchés',
    'risks': 'Risques',
    'project_members': 'Membres du Projet',
    'projects': 'Détails du Projet'
  }
  return map[table] || table
}

export function AuditClient({ projectId, initialLogs }: { projectId: string, initialLogs: any[] }) {
  const [selectedLog, setSelectedLog] = useState<any | null>(null)
  
  // Basic pagination (client-side for now, could be server-side)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const totalPages = Math.ceil(initialLogs.length / itemsPerPage)
  
  const currentLogs = initialLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  return (
    <div className="relative">
      <div className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-container text-on-surface-variant">
              <tr>
                <th className="p-4 font-semibold">Date / Heure</th>
                <th className="p-4 font-semibold">Utilisateur</th>
                <th className="p-4 font-semibold">Action</th>
                <th className="p-4 font-semibold">Module</th>
                <th className="p-4 font-semibold text-right">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {currentLogs.map((log) => (
                <tr key={log.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="p-4 text-on-surface whitespace-nowrap">
                    {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-xs font-bold">
                        {log.profiles?.full_name?.charAt(0).toUpperCase() || log.profiles?.email?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <span className="text-on-surface">{log.profiles?.full_name || log.profiles?.email || 'Inconnu'}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    {getActionBadge(log.action)}
                  </td>
                  <td className="p-4 text-on-surface-variant">
                    {getModuleName(log.entity_table)}
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => setSelectedLog(log)}
                      className="text-primary hover:text-primary-fixed-variant transition-colors p-2 rounded-lg hover:bg-surface-container"
                      title="Voir les détails"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {currentLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-on-surface-variant">
                    Aucun événement d'audit trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between">
            <span className="text-sm text-on-surface-variant">
              Affichage {(currentPage - 1) * itemsPerPage + 1} à {Math.min(currentPage * itemsPerPage, initialLogs.length)} sur {initialLogs.length}
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded border border-border text-on-surface disabled:opacity-50 hover:bg-surface-container"
              >
                Précédent
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded border border-border text-on-surface disabled:opacity-50 hover:bg-surface-container"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Side Panel (Drawer) for JSON Details */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-on-surface/20 backdrop-blur-sm" onClick={() => setSelectedLog(null)} />
          <div className="relative w-full max-w-md bg-surface shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-200 border-l border-border">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-semibold text-on-surface">Détails de l'action</h2>
              <button onClick={() => setSelectedLog(null)} className="p-2 rounded-full hover:bg-surface-container text-on-surface-variant transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-on-surface mb-2">Informations Générales</h3>
                <div className="bg-surface-container-low rounded-lg p-4 text-sm text-on-surface space-y-2">
                  <p><span className="text-on-surface-variant font-medium">Table :</span> {selectedLog.entity_table}</p>
                  <p><span className="text-on-surface-variant font-medium">ID :</span> {selectedLog.entity_id}</p>
                  <p><span className="text-on-surface-variant font-medium">Action :</span> {selectedLog.action}</p>
                  <p><span className="text-on-surface-variant font-medium">Auteur :</span> {selectedLog.profiles?.full_name}</p>
                </div>
              </div>

              {selectedLog.before_data && (
                <div>
                  <h3 className="text-sm font-semibold text-on-surface mb-2">Avant modification</h3>
                  <pre className="bg-[#1A1F2E] text-white p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(selectedLog.before_data, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.after_data && (
                <div>
                  <h3 className="text-sm font-semibold text-on-surface mb-2">Après modification</h3>
                  <pre className="bg-[#1A1F2E] text-white p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(selectedLog.after_data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
