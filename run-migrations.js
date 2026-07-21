require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  connectionString: process.env.DIRECT_URL
});

async function run() {
  try {
    await client.connect();
    
    // Disable statement timeout for migrations
    await client.query('SET statement_timeout = 0;');

    const file1 = fs.readFileSync(path.join(__dirname, 'supabase', 'migrations', '20260721000006_update_funding_types.sql'), 'utf8');
    console.log('Running 20260721000006_update_funding_types.sql...');
    await client.query(file1);

    const file2 = fs.readFileSync(path.join(__dirname, 'supabase', 'migrations', '20260721000007_invitations.sql'), 'utf8');
    console.log('Running 20260721000007_invitations.sql...');
    await client.query(file2);

    // Update supabase migrations table
    await client.query(`
      CREATE SCHEMA IF NOT EXISTS supabase_migrations;
      CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
        version varchar(14) NOT NULL PRIMARY KEY
      );
      INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('20260721000006') ON CONFLICT DO NOTHING;
      INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('20260721000007') ON CONFLICT DO NOTHING;
    `);

    console.log('Migrations applied successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

run();
