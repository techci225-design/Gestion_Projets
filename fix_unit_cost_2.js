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
    .update({ unit_cost: 6000000 })
    .eq('label', 'Équipements hydrauliques');
    
  if (error) console.error(error);
  else console.log("Fixed budget line unit_cost for Equipements! Data:", data);
}

fix();
