'use server'

import * as ExcelJS from 'exceljs'
import { createClient } from '../supabase/server'
import { revalidatePath } from 'next/cache'

export async function importExcelFile(projectId: string, formData: FormData) {
  const file = formData.get('file') as File
  if (!file) {
    return { error: 'No file uploaded' }
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(arrayBuffer)

    const supabase = await createClient()
    let importedRows = 0
    let ignoredRows = 0
    let errorRows = 0

    // Exemple de parsing de la première feuille
    const worksheet = workbook.worksheets[0]
    if (!worksheet) return { error: 'Fichier Excel vide' }

    // Détection des sections "ONGLET 1 : CADRE LOGIQUE" etc.
    // Pour cet exemple, on boucle sur les lignes et on détecte
    worksheet.eachRow(async (row, rowNumber) => {
      // Ignorer l'en-tête (Ligne 1)
      if (rowNumber === 1) return

      const code = row.getCell(1).text
      const description = row.getCell(2).text
      
      if (!code) {
        ignoredRows++
        return
      }

      // Exemple d'import PTBA
      const { error } = await supabase.from('ptba_activities').insert({
        project_id: projectId,
        code,
        description,
        fiscal_year: new Date().getFullYear(),
        budget_planned: Number(row.getCell(3).value) || 0
      })

      if (error) {
        errorRows++
      } else {
        importedRows++
      }
    })

    revalidatePath(`/projects/${projectId}`)

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
