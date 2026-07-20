'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FileUp, Download, CheckCircle, ArrowRight, Loader2, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { importProjectFromExcel } from '@/lib/actions/import.actions';

export default function ImportExcelWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectCode, setProjectCode] = useState('');
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = async () => {
    window.location.href = '/api/import-excel/template';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setError(null);
      
      // Parse immediately
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);

      try {
        const response = await fetch('/api/import-excel', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();
        if (!response.ok || result.error) {
          throw new Error(result.error || "Erreur de parsing");
        }

        setParsedData(result.data);
        setStep(2);
      } catch (err: any) {
        setError(err.message);
        setFile(null);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleCreateProject = async () => {
    if (!projectName.trim() || !projectCode.trim()) {
      setError('Veuillez remplir le nom et le code du projet.');
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      const result = await importProjectFromExcel({
        projectName,
        projectCode,
        tasksData: parsedData,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      // Success
      setStep(4);
      setTimeout(() => {
        router.push(`/projects/${result.projectId}`);
      }, 2000);
    } catch (err: any) {
      setError(err.message);
      setIsImporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6 text-primary" />
          Assistant d'Import Excel
        </h1>
        <p className="text-text-secondary mt-1">Créez un nouveau projet complet à partir d'un fichier Excel PTBA.</p>
      </div>

      {error && (
        <div className="mb-6 bg-danger/10 text-danger p-4 rounded-lg flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Étapes du Wizard */}
      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-surface-hover -z-10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((step - 1) / 3) * 100}%` }}
          />
        </div>
        {[
          { num: 1, title: 'Fichier' },
          { num: 2, title: 'Projet' },
          { num: 3, title: 'Validation' },
          { num: 4, title: 'Terminé' }
        ].map(s => (
          <div key={s.num} className="flex flex-col items-center gap-2 bg-surface px-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
              step >= s.num ? 'bg-primary text-white' : 'bg-surface-hover text-text-tertiary'
            }`}>
              {s.num}
            </div>
            <span className={`text-xs font-medium ${step >= s.num ? 'text-primary' : 'text-text-tertiary'}`}>
              {s.title}
            </span>
          </div>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-sm p-6 sm:p-8">
        
        {/* ETAPE 1 : UPLOAD */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 flex flex-col sm:flex-row items-center gap-6">
              <div className="p-4 bg-white rounded-full shadow-sm text-primary">
                <Download className="w-8 h-8" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-lg font-bold text-primary mb-1">Étape 1 : Obtenez le modèle</h3>
                <p className="text-sm text-text-secondary mb-4">
                  Pour garantir un import sans erreur, vous devez utiliser notre modèle Excel standardisé.
                </p>
                <button 
                  onClick={handleDownloadTemplate}
                  className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2"
                >
                  Télécharger le modèle Excel
                </button>
              </div>
            </div>

            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:bg-surface-hover transition-colors">
              <FileUp className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
              <h3 className="text-lg font-bold text-text-primary mb-2">Étape 2 : Importez votre fichier</h3>
              <p className="text-sm text-text-secondary mb-6">
                Remplissez le modèle téléchargé puis déposez-le ici.
              </p>
              
              <input 
                type="file" 
                accept=".xlsx,.xls,.csv" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="bg-white border border-border text-text-primary hover:bg-surface-hover px-6 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm inline-flex items-center gap-2"
              >
                {isUploading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Analyse en cours...</>
                ) : 'Parcourir les fichiers'}
              </button>
            </div>
          </div>
        )}

        {/* ETAPE 2 : INFOS DU PROJET */}
        {step === 2 && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-text-primary mb-4">Informations du projet</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-secondary">Nom du Projet *</label>
                <input 
                  type="text" 
                  className="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="Ex: Programme d'Appui Santé"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-secondary">Code du Projet *</label>
                <input 
                  type="text" 
                  className="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all uppercase"
                  placeholder="Ex: PAS-2026"
                  value={projectCode}
                  onChange={(e) => setProjectCode(e.target.value.toUpperCase())}
                />
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-border flex justify-between">
              <button 
                onClick={() => setStep(1)}
                className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                Retour
              </button>
              <button 
                onClick={() => {
                  if (!projectName.trim() || !projectCode.trim()) {
                    setError('Veuillez remplir le nom et le code du projet.');
                    return;
                  }
                  setError(null);
                  setStep(3);
                }}
                className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2"
              >
                Continuer <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ETAPE 3 : PREVIEW */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h3 className="text-lg font-bold text-text-primary">Aperçu des données</h3>
                <p className="text-sm text-text-secondary">{parsedData.length} tâches trouvées dans le fichier Excel.</p>
              </div>
            </div>
            
            <div className="border border-border rounded-lg overflow-hidden bg-background">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-surface text-text-secondary border-b border-border">
                    <tr>
                      <th className="px-4 py-3 font-medium whitespace-nowrap">Code Tâche</th>
                      <th className="px-4 py-3 font-medium">Description</th>
                      <th className="px-4 py-3 font-medium whitespace-nowrap">Date Début</th>
                      <th className="px-4 py-3 font-medium whitespace-nowrap">Date Fin</th>
                      <th className="px-4 py-3 font-medium text-right whitespace-nowrap">Budget</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="border-b border-border/50 hover:bg-surface transition-colors">
                        <td className="px-4 py-3 font-medium text-text-primary">{row["Code Tâche"]}</td>
                        <td className="px-4 py-3 text-text-secondary truncate max-w-[200px]">{row["Description"]}</td>
                        <td className="px-4 py-3 text-text-secondary whitespace-nowrap">{row["Date Début (JJ/MM/AAAA)"]}</td>
                        <td className="px-4 py-3 text-text-secondary whitespace-nowrap">{row["Date Fin (JJ/MM/AAAA)"]}</td>
                        <td className="px-4 py-3 text-right font-medium text-text-primary">
                          {Number(row["Budget Alloué (FCFA)"]).toLocaleString('fr-FR')} FCFA
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedData.length > 5 && (
                <div className="bg-surface p-3 text-center text-xs text-text-tertiary border-t border-border">
                  Et {parsedData.length - 5} autres lignes...
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-border flex justify-between">
              <button 
                onClick={() => setStep(2)}
                disabled={isImporting}
                className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
              >
                Retour
              </button>
              <button 
                onClick={handleCreateProject}
                disabled={isImporting}
                className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2 shadow-md shadow-primary/20 disabled:opacity-70"
              >
                {isImporting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Importation...</>
                ) : (
                  <><CheckCircle className="w-4 h-4" /> Lancer l'importation</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ETAPE 4 : SUCCESS */}
        {step === 4 && (
          <div className="py-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-2">Projet créé avec succès !</h2>
            <p className="text-text-secondary mb-8 max-w-md">
              Les {parsedData.length} tâches ont été importées. Redirection vers le tableau de bord du projet en cours...
            </p>
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        )}

      </div>
    </div>
  );
}
