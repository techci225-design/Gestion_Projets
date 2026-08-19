require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkData() {
  try {
    const { data, error } = await supabase.from('operations_journal').select('*').limit(1);
    if (error) {
      console.log('Error fetching table data:', error.message);
    } else if (data && data.length > 0) {
      console.log('Columns:', Object.keys(data[0]));
    } else {
      console.log('Table is empty. Using REST API to fetch columns...');
      const res = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/operations_journal?limit=1', {
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY
        }
      });
      const json = await res.json();
      console.log('REST response:', json);
    }
  } catch (err) {
    console.error("Erreur :", err);
  }
}

checkData();
