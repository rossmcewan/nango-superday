import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Fallback to individual parameters if no URL provided
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
  });

  try {
    // Read the schema file
    const schema = fs.readFileSync(
      path.join(__dirname, 'schema.sql'),
      'utf8'
    );

    // Execute the schema
    await pool.query(schema);
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrate();
}

export default migrate; 