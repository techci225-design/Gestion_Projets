import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function test() {
  const { data, error } = await adminClient.from('invitations').select('*').eq('invited_email', 'techci225@gmail.com')
  console.log('Invitations for techci225@gmail.com:', data)
  if (error) console.error('Error:', error)
}

test()
