'use server'

import * as ExcelJS from 'exceljs'
import { createClient } from '../supabase/server'
import { revalidatePath } from 'next/cache'
import { requireRole } from './auth.actions'

export async function parseExcelHeaders(formData: FormData) {
  const file = formData.get('file') as File
  if (!file) {
    return { error: 'Aucun fichier fourni' }
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(arrayBuffer)

    const worksheet = workbook.worksheets[0]
    if (!worksheet) return { error: 'Fichier Excel vide' }

    const headers: string[] = []
    const firstRow = worksheet.getRow(1)
    
    firstRow.eachCell((cell, colNumber) => {
      headers.push(cell.text.trim())
    })

    return { headers }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function executeImport(projectId: string, formData: FormData, mapping: Record<string, string>) {
  const file = formData.get('file') as File
  if (!file) return { error: 'Aucun fichier fourni' }

  try {
    // Only owners or chef_projet can import (or anyone with write access, but let's enforce owner/chef_projet for import)
    await requireRole(projectId, ['owner', 'chef_projet'])
  } catch (err: any) {
    return { error: err.message }
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(arrayBuffer)

    const supabase = await createClient()
    let importedRows = 0
    let ignoredRows = 0
    let errorRows = 0

    const worksheet = workbook.worksheets[0]
    if (!worksheet) return { error: 'Fichier Excel vide' }

    // Map column names to column indexes (1-based)
    const headerRow = worksheet.getRow(1)
    const colIndexes: Record<string, number> = {}
    
    headerRow.eachCell((cell, colNumber) => {
      colIndexes[cell.text.trim()] = colNumber
    })

    // Prepare inserts
    const inserts: any[] = []

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return // Skip header

      const activityData: any = {
        project_id: projectId,
        fiscal_year: new Date().getFullYear(),
      }

      let hasRequired = true

      // Mapping standard PTBA fields
      // mapping format: { "Excel Column Name": "db_field_name" }
      for (const [excelCol, dbField] of Object.entries(mapping)) {
        if (dbField === 'ignore') continue
        
        const colIdx = colIndexes[excelCol]
        if (!colIdx) continue

        const cell = row.getCell(colIdx)
        const val = cell.value

        if (dbField === 'code' || dbField === 'description') {
          activityData[dbField] = cell.text
          if (!cell.text) hasRequired = false
        } else if (dbField === 'budget_planned') {
          activityData[dbField] = Number(val) || 0
          if (!activityData[dbField]) hasRequired = false
        } else if (dbField === 'responsible' || dbField === 'start_date' || dbField === 'end_date') {
           // Basic mapping for dates (simplified)
           if (val instanceof Date) {
             activityData[dbField] = val.toISOString().split('T')[0]
           } else {
             activityData[dbField] = cell.text || null
           }
        }
      }

      if (!hasRequired) {
        ignoredRows++
      } else {
        inserts.push(activityData)
      }
    })

    if (inserts.length > 0) {
      // Chunk inserts if too large, but for now insert all
      const { error } = await supabase.from('ptba_activities').insert(inserts)
      if (error) {
        errorRows = inserts.length
      } else {
        importedRows = inserts.length
      }
    }

    revalidatePath(`/projects/${projectId}`)
    revalidatePath(`/projects/${projectId}/ptba`)

    return { 
      data: {
        success: true,
        summary: {
          importedRows,
          ignoredRows,
          errorRows
        }
      }
    }
  } catch (error: any) {
    return { error: error.message }
  }
}

// Nouvelle action selon le Plan d'Implémentation pour créer un projet depuis Excel
export async function importProjectFromExcel(data: {
  projectName: string;
  projectCode: string;
  tasksData: any[];
}) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Non authentifié" };
  }

  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get('active_org_id')?.value;

  if (!activeOrgId) {
    return { error: 'Aucune organisation sélectionnée' };
  }

  try {
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: data.projectName,
        code: data.projectCode,
        created_by: user.id,
        organization_id: activeOrgId
      })
      .select('id')
      .single();

    if (projectError) throw new Error(`Erreur création projet: ${projectError.message}`);

    const projectId = project.id;

    const { error: memberError } = await supabase
      .from('project_members')
      .insert({
        project_id: projectId,
        user_id: user.id,
        role: 'owner'
      });

    if (memberError) {
      await supabase.from('projects').delete().eq('id', projectId);
      throw new Error(`Erreur assignation membre: ${memberError.message}`);
    }

    const wbsTasks = data.tasksData.map(row => {
      const parseDate = (dateStr: string) => {
        if (!dateStr) return null;
        if (typeof dateStr === 'number') {
          return new Date(Math.round((dateStr - 25569) * 86400 * 1000)).toISOString().split('T')[0];
        }
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return new Date(dateStr).toISOString().split('T')[0];
      };

      return {
        project_id: projectId,
        code: String(row["Code Tâche"] || '').trim(),
        description: String(row["Description"] || '').trim(),
        responsible: row["Responsable"] ? String(row["Responsable"]).trim() : null,
        date_start: parseDate(row["Date Début (JJ/MM/AAAA)"]),
        date_end: parseDate(row["Date Fin (JJ/MM/AAAA)"]),
        budget_allocated: Number(row["Budget Alloué (FCFA)"]) || 0
      };
    });

    const validTasks = wbsTasks.filter(t => t.code && t.description && t.date_start && t.date_end);

    if (validTasks.length > 0) {
      const { error: tasksError } = await supabase
        .from('wbs_tasks')
        .insert(validTasks);

      if (tasksError) {
        await supabase.from('projects').delete().eq('id', projectId);
        throw new Error(`Erreur insertion des tâches: ${tasksError.message}`);
      }
    }

    return { success: true, projectId };
  } catch (error: any) {
    console.error("importProjectFromExcel:", error);
    return { error: error.message || "Une erreur est survenue lors de l'import." };
  }
}
