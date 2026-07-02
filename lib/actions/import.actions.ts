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
