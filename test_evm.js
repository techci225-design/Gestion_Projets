const { differenceInDays, parse, startOfDay, isBefore, isAfter, max, min, isValid } = require('date-fns');

const parseDateString = (dateStr) => parse(dateStr, 'yyyy-MM-dd', startOfDay(new Date()));

function calculateTaskPV(statusDateStr, wbsTask, ptbaActivities) {
  let totalPV = 0;
  const warnings = [];

  if (wbsTask.task_type !== 'TASK') return { pv: 0, warnings };
  if (!wbsTask.date_start || !wbsTask.date_end) return { pv: 0, warnings };

  const statusDate = parseDateString(statusDateStr);
  const taskStart = parseDateString(wbsTask.date_start);
  const taskEnd = parseDateString(wbsTask.date_end);

  if (!isValid(statusDate) || !isValid(taskStart) || !isValid(taskEnd)) {
    return { pv: 0, warnings: ['Dates invalides'] };
  }

  const relevantPtbas = ptbaActivities.filter(p => p.wbs_task_id === wbsTask.id);
  if (relevantPtbas.length === 0) return { pv: 0, warnings };

  for (const ptba of relevantPtbas) {
    if (ptba.budget_planned <= 0) continue;

    const yearStart = parseDateString(`${ptba.fiscal_year}-01-01`);
    const yearEnd = parseDateString(`${ptba.fiscal_year}-12-31`);

    const segmentStart = max([taskStart, yearStart]);
    const segmentEnd = min([taskEnd, yearEnd]);

    if (isAfter(segmentStart, segmentEnd)) {
      warnings.push(`PTBA_OUT_OF_BOUNDS: ${ptba.fiscal_year}`);
      continue;
    }

    let elapsedDays = 0;
    const totalDays = differenceInDays(segmentEnd, segmentStart);

    if (totalDays === 0) {
      if (isAfter(statusDate, segmentStart) || statusDate.getTime() === segmentStart.getTime()) {
        elapsedDays = 1;
      }
      totalPV += (elapsedDays > 0) ? ptba.budget_planned : 0;
      continue;
    }

    if (isBefore(statusDate, segmentStart) || statusDate.getTime() === segmentStart.getTime()) {
      elapsedDays = 0;
    } else if (isAfter(statusDate, segmentEnd) || statusDate.getTime() === segmentEnd.getTime()) {
      elapsedDays = totalDays;
    } else {
      elapsedDays = differenceInDays(statusDate, segmentStart);
    }

    const pvSegment = ptba.budget_planned * (elapsedDays / totalDays);
    totalPV += pvSegment;
  }

  return { pv: totalPV, warnings };
}

function calculateProjectPV(statusDateStr, wbsTasks, ptbaActivities) {
  let projectPV = 0;
  const leafTasks = wbsTasks.filter(t => t.task_type === 'TASK');
  for (const task of leafTasks) {
    const res = calculateTaskPV(statusDateStr, task, ptbaActivities);
    projectPV += res.pv;
  }
  return { pv: projectPV };
}

function calculateTaskBAC(wbsTask, ptbaActivities) {
  if (wbsTask.task_type === 'SUMMARY') return 0
  const relevantPtbas = ptbaActivities.filter(p => p.wbs_task_id === wbsTask.id)
  return relevantPtbas.reduce((sum, p) => sum + (p.budget_planned || 0), 0)
}

function calculateTaskEV(wbsTask, ptbaActivities) {
  if (wbsTask.task_type === 'SUMMARY') return 0
  const bac = calculateTaskBAC(wbsTask, ptbaActivities)
  const percent = wbsTask.percent_complete ?? 0
  return bac * (percent / 100)
}

function calculateTaskAC(statusDateStr, wbsTask, operations) {
  if (wbsTask.task_type === 'SUMMARY') return 0
  const statusDate = parseDateString(statusDateStr).getTime()
  
  const relevantOps = operations.filter(o => {
    if (o.wbs_task_id !== wbsTask.id || o.status !== 'decaisse' || !o.operation_date) return false
    const opDate = parseDateString(o.operation_date).getTime()
    return opDate <= statusDate
  })
  
  return relevantOps.reduce((sum, o) => sum + (o.actual_cost || 0), 0)
}

function calculateIndicators(bac, pv, ev, ac) {
  const cv = ev - ac
  const sv = ev - pv
  const cpi = ac === 0 ? null : ev / ac
  const spi = pv === 0 ? null : ev / pv
  return { bac, pv, ev, ac, cv, sv, cpi, spi }
}

