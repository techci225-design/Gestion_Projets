const tasks = [
  { id: '1', parent_id: null, name: 'Préparation du projet', task_type: 'SUMMARY', status: 'IN_PROGRESS', responsible_user_id: null },
  { id: '1.1', parent_id: '1', name: 'Études préliminaires', task_type: 'TASK', status: 'COMPLETED', responsible_user_id: 'user1' },
  { id: '1.2', parent_id: '1', name: 'Études techniques', task_type: 'TASK', status: 'IN_PROGRESS', responsible_user_id: 'user2' },
  { id: '1.3', parent_id: '1', name: 'Validation', task_type: 'TASK', status: 'PLANNED', responsible_user_id: 'user1' }
];

let filterStatus = 'ALL';
let filterResponsible = 'ALL';

const nodeMatchesFilter = (task) => {
  if (filterStatus !== 'ALL' && task.status !== filterStatus) return false;
  if (filterResponsible !== 'ALL') {
    if (filterResponsible === 'UNASSIGNED' && task.responsible_user_id !== null) return false;
    if (filterResponsible !== 'UNASSIGNED' && task.responsible_user_id !== filterResponsible) return false;
  }
  return true;
};

const getFilteredTaskIds = () => {
  if (filterStatus === 'ALL' && filterResponsible === 'ALL') {
    return new Set(tasks.map(t => t.id));
  }
  const matched = new Set();
  const directMatches = tasks.filter(nodeMatchesFilter);
  
  directMatches.forEach(task => {
    let currentId = task.id;
    while (currentId) {
      matched.add(currentId);
      const parent = tasks.find(t => t.id === currentId);
      currentId = parent ? parent.parent_id : null;
    }
  });
  return matched;
};

const expandedNodes = new Set(tasks.map(t => t.id));

const isVisible = (task, filteredTaskIds) => {
  let current = task.parent_id;
  while (current) {
    if (!expandedNodes.has(current)) return false;
    const parent = tasks.find((t) => t.id === current);
    current = parent ? parent.parent_id : null;
  }
  return filteredTaskIds.has(task.id);
};

const printVisible = (testName) => {
  const filteredTaskIds = getFilteredTaskIds();
  const visibleTasks = tasks.filter(t => isVisible(t, filteredTaskIds));
  console.log(`\n--- ${testName} ---`);
  visibleTasks.forEach(t => {
    console.log(`${t.id} ${t.name} (Status: ${t.status}, Resp: ${t.responsible_user_id})`);
  });
};

// TEST 1 — AUCUN FILTRE
filterStatus = 'ALL';
filterResponsible = 'ALL';
printVisible('TEST 1 — AUCUN FILTRE');

// TEST 2 — FILTRE RESPONSABLE (user2)
filterStatus = 'ALL';
filterResponsible = 'user2';
printVisible('TEST 2 — FILTRE RESPONSABLE (user2)');

// TEST 3 — FILTRE STATUT (COMPLETED)
filterStatus = 'COMPLETED';
filterResponsible = 'ALL';
printVisible('TEST 3 — FILTRE STATUT (COMPLETED)');

// TEST 4 — STATUT + RESPONSABLE (PLANNED + user1)
filterStatus = 'PLANNED';
filterResponsible = 'user1';
printVisible('TEST 4 — STATUT + RESPONSABLE (PLANNED + user1)');

// TEST 5 & 6 — SUMMARY / HIERARCHY
// Tested implicitly in the above since parent '1' should show up whenever a child matches.

// Let's add a deeper hierarchy to verify TEST 6 deeply
tasks.push({ id: '1.1.1', parent_id: '1.1', name: 'Deep Task', task_type: 'TASK', status: 'BLOCKED', responsible_user_id: 'user3' });
expandedNodes.add('1.1.1');

filterStatus = 'BLOCKED';
filterResponsible = 'ALL';
printVisible('TEST 6 — DEEP HIERARCHY (BLOCKED)');
