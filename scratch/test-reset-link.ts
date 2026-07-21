import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function test() {
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email: 'bayokassim4@gmail.com',
    options: {
      redirectTo: 'https://gestion-projets-e3uj.vercel.app/api/auth/callback?next=/update-password'
    }
  })
  
  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Link:', data.properties.action_link)
  }
}

test()
