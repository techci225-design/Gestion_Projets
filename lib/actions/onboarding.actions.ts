'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function createOrganizationOnboarding(data: {
  name: string;
  country: string;
  teamSize: string;
}) {
  console.log('createOrganizationOnboarding appelée');
  console.log('Données reçues:', data);

  const supabase = await createClient(); // lib/supabase/server.ts
  
  // Vérifier que l'utilisateur est authentifié
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Non authentifié. Reconnectez-vous." };
  }
  
  console.log('createOrganizationOnboarding par:', user.id);

  // S'assurer que le profil existe (cas où la confirmation email a différé sa création)
  await supabase.from('profiles').upsert({
    id: user.id,
    full_name: user.user_metadata.full_name || user.email,
    email: user.email
  });

  // Générer un slug unique depuis le nom
  const slug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    + '-' + Date.now().toString(36);

  // Créer l'organisation
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: data.name,
      slug,
      plan: 'trial',
      max_projects: 3
    })
    .select()
    .single();

  if (orgError) {
    console.error('Erreur création organisation:', orgError);
    return { error: `Impossible de créer l'organisation: ${orgError.message}` };
  }

  // Ajouter l'utilisateur comme owner
  const { error: memberError } = await supabase
    .from('organization_members')
    .insert({
      organization_id: org.id,
      user_id: user.id,
      org_role: 'owner',
    });

  if (memberError) {
    console.error('Erreur ajout membre:', memberError);
    // Nettoyer l'organisation créée si l'ajout du membre échoue
    await supabase.from('organizations').delete().eq('id', org.id);
    return { error: `Impossible de configurer l'organisation: ${memberError.message}` };
  }

  // Set active organization cookie
  const cookieStore = await cookies()
  cookieStore.set('active_org_id', org.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30 // 30 days
  })

  return { success: true, organizationId: org.id };
}
