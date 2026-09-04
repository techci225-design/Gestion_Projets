import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Activity,
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  FileChartColumn,
  FolderKanban,
  Gauge,
  LayoutDashboard,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react'
import AuthHashHandler from '@/components/AuthHashHandler'
import { createClient } from '@/lib/supabase/server'
import styles from './home.module.css'

const benefits = [
  {
    icon: CalendarDays,
    title: 'Planification & Suivi',
    text: 'Structurez chaque étape et gardez une vision claire de l’avancement.',
  },
  {
    icon: Users,
    title: 'Collaboration optimale',
    text: 'Alignez les équipes, les partenaires et les décideurs au même endroit.',
  },
  {
    icon: TrendingUp,
    title: 'Résultats mesurables',
    text: 'Transformez vos données projet en décisions rapides et documentées.',
  },
  {
    icon: ShieldCheck,
    title: 'Sécurité & Fiabilité',
    text: 'Protégez vos données et conservez une traçabilité complète des actions.',
  },
]

const modules = [
  { icon: Target, title: 'Cadre logique', text: 'Objectifs, résultats, indicateurs et sources de vérification réunis.' },
  { icon: CalendarDays, title: 'PTBA & planning', text: 'Planification annuelle, tâches, jalons et suivi des échéances.' },
  { icon: CircleDollarSign, title: 'Budget multi-devise', text: 'Budgets, décaissements et consommation financière en temps réel.' },
  { icon: Activity, title: 'Suivi EVM', text: 'CPI, SPI, courbes en S et alertes de performance automatisées.' },
  { icon: BriefcaseBusiness, title: 'Passation des marchés', text: 'Contrats, prestataires, étapes de validation et pièces associées.' },
  { icon: FileChartColumn, title: 'Rapports institutionnels', text: 'Des rapports structurés et prêts à partager avec les parties prenantes.' },
]

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams

  if (params.code && typeof params.code === 'string') {
    redirect(`/api/auth/callback?code=${params.code}`)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const workspaceHref = user ? '/projects' : '/register'

  return (
    <main className={styles.page}>
      <AuthHashHandler />

      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.gridPattern} aria-hidden="true" />

        <header className={styles.header}>
          <Link href="/" className={styles.brand} aria-label="Smart-Project-Manager — Accueil">
            <span className={styles.logoMark} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span className={styles.brandName}>Smart-Project-<strong>Manager</strong></span>
          </Link>

          <nav className={styles.navigation} aria-label="Navigation principale">
            <Link href="#fonctionnalites">Fonctionnalités</Link>
            <Link href="#solutions">Solutions</Link>
            <Link href="#plateforme">Plateforme</Link>
            <Link href="#contact">Contact</Link>
          </nav>

          <div className={styles.headerActions}>
            <Link href={user ? '/projects' : '/login'} className={styles.loginLink}>
              {user ? 'Tableau de bord' : 'Se connecter'}
            </Link>
            <Link href={workspaceHref} className={styles.headerCta}>
              {user ? 'Accéder à mon espace' : 'Demander une démo'}
              <ArrowRight size={17} />
            </Link>
          </div>

          <span className={styles.mobileMenu} aria-hidden="true"><Menu size={23} /></span>
        </header>

        <div className={styles.heroContent}>
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}>
              <Sparkles size={15} />
              Le pilotage de projet, enfin maîtrisé
            </div>
            <h1>
              Pilotez vos projets
              <span>avec efficacité</span>
            </h1>
            <p className={styles.heroLead}>
              Centralisez la planification, la collaboration et le suivi des performances sur une plateforme simple, sécurisée et conçue pour vos équipes.
            </p>
            <div className={styles.heroActions}>
              <Link href={workspaceHref} className={styles.primaryCta}>
                {user ? 'Ouvrir mon tableau de bord' : 'Démarrer gratuitement'}
                <ArrowRight size={19} />
              </Link>
              <Link href="#plateforme" className={styles.secondaryCta}>
                <span className={styles.playIcon}>▶</span>
                Voir la plateforme
              </Link>
            </div>
            <div className={styles.trustLine}>
              <div className={styles.avatarStack} aria-hidden="true">
                <span>AM</span><span>KB</span><span>DS</span>
              </div>
              <p><strong>Une vision partagée</strong><br />pour les administrations, entreprises publiques et PME</p>
            </div>
          </div>

          <div className={styles.productStage} id="plateforme">
            <div className={styles.dashboardWindow}>
              <div className={styles.appSidebar}>
                <div className={styles.appBrand}>
                  <span className={styles.appLogo}><BriefcaseBusiness size={13} /></span>
                  <span>Demo TSBC</span>
                </div>
                <div className={styles.appNav}>
                  <span className={styles.appNavActive}><LayoutDashboard size={13} /> Tableau de bord</span>
                  <span><FolderKanban size={13} /> Liste des projets</span>
                  <span><BarChart3 size={13} /> Rapports</span>
                </div>
                <div className={styles.appNavDivider} />
                <div className={styles.appNav}><span><Gauge size={13} /> Paramètres</span></div>
                <div className={styles.appProfile}>
                  <span className={styles.profileDot}>B</span>
                  <span><b>bayokassim4</b><small>Mon profil</small></span>
                </div>
              </div>

              <div className={styles.appMain}>
                <div className={styles.appTopbar}>
                  <strong>Tableau de bord — Portefeuille</strong>
                  <div className={styles.mockSearch}><Search size={12} /> Rechercher...</div>
                  <span className={styles.topAvatar}>B</span>
                </div>
                <div className={styles.appBody}>
                  <div className={styles.dashboardTitle}>
                    <div><small>VUE D’ENSEMBLE</small><h2>Vue consolidée du portefeuille</h2></div>
                    <span className={styles.liveBadge}><span /> Données actualisées</span>
                  </div>

                  <div className={styles.kpiGrid}>
                    <div className={styles.kpiCard}><span>Projets actifs</span><strong>12</strong><small>+2 ce trimestre</small></div>
                    <div className={styles.kpiCard}><span>Budget alloué</span><strong>1,8 Md</strong><small>FCFA</small></div>
                    <div className={styles.kpiCard}><span>Décaissements</span><strong>742 M</strong><small>41 % consommé</small></div>
                    <div className={styles.kpiCard}><span>CPI moyen</span><strong className={styles.goodValue}>1.03</strong><small>Performance saine</small></div>
                  </div>

                  <div className={styles.dashboardGrid}>
                    <div className={styles.performanceCard}>
                      <div className={styles.cardHeading}><strong>Performance du portefeuille</strong><span>6 derniers mois</span></div>
                      <div className={styles.chart} aria-label="Graphique décoratif de performance">
                        <div className={styles.chartGrid} />
                        <svg viewBox="0 0 420 120" preserveAspectRatio="none" aria-hidden="true">
                          <defs>
                            <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#fe6a1b" stopOpacity=".28" />
                              <stop offset="100%" stopColor="#fe6a1b" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          <path d="M0,104 C45,97 55,70 98,76 C140,83 150,48 198,53 C246,57 257,24 304,36 C350,47 370,14 420,10 L420,120 L0,120Z" fill="url(#chartFill)" />
                          <path d="M0,104 C45,97 55,70 98,76 C140,83 150,48 198,53 C246,57 257,24 304,36 C350,47 370,14 420,10" fill="none" stroke="#fe6a1b" strokeWidth="4" strokeLinecap="round" />
                        </svg>
                        <div className={styles.chartLabels}><span>Avr.</span><span>Mai</span><span>Juin</span><span>Juil.</span><span>Août</span><span>Sept.</span></div>
                      </div>
                    </div>

                    <div className={styles.attentionCard}>
                      <div className={styles.cardHeading}><strong>À surveiller</strong><span className={styles.alertCount}>2 alertes</span></div>
                      <div className={styles.projectAlert}>
                        <span className={styles.projectCode}>STD-26</span>
                        <div><strong>Construction de Stade</strong><small>CPI 0.45 · Budget sous tension</small></div>
                        <ChevronRight size={15} />
                      </div>
                      <div className={styles.projectAlert}>
                        <span className={`${styles.projectCode} ${styles.blueCode}`}>EDU-08</span>
                        <div><strong>Écoles numériques</strong><small>Échéance dans 8 jours</small></div>
                        <ChevronRight size={15} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.floatingMetric}>
              <span className={styles.metricIcon}><TrendingUp size={17} /></span>
              <span><small>Avancement global</small><strong>68%</strong></span>
              <span className={styles.metricDelta}>+8%</span>
            </div>

            <div className={styles.floatingProject}>
              <span className={styles.projectIcon}><FolderKanban size={17} /></span>
              <span><small>Nouveau rapport</small><strong>Portefeuille T3</strong></span>
              <span className={styles.checkIcon}><Check size={13} /></span>
            </div>
          </div>
        </div>

        <div className={styles.benefitGrid}>
          {benefits.map(({ icon: Icon, title, text }) => (
            <article className={styles.benefitCard} key={title}>
              <span className={styles.benefitIcon}><Icon size={25} /></span>
              <div><h3>{title}</h3><p>{text}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.credibility}>
        <p>Une plateforme pensée pour les organisations qui transforment le terrain</p>
        <div className={styles.organizations}>
          <span><Building2 size={22} /> Administrations</span>
          <span><BriefcaseBusiness size={22} /> Entreprises publiques</span>
          <span><Users size={22} /> Équipes projets</span>
          <span><ShieldCheck size={22} /> Partenaires techniques</span>
        </div>
      </section>

      <section className={styles.modulesSection} id="fonctionnalites">
        <div className={styles.sectionIntro}>
          <span className={styles.sectionLabel}>TOUT VOTRE PROJET, AU MÊME ENDROIT</span>
          <h2>De la stratégie au terrain,<br /><span>gardez une longueur d’avance.</span></h2>
          <p>Smart-Project-Manager relie vos données financières, opérationnelles et stratégiques dans un environnement unique et lisible.</p>
        </div>
        <div className={styles.moduleGrid}>
          {modules.map(({ icon: Icon, title, text }) => (
            <article className={styles.moduleCard} key={title}>
              <span className={styles.moduleIcon}><Icon size={23} /></span>
              <h3>{title}</h3>
              <p>{text}</p>
              <Link href={workspaceHref}>Découvrir <ArrowRight size={15} /></Link>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.solutionSection} id="solutions">
        <div className={styles.solutionVisual}>
          <div className={styles.projectPanel}>
            <div className={styles.panelTop}><span>Vos projets</span><span className={styles.panelPill}>12 actifs</span></div>
            <div className={styles.projectRow}><span className={styles.rowIcon}>ST</span><span><strong>Construction de Stade</strong><small>Budget · 75 000 000 $</small></span><span className={styles.progressValue}>68%</span></div>
            <div className={styles.progressTrack}><span style={{ width: '68%' }} /></div>
            <div className={styles.projectRow}><span className={`${styles.rowIcon} ${styles.greenIcon}`}>EN</span><span><strong>Écoles numériques</strong><small>Budget · 820 000 000 FCFA</small></span><span className={styles.progressValue}>84%</span></div>
            <div className={styles.progressTrack}><span style={{ width: '84%' }} /></div>
            <div className={styles.projectRow}><span className={`${styles.rowIcon} ${styles.blueIcon}`}>EA</span><span><strong>Accès à l’eau potable</strong><small>Budget · 1 250 000 EUR</small></span><span className={styles.progressValue}>42%</span></div>
            <div className={styles.progressTrack}><span style={{ width: '42%' }} /></div>
          </div>
        </div>
        <div className={styles.solutionCopy}>
          <span className={styles.sectionLabel}>UNE VISION CONSOLIDÉE</span>
          <h2>Décidez avec des données fiables, pas avec des intuitions.</h2>
          <p>Visualisez immédiatement les projets performants, les écarts budgétaires et les actions qui nécessitent votre attention.</p>
          <ul>
            <li><Check size={17} /> Portefeuille multi-projets et multi-devise</li>
            <li><Check size={17} /> Indicateurs CPI et SPI calculés automatiquement</li>
            <li><Check size={17} /> Historique complet et données exportables</li>
          </ul>
          <Link href={workspaceHref} className={styles.textCta}>Explorer la solution <ArrowRight size={17} /></Link>
        </div>
      </section>

      <section className={styles.finalCta} id="contact">
        <div>
          <span className={styles.ctaKicker}>PRÊT À PASSER À L’ÉTAPE SUIVANTE ?</span>
          <h2>Donnez à vos projets<br />la visibilité qu’ils méritent.</h2>
          <p>Créez votre espace et commencez à piloter vos projets avec une vision claire dès aujourd’hui.</p>
        </div>
        <div className={styles.finalActions}>
          <Link href={workspaceHref} className={styles.primaryCta}>Commencer maintenant <ArrowRight size={19} /></Link>
          {!user && <Link href="/login" className={styles.ctaLogin}>J’ai déjà un compte</Link>}
        </div>
      </section>

      <footer className={styles.footer}>
        <Link href="/" className={styles.brand}>
          <span className={styles.logoMark} aria-hidden="true"><span /><span /><span /></span>
          <span className={styles.brandName}>Smart-Project-<strong>Manager</strong></span>
        </Link>
        <p>La plateforme de pilotage des projets à haute exigence.</p>
        <span>© 2026 TSBC. Tous droits réservés.</span>
      </footer>
    </main>
  )
}
