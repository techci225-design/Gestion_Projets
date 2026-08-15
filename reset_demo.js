const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uyordjelzsqtyzgsytri.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5b3JkamVsenNxdHl6Z3N5dHJpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjkwMTQ2MSwiZXhwIjoyMDk4NDc3NDYxfQ.3ohu41SjIpVIGx0DBxLqpXnMPs-shqkqLE90XATBWmM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetDemoPassword() {
  // 1. List all users
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error('Error fetching users:', error);
    return;
  }

  // 2. Find the user that looks like a demo (e.g., contains 'demo', 'tsbc', etc.)
  console.log("Liste des utilisateurs trouvés :");
  users.forEach(u => console.log(`- ${u.email} (ID: ${u.id})`));

  const demoUser = users.find(u => 
    u.email.toLowerCase().includes('demo') || 
    u.email.toLowerCase().includes('tsbc') ||
    u.email.toLowerCase().includes('kiit') ||
    u.email.toLowerCase().includes('projet-ci.ci')
  );

  if (demoUser) {
    console.log(`\nUtilisateur de démo identifié : ${demoUser.email}`);
    
    // 3. Reset password
    const newPassword = 'Password123!';
    const { data, error: updateError } = await supabase.auth.admin.updateUserById(
      demoUser.id,
      { password: newPassword, email_confirm: true }
    );
    
    if (updateError) {
      console.error('Erreur lors de la mise à jour du mot de passe:', updateError);
    } else {
      console.log(`\nSUCCÈS ! Le mot de passe pour ${demoUser.email} a été réinitialisé à : ${newPassword}`);
    }
  } else {
    console.log('\nAucun utilisateur de démo évident trouvé.');
  }
}

resetDemoPassword();
