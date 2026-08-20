'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { hasProjectPermission, ProjectRole } from '../permissions/project-permissions'

const WbsTaskBaseSchema = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  parent_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1, "Le nom est requis"),
  description: z.string().optional().default(''),
  task_type: z.enum(['SUMMARY', 'TASK', 'MILESTONE']).default('TASK'),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED']).default('PLANNED'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  sort_order: z.number().int().default(0),
  responsible_user_id: z.string().uuid().nullable().optional(),
  date_start: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Date de début invalide" }),
  date_end: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Date de fin invalide" }),
  budget_allocated: z.number().min(0).default(0),
  actual_cost: z.number().min(0).default(0),
  percent_complete: z.number().min(0).max(100).default(0),
});

const WbsTaskSchema = WbsTaskBaseSchema.refine(data => new Date(data.date_start) <= new Date(data.date_end), {
  message: "La date de début doit être antérieure ou égale à la date de fin",
  path: ["date_end"]
});

const UpdateWbsTaskSchema = WbsTaskBaseSchema.omit({ project_id: true }).partial().refine(data => {
  if (data.date_start && data.date_end) {
    return new Date(data.date_start) <= new Date(data.date_end);
  }
  return true;
}, {
  message: "La date de début doit être antérieure ou égale à la date de fin",
  path: ["date_end"]
});

async function requirePermission(projectId: string, action: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Non autorisé")

  const { data: member } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single()

  const userRole = member?.role
  if (!userRole) throw new Error("Accès refusé")

  // For delete_project action, map it. For edit_task, map it.
  const mappedAction: any = action === 'delete' ? 'delete_tasks' : (action === 'create' ? 'create_tasks' : (action === 'edit' ? 'edit_tasks' : 'view_tasks'))
  
  if (!hasProjectPermission(userRole as ProjectRole, mappedAction)) {
    throw new Error("Permissions insuffisantes")
  }
  return { user, userRole }
}

async function recalculateWbsCodes(supabase: any, projectId: string) {
  // Fetch all tasks for the project
  const { data: allTasks, error } = await supabase
    .from('wbs_tasks')
    .select('id, parent_id, sort_order, code')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })

  if (error || !allTasks) return;

  const updates: any[] = []
  
  // Build a tree to traverse easily
  const getChildren = (parentId: string | null) => 
    allTasks.filter((t: any) => t.parent_id === parentId).sort((a: any, b: any) => a.sort_order - b.sort_order);

  const traverse = (parentId: string | null, parentCode: string) => {
    const children = getChildren(parentId);
    children.forEach((child: any, index: number) => {
      const newCode = parentCode ? `${parentCode}.${index + 1}` : `${index + 1}`;
      if (child.code !== newCode) {
        updates.push({ id: child.id, code: newCode });
      }
      traverse(child.id, newCode);
    });
  }

  traverse(null, "");

  // Apply updates sequentially
  for (const update of updates) {
    await supabase.from('wbs_tasks').update({ code: update.code }).eq('id', update.id);
  }
}

export async function recalculateSummaryDates(supabase: any, projectId: string) {
  const { data: allTasks, error } = await supabase
    .from('wbs_tasks')
    .select('id, parent_id, task_type, date_start, date_end')
    .eq('project_id', projectId);

  if (error || !allTasks) return;

  const updates: any[] = [];
  
  const childrenMap = new Map<string, any[]>();
  allTasks.forEach((t: any) => {
    if (t.parent_id) {
      if (!childrenMap.has(t.parent_id)) childrenMap.set(t.parent_id, []);
      childrenMap.get(t.parent_id)!.push(t);
    }
  });

  const computedBounds = new Map<string, { start: string | null, end: string | null }>();

  function computeBounds(nodeId: string): { start: string | null, end: string | null } {
    if (computedBounds.has(nodeId)) return computedBounds.get(nodeId)!;

    const node = allTasks.find((t: any) => t.id === nodeId);
    if (!node) return { start: null, end: null };

    const children = childrenMap.get(nodeId) || [];
    
    let minStart: string | null = null;
    let maxEnd: string | null = null;

    if (node.task_type === 'SUMMARY') {
      for (const child of children) {
        const childBounds = computeBounds(child.id);
        if (childBounds.start) {
          if (!minStart || new Date(childBounds.start) < new Date(minStart)) minStart = childBounds.start;
        }
        if (childBounds.end) {
          if (!maxEnd || new Date(childBounds.end) > new Date(maxEnd)) maxEnd = childBounds.end;
        }
      }
      
      let newStart = node.date_start;
      let newEnd = node.date_end;

      if (minStart && maxEnd) {
        newStart = minStart;
        newEnd = maxEnd;
      }

      if (newStart !== node.date_start || newEnd !== node.date_end) {
        updates.push({ id: node.id, date_start: newStart, date_end: newEnd });
        node.date_start = newStart;
        node.date_end = newEnd;
      }

      const result = { start: newStart, end: newEnd };
      computedBounds.set(nodeId, result);
      return result;
    } else {
      const result = { start: node.date_start, end: node.date_end };
      computedBounds.set(nodeId, result);
      return result;
    }
  }

  const rootNodes = allTasks.filter((t: any) => !t.parent_id);
  for (const root of rootNodes) {
    computeBounds(root.id);
  }

  for (const update of updates) {
    await supabase.from('wbs_tasks').update({ 
      date_start: update.date_start, 
      date_end: update.date_end 
    }).eq('id', update.id);
  }
}

