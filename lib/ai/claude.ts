import { GoogleGenAI } from '@google/genai'
import crypto from 'crypto'

// Initialize the Google GenAI client
// Requires GEMINI_API_KEY environment variable
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'dummy_key' })

export async function analyzeProject(projectData: object): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Tu es un expert en gestion de projets de développement financés par des bailleurs de fonds. Analyse ces données de projet et donne une réponse en JSON respectant STRICTEMENT ce schéma et rien d'autre (ne mets pas de texte avant ou après) :
{
  "sante_globale": "critique" | "vigilance" | "satisfaisante" | "optimale",
  "resume": "string (un paragraphe court)",
  "projection": { "date_epuisement_budget": "YYYY-MM-DD" | null, "cout_final_estime": number, "ecart_previsionnel": number },
  "alertes": [ { "niveau": "critique" | "attention" | "info", "message": "string", "action": "string" } ],
  "recommandations": [ "string" ]
}

Données du projet :
${JSON.stringify(projectData)}`,
    config: {
      temperature: 0.2,
      responseMimeType: "application/json"
    }
  })
  
  return response.text || ''
}

export async function generateExecutiveSummary(projectData: object): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Tu es un consultant expert en projets bailleurs. Rédige un résumé exécutif de 200 mots en français pour ce rapport de supervision de projet. Sois factuel, institutionnel et précis. Mentionne les chiffres clés. Réponds uniquement avec le texte du résumé, sans titre.\n\nDonnées du projet : ${JSON.stringify(projectData)}`,
    config: {
      temperature: 0.3
    }
  })
  
  return response.text || ''
}

export async function suggestBudgetLine(taskDescription: string, budgetLines: any[]): Promise<{ code: string, label: string } | null> {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Suggère-moi la ligne budgétaire la plus probable pour cette tâche dans un projet de développement bailleur.
Description de la tâche : '${taskDescription}'
Lignes budgétaires disponibles : ${JSON.stringify(budgetLines.map(b => ({ code: b.code, label: b.label })))}
Réponds uniquement avec le code et le libellé de la ligne la plus appropriée, format JSON : {"code": "1.1", "label": "Consultants"}`,
    config: {
      temperature: 0.1,
      responseMimeType: "application/json"
    }
  })
  
  const text = response.text || ''
  try {
    const cleanText = text.replace(/```json\n?|```/g, '').trim()
    return JSON.parse(cleanText)
  } catch (e) {
    return null
  }
}

export function generateInputHash(data: any): string {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex')
}
