import { NextResponse } from 'next/server'

// Compatibilité avec l’ancienne URL : le rapport canonique est un vrai PDF.
export async function GET(request: Request) {
  const url = new URL(request.url)
  url.pathname = '/api/export/rapport-complet'
  return NextResponse.redirect(url)
}
