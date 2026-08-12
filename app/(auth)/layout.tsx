import { BriefcaseBusiness, Calendar, Users, TrendingUp, ShieldCheck, Heart, Shield, Headphones } from 'lucide-react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-[100dvh] relative overflow-hidden bg-slate-900">
      {/* Global Background Image with strong overlay */}
      <div 
        className="fixed inset-0 bg-cover bg-[80%_center] md:bg-center bg-no-repeat z-0"
        style={{ backgroundImage: 'url("/bridge-bg.jpg")' }}
      >
        <div className="absolute inset-0 bg-[#0f172a]/85 mix-blend-multiply"></div>
        {/* Subtle gradient to highlight the left text */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#030712]/90 to-transparent"></div>
      </div>

      <div className="relative z-10 w-full max-w-[1400px] mx-auto flex flex-col lg:flex-row items-center justify-between p-4 sm:p-8 md:p-12 gap-12 min-h-screen">
        
        {/* Left Column (Text & Features) - Hidden on smaller screens */}
        <div className="hidden lg:flex flex-col flex-1 max-w-2xl text-white mt-8">
          {/* Top Logo */}
          <div className="flex items-center gap-4 mb-16">
            <div className="flex items-center justify-center bg-white rounded-lg p-2.5">
              <div className="flex items-end gap-0.5">
                <div className="w-2.5 h-6 bg-orange-500 rounded-sm"></div>
                <div className="w-2.5 h-8 bg-gray-800 rounded-sm"></div>
                <div className="w-2.5 h-12 bg-orange-500 rounded-sm"></div>
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-1">
                Smart-Project<span className="text-orange-500">-Manager</span>
              </h1>
              <p className="text-sm text-gray-300 font-medium">Gestion de Projets • Performance • Résultats</p>
            </div>
          </div>

          {/* Main Headline */}
          <h2 className="text-5xl font-extrabold tracking-tight mb-6 leading-tight">
            Pilotez vos projets <br />
            <span className="text-orange-500">avec efficacité</span>
          </h2>
          
          <p className="text-lg text-gray-300 mb-12 max-w-lg leading-relaxed">
            La solution intelligente de gestion de projets pour les administrations, les entreprises publiques et les PME.
          </p>

          {/* Feature Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-auto">
            <div className="flex flex-col items-center justify-center text-center p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors">
              <Calendar className="w-8 h-8 text-orange-500 mb-3" />
              <span className="text-xs font-semibold leading-tight">Planification<br />& Suivi</span>
            </div>
            <div className="flex flex-col items-center justify-center text-center p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors">
              <Users className="w-8 h-8 text-orange-500 mb-3" />
              <span className="text-xs font-semibold leading-tight">Collaboration<br />optimale</span>
            </div>
            <div className="flex flex-col items-center justify-center text-center p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors">
              <TrendingUp className="w-8 h-8 text-orange-500 mb-3" />
              <span className="text-xs font-semibold leading-tight">Résultats<br />mesurables</span>
            </div>
            <div className="flex flex-col items-center justify-center text-center p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors">
              <ShieldCheck className="w-8 h-8 text-orange-500 mb-3" />
              <span className="text-xs font-semibold leading-tight">Sécurité &<br />Fiabilité</span>
            </div>
          </div>

          {/* Bottom Footer */}
          <div className="mt-16 pt-8 border-t border-white/10 flex items-center justify-between text-sm text-gray-400">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-2"><Shield className="w-4 h-4" /> Sécurisé</span>
              <span className="flex items-center gap-2"><Headphones className="w-4 h-4" /> Support 24/7</span>
            </div>
            <span>© 2024 Smart-Project-Manager — Tous droits réservés</span>
          </div>
        </div>

        {/* Right Column (Auth Form) */}
        <div className="w-full max-w-[440px] flex-shrink-0">
          {children}
        </div>

      </div>
    </div>
  )
}
