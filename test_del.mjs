import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const adminClient = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function main() {
  // Find a user to delete (like admin_1782... )
  const { data: users, error: uErr } = await adminClient.from('profiles').select('id, email').ilike('email', 'admin_%').limit(1)
  
  if (uErr || !users || users.length === 0) {
    console.log("No user found to test deletion.")
    return
  }

  const userId = users[0].id
  console.log(`Testing deletion for user ${users[0].email} (${userId})`)

  // Step 1: project_members
  const { error: e1 } = await adminClient.from('project_members').delete().eq('user_id', userId)
  if (e1) console.error("Error deleting project_members:", e1.message)
  else console.log("project_members cleared")

  // Step 2: organization_members
  const { error: e2 } = await adminClient.from('organization_members').delete().eq('user_id', userId)
  if (e2) console.error("Error deleting organization_members:", e2.message)
  else console.log("organization_members cleared")

  // Check audit_log
  const { data: audits } = await adminClient.from('audit_log').select('id').eq('user_id', userId)
  if (audits && audits.length > 0) {
    console.log(`User has ${audits.length} audit logs. Deleting...`)
    const { error: e3 } = await adminClient.from('audit_log').delete().eq('user_id', userId)
    if (e3) console.error("Error deleting audit_log:", e3.message)
  }

  // Check invitations
  const { data: invs } = await adminClient.from('invitations').select('id').eq('invited_by', userId)
  if (invs && invs.length > 0) {
    console.log(`User has ${invs.length} invitations. Deleting...`)
    const { error: e4 } = await adminClient.from('invitations').delete().eq('invited_by', userId)
    if (e4) console.error("Error deleting invitations:", e4.message)
  }

  // Step 3: profiles
  const { error: e5 } = await adminClient.from('profiles').delete().eq('id', userId)
  if (e5) {
    console.error("Error deleting profiles:", e5.message, e5.details, e5.hint)
  } else {
    console.log("profiles cleared")
  }

  // Step 4: auth
  const { error: e6 } = await adminClient.auth.admin.deleteUser(userId)
  if (e6) {
    console.error("Error deleting auth user:", e6.message)
  } else {
    console.log("Auth user deleted successfully")
  }
}

main().catch(console.error)
