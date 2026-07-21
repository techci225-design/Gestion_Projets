import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  try {
    const payload = await req.json()
    const { record } = payload

    if (payload.type !== 'INSERT' || payload.table !== 'organizations') {
      return new Response(JSON.stringify({ message: "Not an organization insert, skipping." }), { status: 200 })
    }

    const orgName = record.name
    const orgId = record.id

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase env vars')
      return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 500 })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Wait a brief moment to ensure the trigger that adds the member has finished
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Fetch the owner of the organization
    const { data: members, error: memberError } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', orgId)
      .eq('org_role', 'owner')
      .limit(1)

    if (memberError || !members || members.length === 0) {
      console.error('Owner not found', memberError)
      return new Response(JSON.stringify({ error: 'Owner not found' }), { status: 404 })
    }

    const ownerId = members[0].user_id

    // Fetch user profile for name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', ownerId)
      .single()

    const firstName = profile?.full_name ? profile.full_name.split(' ')[0] : 'Utilisateur'

    // Fetch user email from auth.users (requires service role key)
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(ownerId)
    
    if (userError || !userData?.user?.email) {
      console.error('User email not found', userError)
      return new Response(JSON.stringify({ error: 'User email not found' }), { status: 404 })
    }

    const toEmail = userData.user.email

    console.log(`Sending welcome email to ${toEmail} for org ${orgName}`)

    if (!RESEND_API_KEY) {
      console.log('RESEND_API_KEY is not set. Logging email content instead.')
      console.log(`
      Subject: Bienvenue sur ProjetPilote — Votre espace est prêt
      Bonjour ${firstName},
      Votre espace "${orgName}" est prêt sur ProjetPilote.
      ...
      `)
      return new Response(JSON.stringify({ message: 'Email logged (no API key)' }), { status: 200 })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'ProjetPilote <welcome@projetpilote.com>',
        to: [toEmail],
        subject: `Bienvenue sur ProjetPilote — Votre espace est prêt`,
        html: `
          <div style="font-family: sans-serif; color: #1E3A5F; line-height: 1.5;">
            <p>Bonjour ${firstName},</p>
            <p>Votre espace "<strong>${orgName}</strong>" est prêt sur ProjetPilote.</p>
            
            <p>Accédez à votre tableau de bord :<br/>
            <a href="https://gestion-projets-e3uj.vercel.app/projects" style="color: #16A34A; font-weight: bold;">Accéder à mon espace</a></p>
            
            <p>Vos premiers pas :</p>
            <ol>
              <li>Créez votre premier projet bailleur</li>
              <li>Ajoutez vos sources de financement</li>
              <li>Saisissez vos opérations</li>
            </ol>
            
            <p>Pour toute question, contactez TSBC :<br/>
            <a href="mailto:tsbcafrique@yahoo.fr">tsbcafrique@yahoo.fr</a> | +225 07 07 36 30 20</p>
            
            <p>L'équipe ProjetPilote — TSBC</p>
          </div>
        `,
      }),
    })

    const data = await res.json()
    return new Response(JSON.stringify(data), { status: 200 })
  } catch (err: any) {
    console.error('Edge function error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
