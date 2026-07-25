import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function clean() {
  // Get all pending invitations
  const { data: pendingInvs, error } = await adminClient.from('invitations').select('*').eq('status', 'pending')
  if (error || !pendingInvs) return console.error(error)

  for (const inv of pendingInvs) {
    // Check if the user is already a member
    let isMember = false
    
    // First, find the user by email
    const { data: profiles } = await adminClient.from('profiles').select('id').eq('email', inv.invited_email).single()
    if (profiles) {
      if (inv.project_id) {
        const { data: pMember } = await adminClient.from('project_members')
          .select('id').eq('project_id', inv.project_id).eq('user_id', profiles.id).single()
        if (pMember) isMember = true
      } else {
        const { data: oMember } = await adminClient.from('organization_members')
          .select('user_id').eq('organization_id', inv.organization_id).eq('user_id', profiles.id).single()
        if (oMember) isMember = true
      }
    }

    if (isMember) {
      console.log(`User ${inv.invited_email} is already a member. Marking invitation ${inv.id} as accepted.`)
      await adminClient.from('invitations').update({ status: 'accepted' }).eq('id', inv.id)
    }
  }
  
  console.log('Done cleaning.')
}

clean()
