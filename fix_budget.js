const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fix() {
  const { data, error } = await supabase
    .from('budget_lines')
    .update({ initial_allocated_amount: 45000000 })
    .eq('label', 'Travaux de génie civil');
    
  if (error) console.error(error);
  else console.log("Fixed budget line Travaux de génie civil! Data:", data);
}

fix();