export async function getWbsTasks(projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Non autorisé" }

  const { data, error } = await supabase
    .from('wbs_tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error("GET WBS TASKS ERROR:", error)
    return { error: error.message }
  }

  // Manually join profiles to avoid PostgREST foreign key issues with auth.users
  if (data && data.length > 0) {
    const responsibleIds = Array.from(new Set(data.map((t: any) => t.responsible_user_id).filter(Boolean)))
    if (responsibleIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', responsibleIds)
        
      if (profiles) {
        data.forEach((t: any) => {
          if (t.responsible_user_id) {
            t.responsible = profiles.find((p: any) => p.id === t.responsible_user_id)
          }
        })
      }
    }
  }

  return { data }
}

export async function createWbsTask(data: any) {
  try {
    await requirePermission(data.project_id, 'create')
    
    // Convert empty strings to null for uuids
    if (data.parent_id === '') data.parent_id = null
    if (data.responsible_user_id === '') data.responsible_user_id = null
    
    const validatedData = WbsTaskSchema.parse(data)
    const supabase = await createClient()

    // Enforce responsible user is in project members
    if (validatedData.responsible_user_id) {
      const { data: mem } = await supabase.from('project_members').select('id').eq('project_id', data.project_id).eq('user_id', validatedData.responsible_user_id).single()
      if (!mem) return { error: "Le responsable assigné n'est pas membre du projet." }
    }

    // Check parent is not a milestone
    if (validatedData.parent_id) {
      const { data: parent } = await supabase.from('wbs_tasks').select('task_type').eq('id', validatedData.parent_id).single()
      if (parent?.task_type === 'MILESTONE') {
        return { error: "Un jalon ne peut pas avoir d'enfants." }
      }
    }

    // Calculate sort_order to be at the end of siblings
    const { count } = await supabase
      .from('wbs_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', validatedData.project_id)
      .is('parent_id', validatedData.parent_id ? validatedData.parent_id : null)

    const insertData = { ...validatedData, code: 'TEMP', sort_order: count || 0 }
    
    const { data: inserted, error } = await supabase
      .from('wbs_tasks')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error

    await recalculateWbsCodes(supabase, data.project_id)
    await recalculateSummaryDates(supabase, data.project_id)

    revalidatePath(`/projects/${data.project_id}/tasks`)
    return { data: inserted }
  } catch (err: any) {
    console.error(err)
    return { error: err.message || "Erreur lors de la création" }
  }
}

export async function updateWbsTask(id: string, projectId: string, data: any) {
  try {
    await requirePermission(projectId, 'edit')
    
    if (data.parent_id === '') data.parent_id = null
    if (data.responsible_user_id === '') data.responsible_user_id = null
    
    // Minimal validation for updates
    const validatedData = UpdateWbsTaskSchema.parse(data)
    
    const supabase = await createClient()

    if (validatedData.responsible_user_id) {
      const { data: mem } = await supabase.from('project_members').select('id').eq('project_id', projectId).eq('user_id', validatedData.responsible_user_id).single()
      if (!mem) return { error: "Le responsable assigné n'est pas membre du projet." }
    }

    const { data: updated, error } = await supabase
      .from('wbs_tasks')
      .update(validatedData)
      .eq('id', id)
      .eq('project_id', projectId) // ensure safety
      .select()
      .single()

    if (error) throw error

    revalidatePath(`/projects/${projectId}/tasks`)
    return { data: updated }
  } catch (err: any) {
    console.error(err)
    return { error: err.message || "Erreur lors de la mise à jour" }
  }
}

