import Link from 'next/link'
import {
  ArrowLeft,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CircleDollarSign,
  FolderKanban,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react'
import styles from './auth.module.css'

const highlights = [
  { icon: CalendarDays, label: 'Planification', value: 'Maîtrisée' },
  { icon: Users, label: 'Collaboration', value: 'Fluidifiée' },
  { icon: TrendingUp, label: 'Performance', value: 'Mesurable' },
]

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className={styles.authPage}>
      <div className={styles.ambientOne} aria-hidden="true" />
      <div className={styles.ambientTwo} aria-hidden="true" />
      <div className={styles.authGrid} aria-hidden="true" />

      <section className={styles.storyPanel}>
        <div className={styles.storyInner}>
          <header className={styles.storyHeader}>
            <Link href="/" className={styles.brand} aria-label="Smart-Project-Manager — Accueil">
              <span className={styles.logoMark} aria-hidden="true"><span /><span /><span /></span>
              <span className={styles.brandCopy}>
                <strong>Smart-Project-<b>Manager</b></strong>
                <small>Gestion de projets · Performance · Résultats</small>
              </span>
            </Link>
            <Link href="/" className={styles.backHome}><ArrowLeft size={15} /> Accueil</Link>
          </header>

          <div className={styles.storyContent}>
            <span className={styles.kicker}><span /> L’espace de pilotage de vos équipes</span>
            <h1>Pilotez vos projets<br /><em>avec efficacité.</em></h1>
            <p>Une vision claire de vos budgets, de vos délais et de vos résultats — pour décider plus vite et agir au bon moment.</p>

            <div className={styles.previewCard}>
              <div className={styles.previewTopbar}>
                <span className={styles.miniBrand}><BriefcaseBusiness size={12} /> Demo TSBC</span>
                <span className={styles.liveStatus}><span /> Données à jour</span>
              </div>
              <div className={styles.previewBody}>
                <div className={styles.previewSidebar}>
                  <span className={styles.activeNav}><BarChart3 size={12} /></span>
                  <span><FolderKanban size={12} /></span>
                  <span><CircleDollarSign size={12} /></span>
                </div>
                <div className={styles.previewMain}>
                  <div className={styles.previewHeading}>
                    <span><small>VUE CONSOLIDÉE</small><strong>Portefeuille de projets</strong></span>
                    <span className={styles.period}>Ce trimestre</span>
                  </div>
                  <div className={styles.previewMetrics}>
                    <span><small>Projets actifs</small><strong>12</strong></span>
                    <span><small>Budget alloué</small><strong>1,8 Md</strong></span>
                    <span><small>CPI moyen</small><strong className={styles.positive}>1.03</strong></span>
                  </div>
                  <div className={styles.miniChart}>
                    <div className={styles.chartLines} />
                    <svg viewBox="0 0 380 80" preserveAspectRatio="none" aria-hidden="true">
                      <defs><linearGradient id="authChartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff7417" stopOpacity=".28" /><stop offset="100%" stopColor="#ff7417" stopOpacity="0" /></linearGradient></defs>
                      <path d="M0,70 C35,68 45,52 78,55 C118,59 126,34 164,40 C200,46 219,24 255,29 C301,35 329,9 380,12 L380,80 L0,80Z" fill="url(#authChartFill)" />
                      <path d="M0,70 C35,68 45,52 78,55 C118,59 126,34 164,40 C200,46 219,24 255,29 C301,35 329,9 380,12" fill="none" stroke="#ff7417" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.highlightGrid}>
              {highlights.map(({ icon: Icon, label, value }) => (
                <div className={styles.highlight} key={label}>
                  <span><Icon size={17} /></span>
                  <p><small>{label}</small><strong>{value}</strong></p>
                  <Check size={13} />
                </div>
              ))}
            </div>
          </div>

          <footer className={styles.storyFooter}>
            <span><ShieldCheck size={15} /> Connexion sécurisée</span>
            <span>© 2026 Smart-Project-Manager</span>
          </footer>
        </div>
      </section>

      <section className={styles.formPanel}>
        <div className={styles.mobileHeader}>
          <Link href="/" className={styles.brand}>
            <span className={styles.logoMark} aria-hidden="true"><span /><span /><span /></span>
            <span className={styles.brandCopy}><strong>Smart-Project-<b>Manager</b></strong></span>
          </Link>
        </div>
        <div className={styles.formSlot}>{children}</div>
        <div className={styles.formAssurance}>
          <ShieldCheck size={14} /> Vos données sont protégées et chiffrées
        </div>
      </section>
    </main>
  )
}
