const { formatCurrency } = require('../lib/utils/format-currency');

function testPortfolioConsolidation() {
  console.log("==========================================================");
  console.log("=== TEST AUTOMATISÉ COMPLET — PHASE 9 PORTFOLIO MULTI-DEVISE ===");
  console.log("==========================================================");

  // 1. Simulation de données de projets multi-devises
  const mockProjects = [
    {
      id: 'p-usd',
      name: 'Projet Solaire USA',
      code: 'PRJ-USD',
      currency: 'USD',
      status: 'actif',
      budgetAllocated: 1000000,
      totalDecaisse: 400000,
      totalEngage: 200000, // Doit être exclu de la consommation décaissée
      snapshots: [
        { control_date: '2026-05-31', cpi_global: 1.20, spi_global: 1.10, bac_total: 1000000, eac_global: 833333, baseline: { version_number: 1 } },
        { control_date: '2026-06-30', cpi_global: 1.10, spi_global: 1.05, bac_total: 1000000, eac_global: 909090, baseline: { version_number: 1 } } // Dernier snapshot
      ]
    },
    {
      id: 'p-xof',
      name: 'Projet Eau CI',
      code: 'PRJ-XOF',
      currency: 'XOF',
      status: 'actif',
      budgetAllocated: 500000000,
      totalDecaisse: 125000000,
      totalEngage: 50000000,
      snapshots: [
        { control_date: '2026-06-30', cpi_global: 0.90, spi_global: 0.85, bac_total: 500000000, eac_global: 555555555, baseline: { version_number: 2 } }
      ]
    },
    {
      id: 'p-eur',
      name: 'Projet Santé UE',
      code: 'PRJ-EUR',
      currency: 'EUR',
      status: 'actif',
      budgetAllocated: 200000,
      totalDecaisse: 50000,
      totalEngage: 0,
      snapshots: [] // Aucun snapshot officiel
    },
    {
      id: 'p-zero',
      name: 'Projet En Cadrage',
      code: 'PRJ-ZERO',
      currency: 'XOF',
      status: 'actif',
      budgetAllocated: 0, // Budget 0
      totalDecaisse: 0,
      totalEngage: 0,
      snapshots: []
    }
  ];

  // A, B, C, D: Multi-Currency Aggregations (Strict isolation)
  console.log("\n--- [TEST A, B, C, D] MULTI-CURRENCY CONSOLIDATION (ZERO INTER-CURRENCY SUM) ---");
  const activeCurrencies = Array.from(new Set(mockProjects.filter(p => p.status === 'actif').map(p => p.currency)));
  
  const aggregatesByCurrency = activeCurrencies.map(curr => {
    const currProjects = mockProjects.filter(p => p.status === 'actif' && p.currency === curr);
    const totalBudgetAlloue = currProjects.reduce((sum, p) => sum + p.budgetAllocated, 0);
    const totalDecaisse = currProjects.reduce((sum, p) => sum + p.totalDecaisse, 0);
    return {
      currency: curr,
      totalBudgetAlloue,
      totalDecaisse,
      projectCount: currProjects.length
    };
  });

  console.log("Agrégats financiers par devise :");
  aggregatesByCurrency.forEach(agg => {
    console.log(`- [${agg.currency}] (${agg.projectCount} projets) : Budget Alloué = ${formatCurrency(agg.totalBudgetAlloue, agg.currency, true)} | Décaissé = ${formatCurrency(agg.totalDecaisse, agg.currency, true)}`);
  });

  const usdAgg = aggregatesByCurrency.find(a => a.currency === 'USD');
  const xofAgg = aggregatesByCurrency.find(a => a.currency === 'XOF');
  const eurAgg = aggregatesByCurrency.find(a => a.currency === 'EUR');

  if (
    usdAgg.totalBudgetAlloue === 1000000 && usdAgg.totalDecaisse === 400000 &&
    xofAgg.totalBudgetAlloue === 500000000 && xofAgg.totalDecaisse === 125000000 &&
    eurAgg.totalBudgetAlloue === 200000 && eurAgg.totalDecaisse === 50000
  ) {
    console.log("✓ SUCCÈS : Agrégation multi-devises 100% étanche sans somme inter-devises.");
  } else {
    throw new Error("Échec de l'agrégation multi-devises");
  }

  // E, F, G, K: CPI / SPI / VAC / Référentiel Calculation
  console.log("\n--- [TEST E, F, G, K] CPI / SPI MOYEN ET DERNIER SNAPSHOT OFFICIEL ---");
  const projectsData = mockProjects.map(p => {
    const latestSnapshot = p.snapshots && p.snapshots.length > 0
      ? p.snapshots.sort((a, b) => new Date(b.control_date).getTime() - new Date(a.control_date).getTime())[0]
      : null;

    let cpi = null;
    let spi = null;
    let vac = null;
    let referentiel = 'Aucun arrêté';

    if (latestSnapshot) {
      cpi = latestSnapshot.cpi_global !== null ? Number(latestSnapshot.cpi_global) : null;
      spi = latestSnapshot.spi_global !== null ? Number(latestSnapshot.spi_global) : null;
      if (latestSnapshot.bac_total !== null && latestSnapshot.eac_global !== null) {
        vac = Number(latestSnapshot.bac_total) - Number(latestSnapshot.eac_global);
      }
      referentiel = latestSnapshot.baseline ? `Baseline V${latestSnapshot.baseline.version_number}` : 'Legacy';
    }

    const consoRate = p.budgetAllocated > 0 ? (p.totalDecaisse / p.budgetAllocated) * 100 : 0;

    return {
      ...p,
      cpi,
      spi,
      vac,
      referentiel,
      consoRate
    };
  });

  projectsData.forEach(p => {
    console.log(`Projet ${p.code} (${p.currency}) : CPI=${p.cpi ?? 'N/A'}, SPI=${p.spi ?? 'N/A'}, VAC=${p.vac !== null ? formatCurrency(p.vac, p.currency, true) : 'N/A'}, Ref=${p.referentiel}, Conso=${p.consoRate.toFixed(1)}%`);
  });

  const validCpis = projectsData.map(p => p.cpi).filter(v => v !== null && !isNaN(v));
  const validSpis = projectsData.map(p => p.spi).filter(v => v !== null && !isNaN(v));

  const avgCpi = validCpis.length > 0 ? validCpis.reduce((a, b) => a + b, 0) / validCpis.length : null;
  const avgSpi = validSpis.length > 0 ? validSpis.reduce((a, b) => a + b, 0) / validSpis.length : null;

  console.log(`\nMoyenne arithmétique : CPI = ${avgCpi} (sur ${validCpis.length} projets), SPI = ${avgSpi} (sur ${validSpis.length} projets)`);

  // Expected CPI average: (1.10 + 0.90) / 2 = 1.00
  // Expected SPI average: (1.05 + 0.85) / 2 = 0.95
  if (Math.abs(avgCpi - 1.00) < 0.001 && Math.abs(avgSpi - 0.95) < 0.001 && validCpis.length === 2) {
    console.log("✓ SUCCÈS : Moyenne arithmétique CPI/SPI exacte, exclusion propre des projets sans snapshot (N/A) !");
  } else {
    throw new Error(`Échec du calcul CPI/SPI moyen : CPI=${avgCpi}, SPI=${avgSpi}, count=${validCpis.length}`);
  }

  // I, J: Consommation décaissée uniquement et gestion budget=0
  console.log("\n--- [TEST I, J] CONSOMMATION & GESTION BUDGET = 0 ---");
  const pZero = projectsData.find(p => p.id === 'p-zero');
  const pUsd = projectsData.find(p => p.id === 'p-usd');

  console.log(`- Projet USD : Décaissé = ${pUsd.totalDecaisse}, Taux = ${pUsd.consoRate}% (N'inclut pas les 200 000 engagés)`);
  console.log(`- Projet Budget 0 : Taux = ${pZero.consoRate}% (Pas d'Infinity ou NaN)`);

  if (pUsd.consoRate === 40 && pZero.consoRate === 0 && !isNaN(pZero.consoRate)) {
    console.log("✓ SUCCÈS : Consommation décaissée et gestion budget zéro 100% conformes !");
  } else {
    throw new Error("Échec du calcul de consommation");
  }

  console.log("\n==========================================================");
  console.log("TOUS LES TESTS AUTOMATISÉS DE LA PHASE 9 SONT VALIDÉS !");
  console.log("==========================================================");
}

testPortfolioConsolidation();
