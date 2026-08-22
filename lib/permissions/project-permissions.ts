export type ProjectRole = 
  | 'OWNER'
  | 'PROJECT_MANAGER'
  | 'ACCOUNTANT'
  | 'CONSULTANT'
  | 'FUNDER_READONLY';

export type ProjectAction = 
  | 'view_project'
  | 'edit_project'
  | 'view_tasks'
  | 'create_tasks'
  | 'edit_tasks'
  | 'delete_tasks'
  | 'manage_team'
  | 'manage_roles'
  | 'invite_members'
  | 'view_budget'
  | 'edit_budget'
  | 'view_reports'
  | 'generate_reports'
  | 'edit_settings'
  | 'delete_project'
  | 'transfer_ownership'
  | 'manage_logframe';

// Base sur la matrice de permissions demandée :
// ⚪ = accès limité (handled case by case in code, but here we can define them as true or false based on primary access)
// ✅ = autorisé
// ❌ = interdit

export const PROJECT_PERMISSIONS: Record<ProjectRole, ProjectAction[]> = {
  OWNER: [
    'view_project', 'edit_project', 'view_tasks', 'create_tasks', 'edit_tasks', 'delete_tasks',
    'manage_team', 'manage_roles', 'invite_members', 'view_budget', 'edit_budget', 
    'view_reports', 'generate_reports', 'edit_settings', 'delete_project', 'transfer_ownership', 'manage_logframe'
  ],
  PROJECT_MANAGER: [
    'view_project', 'edit_project', 'view_tasks', 'create_tasks', 'edit_tasks', 'delete_tasks',
    'manage_team', 'manage_roles', 'invite_members', 'view_budget', 'edit_budget', // Limited budget edit will be handled in specific features
    'view_reports', 'generate_reports', 'edit_settings', 'manage_logframe'
  ],
  ACCOUNTANT: [
    'view_project', 'view_tasks', /* edit_tasks: ⚪ limited, maybe false here and handled strictly */
    'view_budget', 'edit_budget', 'view_reports', 'generate_reports'
  ],
  CONSULTANT: [
    'view_project', 'view_tasks', 'create_tasks', 'edit_tasks',
    /* view_budget: ⚪ limited */
    'view_reports', 'generate_reports'
  ],
  FUNDER_READONLY: [
    'view_project', 'view_tasks', 'view_budget', 'view_reports'
  ]
};

export function hasProjectPermission(role: ProjectRole | null | undefined, action: ProjectAction): boolean {
  if (!role) return false;
  
  // Specific checks for limited access ⚪ can be added here if needed,
  // but standard true/false check is done against the matrix array.
  
  // ACCOUNTANT limited edit_tasks -> Let's say false globally, maybe they can only edit specific fields like cost.
  // We leave it false here, and in cost-editing functions they check specifically.
  if (role === 'ACCOUNTANT' && action === 'edit_tasks') return true; // Treating limited as true for general UI, but strict on server.
  
  // CONSULTANT limited view_budget -> false by default.
  if (role === 'CONSULTANT' && action === 'view_budget') return false; 
  
  return PROJECT_PERMISSIONS[role].includes(action);
}

// Utilitaires de conversion pour les anciens rôles si nécessaire (retro-compatibilité ou au cas où)
export function normalizeRole(oldRole: string): ProjectRole {
  switch (oldRole.toLowerCase()) {
    case 'owner': return 'OWNER';
    case 'chef_projet': return 'PROJECT_MANAGER';
    case 'comptable': return 'ACCOUNTANT';
    case 'consultant': return 'CONSULTANT';
    case 'bailleur_lecture': return 'FUNDER_READONLY';
    default: return oldRole as ProjectRole;
  }
}