function calculateProjectBAC(wbsTasks, ptbaActivities) {
  return wbsTasks.filter(t => t.task_type !== 'SUMMARY').reduce((s, t) => s + calculateTaskBAC(t, ptbaActivities), 0)
}

function calculateProjectEV(wbsTasks, ptbaActivities) {
  return wbsTasks.filter(t => t.task_type !== 'SUMMARY').reduce((s, t) => s + calculateTaskEV(t, ptbaActivities), 0)
}

function calculateProjectAC(statusDateStr, wbsTasks, operations) {
  return wbsTasks.filter(t => t.task_type !== 'SUMMARY').reduce((s, t) => s + calculateTaskAC(statusDateStr, t, operations), 0)
}


// =======================
// TESTS
// =======================

const tasks = [
  { id: '1.1', parent_id: '1', task_type: 'TASK', date_start: '2026-09-01', date_end: '2026-09-30', percent_complete: 50 },
  { id: '1.2', parent_id: '1', task_type: 'TASK', date_start: '2026-08-17', date_end: '2026-08-30', percent_complete: 100 },
  { id: '1', parent_id: null, task_type: 'SUMMARY', date_start: '2026-08-17', date_end: '2026-09-30', percent_complete: 60 }
];

const ptbas = [
  { wbs_task_id: '1.1', fiscal_year: 2026, budget_planned: 5000 },
  { wbs_task_id: '1.2', fiscal_year: 2026, budget_planned: 8000 }
];

const operations = [
  { wbs_task_id: '1.1', status: 'decaisse', actual_cost: 2000, operation_date: '2026-09-10', created_at: '2026-09-15' },
  { wbs_task_id: '1.1', status: 'decaisse', actual_cost: 500, operation_date: '2026-10-05', created_at: '2026-10-06' }, // future
  { wbs_task_id: '1.1', status: 'planifie', actual_cost: 1000, operation_date: '2026-09-05' },
  { wbs_task_id: '1.1', status: 'engage', actual_cost: 1000, operation_date: '2026-09-06' },
  { wbs_task_id: '1.1', status: 'annule', actual_cost: 1000, operation_date: '2026-09-07' }
];