export async function deleteWbsTask(id: string, projectId: string) {
  try {
    await requirePermission(projectId, 'delete')
    const supabase = await createClient()

    // Check for children
    const { count } = await supabase
      .from('wbs_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('parent_id', id)

    if (count && count > 0) {
      return { error: "Cette activité contient des sous-activités. Déplacez ou supprimez-les avant de supprimer cette activité." }
    }

    // Check for decaisse expenses (EVM integrity protection)
    const { data: operations, error: opError } = await supabase
      .from('operations_journal')
      .select('id')
      .eq('wbs_task_id', id)
      .eq('status', 'decaisse')
      .limit(1)

    if (operations && operations.length > 0) {
      return { error: "Cette tâche ne peut pas être supprimée car elle possède des dépenses décaissées dans le Journal. Réaffectez ou archivez la tâche avant suppression." }
    }

    const { error } = await supabase
      .from('wbs_tasks')
      .delete()
      .eq('id', id)
      .eq('project_id', projectId)

    if (error) throw error

    await recalculateWbsCodes(supabase, projectId)
    await recalculateSummaryDates(supabase, projectId)
    revalidatePath(`/projects/${projectId}/tasks`)
    return { success: true }
  } catch (err: any) {
    console.error(err)
    return { error: err.message || "Erreur lors de la suppression" }
  }
}

export async function moveWbsTask(id: string, projectId: string, newParentId: string | null, newSortOrder: number) {
  try {
    await requirePermission(projectId, 'edit')
    const supabase = await createClient()

    if (id === newParentId) {
      return { error: "Une tâche ne peut pas être son propre parent." }
    }

    // Check for cycles (cannot be child of a descendant)
    if (newParentId) {
      let currentParent = newParentId;
      while (currentParent) {
        if (currentParent === id) return { error: "Cycle hiérarchique détecté. Une tâche ne peut pas devenir l'enfant d'un de ses descendants." }
        const { data: pt } = await supabase.from('wbs_tasks').select('parent_id').eq('id', currentParent).single()
        if (!pt) break;
        currentParent = pt.parent_id;
      }
    }

    // Prevent milestone from being a parent
    if (newParentId) {
       const { data: parentInfo } = await supabase.from('wbs_tasks').select('task_type').eq('id', newParentId).single()
       if (parentInfo?.task_type === 'MILESTONE') {
         return { error: "Un jalon ne peut pas avoir d'enfants." }
       }
    }

    // Get current state
    const { data: currentTask } = await supabase.from('wbs_tasks').select('parent_id, sort_order').eq('id', id).single()
    if (!currentTask) return { error: "Tâche introuvable." }

    const oldParentId = currentTask.parent_id
    const oldSortOrder = currentTask.sort_order

    // Since I don't have shift_wbs_orders rpc, I'll do it manually.
    
    // 1. Shift old parent's children down
    const { data: oldSiblings } = await supabase.from('wbs_tasks').select('id, sort_order').eq('project_id', projectId).is('parent_id', oldParentId ? oldParentId : null).gt('sort_order', oldSortOrder)
    if (oldSiblings) {
      for (const sib of oldSiblings) {
        await supabase.from('wbs_tasks').update({ sort_order: sib.sort_order - 1 }).eq('id', sib.id)
      }
    }

    // 2. Shift new parent's children up to make room
    const { data: newSiblings } = await supabase.from('wbs_tasks').select('id, sort_order').eq('project_id', projectId).is('parent_id', newParentId ? newParentId : null).gte('sort_order', newSortOrder)
    if (newSiblings) {
      for (const sib of newSiblings) {
        await supabase.from('wbs_tasks').update({ sort_order: sib.sort_order + 1 }).eq('id', sib.id)
      }
    }

    // Update the task itself
    const { error } = await supabase
      .from('wbs_tasks')
      .update({ parent_id: newParentId, sort_order: newSortOrder })
      .eq('id', id)
      .eq('project_id', projectId)

    if (error) throw error

    await recalculateWbsCodes(supabase, projectId)
    await recalculateSummaryDates(supabase, projectId)
    revalidatePath(`/projects/${projectId}/tasks`)
    return { success: true }
  } catch (err: any) {
    console.error(err)
    return { error: err.message || "Erreur lors du déplacement" }
  }
}
