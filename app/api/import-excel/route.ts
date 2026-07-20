import { NextResponse } from 'next/server';
import * as xlsx from 'xlsx';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    const data = xlsx.utils.sheet_to_json(sheet, { defval: null, raw: false });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Erreur parsing Excel:", error);
    return NextResponse.json({ error: error.message || 'Erreur lors du traitement du fichier' }, { status: 500 });
  }
}
