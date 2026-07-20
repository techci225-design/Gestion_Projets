import { NextResponse } from 'next/server';
import * as xlsx from 'xlsx';

export async function GET() {
  try {
    // 1. Définir les colonnes du modèle attendu
    const columns = [
      "Code Tâche",
      "Description",
      "Responsable",
      "Date Début (JJ/MM/AAAA)",
      "Date Fin (JJ/MM/AAAA)",
      "Budget Alloué (FCFA)"
    ];

    // 2. Définir quelques lignes d'exemple
    const exampleData = [
      ["T1.1", "Recrutement de l'équipe", "Jean Dupont", "01/01/2026", "31/01/2026", "5000000"],
      ["T1.2", "Acquisition du matériel", "Marie Curie", "01/02/2026", "28/02/2026", "15000000"],
      ["T2.1", "Phase d'étude", "Alice Diallo", "01/03/2026", "30/04/2026", "20000000"],
      ["T2.2", "Mise en œuvre", "Bob Kone", "01/05/2026", "31/10/2026", "45000000"]
    ];

    // 3. Créer la feuille de calcul
    const ws = xlsx.utils.aoa_to_sheet([columns, ...exampleData]);
    
    // Auto-ajuster la largeur des colonnes
    ws['!cols'] = columns.map(c => ({ wch: c.length + 5 }));

    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Modèle_PTBA");

    // 4. Générer le buffer
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // 5. Renvoyer le fichier en téléchargement
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Disposition': 'attachment; filename="Modele_Import_PTBA.xlsx"',
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });
  } catch (error: any) {
    console.error("Erreur génération modèle Excel:", error);
    return NextResponse.json({ error: error.message || 'Erreur génération' }, { status: 500 });
  }
}
