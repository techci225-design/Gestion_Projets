import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { suggestBudgetLine } from '@/lib/ai/claude'
import { requireRole } from '@/lib/actions/auth.actions'

export async function POST(req: Request) {
  try {
    const { projectId, taskDescription } = await req.json()
    if (!projectId || !taskDescription) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    await requireRole(projectId, ['owner', 'chef_projet', 'comptable'])

    const supabase = await createClient()
    const { data: budgetLines } = await supabase.from('budget_lines').select('code, label').eq('project_id', projectId)

    if (!budgetLines || budgetLines.length === 0) {
      return NextResponse.json({ error: 'No budget lines available' }, { status: 404 })
    }

    const suggestion = await suggestBudgetLine(taskDescription, budgetLines)
    
    if (suggestion) {
      return NextResponse.json(suggestion)
    } else {
      return NextResponse.json({ error: 'Failed to generate suggestion' }, { status: 500 })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
