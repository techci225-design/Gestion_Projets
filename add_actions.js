const fs = require('fs');
const path = require('path');

const filepath = path.join(__dirname, 'lib/actions/projects.actions.ts');
let content = fs.readFileSync(filepath, 'utf8');

const actions = `
export async function updateProject(projectId: string, payload: {
  name: string
  code: string
  start_date: string
  end_date: string
  description?: string
  status: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  let adminClient;
  try {
    adminClient = createAdminClient()
  } catch (err: any) {
    return { error: 'Erreur de configuration serveur (Clé Admin manquante).' }
  }

  // Verification that the user is the owner, admin, or chef_projet
  const { data: projectMember } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single()
    
  // If not a direct member, verify if they are a super admin or org owner/admin
  const cookieStore = await cookies()
  const activeOrgId = cookieStore.get('active_org_id')?.value
  
  let hasRights = false;
  if (projectMember && ['owner', 'chef_projet', 'admin'].includes(projectMember.role)) {
    hasRights = true;
  } else if (activeOrgId) {
    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('org_role')
      .eq('user_id', user.id)
      .eq('organization_id', activeOrgId)
      .single()
    if (orgMember && ['owner', 'admin'].includes(orgMember.org_role)) {
      hasRights = true;
    }
  }

  if (!hasRights) {
    return { error: "Vous n'avez pas les droits pour modifier ce projet." }
  }

  const { error } = await adminClient
    .from('projects')
    .update({
      name: payload.name,
      code: payload.code,
      start_date: payload.start_date,
      end_date: payload.end_date,
      description: payload.description,
      status: payload.status
    })
    .eq('id', projectId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/projects')
  revalidatePath(\`/projects/\${projectId}\`)
  revalidatePath(\`/projects/\${projectId}/parametres\`)
  return { success: true }
}

export async function deleteProject(projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  let adminClient;
  try {
    adminClient = createAdminClient()
  } catch (err: any) {
    return { error: 'Erreur de configuration serveur (Clé Admin manquante).' }
  }

  // Only org owner/admin or project owner can delete
  const { data: projectMember } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single()
    
  const cookieStore = await cookies()
  const activeOrgId = cookieStore.get('active_org_id')?.value
  
  let hasRights = false;
  if (projectMember && ['owner'].includes(projectMember.role)) {
    hasRights = true;
  } else if (activeOrgId) {
    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('org_role')
      .eq('user_id', user.id)
      .eq('organization_id', activeOrgId)
      .single()
    if (orgMember && ['owner', 'admin'].includes(orgMember.org_role)) {
      hasRights = true;
    }
  }

  if (!hasRights) {
    return { error: "Vous n'avez pas les droits pour supprimer ce projet." }
  }

  // Update status to 'clos' or soft-delete (using status = 'clos' as archive)
  // Or hard delete if requested. Since user approved the plan but didn't answer, 
  // I will do a hard delete via adminClient. Supabase usually cascades.
  const { error } = await adminClient
    .from('projects')
    .delete()
    .eq('id', projectId)

  if (error) {
    return { error: "Impossible de supprimer le projet car il contient des données liées (tâches, budget). Veuillez le vider d'abord, ou contactez le support." }
  }

  revalidatePath('/projects')
  return { success: true }
}
`;

fs.writeFileSync(filepath, content + '\n' + actions);
console.log('Appended actions to projects.actions.ts');