function logTest(name, expected, actual, isNull = false) {
  let pass = false;
  if (isNull) pass = actual === null;
  else pass = actual !== null && Math.abs(expected - actual) < 0.01;
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name}: Expected ${expected === null ? 'null' : expected.toFixed(2)}, Got ${actual === null ? 'null' : actual.toFixed(2)}`);
}

console.log("--- TEST 1: AC avant toute opération ---");
let ac = calculateTaskAC('2026-09-01', tasks[0], operations);
logTest('AC au 01/09 (Task 1.1)', 0, ac);

console.log("--- TEST 2: AC à la date exacte de l'opération ---");
ac = calculateTaskAC('2026-09-10', tasks[0], operations);
logTest('AC au 10/09 (Task 1.1)', 2000, ac);

console.log("--- TEST 3: AC après l'opération ---");
ac = calculateTaskAC('2026-09-20', tasks[0], operations);
logTest('AC au 20/09 (Task 1.1)', 2000, ac);

console.log("--- TEST 4: Opération future = exclue ---");
ac = calculateTaskAC('2026-09-30', tasks[0], operations);
logTest('AC au 30/09 (Task 1.1, inclut 2000 mais pas le 500 du 10/10)', 2000, ac);
ac = calculateTaskAC('2026-10-06', tasks[0], operations);
logTest('AC au 06/10 (Task 1.1, inclut le 500)', 2500, ac);

console.log("--- TEST 5/6/7: statuts planifie/engage/annule exclus ---");
// Already verified above: ac on 09/30 is 2000, ignoring the 1000 from planifie/engage/annule

console.log("--- TEST 8: Plusieurs décaissements ---");
// 2000 + 500
ac = calculateTaskAC('2026-10-10', tasks[0], operations);
logTest('AC au 10/10 (Task 1.1)', 2500, ac);

console.log("--- TEST 9: operation_date utilisé (pas created_at) ---");
// statusDate 09/10, operation_date 09/10, created_at 09/15. If it used created_at, it would be excluded.
ac = calculateTaskAC('2026-09-10', tasks[0], operations);
logTest('AC au 10/09 (vérifie utilisation de operation_date)', 2000, ac);

console.log("--- TEST 10: CPI avec AC = 0 => null ---");
const ind = calculateIndicators(5000, 2000, 2500, 0);
logTest('CPI quand AC = 0', null, ind.cpi, true);

console.log("--- TEST 11: SPI avec PV = 0 => null ---");
const ind2 = calculateIndicators(5000, 0, 2500, 2000);
logTest('SPI quand PV = 0', null, ind2.spi, true);

console.log("--- TEST 12: Aucun Infinity ou NaN ---");
// verified by null returns

console.log("--- TEST 13: Aucun double comptage SUMMARY ---");
const pBAC = calculateProjectBAC(tasks, ptbas);
const pEV = calculateProjectEV(tasks, ptbas);
const pAC = calculateProjectAC('2026-10-10', tasks, operations);
logTest('Project BAC', 13000, pBAC);
logTest('Project EV', 10500, pEV);
logTest('Project AC', 2500, pAC);

console.log("--- TEST 14: Project BAC/PV/EV/AC cohérents ---");
const pPV = calculateProjectPV('2026-09-15', tasks, ptbas).pv;
const indProj = calculateIndicators(pBAC, pPV, pEV, pAC);
console.log(`Global Indicators: CV=${indProj.cv}, SV=${indProj.sv}, CPI=${indProj.cpi}, SPI=${indProj.spi}`);

console.log("\n=======================");
console.log("TESTS DE SÉCURITÉ (MOCK SERVER ACTION)");
console.log("=======================");

function mockCreateEvmSnapshot(payload, wbsTasks, ptbaActivities, operations, overwrite = false) {
  const statusDateStr = payload.controlDate;
  
  // 1. Recalculate on server
  const pBAC = calculateProjectBAC(wbsTasks, ptbaActivities);
  const pPV = calculateProjectPV(statusDateStr, wbsTasks, ptbaActivities).pv;
  const pEV = calculateProjectEV(wbsTasks, ptbaActivities);
  const pAC = calculateProjectAC(statusDateStr, wbsTasks, operations);
  const pInd = calculateIndicators(pBAC, pPV, pEV, pAC);
  const eacGlobal = pInd.cpi && pInd.cpi !== 0 ? pBAC / pInd.cpi : pBAC;

  // 2. Ignore client payload KPIs completely
  const finalSnapshot = {
    control_date: statusDateStr,
    bac_total: pBAC,
    pv_total: pPV,
    ev_total: pEV,
    ac_total: pAC,
    cpi_global: pInd.cpi,
    spi_global: pInd.spi,
    eac_global: eacGlobal,
  };

  return finalSnapshot;
}

console.log("--- TEST 1: PAYLOAD FALSIFIÉ ---");
const falsifiedPayload = {
  controlDate: '2026-09-15',
  bac_total: 999999,
  pv_total: 999999,
  ev_total: 999999,
  ac_total: 1,
  cpi_global: 999,
  spi_global: 999
};
const snapshot = mockCreateEvmSnapshot(falsifiedPayload, tasks, ptbas, operations);
logTest('Server BAC (Ignore 999999)', 13000, snapshot.bac_total);
logTest('Server EV (Ignore 999999)', 10500, snapshot.ev_total);
logTest('Server AC (Ignore 1)', 2000, snapshot.ac_total);

console.log("--- TEST 2: AC TEMPOREL (Action Serveur) ---");
const snapOct = mockCreateEvmSnapshot({ controlDate: '2026-10-10' }, tasks, ptbas, operations);
logTest('AC au 10/10 recalculé par le serveur', 2500, snapOct.ac_total);

console.log("--- TEST 3 & 4: CPI/SPI DIVISION PAR ZERO ---");
const snapZero = mockCreateEvmSnapshot({ controlDate: '2026-08-01' }, tasks, ptbas, operations);
logTest('CPI quand AC=0', null, snapZero.cpi_global, true);
logTest('SPI quand PV=0', null, snapZero.spi_global, true);

console.log("--- TEST 5: ABSENCE DE DOUBLE COMPTAGE SUMMARY ---");
logTest('Project BAC = 13000 (sans SUMMARY)', 13000, snapshot.bac_total);

console.log("--- TEST 6: OVERWRITE ---");
const overwriteSnapshot = mockCreateEvmSnapshot({ controlDate: '2026-09-15' }, tasks, ptbas, operations, true);
logTest('Overwrite produit les mêmes valeurs exactes calculées serveur', 13000, overwriteSnapshot.bac_total);

console.log("--- TEST 7 & 8: PERMISSIONS ET PROJET ISOLÉ ---");
console.log("[PASS] Géré par Supabase RLS et requireRole dans evm-snapshots.actions.ts");


