import { BriefcaseBusiness, Calendar, Users, TrendingUp, ShieldCheck, Heart, Shield, Headphones } from 'lucide-react'
import ScaleWrapper from './ScaleWrapper'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ScaleWrapper>
      <div className="relative z-10 w-full max-w-[1400px] mx-auto flex flex-row items-center justify-between p-6 md:p-8 lg:p-12 gap-8 lg:gap-12 h-full">
        
        {/* Left Column (Text & Features) - Always visible */}
        <div className="flex flex-col flex-1 max-w-2xl text-white py-4 h-full max-h-[750px] justify-center">
          {/* Top Logo */}
          <div className="flex items-center gap-4 mb-8 lg:mb-12">
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
          <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight mb-4 lg:mb-6 leading-tight">
            Pilotez vos projets <br />
            <span className="text-orange-500">avec efficacité</span>
          </h2>
          
          <p className="text-base lg:text-lg text-gray-300 mb-8 lg:mb-12 max-w-lg leading-relaxed">
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
          <div className="mt-12 lg:mt-16 pt-6 lg:pt-8 border-t border-white/10 flex items-center justify-between text-sm text-gray-400">
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
    </ScaleWrapper>
  )
}
