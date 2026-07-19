import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  // Webhook payload from Supabase
  const payload = await req.json()
  const { record } = payload

  // We only care about inserts into `organizations`
  if (payload.type !== 'INSERT' || payload.table !== 'organizations') {
    return new Response(JSON.stringify({ message: "Not an organization insert, skipping." }), { status: 200 })
  }

  const orgName = record.name
  // Find the owner email (we'd need to query Supabase or assume the payload includes enough context,
  // but for simplicity, we assume we fetch the owner's email from auth.users via Supabase client,
  // or pass it in a different way. 
  // Let's assume we use the Resend API once we get the email.

  console.log(`New organization created: ${orgName}`)

  if (!RESEND_API_KEY) {
    console.log('RESEND_API_KEY is not set. Skipping email send.')
    return new Response(JSON.stringify({ message: 'Email skipped (no API key)' }), { status: 200 })
  }

  // TODO: Fetch owner email from database
  const toEmail = "admin@example.com" // Placeholder

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'ProjetPilote <welcome@projetpilote.com>',
        to: [toEmail],
        subject: `Bienvenue sur ProjetPilote, ${orgName} !`,
        html: `
          <h1>Bienvenue sur ProjetPilote !</h1>
          <p>Votre espace de travail pour <strong>${orgName}</strong> est prêt.</p>
          <p>Commencez dès maintenant à piloter vos projets bailleurs avec précision.</p>
          <a href="https://app.projetpilote.com/login" style="display:inline-block;padding:10px 20px;background:#1E3A5F;color:white;text-decoration:none;border-radius:8px;">
            Accéder à mon espace
          </a>
        `,
      }),
    })

    const data = await res.json()
    return new Response(JSON.stringify(data), { status: 200 })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
