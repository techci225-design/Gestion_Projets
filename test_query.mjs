import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve('c:\\Users\\BAYO\\Desktop\\Gestion_Projets', '.env.local') })

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function test() {
  const { data, error } = await adminClient
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      created_at,
      organization_members (
        org_role,
        organizations (
          name,
          plan
        )
      ),
      project_members ( count )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Data:', JSON.stringify(data.slice(0, 2), null, 2))
  }
}

test()
