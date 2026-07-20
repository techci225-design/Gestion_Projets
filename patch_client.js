const fs = require('fs');
const path = require('path');

const filepath = path.join(__dirname, 'app/(dashboard)/projects/[id]/parametres/parametres-client.tsx');
let content = fs.readFileSync(filepath, 'utf8');

// 1. Add imports
if (!content.includes('updateProject')) {
  content = content.replace(
    "import { addFundingSource, deleteFundingSource } from '@/lib/actions/parametres.actions'",
    "import { addFundingSource, deleteFundingSource } from '@/lib/actions/parametres.actions'\nimport { updateProject, deleteProject } from '@/lib/actions/projects.actions'\nimport { useRouter } from 'next/navigation'"
  );
}
// Add Settings icon
if (!content.includes('Settings')) {
  content = content.replace("CheckSquare } from 'lucide-react'", "CheckSquare, Settings, AlertTriangle } from 'lucide-react'");
}

// 2. Update Props
content = content.replace(
  "userRole: string\n}",
  "userRole: string\n  project?: any\n}"
);

// 3. Update component signature
content = content.replace(
  "export function ParametresClient({ projectId, fundingSources, budgetLines, wbsTasks, userRole }: ParametresClientProps) {",
  "export function ParametresClient({ projectId, fundingSources, budgetLines, wbsTasks, userRole, project }: ParametresClientProps) {\n  const router = useRouter()"
);

// 4. Update activeTab state
content = content.replace(
  "useState<'bailleurs' | 'budget' | 'wbs' | 'statuts'>('bailleurs')",
  "useState<'general' | 'bailleurs' | 'budget' | 'wbs' | 'statuts'>('general')"
);

// 5. Add general form state and functions
const generalState = `
  // General form state
  const [generalError, setGeneralError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [formData, setFormData] = useState({
    name: project?.name || '',
    code: project?.code || '',
    start_date: project?.start_date || '',
    end_date: project?.end_date || '',
    description: project?.description || '',
    status: project?.status || 'actif'
  })

  const handleUpdateGeneral = async (e: React.FormEvent) => {
    e.preventDefault()
    setGeneralError('')
    startTransition(async () => {
      const res = await updateProject(projectId, formData)
      if (res?.error) setGeneralError(res.error)
    })
  }

  const handleDeleteProject = async () => {
    setIsDeleting(true)
    const res = await deleteProject(projectId)
    if (res?.error) {
      setGeneralError(res.error)
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    } else {
      router.push('/projects')
    }
  }
`;
content = content.replace("const canEdit = ['owner', 'comptable', 'chef_projet'].includes(userRole)", generalState + "\n  const canEdit = ['owner', 'comptable', 'chef_projet'].includes(userRole) || userRole === undefined");

// 6. Add tab button
const tabButton = `
          <button
            onClick={() => setActiveTab('general')}
            className={\`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left \${
              activeTab === 'general' ? 'bg-primary text-white' : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
            }\`}
          >
            <Settings className="w-5 h-5" />
            Général
          </button>
`;
content = content.replace("<div className=\"flex flex-col gap-2\">", "<div className=\"flex flex-col gap-2\">\n" + tabButton);

// 7. Add tab content
const tabContent = `
          {/* TAB: General */}
          {activeTab === 'general' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="border-b border-border pb-4">
                <h3 className="text-xl font-semibold text-text-primary">Informations générales</h3>
                <p className="text-sm text-text-secondary mt-1">Modifiez les informations principales du projet.</p>
              </div>

              {generalError && (
                <div className="p-3 rounded-md bg-danger/10 text-danger text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {generalError}
                </div>
              )}

              <form onSubmit={handleUpdateGeneral} className="space-y-6 max-w-2xl bg-white p-6 rounded-xl border border-border shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-text-primary">Nom du projet</label>
                    <input 
                      type="text" 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      disabled={isPending}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary disabled:opacity-50"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-text-primary">Code court</label>
                    <input 
                      type="text" 
                      value={formData.code}
                      onChange={e => setFormData({...formData, code: e.target.value})}
                      disabled={isPending}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary disabled:opacity-50"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-text-primary">Date de début</label>
                    <input 
                      type="date" 
                      value={formData.start_date}
                      onChange={e => setFormData({...formData, start_date: e.target.value})}
                      disabled={isPending}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary disabled:opacity-50"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-text-primary">Date de fin</label>
                    <input 
                      type="date" 
                      value={formData.end_date}
                      onChange={e => setFormData({...formData, end_date: e.target.value})}
                      disabled={isPending}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary disabled:opacity-50"
                      required
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="block text-sm font-medium text-text-primary">Statut</label>
                    <select 
                      value={formData.status}
                      onChange={e => setFormData({...formData, status: e.target.value})}
                      disabled={isPending}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary disabled:opacity-50"
                    >
                      <option value="actif">Actif</option>
                      <option value="clos">Clos</option>
                      <option value="en pause">En pause</option>
                    </select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="block text-sm font-medium text-text-primary">Description</label>
                    <textarea 
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      disabled={isPending}
                      rows={3}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary disabled:opacity-50 resize-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button 
                    type="submit"
                    disabled={isPending}
                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
                  </button>
                </div>
              </form>

              {/* Danger Zone */}
              <div className="mt-12">
                <div className="border-b border-danger/20 pb-4 mb-6">
                  <h3 className="text-xl font-semibold text-danger">Zone de danger</h3>
                  <p className="text-sm text-text-secondary mt-1">Actions irréversibles concernant ce projet.</p>
                </div>
                
                <div className="bg-danger/5 border border-danger/20 rounded-xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h4 className="font-bold text-text-primary">Supprimer le projet</h4>
                    <p className="text-sm text-text-secondary mt-1 max-w-xl">Cette action est définitive. Toutes les données associées (tâches, budget, documents) seront perdues si la suppression est forcée, ou conservées si le projet est simplement archivé (clos).</p>
                  </div>
                  
                  {!showDeleteConfirm ? (
                    <button 
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-4 py-2 bg-surface border border-danger text-danger rounded-lg text-sm font-medium hover:bg-danger hover:text-white transition-colors whitespace-nowrap"
                    >
                      Supprimer ce projet
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setShowDeleteConfirm(false)}
                        disabled={isDeleting}
                        className="px-4 py-2 bg-surface border border-border text-text-secondary rounded-lg text-sm font-medium hover:bg-surface-hover transition-colors disabled:opacity-50"
                      >
                        Annuler
                      </button>
                      <button 
                        onClick={handleDeleteProject}
                        disabled={isDeleting}
                        className="px-4 py-2 bg-danger text-white rounded-lg text-sm font-medium hover:bg-danger/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {isDeleting ? 'Suppression...' : 'Oui, supprimer définitivement'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
`;
content = content.replace("{/* TAB: Bailleurs */}", tabContent + "\n          {/* TAB: Bailleurs */}");

fs.writeFileSync(filepath, content);
console.log('Patched parametres-client.tsx');
