import Link from 'next/link'
import { LayoutDashboard, CheckCircle2, ShieldCheck, PieChart, Activity, Target, Banknote, Briefcase, FileText } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-800 selection:bg-indigo-200">
      {/* SECTION 1 — HERO */}
      <section className="bg-[#1E3A5F] text-white pt-24 pb-32 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-[600px] h-[600px] bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          <div className="lg:col-span-7">
            <div className="mb-8 flex items-center gap-3">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <LayoutDashboard className="text-white w-6 h-6" />
              </div>
              <span className="font-bold text-2xl tracking-tight">ProjetPilote</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold leading-[1.1] mb-6">
              Pilotez vos projets bailleurs avec la rigueur des institutions.
            </h1>
            <p className="text-xl text-blue-200 mb-10 max-w-2xl leading-relaxed">
              ProjetPilote traduit la méthodologie Excel de M. Bakayoko en application web sécurisée, accessible sur mobile, conforme aux standards Banque Mondiale et BID.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/register" className="bg-white text-[#1E3A5F] px-8 py-4 rounded-lg font-bold hover:bg-slate-100 transition-colors text-center text-lg">
                Créer mon espace gratuit →
              </Link>
              <Link href="#demo" className="bg-transparent border border-white text-white px-8 py-4 rounded-lg font-bold hover:bg-white/10 transition-colors text-center text-lg">
                Voir la démo
              </Link>
            </div>
          </div>
          <div className="lg:col-span-5 relative hidden md:block">
            <div className="bg-white p-2 rounded-2xl shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-500">
              <div className="aspect-[4/3] bg-slate-50 rounded-xl overflow-hidden relative border border-slate-200 flex">
                {/* Sidebar Mockup */}
                <div className="w-1/4 bg-[#0A1628] p-3 flex flex-col gap-3 border-r border-slate-200">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-5 h-5 bg-green-500 rounded-md"></div>
                    <div className="h-3 bg-slate-100 rounded w-16"></div>
                  </div>
                  <div className="h-3 bg-indigo-500 rounded w-full opacity-90"></div>
                  <div className="h-3 bg-slate-800 rounded w-5/6"></div>
                  <div className="h-3 bg-slate-800 rounded w-4/6"></div>
                  <div className="h-3 bg-slate-800 rounded w-full"></div>
                </div>
                {/* Main Content Mockup */}
                <div className="flex-1 p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-center mb-1">
                    <div className="h-4 bg-slate-300 rounded w-1/3"></div>
                    <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-[10px] font-bold">F</div>
                  </div>
                  {/* KPI Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white border border-slate-100 p-3 rounded-lg shadow-sm">
                      <div className="h-2 bg-slate-200 rounded w-1/2 mb-3"></div>
                      <div className="h-5 bg-green-500 rounded w-3/4"></div>
                    </div>
                    <div className="bg-white border border-slate-100 p-3 rounded-lg shadow-sm">
                      <div className="h-2 bg-slate-200 rounded w-1/2 mb-3"></div>
                      <div className="h-5 bg-indigo-500 rounded w-2/3"></div>
                    </div>
                  </div>
                  {/* Chart Mockup */}
                  <div className="flex-1 bg-white border border-slate-100 rounded-lg shadow-sm p-3 relative overflow-hidden flex flex-col">
                    <div className="h-2 bg-slate-200 rounded w-1/4 mb-auto"></div>
                    <div className="w-full flex items-end justify-between gap-1.5 h-24 mt-2">
                      <div className="w-full bg-indigo-100 hover:bg-indigo-200 rounded-t-sm h-[30%] transition-colors"></div>
                      <div className="w-full bg-indigo-200 hover:bg-indigo-300 rounded-t-sm h-[45%] transition-colors"></div>
                      <div className="w-full bg-indigo-300 hover:bg-indigo-400 rounded-t-sm h-[65%] transition-colors"></div>
                      <div className="w-full bg-indigo-400 hover:bg-indigo-500 rounded-t-sm h-[50%] transition-colors"></div>
                      <div className="w-full bg-indigo-500 hover:bg-indigo-600 rounded-t-sm h-[85%] transition-colors"></div>
                      <div className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-t-sm h-[100%] transition-colors"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2 — CHIFFRES CLÉS */}
      <section className="py-16 bg-white border-b border-slate-100 relative -mt-16 z-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-slate-100">
            <div className="text-center px-4">
              <div className="text-4xl font-black text-[#1E3A5F] mb-2">7</div>
              <div className="text-sm text-slate-500 font-medium">modules intégrés</div>
            </div>
            <div className="text-center px-4">
              <div className="text-4xl font-black text-[#16A34A] mb-2">100%</div>
              <div className="text-sm text-slate-500 font-medium">calculs automatiques</div>
            </div>
            <div className="text-center px-4">
              <div className="text-4xl font-black text-[#1E3A5F] mb-2">0</div>
              <div className="text-sm text-slate-500 font-medium">installation requise</div>
            </div>
            <div className="text-center px-4">
              <div className="text-4xl font-black text-[#16A34A] mb-2">FCFA</div>
              <div className="text-sm text-slate-500 font-medium">devise native</div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3 — LES MODULES */}
      <section id="fonctionnalites" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1E3A5F] mb-4">Une plateforme complète, de la planification au rapport</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">Tout ce dont vous avez besoin pour gérer un projet de développement, réuni dans une seule interface.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <Target className="w-10 h-10 text-[#16A34A] mb-4" />
              <h3 className="text-xl font-bold text-slate-800 mb-2">Cadre Logique</h3>
              <p className="text-slate-600">Définissez vos indicateurs de performance et suivez l'atteinte des objectifs stratégiques.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <Briefcase className="w-10 h-10 text-blue-600 mb-4" />
              <h3 className="text-xl font-bold text-slate-800 mb-2">PTBA</h3>
              <p className="text-slate-600">Planifiez votre travail annuel avec un diagramme de Gantt interactif et exportable.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <Banknote className="w-10 h-10 text-[#16A34A] mb-4" />
              <h3 className="text-xl font-bold text-slate-800 mb-2">Budget & Journal</h3>
              <p className="text-slate-600">Suivez vos engagements et décaissements en FCFA avec une précision comptable.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <Activity className="w-10 h-10 text-indigo-600 mb-4" />
              <h3 className="text-xl font-bold text-slate-800 mb-2">Moteur EVM</h3>
              <p className="text-slate-600">Générez automatiquement les courbes en S, le SPI et CPI sans aucune formule Excel.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <FileText className="w-10 h-10 text-orange-500 mb-4" />
              <h3 className="text-xl font-bold text-slate-800 mb-2">Passation des Marchés</h3>
              <p className="text-slate-600">Gérez vos contrats et prestataires en conformité avec les directives des bailleurs.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <ShieldCheck className="w-10 h-10 text-red-500 mb-4" />
              <h3 className="text-xl font-bold text-slate-800 mb-2">Matrice des Risques</h3>
              <p className="text-slate-600">Identifiez, évaluez et mitigez les risques pouvant impacter l'exécution du projet.</p>
            </div>
            <div className="lg:col-span-3 bg-[#1E3A5F] p-8 rounded-xl shadow-md text-white flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <PieChart className="w-12 h-12 text-[#16A34A] mb-4" />
                <h3 className="text-2xl font-bold mb-2">Tableau de Bord Portefeuille</h3>
                <p className="text-blue-200 max-w-3xl">Gérez plusieurs projets simultanément. Ayez une vue globale sur les performances financières et physiques de tout votre portefeuille de projets bailleurs.</p>
              </div>
              <Link href="/register" className="shrink-0 bg-[#16A34A] hover:bg-green-500 px-6 py-3 rounded-lg font-bold transition-colors">
                Essayer maintenant
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4 — DÉMONSTRATION */}
      <section id="demo" className="py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1E3A5F] mb-4">ProjetPilote en action</h2>
          <p className="text-lg text-slate-600 mb-16">Données réelles d'un projet bailleur — Tableau de bord EVM</p>
          
          <div className="relative mx-auto max-w-5xl">
            <div className="bg-slate-100 rounded-2xl p-2 md:p-4 shadow-2xl border border-slate-200">
              <div className="aspect-[16/9] bg-white rounded-xl overflow-hidden border border-slate-200 flex flex-col">
                 <div className="h-10 bg-slate-100 border-b border-slate-200 flex items-center px-4 gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                    <div className="mx-auto h-4 w-48 bg-white rounded-md border border-slate-200 shadow-sm flex items-center justify-center">
                      <div className="w-24 h-1.5 bg-slate-200 rounded-full"></div>
                    </div>
                 </div>
                 
                 <div className="flex-1 flex overflow-hidden">
                    {/* App Sidebar */}
                    <div className="w-48 bg-[#0A1628] border-r border-slate-200 p-4 flex flex-col gap-4 hidden sm:flex">
                       <div className="flex items-center gap-2 mb-4">
                         <div className="w-6 h-6 bg-green-500 rounded-md"></div>
                         <div className="h-4 bg-white opacity-90 rounded w-24"></div>
                       </div>
                       <div className="h-8 bg-indigo-600 rounded-md w-full opacity-90"></div>
                       <div className="h-8 bg-white/5 hover:bg-white/10 rounded-md w-full border border-white/5 transition-colors"></div>
                       <div className="h-8 bg-white/5 hover:bg-white/10 rounded-md w-full border border-white/5 transition-colors"></div>
                       <div className="h-8 bg-white/5 hover:bg-white/10 rounded-md w-full border border-white/5 transition-colors"></div>
                    </div>
                    
                    {/* App Main */}
                    <div className="flex-1 bg-slate-50 p-4 sm:p-6 flex flex-col gap-6 overflow-hidden">
                       <div className="flex justify-between items-center">
                         <div>
                           <div className="h-6 bg-slate-800 rounded w-48 sm:w-64 mb-2"></div>
                           <div className="h-4 bg-slate-400 rounded w-32 sm:w-96 hidden sm:block"></div>
                         </div>
                         <div className="h-9 w-28 bg-indigo-600 rounded-lg shadow-sm"></div>
                       </div>
                       
                       {/* KPI Grid */}
                       <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                          {[
                            {color: 'bg-blue-600', w: 'w-24', t: 'Budget (BAC)'}, 
                            {color: 'bg-emerald-500', w: 'w-16', t: 'Valeur Acquise (EV)'}, 
                            {color: 'bg-indigo-500', w: 'w-20', t: 'Coût Réel (AC)'}, 
                            {color: 'bg-purple-600', w: 'w-28', t: 'Valeur Planifiée (PV)'}
                          ].map((c, i) => (
                            <div key={i} className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
                               <div className="text-[10px] sm:text-xs text-slate-500 font-medium mb-2">{c.t}</div>
                               <div className={`h-5 sm:h-6 ${c.color} rounded ${c.w}`}></div>
                            </div>
                          ))}
                       </div>

                       {/* S-Curve Chart Mockup */}
                       <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 p-4 sm:p-6 relative min-h-[150px]">
                          <div className="flex items-center gap-4 mb-4 sm:mb-6">
                            <div className="h-4 bg-slate-800 rounded w-32 sm:w-48"></div>
                            <div className="flex gap-3 ml-auto">
                              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-400"></div><div className="h-2 w-8 bg-slate-200 rounded hidden sm:block"></div></div>
                              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500"></div><div className="h-2 w-8 bg-slate-200 rounded hidden sm:block"></div></div>
                              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500"></div><div className="h-2 w-8 bg-slate-200 rounded hidden sm:block"></div></div>
                            </div>
                          </div>
                          
                          {/* Chart Grid */}
                          <div className="absolute inset-0 top-14 sm:top-16 left-6 right-6 bottom-8 border-l border-b border-slate-200">
                             <div className="w-full h-1/4 border-t border-slate-100 border-dashed"></div>
                             <div className="w-full h-1/4 border-t border-slate-100 border-dashed"></div>
                             <div className="w-full h-1/4 border-t border-slate-100 border-dashed"></div>
                             <div className="w-full h-1/4 border-t border-slate-100 border-dashed"></div>
                             
                             {/* S-Curve SVG */}
                             <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                                {/* PV Curve (Planned) */}
                                <path d="M 0 100 C 30 95, 50 10, 100 0" fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 4" />
                                {/* EV Curve (Earned) */}
                                <path d="M 0 100 C 25 95, 45 40, 65 30" fill="none" stroke="#10b981" strokeWidth="3" className="drop-shadow-sm" />
                                {/* AC Curve (Actual) */}
                                <path d="M 0 100 C 20 95, 40 50, 65 20" fill="none" stroke="#ef4444" strokeWidth="3" className="drop-shadow-sm" />
                             </svg>
                             
                             {/* Current period marker */}
                             <div className="absolute top-0 bottom-0 left-[65%] border-l-2 border-indigo-500 border-dashed">
                               <div className="absolute -top-3 -translate-x-1/2 bg-indigo-500 text-white text-[9px] px-1.5 py-0.5 rounded">Aujourd'hui</div>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
            </div>
            
            {/* Décoration de fond */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-green-400/20 rounded-full blur-[100px] -z-10"></div>
          </div>

          <div className="mt-16 flex flex-wrap justify-center gap-x-8 gap-y-4 max-w-4xl mx-auto">
            <div className="flex items-center gap-2 text-slate-700 font-medium">
              <CheckCircle2 className="text-[#16A34A] w-5 h-5" /> CPI et SPI en temps réel
            </div>
            <div className="flex items-center gap-2 text-slate-700 font-medium">
              <CheckCircle2 className="text-[#16A34A] w-5 h-5" /> Courbe en S automatique
            </div>
            <div className="flex items-center gap-2 text-slate-700 font-medium">
              <CheckCircle2 className="text-[#16A34A] w-5 h-5" /> Alertes sur seuils BM/BID
            </div>
            <div className="flex items-center gap-2 text-slate-700 font-medium">
              <CheckCircle2 className="text-[#16A34A] w-5 h-5" /> Rapport PDF en 1 clic
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5 — POUR QUI ? */}
      <section className="py-24 bg-[#EFF6FF]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1E3A5F]">Conçu pour les professionnels du développement</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-6">
                <Briefcase className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-[#1E3A5F] mb-3">Consultants et cabinets</h3>
              <p className="text-slate-600 leading-relaxed">
                Gérez plusieurs projets bailleurs depuis un seul tableau de bord. Fini les dizaines de fichiers Excel désynchronisés. Offrez un service premium à vos clients.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border-2 border-indigo-100 relative">
              <div className="absolute top-0 right-0 bg-[#16A34A] text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-xl">Le plus populaire</div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                <Target className="w-6 h-6 text-[#16A34A]" />
              </div>
              <h3 className="text-xl font-bold text-[#1E3A5F] mb-3">Chefs de projet</h3>
              <p className="text-slate-600 leading-relaxed">
                Saisissez vos données d'exécution, l'application calcule tout le reste. Générez vos rapports d'avancement instantanément avant chaque comité de pilotage.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <ShieldCheck className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-[#1E3A5F] mb-3">Bailleurs et partenaires</h3>
              <p className="text-slate-600 leading-relaxed">
                Accès lecture seule sécurisé en temps réel aux performances du projet. Fiez-vous à des rapports PDF institutionnels standardisés et transparents.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6 — CTA FINAL */}
      <section className="py-24 bg-[#1E3A5F] text-center px-4 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/50 via-[#1E3A5F] to-[#1E3A5F]"></div>
        <div className="relative z-10 max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Prêt à moderniser votre gouvernance ?</h2>
          <p className="text-xl text-blue-200 mb-10">
            Créez votre espace en 2 minutes. Gratuit, sans carte bancaire.
          </p>
          <Link href="/register" className="inline-block bg-white text-[#1E3A5F] px-10 py-5 rounded-lg font-bold hover:bg-slate-100 transition-transform hover:scale-105 text-lg mb-8 shadow-xl">
            Démarrer gratuitement →
          </Link>
          <p className="text-sm text-blue-300/60 font-medium">
            Une solution TSBC — tsbcafrique@yahoo.fr — +225 07 07 36 30 20
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0A1628] text-slate-400 py-16 border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-[#16A34A] rounded-md flex items-center justify-center">
                <LayoutDashboard className="text-white w-5 h-5" />
              </div>
              <span className="font-bold text-xl text-white tracking-tight">ProjetPilote</span>
            </div>
            <p className="text-sm text-slate-500 max-w-sm">
              La plateforme de référence pour le pilotage financier et physique des projets de développement en Afrique francophone.
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Liens Rapides</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/login" className="hover:text-white transition-colors">Connexion</Link></li>
              <li><Link href="/register" className="hover:text-white transition-colors">Créer un compte</Link></li>
              <li><Link href="#fonctionnalites" className="hover:text-white transition-colors">Fonctionnalités</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Contact</h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li>TSBC Afrique</li>
              <li>Email: <a href="mailto:tsbcafrique@yahoo.fr" className="hover:text-white transition-colors">tsbcafrique@yahoo.fr</a></li>
              <li>Tél: +225 07 07 36 30 20</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 pt-8 border-t border-slate-800 text-center md:text-left text-sm text-slate-600">
          © 2026 ProjetPilote — TSBC. Tous droits réservés.
        </div>
      </footer>
    </div>
  )
}
