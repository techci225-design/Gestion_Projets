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

// =======================
// TESTS
// =======================

const tasks = [
  { id: '1.1', parent_id: '1', task_type: 'TASK', date_start: '2026-09-01', date_end: '2026-09-30' },
  { id: '1.2', parent_id: '1', task_type: 'TASK', date_start: '2026-08-17', date_end: '2026-08-30' },
  { id: '1', parent_id: null, task_type: 'SUMMARY', date_start: '2026-08-17', date_end: '2026-09-30' },
  { id: '2.1', parent_id: '2', task_type: 'TASK', date_start: '2026-09-01', date_end: '2027-09-30' }, // span 2 years
  { id: '3.1', parent_id: '3', task_type: 'TASK', date_start: '2026-01-01', date_end: '2026-02-01' }
];

const ptbas = [
  { wbs_task_id: '1.1', fiscal_year: 2026, budget_planned: 5000 },
  { wbs_task_id: '1.2', fiscal_year: 2026, budget_planned: 8000 },
  { wbs_task_id: '2.1', fiscal_year: 2026, budget_planned: 5000 },
  { wbs_task_id: '2.1', fiscal_year: 2027, budget_planned: 8000 },
  { wbs_task_id: '3.1', fiscal_year: 2027, budget_planned: 1000 } // Out of bounds
];

function logTest(name, expected, actual, suffix = '') {
  const pass = Math.abs(expected - actual) < 0.01;
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name}: Expected ${expected.toFixed(2)}, Got ${actual.toFixed(2)} ${suffix}`);
}

console.log("--- TEST 1: Avant le début ---");
let res = calculateTaskPV('2026-08-31', tasks[0], ptbas);
logTest('PV au 31/08 (Task 1.1)', 0, res.pv);

console.log("--- TEST 2: Exactement à date_start ---");
res = calculateTaskPV('2026-09-01', tasks[0], ptbas);
logTest('PV au 01/09 (Task 1.1)', 0, res.pv);

console.log("--- TEST 3: Milieu d'une tâche ---");
res = calculateTaskPV('2026-09-15', tasks[0], ptbas);
// Total days = 29. Elapsed = 14. 5000 * (14/29) = 2413.79
logTest('PV au 15/09 (Task 1.1)', 5000 * (14/29), res.pv);

console.log("--- TEST 4: Exactement à date_end ---");
res = calculateTaskPV('2026-09-30', tasks[0], ptbas);
logTest('PV au 30/09 (Task 1.1)', 5000, res.pv);

console.log("--- TEST 5: Après date_end ---");
res = calculateTaskPV('2026-10-01', tasks[0], ptbas);
logTest('PV au 01/10 (Task 1.1)', 5000, res.pv);

console.log("--- TEST 6: Tâche sur une seule année (1.1 + 1.2) ---");
let resProj = calculateProjectPV('2026-09-30', [tasks[0], tasks[1]], ptbas);
logTest('Project PV au 30/09', 13000, resProj.pv); // 5000 + 8000

console.log("--- TEST 7: Tâche traversant deux exercices ---");
// 2026 segment: 01/09/2026 to 31/12/2026 (121 days). Budget = 5000
// 2027 segment: 01/01/2027 to 30/09/2027 (272 days). Budget = 8000
res = calculateTaskPV('2026-12-31', tasks[3], ptbas);
logTest('Task 2.1 at end of 2026', 5000, res.pv);

res = calculateTaskPV('2027-09-30', tasks[3], ptbas);
logTest('Task 2.1 at end of 2027', 13000, res.pv);

console.log("--- TEST 8: Tâche sans PTBA ---");
res = calculateTaskPV('2026-09-30', { id: '99', task_type: 'TASK', date_start: '2026-09-01', date_end: '2026-09-30' }, ptbas);
logTest('Tâche 99', 0, res.pv);

console.log("--- TEST 9: PTBA hors période WBS ---");
res = calculateTaskPV('2026-12-31', tasks[4], ptbas);
console.log("Warnings for Task 3.1:", res.warnings);
logTest('Tâche 3.1 avec PTBA incohérent', 0, res.pv);

console.log("--- TEST 10: SUMMARY sans double comptage ---");
// Project PV with SUMMARY included should equal PV of only TASKs
resProj = calculateProjectPV('2026-09-30', [tasks[0], tasks[1], tasks[2]], ptbas);
logTest('Project PV ignores SUMMARY', 13000, resProj.pv);

