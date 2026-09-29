const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function setupDatabase() {
  console.log('===========================================================');
  console.log(' PostgreSQL Connection & Database Setup Helper');
  console.log('===========================================================');

  const currentUrl = process.env.DATABASE_URL || '';
  console.log(`Current DATABASE_URL in backend/.env: ${currentUrl}\n`);

  // Try current URL
  try {
    const pool = new Pool({ connectionString: currentUrl, connectionTimeoutMillis: 3000 });
    const client = await pool.connect();
    console.log('✅ SUCCESS! Connected to PostgreSQL successfully!');
    client.release();
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.log(`❌ Connection failed with current URL: ${err.message}\n`);
    console.log('-----------------------------------------------------------');
    console.log('HOW TO FIX:');
    console.log('1. Open backend/.env file.');
    console.log('2. Update line 3 with your actual PostgreSQL password:');
    console.log('   DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/ema_touch_db');
    console.log('3. Create database if it does not exist:');
    console.log('   CREATE DATABASE ema_touch_db;\n');
    console.log('NOTE: If you do not have PostgreSQL installed, the app automatically');
    console.log('uses the built-in memory store fallback so everything works!');
    console.log('-----------------------------------------------------------\n');
    process.exit(1);
  }
}

setupDatabase();
