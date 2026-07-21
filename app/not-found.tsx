import Link from 'next/link'
import { LayoutDashboard } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#1E3A5F] text-white flex flex-col items-center justify-center p-4">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-12 h-12 bg-[#16A34A] rounded-xl flex items-center justify-center shadow-lg">
          <LayoutDashboard className="text-white w-7 h-7" />
        </div>
        <span className="font-bold text-3xl tracking-tight text-white">ProjetPilote</span>
      </div>
      
      <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center">404 — Page introuvable</h1>
      <p className="text-blue-200 text-lg mb-8 text-center max-w-md">
        Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
      </p>
      
      <Link 
        href="/" 
        className="bg-white text-[#1E3A5F] px-8 py-3 rounded-lg font-bold hover:bg-slate-100 transition-colors shadow-lg"
      >
        Retour à l'accueil
      </Link>
    </div>
  )
}
